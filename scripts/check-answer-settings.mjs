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
        localStorage.setItem('lastSeenRelease', JSON.stringify('0.3.2'))
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

async function expectSlotsOnOneLine(page) {
  const field = page.getByLabel('字母格输入区', { exact: true })
  const cells = field.locator('[aria-hidden="true"] > span > span')
  const first = await cells.first().boundingBox()
  const bounds = await field.boundingBox()
  for (const cell of await cells.all()) {
    const rect = await cell.boundingBox()
    assert.ok(Math.abs(rect.y - first.y) < 1, `A letter slot wrapped despite enough space: ${JSON.stringify(rect)}`)
    assert.ok(rect.x >= bounds.x && rect.x + rect.width <= bounds.x + bounds.width + 1, 'Letter slot exceeds field width')
  }
}

try {
  await check(
    'paused continue prompt does not cover the word area',
    async (page) => {
      const prompt = page.getByRole('button', { name: '开始默写', exact: true })
      const wordArea = page.locator('.tooltip-info')
      const promptBox = await prompt.boundingBox()
      const wordBox = await wordArea.boundingBox()
      assert.ok(promptBox && wordBox, 'Both the continue prompt and word area must be present')
      assert.ok(
        promptBox.y + promptBox.height <= wordBox.y || promptBox.y >= wordBox.y + wordBox.height,
        JSON.stringify({ promptBox, wordBox }),
      )
    },
    { storage: { hideWordLength: true } },
  )

  await check(
    'whole-word answer keeps the same font size after Enter',
    async (page) => {
      const input = page.getByRole('textbox', { name: '英文默写输入' })
      const line = page.getByLabel('单词长度已隐藏', { exact: true })
      await input.click()
      await input.fill('indistinguishable')
      const inputFontSize = await input.evaluate((element) => getComputedStyle(element).fontSize)
      await input.press('Enter')
      const answer = line.getByText('indistinguishable', { exact: true })
      await expect(answer).toBeVisible()
      const answerFontSize = await answer.evaluate((element) => getComputedStyle(element).fontSize)
      assert.equal(answerFontSize, inputFontSize, JSON.stringify({ inputFontSize, answerFontSize }))
    },
    {
      dictionary: [
        { name: 'indistinguishable', trans: ['adj. 难以区别的'] },
        { name: 'short', trans: ['adj. 短的'] },
      ],
      storage: { hideWordLength: true },
    },
  )

  for (const fontSize of [20, 28, 48, 72, 96]) {
    await check(
      `short letter slots stay on one row at ${fontSize}px`,
      async (page) => {
        const field = page.getByLabel('字母格输入区', { exact: true })
        const input = field.getByRole('textbox', { name: '英文默写输入' })
        await expect(field).toHaveText('________')
        await expectSlotsOnOneLine(page)
        await input.fill('mist')
        await expectSlotsOnOneLine(page)
        await input.fill('mistaken')
        await expectSlotsOnOneLine(page)
        assert.ok(await input.evaluate((el) => el.scrollHeight <= el.clientHeight), 'Native input must fit on one row too')
      },
      { storage: { fontsize: { foreignFont: fontSize } }, dictionary: [words[1]] },
    )
  }

  await check(
    'phrase wrapping keeps remaining hints aligned after a trailing space',
    async (page) => {
      await page.setViewportSize({ width: 320, height: 844 })
      const field = page.getByLabel('字母格输入区', { exact: true })
      const input = field.getByRole('textbox', { name: '英文默写输入' })
      await input.fill('take all the resp')
      const cells = field.locator('[aria-hidden="true"] > span > span')
      const space = await cells.nth(12).boundingBox()
      const next = await cells.nth(13).boundingBox()
      assert.ok(space.y < next.y, 'The trailing space must wrap like the native textarea, not become a leading cell')
      const hint = await cells.nth(17).boundingBox()
      assert.ok(Math.abs(hint.x - next.x - 4 * next.width) < 1, 'Remaining hints must start immediately after resp')
      await page.screenshot({ path: '/private/tmp/zju-v032-phrase-grid.png', fullPage: true })
      await input.fill('take all the responsibility')
      await input.press('Enter')
      await expect.poll(async () => (await records(page)).length).toBe(1)
    },
    {
      mobile: true,
      storage: { 'wordDictationConfig-v2': { isOpen: true, type: 'hideConsonant', openBy: 'user' } },
      dictionary: [{ name: 'take all the responsibility', trans: ['承担全部责任'] }],
    },
  )

  await check(
    'long letter-slot prompts stay fully visible on mobile',
    async (page) => {
      await page.setViewportSize({ width: 320, height: 844 })
      const field = page.getByLabel('字母格输入区', { exact: true })
      const input = field.getByRole('textbox', { name: '英文默写输入' })
      const expectHintsToFit = async () => {
        const bounds = await field.boundingBox()
        for (const cell of await field.locator('[aria-hidden="true"] > span > span').all()) {
          const rect = await cell.boundingBox()
          assert.ok(rect.x >= bounds.x && rect.x + rect.width <= bounds.x + bounds.width + 1, `Clipped hint: ${JSON.stringify(rect)}`)
          assert.ok(rect.y + rect.height <= bounds.y + bounds.height + 1, 'Hint extends below the field')
        }
      }
      await expect(field).toHaveText('__a_a__e_i__i_a___')
      await expectHintsToFit()
      await input.fill('characteristi')
      await expectHintsToFit()
      await page.screenshot({ path: '/private/tmp/zju-v032-long-grid.png', fullPage: true })
      await input.fill('characteristically')
      await input.press('Enter')
      await expect.poll(async () => (await records(page)).length).toBe(1)
    },
    {
      mobile: true,
      storage: { 'wordDictationConfig-v2': { isOpen: true, type: 'hideConsonant', openBy: 'user' } },
      dictionary: [{ name: 'characteristically', trans: ['adv. 典型地'] }],
    },
  )

  for (const [isOpen, type, expected] of [
    [false, 'hideAll', 'entrepreneur'],
    [true, 'hideVowel', '_ntr_pr_n__r'],
    [true, 'hideConsonant', 'e___e__e_eu_'],
  ]) {
    await check(
      `inline letter slots retain ${isOpen ? type : 'visible English'}`,
      async (page) => {
        const field = page.getByLabel('字母格输入区', { exact: true })
        const input = field.getByRole('textbox', { name: '英文默写输入' })
        await expect(field).toHaveText(expected)
        await input.fill('entrepreneux')
        await input.evaluate((el) => el.setSelectionRange(2, 3))
        await input.press('Tab')
        assert.deepEqual(await input.evaluate((el) => [el.selectionStart, el.selectionEnd]), [2, 3])
        await input.press('X')
        await expect(input).toHaveValue('enXrepreneux')
        await page.locator('.tooltip-info .cursor-pointer').click()
        await expect(input).toBeFocused()
        await input.fill('entrepreneur')
        await input.press('Enter')
        await expect.poll(async () => (await records(page)).length).toBe(1)
      },
      { storage: { 'wordDictationConfig-v2': { isOpen, type, openBy: 'user' } } },
    )
  }

  for (const mobile of [false, true]) {
    await check(
      `${mobile ? 'mobile' : 'desktop'} default letter slots accept input without a lower box`,
      async (page) => {
        const input = page.getByRole('textbox', { name: '英文默写输入' })
        const wordArea = page.locator('.tooltip-info')
        await expect(page.getByLabel('单词长度已隐藏', { exact: true })).toHaveCount(0)
        assert.ok(await wordArea.evaluate((el) => el.contains(document.getElementById('typing-mobile-input'))))
        assert.ok(
          await input.evaluate((el) =>
            ['borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth'].every(
              (key) => getComputedStyle(el)[key] === '0px',
            ),
          ),
        )
        await expect(wordArea).toHaveText('____________')
        await expectSlotsOnOneLine(page)
        await input.click()
        await expect(input).toBeEditable()
        await input.type('entxx')
        await expect(input).toHaveValue('entxx')
        await expect(wordArea).toContainText('_______')
        await expectSlotsOnOneLine(page)
        await page.screenshot({ path: `/private/tmp/zju-v032-grid-typing-${mobile ? 'mobile' : 'desktop'}.png`, fullPage: true })
        assert.equal((await records(page)).length, 0)
        await input.fill('entrepreneur')
        await input.press('Enter')
        await expect.poll(async () => (await records(page)).length).toBe(1)
        await expect(input).toHaveValue('')
        await expect(input).toBeFocused()
        await expect(wordArea).toHaveText('________')
        await expectSlotsOnOneLine(page)
        await page.screenshot({ path: `/private/tmp/zju-v032-grid-${mobile ? 'mobile' : 'desktop'}.png`, fullPage: true })
      },
      { mobile },
    )
  }

  await check(
    'mobile legacy letter slots have no lower input box',
    async (page) => {
      const input = page.getByRole('textbox', { name: '英文默写输入' })
      assert.ok(await page.locator('.tooltip-info').evaluate((el) => el.contains(document.getElementById('typing-mobile-input'))))
      await page.getByRole('button', { name: '开始', exact: true }).tap()
      await input.type('entrepreneur')
      await expect.poll(async () => (await records(page)).length).toBe(1)
      await expect(input).toBeFocused()
    },
    { mobile: true, storage: { wholeWordMode: false } },
  )

  for (const width of [320, 390, 1440]) {
    await check(
      `fixed line itself is centered at ${width}px`,
      async (page) => {
        await page.setViewportSize({ width, height: 900 })
        const input = page.getByRole('textbox', { name: '英文默写输入' })
        await input.fill('entre')
        const line = await page.getByLabel('单词长度已隐藏', { exact: true }).boundingBox()
        assert.ok(Math.abs(line.x + line.width / 2 - width / 2) < 2, JSON.stringify(line))
        const sound = await page.locator('.tooltip-info .cursor-pointer').boundingBox()
        assert.ok(sound.x >= line.x + line.width, 'Sound control belongs to the right of the line')
        assert.ok(sound.x + sound.width <= width, 'Sound control must fit the viewport')
        await page.screenshot({ path: `/private/tmp/zju-v032-line-${width}.png`, fullPage: true })
      },
      { mobile: width < 768, storage: { hideWordLength: true } },
    )
  }

  await check(
    'desktop fixed line keeps a long typed word on one row beside the pronunciation control',
    async (page) => {
      const field = page.getByLabel('单词长度已隐藏', { exact: true })
      await page.getByRole('button', { name: '开始', exact: true }).click()
      await page.keyboard.type('indistinguishable')
      const letters = field.locator('span')
      const first = await letters.first().boundingBox()
      const bounds = await field.boundingBox()
      for (const letter of await letters.all()) {
        const rect = await letter.boundingBox()
        assert.ok(Math.abs(rect.y - first.y) < 1, `Long word wrapped on the fixed line: ${JSON.stringify(rect)}`)
        assert.ok(rect.x >= bounds.x && rect.x + rect.width <= bounds.x + bounds.width + 1, 'Long word exceeds the fixed line')
      }
      const sound = await page.locator('.tooltip-info .cursor-pointer').boundingBox()
      assert.ok(sound.x >= bounds.x + bounds.width, 'Sound control belongs to the right of the fixed line')
    },
    {
      dictionary: [
        { name: 'indistinguishable', trans: ['adj. 难以区别的'] },
        { name: 'short', trans: ['adj. 短的'] },
      ],
      storage: { hideWordLength: true, wholeWordMode: false, fontsize: { foreignFont: 48 } },
    },
  )

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
    'desktop long answers stay inside the fixed line beside the pronunciation control',
    async (page) => {
      const input = page.getByRole('textbox', { name: '英文默写输入' })
      const line = page.getByLabel('单词长度已隐藏', { exact: true })
      await input.fill('indistinguishable')
      await input.press('Enter')
      const answer = line.getByText('indistinguishable', { exact: true })
      await expect(answer).toBeVisible()
      const lineBox = await line.boundingBox()
      const answerBox = await answer.boundingBox()
      const soundBox = await page.locator('.tooltip-info .cursor-pointer').boundingBox()
      assert.ok(answerBox && lineBox && answerBox.x >= lineBox.x && answerBox.x + answerBox.width <= lineBox.x + lineBox.width + 1, JSON.stringify({ lineBox, answerBox }))
      assert.ok(soundBox && soundBox.x >= lineBox.x + lineBox.width, JSON.stringify({ lineBox, soundBox }))
    },
    {
      dictionary: [
        { name: 'indistinguishable', trans: ['adj. 难以区别的'] },
        { name: 'short', trans: ['adj. 短的'] },
      ],
      storage: { hideWordLength: true },
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
