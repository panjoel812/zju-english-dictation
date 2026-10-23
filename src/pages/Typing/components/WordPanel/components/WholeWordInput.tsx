import style from './Word/index.module.css'
import { TypingContext, TypingStateActionType } from '@/pages/Typing/store'
import { fontSizeConfigAtom } from '@/store'
import classNames from 'classnames'
import { useAtomValue } from 'jotai'
import type { CSSProperties, ReactNode } from 'react'
import { useContext, useEffect, useRef } from 'react'
import IconCheck from '~icons/tabler/check'

export default function WholeWordInput({
  value,
  onChange,
  onSubmit,
  isFinished,
  hasWrong,
  prompt,
  pronunciation,
  revealedAnswer,
  hiddenLineFontSize,
}: {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  isFinished: boolean
  hasWrong: boolean
  prompt?: string
  pronunciation?: ReactNode
  revealedAnswer?: string
  hiddenLineFontSize?: number
}) {
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const { state, dispatch } = useContext(TypingContext)!
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null)
  const isComposing = useRef(false)
  const fontSizeConfig = useAtomValue(fontSizeConfigAtom)
  const isLengthHidden = prompt === undefined
  const AnswerField = isLengthHidden ? 'input' : 'textarea'
  const hiddenLineStyle = hiddenLineFontSize
    ? ({ fontSize: `${hiddenLineFontSize}px`, lineHeight: '1.25' } as CSSProperties)
    : undefined

  useEffect(() => {
    inputRef.current?.setAttribute('enterkeyhint', 'done')
  }, [isLengthHidden])

  useEffect(() => {
    if (!state.isTyping) inputRef.current?.blur()
  }, [state.isTyping])

  return (
    <form
      className="relative w-full min-w-0"
      onSubmit={(event) => {
        event.preventDefault()
        if (!isComposing.current) onSubmit()
      }}
    >
      <div
        className={classNames('relative mx-auto max-w-full font-mono', isLengthHidden ? 'w-full max-w-sm' : style.letter)}
        style={
          isLengthHidden
            ? undefined
            : ({
                // Include 8px padding and 1px for per-letter subpixel rounding.
                width: `calc(${Math.max(prompt.length, 1)}ch + 9px)`,
                '--word-font-size': `${fontSizeConfig.foreignFont}px`,
              } as CSSProperties)
        }
      >
        <div
          aria-label={isLengthHidden ? '单词长度已隐藏' : '字母格输入区'}
          className={classNames('relative min-h-[56px]', isLengthHidden && 'min-w-0 overflow-hidden')}
          style={isLengthHidden ? undefined : { minHeight: 'max(56px, calc(1.5em + 16px))' }}
        >
          <AnswerField
            type={isLengthHidden ? 'text' : undefined}
            rows={isLengthHidden ? undefined : 1}
            ref={(element: HTMLInputElement | HTMLTextAreaElement | null) => {
              inputRef.current = element
            }}
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
            style={
              revealedAnswer !== undefined
                ? { ...hiddenLineStyle, color: 'transparent', caretColor: 'transparent' }
                : hiddenLineStyle
            }
            className={classNames(
              'absolute inset-0 z-20 block h-full w-full min-w-0 rounded-none border-0 bg-transparent px-1 py-2 font-mono leading-normal shadow-none outline-none focus:ring-0',
              isLengthHidden
                ? 'overflow-hidden border-b-2 border-gray-400 text-center text-2xl focus:border-indigo-500 dark:border-gray-500 sm:text-3xl'
                : `${style.letter} resize-none overflow-hidden whitespace-pre-wrap break-all text-left`,
              hasWrong
                ? 'text-red-600 dark:text-red-400'
                : isFinished
                ? 'text-green-600 dark:text-green-400'
                : 'text-gray-700 dark:text-gray-200',
            )}
          />
          {!isLengthHidden && revealedAnswer === undefined && (
            <span
              aria-hidden="true"
              className="pointer-events-none relative block px-1 py-2 leading-normal text-gray-600 dark:text-gray-200"
            >
              <span className="block whitespace-pre-wrap break-all">
                {(value + prompt.slice(value.length)).split('').map((letter, index) => (
                  <span
                    key={index}
                    className={classNames(
                      'relative',
                      letter === '_' &&
                        'text-transparent after:absolute after:bottom-0 after:left-[9%] after:right-[9%] after:border-b-[0.08em] after:border-gray-600 dark:after:border-gray-200',
                    )}
                    style={{
                      visibility: index < value.length ? 'hidden' : undefined,
                    }}
                  >
                    {letter}
                  </span>
                ))}
              </span>
            </span>
          )}
          {revealedAnswer !== undefined && (
            <span
              aria-hidden="true"
              className={classNames(
                'pointer-events-none relative z-20 flex min-h-[56px] items-center justify-center break-all px-1 py-2 text-center font-mono text-base leading-5 sm:text-xl sm:leading-6',
                isLengthHidden && 'min-w-0 max-w-full overflow-hidden',
                isFinished ? 'text-green-600 dark:text-green-400' : 'text-gray-700 dark:text-gray-200',
              )}
              style={hiddenLineStyle}
            >
              {revealedAnswer}
            </span>
          )}
        </div>
        {pronunciation && <div className="absolute left-full top-2 ml-2 h-10 w-10">{pronunciation}</div>}
      </div>
      <div className="mt-3 flex justify-center">
        <button
          type="submit"
          aria-label="提交答案"
          title="提交答案"
          disabled={!state.isTyping || !value.trim() || isFinished || hasWrong}
          onPointerDown={(event) => {
            // Keep the mobile keyboard open while tapping Submit.
            if (event.button === 0) event.preventDefault()
          }}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded text-xl text-indigo-500 hover:bg-indigo-50 disabled:opacity-40 dark:hover:bg-gray-800"
        >
          <IconCheck aria-hidden="true" />
        </button>
      </div>
      <p id="word-answer-status" role="status" className="min-h-[24px] pt-1 text-center text-sm text-red-600 dark:text-red-400">
        {hasWrong ? '拼写不正确，请修改后重试' : ''}
      </p>
    </form>
  )
}
