import type { WordUpdateAction } from '../InputHandler'
import InputHandler from '../InputHandler'
import WholeWordInput from '../WholeWordInput'
import Letter from './Letter'
import Notation from './Notation'
import { TipAlert } from './TipAlert'
import style from './index.module.css'
import { initialWordState } from './type'
import type { WordState } from './type'
import type { WordPronunciationIconRef } from '@/components/WordPronunciationIcon'
import { WordPronunciationIcon } from '@/components/WordPronunciationIcon'
import { EXPLICIT_SPACE } from '@/constants'
import useKeySounds from '@/hooks/useKeySounds'
import { TypingContext, TypingStateActionType } from '@/pages/Typing/store'
import {
  currentChapterAtom,
  currentDictInfoAtom,
  fontSizeConfigAtom,
  hideWordLengthAtom,
  isIgnoreCaseAtom,
  isShowAnswerOnHoverAtom,
  isTextSelectableAtom,
  pronunciationIsOpenAtom,
  wholeWordModeAtom,
  wordDictationConfigAtom,
} from '@/store'
import type { Word } from '@/typings'
import { CTRL, getUtcStringForMixpanel } from '@/utils'
import { useSaveWordRecord } from '@/utils/db'
import { useAtomValue } from 'jotai'
import { useCallback, useContext, useEffect, useRef, useState } from 'react'
import { useHotkeys } from 'react-hotkeys-hook'
import { useImmer } from 'use-immer'

const vowelLetters = ['A', 'E', 'I', 'O', 'U']

export default function WordComponent({
  word,
  onFinish,
  onAnswerComplete,
  resetKey,
}: {
  word: Word
  onFinish: () => void
  onAnswerComplete: () => void
  resetKey: number
}) {
  // eslint-disable-next-line  @typescript-eslint/no-non-null-assertion
  const { state, dispatch } = useContext(TypingContext)!
  const [wordState, setWordState] = useImmer<WordState>(structuredClone(initialWordState))

  const wordDictationConfig = useAtomValue(wordDictationConfigAtom)
  const hideWordLength = useAtomValue(hideWordLengthAtom)
  const fontSizeConfig = useAtomValue(fontSizeConfigAtom)
  const wholeWordMode = useAtomValue(wholeWordModeAtom)
  const isTextSelectable = useAtomValue(isTextSelectableAtom)
  const isIgnoreCase = useAtomValue(isIgnoreCaseAtom)
  const isShowAnswerOnHover = useAtomValue(isShowAnswerOnHoverAtom)
  const saveWordRecord = useSaveWordRecord()
  // const wordLogUploader = useMixPanelWordLogUploader(state)
  const [playKeySound, playBeepSound, playHintSound] = useKeySounds()
  const pronunciationIsOpen = useAtomValue(pronunciationIsOpenAtom)
  const [isHoveringWord, setIsHoveringWord] = useState(false)
  const currentLanguage = useAtomValue(currentDictInfoAtom).language
  const currentLanguageCategory = useAtomValue(currentDictInfoAtom).languageCategory
  const currentChapter = useAtomValue(currentChapterAtom)

  const [showTipAlert, setShowTipAlert] = useState(false)
  const wordPronunciationIconRef = useRef<WordPronunciationIconRef>(null)
  const lastAutoPlayedWordRef = useRef<{ word: string; timestamp: number } | null>(null)
  const previousWholeWordMode = useRef(wholeWordMode)

  useEffect(() => {
    // run only when word changes
    let headword = ''
    try {
      headword = word.name.replace(new RegExp(' ', 'g'), EXPLICIT_SPACE)
      headword = headword.replace(new RegExp('…', 'g'), '..')
    } catch (e) {
      console.error('word.name is not a string', word)
      headword = ''
    }

    const newWordState = structuredClone(initialWordState)
    newWordState.displayWord = headword
    newWordState.letterStates = new Array(headword.length).fill('normal')
    newWordState.startTime = getUtcStringForMixpanel()
    newWordState.randomLetterVisible = headword.split('').map(() => Math.random() > 0.4)
    setWordState(newWordState)
  }, [word, resetKey, setWordState])

  useEffect(() => {
    if (previousWholeWordMode.current === wholeWordMode) return
    previousWholeWordMode.current = wholeWordMode
    setWordState((draft) => {
      if (draft.isFinished) return
      draft.inputWord = ''
      draft.hasWrong = false
      draft.letterStates = new Array(draft.displayWord.length).fill('normal')
    })
  }, [wholeWordMode, setWordState])

  const replaceInput = (value: string) => {
    if (!state.isTyping || wordState.isFinished) return
    const next = value.replace(/ /g, EXPLICIT_SPACE)
    if (next === wordState.inputWord) return
    setWordState((draft) => {
      const editCount = Math.max(1, next.length - draft.inputWord.length)
      for (let index = 0; index < editCount; index += 1) draft.letterTimeArray.push(Date.now())
      draft.inputWord = next
      draft.hasWrong = false
      draft.letterStates = new Array(draft.displayWord.length).fill('normal')
    })
    playKeySound()
  }

  const submitWord = () => {
    if (!state.isTyping || wordState.isFinished || wordState.hasWrong || !wordState.inputWord.replaceAll(EXPLICIT_SPACE, '').length) return
    const input = isIgnoreCase ? wordState.inputWord.toLowerCase() : wordState.inputWord
    const expected = isIgnoreCase ? wordState.displayWord.toLowerCase() : wordState.displayWord
    if (input === expected) {
      setWordState((draft) => {
        draft.letterStates.fill('correct')
        draft.correctCount += expected.length
        draft.isFinished = true
        draft.endTime = getUtcStringForMixpanel()
      })
      for (let index = 0; index < expected.length; index += 1) dispatch({ type: TypingStateActionType.REPORT_CORRECT_WORD })
      onAnswerComplete()
      playHintSound()
    } else {
      const letterMistake = structuredClone(wordState.letterMistake)
      for (let index = 0; index < Math.max(input.length, expected.length); index += 1) {
        if (input[index] !== expected[index]) {
          letterMistake[index] = [...(letterMistake[index] || []), wordState.inputWord[index] ?? '∅']
        }
      }
      setWordState((draft) => {
        draft.hasWrong = true
        draft.hasMadeInputWrong = true
        draft.wrongCount += 1
        draft.letterMistake = letterMistake
      })
      playBeepSound()
      dispatch({ type: TypingStateActionType.REPORT_WRONG_WORD, payload: { letterMistake } })
    }
  }

  const updateInput = useCallback(
    (updateAction: WordUpdateAction) => {
      switch (updateAction.type) {
        case 'add':
          if (!state.isTyping) return
          if (updateAction.value.includes(' ')) updateAction.event.preventDefault()
          setWordState((draft) => {
            if (draft.hasWrong || draft.isFinished) return
            draft.inputWord += updateAction.value.replace(/ /g, EXPLICIT_SPACE)
          })
          break

        default:
          console.warn('unknown update type', updateAction)
      }
    },
    [state.isTyping, setWordState],
  )

  const handleHoverWord = useCallback((checked: boolean) => {
    setIsHoveringWord(checked)
  }, [])

  useHotkeys(
    'tab',
    () => {
      handleHoverWord(true)
    },
    { enableOnFormTags: true, preventDefault: true },
    [],
  )

  useHotkeys(
    'tab',
    () => {
      handleHoverWord(false)
    },
    { enableOnFormTags: true, keyup: true, preventDefault: true },
    [],
  )
  useHotkeys(
    'ctrl+j',
    () => {
      if (state.isTyping) {
        wordPronunciationIconRef.current?.play()
      }
    },
    [state.isTyping],
    { enableOnFormTags: true, preventDefault: true },
  )

  const pronunciationInputLength = wholeWordMode ? 0 : wordState.inputWord.length
  useEffect(() => {
    if (!state.isTyping || !pronunciationIsOpen) {
      wordPronunciationIconRef.current?.stop()
      lastAutoPlayedWordRef.current = null
      return
    }
    if (pronunciationInputLength !== 0) return

    const now = Date.now()
    const lastAutoPlayedWord = lastAutoPlayedWordRef.current
    if (lastAutoPlayedWord?.word === word.name && now - lastAutoPlayedWord.timestamp < 600) return

    lastAutoPlayedWordRef.current = { word: word.name, timestamp: now }
    wordPronunciationIconRef.current?.play()
  }, [state.isTyping, pronunciationIsOpen, word.name, pronunciationInputLength, resetKey])

  const getLetterVisible = useCallback(
    (index: number) => {
      if (wordState.letterStates[index] === 'correct' || (isShowAnswerOnHover && isHoveringWord)) return true

      if (wordDictationConfig.isOpen) {
        if (wordDictationConfig.type === 'hideAll') return false

        const letter = wordState.displayWord[index]
        if (wordDictationConfig.type === 'hideVowel') {
          return vowelLetters.includes(letter.toUpperCase()) ? false : true
        }
        if (wordDictationConfig.type === 'hideConsonant') {
          return vowelLetters.includes(letter.toUpperCase()) ? true : false
        }
        if (wordDictationConfig.type === 'randomHide') {
          return wordState.randomLetterVisible[index]
        }
      }
      return true
    },
    [
      isHoveringWord,
      isShowAnswerOnHover,
      wordDictationConfig.isOpen,
      wordDictationConfig.type,
      wordState.displayWord,
      wordState.letterStates,
      wordState.randomLetterVisible,
    ],
  )

  useEffect(() => {
    if (wholeWordMode) return
    const inputLength = wordState.inputWord.length
    if (wordState.hasWrong || wordState.isFinished || inputLength === 0 || wordState.displayWord.length === 0) {
      return
    }
    // Mobile keyboards may commit several letters in one input/composition event.
    const start = wordState.letterStates.findIndex((letter) => letter !== 'correct')
    let end = start
    while (end < inputLength) {
      const inputChar = wordState.inputWord[end]
      const correctChar = wordState.displayWord[end]
      if (correctChar === undefined) break
      if (isIgnoreCase ? inputChar.toLowerCase() !== correctChar.toLowerCase() : inputChar !== correctChar) break
      end += 1
    }
    const hasWrong = end < inputLength
    const finished = !hasWrong && inputLength === wordState.displayWord.length
    const letterMistake = structuredClone(wordState.letterMistake)
    if (hasWrong) letterMistake[end] = [...(letterMistake[end] || []), wordState.inputWord[end]]

    setWordState((draft) => {
      for (let index = start; index < end; index += 1) {
        draft.letterStates[index] = 'correct'
        draft.letterTimeArray.push(Date.now())
        draft.correctCount += 1
      }
      if (hasWrong) {
        draft.letterStates[Math.min(end, draft.displayWord.length - 1)] = 'wrong'
        draft.hasWrong = true
        draft.hasMadeInputWrong = true
        draft.wrongCount += 1
        draft.letterTimeArray = []
        draft.letterMistake = letterMistake
      } else if (finished) {
        draft.isFinished = true
        draft.endTime = getUtcStringForMixpanel()
      }
    })
    for (let index = start; index < end; index += 1) {
      dispatch({ type: TypingStateActionType.REPORT_CORRECT_WORD })
    }
    if (hasWrong) {
      playBeepSound()
      dispatch({ type: TypingStateActionType.REPORT_WRONG_WORD, payload: { letterMistake } })
      if (currentChapter === 0 && state.chapterData.index === 0 && wordState.wrongCount >= 3) {
        setShowTipAlert(true)
      }
    } else if (finished) {
      onAnswerComplete()
      playHintSound()
    } else {
      playKeySound()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wordState.inputWord])

  useEffect(() => {
    if (wordState.hasWrong && !wholeWordMode) {
      const timer = setTimeout(() => {
        setWordState((state) => {
          state.inputWord = ''
          state.letterStates = new Array(state.letterStates.length).fill('normal')
          state.hasWrong = false
        })
      }, 300)

      return () => {
        clearTimeout(timer)
      }
    }
  }, [wordState.hasWrong, wholeWordMode, setWordState])

  useEffect(() => {
    if (wordState.isFinished) {
      dispatch({ type: TypingStateActionType.SET_IS_SAVING_RECORD, payload: true })

      // wordLogUploader({
      //   headword: word.name,
      //   timeStart: wordState.startTime,
      //   timeEnd: wordState.endTime,
      //   countInput: wordState.correctCount + wordState.wrongCount,
      //   countCorrect: wordState.correctCount,
      //   countTypo: wordState.wrongCount,
      // })
      saveWordRecord({
        word: word.name,
        wrongCount: wordState.wrongCount,
        letterTimeArray: wordState.letterTimeArray,
        letterMistake: wordState.letterMistake,
      })

      const finishTimer = window.setTimeout(onFinish, state.isTransVisible ? 0 : 1200)
      return () => window.clearTimeout(finishTimer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wordState.isFinished])

  useEffect(() => {
    if (wordState.wrongCount >= 4) {
      dispatch({ type: TypingStateActionType.SET_IS_SKIP, payload: true })
    }
  }, [wordState.wrongCount, dispatch])

  const isLengthHidden = wordDictationConfig.isOpen && hideWordLength
  const hiddenLineWidth = 384
  const hiddenWordLength = Math.max(wordState.displayWord.replaceAll(EXPLICIT_SPACE, ' ').length, 1)
  const hiddenLineFontSize = Math.min(
    fontSizeConfig.foreignFont,
    Math.max(16, Math.floor((hiddenLineWidth - hiddenWordLength * 3.2 - 8) / (hiddenWordLength * 0.6))),
  )
  const isAnswerRevealed = wordState.isFinished || (isShowAnswerOnHover && isHoveringWord)
  const pronunciation = pronunciationIsOpen ? (
    <div
      title={`快捷键${CTRL} + J`}
      onPointerDown={(event) => {
        if (event.button === 0) event.preventDefault()
      }}
    >
      <WordPronunciationIcon word={word} lang={currentLanguage} ref={wordPronunciationIconRef} className="h-9 w-9" />
    </div>
  ) : undefined

  return (
    <>
      <div
        lang={currentLanguageCategory !== 'code' ? currentLanguageCategory : 'en'}
        className="flex flex-col items-center justify-center pb-1 pt-4"
      >
        {['romaji', 'hapin'].includes(currentLanguage) && word.notation && <Notation notation={word.notation} />}
        <div
          className="tooltip-info relative w-full max-w-xl whitespace-normal bg-transparent px-12 leading-normal shadow-none dark:bg-transparent"
          data-tip="按 Tab 快捷键显示完整单词"
        >
          <div
            onMouseEnter={() => !wholeWordMode && !isLengthHidden && window.matchMedia('(hover: hover)').matches && handleHoverWord(true)}
            onMouseLeave={() => handleHoverWord(false)}
            className={`relative flex min-w-0 flex-wrap items-center justify-center ${
              isTextSelectable && !wholeWordMode ? 'select-all' : ''
            } ${!wholeWordMode && wordState.hasWrong ? style.wrong : ''}`}
          >
            {wholeWordMode ? (
              <WholeWordInput
                prompt={
                  isLengthHidden
                    ? undefined
                    : wordState.displayWord
                        .split('')
                        .map((letter, index) => (getLetterVisible(index) ? letter : '_'))
                        .join('')
                }
                pronunciation={pronunciation}
                value={wordState.inputWord.replaceAll(EXPLICIT_SPACE, ' ')}
                revealedAnswer={isAnswerRevealed ? wordState.displayWord.replaceAll(EXPLICIT_SPACE, ' ') : undefined}
                onChange={replaceInput}
                onSubmit={submitWord}
                isFinished={wordState.isFinished}
                hasWrong={wordState.hasWrong}
              />
            ) : (
              <div
                aria-label={isLengthHidden ? '单词长度已隐藏' : '字母格输入区'}
                className={`relative flex min-h-[56px] max-w-full items-center justify-center ${
                  isLengthHidden ? 'flex-nowrap' : 'flex-wrap'
                } ${
                  isLengthHidden ? 'w-full max-w-sm border-b-2 border-gray-400 focus-within:border-indigo-500' : ''
                }`}
              >
                {(isLengthHidden && !isAnswerRevealed ? wordState.inputWord : wordState.displayWord).split('').map((letter, index) => (
                  <Letter
                    key={index}
                    letter={letter}
                    visible={isLengthHidden || getLetterVisible(index)}
                    state={isLengthHidden ? (wordState.hasWrong ? 'wrong' : 'correct') : wordState.letterStates[index]}
                    fontSize={isLengthHidden ? hiddenLineFontSize : undefined}
                  />
                ))}
                <InputHandler updateInput={updateInput} inline />
                {pronunciation && <div className="absolute left-full top-2 ml-2 h-10 w-10">{pronunciation}</div>}
              </div>
            )}
          </div>
        </div>
      </div>
      <TipAlert className="fixed bottom-10 right-3" show={showTipAlert} setShow={setShowTipAlert} />
    </>
  )
}
