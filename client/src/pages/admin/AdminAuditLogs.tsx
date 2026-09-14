import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { auditLogsApi } from '@/api/dashboard'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDate } from '@/utils/lib'
import { Activity, ChevronLeft, ChevronRight, Search, ShieldCheck } from 'lucide-react'

function actionTone(action: string) {
  if (action.includes('DELETE') || action.includes('CANCEL')) return 'bg-rose-500/10 text-rose-700 border-rose-500/20'
  if (action.includes('UPDATE') || action.includes('STATUS')) return 'bg-amber-500/10 text-amber-700 border-amber-500/20'
  if (action.includes('CREATE') || action.includes('LOGIN')) return 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20'
  return 'bg-secondary text-muted-foreground border-border'
}

export default function AdminAuditLogs() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [entity, setEntity] = useState('')
  const [action, setAction] = useState('')

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['audit-logs', page, search, entity, action],
    queryFn: () => auditLogsApi.getAll({
      page,
      limit: 20,
      search: search || undefined,
      entity: entity || undefined,
      action: action || undefined,
    }),
    refetchInterval: 30000,
  })

  const logs = data?.data || []
  const pagination = data?.pagination

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-border/60 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-foreground tracking-tight flex items-center gap-2.5">
            <ShieldCheck className="w-7 h-7 text-[#7C4EEE]" />
            <span>Audit Logs</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Review important admin, staff, stock, order, payment, and profile changes.
          </p>
        </div>
        <Badge className="w-fit bg-emerald-500/10 text-emerald-700 border-emerald-500/20">
          {isFetching ? 'Refreshing' : 'Live trail'}
        </Badge>
      </div>

      <div className="grid gap-3 lg:grid-cols-[1fr_180px_180px]">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => {
              setPage(1)
              setSearch(event.target.value)
            }}
            placeholder="Search action, entity, or record id"
            className="h-11 rounded-xl bg-card pl-10 text-xs"
          />
        </div>
        <Input
          value={entity}
          onChange={(event) => {
            setPage(1)
            setEntity(event.target.value)
          }}
          placeholder="Entity"
          className="h-11 rounded-xl bg-card text-xs"
        />
        <Input
          value={action}
          onChange={(event) => {
            setPage(1)
            setAction(event.target.value)
          }}
          placeholder="Action"
          className="h-11 rounded-xl bg-card text-xs"
        />
      </div>

      <div className="rounded-2xl border border-border/80 bg-card shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="space-y-3 p-5">
            {Array.from({ length: 8 }).map((_, index) => (
              <Skeleton key={index} className="h-16 rounded-xl" />
            ))}
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center text-xs text-muted-foreground">
            No audit activity matches these filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border/70 bg-secondary/40 text-[10px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="p-4">Time</th>
                  <th className="p-4">Action</th>
                  <th className="p-4">Entity</th>
                  <th className="p-4">Record</th>
                  <th className="p-4">Actor</th>
                  <th className="p-4">Source</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-secondary/25">
                    <td className="p-4 whitespace-nowrap text-muted-foreground">{formatDate(log.createdAt)}</td>
                    <td className="p-4">
                      <Badge className={actionTone(log.action)}>{log.action}</Badge>
                    </td>
                    <td className="p-4 font-semibold text-foreground">{log.entity}</td>
                    <td className="p-4 font-mono text-[11px] text-muted-foreground">{log.entityId || '-'}</td>
                    <td className="p-4 font-mono text-[11px] text-muted-foreground">{log.userId || 'System'}</td>
                    <td className="p-4 text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Activity className="h-3.5 w-3.5 text-[#7C4EEE]" />
                        <span>{log.ipAddress || 'Unknown'}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Page {pagination.page} of {pagination.totalPages} · {pagination.total} logs</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="rounded-xl">
              <ChevronLeft className="h-3.5 w-3.5 mr-1" />
              Previous
            </Button>
            <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={page >= pagination.totalPages} className="rounded-xl">
              Next
              <ChevronRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
