import { useMemo, useState, useRef, useEffect, type ReactNode } from 'react'
import { Eye, CheckCircle2, MessageSquarePlus, X, Edit3, Send, Trash2, Check, ListChecks, Loader2 } from 'lucide-react'
import {
  EMPLOYEES, SBUS, INQUIRY_PRIORITIES, COMMODITY_TYPES, CONTAINER_TYPES, CONTAINER_TYPE_LABELS, WORKFLOW_STAGES, stageRoleLabel, stageRoleColor, findCustomer,
  type Inquiry, type InquiryStatus, type Followup, type Customer, type SBU, type CustomerTier,
  type Quote, type QuoteStatus, type WorkflowStage, type InquiryPriority, type ContainerLine,
  type LinerRecord, linerDisplay,
} from '../../types'
import { apiGetLiners } from '../../api'
import { useRole } from '../../RoleContext'
import CustomerEditModal from '../shared/CustomerEditModal'
import {
  Badge, Button, ComboBox, DatePicker, EmptyState, Field, Input, Modal, NumberInput, Select, Textarea, Tooltip,
  type BadgeProps, type ComboBoxItem, type Option,
} from '../ui'
import { cn } from '../../lib/cn'

interface InquiryListProps {
  inquiries: Inquiry[]
  followups: Followup[]
  customers: Customer[]
  quotes: Quote[]
  onCompleteById: (id: string) => void
  onAdvanceWorkflow: (inquiryId: string, nextStage: WorkflowStage, skipApi?: boolean) => void
  onUpdateCustomer: (customerName: string, patch: Partial<Omit<Customer, 'id'>>) => void
  onAddFollowup: (customerName: string, note: string, completionFlag: boolean, employeeId?: number) => void
  onFlash: (msg: string) => void
  onPatchInquiry: (
    inq_id: number,
    data: { sbu?: string; origin?: string; incoterm?: string; cargo_ready_date?: string; priority?: string; preferred_liners?: string; preferred_rate?: number; service_mode?: 'DOOR_TO_DOOR' | 'PORT_TO_PORT' | 'PORT_TO_DOOR' | 'DOOR_TO_PORT' },
    commodityPatches?: Array<{ com_id: number; data: { com_type?: string; hs_code?: string; weight?: number } }>,
    containerPatches?: Array<{ cont_id: number; data: { container_type?: string; temperature?: number; qty?: number; destination?: string; address?: string; zip_code?: string; is_fully_loaded?: boolean; free_time?: string } }>
  ) => Promise<void>
  onDeleteInquiry: (inq_id: number) => void
}

type Tone = BadgeProps['tone']

const QUOTE_STATUS_TONE: Record<QuoteStatus, Tone> = {
  'Draft':              'neutral',
  'Awaiting Approval':  'warning',
  'Approved':           'info',
  'Sent':               'orange',
  'Confirmed':          'success',
  'Lost':               'danger',
}

type StatusFilter = 'all' | InquiryStatus
type SBUFilter = 'all' | SBU
type PriorityFilter = 'all' | InquiryPriority

const TIER_TONE: Record<CustomerTier, Tone> = {
  'Key Account': 'info',
  'Regular':     'neutral',
  'Walk-in':     'orange',
}

const PRIORITY_TONE: Record<InquiryPriority, Tone> = {
  'Low':    'neutral',
  'Medium': 'info',
  'High':   'warning',
  'Urgent': 'danger',
}

const STATUS_FILTER_OPTIONS: Option[] = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'completed', label: 'Completed' },
]
const PRIORITY_FILTER_OPTIONS: Option[] = [{ value: 'all', label: 'All' }, ...INQUIRY_PRIORITIES.map(p => ({ value: p, label: p }))]
const SBU_FILTER_OPTIONS: Option[] = [{ value: 'all', label: 'All' }, ...SBUS.map(s => ({ value: s, label: s }))]
const EMPLOYEE_FILTER_OPTIONS: Option[] = [{ value: 'all', label: 'All' }, ...EMPLOYEES.map(emp => ({ value: String(emp.id), label: emp.name }))]

// Edit form: the empty choice stays selectable, as with the old native selects
const SBU_EDIT_OPTIONS: Option[] = [{ value: '', label: '- select -' }, ...SBUS.map(s => ({ value: s, label: s }))]
const PRIORITY_EDIT_OPTIONS: Option[] = [{ value: '', label: '- select -' }, ...INQUIRY_PRIORITIES.map(p => ({ value: p, label: p }))]
const DELIVERY_TYPE_OPTIONS: Option[] = [
  { value: 'port-to-port', label: 'Port to Port' },
  { value: 'door-to-door', label: 'Door to Door' },
  { value: 'port-to-door', label: 'Port to Door' },
  { value: 'door-to-port', label: 'Door to Port' },
]
const COMMODITY_TYPE_OPTIONS: Option[] = COMMODITY_TYPES.map(t => ({ value: t, label: t }))
const CONTAINER_TYPE_OPTIONS: Option[] = CONTAINER_TYPES.map(t => ({ value: t, label: CONTAINER_TYPE_LABELS[t] }))
const LOAD_TYPE_OPTIONS: Option[] = [{ value: 'fcl', label: 'FCL' }, { value: 'lcl', label: 'LCL' }]

const TH = 'border-0 border-b border-line px-2 py-2 text-left align-bottom text-label font-semibold uppercase tracking-label text-fg-label'
const TD = 'px-2 py-3 align-middle'
const TD_SMALL = 'px-2 py-3 align-middle text-label text-fg-label'
const SECTION_HEAD = 'mb-2 text-label font-bold uppercase tracking-label text-fg-muted'

const uniqueItems = (items: ComboBoxItem[]): ComboBoxItem[] => {
  const seen = new Set<string>()
  return items.filter(item => {
    if (!item.value || seen.has(item.value)) return false
    seen.add(item.value)
    return true
  })
}

/** Icon-only row action. A disabled button cannot be hovered or focused, so it keeps a native title instead of the Tooltip. */
function IconAction({ label, icon, disabled, onClick, className }: { label: string; icon: ReactNode; disabled?: boolean; onClick: () => void; className?: string }) {
  const button = (
    <Button size="sm" className={cn('w-7 px-0', className)} icon={icon} aria-label={label} title={disabled ? label : undefined} disabled={disabled} onClick={onClick} />
  )
  return disabled ? button : <Tooltip content={label}>{button}</Tooltip>
}

function Route({ from, to }: { from: ReactNode; to: ReactNode }) {
  return (
    <div className="whitespace-nowrap">
      <span className="text-fg">{from}</span>
      <span className="mx-1.5 text-fg-muted">→</span>
      <span className="text-fg">{to}</span>
    </div>
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

// Reverse-map frontend priority labels → backend enum values for PATCH payload
const BE_PRIORITY_REV: Record<string, string> = {
  Low: 'LOW', Medium: 'MEDIUM', High: 'HIGH', Urgent: 'URGENT',
}

// Frontend container type codes now match backend directly - this map is identity for safety.
const BE_CONTAINER_TYPE_REV: Record<string, string> = {
  '20GP': '20GP', '40GP': '40GP', '40HC': '40HC',
  '20RF': '20RF', '40RF': '40RF',
  '20OT': '20OT', '40OT': '40OT',
  '20FR': '20FR', '40FR': '40FR',
  'TANKER': 'TANKER',
}

type ContainerDraft = {
  com_id?: number
  cont_id?: number
  // Commodity fields - apiPatchCommodity
  com_type: string
  hs_code: string
  weight: string
  // Container fields - apiPatchContainer
  container_type: string
  qty: string
  destination: string
  zip_code: string
  address: string
  is_fully_loaded: boolean
  free_time: string
  temperature: string
}

type EditDraft = {
  origin: string
  sbu: string
  priority: string
  delivery_type: 'door-to-door' | 'port-to-port' | 'port-to-door' | 'door-to-port'
  incoterm: string
  cargo_ready_date: string
  preferred_rate: string
  preferred_liners: string
  containers: ContainerDraft[]
}

export default function InquiryList({ inquiries, followups, customers, quotes, onCompleteById, onUpdateCustomer, onAddFollowup, onFlash, onPatchInquiry, onDeleteInquiry }: InquiryListProps) {
  const { hasPermission, activeEmployee, activeRole } = useRole()
  const isProcurement = activeRole === 'Procurement'
  const canComplete = hasPermission('inquiry:complete')
  const canFollowup = hasPermission('followup:create')
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
  const [followupNote, setFollowupNote] = useState('')
  const [followupFocused, setFollowupFocused] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const followupRef = useRef<HTMLTextAreaElement>(null)
  const [editingInquiry, setEditingInquiry] = useState<Inquiry | null>(null)
  const [editDraft, setEditDraft] = useState<EditDraft | null>(null)
  const [savingEdit, setSavingEdit] = useState(false)
  // In-flight guard: Save stays enabled while saving (disabling the focused button would drop focus out of the dialog)
  const savingEditRef = useRef(false)
  const [linerList, setLinerList] = useState<LinerRecord[]>([])
  useEffect(() => { apiGetLiners().then(setLinerList).catch(() => {}) }, [])
  const linerItems = useMemo(() => uniqueItems(linerList.map(l => ({ value: l.name, description: linerDisplay(l) }))), [linerList])
  // Map inquiry_id → most recent quote linked to it (for the Quote Status column).
  const quoteByInquiry = new Map<string, Quote>()
  for (const q of quotes) {
    if (q.inquiry_id) quoteByInquiry.set(q.inquiry_id, q)
  }
  const [customerFilter, setCustomerFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [employeeFilter, setEmployeeFilter] = useState<number | 'all'>('all')
  const [sbuFilter, setSbuFilter] = useState<SBUFilter>('all')
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('all')
  const [dateFilter, setDateFilter] = useState('')
  const [viewing, setViewing] = useState<Inquiry | null>(null)

  const filtered = useMemo(() => {
    return inquiries.filter(i => {
      if (customerFilter && !i.customer_name.toLowerCase().includes(customerFilter.toLowerCase())) return false
      if (statusFilter !== 'all' && i.status !== statusFilter) return false
      if (employeeFilter !== 'all' && i.employee_id !== employeeFilter) return false
      if (sbuFilter !== 'all' && i.sbu !== sbuFilter) return false
      if (priorityFilter !== 'all' && i.priority !== priorityFilter) return false
      if (dateFilter && !i.created_at.startsWith(dateFilter)) return false
      return true
    })
  }, [inquiries, customerFilter, statusFilter, employeeFilter, sbuFilter, priorityFilter, dateFilter])

  // Procurement view: flatten each container into its own row
  type ProcRow = { inquiry: Inquiry; container: ContainerLine; containerIdx: number }
  const procRows = useMemo<ProcRow[]>(() => {
    if (!isProcurement) return []
    const rows: ProcRow[] = []
    for (const inq of filtered) {
      if (inq.containers && inq.containers.length > 0) {
        inq.containers.forEach((c, ci) => rows.push({ inquiry: inq, container: c, containerIdx: ci }))
      } else {
        // Legacy inquiry without containers array - create a synthetic container row
        rows.push({
          inquiry: inq,
          container: {
            containerType: inq.container_type ?? '20GP',
            quantity: inq.container_qty ?? 1,
            weight: inq.cargo_weight ?? '',
            commodityType: inq.commodity_type ?? 'Miscellaneous manufactured articles - furniture, toys',
            commodityName: '',
            destination: inq.destination,
            isFcl: inq.is_fcl ?? true,
            zipCode: '',
            doorAgents: [],
            freeTime: '',
          },
          containerIdx: 0,
        })
      }
    }
    return rows
  }, [isProcurement, filtered])

  // Auto-focus the follow-up textarea when opened via the follow-up button
  useEffect(() => {
    if (followupFocused && viewing && followupRef.current) {
      followupRef.current.focus()
      followupRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
      setFollowupFocused(false)
    }
  }, [followupFocused, viewing])

  const empName = (id: number) => EMPLOYEES.find(e => e.id === id)?.name ?? `EMP-${id}`

  function openEdit(i: Inquiry) {
    setEditingInquiry(i)
    setEditDraft({
      origin: i.origin ?? '',
      sbu: i.sbu ?? '',
      priority: i.priority ?? '',
      delivery_type: i.delivery_type,
      incoterm: i.incoterm ?? '',
      cargo_ready_date: i.cargo_ready_date ?? '',
      preferred_rate: i.preferred_rate != null ? String(i.preferred_rate) : '',
      preferred_liners: i.preferred_liners?.join(', ') ?? '',
      containers: (i.containers ?? []).map(c => ({
        com_id: c.com_id,
        cont_id: c.cont_id,
        com_type: c.commodityType ?? '',
        hs_code: c.hs_code ?? '',
        weight: c.weight !== '' ? String(c.weight) : '',
        container_type: c.containerType ?? '',
        qty: String(c.quantity ?? 1),
        destination: c.destination ?? '',
        zip_code: c.zipCode ?? '',
        address: c.address ?? '',
        is_fully_loaded: c.isFcl,
        free_time: c.freeTime !== '' ? String(c.freeTime) : '',
        temperature: c.temperature != null ? String(c.temperature) : '',
      })),
    })
  }

  function updateContainerDraft(idx: number, patch: Partial<ContainerDraft>) {
    setEditDraft(d => {
      if (!d) return d
      return { ...d, containers: d.containers.map((c, i) => i === idx ? { ...c, ...patch } : c) }
    })
  }

  async function handleSaveEdit() {
    if (savingEditRef.current) return
    if (!editingInquiry?.inq_id || !editDraft) return

    const commodityPatches = editDraft.containers
      .filter(c => c.com_id != null)
      .map(c => ({
        com_id: c.com_id!,
        data: {
          com_type:  c.com_type  || undefined,
          hs_code:   c.hs_code   || undefined,
          weight:    c.weight    ? (parseFloat(c.weight)  || undefined) : undefined,
        },
      }))

    const containerPatches = editDraft.containers
      .filter(c => c.cont_id != null)
      .map(c => ({
        cont_id: c.cont_id!,
        data: {
          container_type: c.container_type ? (BE_CONTAINER_TYPE_REV[c.container_type] ?? c.container_type) : undefined,
          qty:            c.qty            ? (parseInt(c.qty, 10)     || undefined) : undefined,
          destination:    c.destination    || undefined,
          zip_code:       c.zip_code       || undefined,
          address:        c.address        || undefined,
          is_fully_loaded: c.is_fully_loaded,
          free_time:      c.free_time      || undefined,
          temperature:    c.temperature    ? (parseFloat(c.temperature) || undefined) : undefined,
        },
      }))

    savingEditRef.current = true
    setSavingEdit(true)
    try {
      await onPatchInquiry(
        editingInquiry.inq_id,
        {
          origin:           editDraft.origin           || undefined,
          sbu:              editDraft.sbu              || undefined,
          priority:         editDraft.priority         ? (BE_PRIORITY_REV[editDraft.priority] ?? editDraft.priority) : undefined,
          service_mode:     editDraft.delivery_type === 'door-to-door' ? 'DOOR_TO_DOOR'
            : editDraft.delivery_type === 'port-to-door' ? 'PORT_TO_DOOR'
            : editDraft.delivery_type === 'door-to-port' ? 'DOOR_TO_PORT'
            : 'PORT_TO_PORT',
          incoterm:         editDraft.incoterm         || undefined,
          cargo_ready_date: editDraft.cargo_ready_date || undefined,
          preferred_rate:   editDraft.preferred_rate   ? (parseFloat(editDraft.preferred_rate) || undefined) : undefined,
          preferred_liners: editDraft.preferred_liners || undefined,
        },
        commodityPatches,
        containerPatches,
      )
      // Close only after every patch has been saved
      setEditingInquiry(null)
      setEditDraft(null)
    } catch {
      // App already showed the error; keep the dialog open so the user can retry
    } finally {
      savingEditRef.current = false
      setSavingEdit(false)
    }
  }

  const closeView = () => { setViewing(null); setFollowupNote(''); setFollowupFocused(false) }
  const closeEdit = () => { setEditingInquiry(null); setEditDraft(null) }

  const customerCell = (i: Inquiry) => {
    const cust = findCustomer(i.customer_name, customers)
    return (
      <td className={cn(TD, 'font-semibold text-fg')}>
        <div className="flex flex-wrap items-center gap-1.5">
          <span>{i.customer_name}</span>
          {cust && <Badge tone={TIER_TONE[cust.tier]}>{cust.tier}</Badge>}
          {cust?.blacklisted && <Badge tone="danger">Blacklisted</Badge>}
          {cust?.credit_hold && !cust.blacklisted && <Badge tone="warning">Credit Hold</Badge>}
        </div>
      </td>
    )
  }

  const statusCell = (isPending: boolean) => (
    <td className={TD}>
      <Badge tone={isPending ? 'warning' : 'success'}>{isPending ? 'Pending' : 'Completed'}</Badge>
    </td>
  )

  const quoteCell = (i: Inquiry) => {
    const q = quoteByInquiry.get(i.id)
    return (
      <td className={TD}>
        {q
          ? <span title={`${q.id} · margin ${q.margin_pct}%`}><Badge tone={QUOTE_STATUS_TONE[q.status]}>{q.status}</Badge></span>
          : <span className="whitespace-nowrap text-label text-fg-muted">No quote</span>}
      </td>
    )
  }

  const openFollowup = (i: Inquiry) => { if (canFollowup) { setViewing(i); setFollowupFocused(true) } }

  return (
    <div className="mx-auto max-w-[1400px] p-6">
      <div className="mb-4 flex items-center gap-2">
        <ListChecks size={18} aria-hidden="true" className="text-primary" />
        <h2 className="m-0 text-title font-bold text-fg">Inquiries</h2>
        <span className="ml-2 text-label text-fg-muted">
          View, filter and manage all customer inquiries
        </span>
      </div>

      {/* Filters */}
      <div className="mb-4 rounded-card border border-line-soft bg-surface p-4">
        <div className="grid grid-cols-6 gap-3">
          <Field label="By Customer">
            {ids => (
              <Input
                {...ids}
                value={customerFilter}
                onChange={e => setCustomerFilter(e.target.value)}
                placeholder="Search customer name..."
              />
            )}
          </Field>
          <Field label="By Status">
            {ids => <Select {...ids} value={statusFilter} onChange={v => setStatusFilter(v as StatusFilter)} options={STATUS_FILTER_OPTIONS} />}
          </Field>
          <Field label="By Priority">
            {ids => <Select {...ids} value={priorityFilter} onChange={v => setPriorityFilter(v as PriorityFilter)} options={PRIORITY_FILTER_OPTIONS} />}
          </Field>
          <Field label="By SBU">
            {ids => <Select {...ids} value={sbuFilter} onChange={v => setSbuFilter(v as SBUFilter)} options={SBU_FILTER_OPTIONS} />}
          </Field>
          <Field label="By Salesperson">
            {ids => (
              <Select
                {...ids}
                value={String(employeeFilter)}
                onChange={v => setEmployeeFilter(v === 'all' ? 'all' : Number(v))}
                options={EMPLOYEE_FILTER_OPTIONS}
              />
            )}
          </Field>
          <Field label="By Date">
            {ids => <DatePicker {...ids} value={dateFilter} onChange={setDateFilter} />}
          </Field>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-card border border-line-soft bg-surface p-4">
        <div className="mb-3.5">
          <h3 className="m-0 mb-2.5 text-label font-bold uppercase tracking-label text-fg-label">Inquiries</h3>
          <div className="text-label text-fg-muted">{isProcurement ? `Showing ${procRows.length} container lines from ${filtered.length} inquiries` : `Showing ${filtered.length} of ${inquiries.length}`}</div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-control">
            <thead>
              <tr>
                <th className={TH}>Inquiry ID</th>
                <th className={TH}>Customer</th>
                <th className={TH}>Origin → Destination</th>
                <th className={TH}>Priority</th>
                <th className={TH}>Container</th>
                {isProcurement && <th className={TH}>Commodity</th>}
                {isProcurement && <th className={TH}>Free Time</th>}
                <th className={TH}>SBU</th>
                <th className={TH}>Status</th>
                <th className={TH}>Quote</th>
                <th className={TH}>Salesperson</th>
                <th className={TH}>Cargo Ready Date</th>
                <th className={TH}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isProcurement ? (
                <>
                  {procRows.map((row) => {
                    const i = row.inquiry
                    const c = row.container
                    const isPending = i.status === 'pending'
                    return (
                      <tr key={`${i.id}-${row.containerIdx}`} className="border-0 border-b border-line-soft">
                        <td className={cn(TD, 'font-mono text-label text-fg-muted')}>{i.id}</td>
                        {customerCell(i)}
                        <td className={cn(TD, 'text-fg-label')}>
                          <Route from={i.origin || 'TBD'} to={c.destination || 'TBD'} />
                        </td>
                        <td className={TD}>
                          {i.priority && <Badge tone={PRIORITY_TONE[i.priority]}>{i.priority}</Badge>}
                        </td>
                        <td className={TD_SMALL}>
                          <div className="whitespace-nowrap">{c.quantity}x {c.containerType}</div>
                          <div className="text-fg-muted">{c.isFcl ? 'FCL' : 'LCL'}{c.weight !== '' && c.weight !== 0 ? ` · ${c.weight} kg` : ''}</div>
                        </td>
                        <td className={TD_SMALL}>
                          {c.commodityType}{c.commodityName ? ` - ${c.commodityName}` : ''}
                        </td>
                        <td className={TD_SMALL}>
                          {c.freeTime !== '' && c.freeTime !== 0 ? `${c.freeTime} days` : '-'}
                        </td>
                        <td className={TD_SMALL}>{i.sbu}</td>
                        {statusCell(isPending)}
                        {quoteCell(i)}
                        <td className={cn(TD, 'text-fg-label')}>{empName(i.employee_id)}</td>
                        <td className={cn(TD, 'text-fg-muted')}>{i.created_at}</td>
                        <td className={TD}>
                          <div className="flex gap-1.5">
                            <IconAction label="View" icon={<Eye size={14} aria-hidden="true" />} onClick={() => setViewing(i)} />
                            <IconAction
                              label={canFollowup ? 'Add Follow-up' : 'Restricted'}
                              icon={<MessageSquarePlus size={14} aria-hidden="true" />}
                              disabled={!canFollowup}
                              onClick={() => openFollowup(i)}
                            />
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                  {procRows.length === 0 && (
                    <tr>
                      <td colSpan={20} className="p-0">
                        <EmptyState title="No inquiries match these filters." />
                      </td>
                    </tr>
                  )}
                </>
              ) : (
                <>
              {filtered.map(i => {
                const isPending = i.status === 'pending'
                return (
                  <tr key={i.id} className="border-0 border-b border-line-soft">
                    <td className={cn(TD, 'font-mono text-label text-fg-muted')}>{i.id}</td>
                    {customerCell(i)}
                    <td className={cn(TD, 'text-fg-label')}>
                      {i.containers && i.containers.length > 0
                        ? (() => {
                            const destinations = [...new Set(i.containers!.map(c => c.destination).filter(Boolean))]
                            return destinations.length > 0
                              ? destinations.map((dest, di) => <Route key={di} from={i.origin || 'TBD'} to={dest} />)
                              : <Route from={i.origin || 'TBD'} to={i.destination || 'TBD'} />
                          })()
                        : <Route from={i.origin} to={i.destination} />
                      }
                    </td>
                    <td className={TD}>
                      {i.priority && <Badge tone={PRIORITY_TONE[i.priority]}>{i.priority}</Badge>}
                    </td>
                    <td className={TD_SMALL}>
                      {i.containers && i.containers.length > 0
                        ? i.containers.map((c, ci) => (
                            <div key={ci} className="whitespace-nowrap">{c.quantity}x {c.containerType}{i.containers!.length > 1 && c.destination ? ` → ${c.destination}` : ''}</div>
                          ))
                        : i.container_qty && i.container_type
                          ? `${i.container_qty}x ${i.container_type}`
                          : i.request
                      }
                    </td>
                    <td className={TD_SMALL}>{i.sbu}</td>
                    {statusCell(isPending)}
                    {quoteCell(i)}
                    <td className={cn(TD, 'text-fg-label')}>{empName(i.employee_id)}</td>
                    <td className={cn(TD, 'text-fg-muted')}>{i.created_at}</td>
                    <td className={TD}>
                      {confirmDeleteId === i.id ? (
                        <div className="flex items-center gap-1">
                          <span className="whitespace-nowrap text-label text-danger">Delete?</span>
                          <IconAction
                            label="Confirm delete"
                            icon={<Check size={14} aria-hidden="true" />}
                            className="text-danger"
                            onClick={() => { onDeleteInquiry(i.inq_id!); setConfirmDeleteId(null) }}
                          />
                          <IconAction label="Cancel" icon={<X size={14} aria-hidden="true" />} onClick={() => setConfirmDeleteId(null)} />
                        </div>
                      ) : (
                        <div className="flex gap-1.5">
                          <IconAction label="View" icon={<Eye size={14} aria-hidden="true" />} onClick={() => setViewing(i)} />
                          <IconAction
                            label={canComplete ? 'Mark Complete' : 'Restricted - requires CS or Sales role'}
                            icon={<CheckCircle2 size={14} aria-hidden="true" />}
                            disabled={!isPending || !canComplete}
                            onClick={() => canComplete && onCompleteById(i.id)}
                          />
                          <IconAction
                            label={canFollowup ? 'Add Follow-up' : 'Restricted - requires CS, Sales, or Procurement role'}
                            icon={<MessageSquarePlus size={14} aria-hidden="true" />}
                            disabled={!canFollowup}
                            onClick={() => openFollowup(i)}
                          />
                          <IconAction
                            label={i.inq_id ? 'Edit Inquiry' : 'Edit Inquiry (not saved to backend)'}
                            icon={<Edit3 size={14} aria-hidden="true" />}
                            disabled={!i.inq_id}
                            onClick={() => openEdit(i)}
                          />
                          <IconAction
                            label={i.inq_id ? 'Delete Inquiry' : 'Not saved to backend'}
                            icon={<Trash2 size={14} aria-hidden="true" />}
                            className="text-danger"
                            disabled={!i.inq_id}
                            onClick={() => i.inq_id && setConfirmDeleteId(i.id)}
                          />
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={20} className="p-0">
                    <EmptyState title="No inquiries match these filters." />
                  </td>
                </tr>
              )}
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* View modal */}
      {viewing && (
        <Modal isOpen onClose={closeView} title={viewing.customer_name}>
          <div className="font-mono text-label text-fg-muted">{viewing.id}</div>

          {viewing.inquiry_text && (
            <div className="rounded-card border border-line-soft bg-canvas px-3.5 py-3 text-control leading-normal text-fg-label">
              {viewing.inquiry_text}
            </div>
          )}

          <div className="grid grid-cols-2 gap-x-4">
            {([
              ['Origin', viewing.origin],
              ['SBU', viewing.sbu],
              ['Status', viewing.status],
              ['Priority', viewing.priority ?? 'Not set'],
              ['Delivery Type', viewing.delivery_type === 'door-to-door' ? 'Door to Door' : viewing.delivery_type === 'port-to-door' ? 'Port to Door' : viewing.delivery_type === 'door-to-port' ? 'Door to Port' : 'Port to Port'],
              ['Incoterm', viewing.incoterm ?? 'Not set'],
              ['Cargo Ready Date', viewing.cargo_ready_date ?? viewing.created_at ?? 'Not set'],
              ['Preferred Rate', viewing.preferred_rate != null ? `USD ${viewing.preferred_rate.toLocaleString()}` : 'Not set'],
              ['Preferred Liners', viewing.preferred_liners && viewing.preferred_liners.length > 0 ? viewing.preferred_liners.join(', ') : 'None'],
              ['Salesperson', empName(viewing.employee_id)],
            ] as [string, string][]).map(([k, v]) => <PreviewRow key={k} label={k} value={v} />)}
          </div>

          {/* Containers */}
          {viewing.containers && viewing.containers.length > 0 ? (
            <div>
              <h3 className={cn('m-0', SECTION_HEAD)}>Containers ({viewing.containers.length})</h3>
              <div className="flex flex-col gap-1.5">
                {viewing.containers.map((c, ci) => (
                  <div key={ci} className="rounded-card border border-line-soft bg-canvas px-3 py-2.5 text-control">
                    <div className="mb-1 flex items-center justify-between">
                      <span className="font-bold text-fg">{c.quantity}x {c.containerType}</span>
                      {c.destination && <span className="text-label text-fg-muted">→ {c.destination}</span>}
                    </div>
                    <div className="flex flex-wrap gap-x-4 text-label text-fg-label">
                      <span><strong>Commodity:</strong> {c.commodityType}{c.commodityName ? ` - ${c.commodityName}` : ''}</span>
                      {c.hs_code && <span><strong>HS Code:</strong> {c.hs_code}</span>}
                      {c.weight !== '' && c.weight !== 0 && <span><strong>Weight:</strong> {c.weight} kg</span>}
                      <span><strong>{c.isFcl ? 'FCL' : 'LCL'}</strong></span>
                      {c.zipCode && <span><strong>Zip:</strong> {c.zipCode}</span>}
                      {c.address && <span><strong>Address:</strong> {c.address}</span>}
                      {c.doorAgents && c.doorAgents.length > 0 && <span><strong>Door Agent:</strong> {c.doorAgents.join(', ')}</span>}
                      {c.freeTime !== undefined && c.freeTime !== '' && c.freeTime !== 0 && <span><strong>Free Time:</strong> {c.freeTime} days</span>}
                      {c.temperature != null && <span><strong>Temp:</strong> {c.temperature}°C</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-x-4">
              {([
                ['Destination', viewing.destination],
                ['Commodity', viewing.commodity_type ?? 'Not set'],
                ['Container', viewing.container_qty && viewing.container_type ? `${viewing.container_qty}x ${viewing.container_type}` : 'Not set'],
              ] as [string, string][]).map(([k, v]) => <PreviewRow key={k} label={k} value={v} />)}
            </div>
          )}

          {/* Workflow progress */}
          {viewing.workflow_stage && (() => {
            const stages = WORKFLOW_STAGES
            const currentIdx = stages.findIndex(s => s.id === viewing.workflow_stage)
            const current = stages[currentIdx]
            if (!current) return null
            const roleColor = stageRoleColor(current)
            const isCompleted = viewing.workflow_stage === 'completed'
            return (
              <div className="border-0 border-t border-line-soft pt-3.5">
                <h3 className={cn('m-0', SECTION_HEAD, 'mb-2.5')}>Workflow Progress</h3>

                {/* Segmented stage bar */}
                <div className="mb-2.5 flex gap-0.5">
                  {stages.map((s, idx) => {
                    const done = idx < currentIdx
                    const active = idx === currentIdx
                    const color = stageRoleColor(s)
                    return (
                      <div
                        key={s.id}
                        title={`${s.label} - ${stageRoleLabel(s)}`}
                        className="h-[5px] flex-1 rounded-control bg-line-soft transition-opacity"
                        style={{
                          background: done || active ? color : undefined,
                          opacity: active ? 1 : done ? 0.6 : 0.2,
                        }}
                      />
                    )
                  })}
                </div>

                {/* Current stage callout */}
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className="whitespace-nowrap rounded-control border px-1.5 py-0.5 text-label font-bold tracking-label"
                    style={{ background: roleColor + '18', color: roleColor, borderColor: roleColor + '30' }}
                  >
                    {isCompleted ? `${stages.length} / ${stages.length}` : `Step ${currentIdx + 1} of ${stages.length}`}
                  </span>
                  <span className="text-control font-bold text-fg">
                    {current.label}
                  </span>
                  <span className="ml-auto whitespace-nowrap text-label font-semibold" style={{ color: roleColor }}>
                    {isCompleted ? '✓ Complete' : `Handled by ${stageRoleLabel(current)}`}
                  </span>
                </div>

                {/* Next stage hint */}
                {!isCompleted && stages[currentIdx + 1] && (
                  <div className="mt-1.5 text-label text-fg-muted">
                    Next: <span className="text-fg-label">{stages[currentIdx + 1].label}</span>
                    <span className="ml-1" style={{ color: stageRoleColor(stages[currentIdx + 1]) }}>
                      - {stageRoleLabel(stages[currentIdx + 1])}
                    </span>
                  </div>
                )}
              </div>
            )
          })()}

          {(() => {
            const inquiryFollowups = followups.filter(f => f.inquiry_id === viewing.id || f.customer_name.toLowerCase() === viewing.customer_name.toLowerCase())
            if (inquiryFollowups.length === 0) return null
            return (
              <div>
                <h3 className={cn('m-0', SECTION_HEAD)}>Follow-up History ({inquiryFollowups.length})</h3>
                <div className="flex flex-col gap-1.5">
                  {inquiryFollowups.map(f => (
                    <div
                      key={f.id}
                      className={cn(
                        'rounded-card border px-2.5 py-2 text-control',
                        f.completion_flag ? 'border-success-line bg-success-bg' : 'border-warning-line bg-warning-bg',
                      )}
                    >
                      <div className="mb-1 flex justify-between">
                        <span className="font-semibold text-fg">{empName(f.employee_id)}</span>
                        <span className="text-label text-fg-muted">{f.created_at}</span>
                      </div>
                      <div className="text-fg-label">
                        {f.note}
                        {f.completion_flag && <span className="ml-1.5 text-label text-success">· closed inquiry</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })()}

          {/* Add Follow-up form */}
          {canFollowup && viewing.status === 'pending' && (
            <div className="flex flex-col gap-2 border-0 border-t border-line-soft pt-3.5">
              <Field label="Add Follow-up">
                {ids => (
                  <Textarea
                    {...ids}
                    ref={followupRef}
                    className="resize-y"
                    placeholder="Write a follow-up note..."
                    value={followupNote}
                    onChange={e => setFollowupNote(e.target.value)}
                  />
                )}
              </Field>
              <div className="flex justify-end gap-2">
                <Button
                  variant="primary"
                  icon={<Send size={14} aria-hidden="true" />}
                  disabled={!followupNote.trim()}
                  onClick={() => {
                    onAddFollowup(viewing.customer_name, followupNote.trim(), false, activeEmployee.id)
                    setFollowupNote('')
                    // This button disables once the note clears; move focus first so it stays inside the dialog
                    followupRef.current?.focus()
                  }}
                >
                  Add Note
                </Button>
                <Button
                  icon={<CheckCircle2 size={14} aria-hidden="true" />}
                  className="border-success-line bg-success-bg text-success-fg hover:bg-success-bg"
                  disabled={!followupNote.trim()}
                  onClick={() => {
                    onAddFollowup(viewing.customer_name, followupNote.trim(), true, activeEmployee.id)
                    setFollowupNote('')
                    setViewing({ ...viewing, status: 'completed' })
                    // The follow-up form unmounts; keep focus inside the dialog so Escape still closes it
                    followupRef.current?.closest<HTMLElement>('[role="dialog"]')?.focus()
                  }}
                >
                  Complete & Close
                </Button>
              </div>
            </div>
          )}
        </Modal>
      )}

      {/* Edit inquiry modal */}
      {editingInquiry && editDraft && (
        <Modal
          isOpen
          onClose={closeEdit}
          title="Edit Inquiry"
          isDismissable={!savingEdit}
          footer={
            <>
              <Button disabled={savingEdit} onClick={closeEdit}>Cancel</Button>
              {/* Not disabled while saving: disabling the focused button would drop focus out of the dialog.
                  handleSaveEdit's in-flight guard ignores repeat presses. */}
              <Button
                variant="primary"
                aria-busy={savingEdit || undefined}
                icon={savingEdit ? <Loader2 size={14} aria-hidden="true" className="animate-spin" /> : undefined}
                onClick={handleSaveEdit}
              >
                {savingEdit ? 'Saving…' : 'Save Changes'}
              </Button>
            </>
          }
        >
          <p className="m-0 text-control text-fg-muted">
            <span className="mr-2 font-mono text-label">{editingInquiry.id}</span>
            {editingInquiry.customer_name}
          </p>

          <div className="grid grid-cols-2 gap-x-4 gap-y-3">
            <Field label="Origin">
              {ids => (
                <Input
                  {...ids}
                  value={editDraft.origin}
                  onChange={e => setEditDraft(d => d && ({ ...d, origin: e.target.value }))}
                  placeholder="e.g. Colombo"
                />
              )}
            </Field>
            <Field label="SBU">
              {ids => <Select {...ids} value={editDraft.sbu} onChange={v => setEditDraft(d => d && ({ ...d, sbu: v }))} options={SBU_EDIT_OPTIONS} />}
            </Field>
            <Field label="Priority">
              {ids => <Select {...ids} value={editDraft.priority} onChange={v => setEditDraft(d => d && ({ ...d, priority: v }))} options={PRIORITY_EDIT_OPTIONS} />}
            </Field>
            <Field label="Delivery Type">
              {ids => (
                <Select
                  {...ids}
                  value={editDraft.delivery_type}
                  onChange={v => setEditDraft(d => d && ({ ...d, delivery_type: v as 'door-to-door' | 'port-to-port' | 'port-to-door' | 'door-to-port' }))}
                  options={DELIVERY_TYPE_OPTIONS}
                />
              )}
            </Field>
            <Field label="Incoterm">
              {ids => (
                <Input
                  {...ids}
                  value={editDraft.incoterm}
                  onChange={e => setEditDraft(d => d && ({ ...d, incoterm: e.target.value }))}
                  placeholder="e.g. FOB, CIF, EXW, DDP"
                />
              )}
            </Field>
            <Field label="Cargo Ready Date">
              {ids => <DatePicker {...ids} value={editDraft.cargo_ready_date} onChange={v => setEditDraft(d => d && ({ ...d, cargo_ready_date: v }))} />}
            </Field>
            <Field label="Preferred Rate (USD)">
              {ids => (
                <NumberInput
                  {...ids}
                  value={editDraft.preferred_rate}
                  onChange={e => setEditDraft(d => d && ({ ...d, preferred_rate: e.target.value }))}
                  placeholder="e.g. 1200"
                  min={0}
                />
              )}
            </Field>
            <Field label="Preferred Liners">
              {ids => (
                <ComboBox
                  {...ids}
                  value={editDraft.preferred_liners}
                  onChange={v => setEditDraft(d => d && ({ ...d, preferred_liners: v }))}
                  items={linerItems}
                  placeholder="e.g. MSC, Maersk, CMA CGM"
                />
              )}
            </Field>
          </div>

          {editDraft.containers.length > 0 && (
            <div>
              <h3 className={cn('m-0', SECTION_HEAD)}>Containers ({editDraft.containers.length})</h3>
              <div className="flex flex-col gap-2">
                {editDraft.containers.map((cd, ci) => (
                  <div key={ci} className="rounded-card border border-line-soft bg-canvas px-3.5 py-3">
                    <h4 className="m-0 mb-2.5 text-control font-bold text-fg">Container {ci + 1}</h4>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                      <Field label="Commodity Type">
                        {ids => <Select {...ids} value={cd.com_type} onChange={v => updateContainerDraft(ci, { com_type: v })} options={COMMODITY_TYPE_OPTIONS} placeholder="- select -" />}
                      </Field>
                      <Field label="HS Code">
                        {ids => (
                          <Input
                            {...ids}
                            value={cd.hs_code}
                            onChange={e => updateContainerDraft(ci, { hs_code: e.target.value })}
                            placeholder="e.g. 6205.20"
                          />
                        )}
                      </Field>
                      <Field label="Weight (kg)">
                        {ids => <NumberInput {...ids} value={cd.weight} onChange={e => updateContainerDraft(ci, { weight: e.target.value })} min={0} />}
                      </Field>
                      <Field label="Container Type">
                        {ids => <Select {...ids} value={cd.container_type} onChange={v => updateContainerDraft(ci, { container_type: v })} options={CONTAINER_TYPE_OPTIONS} placeholder="- select -" />}
                      </Field>
                      <Field label="Quantity">
                        {ids => <NumberInput {...ids} value={cd.qty} onChange={e => updateContainerDraft(ci, { qty: e.target.value })} min={1} />}
                      </Field>
                      <Field label="Load Type">
                        {ids => (
                          <Select
                            {...ids}
                            value={cd.is_fully_loaded ? 'fcl' : 'lcl'}
                            onChange={v => updateContainerDraft(ci, { is_fully_loaded: v === 'fcl' })}
                            options={LOAD_TYPE_OPTIONS}
                          />
                        )}
                      </Field>
                      <Field label="Destination">
                        {ids => (
                          <Input
                            {...ids}
                            value={cd.destination}
                            onChange={e => updateContainerDraft(ci, { destination: e.target.value })}
                            placeholder="e.g. Hamburg"
                          />
                        )}
                      </Field>
                      <Field label="Zip Code">
                        {ids => <Input {...ids} value={cd.zip_code} onChange={e => updateContainerDraft(ci, { zip_code: e.target.value })} />}
                      </Field>
                      <Field label="Address">
                        {ids => (
                          <Input
                            {...ids}
                            value={cd.address}
                            onChange={e => updateContainerDraft(ci, { address: e.target.value })}
                            placeholder="Door delivery address"
                          />
                        )}
                      </Field>
                      <Field label="Free Time (days)">
                        {ids => <NumberInput {...ids} value={cd.free_time} onChange={e => updateContainerDraft(ci, { free_time: e.target.value })} min={0} />}
                      </Field>
                      <Field label="Temperature (°C)">
                        {ids => (
                          <NumberInput
                            {...ids}
                            value={cd.temperature}
                            onChange={e => updateContainerDraft(ci, { temperature: e.target.value })}
                            placeholder="Reefer only"
                          />
                        )}
                      </Field>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Modal>
      )}

      {editingCustomer && (
        <CustomerEditModal
          customer={editingCustomer}
          onSave={(name, patch) => { onUpdateCustomer(name, patch); onFlash(`Updated customer ${name}`) }}
          onClose={() => setEditingCustomer(null)}
        />
      )}
    </div>
  )
}
