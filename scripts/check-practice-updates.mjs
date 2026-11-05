import { expect } from '@playwright/test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { gunzipSync } from 'node:zlib'
import { chromium } from 'playwright'

const baseURL = process.env.TEST_URL || 'http://127.0.0.1:5174'
const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL || 'chrome', headless: true })
const failures = []
const words = [
  { name: 'entrepreneur', trans: ['n. 企业家'] },
  { name: 'mistaken', trans: ['adj. 错误的'] },
]

async function check(name, fn, { width = 1440, height = 1000, storage = {} } = {}) {
  const context = await browser.newContext({ viewport: { width, height }, isMobile: width < 768, hasTouch: width < 768 })
  const page = await context.newPage()
  page.setDefaultTimeout(6000)
  try {
    await page.route('https://dict.youdao.com/**', (route) => route.abort())
    await page.route('**/dicts/zju-english-3-unit-1-reading-1.json', (route) => route.fulfill({ json: words }))
    await page.addInitScript((settings) => {
      if (sessionStorage.getItem('practice-updates-seeded')) return
      localStorage.setItem('zju-practice-guide-seen-v1', 'true')
      localStorage.setItem('lastSeenRelease', JSON.stringify('0.4.0'))
      document.cookie = 'zju-translation-visible=false; Path=/; SameSite=Lax'
      localStorage.setItem('hideWordLength', 'false')
      localStorage.setItem('phoneticConfig', JSON.stringify({ isOpen: false }))
      for (const [key, value] of Object.entries(settings)) localStorage.setItem(key, JSON.stringify(value))
      sessionStorage.setItem('practice-updates-seeded', 'true')
    }, storage)
    await page.goto(baseURL, { waitUntil: 'domcontentloaded' })
    await page.locator('.tooltip-info').waitFor()
    await fn(page, context)
    console.log(`PASS ${name}`)
  } catch (error) {
    failures.push(name)
    console.error(`FAIL ${name}: ${error.stack}`)
    await page.screenshot({ path: `/private/tmp/zju-update-failure-${failures.length}.png`, fullPage: true })
  } finally {
    await context.close()
  }
}

const translationSwitch = (page) => page.getByRole('button', { name: /开关释义显示/ })
const field = (page) => page.getByRole('textbox', { name: '英文默写输入', exact: true })

try {
  for (const width of [1440, 390, 320, 844]) {
    const height = width === 844 ? 390 : 1000
    await check(
      `toolbar, answer help and dialog fit ${width}px`,
      async (page) => {
        const nav = page.getByRole('navigation', { name: '练习导航' })
        await expect(nav.locator('[role="group"]')).toHaveCount(0)
        for (const name of ['单词列表', '指法图示', '导出数据', '打开设置对话框']) {
          const control = nav.getByRole('button', { name, exact: true })
          const box = await control.boundingBox()
          assert.ok(box && box.x >= 0 && box.x + box.width <= width + 1, `${name} exceeds viewport`)
          assert.ok(
            await control.evaluate((el) => {
              const r = el.getBoundingClientRect()
              return el.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2))
            }),
            `${name} is covered`,
          )
        }
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Page overflows')
        await page.getByRole('button', { name: '开始', exact: true }).click()
        await field(page).fill('wrong')
        await page.getByRole('button', { name: '提交答案', exact: true }).click()
        await expect(page.getByText('拼写不正确，请修改后重试')).toBeVisible()
        await page.getByRole('button', { name: '查看答案', exact: true }).click()
        await expect(page.getByRole('status').filter({ hasText: 'entrepreneur' })).toContainText('n. 企业家')
        await expect(field(page)).toHaveValue('wrong')
        await expect(page.getByRole('button', { name: '暂停', exact: true })).toBeVisible()
        await page.getByRole('button', { name: '收起答案', exact: true }).click()
        await expect(page.getByRole('status').filter({ hasText: 'entrepreneur' })).toHaveCount(0)
        await page.getByRole('button', { name: '指法图示', exact: true }).click()
        const dialog = page.getByRole('dialog', { name: '推荐打字指法图示' })
        await expect(dialog).toBeVisible()
        await expect(page.getByRole('button', { name: '开始', exact: true })).toBeHidden() // background is inert
        const panel = dialog.locator('img').locator('..').locator('..')
        const bounds = await panel.boundingBox()
        assert.ok(
          bounds && bounds.x >= 0 && bounds.y >= 0 && bounds.x + bounds.width <= width + 1 && bounds.y + bounds.height <= height + 1,
        )
        assert.ok(
          await dialog.evaluate((el) => {
            const input = document.querySelector('[aria-label="英文默写输入"]')
            const rect = input.getBoundingClientRect()
            return el.contains(
              document.elementFromPoint(
                Math.min(innerWidth - 1, Math.max(0, rect.x + rect.width / 2)),
                Math.min(innerHeight - 1, Math.max(0, rect.y + rect.height / 2)),
              ),
            )
          }),
          'Input renders above the dialog',
        )
        await page.keyboard.type('abc')
        await expect(page.locator('[aria-label="英文默写输入"]')).toHaveValue('wrong')
        await page.screenshot({ path: `/private/tmp/zju-updates-modal-${width}.png`, fullPage: true })
        await page.getByRole('button', { name: '关闭指法图示', exact: true }).click()
        await expect(dialog).toHaveCount(0)
        await expect(page.getByRole('button', { name: '开始', exact: true })).toBeVisible()
        await page.getByRole('button', { name: '单词列表', exact: true }).click()
        await expect(page.getByRole('dialog')).toBeVisible()
        await page.keyboard.press('Escape')
        await expect(page.getByRole('dialog')).toHaveCount(0)
        await page.screenshot({ path: `/private/tmp/zju-updates-${width}.png`, fullPage: true })
        await page.getByRole('button', { name: '打开设置对话框', exact: true }).click()
        const settings = page.getByRole('dialog', { name: '设置', exact: true })
        await expect(settings.getByRole('tab')).toHaveCount(4)
        for (const name of ['默写设置', '发音音效', '显示设置', '数据管理']) {
          await settings.getByRole('tab', { name, exact: true }).click()
          const panel = settings.getByRole('tabpanel', { name, exact: true })
          assert.ok(await panel.evaluate((el) => el.scrollWidth <= el.clientWidth + 1), `${name} overflows`)
        }
        await expect(settings.getByRole('button', { name: '导出数据', exact: true })).toHaveCount(0)
        await settings.getByRole('tab', { name: '默写设置', exact: true }).click()
        for (const name of ['默写模式', '隐藏字母数', '整词提交后判定'])
          await expect(settings.getByRole('switch', { name, exact: true })).toHaveCount(1)
        await page.screenshot({ path: `/private/tmp/zju-updates-settings-${width}.png`, fullPage: true })
        await page.getByRole('button', { name: '关闭设置', exact: true }).click()
      },
      { width, height },
    )
  }

  await check('consolidated settings preserve all practice, audio and display controls', async (page) => {
    const gear = () => page.getByRole('button', { name: '打开设置对话框', exact: true })
    const settings = () => page.getByRole('dialog', { name: '设置', exact: true })
    await gear().click()
    await settings().getByRole('switch', { name: '隐藏字母数', exact: true }).check()
    await settings().getByRole('switch', { name: '整词提交后判定', exact: true }).uncheck()
    await settings().getByRole('combobox', { name: '单词练习次数' }).selectOption('3')
    await settings().getByRole('tab', { name: '发音音效', exact: true }).click()
    await settings().getByRole('combobox', { name: '发音口音' }).selectOption('uk')
    await settings().getByRole('switch', { name: '循环朗读', exact: true }).check()
    await settings().getByRole('tab', { name: '显示设置', exact: true }).click()
    await settings().getByRole('switch', { name: '显示音标', exact: true }).check()
    await page.reload()
    await gear().click()
    await expect(settings().getByRole('switch', { name: '隐藏字母数', exact: true })).toBeChecked()
    await expect(settings().getByRole('switch', { name: '整词提交后判定', exact: true })).not.toBeChecked()
    await expect(settings().getByRole('combobox', { name: '单词练习次数' })).toHaveValue('3')
    await settings().getByRole('tab', { name: '发音音效', exact: true }).click()
    await expect(settings().getByRole('combobox', { name: '发音口音' })).toHaveValue('uk')
    await expect(settings().getByRole('switch', { name: '循环朗读', exact: true })).toBeChecked()
    await settings().getByRole('tab', { name: '显示设置', exact: true }).click()
    await expect(settings().getByRole('switch', { name: '显示音标', exact: true })).toBeChecked()
  })

  await check('translation preference survives reload, navigation and a new visit', async (page, context) => {
    await expect(translationSwitch(page)).toHaveAttribute('aria-pressed', 'false')
    await translationSwitch(page).click()
    await expect(translationSwitch(page)).toHaveAttribute('aria-pressed', 'true')
    const cookie = (await context.cookies()).find((cookie) => cookie.name === 'zju-translation-visible')
    assert.equal(cookie.value, 'true')
    assert.ok(cookie.expires > Date.now() / 1000 + 300 * 24 * 3600)
    await page.reload({ waitUntil: 'domcontentloaded' })
    await expect(translationSwitch(page)).toHaveAttribute('aria-pressed', 'true')
    await page.goto(`${baseURL}/gallery`)
    await page.goto(baseURL)
    await expect(translationSwitch(page)).toHaveAttribute('aria-pressed', 'true')
    const saved = await context.storageState()
    const nextContext = await browser.newContext({ storageState: saved })
    try {
      const nextPage = await nextContext.newPage()
      await nextPage.goto(baseURL)
      await expect(translationSwitch(nextPage)).toHaveAttribute('aria-pressed', 'true')
      await translationSwitch(nextPage).click()
      await nextPage.reload()
      await expect(translationSwitch(nextPage)).toHaveAttribute('aria-pressed', 'false')
    } finally {
      await nextContext.close()
    }
  })

  for (const wholeWordMode of [true, false]) {
    for (const hideWordLength of [true, false]) {
      await check(
        `peek preserves input and resets on the next word (${wholeWordMode}, ${hideWordLength})`,
        async (page) => {
          await page.getByRole('button', { name: '开始', exact: true }).click()
          await page.getByRole('button', { name: '查看答案', exact: true }).click()
          await expect(page.getByRole('status').filter({ hasText: 'entrepreneur' })).toBeVisible()
          if (wholeWordMode) {
            await field(page).focus()
            await field(page).fill('entrepreneur')
            await page.keyboard.press('Enter')
          } else {
            await page.keyboard.type('entrepreneur')
          }
          await expect(page.getByRole('button', { name: '查看答案', exact: true })).toBeVisible()
          await expect(page.getByRole('status').filter({ hasText: 'entrepreneur' })).toHaveCount(0)
          await page.getByRole('button', { name: '查看答案', exact: true }).click()
          await expect(page.getByRole('status').filter({ hasText: 'mistaken' })).toContainText('adj. 错误的')
        },
        { storage: { wholeWordMode, hideWordLength } },
      )
    }
  }

  await check('export downloads a complete, readable backup including mistakes', async (page) => {
    await page.getByRole('button', { name: '开始', exact: true }).click()
    await field(page).fill('wrong')
    await page.keyboard.press('Enter')
    await field(page).fill('entrepreneur')
    await page.keyboard.press('Enter')
    await expect(page.getByRole('button', { name: '查看答案', exact: true })).toBeVisible()
    const pending = page.waitForEvent('download')
    await page.getByRole('button', { name: '导出数据', exact: true }).click()
    const download = await pending
    assert.match(download.suggestedFilename(), /^ZJU-English-Dictation-Data-.*\.gz$/)
    const backup = JSON.parse(gunzipSync(await readFile(await download.path())).toString())
    assert.equal(backup.formatName, 'dexie')
    assert.equal(backup.data.databaseName, 'RecordDB')
    assert.deepEqual(backup.data.tables.map((table) => table.name).sort(), ['chapterRecords', 'reviewRecords', 'wordRecords'])
    const exported = backup.data.data.find((table) => table.tableName === 'wordRecords').rows
    assert.equal(exported[0].word, 'entrepreneur')
    assert.equal(exported[0].wrongCount, 1)
    await expect(page.getByRole('status').filter({ hasText: '备份已生成' })).toBeVisible()
  })
} finally {
  await browser.close()
}
if (failures.length) throw new Error(`${failures.length} check(s) failed: ${failures.join('; ')}`)
console.log('All practice update checks passed.')
