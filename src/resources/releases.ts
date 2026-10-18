import { version } from '../../package.json'

export const currentReleaseVersion = version
const lastSeenReleaseKey = 'lastSeenRelease'
let seenInThisPage = false

export function hasSeenCurrentRelease() {
  if (seenInThisPage) return true
  for (const storage of ['localStorage', 'sessionStorage'] as const) {
    try {
      if (JSON.parse(window[storage].getItem(lastSeenReleaseKey) ?? 'null') === currentReleaseVersion) return true
    } catch {
      // Storage can be disabled, full, or contain an older malformed value.
    }
  }
  return false
}

export function acknowledgeCurrentRelease() {
  seenInThisPage = true
  for (const storage of ['localStorage', 'sessionStorage'] as const) {
    try {
      window[storage].setItem(lastSeenReleaseKey, JSON.stringify(currentReleaseVersion))
    } catch {
      // Keep the dialog dismissed for this page even when persistence is unavailable.
    }
  }
}

export const currentReleaseNotes = [
  { title: '字母格也能直接输入', description: '默认保留字母格，直接点击单词位置填写；字母格和长横线都不再有下方的独立输入框。' },
  {
    title: '长横线居中',
    description: '「隐藏字母数」默认关闭；开启后显示居中的固定长横线，发音按钮在右侧，不再用格数提示单词长度。已有选择会保留。',
  },
  { title: '设置融入工具栏', description: '设置齿轮收进顶部工具栏右侧，点击进入「默写设置」即可切换两种显示方式。' },
  { title: '整词提交后判定', description: '输入完成后按 Enter 或点提交，提交前可修改答案。' },
  { title: '释义跨章保持', description: '切换章节后保留中文释义的显示或隐藏状态。' },
  { title: '释义附带词性', description: '新工科英语按原文补齐词性；大学英语 III、IV 补充有可靠资料的条目。' },
  { title: '词库分类与 Unit 分栏', description: '在词库中按课程分类、按 Unit 查找练习。' },
]
