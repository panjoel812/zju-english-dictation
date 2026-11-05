import { GalleryContext } from '.'
import type { LanguageCategoryType } from '@/typings'
import { RadioGroup } from '@headlessui/react'
import { useCallback, useContext } from 'react'

export type LanguageTabOption = {
  id: LanguageCategoryType
  name: string
  flag: string
}

const options: LanguageTabOption[] = [
  { id: 'en', name: '英语', flag: '🇬🇧' },
  { id: 'de', name: '德语', flag: '🇩🇪' },
  { id: 'es', name: '西班牙语', flag: '🇪🇸' },
  { id: 'fr', name: '法语', flag: '🇫🇷' },
  { id: 'ja', name: '日语', flag: '🇯🇵' },
  { id: 'ko', name: '韩语', flag: '🇰🇷' },
  { id: 'ru', name: '俄语', flag: '🇷🇺' },
]

export function LanguageTabSwitcher() {
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const { state, setState } = useContext(GalleryContext)!

  const onChangeTab = useCallback(
    (tab: string) => {
      setState((draft) => {
        draft.currentLanguageTab = tab as LanguageCategoryType
      })
    },
    [setState],
  )

  return (
    <RadioGroup value={state.currentLanguageTab} onChange={onChangeTab} aria-label="语言" className="min-w-0 flex-1 overflow-x-auto">
      <div className="flex w-max items-center gap-2 sm:gap-4">
        {options.map((option) => (
          <RadioGroup.Option
            key={option.id}
            value={option.id}
            aria-label={option.name}
            className="cursor-pointer rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500"
          >
            {({ checked }) => (
              <div className={`flex items-center border-b-2 px-2 pb-1 ${checked ? 'border-indigo-500' : 'border-transparent'}`}>
                <span aria-hidden="true" className="mr-1.5 text-xl">
                  {option.flag}
                </span>
                <p className="whitespace-nowrap text-base font-medium text-gray-700 dark:text-gray-200 sm:text-lg">{option.name}</p>
              </div>
            )}
          </RadioGroup.Option>
        ))}
      </div>
    </RadioGroup>
  )
}
