import { hintSoundsConfigAtom, keySoundsConfigAtom } from '@/store'
import { autoUpdate, flip, offset, shift, useFloating } from '@floating-ui/react'
import { Popover, Switch, Transition } from '@headlessui/react'
import { useAtom } from 'jotai'
import { Fragment, useCallback } from 'react'
import IconSpeakerWave from '~icons/heroicons/speaker-wave-solid'

export default function SoundSwitcher() {
  const { x, y, strategy, refs } = useFloating({
    placement: 'bottom',
    strategy: 'fixed',
    middleware: [offset(8), flip(), shift({ padding: 12 })],
    whileElementsMounted: autoUpdate,
  })
  const [keySoundsConfig, setKeySoundsConfig] = useAtom(keySoundsConfigAtom)
  const [hintSoundsConfig, setHintSoundsConfig] = useAtom(hintSoundsConfigAtom)

  const onChangeKeySound = useCallback(
    (checked: boolean) => {
      setKeySoundsConfig((old) => ({ ...old, isOpen: checked }))
    },
    [setKeySoundsConfig],
  )

  const onChangeHintSound = useCallback(
    (checked: boolean) => {
      setHintSoundsConfig((old) => ({ ...old, isOpen: checked }))
    },
    [setHintSoundsConfig],
  )

  return (
    <Popover className="relative">
      {({ open }) => (
        <>
          <Popover.Button
            ref={refs.setReference}
            className={`toolbar-button ${open ? 'bg-indigo-50 dark:bg-gray-700' : ''}`}
            aria-label="音效设置"
            title="音效设置"
          >
            <IconSpeakerWave className="icon" />
          </Popover.Button>

          <Transition
            as={Fragment}
            enter="transition ease-out duration-200"
            enterFrom="opacity-0 translate-y-1"
            enterTo="opacity-100 translate-y-0"
            leave="transition ease-in duration-150"
            leaveFrom="opacity-100 translate-y-0"
            leaveTo="opacity-0 translate-y-1"
          >
            <Popover.Panel ref={refs.setFloating} style={{ position: strategy, top: y ?? 0, left: x ?? 0 }} className="z-40 flex max-w-max">
              <div className="shadow-upper box-border flex w-60 select-none flex-col items-center justify-center gap-4 rounded-xl bg-white p-4 drop-shadow dark:bg-gray-800">
                <div className="flex w-full  flex-col  items-start gap-2 py-0">
                  <span className="text-sm font-normal leading-5 text-gray-900 dark:text-white dark:text-opacity-60">开关按键音</span>
                  <div className="flex w-full flex-row items-center justify-between">
                    <Switch checked={keySoundsConfig.isOpen} onChange={onChangeKeySound} className="switch-root">
                      <span aria-hidden="true" className="switch-thumb" />
                    </Switch>
                    <span className="text-right text-xs font-normal leading-tight text-gray-600">{`发音已${
                      keySoundsConfig.isOpen ? '开启' : '关闭'
                    }`}</span>
                  </div>
                </div>
                <div className="flex w-full flex-col items-start  gap-2 py-0">
                  <span className="text-sm font-normal leading-5 text-gray-900 dark:text-white dark:text-opacity-60">开关效果音</span>
                  <div className="flex w-full flex-row items-center justify-between">
                    <Switch checked={hintSoundsConfig.isOpen} onChange={onChangeHintSound} className="switch-root">
                      <span aria-hidden="true" className="switch-thumb" />
                    </Switch>
                    <span className="text-right text-xs font-normal leading-tight text-gray-600">{`发音已${
                      hintSoundsConfig.isOpen ? '开启' : '关闭'
                    }`}</span>
                  </div>
                </div>
              </div>
            </Popover.Panel>
          </Transition>
        </>
      )}
    </Popover>
  )
}
