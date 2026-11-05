import Layout from '../../components/Layout'
import { DictChapterButton } from './components/DictChapterButton'
import PracticeGuide from './components/PracticeGuide'
import ResultScreen from './components/ResultScreen'
import Setting from './components/Setting'
import Speed from './components/Speed'
import StartButton from './components/StartButton'
import Switcher from './components/Switcher'
import WordPanel from './components/WordPanel'
import { focusMobileTypingInput } from './components/WordPanel/components/TextAreaHandler'
import { useConfetti } from './hooks/useConfetti'
import { useWordList } from './hooks/useWordList'
import { TypingContext, TypingStateActionType, initialState, typingReducer } from './store'
import Header from '@/components/Header'
import Tooltip from '@/components/Tooltip'
import { idDictionaryMap } from '@/resources/dictionary'
import { LANG_PRON_MAP } from '@/resources/soundResource'
import {
  currentChapterAtom,
  currentDictIdAtom,
  currentDictInfoAtom,
  effectiveWholeWordModeAtom,
  isReviewModeAtom,
  phoneticConfigAtom,
  pronunciationConfigAtom,
  randomConfigAtom,
  reviewModeInfoAtom,
} from '@/store'
import { PRONUNCIATION_PHONETIC_MAP } from '@/typings'
import { isLegal } from '@/utils'
import { useSaveChapterRecord } from '@/utils/db'
import { useMixPanelChapterLogUploader } from '@/utils/mixpanel'
import { readTranslationPreference, saveTranslationPreference } from '@/utils/translationPreference'
import { useAtom, useAtomValue, useSetAtom } from 'jotai'
import type React from 'react'
import { useCallback, useEffect, useState } from 'react'
import { useImmerReducer } from 'use-immer'

const App: React.FC = () => {
  const defaultDictionaryId = 'zju-english-3-unit-1-reading-1'
  const [initialTypingState] = useState(() => ({
    ...structuredClone(initialState),
    isTransVisible: readTranslationPreference(),
  }))
  const [state, dispatch] = useImmerReducer(typingReducer, initialTypingState)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const { words } = useWordList()

  const [currentDictId, setCurrentDictId] = useAtom(currentDictIdAtom)
  const setCurrentChapter = useSetAtom(currentChapterAtom)
  const randomConfig = useAtomValue(randomConfigAtom)
  const wholeWordMode = useAtomValue(effectiveWholeWordModeAtom)
  const dictionary = useAtomValue(currentDictInfoAtom)
  const [pronunciation, setPronunciation] = useAtom(pronunciationConfigAtom)
  const setPhonetic = useSetAtom(phoneticConfigAtom)
  const chapterLogUploader = useMixPanelChapterLogUploader(state)
  const saveChapterRecord = useSaveChapterRecord()

  const reviewModeInfo = useAtomValue(reviewModeInfoAtom)
  const isReviewMode = useAtomValue(isReviewModeAtom)

  useEffect(() => {
    const voices = LANG_PRON_MAP[dictionary.language]
    const voice =
      voices.pronunciation.find((voice) => voice.pron === pronunciation.type) ??
      voices.pronunciation[dictionary.defaultPronIndex ?? voices.defaultPronIndex]
    if (voice.pron !== pronunciation.type) setPronunciation((old) => ({ ...old, type: voice.pron, name: voice.name }))
    setPhonetic((old) =>
      old.type === PRONUNCIATION_PHONETIC_MAP[voice.pron] ? old : { ...old, type: PRONUNCIATION_PHONETIC_MAP[voice.pron] },
    )
  }, [dictionary.language, dictionary.defaultPronIndex, pronunciation.type, setPronunciation, setPhonetic])

  useEffect(() => {
    saveTranslationPreference(state.isTransVisible)
  }, [state.isTransVisible])

  // 在组件挂载和currentDictId改变时，检查当前字典是否存在，如果不存在，则将其重置为默认值
  useEffect(() => {
    const id = currentDictId
    if (!(id in idDictionaryMap)) {
      setCurrentDictId(defaultDictionaryId)
      setCurrentChapter(0)
      return
    }
  }, [currentDictId, setCurrentChapter, setCurrentDictId])

  const skipWord = useCallback(() => {
    dispatch({ type: TypingStateActionType.SKIP_WORD })
  }, [dispatch])

  useEffect(() => {
    const onBlur = () => {
      dispatch({ type: TypingStateActionType.SET_IS_TYPING, payload: false })
    }
    window.addEventListener('blur', onBlur)

    return () => {
      window.removeEventListener('blur', onBlur)
    }
  }, [dispatch])

  useEffect(() => {
    state.chapterData.words?.length > 0 ? setIsLoading(false) : setIsLoading(true)
  }, [state.chapterData.words])

  useEffect(() => {
    if (!state.isTyping) {
      const onKeyDown = (e: KeyboardEvent) => {
        if (wholeWordMode && e.target instanceof HTMLElement && e.target.closest('input, textarea, select, [contenteditable="true"]'))
          return
        if (!isLoading && e.key !== 'Enter' && (isLegal(e.key) || e.key === ' ') && !e.altKey && !e.ctrlKey && !e.metaKey) {
          e.preventDefault()
          if (wholeWordMode) focusMobileTypingInput()
          dispatch({ type: TypingStateActionType.SET_IS_TYPING, payload: true })
        }
      }
      window.addEventListener('keydown', onKeyDown)

      return () => window.removeEventListener('keydown', onKeyDown)
    }
  }, [state.isTyping, isLoading, dispatch, wholeWordMode])

  useEffect(() => {
    if (words !== undefined) {
      const initialIndex = isReviewMode && reviewModeInfo.reviewRecord?.index ? reviewModeInfo.reviewRecord.index : 0

      dispatch({
        type: TypingStateActionType.SETUP_CHAPTER,
        payload: { words, shouldShuffle: randomConfig.isOpen, initialIndex },
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [words])

  useEffect(() => {
    // 当用户完成章节后且完成 word Record 数据保存，记录 chapter Record 数据,
    if (state.isFinished && !state.isSavingRecord) {
      chapterLogUploader()
      saveChapterRecord(state)
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.isFinished, state.isSavingRecord])

  useEffect(() => {
    // 启动计时器
    let intervalId: number
    if (state.isTyping) {
      intervalId = window.setInterval(() => {
        dispatch({ type: TypingStateActionType.TICK_TIMER })
      }, 1000)
    }
    return () => clearInterval(intervalId)
  }, [state.isTyping, dispatch])

  useConfetti(state.isFinished)

  return (
    <TypingContext.Provider value={{ state: state, dispatch }}>
      {state.isFinished && <ResultScreen />}
      <Layout>
        <Header
          actions={
            <>
              <StartButton isLoading={isLoading} />
              <Setting />
            </>
          }
        >
          <div data-guide="course" className="flex min-w-0 max-w-full flex-wrap items-center justify-center gap-1 sm:mr-auto">
            <DictChapterButton />
          </div>
          <Switcher />
          {state.isShowSkip && (
            <Tooltip content="跳过该词">
              <button
                className={`${
                  state.isShowSkip ? 'bg-orange-400' : 'invisible w-0 bg-gray-300 px-0 opacity-0'
                } my-btn-primary transition-all duration-300 `}
                onClick={skipWord}
              >
                Skip
              </button>
            </Tooltip>
          )}
        </Header>
        <div className="container mx-auto flex h-full flex-1 flex-col items-center justify-center pb-5">
          <div className="container relative mx-auto flex h-full flex-col items-center">
            <div className="container flex flex-grow items-center justify-center">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center ">
                  <div
                    className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid  border-indigo-400 border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"
                    role="status"
                  ></div>
                </div>
              ) : (
                !state.isFinished && <WordPanel />
              )}
            </div>
            <Speed />
          </div>
        </div>
      </Layout>
      <PracticeGuide ready={!isLoading && !state.isFinished} />
    </TypingContext.Provider>
  )
}

export default App
