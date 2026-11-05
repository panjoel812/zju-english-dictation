import { recordErrorBookAction } from '@/utils'
import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import IconBook from '~icons/bxs/book'

const ErrorBookButton = () => {
  const navigate = useNavigate()

  const toErrorBook = useCallback(() => {
    navigate('/error-book')
    recordErrorBookAction('open')
  }, [navigate])

  return (
    <button type="button" data-guide="mistakes" onClick={toErrorBook} className="toolbar-button" title="查看错题本">
      <IconBook className="icon" />
    </button>
  )
}

export default ErrorBookButton
