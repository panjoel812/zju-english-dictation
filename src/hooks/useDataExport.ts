import { exportDatabase } from '@/utils/db/data-export'
import { useCallback, useEffect, useRef, useState } from 'react'

export default function useDataExport() {
  const busy = useRef(false)
  const [isExporting, setIsExporting] = useState(false)
  const [exportProgress, setExportProgress] = useState(0)
  const [exportMessage, setExportMessage] = useState('')

  useEffect(() => {
    if (!exportMessage) return
    const timer = window.setTimeout(() => setExportMessage(''), 6000)
    return () => window.clearTimeout(timer)
  }, [exportMessage])

  const onClickExport = useCallback(async () => {
    if (busy.current) return
    busy.current = true
    setIsExporting(true)
    setExportProgress(0)
    setExportMessage('')
    try {
      await exportDatabase(({ totalRows, completedRows }) => {
        if (totalRows) setExportProgress(Math.min(99, Math.floor((completedRows / totalRows) * 100)))
        return true
      })
      setExportProgress(100)
      setExportMessage('备份已生成，可在「设置 → 数据管理」中导入。')
    } catch {
      setExportMessage('导出失败，请重试。')
    } finally {
      busy.current = false
      setIsExporting(false)
    }
  }, [])

  return { isExporting, exportProgress, exportMessage, onClickExport }
}
