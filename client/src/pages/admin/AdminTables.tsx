import React, { useState, useRef } from 'react'
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
  Smartphone
} from 'lucide-react'
import { toast } from 'sonner'

interface TableItem {
  id: number
  name: string
  zone?: string
}

const DEFAULT_TABLES: TableItem[] = [
  { id: 1, name: 'Mesa 1', zone: 'Salón Principal' },
  { id: 2, name: 'Mesa 2', zone: 'Salón Principal' },
  { id: 3, name: 'Mesa 3', zone: 'Salón Principal' },
  { id: 4, name: 'Mesa 4', zone: 'Ventana' },
  { id: 5, name: 'Mesa 5', zone: 'Ventana' },
  { id: 6, name: 'Mesa 6', zone: 'Terraza' },
  { id: 7, name: 'Mesa 7', zone: 'Terraza' },
  { id: 8, name: 'Mesa 8', zone: 'Barra' },
]

export default function AdminTables() {
  const [tables, setTables] = useState<TableItem[]>(() => {
    const saved = localStorage.getItem('cafe_admin_tables')
    if (saved) {
      try {
        return JSON.parse(saved)
      } catch {
        return DEFAULT_TABLES
      }
    }
    return DEFAULT_TABLES
  })

  const [selectedTable, setSelectedTable] = useState<TableItem>(tables[0] || DEFAULT_TABLES[0])
  const [newTableNum, setNewTableNum] = useState<string>('')
  const [newTableZone, setNewTableZone] = useState<string>('Salón Principal')
  const [printDialogOpen, setPrintDialogOpen] = useState<boolean>(false)
  const qrRef = useRef<HTMLDivElement>(null)

  const saveTables = (newTables: TableItem[]) => {
    setTables(newTables)
    localStorage.setItem('cafe_admin_tables', JSON.stringify(newTables))
  }

  const handleAddTable = (e: React.FormEvent) => {
    e.preventDefault()
    const num = parseInt(newTableNum, 10)
    if (isNaN(num) || num <= 0) {
      toast.error('Ingresa un número de mesa válido')
      return
    }
    if (tables.some((t) => t.id === num)) {
      toast.error(`La Mesa #${num} ya existe en el listado`)
      return
    }

    const updated = [...tables, { id: num, name: `Mesa ${num}`, zone: newTableZone }].sort((a, b) => a.id - b.id)
    saveTables(updated)
    setNewTableNum('')
    toast.success(`Mesa #${num} agregada con éxito`)
  }

  const handleDeleteTable = (id: number) => {
    const updated = tables.filter((t) => t.id !== id)
    saveTables(updated)
    if (selectedTable.id === id && updated.length > 0) {
      setSelectedTable(updated[0])
    }
    toast.success('Mesa eliminada')
  }

  const originUrl = typeof window !== 'undefined' ? window.location.origin : ''
  const getTableUrl = (tableId: number) => `${originUrl}/menu?table=${tableId}`

  const downloadQrCode = (table: TableItem) => {
    const canvas = document.getElementById(`qr-canvas-${table.id}`) as HTMLCanvasElement
    if (!canvas) {
      toast.error('No se pudo generar la imagen del código QR')
      return
    }
    const url = canvas.toDataURL('image/png')
    const link = document.createElement('a')
    link.download = `QR-Mesa-${table.id}-The-Coffee-Bean.png`
    link.href = url
    link.click()
    toast.success(`Código QR de ${table.name} descargado`)
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-foreground tracking-tight flex items-center gap-2.5">
            <QrCode className="w-7 h-7 text-[#7C4EEE]" />
            <span>Generador de Códigos QR para Mesas</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Genera, personaliza, descarga e imprime códigos QR para que los comensales ordenen directamente desde su mesa.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => setPrintDialogOpen(true)}
            className="rounded-xl bg-[#7C4EEE] hover:bg-[#683BD6] text-white text-xs font-semibold shadow-sm flex items-center gap-2"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir Tarjeta de Mesa</span>
          </Button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Table List & Add */}
        <div className="lg:col-span-5 space-y-4">
          {/* Add Table Card */}
          <div className="p-4 rounded-2xl border border-border/80 bg-card shadow-xs space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
              Agregar Nueva Mesa
            </span>
            <form onSubmit={handleAddTable} className="flex gap-2">
              <Input
                type="number"
                placeholder="Número (ej. 9)"
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
                <option value="Salón Principal">Salón</option>
                <option value="Terraza">Terraza</option>
                <option value="Ventana">Ventana</option>
                <option value="Barra">Barra</option>
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
                Mesas Registradas ({tables.length})
              </span>
              <Badge className="bg-[#7C4EEE]/10 text-[#7C4EEE] border-[#7C4EEE]/20 text-[10px]">
                Activas
              </Badge>
            </div>

            <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1 scrollbar-thin">
              {tables.map((table) => {
                const isSelected = selectedTable.id === table.id
                return (
                  <div
                    key={table.id}
                    onClick={() => setSelectedTable(table)}
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
                        onClick={() => downloadQrCode(table)}
                        className="h-8 w-8 p-0 rounded-lg text-muted-foreground hover:text-foreground"
                        title="Descargar QR"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteTable(table.id)}
                        className="h-8 w-8 p-0 rounded-lg text-rose-500 hover:text-rose-600 hover:bg-rose-50"
                        title="Eliminar Mesa"
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
                  Vista Previa en Vivo
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
                <span>Probar enlace de cliente</span>
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
                    id={`qr-canvas-${selectedTable.id}`}
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
                    Escanea para ordenar desde tu móvil
                  </span>
                </div>
              </div>

              <div className="space-y-3 text-xs flex-1">
                <div className="space-y-1">
                  <span className="text-muted-foreground font-medium">Enlace Destino del QR:</span>
                  <div className="p-2.5 rounded-xl bg-card border border-border text-[11px] font-mono text-foreground break-all select-all">
                    {getTableUrl(selectedTable.id)}
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Smartphone className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Al escanearlo, el cliente entra al menú con la <strong>Mesa #{selectedTable.id}</strong> preseleccionada.</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Las comandas enviadas a cocina mostrarán automáticamente la etiqueta <strong>Mesa #{selectedTable.id}</strong>.</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 pt-3">
                  <Button
                    onClick={() => downloadQrCode(selectedTable)}
                    size="sm"
                    className="rounded-xl bg-[#7C4EEE] hover:bg-[#683BD6] text-white text-xs font-semibold"
                  >
                    <Download className="w-3.5 h-3.5 mr-1.5" />
                    <span>Descargar PNG</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPrintDialogOpen(true)}
                    className="rounded-xl text-xs font-semibold"
                  >
                    <Printer className="w-3.5 h-3.5 mr-1.5" />
                    <span>Imprimir Caballete</span>
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
              <span>Imprimir Tarjeta de Mesa #{selectedTable.id}</span>
            </DialogTitle>
          </DialogHeader>

          {/* Printable Layout */}
          <div className="p-6 rounded-2xl bg-white text-black border border-zinc-300 shadow-md flex flex-col items-center text-center space-y-4 my-2">
            <div className="flex items-center gap-2 text-zinc-900 font-serif font-bold text-lg">
              <div className="w-8 h-8 rounded-lg bg-zinc-900 text-amber-400 flex items-center justify-center">
                <Coffee className="w-5 h-5" />
              </div>
              <div className="text-left">
                <span className="block leading-none">The Coffee Bean</span>
                <span className="text-[9px] uppercase tracking-widest text-zinc-500">Cafe & Roastery</span>
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
                ¡Ordena desde tu mesa!
              </p>
              <p className="text-xs text-zinc-600 max-w-xs">
                Escanea el código QR con la cámara de tu smartphone para ver la carta y pedir sin esperas.
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
              Cerrar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handlePrint}
              className="rounded-xl bg-[#7C4EEE] hover:bg-[#683BD6] text-white px-4"
            >
              <Printer className="w-4 h-4 mr-1.5" />
              <span>Imprimir Ahora</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
