import { mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const baseURL = process.env.TEST_URL || 'http://127.0.0.1:5174'
const output = new URL('../assets/readme/', import.meta.url)
await mkdir(output, { recursive: true })
const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL || 'chrome', headless: true })

async function practice(mobile) {
  const context = await browser.newContext({
    viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 },
    isMobile: mobile,
    hasTouch: mobile,
    deviceScaleFactor: 1,
    colorScheme: 'light',
  })
  const page = await context.newPage()
  await page.addInitScript(() => {
    localStorage.setItem('wordDictationConfig-v2', JSON.stringify({ isOpen: true, type: 'hideAll', openBy: 'user' }))
    localStorage.setItem('phoneticConfig', JSON.stringify({ isOpen: false }))
  })
  await page.goto(baseURL, { waitUntil: 'domcontentloaded' })
  await page.locator('.tooltip-info').waitFor()
  await page.evaluate(() => document.fonts.ready)
  const start = page.getByRole('button', { name: '开始', exact: true })
  if (mobile) await start.tap()
  else await start.click()
  await page.keyboard.type('entre', { delay: 80 })
  await page.mouse.move(0, 0)
  await page.screenshot({ path: fileURLToPath(new URL(mobile ? 'mobile.png' : 'desktop.png', output)), animations: 'disabled' })
  if (!mobile) {
    await page.keyboard.type('preneur', { delay: 80 })
    await page.getByText('企业家', { exact: true }).waitFor()
    await page.screenshot({ path: fileURLToPath(new URL('answer.png', output)), animations: 'disabled' })
    await page.goto(`${baseURL}/gallery`, { waitUntil: 'domcontentloaded' })
    await page.getByText('浙江大学英语', { exact: true }).first().waitFor()
    await page.screenshot({ path: fileURLToPath(new URL('dictionaries.png', output)), animations: 'disabled' })
  }
  await context.close()
}

try {
  await practice(false)
  await practice(true)
} finally {
  await browser.close()
}
console.log('Saved real application screenshots to assets/readme/')
