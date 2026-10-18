import { chromium, expect } from '@playwright/test'
import assert from 'node:assert/strict'

const baseURL = process.env.TEST_URL || 'http://127.0.0.1:5174'
const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL || 'chrome', headless: true })
const failures = []
const categories = ['浙江大学英语III', '浙江大学英语IV', 'Book1', '浙大新工科英语', '四六级', '雅思托福']
const cards = (page) =>
  page
    .getByRole('main')
    .getByRole('button', { includeHidden: true })
    .filter({ has: page.getByRole('heading') })
const categoryTabs = (page) => page.getByRole('tablist', { name: '词库分类', exact: true })
const unitTabs = (page) => page.getByRole('tablist', { name: '单元', exact: true })

async function check(name, run, { dictionary, width = 1440 } = {}) {
  const context = await browser.newContext({ viewport: { width, height: 900 }, isMobile: width < 600, hasTouch: width < 600 })
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.setDefaultTimeout(5000)
  try {
    await page.addInitScript((dictionary) => {
      localStorage.setItem('lastSeenRelease', JSON.stringify('0.3.1'))
      if (dictionary) localStorage.setItem('currentDict-zju-english3', JSON.stringify(dictionary))
      localStorage.setItem('currentChapter', '1')
    }, dictionary)
    await page.goto(`${baseURL}/gallery`, { waitUntil: 'domcontentloaded' })
    await run(page)
    assert.deepEqual(errors, [], 'gallery must not cause runtime errors')
    console.log(`PASS ${name}`)
  } catch (error) {
    failures.push(name)
    console.error(`FAIL ${name}: ${error.message.split('Call log:')[0]}`)
  } finally {
    await context.close()
  }
}

async function expectCards(page, names) {
  await expect(cards(page).getByRole('heading')).toHaveText(names)
}

async function assertNoOverflow(page) {
  const dimensions = await page.evaluate(() => ({
    width: window.innerWidth,
    document: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
  }))
  assert.ok(dimensions.document <= dimensions.width && dimensions.body <= dimensions.width, JSON.stringify(dimensions))
  for (const card of await cards(page).all()) {
    const rect = await card.boundingBox()
    assert.ok(rect && rect.x >= 0 && rect.x + rect.width <= dimensions.width, `card exceeds viewport: ${JSON.stringify(rect)}`)
  }
}

try {
  await check('default gallery renders only the current category and unit', async (page) => {
    await expect(categoryTabs(page).getByRole('tab')).toHaveText(categories)
    await expect(categoryTabs(page).getByRole('tab', { selected: true })).toHaveText('浙江大学英语III')
    await expect(unitTabs(page).getByRole('tab', { selected: true })).toHaveText('Unit 1')
    await expectCards(page, ['浙江大学英语III - Unit 1 Reading 1', '浙江大学英语III - Unit 1 Reading 2'])
  })

  for (const [category, count, prefix, suffixes] of [
    ['浙江大学英语III', 2, '浙江大学英语III', [' Reading 1', ' Reading 2']],
    ['浙江大学英语IV', 1, '浙江大学英语IV', ['']],
    ['浙大新工科英语', 3, '新工科英语', [' Viewing', ' Reading 1', ' Reading 2']],
  ]) {
    await check(
      `${category} switches all eight units without changing the learning selection`,
      async (page) => {
        const before = await page.evaluate(() => [localStorage.getItem('currentDict-zju-english3'), localStorage.getItem('currentChapter')])
        await categoryTabs(page).getByRole('tab', { name: category, exact: true }).click()
        await expect(unitTabs(page).getByRole('tab')).toHaveText([
          'Unit 1',
          'Unit 2',
          'Unit 3',
          'Unit 4',
          'Unit 5',
          'Unit 6',
          'Unit 7',
          'Unit 8',
        ])
        for (const unit of [1, 2, 3, 4, 5, 6, 7, 8, 1]) {
          await unitTabs(page)
            .getByRole('tab', { name: `Unit ${unit}`, exact: true })
            .click()
          await expect(unitTabs(page).getByRole('tab', { selected: true })).toHaveText(`Unit ${unit}`)
          await expect(cards(page)).toHaveCount(count)
          await expectCards(
            page,
            suffixes.map((suffix) => `${prefix} - Unit ${unit}${suffix}`),
          )
        }
        assert.deepEqual(
          await page.evaluate(() => [localStorage.getItem('currentDict-zju-english3'), localStorage.getItem('currentChapter')]),
          before,
        )
        if (category === '浙大新工科英语') await page.screenshot({ path: '/private/tmp/zju-gallery-desktop.png', fullPage: true })
      },
      { dictionary: 'zju-english-3-unit-6-reading-2' },
    )
  }

  for (const [dictionary, category, unit, name, count] of [
    ['zju-english-3-unit-6-reading-2', '浙江大学英语III', 6, '浙江大学英语III - Unit 6 Reading 2', 2],
    ['zju-english-4-unit-8', '浙江大学英语IV', 8, '浙江大学英语IV - Unit 8', 1],
    ['zju-english-book1-u1-4', 'Book1', null, '大学英语 Book 1 - Unit 1-4', 1],
    ['zju-english-engineering-unit-5-reading-2', '浙大新工科英语', 5, '新工科英语 - Unit 5 Reading 2', 3],
    ['cet6', '四六级', null, 'CET-6', 2],
    ['toefl', '雅思托福', null, 'TOEFL', 2],
  ]) {
    await check(
      `opening gallery follows saved dictionary ${dictionary}`,
      async (page) => {
        await expect(categoryTabs(page).getByRole('tab', { selected: true })).toHaveText(category)
        if (unit) await expect(unitTabs(page).getByRole('tab', { selected: true })).toHaveText(`Unit ${unit}`)
        else await expect(unitTabs(page)).toHaveCount(0)
        await expect(cards(page)).toHaveCount(count)
        await expect(cards(page).getByRole('heading', { name, exact: true })).toBeVisible()
        await categoryTabs(page)
          .getByRole('tab', { name: category === 'Book1' ? '四六级' : 'Book1', exact: true })
          .click()
        await categoryTabs(page).getByRole('tab', { name: category, exact: true }).click()
        await expect(cards(page)).toHaveCount(count)
        await expect(cards(page).getByRole('heading', { name, exact: true })).toBeVisible()
      },
      { dictionary },
    )
  }

  await check('category and unit tabs support keyboard navigation without leaving gallery', async (page) => {
    const first = categoryTabs(page).getByRole('tab', { name: categories[0], exact: true })
    await first.focus()
    await first.press('ArrowRight')
    await expect(categoryTabs(page).getByRole('tab', { selected: true })).toHaveText(categories[1])
    const unit = unitTabs(page).getByRole('tab', { name: 'Unit 1', exact: true })
    await unit.focus()
    await unit.press('End')
    await expect(unitTabs(page).getByRole('tab', { selected: true })).toHaveText('Unit 8')
    await unitTabs(page).getByRole('tab', { selected: true }).press('Enter')
    await expect(page).toHaveURL(`${baseURL}/gallery`)
    await expectCards(page, ['浙江大学英语IV - Unit 8'])
    await unitTabs(page).getByRole('tab', { selected: true }).press('Home')
    await expectCards(page, ['浙江大学英语IV - Unit 1'])
    await categoryTabs(page).getByRole('tab', { selected: true }).focus()
    await categoryTabs(page).getByRole('tab', { selected: true }).press('End')
    await expect(categoryTabs(page).getByRole('tab', { selected: true })).toHaveText('雅思托福')
    await expect(unitTabs(page)).toHaveCount(0)
    await expectCards(page, ['IELTS', 'TOEFL'])
  })

  await check('existing dictionary detail and chapter selection still work', async (page) => {
    await categoryTabs(page).getByRole('tab', { name: '浙大新工科英语', exact: true }).click()
    await unitTabs(page).getByRole('tab', { name: 'Unit 3', exact: true }).click()
    await cards(page)
      .filter({ has: page.getByRole('heading', { name: '新工科英语 - Unit 3 Reading 1', exact: true }) })
      .click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.getByRole('dialog').getByRole('heading', { name: '第 1 章', exact: true }).click()
    await expect(page).toHaveURL(`${baseURL}/`)
    assert.deepEqual(
      await page.evaluate(() => [localStorage.getItem('currentDict-zju-english3'), localStorage.getItem('currentChapter')]),
      [JSON.stringify('zju-english-engineering-unit-3-reading-1'), '0'],
    )
  })

  for (const width of [320, 390]) {
    await check(
      `mobile ${width}px keeps page and cards within viewport while tab bars scroll`,
      async (page) => {
        await expect(categoryTabs(page).getByRole('tab', { selected: true })).toHaveText('浙大新工科英语')
        await expect(unitTabs(page).getByRole('tab', { selected: true })).toHaveText('Unit 7')
        for (const list of [categoryTabs(page), unitTabs(page)]) {
          const dimensions = await list.evaluate((el) => ({
            width: el.clientWidth,
            scroll: el.scrollWidth,
            overflow: getComputedStyle(el).overflowX,
          }))
          assert.ok(dimensions.scroll > dimensions.width, 'tab bar must scroll on narrow screens')
          assert.match(dimensions.overflow, /auto|scroll/)
          const selected = await list.getByRole('tab', { selected: true }).boundingBox()
          assert.ok(selected.x >= 0 && selected.x + selected.width <= width, 'initial selection must be scrolled into view')
        }
        await assertNoOverflow(page)
        await page.screenshot({ path: `/private/tmp/zju-gallery-${width}.png`, fullPage: true })
        for (const category of categories) {
          await categoryTabs(page).getByRole('tab', { name: category, exact: true }).click()
          if (await unitTabs(page).count()) {
            await unitTabs(page).getByRole('tab', { name: 'Unit 8', exact: true }).click()
          }
          await assertNoOverflow(page)
        }
      },
      { dictionary: 'zju-english-engineering-unit-7-reading-2', width },
    )
  }
} finally {
  await browser.close()
}

if (failures.length) {
  console.error(`\n${failures.length} gallery check(s) failed`)
  process.exitCode = 1
} else {
  console.log('\nAll gallery checks passed')
}
