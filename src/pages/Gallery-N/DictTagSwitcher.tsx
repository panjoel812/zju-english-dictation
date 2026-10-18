import { TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useEffect, useRef } from 'react'

type Props = {
  label: string
  tagList: string[]
  currentTag: string
}

export default function DictTagSwitcher({ label, tagList, currentTag }: Props) {
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    listRef.current?.querySelector('[data-state="active"]')?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  }, [currentTag])

  return (
    <TabsList
      ref={listRef}
      aria-label={label}
      className="flex h-auto w-full justify-start gap-2 overflow-x-auto rounded-none border-b border-gray-200 bg-transparent p-1 dark:border-gray-700 dark:bg-transparent"
    >
      {tagList.map((option) => (
        <TabsTrigger
          key={option}
          value={option}
          className="min-h-11 shrink-0 rounded-none border-b-2 border-transparent px-3 text-gray-600 hover:text-indigo-600 focus-visible:ring-inset focus-visible:ring-indigo-500 data-[state=active]:border-indigo-500 data-[state=active]:bg-transparent data-[state=active]:text-indigo-600 data-[state=active]:shadow-none dark:text-gray-400 dark:hover:text-indigo-300 dark:data-[state=active]:bg-transparent dark:data-[state=active]:text-indigo-300"
        >
          {option}
        </TabsTrigger>
      ))}
    </TabsList>
  )
}
