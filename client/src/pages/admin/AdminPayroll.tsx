import React, { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { payrollApi } from '@/api/growth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useDownloadWorkbook } from '@/hooks/useDownloadWorkbook'
import { formatCurrency } from '@/utils/lib'
import { Calculator, FileSpreadsheet, Loader2, Save } from 'lucide-react'
import { toast } from 'sonner'

type PayType = 'HOURLY' | 'MONTHLY'

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

function monthStartIso() {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
}

export default function AdminPayroll() {
  const queryClient = useQueryClient()
  const [dateFrom, setDateFrom] = useState(monthStartIso())
  const [dateTo, setDateTo] = useState(todayIso())
  const [deductionPercent, setDeductionPercent] = useState(0)
  const [drafts, setDrafts] = useState<Record<string, { payrollType: PayType; hourlyRate: number; monthlySalary: number }>>({})
  const { downloadWorkbook, isExporting } = useDownloadWorkbook()

  const params = useMemo(() => ({ dateFrom, dateTo, deductionPercent }), [dateFrom, dateTo, deductionPercent])

  const { data, isLoading } = useQuery({
    queryKey: ['payroll-summary', params],
    queryFn: () => payrollApi.getSummary(params),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { payrollType: PayType; hourlyRate: number; monthlySalary: number } }) =>
      payrollApi.updateCompensation(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll-summary'] })
      toast.success('Compensation saved')
    },
    onError: (err: any) => toast.error(err?.message || 'Unable to save compensation'),
  })

  const payroll = data?.data
  const employees = payroll?.employees ?? []

  const draftFor = (employee: (typeof employees)[number]) =>
    drafts[employee.id] ?? {
      payrollType: employee.payrollType,
      hourlyRate: employee.hourlyRate,
      monthlySalary: employee.monthlySalary,
    }

  const setDraft = (id: string, patch: Partial<{ payrollType: PayType; hourlyRate: number; monthlySalary: number }>) => {
    const current = employees.find((employee) => employee.id === id)
    if (!current) return
    setDrafts((prev) => ({ ...prev, [id]: { ...draftFor(current), ...patch } }))
  }

  const exportPayroll = () => {
    if (!payroll || employees.length === 0) {
      toast.info('No payroll rows to export')
      return
    }
    downloadWorkbook({
      filename: `payroll_${dateFrom}_${dateTo}`,
      sheetName: 'Payroll',
      headers: ['Employee', 'Position', 'Pay Type', 'Hourly Rate', 'Monthly Salary', 'Shifts', 'Hours', 'Gross Pay', 'Deductions', 'Net Pay'],
      rows: employees.map((employee) => [
        `${employee.firstName} ${employee.lastName}`,
        employee.position || '-',
        employee.payrollType,
        employee.hourlyRate,
        employee.monthlySalary,
        employee.shiftCount,
        employee.totalHours,
        employee.grossPay,
        employee.deductions,
        employee.netPay,
      ]),
    })
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b border-border/60 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-foreground tracking-tight">HR Payroll</h1>
          <p className="text-xs text-muted-foreground mt-1">Salary calculation from closed staff shifts.</p>
        </div>

        <Button onClick={exportPayroll} disabled={isExporting} variant="outline" className="rounded-xl text-xs font-semibold">
          {isExporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileSpreadsheet className="w-4 h-4 mr-2 text-emerald-600" />}
          Export Excel
        </Button>
      </div>

      <div className="rounded-2xl border border-border/80 bg-card p-4">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-10 rounded-xl text-xs" />
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-10 rounded-xl text-xs" />
          <Input type="number" min={0} max={80} value={deductionPercent} onChange={(e) => setDeductionPercent(Number(e.target.value))} className="h-10 rounded-xl text-xs" placeholder="Deduction %" />
          <div className="flex items-center gap-2 rounded-xl border border-border px-3 text-xs text-muted-foreground">
            <Calculator className="h-4 w-4 text-[#7C4EEE]" />
            <span>{deductionPercent}% deduction</span>
          </div>
        </div>
      </div>

      {payroll && (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-5">
          <div className="p-5 rounded-2xl border border-border/80 bg-card">
            <span className="text-xs text-muted-foreground font-semibold">Total Hours</span>
            <p className="text-2xl font-bold font-mono text-foreground mt-1">{payroll.summary.totalHours}</p>
          </div>
          <div className="p-5 rounded-2xl border border-border/80 bg-card">
            <span className="text-xs text-muted-foreground font-semibold">Gross Pay</span>
            <p className="text-2xl font-bold text-foreground mt-1">{formatCurrency(payroll.summary.grossPay)}</p>
          </div>
          <div className="p-5 rounded-2xl border border-border/80 bg-card">
            <span className="text-xs text-muted-foreground font-semibold">Deductions</span>
            <p className="text-2xl font-bold text-amber-600 mt-1">{formatCurrency(payroll.summary.deductions)}</p>
          </div>
          <div className="p-5 rounded-2xl border border-border/80 bg-card">
            <span className="text-xs text-muted-foreground font-semibold">Net Pay</span>
            <p className="text-2xl font-bold text-emerald-600 mt-1">{formatCurrency(payroll.summary.netPay)}</p>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-secondary/40 border-b border-border/60 text-muted-foreground uppercase text-[10px] tracking-wider font-semibold">
              <tr>
                <th className="p-4">Employee</th>
                <th className="p-4">Pay Type</th>
                <th className="p-4">Hourly</th>
                <th className="p-4">Monthly</th>
                <th className="p-4">Shifts</th>
                <th className="p-4">Hours</th>
                <th className="p-4">Gross</th>
                <th className="p-4">Net</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {employees.map((employee) => {
                const draft = draftFor(employee)
                return (
                  <tr key={employee.id} className="hover:bg-secondary/20">
                    <td className="p-4">
                      <p className="font-semibold text-foreground">{employee.firstName} {employee.lastName}</p>
                      <p className="text-[11px] text-muted-foreground">{employee.position || 'Staff'}</p>
                    </td>
                    <td className="p-4">
                      <select value={draft.payrollType} onChange={(e) => setDraft(employee.id, { payrollType: e.target.value as PayType })} className="h-8 rounded-lg border border-input bg-background px-2 text-xs">
                        <option value="HOURLY">Hourly</option>
                        <option value="MONTHLY">Monthly</option>
                      </select>
                    </td>
                    <td className="p-4">
                      <Input type="number" min={0} step="0.01" value={draft.hourlyRate} onChange={(e) => setDraft(employee.id, { hourlyRate: Number(e.target.value) })} className="h-8 w-24 rounded-lg text-xs" />
                    </td>
                    <td className="p-4">
                      <Input type="number" min={0} step="0.01" value={draft.monthlySalary} onChange={(e) => setDraft(employee.id, { monthlySalary: Number(e.target.value) })} className="h-8 w-28 rounded-lg text-xs" />
                    </td>
                    <td className="p-4 font-mono">{employee.shiftCount}</td>
                    <td className="p-4 font-mono">{employee.totalHours}</td>
                    <td className="p-4 font-semibold">{formatCurrency(employee.grossPay)}</td>
                    <td className="p-4 font-bold text-emerald-600">{formatCurrency(employee.netPay)}</td>
                    <td className="p-4 text-right">
                      <Button size="sm" variant="ghost" disabled={updateMutation.isPending} onClick={() => updateMutation.mutate({ id: employee.id, data: draft })} className="h-8 rounded-lg text-xs">
                        <Save className="h-3.5 w-3.5 mr-1.5" />
                        Save
                      </Button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {employees.length === 0 && (
          <div className="p-10 text-center text-xs text-muted-foreground">
            <Badge variant="outline">No employees found</Badge>
          </div>
        )}
      </div>
    </div>
  )
}
