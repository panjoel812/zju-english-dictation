import { parseUnit } from './import-engineering.mjs'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const fixture = `Vocabulary.txt
Viewing through the lens
New words
★ academic /8{k@9demIk/
n. [C] a teacher in a college 大学教师
a. relating to education 学术的（尤指与大学教育有关）
artificial intelligence (AI) n.
[U] machine intelligence 人工智能
Phrases and expressions
be grounded in
based on 基于
Exploring the frontier – Reading 1
New words
quantum /9kw^nt@m/ computer n.
[C] a computer based on quantum physics 量子计算机
★ horizontal /8hɒrI9zɒntl//ˌhɒrɪˈzɒntl//// a.
flat and level 水平的
communiqué /k@9mju:nIkeI/ n.
[C] an official statement 公报
Proper names
NASA
美国国家航空航天局
Exploring the frontier – Reading 2
New words
CV (curriculum vitae /k@8rIkjUl@m 9vi:taI/) n.
[C] a record of education 简历
-centric /-sentrIk/ suffix
[in a.] focused on 以···为中心的
★ mold /m@Uld/ (BrE mould)
n. [C] a container 模具
vt. shape sth. 塑造
`

test('keeps source order and the three module boundaries, excluding phrases and proper names', () => {
  const modules = parseUnit(fixture, 3)
  assert.deepEqual(
    modules.map(({ id }) => id),
    ['zju-english-engineering-unit-3-viewing', 'zju-english-engineering-unit-3-reading-1', 'zju-english-engineering-unit-3-reading-2'],
  )
  assert.deepEqual(
    modules.map(({ words }) => words.map(({ name }) => name)),
    [
      ['academic', 'artificial intelligence'],
      ['quantum computer', 'horizontal', 'communique'],
      ['CV', '-centric', 'mold'],
    ],
  )
})

test('retains every Chinese meaning and keeps abbreviations and source spellings out of the typing target', () => {
  const modules = parseUnit(fixture, 1)
  assert.deepEqual(modules[0].words[0], { name: 'academic', trans: ['大学教师', '学术的（尤指与大学教育有关）'] })
  assert.deepEqual(modules[0].words[1], { name: 'artificial intelligence', trans: ['人工智能', '词条补充：AI'] })
  assert.deepEqual(modules[1].words[1], { name: 'horizontal', trans: ['水平的'] })
  assert.deepEqual(modules[1].words[2], { name: 'communique', trans: ['公报', '原文拼写：communiqué'] })
  assert.deepEqual(modules[2].words[0], { name: 'CV', trans: ['简历', '词条补充：curriculum vitae'] })
  assert.deepEqual(modules[2].words[2], { name: 'mold', trans: ['模具', '塑造', '词条补充：BrE mould'] })
})

test('rejects incomplete modules, untranslated entries and duplicate typing targets', () => {
  assert.throws(() => parseUnit(fixture.replace('Exploring the frontier – Reading 2', 'Unknown section'), 1))
  assert.throws(() => parseUnit(fixture.replace('flat and level 水平的', 'flat and level'), 1), /horizontal/)
  assert.throws(() => parseUnit(fixture.replace('artificial intelligence (AI) n.', 'academic n.'), 1), /academic/)
})

test('keeps number when it is part of a multiword typing target', () => {
  const source = fixture.replace('artificial intelligence (AI) n.', 'serial /9sI@ri@l/ number n.')
  assert.equal(parseUnit(source, 1)[0].words[1].name, 'serial number')
  const numeral = fixture.replace('artificial intelligence (AI) n.', 'trillion /9trIlj@n/ number')
  assert.equal(parseUnit(numeral, 1)[0].words[1].name, 'trillion')
})

test('ships all 745 translated entries in 24 modules with matching resource metadata', () => {
  const root = new URL('../', import.meta.url)
  const resources = JSON.parse(readFileSync(new URL('src/resources/zju-engineering.json', root), 'utf8'))
  const counts = [
    [13, 43, 36],
    [12, 55, 46],
    [17, 45, 43],
    [12, 39, 39],
    [12, 39, 38],
    [15, 37, 39],
    [11, 42, 37],
    [14, 31, 30],
  ]
  assert.equal(resources.length, 24)
  assert.equal(new Set(resources.map(({ id }) => id)).size, 24)
  let total = 0
  for (const [index, resource] of resources.entries()) {
    const words = JSON.parse(readFileSync(new URL(`public/dicts/${resource.id}.json`, root), 'utf8'))
    assert.equal(words.length, counts[Math.floor(index / 3)][index % 3], resource.id)
    assert.equal(resource.length, words.length, resource.id)
    assert.equal(new Set(words.map(({ name }) => name.toLowerCase())).size, words.length, resource.id)
    if (resource.id === 'zju-english-engineering-unit-1-reading-1') {
      assert.ok(words.some(({ name, trans }) => name === 'serial number' && trans.includes('序列号')))
    }
    for (const word of words) {
      assert.match(word.name, /^[A-Za-z-]+(?:[ '-][A-Za-z-]+)*$/, word.name)
      assert.ok(word.trans.length > 0 && word.trans.every((text) => /[\u4e00-\u9fff]/.test(text)), word.name)
      assert.ok(!('usphone' in word) && !('ukphone' in word), 'Do not publish garbled source phonetics')
    }
    total += words.length
  }
  assert.equal(total, 745)
})
