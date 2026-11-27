import { useMemo, useState, useEffect, useRef, Fragment, type ReactNode } from 'react'
import { Eye, Pencil, MessageSquarePlus, RefreshCw, Loader2, Save, Send, DollarSign } from 'lucide-react'
import {
  RATE_SOURCE_COLORS, linerDisplay,
  type UnifiedRate, type RateSourceType,
  type LinerRecord, type TradeLaneRecord,
} from '../../types'
import { apiFetchAllRates, apiUpdateRate, apiGetLiners, apiGetTradeLanes } from '../../api'
import { useRole } from '../../RoleContext'
import {
  Badge, Button, Checkbox, DatePicker, EmptyState, Field, Input, LoadingState, Modal, NumberInput, Select, Textarea, Tooltip,
  type BadgeProps, type Option,
} from '../ui'
import { cn } from '../../lib/cn'

// Rate types visible to CS and Sales (read-only, no record access)
const CS_SALES_ALLOWED: RateSourceType[] = ['FAK', 'Tariff Rate', 'Spot']

// ---------------------------------------------------------------------------
// Filter types
// ---------------------------------------------------------------------------

type SourceFilter = 'all' | RateSourceType
type LinerFilter  = 'all' | string
type LaneFilter   = 'all' | string

const SOURCE_OPTIONS: RateSourceType[] = [
  'Contracted', 'FAK', 'Spot', 'Tariff Rate', 'NAC', 'Special',
]

/** Select options keyed by value: the backend can repeat a liner or lane name, and a Select needs unique values. */
const uniqueOptions = (options: Option[]): Option[] => {
  const seen = new Set<string>()
  return options.filter(o => {
    if (seen.has(o.value)) return false
    seen.add(o.value)
    return true
  })
}

// ---------------------------------------------------------------------------
// Dynamic column definitions per rate type
// ---------------------------------------------------------------------------

interface ColDef {
  key: string
  label: string
  render: (r: UnifiedRate) => ReactNode
}

const TH = 'border-0 border-b border-line px-2 py-2.5 text-left align-bottom text-label font-semibold uppercase tracking-label text-fg-label'
const TD = 'px-2 py-3 align-middle'
const MONO = cn(TD, 'font-mono text-label text-fg-muted')
const MUTED = cn(TD, 'text-label text-fg-muted')
const SEC = cn(TD, 'text-label text-fg-label')

const dash = <span className="text-fg-muted">-</span>

/** Rate type tag in its category colour (shared with the rate badges elsewhere). */
function TypePill({ type }: { type: RateSourceType }) {
  const c = RATE_SOURCE_COLORS[type]
  return (
    <span
      className="whitespace-nowrap rounded-control px-2 py-0.5 text-label font-bold uppercase tracking-label"
      style={{ background: c + '15', color: c }}
    >
      {type}
    </span>
  )
}

const SCOPE_TONE: Record<string, BadgeProps['tone']> = { Import: 'info', Export: 'success', Within: 'warning' }

// Shared column builders
const colId: ColDef = {
  key: 'id', label: 'ID',
  render: r => <td className={MONO}>{r.id.split(':')[1] ?? r.id}</td>,
}
const colType: ColDef = {
  key: 'type', label: 'Type',
  render: r => <td className={TD}><TypePill type={r.source_type} /></td>,
}
const colLiner: ColDef = {
  key: 'liner', label: 'Liner',
  render: r => <td className={cn(TD, 'font-semibold text-fg')}>{r.liner_name ?? dash}</td>,
}
const colRoute: ColDef = {
  key: 'route', label: 'Origin → Destination',
  render: r => (
    <td className={cn(TD, 'whitespace-nowrap text-fg-label')}>
      {r.origin && r.destination ? (
        <>
          <span className="text-fg">{r.origin}</span>
          <span className="mx-1.5 text-fg-muted">→</span>
          <span className="text-fg">{r.destination}</span>
        </>
      ) : dash}
    </td>
  ),
}
const colOrigin: ColDef = {
  key: 'origin', label: 'Origin',
  render: r => <td className={cn(TD, 'text-fg')}>{r.origin || dash}</td>,
}
const colDestination: ColDef = {
  key: 'destination', label: 'Destination',
  render: r => <td className={cn(TD, 'text-fg')}>{r.destination || dash}</td>,
}
const colContainer: ColDef = {
  key: 'container', label: 'Container Type',
  render: r => <td className={SEC}>{r.container_type ?? dash}</td>,
}
const colRate: ColDef = {
  key: 'rate', label: 'Rate',
  render: r => <td className={cn(TD, 'font-bold text-fg')}>{r.rate != null ? `$${r.rate.toLocaleString()}` : '-'}</td>,
}
const colCurrency: ColDef = {
  key: 'currency', label: 'Currency',
  render: r => <td className={MUTED}>{r.currency}</td>,
}
const colTradeLane: ColDef = {
  key: 'tradeLane', label: 'Trade Lane',
  render: r => <td className={SEC}>{r.trade_lane ?? dash}</td>,
}
const colValidFrom: ColDef = {
  key: 'validFrom', label: 'Valid From',
  render: r => <td className={MUTED}>{r.valid_from ?? '-'}</td>,
}
const colValidTo: ColDef = {
  key: 'validTo', label: 'Valid To',
  render: r => <td className={MUTED}>{r.valid_to ?? '-'}</td>,
}
const colSoldStatus: ColDef = {
  key: 'sold', label: 'Sold',
  render: r => (
    <td className={TD}>
      {r.is_sold === true && <Badge tone="danger">Sold</Badge>}
      {r.is_sold === false && <Badge tone="info">Available</Badge>}
      {r.is_sold == null && <span className="text-label text-fg-muted">-</span>}
    </td>
  ),
}
const colVessel: ColDef = {
  key: 'vessel', label: 'Vessel',
  render: r => <td className={SEC}>{r.vessel_name ?? dash}</td>,
}
const colDepartureDate: ColDef = {
  key: 'departure', label: 'Departure',
  render: r => <td className={MUTED}>{r.departure_date ?? '-'}</td>,
}
const colServiceScope: ColDef = {
  key: 'scope', label: 'Service Lane',
  render: r => {
    if (!r.service_scope) return <td className={MUTED}>-</td>
    return (
      <td className={TD}>
        <Badge tone={SCOPE_TONE[r.service_scope] ?? 'neutral'}>{r.service_scope}</Badge>
      </td>
    )
  },
}

// NAC-specific columns
const colClient: ColDef = {
  key: 'client', label: 'Customer',
  render: r => <td className={cn(TD, 'font-semibold text-fg')}>{r.client_name ?? dash}</td>,
}

const colEmployee: ColDef = {
  key: 'employee', label: 'Salesperson',
  render: r => <td className={SEC}>{r.employee_name ?? dash}</td>,
}

// Special-specific columns
const colCommodityName: ColDef = {
  key: 'commodityName', label: 'Commodity',
  render: r => <td className={cn(TD, 'font-semibold text-fg')}>{r.commodity_name ?? dash}</td>,
}
const colCommodityType: ColDef = {
  key: 'commodityType', label: 'Commodity Type',
  render: r => <td className={SEC}>{r.commodity_type ?? dash}</td>,
}

// Columns per rate type
const COLUMNS_BY_TYPE: Record<SourceFilter, ColDef[]> = {
  all:           [colId, colType, colServiceScope, colLiner, colRoute, colContainer, colRate, colCurrency, colTradeLane, colValidFrom, colValidTo],
  Contracted:    [colId, colServiceScope, colLiner, colTradeLane, colContainer, colRate, colCurrency, colValidFrom, colValidTo],
  FAK:           [colId, colServiceScope, colLiner, colTradeLane, colContainer, colRate, colCurrency, colValidFrom, colValidTo],
  Spot:          [colId, colServiceScope, colLiner, colTradeLane, colContainer, colRate, colCurrency, colVessel, colDepartureDate, colValidFrom, colValidTo, colSoldStatus],
  'Tariff Rate': [colId, colServiceScope, colLiner, colTradeLane, colContainer, colRate, colCurrency, colValidFrom, colValidTo],
  NAC:           [colId, colServiceScope, colClient, colEmployee, colOrigin, colDestination, colTradeLane, colRate, colCurrency, colValidFrom, colValidTo],
  Special:       [colId, colServiceScope, colCommodityName, colCommodityType, colRate, colCurrency, colValidFrom, colValidTo],
}

/** Icon-only row action with an aria-label and Tooltip. */
function IconAction({ label, icon, onClick }: { label: string; icon: ReactNode; onClick: () => void }) {
  return (
    <Tooltip content={label}>
      <Button size="sm" className="w-7 px-0" icon={icon} aria-label={label} onClick={onClick} />
    </Tooltip>
  )
}

function PreviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2 py-1.5 text-control">
      <span className="text-fg-muted">{label}</span>
      <span className="text-right font-semibold text-fg">{value}</span>
    </div>
  )
}

// Detail fields per rate type (for the view modal)
function detailFields(r: UnifiedRate): [string, string][] {
  const common: [string, string][] = [
    ['Service Lane', r.service_scope ?? '-'],
    ['Rate', r.rate != null ? `$${r.rate.toLocaleString()}` : '-'],
    ['Currency', r.currency],
    ['Valid From', r.valid_from ?? '-'],
    ['Valid To', r.valid_to ?? '-'],
  ]
  switch (r.source_type) {
    case 'Contracted':
    case 'FAK':
      return [
        ['Liner', r.liner_name ?? '-'],
        ['Trade Lane', r.trade_lane ?? '-'],
        ['Container Type', r.container_type ?? '-'],
        ...common,
      ]
    case 'Spot':
      return [
        ['Liner', r.liner_name ?? '-'],
        ['Trade Lane', r.trade_lane ?? '-'],
        ['Container Type', r.container_type ?? '-'],
        ['Vessel', r.vessel_name ?? '-'],
        ['Departure Date', r.departure_date ?? '-'],
        ...common,
        ['Sold', r.is_sold === true ? 'Yes' : r.is_sold === false ? 'No' : '-'],
      ]
    case 'Tariff Rate':
      return [
        ['Liner', r.liner_name ?? '-'],
        ['Trade Lane', r.trade_lane ?? '-'],
        ['Container Type', r.container_type ?? '-'],
        ...common,
      ]
    case 'NAC':
      return [
        ['Customer', r.client_name ?? '-'],
        ['Salesperson', r.employee_name ?? '-'],
        ['Origin', r.origin || '-'],
        ['Destination', r.destination || '-'],
        ['Trade Lane', r.trade_lane ?? '-'],
        ...common,
      ]
    case 'Special':
      return [
        ['Commodity', r.commodity_name ?? '-'],
        ['Commodity Type', r.commodity_type ?? '-'],
        ...common,
      ]
    default:
      return common
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function RateList({ onFlash }: { onFlash: (msg: string) => void }) {
  const { activeRole } = useRole()
  const isRestrictedRole = activeRole === 'CS' || activeRole === 'Sales'

  // ---- Data state ----
  const [rates, setRates] = useState<UnifiedRate[]>([])
  const [loading, setLoading] = useState(false)
  const [loaded, setLoaded] = useState(false)

  const [liners, setLiners] = useState<LinerRecord[]>([])
  const [tradeLanes, setTradeLanes] = useState<TradeLaneRecord[]>([])

  // ---- Filter state ----
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all')
  const [linerFilter, setLinerFilter]   = useState<LinerFilter>('all')
  const [laneFilter, setLaneFilter]     = useState<LaneFilter>('all')
  const [originFilter, setOriginFilter] = useState('')
  const [destFilter, setDestFilter]     = useState('')
  const [containerFilter, setContainerFilter] = useState('')

  // ---- View modal + inline note ----
  const [viewing, setViewing] = useState<UnifiedRate | null>(null)
  const [remarkFocused, setRemarkFocused] = useState(false)
  const [remarkText, setRemarkText] = useState('')
  const [remarkSaving, setRemarkSaving] = useState(false)
  // In-flight guards: the save buttons stay enabled while saving (disabling the focused button would drop focus out of the dialog)
  const remarkSavingRef = useRef(false)
  const remarkRef = useRef<HTMLTextAreaElement>(null)

  // Auto-focus the remark textarea when opened via note icon
  useEffect(() => {
    if (remarkFocused && remarkRef.current) {
      remarkRef.current.focus()
      remarkRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [remarkFocused, viewing])

  const openNote = (r: UnifiedRate) => {
    setViewing(r)
    setRemarkText(r.remark ?? '')
    setRemarkFocused(true)
  }

  const loadRates = () => {
    setLoading(true)
    apiFetchAllRates()
      .then(data => { setRates(data); setLoaded(true) })
      .catch(err => { console.error('[RateList] apiFetchAllRates failed:', err); setLoaded(true) })
      .finally(() => setLoading(false))
  }

  const handleRemarkSave = () => {
    if (!viewing || remarkSavingRef.current) return
    remarkSavingRef.current = true
    setRemarkSaving(true)
    apiUpdateRate(viewing.id, { remark: remarkText.trim() || null })
      .then(() => {
        setViewing(null)
        setRemarkFocused(false)
        loadRates()
      })
      .catch(() => onFlash('Failed to save remark'))
      .finally(() => { remarkSavingRef.current = false; setRemarkSaving(false) })
  }

  // ---- Edit modal ----
  const [editing, setEditing] = useState<UnifiedRate | null>(null)
  const [editForm, setEditForm] = useState<Record<string, unknown>>({})
  const [saving, setSaving] = useState(false)
  const savingRef = useRef(false)

  const openEdit = (r: UnifiedRate) => {
    setEditing(r)
    setEditForm({
      rate: r.rate ?? '',
      currency: r.currency ?? 'USD',
      valid_from: r.valid_from ?? '',
      valid_to: r.valid_to ?? '',
      remark: r.remark ?? '',
      container_type: r.container_type ?? '',
      is_sold: r.is_sold ?? false,
      origin: r.origin ?? '',
      destination: r.destination ?? '',
      departure_date: r.departure_date ?? '',
    })
  }

  const ef = (key: string) => editForm[key] as string
  const setEf = (key: string, val: unknown) => setEditForm(p => ({ ...p, [key]: val }))

  const handleSave = () => {
    if (!editing || savingRef.current) return
    savingRef.current = true
    setSaving(true)
    const payload: Record<string, unknown> = {}
    const t = editing.source_type
    // common
    if (editForm.rate !== '') payload.rate = Number(editForm.rate)
    payload.currency = editForm.currency
    payload.valid_from = editForm.valid_from || null
    payload.valid_to = editForm.valid_to || null
    payload.remark = editForm.remark || null
    // type-specific
    if (['Contracted', 'FAK', 'Spot', 'Tariff Rate'].includes(t)) {
      payload.container_type = editForm.container_type || null
    }
    if (t === 'Spot') {
      payload.is_sold = editForm.is_sold
    }
    if (t === 'Spot') {
      payload.departure_date = editForm.departure_date || null
    }
    if (t === 'NAC') {
      payload.origin = editForm.origin || null
      payload.destination = editForm.destination || null
    }
    apiUpdateRate(editing.id, payload)
      .then(() => { setEditing(null); loadRates() })
      .catch(() => onFlash('Failed to update rate'))
      .finally(() => { savingRef.current = false; setSaving(false) })
  }

  // ---- Fetch reference data on mount ----
  useEffect(() => {
    apiGetLiners().then(setLiners).catch(() => {})
    apiGetTradeLanes().then(setTradeLanes).catch(() => {})
    loadRates()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ---- Filtering ----
  const filtered = useMemo(() => {
    return rates.filter(r => {
      if (isRestrictedRole && !CS_SALES_ALLOWED.includes(r.source_type)) return false
      if (sourceFilter !== 'all' && r.source_type !== sourceFilter) return false
      if (linerFilter !== 'all' && (r.liner_name ?? '') !== linerFilter) return false
      if (laneFilter !== 'all' && (r.trade_lane ?? '') !== laneFilter) return false
      if (originFilter && !r.origin?.toLowerCase().includes(originFilter.toLowerCase())) return false
      if (destFilter && !r.destination?.toLowerCase().includes(destFilter.toLowerCase())) return false
      if (containerFilter && !(r.container_type ?? '').toLowerCase().includes(containerFilter.toLowerCase())) return false
      return true
    })
  }, [rates, sourceFilter, linerFilter, laneFilter, originFilter, destFilter, containerFilter, isRestrictedRole])

  const sourceOptions: Option[] = [{ value: 'all', label: 'All Types' }, ...(isRestrictedRole ? CS_SALES_ALLOWED : SOURCE_OPTIONS).map(s => ({ value: s, label: s }))]
  const linerOptions = useMemo(() => uniqueOptions([{ value: 'all', label: 'All' }, ...liners.map(l => ({ value: l.name, label: linerDisplay(l) }))]), [liners])
  const laneOptions = useMemo(() => uniqueOptions([{ value: 'all', label: 'All' }, ...tradeLanes.map(tl => ({ value: tl.trln_name, label: tl.trln_name }))]), [tradeLanes])

  // ---- Active columns based on selected type ----
  const columns = COLUMNS_BY_TYPE[sourceFilter]
  const colCount = columns.length + 1 // +1 for Actions column

  const closeView = () => setViewing(null)
  const closeEdit = () => setEditing(null)

  return (
    <div className="mx-auto max-w-[1200px] p-6">
      <div className="mb-4 flex items-center gap-2">
        <DollarSign size={18} aria-hidden="true" className="text-primary" />
        <h2 className="m-0 text-title font-bold text-fg">Rates</h2>
        <span className="ml-2 text-label text-fg-muted">
          View, filter and manage all freight rates across all rate tables
        </span>
        <Button
          variant="primary"
          className="ml-auto"
          icon={<RefreshCw size={14} aria-hidden="true" />}
          isPending={loading}
          onClick={() => { setLoaded(false); loadRates() }}
        >
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <div className="mb-4 rounded-card border border-line-soft bg-surface p-4">
        <div className="grid grid-cols-6 gap-3">
          <Field label="By Rate Type">
            {ids => <Select {...ids} value={sourceFilter} onChange={v => setSourceFilter(v as SourceFilter)} options={sourceOptions} />}
          </Field>
          <Field label="By Liner">
            {ids => <Select {...ids} value={linerFilter} onChange={setLinerFilter} options={linerOptions} />}
          </Field>
          <Field label="By Trade Lane">
            {ids => <Select {...ids} value={laneFilter} onChange={setLaneFilter} options={laneOptions} />}
          </Field>
          <Field label="Origin">
            {ids => <Input {...ids} value={originFilter} onChange={e => setOriginFilter(e.target.value)} placeholder="Search origin..." />}
          </Field>
          <Field label="Destination">
            {ids => <Input {...ids} value={destFilter} onChange={e => setDestFilter(e.target.value)} placeholder="Search destination..." />}
          </Field>
          <Field label="Container Type">
            {ids => <Input {...ids} value={containerFilter} onChange={e => setContainerFilter(e.target.value)} placeholder="e.g. 40'HC..." />}
          </Field>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-card border border-line-soft bg-surface p-4">
        <div className="mb-3.5">
          <h3 className="m-0 mb-2.5 text-label font-bold uppercase tracking-label text-fg-label">
            {sourceFilter === 'all' ? 'All Rates' : `${sourceFilter} Rates`}
          </h3>
          <div className="text-label text-fg-muted">
            {loaded
              ? `Showing ${filtered.length} of ${rates.length}`
              : loading ? 'Loading...' : 'Click Refresh to load rates'}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-control">
            <thead>
              <tr>
                {columns.map(col => (
                  <th key={col.key} className={TH}>{col.label}</th>
                ))}
                <th className={TH}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && !loaded ? (
                <tr>
                  <td colSpan={colCount} className="p-0">
                    <LoadingState label="Loading rates from database..." />
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={colCount} className="p-0">
                    <EmptyState title={loaded ? 'No rates match these filters.' : 'No rates loaded yet.'} />
                  </td>
                </tr>
              ) : (
                filtered.map(r => (
                  <tr key={r.id} className="border-0 border-b border-line-soft">
                    {columns.map(col => (
                      <Fragment key={col.key}>{col.render(r)}</Fragment>
                    ))}
                    <td className={TD}>
                      <div className="flex gap-1.5">
                        <IconAction
                          label="View Details"
                          icon={<Eye size={14} aria-hidden="true" />}
                          onClick={() => { setRemarkFocused(false); setRemarkText(r.remark ?? ''); setViewing(r) }}
                        />
                        <IconAction label="Add Note" icon={<MessageSquarePlus size={14} aria-hidden="true" />} onClick={() => openNote(r)} />
                        {!isRestrictedRole && (
                          <IconAction label="Edit Rate" icon={<Pencil size={14} aria-hidden="true" />} onClick={() => openEdit(r)} />
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* View modal */}
      {viewing && (
        <Modal isOpen onClose={closeView} title={viewing.rate != null ? `$${viewing.rate.toLocaleString()}` : 'No rate'}>
          <div className="flex items-center gap-2">
            <span className="font-mono text-label text-fg-muted">{viewing.id}</span>
            <TypePill type={viewing.source_type} />
          </div>

          <div className="grid grid-cols-2 gap-x-4">
            {detailFields(viewing).map(([k, v]) => <PreviewRow key={k} label={k} value={v} />)}
          </div>

          {/* Existing remark display */}
          {viewing.remark && !remarkFocused && (
            <div className="rounded-card border border-info-line bg-info-bg px-2.5 py-2 text-control">
              <h3 className="m-0 mb-1 text-label font-bold uppercase tracking-label text-fg-muted">Remark</h3>
              <div className="text-fg-label">{viewing.remark}</div>
            </div>
          )}

          {/* Add / Edit Note section */}
          <div className="flex flex-col gap-2 border-0 border-t border-line-soft pt-3.5">
            <Field label={viewing.remark ? 'Edit Note' : 'Add Note'}>
              {ids => (
                <Textarea
                  {...ids}
                  ref={remarkRef}
                  className="resize-y"
                  placeholder="Write a note..."
                  value={remarkText}
                  onChange={e => setRemarkText(e.target.value)}
                />
              )}
            </Field>
            <div className="flex justify-end">
              <Button
                variant="primary"
                aria-busy={remarkSaving || undefined}
                icon={remarkSaving ? <Loader2 size={14} aria-hidden="true" className="animate-spin" /> : <Send size={14} aria-hidden="true" />}
                disabled={remarkText.trim() === (viewing.remark ?? '')}
                onClick={handleRemarkSave}
              >
                Save Note
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Edit modal - Procurement/Admin only */}
      {editing && !isRestrictedRole && (
        <Modal
          isOpen
          onClose={closeEdit}
          title="Edit Rate"
          isDismissable={!saving}
          footer={
            <>
              <Button disabled={saving} onClick={closeEdit}>Cancel</Button>
              {/* Not disabled while saving: disabling the focused button would drop focus out of the dialog.
                  handleSave's in-flight guard ignores repeat presses. */}
              <Button
                variant="primary"
                aria-busy={saving || undefined}
                icon={saving ? <Loader2 size={14} aria-hidden="true" className="animate-spin" /> : <Save size={14} aria-hidden="true" />}
                onClick={handleSave}
              >
                Save
              </Button>
            </>
          }
        >
          <div className="flex items-center gap-2">
            <span className="font-mono text-label text-fg-muted">{editing.id}</span>
            <TypePill type={editing.source_type} />
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-3">
            <Field label="Rate" required>
              {ids => (
                <NumberInput
                  {...ids}
                  min={0}
                  value={ef('rate')}
                  onChange={e => setEf('rate', e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="e.g. 2450.00"
                />
              )}
            </Field>
            <Field label="Currency">
              {ids => <Input {...ids} value={ef('currency')} onChange={e => setEf('currency', e.target.value)} placeholder="USD" />}
            </Field>

            {/* Container Type - Contracted/FAK/Spot/Tariff Rate */}
            {['Contracted', 'FAK', 'Spot', 'Tariff Rate'].includes(editing.source_type) && (
              <Field label="Container Type">
                {ids => <Input {...ids} value={ef('container_type')} onChange={e => setEf('container_type', e.target.value)} placeholder="e.g. 40'HC" />}
              </Field>
            )}

            {/* Sold - Spot only */}
            {editing.source_type === 'Spot' && (
              <div className="flex h-8 items-center self-end">
                <Checkbox checked={editForm.is_sold as boolean} onChange={v => setEf('is_sold', v)}>Sold</Checkbox>
              </div>
            )}

            {/* Departure Date - Spot only */}
            {editing.source_type === 'Spot' && (
              <Field label="Departure Date">
                {ids => <DatePicker {...ids} value={ef('departure_date')} onChange={v => setEf('departure_date', v)} />}
              </Field>
            )}

            {/* Origin / Destination - NAC only */}
            {editing.source_type === 'NAC' && (
              <>
                <Field label="Origin">
                  {ids => <Input {...ids} value={ef('origin')} onChange={e => setEf('origin', e.target.value)} />}
                </Field>
                <Field label="Destination">
                  {ids => <Input {...ids} value={ef('destination')} onChange={e => setEf('destination', e.target.value)} />}
                </Field>
              </>
            )}

            {/* Valid From / To */}
            <Field label="Valid From">
              {ids => <DatePicker {...ids} value={ef('valid_from')} onChange={v => setEf('valid_from', v)} />}
            </Field>
            <Field label="Valid To">
              {ids => <DatePicker {...ids} value={ef('valid_to')} onChange={v => setEf('valid_to', v)} />}
            </Field>

            {/* Remark - full width */}
            <Field label="Remark" className="col-span-2">
              {ids => (
                <Textarea
                  {...ids}
                  className="resize-y"
                  value={ef('remark')}
                  onChange={e => setEf('remark', e.target.value)}
                  placeholder="Add a remark..."
                />
              )}
            </Field>
          </div>
        </Modal>
      )}
    </div>
  )
}
