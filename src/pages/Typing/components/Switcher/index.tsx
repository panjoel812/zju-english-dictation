import { TypingContext, TypingStateActionType } from '../../store'
import AnalysisButton from '../AnalysisButton'
import ErrorBookButton from '../ErrorBookButton'
import ExportDataButton from '../ExportDataButton'
import HandPositionIllustration from '../HandPositionIllustration'
import WordList from '../WordList'
import Tooltip from '@/components/Tooltip'
import { effectiveWholeWordModeAtom, isOpenDarkModeAtom, wordDictationConfigAtom } from '@/store'
import { CTRL } from '@/utils'
import { useAtom, useAtomValue } from 'jotai'
import { useContext } from 'react'
import { useHotkeys } from 'react-hotkeys-hook'
import { Link } from 'react-router-dom'
import IconMoon from '~icons/heroicons/moon-solid'
import IconSun from '~icons/heroicons/sun-solid'
import IconClipboardList from '~icons/tabler/clipboard-list'
import IconLanguage from '~icons/tabler/language'
import IconLanguageOff from '~icons/tabler/language-off'

export default function Switcher() {
  const isQuizAvailable = import.meta.env.DEV
  const [isOpenDarkMode, setIsOpenDarkMode] = useAtom(isOpenDarkModeAtom)
  const [, setDictationConfig] = useAtom(wordDictationConfigAtom)
  const wholeWordMode = useAtomValue(effectiveWholeWordModeAtom)
  useHotkeys(
    'ctrl+v',
    () => setDictationConfig((old) => ({ ...old, isOpen: !old.isOpen, openBy: 'user' })),
    { enableOnFormTags: !wholeWordMode, preventDefault: true },
    [setDictationConfig],
  )
  const { state, dispatch } = useContext(TypingContext) ?? {}

  const changeDarkModeState = () => {
    setIsOpenDarkMode((old) => !old)
  }

  const changeTransVisibleState = () => {
    if (dispatch) {
      dispatch({ type: TypingStateActionType.TOGGLE_TRANS_VISIBLE })
    }
  }

  useHotkeys(
    'ctrl+shift+v',
    () => {
      changeTransVisibleState()
    },
    { enableOnFormTags: true, preventDefault: true },
    [],
  )

  return (
    <div className="flex flex-wrap items-center justify-center gap-0.5 sm:gap-1" aria-label="练习工具">
      <Tooltip content={`开关释义显示（${CTRL} + Shift + V）`}>
        <button
          data-guide="translation"
          className={`toolbar-button ${state?.isTransVisible ? 'bg-indigo-50 dark:bg-gray-700' : 'text-gray-500'}`}
          type="button"
          onClick={changeTransVisibleState}
          aria-label={`开关释义显示（${CTRL} + Shift + V）`}
          aria-pressed={state?.isTransVisible ?? false}
        >
          {state?.isTransVisible ? <IconLanguage /> : <IconLanguageOff />}
        </button>
      </Tooltip>
      <WordList />
      <Tooltip content={isQuizAvailable ? '小测专题' : '敬请期待'}>
        {isQuizAvailable ? (
          <Link to="/quiz" className="toolbar-button" aria-label="小测专题">
            <IconClipboardList />
          </Link>
        ) : (
          <button
            type="button"
            disabled
            title="敬请期待"
            aria-label="小测专题（敬请期待）"
            className="toolbar-button w-auto min-w-[88px] gap-1 whitespace-nowrap bg-gray-100 px-2 text-sm text-gray-400 disabled:cursor-not-allowed dark:bg-gray-700 dark:text-gray-500"
          >
            <IconClipboardList />
            <span className="text-xs font-medium">敬请期待</span>
          </button>
        )}
      </Tooltip>
      <Tooltip content="错题本">
        <ErrorBookButton />
      </Tooltip>
      <Tooltip content="查看数据统计">
        <AnalysisButton />
      </Tooltip>
      <Tooltip content="导出数据">
        <ExportDataButton />
      </Tooltip>
      <Tooltip content="开关深色模式">
        <button
          data-guide="theme"
          className="toolbar-button"
          type="button"
          onClick={changeDarkModeState}
          aria-label="开关深色模式"
          aria-pressed={isOpenDarkMode}
        >
          {isOpenDarkMode ? <IconMoon className="icon" /> : <IconSun className="icon" />}
        </button>
      </Tooltip>
      <Tooltip content="指法图示">
        <HandPositionIllustration />
      </Tooltip>
    </div>
  )
}
