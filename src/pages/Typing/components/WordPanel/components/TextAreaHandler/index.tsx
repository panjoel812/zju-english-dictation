import type { WordUpdateAction } from '../InputHandler'
import { TypingContext, TypingStateActionType } from '@/pages/Typing/store'
import type { FormEvent } from 'react'
import { useContext, useEffect, useRef } from 'react'

export function focusMobileTypingInput() {
  // iOS requires focus in the original tap handler, not a later React effect.
  document.getElementById('typing-mobile-input')?.focus()
}

export default function TextAreaHandler({
  updateInput,
  isMobile = false,
}: {
  updateInput: (updateObj: WordUpdateAction) => void
  isMobile?: boolean
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  // eslint-disable-next-line  @typescript-eslint/no-non-null-assertion
  const { state, dispatch } = useContext(TypingContext)!

  useEffect(() => {
    if (!textareaRef.current) return

    if (state.isTyping && !isMobile) {
      textareaRef.current.focus()
    } else if (!state.isTyping) {
      textareaRef.current.blur()
    }
  }, [state.isTyping, isMobile])

  const onInput = (e: FormEvent<HTMLTextAreaElement>) => {
    const nativeEvent = e.nativeEvent as InputEvent
    if (nativeEvent.isComposing) return
    const value = e.currentTarget.value
    e.currentTarget.value = ''
    if (state.isTyping && value && !nativeEvent.inputType?.startsWith('delete')) {
      updateInput({ type: 'add', value, event: e })
    }
  }

  return (
    <textarea
      id={isMobile ? 'typing-mobile-input' : undefined}
      className={
        isMobile
          ? 'relative z-20 mx-auto mt-4 block h-12 w-full max-w-sm resize-none rounded-lg border border-gray-300 bg-white px-3 py-3 text-center text-base leading-6 text-gray-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200'
          : 'absolute left-0 top-0 m-0 h-0 w-0 appearance-none overflow-hidden border-0 p-0 focus:outline-none'
      }
      ref={textareaRef}
      rows={1}
      inputMode={isMobile ? 'text' : undefined}
      aria-label="英文默写输入"
      placeholder={isMobile ? '输入英文' : undefined}
      autoCapitalize="none"
      autoCorrect="off"
      autoComplete="off"
      spellCheck="false"
      onInput={onInput}
      onCompositionEnd={onInput}
      onFocus={() => {
        if (isMobile && !state.isTyping) dispatch({ type: TypingStateActionType.SET_IS_TYPING, payload: true })
      }}
    ></textarea>
  )
}
