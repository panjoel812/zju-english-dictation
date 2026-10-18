import assert from 'node:assert/strict'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const posPrefix = /^((?:n|v|vt|vi|a|ad|adj|adv|prep|pron|conj|interj|aux|num)\.|number\b|suffix\b)\s*/

function meaningTerms(text) {
  return text
    .normalize('NFKC')
    .split(/[,;、]/)
    .map((term) => term.replace(/\s+/g, ''))
    .filter(Boolean)
}

export function restorePartsOfSpeech(words, sources) {
  const byName = new Map()
  for (const source of sources) {
    const senses = byName.get(source.name) ?? []
    for (const meaning of source.trans) {
      const match = meaning.match(posPrefix)
      if (match) {
        const pos = { 'a.': 'adj.', 'ad.': 'adv.' }[match[1]] ?? match[1]
        senses.push({ pos, terms: new Set(meaningTerms(meaning.slice(match[0].length))) })
      }
    }
    byName.set(source.name, senses)
  }

  return words.map((word) => ({
    ...word,
    trans: word.trans.map((meaning) => {
      if (posPrefix.test(meaning) || /^(词条补充：|原文拼写：)/.test(meaning)) return meaning
      const terms = meaningTerms(meaning)
      if (terms.length === 0) return meaning
      const senses = byName.get(word.name) ?? []
      // Every synonym must have one unambiguous, shared POS in the source.
      const matches = terms.map((term) => new Set(senses.filter((sense) => sense.terms.has(term)).map(({ pos }) => pos)))
      const labels = new Set(matches.flatMap((match) => [...match]))
      return matches.every((match) => match.size === 1) && labels.size === 1 ? `${[...labels][0]} ${meaning}` : meaning
    }),
  }))
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  assert.ok(process.argv.length > 3, 'Usage: node scripts/restore-zju-pos.mjs <source-records.json> <dict.json> [...]')
  const sources = JSON.parse(readFileSync(process.argv[2], 'utf8'))
  const outputs = process.argv.slice(3).map((file) => {
    const before = JSON.parse(readFileSync(file, 'utf8'))
    const after = restorePartsOfSpeech(before, sources)
    const changed = after.reduce(
      (sum, word, index) => sum + word.trans.filter((meaning, i) => meaning !== before[index].trans[i]).length,
      0,
    )
    return { file, after, changed }
  })
  for (const { file, after, changed } of outputs) {
    if (changed) writeFileSync(file, JSON.stringify(after, null, 2) + '\n')
    console.log(`${file}: restored ${changed} meaning prefixes`)
  }
}
