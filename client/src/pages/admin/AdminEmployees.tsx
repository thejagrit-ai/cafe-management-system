import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { employeesApi, type EmployeeQueryParams } from '@/api/employees'
import { employeeOpsApi, type EmployeePermission } from '@/api/growth'
import type { Employee } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDate } from '@/utils/lib'
import { Plus, Search, Edit2, KeyRound, ChevronLeft, ChevronRight, Users, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'

const getErrorMessage = (err: any, fallback: string): string => {
  if (err?.errors && typeof err.errors === 'object') {
    const messages = Object.values(err.errors).flat()
    if (messages.length > 0) return messages.join('. ')
  }
  return err?.message || err?.error || fallback
}

const employeeSchema = z.object({
  email: z.string().email('validation.invalidEmail'),
  password: z.string().min(8, 'validation.passwordMin8'),
  firstName: z.string().min(1, 'validation.nameRequired'),
  lastName: z.string().min(1, 'validation.lastNameRequired'),
  phone: z.string().optional(),
  position: z.string().optional(),
})

type EmployeeFormData = z.infer<typeof employeeSchema>

const editEmployeeSchema = z.object({
  firstName: z.string().min(1, 'validation.nameRequired'),
  lastName: z.string().min(1, 'validation.lastNameRequired'),
  phone: z.string().optional(),
  position: z.string().optional(),
  isActive: z.boolean(),
})

type EditEmployeeFormData = z.infer<typeof editEmployeeSchema>

const resetPasswordSchema = z.object({
  password: z.string().min(8, 'validation.passwordMin8'),
})

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>

export default function AdminEmployees() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState(false)
  const [permissionsDialogOpen, setPermissionsDialogOpen] = useState(false)
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)
  const limit = 10

  const queryParams: EmployeeQueryParams = { page, limit, search }

  const { data, isLoading } = useQuery({
    queryKey: ['employees', queryParams],
    queryFn: () => employeesApi.getAll(queryParams),
  })

  const { data: permissionsData } = useQuery({
    queryKey: ['employee-permissions', selectedEmployee?.id],
    queryFn: () => employeeOpsApi.getPermissions(selectedEmployee!.id),
    enabled: permissionsDialogOpen && !!selectedEmployee?.id,
  })

  const { data: shiftsData } = useQuery({
    queryKey: ['admin-employee-shifts'],
    queryFn: () => employeeOpsApi.getShifts({ page: 1, limit: 8 }),
  })

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EmployeeFormData>({
    resolver: zodResolver(employeeSchema),
    defaultValues: { email: '', password: '', firstName: '', lastName: '', phone: '', position: 'Barista' },
  })

  const {
    register: registerEdit,
    handleSubmit: handleEditSubmit,
    reset: resetEdit,
    setValue: setEditValue,
  } = useForm<EditEmployeeFormData>({
    resolver: zodResolver(editEmployeeSchema),
  })

  const {
    register: registerReset,
    handleSubmit: handleResetSubmit,
    reset: resetResetPassword,
    formState: { errors: resetErrors },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
  })

  const createMutation = useMutation({
    mutationFn: (data: EmployeeFormData) => employeesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] })
      toast.success(t('adminEmployees.created'))
      setDialogOpen(false)
      reset()
    },
    onError: (err: any) => toast.error(getErrorMessage(err, t('adminEmployees.createError'))),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: EditEmployeeFormData }) =>
      employeesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] })
      toast.success(t('adminEmployees.updated'))
      setEditDialogOpen(false)
      setSelectedEmployee(null)
      resetEdit()
    },
    onError: (err: any) => toast.error(getErrorMessage(err, t('adminEmployees.updateError'))),
  })

  const resetPasswordMutation = useMutation({
    mutationFn: ({ id, password }: { id: string; password: string }) =>
      employeesApi.resetPassword(id, password),
    onSuccess: () => {
      toast.success(t('adminEmployees.passwordReset'))
      setResetPasswordDialogOpen(false)
      setSelectedEmployee(null)
      resetResetPassword()
    },
    onError: (err: any) => toast.error(getErrorMessage(err, t('adminEmployees.resetError'))),
  })

  const permissionsMutation = useMutation({
    mutationFn: ({ employeeId, permissions }: { employeeId: string; permissions: EmployeePermission[] }) =>
      employeeOpsApi.setPermissions(employeeId, permissions),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-permissions', selectedEmployee?.id] })
      toast.success('Permissions updated')
    },
    onError: (err: any) => toast.error(getErrorMessage(err, 'Unable to update permissions')),
  })

  const employees = data?.data ?? []
  const pagination = data?.pagination

  const handleEdit = (emp: Employee) => {
    setSelectedEmployee(emp)
    setEditValue('firstName', emp.firstName)
    setEditValue('lastName', emp.lastName)
    setEditValue('phone', emp.phone ?? '')
    setEditValue('position', emp.position ?? '')
    setEditValue('isActive', emp.isActive)
    setEditDialogOpen(true)
  }

  const handleResetPassword = (emp: Employee) => {
    setSelectedEmployee(emp)
    resetResetPassword()
    setResetPasswordDialogOpen(true)
  }

  const handlePermissions = (emp: Employee) => {
    setSelectedEmployee(emp)
    setPermissionsDialogOpen(true)
  }

  const togglePermission = (permission: EmployeePermission) => {
    if (!selectedEmployee || !permissionsData?.data) return
    const next = permissionsData.data.map((item) =>
      item.permission === permission.permission ? { ...item, enabled: !item.enabled } : item
    )
    permissionsMutation.mutate({ employeeId: selectedEmployee.id, permissions: next })
  }

  const onSubmit = (formData: EmployeeFormData) => {
    createMutation.mutate(formData)
  }

  const onEditSubmit = (formData: EditEmployeeFormData) => {
    if (selectedEmployee) {
      updateMutation.mutate({ id: selectedEmployee.id, data: formData })
    }
  }

  const onResetSubmit = (formData: ResetPasswordFormData) => {
    if (selectedEmployee) {
      resetPasswordMutation.mutate({ id: selectedEmployee.id, password: formData.password })
    }
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-foreground tracking-tight">
            {t('adminEmployees.title')}
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            {t('adminEmployees.subtitle')}
          </p>
        </div>

        <Button
          onClick={() => {
            setSelectedEmployee(null)
            reset()
            setDialogOpen(true)
          }}
          className="rounded-xl bg-[#7C4EEE] hover:bg-[#683BD6] text-white text-xs font-semibold"
        >
          <Plus className="mr-1.5 h-4 w-4" />
          <span>{t('adminEmployees.newEmployee')}</span>
        </Button>
      </div>

      {/* Search */}
      <div className="p-4 rounded-2xl border border-border/80 bg-card flex items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('adminEmployees.searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-10 rounded-xl text-xs"
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-xs">
        {employees.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground space-y-2 text-xs">
            <Users className="w-8 h-8 mx-auto text-muted-foreground stroke-[1.5]" />
            <p className="font-semibold text-foreground text-sm">{t('adminEmployees.empty')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-secondary/40 border-b border-border/60 text-muted-foreground uppercase text-[10px] tracking-wider font-semibold">
                <tr>
                  <th className="p-4">{t('adminEmployees.colEmployee')}</th>
                  <th className="p-4">{t('adminEmployees.colPosition')}</th>
                  <th className="p-4">{t('adminEmployees.colEmail')}</th>
                  <th className="p-4">{t('adminEmployees.colPhone')}</th>
                  <th className="p-4">{t('common.status')}</th>
                  <th className="p-4 text-right">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {employees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-secondary/20 transition-colors">
                    <td className="p-4 font-semibold text-foreground">
                      {emp.firstName} {emp.lastName}
                    </td>
                    <td className="p-4 text-muted-foreground">
                      <Badge variant="outline" className="text-[10px]">
                        {emp.position || t('adminEmployees.defaultPosition')}
                      </Badge>
                    </td>
                    <td className="p-4 text-muted-foreground font-mono">{emp.user?.email}</td>
                    <td className="p-4 text-muted-foreground">{emp.phone || '-'}</td>
                    <td className="p-4">
                      <Badge
                        className={
                          emp.isActive
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]'
                            : 'bg-zinc-100 text-zinc-600 text-[10px]'
                        }
                      >
                        {emp.isActive ? t('common.active') : t('common.inactive')}
                      </Badge>
                    </td>
                    <td className="p-4 text-right space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleResetPassword(emp)}
                        className="rounded-lg text-[11px] h-8 px-2"
                        title={t('adminEmployees.resetPasswordAction')}
                      >
                        <KeyRound className="w-3.5 h-3.5 text-amber-600" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handlePermissions(emp)}
                        className="rounded-lg text-[11px] h-8 px-2"
                        title="Permissions"
                      >
                        <ShieldCheck className="w-3.5 h-3.5 text-[#7C4EEE]" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(emp)}
                        className="rounded-lg text-[11px] h-8 px-2.5"
                      >
                        <Edit2 className="w-3 h-3 mr-1" />
                        <span>{t('common.edit')}</span>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-xs">
        <div className="flex items-center justify-between border-b border-border/60 bg-secondary/30 p-4">
          <div>
            <h2 className="font-serif text-base font-bold text-foreground">Recent Shifts</h2>
            <p className="text-[11px] text-muted-foreground">Clock-in, clock-out, and break tracking for staff.</p>
          </div>
          <Badge className="bg-[#7C4EEE]/10 text-[#7C4EEE] border-[#7C4EEE]/20 text-[10px]">
            {shiftsData?.pagination?.total ?? 0} shifts
          </Badge>
        </div>
        {(shiftsData?.data || []).length === 0 ? (
          <div className="p-8 text-center text-xs text-muted-foreground">No shifts recorded yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-secondary/40 border-b border-border/60 text-muted-foreground uppercase text-[10px] tracking-wider font-semibold">
                <tr>
                  <th className="p-4">Employee</th>
                  <th className="p-4">Clock In</th>
                  <th className="p-4">Clock Out</th>
                  <th className="p-4">Break</th>
                  <th className="p-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {(shiftsData?.data || []).map((shift) => (
                  <tr key={shift.id} className="hover:bg-secondary/20">
                    <td className="p-4 font-semibold text-foreground">{shift.firstName} {shift.lastName}</td>
                    <td className="p-4 text-muted-foreground">{formatDate(shift.clockInAt)}</td>
                    <td className="p-4 text-muted-foreground">{shift.clockOutAt ? formatDate(shift.clockOutAt) : '-'}</td>
                    <td className="p-4 font-mono">{shift.breakMinutes}m</td>
                    <td className="p-4">
                      <Badge className={shift.status === 'OPEN' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]' : 'bg-zinc-100 text-zinc-600 text-[10px]'}>
                        {shift.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t border-border/60 text-xs text-muted-foreground">
          <p>
            {t('common.pageOf', {
              page: pagination.page,
              totalPages: pagination.totalPages,
              total: pagination.total,
              unit: t('adminEmployees.unit'),
            })}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="rounded-xl"
            >
              <ChevronLeft className="h-3.5 w-3.5 mr-1" />
              <span>{t('common.previous')}</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= pagination.totalPages}
              className="rounded-xl"
            >
              <span>{t('common.next')}</span>
              <ChevronRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-serif text-lg">{t('adminEmployees.newMemberTitle')}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">{t('adminEmployees.fieldFirstNameRequired')}</Label>
                <Input {...register('firstName')} placeholder={t('adminEmployees.fieldFirstNamePlaceholder')} className="h-9 rounded-xl" />
                {errors.firstName && <p className="text-rose-500 text-[10px]">{t(errors.firstName.message as string)}</p>}
              </div>

              <div className="space-y-1">
                <Label className="text-xs">{t('adminEmployees.fieldLastNameRequired')}</Label>
                <Input {...register('lastName')} placeholder={t('adminEmployees.fieldLastNamePlaceholder')} className="h-9 rounded-xl" />
                {errors.lastName && <p className="text-rose-500 text-[10px]">{t(errors.lastName.message as string)}</p>}
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">{t('adminEmployees.fieldPosition')}</Label>
              <Input {...register('position')} placeholder={t('adminEmployees.fieldPositionPlaceholder')} className="h-9 rounded-xl" />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">{t('adminEmployees.fieldEmail')}</Label>
              <Input type="email" {...register('email')} placeholder="andres@cafe.com" className="h-9 rounded-xl" />
              {errors.email && <p className="text-rose-500 text-[10px]">{t(errors.email.message as string)}</p>}
            </div>

            <div className="space-y-1">
              <Label className="text-xs">{t('adminEmployees.fieldPassword')}</Label>
              <Input type="password" {...register('password')} placeholder="••••••••" className="h-9 rounded-xl" />
              {errors.password && <p className="text-rose-500 text-[10px]">{t(errors.password.message as string)}</p>}
            </div>

            <div className="space-y-1">
              <Label className="text-xs">{t('adminEmployees.fieldPhone')}</Label>
              <Input {...register('phone')} placeholder="+57 300 000 0000" className="h-9 rounded-xl" />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setDialogOpen(false)} className="rounded-xl">
                {t('common.cancel')}
              </Button>
              <Button type="submit" size="sm" className="rounded-xl bg-[#7C4EEE] hover:bg-[#683BD6] text-white">
                {t('adminEmployees.create')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-serif text-lg">{t('adminEmployees.editTitle')}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleEditSubmit(onEditSubmit)} className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">{t('adminEmployees.fieldFirstName')}</Label>
                <Input {...registerEdit('firstName')} className="h-9 rounded-xl" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{t('adminEmployees.fieldLastName')}</Label>
                <Input {...registerEdit('lastName')} className="h-9 rounded-xl" />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">{t('adminEmployees.colPosition')}</Label>
              <Input {...registerEdit('position')} className="h-9 rounded-xl" />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">{t('adminEmployees.fieldPhone')}</Label>
              <Input {...registerEdit('phone')} className="h-9 rounded-xl" />
            </div>

            <div className="flex items-center pt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" {...registerEdit('isActive')} className="rounded accent-[#7C4EEE]" />
                <span className="text-xs">{t('adminEmployees.activeToggle')}</span>
              </label>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setEditDialogOpen(false)} className="rounded-xl">
                {t('common.cancel')}
              </Button>
              <Button type="submit" size="sm" className="rounded-xl bg-[#7C4EEE] hover:bg-[#683BD6] text-white">
                {t('adminEmployees.saveChanges')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={resetPasswordDialogOpen} onOpenChange={setResetPasswordDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-serif text-lg">
              {t('adminEmployees.resetPasswordTitle')} · {selectedEmployee?.firstName}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleResetSubmit(onResetSubmit)} className="space-y-4 text-xs">
            <div className="space-y-1">
              <Label className="text-xs">{t('adminEmployees.newPassword')}</Label>
              <Input
                type="password"
                {...registerReset('password')}
                placeholder={t('adminEmployees.newPasswordPlaceholder')}
                className="h-9 rounded-xl"
              />
              {resetErrors.password && <p className="text-rose-500 text-[10px]">{t(resetErrors.password.message as string)}</p>}
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setResetPasswordDialogOpen(false)} className="rounded-xl">
                {t('common.cancel')}
              </Button>
              <Button type="submit" size="sm" className="rounded-xl bg-amber-600 hover:bg-amber-700 text-white">
                {t('adminEmployees.updatePassword')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={permissionsDialogOpen} onOpenChange={setPermissionsDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-serif text-lg">
              Permissions · {selectedEmployee?.firstName}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-2 text-xs">
            {(permissionsData?.data || []).map((permission) => (
              <button
                key={permission.permission}
                type="button"
                onClick={() => togglePermission(permission)}
                disabled={permissionsMutation.isPending}
                className="flex w-full items-center justify-between rounded-xl border border-border bg-secondary/20 p-3 text-left transition-colors hover:bg-secondary/40"
              >
                <span className="font-semibold text-foreground">{permission.permission.replace(/_/g, ' ')}</span>
                <Badge className={permission.enabled ? 'bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]' : 'bg-rose-50 text-rose-700 border-rose-200 text-[10px]'}>
                  {permission.enabled ? 'Enabled' : 'Disabled'}
                </Badge>
              </button>
            ))}
            {permissionsData?.data?.length === 0 && (
              <p className="py-6 text-center text-muted-foreground">No permissions available.</p>
            )}
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setPermissionsDialogOpen(false)} className="rounded-xl">
              {t('common.close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
