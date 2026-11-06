import { expect } from '@playwright/test'
import assert from 'node:assert/strict'
import { chromium } from 'playwright'

const baseURL = process.env.TEST_URL || 'http://127.0.0.1:5174'
const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL || 'chrome', headless: true })
const context = await browser.newContext({ viewport: { width: 390, height: 900 } })
const page = await context.newPage()

try {
  await page.goto(`${baseURL}/gallery`)
  await page.getByText('浙大新文科英语', { exact: true }).click()
  await expect(page.getByText('Unit 1', { exact: true })).toBeVisible()
  const uploadButton = page.getByRole('button', { name: '上传词库' })
  await expect(uploadButton).toBeVisible()
  assert.equal(await uploadButton.getAttribute('data-coming-soon'), 'true')
  assert.equal(await uploadButton.evaluate((element) => getComputedStyle(element).backgroundColor), 'rgb(243, 244, 246)')
  await expect(page.locator('input[type="file"]')).toHaveCount(0)
  await uploadButton.click()
  await expect(page.getByText('敬请期待：自定义词库上传功能正在准备中。')).toBeVisible()
  await page.getByRole('button', { name: '关闭' }).click()
  await expect(page.getByText('敬请期待：自定义词库上传功能正在准备中。')).toHaveCount(0)
  console.log('PASS new liberal arts dictionary and upload placeholder')
} finally {
  await context.close()
  await browser.close()
}
