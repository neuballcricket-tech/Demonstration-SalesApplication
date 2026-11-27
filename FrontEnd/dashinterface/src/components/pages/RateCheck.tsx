import { useState, useEffect, useMemo, useRef, Fragment, type ReactNode } from 'react'
import { ArrowLeft, ChevronRight, FileDown, FileText, PanelRight, Plus, Send, Ship, X, Filter } from 'lucide-react'
import {
  RATE_SOURCE_COLORS, COMMODITY_TYPES, portOptions, CONTAINER_TYPE_LABELS,
  type Inquiry, type Customer, type ContainerLine, type UnifiedRate,
  type WorkflowStage, type ActivityEntry,
  type PortRecord, type LinerRecord, type TradeLaneRecord, type EmployeeRecord,
  type IncomingScheduleDetail, type AggregateScheduleRatesResponse, type AggregateRate, type SchedulePayload,
  linerDisplay,
} from '../../types'
import { useRole } from '../../RoleContext'
import { FIELD_LABEL, INPUT_STYLE } from './pageStyles'
import { apiFetchAllRates, apiGetPorts, apiGetLiners, apiGetTradeLanes, apiGetEmployeesDb, apiGetAuthEmployees, apiCreateVesselRate, apiCreateFakRate, apiCreateSpecialRate, apiCreateRateRequest, apiPatchRateRequestProc, apiAddRateRequestOption, apiGetIncomingRateRequests, apiGetAggregateScheduleRates, apiGetEnrichedScheduleRates, BACKEND_ACTOR_ID } from '../../api'
import { COLOR } from '../ui/tokens'
import { Badge, Button, Checkbox, EmptyState, Field, Input, LoadingState, Tooltip } from '../ui'
import { cn } from '../../lib/cn'

type ManualRateTab = 'vessel-spot' | 'fak' | 'special'
const MR_TAB_LABELS: Record<ManualRateTab, string> = { 'vessel-spot': 'Spot Rate', fak: 'FAK', special: 'Special Rate' }
const MR_CONTAINER_TYPES = ['20GP', '40GP', '40HC', '20RF', '40RF', '20FR', '40FR', '20OT', '40OT'] as const
const MR_VESSEL_CONTAINER_TYPES = [...MR_CONTAINER_TYPES, 'TANKER'] as const
interface MrContainerRate {
  containerType: string
  tus: string
  maxWeight: string
  rate: string
  currency: string
}

const SURCHARGE_TYPES = [
  'BAF', 'CAF', 'THC', 'PSS', 'GRI', 'EBS', 'ISPS',
  'Documentation Fee', 'Seal Fee', 'VGM Fee', 'Inland Haulage',
  'Wharfage', 'CFS Charge', 'Bill of Lading Fee', 'DDC', 'ORC',
]

interface ManualRateEntry {
  id: string
  tab: ManualRateTab
  scheduleId: number | null
  scheduleSummary: string | null
  liner: string
  tradeLane: string
  origin: string
  destination: string
  serviceLane: string
  salesperson: string
  containers: MrContainerRate[]
  validFrom: string
  validTo: string
  note: string
  specialRemark: string
  freeTime: string
  isSold: boolean
  isCancelled: boolean
  cancelReason: string
  cancelCharge: string
  cancelChargeCurrency: string
  vesselName: string
  voyage: string
  vesselEta: string
  vesselEtd: string
  fclOpenDate: string
  fclOpenTime: string
  fclCutDate: string
  fclCutTime: string
  commodityType: string
  commodityName: string
  surcharges: { type: string; amount: string; currency: string }[]
}

// ---- Pivot data model for enriched schedule+rate tables ----

const RATE_TYPE_ORDER_RC = ['Tariff', 'FAK', 'Special', 'VBV', 'NAC', 'Contracted']
const CNTR_SORT_RC: Record<string, number> = { '20GP': 0, '40GP': 1, '40HC': 2, '20RF': 3, '40RF': 4, '45HC': 5 }
const RATE_COLORS_RC: Record<string, string> = {
  Tariff: '#2563eb', FAK: '#7c3aed', Special: '#d97706', VBV: '#16a34a',
  NAC: '#0891b2', Contracted: '#dc2626',
}

interface SelectableRateCell {
  rateId: number
  rateTypeKey: string
  rate: number
  currency: string
  note: string | null
  validFrom: string
  validTo: string
  freeTime: string | null
  transit: string | null
}

interface SelectablePivotRow {
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
  rates: Record<string, Record<string, SelectableRateCell[]>>
}

interface SelectablePivotResult {
  rows: SelectablePivotRow[]
  rateTypes: string[]
  containerTypes: string[]
}

function pivotEnrichedData(data: AggregateScheduleRatesResponse): SelectablePivotResult {
  const allCntr = new Set<string>()
  const allRT = new Set<string>()
  const rows: SelectablePivotRow[] = []

  for (const entry of Object.values(data)) {
    const s = entry.schedule
    const rates: Record<string, Record<string, SelectableRateCell[]>> = {}

    const add = (arr: AggregateRate[], rt: string, rtKey: string) => {
      for (const r of arr) {
        allCntr.add(r.container_type)
        allRT.add(rt)
        if (!rates[rt]) rates[rt] = {}
        if (!rates[rt][r.container_type]) rates[rt][r.container_type] = []
        rates[rt][r.container_type].push({
          rateId: r.rate_id, rateTypeKey: rtKey,
          rate: r.rate, currency: r.currency,
          note: r.note ?? r.special_remark ?? null,
          validFrom: r.valid_from, validTo: r.valid_to,
          freeTime: r.free_time, transit: r.transit,
        })
      }
    }

    add(entry.tariff_rates, 'Tariff', 'tariff_rates')
    add(entry.fak_rates, 'FAK', 'fak_rates')
    add(entry.special_rate, 'Special', 'special_rate')
    add(entry.vessel_by_vessel_rate, 'VBV', 'vessel_by_vessel_rate')
    if (entry.nac) add(entry.nac, 'NAC', 'nac')
    if (entry.contracted_rates) add(entry.contracted_rates, 'Contracted', 'contracted_rates')

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
    const oa = CNTR_SORT_RC[a] ?? 99, ob = CNTR_SORT_RC[b] ?? 99
    return oa !== ob ? oa - ob : a.localeCompare(b)
  })
  const rateTypes = RATE_TYPE_ORDER_RC.filter(rt => allRT.has(rt))

  return { rows, rateTypes, containerTypes }
}

// ---- Selection helpers for pivot table ----

function getGroupAggKeys(row: SelectablePivotRow, rateType: string): string[] {
  const cells = row.rates[rateType]
  if (!cells) return []
  const keys: string[] = []
  for (const ctCells of Object.values(cells)) {
    for (const c of ctCells) keys.push(`${row.scheduleId}:${c.rateTypeKey}:${c.rateId}`)
  }
  return keys
}

function isGroupSelected(row: SelectablePivotRow, rateType: string, selected: Set<string>): boolean {
  const keys = getGroupAggKeys(row, rateType)
  return keys.length > 0 && keys.every(k => selected.has(k))
}

function isGroupPartial(row: SelectablePivotRow, rateType: string, selected: Set<string>): boolean {
  const keys = getGroupAggKeys(row, rateType)
  if (keys.length === 0) return false
  const count = keys.filter(k => selected.has(k)).length
  return count > 0 && count < keys.length
}

function toggleGroup(row: SelectablePivotRow, rateType: string, selected: Set<string>): Set<string> {
  const keys = getGroupAggKeys(row, rateType)
  const next = new Set(selected)
  const allSelected = keys.every(k => next.has(k))
  if (allSelected) { for (const k of keys) next.delete(k) }
  else { for (const k of keys) next.add(k) }
  return next
}

// ---- Row-level selection: toggle all rate type groups for an entire schedule row ----

function getRowAllKeys(row: SelectablePivotRow, rateTypes: string[]): string[] {
  const keys: string[] = []
  for (const rt of rateTypes) keys.push(...getGroupAggKeys(row, rt))
  return keys
}


function toggleRow(row: SelectablePivotRow, rateTypes: string[], selected: Set<string>): Set<string> {
  const keys = getRowAllKeys(row, rateTypes)
  const next = new Set(selected)
  const allSelected = keys.every(k => next.has(k))
  if (allSelected) { for (const k of keys) next.delete(k) }
  else { for (const k of keys) next.add(k) }
  return next
}

function countPivotRates(pivot: SelectablePivotResult): number {
  let count = 0
  for (const row of pivot.rows) {
    for (const rt of Object.values(row.rates)) {
      for (const cells of Object.values(rt)) count += cells.length
    }
  }
  return count
}

// ---------------------------------------------------------------------------
// SelectablePivotRateTable - rate types as columns, container types as sub-cols
// ---------------------------------------------------------------------------

// Header and body cell classes for the pivot table (dense 11px data grid)
const PIVOT_TH = 'whitespace-nowrap border-l border-white/20 px-1 py-1.5 text-center text-label font-bold tracking-label text-white'
const PIVOT_TD = 'border-b border-l border-line-soft px-1 py-1.5 align-middle text-label text-fg'

export function SelectablePivotRateTable({ pivot, selectedIds, selectedScheduleIds, onToggleGroup, onToggleSchedule, onAttachManualRate, emptyMessage }: {
  pivot: SelectablePivotResult
  selectedIds: Set<string>
  selectedScheduleIds: Set<number>
  onToggleGroup: (row: SelectablePivotRow, rateType: string) => void
  onToggleRow: (row: SelectablePivotRow) => void
  onToggleSchedule: (scheduleId: number) => void
  onAttachManualRate?: (row: SelectablePivotRow) => void
  emptyMessage?: string
}) {
  const { rows, rateTypes, containerTypes } = pivot

  // Filters
  const [fCarrier, setFCarrier] = useState<Set<string>>(new Set())
  const [fOrigin, setFOrigin] = useState<Set<string>>(new Set())
  const [fDest, setFDest] = useState<Set<string>>(new Set())
  const [openFilter, setOpenFilter] = useState<string | null>(null)
  const filterBarRef = useRef<HTMLDivElement>(null)

  useEffect(() => { setFCarrier(new Set()); setFOrigin(new Set()); setFDest(new Set()); setOpenFilter(null) }, [rows])

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
    const origins = new Map<string, number>()
    const destinations = new Map<string, number>()
    for (const r of rows) {
      const c = r.linerName || '-'; carriers.set(c, (carriers.get(c) ?? 0) + 1)
      const o = r.originCity || r.origin || '-'; origins.set(o, (origins.get(o) ?? 0) + 1)
      const d = r.destinationCity || r.destination || '-'; destinations.set(d, (destinations.get(d) ?? 0) + 1)
    }
    return { carriers, origins, destinations }
  }, [rows]) // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = useMemo(() => {
    if (!fCarrier.size && !fOrigin.size && !fDest.size) return rows
    return rows.filter(r => {
      if (fCarrier.size && !fCarrier.has(r.linerName || '-')) return false
      if (fOrigin.size && !fOrigin.has(r.originCity || r.origin || '-')) return false
      if (fDest.size && !fDest.has(r.destinationCity || r.destination || '-')) return false
      return true
    })
  }, [rows, fCarrier, fOrigin, fDest])

  const activeCount = [fCarrier, fOrigin, fDest].filter(s => s.size > 0).length
  const clearAll = () => { setFCarrier(new Set()); setFOrigin(new Set()); setFDest(new Set()); setOpenFilter(null) }

  if (rows.length === 0) {
    return <EmptyState title={emptyMessage || 'No schedule rates available.'} />
  }

  const SCHED_COL_COUNT = 9 + (onAttachManualRate ? 1 : 0) // 1 select checkbox + 8 schedule fields + optional attach col
  const rateCols = rateTypes.length * (1 + containerTypes.length) // +1 for checkbox per group
  const totalCols = SCHED_COL_COUNT + rateCols

  const FILTERS: { key: string; label: string; values: Map<string, number>; active: Set<string>; set: React.Dispatch<React.SetStateAction<Set<string>>> }[] = [
    { key: 'carrier', label: 'Carrier', values: distinct.carriers, active: fCarrier, set: setFCarrier },
    { key: 'origin', label: 'Origin', values: distinct.origins, active: fOrigin, set: setFOrigin },
    { key: 'destination', label: 'Destination', values: distinct.destinations, active: fDest, set: setFDest },
  ]

  function cellTooltip(cell: SelectableRateCell): string {
    const lines: string[] = []
    lines.push(`${cell.currency} ${cell.rate.toLocaleString()}`)
    if (cell.validFrom && cell.validTo) lines.push(`Valid: ${fmtDate(cell.validFrom)} \u2013 ${fmtDate(cell.validTo)}`)
    if (cell.transit) lines.push(`Transit: ${cell.transit} days`)
    if (cell.freeTime) lines.push(`Free time: ${cell.freeTime} days`)
    if (cell.note) lines.push(`Note: ${cell.note}`)
    return lines.join('\n')
  }

  const scheduleName = (row: SelectablePivotRow) =>
    `${row.linerName || '-'} ${row.vesselName || '-'}${row.voyageNumber ? ` / ${row.voyageNumber}` : ''}`

  return (
    <>
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
        <div className="relative max-h-[500px] overflow-x-auto">
          <table className="border-collapse" style={{ minWidth: SCHED_COL_COUNT * 80 + rateCols * 58 }}>
            <thead className="sticky top-0 z-10">
              {/* Row 1: group headers */}
              <tr className="bg-primary">
                <th rowSpan={2} className={cn(PIVOT_TH, 'w-8 min-w-8 border-b border-l-0 border-r border-white/20')}>
                  SELECT
                </th>
                <th colSpan={8} className={cn(PIVOT_TH, 'border-b border-l-0 px-2')}>
                  SCHEDULE
                </th>
                {onAttachManualRate && (
                  <th rowSpan={2} className={cn(PIVOT_TH, 'w-8 min-w-8 border-b')}>
                    <span className="sr-only">Attach rate</span>
                  </th>
                )}
                {rateTypes.map(rt => (
                  <th key={rt} colSpan={1 + containerTypes.length}
                    className={cn(PIVOT_TH, 'border-b border-l-2 border-b-white/20 border-l-white/50')}
                    style={{ background: RATE_COLORS_RC[rt] ?? COLOR.muted }}>
                    {rt.toUpperCase()}
                  </th>
                ))}
              </tr>
              {/* Row 2: sub-headers */}
              <tr className="bg-primary">
                {['CARRIER', 'VESSEL / VOYAGE', 'ORIGIN', 'DEST', 'ETD', 'ETA', 'TT', 'CUTOFF'].map((h) => (
                  <th key={h} className={cn(PIVOT_TH, !['ETD', 'ETA', 'TT', 'CUTOFF'].includes(h) && 'text-left')}>{h}</th>
                ))}
                {rateTypes.map(rt => (
                  <Fragment key={rt}>
                    <th className={cn(PIVOT_TH, 'w-7 min-w-7 max-w-7 border-l-2 border-l-white/50')}
                      style={{ background: RATE_COLORS_RC[rt] ?? COLOR.muted }}>
                      <span aria-hidden="true">{'\u2713'}</span>
                      <span className="sr-only">Select {rt}</span>
                    </th>
                    {containerTypes.map((ct, ctIdx) => (
                      <th key={`${rt}-${ct}`} className={cn(PIVOT_TH, ctIdx === 0 && 'border-l-white/30')}
                        style={{ background: RATE_COLORS_RC[rt] ?? COLOR.muted }}>{ct}</th>
                    ))}
                  </Fragment>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={totalCols} className="p-5 text-center text-label text-fg-muted">No schedules match the active filters.</td></tr>
              )}
              {filtered.map((row, rowIdx) => {
                const hasAnySelection = rateTypes.some(rt => isGroupSelected(row, rt, selectedIds) || isGroupPartial(row, rt, selectedIds))
                const schedSelected = selectedScheduleIds.has(row.scheduleId)
                return (
                  <tr key={row.scheduleId} className={(hasAnySelection || schedSelected) ? 'bg-primary-subtle' : rowIdx % 2 ? 'bg-canvas' : undefined}>
                    <td className={cn(PIVOT_TD, 'w-8 border-l-0')}>
                      <Checkbox
                        checked={schedSelected}
                        onChange={() => onToggleSchedule(row.scheduleId)}
                        aria-label={`Select schedule ${scheduleName(row)}`}
                        className="flex justify-center"
                      />
                    </td>
                    <td className={cn(PIVOT_TD, 'font-semibold')}>{row.linerName || '-'}</td>
                    <td className={PIVOT_TD}>
                      <div className="flex items-center gap-1">
                        <Ship size={14} aria-hidden="true" className="shrink-0 text-fg-muted" />
                        <span>{row.vesselName || '-'}{row.voyageNumber ? ` / ${row.voyageNumber}` : ''}</span>
                      </div>
                    </td>
                    <td className={PIVOT_TD}>{row.originCity || row.origin || '-'}</td>
                    <td className={PIVOT_TD}>{row.destinationCity || row.destination || '-'}</td>
                    <td className={cn(PIVOT_TD, 'text-center')}>{fmtDate(row.etd)}</td>
                    <td className={cn(PIVOT_TD, 'text-center')}>{fmtDate(row.eta)}</td>
                    <td className={cn(PIVOT_TD, 'text-center font-semibold')}>
                      {row.totalDuration != null ? `${row.totalDuration}d` : '-'}
                    </td>
                    <td className={PIVOT_TD}>{fmtDate(row.bkCutoff)}</td>
                    {onAttachManualRate && (
                      <td className={cn(PIVOT_TD, 'w-8 text-center')}>
                        <Tooltip content="Attach manual rate to this schedule">
                          <Button
                            variant="ghost"
                            size="sm"
                            icon={<Plus size={14} aria-hidden="true" />}
                            aria-label="Attach manual rate to this schedule"
                            onClick={() => onAttachManualRate(row)}
                            className="w-7 px-0"
                          />
                        </Tooltip>
                      </td>
                    )}
                    {rateTypes.map(rt => {
                      const groupKeys = getGroupAggKeys(row, rt)
                      const hasRates = groupKeys.length > 0
                      const checked = isGroupSelected(row, rt, selectedIds)
                      const partial = isGroupPartial(row, rt, selectedIds)
                      return (
                        <Fragment key={rt}>
                          {/* Checkbox cell */}
                          <td className={cn(PIVOT_TD, 'w-7 border-l-2 border-l-line')}>
                            {hasRates && (
                              <Checkbox
                                checked={checked}
                                isIndeterminate={partial && !checked}
                                onChange={() => onToggleGroup(row, rt)}
                                aria-label={`Select ${rt} rates for ${scheduleName(row)}`}
                                className="flex justify-center"
                              />
                            )}
                          </td>
                          {/* Container type cells */}
                          {containerTypes.map(ct => {
                            const cells = row.rates[rt]?.[ct]
                            const display = cells?.length
                              ? cells.reduce((best, c) => c.rate < best.rate ? c : best)
                              : null
                            return (
                              <td
                                key={`${rt}-${ct}`}
                                title={display ? cellTooltip(display) : undefined}
                                className={cn(PIVOT_TD, 'text-center')}
                              >
                                {display ? (
                                  <>
                                    <div className="whitespace-nowrap font-bold">
                                      {display.currency} {display.rate.toLocaleString()}
                                    </div>
                                    {cells!.length > 1 && (
                                      <div className="text-label text-fg-muted">+{cells!.length - 1} more</div>
                                    )}
                                    {display.note && (
                                      <div className="mx-auto mt-px max-w-[72px] truncate leading-tight text-fg-muted">
                                        {display.note}
                                      </div>
                                    )}
                                  </>
                                ) : (
                                  <span className="text-fg-muted">-</span>
                                )}
                              </td>
                            )
                          })}
                        </Fragment>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}

// ---- Rate brief document pieces ----

const BRIEF_DIVIDER = 'my-2 border-t border-line'
const BRIEF_SECTION = 'mb-1 text-label font-bold uppercase tracking-label text-fg-muted'
const BRIEF_ITEM = 'border-0 border-b border-dashed border-line py-1.5'
const BRIEF_META = 'mt-px text-label text-fg-muted'

function BriefRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex justify-between py-0.5 text-control">
      <span className="text-fg-muted">{label}</span>
      <strong className="font-semibold text-fg">{children}</strong>
    </div>
  )
}

// ---- Inquiry details panel (left column of the rate options and manual entry views) ----

const DETAIL_LABEL = 'mb-0.5 text-label text-fg-muted'
const DETAIL_VALUE = 'text-control font-semibold text-fg'
const DETAIL_META = 'mt-px text-label text-fg-label'
const NOTICE_BOX = 'rounded-card border border-line-soft bg-canvas p-3.5 text-center text-control text-fg-muted'
const FALLBACK_GRID = 'grid grid-cols-[1fr_100px_80px_80px_70px_90px]'

function InquiryDetailsPanel({ inquiry, container, custData, dest, allContainers, containerLabel }: {
  inquiry: Inquiry
  container?: ContainerLine
  custData?: Customer
  dest?: string
  allContainers: { qty: number; type: string }[]
  containerLabel: string
}) {
  return (
    <div className="mr-6 flex w-[248px] shrink-0 flex-col gap-3.5 border-r border-line-soft pr-5">
      <div className="text-label font-bold uppercase tracking-label text-fg-muted">
        Inquiry · {inquiry.id}
      </div>

      <div>
        <div className={DETAIL_LABEL}>Customer</div>
        <div className="text-control font-bold text-fg">{inquiry.customer_name}</div>
        {custData?.tier && <div className="mt-px text-label text-accent">{custData.tier}</div>}
      </div>

      <div>
        <div className={DETAIL_LABEL}>Route</div>
        <div className={DETAIL_VALUE}>{inquiry.origin}</div>
        <div className="my-0.5 ml-0.5 text-label text-fg-muted">↓</div>
        <div className={DETAIL_VALUE}>{dest}</div>
      </div>

      <div>
        <div className={DETAIL_LABEL}>
          {allContainers.length > 1 ? 'Containers' : 'Container'}
        </div>
        {inquiry.containers && inquiry.containers.length > 0 ? (
          <div className="flex flex-col gap-1">
            {inquiry.containers.map((c, ci) => (
              <div key={ci}>
                <div className={DETAIL_VALUE}>{c.quantity}x {c.containerType}</div>
                {c.commodityType && <div className={DETAIL_META}>{c.commodityType}</div>}
                {c.weight && <div className="mt-px text-label text-fg-muted">{c.weight} kg</div>}
              </div>
            ))}
          </div>
        ) : (
          <>
            <div className={DETAIL_VALUE}>{containerLabel || '-'}</div>
            {(container?.commodityType || inquiry.commodity_type) && (
              <div className={DETAIL_META}>{container?.commodityType || inquiry.commodity_type}</div>
            )}
            {(container?.weight || inquiry.cargo_weight) && (
              <div className="mt-px text-label text-fg-muted">{container?.weight || inquiry.cargo_weight}</div>
            )}
          </>
        )}
      </div>

      <div className="h-px bg-line-soft" />

      <div>
        <div className={DETAIL_LABEL}>Cargo Ready</div>
        <div className={cn(DETAIL_VALUE, !inquiry.cargo_ready_date && 'text-fg-muted')}>
          {inquiry.cargo_ready_date || 'Not set'}
        </div>
      </div>

      <div>
        <div className={DETAIL_LABEL}>Service Mode</div>
        <div className="text-control text-fg">
          {inquiry.delivery_type === 'door-to-door' ? 'Door-to-Door' : 'Port-to-Port'}
        </div>
      </div>

      {inquiry.incoterm && (
        <div>
          <div className={DETAIL_LABEL}>Incoterm</div>
          <div className="text-control text-fg">{inquiry.incoterm}</div>
        </div>
      )}

      {inquiry.priority && (
        <div>
          <div className={DETAIL_LABEL}>Priority</div>
          <div className="text-control text-fg">{inquiry.priority}</div>
        </div>
      )}

      {inquiry.preferred_rate != null && (
        <div>
          <div className={DETAIL_LABEL}>Target Rate</div>
          <div className="text-control font-bold text-success">USD {inquiry.preferred_rate.toLocaleString()}</div>
        </div>
      )}

      {inquiry.preferred_liners && inquiry.preferred_liners.length > 0 && (
        <div>
          <div className="mb-1 text-label text-fg-muted">Preferred Liners</div>
          <div className="flex flex-col gap-0.5">
            {inquiry.preferred_liners.map(l => (
              <span key={l} className="text-label font-semibold text-primary">{l}</span>
            ))}
          </div>
        </div>
      )}

      {inquiry.request && (
        <div>
          <div className={DETAIL_LABEL}>Request</div>
          <div className="text-label leading-normal text-fg-label">{inquiry.request}</div>
        </div>
      )}
    </div>
  )
}

/** Thin rule with a centred section title, above the schedule rate tables. */
function RateSectionDivider({ title, selectedCount }: { title: string; selectedCount: number }) {
  return (
    <div className="mt-0.5 flex items-center gap-2.5">
      <div className="h-px flex-1 bg-line-soft" />
      <span className="text-label font-bold uppercase tracking-label text-accent">{title}</span>
      {selectedCount > 0 && <span className="text-label font-semibold text-success">{selectedCount} selected</span>}
      <div className="h-px flex-1 bg-line-soft" />
    </div>
  )
}

interface RateCheckProps {
  inquiry: Inquiry
  container?: ContainerLine
  customers: Customer[]
  variant: 'procurement' | 'cs-sales'
  onAdvanceWorkflow: (inquiryId: string, nextStage: WorkflowStage, skipApi?: boolean) => void
  onLogActivity: (entry: Omit<ActivityEntry, 'id' | 'timestamp'>) => void
  onFlash: (msg: string, action?: { label: string; onClick: () => void }) => void
  onGoBack: () => void
  /** Called instead of onGoBack when the rate check results in a quotation-prep advancement (proceed to quotation / send brief to sales). */
  onGoToQuotations?: () => void
}

export default function RateCheck({
  inquiry, container, customers, variant,
  onAdvanceWorkflow, onLogActivity, onFlash, onGoBack, onGoToQuotations,
}: RateCheckProps) {
  const { activeEmployee, activeRole } = useRole()
  const isProcurement = variant === 'procurement'

  // Mode toggle
  const [mode, setMode] = useState<'db-select' | 'manual-entry' | 'review'>('db-select')
  const [sidebarOpen, setSidebarOpen] = useState(true)

  // DB rate state
  const [dbRates, setDbRates] = useState<UnifiedRate[]>([])
  const [, setDbLoading] = useState(false)
  const [dbSearched, setDbSearched] = useState(false)
  const [selectedIds] = useState<Set<string>>(new Set())

  // Skip procurement flag (cs-sales only)
  const [skipProcurement] = useState(false)

  // ID of the rate request created on mount - used to PATCH it on submit
  const [rateRequestId, setRateRequestId] = useState<number | null>(null)

  // Reference data
  const [portList, setPortList] = useState<PortRecord[]>([])
  const [linerList, setLinerList] = useState<LinerRecord[]>([])
  const [tradeLaneList, setTradeLaneList] = useState<TradeLaneRecord[]>([])
  const [employeeList, setEmployeeList] = useState<EmployeeRecord[]>([])
  const [, setProcurementEmployees] = useState<EmployeeRecord[]>([])

  // Helpers to derive prefill values from inquiry / container
  const prefillDest = container?.destination || inquiry.destination
  const prefillContType = container?.containerType || inquiry.container_type || '20GP'
  const prefillCommodityType = container?.commodityType || inquiry.commodity_type || ''
  const prefillCommodityName = container?.commodityName || ''
  const prefillWeight = String(container?.weight ?? inquiry.cargo_weight ?? '')

  // Manual rate entry state (procurement only)
  const [mrTab, setMrTab] = useState<ManualRateTab>('vessel-spot')
  const [mrLiner, setMrLiner] = useState('')
  const [mrLinerOther, setMrLinerOther] = useState(!inquiry.preferred_liners?.length)
  const [mrTradeLane, setMrTradeLane] = useState('')
  const [mrOrigin, setMrOrigin] = useState(inquiry.origin || '')
  const [mrDestination, setMrDestination] = useState(prefillDest || '')
  const [mrServiceLane, setMrServiceLane] = useState('')
  const [mrSalesperson, setMrSalesperson] = useState(activeEmployee.name || '')
  const defaultMrContainer = (): MrContainerRate => ({ containerType: prefillContType, tus: '', maxWeight: prefillWeight, rate: '', currency: 'USD' })
  const [mrContainers, setMrContainers] = useState<MrContainerRate[]>([defaultMrContainer()])
  const updateMrContainer = (idx: number, patch: Partial<MrContainerRate>) =>
    setMrContainers(prev => prev.map((c, i) => i === idx ? { ...c, ...patch } : c))
  const addMrContainer = () => setMrContainers(prev => [...prev, defaultMrContainer()])
  const removeMrContainer = (idx: number) => setMrContainers(prev => prev.filter((_, i) => i !== idx))
  const [mrValidFrom, setMrValidFrom] = useState('')
  const [mrValidTo, setMrValidTo] = useState('')
  const [mrNote, setMrNote] = useState('')
  const [mrSpecialRemark, setMrSpecialRemark] = useState('')
  const [mrFreeTime, setMrFreeTime] = useState('')
  const [mrIsSold, setMrIsSold] = useState(false)
  // Vessel Spot only
  const [mrVesselName, setMrVesselName] = useState('')
  const [mrVoyage, setMrVoyage] = useState('')
  const [mrVesselEta, setMrVesselEta] = useState('')
  const [mrVesselEtd, setMrVesselEtd] = useState('')
  const [mrFclOpenDate, setMrFclOpenDate] = useState('')
  const [mrFclOpenTime, setMrFclOpenTime] = useState('')
  const [mrFclCutDate, setMrFclCutDate] = useState('')
  const [mrFclCutTime, setMrFclCutTime] = useState('')
  const [mrIsCancelled, setMrIsCancelled] = useState(false)
  const [mrCancelReason, setMrCancelReason] = useState('')
  const [mrCancelCharge, setMrCancelCharge] = useState('')
  const [mrCancelChargeCurrency, setMrCancelChargeCurrency] = useState('USD')
  // Special only
  const [mrCommodityType, setMrCommodityType] = useState<string>(prefillCommodityType)
  const [mrCommodityName, setMrCommodityName] = useState(prefillCommodityName)
  const [mrSurcharges, setMrSurcharges] = useState<{ type: string; amount: string; currency: string }[]>([])

  // Multi-entry manual rates (procurement can add several rate types per inquiry)
  const [manualEntries, setManualEntries] = useState<ManualRateEntry[]>([])
  // Track backend-created rate IDs from manual entries so we can link them as rate request options on submit
  const [createdManualRateIds, setCreatedManualRateIds] = useState<{ rateType: string; rateId: number; scheduleId?: number }[]>([])
  // Submit/escalate run one at a time. The ref blocks a second click in the same tick;
  // the state drives the disabled/busy button.
  const [submitting, setSubmitting] = useState(false)
  const submittingRef = useRef(false)
  // Kept across retries so a retry never creates a second rate request or links an option twice
  const createdRequestIdRef = useRef<number | null>(null)
  const linkedOptionKeysRef = useRef<Set<string>>(new Set())

  // Path 3: schedule-linked manual rate entry - holds the schedule row the user wants to attach a rate to
  const [linkedSchedule, setLinkedSchedule] = useState<SelectablePivotRow | null>(null)

  // Enriched schedule+rates data (CS/Sales only)
  const [enrichedData, setEnrichedData] = useState<AggregateScheduleRatesResponse | null>(null)
  const [enrichedLoading, setEnrichedLoading] = useState(false)

  // Incoming schedule details from CS (Procurement view - read-only)
  const [incomingSchedules, setIncomingSchedules] = useState<IncomingScheduleDetail[]>([])
  const [incomingRemark, setIncomingRemark] = useState<string | null>(null)

  // Aggregate schedule + rates data (procurement view)
  const [aggregateData, setAggregateData] = useState<AggregateScheduleRatesResponse | null>(null)
  const [aggregateLoading, setAggregateLoading] = useState(false)
  const [, setOpenScheduleCards] = useState<Set<string>>(new Set())
  // Aggregate rate selections - keys are "schedule_id:rate_type:rate_id" e.g. "3:tariff_rates:42"
  const [selectedAggregateRateIds, setSelectedAggregateRateIds] = useState<Set<string>>(new Set())
  // Schedule-level selections (independent of rate keys - works for rate-less schedules too)
  const [selectedScheduleIds, setSelectedScheduleIds] = useState<Set<number>>(new Set())

  // Notes
  const [formNote, setFormNote] = useState('')

  // Derived values
  const dest = container?.destination || inquiry.destination
  const contType = container?.containerType || inquiry.container_type
  const custData = customers.find(c => c.name.toLowerCase() === inquiry.customer_name.toLowerCase())
  const vesselFieldsReady = mrTab !== 'vessel-spot' || !!(mrVesselName.trim() && mrVoyage.trim() && mrVesselEta && mrVesselEtd && mrFclOpenDate && mrFclCutDate)
  const fakFieldsReady = mrTab !== 'fak' || !!(mrValidFrom && mrValidTo && linerList.some(l => l.name === mrLiner))
  const specialFieldsReady = mrTab !== 'special' || !!(mrValidFrom && mrValidTo && linerList.some(l => l.name === mrLiner) && inquiry.com_ids?.length)
  const canAddEntry = isProcurement && !!(mrLiner.trim() && mrContainers.some(c => c.rate.trim()) && vesselFieldsReady && fakFieldsReady && specialFieldsReady)
  const hasManualEntries = manualEntries.length > 0
  const hasDbSelections = selectedIds.size > 0
  const hasAggregateSelections = selectedAggregateRateIds.size > 0
  const hasScheduleSelections = selectedScheduleIds.size > 0
  const allContainers: { qty: number; type: string }[] =
    inquiry.containers && inquiry.containers.length > 0
      ? inquiry.containers.map(c => ({ qty: c.quantity, type: c.containerType }))
      : container
        ? [{ qty: container.quantity, type: container.containerType }]
        : inquiry.container_qty
          ? [{ qty: inquiry.container_qty, type: inquiry.container_type ?? '20GP' }]
          : []
  const containerLabel = allContainers.map(c => `${c.qty}x ${c.type}`).join(', ')

  // NAC visibility for cs-sales variant
  const canSeeNac = isProcurement || activeRole === 'Procurement' || activeRole === 'Admin' || (custData?.assigned_salesperson_id === activeEmployee.id)
  const visibleRates = canSeeNac ? dbRates : dbRates.filter(r => r.source_type !== 'NAC')

  // Enriched pivot for CS/Sales tabular view
  const enrichedPivot = useMemo<SelectablePivotResult>(
    () => !isProcurement && enrichedData ? pivotEnrichedData(enrichedData) : { rows: [], rateTypes: [], containerTypes: [] },
    [isProcurement, enrichedData],
  )
  const enrichedEmpty = !isProcurement && enrichedData !== null && enrichedPivot.rows.length === 0

  // Aggregate pivot for Procurement tabular view
  const aggregatePivot = useMemo<SelectablePivotResult>(
    () => isProcurement && aggregateData ? pivotEnrichedData(aggregateData) : { rows: [], rateTypes: [], containerTypes: [] },
    [isProcurement, aggregateData],
  )

  const handleToggleGroup = (row: SelectablePivotRow, rateType: string) => {
    setSelectedAggregateRateIds(prev => toggleGroup(row, rateType, prev))
    // Auto-select the schedule when any rate group is toggled
    setSelectedScheduleIds(prev => { const n = new Set(prev); n.add(row.scheduleId); return n })
  }

  const handleToggleRow = (row: SelectablePivotRow) => {
    // Use whichever pivot's rateTypes are relevant - enriched for CS/Sales, aggregate for Procurement
    const rt = isProcurement ? aggregatePivot.rateTypes : enrichedPivot.rateTypes
    setSelectedAggregateRateIds(prev => toggleRow(row, rt, prev))
    // Also mark the schedule as selected
    setSelectedScheduleIds(prev => { const n = new Set(prev); n.add(row.scheduleId); return n })
  }

  const handleToggleSchedule = (scheduleId: number) => {
    setSelectedScheduleIds(prev => {
      const next = new Set(prev)
      if (next.has(scheduleId)) next.delete(scheduleId)
      else next.add(scheduleId)
      return next
    })
  }

  // Path 3: Attach manual rate to a specific schedule
  const handleAttachManualRate = (row: SelectablePivotRow) => {
    console.log('[RateCheck] handleAttachManualRate - row:', JSON.stringify({ scheduleId: row.scheduleId, origin: row.origin, destination: row.destination, originCity: row.originCity, destinationCity: row.destinationCity, linerName: row.linerName, vesselName: row.vesselName }))
    console.log('[RateCheck] handleAttachManualRate - inquiry.origin:', inquiry.origin, 'inquiry.destination:', inquiry.destination)
    setLinkedSchedule(row)
    // Pre-fill form fields from the schedule
    if (row.linerName) setMrLiner(row.linerName)
    // Use schedule UNLOCODEs (row.origin / row.destination) - not inquiry city names
    setMrOrigin(row.origin || inquiry.origin || '')
    setMrDestination(row.destination || prefillDest || '')
    setMrVesselName(row.vesselName || '')
    setMrVoyage(row.voyageNumber || '')
    setMrVesselEtd(row.etd ? row.etd.slice(0, 10) : '')
    setMrVesselEta(row.eta ? row.eta.slice(0, 10) : '')
    setMode('manual-entry')
  }

  // Can proceed to review?
  const canReview = isProcurement
    ? (hasManualEntries || hasAggregateSelections)
    : (hasAggregateSelections || skipProcurement || enrichedEmpty)

  // Auto-fetch DB rates on mount - fan-out fetch then filter client-side by route / container
  useEffect(() => {
    setDbLoading(true)
    apiFetchAllRates()
      .then(rates => {
        const o   = (inquiry.origin || '').toLowerCase()
        const d   = (dest           || '').toLowerCase()
        const ct  = (contType       || '').replace(/\s/g, '').toLowerCase()

        const filtered = rates.filter(r => {
          const ro  = (r.origin         ?? '').toLowerCase()
          const rd  = (r.destination    ?? '').toLowerCase()
          const rct = (r.container_type ?? '').replace(/\s/g, '').toLowerCase()
          // 1. Origin match (bidirectional substring)
          if (o  && ro  && !ro.includes(o)  && !o.includes(ro))   return false
          // 2. Destination match (bidirectional substring)
          if (d  && rd  && !rd.includes(d)  && !d.includes(rd))   return false
          // 3. Container type match
          if (ct && rct && !rct.includes(ct) && !ct.includes(rct)) return false
          // Rates that expire before cargo ready date are still shown - marked with a warning
          return true
        })

        // Sort lowest rate to highest
        filtered.sort((a, b) => (a.rate ?? 0) - (b.rate ?? 0))

        setDbRates(filtered)
        setDbSearched(true)
      })
      .catch(() => { setDbRates([]); setDbSearched(true) })
      .finally(() => setDbLoading(false))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-fetch enriched schedule+rates for CS/Sales
  useEffect(() => {
    if (isProcurement) return
    setEnrichedLoading(true)
    apiGetEnrichedScheduleRates({
      cli_id: inquiry.cli_id ?? undefined,
      inq_id: inquiry.inq_id ?? undefined,
    })
      .then(data => { console.log('[RateCheck] enrichedData keys:', Object.keys(data), 'sample schedule_id:', Object.values(data)[0]?.schedule?.schedule_id); setEnrichedData(data) })
      .catch(err => { console.error('[RateCheck] enriched rates fetch failed:', err); setEnrichedData({}) })
      .finally(() => setEnrichedLoading(false))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch reference data for manual entry (procurement only)
  useEffect(() => {
    if (!isProcurement) return
    apiGetPorts().then(setPortList).catch(() => {})
    apiGetLiners().then(setLinerList).catch(() => {})
    apiGetTradeLanes().then(setTradeLaneList).catch(() => {})
    apiGetEmployeesDb().then(emps => {
      setEmployeeList(emps)
      const assigned = emps.find(e => e.emp_id === inquiry.employee_id)
      if (assigned) setMrSalesperson(assigned.name)
    }).catch(() => {})
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch reference data on mount.
  // Procurement: also fetch existing incoming request (CS-created) to get schedule_details + request_id.
  // CS/Sales: rate request creation is deferred to submit/escalation time (so schedules can be included).
  useEffect(() => {
    if (!inquiry.inq_id) { console.warn('[RateCheck] inquiry.inq_id is missing'); return }
    apiGetAuthEmployees('procurement')
      .then(emps => { setProcurementEmployees(emps) })
      .catch(() => {})

    if (isProcurement) {
      // Procurement: fetch the incoming rate request that CS escalated
      apiGetIncomingRateRequests()
        .then(incoming => {
          console.log('[RateCheck] incoming rate requests:', incoming.length, 'looking for inq_id:', inquiry.inq_id)
          // Use == for loose comparison in case of string/number mismatch
          const match = incoming.find(r => r.inq_id == inquiry.inq_id) // eslint-disable-line eqeqeq
          if (match) {
            console.log('[RateCheck] matched incoming request:', match.request_id, 'schedules:', match.schedule_details?.length ?? 0)
            setRateRequestId(match.request_id)
            setIncomingSchedules(match.schedule_details ?? [])
            setIncomingRemark(match.remark)
            // Fetch aggregate schedule + rates if we have schedule IDs and a client
            if (match.schedules?.length > 0 && inquiry.cli_id) {
              setAggregateLoading(true)
              apiGetAggregateScheduleRates({ cli_id: inquiry.cli_id, schedule_ids: match.schedules, request_id: match.request_id })
                .then(agg => {
                  console.log('[RateCheck] aggregate schedule rates:', Object.keys(agg).length, 'entries')
                  setAggregateData(agg)
                  // Auto-expand all schedule cards
                  setOpenScheduleCards(new Set(Object.keys(agg)))
                })
                .catch(err => console.error('[RateCheck] aggregate rates fetch failed:', err))
                .finally(() => setAggregateLoading(false))
            }
          } else {
            console.warn('[RateCheck] no incoming rate request found for inq_id:', inquiry.inq_id, 'available inq_ids:', incoming.map(r => r.inq_id))
          }
        })
        .catch(err => console.error('[RateCheck] incoming rate request fetch failed:', err))
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Add current manual form as an entry to the brief
  const addEntryToBrief = () => {
    if (!canAddEntry) return
    // The backend requires a valid trade lane on every rate
    const trLnId = tradeLaneList.find(t => t.trln_name === mrTradeLane)?.trln_id
    if (trLnId == null) {
      onFlash(tradeLaneList.length === 0
        ? 'No trade lanes are set up in the system yet, so rates cannot be saved. Ask an administrator to add trade lanes.'
        : 'Select a trade lane before adding this rate.')
      return
    }
    const currentLinkedSchedule = linkedSchedule
    setManualEntries(prev => [...prev, {
      id: `mr-${Date.now()}`,
      scheduleId: currentLinkedSchedule?.scheduleId ?? null,
      scheduleSummary: currentLinkedSchedule
        ? `${currentLinkedSchedule.linerName || '-'} / ${currentLinkedSchedule.vesselName || '-'}${currentLinkedSchedule.voyageNumber ? ` V.${currentLinkedSchedule.voyageNumber}` : ''}`
        : null,
      tab: mrTab, liner: mrLiner, tradeLane: mrTradeLane,
      origin: mrOrigin, destination: mrDestination,
      serviceLane: mrServiceLane, salesperson: mrSalesperson,
      containers: mrContainers.filter(c => c.rate.trim()),
      validFrom: mrValidFrom, validTo: mrValidTo,
      note: mrNote, specialRemark: mrSpecialRemark,
      freeTime: mrFreeTime, isSold: mrIsSold,
      isCancelled: mrIsCancelled, cancelReason: mrCancelReason,
      cancelCharge: mrCancelCharge, cancelChargeCurrency: mrCancelChargeCurrency,
      vesselName: mrVesselName, voyage: mrVoyage,
      vesselEta: mrVesselEta, vesselEtd: mrVesselEtd,
      fclOpenDate: mrFclOpenDate, fclOpenTime: mrFclOpenTime,
      fclCutDate: mrFclCutDate, fclCutTime: mrFclCutTime,
      commodityType: mrCommodityType, commodityName: mrCommodityName,
      surcharges: [...mrSurcharges],
    }])

    // Persist to backend - one POST per filled container row
    const linId  = linerList.find(l => l.name === mrLiner)?.lin_id
    const inqId  = inquiry.inq_id
    const filledContainers = mrContainers.filter(c => c.rate.trim())

    // Map frontend surcharges to backend SurchargeNew format.
    // rate_id is a placeholder - backend overrides it with the newly created rate's ID.
    const surchargePayload = mrSurcharges
      .filter(s => s.type && s.amount)
      .map(s => ({ rate_id: 0, type: s.type, amt: Number(s.amount), currency: s.currency }))

    if (mrTab === 'vessel-spot') {
      filledContainers.forEach(c => {
        const vesselPayload = {
          inq_id: inqId,
          lin_id: linId,
          voyage: mrVoyage,
          vessel_name: mrVesselName,
          eta: mrVesselEta,
          etd: mrVesselEtd,
          rate: Number(c.rate),
          currency: c.currency,
          fcl_opening: `${mrFclOpenDate}T${mrFclOpenTime || '00:00'}:00`,
          fcl_cutoff:  `${mrFclCutDate}T${mrFclCutTime || '00:00'}:00`,
          origin: mrOrigin,
          destination: mrDestination,
          tr_ln_id: trLnId,
          container_type: c.containerType,
          volume: c.tus.trim() ? (parseInt(c.tus) || 1) : 1,
          free_days: mrFreeTime.trim() || undefined,
          max_weight: c.maxWeight.trim() ? parseInt(c.maxWeight) : undefined,
          note: mrNote || undefined,
          special_remark: mrSpecialRemark || undefined,
          issold: mrIsSold || undefined,
          iscancelled: mrIsCancelled || undefined,
          cancellationreason: mrCancelReason || undefined,
          cancellationfee: mrCancelCharge ? Number(mrCancelCharge) : undefined,
          surcharges: surchargePayload.length > 0 ? surchargePayload : undefined,
          schedule_id: currentLinkedSchedule?.scheduleId ?? undefined,
        }
        console.log('[RateCheck] vessel-spot payload →', JSON.stringify(vesselPayload, null, 2))
        apiCreateVesselRate(vesselPayload).then(res => {
          const id = res.srid as number | undefined
          if (id) setCreatedManualRateIds(prev => [...prev, { rateType: 'vessel_by_vessel_rate', rateId: id, scheduleId: currentLinkedSchedule?.scheduleId }])
        }).catch(err => { console.error('[RateCheck] vessel-spot POST failed:', err); onFlash(`ERROR saving vessel rate: ${(err as Error).message}`) })
      })
    } else if (mrTab === 'fak') {
      filledContainers.forEach(c => {
        apiCreateFakRate({
          lin_id: linId!,
          tr_ln_id: trLnId,
          inq_id: inqId,
          valid_from: `${mrValidFrom}T00:00:00`,
          valid_to: `${mrValidTo}T00:00:00`,
          volume: c.tus.trim() ? (parseInt(c.tus) || 1) : 1,
          container_type: c.containerType,
          origin: mrOrigin,
          destination: mrDestination,
          rate: Number(c.rate),
          currency: c.currency,
          free_time: mrFreeTime.trim() || undefined,
          max_weight: c.maxWeight.trim() ? parseInt(c.maxWeight) : undefined,
          note: mrNote || undefined,
          special_remark: mrSpecialRemark || undefined,
          issold: mrIsSold || undefined,
          surcharges: surchargePayload.length > 0 ? surchargePayload : undefined,
          schedule_id: currentLinkedSchedule?.scheduleId ?? undefined,
        }).then(res => {
          const id = res.fak_id as number | undefined
          if (id) setCreatedManualRateIds(prev => [...prev, { rateType: 'fak_rates', rateId: id, scheduleId: currentLinkedSchedule?.scheduleId }])
        }).catch(err => { console.error('[RateCheck] fak POST failed:', err); onFlash(`ERROR saving FAK rate: ${(err as Error).message}`) })
      })
    } else {
      // special
      const comId = inquiry.com_ids?.[0] ?? 0
      filledContainers.forEach(c => {
        apiCreateSpecialRate({
          lin_id: linId!,
          tr_ln_id: trLnId,
          inq_id: inqId,
          com_id: comId,
          valid_from: `${mrValidFrom}T00:00:00`,
          valid_to: `${mrValidTo}T00:00:00`,
          rate: Number(c.rate),
          origin: mrOrigin,
          destination: mrDestination,
          container_type: c.containerType,
          volume: c.tus.trim() ? (parseInt(c.tus) || 1) : 1,
          currency: c.currency,
          free_days: mrFreeTime.trim() || undefined,
          max_weight: c.maxWeight.trim() ? parseInt(c.maxWeight) : undefined,
          note: mrNote || undefined,
          special_remark: mrSpecialRemark || undefined,
          issold: mrIsSold || undefined,
          surcharges: surchargePayload.length > 0 ? surchargePayload : undefined,
          schedule_id: currentLinkedSchedule?.scheduleId ?? undefined,
        }).then(res => {
          const id = res.sprid as number | undefined
          if (id) setCreatedManualRateIds(prev => [...prev, { rateType: 'special_rate', rateId: id, scheduleId: currentLinkedSchedule?.scheduleId }])
        }).catch(err => { console.error('[RateCheck] special POST failed:', err); onFlash(`ERROR saving special rate: ${(err as Error).message}`) })
      })
    }

    // Reset rate-specific fields; keep carrier & route
    setMrContainers([defaultMrContainer()]); setMrValidFrom(''); setMrValidTo('')
    setMrNote(''); setMrSpecialRemark('')
    setMrFreeTime(''); setMrIsSold(false)
    setMrIsCancelled(false); setMrCancelReason(''); setMrCancelCharge(''); setMrCancelChargeCurrency('USD')
    setMrVesselName(''); setMrVoyage('')
    setMrVesselEta(''); setMrVesselEtd('')
    setMrFclOpenDate(''); setMrFclOpenTime('')
    setMrFclCutDate(''); setMrFclCutTime('')
    setMrCommodityType(prefillCommodityType); setMrCommodityName(prefillCommodityName)
    setMrSurcharges([])
    setLinkedSchedule(null)
  }
  const removeEntry = (idx: number) => setManualEntries(prev => prev.filter((_, i) => i !== idx))

  // Summarise a single manual entry for activity log
  const summariseEntry = (e: ManualRateEntry) => {
    const surTotal = totalSurcharge(e)
    const surNames = surchargeTypeNames(e)
    const p: string[] = [
      `type=${MR_TAB_LABELS[e.tab]}`,
      `liner=${e.liner || '?'}`,
      `route=${e.origin || '?'} → ${e.destination || '?'}`,
    ]
    const cSummary = e.containers.map(c => `${c.containerType || '?'}: ${(Number(c.rate || 0) + surTotal).toLocaleString()} ${c.currency}`).join('; ')
    if (cSummary) p.push(`containers=[${cSummary}]`)
    if (surNames.length > 0) p.push(`inclusive of ${surNames.join(', ')}`)
    if (e.tradeLane) p.push(`tradeLane=${e.tradeLane}`)
    if (e.freeTime) p.push(`freeDays=${e.freeTime}`)
    if (e.validFrom || e.validTo) p.push(`valid=${e.validFrom || '?'} → ${e.validTo || '?'}`)
    if (e.isSold) p.push('SOLD')
    if (e.isCancelled) p.push(`CANCELLED: ${e.cancelReason || 'no reason'}${e.cancelCharge ? ` (charge: ${e.cancelCharge} ${e.cancelChargeCurrency})` : ''}`)
    if (e.tab === 'vessel-spot' && e.vesselName) p.push(`vessel=${e.vesselName}`)
    return p.join(', ')
  }

  // Helper: build SchedulePayload[] from enriched data for selected schedule IDs
  const getEnrichedSchedulePayloads = (): SchedulePayload[] | undefined => {
    if (!enrichedData) return undefined
    // Union: explicit schedule selections + schedule IDs extracted from rate-key selections
    const fromRateKeys = [...selectedAggregateRateIds].map(k => Number(k.split(':')[0]))
    const wantedIds = new Set([...selectedScheduleIds, ...fromRateKeys])
    if (wantedIds.size === 0) return undefined
    // enrichedData keys are array indices (0,1,2…), NOT schedule_ids - match by schedule.schedule_id
    const payloads: SchedulePayload[] = []
    for (const entry of Object.values(enrichedData)) {
      const s = entry.schedule
      if (!wantedIds.has(s.schedule_id)) continue
      payloads.push({
        scac: s.scac,
        lin_id: s.lin_id,
        service_name: s.service_name ?? null,
        vessel_name: s.vessel_name,
        voyage_number: s.voyage_number,
        origin_unloc: s.origin_unloc,
        origin_city_name: s.origin_city_name ?? null,
        destination_unloc: s.destination_unloc,
        destination_city_name: s.destination_city_name ?? null,
        origin_departure_date: s.origin_departure_date,
        destination_arrival_date: s.destination_arrival_date,
        terminal_cutoff: s.terminal_cutoff ?? null,
        bk_cutoff: s.bk_cutoff ?? null,
        si_cutoff: s.si_cutoff ?? null,
        vgm_cutoff: s.vgm_cutoff ?? null,
        total_duration: s.total_duration,
        schedule_type: s.schedule_type,
        legs: s.legs ?? null,
      })
    }
    console.log('[RateCheck] getEnrichedSchedulePayloads:', wantedIds.size, 'wanted →', payloads.length, 'matched')
    return payloads.length > 0 ? payloads : undefined
  }

  // Helper: create a CS/Sales rate request
  const createCsRateRequest = (remark: string, isGiven: boolean) => {
    const schedules = getEnrichedSchedulePayloads()
    console.log('[RateCheck] createCsRateRequest:', { inq_id: inquiry.inq_id, is_given: isGiven, remark, selected_schedules: schedules })
    return apiCreateRateRequest({
      inq_id: inquiry.inq_id!,
      emp_id_requested: BACKEND_ACTOR_ID,
      is_given: isGiven,
      remark,
      selected_schedules: schedules ?? [],
    })
  }

  const errMsg = (err: unknown) => (err instanceof Error ? err.message : String(err)).slice(0, 160)

  const runExclusive = async (fn: () => Promise<void>) => {
    if (submittingRef.current) return
    submittingRef.current = true
    setSubmitting(true)
    try {
      await fn()
    } finally {
      submittingRef.current = false
      setSubmitting(false)
    }
  }

  // Create the CS/Sales rate request once; a retry after a partial failure reuses it
  const ensureCsRateRequest = async (remark: string, isGiven: boolean): Promise<number | undefined> => {
    if (createdRequestIdRef.current != null) return createdRequestIdRef.current
    const res = await createCsRateRequest(remark, isGiven)
    const id = res?.request_id
    if (id != null) createdRequestIdRef.current = id
    return id
  }

  type OptionLink = { key: string; payload: Parameters<typeof apiAddRateRequestOption>[1] }
  // Link rate options, skipping any already linked by an earlier attempt. Throws if any fail.
  const linkOptions = async (requestId: number, links: OptionLink[]) => {
    const pending = links.filter(l => !linkedOptionKeysRef.current.has(l.key))
    const results = await Promise.allSettled(pending.map(l => apiAddRateRequestOption(requestId, l.payload)))
    results.forEach((r, i) => { if (r.status === 'fulfilled') linkedOptionKeysRef.current.add(pending[i].key) })
    const failed = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected')
    if (failed.length > 0) {
      console.error('[RateCheck] rate option link failed:', failed.map(f => f.reason))
      throw new Error(`${failed.length} of ${pending.length} rate option(s) failed to link: ${errMsg(failed[0].reason)}`)
    }
  }

  // Submit handler
  const handleSubmit = () => runExclusive(async () => {
    // Non-procurement branches: create rate request at submit time (includes schedules)
    if (!isProcurement && skipProcurement) {
      createCsRateRequest(
        `Procurement escalation skipped. CS/Sales proceeding directly to quotation for ${inquiry.inq_id}. ${inquiry.origin} → ${dest ?? ''}. ${formNote || ''}`.trim(),
        true,
      ).catch(err => console.error('[RateCheck] rate request create failed:', err))
      onAdvanceWorkflow(inquiry.id, 'quotation-prep')
      onLogActivity({
        actor_role: activeRole,
        actor_id: activeEmployee.id,
        action: `Rate check completed. Procurement escalation skipped - sent directly to Sales for quotation.`,
        ref_type: 'inquiry',
        ref_id: inquiry.id,
        customer_name: inquiry.customer_name,
        pushed_to: 'Sales',
        notes: formNote || `${inquiry.origin} → ${dest} - procurement escalation skipped`,
      })
      onFlash(`${inquiry.id} → Skipped Procurement, sent to Sales`)
      ;(onGoToQuotations ?? onGoBack)()
      return
    }
    if (!isProcurement && !hasDbSelections && !hasAggregateSelections) {
      try {
        await createCsRateRequest(
          `No suitable rates found. Escalating to Procurement for rate sourcing. ${inquiry.inq_id}: ${inquiry.origin} → ${dest ?? ''}. ${formNote || ''}`.trim(),
          false,
        )
      } catch (err) {
        console.error('[RateCheck] rate request create failed:', err)
        onFlash(`Could not escalate to Procurement: ${errMsg(err)}`)
        return
      }
      onAdvanceWorkflow(inquiry.id, 'procurement-request')
      onLogActivity({
        actor_role: activeRole,
        actor_id: activeEmployee.id,
        action: `No suitable rates found. Escalated to Procurement for rate sourcing.`,
        ref_type: 'inquiry',
        ref_id: inquiry.id,
        customer_name: inquiry.customer_name,
        pushed_to: 'Procurement',
        notes: formNote || `${inquiry.origin} → ${dest} - escalated to procurement`,
      })
      onFlash(`${inquiry.id} → Escalated to Procurement`)
      onGoBack()
      return
    }

    // Combined: DB selections + manual entries + aggregate selections (procurement) or DB only (cs-sales)
    const selected = hasDbSelections ? (isProcurement ? dbRates : visibleRates).filter(r => selectedIds.has(r.id)) : []
    const dbSummary = selected.map(r => `${r.liner_name || 'N/A'} ${r.source_type} $${r.rate ?? 0} (${r.container_type || 'N/A'})`).join('; ')
    const manualSummary = manualEntries.map(e => summariseEntry(e)).join(' || ')

    const totalCount = selected.length + manualEntries.length + selectedAggregateRateIds.size
    const actionParts: string[] = []
    if (selected.length) actionParts.push(`${selected.length} DB rate(s)`)
    if (selectedAggregateRateIds.size) actionParts.push(`${selectedAggregateRateIds.size} schedule rate(s)`)
    if (manualEntries.length) actionParts.push(`${manualEntries.length} manual rate(s)`)

    const briefRemark = isProcurement
      ? [
          `Rate brief sent to Sales for ${inquiry.inq_id}.`,
          actionParts.length ? `Rates: ${actionParts.join(' + ')}.` : '',
          manualSummary ? `Manual: ${manualSummary}.` : '',
          formNote ? `Message: ${formNote}` : '',
        ].filter(Boolean).join(' ')
      : [
          `CS/Sales rate check completed for ${inquiry.inq_id}.`,
          `${totalCount} rate(s) selected.`,
          dbSummary ? `Rates: ${dbSummary}.` : '',
          selectedAggregateRateIds.size > 0 ? `${selectedAggregateRateIds.size} enriched schedule rate(s).` : '',
          formNote ? `Note: ${formNote}` : '',
        ].filter(Boolean).join(' ')

    // Rate request option mapping
    const RATE_TYPE_MAP: Record<string, string> = {
      tariff: 'tariff_rates', nac: 'nac', contracted: 'contracted_rates',
      vessel: 'vessel_by_vessel_rate', fak: 'fak_rates', special: 'special_rate',
    }

    // Every step below must succeed before the workflow advances or the page navigates away.
    if (isProcurement) {
      // Procurement: PATCH the existing incoming rate request, then link its options
      if (rateRequestId) {
        try {
          await apiPatchRateRequestProc(rateRequestId, { is_given: true, remark: briefRemark })
        } catch (err) {
          console.error('[RateCheck] rate request patch failed:', err)
          onFlash(`Could not send the rate brief: ${errMsg(err)}`)
          return
        }
        const links: OptionLink[] = []
        for (const mr of createdManualRateIds) {
          links.push({
            key: `manual:${mr.rateType}:${mr.rateId}`,
            payload: { request_id: rateRequestId, rate_type: mr.rateType, rate_id: mr.rateId, schedule_id: mr.scheduleId },
          })
        }
        // Aggregate schedule rate selections (key = "schedule_id:rate_type:rate_id")
        for (const aggKey of selectedAggregateRateIds) {
          const parts = aggKey.split(':')
          if (parts.length < 3) continue
          const scheduleId = Number(parts[0])
          const rateType = parts.slice(1, -1).join(':')
          const rateId = Number(parts[parts.length - 1])
          if (!isNaN(rateId) && !isNaN(scheduleId)) {
            links.push({ key: `agg:${aggKey}`, payload: { request_id: rateRequestId, rate_type: rateType, rate_id: rateId, schedule_id: scheduleId } })
          }
        }
        try {
          await linkOptions(rateRequestId, links)
        } catch (err) {
          onFlash(`Rate brief saved, but ${errMsg(err)}. Press the button again to retry the rest.`)
          return
        }
      }
    } else {
      // CS/Sales: create the rate request (once), then link the selected rate options
      let reqId: number | undefined
      try {
        reqId = await ensureCsRateRequest(briefRemark, true)
      } catch (err) {
        console.error('[RateCheck] rate request create failed:', err)
        onFlash(`Could not create the rate request: ${errMsg(err)}`)
        return
      }
      if (reqId) {
        const links: OptionLink[] = []
        // Enriched schedule rate selections (key = "schedule_id:rate_type:rate_id")
        for (const aggKey of selectedAggregateRateIds) {
          const parts = aggKey.split(':')
          if (parts.length < 3) continue
          const scheduleId = Number(parts[0])
          const rateType = parts.slice(1, -1).join(':')
          const rateId = Number(parts[parts.length - 1])
          if (!isNaN(rateId) && !isNaN(scheduleId)) {
            links.push({ key: `agg:${aggKey}`, payload: { request_id: reqId, rate_type: rateType, rate_id: rateId, schedule_id: scheduleId } })
          }
        }
        // DB-selected rates, if any
        if (hasDbSelections) {
          for (const rate of visibleRates.filter(r => selectedIds.has(r.id))) {
            const colonIdx = rate.id.indexOf(':')
            if (colonIdx === -1) continue
            const prefix = rate.id.slice(0, colonIdx)
            const rateType = RATE_TYPE_MAP[prefix] ?? prefix
            const rateId = Number(rate.id.slice(colonIdx + 1))
            if (!isNaN(rateId)) {
              links.push({ key: `db:${rate.id}`, payload: { request_id: reqId, rate_type: rateType, rate_id: rateId } })
            }
          }
        }
        try {
          await linkOptions(reqId, links)
        } catch (err) {
          onFlash(`Rate request created, but ${errMsg(err)}. Press the button again to retry the rest.`)
          return
        }
      }
    }

    // Advance local state (backend may already have auto-advanced via options above - idempotent)
    onAdvanceWorkflow(inquiry.id, 'quotation-prep')

    const notesParts = [`Customer: ${inquiry.customer_name} (${custData?.tier ?? 'N/A'})`, `Route: ${inquiry.origin} → ${dest}`]
    if (selectedAggregateRateIds.size) notesParts.push(`Schedule Rates: ${selectedAggregateRateIds.size} selected`)
    if (manualSummary) notesParts.push(`Manual Rates: ${manualSummary}`)

    onLogActivity({
      actor_role: activeRole,
      actor_id: activeEmployee.id,
      action: isProcurement
        ? `Procurement rate check completed. ${actionParts.join(' + ')} sent to Sales.`
        : `Multi-source rate check completed. ${totalCount} rate(s) selected. Proceeding to quotation.`,
      ref_type: 'inquiry',
      ref_id: inquiry.id,
      customer_name: inquiry.customer_name,
      pushed_to: 'Sales',
      notes: formNote ? `${formNote} | ${notesParts.join(' | ')}` : notesParts.join(' | '),
    })
    onFlash(isProcurement
      ? `${inquiry.id} → Rate brief sent to Sales (${actionParts.join(' + ')})`
      : `${inquiry.id} → ${totalCount} rate(s) - proceeding to quotation`
    )
    ;(onGoToQuotations ?? onGoBack)()
  })

  // Direct escalation to procurement (cs-sales, always available)
  const handleEscalate = () => runExclusive(async () => {
    const schedPayloads = getEnrichedSchedulePayloads()
    const schedCount = schedPayloads?.length ?? 0
    const schedNote = schedCount > 0
      ? `Escalated to Procurement with ${schedCount} selected schedule(s) for rate sourcing.`
      : `Escalated to Procurement for rate sourcing.`
    try {
      const res = await createCsRateRequest(
        `${schedNote} ${inquiry.inq_id}: ${inquiry.origin} → ${dest ?? ''}. Customer: ${inquiry.customer_name}. ${formNote || ''}`.trim(),
        false,
      )
      console.log('[RateCheck] escalation rate request created:', res)
    } catch (err) {
      console.error('[RateCheck] rate request create failed:', err)
      onFlash(`Could not escalate to Procurement: ${errMsg(err)}`)
      return
    }
    onAdvanceWorkflow(inquiry.id, 'procurement-request')
    onLogActivity({
      actor_role: activeRole,
      actor_id: activeEmployee.id,
      action: schedNote,
      ref_type: 'inquiry',
      ref_id: inquiry.id,
      customer_name: inquiry.customer_name,
      pushed_to: 'Procurement',
      notes: formNote || `${inquiry.origin} → ${dest} - escalated to procurement${schedCount > 0 ? ` (${schedCount} schedules)` : ''}`,
    })
    onFlash(`${inquiry.id} → Escalated to Procurement${schedCount > 0 ? ` (${schedCount} schedules)` : ''}`)
    onGoBack()
  })

  // Resolve which rates list to display
  const displayRates = isProcurement ? dbRates : visibleRates

  // Helper: compute total surcharge amount for an entry (sum all surcharges)
  const totalSurcharge = (e: ManualRateEntry) =>
    e.surcharges.filter(s => s.type && s.amount).reduce((sum, s) => sum + Number(s.amount), 0)

  // Helper: list surcharge type names for "inclusive of ..." label
  const surchargeTypeNames = (e: ManualRateEntry) =>
    e.surcharges.filter(s => s.type && s.amount).map(s => s.type)

  // ── Render a single manual entry card in the rate brief ──
  const renderManualEntryBrief = (e: ManualRateEntry) => {
    const typeLabel = MR_TAB_LABELS[e.tab]
    const accent = ({ 'vessel-spot': RATE_SOURCE_COLORS['Spot'], fak: RATE_SOURCE_COLORS['FAK'], special: RATE_SOURCE_COLORS['Special'] } as Record<ManualRateTab, string>)[e.tab] || COLOR.warning
    const surTotal = totalSurcharge(e)
    const surNames = surchargeTypeNames(e)
    return (
      <div key={e.id} className={BRIEF_ITEM}>
        <div className="flex items-center gap-1.5 text-control font-bold text-fg">
          <span className="rounded-control border px-1.5 py-px text-label font-semibold" style={{ background: `${accent}18`, color: accent, borderColor: `${accent}30` }}>{typeLabel}</span>
          {e.liner}
          {e.tab === 'vessel-spot' && e.vesselName && <span className="text-label font-normal text-fg-muted">{e.vesselName}{e.voyage ? ` / ${e.voyage}` : ''}</span>}
        </div>
        {e.scheduleId != null && e.scheduleSummary && (
          <div className="mt-0.5 flex items-center gap-1 text-label text-primary">
            <Ship size={12} aria-hidden="true" /> Linked to: {e.scheduleSummary}
          </div>
        )}
        {e.containers.map((c, ci) => {
          const allIn = Number(c.rate) + surTotal
          return (
            <div key={ci} className={cn('text-label text-fg-label', ci > 0 && 'mt-px')}>
              ${allIn.toLocaleString()} {c.currency} / {c.containerType}
              {c.tus ? ` · TUs: ${c.tus}` : ''}
              {c.maxWeight ? ` · Wt: ${c.maxWeight}` : ''}
            </div>
          )
        })}
        {surNames.length > 0 && (
          <div className="mt-0.5 text-label italic text-fg-muted">
            Inclusive of {surNames.join(', ')}
          </div>
        )}
        <div className="mt-px text-label text-fg-label">
          {e.origin || '?'} → {e.destination || '?'}
          {e.tradeLane ? ` · ${e.tradeLane}` : ''}
          {e.serviceLane ? ` · SL: ${e.serviceLane}` : ''}
        </div>
        {(e.validFrom || e.validTo) && (
          <div className="mt-0.5 text-label text-fg-muted">
            Valid: {e.validFrom || '?'} → {e.validTo || '?'}
          </div>
        )}
        {e.freeTime && <div className={BRIEF_META}>Free Days: {e.freeTime}</div>}
        {e.tab === 'vessel-spot' && (e.vesselEta || e.vesselEtd) && (
          <div className={BRIEF_META}>
            {e.vesselEtd ? `ETD: ${e.vesselEtd}` : ''}{e.vesselEta ? `${e.vesselEtd ? ' · ' : ''}ETA: ${e.vesselEta}` : ''}
          </div>
        )}
        {e.tab === 'vessel-spot' && (e.fclOpenDate || e.fclCutDate) && (
          <div className={BRIEF_META}>
            {e.fclOpenDate ? `FCL Open: ${e.fclOpenDate}${e.fclOpenTime ? ` ${e.fclOpenTime}` : ''}` : ''}
            {e.fclCutDate ? `${e.fclOpenDate ? ' · ' : ''}FCL Cut: ${e.fclCutDate}${e.fclCutTime ? ` ${e.fclCutTime}` : ''}` : ''}
          </div>
        )}
        {e.tab === 'special' && (e.commodityType || e.commodityName) && (
          <div className={BRIEF_META}>
            Commodity: {e.commodityType || '?'}{e.commodityName ? ` - ${e.commodityName}` : ''}
          </div>
        )}
        <div className="mt-0.5 flex gap-1.5 text-label">
          {e.isSold && <span className="font-semibold text-success">SOLD</span>}
          {e.isCancelled && <span className="font-semibold text-danger">CANCELLED{e.cancelReason ? `: ${e.cancelReason}` : ''}{e.cancelCharge ? ` · Charge: ${e.cancelCharge} ${e.cancelChargeCurrency}` : ''}</span>}
        </div>
        {e.salesperson && <div className={BRIEF_META}>Sales Contact: {e.salesperson}</div>}
        {e.note && <div className={BRIEF_META}>Note: {e.note}</div>}
        {e.specialRemark && <div className={BRIEF_META}>Analysis Note: {e.specialRemark}</div>}
      </div>
    )
  }

  // ── Rate Brief Document (shared between edit preview and review screen) ──
  const renderRateBrief = () => {
    const selectedDbRates = hasDbSelections ? displayRates.filter(r => selectedIds.has(r.id)) : []
    if (!hasDbSelections && !hasManualEntries && !hasAggregateSelections) return null

    // Collect selected aggregate rates with schedule info for the brief
    const aggregateBriefItems: { scheduleName: string; rateType: string; rate: AggregateRate }[] = []
    const briefDataSource = isProcurement ? aggregateData : enrichedData
    if (hasAggregateSelections && briefDataSource) {
      for (const [schId, entry] of Object.entries(briefDataSource)) {
        const schLabel = entry.schedule.liner_name || entry.schedule.scac || '-'
        const groups = [
          { rateType: 'Tariff', rates: entry.tariff_rates, key: 'tariff_rates' },
          { rateType: 'FAK', rates: entry.fak_rates, key: 'fak_rates' },
          { rateType: 'Special', rates: entry.special_rate, key: 'special_rate' },
          { rateType: 'Vessel by Vessel', rates: entry.vessel_by_vessel_rate, key: 'vessel_by_vessel_rate' },
          ...(entry.nac?.length ? [{ rateType: 'NAC', rates: entry.nac, key: 'nac' }] : []),
          ...(entry.contracted_rates?.length ? [{ rateType: 'Contracted', rates: entry.contracted_rates, key: 'contracted_rates' }] : []),
        ]
        for (const g of groups) {
          for (const r of g.rates) {
            if (selectedAggregateRateIds.has(`${schId}:${g.key}:${r.rate_id}`)) {
              aggregateBriefItems.push({ scheduleName: schLabel, rateType: g.rateType, rate: r })
            }
          }
        }
      }
    }

    return (
      <div className="rounded-card border border-line bg-canvas p-3.5">
        <div className="mb-2.5 flex items-center gap-1.5">
          <FileDown size={14} aria-hidden="true" className={isProcurement ? 'text-warning' : 'text-primary'} />
          <span className="text-control font-bold text-fg">Rate Brief</span>
        </div>
        <div className="rounded-card border border-line bg-surface p-4 text-control text-fg-label">
          <div className="text-body font-extrabold tracking-label text-fg">RATE BRIEF</div>
          <div className="mb-1 text-label text-fg-muted">ABC Logistics (Pvt) Ltd</div>
          <div className={BRIEF_DIVIDER} />
          <div className={BRIEF_SECTION}>Customer</div>
          <BriefRow label="Name:">{inquiry.customer_name}</BriefRow>
          <BriefRow label="Tier:">{custData?.tier ?? 'N/A'}</BriefRow>
          <BriefRow label="Location:">{custData?.location ?? 'N/A'}</BriefRow>
          <div className={BRIEF_DIVIDER} />
          <div className={BRIEF_SECTION}>Inquiry</div>
          <BriefRow label="Ref:">{inquiry.id}</BriefRow>
          <BriefRow label="Route:">{inquiry.origin} → {dest}</BriefRow>
          <BriefRow label="Request:">{inquiry.request}</BriefRow>
          <BriefRow label="Channel:">{inquiry.channel}</BriefRow>

          {/* DB Rates section */}
          {selectedDbRates.length > 0 && <>
            <div className={BRIEF_DIVIDER} />
            <div className={BRIEF_SECTION}>{isProcurement ? 'Database Rates' : 'Selected Rates'}</div>
            {selectedDbRates.map(r => (
              <div key={r.id} className={BRIEF_ITEM}>
                <div className="text-control font-bold text-fg">{r.liner_name || 'N/A'} <span className="font-normal text-fg-muted">({r.source_type})</span></div>
                <div className="text-label text-fg-label">
                  ${(r.rate ?? 0).toLocaleString()} {r.currency} / {r.container_type || 'N/A'}
                  {r.trade_lane && ` · ${r.trade_lane}`}
                </div>
                <div className="text-label text-fg-muted">
                  Valid: {r.valid_from || '?'} → {r.valid_to || '?'}
                  {r.vessel_name && ` · ${r.vessel_name}`}
                </div>
              </div>
            ))}
          </>}

          {/* Manual entries section */}
          {manualEntries.length > 0 && <>
            <div className={BRIEF_DIVIDER} />
            <div className={BRIEF_SECTION}>Manual Rates ({manualEntries.length})</div>
            {manualEntries.map(e => renderManualEntryBrief(e))}
          </>}

          {/* Schedule-matched rates section */}
          {aggregateBriefItems.length > 0 && <>
            <div className={BRIEF_DIVIDER} />
            <div className={BRIEF_SECTION}>Schedule Rates ({aggregateBriefItems.length})</div>
            {aggregateBriefItems.map(item => (
              <div key={`${item.rateType}:${item.rate.rate_id}`} className={BRIEF_ITEM}>
                <div className="text-control font-bold text-fg">
                  {item.scheduleName} <span className="font-normal text-fg-muted">({item.rateType})</span>
                </div>
                <div className="text-label text-fg-label">
                  ${item.rate.rate.toLocaleString()} {item.rate.currency} / {item.rate.container_type}
                </div>
                <div className="text-label text-fg-muted">
                  Valid: {item.rate.valid_from || '?'} → {item.rate.valid_to || '?'}
                  {item.rate.transit && ` · Transit: ${item.rate.transit}`}
                </div>
              </div>
            ))}
          </>}

          <div className={BRIEF_DIVIDER} />
          <BriefRow label="Prepared by:">{activeEmployee.name} ({activeRole})</BriefRow>
          <BriefRow label="Date:">{new Date().toISOString().slice(0, 10)}</BriefRow>
        </div>
      </div>
    )
  }

  // ── Resolve review action label & icon ──
  const getReviewAction = () => {
    const procTotalSelected = selectedAggregateRateIds.size + manualEntries.length
    if (isProcurement && procTotalSelected > 0) {
      return {
        label: `Push to Sales (${procTotalSelected} rate${procTotalSelected !== 1 ? 's' : ''})`,
        icon: <Send size={14} aria-hidden="true" />,
      }
    }
    if (hasDbSelections) {
      return {
        label: `Go to Quotation (${selectedIds.size} rate${selectedIds.size !== 1 ? 's' : ''})`,
        icon: <ChevronRight size={14} aria-hidden="true" />,
      }
    }
    if (!isProcurement && hasAggregateSelections) {
      return {
        label: `Go to Quotation (${selectedAggregateRateIds.size} rate${selectedAggregateRateIds.size !== 1 ? 's' : ''})`,
        icon: <ChevronRight size={14} aria-hidden="true" />,
      }
    }
    if (!isProcurement && skipProcurement) {
      return { label: 'Skip Procurement - Go to Quotation', icon: <ChevronRight size={14} aria-hidden="true" /> }
    }
    if (!isProcurement) {
      return { label: 'Escalate to Procurement', icon: <ChevronRight size={14} aria-hidden="true" /> }
    }
    // Procurement fallback
    return { label: 'Push to Sales', icon: <Send size={14} aria-hidden="true" /> }
  }

  const reviewAction = getReviewAction()

  const sectionTitle: React.CSSProperties = { fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#d97706', marginBottom: 10 }

  const backLabel = mode === 'review' ? 'Back to Edit' : mode === 'manual-entry' ? 'Back to Rate Check' : 'Back to Workspace'
  const inquiryPanel = (
    <InquiryDetailsPanel
      inquiry={inquiry}
      container={container}
      custData={custData}
      dest={dest}
      allContainers={allContainers}
      containerLabel={containerLabel}
    />
  )

  return (
    <div className="mx-auto max-w-[1280px]">
      {/* Header */}
      <div className="mb-5 flex items-center gap-3">
        <Tooltip content={backLabel}>
          <Button
            size="sm"
            className="w-7 px-0"
            icon={<ArrowLeft size={16} aria-hidden="true" />}
            aria-label={backLabel}
            onClick={
              mode === 'review' ? () => setMode(hasManualEntries ? 'manual-entry' : 'db-select')
              : mode === 'manual-entry' ? () => { setMode('db-select'); setLinkedSchedule(null) }
              : onGoBack
            }
          />
        </Tooltip>
        <div>
          <div className="flex items-center gap-2 text-title font-bold text-fg">
            <FileText size={18} className="text-primary" aria-hidden="true" />
            {mode === 'manual-entry' ? (linkedSchedule ? 'Attach Rate to Schedule' : 'Manual Rate Entry') : mode === 'review' ? 'Review Rate Brief' : 'Rate Check'}
          </div>
          <div className="mt-0.5 text-control text-fg-muted">
            {inquiry.customer_name} · {inquiry.origin} → {dest}
            {containerLabel && ` · ${containerLabel}`}
          </div>
        </div>
      </div>

      {/* Card body */}
      <div className="rounded-card border border-line-soft bg-surface p-6">
        {mode === 'db-select' ? (
          /* ════════════════ DB-SELECT SCREEN - two-column ════════════════ */
          <div className="flex items-start">

            {/* ── LEFT: Inquiry details ── */}
            {inquiryPanel}

            {/* ── RIGHT: Rate options ── */}
            <div className="flex min-w-0 flex-1 flex-col gap-3">
              {/* ---- Banner ---- */}
              <div className={cn(
                'flex items-center gap-2 rounded-card border px-3.5 py-2.5 text-control',
                isProcurement ? 'border-info-line bg-primary-subtle text-primary' : 'border-line-soft bg-canvas text-accent',
              )}>
                <FileText size={14} aria-hidden="true" />
                {isProcurement
                  ? <>Schedule rates for: <strong className="ml-1">{inquiry.origin} → {dest}</strong>{containerLabel && <span className="text-fg-muted"> · {containerLabel}</span>}</>
                  : <>Multi-source rate check (AMS + Spot + INTTRA): <strong className="ml-1">{inquiry.origin} → {dest}</strong>{containerLabel && <span className="ml-2 text-fg-muted">· {containerLabel}</span>}</>
                }
              </div>

              {/* ---- Enriched Schedule + Rates (CS/Sales only) ---- */}
              {!isProcurement && (
                <>
                  <RateSectionDivider title="SCHEDULES & RATES" selectedCount={selectedAggregateRateIds.size} />

                  {/* Loading */}
                  {enrichedLoading && <LoadingState label="Loading schedule rates..." />}

                  {/* No results */}
                  {!enrichedLoading && enrichedData && enrichedPivot.rows.length === 0 && (
                    <div className="rounded-card border border-danger-line bg-danger-bg p-4 text-center">
                      <div className="mb-1 text-body font-bold text-danger">No rates found</div>
                      <div className="text-control text-fg-label">
                        No matching schedule rates found for this route. This inquiry will be escalated to Procurement for rate sourcing.
                      </div>
                    </div>
                  )}

                  {/* Enriched pivot table */}
                  {!enrichedLoading && enrichedPivot.rows.length > 0 && (
                    <>
                      <div className="text-control font-semibold text-fg-label">
                        {countPivotRates(enrichedPivot)} rate(s) across {enrichedPivot.rows.length} schedule(s) - select one or more to proceed to quotation
                      </div>
                      <SelectablePivotRateTable
                        pivot={enrichedPivot}
                        selectedIds={selectedAggregateRateIds}
                        selectedScheduleIds={selectedScheduleIds}
                        onToggleGroup={handleToggleGroup}
                        onToggleRow={handleToggleRow}
                        onToggleSchedule={handleToggleSchedule}
                      />
                    </>
                  )}
                </>
              )}

              {/* ---- Aggregate Schedule + Rates table (procurement only) ---- */}
              {isProcurement && (
                <>
                  <RateSectionDivider title="SCHEDULES & RATES FROM CS" selectedCount={selectedAggregateRateIds.size} />

                  {incomingRemark && (
                    <div className="rounded-card border border-info-line bg-primary-subtle px-2.5 py-1.5 text-label text-fg-label">
                      <span className="font-semibold">CS Note:</span> {incomingRemark}
                    </div>
                  )}

                  {/* Loading state */}
                  {aggregateLoading && <LoadingState label="Loading schedule rates..." />}

                  {/* No schedules */}
                  {!aggregateLoading && !aggregateData && incomingSchedules.length === 0 && (
                    <div className={NOTICE_BOX}>No vessel schedules attached by CS.</div>
                  )}

                  {/* Aggregate pivot table */}
                  {!aggregateLoading && aggregatePivot.rows.length > 0 && (
                    <>
                      <div className="text-control font-semibold text-fg-label">
                        {countPivotRates(aggregatePivot)} rate(s) across {aggregatePivot.rows.length} schedule(s) - select rates to include in brief
                      </div>
                      <SelectablePivotRateTable
                        pivot={aggregatePivot}
                        selectedIds={selectedAggregateRateIds}
                        selectedScheduleIds={selectedScheduleIds}
                        onToggleGroup={handleToggleGroup}
                        onToggleRow={handleToggleRow}
                        onToggleSchedule={handleToggleSchedule}
                        onAttachManualRate={handleAttachManualRate}
                      />
                    </>
                  )}

                  {/* No rates found for loaded schedules */}
                  {!aggregateLoading && aggregateData && aggregatePivot.rows.length === 0 && (
                    <div className={NOTICE_BOX}>No matching rates found for the attached schedules.</div>
                  )}

                  {/* Fallback: show flat schedule table if aggregate fetch failed but we have incoming schedules */}
                  {!aggregateLoading && !aggregateData && incomingSchedules.length > 0 && (
                    <div className="overflow-hidden rounded-card border border-line-soft">
                      <div className={cn(FALLBACK_GRID, 'border-b border-line-soft bg-canvas text-label font-bold uppercase tracking-label text-fg-muted')}>
                        <div className="px-2.5 py-1.5">Carrier / Vessel</div>
                        <div className="px-2 py-1.5">Route</div>
                        <div className="px-2 py-1.5">ETD</div>
                        <div className="px-2 py-1.5">ETA</div>
                        <div className="px-2 py-1.5">Transit</div>
                        <div className="px-2 py-1.5">Type</div>
                      </div>
                      {incomingSchedules.map(sch => {
                        const fmtDate = (d: string | null) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '-'
                        const transitDays = sch.total_duration != null ? `${Math.round(sch.total_duration / 24)}d` : '-'
                        const isDirect = sch.schedule_type?.toUpperCase() === 'DIRECT'
                        return (
                          <div key={sch.schedule_id} className={cn(FALLBACK_GRID, 'items-center border-b border-line-soft text-label text-fg-label last:border-b-0')}>
                            <div className="px-2.5 py-1.5">
                              <div className="font-semibold text-fg">{sch.liner_name || sch.scac || '-'}</div>
                              <div className="text-fg-muted">{sch.vessel_name}{sch.voyage_number ? ` / ${sch.voyage_number}` : ''}</div>
                            </div>
                            <div className="px-2 py-1.5">{sch.origin_unloc} → {sch.destination_unloc}</div>
                            <div className="px-2 py-1.5">{fmtDate(sch.origin_departure_date)}</div>
                            <div className="px-2 py-1.5">{fmtDate(sch.destination_arrival_date)}</div>
                            <div className="px-2 py-1.5">{transitDays}</div>
                            <div className="px-2 py-1.5">
                              <Badge tone={isDirect ? 'success' : 'warning'} className="font-bold">{isDirect ? 'DIRECT' : 'T/S'}</Badge>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </>
              )}

              {/* ---- Notes ---- */}
              {(isProcurement || dbSearched) && (
                <Field label="Notes (optional)">
                  {ids => (
                    <Input {...ids} value={formNote}
                      onChange={e => setFormNote(e.target.value)}
                      placeholder={isProcurement ? 'Any notes for Sales...' : 'Any notes for the next team...'} />
                  )}
                </Field>
              )}

              {/* ---- Footer ---- */}
              <div className="mt-2 flex justify-end gap-2 border-t border-line-soft pt-4">
                {!isProcurement && (
                  <Button
                    className="mr-auto border-primary text-primary"
                    icon={<ChevronRight size={14} aria-hidden="true" />}
                    isPending={submitting}
                    onClick={handleEscalate}
                  >
                    {hasScheduleSelections
                      ? `Request Rates (${selectedScheduleIds.size} schedule${selectedScheduleIds.size !== 1 ? 's' : ''})`
                      : 'Escalate to Procurement'}
                  </Button>
                )}
                <Button onClick={onGoBack}>Back to Workspace</Button>
                {isProcurement && (
                  <Button icon={<Plus size={14} aria-hidden="true" />} onClick={() => setMode('manual-entry')}>
                    Enter Rates Manually
                  </Button>
                )}
                <Button
                  variant="primary"
                  icon={<FileDown size={14} aria-hidden="true" />}
                  disabled={!canReview}
                  onClick={() => setMode('review')}
                >
                  Review &amp; Send
                </Button>
              </div>
            </div>
          </div>
        ) : mode === 'manual-entry' ? (
          /* ════════════════ MANUAL-ENTRY SCREEN ════════════════ */
          <div className="flex">

            {/* ── LEFT: Inquiry details (same panel as db-select) ── */}
            {inquiryPanel}

            {/* ── CENTER: Manual entry form ── */}
            <div style={{ flex: 1, minWidth: 0, paddingRight: sidebarOpen ? 24 : 0 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                {/* Schedule-linked banner (Path 3) */}
                {linkedSchedule && (
                  <div style={{
                    padding: '8px 12px',
                    background: 'rgba(44,44,130,0.06)',
                    border: '1px solid rgba(44,44,130,0.18)',
                    borderRadius: 8,
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  }}>
                    <div style={{ fontSize: 12, color: COLOR.primary, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Ship size={13} />
                      <strong>Linked to Schedule:</strong>{' '}
                      {linkedSchedule.linerName || '-'} / {linkedSchedule.vesselName || '-'}
                      {linkedSchedule.voyageNumber ? ` V.${linkedSchedule.voyageNumber}` : ''}
                      {' · '}ETD: {linkedSchedule.etd ? new Date(linkedSchedule.etd).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '-'}
                      {' · '}ETA: {linkedSchedule.eta ? new Date(linkedSchedule.eta).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '-'}
                    </div>
                    <button
                      onClick={() => setLinkedSchedule(null)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: 11, textDecoration: 'underline' }}
                    >
                      Unlink
                    </button>
                  </div>
                )}

                {/* Rate type tabs - pill style */}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {(['vessel-spot', 'fak', 'special'] as ManualRateTab[]).map(tab => (
                    <button
                      key={tab}
                      style={{
                        padding: '6px 14px', fontSize: 12, fontWeight: mrTab === tab ? 700 : 500,
                        background: mrTab === tab ? '#d97706' : 'var(--card)',
                        color: mrTab === tab ? '#fff' : '#64748b',
                        border: `1px solid ${mrTab === tab ? '#d97706' : 'var(--border)'}`,
                        borderRadius: 20, cursor: 'pointer', transition: 'all 0.15s',
                      }}
                      onClick={() => setMrTab(tab)}
                    >
                      {MR_TAB_LABELS[tab]}
                    </button>
                  ))}
                </div>

                {/* Form card */}
                <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 20 }}>

                  {/* ── Carrier & service ── */}
                  <div>
                    <div style={sectionTitle}>Carrier &amp; service</div>
                    {(inquiry.preferred_liners?.length ?? 0) > 0 && !mrLinerOther && (
                      <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
                        {(inquiry.preferred_liners || []).map(l => (
                          <button key={l} type="button" onClick={() => setMrLiner(l)}
                            style={{
                              padding: '4px 12px', borderRadius: 16, fontSize: 12, cursor: 'pointer',
                              background: mrLiner === l ? 'rgba(217,119,6,0.1)' : 'var(--bg)',
                              color: mrLiner === l ? '#d97706' : '#475569',
                              border: `1px solid ${mrLiner === l ? '#d97706' : 'var(--border)'}`,
                              fontWeight: mrLiner === l ? 600 : 400,
                            }}>
                            {l}
                          </button>
                        ))}
                        <button type="button" onClick={() => { setMrLinerOther(true); setMrLiner('') }}
                          style={{ padding: '4px 12px', borderRadius: 16, fontSize: 12, color: '#94a3b8', background: 'var(--bg)', border: '1px solid var(--border)', cursor: 'pointer' }}>
                          Other
                        </button>
                      </div>
                    )}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 16px' }}>
                      <div>
                        <label style={FIELD_LABEL}>Liner <span style={{ color: '#dc2626' }}>*</span></label>
                        {linkedSchedule ? (
                          <input style={{ ...INPUT_STYLE, opacity: 0.7, background: 'var(--bg)' }} value={mrLiner} readOnly />
                        ) : !mrLinerOther ? (
                          <select
                            style={INPUT_STYLE}
                            value={mrLiner}
                            onChange={e => {
                              if (e.target.value === '__other__') {
                                setMrLinerOther(true)
                                setMrLiner('')
                              } else {
                                setMrLiner(e.target.value)
                              }
                            }}
                          >
                            <option value="">Select preferred liner</option>
                            {(inquiry.preferred_liners || []).map(name => {
                              const lr = linerList.find(x => x.name === name)
                              return <option key={name} value={name}>{lr ? linerDisplay(lr) : name}</option>
                            })}
                            <option value="__other__">Other</option>
                          </select>
                        ) : (
                          <>
                            <input list="mr-liners" style={INPUT_STYLE} value={mrLiner} onChange={e => setMrLiner(e.target.value)} placeholder="Type to search liners..." />
                            <datalist id="mr-liners">{linerList.map(l => <option key={l.lin_id} value={l.name}>{linerDisplay(l)}</option>)}</datalist>
                            {inquiry.preferred_liners?.length ? (
                              <button
                                type="button"
                                style={{ background: 'none', border: 'none', padding: 0, fontSize: 11, color: 'var(--accent)', cursor: 'pointer', marginTop: 3, textDecoration: 'underline' }}
                                onClick={() => { setMrLinerOther(false); setMrLiner('') }}
                              >
                                Back to preferred liners
                              </button>
                            ) : null}
                          </>
                        )}
                      </div>
                      <div>
                        <label style={FIELD_LABEL}>Trade Lane</label>
                        <select style={INPUT_STYLE} value={mrTradeLane} onChange={e => setMrTradeLane(e.target.value)}>
                          <option value="">Select trade lane</option>
                          {tradeLaneList.map(t => <option key={t.trln_id} value={t.trln_name}>{t.trln_name}</option>)}
                        </select>
                      </div>
                      <div>
                        <label style={FIELD_LABEL}>Service Lane</label>
                        <input list="mr-svc-lanes" style={INPUT_STYLE} value={mrServiceLane} onChange={e => setMrServiceLane(e.target.value)} placeholder="Type to search..." />
                        <datalist id="mr-svc-lanes">{tradeLaneList.map(t => <option key={t.trln_id} value={t.trln_name} />)}</datalist>
                      </div>
                      <div>
                        <label style={FIELD_LABEL}>Sales Contact</label>
                        <select style={INPUT_STYLE} value={mrSalesperson} onChange={e => setMrSalesperson(e.target.value)}>
                          <option value="">Select sales contact</option>
                          {employeeList.map(e => <option key={e.emp_id} value={e.name}>{e.name}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* ── Route & free time ── */}
                  <div>
                    <div style={sectionTitle}>Route &amp; free time</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 0.7fr', gap: '12px 16px' }}>
                      <div>
                        <label style={FIELD_LABEL}>Origin <span style={{ color: '#dc2626' }}>*</span></label>
                        {linkedSchedule ? (
                          <input style={{ ...INPUT_STYLE, opacity: 0.7, background: 'var(--bg)' }} value={mrOrigin} readOnly />
                        ) : (
                          <>
                            <input list="mr-ports-o" style={INPUT_STYLE} value={mrOrigin} onChange={e => setMrOrigin(e.target.value)} placeholder="e.g. Colombo/Sri Lanka or LKCMB" />
                            <datalist id="mr-ports-o">{portOptions(portList).map((o, i) => <option key={i} value={o.value} label={o.label} />)}</datalist>
                          </>
                        )}
                      </div>
                      <div>
                        <label style={FIELD_LABEL}>Destination <span style={{ color: '#dc2626' }}>*</span></label>
                        {linkedSchedule ? (
                          <input style={{ ...INPUT_STYLE, opacity: 0.7, background: 'var(--bg)' }} value={mrDestination} readOnly />
                        ) : (
                          <>
                            <input list="mr-ports-d" style={INPUT_STYLE} value={mrDestination} onChange={e => setMrDestination(e.target.value)} placeholder="e.g. Hamburg/Germany or DEHAM" />
                            <datalist id="mr-ports-d">{portOptions(portList).map((o, i) => <option key={i} value={o.value} label={o.label} />)}</datalist>
                          </>
                        )}
                      </div>
                      <div>
                        <label style={FIELD_LABEL}>Free Days</label>
                        <input style={INPUT_STYLE} value={mrFreeTime} onChange={e => setMrFreeTime(e.target.value)} placeholder="e.g. 14" />
                      </div>
                    </div>
                  </div>

                  {/* ── Vessel (spot rate only) ── */}
                  {mrTab === 'vessel-spot' && (
                    <div>
                      <div style={sectionTitle}>Vessel</div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 16px', marginBottom: 14 }}>
                        <div>
                          <label style={FIELD_LABEL}>Vessel Name <span style={{ color: '#dc2626' }}>*</span></label>
                          <input style={INPUT_STYLE} value={mrVesselName} onChange={e => setMrVesselName(e.target.value)} placeholder="e.g. Maersk Sealand" />
                        </div>
                        <div>
                          <label style={FIELD_LABEL}>Voyage <span style={{ color: '#dc2626' }}>*</span></label>
                          <input style={INPUT_STYLE} value={mrVoyage} onChange={e => setMrVoyage(e.target.value)} placeholder="e.g. 2607E" />
                        </div>
                        <div>
                          <label style={FIELD_LABEL}>Vessel ETD <span style={{ color: '#dc2626' }}>*</span></label>
                          <input style={INPUT_STYLE} type="date" value={mrVesselEtd} onChange={e => setMrVesselEtd(e.target.value)} />
                        </div>
                        <div>
                          <label style={FIELD_LABEL}>Vessel ETA <span style={{ color: '#dc2626' }}>*</span></label>
                          <input style={INPUT_STYLE} type="date" value={mrVesselEta} onChange={e => setMrVesselEta(e.target.value)} />
                        </div>
                      </div>
                      <label style={FIELD_LABEL}>FCL Opening <span style={{ color: '#dc2626' }}>*</span></label>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 16px', marginBottom: 14 }}>
                        <input style={INPUT_STYLE} type="date" value={mrFclOpenDate} onChange={e => setMrFclOpenDate(e.target.value)} />
                        <input style={INPUT_STYLE} type="time" value={mrFclOpenTime} onChange={e => setMrFclOpenTime(e.target.value)} />
                      </div>
                      <label style={FIELD_LABEL}>FCL Cutoff <span style={{ color: '#dc2626' }}>*</span></label>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 16px' }}>
                        <input style={INPUT_STYLE} type="date" value={mrFclCutDate} onChange={e => setMrFclCutDate(e.target.value)} />
                        <input style={INPUT_STYLE} type="time" value={mrFclCutTime} onChange={e => setMrFclCutTime(e.target.value)} />
                      </div>
                    </div>
                  )}

                  {/* ── Commodity (special only) ── */}
                  {mrTab === 'special' && (
                    <div>
                      <div style={sectionTitle}>Commodity</div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 16px' }}>
                        <div>
                          <label style={FIELD_LABEL}>Commodity Type</label>
                          <input list="mr-commodity-types" style={INPUT_STYLE} value={mrCommodityType} onChange={e => setMrCommodityType(e.target.value)} placeholder="Select or type..." />
                          <datalist id="mr-commodity-types">{COMMODITY_TYPES.map(ct => <option key={ct} value={ct} />)}</datalist>
                        </div>
                        <div>
                          <label style={FIELD_LABEL}>Commodity Name</label>
                          <input style={INPUT_STYLE} value={mrCommodityName} onChange={e => setMrCommodityName(e.target.value)} placeholder="e.g. Cotton T-shirts" />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ── Container rates ── */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                      <span style={sectionTitle}>Container rates</span>
                      <button type="button" onClick={addMrContainer}
                        style={{ padding: '5px 11px', borderRadius: 7, background: 'var(--card)', border: '1px solid #fbd8a8', color: '#d97706', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                        + Add container
                      </button>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {mrContainers.map((ct, idx) => (
                        <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.7fr 0.9fr 0.9fr 0.8fr 24px', gap: 8, alignItems: 'end' }}>
                          <div>
                            {idx === 0 && <label style={FIELD_LABEL}>Container type</label>}
                            <select style={INPUT_STYLE} value={ct.containerType} onChange={e => updateMrContainer(idx, { containerType: e.target.value })}>
                              {MR_VESSEL_CONTAINER_TYPES.map(c => <option key={c} value={c}>{CONTAINER_TYPE_LABELS[c as keyof typeof CONTAINER_TYPE_LABELS] ?? c}</option>)}
                            </select>
                          </div>
                          <div>
                            {idx === 0 && <label style={FIELD_LABEL}>TUs</label>}
                            <input style={INPUT_STYLE} value={ct.tus} onChange={e => updateMrContainer(idx, { tus: e.target.value })} placeholder="10" />
                          </div>
                          <div>
                            {idx === 0 && <label style={FIELD_LABEL}>Max weight</label>}
                            <input style={INPUT_STYLE} value={ct.maxWeight} onChange={e => updateMrContainer(idx, { maxWeight: e.target.value })} placeholder="28000 kg" />
                          </div>
                          <div>
                            {idx === 0 && <label style={FIELD_LABEL}>Rate <span style={{ color: '#dc2626' }}>*</span></label>}
                            <input style={INPUT_STYLE} type="number" value={ct.rate} onChange={e => updateMrContainer(idx, { rate: e.target.value })} placeholder="1650" min={0} />
                          </div>
                          <div>
                            {idx === 0 && <label style={FIELD_LABEL}>Currency</label>}
                            <select style={INPUT_STYLE} value={ct.currency} onChange={e => updateMrContainer(idx, { currency: e.target.value })}>
                              <option>USD</option><option>EUR</option><option>GBP</option><option>LKR</option><option>CNY</option><option>JPY</option><option>SGD</option>
                            </select>
                          </div>
                          <button type="button" onClick={() => removeMrContainer(idx)}
                            style={{ height: 34, background: 'none', border: 'none', cursor: mrContainers.length > 1 ? 'pointer' : 'not-allowed', color: '#94a3b8', fontSize: 15, alignSelf: 'flex-end', opacity: mrContainers.length > 1 ? 1 : 0.3 }}>
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* ── Validity ── */}
                  <div>
                    <div style={sectionTitle}>Validity</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 16px' }}>
                      <div>
                        <label style={FIELD_LABEL}>Valid From {mrTab !== 'vessel-spot' && <span style={{ color: '#dc2626' }}>*</span>}</label>
                        <input style={INPUT_STYLE} type="date" value={mrValidFrom} onChange={e => setMrValidFrom(e.target.value)} />
                      </div>
                      <div>
                        <label style={FIELD_LABEL}>Valid To {mrTab !== 'vessel-spot' && <span style={{ color: '#dc2626' }}>*</span>}</label>
                        <input style={INPUT_STYLE} type="date" value={mrValidTo} onChange={e => setMrValidTo(e.target.value)} />
                      </div>
                    </div>
                  </div>

                  {/* ── Flags ── */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 18, alignItems: 'center' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, cursor: 'pointer', color: '#334155' }}>
                      <input type="checkbox" checked={mrIsSold} onChange={e => setMrIsSold(e.target.checked)} />
                      <span style={{ fontWeight: mrIsSold ? 600 : 400, color: mrIsSold ? '#059669' : '#334155' }}>Mark as sold</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, cursor: 'pointer', color: '#334155' }}>
                      <input type="checkbox" checked={mrIsCancelled} onChange={e => setMrIsCancelled(e.target.checked)} />
                      <span style={{ fontWeight: mrIsCancelled ? 600 : 400, color: mrIsCancelled ? '#dc2626' : '#334155' }}>Mark as cancelled</span>
                    </label>
                  </div>

                  {/* ── Cancellation details ── */}
                  {mrIsCancelled && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <div>
                        <label style={FIELD_LABEL}>Cancellation Reason</label>
                        <input style={INPUT_STYLE} value={mrCancelReason} onChange={e => setMrCancelReason(e.target.value)} placeholder="Reason for cancellation..." />
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 0.45fr', gap: 10 }}>
                        <div>
                          <label style={FIELD_LABEL}>Cancellation Charge</label>
                          <input style={INPUT_STYLE} type="number" min={0} value={mrCancelCharge} onChange={e => setMrCancelCharge(e.target.value)} placeholder="e.g. 200" />
                        </div>
                        <div>
                          <label style={FIELD_LABEL}>Currency</label>
                          <select style={INPUT_STYLE} value={mrCancelChargeCurrency} onChange={e => setMrCancelChargeCurrency(e.target.value)}>
                            <option>USD</option><option>EUR</option><option>GBP</option><option>LKR</option><option>CNY</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ── Surcharges ── */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                      <span style={sectionTitle}>Surcharges</span>
                      <button onClick={() => setMrSurcharges(prev => [...prev, { type: '', amount: '', currency: 'USD' }])}
                        style={{ padding: '5px 11px', borderRadius: 7, background: 'var(--card)', border: '1px solid #fbd8a8', color: '#d97706', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                        + Add
                      </button>
                    </div>
                    {mrSurcharges.length === 0 && (
                      <div style={{ fontSize: 12, color: '#94a3b8', padding: '4px 0' }}>No surcharges added.</div>
                    )}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {mrSurcharges.map((sc, idx) => (
                        <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 0.8fr 24px', gap: 8, alignItems: 'flex-end' }}>
                          <input list="mr-surcharge-types" style={INPUT_STYLE} value={sc.type}
                            onChange={e => { const v = e.target.value; setMrSurcharges(prev => prev.map((s, i) => i === idx ? { ...s, type: v } : s)) }}
                            placeholder="e.g. BAF" />
                          <input style={INPUT_STYLE} type="number" value={sc.amount}
                            onChange={e => { const v = e.target.value; setMrSurcharges(prev => prev.map((s, i) => i === idx ? { ...s, amount: v } : s)) }}
                            placeholder="Amount" min={0} />
                          <select style={INPUT_STYLE} value={sc.currency}
                            onChange={e => { const v = e.target.value; setMrSurcharges(prev => prev.map((s, i) => i === idx ? { ...s, currency: v } : s)) }}>
                            <option>USD</option><option>EUR</option><option>GBP</option><option>LKR</option><option>CNY</option>
                          </select>
                          <button style={{ height: 34, background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: 15 }}
                            onClick={() => setMrSurcharges(prev => prev.filter((_, i) => i !== idx))}>×</button>
                        </div>
                      ))}
                    </div>
                    <datalist id="mr-surcharge-types">{SURCHARGE_TYPES.map(s => <option key={s} value={s} />)}</datalist>
                  </div>

                  {/* ── Additional information ── */}
                  <div>
                    <div style={sectionTitle}>Additional information</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <div>
                        <label style={FIELD_LABEL}>Note</label>
                        <input style={INPUT_STYLE} value={mrNote} onChange={e => setMrNote(e.target.value)} placeholder="Any notes..." />
                      </div>
                      <div>
                        <label style={FIELD_LABEL}>Analysis Note</label>
                        <input style={INPUT_STYLE} value={mrSpecialRemark} onChange={e => setMrSpecialRemark(e.target.value)} placeholder="Analysis notes..." />
                      </div>
                    </div>
                  </div>

                  {/* ── Add to Brief ── */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      style={{
                        padding: '9px 16px', borderRadius: 9,
                        background: canAddEntry ? '#d97706' : 'rgba(217,119,6,0.4)',
                        color: '#fff', border: 'none', fontSize: 12, fontWeight: 600,
                        cursor: canAddEntry ? 'pointer' : 'not-allowed',
                      }}
                      disabled={!canAddEntry}
                      onClick={addEntryToBrief}
                    >
                      + Add to brief
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Right sidebar */}
            {sidebarOpen ? (
              <div style={{ width: 340, flexShrink: 0, borderLeft: '1px solid var(--border)', paddingLeft: 20 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14, height: '100%' }}>
                  {/* Sidebar header */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>Rate Brief</span>
                    <button
                      className="lt-icon-btn"
                      style={{ padding: 4 }}
                      onClick={() => setSidebarOpen(false)}
                      title="Collapse sidebar"
                    >
                      <X size={14} />
                    </button>
                  </div>

                  {/* Selected DB Rates */}
                  {hasDbSelections && (
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Selected DB Rates</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {displayRates.filter(r => selectedIds.has(r.id)).map(rate => {
                          const badgeColor = RATE_SOURCE_COLORS[rate.source_type] || '#64748b'
                          return (
                            <div key={rate.id} style={{ padding: '5px 8px', border: '1px solid var(--border)', borderRadius: 6, background: 'rgba(44,44,130,0.03)' }}>
                              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 5 }}>
                                {rate.liner_name || 'N/A'}
                                <span style={{ fontSize: 11, fontWeight: 600, padding: '1px 5px', borderRadius: 3, background: `${badgeColor}18`, color: badgeColor, border: `1px solid ${badgeColor}30` }}>
                                  {rate.source_type}
                                </span>
                              </div>
                              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>
                                ${(rate.rate ?? 0).toLocaleString()} {rate.currency} · {rate.container_type || 'N/A'}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Added Manual Rates */}
                  {manualEntries.length > 0 && (
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Added Manual Rates ({manualEntries.length})</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {manualEntries.map((entry, idx) => {
                          const accent = ({ 'vessel-spot': RATE_SOURCE_COLORS['Spot'], fak: RATE_SOURCE_COLORS['FAK'], special: RATE_SOURCE_COLORS['Special'] } as Record<ManualRateTab, string>)[entry.tab] || '#d97706'
                          const entrySurTotal = totalSurcharge(entry)
                          const entrySurNames = surchargeTypeNames(entry)
                          return (
                            <div key={entry.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 8px', border: '1px solid var(--border)', borderRadius: 6, background: 'var(--card)' }}>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 5 }}>
                                  <span style={{ fontSize: 11, fontWeight: 600, padding: '1px 5px', borderRadius: 3, background: `${accent}18`, color: accent, border: `1px solid ${accent}30` }}>{MR_TAB_LABELS[entry.tab]}</span>
                                  {entry.liner}
                                </div>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>
                                  {entry.containers.map(c => `${c.containerType}: $${(Number(c.rate) + entrySurTotal).toLocaleString()} ${c.currency}`).join(', ')}
                                  {' · '}{entry.origin || '?'} → {entry.destination || '?'}
                                  {entry.isCancelled && <span style={{ color: '#dc2626', fontWeight: 600, marginLeft: 4 }}>CANCELLED</span>}
                                </div>
                                {entrySurNames.length > 0 && (
                                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1, fontStyle: 'italic' }}>
                                    Inclusive of {entrySurNames.join(', ')}
                                  </div>
                                )}
                                {entry.scheduleId != null && entry.scheduleSummary && (
                                  <div style={{ fontSize: 11, color: COLOR.primary, marginTop: 1, display: 'flex', alignItems: 'center', gap: 3 }}>
                                    <Ship size={8} /> Linked: {entry.scheduleSummary}
                                  </div>
                                )}
                              </div>
                              <button className="lt-icon-btn" style={{ padding: 3, flexShrink: 0 }} onClick={() => removeEntry(idx)} title="Remove">
                                <X size={12} />
                              </button>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Notes */}
                  <div>
                    <label style={FIELD_LABEL}>Notes (optional)</label>
                    <input style={INPUT_STYLE} value={formNote}
                      onChange={e => setFormNote(e.target.value)}
                      placeholder="Any notes for Sales..." />
                  </div>

                  {/* Review & Send button */}
                  <div style={{ marginTop: 'auto' }}>
                    <button
                      className="db-btn primary"
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, fontSize: 12, width: '100%',
                        background: '#d97706', borderColor: '#d97706',
                        opacity: canReview ? 1 : 0.5,
                        cursor: canReview ? 'pointer' : 'not-allowed',
                      }}
                      disabled={!canReview}
                      onClick={() => setMode('review')}
                    >
                      <FileDown size={12} /> Review &amp; Send
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setSidebarOpen(true)}
                title="Show Brief"
                style={{
                  padding: '8px 4px', borderLeft: '1px solid var(--border)',
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                }}
              >
                <PanelRight size={16} style={{ color: 'var(--text-muted)' }} />
                <span style={{ writingMode: 'vertical-rl', fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>BRIEF</span>
              </button>
            )}
          </div>
        ) : (
          /* ════════════════ REVIEW SCREEN ════════════════ */
          <div className="flex flex-col gap-4">
            <div className="rounded-card border border-info-line bg-info-bg px-3.5 py-2.5 text-control text-info-fg">
              {(hasDbSelections || hasAggregateSelections)
                ? <>Review the rate brief below. Click <strong>{reviewAction.label}</strong> to send, or go back to make changes.</>
                : !isProcurement && skipProcurement
                  ? <>You chose to <strong>skip procurement escalation</strong>. The inquiry will be sent directly to Sales for quotation.</>
                  : !isProcurement
                    ? <>No rates were selected. The inquiry will be <strong>escalated to Procurement</strong> for rate sourcing.</>
                    : <>Review the rate brief below. Click <strong>Push to Sales</strong> to send, or go back to make changes.</>
              }
            </div>

            {renderRateBrief()}

            {/* CS/Sales: escalation / skip info on review */}
            {!isProcurement && !hasDbSelections && !hasAggregateSelections && (
              <div className={cn('rounded-card border p-3.5', skipProcurement ? 'border-warning-line bg-warning-bg' : 'border-info-line bg-primary-subtle')}>
                <div className={cn('mb-1 text-control font-bold', skipProcurement ? 'text-warning' : 'text-primary')}>
                  {skipProcurement ? 'Skip Procurement' : 'Escalate to Procurement'}
                </div>
                <div className="text-control text-fg-label">
                  {skipProcurement
                    ? `${inquiry.id} will be sent directly to Sales for quotation preparation without procurement sourcing.`
                    : `${inquiry.id} will be escalated to the Procurement team to source rates for ${inquiry.origin} → ${dest}.`
                  }
                </div>
              </div>
            )}

            {formNote && (
              <div className="rounded-card border border-line-soft bg-canvas px-3.5 py-2.5 text-control">
                <span className="font-semibold text-fg-label">Notes:</span>{' '}
                <span className="text-fg">{formNote}</span>
              </div>
            )}

            {/* Footer */}
            <div className="mt-1 flex justify-end gap-2 border-t border-line-soft pt-4">
              <Button onClick={() => setMode(hasManualEntries ? 'manual-entry' : 'db-select')}>Back to Edit</Button>
              <Button variant="primary" icon={reviewAction.icon} isPending={submitting} onClick={handleSubmit}>
                {reviewAction.label}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
