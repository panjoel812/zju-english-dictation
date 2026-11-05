import { SettingRange, SettingRow, SettingSwitch } from './SettingRow'
import styles from './index.module.css'
import { LANG_PRON_MAP, keySoundResources } from '@/resources/soundResource'
import { currentDictInfoAtom, hintSoundsConfigAtom, keySoundsConfigAtom, phoneticConfigAtom, pronunciationConfigAtom } from '@/store'
import { PRONUNCIATION_PHONETIC_MAP } from '@/typings'
import { playKeySoundResource } from '@/utils/sounds/keySounds'
import { useAtom, useAtomValue } from 'jotai'
import IconVolume from '~icons/tabler/volume'

export default function SoundSetting() {
  const [pronunciation, setPronunciation] = useAtom(pronunciationConfigAtom)
  const [keys, setKeys] = useAtom(keySoundsConfigAtom)
  const [hints, setHints] = useAtom(hintSoundsConfigAtom)
  const [, setPhonetic] = useAtom(phoneticConfigAtom)
  const dictionary = useAtomValue(currentDictInfoAtom)
  const voices = LANG_PRON_MAP[dictionary.language].pronunciation
  return (
    <div className={styles.settingsContent}>
      {dictionary.speechLang && (
        <p className="border-b border-gray-100 py-3 text-xs leading-5 text-gray-600 dark:border-gray-700 dark:text-gray-400">
          {dictionary.name.split(' ')[0]}朗读使用浏览器语音，声音取决于设备已安装的语音包。
        </p>
      )}
      <SettingSwitch
        title="单词发音"
        description="进入单词时自动朗读，点击单词旁的扬声器可重听。"
        checked={pronunciation.isOpen}
        onChange={(isOpen) => setPronunciation((old) => ({ ...old, isOpen }))}
      />
      <SettingRow title="发音口音">
        <select
          aria-label="发音口音"
          className={styles.select}
          value={pronunciation.type}
          onChange={(event) => {
            const voice = voices.find((voice) => voice.pron === event.target.value)
            if (!voice) return
            setPronunciation((old) => ({ ...old, type: voice.pron, name: voice.name }))
            const type = PRONUNCIATION_PHONETIC_MAP[voice.pron]
            if (type) setPhonetic((old) => ({ ...old, type }))
          }}
        >
          {voices.map((voice) => (
            <option value={voice.pron} key={voice.pron}>
              {voice.name}
            </option>
          ))}
        </select>
      </SettingRow>
      <SettingSwitch
        title="循环朗读"
        checked={pronunciation.isLoop}
        onChange={(isLoop) => setPronunciation((old) => ({ ...old, isLoop }))}
      />
      <SettingRange
        title="单词音量"
        value={Math.round(pronunciation.volume * 100)}
        min={0}
        max={100}
        step={10}
        unit="%"
        disabled={!pronunciation.isOpen}
        onChange={(value) => setPronunciation((old) => ({ ...old, volume: value / 100 }))}
      />
      <SettingRange
        title="朗读速度"
        value={pronunciation.rate ?? 1}
        min={0.5}
        max={4}
        step={0.1}
        unit="×"
        onChange={(rate) => setPronunciation((old) => ({ ...old, rate }))}
      />
      {window.speechSynthesis && (
        <>
          <SettingSwitch
            title="释义发音"
            checked={pronunciation.isTransRead}
            onChange={(isTransRead) => setPronunciation((old) => ({ ...old, isTransRead }))}
          />
          <SettingRange
            title="释义音量"
            value={Math.round(pronunciation.transVolume * 100)}
            min={0}
            max={100}
            step={10}
            unit="%"
            disabled={!pronunciation.isTransRead}
            onChange={(value) => setPronunciation((old) => ({ ...old, transVolume: value / 100 }))}
          />
        </>
      )}
      <SettingSwitch title="按键音" checked={keys.isOpen} onChange={(isOpen) => setKeys((old) => ({ ...old, isOpen }))} />
      <SettingRow title="按键音效">
        <select
          aria-label="按键音效"
          className={styles.select}
          value={keys.resource.key}
          onChange={(event) => {
            const resource = keySoundResources.find((resource) => resource.key === event.target.value)
            if (resource) setKeys((old) => ({ ...old, resource }))
          }}
        >
          {keySoundResources.map((resource) => (
            <option key={resource.key} value={resource.key}>
              {resource.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="shrink-0 rounded-lg p-2 text-indigo-500 hover:bg-indigo-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500 dark:hover:bg-gray-700"
          aria-label="试听按键音"
          onClick={() => playKeySoundResource(keys.resource)}
        >
          <IconVolume />
        </button>
      </SettingRow>
      <SettingRange
        title="按键音量"
        value={Math.round(keys.volume * 100)}
        min={0}
        max={100}
        step={10}
        unit="%"
        disabled={!keys.isOpen}
        onChange={(value) => setKeys((old) => ({ ...old, volume: value / 100 }))}
      />
      <SettingSwitch title="答题提示音" checked={hints.isOpen} onChange={(isOpen) => setHints((old) => ({ ...old, isOpen }))} />
      <SettingRange
        title="提示音量"
        value={Math.round(hints.volume * 100)}
        min={0}
        max={100}
        step={10}
        unit="%"
        disabled={!hints.isOpen}
        onChange={(value) => setHints((old) => ({ ...old, volume: value / 100 }))}
      />
    </div>
  )
}
