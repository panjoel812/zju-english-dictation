import { SettingRange, SettingSwitch } from './SettingRow'
import styles from './index.module.css'
import { defaultFontSizeConfig } from '@/constants'
import { fontSizeConfigAtom, isShowPrevAndNextWordAtom, isTextSelectableAtom, phoneticConfigAtom } from '@/store'
import { useAtom } from 'jotai'

export default function ViewSetting() {
  const [font, setFont] = useAtom(fontSizeConfigAtom)
  const [phonetic, setPhonetic] = useAtom(phoneticConfigAtom)
  const [neighbors, setNeighbors] = useAtom(isShowPrevAndNextWordAtom)
  const [selectable, setSelectable] = useAtom(isTextSelectableAtom)
  return (
    <div className={styles.settingsContent}>
      <SettingSwitch
        title="显示音标"
        description="默写模式下自动隐藏；关闭默写后按此设置显示，音标随发音口音切换。"
        checked={phonetic.isOpen}
        onChange={(isOpen) => setPhonetic((old) => ({ ...old, isOpen }))}
      />
      <SettingSwitch title="显示相邻单词" description="练习时显示上一词和下一词。" checked={neighbors} onChange={setNeighbors} />
      <SettingSwitch title="允许选择文本" checked={selectable} onChange={setSelectable} />
      <SettingRange
        title="单词字号"
        value={font.foreignFont}
        min={20}
        max={96}
        step={4}
        unit="px"
        onChange={(foreignFont) => setFont((old) => ({ ...old, foreignFont }))}
      />
      <SettingRange
        title="中文字号"
        value={font.translateFont}
        min={14}
        max={60}
        step={2}
        unit="px"
        onChange={(translateFont) => setFont((old) => ({ ...old, translateFont }))}
      />
      <button
        className="my-4 rounded-lg px-3 py-2 text-sm text-indigo-600 hover:bg-indigo-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500 dark:text-indigo-300 dark:hover:bg-gray-700"
        type="button"
        onClick={() => setFont({ ...defaultFontSizeConfig })}
      >
        重置字体设置
      </button>
    </div>
  )
}
