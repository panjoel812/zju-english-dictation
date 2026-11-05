import standTypingHandPosition from '@/assets/standard_typing_hand_position.png'
import { TypingContext, TypingStateActionType } from '@/pages/Typing/store'
import { Dialog, Transition } from '@headlessui/react'
import { Fragment, useContext, useState } from 'react'
import IconKeyboard from '~icons/ic/round-keyboard'
import IconX from '~icons/tabler/x'

export default function HandPositionIllustration() {
  const [isOpen, setIsOpen] = useState(false)
  const { dispatch } = useContext(TypingContext) ?? {}

  function closeModal() {
    setIsOpen(false)
  }

  function openModal() {
    dispatch?.({ type: TypingStateActionType.SET_IS_TYPING, payload: false })
    setIsOpen(true)
  }

  return (
    <>
      <button type="button" data-guide="fingers" onClick={openModal} aria-label="指法图示" className="toolbar-button">
        <IconKeyboard className="icon"></IconKeyboard>
      </button>

      <Transition appear show={isOpen} as={Fragment}>
        <Dialog
          as="div"
          className="fixed inset-0 z-50"
          onClose={closeModal}
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
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="relative max-h-[calc(100dvh-32px)] w-full max-w-3xl transform overflow-y-auto rounded-2xl bg-white p-4 text-left align-middle shadow-xl transition-all dark:bg-gray-800 sm:p-6">
                  <button
                    type="button"
                    onClick={closeModal}
                    aria-label="关闭指法图示"
                    title="关闭对话框"
                    className="absolute right-2 top-2 flex h-10 w-10 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500 dark:hover:bg-gray-700"
                  >
                    <IconX />
                  </button>
                  <Dialog.Title
                    as="h3"
                    className="px-8 text-center text-lg font-medium leading-6 text-gray-800 dark:text-gray-200 sm:text-xl"
                  >
                    推荐打字指法图示
                  </Dialog.Title>
                  <div className="mt-8">
                    <img className="block h-auto w-full" src={standTypingHandPosition} alt="标准键盘各手指负责的按键及手部位置" />
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </>
  )
}
