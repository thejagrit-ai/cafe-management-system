import { useEffect } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'

export default function TableRedirectPage() {
  const { tableId } = useParams<{ tableId?: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  useEffect(() => {
    const tableFromQuery = searchParams.get('table') || searchParams.get('id') || searchParams.get('number')
    const finalTable = tableId || tableFromQuery || '1'
    const cleanTable = finalTable.replace(/\D/g, '') || '1'

    if (typeof window !== 'undefined') {
      sessionStorage.setItem('cafe_active_table', cleanTable)
    }

    navigate(`/menu?table=${cleanTable}`, { replace: true })
  }, [tableId, searchParams, navigate])

  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-ink text-white p-6">
      <div className="text-center space-y-3">
        <div className="w-8 h-8 border-2 border-brand-gold border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm font-sans text-white/70">Connecting to your table...</p>
      </div>
    </div>
  )
}
