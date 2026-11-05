import useDataExport from '@/hooks/useDataExport'
import IconDownload from '~icons/tabler/download'

export default function ExportDataButton() {
  const { isExporting, exportMessage, onClickExport } = useDataExport()
  return (
    <div className="relative">
      <button
        type="button"
        data-guide="export"
        className="toolbar-button"
        onClick={onClickExport}
        disabled={isExporting}
        aria-label="导出数据"
        title={isExporting ? '导出中…' : '导出数据'}
      >
        <IconDownload className="h-5 w-5" aria-hidden="true" />
      </button>
      {exportMessage && (
        <p
          role="status"
          className="fixed bottom-5 right-4 z-40 w-72 max-w-[calc(100vw-2rem)] rounded-lg border border-gray-200 bg-white p-3 text-sm text-gray-600 shadow-lg dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
        >
          {exportMessage}
        </p>
      )}
    </div>
  )
}
