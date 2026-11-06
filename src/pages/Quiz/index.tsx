import { questions } from './questions'
import type { QuizQuestion } from './questions'
import Header from '@/components/Header'
import Layout from '@/components/Layout'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import IconArrowLeft from '~icons/tabler/arrow-left'
import IconRefresh from '~icons/tabler/refresh'

type Mode = 'vocabulary' | 'completion'
type Range = 'all' | '1-4' | '5-8'
type Attempt = { question: QuizQuestion; options: string[]; response: string; correct: boolean }

const completedKey = 'zju-quiz-completed-v1'

function readCompleted(): string[] {
  try {
    const stored = JSON.parse(localStorage.getItem(completedKey) || '[]')
    return Array.isArray(stored) ? stored.filter((item): item is string => typeof item === 'string') : []
  } catch {
    return []
  }
}

function shuffle<T>(items: T[]): T[] {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

const button =
  'rounded-md px-4 py-2 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500'
const primary = `${button} bg-indigo-600 text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40`
const secondary = `${button} border border-gray-300 text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800`

export default function QuizPage() {
  const [mode, setMode] = useState<Mode>('vocabulary')
  const [range, setRange] = useState<Range>('all')
  const [round, setRound] = useState<{ question: QuizQuestion; options: string[] }[]>([])
  const [attempts, setAttempts] = useState<Attempt[]>([])
  const [response, setResponse] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [finished, setFinished] = useState(false)
  const [completed, setCompleted] = useState<string[]>(readCompleted)
  useEffect(() => {
    const syncCompleted = (event: StorageEvent) => {
      if (event.key === completedKey) setCompleted(readCompleted())
    }
    window.addEventListener('storage', syncCompleted)
    return () => window.removeEventListener('storage', syncCompleted)
  }, [])
  const index = attempts.length - (submitted ? 1 : 0)
  const current = round[index]
  const pool = questions.filter(
    (question) => !completed.includes(question.answer) && (range === 'all' || (range === '1-4' ? question.unit <= 4 : question.unit >= 5)),
  )

  const start = () => {
    const latestCompleted = Array.from(new Set([...readCompleted(), ...completed]))
    const available = pool.filter((question) => !latestCompleted.includes(question.answer))
    setCompleted(latestCompleted)
    if (!available.length) return
    setRound(
      shuffle(available)
        .slice(0, 10)
        .map((question) => ({ question, options: shuffle([question.answer, ...question.distractors]) })),
    )
    setAttempts([])
    setResponse('')
    setSubmitted(false)
    setFinished(false)
  }
  const submit = () => {
    if (!current || submitted || !response.trim()) return
    const correct = response.trim().toLocaleLowerCase() === current.question.answer.toLocaleLowerCase()
    const nextCompleted = Array.from(new Set([...readCompleted(), ...completed, current.question.answer]))
    setCompleted(nextCompleted)
    try {
      localStorage.setItem(completedKey, JSON.stringify(nextCompleted))
    } catch {
      // Continue the current session if browser storage is unavailable.
    }
    setAttempts((previous) => [...previous, { ...current, response: response.trim(), correct }])
    setSubmitted(true)
  }
  const next = () => {
    if (attempts.length === round.length) setFinished(true)
    setResponse('')
    setSubmitted(false)
  }
  const reset = () => {
    setRound([])
    setFinished(false)
    setSubmitted(false)
  }

  return (
    <Layout>
      <Header>
        <div className="flex w-full items-center justify-between gap-3">
          <h2 className="px-2 text-lg font-semibold text-gray-800 dark:text-gray-100">小测专题</h2>
          <Link to="/" className={`${secondary} inline-flex items-center gap-2 no-underline`}>
            <IconArrowLeft aria-hidden="true" /> 返回默写
          </Link>
        </div>
      </Header>
      <div className="mx-auto w-full max-w-3xl flex-1 px-4 pb-12 pt-8 text-gray-800 dark:text-gray-100 sm:px-6">
        {!round.length ? (
          <div className="space-y-8">
            <div>
              <h3 className="text-xl font-semibold">选择练习</h3>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Book II · 已核对 {questions.length} 题 · 当前范围剩余 {pool.length} 题
              </p>
            </div>
            <fieldset>
              <legend className="mb-3 text-sm font-medium">题型</legend>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {(
                  [
                    ['vocabulary', 'Vocabulary', '单项选择'],
                    ['completion', 'Sentence Completion', '首字母与中文提示'],
                  ] as const
                ).map(([value, title, description]) => (
                  <label
                    key={value}
                    className={`flex cursor-pointer items-center gap-3 rounded-md border p-4 ${
                      mode === value ? 'border-indigo-500 bg-indigo-50 dark:bg-gray-800' : 'border-gray-200 dark:border-gray-700'
                    }`}
                  >
                    <input type="radio" name="mode" checked={mode === value} onChange={() => setMode(value)} className="text-indigo-600" />
                    <span>
                      <span className="block font-medium">{title}</span>
                      <span className="mt-1 block text-sm text-gray-500 dark:text-gray-400">{description}</span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
            <fieldset>
              <legend className="mb-3 text-sm font-medium">范围</legend>
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    ['all', '全部单元'],
                    ['1-4', 'Unit 1–4'],
                    ['5-8', 'Unit 5–8'],
                  ] as const
                ).map(([value, label]) => (
                  <label
                    key={value}
                    className={`cursor-pointer ${button} ${
                      range === value ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200'
                    }`}
                  >
                    <input className="sr-only" type="radio" name="range" checked={range === value} onChange={() => setRange(value)} />
                    {label}
                  </label>
                ))}
              </div>
            </fieldset>
            {!pool.length && <p className="text-sm text-gray-500 dark:text-gray-400">当前范围的题目已全部完成，请选择其他范围。</p>}
            <button type="button" className={primary} onClick={start} disabled={!pool.length}>
              开始练习 · {Math.min(pool.length, 10)} 题
            </button>
          </div>
        ) : finished ? (
          <div>
            <h3 className="text-xl font-semibold">练习完成</h3>
            <p className="mt-3 text-gray-600 dark:text-gray-300">
              答对 {attempts.filter((attempt) => attempt.correct).length} / {attempts.length} 题
            </p>
            {attempts.some((attempt) => !attempt.correct) && (
              <div className="mt-8 space-y-5">
                <h4 className="font-semibold">错题回顾</h4>
                {attempts
                  .filter((attempt) => !attempt.correct)
                  .map((attempt) => (
                    <div key={attempt.question.answer} className="border-t border-gray-200 pt-4 dark:border-gray-700">
                      <p className="leading-7">{attempt.question.sentence}</p>
                      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        你的答案：{attempt.response} · 正确答案：
                        <span className="font-medium text-green-700 dark:text-green-400">{attempt.question.answer}</span>
                      </p>
                    </div>
                  ))}
              </div>
            )}
            <div className="mt-8 flex flex-wrap gap-3">
              <button type="button" className={`${primary} inline-flex items-center gap-2`} onClick={start} disabled={!pool.length}>
                <IconRefresh aria-hidden="true" />
                再练一次
              </button>
              <button type="button" className={secondary} onClick={reset}>
                重新选择
              </button>
            </div>
          </div>
        ) : (
          current && (
            <div>
              <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-gray-500 dark:text-gray-400">
                <span>
                  {mode === 'vocabulary' ? 'Vocabulary' : 'Sentence Completion'} · Unit {current.question.unit}
                </span>
                <span>
                  {index + 1} / {round.length}
                </span>
              </div>
              <div className="mt-3 h-1 overflow-hidden rounded bg-gray-200 dark:bg-gray-700">
                <div className="h-full bg-indigo-500" style={{ width: `${(index / round.length) * 100}%` }} />
              </div>
              <p className="mt-9 text-xl leading-9 sm:text-2xl">{current.question.sentence}</p>
              <form
                className="mt-8"
                onSubmit={(event) => {
                  event.preventDefault()
                  submitted ? next() : submit()
                }}
              >
                {mode === 'vocabulary' ? (
                  <fieldset className="grid gap-2">
                    <legend className="sr-only">选择答案</legend>
                    {current.options.map((option, optionIndex) => (
                      <label
                        key={option}
                        className={`flex min-h-[52px] cursor-pointer items-center gap-3 rounded-md border px-4 py-3 ${
                          response === option ? 'border-indigo-500 bg-indigo-50 dark:bg-gray-800' : 'border-gray-200 dark:border-gray-700'
                        }`}
                      >
                        <input
                          type="radio"
                          name="answer"
                          checked={response === option}
                          disabled={submitted}
                          onChange={() => setResponse(option)}
                          className="text-indigo-600"
                        />
                        <span className="w-5 text-sm text-gray-500 dark:text-gray-400">{String.fromCharCode(65 + optionIndex)}.</span>
                        <span>{option}</span>
                      </label>
                    ))}
                  </fieldset>
                ) : (
                  <div>
                    <label htmlFor="quiz-answer" className="block text-sm text-gray-600 dark:text-gray-300">
                      首字母：<strong>{current.question.answer[0]}</strong> · {current.question.meaning}
                    </label>
                    <input
                      id="quiz-answer"
                      value={response}
                      disabled={submitted}
                      onChange={(event) => setResponse(event.target.value)}
                      autoComplete="off"
                      autoCapitalize="none"
                      spellCheck={false}
                      className="mt-3 w-full max-w-md rounded-md border-gray-300 bg-white px-3 py-3 text-lg focus:border-indigo-500 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-800"
                    />
                  </div>
                )}
                {submitted && (
                  <p
                    role="status"
                    className={`mt-5 text-sm ${
                      attempts[attempts.length - 1].correct ? 'text-green-700 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                    }`}
                  >
                    {attempts[attempts.length - 1].correct ? '回答正确' : `回答错误 · 正确答案：${current.question.answer}`}{' '}
                    <span className="text-gray-500 dark:text-gray-400">（{current.question.meaning}）</span>
                  </p>
                )}
                <div className="mt-6 flex items-center gap-3">
                  <button type="submit" className={primary} disabled={!submitted && !response.trim()}>
                    {submitted ? (attempts.length === round.length ? '查看结果' : '下一题') : '提交答案'}
                  </button>
                  <button type="button" className={secondary} onClick={reset}>
                    结束练习
                  </button>
                </div>
              </form>
            </div>
          )
        )}
      </div>
    </Layout>
  )
}
