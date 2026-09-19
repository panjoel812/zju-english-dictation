import { currentChapterAtom, currentDictInfoAtom } from '@/store'
import { AlertCircle, BarChart3, BookOpen, ChevronRight, Keyboard, Library, RotateCcw } from 'lucide-react'
import { useAtomValue } from 'jotai'
import type React from 'react'
import { useNavigate } from 'react-router-dom'

const quickLinks = [
  { label: '词库', description: '选择练习内容', href: '/gallery', icon: Library },
  { label: '错题本', description: '复习不熟单词', href: '/error-book', icon: RotateCcw },
  { label: '学习统计', description: '查看练习记录', href: '/analysis', icon: BarChart3 },
]

const MobilePage: React.FC = () => {
  const navigate = useNavigate()
  const currentDict = useAtomValue(currentDictInfoAtom)
  const currentChapter = useAtomValue(currentChapterAtom)

  return (
    <main className="min-h-screen bg-[#f7f8fc] px-4 pb-8 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <header className="mx-auto flex max-w-lg items-center justify-between py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500 text-white shadow-sm">
            <Keyboard className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-base font-semibold tracking-tight">大学英语默写器</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">浙江大学英语 III、IV</p>
          </div>
        </div>
        <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-300">移动端</span>
      </header>

      <section className="mx-auto max-w-lg rounded-3xl bg-slate-900 p-6 text-white shadow-xl shadow-slate-200/70 dark:bg-indigo-950 dark:shadow-none">
        <p className="mb-3 text-sm text-indigo-200">今天练哪一组？</p>
        <h2 className="text-3xl font-semibold leading-tight">从一个单词开始，<br />把英语写出来。</h2>
        <p className="mt-4 max-w-xs text-sm leading-6 text-slate-300">专为浙江大学大学英语课程整理的默写练习，记录每一次输入和复习。</p>
        <button
          type="button"
          onClick={() => navigate('/gallery')}
          className="mt-6 flex w-full items-center justify-between rounded-2xl bg-white px-4 py-3 text-left text-sm font-semibold text-slate-900 transition-transform active:scale-[.98]"
        >
          <span className="flex items-center gap-2"><BookOpen className="h-4 w-4 text-indigo-500" aria-hidden="true" />选择词库开始</span>
          <ChevronRight className="h-4 w-4 text-slate-400" aria-hidden="true" />
        </button>
      </section>

      <section className="mx-auto mt-5 max-w-lg rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">当前学习</p>
            <h2 className="mt-2 text-lg font-semibold">{currentDict.name}</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">第 {currentChapter + 1} 章 · 中文释义默认关闭</p>
          </div>
          <div className="rounded-xl bg-indigo-50 p-3 text-indigo-500 dark:bg-indigo-950/60 dark:text-indigo-300">
            <BookOpen className="h-5 w-5" aria-hidden="true" />
          </div>
        </div>
        <div className="mt-5 flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-2.5 text-xs leading-5 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
          <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>完成英文输入后，可以查看当前单词的中文释义。</span>
        </div>
      </section>

      <section className="mx-auto mt-7 max-w-lg">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold">学习工具</h2>
          <span className="text-xs text-slate-400">本地记录</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {quickLinks.map(({ label, description, href, icon: Icon }) => (
            <button
              key={href}
              type="button"
              onClick={() => navigate(href)}
              className="min-w-0 rounded-2xl border border-slate-200 bg-white p-3 text-left shadow-sm transition-transform active:scale-[.97] dark:border-slate-800 dark:bg-slate-900"
            >
              <Icon className="h-5 w-5 text-indigo-500" aria-hidden="true" />
              <span className="mt-3 block truncate text-sm font-medium">{label}</span>
              <span className="mt-1 block truncate text-[11px] text-slate-500 dark:text-slate-400">{description}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="mx-auto mt-7 max-w-lg rounded-2xl border border-dashed border-slate-300 bg-white/70 p-5 dark:border-slate-700 dark:bg-slate-900/50">
        <h2 className="text-sm font-semibold">词库范围</h2>
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          {['浙江大学英语 III', '浙江大学英语 IV', 'Book 1 Unit 1-4', '四六级', '雅思托福'].map((item) => (
            <span key={item} className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-slate-600 dark:bg-slate-800 dark:text-slate-300">{item}</span>
          ))}
        </div>
      </section>

      <footer className="mx-auto mt-8 max-w-lg text-center text-xs leading-5 text-slate-400">
        由个人课程学习需求整理 · 练习数据保存在当前浏览器
      </footer>
    </main>
  )
}

export default MobilePage
