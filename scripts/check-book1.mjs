import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const entries = JSON.parse(readFileSync(new URL('../public/dicts/zju-english-book1-u1-4.json', import.meta.url), 'utf8'))

assert.equal(entries.length, 245, 'Book 1 should contain 245 words')
assert.equal(new Set(entries.map(({ name }) => name.toLowerCase())).size, entries.length, 'Book 1 words must be unique')

for (const entry of entries) {
  assert.match(entry.name, /^[A-Za-z]+(?:-[A-Za-z]+)*$/, entry.name)
  assert.ok(Array.isArray(entry.trans) && entry.trans.length > 0, `${entry.name} is missing translations`)
  assert.ok(entry.trans.every((text) => /[\u4e00-\u9fff]/u.test(text)), `${entry.name} has no Chinese meaning`)
  assert.ok(entry.usphone?.trim(), `${entry.name} is missing American pronunciation`)
  assert.ok(entry.ukphone?.trim(), `${entry.name} is missing British pronunciation`)
}

console.log(`Book 1 dictionary is complete: ${entries.length} words with meanings and pronunciations.`)
