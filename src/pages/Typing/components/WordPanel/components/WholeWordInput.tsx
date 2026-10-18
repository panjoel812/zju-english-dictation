import { TypingContext, TypingStateActionType } from '@/pages/Typing/store'
import { useContext, useEffect, useRef } from 'react'
import IconCheck from '~icons/tabler/check'

export default function WholeWordInput({
  value,
  onChange,
  onSubmit,
  isFinished,
  hasWrong,
}: {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  isFinished: boolean
  hasWrong: boolean
}) {
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const { state, dispatch } = useContext(TypingContext)!
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const isComposing = useRef(false)

  useEffect(() => {
    inputRef.current?.setAttribute('enterkeyhint', 'done')
  }, [])

  useEffect(() => {
    if (!state.isTyping) inputRef.current?.blur()
  }, [state.isTyping])

  return (
    <form
      className="mx-auto mt-4 w-full max-w-sm"
      onSubmit={(event) => {
        event.preventDefault()
        if (!isComposing.current) onSubmit()
      }}
    >
      <div className="flex items-stretch gap-2">
        <textarea
          ref={inputRef}
          id="typing-mobile-input"
          value={value}
          onChange={(event) => onChange(event.target.value.replace(/[\r\n]/g, ''))}
          onCompositionStart={() => (isComposing.current = true)}
          onCompositionEnd={() => (isComposing.current = false)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.stopPropagation()
              if (isComposing.current || event.nativeEvent.isComposing || event.keyCode === 229) return
              event.preventDefault()
              if (!event.repeat) onSubmit()
            }
          }}
          onFocus={() => {
            if (!state.isTyping) dispatch({ type: TypingStateActionType.SET_IS_TYPING, payload: true })
          }}
          readOnly={isFinished}
          aria-label="英文默写输入"
          aria-invalid={hasWrong}
          aria-describedby={hasWrong ? 'word-answer-status' : undefined}
          rows={1}
          inputMode="text"
          autoCapitalize="none"
          autoCorrect="off"
          autoComplete="off"
          spellCheck={false}
          placeholder="输入英文"
          className="relative z-20 block h-12 min-w-0 flex-1 resize-none rounded-lg border border-gray-300 bg-white px-3 py-3 text-base leading-6 text-gray-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
        />
        <button
          type="submit"
          aria-label="提交答案"
          disabled={!state.isTyping || !value.trim() || isFinished || hasWrong}
          onPointerDown={(event) => {
            // Keep the mobile keyboard open while tapping Submit.
            if (event.button === 0) event.preventDefault()
          }}
          className="flex h-12 shrink-0 items-center justify-center gap-1 rounded-lg bg-indigo-500 px-3 text-sm text-white hover:bg-indigo-600 disabled:opacity-40"
        >
          <IconCheck aria-hidden="true" />
          提交
        </button>
      </div>
      <p id="word-answer-status" role="status" className="min-h-[24px] pt-1 text-center text-sm text-red-600 dark:text-red-400">
        {hasWrong ? '拼写不正确，请修改后重试' : ''}
      </p>
    </form>
  )
}
