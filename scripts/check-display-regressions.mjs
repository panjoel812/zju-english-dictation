import { expect } from '@playwright/test'
import assert from 'node:assert/strict'
import { chromium } from 'playwright'

const baseURL = process.env.TEST_URL || 'http://127.0.0.1:5174'
const browser = await chromium.launch({
  ...(process.env.BROWSER_EXECUTABLE
    ? { executablePath: process.env.BROWSER_EXECUTABLE }
    : { channel: process.env.BROWSER_CHANNEL || 'chrome' }),
  headless: true,
})
const failures = []

async function check(name, run, { width = 1440, height = 900, theme = 'light', type = 'hideVowel' } = {}) {
  if (process.env.TEST_MATCH && !name.includes(process.env.TEST_MATCH)) return
  const context = await browser.newContext({ viewport: { width, height }, colorScheme: theme })
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  try {
    await page.addInitScript(
      ({ type, theme }) => {
        localStorage.setItem('zju-practice-guide-seen-v1', 'true')
        localStorage.setItem('lastSeenRelease', '"0.4.0"')
        localStorage.setItem('currentDict-zju-english3', '"zju-english-3-unit-5-reading-1"')
        localStorage.setItem('currentChapter', '0')
        localStorage.setItem('hideWordLength', 'false')
        localStorage.setItem('wholeWordMode', 'true')
        localStorage.setItem('wordDictationConfig-v2', JSON.stringify({ isOpen: true, type, openBy: 'user' }))
        localStorage.setItem('darkMode', JSON.stringify(theme === 'dark'))
      },
      { type, theme },
    )
    await page.goto(baseURL, { waitUntil: 'domcontentloaded' })
    await page.locator('.tooltip-info').waitFor()
    await run(page)
    assert.deepEqual(errors, [], 'No runtime errors')
    console.log(`PASS ${name}`)
  } catch (error) {
    failures.push(name)
    console.error(`FAIL ${name}: ${error.message}`)
  } finally {
    await context.close()
  }
}

async function expectOpaqueAndReachable(control) {
  await expect
    .poll(() =>
      control.evaluate((element) => {
        let opacity = 1
        for (let node = element; node; node = node.parentElement) opacity *= Number(getComputedStyle(node).opacity)
        const rect = element.getBoundingClientRect()
        return opacity > 0.99 && element.contains(document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2))
      }),
    )
    .toBe(true)
}

try {
  for (const width of [1440, 390]) {
    for (const [type, prompt] of [
      ['hideVowel', 'c_ns_l_'],
      ['hideConsonant', '_o__o_e'],
      ['hideAll', '_______'],
    ]) {
      await check(
        `centered letter slots ${type} ${width}px`,
        async (page) => {
          const field = page.getByLabel('字母格输入区', { exact: true })
          const input = field.getByRole('textbox')
          await expect(field).toHaveText(prompt)
          const inspect = () =>
            field.evaluate((element) => {
              const rect = element.getBoundingClientRect()
              const cells = [...element.querySelectorAll('[aria-hidden="true"] > span > span')].map((cell) => cell.getBoundingClientRect())
              const first = cells[0],
                last = cells[cells.length - 1]
              const native = getComputedStyle(element.querySelector('textarea'))
              const hints = getComputedStyle(element.querySelector('[aria-hidden="true"]'))
              return {
                left: first.left - rect.left,
                right: rect.right - last.right,
                rows: cells.map((cell) => cell.y),
                widths: cells.map((cell) => cell.width),
                typography: [
                  native.fontFamily === hints.fontFamily,
                  native.fontSize === hints.fontSize,
                  native.letterSpacing === hints.letterSpacing,
                ],
              }
            })
          const before = await inspect()
          assert.ok(Math.abs(before.left - before.right) <= 2, `Unequal space around letters: ${JSON.stringify(before)}`)
          assert.ok(Math.max(...before.widths) - Math.min(...before.widths) < 1, 'Letters and blanks must have equal widths')
          assert.ok(Math.max(...before.rows) - Math.min(...before.rows) < 1, 'A short word must stay on one line')
          assert.deepEqual(before.typography, [true, true, true], 'Input and hints use the same font metrics')
          await input.fill('cons')
          const after = await inspect()
          assert.ok(Math.abs(after.left - after.right) <= 2, `Typing must preserve centered spacing: ${JSON.stringify(after)}`)
          assert.ok(Math.max(...after.widths) - Math.min(...after.widths) < 1, 'Typing must preserve equal cell widths')
          assert.ok(Math.max(...after.rows) - Math.min(...after.rows) < 1, 'Typing must preserve one-row layout')
          assert.deepEqual(after.typography, [true, true, true], 'Typing must preserve matching font metrics')
          await page.mouse.move(0, 0)
          await page.screenshot({ path: `/private/tmp/zed-slots-${type}-${width}.png`, animations: 'disabled' })
        },
        { width, type },
      )
    }
  }

  for (const [width, height, theme] of [
    [1440, 900, 'light'],
    [390, 844, 'light'],
    [844, 390, 'light'],
    [1440, 900, 'dark'],
  ]) {
    await check(
      `release panel stays visible ${width}px ${theme}`,
      async (page) => {
        const gear = page.getByRole('button', { name: '打开设置对话框', exact: true })
        await gear.click()
        for (let visit = 0; visit < 2; visit += 1) {
          await page.getByRole('button', { name: '本次更新', exact: true }).click()
          const release = page.getByRole('dialog', { name: '0.4.0 更新说明', exact: true })
          await expect(page.getByRole('dialog')).toHaveCount(1)
          const close = release.getByRole('button', { name: '关闭更新说明', exact: true })
          await expectOpaqueAndReachable(close)
          const panel = release.locator('div.rounded-lg').first()
          assert.notEqual(
            await panel.evaluate((element) => getComputedStyle(element).borderTopWidth),
            '0px',
            'Release panel must have a visible border',
          )
          const heading = await release.getByRole('heading', { name: '0.4.0 更新说明' }).boundingBox()
          assert.ok(heading.y >= 0 && heading.y + heading.height <= height, 'Title remains within the viewport')
          if (visit === 0) await page.screenshot({ path: `/private/tmp/zed-release-${width}-${theme}.png`, animations: 'disabled' })
          const back = release.getByRole('button', { name: '返回设置', exact: true })
          await back.scrollIntoViewIfNeeded()
          await expectOpaqueAndReachable(back)
          await back.click()
          await expectOpaqueAndReachable(page.getByRole('button', { name: '关闭设置', exact: true }))
        }
        await page.keyboard.press('Escape')
        await expect(page.getByRole('dialog')).toHaveCount(0)
        await expect(gear).toBeFocused()
      },
      { width, height, theme },
    )
  }
} finally {
  await browser.close()
}
if (failures.length) process.exitCode = 1
