import { useState, useMemo } from 'react'
import { Radar, Search, Loader2, Ship, MapPin, Package, Anchor, ChevronDown, ChevronRight } from 'lucide-react'
import { apiTrackingEvents } from '../../api'
import type { TrackingContainer, TrackingEvent, TrackingEventDateTime } from '../../types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Parse CCYYMMDDHHMM date string → Date */
function parseTrackingDate(dt: TrackingEventDateTime | null): Date | null {
  if (!dt?.dateValue) return null
  const v = dt.dateValue
  if (v.length < 12) return null
  const y = parseInt(v.slice(0, 4), 10)
  const m = parseInt(v.slice(4, 6), 10) - 1
  const d = parseInt(v.slice(6, 8), 10)
  const h = parseInt(v.slice(8, 10), 10)
  const min = parseInt(v.slice(10, 12), 10)
  return new Date(y, m, d, h, min)
}

function fmtDateTime(dt: TrackingEventDateTime | null): string {
  const d = parseTrackingDate(dt)
  if (!d) return '—'
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) +
    ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

function fmtDateShort(dt: TrackingEventDateTime | null): string {
  const d = parseTrackingDate(dt)
  if (!d) return '—'
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) +
    ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

/** Color & icon mapping for event type codes */
const EVENT_STYLE: Record<string, { color: string; bg: string }> = {
  EE: { color: '#64748b', bg: 'rgba(100,116,139,0.1)' },   // Gate Out (Empty)
  I:  { color: '#2563eb', bg: 'rgba(37,99,235,0.1)' },      // Gate In
  AE: { color: '#0891b2', bg: 'rgba(8,145,178,0.1)' },      // Vessel Load
  VD: { color: '#16a34a', bg: 'rgba(22,163,74,0.1)' },      // Vessel Departure
  VA: { color: '#d97706', bg: 'rgba(217,119,6,0.1)' },      // Vessel Arrival
  UV: { color: '#7c3aed', bg: 'rgba(124,58,237,0.1)' },     // Vessel Discharge
  OA: { color: '#059669', bg: 'rgba(5,150,105,0.1)' },      // Gate Out (Full)
}
const DEFAULT_EVENT_STYLE = { color: '#64748b', bg: 'rgba(100,116,139,0.1)' }

// ---------------------------------------------------------------------------
// EventTimeline — chronological list of events for a container
// ---------------------------------------------------------------------------

function EventTimeline({ events }: { events: TrackingEvent[] }) {
  // Sort events by date descending (most recent first)
  const sorted = useMemo(() =>
    [...events].sort((a, b) => {
      const da = parseTrackingDate(a.eventDateTime)?.getTime() ?? 0
      const db = parseTrackingDate(b.eventDateTime)?.getTime() ?? 0
      return db - da
    }),
  [events])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {sorted.map((ev, idx) => {
        const style = EVENT_STYLE[ev.eventTypeCode] ?? DEFAULT_EVENT_STYLE
        const isLast = idx === sorted.length - 1

        // Extract POL / POD from transportationDetails
        const pol = ev.transportationDetails?.find(td => td.transportationLocationType === 'PortOfLoad')
        const pod = ev.transportationDetails?.find(td => td.transportationLocationType === 'PortOfDischarge')
        const polDate = pol?.transportationDates?.[0]
        const podDate = pod?.transportationDates?.[0]

        return (
          <div key={idx} style={{ display: 'flex', gap: 12 }}>
            {/* Timeline spine */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 20, flexShrink: 0 }}>
              <div style={{
                width: 10, height: 10, borderRadius: '50%', background: style.color,
                border: `2px solid ${style.color}`, flexShrink: 0, marginTop: 4,
              }} />
              {!isLast && (
                <div style={{ width: 2, flex: 1, background: 'var(--border)', minHeight: 20 }} />
              )}
            </div>

            {/* Event card */}
            <div style={{
              flex: 1, padding: '8px 12px', marginBottom: 8,
              background: 'var(--bg-card, #fff)', border: '1px solid var(--border)',
              borderRadius: 8,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6, marginBottom: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{
                    fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 4,
                    background: style.bg, color: style.color, whiteSpace: 'nowrap',
                  }}>
                    {ev.eventTypeCode}
                  </span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text)' }}>
                    {ev.eventTypeDescription}
                  </span>
                  {ev.eventClassifierCode === 'ACT' && (
                    <span style={{ fontSize: 8, fontWeight: 600, color: '#16a34a', textTransform: 'uppercase' }}>Actual</span>
                  )}
                  {ev.eventClassifierCode === 'EST' && (
                    <span style={{ fontSize: 8, fontWeight: 600, color: '#d97706', textTransform: 'uppercase' }}>Estimated</span>
                  )}
                </div>
                <span style={{ fontSize: 10, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                  {fmtDateShort(ev.eventDateTime)}
                </span>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, fontSize: 10, color: 'var(--text-secondary)' }}>
                {/* Location */}
                {ev.eventLocation?.locationName && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                    <MapPin size={9} style={{ opacity: 0.6 }} />
                    <span>{ev.eventLocation.locationName}{ev.eventLocation.unLocode ? ` (${ev.eventLocation.unLocode})` : ''}</span>
                    {ev.eventLocation.countryName && (
                      <span style={{ color: 'var(--text-muted)', fontSize: 9 }}>, {ev.eventLocation.countryName}</span>
                    )}
                  </div>
                )}

                {/* Vessel */}
                {ev.vesselName && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                    <Ship size={9} style={{ opacity: 0.6 }} />
                    <span>{ev.vesselName}{ev.voyageNumber ? ` / ${ev.voyageNumber}` : ''}</span>
                  </div>
                )}

                {/* Load status */}
                {ev.emptyIndicatorCodeDescription && (
                  <span style={{
                    fontSize: 9, fontWeight: 600, padding: '1px 5px', borderRadius: 3,
                    background: ev.emptyIndicatorCode === 'L' ? 'rgba(22,163,74,0.08)' : 'rgba(100,116,139,0.08)',
                    color: ev.emptyIndicatorCode === 'L' ? '#16a34a' : '#64748b',
                  }}>
                    {ev.emptyIndicatorCodeDescription}
                  </span>
                )}

                {/* Seal */}
                {ev.sealNumber && (
                  <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>Seal: {ev.sealNumber}</span>
                )}
              </div>

              {/* Transportation route: POL → POD */}
              {(pol || pod) && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 5, fontSize: 9, color: 'var(--text-muted)' }}>
                  {pol && (
                    <span>
                      POL: {pol.transportationLocationCode}
                      {polDate && <> ({polDate.transportationDateType === 'ActualDepartureDate' ? 'ATD' : 'ETD'}: {fmtDateShort(polDate.transportationDateTime)})</>}
                    </span>
                  )}
                  {pol && pod && <span>&rarr;</span>}
                  {pod && (
                    <span>
                      POD: {pod.transportationLocationCode}
                      {podDate && <> ({podDate.transportationDateType === 'EstimatedArrivalDate' ? 'ETA' : 'ATA'}: {fmtDateShort(podDate.transportationDateTime)})</>}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ---------------------------------------------------------------------------
// ContainerCard — one card per tracked container
// ---------------------------------------------------------------------------

function ContainerCard({ container, defaultExpanded }: { container: TrackingContainer; defaultExpanded: boolean }) {
  const [expanded, setExpanded] = useState(defaultExpanded)

  const latestEvent = container.events.length > 0
    ? [...container.events].sort((a, b) => {
        const da = parseTrackingDate(a.eventDateTime)?.getTime() ?? 0
        const db = parseTrackingDate(b.eventDateTime)?.getTime() ?? 0
        return db - da
      })[0]
    : null

  const latestStyle = latestEvent
    ? (EVENT_STYLE[latestEvent.eventTypeCode] ?? DEFAULT_EVENT_STYLE)
    : DEFAULT_EVENT_STYLE

  return (
    <div style={{
      border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden',
      background: 'var(--bg-card, #fff)',
    }}>
      {/* Card header */}
      <div
        onClick={() => setExpanded(e => !e)}
        style={{
          padding: '12px 16px', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
          background: expanded ? 'rgba(15,143,168,0.03)' : 'transparent',
          borderBottom: expanded ? '1px solid var(--border)' : 'none',
        }}
      >
        {/* Expand chevron */}
        <div style={{ color: 'var(--text-muted)', flexShrink: 0 }}>
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </div>

        {/* Container / B-L identifiers */}
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {container.equipmentReference && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Package size={12} style={{ color: '#0f8fa8' }} />
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', letterSpacing: 0.3 }}>
                  {container.equipmentReference}
                </span>
              </div>
            )}
            {container.equipmentSizeTypeDescription && (
              <span style={{
                fontSize: 9, fontWeight: 600, padding: '2px 6px', borderRadius: 4,
                background: 'rgba(15,143,168,0.08)', color: '#0f8fa8',
              }}>
                {container.equipmentSizeTypeDescription}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 3, fontSize: 10, color: 'var(--text-muted)', flexWrap: 'wrap' }}>
            {container.billOfLadingNumber && <span>B/L: <b style={{ color: 'var(--text-secondary)' }}>{container.billOfLadingNumber}</b></span>}
            {container.carrierBookingReference && <span>Booking: <b style={{ color: 'var(--text-secondary)' }}>{container.carrierBookingReference}</b></span>}
            {container.inttraBookingReference && <span>INTTRA: <b style={{ color: 'var(--text-secondary)' }}>{container.inttraBookingReference}</b></span>}
            {container.carrierScac && <span>Carrier: <b style={{ color: 'var(--text-secondary)' }}>{container.carrierScac}</b></span>}
            {container.sealNumber && <span>Seal: {container.sealNumber}</span>}
          </div>
        </div>

        {/* Latest event badge */}
        {latestEvent && (
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{
              fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 6,
              background: latestStyle.bg, color: latestStyle.color, display: 'inline-block',
            }}>
              {latestEvent.eventTypeDescription}
            </div>
            <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 2 }}>
              {fmtDateShort(latestEvent.eventDateTime)}
              {latestEvent.eventLocation?.locationName && (
                <> &middot; {latestEvent.eventLocation.locationName}</>
              )}
            </div>
          </div>
        )}

        {/* Event count */}
        <div style={{
          fontSize: 10, color: 'var(--text-muted)', background: 'rgba(100,116,139,0.06)',
          padding: '2px 8px', borderRadius: 10, fontWeight: 600, flexShrink: 0,
        }}>
          {container.events.length} event{container.events.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Expanded detail: event timeline */}
      {expanded && (
        <div style={{ padding: '14px 16px' }}>
          {container.events.length > 0 ? (
            <EventTimeline events={container.events} />
          ) : (
            <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', padding: 16 }}>
              No events available for this container.
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main TrackAndTrace page
// ---------------------------------------------------------------------------

interface TrackAndTraceProps {
  onFlash: (msg: string) => void
}

export default function TrackAndTrace({ onFlash }: TrackAndTraceProps) {
  const [inttraRef, setInttraRef] = useState('')
  const [carrierRef, setCarrierRef] = useState('')
  const [blNumber, setBlNumber] = useState('')
  const [equipmentRef, setEquipmentRef] = useState('')

  const [results, setResults] = useState<TrackingContainer[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)

  const hasInput = !!(inttraRef || carrierRef || blNumber || equipmentRef)

  const handleSearch = () => {
    if (!hasInput || loading) return
    setLoading(true)
    setSearched(true)
    apiTrackingEvents({
      inttra_booking_reference: inttraRef || undefined,
      carrier_booking_reference: carrierRef || undefined,
      bill_of_lading_number: blNumber || undefined,
      equipment_reference: equipmentRef || undefined,
    })
      .then(setResults)
      .catch(() => { setResults([]); onFlash('Failed to fetch tracking events') })
      .finally(() => setLoading(false))
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch()
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '7px 10px', fontSize: 12, borderRadius: 6,
    border: '1px solid var(--border)', background: 'var(--bg-card, #fff)',
    color: 'var(--text)', outline: 'none',
  }

  // Count total events across all containers
  const totalEvents = results.reduce((sum, c) => sum + c.events.length, 0)

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
      {/* Page title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <Radar size={18} style={{ color: '#0f8fa8' }} />
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>Track &amp; Trace</h2>
      </div>

      {/* Search form */}
      <div style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 18, marginBottom: 20, background: 'var(--bg-card, #fff)' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 10, letterSpacing: 0.3, textTransform: 'uppercase' }}>
          Search by Reference
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
          <div>
            <label style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 3, display: 'block' }}>INTTRA Booking Ref</label>
            <input
              style={inputStyle}
              value={inttraRef}
              onChange={e => setInttraRef(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="e.g. INTTRA-123456"
            />
          </div>
          <div>
            <label style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 3, display: 'block' }}>Carrier Booking Ref</label>
            <input
              style={inputStyle}
              value={carrierRef}
              onChange={e => setCarrierRef(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="e.g. 2742429380"
            />
          </div>
          <div>
            <label style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 3, display: 'block' }}>Bill of Lading Number</label>
            <input
              style={inputStyle}
              value={blNumber}
              onChange={e => setBlNumber(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="e.g. MEDU123456789"
            />
          </div>
          <div>
            <label style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 3, display: 'block' }}>Equipment / Container Ref</label>
            <input
              style={inputStyle}
              value={equipmentRef}
              onChange={e => setEquipmentRef(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="e.g. MSCU1234567"
            />
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            className="db-btn primary"
            onClick={handleSearch}
            disabled={!hasInput || loading}
            style={{
              fontSize: 11, padding: '6px 20px', display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            {loading ? <Loader2 size={14} className="spin" /> : <Search size={14} />}
            Search
          </button>
        </div>
      </div>

      {/* Results */}
      {loading && results.length === 0 && (
        <div style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>
          <Loader2 size={20} className="spin" style={{ marginBottom: 6 }} />
          <div style={{ fontSize: 12 }}>Searching tracking events...</div>
        </div>
      )}

      {!loading && searched && results.length === 0 && (
        <div style={{
          padding: 20, background: 'rgba(100,116,139,0.04)', border: '1px solid rgba(100,116,139,0.15)',
          borderRadius: 8, fontSize: 12, color: 'var(--text-muted)', textAlign: 'center',
        }}>
          No tracking events found for the provided references.
        </div>
      )}

      {results.length > 0 && (
        <>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 10, padding: '0 2px' }}>
            {results.length} container{results.length !== 1 ? 's' : ''} &middot; {totalEvents} event{totalEvents !== 1 ? 's' : ''}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {results.map((c, i) => (
              <ContainerCard
                key={`${c.equipmentReference ?? c.billOfLadingNumber ?? i}`}
                container={c}
                defaultExpanded={results.length === 1}
              />
            ))}
          </div>
        </>
      )}

      {/* Initial state — not searched yet */}
      {!searched && !loading && (
        <div style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--text-muted)' }}>
          <Radar size={28} style={{ marginBottom: 8, opacity: 0.3 }} />
          <div style={{ fontSize: 12 }}>Enter a booking reference, bill of lading, or container number to track shipments.</div>
        </div>
      )}
    </div>
  )
}
