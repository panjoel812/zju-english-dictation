import DictionaryGroup from './CategoryDicts'
import DictTagSwitcher from './DictTagSwitcher'
import { LanguageTabSwitcher } from './LanguageTabSwitcher'
import Layout from '@/components/Layout'
import { Tabs, TabsContent } from '@/components/ui/tabs'
import { dictionaries } from '@/resources/dictionary'
import { currentDictInfoAtom } from '@/store'
import type { Dictionary, LanguageCategoryType } from '@/typings'
import { useAtomValue } from 'jotai'
import { createContext, useCallback, useEffect, useMemo, useState } from 'react'
import { useHotkeys } from 'react-hotkeys-hook'
import { useNavigate } from 'react-router-dom'
import type { Updater } from 'use-immer'
import { useImmer } from 'use-immer'
import IconX from '~icons/tabler/x'

export type GalleryState = {
  currentLanguageTab: LanguageCategoryType
}

const initialGalleryState: GalleryState = {
  currentLanguageTab: 'en',
}

export const GalleryContext = createContext<{
  state: GalleryState
  setState: Updater<GalleryState>
} | null>(null)

const categories = [
  { name: '浙江大学英语III', includes: (dict: Dictionary) => dict.id.startsWith('zju-english-3-') },
  { name: '浙江大学英语IV', includes: (dict: Dictionary) => dict.id.startsWith('zju-english-4-') },
  { name: 'Book1', includes: (dict: Dictionary) => dict.id.startsWith('zju-english-book1-') },
  { name: '浙大新工科英语', includes: (dict: Dictionary) => dict.id.startsWith('zju-english-engineering-') },
  { name: '四六级', includes: (dict: Dictionary) => ['cet4', 'cet6'].includes(dict.id) },
  { name: '雅思托福', includes: (dict: Dictionary) => ['ielts', 'toefl'].includes(dict.id) },
]

export default function GalleryPage() {
  const [galleryState, setGalleryState] = useImmer<GalleryState>(initialGalleryState)
  const navigate = useNavigate()
  const currentDictInfo = useAtomValue(currentDictInfoAtom)
  const [currentCategory, setCurrentCategory] = useState(
    () => categories.find((category) => category.includes(currentDictInfo))?.name ?? categories[0].name,
  )

  const dictionaryGroups = useMemo(() => {
    const currentLanguageCategoryDicts = dictionaries.filter((dict) => dict.languageCategory === galleryState.currentLanguageTab)
    return categories
      .map((category) => ({ name: category.name, dictionaries: currentLanguageCategoryDicts.filter(category.includes) }))
      .filter((category) => category.dictionaries.length > 0)
  }, [galleryState.currentLanguageTab])

  const onBack = useCallback(() => {
    navigate('/')
  }, [navigate])

  useHotkeys('esc', onBack, { preventDefault: true })

  useEffect(() => {
    if (currentDictInfo) {
      setGalleryState((state) => {
        state.currentLanguageTab = currentDictInfo.languageCategory
      })
      setCurrentCategory(categories.find((category) => category.includes(currentDictInfo))?.name ?? categories[0].name)
    }
  }, [currentDictInfo, setGalleryState])

  return (
    <Layout>
      <GalleryContext.Provider value={{ state: galleryState, setState: setGalleryState }}>
        <div className="mx-auto flex w-full min-w-0 max-w-6xl flex-1 flex-col px-4 py-8 sm:px-8 sm:py-12">
          <div className="mb-6 flex items-center justify-between gap-4">
            <LanguageTabSwitcher />
            <button
              type="button"
              aria-label="返回练习"
              title="返回练习"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-gray-400 hover:text-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:hover:text-gray-200"
              onClick={onBack}
            >
              <IconX className="h-6 w-6" />
            </button>
          </div>
          <Tabs value={currentCategory} onValueChange={setCurrentCategory} className="w-full min-w-0">
            <DictTagSwitcher label="词库分类" tagList={dictionaryGroups.map((group) => group.name)} currentTag={currentCategory} />
            {dictionaryGroups.map((group) => (
              <TabsContent key={group.name} value={group.name} className="mt-6 min-w-0">
                <DictionaryGroup dictionaries={group.dictionaries} />
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </GalleryContext.Provider>
    </Layout>
  )
}
