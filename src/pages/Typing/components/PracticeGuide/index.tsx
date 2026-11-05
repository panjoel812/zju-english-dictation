import { TypingContext, TypingStateActionType } from '../../store'
import { acknowledgeCurrentRelease } from '@/resources/releases'
import { acknowledgePracticeGuide, hasSeenPracticeGuide } from '@/utils/practiceGuide'
import { Dialog } from '@headlessui/react'
import { useContext, useEffect, useLayoutEffect, useRef, useState } from 'react'
import IconHelp from '~icons/tabler/help'
import IconX from '~icons/tabler/x'

const steps = [
  { target: 'course', title: '选择词表和章节', description: '点击词表名称切换课程，用右侧的章节菜单选择练习范围。' },
  { target: 'start', title: '开始与暂停', description: '点击「开始」进入练习。需要休息时点「暂停」，已输入的内容会保留。' },
  {
    target: 'practice',
    title: '听音后输入完整拼写',
    description: '点击喇叭可以重听。默认输入完整单词后按 Enter，或点击下方的勾提交；答错后可以直接修改。',
  },
  {
    target: 'answer',
    title: '想不起来时查看答案',
    description: '这里可以展开当前词条的拼写和释义。查看后仍需自己输入，切换单词会自动收起。',
  },
  { target: 'translation', title: '显示或隐藏释义', description: '用这个图标切换中文释义。网站会记住你的选择，下次进入时保持一致。' },
  { target: 'word-list', title: '浏览本章单词', description: '打开单词列表可以查看本章内容，也能选择要练习的词。' },
  { target: 'mistakes', title: '回顾错题', description: '练习中的拼写错误会进入错题本，可以在这里集中复习。' },
  { target: 'analysis', title: '查看练习统计', description: '查看练习记录、速度和正确率，了解最近的学习情况。' },
  { target: 'export', title: '备份练习数据', description: '下载练习记录和错题备份。需要恢复或换设备时，在「设置 → 数据管理」中导入。' },
  { target: 'theme', title: '切换深色模式', description: '根据环境选择明亮或深色界面，网站会保存这个设置。' },
  { target: 'fingers', title: '查看指法', description: '这里可以打开键盘指法图，确认每个按键对应的手指；查看时会暂停练习。' },
  {
    target: 'settings',
    title: '按自己的习惯设置',
    description: '默写、发音音效、显示与数据管理都在这里。「默写设置」中的「显示首字母」可在回忆拼写时提供提示。',
  },
  { target: 'help', title: '随时重新查看', description: '练习页左下角会保留这个问号。忘记某个功能时，点击它就能重新查看这份介绍。' },
]

type Highlight = { top: number; left: number; width: number; height: number }

export default function PracticeGuide({ ready }: { ready: boolean }) {
  const { state, dispatch } = useContext(TypingContext) ?? {}
  const [step, setStep] = useState<number | null>(() => (hasSeenPracticeGuide() ? null : 0))
  const [highlight, setHighlight] = useState<Highlight | null>(null)
  const [position, setPosition] = useState({ top: 16, left: 16 })
  const panelRef = useRef<HTMLDivElement>(null)
  const titleRef = useRef<HTMLHeadingElement>(null)
  const isOpen = ready && step !== null
  const current = steps[step ?? 0]

  function finish() {
    acknowledgePracticeGuide()
    acknowledgeCurrentRelease()
    setStep(null)
  }

  useEffect(() => {
    if (isOpen && state?.isTyping) dispatch?.({ type: TypingStateActionType.SET_IS_TYPING, payload: false })
  }, [isOpen, state?.isTyping, dispatch])

  useLayoutEffect(() => {
    if (!isOpen) return
    const scrollY = window.scrollY
    const containKeyboard = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLElement && event.target.closest('[data-practice-guide]')) return
      event.preventDefault()
      event.stopPropagation()
      titleRef.current?.focus({ preventScroll: true })
    }
    document.addEventListener('keydown', containKeyboard, true)
    document.addEventListener('keyup', containKeyboard, true)
    return () => {
      document.removeEventListener('keydown', containKeyboard, true)
      document.removeEventListener('keyup', containKeyboard, true)
      window.scrollTo({ top: scrollY, behavior: 'auto' })
    }
  }, [isOpen])

  useLayoutEffect(() => {
    if (!isOpen) return
    const target = document.querySelector<HTMLElement>(`[data-guide="${current.target}"]`)
    target?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'auto' })
    const measure = () => {
      const viewportWidth = document.documentElement.clientWidth
      const viewportHeight = window.innerHeight
      const rect = target?.getBoundingClientRect()
      const width = panelRef.current?.offsetWidth ?? Math.min(352, viewportWidth - 32)
      const height = panelRef.current?.offsetHeight ?? 240
      const left = Math.max(16, Math.min((rect ? rect.x + rect.width / 2 : viewportWidth / 2) - width / 2, viewportWidth - width - 16))
      const below = (rect?.bottom ?? 0) + 14
      const above = (rect?.top ?? 0) - height - 14
      const top = Math.max(16, Math.min(below + height <= viewportHeight - 16 ? below : above, viewportHeight - height - 16))
      setPosition({ top, left })
      if (rect && rect.width > 0 && rect.height > 0) {
        const highlightLeft = Math.max(4, rect.left - 5)
        const highlightTop = Math.max(4, rect.top - 5)
        setHighlight({
          left: highlightLeft,
          top: highlightTop,
          width: Math.max(0, Math.min(viewportWidth - 4, rect.right + 5) - highlightLeft),
          height: Math.max(0, Math.min(viewportHeight - 4, rect.bottom + 5) - highlightTop),
        })
      } else {
        setHighlight(null)
      }
    }
    // Headless UI mounts the dialog portal after the opener's layout effects.
    const frame = window.requestAnimationFrame(() => {
      const rect = target?.getBoundingClientRect()
      const height = panelRef.current?.offsetHeight ?? 240
      if (
        rect &&
        rect.bottom + height + 14 > window.innerHeight - 16 &&
        rect.top - height - 14 < 16 &&
        rect.height + height + 46 <= window.innerHeight
      ) {
        // Short viewports need the target near the top to leave room for the card.
        window.scrollBy({ top: rect.top - 16, behavior: 'auto' })
      }
      measure()
      titleRef.current?.focus({ preventScroll: true })
    })
    const observer = new ResizeObserver(measure)
    if (target) observer.observe(target)
    if (panelRef.current) observer.observe(panelRef.current)
    window.addEventListener('resize', measure)
    window.addEventListener('scroll', measure, true)
    return () => {
      window.cancelAnimationFrame(frame)
      observer.disconnect()
      window.removeEventListener('resize', measure)
      window.removeEventListener('scroll', measure, true)
    }
  }, [isOpen, current])

  return (
    <>
      <button
        type="button"
        data-guide="help"
        aria-label="功能介绍"
        title="功能介绍"
        disabled={!ready}
        onClick={() => setStep(0)}
        className="fixed bottom-5 left-4 z-40 flex h-11 w-11 items-center justify-center rounded-full border border-indigo-100 bg-white text-indigo-500 shadow-md transition-colors hover:bg-indigo-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-indigo-300 dark:hover:bg-gray-700"
      >
        <IconHelp className="h-6 w-6" aria-hidden="true" />
      </button>
      <Dialog
        open={isOpen}
        onClose={finish}
        initialFocus={titleRef}
        className="fixed inset-0 z-[60]"
        data-practice-guide="true"
        onKeyDown={(event) => {
          if (event.key !== 'Escape') event.stopPropagation()
          if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return
          if (event.key === 'ArrowRight' && step !== null) {
            event.preventDefault()
            setStep(Math.min(step + 1, steps.length - 1))
          } else if (event.key === 'ArrowLeft' && step !== null) {
            event.preventDefault()
            setStep(Math.max(step - 1, 0))
          }
        }}
        onKeyUp={(event) => event.stopPropagation()}
      >
        <div className={`fixed inset-0 ${highlight ? '' : 'bg-gray-900/50'}`} aria-hidden="true" />
        {highlight && (
          <div
            aria-hidden="true"
            data-guide-highlight={current.target}
            className="pointer-events-none fixed rounded-lg border-2 border-indigo-300"
            style={{ ...highlight, boxShadow: '0 0 0 9999px rgba(17, 24, 39, 0.5)' }}
          />
        )}
        <Dialog.Panel
          ref={panelRef}
          data-guide-card="true"
          style={position}
          className="fixed max-h-[calc(100dvh-2rem)] w-[22rem] max-w-[calc(100vw-2rem)] overflow-y-auto rounded-xl border border-gray-100 bg-white p-5 text-left shadow-xl dark:border-gray-700 dark:bg-gray-800"
        >
          <div className="mb-3 flex items-center justify-between gap-3">
            <p aria-live="polite" className="text-xs font-medium text-indigo-500 dark:text-indigo-300">
              功能介绍 · {(step ?? 0) + 1} / {steps.length}
            </p>
            <button
              type="button"
              aria-label="关闭功能介绍"
              onClick={finish}
              className="-mr-2 -mt-2 flex h-9 w-9 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500 dark:hover:bg-gray-700"
            >
              <IconX className="h-5 w-5" />
            </button>
          </div>
          <Dialog.Title ref={titleRef} tabIndex={-1} className="text-lg font-semibold text-gray-800 outline-none dark:text-gray-100">
            {current.title}
          </Dialog.Title>
          <Dialog.Description className="mt-2 text-sm leading-6 text-gray-500 dark:text-gray-300">{current.description}</Dialog.Description>
          <div className="mt-5 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={finish}
              className="rounded-lg px-1 py-2 text-xs text-gray-400 hover:text-gray-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500 dark:hover:text-gray-200"
            >
              跳过介绍
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={step === 0}
                onClick={() => setStep((old) => Math.max((old ?? 0) - 1, 0))}
                className="rounded-lg px-3 py-2 text-sm text-gray-500 hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500 disabled:opacity-30 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                上一步
              </button>
              <button
                type="button"
                onClick={() => (step === steps.length - 1 ? finish() : setStep((old) => (old ?? 0) + 1))}
                className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
              >
                {step === steps.length - 1 ? '完成介绍' : '下一步'}
              </button>
            </div>
          </div>
        </Dialog.Panel>
      </Dialog>
    </>
  )
}
