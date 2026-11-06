import { expect } from '@playwright/test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import vm from 'node:vm'
import { chromium } from 'playwright'
import ts from 'typescript'

const baseURL = process.env.TEST_URL || 'http://127.0.0.1:5174'
const quizSource = await readFile(new URL('../src/pages/Quiz/questions.ts', import.meta.url), 'utf8')
const moduleExports = {}
const compiled = ts.transpileModule(quizSource, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText
vm.runInNewContext(compiled, { exports: moduleExports })
const questions = moduleExports.questions
const dictionaries = await Promise.all(
  Array.from({ length: 8 }, async (_, index) => {
    const readings = await Promise.all(
      [1, 2].map(async (reading) =>
        JSON.parse(await readFile(new URL(`../public/dicts/zju-english-3-unit-${index + 1}-reading-${reading}.json`, import.meta.url))),
      ),
    )
    return new Set(readings.flat().map((word) => word.name.toLowerCase()))
  }),
)
const allWords = new Set(dictionaries.flatMap((dictionary) => [...dictionary]))
const answers = new Map()
assert.ok(questions.length >= 120, 'The quiz should contain at least 120 questions')
for (let unit = 1; unit <= 8; unit++) {
  assert.ok(questions.filter((question) => question.unit === unit).length >= 15, `Unit ${unit} needs at least 15 questions`)
}
const answerWords = new Set()
for (const { unit, sentence, answer, meaning, distractors } of questions) {
  assert.ok(dictionaries[unit - 1]?.has(answer), `${answer} must be in Unit ${unit}`)
  assert.equal((sentence.match(/_____/g) || []).length, 1, `Expected one blank: ${sentence}`)
  assert.ok(answer && meaning.trim(), `Missing answer or Chinese hint: ${sentence}`)
  assert.equal(distractors.length, 3, `Expected three distractors: ${sentence}`)
  const options = [answer, ...distractors]
  assert.equal(new Set(options).size, 4, `Options must be distinct: ${sentence}`)
  for (const option of options) assert.ok(allWords.has(option), `${option} must appear in Book II`)
  assert.ok(!answers.has(sentence), `Duplicate sentence: ${sentence}`)
  assert.ok(!answerWords.has(answer), `Duplicate answer: ${answer}`)
  answerWords.add(answer)
  answers.set(sentence, answer)
}

const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL || 'chrome', headless: true })
try {
  for (const width of [1440, 390]) {
    const context = await browser.newContext({ viewport: { width, height: 900 } })
    const page = await context.newPage()
    const errors = []
    page.on('pageerror', (error) => errors.push(error.message))
    await page.addInitScript(() => {
      localStorage.setItem('zju-practice-guide-seen-v1', 'true')
      localStorage.setItem('lastSeenRelease', JSON.stringify('0.4.0'))
    })
    await page.goto(`${baseURL}/quiz`)
    await expect(page.getByText(`Book II · 已核对 ${questions.length} 题`, { exact: false })).toBeVisible()
    await page.getByText('Unit 5–8', { exact: true }).click()
    await page.getByRole('button', { name: '开始练习 · 10 题' }).click()
    await expect(page.getByText(/Vocabulary · Unit [5-8]/)).toBeVisible()
    for (let i = 0; i < 10; i++) {
      await page
        .getByRole('radio', { name: /[A-D]\./ })
        .first()
        .check()
      await page.getByRole('button', { name: '提交答案' }).click()
      await expect(page.getByRole('status')).toContainText(/回答正确|回答错误/)
      await page.getByRole('button', { name: i === 9 ? '查看结果' : '下一题' }).click()
    }
    await expect(page.getByRole('heading', { name: '练习完成' })).toBeVisible()
    const completed = await page.evaluate(() => JSON.parse(localStorage.getItem('zju-quiz-completed-v1')))
    assert.equal(new Set(completed).size, 10)
    await page.getByRole('button', { name: '重新选择' }).click()
    await page.getByRole('radio', { name: 'Sentence Completion 首字母与中文提示' }).check()
    await page.getByText('Unit 1–4', { exact: true }).click()
    await page.getByRole('button', { name: '开始练习 · 10 题' }).click()
    await expect(page.getByText(/Sentence Completion · Unit [1-4]/)).toBeVisible()
    await page.getByLabel(/首字母/).fill('wronganswer')
    await page.getByRole('button', { name: '提交答案' }).click()
    await expect(page.getByRole('status')).toContainText('正确答案：')
    const submittedSentence = await page.locator('form').locator('xpath=preceding-sibling::p[1]').textContent()
    const submittedAnswer = answers.get(submittedSentence)
    await page.reload()
    await expect(page.getByText(`当前范围剩余 ${questions.length - 11} 题`, { exact: false })).toBeVisible()
    const afterReload = await page.evaluate(() => JSON.parse(localStorage.getItem('zju-quiz-completed-v1')))
    assert.ok(afterReload.includes(submittedAnswer), 'A submitted wrong answer must remain completed after reload')
    await page.getByRole('radio', { name: 'Sentence Completion 首字母与中文提示' }).check()
    await page.getByText('Unit 1–4', { exact: true }).click()
    await page.getByRole('button', { name: '开始练习 · 10 题' }).click()
    const nextSentence = await page.locator('form').locator('xpath=preceding-sibling::p[1]').textContent()
    assert.ok(!afterReload.includes(answers.get(nextSentence)), 'Completed questions must be skipped after reload')
    await page.getByLabel(/首字母/).fill('wronganswer')
    await page.getByRole('button', { name: '提交答案' }).click()
    await page.getByRole('button', { name: '下一题' }).click()
    const sentence = await page.locator('form').locator('xpath=preceding-sibling::p[1]').textContent()
    const answer = answers.get(sentence)
    assert.ok(answer, `Missing answer for ${sentence}`)
    await page.getByLabel(/首字母/).fill(` ${answer.toUpperCase()} `)
    await page.getByRole('button', { name: '提交答案' }).click()
    await expect(page.getByRole('status')).toContainText('回答正确')
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'quiz overflows viewport')
    assert.deepEqual(errors, [])
    await page.screenshot({ path: `/private/tmp/zed-quiz-${width}.png`, fullPage: true })
    await context.close()
    console.log(`PASS quiz workflow ${width}px`)
  }

  {
    const context = await browser.newContext()
    const page = await context.newPage()
    const done = questions.slice(0, -1).map((question) => question.answer)
    await page.addInitScript((completed) => {
      localStorage.setItem('zju-quiz-completed-v1', JSON.stringify(completed))
    }, done)
    await page.goto(`${baseURL}/quiz`)
    await expect(page.getByRole('button', { name: '开始练习 · 1 题' })).toBeEnabled()
    await page.getByRole('button', { name: '开始练习 · 1 题' }).click()
    const sentence = await page.locator('form').locator('xpath=preceding-sibling::p[1]').textContent()
    assert.equal(answers.get(sentence), questions[questions.length - 1].answer)
    await page
      .getByRole('radio', { name: /[A-D]\./ })
      .first()
      .check()
    await page.getByRole('button', { name: '提交答案' }).click()
    await page.getByRole('button', { name: '查看结果' }).click()
    await expect(page.getByRole('button', { name: '再练一次' })).toBeDisabled()
    await page.getByRole('button', { name: '重新选择' }).click()
    await expect(page.getByText('当前范围的题目已全部完成', { exact: false })).toBeVisible()
    await expect(page.getByRole('button', { name: '开始练习 · 0 题' })).toBeDisabled()
    await context.close()
    console.log('PASS completed question exhaustion')
  }

  for (const width of [1440, 390]) {
    const context = await browser.newContext({ viewport: { width, height: 900 } })
    const page = await context.newPage()
    await page.addInitScript(() => {
      localStorage.setItem('zju-practice-guide-seen-v1', 'true')
      localStorage.setItem('lastSeenRelease', JSON.stringify('0.4.0'))
      localStorage.setItem('currentDict-zju-english3', JSON.stringify('zju-ja-b1-unit-15'))
      localStorage.setItem('hideWordLength', 'false')
    })
    await page.route('**/dicts/zju-ja-b1-unit-15.json', (route) =>
      route.fulfill({
        json: [
          { name: 'ボート', trans: ['名 小船'], acceptedAnswers: ['ボート'] },
          { name: 'ベンチ', trans: ['名 长椅'], acceptedAnswers: ['ベンチ'] },
        ],
      }),
    )
    await page.goto(baseURL)
    const input = page.getByRole('textbox', { name: '单词默写输入' })
    await expect(input).toBeVisible()
    await input.fill('ボート')
    const measurements = await input.evaluate((element) => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      const style = getComputedStyle(element)
      ctx.font = `${style.fontSize} ${style.fontFamily}`
      return {
        available: element.clientWidth - 8,
        required: ctx.measureText('ボート').width,
        scrollHeight: element.scrollHeight,
        height: element.clientHeight,
      }
    })
    assert.ok(measurements.available >= measurements.required, JSON.stringify(measurements))
    assert.ok(measurements.scrollHeight <= measurements.height + 1, JSON.stringify(measurements))
    await context.close()
    console.log(`PASS Japanese horizontal input ${width}px`)
  }
} finally {
  await browser.close()
}
