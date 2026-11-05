import { expect } from '@playwright/test'
import assert from 'node:assert/strict'
import { chromium } from 'playwright'

const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL || 'chrome', headless: true })
const baseURL = process.env.TEST_URL || 'http://127.0.0.1:5174'
const failures = []
const guideKey = 'zju-practice-guide-seen-v1'
const targets = [
  'course',
  'start',
  'practice',
  'answer',
  'translation',
  'word-list',
  'mistakes',
  'analysis',
  'export',
  'theme',
  'fingers',
  'settings',
  'help',
]
const words = [
  { name: 'entrepreneur', trans: ['n. 企业家'] },
  { name: 'mistaken', trans: ['adj. 错误的'] },
]

async function check(name, fn, { width = 1440, height = 1000, fresh = false, storage = {}, dictionary = words } = {}) {
  if (process.env.TEST_MATCH && !name.includes(process.env.TEST_MATCH)) return
  const context = await browser.newContext({ viewport: { width, height }, isMobile: width < 768, hasTouch: width < 768 })
  const page = await context.newPage()
  page.setDefaultTimeout(6000)
  try {
    await page.route('https://dict.youdao.com/**', (route) => route.abort())
    await page.route('**/dicts/zju-english-3-unit-1-reading-1.json', (route) => route.fulfill({ json: dictionary }))
    await page.addInitScript(
      ({ fresh, storage, guideKey }) => {
        if (sessionStorage.getItem('guide-test-seeded')) return
        if (!fresh) {
          localStorage.setItem(guideKey, 'true')
          localStorage.setItem('lastSeenRelease', JSON.stringify('0.4.0'))
        }
        document.cookie = 'zju-translation-visible=false; Path=/; SameSite=Lax'
        localStorage.setItem('hideWordLength', 'false')
        localStorage.setItem('phoneticConfig', JSON.stringify({ isOpen: false }))
        for (const [key, value] of Object.entries(storage)) localStorage.setItem(key, JSON.stringify(value))
        sessionStorage.setItem('guide-test-seeded', 'true')
      },
      { fresh, storage, guideKey },
    )
    await page.goto(baseURL, { waitUntil: 'domcontentloaded' })
    await page.locator('.tooltip-info').waitFor()
    await fn(page, context)
    console.log(`PASS ${name}`)
  } catch (error) {
    failures.push(name)
    console.error(`FAIL ${name}: ${error.stack}`)
    await page.screenshot({ path: `/private/tmp/zju-guide-failure-${failures.length}.png`, fullPage: true })
  } finally {
    await context.close()
  }
}

async function recordCount(page) {
  return page.evaluate(async () => {
    if (!(await indexedDB.databases()).some(({ name }) => name === 'RecordDB')) return 0
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('RecordDB')
      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        const db = request.result
        const query = db.transaction('wordRecords').objectStore('wordRecords').count()
        query.onsuccess = () => {
          db.close()
          resolve(query.result)
        }
      }
    })
  })
}

const guide = (page) => page.getByRole('dialog').filter({ has: page.locator('[data-guide-card]') })

try {
  for (const wholeWordMode of [true, false]) {
    for (const width of [1440, 390]) {
      await check(
        `dictation hides saved phonetics while paused, typing and peeking (${wholeWordMode}, ${width}px)`,
        async (page) => {
          const phonetic = page.getByText('AmE: [ˌɑːntrəprəˈnɜːr]', { exact: true })
          await expect(phonetic).toHaveCount(0)
          await page.getByRole('button', { name: '开始', exact: true }).click()
          if (wholeWordMode) {
            const input = page.getByRole('textbox', { name: '英文默写输入' })
            await input.fill('wrong')
            await input.press('Enter')
            await expect(page.getByText('拼写不正确，请修改后重试')).toBeVisible()
          } else {
            await page.keyboard.type('z')
          }
          await expect(phonetic).toHaveCount(0)
          await page.getByRole('button', { name: '查看答案', exact: true }).click()
          await expect(page.getByRole('status').filter({ hasText: 'entrepreneur' })).toBeVisible()
          await expect(phonetic).toHaveCount(0)
          await page.getByRole('button', { name: '暂停', exact: true }).click()
          await expect(phonetic).toHaveCount(0)
          await page.reload()
          await expect(phonetic).toHaveCount(0)
          await page.getByRole('button', { name: '打开设置对话框', exact: true }).click()
          await page.getByRole('switch', { name: '默写模式', exact: true }).uncheck()
          await page.getByRole('tab', { name: '显示设置', exact: true }).click()
          const display = page.getByRole('switch', { name: '显示音标', exact: true })
          await expect(display).toBeChecked()
          await page.getByRole('button', { name: '关闭设置', exact: true }).click()
          await expect(phonetic).toBeVisible()
          await page.getByRole('button', { name: '打开设置对话框', exact: true }).click()
          await page.getByRole('tab', { name: '显示设置', exact: true }).click()
          await display.uncheck()
          await page.getByRole('button', { name: '关闭设置', exact: true }).click()
          await expect(phonetic).toHaveCount(0)
          await page.getByRole('button', { name: '打开设置对话框', exact: true }).click()
          await page.getByRole('tab', { name: '显示设置', exact: true }).click()
          await display.check()
          await page.getByRole('tab', { name: '默写设置', exact: true }).click()
          await page.getByRole('switch', { name: '默写模式', exact: true }).check()
          await page.getByRole('button', { name: '关闭设置', exact: true }).click()
          await expect(phonetic).toHaveCount(0)
          assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('phoneticConfig')).isOpen), true)
        },
        {
          width,
          dictionary: [{ ...words[0], usphone: 'ˌɑːntrəprəˈnɜːr', ukphone: 'ˌɒntrəprəˈnɜː' }, words[1]],
          storage: { wholeWordMode, hideWordLength: width < 768, phoneticConfig: { isOpen: true, type: 'us' } },
        },
      )
    }
  }

  for (const width of [1440, 390, 320, 844]) {
    await check(
      `first-visit tour highlights every feature and fits ${width}px`,
      async (page) => {
        const dialog = guide(page)
        await expect(page.getByRole('dialog')).toHaveCount(1)
        await expect(dialog).toBeVisible()
        for (const [index, target] of targets.entries()) {
          await expect(dialog.locator('[data-guide-highlight]')).toHaveAttribute('data-guide-highlight', target)
          await expect(dialog.getByText(`功能介绍 · ${index + 1} / ${targets.length}`, { exact: true })).toBeVisible()
          const card = await dialog.locator('[data-guide-card]').boundingBox()
          const viewport = page.viewportSize()
          assert.ok(
            card.x >= 15 && card.y >= 15 && card.x + card.width <= viewport.width - 15 && card.y + card.height <= viewport.height - 15,
            `Tour card exceeds viewport: ${JSON.stringify(card)}`,
          )
          const spotlight = await dialog.locator('[data-guide-highlight]').boundingBox()
          assert.ok(spotlight.width > 0 && spotlight.height > 0, `${target} has no visible highlight`)
          if (spotlight.height + card.height + 46 <= viewport.height) {
            assert.ok(
              card.y + card.height <= spotlight.y || card.y >= spotlight.y + spotlight.height,
              `${target} is covered by the tour card`,
            )
          }
          assert.ok(await dialog.locator('[data-guide-card]').evaluate((el) => el.scrollWidth <= el.clientWidth), 'Tour content overflows')
          if ([0, 2, 12].includes(index)) await page.screenshot({ path: `/private/tmp/zju-guide-${width}-${target}.png` })
          if (index === 0) {
            await page.keyboard.type('abc')
            await page.keyboard.press('Control+Shift+ArrowRight')
            await expect(page.locator('[aria-label="英文默写输入"]')).toHaveValue('')
            await expect(page.locator('[data-guide="start"]')).toHaveText('开始')
          }
          if (index === 1) {
            await dialog.getByRole('button', { name: '上一步', exact: true }).click()
            await expect(dialog.getByRole('heading')).toHaveText('选择词表和章节')
            await dialog.getByRole('button', { name: '下一步', exact: true }).click()
          }
          await dialog.getByRole('button', { name: index === targets.length - 1 ? '完成介绍' : '下一步', exact: true }).click()
        }
        await expect(dialog).toHaveCount(0)
        assert.equal(await page.evaluate((key) => localStorage.getItem(key), guideKey), 'true')
        await page.reload()
        await expect(page.getByRole('button', { name: '功能介绍', exact: true })).toBeVisible()
        await expect(page.getByRole('dialog')).toHaveCount(0)
        await page.getByRole('button', { name: '功能介绍', exact: true }).click()
        await expect(guide(page).getByRole('heading')).toHaveText('选择词表和章节')
        await page.keyboard.press('Escape')
        await expect(guide(page)).toHaveCount(0)
      },
      { width, height: width === 844 ? 390 : 1000, fresh: true },
    )
  }

  await check(
    'skip persists; manual help pauses practice and preserves input',
    async (page, context) => {
      await guide(page).getByRole('button', { name: '跳过介绍', exact: true }).click()
      await page.reload()
      await expect(page.getByRole('dialog')).toHaveCount(0)
      const input = page.getByRole('textbox', { name: '英文默写输入' })
      await input.fill('entr')
      await expect(page.getByRole('button', { name: '暂停', exact: true })).toBeVisible()
      await page.getByRole('button', { name: '功能介绍', exact: true }).click()
      await expect(guide(page)).toBeVisible()
      await page.keyboard.type('wrong')
      await expect(page.locator('[aria-label="英文默写输入"]')).toHaveValue('entr')
      await guide(page).getByRole('button', { name: '关闭功能介绍', exact: true }).click()
      await expect(page.getByRole('button', { name: '开始', exact: true })).toBeVisible()
      await expect(input).toHaveValue('entr')
      const nextContext = await browser.newContext({ storageState: await context.storageState() })
      try {
        const nextPage = await nextContext.newPage()
        await nextPage.goto(baseURL)
        await expect(nextPage.getByRole('button', { name: '功能介绍', exact: true })).toBeVisible()
        await expect(nextPage.getByRole('dialog')).toHaveCount(0)
      } finally {
        await nextContext.close()
      }
    },
    { fresh: true },
  )

  for (const wholeWordMode of [true, false]) {
    for (const hideWordLength of [false, true]) {
      await check(
        `first-letter hint persists without prefilling or grading (${wholeWordMode}, ${hideWordLength})`,
        async (page) => {
          const prompt = () =>
            hideWordLength ? page.getByLabel('首字母提示', { exact: true }) : page.getByLabel('字母格输入区', { exact: true })
          await expect(prompt()).toHaveText(hideWordLength ? '首字母e' : /^e_+$/)
          assert.equal(await recordCount(page), 0)
          const openSettings = () => page.getByRole('button', { name: '打开设置对话框', exact: true }).click()
          await openSettings()
          await page.getByRole('switch', { name: '显示首字母', exact: true }).uncheck()
          await page.getByRole('button', { name: '关闭设置', exact: true }).click()
          if (hideWordLength) await expect(prompt()).toHaveCount(0)
          else await expect(prompt()).toHaveText(/^_+$/)
          await page.reload()
          await openSettings()
          await expect(page.getByRole('switch', { name: '显示首字母', exact: true })).not.toBeChecked()
          await page.getByRole('switch', { name: '显示首字母', exact: true }).check()
          await page.getByRole('button', { name: '关闭设置', exact: true }).click()
          await page.getByRole('button', { name: '开始', exact: true }).click()
          if (wholeWordMode) {
            const input = page.getByRole('textbox', { name: '英文默写输入' })
            await expect(input).toHaveValue('')
            await input.fill('ntrepreneur')
            await input.press('Enter')
            await expect(page.getByText('拼写不正确，请修改后重试')).toBeVisible()
            assert.equal(await recordCount(page), 0)
            await input.fill('entrepreneur')
            await input.press('Enter')
          } else {
            await page.keyboard.type('entrepreneur')
          }
          await expect.poll(() => recordCount(page)).toBe(1)
          await expect(prompt()).toHaveText(hideWordLength ? '首字母m' : /^m_+$/)
        },
        { storage: { showFirstLetter: true, wholeWordMode, hideWordLength } },
      )
    }
  }

  await check(
    'phrase hint finds the first letter after leading punctuation',
    async (page) => {
      await expect(page.getByLabel('字母格输入区', { exact: true })).toHaveText(/^__t_+$/)
    },
    { dictionary: [{ name: '…take responsibility', trans: ['phr. 承担责任'] }], storage: { showFirstLetter: true } },
  )

  for (const width of [1024, 1440, 1920]) {
    await check(
      `navigation tools sit directly beside the actions at ${width}px`,
      async (page) => {
        const tools = await page.locator('[aria-label="练习工具"]').boundingBox()
        const actions = await page.locator('[data-guide="start"]').locator('..').boundingBox()
        assert.ok(Math.abs(tools.y - actions.y) < 4, 'Toolbar wraps unexpectedly')
        assert.ok(actions.x - tools.x - tools.width <= 12, 'Extra auto margin remains after the icons')
        await page.screenshot({ path: `/private/tmp/zju-guide-nav-${width}.png`, fullPage: true })
      },
      { width },
    )
  }
} finally {
  await browser.close()
}
if (failures.length) throw new Error(`${failures.length} check(s) failed: ${failures.join('; ')}`)
console.log('All practice guide and first-letter checks passed.')
