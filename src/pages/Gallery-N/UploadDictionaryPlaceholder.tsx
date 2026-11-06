import InfoPanel from '@/components/InfoPanel'
import { useState } from 'react'
import IconUpload from '~icons/tabler/upload'

export default function UploadDictionaryPlaceholder() {
  const [showPanel, setShowPanel] = useState(false)

  return (
    <>
      <button
        type="button"
        aria-label="上传词库"
        data-coming-soon="true"
        title="敬请期待"
        onClick={() => setShowPanel(true)}
        className="inline-flex h-11 shrink-0 cursor-not-allowed items-center gap-2 rounded-md border border-gray-300 bg-gray-100 px-3 text-sm font-medium text-gray-500 shadow-sm transition-colors hover:bg-gray-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
      >
        <IconUpload className="h-4 w-4" aria-hidden="true" />
        <span>上传词库</span>
      </button>
      <InfoPanel
        openState={showPanel}
        title="上传词库"
        icon={IconUpload}
        iconClassName="bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-300"
        buttonClassName="bg-gray-500 text-white hover:bg-gray-600"
        onClose={() => setShowPanel(false)}
      >
        <p className="text-sm text-gray-600 dark:text-gray-300">敬请期待：自定义词库上传功能正在准备中。</p>
      </InfoPanel>
    </>
  )
}
