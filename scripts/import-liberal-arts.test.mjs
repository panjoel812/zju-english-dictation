import { buildDictionaries, parseCsv } from './import-liberal-arts.mjs'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const csvPath = new URL('../data/新文科大英全书词表-Unit1-8.csv', import.meta.url)

test('parses the new liberal arts vocabulary into eight complete units', async () => {
  const rows = parseCsv(await readFile(csvPath, 'utf8'))
  const dictionaries = buildDictionaries(rows)
  const expectedLengths = [107, 111, 88, 96, 101, 86, 90, 91]

  assert.equal(rows.length, 770)
  assert.equal(dictionaries.length, 8)
  assert.deepEqual(
    dictionaries.map((dictionary) => dictionary.words.length),
    expectedLengths,
  )
  assert.equal(new Set(dictionaries.flatMap((dictionary) => dictionary.words.map((word) => word.name.toLocaleLowerCase()))).size, 770)
  assert.ok(dictionaries.flat().every((dictionary) => dictionary.words.every((word) => word.name && word.trans.length > 0)))
  assert.equal(dictionaries[0].words.find((word) => word.name === 'behavioral')?.trans[0], 'a. 行为的；行为方式的')
  assert.equal(dictionaries[1].words.find((word) => word.name === 'take (sth.) up')?.trans[0], '开始从事')
})
