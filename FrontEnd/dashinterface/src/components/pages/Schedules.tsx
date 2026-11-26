import { useState, useMemo, useEffect, useRef } from 'react'
import { Search, Loader2, Globe, Ship, Filter, X, Plus, ArrowRight } from 'lucide-react'
import { apiGetEnrichedScheduleRates, apiGetLiners, apiSearchSchedulesBulk, apiSaveSchedules } from '../../api'
import type { AggregateScheduleRatesResponse, AggregateRate, LinerRecord, OceanSchedule } from '../../types'
import { linerDisplay } from '../../types'
import PortCombobox from '../shared/PortCombobox'
import TagInput from '../shared/TagInput'

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
// Pivot rate table — schedule cols + rate-type x container-type columns
// ---------------------------------------------------------------------------

const RATE_COLORS: Record<string, string> = {
  Tariff: '#2563eb', FAK: '#7c3aed', Special: '#d97706', VBV: '#16a34a',
  NAC: '#0891b2', Contracted: '#dc2626',
}

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

  const fmtDate = (d: string | null) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '—'

  const distinct = useMemo(() => {
    const carriers = new Map<string, number>()
    const cutoffs = new Map<string, number>()
    const origins = new Map<string, number>()
    const destinations = new Map<string, number>()
    for (const r of rows) {
      const c = r.linerName || '—'; carriers.set(c, (carriers.get(c) ?? 0) + 1)
      const co = fmtDate(r.bkCutoff); cutoffs.set(co, (cutoffs.get(co) ?? 0) + 1)
      const o = r.originCity || r.origin || '—'; origins.set(o, (origins.get(o) ?? 0) + 1)
      const d = r.destinationCity || r.destination || '—'; destinations.set(d, (destinations.get(d) ?? 0) + 1)
    }
    return { carriers, cutoffs, origins, destinations }
  }, [rows]) // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = useMemo(() => {
    if (!fCarrier.size && !fCutoff.size && !fOrigin.size && !fDest.size) return rows
    return rows.filter(r => {
      if (fCarrier.size && !fCarrier.has(r.linerName || '—')) return false
      if (fCutoff.size && !fCutoff.has(fmtDate(r.bkCutoff))) return false
      if (fOrigin.size && !fOrigin.has(r.originCity || r.origin || '—')) return false
      if (fDest.size && !fDest.has(r.destinationCity || r.destination || '—')) return false
      return true
    })
  }, [rows, fCarrier, fCutoff, fOrigin, fDest]) // eslint-disable-line react-hooks/exhaustive-deps

  const activeCount = [fCarrier, fCutoff, fOrigin, fDest].filter(s => s.size > 0).length
  const clearAll = () => { setFCarrier(new Set()); setFCutoff(new Set()); setFOrigin(new Set()); setFDest(new Set()); setOpenFilter(null) }

  if (rows.length === 0) {
    return <div style={{ padding: 16, fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>{emptyMessage || 'No schedule rates available.'}</div>
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

  const thBase: React.CSSProperties = {
    padding: '5px 4px', fontSize: 9, fontWeight: 700, color: '#fff', letterSpacing: 0.3,
    textAlign: 'center', whiteSpace: 'nowrap', borderLeft: '1px solid rgba(255,255,255,0.2)',
  }
  const tdBase: React.CSSProperties = {
    padding: '5px 4px', fontSize: 10, color: 'var(--text)', verticalAlign: 'middle',
    borderBottom: '1px solid var(--border)', borderLeft: '1px solid var(--border)',
  }

  function cellTooltip(cell: RateCell): string {
    const lines: string[] = []
    lines.push(`${cell.currency} ${cell.rate.toLocaleString()}`)
    if (cell.validFrom && cell.validTo) lines.push(`Valid: ${fmtDate(cell.validFrom)} \u2013 ${fmtDate(cell.validTo)}`)
    if (cell.transit) lines.push(`Transit: ${cell.transit} days`)
    if (cell.freeTime) lines.push(`Free time: ${cell.freeTime} days`)
    if (cell.maxWeight) lines.push(`Max weight: ${cell.maxWeight.toLocaleString()} kg`)
    if (cell.note) lines.push(`Note: ${cell.note}`)
    return lines.join('\n')
  }

  return (
    <>
      {/* Count + clear */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6, padding: '0 2px' }}>
        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          {filtered.length === rows.length
            ? `${rows.length} schedule${rows.length !== 1 ? 's' : ''}`
            : `${filtered.length} of ${rows.length} (filtered)`}
        </div>
        {activeCount > 0 && (
          <button onClick={clearAll} style={{ fontSize: 10, color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3 }}>
            <X size={10} /> Clear filters
          </button>
        )}
      </div>

      {/* Filter chips */}
      <div ref={filterBarRef} style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
        {FILTERS.map(f => {
          const isOpen = openFilter === f.key
          const hasActive = f.active.size > 0
          const entries = [...f.values.entries()].sort((a, b) => b[1] - a[1])
          if (entries.length <= 1) return null
          return (
            <div key={f.key} style={{ position: 'relative' }}>
              <button onClick={() => setOpenFilter(isOpen ? null : f.key)}
                style={{
                  fontSize: 11, padding: '3px 10px', borderRadius: 14, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 4,
                  border: hasActive ? '1px solid #0f8fa8' : '1px solid var(--border)',
                  background: hasActive ? 'rgba(15,143,168,0.08)' : 'transparent',
                  color: hasActive ? '#0f8fa8' : 'var(--text-secondary)',
                  fontWeight: hasActive ? 600 : 400,
                }}>
                <Filter size={10} />
                {f.label}
                {hasActive && <span style={{ fontSize: 9, background: '#0f8fa8', color: '#fff', borderRadius: 8, padding: '0 5px', fontWeight: 700 }}>{f.active.size}</span>}
              </button>
              {isOpen && (
                <div style={{
                  position: 'absolute', top: '100%', left: 0, marginTop: 4, zIndex: 50,
                  background: 'var(--card, #fff)', border: '1px solid var(--border)', borderRadius: 8,
                  boxShadow: '0 4px 16px rgba(0,0,0,0.12)', minWidth: 180, maxHeight: 240, overflowY: 'auto', padding: '4px 0',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 10px', borderBottom: '1px solid var(--border)' }}>
                    <button onClick={() => f.set(new Set(entries.map(e => e[0])))} style={{ fontSize: 10, color: '#0f8fa8', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Select all</button>
                    <button onClick={() => f.set(new Set())} style={{ fontSize: 10, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>Clear</button>
                  </div>
                  {entries.map(([val, count]) => (
                    <label key={val} style={{
                      display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px', cursor: 'pointer',
                      fontSize: 11, color: 'var(--text)', background: f.active.has(val) ? 'rgba(15,143,168,0.04)' : 'transparent',
                    }}>
                      <input type="checkbox" checked={f.active.has(val)} onChange={() => {
                        f.set(prev => { const n = new Set(prev); if (n.has(val)) n.delete(val); else n.add(val); return n })
                      }} />
                      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{val}</span>
                      <span style={{ fontSize: 9, color: 'var(--text-muted)', flexShrink: 0 }}>{count}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Pivot table */}
      <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto', maxHeight: 600 }}>
          <table style={{ borderCollapse: 'collapse', minWidth: SCHED_COL_COUNT * 80 + rateCols * 76 }}>
            <thead style={{ position: 'sticky', top: 0, zIndex: 2 }}>
              <tr style={{ background: 'var(--accent, #0f8fa8)' }}>
                <th colSpan={SCHED_COL_COUNT} style={{
                  padding: '5px 8px', fontSize: 10, fontWeight: 700, color: '#fff',
                  letterSpacing: 0.5, textAlign: 'center',
                  borderBottom: '1px solid rgba(255,255,255,0.2)',
                }}>
                  SCHEDULE
                </th>
                {rateTypes.map(rt => (
                  <th key={rt} colSpan={containerTypes.length} style={{
                    padding: '5px 4px', fontSize: 10, fontWeight: 700,
                    color: '#fff', letterSpacing: 0.5, textAlign: 'center',
                    borderLeft: '2px solid rgba(255,255,255,0.5)',
                    borderBottom: '1px solid rgba(255,255,255,0.2)',
                    background: RATE_COLORS[rt] ?? '#64748b',
                  }}>
                    {rt.toUpperCase()}
                  </th>
                ))}
              </tr>
              <tr style={{ background: 'var(--accent, #0f8fa8)' }}>
                {['CARRIER', 'VESSEL / VOYAGE', 'ORIGIN', 'DEST', 'ETD', 'ETA', 'TT', 'CUTOFF'].map((h, i) => (
                  <th key={h} style={{
                    ...thBase,
                    textAlign: ['ETD', 'ETA', 'TT', 'CUTOFF'].includes(h) ? 'center' : 'left',
                    borderLeft: i === 0 ? 'none' : thBase.borderLeft,
                  }}>{h}</th>
                ))}
                {rateTypes.map(rt =>
                  containerTypes.map((ct, ctIdx) => (
                    <th key={`${rt}-${ct}`} style={{
                      ...thBase,
                      fontSize: 8,
                      borderLeft: ctIdx === 0 ? '2px solid rgba(255,255,255,0.5)' : thBase.borderLeft,
                      background: RATE_COLORS[rt] ?? '#64748b',
                    }}>
                      {ct}
                    </th>
                  ))
                )}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={totalCols} style={{ padding: 20, textAlign: 'center', fontSize: 11, color: 'var(--text-muted)' }}>No schedules match the active filters.</td></tr>
              )}
              {filtered.map((row, rowIdx) => {
                const bg = rowIdx % 2 ? 'rgba(100,116,139,0.04)' : 'transparent'
                return (
                  <tr key={row.scheduleId} style={{ background: bg }}>
                    <td style={{ ...tdBase, borderLeft: 'none', fontWeight: 600 }}>{row.linerName || '—'}</td>
                    <td style={tdBase}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                        <Ship size={9} style={{ opacity: 0.5, flexShrink: 0 }} />
                        <span style={{ fontSize: 10 }}>{row.vesselName || '—'}{row.voyageNumber ? ` / ${row.voyageNumber}` : ''}</span>
                      </div>
                    </td>
                    <td style={tdBase}>{row.originCity || row.origin || '—'}</td>
                    <td style={tdBase}>{row.destinationCity || row.destination || '—'}</td>
                    <td style={{ ...tdBase, textAlign: 'center' }}>{fmtDate(row.etd)}</td>
                    <td style={{ ...tdBase, textAlign: 'center' }}>{fmtDate(row.eta)}</td>
                    <td style={{ ...tdBase, fontWeight: 600, textAlign: 'center' }}>
                      {row.totalDuration != null ? `${row.totalDuration}d` : '—'}
                    </td>
                    <td style={{ ...tdBase, fontSize: 9 }}>{fmtDate(row.bkCutoff)}</td>
                    {rateTypes.map(rt =>
                      containerTypes.map((ct, ctIdx) => {
                        const cell = row.rates[rt]?.[ct]
                        return (
                          <td
                            key={`${rt}-${ct}`}
                            title={cell ? cellTooltip(cell) : undefined}
                            style={{
                              ...tdBase,
                              textAlign: 'center',
                              borderLeft: ctIdx === 0 ? '2px solid var(--border)' : tdBase.borderLeft,
                              padding: '4px 3px',
                            }}
                          >
                            {cell ? (
                              <>
                                <div style={{ fontWeight: 700, fontSize: 10, whiteSpace: 'nowrap' }}>
                                  {cell.currency} {cell.rate.toLocaleString()}
                                </div>
                                {cell.note && (
                                  <div style={{
                                    fontSize: 8, color: '#94a3b8', lineHeight: 1.2, marginTop: 1,
                                    maxWidth: 72, overflow: 'hidden', textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap', margin: '1px auto 0',
                                  }}>
                                    {cell.note}
                                  </div>
                                )}
                              </>
                            ) : (
                              <span style={{ color: 'var(--text-muted)', fontSize: 9 }}>—</span>
                            )}
                          </td>
                        )
                      })
                    )}
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

// ---------------------------------------------------------------------------
// Schedule search results table (INTTRA / live search)
// ---------------------------------------------------------------------------

function ScheduleSearchTable({ data, linerList, onFlash }: { data: OceanSchedule[]; linerList: LinerRecord[]; onFlash: (msg: string) => void }) {
  const fmtDate = (d: string | null) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '—'

  const sorted = useMemo(() => [...data].sort((a, b) => {
    const da = a.originDepartureDate ?? '', db = b.originDepartureDate ?? ''
    return da.localeCompare(db)
  }), [data])

  // Track checked "special rate" rows by index
  const [checked, setChecked] = useState<Set<number>>(new Set())
  // Track selected rows for saving to DB
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [saving, setSaving] = useState(false)
  // Modal state for the special rate input placeholder
  const [modalIdx, setModalIdx] = useState<number | null>(null)

  // Reset checks when data changes
  useEffect(() => { setChecked(new Set()); setSelected(new Set()); setModalIdx(null) }, [data])

  const toggleCheck = (idx: number) =>
    setChecked(prev => { const n = new Set(prev); if (n.has(idx)) n.delete(idx); else n.add(idx); return n })

  const toggleSelected = (idx: number) =>
    setSelected(prev => { const n = new Set(prev); if (n.has(idx)) n.delete(idx); else n.add(idx); return n })

  const toggleSelectAll = () =>
    setSelected(prev => prev.size === sorted.length ? new Set() : new Set(sorted.map((_, i) => i)))

  // Build SCAC → lin_id lookup from the liner list
  const scacToLinId = useMemo(() => {
    const m = new Map<string, number>()
    for (const l of linerList) {
      if (l.scac) m.set(l.scac.toUpperCase(), l.lin_id)
    }
    return m
  }, [linerList])

  const handleSaveSelected = async () => {
    if (selected.size === 0) return
    setSaving(true)
    try {
      // Resolve lin_id from SCAC before saving
      const schedulesToSave = sorted
        .filter((_, i) => selected.has(i))
        .map(s => ({
          ...s,
          linId: s.linId ?? (s.scac ? scacToLinId.get(s.scac.toUpperCase()) ?? null : null),
        }))
      const ids = await apiSaveSchedules(schedulesToSave)
      onFlash(`Saved ${ids.length} schedule${ids.length !== 1 ? 's' : ''} to database`)
      setSelected(new Set())
    } catch {
      onFlash('Failed to save schedules')
    } finally {
      setSaving(false)
    }
  }

  const thStyle: React.CSSProperties = {
    padding: '6px 6px', fontSize: 9, fontWeight: 700, color: '#fff',
    letterSpacing: 0.3, textAlign: 'left', whiteSpace: 'nowrap',
    borderLeft: '1px solid rgba(255,255,255,0.2)',
  }
  const tdStyle: React.CSSProperties = {
    padding: '5px 6px', fontSize: 10, color: 'var(--text)',
    verticalAlign: 'middle', borderBottom: '1px solid var(--border)',
    borderLeft: '1px solid var(--border)',
  }

  const COLS = ['CARRIER', 'SERVICE', 'VESSEL / VOYAGE', 'ORIGIN', 'DESTINATION', 'ETD', 'ETA', 'TRANSIT', 'TYPE', 'BK CUTOFF', 'SPECIAL RATE', 'ACTION']

  return (
    <>
      {/* Count + Save button */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6, padding: '0 2px' }}>
        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          {sorted.length} schedule{sorted.length !== 1 ? 's' : ''} found
          {selected.size > 0 && <span style={{ fontWeight: 600, color: '#0f8fa8' }}> · {selected.size} selected</span>}
        </div>
        <button
          className="db-btn primary"
          disabled={selected.size === 0 || saving}
          onClick={handleSaveSelected}
          style={{ fontSize: 11, padding: '5px 16px', display: 'flex', alignItems: 'center', gap: 5, opacity: selected.size === 0 ? 0.5 : 1 }}
        >
          {saving ? <Loader2 size={12} className="spin" /> : null}
          Save {selected.size > 0 ? `${selected.size} ` : ''}Selected
        </button>
      </div>
      <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto', maxHeight: 540 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ position: 'sticky', top: 0, zIndex: 2 }}>
              <tr style={{ background: 'var(--accent, #0f8fa8)' }}>
                {/* Select-all checkbox */}
                <th style={{ ...thStyle, borderLeft: 'none', textAlign: 'center', width: 32 }}>
                  <input
                    type="checkbox"
                    checked={sorted.length > 0 && selected.size === sorted.length}
                    ref={el => { if (el) el.indeterminate = selected.size > 0 && selected.size < sorted.length }}
                    onChange={toggleSelectAll}
                    style={{ cursor: 'pointer', accentColor: '#fff' }}
                  />
                </th>
                {COLS.map(h => (
                  <th key={h} style={{
                    ...thStyle,
                    textAlign: h === 'SPECIAL RATE' || h === 'ACTION' ? 'center' : 'left',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0 && (
                <tr><td colSpan={COLS.length + 1} style={{ padding: 20, textAlign: 'center', fontSize: 11, color: 'var(--text-muted)' }}>No schedules found.</td></tr>
              )}
              {sorted.map((s, i) => (
                <tr key={`${s.scac}-${s.vesselName}-${s.voyageNumber}-${i}`} style={{ background: selected.has(i) ? 'rgba(15,143,168,0.06)' : i % 2 ? 'rgba(100,116,139,0.04)' : 'transparent' }}>
                  {/* Row selection checkbox */}
                  <td style={{ ...tdStyle, borderLeft: 'none', textAlign: 'center', width: 32 }}>
                    <input
                      type="checkbox"
                      checked={selected.has(i)}
                      onChange={() => toggleSelected(i)}
                      style={{ cursor: 'pointer', accentColor: '#0f8fa8' }}
                    />
                  </td>
                  <td style={{ ...tdStyle, fontWeight: 600 }}>
                    <div>{s.carrierName || s.scac || '—'}</div>
                    {s.scac && s.carrierName && <div style={{ fontSize: 8, color: 'var(--text-muted)' }}>{s.scac}</div>}
                  </td>
                  <td style={{ ...tdStyle, fontSize: 9 }}>{s.serviceName || '—'}</td>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                      <Ship size={9} style={{ opacity: 0.5, flexShrink: 0 }} />
                      <span>{s.vesselName || '—'}{s.voyageNumber ? ` / ${s.voyageNumber}` : ''}</span>
                    </div>
                  </td>
                  <td style={tdStyle}>
                    {s.originCityName || s.originUnloc || '—'}
                    {s.originUnloc && s.originCityName && <div style={{ fontSize: 8, color: 'var(--text-muted)' }}>{s.originUnloc}</div>}
                  </td>
                  <td style={tdStyle}>
                    {s.destinationCityName || s.destinationUnloc || '—'}
                    {s.destinationUnloc && s.destinationCityName && <div style={{ fontSize: 8, color: 'var(--text-muted)' }}>{s.destinationUnloc}</div>}
                  </td>
                  <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>{fmtDate(s.originDepartureDate)}</td>
                  <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>{fmtDate(s.destinationArrivalDate)}</td>
                  <td style={{ ...tdStyle, fontWeight: 600, textAlign: 'center' }}>
                    {s.totalDuration != null ? `${s.totalDuration}d` : '—'}
                  </td>
                  <td style={tdStyle}>
                    {s.scheduleType ? (
                      <span style={{
                        fontSize: 9, fontWeight: 600, padding: '2px 6px', borderRadius: 4,
                        background: s.scheduleType === 'direct' ? 'rgba(22,163,74,0.1)' : 'rgba(217,119,6,0.1)',
                        color: s.scheduleType === 'direct' ? '#16a34a' : '#d97706',
                      }}>{s.scheduleType === 'direct' ? 'Direct' : 'T/S'}</span>
                    ) : '—'}
                  </td>
                  <td style={{ ...tdStyle, fontSize: 9, whiteSpace: 'nowrap' }}>{fmtDate(s.bkCutoff)}</td>
                  {/* Special Rate checkbox */}
                  <td style={{ ...tdStyle, textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={checked.has(i)}
                      onChange={() => toggleCheck(i)}
                      style={{ cursor: 'pointer', accentColor: '#0f8fa8' }}
                    />
                  </td>
                  {/* Action button */}
                  <td style={{ ...tdStyle, textAlign: 'center' }}>
                    <button
                      type="button"
                      onClick={() => setModalIdx(i)}
                      style={{
                        fontSize: 9, fontWeight: 600, padding: '3px 10px', borderRadius: 4,
                        border: '1px solid #0f8fa8', background: 'rgba(15,143,168,0.06)',
                        color: '#0f8fa8', cursor: 'pointer', whiteSpace: 'nowrap',
                      }}
                    >
                      Input Rate
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Special rate input modal (placeholder) */}
      {modalIdx !== null && sorted[modalIdx] && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          onClick={() => setModalIdx(null)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'var(--bg-card, #fff)', border: '1px solid var(--border)',
              borderRadius: 12, padding: 28, minWidth: 380, maxWidth: 500,
              boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>Special Rate Input</h3>
              <button
                type="button"
                onClick={() => setModalIdx(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 2 }}
              >
                <X size={16} />
              </button>
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 14 }}>
              {sorted[modalIdx].carrierName || sorted[modalIdx].scac || '—'}
              {' \u2014 '}
              {sorted[modalIdx].vesselName || '—'}
              {sorted[modalIdx].voyageNumber ? ` / ${sorted[modalIdx].voyageNumber}` : ''}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 14 }}>
              {sorted[modalIdx].originCityName || sorted[modalIdx].originUnloc || '—'}
              {' \u2192 '}
              {sorted[modalIdx].destinationCityName || sorted[modalIdx].destinationUnloc || '—'}
              {sorted[modalIdx].originDepartureDate ? ` \u00b7 ETD ${fmtDate(sorted[modalIdx].originDepartureDate)}` : ''}
            </div>
            <div style={{
              padding: 24, background: 'rgba(100,116,139,0.04)', border: '1px dashed var(--border)',
              borderRadius: 8, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13,
            }}>
              Special rate input
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 18 }}>
              <button
                type="button"
                onClick={() => setModalIdx(null)}
                className="db-btn"
                style={{ fontSize: 11, padding: '5px 16px' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ---------------------------------------------------------------------------
// Main Schedules page — tabbed: Schedule Rates | Search Schedules
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
  // TAB 1 — Schedule Rates (enriched)
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

  // Cargo ready date + weeks out + direct only — mirrors the API search tab
  const todayDb = useMemo(() => new Date().toISOString().slice(0, 10), [])
  const [dbCargoReadyDate, setDbCargoReadyDate] = useState(todayDb)
  const [dbWeeksOut, setDbWeeksOut] = useState(4)
  const [dbDirectOnly, setDbDirectOnly] = useState(false)

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
    apiGetEnrichedScheduleRates({
      port_pair: portPairStr,
      cargo_ready_date: dbCargoReadyDate || undefined,
      weeks_out: dbWeeksOut || undefined,
      direct_only: dbDirectOnly || undefined,
    })
      .then(setAggRaw)
      .catch(() => { setAggRaw({}); onFlash('Failed to load schedule rates') })
      .finally(() => { setLoading(false); setSearched(true) })
  }

  // ====================================================================
  // TAB 2 — Search Schedules (INTTRA live search)
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
    return l ? `${l.name} \u2013 ${scac}` : scac
  }

  const today = useMemo(() => new Date().toISOString().slice(0, 10), [])
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

  const tabStyle = (active: boolean): React.CSSProperties => ({
    padding: '8px 20px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
    border: 'none', background: 'none',
    color: active ? '#0f8fa8' : 'var(--text-muted)',
    borderBottom: active ? '2px solid #0f8fa8' : '2px solid transparent',
    marginBottom: -2, transition: 'color 0.15s, border-color 0.15s',
  })

  return (
    <div style={{ padding: 24, maxWidth: 1400, margin: '0 auto' }}>
      {/* Page title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <Globe size={18} style={{ color: '#0f8fa8' }} />
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>Ocean Schedules</h2>
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '2px solid var(--border)', marginBottom: 16 }}>
        <button onClick={() => setActiveTab('rates')} style={tabStyle(activeTab === 'rates')}>
          Schedule Rates
        </button>
        <button onClick={() => setActiveTab('search')} style={tabStyle(activeTab === 'search')}>
          Search Schedules
        </button>
      </div>

      {/* ================================================================
          TAB 1 — Schedule Rates
          ================================================================ */}
      <div style={{ display: activeTab === 'rates' ? 'block' : 'none' }}>
        {/* Search form */}
        <div style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 18, marginBottom: 20, background: 'var(--bg-card, #fff)' }}>
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8, letterSpacing: 0.3, textTransform: 'uppercase' }}>
              Port Pairs
            </div>
            {portPairs.map((pair, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
                <div style={{ flex: 1 }}>
                  <PortCombobox value={pair.origin} onChange={v => updatePair(idx, 'origin', v)} placeholder="Origin port" />
                </div>
                <ArrowRight size={16} style={{ marginTop: 10, color: 'var(--text-muted)', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <PortCombobox value={pair.destination} onChange={v => updatePair(idx, 'destination', v)} placeholder="Destination port" />
                </div>
                {portPairs.length > 1 && (
                  <button type="button" onClick={() => removePair(idx)}
                    style={{
                      marginTop: 6, width: 26, height: 26, borderRadius: 6, border: '1px solid var(--border)',
                      background: 'transparent', color: '#dc2626', cursor: 'pointer', display: 'flex',
                      alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                    <X size={13} />
                  </button>
                )}
              </div>
            ))}
            <button type="button" onClick={addPair}
              style={{
                fontSize: 11, color: '#0f8fa8', background: 'none', border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 4, padding: '2px 0', fontWeight: 600,
              }}>
              <Plus size={12} /> Add port pair
            </button>
          </div>

          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8, letterSpacing: 0.3, textTransform: 'uppercase' }}>
              Filter by Liner <span style={{ fontWeight: 400, textTransform: 'none' }}>(optional)</span>
            </div>
            <TagInput
              values={selectedLiners}
              onChange={setSelectedLiners}
              suggestions={[...new Set(linerList.map(l => l.name))]}
              placeholder="Type to add liners..."
              formatLabel={formatLinerLabel}
            />
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>Leave empty to show all liners.</div>
          </div>

          {/* Date + options row — mirrors the API search tab */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-end', marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6, letterSpacing: 0.3, textTransform: 'uppercase' }}>
                Cargo Ready Date
              </div>
              <input
                type="date"
                value={dbCargoReadyDate}
                onChange={e => setDbCargoReadyDate(e.target.value)}
                style={{ width: 160, padding: '7px 10px', fontSize: 12, borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-card, #fff)', color: 'var(--text)', outline: 'none' }}
              />
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6, letterSpacing: 0.3, textTransform: 'uppercase' }}>
                Weeks Out
              </div>
              <input
                type="number"
                value={dbWeeksOut}
                onChange={e => setDbWeeksOut(Number(e.target.value))}
                min={1}
                max={12}
                style={{ width: 80, padding: '7px 10px', fontSize: 12, borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-card, #fff)', color: 'var(--text)', outline: 'none' }}
              />
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', paddingBottom: 4 }}>
              <input type="checkbox" checked={dbDirectOnly} onChange={e => setDbDirectOnly(e.target.checked)} />
              <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600 }}>Direct only</span>
            </label>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button className="db-btn primary" onClick={handleSearch} disabled={!canSearch}
              style={{
                fontSize: 11, padding: '6px 20px', display: 'flex', alignItems: 'center', gap: 6,
              }}>
              {loading ? <Loader2 size={14} className="spin" /> : <Search size={14} />}
              Search Rates
            </button>
          </div>
        </div>

        {/* Results */}
        {loading && filteredRows.length === 0 && (
          <div style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>
            <Loader2 size={20} className="spin" style={{ marginBottom: 6 }} />
            <div style={{ fontSize: 12 }}>Searching schedule rates...</div>
          </div>
        )}
        {!loading && searched && filteredRows.length === 0 && (
          <div style={{
            padding: 20, background: 'rgba(100,116,139,0.04)', border: '1px solid rgba(100,116,139,0.15)',
            borderRadius: 8, fontSize: 12, color: 'var(--text-muted)', textAlign: 'center',
          }}>
            No schedule rates found for the selected port pairs{selectedLiners.length > 0 ? ' and liner filter' : ''}.
          </div>
        )}
        {filteredRows.length > 0 && (
          <>
            {loading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, fontSize: 11, color: 'var(--text-muted)' }}>
                <Loader2 size={12} className="spin" /> Updating results...
              </div>
            )}
            <PivotRateTable rows={filteredRows} rateTypes={pivot.rateTypes} containerTypes={pivot.containerTypes} />
          </>
        )}
        {!searched && !loading && (
          <div style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--text-muted)' }}>
            <Globe size={28} style={{ marginBottom: 8, opacity: 0.3 }} />
            <div style={{ fontSize: 12 }}>Enter one or more port pairs and click Search to find schedule rates.</div>
          </div>
        )}
      </div>

      {/* ================================================================
          TAB 2 — Search Schedules (INTTRA)
          ================================================================ */}
      <div style={{ display: activeTab === 'search' ? 'block' : 'none' }}>
        {/* Search form */}
        <div style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 18, marginBottom: 20, background: 'var(--bg-card, #fff)' }}>
          {/* Port pairs */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8, letterSpacing: 0.3, textTransform: 'uppercase' }}>
              Port Pairs
            </div>
            {searchPairs.map((pair, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
                <div style={{ flex: 1 }}>
                  <PortCombobox value={pair.origin} onChange={v => updateSearchPair(idx, 'origin', v)} placeholder="Origin port" />
                </div>
                <ArrowRight size={16} style={{ marginTop: 10, color: 'var(--text-muted)', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <PortCombobox value={pair.destination} onChange={v => updateSearchPair(idx, 'destination', v)} placeholder="Destination port" />
                </div>
                {searchPairs.length > 1 && (
                  <button type="button" onClick={() => removeSearchPair(idx)}
                    style={{
                      marginTop: 6, width: 26, height: 26, borderRadius: 6, border: '1px solid var(--border)',
                      background: 'transparent', color: '#dc2626', cursor: 'pointer', display: 'flex',
                      alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                    <X size={13} />
                  </button>
                )}
              </div>
            ))}
            <button type="button" onClick={addSearchPair}
              style={{
                fontSize: 11, color: '#0f8fa8', background: 'none', border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 4, padding: '2px 0', fontWeight: 600,
              }}>
              <Plus size={12} /> Add port pair
            </button>
          </div>

          {/* Carrier / SCAC selection */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8, letterSpacing: 0.3, textTransform: 'uppercase' }}>
              Carriers <span style={{ color: '#dc2626', textTransform: 'none' }}>*</span>
            </div>
            <TagInput
              values={selectedScacs}
              onChange={setSelectedScacs}
              suggestions={scacSuggestions}
              placeholder="Type carrier name or SCAC code..."
              formatLabel={formatScacLabel}
            />
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>
              Select one or more carriers to search their schedules.
            </div>
          </div>

          {/* Date + options row */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-end', marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6, letterSpacing: 0.3, textTransform: 'uppercase' }}>
                Departure Date <span style={{ color: '#dc2626', textTransform: 'none' }}>*</span>
              </div>
              <input
                type="date"
                value={searchDate}
                onChange={e => setSearchDate(e.target.value)}
                style={{ width: 160, padding: '7px 10px', fontSize: 12, borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-card, #fff)', color: 'var(--text)', outline: 'none' }}
              />
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6, letterSpacing: 0.3, textTransform: 'uppercase' }}>
                Weeks Out
              </div>
              <input
                type="number"
                value={weeksOut}
                onChange={e => setWeeksOut(Number(e.target.value))}
                min={1}
                max={12}
                style={{ width: 80, padding: '7px 10px', fontSize: 12, borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-card, #fff)', color: 'var(--text)', outline: 'none' }}
              />
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', paddingBottom: 4 }}>
              <input type="checkbox" checked={directOnly} onChange={e => setDirectOnly(e.target.checked)} />
              <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600 }}>Direct only</span>
            </label>
          </div>

          {/* Search button */}
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button className="db-btn primary" onClick={handleSearchSchedules} disabled={!canSearchSchedules}
              style={{
                fontSize: 11, padding: '6px 20px', display: 'flex', alignItems: 'center', gap: 6,
              }}>
              {searchLoading ? <Loader2 size={14} className="spin" /> : <Search size={14} />}
              Search Schedules
            </button>
          </div>
        </div>

        {/* Results */}
        {searchLoading && searchResults.length === 0 && (
          <div style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>
            <Loader2 size={20} className="spin" style={{ marginBottom: 6 }} />
            <div style={{ fontSize: 12 }}>Searching schedules...</div>
          </div>
        )}
        {!searchLoading && searchSearched && searchResults.length === 0 && (
          <div style={{
            padding: 20, background: 'rgba(100,116,139,0.04)', border: '1px solid rgba(100,116,139,0.15)',
            borderRadius: 8, fontSize: 12, color: 'var(--text-muted)', textAlign: 'center',
          }}>
            No schedules found for the selected port pairs and carriers.
          </div>
        )}
        {searchResults.length > 0 && (
          <>
            {searchLoading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, fontSize: 11, color: 'var(--text-muted)' }}>
                <Loader2 size={12} className="spin" /> Updating results...
              </div>
            )}
            <ScheduleSearchTable data={searchResults} linerList={linerList} onFlash={onFlash} />
          </>
        )}
        {!searchSearched && !searchLoading && (
          <div style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--text-muted)' }}>
            <Ship size={28} style={{ marginBottom: 8, opacity: 0.3 }} />
            <div style={{ fontSize: 12 }}>Select port pairs, carriers, and a departure date, then click Search.</div>
          </div>
        )}
      </div>
    </div>
  )
}
