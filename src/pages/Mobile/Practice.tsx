import { currentChapterAtom, currentDictInfoAtom } from '@/store'
import { useSaveWordRecord } from '@/utils/db'
import { ArrowLeft, Check, Eye, Volume2, X } from 'lucide-react'
import { useAtomValue } from 'jotai'
import type React from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWordList } from '../Typing/hooks/useWordList'

export const MobilePracticePage: React.FC = () => {
  const navigate = useNavigate()
  const { words, isLoading, error } = useWordList()
  const currentDict = useAtomValue(currentDictInfoAtom)
  const currentChapter = useAtomValue(currentChapterAtom)
  const saveWordRecord = useSaveWordRecord()
  const inputRef = useRef<HTMLInputElement>(null)
  const startedAtRef = useRef(Date.now())
  const [index, setIndex] = useState(0)
  const [answer, setAnswer] = useState('')
  const [wrongCount, setWrongCount] = useState(0)
  const [feedback, setFeedback] = useState<'idle' | 'correct' | 'wrong'>('idle')
  const [showTranslation, setShowTranslation] = useState(false)

  const word = words[index]
  const translation = useMemo(() => word?.trans?.filter(Boolean).join('；') || '暂无中文释义', [word])

  useEffect(() => {
    setAnswer('')
    setWrongCount(0)
    setFeedback('idle')
    setShowTranslation(false)
    startedAtRef.current = Date.now()
    inputRef.current?.focus()
  }, [index, word?.name])

  const speak = () => {
    if (!word || !('speechSynthesis' in window)) return
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(word.name)
    utterance.lang = 'en-US'
    window.speechSynthesis.speak(utterance)
  }

  const submit = async (event?: React.FormEvent) => {
    event?.preventDefault()
    if (!word || feedback === 'correct') return

    const normalizedAnswer = answer.trim().toLowerCase()
    const normalizedWord = word.name.trim().toLowerCase()
    if (normalizedAnswer !== normalizedWord) {
      setWrongCount((count) => count + 1)
      setFeedback('wrong')
      return
    }

    setFeedback('correct')
    await saveWordRecord({
      word: word.name,
      wrongCount,
      letterTimeArray: [startedAtRef.current, Date.now()],
      letterMistake: {},
    })
  }

  const nextWord = () => {
    if (index + 1 >= words.length) {
      navigate('/mobile')
      return
    }
    setIndex((current) => current + 1)
  }

  if (isLoading) {
    return <div className="flex min-h-screen items-center justify-center bg-[#f7f8fc] text-sm text-slate-500">正在加载词库...</div>
  }

  if (error || !word) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#f7f8fc] px-6 text-center">
        <p className="text-sm text-slate-500">当前章节没有可练习的词汇。</p>
        <button type="button" onClick={() => navigate('/mobile')} className="rounded-xl bg-indigo-500 px-4 py-2 text-sm font-medium text-white">返回首页</button>
      </div>
    )
  }

  const progress = `${index + 1} / ${words.length}`

  return (
    <main className="min-h-screen bg-[#f7f8fc] px-4 pb-8 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <header className="mx-auto flex max-w-lg items-center justify-between py-5">
        <button type="button" onClick={() => navigate('/mobile')} aria-label="返回移动端首页" className="rounded-xl p-2 text-slate-500 active:bg-slate-200 dark:active:bg-slate-800">
          <ArrowLeft className="h-5 w-5" aria-hidden="true" />
        </button>
        <div className="text-center">
          <p className="text-sm font-semibold">大学英语默写器</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">{currentDict.name} · 第 {currentChapter + 1} 章</p>
        </div>
        <span className="text-xs font-medium text-slate-400">{progress}</span>
      </header>

      <section className="mx-auto max-w-lg">
        <div className="h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
          <div className="h-full rounded-full bg-indigo-500 transition-all" style={{ width: `${((index + 1) / words.length) * 100}%` }} />
        </div>

        <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-slate-400">请默写英文单词</p>
              <p className="mt-4 min-h-7 text-sm text-slate-600 dark:text-slate-300">{showTranslation ? translation : '中文释义已隐藏'}</p>
            </div>
            <button type="button" onClick={speak} aria-label="播放发音" className="rounded-xl bg-indigo-50 p-3 text-indigo-500 active:bg-indigo-100 dark:bg-indigo-950/60 dark:text-indigo-300">
              <Volume2 className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>

          <button type="button" onClick={() => setShowTranslation((visible) => !visible)} className="mt-5 flex items-center gap-1.5 text-xs text-slate-500 underline decoration-slate-300 underline-offset-4">
            <Eye className="h-3.5 w-3.5" aria-hidden="true" />
            {showTranslation ? '隐藏中文释义' : '查看中文释义'}
          </button>

          <form onSubmit={submit} className="mt-6">
            <label htmlFor="mobile-answer" className="sr-only">输入英文单词</label>
            <input
              ref={inputRef}
              id="mobile-answer"
              value={answer}
              onChange={(event) => {
                setAnswer(event.target.value)
                if (feedback === 'wrong') setFeedback('idle')
              }}
              autoCapitalize="none"
              autoCorrect="off"
              autoComplete="off"
              spellCheck={false}
              placeholder="输入英文单词"
              className={`w-full rounded-2xl border-2 bg-slate-50 px-4 py-4 text-center text-lg outline-none transition-colors dark:bg-slate-950 ${
                feedback === 'correct'
                  ? 'border-emerald-400 text-emerald-600'
                  : feedback === 'wrong'
                    ? 'border-rose-400 text-rose-600'
                    : 'border-slate-200 focus:border-indigo-400 dark:border-slate-700'
              }`}
              disabled={feedback === 'correct'}
            />
            <button type="submit" disabled={feedback === 'correct' || !answer.trim()} className="mt-3 w-full rounded-2xl bg-indigo-500 px-4 py-3.5 text-sm font-semibold text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-40">
              {feedback === 'correct' ? '回答正确' : '提交答案'}
            </button>
          </form>

          {feedback === 'wrong' && <p className="mt-3 flex items-center justify-center gap-1 text-center text-xs text-rose-500"><X className="h-3.5 w-3.5" aria-hidden="true" />拼写不正确，请再试一次</p>}
          {feedback === 'correct' && (
            <button type="button" onClick={nextWord} className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-2xl bg-emerald-500 px-4 py-3.5 text-sm font-semibold text-white">
              <Check className="h-4 w-4" aria-hidden="true" />
              {index + 1 >= words.length ? '完成本章' : '下一个单词'}
            </button>
          )}
        </div>
      </section>
    </main>
  )
}

export default MobilePracticePage
