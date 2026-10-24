import { readFileSync, writeFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const root = new URL('../public/dicts/', import.meta.url)
const targetFile = new URL('zju-english-book1-u1-4.json', root)

// Prefer the project's cleaner learner dictionaries, then fall back to the broader
// dictionaries already shipped with the app. The first complete match wins.
const sourcePriority = [
  'CET6_T.json',
  'CET4_T.json',
  'Oxford5000.json',
  'Longman_Communication_3000.json',
  'coca20000.json',
  'Level8luan_2_T.json',
  '2025KaoYanHongBaoShu.json',
  'IELTS_disorder.json',
  'IELTS_order.json',
  'Macmillan7000.json',
  'xinghuoqiaoji_6.json',
  'DanCiDeMimi_1.json',
  'KaoYan_3_T.json',
  'KaoYan_2024.json',
  'PTE_junior.json',
  'PETS3-2023.json',
  'IELTS_XDF_7000.json',
]

const manualEntries = {
  ethologist: {
    trans: ['n. 动物行为学家'],
    usphone: 'iːˈθɑːlədʒɪst',
    ukphone: 'iːˈθɒlədʒɪst',
  },
  'whole-heartedly': {
    trans: ['adv. 全心全意地'],
    usphone: 'ˌhoʊlˈhɑːrtɪdli',
    ukphone: 'ˌhəʊlˈhɑːtɪdli',
  },
  'single-mindedly': {
    trans: ['adv. 一心一意地；专心致志地'],
    usphone: 'ˌsɪŋɡəlˈmaɪndɪdli',
    ukphone: 'ˌsɪŋɡəlˈmaɪndɪdli',
  },
  grounded: {
    trans: ['adj. 接地的；脚踏实地的'],
    usphone: 'ˈɡraʊndɪd',
    ukphone: 'ˈɡraʊndɪd',
  },
  locksmith: {
    trans: ['n. 锁匠；修锁工'],
    usphone: 'ˈlɑːksmɪθ',
    ukphone: 'ˈlɒksmɪθ',
  },
  unsteadily: {
    trans: ['adv. 不稳定地；摇摇晃晃地'],
    usphone: 'ʌnˈstedəli',
    ukphone: 'ʌnˈstedəli',
  },
  restlessly: {
    trans: ['adv. 不安地；坐立不安地'],
    usphone: 'ˈrestləsli',
    ukphone: 'ˈrestləsli',
  },
}

const hasText = (value) => {
  if (Array.isArray(value)) return value.some((item) => String(item).trim().length > 0)
  return String(value ?? '').trim().length > 0
}

const asTranslations = (value) => (Array.isArray(value) ? value : [value]).map((item) => String(item).trim()).filter(Boolean)
const hasChineseMeaning = (value) => {
  const translations = asTranslations(value)
  return translations.length > 0 && translations.every((text) => /[\u4e00-\u9fff]/u.test(text))
}

const fallbackSources = readdirSync(new URL('../public/dicts/', import.meta.url))
  .filter((file) => file.endsWith('.json') && file !== 'zju-english-book1-u1-4.json' && !sourcePriority.includes(file))
  .sort((a, b) => a.localeCompare(b))

const dictionaries = [...sourcePriority, ...fallbackSources].map((file) => {
  const entries = JSON.parse(readFileSync(new URL(file, root), 'utf8'))
  const byName = new Map()
  for (const entry of entries) {
    const name = String(entry.name ?? '').trim().toLowerCase()
    if (name && !byName.has(name)) byName.set(name, entry)
  }
  return { file, byName }
})

const original = JSON.parse(readFileSync(targetFile, 'utf8'))
const enriched = original.map(({ name }) => {
  const key = name.trim().toLowerCase()
  const manual = manualEntries[key]
  if (manual) return { name, ...manual }

  for (const { file, byName } of dictionaries) {
    const candidate = byName.get(key)
    if (!candidate || !hasChineseMeaning(candidate.trans) || !hasText(candidate.usphone) || !hasText(candidate.ukphone)) continue
    return {
      name,
      trans: asTranslations(candidate.trans),
      usphone: String(candidate.usphone).trim(),
      ukphone: String(candidate.ukphone).trim(),
      source: file,
    }
  }

  throw new Error(`No complete dictionary entry found for ${name}`)
})

const withoutSource = enriched.map(({ source, ...entry }) => entry)
writeFileSync(targetFile, `${JSON.stringify(withoutSource, null, 2)}\n`)
console.log(`Enriched ${withoutSource.length} Book 1 entries.`)
