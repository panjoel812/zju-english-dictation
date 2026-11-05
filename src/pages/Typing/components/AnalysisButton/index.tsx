import { recordAnalysisAction } from '@/utils'
import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import ChartPie from '~icons/heroicons/chart-pie-solid'

const AnalysisButton = () => {
  const navigate = useNavigate()

  const toAnalysis = useCallback(() => {
    navigate('/analysis')
    recordAnalysisAction('open')
  }, [navigate])

  return (
    <button type="button" data-guide="analysis" onClick={toAnalysis} className="toolbar-button" title="查看数据统计">
      <ChartPie className="icon" />
    </button>
  )
}

export default AnalysisButton
