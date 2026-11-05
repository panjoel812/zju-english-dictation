import { expect } from '@playwright/test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { chromium } from 'playwright'

const resources = JSON.parse(await readFile(new URL('../src/resources/minorLanguages.json', import.meta.url)))
const baseURL = process.env.TEST_URL || 'http://127.0.0.1:5174'
const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL || 'chrome', headless: true })
const failures = []
const names = { de: '德语', es: '西班牙语', fr: '法语', ja: '日语', ko: '韩语', ru: '俄语' }
const input = (page) => page.getByRole('textbox', { name: '单词默写输入', exact: true })
const peek = (page) => page.getByRole('button', { name: '查看答案', exact: true })

async function check(name, run, { width = 1440, dictionary, words } = {}) {
  if (process.env.TEST_MATCH && !name.includes(process.env.TEST_MATCH)) return
  const context = await browser.newContext({ viewport: { width, height: 1000 }, isMobile: width < 768, hasTouch: width < 768 })
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.setDefaultTimeout(8000)
  try {
    await page.route('https://dict.youdao.com/**', (route) => route.abort())
    if (words) await page.route(`**/dicts/${dictionary}.json`, (route) => route.fulfill({ json: words }))
    await page.addInitScript((dictionary) => {
      if (!sessionStorage.getItem('minor-language-seeded')) {
        localStorage.setItem('zju-practice-guide-seen-v1', 'true')
        localStorage.setItem('lastSeenRelease', JSON.stringify('0.4.0'))
        // Small-language input must work even for returning users who chose per-letter English input.
        localStorage.setItem('wholeWordMode', 'false')
        if (dictionary) localStorage.setItem('currentDict-zju-english3', JSON.stringify(dictionary))
        sessionStorage.setItem('minor-language-seeded', 'true')
      }
      window.spokenWords = []
      Object.defineProperty(window, 'speechSynthesis', {
        configurable: true,
        value: {
          speaking: false,
          getVoices: () => [],
          cancel() {},
          speak(utterance) {
            window.spokenWords.push({ text: utterance.text, lang: utterance.lang })
            utterance.onstart?.(new Event('start'))
          },
        },
      })
    }, dictionary)
    await page.goto(`${baseURL}${dictionary ? '/' : '/gallery'}`, { waitUntil: 'domcontentloaded' })
    await run(page)
    assert.deepEqual(errors, [], 'No browser runtime errors')
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Page overflows')
    console.log(`PASS ${name}`)
  } catch (error) {
    failures.push(name)
    console.error(`FAIL ${name}: ${error.stack}`)
    await page.screenshot({ path: `/private/tmp/lexi-language-failure-${failures.length}.png`, fullPage: true })
  } finally {
    await context.close()
  }
}

try {
  for (const width of [1440, 390]) {
    for (const [language, name] of Object.entries(names)) {
      const resource = resources.find((resource) => resource.language === language)
      const words = JSON.parse(await readFile(new URL(`../public${resource.url}`, import.meta.url)))
      await check(
        `${name} gallery, real vocabulary, IME grading and speech at ${width}px`,
        async (page) => {
          await page.getByRole('radio', { name, exact: true }).click()
          await expect(page.getByRole('tablist', { name: '词库分类', exact: true }).getByRole('tab', { selected: true })).toHaveText(
            resource.courseBook,
          )
          await expect(page.getByRole('tablist', { name: '单元', exact: true }).getByRole('tab', { selected: true })).toHaveText(
            `Unit ${resource.id.match(/unit-(\d+)/)[1]}`,
          )
          await page.getByRole('heading', { name: resource.name, exact: true }).click()
          await page.getByRole('dialog').getByRole('heading', { name: '第 1 章', exact: true }).click()
          await expect(page.locator('header h1')).toHaveText('ZED')
          await expect(page).toHaveTitle('ZED')
          await expect(input(page)).toBeVisible()
          const translation = page.getByText(words[0].trans[0], { exact: true })
          await expect(translation).toBeVisible()
          const transBounds = await translation.boundingBox()
          const peekBounds = await peek(page).boundingBox()
          assert.ok(peekBounds.y >= transBounds.y + transBounds.height, 'Answer button belongs below Chinese')
          await page.getByRole('button', { name: '开始', exact: true }).click()
          await expect
            .poll(() => page.evaluate(() => window.spokenWords))
            .toContainEqual({ text: words[0].speech ?? words[0].name, lang: resource.speechLang })
          await input(page).press('Control+v')
          await expect(page.getByLabel('单词长度已隐藏', { exact: true })).toBeVisible()
          await input(page).fill('wrong')
          await page.getByRole('button', { name: '提交答案', exact: true }).click()
          await expect(page.getByText('拼写不正确，请修改后重试', { exact: true })).toBeVisible()
          await peek(page).click()
          await expect(page.getByRole('status').filter({ hasText: words[0].name })).toBeVisible()
          await expect(input(page)).toHaveValue('wrong')
          await page.getByRole('button', { name: '收起答案', exact: true }).click()
          if (width === 390 && language === 'ja') await page.screenshot({ path: '/private/tmp/lexi-japanese-mobile.png', fullPage: true })
          const answer = words[0].acceptedAnswers?.[width === 390 ? 1 : 0] ?? words[0].name
          await input(page).fill(answer)
          await input(page).dispatchEvent('compositionstart')
          await input(page).press('Enter')
          await expect(translation).toBeVisible()
          await expect(input(page)).toHaveValue(answer)
          await input(page).dispatchEvent('compositionend')
          await input(page).press('Enter')
          await expect(input(page)).toHaveValue('')
          await expect(page.getByText(words[1].trans[0], { exact: true })).toBeVisible()
          assert.equal(await page.evaluate(() => localStorage.getItem('wholeWordMode')), 'false', 'English preference preserved')
          await page.reload()
          await expect(input(page)).toBeVisible()
          await expect(page.locator('header')).toContainText(resource.name)
        },
        { width },
      )
    }
  }

  for (const [language, answer, missingAccent, key] of [
    ['de', 'über', 'uber', 'ü'],
    ['es', 'cómo', 'como', 'ó'],
    ['fr', 'café', 'cafe', 'é'],
  ]) {
    const resource = resources.find((resource) => resource.language === language)
    await check(
      `${language} preserves accents, accepts combining characters and inserts at cursor`,
      async (page) => {
        await input(page).waitFor()
        await page.getByRole('button', { name: '开始', exact: true }).click()
        await input(page).fill(missingAccent)
        await input(page).press('Enter')
        await expect(page.getByText('拼写不正确，请修改后重试', { exact: true })).toBeVisible()
        await input(page).fill('ab')
        await input(page).evaluate((el) => el.setSelectionRange(1, 1))
        await page.getByRole('button', { name: '特殊字符', exact: true }).click()
        await page.getByRole('button', { name: key, exact: true }).click()
        await expect(input(page)).toHaveValue(`a${key}b`)
        await input(page).fill(answer.normalize('NFD'))
        await input(page).press('Enter')
        await expect(page.getByText('第二词', { exact: true })).toBeVisible()
      },
      {
        dictionary: resource.id,
        words: [
          { name: answer, trans: ['测试释义'] },
          { name: 'next', trans: ['第二词'] },
        ],
      },
    )
  }

  for (const width of [1440, 390]) {
    await check(
      `English defaults, answer order and ZED name at ${width}px`,
      async (page) => {
        await page.getByRole('button', { name: '返回练习', exact: true }).click()
        await expect(page.locator('header h1')).toHaveText('ZED')
        await expect(page.getByLabel('单词长度已隐藏', { exact: true })).toBeVisible()
        const translation = page.getByText('n. 企业家', { exact: true })
        await expect(translation).toBeVisible()
        const bounds = await translation.boundingBox()
        assert.ok((await peek(page).boundingBox()).y >= bounds.y + bounds.height)
        await page.screenshot({ path: `/private/tmp/lexi-english-${width}.png`, fullPage: true })
      },
      { width },
    )
  }
} finally {
  await browser.close()
}
if (failures.length) throw new Error(`${failures.length} check(s) failed: ${failures.join('; ')}`)
console.log('All ZED language checks passed.')
