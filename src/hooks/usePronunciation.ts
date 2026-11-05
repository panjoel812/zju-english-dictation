import { LANG_PRON_MAP } from '@/resources/soundResource'
import { currentDictInfoAtom, pronunciationConfigAtom } from '@/store'
import type { PronunciationType } from '@/typings'
import { romajiToHiragana } from '@/utils/kana'
import { Howl } from 'howler'
import { useAtomValue } from 'jotai'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

const pronunciationApi = 'https://dict.youdao.com/dictvoice?audio='
export function generateWordSoundSrc(word: string, pronunciation: Exclude<PronunciationType, false>): string {
  switch (pronunciation) {
    case 'uk':
      return `${pronunciationApi}${word}&type=1`
    case 'us':
      return `${pronunciationApi}${word}&type=2`
    case 'romaji':
      return `${pronunciationApi}${romajiToHiragana(word)}&le=jap`
    case 'zh':
      return `${pronunciationApi}${word}&le=zh`
    case 'ja':
      return `${pronunciationApi}${word}&le=jap`
    case 'de':
      return `${pronunciationApi}${word}&le=de`
    case 'hapin':
    case 'kk':
      return `${pronunciationApi}${word}&le=ru` // 有道不支持哈萨克语, 暂时用俄语发音兜底
    case 'id':
      return `${pronunciationApi}${word}&le=id`
    default:
      return ''
  }
}

export default function usePronunciationSound(word: string, isLoop?: boolean) {
  const pronunciationConfig = useAtomValue(pronunciationConfigAtom)
  const dictionary = useAtomValue(currentDictInfoAtom)
  const voices = LANG_PRON_MAP[dictionary.language].pronunciation
  const pronunciation = voices.find((voice) => voice.pron === pronunciationConfig.type) ?? voices[0]
  const loop = useMemo(() => (typeof isLoop === 'boolean' ? isLoop : pronunciationConfig.isLoop), [isLoop, pronunciationConfig.isLoop])
  const [isPlaying, setIsPlaying] = useState(false)
  const soundRef = useRef<{ sound: Howl; source: string } | null>(null)
  const pendingSourceRef = useRef<string | null>(null)
  const nativeRef = useRef<SpeechSynthesisUtterance | null>(null)
  const nativeSettings = useRef({
    word,
    lang: dictionary.speechLang,
    loop,
    volume: pronunciationConfig.volume,
    rate: pronunciationConfig.rate,
  })
  nativeSettings.current = { word, lang: dictionary.speechLang, loop, volume: pronunciationConfig.volume, rate: pronunciationConfig.rate }
  const source = dictionary.speechLang ? '' : generateWordSoundSrc(word, pronunciation.pron)

  useEffect(() => {
    setIsPlaying(false)
    return () => {
      if (nativeRef.current) {
        nativeRef.current = null
        window.speechSynthesis?.cancel()
      }
    }
  }, [word, dictionary.speechLang])

  const playNative = useCallback(function speak() {
    const settings = nativeSettings.current
    if (!settings.lang || !window.speechSynthesis || typeof SpeechSynthesisUtterance === 'undefined') return
    const utterance = new SpeechSynthesisUtterance(settings.word)
    utterance.lang = settings.lang
    utterance.volume = settings.volume
    utterance.rate = settings.rate ?? 1
    const voice = window.speechSynthesis.getVoices().find((voice) => voice.lang.toLowerCase() === settings.lang?.toLowerCase())
    if (voice) utterance.voice = voice
    nativeRef.current = null
    window.speechSynthesis.cancel()
    nativeRef.current = utterance
    utterance.onstart = () => {
      if (nativeRef.current === utterance) setIsPlaying(true)
    }
    utterance.onend = () => {
      if (nativeRef.current !== utterance) return
      nativeRef.current = null
      setIsPlaying(false)
      if (nativeSettings.current.loop) speak()
    }
    utterance.onerror = () => {
      if (nativeRef.current === utterance) {
        nativeRef.current = null
        setIsPlaying(false)
      }
    }
    window.speechSynthesis.speak(utterance)
  }, [])

  // Bind the current source before parent autoplay runs; keep loading requests
  // cancellable so pausing or skipping cannot play a stale word later.
  useEffect(() => {
    setIsPlaying(false)
    if (pendingSourceRef.current !== source) pendingSourceRef.current = null
    if (!source) return
    const sound = new Howl({
      src: [source],
      html5: true,
      format: ['mp3'],
      onload: () => {
        if (soundRef.current?.sound === sound && pendingSourceRef.current === source) {
          pendingSourceRef.current = null
          sound.play()
        }
      },
      onplay: () => setIsPlaying(true),
      onend: () => setIsPlaying(false),
      onpause: () => setIsPlaying(false),
      onstop: () => setIsPlaying(false),
      onloaderror: () => setIsPlaying(false),
      onplayerror: () => setIsPlaying(false),
    })
    soundRef.current = { sound, source }

    return () => {
      // A same-source Strict Mode setup may still have a pending request.
      soundRef.current = null
      sound.unload()
    }
  }, [source])

  useEffect(() => {
    soundRef.current?.sound.loop(loop)
    soundRef.current?.sound.volume(pronunciationConfig.volume)
    soundRef.current?.sound.rate(pronunciationConfig.rate)
  }, [source, loop, pronunciationConfig.volume, pronunciationConfig.rate])

  const play = useCallback(() => {
    if (nativeSettings.current.lang) {
      playNative()
      return
    }
    const current = soundRef.current
    if (!current) return
    const { sound, source } = current
    if (sound.state() === 'loaded') {
      pendingSourceRef.current = null
      sound.play()
    } else {
      pendingSourceRef.current = source
      if (sound.state() === 'unloaded') sound.load()
    }
  }, [playNative])

  const stop = useCallback(() => {
    if (nativeRef.current) {
      nativeRef.current = null
      window.speechSynthesis?.cancel()
      setIsPlaying(false)
    }
    pendingSourceRef.current = null
    if (soundRef.current?.sound.state() === 'loaded') soundRef.current.sound.stop()
  }, [])

  return { play, stop, isPlaying }
}

export function usePrefetchPronunciationSound(word: string | undefined) {
  const pronunciationConfig = useAtomValue(pronunciationConfigAtom)
  const dictionary = useAtomValue(currentDictInfoAtom)

  useEffect(() => {
    if (!word || dictionary.speechLang) return

    const soundUrl = generateWordSoundSrc(word, pronunciationConfig.type)
    if (soundUrl === '') return

    const head = document.head
    const isPrefetch = (Array.from(head.querySelectorAll('link[href]')) as HTMLLinkElement[]).some((el) => el.href === soundUrl)

    if (!isPrefetch) {
      const audio = new Audio()
      audio.src = soundUrl
      audio.preload = 'auto'

      // gpt 说这这两行能尽可能规避下载插件被触发问题。 本地测试不加也可以，考虑到别的插件可能有问题，所以加上保险
      audio.crossOrigin = 'anonymous'
      audio.style.display = 'none'

      head.appendChild(audio)

      return () => {
        head.removeChild(audio)
      }
    }
  }, [pronunciationConfig.type, word, dictionary.speechLang])
}
