import type { WordUpdateAction } from '../InputHandler'
import { TypingContext, TypingStateActionType } from '@/pages/Typing/store'
import type { FormEvent } from 'react'
import { useCallback, useContext, useEffect, useRef } from 'react'

export default function TextAreaHandler({ updateInput, isMobile = false }: { updateInput: (updateObj: WordUpdateAction) => void; isMobile?: boolean }) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  // eslint-disable-next-line  @typescript-eslint/no-non-null-assertion
  const { state, dispatch } = useContext(TypingContext)!

  useEffect(() => {
    if (!textareaRef.current) return

    if (state.isTyping) {
      textareaRef.current.focus()
    } else {
      textareaRef.current.blur()
    }
  }, [state.isTyping])

  const onInput = (e: FormEvent<HTMLTextAreaElement>) => {
    const nativeEvent = e.nativeEvent as InputEvent
    if (!nativeEvent.isComposing && nativeEvent.data !== null) {
      updateInput({ type: 'add', value: nativeEvent.data, event: e })

      if (textareaRef.current) {
        textareaRef.current.value = ''
      }
    }
  }

  const onBlur = useCallback(() => {
    if (!textareaRef.current) return

    if (state.isTyping) {
      textareaRef.current.focus()
    }
  }, [state.isTyping])

  const onFocus = useCallback(() => {
    if (isMobile && !state.isTyping) {
      dispatch({ type: TypingStateActionType.SET_IS_TYPING, payload: true })
    }
  }, [dispatch, isMobile, state.isTyping])

  return (
    <textarea
      id={isMobile ? 'typing-mobile-input' : undefined}
      className={
        isMobile
          ? 'fixed bottom-3 left-3 z-30 h-11 w-[calc(100%-1.5rem)] rounded-xl border border-indigo-200 bg-white/95 px-3 text-center text-sm text-slate-500 shadow-lg outline-none placeholder:text-slate-400 dark:border-slate-700 dark:bg-gray-800/95 dark:text-slate-200'
          : 'absolute left-0 top-0 m-0 h-0 w-0 appearance-none overflow-hidden border-0 p-0 focus:outline-none'
      }
      ref={textareaRef}
      autoFocus
      inputMode={isMobile ? 'text' : undefined}
      placeholder={isMobile ? '点击此处唤起键盘并输入英文' : undefined}
      spellCheck="false"
      onInput={onInput}
      onFocus={onFocus}
      onBlur={onBlur}
      onCompositionStart={() => {
        alert('您正在使用输入法，请关闭输入法。')
      }}
    ></textarea>
  )
}
