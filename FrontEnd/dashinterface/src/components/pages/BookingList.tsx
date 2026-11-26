import { useState, useMemo } from 'react'
import { PackageCheck, Eye, X, Globe, Search, Loader2, ChevronDown, ChevronRight, AlertTriangle, Check, RefreshCw, Anchor, Ship, MapPin, Calendar, Hash, FileText, User, Building2 } from 'lucide-react'
import {
  EMPLOYEES, daysUntil,
  type Booking, type ActivityEntry,
} from '../../types'
import { useRole } from '../../RoleContext'
import { apiFetchAllInttraBookings, apiSearchInttraBooking, type InttraBookingRecord } from '../../api'
import { PAGE_WRAPPER, PAGE_TITLE_ROW, PAGE_TITLE_ICON, PAGE_TITLE_H2, CARD, FIELD_LABEL, INPUT_STYLE } from './pageStyles'

interface BookingListProps {
  bookings: Booking[]
  activityLog: ActivityEntry[]
}

const STATUS_BADGE: Record<string, { bg: string; color: string }> = {
  'Pending Liner': { bg: 'rgba(234,179,8,0.12)', color: '#a16207' },
  'RA Assigned':   { bg: 'rgba(8,145,178,0.12)', color: '#0891b2' },
  'Liner Confirmed': { bg: 'rgba(22,163,74,0.12)', color: '#16a34a' },
  'Released':      { bg: 'rgba(124,58,237,0.12)', color: '#7c3aed' },
  'Cancelled':     { bg: 'rgba(220,38,38,0.12)', color: '#dc2626' },
}

const empName = (id: number | null) => {
  if (!id) return '—'
  return EMPLOYEES.find(e => e.id === id)?.name ?? `EMP-${id}`
}

export default function BookingList({ bookings, activityLog }: BookingListProps) {
  const { activeRole } = useRole()
  const [viewing, setViewing] = useState<Booking | null>(null)

  // Filters
  const [filterCustomer, setFilterCustomer] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterLiner, setFilterLiner] = useState('')
  const [filterOrigin, setFilterOrigin] = useState('')
  const [filterDestination, setFilterDestination] = useState('')
  const [filterDate, setFilterDate] = useState('')

  const filtered = useMemo(() => {
    let list = [...bookings]
    if (filterCustomer) list = list.filter(b => b.customer_name.toLowerCase().includes(filterCustomer.toLowerCase()))
    if (filterStatus) list = list.filter(b => b.status === filterStatus)
    if (filterLiner) list = list.filter(b => (b.shipping_line || '').toLowerCase().includes(filterLiner.toLowerCase()))
    if (filterOrigin) list = list.filter(b => b.origin.toLowerCase().includes(filterOrigin.toLowerCase()))
    if (filterDestination) list = list.filter(b => b.destination.toLowerCase().includes(filterDestination.toLowerCase()))
    if (filterDate) list = list.filter(b => b.created_at.startsWith(filterDate))
    // Sort: most recent first
    list.sort((a, b) => b.created_at.localeCompare(a.created_at))
    return list
  }, [bookings, filterCustomer, filterStatus, filterLiner, filterOrigin, filterDestination, filterDate])

  const hasFilters = filterCustomer || filterStatus || filterLiner || filterOrigin || filterDestination || filterDate

  // --- INTTRA state ---
  const [inttraSectionOpen, setInttraSectionOpen] = useState(false)
  const [inttraBookings, setInttraBookings] = useState<InttraBookingRecord[]>([])
  const [inttraLoading, setInttraLoading] = useState(false)
  const [inttraError, setInttraError] = useState<string | null>(null)
  const [inttraFetched, setInttraFetched] = useState(false)

  const [inttraSearchRef, setInttraSearchRef] = useState('')
  const [inttraSearchBy, setInttraSearchBy] = useState<'number' | 'id'>('number')
  const [inttraSearchResult, setInttraSearchResult] = useState<Record<string, unknown> | null>(null)
  const [inttraSearchLoading, setInttraSearchLoading] = useState(false)
  const [inttraSearchError, setInttraSearchError] = useState<string | null>(null)

  const [viewingInttra, setViewingInttra] = useState<InttraBookingRecord | null>(null)
  const [viewingInttraSearch, setViewingInttraSearch] = useState(false)

  const fetchAllInttra = async () => {
    setInttraLoading(true)
    setInttraError(null)
    try {
      const data = await apiFetchAllInttraBookings()
      setInttraBookings(data)
      setInttraFetched(true)
    } catch (err: unknown) {
      setInttraError(err instanceof Error ? err.message : 'Failed to fetch INTTRA bookings')
    } finally {
      setInttraLoading(false)
    }
  }

  const searchInttra = async () => {
    if (!inttraSearchRef.trim()) return
    setInttraSearchLoading(true)
    setInttraSearchError(null)
    setInttraSearchResult(null)
    try {
      const data = await apiSearchInttraBooking(inttraSearchRef.trim(), inttraSearchBy)
      setInttraSearchResult(data)
    } catch (err: unknown) {
      setInttraSearchError(err instanceof Error ? err.message : 'INTTRA search failed')
    } finally {
      setInttraSearchLoading(false)
    }
  }

  return (
    <div style={PAGE_WRAPPER}>
      {/* Page header */}
      <div style={PAGE_TITLE_ROW}>
        <PackageCheck size={18} style={PAGE_TITLE_ICON} />
        <h2 style={PAGE_TITLE_H2}>Booking List</h2>
        <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 8 }}>
          {filtered.length} booking{filtered.length !== 1 ? 's' : ''}{hasFilters ? ' (filtered)' : ''} · {activeRole} view
        </span>
      </div>

      {/* Filters */}
      <div style={{ ...CARD, marginBottom: 16, padding: '16px 20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12 }}>
          <div>
            <label style={FIELD_LABEL}>Customer</label>
            <input style={INPUT_STYLE} value={filterCustomer}
              onChange={e => setFilterCustomer(e.target.value)} placeholder="Search..." />
          </div>
          <div>
            <label style={FIELD_LABEL}>Status</label>
            <select style={INPUT_STYLE} value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}>
              <option value="">All</option>
              <option value="Pending Liner">Pending Liner</option>
              <option value="RA Assigned">RA Assigned</option>
              <option value="Liner Confirmed">Liner Confirmed</option>
              <option value="Released">Released</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>
          <div>
            <label style={FIELD_LABEL}>Shipping Line</label>
            <input style={INPUT_STYLE} value={filterLiner}
              onChange={e => setFilterLiner(e.target.value)} placeholder="Search..." />
          </div>
          <div>
            <label style={FIELD_LABEL}>Origin</label>
            <input style={INPUT_STYLE} value={filterOrigin}
              onChange={e => setFilterOrigin(e.target.value)} placeholder="Search..." />
          </div>
          <div>
            <label style={FIELD_LABEL}>Destination</label>
            <input style={INPUT_STYLE} value={filterDestination}
              onChange={e => setFilterDestination(e.target.value)} placeholder="Search..." />
          </div>
          <div>
            <label style={FIELD_LABEL}>Created Date</label>
            <div style={{ display: 'flex', gap: 4 }}>
              <input type="date" style={{ ...INPUT_STYLE, flex: 1 }} value={filterDate}
                onChange={e => setFilterDate(e.target.value)} />
              {filterDate && <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '0 4px' }} onClick={() => setFilterDate('')}><X size={13} /></button>}
            </div>
          </div>
        </div>
        {hasFilters && (
          <button style={{ marginTop: 10, background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: '#0891b2', fontWeight: 600 }}
            onClick={() => { setFilterCustomer(''); setFilterStatus(''); setFilterLiner(''); setFilterOrigin(''); setFilterDestination(''); setFilterDate('') }}>
            Clear all filters
          </button>
        )}
      </div>

      {/* Table */}
      <div style={{ ...CARD, padding: '0 0 8px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ textAlign: 'left', color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: 10, letterSpacing: '0.06em' }}>
              <th style={{ padding: '10px 8px', borderBottom: '1px solid var(--border)' }}>Booking ID</th>
              <th style={{ padding: '10px 8px', borderBottom: '1px solid var(--border)' }}>Customer</th>
              <th style={{ padding: '10px 8px', borderBottom: '1px solid var(--border)' }}>Route</th>
              <th style={{ padding: '10px 8px', borderBottom: '1px solid var(--border)' }}>Container</th>
              <th style={{ padding: '10px 8px', borderBottom: '1px solid var(--border)' }}>Shipping Line</th>
              <th style={{ padding: '10px 8px', borderBottom: '1px solid var(--border)' }}>Vessel / Voyage</th>
              <th style={{ padding: '10px 8px', borderBottom: '1px solid var(--border)' }}>Status</th>
              <th style={{ padding: '10px 8px', borderBottom: '1px solid var(--border)' }}>SI/BL Cutoff</th>
              <th style={{ padding: '10px 8px', borderBottom: '1px solid var(--border)' }}>Created</th>
              <th style={{ padding: '10px 8px', borderBottom: '1px solid var(--border)', width: 50 }}></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={10} style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                  No bookings found{hasFilters ? ' matching your filters' : ''}.
                </td>
              </tr>
            )}
            {filtered.map(b => {
              const badge = STATUS_BADGE[b.status] || { bg: 'rgba(0,0,0,0.06)', color: 'var(--text-secondary)' }
              const siblCutoff = b.si_cutoff_date || b.bl_cutoff_date
              const cutoffDays = siblCutoff ? daysUntil(siblCutoff) : null
              return (
                <tr key={b.id} style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }}
                  onClick={() => setViewing(b)}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(8,145,178,0.03)')}
                  onMouseLeave={e => (e.currentTarget.style.background = '')}>
                  <td style={{ padding: '12px 8px', fontFamily: 'monospace', fontSize: 11, color: 'var(--text-muted)' }}>{b.id}</td>
                  <td style={{ padding: '12px 8px', fontWeight: 600 }}>
                    {b.customer_name}
                    {b.is_urgent && <span style={{ marginLeft: 6, fontSize: 9, fontWeight: 700, color: '#dc2626', background: 'rgba(220,38,38,0.1)', padding: '1px 5px', borderRadius: 4 }}>URGENT</span>}
                  </td>
                  <td style={{ padding: '12px 8px' }}>
                    <span>{b.origin}</span>
                    <span style={{ color: 'var(--text-muted)', margin: '0 4px' }}>→</span>
                    <span>{b.destination}</span>
                  </td>
                  <td style={{ padding: '12px 8px' }}>{b.quantity}x {b.container_type}</td>
                  <td style={{ padding: '12px 8px' }}>{b.shipping_line || <span style={{ color: 'var(--text-muted)' }}>—</span>}</td>
                  <td style={{ padding: '12px 8px', fontSize: 11 }}>
                    {b.vessel_name ? (
                      <>{b.vessel_name}{b.voyage_number ? ` / ${b.voyage_number}` : ''}</>
                    ) : (
                      <span style={{ color: 'var(--text-muted)' }}>TBD</span>
                    )}
                  </td>
                  <td style={{ padding: '12px 8px' }}>
                    <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 700, background: badge.bg, color: badge.color }}>
                      {b.status}
                    </span>
                  </td>
                  <td style={{ padding: '12px 8px', fontSize: 11 }}>
                    {siblCutoff ? (
                      <span style={{ color: cutoffDays !== null && cutoffDays < 0 ? '#dc2626' : cutoffDays !== null && cutoffDays <= 2 ? '#d97706' : 'var(--text)' }}>
                        {siblCutoff}
                        {cutoffDays !== null && (
                          <span style={{ color: 'var(--text-muted)', fontSize: 10, marginLeft: 4 }}>
                            ({cutoffDays < 0 ? `${Math.abs(cutoffDays)}d over` : `${cutoffDays}d`})
                          </span>
                        )}
                      </span>
                    ) : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                  </td>
                  <td style={{ padding: '12px 8px', fontSize: 11, color: 'var(--text-muted)' }}>{b.created_at.slice(0, 10)}</td>
                  <td style={{ padding: '12px 8px' }}>
                    <button style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--text-muted)' }}
                      title="View details"
                      onClick={e => { e.stopPropagation(); setViewing(b) }}>
                      <Eye size={14} />
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* ================================================================== */}
      {/* INTTRA Bookings Section                                            */}
      {/* ================================================================== */}
      <div style={{ ...CARD, marginTop: 16, overflow: 'hidden' }}>
        {/* Section header — click to expand/collapse */}
        <button
          onClick={() => { setInttraSectionOpen(o => !o); if (!inttraFetched && !inttraSectionOpen) fetchAllInttra() }}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 10,
            padding: '14px 20px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
          }}>
          {inttraSectionOpen ? <ChevronDown size={16} style={{ color: '#0891b2' }} /> : <ChevronRight size={16} style={{ color: '#64748b' }} />}
          <Globe size={16} style={{ color: '#0891b2' }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>INTTRA Bookings</span>
          {inttraFetched && (
            <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 400 }}>
              {inttraBookings.length} record{inttraBookings.length !== 1 ? 's' : ''}
            </span>
          )}
        </button>

        {inttraSectionOpen && (
          <div style={{ borderTop: '1px solid var(--border)' }}>
            {/* Search bar */}
            <div style={{ padding: '14px 20px', background: 'rgba(8,145,178,0.03)', borderBottom: '1px solid var(--border)', display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 260px' }}>
                <label style={FIELD_LABEL}>Search INTTRA Booking</label>
                <div style={{ display: 'flex', gap: 6 }}>
                  <input
                    style={{ ...INPUT_STYLE, flex: 1 }}
                    value={inttraSearchRef}
                    onChange={e => setInttraSearchRef(e.target.value)}
                    placeholder="INTTRA reference number..."
                    onKeyDown={e => { if (e.key === 'Enter') searchInttra() }}
                  />
                  <select style={{ ...INPUT_STYLE, width: 130 }} value={inttraSearchBy} onChange={e => setInttraSearchBy(e.target.value as 'number' | 'id')}>
                    <option value="number">By Number</option>
                    <option value="id">By ID</option>
                  </select>
                </div>
              </div>
              <button
                className="db-btn primary"
                disabled={inttraSearchLoading || !inttraSearchRef.trim()}
                style={{ background: '#0891b2', borderColor: '#0891b2', display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, padding: '7px 14px',
                  opacity: (inttraSearchLoading || !inttraSearchRef.trim()) ? 0.5 : 1 }}
                onClick={searchInttra}>
                {inttraSearchLoading ? <Loader2 size={13} className="animate-spin" /> : <Search size={13} />}
                Search
              </button>
              <button
                className="db-btn"
                disabled={inttraLoading}
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, padding: '7px 14px',
                  opacity: inttraLoading ? 0.5 : 1 }}
                onClick={fetchAllInttra}>
                {inttraLoading ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                {inttraFetched ? 'Refresh' : 'Fetch All'}
              </button>
            </div>

            {/* Search result */}
            {inttraSearchError && (
              <div style={{ padding: '10px 20px', background: 'rgba(220,38,38,0.06)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#dc2626' }}>
                <AlertTriangle size={14} /> {inttraSearchError}
              </div>
            )}
            {inttraSearchResult && (
              <div style={{ borderBottom: '1px solid var(--border)' }}>
                {(() => {
                  const raw = inttraSearchResult as Record<string, unknown>
                  const results = (Array.isArray(raw.results) ? raw.results : [raw]) as Record<string, unknown>[]
                  const total = (raw.total as number) ?? results.length
                  const first = results[0] as Record<string, unknown> | undefined
                  return (
                    <>
                      <div style={{ padding: '10px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Check size={14} style={{ color: '#16a34a' }} />
                          <span style={{ fontSize: 12, fontWeight: 600, color: '#16a34a' }}>{total} result{total !== 1 ? 's' : ''} found</span>
                        </div>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            className="db-btn"
                            style={{ fontSize: 11, padding: '4px 10px', background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
                            onClick={() => setViewingInttraSearch(true)}>
                            <Eye size={12} style={{ marginRight: 4 }} /> View Details
                          </button>
                          <button
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '4px' }}
                            onClick={() => { setInttraSearchResult(null); setInttraSearchRef('') }}
                            title="Clear result">
                            <X size={14} />
                          </button>
                        </div>
                      </div>
                      {first && (
                        <div style={{ padding: '0 20px 10px', display: 'flex', flexWrap: 'wrap', gap: '6px 16px', fontSize: 12, color: 'var(--text-secondary)' }}>
                          {first.inttraReferenceNumber && <span><strong>INTTRA Ref:</strong> {String(first.inttraReferenceNumber)}</span>}
                          {first.state && <span style={{ padding: '1px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600, background: first.state === 'Confirmed' ? 'rgba(22,163,74,0.1)' : 'rgba(234,179,8,0.1)', color: first.state === 'Confirmed' ? '#16a34a' : '#ca8a04' }}>{String(first.state)}</span>}
                          {first.carrierName && <span><strong>Carrier:</strong> {String(first.carrierName)}</span>}
                          {first.carrierReferenceNumber && <span><strong>Carrier Ref:</strong> {String(first.carrierReferenceNumber)}</span>}
                          {(first.placeOfCarrierReceipt as Record<string, unknown>)?.identifierValue && <span><strong>Origin:</strong> {String((first.placeOfCarrierReceipt as Record<string, unknown>).identifierValue)}</span>}
                          {(first.placeOfCarrierDelivery as Record<string, unknown>)?.identifierValue && <span><strong>Dest:</strong> {String((first.placeOfCarrierDelivery as Record<string, unknown>).identifierValue)}</span>}
                        </div>
                      )}
                    </>
                  )
                })()}
              </div>
            )}

            {/* Error for fetch-all */}
            {inttraError && (
              <div style={{ padding: '10px 20px', background: 'rgba(220,38,38,0.06)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#dc2626' }}>
                <AlertTriangle size={14} /> {inttraError}
              </div>
            )}

            {/* INTTRA bookings table */}
            {inttraLoading && !inttraFetched && (
              <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <Loader2 size={16} className="animate-spin" /> Loading INTTRA bookings...
              </div>
            )}

            {inttraFetched && inttraBookings.length === 0 && (
              <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                No INTTRA bookings found.
              </div>
            )}

            {inttraBookings.length > 0 && (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ textAlign: 'left', color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: 10, letterSpacing: '0.06em' }}>
                    <th style={{ padding: '10px 8px', borderBottom: '1px solid var(--border)' }}>INTTRA Ref</th>
                    <th style={{ padding: '10px 8px', borderBottom: '1px solid var(--border)' }}>Client</th>
                    <th style={{ padding: '10px 8px', borderBottom: '1px solid var(--border)' }}>Route</th>
                    <th style={{ padding: '10px 8px', borderBottom: '1px solid var(--border)' }}>Liner</th>
                    <th style={{ padding: '10px 8px', borderBottom: '1px solid var(--border)' }}>Status</th>
                    <th style={{ padding: '10px 8px', borderBottom: '1px solid var(--border)' }}>Accepted</th>
                    <th style={{ padding: '10px 8px', borderBottom: '1px solid var(--border)' }}>Carrier Ref</th>
                    <th style={{ padding: '10px 8px', borderBottom: '1px solid var(--border)' }}>Cargo Ready</th>
                    <th style={{ padding: '10px 8px', borderBottom: '1px solid var(--border)', width: 50 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {inttraBookings.map(ib => {
                    const badge = STATUS_BADGE[ib.status] || { bg: 'rgba(0,0,0,0.06)', color: 'var(--text-secondary)' }
                    return (
                      <tr key={`${ib.bkg_id}-${ib.inttra_reference_number}`} style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }}
                        onClick={() => setViewingInttra(ib)}
                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(8,145,178,0.03)')}
                        onMouseLeave={e => (e.currentTarget.style.background = '')}>
                        <td style={{ padding: '12px 8px', fontFamily: 'monospace', fontSize: 11, color: '#0891b2', fontWeight: 600 }}>{ib.inttra_reference_number}</td>
                        <td style={{ padding: '12px 8px', fontWeight: 600 }}>{ib.client_name}</td>
                        <td style={{ padding: '12px 8px' }}>
                          <span>{ib.origin}</span>
                          <span style={{ color: 'var(--text-muted)', margin: '0 4px' }}>→</span>
                          <span>{ib.destination}</span>
                        </td>
                        <td style={{ padding: '12px 8px' }}>
                          {ib.liner_name || <span style={{ color: 'var(--text-muted)' }}>—</span>}
                          {ib.liner_scac && <span style={{ color: 'var(--text-muted)', fontSize: 10, marginLeft: 4 }}>({ib.liner_scac})</span>}
                        </td>
                        <td style={{ padding: '12px 8px' }}>
                          <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 700, background: badge.bg, color: badge.color }}>
                            {ib.status}
                          </span>
                        </td>
                        <td style={{ padding: '12px 8px' }}>
                          <span style={{
                            display: 'inline-block', padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 700,
                            background: ib.inttra_acceptence ? 'rgba(22,163,74,0.1)' : 'rgba(234,179,8,0.12)',
                            color: ib.inttra_acceptence ? '#16a34a' : '#a16207',
                          }}>
                            {ib.inttra_acceptence ? 'Confirmed' : 'Pending'}
                          </span>
                        </td>
                        <td style={{ padding: '12px 8px', fontFamily: 'monospace', fontSize: 11, color: 'var(--text-muted)' }}>{ib.inttra_booking_reference_id || '—'}</td>
                        <td style={{ padding: '12px 8px', fontSize: 11, color: 'var(--text-muted)' }}>{ib.cargo_ready_date || '—'}</td>
                        <td style={{ padding: '12px 8px' }}>
                          <button style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--text-muted)' }}
                            title="View details"
                            onClick={e => { e.stopPropagation(); setViewingInttra(ib) }}>
                            <Eye size={14} />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* ================================================================== */}
      {/* Local booking detail modal                                         */}
      {/* ================================================================== */}
      {viewing && (
        <div className="lt-modal-backdrop" onClick={() => setViewing(null)}>
          <div className="lt-modal" onClick={e => e.stopPropagation()} style={{ width: 600, padding: '28px 30px' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: 'var(--text)' }}>Booking Details</h3>
                <span style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{viewing.id}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {(() => { const b = STATUS_BADGE[viewing.status] || { bg: 'rgba(0,0,0,0.06)', color: 'var(--text-secondary)' }; return <span style={{ padding: '3px 10px', borderRadius: 10, fontSize: 11, fontWeight: 700, background: b.bg, color: b.color }}>{viewing.status}</span> })()}
                <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }} onClick={() => setViewing(null)}><X size={18} /></button>
              </div>
            </div>

            {/* Details grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 24px', fontSize: 13 }}>
              <div><span style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Customer</span><div style={{ fontWeight: 600, marginTop: 2 }}>{viewing.customer_name}</div></div>
              <div><span style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Route</span><div style={{ marginTop: 2 }}>{viewing.origin} → {viewing.destination}</div></div>
              <div><span style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Shipping Line</span><div style={{ marginTop: 2 }}>{viewing.shipping_line || '—'}</div></div>
              <div><span style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Container</span><div style={{ marginTop: 2 }}>{viewing.quantity}x {viewing.container_type}</div></div>
              <div><span style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Vessel</span><div style={{ marginTop: 2 }}>{viewing.vessel_name || 'TBD'}</div></div>
              <div><span style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Voyage</span><div style={{ marginTop: 2 }}>{viewing.voyage_number || 'TBD'}</div></div>
              <div><span style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Delivery Type</span><div style={{ marginTop: 2 }}>{viewing.delivery_type || '—'}</div></div>
              <div><span style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Quote Ref</span><div style={{ marginTop: 2, fontFamily: 'monospace', fontSize: 11 }}>{viewing.quote_id || '—'}</div></div>
              <div><span style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Booked By</span><div style={{ marginTop: 2 }}>{empName(viewing.booked_by)}</div></div>
              <div><span style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Confirmed By</span><div style={{ marginTop: 2 }}>{empName(viewing.confirmed_by)}</div></div>
              <div><span style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Created</span><div style={{ marginTop: 2 }}>{viewing.created_at}</div></div>
              <div><span style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Confirmed At</span><div style={{ marginTop: 2 }}>{viewing.confirmed_at || '—'}</div></div>
            </div>

            {/* Cutoff dates */}
            {(viewing.si_cutoff_date || viewing.bl_cutoff_date || viewing.vgm_cutoff_date || viewing.filing_cutoff_date) && (
              <div style={{ marginTop: 18 }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)', marginBottom: 8 }}>Cutoff Dates</div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  {(viewing.si_cutoff_date || viewing.bl_cutoff_date) && (
                    <div style={{ padding: '6px 12px', background: 'rgba(8,145,178,0.08)', border: '1px solid rgba(8,145,178,0.15)', borderRadius: 6, fontSize: 12 }}>
                      <span style={{ color: 'var(--text-muted)', fontSize: 10, fontWeight: 600 }}>SI/BL</span> <strong>{viewing.si_cutoff_date || viewing.bl_cutoff_date}</strong>
                    </div>
                  )}
                  {viewing.vgm_cutoff_date && (
                    <div style={{ padding: '6px 12px', background: 'rgba(217,119,6,0.08)', border: '1px solid rgba(217,119,6,0.15)', borderRadius: 6, fontSize: 12 }}>
                      <span style={{ color: 'var(--text-muted)', fontSize: 10, fontWeight: 600 }}>VGM</span> <strong>{viewing.vgm_cutoff_date}</strong>
                    </div>
                  )}
                  {viewing.filing_cutoff_date && (
                    <div style={{ padding: '6px 12px', background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.15)', borderRadius: 6, fontSize: 12 }}>
                      <span style={{ color: 'var(--text-muted)', fontSize: 10, fontWeight: 600 }}>Filing</span> <strong>{viewing.filing_cutoff_date}</strong>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Progress flags */}
            <div style={{ marginTop: 18 }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)', marginBottom: 8 }}>Progress</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {[
                  { label: 'Release Order', done: viewing.release_order_attached },
                  { label: 'SI Requested', done: viewing.si_requested },
                  { label: 'SI Submitted', done: viewing.si_submitted },
                  { label: 'Pre-Advice Sent', done: viewing.pre_advice_sent },
                  { label: 'SI Generated', done: viewing.liner_bl_instruction_generated },
                  { label: 'BL Approved', done: viewing.bl_status === 'approved' },
                  { label: 'Master BL', done: viewing.master_bl_recorded },
                  { label: 'House BL', done: viewing.house_bl_created },
                ].map(f => (
                  <span key={f.label} style={{
                    padding: '3px 10px', borderRadius: 10, fontSize: 10, fontWeight: 600,
                    background: f.done ? 'rgba(22,163,74,0.1)' : 'rgba(0,0,0,0.04)',
                    color: f.done ? '#16a34a' : 'var(--text-muted)',
                  }}>
                    {f.done ? '✓ ' : ''}{f.label}
                  </span>
                ))}
              </div>
            </div>

            {/* Notes */}
            {viewing.notes && (
              <div style={{ marginTop: 18 }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)', marginBottom: 6 }}>Notes</div>
                <div style={{ padding: '10px 14px', background: 'var(--bg)', borderRadius: 8, fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{viewing.notes}</div>
              </div>
            )}

            {/* Recent activity */}
            {(() => {
              const entries = activityLog.filter(a => a.ref_id === viewing.id).slice(0, 5)
              if (!entries.length) return null
              return (
                <div style={{ marginTop: 18 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)', marginBottom: 8 }}>Recent Activity</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {entries.map(a => (
                      <div key={a.id} style={{ padding: '8px 12px', background: 'var(--bg)', borderRadius: 6, fontSize: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                          <span style={{ fontWeight: 600, fontSize: 11, color: 'var(--text-secondary)' }}>{empName(a.actor_id)}</span>
                          <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{a.timestamp}</span>
                        </div>
                        <div style={{ color: 'var(--text-secondary)', lineHeight: 1.4 }}>{a.action}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })()}

            {/* Close button */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
              <button className="db-btn" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }} onClick={() => setViewing(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* INTTRA booking detail modal                                        */}
      {/* ================================================================== */}
      {viewingInttra && (
        <div className="lt-modal-backdrop" onClick={() => setViewingInttra(null)}>
          <div className="lt-modal" onClick={e => e.stopPropagation()} style={{ width: 600, padding: '28px 30px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: 'var(--text)' }}>
                  <Globe size={16} style={{ color: '#0891b2', marginRight: 8, verticalAlign: 'middle' }} />
                  INTTRA Booking
                </h3>
                <span style={{ fontSize: 12, color: '#0891b2', fontFamily: 'monospace', fontWeight: 600 }}>{viewingInttra.inttra_reference_number}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{
                  padding: '3px 10px', borderRadius: 10, fontSize: 11, fontWeight: 700,
                  background: viewingInttra.inttra_acceptence ? 'rgba(22,163,74,0.1)' : 'rgba(234,179,8,0.12)',
                  color: viewingInttra.inttra_acceptence ? '#16a34a' : '#a16207',
                }}>
                  {viewingInttra.inttra_acceptence ? 'Confirmed' : 'Pending'}
                </span>
                <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }} onClick={() => setViewingInttra(null)}><X size={18} /></button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 24px', fontSize: 13 }}>
              <div><span style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Client</span><div style={{ fontWeight: 600, marginTop: 2 }}>{viewingInttra.client_name}</div></div>
              <div><span style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Route</span><div style={{ marginTop: 2 }}>{viewingInttra.origin} → {viewingInttra.destination}</div></div>
              <div><span style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Liner</span><div style={{ marginTop: 2 }}>{viewingInttra.liner_name || '—'}{viewingInttra.liner_scac ? ` (${viewingInttra.liner_scac})` : ''}</div></div>
              <div><span style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Status</span><div style={{ marginTop: 2 }}>{viewingInttra.status}</div></div>
              <div><span style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Carrier Booking Ref</span><div style={{ marginTop: 2, fontFamily: 'monospace', fontSize: 11 }}>{viewingInttra.inttra_booking_reference_id || '—'}</div></div>
              <div><span style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Incoterm</span><div style={{ marginTop: 2 }}>{viewingInttra.incoterm || '—'}</div></div>
              <div><span style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Service Mode</span><div style={{ marginTop: 2 }}>{viewingInttra.service_mode || '—'}</div></div>
              <div><span style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Cargo Ready</span><div style={{ marginTop: 2 }}>{viewingInttra.cargo_ready_date || '—'}</div></div>
              <div><span style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Priority</span><div style={{ marginTop: 2 }}>{viewingInttra.priority || '—'}</div></div>
              <div><span style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Booking ID</span><div style={{ marginTop: 2, fontFamily: 'monospace', fontSize: 11 }}>BKG-{viewingInttra.bkg_id}</div></div>
              <div><span style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Inquiry ID</span><div style={{ marginTop: 2, fontFamily: 'monospace', fontSize: 11 }}>{viewingInttra.inq_id}</div></div>
            </div>

            {/* INTTRA Raw Response (collapsible) */}
            {viewingInttra.inttra_response && (
              <details style={{ marginTop: 18 }}>
                <summary style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)', cursor: 'pointer', marginBottom: 6 }}>INTTRA Response (raw)</summary>
                <pre style={{ padding: '10px 14px', background: 'var(--bg)', borderRadius: 8, fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.5, overflow: 'auto', maxHeight: 300 }}>
                  {JSON.stringify(viewingInttra.inttra_response, null, 2)}
                </pre>
              </details>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
              <button className="db-btn" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }} onClick={() => setViewingInttra(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* INTTRA search result detail modal                                  */}
      {/* ================================================================== */}
      {viewingInttraSearch && inttraSearchResult && (() => {
        const raw = inttraSearchResult as Record<string, unknown>
        const results = (Array.isArray(raw.results) ? raw.results : [raw]) as Record<string, unknown>[]
        const total = (raw.total as number) ?? results.length
        const fmtDate = (v: unknown) => { if (!v) return ''; try { const d = new Date(String(v)); return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) + ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) } catch { return String(v) } }
        const fmtLoc = (loc: unknown) => { if (!loc || typeof loc !== 'object') return ''; const l = loc as Record<string, unknown>; return `${l.identifierValue || ''}${l.city ? ` (${l.city})` : ''}${l.countryName ? `, ${l.countryName}` : ''}` }
        const sectionHead = (icon: React.ReactNode, title: string, color: string) => (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, marginTop: 16 }}>
            {icon}
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color }}>{title}</span>
          </div>
        )
        const fieldRow = (label: string, value: unknown) => value ? (
          <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', borderBottom: '1px solid var(--border)' }}>
            <div style={{ padding: '5px 10px', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', background: 'var(--bg)', display: 'flex', alignItems: 'center' }}>{label}</div>
            <div style={{ padding: '5px 10px', fontSize: 12, color: 'var(--text)' }}>{String(value)}</div>
          </div>
        ) : null
        const stateBadge = (state: string) => {
          const colors: Record<string, { bg: string; fg: string }> = {
            Confirmed: { bg: 'rgba(22,163,74,0.1)', fg: '#16a34a' },
            Pending: { bg: 'rgba(234,179,8,0.1)', fg: '#ca8a04' },
            Rejected: { bg: 'rgba(220,38,38,0.1)', fg: '#dc2626' },
            Cancelled: { bg: 'rgba(107,114,128,0.1)', fg: '#6b7280' },
          }
          const c = colors[state] || { bg: 'rgba(8,145,178,0.1)', fg: '#0891b2' }
          return <span style={{ display: 'inline-block', padding: '2px 10px', borderRadius: 10, fontSize: 11, fontWeight: 700, background: c.bg, color: c.fg }}>{state}</span>
        }
        return (
          <div className="lt-modal-backdrop" onClick={() => setViewingInttraSearch(false)}>
            <div className="lt-modal" onClick={e => e.stopPropagation()} style={{ width: 720, padding: '24px 28px', maxHeight: '85vh', overflow: 'auto' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: 'var(--text)' }}>
                    <Search size={16} style={{ color: '#0891b2', marginRight: 8, verticalAlign: 'middle' }} />
                    INTTRA Search Results
                  </h3>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {total} result{total !== 1 ? 's' : ''} for <span style={{ color: '#0891b2', fontFamily: 'monospace', fontWeight: 600 }}>{inttraSearchRef}</span>
                  </span>
                </div>
                <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }} onClick={() => setViewingInttraSearch(false)}><X size={18} /></button>
              </div>

              {results.map((r, idx) => {
                const receipt = r.placeOfCarrierReceipt as Record<string, unknown> | undefined
                const delivery = r.placeOfCarrierDelivery as Record<string, unknown> | undefined
                const portLoad = r.portOfLoad as Record<string, unknown> | undefined
                const portDischarge = r.portOfDischarge as Record<string, unknown> | undefined
                const containers = Array.isArray(r.containerTypes) ? (r.containerTypes as string[]).join(', ') : ''
                return (
                  <div key={idx} style={{ border: '1px solid var(--border)', borderRadius: 10, marginBottom: 16, overflow: 'hidden' }}>
                    {/* Header bar */}
                    <div style={{ padding: '10px 14px', background: 'rgba(8,145,178,0.04)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Hash size={13} style={{ color: '#0891b2' }} />
                        <span style={{ fontSize: 13, fontWeight: 700, fontFamily: 'monospace', color: '#0891b2' }}>{String(r.inttraReferenceNumber || inttraSearchRef)}</span>
                        {r.state && stateBadge(String(r.state))}
                      </div>
                      {r.carrierReferenceNumber && (
                        <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Carrier Ref: <strong>{String(r.carrierReferenceNumber)}</strong></span>
                      )}
                    </div>

                    <div style={{ padding: '0 14px 14px' }}>
                      {/* Carrier & Parties */}
                      {sectionHead(<Building2 size={12} style={{ color: '#7c3aed' }} />, 'Parties', '#7c3aed')}
                      <div style={{ borderRadius: 6, border: '1px solid var(--border)', overflow: 'hidden' }}>
                        {fieldRow('Carrier', r.carrierName)}
                        {fieldRow('Carrier ID', r.carrierId)}
                        {fieldRow('Booker', r.bookerName)}
                        {fieldRow('Shipper', r.shipperName)}
                        {fieldRow('Created By', r.createdBy)}
                        {fieldRow('Channel', r.channel)}
                      </div>

                      {/* Route */}
                      {sectionHead(<MapPin size={12} style={{ color: '#0891b2' }} />, 'Route', '#0891b2')}
                      <div style={{ borderRadius: 6, border: '1px solid var(--border)', overflow: 'hidden' }}>
                        {fieldRow('Place of Receipt', fmtLoc(receipt))}
                        {fieldRow('Port of Load', fmtLoc(portLoad))}
                        {fieldRow('Port of Discharge', fmtLoc(portDischarge))}
                        {fieldRow('Place of Delivery', fmtLoc(delivery))}
                        {fieldRow('Shipment ID', r.shipmentId)}
                      </div>

                      {/* Vessel & Transport */}
                      {sectionHead(<Ship size={12} style={{ color: '#2563eb' }} />, 'Vessel & Transport', '#2563eb')}
                      <div style={{ borderRadius: 6, border: '1px solid var(--border)', overflow: 'hidden' }}>
                        {fieldRow('Vessel', r.mainCarriageVesselName || r.firstLegVesselName)}
                        {fieldRow('Voyage', r.mainCarriageConveyanceNumber || r.firstLegConveyanceNumber)}
                        {fieldRow('Container Types', containers)}
                        {fieldRow('Container Count', r.numContainers)}
                        {fieldRow('Contract No.', r.contractNumber)}
                      </div>

                      {/* Dates */}
                      {sectionHead(<Calendar size={12} style={{ color: '#ea580c' }} />, 'Dates', '#ea580c')}
                      <div style={{ borderRadius: 6, border: '1px solid var(--border)', overflow: 'hidden' }}>
                        {fieldRow('ETD (Receipt)', fmtDate(r.placeOfCarrierReceiptEstimatedDepartureDate))}
                        {fieldRow('ETD (Port of Load)', fmtDate(r.portOfLoadEstimatedDepartureDate))}
                        {fieldRow('ETA (Discharge)', fmtDate(r.portOfDischargeEstimatedArrivalDate))}
                        {fieldRow('ETA (Delivery)', fmtDate(r.placeOfCarrierDeliveryEstimatedArrivalDate))}
                        {fieldRow('VGM Cut-off', fmtDate(r.vgmCutoffDate))}
                        {fieldRow('Documentation Cut-off', fmtDate(r.documentationCutoffDate))}
                        {fieldRow('Full Container Drop-off Cut-off', fmtDate(r.fullContainerDropoffLocationCutoffDate))}
                        {fieldRow('Drop-off Location', r.fullContainerDropoffLocation)}
                      </div>

                      {/* References */}
                      {(r.shipperReferenceNumbers as unknown[] || []).length > 0 || (r.forwarderReferenceNumbers as unknown[] || []).length > 0 || (r.billOfLadingNumbers as unknown[] || []).length > 0 ? (
                        <>
                          {sectionHead(<FileText size={12} style={{ color: '#059669' }} />, 'References', '#059669')}
                          <div style={{ borderRadius: 6, border: '1px solid var(--border)', overflow: 'hidden' }}>
                            {fieldRow('Shipper Refs', (r.shipperReferenceNumbers as string[] || []).join(', ') || null)}
                            {fieldRow('Forwarder Refs', (r.forwarderReferenceNumbers as string[] || []).join(', ') || null)}
                            {fieldRow('B/L Numbers', (r.billOfLadingNumbers as string[] || []).join(', ') || null)}
                            {fieldRow('P/O Numbers', (r.purchaseOrderNumbers as string[] || []).join(', ') || null)}
                            {fieldRow('Consignee Refs', (r.consigneeReferenceNumbers as string[] || []).join(', ') || null)}
                          </div>
                        </>
                      ) : null}

                      {/* Meta */}
                      {sectionHead(<User size={12} style={{ color: '#6b7280' }} />, 'Meta', '#6b7280')}
                      <div style={{ borderRadius: 6, border: '1px solid var(--border)', overflow: 'hidden' }}>
                        {fieldRow('Created', fmtDate(r.createdDateUtc))}
                        {fieldRow('Last Modified', fmtDate(r.lastModifiedDateUtc))}
                        {fieldRow('Last Modified By', r.lastModifiedBy)}
                        {fieldRow('Expires On', fmtDate(r.expiresOn))}
                      </div>
                    </div>
                  </div>
                )
              })}

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                <button className="db-btn" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }} onClick={() => setViewingInttraSearch(false)}>Close</button>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
