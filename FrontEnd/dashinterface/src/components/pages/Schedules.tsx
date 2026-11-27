import { useState, useMemo, useEffect, useRef } from 'react'
import { Search, Loader2, Globe, Ship, Filter, X, Plus, ArrowRight } from 'lucide-react'
import { apiGetEnrichedScheduleRates, apiGetLiners, apiSearchSchedulesBulk } from '../../api'
import type { AggregateScheduleRatesResponse, AggregateRate, LinerRecord, OceanSchedule } from '../../types'
import { linerDisplay } from '../../types'
import PortCombobox from '../shared/PortCombobox'
import TagInput from '../shared/TagInput'
import { COLOR } from '../ui/tokens'
import { Badge, Button, Checkbox, DatePicker, EmptyState, Field, LoadingState, Modal, NumberInput, Tooltip, todayISO } from '../ui'
import { labelClass } from '../ui/controlStyles'
import { cn } from '../../lib/cn'

// ---------------------------------------------------------------------------
// Pivot aggregate response: one row per schedule, rate types as columns
// ---------------------------------------------------------------------------

interface RateCell {
  rate: number
  currency: string
  note: string | null
  validFrom: string
  validTo: string
  freeTime: string | null
  maxWeight: number | null
  transit: string | null
}

interface ScheduleRow {
  scheduleId: number
  linerName: string | null
  vesselName: string | null
  voyageNumber: string | null
  origin: string
  destination: string
  originCity: string | null
  destinationCity: string | null
  etd: string | null
  eta: string | null
  bkCutoff: string | null
  totalDuration: number | null
  scheduleType: string | null
  rates: Record<string, Record<string, RateCell>>
}

const RATE_TYPE_ORDER = ['Tariff', 'FAK', 'Special', 'VBV', 'NAC', 'Contracted']
const CNTR_SORT: Record<string, number> = { '20GP': 0, '40GP': 1, '40HC': 2, '20RF': 3, '40RF': 4, '45HC': 5 }

interface PivotResult {
  rows: ScheduleRow[]
  rateTypes: string[]
  containerTypes: string[]
}

function pivotScheduleData(data: AggregateScheduleRatesResponse): PivotResult {
  const allCntr = new Set<string>()
  const allRT = new Set<string>()
  const rows: ScheduleRow[] = []

  for (const entry of Object.values(data)) {
    const s = entry.schedule
    const rates: Record<string, Record<string, RateCell>> = {}

    const add = (arr: AggregateRate[], rt: string) => {
      for (const r of arr) {
        allCntr.add(r.container_type)
        allRT.add(rt)
        if (!rates[rt]) rates[rt] = {}
        const prev = rates[rt][r.container_type]
        if (!prev || r.rate < prev.rate) {
          rates[rt][r.container_type] = {
            rate: r.rate,
            currency: r.currency,
            note: r.note ?? r.special_remark ?? null,
            validFrom: r.valid_from,
            validTo: r.valid_to,
            freeTime: r.free_time,
            maxWeight: r.max_weight,
            transit: r.transit,
          }
        }
      }
    }

    add(entry.tariff_rates, 'Tariff')
    add(entry.fak_rates, 'FAK')
    add(entry.special_rate, 'Special')
    add(entry.vessel_by_vessel_rate, 'VBV')
    if (entry.nac) add(entry.nac, 'NAC')
    if (entry.contracted_rates) add(entry.contracted_rates, 'Contracted')

    rows.push({
      scheduleId: s.schedule_id,
      linerName: s.liner_name ?? null,
      vesselName: s.vessel_name ?? null,
      voyageNumber: s.voyage_number ?? null,
      origin: s.origin_unloc ?? '',
      destination: s.destination_unloc ?? '',
      originCity: s.origin_city_name ?? null,
      destinationCity: s.destination_city_name ?? null,
      etd: s.origin_departure_date,
      eta: s.destination_arrival_date,
      bkCutoff: s.bk_cutoff ?? null,
      totalDuration: s.total_duration,
      scheduleType: s.schedule_type,
      rates,
    })
  }

  const containerTypes = [...allCntr].sort((a, b) => {
    const oa = CNTR_SORT[a] ?? 99, ob = CNTR_SORT[b] ?? 99
    return oa !== ob ? oa - ob : a.localeCompare(b)
  })
  const rateTypes = RATE_TYPE_ORDER.filter(rt => allRT.has(rt))

  return { rows, rateTypes, containerTypes }
}

// ---------------------------------------------------------------------------
// Pivot rate table - schedule cols + rate-type x container-type columns
// ---------------------------------------------------------------------------

const RATE_COLORS: Record<string, string> = {
  Tariff: '#2563eb', FAK: '#7c3aed', Special: '#d97706', VBV: '#16a34a',
  NAC: '#0891b2', Contracted: '#dc2626',
}

// Header and body cell classes for the dense 11px data grids
const GRID_TH = 'whitespace-nowrap border-l border-white/20 px-1 py-1.5 text-center text-label font-bold tracking-label text-white'
const GRID_TD = 'border-b border-l border-line-soft px-1 py-1.5 align-middle text-label text-fg'
const SEARCH_TH = 'whitespace-nowrap border-l border-white/20 px-1.5 py-1.5 text-left text-label font-bold tracking-label text-white'
const SEARCH_TD = 'border-b border-l border-line-soft px-1.5 py-1.5 align-middle text-label text-fg'
const CARD = 'mb-5 flex flex-col gap-3.5 rounded-card border border-line-soft bg-surface p-4'

function PivotRateTable({ rows, rateTypes, containerTypes, emptyMessage }: {
  rows: ScheduleRow[]
  rateTypes: string[]
  containerTypes: string[]
  emptyMessage?: string
}) {
  const [fCarrier, setFCarrier] = useState<Set<string>>(new Set())
  const [fCutoff, setFCutoff] = useState<Set<string>>(new Set())
  const [fOrigin, setFOrigin] = useState<Set<string>>(new Set())
  const [fDest, setFDest] = useState<Set<string>>(new Set())
  const [openFilter, setOpenFilter] = useState<string | null>(null)
  const filterBarRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setFCarrier(new Set()); setFCutoff(new Set()); setFOrigin(new Set()); setFDest(new Set()); setOpenFilter(null)
  }, [rows])

  useEffect(() => {
    if (!openFilter) return
    const handler = (e: MouseEvent) => {
      if (filterBarRef.current && !filterBarRef.current.contains(e.target as Node)) setOpenFilter(null)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [openFilter])

  const fmtDate = (d: string | null) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '-'

  const distinct = useMemo(() => {
    const carriers = new Map<string, number>()
    const cutoffs = new Map<string, number>()
    const origins = new Map<string, number>()
    const destinations = new Map<string, number>()
    for (const r of rows) {
      const c = r.linerName || '-'; carriers.set(c, (carriers.get(c) ?? 0) + 1)
      const co = fmtDate(r.bkCutoff); cutoffs.set(co, (cutoffs.get(co) ?? 0) + 1)
      const o = r.originCity || r.origin || '-'; origins.set(o, (origins.get(o) ?? 0) + 1)
      const d = r.destinationCity || r.destination || '-'; destinations.set(d, (destinations.get(d) ?? 0) + 1)
    }
    return { carriers, cutoffs, origins, destinations }
  }, [rows]) // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = useMemo(() => {
    if (!fCarrier.size && !fCutoff.size && !fOrigin.size && !fDest.size) return rows
    return rows.filter(r => {
      if (fCarrier.size && !fCarrier.has(r.linerName || '-')) return false
      if (fCutoff.size && !fCutoff.has(fmtDate(r.bkCutoff))) return false
      if (fOrigin.size && !fOrigin.has(r.originCity || r.origin || '-')) return false
      if (fDest.size && !fDest.has(r.destinationCity || r.destination || '-')) return false
      return true
    })
  }, [rows, fCarrier, fCutoff, fOrigin, fDest]) // eslint-disable-line react-hooks/exhaustive-deps

  const activeCount = [fCarrier, fCutoff, fOrigin, fDest].filter(s => s.size > 0).length
  const clearAll = () => { setFCarrier(new Set()); setFCutoff(new Set()); setFOrigin(new Set()); setFDest(new Set()); setOpenFilter(null) }

  if (rows.length === 0) {
    return <EmptyState title={emptyMessage || 'No schedule rates available.'} />
  }

  const SCHED_COL_COUNT = 8
  const rateCols = rateTypes.length * containerTypes.length
  const totalCols = SCHED_COL_COUNT + rateCols

  const FILTERS: { key: string; label: string; values: Map<string, number>; active: Set<string>; set: React.Dispatch<React.SetStateAction<Set<string>>> }[] = [
    { key: 'carrier', label: 'Carrier', values: distinct.carriers, active: fCarrier, set: setFCarrier },
    { key: 'cutoff', label: 'BK Cutoff', values: distinct.cutoffs, active: fCutoff, set: setFCutoff },
    { key: 'origin', label: 'Origin', values: distinct.origins, active: fOrigin, set: setFOrigin },
    { key: 'destination', label: 'Destination', values: distinct.destinations, active: fDest, set: setFDest },
  ]

  function cellTooltip(cell: RateCell): string {
    const lines: string[] = []
    lines.push(`${cell.currency} ${cell.rate.toLocaleString()}`)
    if (cell.validFrom && cell.validTo) lines.push(`Valid: ${fmtDate(cell.validFrom)} – ${fmtDate(cell.validTo)}`)
    if (cell.transit) lines.push(`Transit: ${cell.transit} days`)
    if (cell.freeTime) lines.push(`Free time: ${cell.freeTime} days`)
    if (cell.maxWeight) lines.push(`Max weight: ${cell.maxWeight.toLocaleString()} kg`)
    if (cell.note) lines.push(`Note: ${cell.note}`)
    return lines.join('\n')
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Count + clear */}
      <div className="flex min-h-7 items-center justify-between px-0.5">
        <div className="text-label text-fg-muted">
          {filtered.length === rows.length
            ? `${rows.length} schedule${rows.length !== 1 ? 's' : ''}`
            : `${filtered.length} of ${rows.length} (filtered)`}
        </div>
        {activeCount > 0 && (
          <Button variant="ghost" size="sm" icon={<X size={14} aria-hidden="true" />} onClick={clearAll} className="text-danger">
            Clear filters
          </Button>
        )}
      </div>

      {/* Filter chips */}
      <div ref={filterBarRef} className="flex flex-wrap gap-2">
        {FILTERS.map(f => {
          const isOpen = openFilter === f.key
          const hasActive = f.active.size > 0
          const entries = [...f.values.entries()].sort((a, b) => b[1] - a[1])
          if (entries.length <= 1) return null
          return (
            <div key={f.key} className="relative">
              <Button
                size="sm"
                icon={<Filter size={14} aria-hidden="true" />}
                aria-expanded={isOpen}
                onClick={() => setOpenFilter(isOpen ? null : f.key)}
                className={cn(hasActive ? 'border-primary bg-primary-subtle text-primary' : 'font-normal text-fg-label')}
              >
                {f.label}
                {hasActive && <span className="rounded-control bg-primary px-1.5 text-label font-bold text-white">{f.active.size}</span>}
              </Button>
              {isOpen && (
                <div className="absolute left-0 top-full z-20 mt-1 max-h-60 min-w-[180px] overflow-y-auto rounded-card border border-line-popover bg-surface py-1 shadow-popover">
                  <div className="flex justify-between border-b border-line-soft px-1 pb-1">
                    <Button variant="ghost" size="sm" onClick={() => f.set(new Set(entries.map(e => e[0])))}>Select all</Button>
                    <Button variant="ghost" size="sm" onClick={() => f.set(new Set())} className="font-normal text-fg-muted">Clear</Button>
                  </div>
                  {entries.map(([val, count]) => (
                    <Checkbox
                      key={val}
                      checked={f.active.has(val)}
                      onChange={() => {
                        f.set(prev => { const n = new Set(prev); if (n.has(val)) n.delete(val); else n.add(val); return n })
                      }}
                      className={cn('flex w-full px-2.5 py-1.5 hover:bg-surface-hover', f.active.has(val) && 'bg-primary-subtle')}
                    >
                      <span className="min-w-0 flex-1 truncate">{val}</span>
                      <span className="shrink-0 text-label text-fg-muted">{count}</span>
                    </Checkbox>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Pivot table */}
      <div className="overflow-hidden rounded-card border border-line">
        <div className="relative max-h-[600px] overflow-x-auto">
          <table className="border-collapse" style={{ minWidth: SCHED_COL_COUNT * 80 + rateCols * 76 }}>
            <thead className="sticky top-0 z-10">
              <tr className="bg-primary">
                <th colSpan={SCHED_COL_COUNT} className={cn(GRID_TH, 'border-b border-l-0 px-2')}>
                  SCHEDULE
                </th>
                {rateTypes.map(rt => (
                  <th key={rt} colSpan={containerTypes.length}
                    className={cn(GRID_TH, 'border-b border-l-2 border-b-white/20 border-l-white/50')}
                    style={{ background: RATE_COLORS[rt] ?? COLOR.muted }}>
                    {rt.toUpperCase()}
                  </th>
                ))}
              </tr>
              <tr className="bg-primary">
                {['CARRIER', 'VESSEL / VOYAGE', 'ORIGIN', 'DEST', 'ETD', 'ETA', 'TT', 'CUTOFF'].map((h, i) => (
                  <th key={h} className={cn(GRID_TH, !['ETD', 'ETA', 'TT', 'CUTOFF'].includes(h) && 'text-left', i === 0 && 'border-l-0')}>{h}</th>
                ))}
                {rateTypes.map(rt =>
                  containerTypes.map((ct, ctIdx) => (
                    <th key={`${rt}-${ct}`} className={cn(GRID_TH, ctIdx === 0 && 'border-l-2 border-l-white/50')}
                      style={{ background: RATE_COLORS[rt] ?? COLOR.muted }}>
                      {ct}
                    </th>
                  ))
                )}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={totalCols} className="p-0"><EmptyState title="No schedules match the active filters." /></td></tr>
              )}
              {filtered.map((row, rowIdx) => (
                <tr key={row.scheduleId} className={rowIdx % 2 ? 'bg-canvas' : undefined}>
                  <td className={cn(GRID_TD, 'border-l-0 font-semibold')}>{row.linerName || '-'}</td>
                  <td className={GRID_TD}>
                    <div className="flex items-center gap-1">
                      <Ship size={14} aria-hidden="true" className="shrink-0 text-fg-muted" />
                      <span>{row.vesselName || '-'}{row.voyageNumber ? ` / ${row.voyageNumber}` : ''}</span>
                    </div>
                  </td>
                  <td className={GRID_TD}>{row.originCity || row.origin || '-'}</td>
                  <td className={GRID_TD}>{row.destinationCity || row.destination || '-'}</td>
                  <td className={cn(GRID_TD, 'text-center')}>{fmtDate(row.etd)}</td>
                  <td className={cn(GRID_TD, 'text-center')}>{fmtDate(row.eta)}</td>
                  <td className={cn(GRID_TD, 'text-center font-semibold')}>
                    {row.totalDuration != null ? `${row.totalDuration}d` : '-'}
                  </td>
                  <td className={GRID_TD}>{fmtDate(row.bkCutoff)}</td>
                  {rateTypes.map(rt =>
                    containerTypes.map((ct, ctIdx) => {
                      const cell = row.rates[rt]?.[ct]
                      return (
                        <td
                          key={`${rt}-${ct}`}
                          title={cell ? cellTooltip(cell) : undefined}
                          className={cn(GRID_TD, 'text-center', ctIdx === 0 && 'border-l-2 border-l-line')}
                        >
                          {cell ? (
                            <>
                              <div className="whitespace-nowrap font-bold">
                                {cell.currency} {cell.rate.toLocaleString()}
                              </div>
                              {cell.note && (
                                <div className="mx-auto mt-px max-w-[72px] truncate leading-tight text-fg-muted">
                                  {cell.note}
                                </div>
                              )}
                            </>
                          ) : (
                            <span className="text-fg-muted">-</span>
                          )}
                        </td>
                      )
                    })
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Schedule search results table (INTTRA / live search)
// ---------------------------------------------------------------------------

function ScheduleSearchTable({ data }: { data: OceanSchedule[] }) {
  const fmtDate = (d: string | null) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '-'

  const sorted = useMemo(() => [...data].sort((a, b) => {
    const da = a.originDepartureDate ?? '', db = b.originDepartureDate ?? ''
    return da.localeCompare(db)
  }), [data])

  // Track checked "special rate" rows by index
  const [checked, setChecked] = useState<Set<number>>(new Set())
  // Modal state for the special rate input placeholder
  const [modalIdx, setModalIdx] = useState<number | null>(null)

  // Reset checks when data changes
  useEffect(() => { setChecked(new Set()); setModalIdx(null) }, [data])

  const toggleCheck = (idx: number) =>
    setChecked(prev => { const n = new Set(prev); if (n.has(idx)) n.delete(idx); else n.add(idx); return n })

  const COLS = ['CARRIER', 'SERVICE', 'VESSEL / VOYAGE', 'ORIGIN', 'DESTINATION', 'ETD', 'ETA', 'TRANSIT', 'TYPE', 'BK CUTOFF', 'SPECIAL RATE', 'ACTION']

  const scheduleName = (s: OceanSchedule) =>
    `${s.carrierName || s.scac || '-'} ${s.vesselName || '-'}${s.voyageNumber ? ` / ${s.voyageNumber}` : ''}`

  const modalRow = modalIdx !== null ? sorted[modalIdx] : undefined

  return (
    <div className="flex flex-col gap-1.5">
      <div className="px-0.5 text-label text-fg-muted">
        {sorted.length} schedule{sorted.length !== 1 ? 's' : ''} found
      </div>
      <div className="overflow-hidden rounded-card border border-line">
        <div className="relative max-h-[540px] overflow-x-auto">
          <table className="w-full border-collapse">
            <thead className="sticky top-0 z-10">
              <tr className="bg-primary">
                {COLS.map((h, i) => (
                  <th key={h} className={cn(SEARCH_TH, i === 0 && 'border-l-0', (h === 'SPECIAL RATE' || h === 'ACTION') && 'text-center')}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0 && (
                <tr><td colSpan={COLS.length} className="p-0"><EmptyState title="No schedules found." /></td></tr>
              )}
              {sorted.map((s, i) => (
                <tr key={`${s.scac}-${s.vesselName}-${s.voyageNumber}-${i}`} className={i % 2 ? 'bg-canvas' : undefined}>
                  <td className={cn(SEARCH_TD, 'border-l-0 font-semibold')}>
                    <div>{s.carrierName || s.scac || '-'}</div>
                    {s.scac && s.carrierName && <div className="font-normal text-fg-muted">{s.scac}</div>}
                  </td>
                  <td className={SEARCH_TD}>{s.serviceName || '-'}</td>
                  <td className={SEARCH_TD}>
                    <div className="flex items-center gap-1">
                      <Ship size={14} aria-hidden="true" className="shrink-0 text-fg-muted" />
                      <span>{s.vesselName || '-'}{s.voyageNumber ? ` / ${s.voyageNumber}` : ''}</span>
                    </div>
                  </td>
                  <td className={SEARCH_TD}>
                    {s.originCityName || s.originUnloc || '-'}
                    {s.originUnloc && s.originCityName && <div className="text-fg-muted">{s.originUnloc}</div>}
                  </td>
                  <td className={SEARCH_TD}>
                    {s.destinationCityName || s.destinationUnloc || '-'}
                    {s.destinationUnloc && s.destinationCityName && <div className="text-fg-muted">{s.destinationUnloc}</div>}
                  </td>
                  <td className={cn(SEARCH_TD, 'whitespace-nowrap')}>{fmtDate(s.originDepartureDate)}</td>
                  <td className={cn(SEARCH_TD, 'whitespace-nowrap')}>{fmtDate(s.destinationArrivalDate)}</td>
                  <td className={cn(SEARCH_TD, 'text-center font-semibold')}>
                    {s.totalDuration != null ? `${s.totalDuration}d` : '-'}
                  </td>
                  <td className={SEARCH_TD}>
                    {s.scheduleType ? (
                      <Badge tone={s.scheduleType === 'direct' ? 'success' : 'warning'}>{s.scheduleType === 'direct' ? 'Direct' : 'T/S'}</Badge>
                    ) : '-'}
                  </td>
                  <td className={cn(SEARCH_TD, 'whitespace-nowrap')}>{fmtDate(s.bkCutoff)}</td>
                  {/* Special Rate checkbox */}
                  <td className={cn(SEARCH_TD, 'text-center')}>
                    <Checkbox
                      checked={checked.has(i)}
                      onChange={() => toggleCheck(i)}
                      aria-label={`Special rate for ${scheduleName(s)}`}
                      className="flex justify-center"
                    />
                  </td>
                  {/* Action button */}
                  <td className={cn(SEARCH_TD, 'text-center')}>
                    <Button size="sm" onClick={() => setModalIdx(i)}>Input Rate</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Special rate input modal (placeholder) */}
      {modalRow && (
        <Modal
          isOpen
          onClose={() => setModalIdx(null)}
          title="Special Rate Input"
          size="sm"
          footer={<Button onClick={() => setModalIdx(null)}>Close</Button>}
        >
          <p className="m-0 text-label text-fg-muted">
            {modalRow.carrierName || modalRow.scac || '-'}
            {' - '}
            {modalRow.vesselName || '-'}
            {modalRow.voyageNumber ? ` / ${modalRow.voyageNumber}` : ''}
          </p>
          <p className="m-0 text-label text-fg-muted">
            {modalRow.originCityName || modalRow.originUnloc || '-'}
            {' → '}
            {modalRow.destinationCityName || modalRow.destinationUnloc || '-'}
            {modalRow.originDepartureDate ? ` · ETD ${fmtDate(modalRow.originDepartureDate)}` : ''}
          </p>
          <div className="rounded-card border border-dashed border-line bg-canvas p-6 text-center text-control text-fg-muted">
            Special rate input
          </div>
        </Modal>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Port pair rows (shared by both tabs)
// ---------------------------------------------------------------------------

function PortPairRows({ pairs, onUpdate, onRemove, onAdd }: {
  pairs: { origin: string; destination: string }[]
  onUpdate: (idx: number, field: 'origin' | 'destination', value: string) => void
  onRemove: (idx: number) => void
  onAdd: () => void
}) {
  return (
    <div className="flex flex-col gap-2">
      <h3 className={cn('m-0', labelClass)}>Port Pairs</h3>
      {pairs.map((pair, idx) => (
        <div key={idx} className="flex items-start gap-2">
          <div className="flex-1">
            <PortCombobox value={pair.origin} onChange={v => onUpdate(idx, 'origin', v)} placeholder="Origin port" />
          </div>
          <ArrowRight size={16} aria-hidden="true" className="mt-2 shrink-0 text-fg-muted" />
          <div className="flex-1">
            <PortCombobox value={pair.destination} onChange={v => onUpdate(idx, 'destination', v)} placeholder="Destination port" />
          </div>
          {pairs.length > 1 && (
            <Tooltip content={`Remove port pair ${idx + 1}`}>
              <Button
                className="w-8 shrink-0 px-0 text-danger"
                icon={<X size={14} aria-hidden="true" />}
                aria-label={`Remove port pair ${idx + 1}`}
                onClick={() => onRemove(idx)}
              />
            </Tooltip>
          )}
        </div>
      ))}
      <div>
        <Button variant="ghost" size="sm" className="-ml-2.5" icon={<Plus size={14} aria-hidden="true" />} onClick={onAdd}>
          Add port pair
        </Button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main Schedules page - tabbed: Schedule Rates | Search Schedules
// ---------------------------------------------------------------------------

interface SchedulesProps {
  onFlash: (msg: string) => void
}

export default function Schedules({ onFlash }: SchedulesProps) {
  const [activeTab, setActiveTab] = useState<'rates' | 'search'>('rates')

  // ── Shared: liner list ──
  const [linerList, setLinerList] = useState<LinerRecord[]>([])
  useEffect(() => { apiGetLiners().then(setLinerList).catch(() => {}) }, [])

  // ====================================================================
  // TAB 1 - Schedule Rates (enriched)
  // ====================================================================
  const [portPairs, setPortPairs] = useState<{ origin: string; destination: string }[]>([
    { origin: '', destination: '' },
  ])
  const addPair = () => setPortPairs(prev => [...prev, { origin: '', destination: '' }])
  const removePair = (idx: number) => setPortPairs(prev => prev.length <= 1 ? prev : prev.filter((_, i) => i !== idx))
  const updatePair = (idx: number, field: 'origin' | 'destination', value: string) =>
    setPortPairs(prev => prev.map((p, i) => i === idx ? { ...p, [field]: value } : p))

  const [selectedLiners, setSelectedLiners] = useState<string[]>([])
  const linerLabelMap = useMemo(() => {
    const m = new Map<string, string>()
    for (const l of linerList) m.set(l.name, linerDisplay(l))
    return m
  }, [linerList])
  const formatLinerLabel = (name: string) => linerLabelMap.get(name) ?? name

  const [aggRaw, setAggRaw] = useState<AggregateScheduleRatesResponse>({})
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)

  const pivot = useMemo(() => pivotScheduleData(aggRaw), [aggRaw])
  const filteredRows = useMemo(() => {
    if (selectedLiners.length === 0) return pivot.rows
    const set = new Set(selectedLiners.map(l => l.toLowerCase()))
    return pivot.rows.filter(r => r.linerName && set.has(r.linerName.toLowerCase()))
  }, [pivot.rows, selectedLiners])

  const validPairs = portPairs.filter(p => p.origin.length === 5 && p.destination.length === 5)
  const canSearch = validPairs.length > 0 && !loading

  const handleSearch = () => {
    if (!canSearch) return
    const portPairStr = validPairs.map(p => `${p.origin}:${p.destination}`).join(',')
    setLoading(true)
    apiGetEnrichedScheduleRates({ port_pair: portPairStr })
      .then(setAggRaw)
      .catch(() => { setAggRaw({}); onFlash('Failed to load schedule rates') })
      .finally(() => { setLoading(false); setSearched(true) })
  }

  // ====================================================================
  // TAB 2 - Search Schedules (INTTRA live search)
  // ====================================================================
  const [searchPairs, setSearchPairs] = useState<{ origin: string; destination: string }[]>([
    { origin: '', destination: '' },
  ])
  const addSearchPair = () => setSearchPairs(prev => [...prev, { origin: '', destination: '' }])
  const removeSearchPair = (idx: number) => setSearchPairs(prev => prev.length <= 1 ? prev : prev.filter((_, i) => i !== idx))
  const updateSearchPair = (idx: number, field: 'origin' | 'destination', value: string) =>
    setSearchPairs(prev => prev.map((p, i) => i === idx ? { ...p, [field]: value } : p))

  // SCAC selection (store SCAC codes, display "Name – SCAC")
  const [selectedScacs, setSelectedScacs] = useState<string[]>([])
  const scacLiners = useMemo(() => linerList.filter(l => l.scac), [linerList])
  const scacSuggestions = useMemo(() => scacLiners.map(l => l.scac!), [scacLiners])
  const formatScacLabel = (scac: string) => {
    const l = scacLiners.find(x => x.scac === scac)
    return l ? `${l.name} – ${scac}` : scac
  }

  const today = useMemo(() => todayISO(), [])
  const [searchDate, setSearchDate] = useState(today)
  const [weeksOut, setWeeksOut] = useState(4)
  const [directOnly, setDirectOnly] = useState(false)

  const [searchResults, setSearchResults] = useState<OceanSchedule[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchSearched, setSearchSearched] = useState(false)

  const validSearchPairs = searchPairs.filter(p => p.origin.length === 5 && p.destination.length === 5)
  const canSearchSchedules = validSearchPairs.length > 0 && selectedScacs.length > 0 && searchDate && !searchLoading

  const handleSearchSchedules = async () => {
    if (!canSearchSchedules) return
    setSearchLoading(true)
    setSearchSearched(true)
    try {
      const results = await apiSearchSchedulesBulk({
        scacs: selectedScacs.join(','),
        portPairs: validSearchPairs.map(p => ({ originPort: p.origin, destinationPort: p.destination })),
        searchDate,
        weeksOut: weeksOut || 4,
        directOnly: directOnly || undefined,
      })
      setSearchResults(results)
    } catch {
      setSearchResults([])
      onFlash('Failed to search schedules')
    } finally {
      setSearchLoading(false)
    }
  }

  // ====================================================================
  // Render
  // ====================================================================

  const tabClass = (active: boolean) => cn(
    '-mb-0.5 border-0 border-b-2 bg-transparent px-5 py-2 text-control font-semibold transition-colors',
    active ? 'border-primary text-primary' : 'border-transparent text-fg-muted',
  )

  return (
    <div className="mx-auto max-w-[1400px] p-6">
      {/* Page title */}
      <div className="mb-4 flex items-center gap-2">
        <Globe size={18} aria-hidden="true" className="text-primary" />
        <h2 className="m-0 text-title font-bold text-fg">Ocean Schedules</h2>
      </div>

      {/* Tab bar */}
      <div className="mb-4 flex border-0 border-b-2 border-line-soft">
        <button type="button" aria-pressed={activeTab === 'rates'} onClick={() => setActiveTab('rates')} className={tabClass(activeTab === 'rates')}>
          Schedule Rates
        </button>
        <button type="button" aria-pressed={activeTab === 'search'} onClick={() => setActiveTab('search')} className={tabClass(activeTab === 'search')}>
          Search Schedules
        </button>
      </div>

      {/* ================================================================
          TAB 1 - Schedule Rates
          ================================================================ */}
      <div className={activeTab === 'rates' ? 'block' : 'hidden'}>
        {/* Search form */}
        <div className={CARD}>
          <PortPairRows pairs={portPairs} onUpdate={updatePair} onRemove={removePair} onAdd={addPair} />

          <Field label="Filter by Liner (optional)" hint="Leave empty to show all liners.">
            {ids => (
              <TagInput
                id={ids.id}
                aria-labelledby={ids['aria-labelledby']}
                values={selectedLiners}
                onChange={setSelectedLiners}
                suggestions={[...new Set(linerList.map(l => l.name))]}
                placeholder="Type to add liners..."
                formatLabel={formatLinerLabel}
              />
            )}
          </Field>

          <div className="flex justify-end">
            <Button variant="primary" icon={<Search size={14} aria-hidden="true" />} isPending={loading} onClick={handleSearch} disabled={!canSearch}>
              Search Rates
            </Button>
          </div>
        </div>

        {/* Results */}
        {loading && filteredRows.length === 0 && <LoadingState label="Searching schedule rates..." />}
        {!loading && searched && filteredRows.length === 0 && (
          <div className="rounded-card border border-line-soft bg-canvas">
            <EmptyState title={`No schedule rates found for the selected port pairs${selectedLiners.length > 0 ? ' and liner filter' : ''}.`} />
          </div>
        )}
        {filteredRows.length > 0 && (
          <>
            {loading && (
              <div className="mb-2 flex items-center gap-1.5 text-label text-fg-muted">
                <Loader2 size={14} aria-hidden="true" className="animate-spin" /> Updating results...
              </div>
            )}
            <PivotRateTable rows={filteredRows} rateTypes={pivot.rateTypes} containerTypes={pivot.containerTypes} />
          </>
        )}
        {!searched && !loading && (
          <EmptyState icon={<Globe size={28} />} title="Enter one or more port pairs and click Search to find schedule rates." />
        )}
      </div>

      {/* ================================================================
          TAB 2 - Search Schedules (INTTRA)
          ================================================================ */}
      <div className={activeTab === 'search' ? 'block' : 'hidden'}>
        {/* Search form */}
        <div className={CARD}>
          <PortPairRows pairs={searchPairs} onUpdate={updateSearchPair} onRemove={removeSearchPair} onAdd={addSearchPair} />

          {/* Carrier / SCAC selection */}
          <Field label="Carriers" required hint="Select one or more carriers to search their schedules.">
            {ids => (
              <TagInput
                id={ids.id}
                aria-labelledby={ids['aria-labelledby']}
                values={selectedScacs}
                onChange={setSelectedScacs}
                suggestions={scacSuggestions}
                placeholder="Type carrier name or SCAC code..."
                formatLabel={formatScacLabel}
              />
            )}
          </Field>

          {/* Date + options row */}
          <div className="flex flex-wrap items-end gap-4">
            <Field label="Departure Date" required>
              {ids => <DatePicker {...ids} className="w-[160px]" value={searchDate} onChange={setSearchDate} />}
            </Field>
            <Field label="Weeks Out">
              {ids => <NumberInput {...ids} className="w-20" value={weeksOut} onChange={e => setWeeksOut(Number(e.target.value))} min={1} max={12} />}
            </Field>
            <div className="flex h-8 items-center">
              <Checkbox checked={directOnly} onChange={setDirectOnly}>Direct only</Checkbox>
            </div>
          </div>

          {/* Search button */}
          <div className="flex justify-end">
            <Button
              variant="primary"
              icon={<Search size={14} aria-hidden="true" />}
              isPending={searchLoading}
              onClick={handleSearchSchedules}
              disabled={!canSearchSchedules}
            >
              Search Schedules
            </Button>
          </div>
        </div>

        {/* Results */}
        {searchLoading && searchResults.length === 0 && <LoadingState label="Searching schedules..." />}
        {!searchLoading && searchSearched && searchResults.length === 0 && (
          <div className="rounded-card border border-line-soft bg-canvas">
            <EmptyState title="No schedules found for the selected port pairs and carriers." />
          </div>
        )}
        {searchResults.length > 0 && (
          <>
            {searchLoading && (
              <div className="mb-2 flex items-center gap-1.5 text-label text-fg-muted">
                <Loader2 size={14} aria-hidden="true" className="animate-spin" /> Updating results...
              </div>
            )}
            <ScheduleSearchTable data={searchResults} />
          </>
        )}
        {!searchSearched && !searchLoading && (
          <EmptyState icon={<Ship size={28} />} title="Select port pairs, carriers, and a departure date, then click Search." />
        )}
      </div>
    </div>
  )
}
