import { expect } from '@playwright/test'
import assert from 'node:assert/strict'
import { chromium } from 'playwright'

const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL || 'chrome', headless: true })
const baseURL = process.env.TEST_URL || 'http://127.0.0.1:5174'
const failures = []
const words = [
  { name: 'entrepreneur', trans: ['n. 企业家'], usphone: 'ˌɑːntrəprəˈnɜːr' },
  { name: 'mistaken', trans: ['adj. 错误的'] },
]

async function check(name, fn, { width = 1440, system = 'light', savedTheme } = {}) {
  const context = await browser.newContext({
    viewport: { width, height: 1000 },
    colorScheme: system,
    isMobile: width < 768,
    hasTouch: width < 768,
  })
  const page = await context.newPage()
  page.setDefaultTimeout(6000)
  let releaseApp
  const appGate = new Promise((resolve) => {
    releaseApp = resolve
  })
  let appRequested
  const requestReady = new Promise((resolve) => {
    appRequested = resolve
  })
  try {
    await page.route('https://dict.youdao.com/**', (route) => route.abort())
    await page.route('**/dicts/zju-english-3-unit-1-reading-1.json', (route) => route.fulfill({ json: words }))
    await page.addInitScript(
      ({ savedTheme }) => {
        if (sessionStorage.getItem('theme-defaults-seeded')) return
        localStorage.setItem('zju-practice-guide-seen-v1', 'true')
        localStorage.setItem('lastSeenRelease', JSON.stringify('0.4.0'))
        if (typeof savedTheme === 'boolean') {
          localStorage.setItem('isOpenDarkModeAtom', JSON.stringify(savedTheme))
          localStorage.setItem('state', JSON.stringify({ darkMode: !savedTheme }))
        }
        sessionStorage.setItem('theme-defaults-seeded', 'true')
      },
      { savedTheme },
    )
    await page.route('**/src/index.tsx*', async (route) => {
      appRequested()
      await appGate
      await route.continue()
    })
    const navigation = page.goto(baseURL, { waitUntil: 'domcontentloaded' })
    await requestReady
    const expectedDark = savedTheme ?? system === 'dark'
    assert.equal(
      await page.evaluate(() => document.documentElement.classList.contains('dark')),
      expectedDark,
      'Startup theme ignores the saved preference',
    )
    releaseApp()
    await navigation
    await page.locator('.tooltip-info').waitFor()
    await expect(page.getByRole('button', { name: '开关深色模式', exact: true })).toHaveAttribute('aria-pressed', String(expectedDark))
    await fn(page, context)
    console.log(`PASS ${name}`)
  } catch (error) {
    failures.push(name)
    console.error(`FAIL ${name}: ${error.stack}`)
    await page.screenshot({ path: `/private/tmp/zju-theme-failure-${failures.length}.png` })
  } finally {
    releaseApp()
    await context.close()
  }
}

async function expectReadableSettings(page, dark) {
  const dialog = page.getByRole('dialog', { name: '设置', exact: true })
  await expect.poll(() => page.evaluate(() => getComputedStyle(document.documentElement).colorScheme)).toBe(dark ? 'dark' : 'light')
  for (const name of ['默写设置', '发音音效', '显示设置', '数据管理']) {
    await dialog.getByRole('tab', { name, exact: true }).click()
    const panel = dialog.getByRole('tabpanel', { name, exact: true })
    const inspect = () =>
      panel.evaluate((el, dark) => {
        const rgb = (value) =>
          value
            .match(/[\d.]+/g)
            .slice(0, 3)
            .map(Number)
        const luminance = (color) =>
          rgb(color)
            .map((n) => {
              const channel = n / 255
              return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
            })
            .reduce((sum, n, i) => sum + n * [0.2126, 0.7152, 0.0722][i], 0)
        const background = (element) => {
          for (let node = element; node; node = node.parentElement) {
            const color = getComputedStyle(node).backgroundColor
            if (color !== 'rgba(0, 0, 0, 0)' && color !== 'transparent') return color
          }
          return 'rgb(255, 255, 255)'
        }
        const issues = []
        for (const element of el.querySelectorAll('label, h3, p, select, [class*="row-label"]')) {
          if (!element.textContent.trim()) continue
          const style = getComputedStyle(element)
          const foreground = luminance(style.color)
          const bg = luminance(background(element))
          const contrast = (Math.max(foreground, bg) + 0.05) / (Math.min(foreground, bg) + 0.05)
          if (contrast < 4.5) issues.push(`${element.textContent.trim().slice(0, 25)} contrast ${contrast.toFixed(2)}`)
          if (element.tagName === 'SELECT' && (dark ? bg > 0.15 : bg < 0.8)) issues.push('Select uses the wrong theme background')
          if (element.tagName !== 'SELECT' && !['left', 'start'].includes(style.textAlign)) issues.push('Setting text should align left')
        }
        return issues
      }, dark)
    await expect.poll(inspect, { message: `${name} should have readable theme colors` }).toEqual([])
    assert.ok(await panel.evaluate((el) => el.scrollWidth <= el.clientWidth), `${name} overflows`)
  }
  await dialog.getByRole('tab', { name: '默写设置', exact: true }).click()
}

try {
  for (const width of [1440, 390]) {
    for (const savedTheme of [false, true]) {
      await check(
        `saved ${savedTheme ? 'dark' : 'light'} theme, settings contrast and reload at ${width}px`,
        async (page) => {
          const gear = page.getByRole('button', { name: '打开设置对话框', exact: true })
          await gear.click()
          await expectReadableSettings(page, savedTheme)
          await page.screenshot({ path: `/private/tmp/zju-settings-${savedTheme ? 'dark' : 'light'}-${width}.png` })
          await page.getByRole('button', { name: '关闭设置', exact: true }).click()
          await page.getByRole('button', { name: '开关深色模式', exact: true }).click()
          await gear.click()
          await expectReadableSettings(page, !savedTheme)
          await page.reload()
          await expect(page.getByRole('button', { name: '开关深色模式', exact: true })).toHaveAttribute('aria-pressed', String(!savedTheme))
          await gear.click()
          await expectReadableSettings(page, !savedTheme)
        },
        { width, system: savedTheme ? 'light' : 'dark', savedTheme },
      )
    }
  }

  for (const system of ['light', 'dark']) {
    await check(
      `new visitor follows ${system} theme, shows Chinese and hides letter count`,
      async (page) => {
        await expect(page.getByRole('button', { name: /开关释义显示/ })).toHaveAttribute('aria-pressed', 'true')
        await expect(page.getByText('n. 企业家', { exact: true })).toBeVisible()
        await expect(page.getByLabel('单词长度已隐藏', { exact: true })).toBeVisible()
        await expect(page.getByLabel('字母格输入区', { exact: true })).toHaveCount(0)
        await expect(page.getByText(/AmE:/)).toHaveCount(0)
        await page.getByRole('button', { name: '开始', exact: true }).click()
        await page.getByRole('textbox', { name: '英文默写输入', exact: true }).fill('entr')
        await expect(page.getByText('n. 企业家', { exact: true })).toBeVisible()
        await page.reload()
        await expect(page.getByRole('button', { name: /开关释义显示/ })).toHaveAttribute('aria-pressed', 'true')
        await expect(page.getByLabel('单词长度已隐藏', { exact: true })).toBeVisible()
        await page.screenshot({ path: `/private/tmp/zju-new-defaults-${system}.png` })
      },
      { system },
    )
  }

  await check('manual Chinese and letter-count choices survive reload and another visit', async (page, context) => {
    await page.getByRole('button', { name: /开关释义显示/ }).click()
    await page.getByRole('button', { name: '打开设置对话框', exact: true }).click()
    await page.getByRole('switch', { name: '隐藏字母数', exact: true }).uncheck()
    await page.getByRole('button', { name: '关闭设置', exact: true }).click()
    await page.reload()
    await expect(page.getByRole('button', { name: /开关释义显示/ })).toHaveAttribute('aria-pressed', 'false')
    await expect(page.getByLabel('字母格输入区', { exact: true })).toHaveText(/^_+$/)
    const returning = await browser.newContext({ storageState: await context.storageState() })
    try {
      const nextPage = await returning.newPage()
      await nextPage.goto(baseURL)
      await expect(nextPage.getByRole('button', { name: /开关释义显示/ })).toHaveAttribute('aria-pressed', 'false')
      await expect(nextPage.getByLabel('字母格输入区', { exact: true })).toBeVisible()
    } finally {
      await returning.close()
    }
  })
} finally {
  await browser.close()
}
if (failures.length) throw new Error(`${failures.length} check(s) failed: ${failures.join('; ')}`)
console.log('All theme and default preference checks passed.')
