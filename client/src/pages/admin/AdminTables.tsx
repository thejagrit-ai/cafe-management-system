import React, { useState, useRef, useMemo, useCallback } from 'react'
import { QRCodeCanvas } from 'qrcode.react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import {
  QrCode,
  Download,
  Printer,
  ExternalLink,
  Plus,
  Trash2,
  Coffee,
  Check,
  Copy,
  AlertTriangle,
  Smartphone,
  Globe
} from 'lucide-react'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'

interface TableItem {
  id: number
  name: string
  zone?: string
}

const DEFAULT_TABLES: TableItem[] = [
  { id: 1, name: 'Table 1', zone: 'Main Hall' },
  { id: 2, name: 'Table 2', zone: 'Main Hall' },
  { id: 3, name: 'Table 3', zone: 'Main Hall' },
  { id: 4, name: 'Table 4', zone: 'Window' },
  { id: 5, name: 'Table 5', zone: 'Window' },
  { id: 6, name: 'Table 6', zone: 'Terrace' },
  { id: 7, name: 'Table 7', zone: 'Terrace' },
  { id: 8, name: 'Table 8', zone: 'Bar' },
]

const BASE_URL_STORAGE_KEY = 'cafe_public_base_url'

/** Trims trailing slashes and supplies a scheme, so `cafe.com` becomes `https://cafe.com`. */
function normalizeBaseUrl(raw: string): string {
  const trimmed = raw.trim().replace(/\/+$/, '')
  if (!trimmed) return ''
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  return `https://${trimmed}`
}

/**
 * The address customers should land on when they scan a table code.
 *
 * `window.location.origin` alone is wrong whenever the console is open on a
 * host phones cannot resolve — `localhost` during development, or a preview
 * deploy — which produced QR codes that simply never opened the menu. The
 * saved override wins, then the build-time public URL, then the origin.
 */
function resolveInitialBaseUrl(): string {
  try {
    const saved = localStorage.getItem(BASE_URL_STORAGE_KEY)
    if (saved) return normalizeBaseUrl(saved)
  } catch {
    // localStorage can be unavailable in private-browsing modes.
  }
  const configured = import.meta.env.VITE_PUBLIC_URL
  if (configured) return normalizeBaseUrl(configured)
  return typeof window !== 'undefined' ? window.location.origin : ''
}

type Reachability = 'ok' | 'unreachable' | 'lan-only'

/** Flags base URLs that a customer's phone will not be able to open. */
function classifyReachability(baseUrl: string): Reachability {
  let hostname: string
  try {
    hostname = new URL(baseUrl).hostname
  } catch {
    return 'unreachable'
  }

  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') {
    return 'unreachable'
  }
  // A single-label host such as `cafe-server-gqky` has no public DNS record, so
  // a scanning phone gets DNS_PROBE_FINISHED_BAD_CONFIG rather than the menu.
  // This is not hypothetical: Render's `fromService … property: host` blueprint
  // value resolves to exactly that shape, and without this check the panel
  // reported the resulting address as fine while every printed code was dead.
  if (!hostname.includes('.')) {
    return 'unreachable'
  }
  // Private ranges resolve only for devices on the same network.
  if (/^10\./.test(hostname) || /^192\.168\./.test(hostname) || /^172\.(1[6-9]|2\d|3[01])\./.test(hostname)) {
    return 'lan-only'
  }
  return 'ok'
}

export default function AdminTables() {
  const { t } = useTranslation()
  const [tables, setTables] = useState<TableItem[]>(() => {
    const saved = localStorage.getItem('cafe_admin_tables')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length > 0) return parsed
      } catch {
        return DEFAULT_TABLES
      }
    }
    return DEFAULT_TABLES
  })

  const [selectedTableId, setSelectedTableId] = useState<number>(() => (tables[0] ?? DEFAULT_TABLES[0]).id)
  const [newTableNum, setNewTableNum] = useState<string>('')
  const [newTableZone, setNewTableZone] = useState<string>('Main Hall')
  const [printDialogOpen, setPrintDialogOpen] = useState<boolean>(false)
  const [baseUrl, setBaseUrl] = useState<string>(resolveInitialBaseUrl)
  const [baseUrlDraft, setBaseUrlDraft] = useState<string>(resolveInitialBaseUrl)
  const qrRef = useRef<HTMLDivElement>(null)

  // Derived rather than stored: keeping a copy of the selected table in state
  // let it go stale when the list changed underneath it.
  const selectedTable = useMemo(
    () => tables.find((t) => t.id === selectedTableId) ?? tables[0] ?? DEFAULT_TABLES[0],
    [tables, selectedTableId]
  )

  const reachability = useMemo(() => classifyReachability(baseUrl), [baseUrl])

  const saveTables = (newTables: TableItem[]) => {
    setTables(newTables)
    localStorage.setItem('cafe_admin_tables', JSON.stringify(newTables))
  }

  const handleAddTable = (e: React.FormEvent) => {
    e.preventDefault()
    const num = parseInt(newTableNum, 10)
    if (isNaN(num) || num <= 0) {
      toast.error(t('adminTables.invalidTableNumber'))
      return
    }
    if (tables.some((t) => t.id === num)) {
      toast.error(t('adminTables.tableExists', { number: num }))
      return
    }

    const updated = [...tables, { id: num, name: `Table ${num}`, zone: newTableZone }].sort((a, b) => a.id - b.id)
    saveTables(updated)
    setNewTableNum('')
    toast.success(t('adminTables.tableAdded', { number: num }))
  }

  const handleDeleteTable = (id: number) => {
    const updated = tables.filter((t) => t.id !== id)
    saveTables(updated)
    if (selectedTableId === id && updated.length > 0) {
      setSelectedTableId(updated[0].id)
    }
    toast.success(t('adminTables.tableDeleted'))
  }

  const getTableUrl = useCallback(
    (tableId: number) => `${baseUrl}/menu?table=${tableId}`,
    [baseUrl]
  )

  const applyBaseUrl = (e: React.FormEvent) => {
    e.preventDefault()
    const normalized = normalizeBaseUrl(baseUrlDraft)
    if (!normalized) {
      toast.error(t('adminTables.enterPublicUrl'))
      return
    }
    try {
      // Constructed purely for its parse-or-throw behaviour.
      new URL(normalized)
    } catch {
      toast.error(t('adminTables.invalidUrl'))
      return
    }
    setBaseUrl(normalized)
    setBaseUrlDraft(normalized)
    localStorage.setItem(BASE_URL_STORAGE_KEY, normalized)
    toast.success(t('adminTables.urlUpdated'))
  }

  const downloadQrCode = (table: TableItem) => {
    // Every table renders an off-screen canvas, so downloading a row that is
    // not the one previewed works too — previously only the selected table had
    // a canvas in the DOM and the others failed silently.
    const canvas = document.getElementById(`qr-canvas-${table.id}`) as HTMLCanvasElement | null
    if (!canvas) {
      toast.error(t('adminTables.qrGenerateFailed'))
      return
    }
    const url = canvas.toDataURL('image/png')
    const link = document.createElement('a')
    link.download = `QR-Table-${table.id}-The-Coffee-Bean.png`
    link.href = url
    link.click()
    toast.success(t('adminTables.qrDownloaded', { name: table.name }))
  }

  const copyTableUrl = async (table: TableItem) => {
    try {
      await navigator.clipboard.writeText(getTableUrl(table.id))
      toast.success(t('adminTables.linkCopied', { name: table.name }))
    } catch {
      toast.error(t('adminTables.copyFailed'))
    }
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="space-y-6">
      {/* Off-screen canvases: one per table, so the download button works from
          any row without first selecting it. */}
      <div aria-hidden="true" className="pointer-events-none fixed -left-[9999px] top-0 opacity-0">
        {tables.map((table) => (
          <QRCodeCanvas
            key={table.id}
            id={`qr-canvas-${table.id}`}
            value={getTableUrl(table.id)}
            size={512}
            level="H"
            includeMargin
          />
        ))}
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-foreground tracking-tight flex items-center gap-2.5">
            <QrCode className="w-7 h-7 text-[#7C4EEE]" />
            <span>{t('adminTables.title')}</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            {t('adminTables.subtitle')}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => setPrintDialogOpen(true)}
            className="rounded-xl bg-[#7C4EEE] hover:bg-[#683BD6] text-white text-xs font-semibold shadow-sm flex items-center gap-2"
          >
            <Printer className="w-4 h-4" />
            <span>{t('adminTables.printCard')}</span>
          </Button>
        </div>
      </div>

      {/* Public site address — the value the QR codes are built from. */}
      <div className="p-4 rounded-2xl border border-border/80 bg-card shadow-xs space-y-3">
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-[#7C4EEE]" />
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            {t('adminTables.publicUrlLabel')}
          </span>
        </div>
        <p className="text-[11px] text-muted-foreground">
          {t('adminTables.publicUrlHelp')}
        </p>
        <form onSubmit={applyBaseUrl} className="flex flex-col sm:flex-row gap-2">
          <Input
            type="text"
            value={baseUrlDraft}
            onChange={(e) => setBaseUrlDraft(e.target.value)}
            placeholder="https://tu-cafe.com"
            className="h-10 rounded-xl text-xs flex-1"
            inputMode="url"
          />
          <Button type="submit" size="sm" className="h-10 rounded-xl bg-[#7C4EEE] text-white px-4 text-xs">
            {t('adminTables.saveAndRegenerate')}
          </Button>
        </form>

        {reachability === 'unreachable' && (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 dark:bg-amber-950/40 dark:border-amber-900 dark:text-amber-200">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="text-[11px]">
              <strong>{t('adminTables.unreachableStrong')}</strong> {t('adminTables.unreachableBody1')}{' '}
              <code className="font-mono">{baseUrl || '—'}</code>
              {t('adminTables.unreachableBody2')}{' '}
              <code className="font-mono">https://tu-cafe.com</code>
              {t('adminTables.unreachableBody3')}
            </span>
          </div>
        )}

        {reachability === 'lan-only' && (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-sky-50 border border-sky-200 text-sky-800 dark:bg-sky-950/40 dark:border-sky-900 dark:text-sky-200">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="text-[11px]">
              {t('adminTables.lanOnlyWarning')}
            </span>
          </div>
        )}

        {reachability === 'ok' && (
          <div className="flex items-center gap-2 text-[11px] text-emerald-600 dark:text-emerald-400">
            <Check className="w-3.5 h-3.5 shrink-0" />
            <span>{t('adminTables.reachableOk')}</span>
          </div>
        )}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Table List & Add */}
        <div className="lg:col-span-5 space-y-4">
          {/* Add Table Card */}
          <div className="p-4 rounded-2xl border border-border/80 bg-card shadow-xs space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
              {t('adminTables.addTable')}
            </span>
            <form onSubmit={handleAddTable} className="flex gap-2">
              <Input
                type="number"
                placeholder={t('adminTables.tableNumberPlaceholder')}
                value={newTableNum}
                onChange={(e) => setNewTableNum(e.target.value)}
                className="h-10 rounded-xl text-xs flex-1"
                min={1}
              />
              <select
                value={newTableZone}
                onChange={(e) => setNewTableZone(e.target.value)}
                className="h-10 px-3 rounded-xl border border-border bg-card text-xs font-medium focus:outline-none"
              >
                <option value="Main Hall">{t('adminTables.zoneMain')}</option>
                <option value="Terrace">{t('adminTables.zoneTerrace')}</option>
                <option value="Window">{t('adminTables.zoneWindow')}</option>
                <option value="Bar">{t('adminTables.zoneBar')}</option>
              </select>
              <Button type="submit" size="sm" className="h-10 rounded-xl bg-[#7C4EEE] text-white px-3 text-xs">
                <Plus className="w-4 h-4" />
              </Button>
            </form>
          </div>

          {/* Tables Grid / List */}
          <div className="p-4 rounded-2xl border border-border/80 bg-card shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {t('adminTables.registeredTables', { count: tables.length })}
              </span>
              <Badge className="bg-[#7C4EEE]/10 text-[#7C4EEE] border-[#7C4EEE]/20 text-[10px]">
                {t('adminTables.activeBadge')}
              </Badge>
            </div>

            <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1 scrollbar-thin">
              {tables.length === 0 && (
                <p className="py-8 text-center text-xs text-muted-foreground">
                  {t('adminTables.noTables')}
                </p>
              )}
              {tables.map((table) => {
                const isSelected = selectedTable.id === table.id
                return (
                  <div
                    key={table.id}
                    onClick={() => setSelectedTableId(table.id)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? 'border-[#7C4EEE] bg-[#7C4EEE]/10 shadow-xs'
                        : 'border-border/80 bg-secondary/30 hover:border-border hover:bg-secondary/60'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-xs ${
                          isSelected
                            ? 'bg-[#7C4EEE] text-white'
                            : 'bg-secondary text-foreground'
                        }`}
                      >
                        #{table.id}
                      </div>
                      <div>
                        <span className="font-semibold text-xs text-foreground block">
                          {table.name}
                        </span>
                        {table.zone && (
                          <span className="text-[10px] text-muted-foreground">
                            {table.zone}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyTableUrl(table)}
                        className="h-8 w-8 p-0 rounded-lg text-muted-foreground hover:text-foreground"
                        title={t('adminTables.copyLink')}
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => downloadQrCode(table)}
                        className="h-8 w-8 p-0 rounded-lg text-muted-foreground hover:text-foreground"
                        title={t('adminTables.downloadQr')}
                      >
                        <Download className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteTable(table.id)}
                        className="h-8 w-8 p-0 rounded-lg text-rose-500 hover:text-rose-600 hover:bg-rose-50"
                        title={t('adminTables.deleteTable')}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Right: QR Code Visual Card & Actions */}
        <div className="lg:col-span-7 space-y-4">
          <div className="p-6 rounded-3xl border border-border/80 bg-card shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/60 pb-4">
              <div>
                <span className="text-[10px] uppercase font-bold text-[#7C4EEE] tracking-widest block">
                  {t('adminTables.livePreview')}
                </span>
                <h2 className="text-xl font-serif font-bold text-foreground mt-0.5">
                  {selectedTable.name} {selectedTable.zone ? `· ${selectedTable.zone}` : ''}
                </h2>
              </div>

              <a
                href={getTableUrl(selectedTable.id)}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-[#7C4EEE] hover:underline flex items-center gap-1 font-semibold"
              >
                <span>{t('adminTables.testCustomerLink')}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            {/* Stand Preview Container */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 p-6 rounded-2xl bg-secondary/40 border border-border/70">
              <div
                ref={qrRef}
                className="p-5 rounded-2xl bg-white text-black shadow-lg flex flex-col items-center text-center space-y-3 border border-zinc-200 shrink-0"
                style={{ width: '220px' }}
              >
                <div className="flex items-center gap-1.5 text-zinc-900 font-serif font-bold text-sm">
                  <Coffee className="w-4 h-4 text-amber-700" />
                  <span>The Coffee Bean</span>
                </div>

                <div className="p-2 rounded-xl bg-white border border-zinc-200 shadow-xs">
                  <QRCodeCanvas
                    value={getTableUrl(selectedTable.id)}
                    size={160}
                    level="H"
                    includeMargin={false}
                  />
                </div>

                <div>
                  <span className="font-serif font-bold text-base text-zinc-900 block">
                    {selectedTable.name}
                  </span>
                  <span className="text-[10px] text-zinc-600 block mt-0.5">
                    {t('adminTables.scanToOrder')}
                  </span>
                </div>
              </div>

              <div className="space-y-3 text-xs flex-1">
                <div className="space-y-1">
                  <span className="text-muted-foreground font-medium">{t('adminTables.qrTargetLink')}</span>
                  <div className="p-2.5 rounded-xl bg-card border border-border text-[11px] font-mono text-foreground break-all select-all">
                    {getTableUrl(selectedTable.id)}
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Smartphone className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>
                      {t('adminTables.preselectNote1')}{' '}
                      <strong>{t('staff.tablePrefix')} #{selectedTable.id}</strong>{' '}
                      {t('adminTables.preselectNote2')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>
                      {t('adminTables.kitchenNote1')}{' '}
                      <strong>{t('staff.tablePrefix')} #{selectedTable.id}</strong>
                      {t('adminTables.kitchenNote2')}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 pt-3">
                  <Button
                    onClick={() => downloadQrCode(selectedTable)}
                    size="sm"
                    className="rounded-xl bg-[#7C4EEE] hover:bg-[#683BD6] text-white text-xs font-semibold"
                  >
                    <Download className="w-3.5 h-3.5 mr-1.5" />
                    <span>{t('adminTables.downloadPng')}</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyTableUrl(selectedTable)}
                    className="rounded-xl text-xs font-semibold"
                  >
                    <Copy className="w-3.5 h-3.5 mr-1.5" />
                    <span>{t('adminTables.copyLinkButton')}</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPrintDialogOpen(true)}
                    className="rounded-xl text-xs font-semibold"
                  >
                    <Printer className="w-3.5 h-3.5 mr-1.5" />
                    <span>{t('adminTables.printStand')}</span>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Print Table Stand Modal */}
      <Dialog open={printDialogOpen} onOpenChange={setPrintDialogOpen}>
        <DialogContent className="sm:max-w-lg rounded-2xl bg-card border-border p-6">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl font-bold flex items-center gap-2">
              <Printer className="w-5 h-5 text-[#7C4EEE]" />
              <span>{t('adminTables.printDialogTitle', { number: selectedTable.id })}</span>
            </DialogTitle>
          </DialogHeader>

          {reachability === 'unreachable' && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-[11px] dark:bg-amber-950/40 dark:border-amber-900 dark:text-amber-200">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                {t('adminTables.printWarning')}
              </span>
            </div>
          )}

          {/* Printable Layout */}
          <div className="p-6 rounded-2xl bg-white text-black border border-zinc-300 shadow-md flex flex-col items-center text-center space-y-4 my-2">
            <div className="flex items-center gap-2 text-zinc-900 font-serif font-bold text-lg">
              <div className="w-8 h-8 rounded-lg bg-zinc-900 text-amber-400 flex items-center justify-center">
                <Coffee className="w-5 h-5" />
              </div>
              <div className="text-left">
                <span className="block leading-none">The Coffee Bean</span>
                <span className="text-[9px] uppercase tracking-widest text-zinc-500">Cafe &amp; Roastery</span>
              </div>
            </div>

            <div className="py-1 px-4 rounded-full bg-zinc-100 border border-zinc-200">
              <span className="font-serif font-bold text-xl text-zinc-900">
                {selectedTable.name}
              </span>
            </div>

            <div className="p-3 bg-white border-2 border-zinc-900 rounded-2xl shadow-sm">
              <QRCodeCanvas
                value={getTableUrl(selectedTable.id)}
                size={180}
                level="H"
                includeMargin={true}
              />
            </div>

            <div className="space-y-1">
              <p className="font-serif font-bold text-sm text-zinc-900">
                {t('adminTables.printHeadline')}
              </p>
              <p className="text-xs text-zinc-600 max-w-xs">
                {t('adminTables.printBody')}
              </p>
            </div>
          </div>

          <DialogFooter className="pt-3 border-t border-border/60 gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPrintDialogOpen(false)}
              className="rounded-xl"
            >
              {t('common.close')}
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handlePrint}
              className="rounded-xl bg-[#7C4EEE] hover:bg-[#683BD6] text-white px-4"
            >
              <Printer className="w-4 h-4 mr-1.5" />
              <span>{t('adminTables.printNow')}</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
