import assert from 'node:assert/strict'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const moduleDefinitions = [
  { heading: 'Viewing through the lens', slug: 'viewing', label: 'Viewing' },
  { heading: 'Exploring the frontier – Reading 1', slug: 'reading-1', label: 'Reading 1' },
  { heading: 'Exploring the frontier – Reading 2', slug: 'reading-2', label: 'Reading 2' },
]

export function parseUnit(source, unit) {
  const modules = []
  let currentModule
  let active = false
  let entry

  function finishEntry() {
    if (!entry) return
    assert.ok(entry.trans.length > 0, `Unit ${unit}: missing Chinese meaning for ${entry.name}`)
    assert.ok(!currentModule.words.some((word) => word.name.toLowerCase() === entry.name.toLowerCase()), `Duplicate: ${entry.name}`)
    currentModule.words.push({ name: entry.name, trans: [...entry.trans, ...entry.notes] })
    entry = undefined
  }

  for (const line of source.split('\n').map((text) => text.trim())) {
    const definition = moduleDefinitions.find(({ heading }) => heading === line)
    if (definition) {
      finishEntry()
      assert.equal(definition, moduleDefinitions[modules.length], `Unit ${unit}: missing or reordered module`)
      currentModule = {
        id: `zju-english-engineering-unit-${unit}-${definition.slug}`,
        name: `新工科英语 - Unit ${unit} ${definition.label}`,
        description: `浙大新工科英语 Unit ${unit} · ${definition.heading}`,
        words: [],
      }
      modules.push(currentModule)
      active = false
      continue
    }
    if (line === 'New words') {
      assert.ok(currentModule, `Unit ${unit}: New words without a module`)
      active = true
      continue
    }
    if (/^(Phrases and expressions|Proper names)$/.test(line)) {
      finishEntry()
      active = false
      continue
    }
    if (!active || !line) continue

    const isHeadword =
      /^[★▲]?\s*[-A-Za-zÀ-ÿ]/.test(line) &&
      !/[\u4e00-\u9fff]/.test(line) &&
      !/^(n|a|ad|v|vi|vt)\./.test(line) &&
      (/\/[^/]+\//.test(line) || /\b(n|v|a|ad|vt|vi)\./.test(line) || /suffix$/.test(line))

    if (isHeadword) {
      finishEntry()
      const notes = []
      // Phonetics may appear inside multiword terms and contain legacy PDF font codes.
      let name = line
        .replace(/^[★▲]\s*/, '')
        .replace(/\/[^/]*\//g, '')
        .replace(/\//g, '')
        .replace(/\s+(?:(?:n|v|a|ad|vt|vi)\..*|number|suffix)$/, '')
        .replace(/\(([^)]+)\)/g, (_, alias) => {
          notes.push(`词条补充：${alias.replace(/\s+/g, ' ').trim()}`)
          return ''
        })
        .replace(/\s+/g, ' ')
        .trim()
      if (name === 'communiqué') {
        notes.push('原文拼写：communiqué')
        name = 'communique'
      }
      assert.match(name, /^[A-Za-z-]+(?:[ '-][A-Za-z-]+)*$/, `Unit ${unit}: unrecognized headword ${line}`)
      entry = { name, trans: [], notes }
    } else {
      assert.ok(entry, `Unit ${unit}: definition without a headword: ${line}`)
      const firstChinese = line.search(/[\u4e00-\u9fff]/)
      if (firstChinese !== -1) {
        // Preserve prefixes such as "Jensen-Shannon散度" and Chinese opening parentheses.
        const start = line.lastIndexOf(' ', firstChinese - 1) + 1
        entry.trans.push(line.slice(start).trim())
      }
    }
  }
  finishEntry()
  assert.equal(modules.length, 3, `Unit ${unit}: expected three modules`)
  assert.ok(
    modules.every(({ words }) => words.length > 0),
    `Unit ${unit}: empty module`,
  )
  return modules
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  assert.ok(process.argv[2], 'Usage: node scripts/import-engineering.mjs <source-json>')
  const sources = JSON.parse(readFileSync(process.argv[2], 'utf8'))
  assert.equal(sources.length, 8, 'Expected eight original attachments in share order')
  const modules = sources.flatMap((source, index) => parseUnit(source, index + 1))
  const expectedCounts = [13, 43, 36, 12, 55, 46, 17, 45, 43, 12, 39, 39, 12, 39, 38, 15, 37, 39, 11, 42, 37, 14, 31, 30]
  assert.deepEqual(
    modules.map(({ words }) => words.length),
    expectedCounts,
    'Source counts changed; review before overwriting dictionaries',
  )
  const root = new URL('../', import.meta.url)
  for (const { id, words } of modules) {
    writeFileSync(new URL(`public/dicts/${id}.json`, root), JSON.stringify(words, null, 2) + '\n')
  }
  const resources = modules.map(({ words, ...metadata }) => ({ ...metadata, length: words.length }))
  writeFileSync(new URL('src/resources/zju-engineering.json', root), JSON.stringify(resources, null, 2) + '\n')
  console.log(`Imported ${modules.length} modules and ${expectedCounts.reduce((sum, count) => sum + count, 0)} words`)
}
