import { expect } from '@playwright/test'
import assert from 'node:assert/strict'
import { chromium } from 'playwright'

const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL || 'chrome', headless: true })
const baseURL = process.env.TEST_URL || 'http://127.0.0.1:5174'
const failures = []
const releaseTitle = '0.3.1 更新说明'

async function check(name, fn, { width = 1440, height = 1000, seen = '0.3.1', blockedStorage = false } = {}) {
  if (process.env.TEST_MATCH && !name.includes(process.env.TEST_MATCH)) return
  const context = await browser.newContext({ viewport: { width, height }, isMobile: width < 768, hasTouch: width < 768 })
  const page = await context.newPage()
  page.setDefaultTimeout(4000)
  try {
    await page.route('https://dict.youdao.com/**', (route) => route.abort())
    await page.route('**/dicts/zju-english-3-unit-1-reading-1.json', (route) =>
      route.fulfill({
        json: [
          { name: 'entrepreneur', trans: ['n. 企业家'] },
          { name: 'mistaken', trans: ['adj. 错误的'] },
        ],
      }),
    )
    await page.addInitScript(
      ({ seen, blockedStorage }) => {
        if (!sessionStorage.getItem('release-test-seeded')) {
          localStorage.setItem('phoneticConfig', JSON.stringify({ isOpen: false }))
          localStorage.setItem('hideWordLength', 'false')
          localStorage.setItem('wholeWordMode', 'true')
          if (seen !== null) localStorage.setItem('lastSeenRelease', JSON.stringify(seen))
          sessionStorage.setItem('release-test-seeded', 'true')
        }
        if (blockedStorage) {
          for (const method of ['getItem', 'setItem']) {
            const original = Storage.prototype[method]
            Storage.prototype[method] = function (key, ...args) {
              if (this === localStorage && key === 'lastSeenRelease') throw new DOMException('Storage disabled', 'SecurityError')
              return original.call(this, key, ...args)
            }
          }
        }
      },
      { seen, blockedStorage },
    )
    await page.goto(baseURL, { waitUntil: 'domcontentloaded' })
    await page.locator('.tooltip-info').waitFor()
    await fn(page)
    console.log(`PASS ${name}`)
  } catch (error) {
    failures.push(name)
    console.error(`FAIL ${name}: ${error.message}`)
  } finally {
    await context.close()
  }
}

const settings = (page) => page.getByRole('dialog', { name: '设置', exact: true })
const release = (page) => page.getByRole('dialog', { name: releaseTitle, exact: true })
const gear = (page) => page.getByRole('button', { name: '打开设置对话框', exact: true })

async function expectFits(locator, width, height) {
  const bounds = await locator.boundingBox()
  assert.ok(
    bounds && bounds.x >= 0 && bounds.y >= 0 && bounds.x + bounds.width <= width + 1 && bounds.y + bounds.height <= height + 1,
    `Outside ${width}x${height}: ${JSON.stringify(bounds)}`,
  )
}

try {
  for (const width of [1440, 390, 320, 844]) {
    const height = width === 844 ? 390 : 1000
    await check(
      `header gear and all settings fit ${width}px`,
      async (page) => {
        await expect(page.locator('header').getByRole('button', { name: '打开设置对话框', exact: true })).toHaveCount(1)
        const bounds = await gear(page).boundingBox()
        const brand = await page.getByRole('heading', { name: '大学英语默写器' }).boundingBox()
        const header = await page.locator('header').boundingBox()
        assert.ok(bounds.x + bounds.width > header.x + header.width - 64, `Gear not at header right: ${JSON.stringify(bounds)}`)
        assert.ok(Math.abs(bounds.y + bounds.height / 2 - brand.y - brand.height / 2) < 24, 'Gear must share the brand row')
        assert.equal(
          await gear(page).evaluate((el) => {
            for (let node = el; node; node = node.parentElement) if (getComputedStyle(node).position === 'fixed') return true
            return false
          }),
          false,
        )
        assert.ok(
          await gear(page).evaluate((el) => {
            const rect = el.getBoundingClientRect()
            return el.contains(document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2))
          }),
          'Another control intercepts the gear',
        )
        await gear(page).click()
        await expect(settings(page)).toBeVisible()
        for (const title of ['默写设置', '音效设置', '高级设置', '显示设置', '数据设置']) {
          await settings(page).getByRole('tab', { name: title, exact: true }).click()
          await expectFits(settings(page).getByRole('tabpanel', { name: title, exact: true }), width, height)
          assert.ok(
            await settings(page)
              .getByRole('tabpanel', { name: title, exact: true })
              .evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
            `${title} overflows`,
          )
          assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Page overflows')
        }
        await settings(page).getByRole('tab', { name: '默写设置', exact: true }).click()
        await expectFits(settings(page).getByRole('switch', { name: '隐藏字母数', exact: true }), width, height)
        await page.screenshot({ path: `/private/tmp/zju-release-settings-${width}.png`, fullPage: true })
      },
      { width, height },
    )
  }

  for (const width of [1440, 390]) {
    await check(
      `settings controls persist ${width}px`,
      async (page) => {
        await gear(page).click()
        await settings(page).getByRole('switch', { name: '隐藏字母数', exact: true }).check()
        await settings(page).getByRole('switch', { name: '整词提交后判定', exact: true }).uncheck()
        assert.deepEqual(await page.evaluate(() => [localStorage.getItem('hideWordLength'), localStorage.getItem('wholeWordMode')]), [
          'true',
          'false',
        ])
        await page.reload({ waitUntil: 'domcontentloaded' })
        await gear(page).click()
        await expect(settings(page).getByRole('switch', { name: '隐藏字母数', exact: true })).toBeChecked()
        await expect(settings(page).getByRole('switch', { name: '整词提交后判定', exact: true })).not.toBeChecked()
      },
      { width },
    )
  }

  for (const dismissal of ['acknowledge', 'close', 'Escape']) {
    await check(
      `first visit release persists dismissal with ${dismissal}`,
      async (page) => {
        await expect(release(page)).toBeVisible()
        await expect(page.getByRole('dialog')).toHaveCount(1)
        await page.keyboard.press('a')
        await page.keyboard.press('Space')
        await page.keyboard.press('Enter')
        await page.waitForTimeout(1100)
        await expect(page.getByRole('button', { name: '开始', exact: true, includeHidden: true })).toHaveCount(1)
        if (dismissal === 'Escape') await page.keyboard.press('Escape')
        else
          await release(page)
            .getByRole('button', { name: dismissal === 'close' ? '关闭更新说明' : '知道了', exact: true })
            .click()
        await expect(release(page)).toHaveCount(0)
        assert.equal(await page.evaluate(() => localStorage.getItem('lastSeenRelease')), '"0.3.1"')
        await page.reload({ waitUntil: 'domcontentloaded' })
        await page.locator('.tooltip-info').waitFor()
        await expect(release(page)).toHaveCount(0)
      },
      { seen: null },
    )
  }

  for (const [width, height] of [
    [320, 568],
    [390, 844],
    [844, 390],
  ]) {
    await check(
      `release notes scroll and dismiss at ${width}x${height}`,
      async (page) => {
        await expect(release(page)).toBeVisible()
        await expectFits(release(page).getByRole('heading', { name: releaseTitle, exact: true }), width, height)
        await expectFits(release(page).getByRole('button', { name: '关闭更新说明', exact: true }), width, height)
        await page.screenshot({ path: `/private/tmp/zju-release-first-${width}.png`, animations: 'disabled' })
        const acknowledge = release(page).getByRole('button', { name: '知道了', exact: true })
        await acknowledge.scrollIntoViewIfNeeded()
        await expectFits(acknowledge, width, height)
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
        await acknowledge.click()
        await expect(page.getByRole('dialog')).toHaveCount(0)
      },
      { seen: null, width, height },
    )
  }

  await check('release storage safely handles disabled getters', async (page) => {
    const seen = await page.evaluate(async () => {
      const releaseStorage = await import('/src/resources/releases.ts')
      const descriptors = ['localStorage', 'sessionStorage'].map((key) => [key, Object.getOwnPropertyDescriptor(window, key)])
      try {
        for (const [key] of descriptors)
          Object.defineProperty(window, key, {
            configurable: true,
            get() {
              throw new DOMException('Storage disabled', 'SecurityError')
            },
          })
        const before = releaseStorage.hasSeenCurrentRelease()
        releaseStorage.acknowledgeCurrentRelease()
        return [before, releaseStorage.hasSeenCurrentRelease()]
      } finally {
        for (const [key, descriptor] of descriptors) Object.defineProperty(window, key, descriptor)
      }
    })
    assert.deepEqual(seen, [false, true])
  })

  await check(
    'old release upgrades once and stays dismissed after navigation',
    async (page) => {
      await expect(release(page)).toBeVisible()
      await release(page).getByRole('button', { name: '知道了', exact: true }).click()
      await page.locator('header a[href="/gallery"]').click()
      await page.getByRole('button', { name: '返回练习', exact: true }).click()
      await page.locator('.tooltip-info').waitFor()
      await expect(release(page)).toHaveCount(0)
    },
    { seen: '0.3.0' },
  )

  await check('manual reopen pauses typing and swaps a single dialog', async (page) => {
    await page.getByRole('button', { name: '开始', exact: true }).click()
    await gear(page).click()
    const wordBefore = await page.locator('.tooltip-info').textContent()
    const timer = page.getByText(/^\d{2}:\d{2}$/)
    const timeBefore = await timer.textContent()
    for (const key of ['a', 'Space', 'Enter', 'Control+Shift+ArrowRight', 'Control+ArrowRight', 'Tab']) await page.keyboard.press(key)
    await page.waitForTimeout(1200)
    assert.equal(await page.locator('.tooltip-info').textContent(), wordBefore)
    assert.equal(await timer.textContent(), timeBefore)
    assert.ok(await page.evaluate(() => !!document.activeElement?.closest('[role="dialog"]')), 'Tab focus escaped settings')
    await expect(page.getByRole('button', { name: '开始', exact: true, includeHidden: true })).toHaveCount(1)
    await settings(page).getByRole('button', { name: '本次更新', exact: true }).click()
    await expect(release(page)).toBeVisible()
    await expect(page.getByRole('dialog')).toHaveCount(1)
    await page.keyboard.press('a')
    await page.waitForTimeout(1100)
    await expect(page.getByRole('button', { name: '开始', exact: true, includeHidden: true })).toHaveCount(1)
    await page.keyboard.press('Escape')
    await expect(settings(page)).toBeVisible()
    await expect(page.getByRole('dialog')).toHaveCount(1)
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(gear(page)).toBeFocused()
  })

  await check(
    'unavailable localStorage still permits dismissal and session reload',
    async (page) => {
      await expect(release(page)).toBeVisible()
      await release(page).getByRole('button', { name: '知道了', exact: true }).click()
      await expect(release(page)).toHaveCount(0)
      await page.reload({ waitUntil: 'domcontentloaded' })
      await page.locator('.tooltip-info').waitFor()
      await expect(release(page)).toHaveCount(0)
      await gear(page).click()
      await expect(settings(page)).toBeVisible()
    },
    { seen: null, blockedStorage: true },
  )
} finally {
  await browser.close()
}
if (failures.length) process.exitCode = 1
