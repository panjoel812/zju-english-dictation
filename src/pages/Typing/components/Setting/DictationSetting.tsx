import styles from './index.module.css'
import { hideWordLengthAtom, wholeWordModeAtom } from '@/store'
import { Switch } from '@headlessui/react'
import { useAtom } from 'jotai'

export default function DictationSetting() {
  const [hideWordLength, setHideWordLength] = useAtom(hideWordLengthAtom)
  const [wholeWordMode, setWholeWordMode] = useAtom(wholeWordModeAtom)

  return (
    <div className={styles.tabContent}>
      <Switch.Group as="div" className={styles.section}>
        <div className="flex w-full items-center justify-between gap-4">
          <Switch.Label className={styles.sectionLabel}>隐藏字母数</Switch.Label>
          <Switch checked={hideWordLength} onChange={setHideWordLength} className="switch-root shrink-0">
            <span aria-hidden="true" className="switch-thumb" />
          </Switch>
        </div>
        <Switch.Description className={styles.sectionDescription}>默写时用固定长度的横线隐藏答案长度。</Switch.Description>
      </Switch.Group>
      <Switch.Group as="div" className={styles.section}>
        <div className="flex w-full items-center justify-between gap-4">
          <Switch.Label className={styles.sectionLabel}>整词提交后判定</Switch.Label>
          <Switch checked={wholeWordMode} onChange={setWholeWordMode} className="switch-root shrink-0">
            <span aria-hidden="true" className="switch-thumb" />
          </Switch>
        </div>
        <Switch.Description className={styles.sectionDescription}>输入完成后按 Enter 或点提交。关闭后，逐字母判定输入。</Switch.Description>
      </Switch.Group>
    </div>
  )
}
