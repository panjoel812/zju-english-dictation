import styles from './index.module.css'
import type { ImportProgress } from '@/utils/db/data-export'
import { importDatabase } from '@/utils/db/data-export'
import { useCallback, useState } from 'react'

export default function DataSetting() {
  const [isImporting, setIsImporting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [message, setMessage] = useState('')
  const onProgress = useCallback(({ totalRows, completedRows, done }: ImportProgress) => {
    if (totalRows) setProgress(Math.floor((completedRows / totalRows) * 100))
    if (done) {
      setProgress(100)
      setIsImporting(false)
      setMessage('数据已导入。')
    }
    return true
  }, [])
  return (
    <div className={styles.settingsContent}>
      <section className="border-b border-gray-100 py-5 dark:border-gray-700">
        <h3 className={styles.rowLabel}>备份练习数据</h3>
        <p className="mt-2 text-sm leading-6 text-gray-500 dark:text-gray-400">
          练习记录、章节记录和错题数据保存在当前浏览器中。使用顶部的下载图标可导出完整备份，在其他设备中导入后继续练习。
        </p>
      </section>
      <section className="py-5">
        <h3 className={styles.rowLabel}>导入备份</h3>
        <p className="mt-2 text-sm leading-6 text-gray-500 dark:text-gray-400">
          选择此前导出的 .gz 文件。导入会覆盖当前练习记录，请先备份。
        </p>
        <button
          className="my-btn-primary mt-4 text-sm disabled:opacity-50"
          type="button"
          disabled={isImporting}
          onClick={() =>
            importDatabase(
              () => {
                setIsImporting(true)
                setProgress(0)
                setMessage('')
              },
              onProgress,
              () => {
                setIsImporting(false)
                setMessage('导入失败，请检查备份文件后重试。')
              },
            )
          }
        >
          {isImporting ? '导入中…' : '导入数据'}
        </button>
        {isImporting && <progress aria-label="导入进度" className="mt-4 h-2 w-full accent-indigo-500" value={progress} max={100} />}
        <p role="status" className="mt-3 text-sm text-gray-600 dark:text-gray-300">
          {message}
        </p>
      </section>
    </div>
  )
}
