import assert from 'node:assert/strict'
import { readFileSync, readdirSync, writeFileSync } from 'node:fs'

const root = new URL('../public/dicts/', import.meta.url)
const overrides = JSON.parse(readFileSync(new URL('./data/zju-pos-overrides.json', import.meta.url), 'utf8'))
const label = '(?:n|v|vt|vi|a|ad|adj|adv|prep|pron|conj|interj|aux|num|art|abbr)\\.'
const prefix = new RegExp(`^${label}(?:/${label})*`)
const suffix = /\(((?:n|v|vt|vi|adj|adv|prep|pron|conj)\.?[&/]?)+\.?\)$/
const isAnnotation = (text) => /^(词条补充：|原文拼写：|时态:|名\s*词:|形容词:)/.test(text)
const normalizePOS = (pos) => ({ 'vt.': 'v.', 'vi.': 'v.', 'a.': 'adj.', 'ad.': 'adv.' }[pos] ?? pos)
const terms = (text) =>
  new Set(
    text
      .replace(/[（(][^）)]*[）)]/g, '')
      .split(/[，,；;、]/)
      .map((term) => term.trim())
      .filter(Boolean),
  )
const sources = new Map()
const files = readdirSync(root)
  .filter((file) => file.endsWith('.json'))
  .sort()

for (const file of files.filter((file) => !file.startsWith('zju-'))) {
  for (const entry of JSON.parse(readFileSync(new URL(file, root), 'utf8'))) {
    if (typeof entry?.name !== 'string') continue
    const texts = Array.isArray(entry.trans) ? entry.trans : [entry.trans]
    for (const text of texts) {
      if (typeof text !== 'string') continue
      const matches = [...text.matchAll(new RegExp(`(?<![a-zA-Z])(${label})`, 'g'))]
      for (let index = 0; index < matches.length; index += 1) {
        const match = matches[index]
        const meaning = text.slice(match.index + match[0].length, matches[index + 1]?.index ?? text.length)
        if (!/[\u4e00-\u9fff]/u.test(meaning)) continue
        const key = entry.name.toLowerCase()
        const senses = sources.get(key) ?? []
        senses.push({ pos: normalizePOS(match[1]), terms: terms(meaning) })
        sources.set(key, senses)
      }
    }
  }
}

const outputs = []
let completed = 0
for (const file of files.filter((file) => file.startsWith('zju-english-'))) {
  const entries = JSON.parse(readFileSync(new URL(file, root), 'utf8'))
  let changed = false
  for (const word of entries) {
    word.trans = word.trans.map((meaning, index) => {
      // Keep original labels (including trailing labels) and source notes intact.
      if (prefix.test(meaning) || /^(number\b|suffix\b)/.test(meaning) || suffix.test(meaning) || isAnnotation(meaning)) return meaning
      const override = overrides[word.name]
      let pos = Array.isArray(override) ? override[index] : override
      if (!pos) {
        const senses = sources.get(word.name.toLowerCase()) ?? []
        const targetTerms = terms(meaning)
        const matching = new Set(senses.filter((sense) => [...targetTerms].some((term) => sense.terms.has(term))).map((sense) => sense.pos))
        const all = new Set(senses.map((sense) => sense.pos))
        const candidates = matching.size === 1 ? matching : all
        if (candidates.size === 1) pos = [...candidates][0]
      }
      assert.ok(pos, `Missing POS: ${file} ${word.name} [${index}] ${meaning}`)
      completed += 1
      changed = true
      return `${pos} ${meaning}`
    })
  }
  if (changed) outputs.push([file, entries])
}
// Resolve every entry before writing, so an unresolved meaning cannot leave a partial update.
for (const [file, entries] of outputs) writeFileSync(new URL(file, root), JSON.stringify(entries, null, 2) + '\n')
console.log(`Added ${completed} POS labels across ${outputs.length} course dictionaries.`)
