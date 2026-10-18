import { TypingContext, TypingStateActionType } from '../../store'
import AdvancedSetting from './AdvancedSetting'
import DataSetting from './DataSetting'
import DictationSetting from './DictationSetting'
import ReleaseNotes from './ReleaseNotes'
import SoundSetting from './SoundSetting'
import ViewSetting from '@/pages/Typing/components/Setting/ViewSetting'
import { acknowledgeCurrentRelease, currentReleaseVersion, hasSeenCurrentRelease } from '@/resources/releases'
import { Dialog, Tab, Transition } from '@headlessui/react'
import classNames from 'classnames'
import { Fragment, useContext, useEffect, useLayoutEffect, useRef, useState } from 'react'
import IconCog6Tooth from '~icons/heroicons/cog-6-tooth-solid'
import IconEye from '~icons/heroicons/eye-solid'
import IconAdjustmentsHorizontal from '~icons/tabler/adjustments-horizontal'
import IconDatabaseCog from '~icons/tabler/database-cog'
import IconEar from '~icons/tabler/ear'
import IconLanguage from '~icons/tabler/language'
import IconX from '~icons/tabler/x'

const tabs = [
  { label: '默写设置', Icon: IconLanguage, Component: DictationSetting },
  { label: '音效设置', Icon: IconEar, Component: SoundSetting },
  { label: '高级设置', Icon: IconAdjustmentsHorizontal, Component: AdvancedSetting },
  { label: '显示设置', Icon: IconEye, Component: ViewSetting },
  { label: '数据设置', Icon: IconDatabaseCog, Component: DataSetting },
]

export default function Setting() {
  const { state, dispatch } = useContext(TypingContext) ?? {}
  const [view, setView] = useState<'settings' | 'release' | null>(() => (!state?.isTyping && !hasSeenCurrentRelease() ? 'release' : null))
  const [fromSettings, setFromSettings] = useState(false)
  const titleRef = useRef<HTMLHeadingElement>(null)
  const isOpen = view !== null

  useEffect(() => {
    if (isOpen && state?.isTyping) dispatch?.({ type: TypingStateActionType.SET_IS_TYPING, payload: false })
  }, [isOpen, state?.isTyping, dispatch])

  useEffect(() => {
    titleRef.current?.focus()
  }, [view])

  function closeModal() {
    if (view === 'release') {
      acknowledgeCurrentRelease()
      setView(fromSettings ? 'settings' : null)
    } else {
      setView(null)
    }
  }

  function openModal() {
    setFromSettings(false)
    setView('settings')
    if (dispatch) {
      dispatch({ type: TypingStateActionType.SET_IS_TYPING, payload: false })
    }
  }

  useLayoutEffect(() => {
    if (!isOpen) return
    // The portal mounts after the opener; block background shortcuts until focus enters it.
    const containKeyboard = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLElement && event.target.closest('[role="dialog"]')) return
      event.preventDefault()
      event.stopPropagation()
      titleRef.current?.focus()
    }
    document.addEventListener('keydown', containKeyboard, true)
    document.addEventListener('keyup', containKeyboard, true)
    return () => {
      document.removeEventListener('keydown', containKeyboard, true)
      document.removeEventListener('keyup', containKeyboard, true)
    }
  }, [isOpen])

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-xl text-indigo-500 transition-colors hover:bg-indigo-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500 dark:hover:bg-gray-700 ${
          isOpen ? 'bg-indigo-100 dark:bg-gray-700' : ''
        }`}
        title="打开设置对话框"
        aria-label="打开设置对话框"
      >
        <IconCog6Tooth className="icon" />
      </button>

      <Transition appear show={isOpen} as={Fragment}>
        <Dialog
          as="div"
          className="fixed inset-0 z-50"
          onClose={closeModal}
          initialFocus={titleRef}
          onKeyDown={(event) => {
            if (event.key !== 'Escape') event.stopPropagation()
          }}
          onKeyUp={(event) => event.stopPropagation()}
        >
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black bg-opacity-25" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-3 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel
                  className={classNames(
                    'flex max-h-[calc(100dvh-24px)] w-full flex-col overflow-hidden rounded-lg bg-white shadow-xl dark:bg-gray-800',
                    view === 'release' ? 'max-w-lg' : 'h-[min(40rem,calc(100dvh-24px))] max-w-3xl',
                  )}
                >
                  <div className="flex shrink-0 items-center justify-between gap-3 border-b border-gray-100 px-4 py-3 dark:border-gray-700 sm:px-6">
                    <Dialog.Title
                      ref={titleRef}
                      tabIndex={-1}
                      className="text-left text-xl font-semibold text-gray-700 outline-none dark:text-gray-100"
                    >
                      {view === 'release' ? `${currentReleaseVersion} 更新说明` : '设置'}
                    </Dialog.Title>
                    <button
                      type="button"
                      onClick={closeModal}
                      title={view === 'release' ? '关闭更新说明' : '关闭设置'}
                      aria-label={view === 'release' ? '关闭更新说明' : '关闭设置'}
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded text-gray-500 hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500 dark:text-gray-300 dark:hover:bg-gray-700"
                    >
                      <IconX />
                    </button>
                  </div>
                  {view === 'release' ? (
                    <ReleaseNotes onAcknowledge={closeModal} fromSettings={fromSettings} />
                  ) : (
                    <>
                      <Tab.Group as="div" className="flex min-h-0 flex-1 flex-col">
                        <Tab.List className="flex shrink-0 gap-1 overflow-x-auto border-b border-gray-100 p-2 dark:border-gray-700 sm:gap-2 sm:px-4">
                          {tabs.map(({ label, Icon }) => (
                            <Tab
                              key={label}
                              className={({ selected }) =>
                                classNames(
                                  'flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded px-3 py-3 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500 sm:flex-1',
                                  selected
                                    ? 'bg-indigo-50 text-indigo-600 dark:bg-gray-700 dark:text-indigo-300'
                                    : 'text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700',
                                )
                              }
                            >
                              <Icon className="hidden sm:block" />
                              {label}
                            </Tab>
                          ))}
                        </Tab.List>
                        <Tab.Panels className="min-h-0 min-w-0 flex-1 overflow-hidden">
                          {tabs.map(({ label, Component }) => (
                            <Tab.Panel key={label} className="flex h-full min-w-0 overflow-hidden focus:outline-none">
                              <Component />
                            </Tab.Panel>
                          ))}
                        </Tab.Panels>
                      </Tab.Group>
                      <div className="flex shrink-0 items-center justify-between border-t border-gray-100 px-4 py-2 text-sm dark:border-gray-700 sm:px-6">
                        <span className="text-gray-500 dark:text-gray-400">v{currentReleaseVersion}</span>
                        <button
                          type="button"
                          className="rounded px-3 py-2 text-indigo-600 hover:bg-indigo-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500 dark:text-indigo-300 dark:hover:bg-gray-700"
                          onClick={() => {
                            setFromSettings(true)
                            setView('release')
                          }}
                        >
                          本次更新
                        </button>
                      </div>
                    </>
                  )}
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </>
  )
}
