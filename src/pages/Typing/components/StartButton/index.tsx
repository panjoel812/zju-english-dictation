import { TypingContext, TypingStateActionType } from '../../store'
import { focusMobileTypingInput } from '../WordPanel/components/TextAreaHandler'
import { effectiveWholeWordModeAtom } from '@/store'
import { useAtomValue } from 'jotai'
import { useCallback, useContext } from 'react'
import { useHotkeys } from 'react-hotkeys-hook'

export default function StartButton({ isLoading }: { isLoading: boolean }) {
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const { state, dispatch } = useContext(TypingContext)!
  const wholeWordMode = useAtomValue(effectiveWholeWordModeAtom)

  const onToggleIsTyping = useCallback(() => {
    if (isLoading) return
    if (!state.isTyping) focusMobileTypingInput()
    dispatch({ type: TypingStateActionType.SET_IS_TYPING, payload: !state.isTyping })
  }, [isLoading, dispatch, state.isTyping])

  useHotkeys(
    'enter',
    onToggleIsTyping,
    {
      enableOnFormTags: !wholeWordMode,
      enabled: !wholeWordMode || !state.isTyping,
      preventDefault: true,
    },
    [onToggleIsTyping],
  )

  return (
    <button
      type="button"
      data-guide="start"
      onClick={onToggleIsTyping}
      aria-label={state.isTyping ? '暂停' : '开始'}
      disabled={isLoading}
      className={`flex h-8 min-w-[56px] items-center justify-center rounded-lg px-4 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 disabled:opacity-50 sm:h-9 sm:min-w-[64px] ${
        state.isTyping
          ? 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600'
          : 'bg-indigo-500 text-white hover:bg-indigo-600'
      }`}
    >
      {state.isTyping ? '暂停' : '开始'}
    </button>
  )
}
