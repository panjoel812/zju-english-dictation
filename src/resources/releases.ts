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
  {
    title: 'CED · 六种小语种课程',
    description:
      '新增德语、西班牙语、法语、日语、韩语、俄语共 7,914 条词条、125 个单元；词库页按语言、B 编号和 Unit 选择。原有英语词库和练习记录保留。',
  },
  {
    title: '输入与朗读适配',
    description:
      '小语种使用整词提交，支持系统输入法与组合字符；德、西、法语提供特殊字符按钮。日语明确标注的假名和汉字均可提交，朗读使用设备的对应语言语音包。',
  },
  { title: '查看答案移到中文下方', description: '先根据中文回忆拼写，需要提示时再点击下方按钮，查看后输入内容仍会保留。' },
  { title: '默认中文提示、隐藏词长', description: '首次使用时显示中文释义，用固定横线隐藏字母数；之后会记住自己的选择。' },
  { title: '明暗主题修复', description: '设置文字、分隔线和下拉框随主题正确切换，刷新也会保持已选择的主题。' },
  { title: '默写时隐藏音标', description: '开启默写模式后自动隐藏音标，已有的「显示音标」设置也不会提前提示答案；关闭默写后恢复该设置。' },
  { title: '首字母提示', description: '在「设置 → 默写设置」中开启「显示首字母」，字母格与隐藏字母数模式都支持，选择会自动保存。' },
  { title: '逐步功能介绍', description: '首次访问时逐项介绍练习和工具；支持跳过，之后可点击练习页左下角的问号重新查看。' },
  { title: '词性补齐', description: '大学英语 III、IV 和 Book 1 补充缺失词性，保留已有标注。' },
  { title: '释义显示会记住', description: '手动开启或关闭释义后，通过 cookie 保存；刷新、重新进入或切换章节都会保持选择。' },
  { title: '不会拼时查看答案', description: '点击中文下方的「查看答案」展开拼写和释义，切词后自动收起。' },
  { title: '一键备份', description: '顶部下载图标可导出全部练习记录，在「设置 → 数据管理」中导入。' },
  { title: '导航和设置整理', description: '顶部保留紧凑图标；默写、发音音效、显示与数据管理各有固定位置，合并重复控件。' },
  { title: '指法弹窗修复', description: '字母和下划线不再盖住指法图；打开图示时暂停练习。' },
]
