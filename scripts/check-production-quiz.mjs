import { expect } from '@playwright/test'
import { chromium } from 'playwright'

const baseURL = process.env.TEST_URL || 'http://127.0.0.1:5174'
const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL || 'chrome', headless: true })
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
const page = await context.newPage()

try {
  await page.goto(baseURL)
  const placeholder = page.locator('button[aria-label="小测专题（敬请期待）"]')
  await expect(placeholder).toBeVisible()
  await expect(placeholder).toContainText('敬请期待')
  await expect(page.getByRole('link', { name: '小测专题' })).toHaveCount(0)
  await page.goto(`${baseURL}/quiz`)
  await expect(page).toHaveURL(`${baseURL}/`)
  console.log('PASS production quiz placeholder')
} finally {
  await context.close()
  await browser.close()
}
