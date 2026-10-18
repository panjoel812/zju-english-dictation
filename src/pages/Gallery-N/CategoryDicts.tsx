import DictTagSwitcher from './DictTagSwitcher'
import DictionaryComponent from './DictionaryWithoutCover'
import { Tabs, TabsContent } from '@/components/ui/tabs'
import { currentDictInfoAtom } from '@/store'
import type { Dictionary } from '@/typings'
import { useAtomValue } from 'jotai'
import { useEffect, useMemo, useState } from 'react'

function unitLabel(dictionary: Dictionary) {
  const unit = dictionary.id.match(/-unit-(\d+)(?:-|$)/)?.[1]
  return unit ? `Unit ${unit}` : undefined
}

function DictionaryGrid({ dictionaries }: { dictionaries: Dictionary[] }) {
  return (
    <div className="grid min-w-0 grid-cols-1 gap-5 px-1 pb-4 sm:grid-cols-2 lg:grid-cols-3">
      {dictionaries.map((dict) => (
        <DictionaryComponent key={dict.id} dictionary={dict} />
      ))}
    </div>
  )
}

export default function DictionaryGroup({ dictionaries }: { dictionaries: Dictionary[] }) {
  const currentDictInfo = useAtomValue(currentDictInfoAtom)
  const units = useMemo(() => {
    const grouped: Record<string, Dictionary[]> = {}
    for (const dictionary of dictionaries) {
      const unit = unitLabel(dictionary)
      if (unit) (grouped[unit] ??= []).push(dictionary)
    }
    return grouped
  }, [dictionaries])
  const unitList = useMemo(() => Object.keys(units).sort((a, b) => a.localeCompare(b, undefined, { numeric: true })), [units])
  const [currentUnit, setCurrentUnit] = useState(() => {
    const current = dictionaries.find((dict) => dict.id === currentDictInfo.id)
    return (current && unitLabel(current)) ?? unitList[0]
  })

  useEffect(() => {
    const current = dictionaries.find((dict) => dict.id === currentDictInfo.id)
    if (current) setCurrentUnit(unitLabel(current) ?? unitList[0])
  }, [currentDictInfo.id, dictionaries, unitList])

  if (unitList.length === 0) return <DictionaryGrid dictionaries={dictionaries} />

  return (
    <Tabs value={currentUnit} onValueChange={setCurrentUnit} className="min-w-0">
      <DictTagSwitcher label="单元" tagList={unitList} currentTag={currentUnit} />
      {unitList.map((unit) => (
        <TabsContent key={unit} value={unit} className="mt-5">
          <DictionaryGrid dictionaries={units[unit]} />
        </TabsContent>
      ))}
    </Tabs>
  )
}
