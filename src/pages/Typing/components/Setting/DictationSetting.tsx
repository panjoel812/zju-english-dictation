import { SettingRow, SettingSwitch } from './SettingRow'
import styles from './index.module.css'
import {
  currentDictInfoAtom,
  hideWordLengthAtom,
  isIgnoreCaseAtom,
  isShowAnswerOnHoverAtom,
  loopWordConfigAtom,
  randomConfigAtom,
  showFirstLetterAtom,
  wholeWordModeAtom,
  wordDictationConfigAtom,
} from '@/store'
import type { LoopWordTimesOption, WordDictationType } from '@/typings'
import { useAtom, useAtomValue } from 'jotai'

export default function DictationSetting() {
  const dictionary = useAtomValue(currentDictInfoAtom)
  const [dictation, setDictation] = useAtom(wordDictationConfigAtom)
  const [hideWordLength, setHideWordLength] = useAtom(hideWordLengthAtom)
  const [showFirstLetter, setShowFirstLetter] = useAtom(showFirstLetterAtom)
  const [wholeWordMode, setWholeWordMode] = useAtom(wholeWordModeAtom)
  const [loop, setLoop] = useAtom(loopWordConfigAtom)
  const [random, setRandom] = useAtom(randomConfigAtom)
  const [ignoreCase, setIgnoreCase] = useAtom(isIgnoreCaseAtom)
  const [hover, setHover] = useAtom(isShowAnswerOnHoverAtom)
  return (
    <div className={styles.settingsContent}>
      <SettingSwitch
        title="默写模式"
        description="隐藏英文，听音后回忆拼写。"
        checked={dictation.isOpen}
        onChange={(isOpen) => setDictation((old) => ({ ...old, isOpen, openBy: 'user' }))}
      />
      <SettingRow title="隐藏方式">
        <select
          aria-label="隐藏方式"
          className={styles.select}
          value={dictation.type}
          disabled={!dictation.isOpen}
          onChange={(event) => setDictation((old) => ({ ...old, type: event.target.value as WordDictationType }))}
        >
          <option value="hideAll">全部隐藏</option>
          <option value="hideVowel">隐藏元音</option>
          <option value="hideConsonant">隐藏辅音</option>
          <option value="randomHide">随机隐藏</option>
        </select>
      </SettingRow>
      <SettingSwitch
        title="显示首字母"
        description="默写时提示词条的第一个字母，仍需输入完整拼写。"
        checked={showFirstLetter}
        onChange={setShowFirstLetter}
      />
      <SettingSwitch
        title="隐藏字母数"
        description="默写时用固定长横线代替字母格。"
        checked={hideWordLength}
        onChange={setHideWordLength}
      />
      <SettingSwitch
        title="整词提交后判定"
        description={
          dictionary.speechLang ? '小语种使用整词提交，支持重音字符与系统输入法。' : '按 Enter 或点勾选按钮提交；关闭后逐字判定。'
        }
        checked={wholeWordMode || Boolean(dictionary.speechLang)}
        disabled={Boolean(dictionary.speechLang)}
        onChange={setWholeWordMode}
      />
      <SettingRow title="单词练习次数" description="答对后重复练习当前词。">
        <select
          aria-label="单词练习次数"
          className={styles.select}
          value={loop.times}
          onChange={(event) => setLoop({ times: Number(event.target.value) as LoopWordTimesOption })}
        >
          {[1, 3, 5, 8].map((times) => (
            <option value={times} key={times}>
              {times} 次
            </option>
          ))}
          <option value={Number.MAX_SAFE_INTEGER}>无限循环</option>
        </select>
      </SettingRow>
      <SettingSwitch
        title="章节乱序"
        description="从下一次开始章节时生效。"
        checked={random.isOpen}
        onChange={(isOpen) => setRandom((old) => ({ ...old, isOpen }))}
      />
      <SettingSwitch title="忽略大小写" checked={ignoreCase} onChange={setIgnoreCase} />
      <SettingSwitch
        title="鼠标悬停提示"
        description="鼠标移到字母格时显示拼写，也可点击「查看答案」。"
        checked={hover}
        onChange={setHover}
      />
    </div>
  )
}
