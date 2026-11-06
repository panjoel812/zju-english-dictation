import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const inputUrl = new URL('../data/新文科大英全书词表-Unit1-8.csv', import.meta.url)
const outputDirectory = new URL('../public/dicts/', import.meta.url)

function parseCsvLine(line) {
  const cells = []
  let cell = ''
  let quoted = false

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index]
    if (character === '"') {
      if (quoted && line[index + 1] === '"') {
        cell += '"'
        index += 1
      } else {
        quoted = !quoted
      }
    } else if (character === ',' && !quoted) {
      cells.push(cell)
      cell = ''
    } else {
      cell += character
    }
  }

  if (quoted) throw new Error(`Unclosed CSV quote: ${line}`)
  cells.push(cell)
  return cells
}

export function parseCsv(source) {
  const lines = source
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .filter((line) => line.trim())
  if (!lines.length) return []
  const headers = parseCsvLine(lines[0]).map((header) => header.trim())
  const requiredHeaders = ['unit', 'type', 'english', 'pos', 'chinese']
  for (const header of requiredHeaders) {
    if (!headers.includes(header)) throw new Error(`Missing CSV header: ${header}`)
  }

  return lines.slice(1).map((line, index) => {
    const values = parseCsvLine(line)
    const row = Object.fromEntries(headers.map((header, headerIndex) => [header, values[headerIndex]?.trim() ?? '']))
    if (!/^\d+$/.test(row.unit) || Number(row.unit) < 1 || Number(row.unit) > 8) {
      throw new Error(`Invalid unit on CSV row ${index + 2}: ${row.unit}`)
    }
    if (!row.english || !row.chinese) throw new Error(`Missing vocabulary text on CSV row ${index + 2}`)
    return row
  })
}

export function buildDictionaries(rows) {
  const units = Array.from({ length: 8 }, (_, index) => ({ unit: index + 1, words: [] }))
  const seen = new Set()
  for (const row of rows) {
    const name = row.english.trim()
    const key = name.toLocaleLowerCase()
    if (seen.has(key)) throw new Error(`Duplicate vocabulary item: ${name}`)
    seen.add(key)
    const translation = row.pos ? `${row.pos} ${row.chinese.trim()}` : row.chinese.trim()
    units[Number(row.unit) - 1].words.push({ name, trans: [translation] })
  }
  return units
}

export async function generateDictionaries() {
  const rows = parseCsv(await readFile(inputUrl, 'utf8'))
  const dictionaries = buildDictionaries(rows)
  await Promise.all(
    dictionaries.map(({ unit, words }) =>
      writeFile(new URL(`zju-liberal-arts-unit-${unit}.json`, outputDirectory), `${JSON.stringify(words, null, 2)}\n`),
    ),
  )
  return dictionaries
}

const scriptPath = process.argv[1] ? resolve(process.argv[1]) : ''
if (scriptPath && pathToFileURL(scriptPath).href === import.meta.url) {
  const dictionaries = await generateDictionaries()
  console.log(`Generated ${dictionaries.reduce((total, dictionary) => total + dictionary.words.length, 0)} vocabulary items.`)
}

export const __filename = fileURLToPath(import.meta.url)
