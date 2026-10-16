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

async function openPage(viewport = { width: 390, height: 844 }, mobile = true, storage = {}) {
  const context = await browser.newContext({ viewport, isMobile: mobile, hasTouch: mobile })
  const page = await context.newPage()
  page.setDefaultTimeout(5000)
  await page.route('**/dicts/zju-english-3-unit-1-reading-1.json', (route) => route.fulfill({ json: words }))
  await page.addInitScript((storage) => {
    localStorage.setItem('phoneticConfig', JSON.stringify({ isOpen: false }))
    for (const [key, value] of Object.entries(storage)) localStorage.setItem(key, JSON.stringify(value))
  }, storage)
  await page.goto(baseURL, { waitUntil: 'domcontentloaded' })
  await page.locator('.tooltip-info').waitFor()
  return { context, page }
}

async function check(name, fn) {
  try {
    await fn()
    console.log(`PASS ${name}`)
  } catch (error) {
    failures.push(name)
    console.error(`FAIL ${name}: ${error.message.split('Call log:')[0]}`)
  }
}

async function input(page, text, type = 'insertText', data = text) {
  await page.locator('#typing-mobile-input').evaluate(
    (el, args) => {
      el.value = args.text
      el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: args.type, data: args.data }))
    },
    { text, type, data },
  )
}

async function records(page) {
  const exists = await page.evaluate(async () => (await indexedDB.databases()).some((db) => db.name === 'RecordDB'))
  if (!exists) return []
  return page.evaluate(
    () =>
      new Promise((resolve, reject) => {
        const request = indexedDB.open('RecordDB')
        request.onerror = () => reject(request.error)
        request.onsuccess = () => {
          const db = request.result
          if (!db.objectStoreNames.contains('wordRecords')) {
            db.close()
            reject(new Error('RecordDB has no wordRecords store'))
            return
          }
          const query = db.transaction('wordRecords').objectStore('wordRecords').getAll()
          query.onsuccess = () => {
            db.close()
            resolve(query.result)
          }
          query.onerror = () => {
            db.close()
            reject(query.error)
          }
        }
      }),
  )
}

async function waitForRecords(page, count) {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const saved = await records(page)
    if (saved.length >= count) return saved
    await page.waitForTimeout(50)
  }
  assert.fail(`Expected ${count} persisted word records`)
}

try {
  for (const mobile of [true, false]) {
    await check(`${mobile ? 'mobile' : 'desktop'} first visit hides English and Chinese by default`, async () => {
      const { context, page } = await openPage(mobile ? undefined : { width: 1440, height: 1000 }, mobile)
      assert.equal(await page.locator('.tooltip-info > div:first-child').textContent(), '____________')
      assert.equal(await page.getByText('n. 企业家', { exact: true }).count(), 0)
      await page.getByRole('button', { name: '开关默写模式', exact: true }).click()
      assert.equal(await page.getByRole('switch').getAttribute('aria-checked'), 'true')
      assert.equal(await page.getByRole('button', { name: '全部隐藏', exact: true }).count(), 1)
      await context.close()
    })
  }

  await check('manually disabling dictation survives reload', async () => {
    const { context, page } = await openPage()
    await page.getByRole('button', { name: '开关默写模式', exact: true }).tap()
    await page.getByRole('switch').uncheck()
    await page.reload()
    await page.locator('.tooltip-info').waitFor()
    assert.equal(await page.locator('.tooltip-info > div:first-child').textContent(), 'entrepreneur')
    await page.getByRole('button', { name: '开关默写模式', exact: true }).tap()
    assert.equal(await page.getByRole('switch').getAttribute('aria-checked'), 'false')
    await context.close()
  })

  await check('saved dictation choices are not replaced by the new default', async () => {
    for (const config of [
      { isOpen: false, type: 'hideAll', openBy: 'user' },
      { isOpen: true, type: 'hideVowel', openBy: 'user' },
    ]) {
      const { context, page } = await openPage(undefined, true, { 'wordDictationConfig-v2': config })
      assert.equal(await page.locator('.tooltip-info > div:first-child').textContent(), config.isOpen ? '_ntr_pr_n__r' : 'entrepreneur')
      await context.close()
    }
  })

  await check('default dictation stays enabled when repeating a completed chapter', async () => {
    const { context, page } = await openPage()
    await page.locator('#typing-mobile-input').tap()
    for (const word of words) {
      await input(page, word.name)
      await page.waitForTimeout(1400)
    }
    await page.getByRole('button', { name: '重复本章节', exact: true }).tap()
    await page.locator('.tooltip-info > div:first-child > span').first().waitFor()
    assert.equal(await page.locator('.tooltip-info > div:first-child').textContent(), '____________')
    await context.close()
  })

  await check('mobile starts paused and focuses synchronously on Start', async () => {
    const { context, page } = await openPage()
    assert.equal(await page.getByRole('button', { name: '开始', exact: true }).count(), 1)
    await page.evaluate(() => {
      window.focusAtClickEnd = false
      document.addEventListener('click', () => {
        window.focusAtClickEnd = document.activeElement?.id === 'typing-mobile-input'
      })
    })
    await page.getByRole('button', { name: '开始', exact: true }).tap()
    assert.equal(await page.evaluate(() => window.focusAtClickEnd), true)
    const box = page.locator('#typing-mobile-input')
    assert.equal(await box.getAttribute('autocapitalize'), 'none')
    assert.ok(await box.evaluate((el) => parseFloat(getComputedStyle(el).fontSize) >= 16))
    await page.getByRole('button', { name: '暂停', exact: true }).tap()
    assert.notEqual(await page.evaluate(() => document.activeElement?.id), 'typing-mobile-input')
    await context.close()
  })

  await check('mobile validates all characters, reveals Chinese, saves once and keeps focus', async () => {
    const { context, page } = await openPage()
    await page.locator('#typing-mobile-input').tap()
    await input(page, 'xxxxxxxxxxxr')
    await page.waitForTimeout(450)
    assert.equal((await records(page)).length, 0, 'a matching final letter must not accept a wrong word')
    await input(page, 'entrepreneur', 'insertReplacementText', null)
    await page.getByText('n. 企业家', { exact: true }).waitFor()
    await input(page, 'extra')
    await page.waitForTimeout(1400)
    const saved = await records(page)
    assert.equal(saved.length, 1)
    assert.equal(saved[0].word, 'entrepreneur')
    assert.equal(saved[0].wrongCount, 1)
    assert.equal(await page.evaluate(() => document.activeElement?.id), 'typing-mobile-input')
    await input(page, 'mistaken')
    await page.getByText('adj. 错误的', { exact: true }).waitFor()
    await page.waitForTimeout(1400)
    assert.equal((await records(page)).length, 2)
    await page.reload()
    assert.equal((await records(page)).length, 2, 'records survive reload')
    await context.close()
  })

  await check('mobile settings can take focus without keyboard stealing it', async () => {
    const { context, page } = await openPage()
    await page.locator('#typing-mobile-input').tap()
    await page.getByRole('button', { name: '开关默写模式', exact: true }).tap()
    await page.getByRole('button', { name: '全部隐藏', exact: true }).tap()
    await page.getByRole('option', { name: '隐藏元音', exact: true }).tap()
    assert.equal(JSON.parse(await page.evaluate(() => localStorage.getItem('wordDictationConfig-v2'))).type, 'hideVowel')
    assert.notEqual(await page.evaluate(() => document.activeElement?.id), 'typing-mobile-input')
    await context.close()
  })

  await check('composition commits once and accepts English phrases with spaces', async () => {
    const { context, page } = await openPage()
    await page.locator('#typing-mobile-input').tap()
    await page.locator('#typing-mobile-input').evaluate((el) => {
      el.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }))
      el.value = 'entrepreneur'
      el.dispatchEvent(new InputEvent('input', { bubbles: true, data: 'entrepreneur', isComposing: true }))
    })
    assert.equal((await records(page)).length, 0)
    await page.locator('#typing-mobile-input').evaluate((el) => {
      el.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true, data: 'entrepreneur' }))
      el.dispatchEvent(new InputEvent('input', { bubbles: true, data: 'entrepreneur', inputType: 'insertCompositionText' }))
    })
    await page.waitForTimeout(1400)
    assert.equal((await records(page)).length, 1)
    await input(page, 'mistaken')
    await page.waitForTimeout(1400)
    await input(page, 'take responsibility')
    await page.getByText('承担责任', { exact: true }).waitFor()
    assert.equal((await waitForRecords(page, 3)).length, 3)
    await context.close()
  })

  await check('a correct word followed by extra characters is not accepted', async () => {
    const { context, page } = await openPage()
    await page.locator('#typing-mobile-input').tap()
    await input(page, 'entrepreneurWRONG')
    await page.waitForTimeout(400)
    assert.equal((await records(page)).length, 0)
    assert.equal(await page.getByText('n. 企业家', { exact: true }).count(), 0)
    await input(page, 'entrepreneur')
    const saved = await waitForRecords(page, 1)
    assert.equal(saved[0].wrongCount, 1)
    await context.close()
  })

  await check('word repetition preserves the focused mobile input', async () => {
    const { context, page } = await openPage(undefined, true, { loopWordConfig: { times: 2 } })
    await page.locator('#typing-mobile-input').tap()
    await input(page, 'entrepreneur')
    await page.waitForTimeout(1400)
    assert.equal(await page.evaluate(() => document.activeElement?.id), 'typing-mobile-input')
    await input(page, 'entrepreneur')
    await page.waitForTimeout(1400)
    assert.equal((await records(page)).length, 2)
    await context.close()
  })

  await check('tap the paused word to focus input and fit a keyboard-sized viewport', async () => {
    const { context, page } = await openPage()
    await page.getByRole('button', { name: '开始默写', exact: true }).tap()
    assert.equal(await page.evaluate(() => document.activeElement?.id), 'typing-mobile-input')
    await page.setViewportSize({ width: 390, height: 400 })
    await page.locator('#typing-mobile-input').tap()
    await page.waitForFunction(
      () => {
        const rect = document.getElementById('typing-mobile-input').getBoundingClientRect()
        return rect.top >= -1 && rect.bottom <= innerHeight + 1
      },
      undefined,
      { timeout: 2000 },
    )
    const rect = await page.locator('#typing-mobile-input').boundingBox()
    // Native scrolling rounds fractional CSS pixels to the nearest device pixel.
    assert.ok(rect.y >= -1 && rect.y + rect.height <= 401, JSON.stringify(rect))
    await context.close()
  })

  for (const viewport of [
    { width: 320, height: 568 },
    { width: 390, height: 844 },
    { width: 844, height: 390 },
  ]) {
    await check(`mobile fits ${viewport.width}x${viewport.height} including landscape input`, async () => {
      const { context, page } = await openPage(viewport)
      assert.equal(await page.locator('#typing-mobile-input').count(), 1)
      const dimensions = await page.evaluate(() => ({ content: document.documentElement.scrollWidth, viewport: innerWidth }))
      assert.ok(dimensions.content <= viewport.width, JSON.stringify(dimensions))
      await context.close()
    })
  }

  await check('desktop keyboard dictation remains usable', async () => {
    const { context, page } = await openPage({ width: 1440, height: 1000 }, false)
    await page.getByRole('button', { name: '开始', exact: true }).click()
    await page.keyboard.type('entrepreneur', { delay: 20 })
    await page.getByText('n. 企业家', { exact: true }).waitFor()
    assert.equal((await waitForRecords(page, 1)).length, 1)
    await context.close()
  })
} finally {
  await browser.close()
}

if (failures.length) process.exitCode = 1
