import { expect } from '@playwright/test'
import assert from 'node:assert/strict'
import { chromium } from 'playwright'

const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL || 'chrome', headless: true })
const baseURL = process.env.TEST_URL || 'http://127.0.0.1:5174'
const failures = []
const words = [
  { name: 'entrepreneur', trans: ['n. 企业家'] },
  { name: 'mistaken', trans: ['adj. 错误的'] },
  { name: 'take responsibility', trans: ['承担责任'] },
]

async function check(name, fn, { mobile = false, storage = {}, dictionary = words } = {}) {
  if (process.env.TEST_MATCH && !name.includes(process.env.TEST_MATCH)) return
  const context = await browser.newContext({
    viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 },
    isMobile: mobile,
    hasTouch: mobile,
  })
  const page = await context.newPage()
  page.setDefaultTimeout(5000)
  try {
    // Grading and focus checks do not depend on the external pronunciation service.
    await page.route('https://dict.youdao.com/**', (route) => route.abort())
    await page.route('**/dicts/zju-english-3-unit-1-reading-1.json', (route) => route.fulfill({ json: dictionary }))
    await page.addInitScript((settings) => {
      if (!sessionStorage.getItem('seeded')) {
        localStorage.setItem('lastSeenRelease', JSON.stringify('0.3.1'))
        localStorage.setItem('phoneticConfig', JSON.stringify({ isOpen: false }))
        for (const [key, value] of Object.entries(settings)) localStorage.setItem(key, JSON.stringify(value))
        sessionStorage.setItem('seeded', 'true')
      }
    }, storage)
    await page.goto(baseURL, { waitUntil: 'domcontentloaded' })
    await page.locator('.tooltip-info').waitFor()
    await fn(page)
    console.log(`PASS ${name}`)
  } catch (error) {
    failures.push(name)
    console.error(`FAIL ${name}: ${error.message}`)
    if (process.env.TEST_MATCH) console.error((await page.locator('body').innerText()).slice(0, 2500))
  } finally {
    await context.close()
  }
}

async function records(page) {
  return page.evaluate(async () => {
    if (!(await indexedDB.databases()).some(({ name }) => name === 'RecordDB')) return []
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('RecordDB')
      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        const db = request.result
        const query = db.transaction('wordRecords').objectStore('wordRecords').getAll()
        query.onsuccess = () => {
          db.close()
          resolve(query.result)
        }
      }
    })
  })
}

try {
  await check(
    'long answer peek wraps completely without clipping at 320px',
    async (page) => {
      await page.setViewportSize({ width: 320, height: 568 })
      await page.getByRole('textbox', { name: '英文默写输入' }).fill('take')
      const line = page.getByLabel('单词长度已隐藏', { exact: true })
      const width = (await line.boundingBox()).width
      await page.keyboard.down('Tab')
      const answer = line.getByText('take full responsibility for the consequences of all your decisions', { exact: true })
      await expect(answer).toBeVisible()
      assert.ok(await answer.evaluate((el) => el.scrollHeight <= el.clientHeight), 'The entire revealed answer must fit')
      assert.equal((await line.boundingBox()).width, width)
      await page.keyboard.up('Tab')
      await expect(page.getByRole('textbox', { name: '英文默写输入' })).toHaveValue('take')
    },
    {
      mobile: true,
      storage: { hideWordLength: true },
      dictionary: [{ name: 'take full responsibility for the consequences of all your decisions', trans: ['承担决定带来的后果'] }],
    },
  )

  await check(
    'desktop legacy typing continues after next-word and pronunciation clicks',
    async (page) => {
      await page.getByRole('button', { name: '开始', exact: true }).click()
      await page.getByLabel('下一词长度已隐藏', { exact: true }).click()
      await page.keyboard.down('Tab')
      await expect(page.getByLabel('单词长度已隐藏', { exact: true })).toHaveText('mistaken')
      await page.keyboard.up('Tab')
      await page.keyboard.type('mistaken')
      await expect.poll(async () => (await records(page)).length).toBe(1)
      await expect(page.getByText('承担责任', { exact: true })).toHaveCount(0)
      await expect(page.getByLabel('单词长度已隐藏', { exact: true })).toHaveText('')
      await page.locator('.tooltip-info > div:last-child .cursor-pointer').click()
      await page.keyboard.type('take responsibility')
      await expect.poll(async () => (await records(page)).length).toBe(2)
    },
    { storage: { hideWordLength: true, wholeWordMode: false } },
  )

  await check(
    'Tab peek preserves the selection while editing on the line',
    async (page) => {
      const input = page.getByRole('textbox', { name: '英文默写输入' })
      await input.fill('entrepreneux')
      await input.evaluate((el) => el.setSelectionRange(2, 3))
      await page.keyboard.press('Tab')
      assert.deepEqual(await input.evaluate((el) => [el.selectionStart, el.selectionEnd]), [2, 3])
      await input.press('X')
      await expect(input).toHaveValue('enXrepreneux')
    },
    { storage: { hideWordLength: true } },
  )

  await check(
    'clicking the fixed line starts typing without revealing the answer on hover',
    async (page) => {
      const input = page.getByRole('textbox', { name: '英文默写输入' })
      await input.click()
      await input.hover()
      await expect(input).toHaveValue('')
      await expect(input).toBeEditable()
      await input.type('entre')
      await expect(input).toHaveValue('entre')
      await input.press('Tab')
      await expect(input).toHaveValue('entre')
      await expect(input).toBeFocused()
    },
    { storage: { hideWordLength: true } },
  )

  for (const mobile of [false, true]) {
    await check(
      `${mobile ? 'mobile' : 'desktop'} types directly on the fixed line without a second input`,
      async (page) => {
        const line = page.getByLabel('单词长度已隐藏', { exact: true })
        const input = page.getByRole('textbox', { name: '英文默写输入' })
        await expect(input).toHaveCount(1)
        assert.ok(await line.evaluate((el) => el.contains(document.getElementById('typing-mobile-input'))), 'Input must be on the line')
        await page.getByRole('button', { name: '开始', exact: true }).click()
        const before = await line.boundingBox()
        await input.fill('a deliberately long answer that should scroll inside the same line')
        assert.equal((await line.boundingBox()).width, before.width)
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
        assert.ok(await input.evaluate((el) => el.scrollWidth > el.clientWidth), 'Long answers scroll inside the input')
        await input.fill('entrepreneux')
        await input.press('Backspace')
        await input.press('r')
        await expect(input).toHaveValue('entrepreneur')
        assert.equal((await records(page)).length, 0)
        assert.equal((await line.boundingBox()).width, before.width)
        if (mobile) await page.getByRole('button', { name: '提交答案', exact: true }).tap()
        else await input.press('Enter')
        await expect(page.getByText('n. 企业家', { exact: true })).toBeVisible()
        await expect(input).toHaveValue('')
        await expect(input).toBeFocused()
        assert.equal((await line.boundingBox()).width, before.width)
        await input.fill('mistaken')
        await input.press('Enter')
        await expect(input).toHaveValue('')
        await input.fill('take responsibility')
        await input.press('Enter')
        await expect.poll(async () => (await records(page)).length).toBe(3)
      },
      { mobile, storage: { hideWordLength: true } },
    )
  }

  await check(
    'fixed line stays focused through answer reveal and repeated words',
    async (page) => {
      const input = page.getByRole('textbox', { name: '英文默写输入' })
      await page.getByRole('button', { name: '开始', exact: true }).tap()
      await input.fill('entre')
      await input.press('Tab')
      await expect(input).toHaveValue('entre')
      await expect(input).toBeFocused()
      await input.fill('entrepreneur')
      await input.press('Enter')
      await expect.poll(async () => (await records(page)).length).toBe(1)
      await expect(input).toHaveValue('')
      await expect(input).toBeFocused()
      await input.fill('entrepreneur')
      await input.press('Enter')
      await expect.poll(async () => (await records(page)).length).toBe(2)
    },
    { mobile: true, storage: { hideWordLength: true, loopWordConfig: { times: 2 } } },
  )

  await check(
    'legacy mobile grading uses the line without another input box',
    async (page) => {
      const line = page.getByLabel('单词长度已隐藏', { exact: true })
      const input = page.getByRole('textbox', { name: '英文默写输入' })
      assert.ok(
        await line.evaluate((el) => el.contains(document.getElementById('typing-mobile-input'))),
        'Legacy input must be on the line',
      )
      await page.getByRole('button', { name: '开始', exact: true }).tap()
      await input.type('entrepreneur')
      await expect.poll(async () => (await records(page)).length).toBe(1)
      await expect(input).toBeFocused()
    },
    { mobile: true, storage: { hideWordLength: true, wholeWordMode: false } },
  )

  await check('keyboard-start focuses the whole-word input for subsequent typing', async (page) => {
    await page.keyboard.press('a')
    await expect(page.getByRole('textbox', { name: '英文默写输入' })).toBeFocused()
    await page.keyboard.type('entrepreneur')
    await page.keyboard.press('Enter')
    await expect.poll(async () => (await records(page)).length).toBe(1)
  })

  await check('whole-word input preserves previous and next word shortcuts', async (page) => {
    const input = page.getByRole('textbox', { name: '英文默写输入' })
    await input.focus()
    await input.press('Control+Shift+ArrowRight')
    await expect(page.locator('.tooltip-info > div:first-child')).toHaveText('________')
    await input.press('Control+Shift+ArrowLeft')
    await expect(page.locator('.tooltip-info > div:first-child')).toHaveText('____________')
  })

  await check('replacement edits contribute to saved word timing', async (page) => {
    const input = page.getByRole('textbox', { name: '英文默写输入' })
    await input.fill('entrepreneux')
    await page.waitForTimeout(700)
    await input.fill('entrepreneur')
    await input.press('Enter')
    await expect.poll(async () => (await records(page)).length).toBe(1)
    assert.ok((await records(page))[0].timing.reduce((sum, value) => sum + value, 0) >= 650)
  })

  await check(
    'legacy textarea keeps the dictation shortcut',
    async (page) => {
      const input = page.getByRole('textbox', { name: '英文默写输入' })
      await input.focus()
      await input.press('Control+v')
      await expect(page.locator('.tooltip-info > div:first-child')).toHaveText('entrepreneur')
    },
    { mobile: true, storage: { wholeWordMode: false } },
  )

  await check(
    'whole-word mode keeps configured key sound feedback before submission',
    async (page) => {
      await page.waitForFunction(() =>
        performance.getEntriesByType('resource').some((entry) => entry.name.endsWith('/key-sound/Default.wav')),
      )
      await page.evaluate(() => {
        window.keySoundStarts = 0
        const start = AudioBufferSourceNode.prototype.start
        AudioBufferSourceNode.prototype.start = function (...args) {
          if (this.buffer?.length > 1) window.keySoundStarts += 1
          return start.apply(this, args)
        }
      })
      const input = page.getByRole('textbox', { name: '英文默写输入' })
      await input.focus()
      await input.type('entre', { delay: 100 })
      await expect.poll(() => page.evaluate(() => window.keySoundStarts)).toBeGreaterThan(0)
      assert.equal((await records(page)).length, 0)
    },
    { storage: { pronunciation: { isOpen: false } } },
  )

  for (const mobile of [false, true]) {
    await check(
      `${mobile ? 'mobile' : 'desktop'} waits for submission and allows corrections without recording typos`,
      async (page) => {
        await page.getByRole('button', { name: '开始', exact: true }).click()
        const input = page.getByRole('textbox', { name: '英文默写输入' })
        await input.fill('entxx')
        await page.waitForTimeout(400)
        await expect(input).toHaveValue('entxx')
        await input.fill('entrepreneur')
        await page.waitForTimeout(1400)
        assert.equal((await records(page)).length, 0)
        assert.equal(await page.getByText('n. 企业家', { exact: true }).count(), 0)
        if (mobile) await page.getByRole('button', { name: '提交答案', exact: true }).tap()
        else await input.press('Enter')
        await page.getByText('n. 企业家', { exact: true }).waitFor()
        await expect.poll(async () => (await records(page)).length).toBe(1)
        assert.equal((await records(page))[0].wrongCount, 0)
        await expect(input).toHaveValue('')
        assert.equal(await input.evaluate((el) => el === document.activeElement), true)
        await input.fill('mistakex')
        await input.press('Backspace')
        await input.press('n')
        await input.press('Enter')
        await expect.poll(async () => (await records(page)).length).toBe(2)
        await expect(input).toHaveValue('')
        await input.fill('take responsibility')
        await input.press('Enter')
        await expect.poll(async () => (await records(page)).length).toBe(3)
      },
      { mobile },
    )
  }

  await check('wrong, short and overlong submissions remain editable and count once per attempt', async (page) => {
    const input = page.getByRole('textbox', { name: '英文默写输入' })
    await input.fill('entre')
    await input.press('Enter')
    await expect(page.getByRole('status').filter({ hasText: '拼写不正确' })).toBeVisible()
    await expect(input).toHaveValue('entre')
    await input.press('Enter')
    await input.fill('entrepreneurEXTRA')
    await input.press('Enter')
    await expect(page.getByRole('status').filter({ hasText: '拼写不正确' })).toBeVisible()
    assert.equal((await records(page)).length, 0)
    await input.fill('ENTREPRENEUR')
    await input.press('Enter')
    await expect.poll(async () => (await records(page)).length).toBe(1)
    assert.equal((await records(page))[0].wrongCount, 2)
  })

  await check(
    'composition Enter does not submit or pause; empty answers are ignored',
    async (page) => {
      const input = page.getByRole('textbox', { name: '英文默写输入' })
      await input.focus()
      await input.press('Enter')
      await expect(page.getByRole('button', { name: '暂停', exact: true })).toBeVisible()
      await input.evaluate((el) => {
        el.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }))
      })
      await input.fill('entrepreneur')
      await input.press('Enter')
      assert.equal((await records(page)).length, 0)
      await expect(input).toHaveValue('entrepreneur')
      await input.evaluate((el) => {
        el.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true, data: 'entrepreneur' }))
      })
      await input.press('Enter')
      await expect.poll(async () => (await records(page)).length).toBe(1)
    },
    { mobile: true },
  )

  await check(
    'whole-word mode respects case sensitivity',
    async (page) => {
      const input = page.getByRole('textbox', { name: '英文默写输入' })
      await input.fill('ENTREPRENEUR')
      await input.press('Enter')
      await expect(page.getByRole('status').filter({ hasText: '拼写不正确' })).toBeVisible()
      assert.equal((await records(page)).length, 0)
      await input.fill('entrepreneur')
      await input.press('Enter')
      await expect.poll(async () => (await records(page)).length).toBe(1)
    },
    { storage: { isIgnoreCase: false } },
  )

  for (const width of [320, 390, 844]) {
    await check(
      `hidden-length whole-word input fits ${width}px and settings do not steal focus`,
      async (page) => {
        await page.setViewportSize({ width, height: width === 844 ? 390 : 844 })
        await page.getByLabel('单词长度已隐藏', { exact: true }).waitFor()
        const input = page.getByRole('textbox', { name: '英文默写输入' })
        await input.fill('entre')
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
        await page.getByRole('button', { name: '开关默写模式', exact: true }).tap()
        const toggle = page.getByRole('switch', { name: '隐藏字母数', exact: true })
        const panel = toggle.locator('xpath=../..')
        const panelRect = await panel.boundingBox()
        assert.ok(panelRect.x >= 0 && panelRect.x + panelRect.width <= width, JSON.stringify(panelRect))
        await toggle.uncheck()
        await page.waitForTimeout(350)
        assert.equal(await input.evaluate((el) => el === document.activeElement), false)
        await toggle.check()
        await page.getByRole('button', { name: '开关默写模式', exact: true }).tap()
        await expect(toggle).toBeHidden()
        await input.tap()
        await page.screenshot({ path: `/private/tmp/zju-answer-${width}.png`, fullPage: true })
      },
      { mobile: true, storage: { hideWordLength: true } },
    )
  }

  await check('hidden length uses one fixed line for different words and remembers the setting', async (page) => {
    await page.getByRole('button', { name: '开关默写模式', exact: true }).click()
    await page.getByRole('switch', { name: '隐藏字母数', exact: true }).check()
    await page.getByRole('button', { name: '开关默写模式', exact: true }).click()
    const line = page.getByLabel('单词长度已隐藏', { exact: true })
    await line.waitFor()
    const first = await line.boundingBox()
    assert.equal(await line.textContent(), '')
    assert.equal(await page.locator('.tooltip-info > div:first-child').textContent(), '')
    await page.getByRole('textbox', { name: '英文默写输入' }).fill('entrepreneur')
    await page.getByRole('textbox', { name: '英文默写输入' }).press('Enter')
    await expect(page.getByRole('textbox')).toHaveValue('')
    await expect(line).toBeVisible()
    assert.equal((await line.boundingBox()).width, first.width)
    await page.reload({ waitUntil: 'domcontentloaded' })
    await expect(line).toBeVisible()
    await page.getByRole('button', { name: '开关默写模式', exact: true }).click()
    await page.getByRole('switch', { name: '隐藏字母数', exact: true }).uncheck()
    await page.getByRole('button', { name: '开关默写模式', exact: true }).click()
    await expect(line).toHaveCount(0)
    assert.match(await page.locator('.tooltip-info > div:first-child').textContent(), /^_+$/)
  })

  await check('whole-word grading can be disabled and the saved choice survives reload', async (page) => {
    await page.getByRole('button', { name: '开关默写模式', exact: true }).click()
    await page.getByRole('switch', { name: '整词提交后判定', exact: true }).uncheck()
    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.getByRole('button', { name: '开关默写模式', exact: true }).click()
    await expect(page.getByRole('switch', { name: '整词提交后判定', exact: true })).not.toBeChecked()
    await page.getByRole('button', { name: '开关默写模式', exact: true }).click()
    await page.getByRole('button', { name: '开始', exact: true }).click()
    await page.keyboard.type('entrepreneur')
    await expect.poll(async () => (await records(page)).length).toBe(1)
  })

  await check(
    'Chinese visibility stays enabled after loading the next chapter',
    async (page) => {
      await page.getByRole('button', { name: /开关释义显示/ }).click()
      await page.getByRole('button', { name: '开始', exact: true }).click()
      for (let index = 0; index < 19; index += 1) {
        await page.keyboard.press('Control+Shift+ArrowRight')
        await expect(page.locator('span').filter({ hasText: new RegExp(`^第${index + 2}词$`) })).toBeVisible()
      }
      await expect(page.locator('.tooltip-info > div:first-child')).toHaveText('_________')
      await page.keyboard.type('twentieth', { delay: 80 })
      await page.getByRole('button', { name: '下一章节', exact: true }).click()
      await expect(page.getByText('n. 次章释义', { exact: true })).toBeVisible()
      await page.getByRole('button', { name: /开关释义显示/ }).click()
      await expect(page.getByText('n. 次章释义', { exact: true })).toHaveCount(0)
    },
    {
      storage: { wholeWordMode: false },
      dictionary: [
        ...Array.from({ length: 19 }, (_, index) => ({ name: `word${index}`, trans: [`第${index + 1}词`] })),
        { name: 'twentieth', trans: ['第20词'] },
        { name: 'next', trans: ['n. 次章释义'] },
      ],
    },
  )
} finally {
  await browser.close()
}
if (failures.length) process.exitCode = 1
