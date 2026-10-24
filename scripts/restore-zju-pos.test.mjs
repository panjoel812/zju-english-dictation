import { restorePartsOfSpeech } from './restore-zju-pos.mjs'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync, readdirSync } from 'node:fs'
import test from 'node:test'

test('restores the explicit source POS only for the matching headword and complete meaning', () => {
  const words = [{ name: 'cord', trans: ['电线', '词条补充：example'], ukphone: 'unchanged' }]
  const sources = [{ name: 'cord', trans: ['n. 绳子；电线；灯芯绒', 'vt. 用线连接'] }]
  assert.deepEqual(restorePartsOfSpeech(words, sources), [{ name: 'cord', trans: ['n. 电线', '词条补充：example'], ukphone: 'unchanged' }])
  assert.equal(words[0].trans[0], '电线', 'Do not mutate the input')
})

test('matches each synonym to the same POS while preserving punctuation and meaning order', () => {
  const words = [{ name: 'assemble', trans: ['组装，装配'] }]
  assert.deepEqual(restorePartsOfSpeech(words, [{ name: 'assemble', trans: ['v. （使）集合；装配，组装'] }]), [
    { name: 'assemble', trans: ['v. 组装，装配'] },
  ])
})

test('leaves ambiguous, partial, unlabelled and different-headword matches unchanged', () => {
  const cases = [
    [{ name: 'cry', trans: ['恸哭'] }],
    [{ name: 'cry', trans: ['n. 恸哭', 'v. 恸哭'] }],
    [
      { name: 'cry', trans: ['n. 恸哭'] },
      { name: 'cry', trans: ['v. 恸哭'] },
    ],
    [{ name: 'other', trans: ['n. 恸哭'] }],
  ]
  const word = [{ name: 'cry', trans: ['恸哭'] }]
  for (const source of cases) assert.deepEqual(restorePartsOfSpeech(word, source), word)
  const partial = [{ name: 'spectrum', trans: ['范围，幅度'] }]
  assert.deepEqual(restorePartsOfSpeech(partial, [{ name: 'spectrum', trans: ['n. 光谱；范围'] }]), partial)
  const mixed = [{ name: 'echo', trans: ['回声；回响'] }]
  assert.deepEqual(restorePartsOfSpeech(mixed, [{ name: 'echo', trans: ['n. 回声', 'vi. 回响'] }]), mixed)
})

test('does not add translations or duplicate prefixes on repeated restoration', () => {
  const words = [
    { name: 'cord', trans: [] },
    { name: 'cord', trans: ['n. 电线'] },
  ]
  const source = [{ name: 'cord', trans: ['n. 电线'] }]
  assert.deepEqual(restorePartsOfSpeech(words, source), words)
  const once = restorePartsOfSpeech([{ name: 'cord', trans: ['电线'] }], source)
  assert.deepEqual(restorePartsOfSpeech(once, source), once)
})

test('preserves all 49 original dictionaries except for the restored POS prefixes', () => {
  const root = new URL('../public/dicts/', import.meta.url)
  const prefix = /^(?:(?:n|v|vt|vi|adj|adv|prep|pron|conj|interj|aux|num)\.|number|suffix) /u
  // Digests of the pre-restoration dictionaries, including file names, order and all fields.
  const families = [
    ['zju-english-engineering-', 24, 745, 882, 745, 860, '020f4cd905e85f8ee98462186bff415db0b7fa2388828f2d34235d6991c3b3ff'],
    ['zju-english-3-', 16, 580, 580, 182, 182, '4d3366c5f7d569f687bb9661e855e13508937ef4cde66c6016af9cff7ac007c6'],
    ['zju-english-4-', 8, 720, 716, 21, 21, '12491409c30ffe7981f0ab001ca3d85703c7805747f19fa19363b40091c0e8b6'],
    ['zju-english-book1-', 1, 245, 309, 39, 51, '46a32a8dfe9c9c076c010cf12b1197d20c7f960852350ade0c8678e40abe5cf8'],
  ]
  for (const [family, fileCount, wordCount, translationCount, taggedWords, taggedMeanings, digest] of families) {
    const files = readdirSync(root)
      .filter((file) => file.startsWith(family) && file.endsWith('.json'))
      .sort((a, b) => a.localeCompare(b))
    const dictionaries = files.map((file) => [file, JSON.parse(readFileSync(new URL(file, root), 'utf8'))])
    const words = dictionaries.flatMap(([, entries]) => entries)
    assert.equal(files.length, fileCount, family)
    assert.equal(words.length, wordCount, family)
    assert.equal(words.flatMap((word) => word.trans).length, translationCount, family)
    assert.equal(words.filter((word) => word.trans.some((text) => prefix.test(text))).length, taggedWords, family)
    assert.equal(words.flatMap((word) => word.trans).filter((text) => prefix.test(text)).length, taggedMeanings, family)
    const withoutPOS = dictionaries.map(([file, entries]) => [
      file,
      entries.map((word) => ({ ...word, trans: word.trans.map((text) => text.replace(prefix, '')) })),
    ])
    assert.equal(createHash('sha256').update(JSON.stringify(withoutPOS)).digest('hex'), digest, family)
  }
})
