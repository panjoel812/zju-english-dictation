import { expect } from '@playwright/test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { chromium } from 'playwright'

const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL || 'chrome', headless: true })
const baseURL = process.env.TEST_URL || 'http://127.0.0.1:5174'
const audio = await readFile(new URL('../public/sounds/correct.wav', import.meta.url))
const words = [
  { name: 'entrepreneur', trans: ['n. 企业家'] },
  { name: 'mistaken', trans: ['adj. 错误的'] },
  { name: 'take responsibility', trans: ['承担责任'] },
]
const failures = []

async function check(name, test, { mobile = false, delayed = false, storage = {} } = {}) {
  if (process.env.TEST_MATCH && !name.includes(process.env.TEST_MATCH)) return
  const context = await browser.newContext({
    viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 },
    isMobile: mobile,
    hasTouch: mobile,
  })
  const page = await context.newPage()
  page.setDefaultTimeout(5000)
  let releaseAudio
  const audioGate = delayed ? new Promise((resolve) => (releaseAudio = resolve)) : Promise.resolve()
  try {
    if (process.env.REAL_AUDIO !== '1') {
      await page.route('https://dict.youdao.com/**', async (route) => {
        await audioGate
        await route.fulfill({ contentType: 'audio/wav', body: audio, headers: { 'Access-Control-Allow-Origin': '*' } })
      })
    }
    await page.route('**/dicts/zju-english-3-unit-1-reading-1.json', (route) => route.fulfill({ json: words }))
    await page.addInitScript((settings) => {
      localStorage.setItem('lastSeenRelease', JSON.stringify('0.3.2'))
      localStorage.setItem('phoneticConfig', JSON.stringify({ isOpen: false }))
      for (const [key, value] of Object.entries(settings)) localStorage.setItem(key, JSON.stringify(value))
      window.pronunciationEvents = []
      const play = HTMLMediaElement.prototype.play
      const load = HTMLMediaElement.prototype.load
      const observed = new WeakSet()
      const observe = (element) => {
        if (!observed.has(element)) {
          observed.add(element)
          for (const event of ['canplaythrough', 'playing', 'ended', 'error']) {
            element.addEventListener(event, () => {
              if (element.src.includes('/dictvoice?')) {
                window.pronunciationEvents.push({
                  event,
                  word: new URL(element.src).searchParams.get('audio'),
                  volume: element.volume,
                  rate: element.playbackRate,
                })
              }
            })
          }
        }
      }
      HTMLMediaElement.prototype.load = function (...args) {
        observe(this)
        return load.apply(this, args)
      }
      HTMLMediaElement.prototype.play = function (...args) {
        observe(this)
        return play.apply(this, args)
      }
    }, storage)
    await page.goto(baseURL, { waitUntil: 'domcontentloaded' })
    await page.locator('.tooltip-info').waitFor()
    await test(page, () => releaseAudio?.())
    console.log(`PASS ${name}`)
  } catch (error) {
    failures.push(name)
    console.error(`FAIL ${name}: ${error.message}`)
    console.error(await page.evaluate(() => window.pronunciationEvents))
  } finally {
    releaseAudio?.()
    await context.close()
  }
}

const playedWords = (page) =>
  page.evaluate(() => window.pronunciationEvents.filter(({ event }) => event === 'playing').map(({ word }) => word))
const endedWords = (page) =>
  page.evaluate(() => window.pronunciationEvents.filter(({ event }) => event === 'ended').map(({ word }) => word))

try {
  for (const mobile of [false, true]) {
    await check(
      `${mobile ? 'mobile' : 'desktop'} automatically pronounces each new word exactly once`,
      async (page) => {
        await page.getByRole('button', { name: '开始', exact: true }).click()
        await expect.poll(() => endedWords(page)).toEqual(['entrepreneur'])
        const input = page.getByRole('textbox', { name: '英文默写输入' })
        await input.fill('entrepreneur')
        await input.press('Enter')
        await expect.poll(() => endedWords(page)).toEqual(['entrepreneur', 'mistaken'])
        await input.fill('mistaken')
        await input.press('Enter')
        await expect.poll(() => endedWords(page)).toEqual(['entrepreneur', 'mistaken', 'take responsibility'])
        assert.deepEqual(await playedWords(page), ['entrepreneur', 'mistaken', 'take responsibility'])
      },
      { mobile },
    )
  }

  await check(
    'starting before audio loads still pronounces the first word',
    async (page, releaseAudio) => {
      await page.getByRole('button', { name: '开始', exact: true }).click()
      assert.deepEqual(await playedWords(page), [])
      releaseAudio()
      await expect.poll(() => endedWords(page)).toEqual(['entrepreneur'])
      assert.deepEqual(await playedWords(page), ['entrepreneur'])
    },
    { delayed: true },
  )

  await check(
    'pausing before audio loads cancels pending autoplay',
    async (page, releaseAudio) => {
      await page.getByRole('button', { name: '开始', exact: true }).click()
      await page.getByRole('button', { name: '暂停', exact: true }).click()
      releaseAudio()
      await expect.poll(() => page.evaluate(() => window.pronunciationEvents.some(({ event }) => event === 'canplaythrough'))).toBe(true)
      // Check the negative invariant after queued load/play handlers have run.
      await page.waitForTimeout(400)
      assert.deepEqual(await playedWords(page), [])
      await page.getByRole('button', { name: '开始', exact: true }).click()
      await expect.poll(() => endedWords(page)).toEqual(['entrepreneur'])
    },
    { delayed: true },
  )

  await check(
    'skipping a word while audio loads never speaks the stale word',
    async (page, releaseAudio) => {
      await page.getByRole('button', { name: '开始', exact: true }).click()
      await page.keyboard.press('Control+Shift+ArrowRight')
      releaseAudio()
      await expect.poll(() => endedWords(page)).toEqual(['mistaken'])
      assert.deepEqual(await playedWords(page), ['mistaken'])
    },
    { delayed: true },
  )

  await check('manual replay works without changing the typed answer', async (page) => {
    const input = page.getByRole('textbox', { name: '英文默写输入' })
    await input.fill('entre')
    await expect.poll(() => endedWords(page)).toEqual(['entrepreneur'])
    await page.locator('.tooltip-info .cursor-pointer').click()
    await expect.poll(() => endedWords(page)).toEqual(['entrepreneur', 'entrepreneur'])
    await expect(input).toHaveValue('entre')
    await expect(input).toBeFocused()
  })

  await check(
    'legacy letter-by-letter mode pronounces the next word once',
    async (page) => {
      await page.getByRole('button', { name: '开始', exact: true }).click()
      await expect.poll(() => endedWords(page)).toEqual(['entrepreneur'])
      await page.keyboard.type('entrepreneur')
      await expect.poll(() => endedWords(page)).toEqual(['entrepreneur', 'mistaken'])
      assert.deepEqual(await playedWords(page), ['entrepreneur', 'mistaken'])
    },
    { storage: { wholeWordMode: false } },
  )

  await check(
    'configured word repetitions pronounce each attempt once',
    async (page) => {
      const input = page.getByRole('textbox', { name: '英文默写输入' })
      await input.click()
      await expect.poll(() => endedWords(page)).toEqual(['entrepreneur'])
      await input.fill('entrepreneur')
      await input.press('Enter')
      await expect.poll(() => endedWords(page)).toEqual(['entrepreneur', 'entrepreneur'])
      await input.fill('entrepreneur')
      await input.press('Enter')
      await expect.poll(() => endedWords(page)).toEqual(['entrepreneur', 'entrepreneur', 'mistaken'])
      assert.deepEqual(await playedWords(page), ['entrepreneur', 'entrepreneur', 'mistaken'])
    },
    { storage: { loopWordConfig: { times: 2 } } },
  )

  await check(
    'disabled pronunciation stays silent',
    async (page) => {
      const input = page.getByRole('textbox', { name: '英文默写输入' })
      await input.fill('entrepreneur')
      await input.press('Enter')
      await expect(input).toHaveValue('')
      await page.waitForTimeout(400)
      assert.deepEqual(await playedWords(page), [])
    },
    { storage: { pronunciation: { isOpen: false } } },
  )

  await check(
    'each new word retains pronunciation volume and speed',
    async (page) => {
      const input = page.getByRole('textbox', { name: '英文默写输入' })
      await input.click()
      await expect.poll(() => endedWords(page)).toEqual(['entrepreneur'])
      await input.fill('entrepreneur')
      await input.press('Enter')
      await expect.poll(() => endedWords(page)).toEqual(['entrepreneur', 'mistaken'])
      const events = await page.evaluate(() => window.pronunciationEvents.filter(({ event }) => event === 'playing'))
      for (const { volume, rate } of events) {
        assert.equal(volume, 0.4)
        assert.equal(rate, 0.75)
      }
    },
    { storage: { pronunciation: { volume: 0.4, rate: 0.75 } } },
  )

  await check(
    'enabling pronunciation during practice plays the current word',
    async (page) => {
      await page.getByRole('button', { name: '开始', exact: true }).click()
      await page.getByRole('button', { name: '关闭', exact: true }).click()
      await page.getByRole('switch').nth(1).check()
      await expect.poll(() => endedWords(page)).toEqual(['entrepreneur'])
      assert.deepEqual(await playedWords(page), ['entrepreneur'])
    },
    { storage: { pronunciation: { isOpen: false } } },
  )
} finally {
  await browser.close()
}

if (failures.length) process.exitCode = 1
