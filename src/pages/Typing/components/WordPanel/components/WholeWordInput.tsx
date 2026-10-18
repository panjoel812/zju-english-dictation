import { TypingContext, TypingStateActionType } from '@/pages/Typing/store'
import classNames from 'classnames'
import { useContext, useEffect, useRef } from 'react'
import IconCheck from '~icons/tabler/check'

export default function WholeWordInput({
  value,
  onChange,
  onSubmit,
  isFinished,
  hasWrong,
  inline = false,
  revealedAnswer,
}: {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  isFinished: boolean
  hasWrong: boolean
  inline?: boolean
  revealedAnswer?: string
}) {
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const { state, dispatch } = useContext(TypingContext)!
  const inputRef = useRef<HTMLInputElement>(null)
  const isComposing = useRef(false)

  useEffect(() => {
    inputRef.current?.setAttribute('enterkeyhint', 'done')
  }, [])

  useEffect(() => {
    if (!state.isTyping) inputRef.current?.blur()
  }, [state.isTyping])

  return (
    <form
      className={inline ? 'relative w-full min-w-0' : 'mx-auto mt-4 w-full max-w-sm'}
      onSubmit={(event) => {
        event.preventDefault()
        if (!isComposing.current) onSubmit()
      }}
    >
      <div className="flex items-center gap-2">
        <div aria-label={inline ? '单词长度已隐藏' : undefined} className={classNames('relative min-w-0 flex-1', inline && 'min-h-[56px]')}>
          <input
            type="text"
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
            readOnly={isFinished || revealedAnswer !== undefined}
            aria-label="英文默写输入"
            aria-invalid={hasWrong}
            aria-describedby={hasWrong ? 'word-answer-status' : undefined}
            inputMode="text"
            autoCapitalize="none"
            autoCorrect="off"
            autoComplete="off"
            spellCheck={false}
            placeholder={inline ? undefined : '输入英文'}
            style={revealedAnswer !== undefined ? { color: 'transparent', caretColor: 'transparent' } : undefined}
            className={classNames(
              'z-20 block w-full min-w-0 outline-none',
              inline
                ? 'absolute inset-0 h-full rounded-none border-0 border-b-2 border-gray-400 bg-transparent px-1 py-2 text-center font-mono text-2xl shadow-none focus:border-indigo-500 focus:ring-0 dark:border-gray-500 sm:text-3xl'
                : 'relative h-12 rounded-lg border border-gray-300 bg-white px-3 py-3 text-base leading-6 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-gray-600 dark:bg-gray-800',
              hasWrong
                ? 'text-red-600 dark:text-red-400'
                : isFinished
                ? 'text-green-600 dark:text-green-400'
                : 'text-gray-700 dark:text-gray-200',
            )}
          />
          {revealedAnswer !== undefined && (
            <span
              aria-hidden="true"
              className={classNames(
                'pointer-events-none relative z-20 flex min-h-[56px] items-center justify-center break-all px-1 py-2 text-center font-mono text-base leading-5 sm:text-xl sm:leading-6',
                isFinished ? 'text-green-600 dark:text-green-400' : 'text-gray-700 dark:text-gray-200',
              )}
            >
              {revealedAnswer}
            </span>
          )}
        </div>
        <button
          type="submit"
          aria-label="提交答案"
          title="提交答案"
          disabled={!state.isTyping || !value.trim() || isFinished || hasWrong}
          onPointerDown={(event) => {
            // Keep the mobile keyboard open while tapping Submit.
            if (event.button === 0) event.preventDefault()
          }}
          className={classNames(
            'flex shrink-0 items-center justify-center rounded bg-indigo-500 text-white hover:bg-indigo-600 disabled:opacity-40',
            inline ? 'h-11 w-11 text-xl' : 'h-12 gap-1 px-3 text-sm',
          )}
        >
          <IconCheck aria-hidden="true" />
          {!inline && '提交'}
        </button>
      </div>
      <p id="word-answer-status" role="status" className="min-h-[24px] pt-1 text-center text-sm text-red-600 dark:text-red-400">
        {hasWrong ? '拼写不正确，请修改后重试' : ''}
      </p>
    </form>
  )
}
