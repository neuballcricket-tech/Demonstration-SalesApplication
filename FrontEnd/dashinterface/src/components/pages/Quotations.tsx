import { useMemo, useState, type ReactNode } from 'react'
import { FileText, Plus, ShieldCheck, Copy, ClipboardCheck, Trash2, CheckCircle2, Lock } from 'lucide-react'
import {
  EMPLOYEES, findCustomer,
  type Quote, type QuoteLine, type QuoteStatus, type QuoteType, type RateType,
  type Customer, type Inquiry,
} from '../../types'
import { useRole } from '../../RoleContext'
import {
  Badge, Button, ComboBox, EmptyState, Field, Input, Modal, NumberInput, Select, Textarea, Tooltip,
  type BadgeProps, type ComboBoxItem, type Option,
} from '../ui'
import { labelClass } from '../ui/controlStyles'
import { cn } from '../../lib/cn'

interface QuotationsProps {
  quotes: Quote[]
  customers: Customer[]
  inquiries: Inquiry[]
  onAddQuote: (q: Omit<Quote, 'id' | 'created_at' | 'status' | 'approval_reason'>) => Quote
  onSetQuoteStatus: (id: string, status: QuoteStatus) => void
  onFlash?: (msg: string) => void
  /** Optional: when set, opens the builder pre-filled (used by chat 'quote X' intent). */
  preFillCustomer?: string
  onPreFillConsumed?: () => void
}

const RATE_TYPES: RateType[] = ['Spot', 'Contractual', 'NAC', 'Volume-based', 'Convoy']
const QUOTE_TYPES: QuoteType[] = ['FCA', 'Domestic Included', 'Drayage', 'DDP']

type Tone = BadgeProps['tone']

const STATUS_TONE: Record<QuoteStatus, Tone> = {
  'Draft':              'neutral',
  'Awaiting Approval':  'warning',
  'Approved':           'info',
  'Sent':               'orange',
  'Confirmed':          'success',
  'Lost':               'danger',
}

const STATUS_FILTER_OPTIONS: Option[] = [
  { value: 'all', label: 'All' },
  ...(['Draft', 'Awaiting Approval', 'Approved', 'Sent', 'Confirmed', 'Lost'] as QuoteStatus[]).map(s => ({ value: s, label: s })),
]
const QUOTE_TYPE_OPTIONS: Option[] = QUOTE_TYPES.map(t => ({ value: t, label: t }))
const RATE_TYPE_OPTIONS: Option[] = RATE_TYPES.map(r => ({ value: r, label: r }))
const EMPLOYEE_OPTIONS: Option[] = EMPLOYEES.map(e => ({ value: String(e.id), label: e.name }))

// Big Schedule stub (Phase 7) - pretend list of shipping lines per route lookup.
const BIG_SCHEDULE_LINES = ['Maersk', 'CMA CGM', 'MSC', 'Hapag-Lloyd', 'ONE', 'Evergreen', 'COSCO', 'OOCL']
const BIG_SCHEDULE_ITEMS: ComboBoxItem[] = BIG_SCHEDULE_LINES.map(l => ({ value: l }))

const CARD = 'rounded-card border border-line-soft bg-surface p-4'
const SECTION_TITLE = 'm-0 mb-2.5 text-label font-bold uppercase tracking-label text-fg-label'
const TH = 'border-0 border-b border-line px-1.5 py-1.5 text-left text-label font-semibold uppercase tracking-label text-fg-label'
const TD = 'px-1.5 py-1.5 align-middle text-label'
const BUILDER_TH = 'px-1 py-1.5 text-left text-label font-semibold uppercase tracking-label text-fg-label'
const BUILDER_TD = 'px-1 py-1 align-middle'

/** Unique, non-empty customer names for the ComboBox (item values are list keys). */
const uniqueItems = (items: ComboBoxItem[]): ComboBoxItem[] => {
  const seen = new Set<string>()
  return items.filter(item => {
    if (!item.value || seen.has(item.value)) return false
    seen.add(item.value)
    return true
  })
}

/** Role-gated action: a locked action shows a lock icon and keeps its native title (a disabled button cannot show a Tooltip). */
function GatedButton({ allowed, icon, title, variant = 'primary', onClick, children }: {
  allowed: boolean
  icon?: ReactNode
  title?: string
  variant?: 'primary' | 'secondary'
  onClick: () => void
  children: ReactNode
}) {
  return (
    <Button
      size="sm"
      variant={variant}
      disabled={!allowed}
      title={title}
      icon={allowed ? icon : (icon !== undefined ? <Lock size={12} aria-hidden="true" /> : undefined)}
      onClick={onClick}
    >
      {children}
    </Button>
  )
}

export default function Quotations({
  quotes, customers, inquiries, onAddQuote, onSetQuoteStatus, onFlash, preFillCustomer, onPreFillConsumed,
}: QuotationsProps) {
  const { hasPermission } = useRole()
  const canCreate = hasPermission('quote:create')
  const canApprove = hasPermission('quote:approve')
  const canSendQuote = hasPermission('quote:send')
  const canConfirm = hasPermission('quote:confirm')
  const canReject = hasPermission('quote:reject')
  const [statusFilter, setStatusFilter] = useState<QuoteStatus | 'all'>('all')
  const [customerFilter, setCustomerFilter] = useState('')
  const [showBuilder, setShowBuilder] = useState(!!preFillCustomer)
  // Tracks which inquiry triggered the builder (for pre-filling)
  const [builderInquiry, setBuilderInquiry] = useState<Inquiry | null>(null)
  const [sendTarget, setSendTarget] = useState<Quote | null>(null)

  const filtered = useMemo(() => {
    return quotes.filter(q => {
      if (statusFilter !== 'all' && q.status !== statusFilter) return false
      if (customerFilter && !q.customer_name.toLowerCase().includes(customerFilter.toLowerCase())) return false
      return true
    })
  }, [quotes, statusFilter, customerFilter])

  const counts = useMemo(() => {
    const map: Partial<Record<QuoteStatus, number>> = {}
    for (const q of quotes) map[q.status] = (map[q.status] ?? 0) + 1
    return map
  }, [quotes])

  // Inquiries whose rates have been checked and are waiting for a quotation to be drafted
  const readyToQuote = useMemo(() =>
    inquiries.filter(i => i.workflow_stage === 'quotation-prep'),
    [inquiries]
  )

  const empName = (id: number) => EMPLOYEES.find(e => e.id === id)?.name ?? `EMP-${id}`

  const totalLineRevenue = (q: Quote) =>
    q.lines.reduce((s, l) => s + l.base_rate_usd + l.destination_charges_usd, 0)
  const quoteSell = (q: Quote) => Math.round(totalLineRevenue(q) * (1 + q.margin_pct / 100))

  const handleSendClick = (q: Quote) => {
    setSendTarget(q)
  }

  const handleSendComplete = (quoteId: string) => {
    onSetQuoteStatus(quoteId, 'Sent')
    setSendTarget(null)
  }

  return (
    <div className="mx-auto max-w-[1200px] p-6">
      <div className="mb-4 flex items-center gap-2">
        <FileText size={18} aria-hidden="true" className="text-primary" />
        <h2 className="m-0 text-title font-bold text-fg">Quotations</h2>
        <span className="ml-2 text-label text-fg-muted">
          {quotes.length} quotes · {counts['Awaiting Approval'] ?? 0} pending approval · {counts['Confirmed'] ?? 0} confirmed
        </span>
        <Button
          variant="primary"
          className="ml-auto"
          onClick={() => canCreate && setShowBuilder(true)}
          disabled={!canCreate}
          title={canCreate ? 'Create a new quotation' : `Restricted - requires Sales role`}
          icon={canCreate ? <Plus size={14} aria-hidden="true" /> : <Lock size={12} aria-hidden="true" />}
        >
          New Quote
        </Button>
      </div>

      {/* Ready to Quote - inquiries at quotation-prep stage */}
      {readyToQuote.length > 0 && (
        <div className={cn(CARD, 'mb-4')}>
          <div className="mb-3.5">
            <h3 className={SECTION_TITLE}>Ready to Quote</h3>
            <div className="text-label text-fg-muted">{readyToQuote.length} {readyToQuote.length === 1 ? 'inquiry' : 'inquiries'} awaiting quotation</div>
          </div>
          <div className="flex flex-col gap-2">
            {readyToQuote.map(inq => {
              const cust = findCustomer(inq.customer_name, customers)
              const cont = inq.containers?.[0]
              return (
                <div key={inq.id} className="flex flex-wrap items-center gap-3 rounded-card border border-line-soft bg-canvas px-3.5 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <span className="font-mono text-label text-fg-muted">{inq.id}</span>
                      <span className="text-control font-bold text-fg">{inq.customer_name}</span>
                      {cust && <Badge tone="info">{cust.tier}</Badge>}
                    </div>
                    <div className="text-label text-fg-label">
                      {inq.origin} → {inq.destination}
                      {cont && <> · {cont.quantity}× {cont.containerType}</>}
                      {inq.cargo_ready_date && <> · CRD: {inq.cargo_ready_date}</>}
                    </div>
                  </div>
                  <GatedButton
                    allowed={canCreate}
                    icon={<FileText size={14} aria-hidden="true" />}
                    title={canCreate ? 'Generate quotation for this inquiry' : 'Restricted - requires Sales role'}
                    onClick={() => {
                      if (!canCreate) return
                      setBuilderInquiry(inq)
                      setShowBuilder(true)
                    }}
                  >
                    Generate Quote
                  </GatedButton>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className={cn(CARD, 'mb-4')}>
        <div className="grid grid-cols-2 gap-3">
          <Field label="By Customer">
            {ids => <Input {...ids} value={customerFilter} onChange={e => setCustomerFilter(e.target.value)} placeholder="Search customer name..." />}
          </Field>
          <Field label="By Status">
            {ids => <Select {...ids} value={statusFilter} onChange={v => setStatusFilter(v as QuoteStatus | 'all')} options={STATUS_FILTER_OPTIONS} />}
          </Field>
        </div>
      </div>

      {/* Quote list */}
      <div className={CARD}>
        <div className="mb-3.5">
          <h3 className={SECTION_TITLE}>Quotes</h3>
          <div className="text-label text-fg-muted">Showing {filtered.length} of {quotes.length}</div>
        </div>

        <div className="flex flex-col gap-2.5">
          {filtered.map(q => {
            const cust = findCustomer(q.customer_name, customers)
            const sell = quoteSell(q)
            const cost = totalLineRevenue(q)
            return (
              <div key={q.id} className="rounded-card border border-line-soft bg-surface px-4 py-3.5">
                <div className="mb-2.5 flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <span className="font-mono text-label text-fg-muted">{q.id}</span>
                      <span className="text-body font-bold text-fg">{q.customer_name}</span>
                      {cust && <Badge tone="neutral">{cust.tier}</Badge>}
                      <Badge tone={STATUS_TONE[q.status]}>{q.status}</Badge>
                      <Badge tone="info">{q.quote_type}</Badge>
                    </div>
                    <div className="text-label text-fg-label">
                      {q.origin} → {q.destination} · {q.lines.length} option{q.lines.length === 1 ? '' : 's'} · margin {q.margin_pct}%
                      {q.inquiry_id && <> · linked to <span className="font-mono">{q.inquiry_id}</span></>}
                    </div>
                    {q.approval_reason && (
                      <div className="mt-1 text-label font-semibold text-warning">
                        ⚠ Awaiting approval - {q.approval_reason}
                      </div>
                    )}
                  </div>
                  <div className="whitespace-nowrap text-right">
                    <div className="text-title font-extrabold text-fg">${sell.toLocaleString()}</div>
                    <div className="text-label text-fg-muted">cost ${cost.toLocaleString()} + {q.margin_pct}%</div>
                    <div className="mt-0.5 text-label text-fg-muted">{empName(q.created_by)} · {q.created_at}</div>
                  </div>
                </div>

                {/* Rate lines table */}
                <div className="overflow-x-auto border-0 border-t border-line-soft pt-2">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr>
                        <th className={TH}>Line</th>
                        <th className={TH}>Rate Type</th>
                        <th className={TH}>Base</th>
                        <th className={TH}>Transit</th>
                        <th className={TH}>Free Time</th>
                        <th className={TH}>Transship</th>
                        <th className={TH}>Dest. Chg</th>
                      </tr>
                    </thead>
                    <tbody>
                      {q.lines.map(l => (
                        <tr key={l.id} className="border-0 border-b border-line-soft">
                          <td className={cn(TD, 'font-semibold text-fg')}>{l.shipping_line}</td>
                          <td className={TD}><Badge tone="neutral">{l.rate_type}</Badge></td>
                          <td className={cn(TD, 'text-fg-label')}>${l.base_rate_usd}</td>
                          <td className={cn(TD, 'text-fg-muted')}>{l.transit_days}d</td>
                          <td className={cn(TD, 'text-fg-muted')}>{l.free_time_days}d</td>
                          <td className={cn(TD, 'text-fg-muted')}>{l.transshipment_points}</td>
                          <td className={cn(TD, 'text-fg-label')}>${l.destination_charges_usd}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Action row - status transitions (role-gated) */}
                <div className="mt-2.5 flex flex-wrap gap-1.5 empty:hidden">
                  {q.status === 'Awaiting Approval' && (
                    <>
                      <GatedButton
                        allowed={canApprove}
                        icon={<ShieldCheck size={14} aria-hidden="true" />}
                        title={canApprove ? 'Approve this quote' : 'Restricted - requires Finance role'}
                        onClick={() => canApprove && onSetQuoteStatus(q.id, 'Approved')}
                      >
                        Approve
                      </GatedButton>
                      <GatedButton
                        allowed={canReject}
                        variant="secondary"
                        title={canReject ? 'Reject this quote' : 'Restricted - requires Finance role'}
                        onClick={() => canReject && onSetQuoteStatus(q.id, 'Lost')}
                      >
                        Reject
                      </GatedButton>
                    </>
                  )}
                  {(q.status === 'Draft' || q.status === 'Approved') && (
                    <GatedButton
                      allowed={canSendQuote}
                      icon={<Copy size={14} aria-hidden="true" />}
                      title={canSendQuote ? 'Copy quotation text and mark as sent' : 'Restricted - requires CS or Sales role'}
                      onClick={() => canSendQuote && handleSendClick(q)}
                    >
                      Copy & Send
                    </GatedButton>
                  )}
                  {q.status === 'Sent' && (
                    <>
                      <GatedButton
                        allowed={canConfirm}
                        icon={<CheckCircle2 size={14} aria-hidden="true" />}
                        title={canConfirm ? 'Mark confirmed' : 'Restricted - requires Sales role'}
                        onClick={() => canConfirm && onSetQuoteStatus(q.id, 'Confirmed')}
                      >
                        Mark Confirmed
                      </GatedButton>
                      <GatedButton
                        allowed={canReject}
                        variant="secondary"
                        onClick={() => canReject && onSetQuoteStatus(q.id, 'Lost')}
                      >
                        Mark Lost
                      </GatedButton>
                    </>
                  )}
                </div>
              </div>
            )
          })}
          {filtered.length === 0 && <EmptyState title="No quotes match these filters." />}
        </div>
      </div>

      {showBuilder && (
        <QuoteBuilderModal
          customers={customers}
          inquiries={inquiries}
          preFillCustomer={builderInquiry?.customer_name ?? preFillCustomer}
          preFillInquiry={builderInquiry ?? undefined}
          onCancel={() => { setShowBuilder(false); setBuilderInquiry(null); onPreFillConsumed?.() }}
          onSave={data => {
            onAddQuote(data)
            setShowBuilder(false)
            setBuilderInquiry(null)
            onPreFillConsumed?.()
          }}
        />
      )}

      {sendTarget && (
        <CopyQuotationModal
          quote={sendTarget}
          customers={customers}
          onCancel={() => setSendTarget(null)}
          onSent={handleSendComplete}
          onFlash={onFlash}
        />
      )}
    </div>
  )
}

// ============= Copy Quotation Modal =============
function CopyQuotationModal({
  quote, customers, onCancel, onSent, onFlash,
}: {
  quote: Quote
  customers: Customer[]
  onCancel: () => void
  onSent: (quoteId: string) => void
  onFlash?: (msg: string) => void
}) {
  const [copied, setCopied] = useState(false)

  const cost = quote.lines.reduce((s, l) => s + l.base_rate_usd + l.destination_charges_usd, 0)
  const sell = Math.round(cost * (1 + quote.margin_pct / 100))
  const cust = customers.find(c => c.name.toLowerCase() === quote.customer_name.toLowerCase())
  const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })

  const quotationText = [
    'FREIGHT QUOTATION',
    '',
    `Quote No:  ${quote.id}`,
    `Date:      ${today}`,
    `To:        ${quote.customer_name}${cust ? ` (${cust.tier})` : ''}`,
    `Service:   ${quote.quote_type}`,
    ...(quote.inquiry_id ? [`Reference: ${quote.inquiry_id}`] : []),
    '',
    `Route: ${quote.origin} → ${quote.destination}`,
    '',
    '─────────────────────────────────────────────',
    'RATE OPTIONS',
    '─────────────────────────────────────────────',
    ...quote.lines.flatMap((l, i) => [
      '',
      `Option ${i + 1}  -  ${l.shipping_line}`,
      `  Rate Type:            ${l.rate_type}`,
      `  Ocean Freight:        USD ${l.base_rate_usd.toLocaleString()}`,
      `  Destination Charges:  USD ${l.destination_charges_usd.toLocaleString()}`,
      `  Transit Time:         ${l.transit_days} days`,
      `  Free Time:            ${l.free_time_days} days`,
      `  Routing:              ${l.transshipment_points}`,
    ]),
    '',
    '─────────────────────────────────────────────',
    `QUOTED TOTAL:  USD ${sell.toLocaleString()}  (incl. ${quote.margin_pct}% margin)`,
    '─────────────────────────────────────────────',
    '',
    'Terms & Conditions:',
    '  • Rates valid for 5 working days from date of issue.',
    '  • Subject to space and equipment availability at time of booking.',
    '  • Subject to carrier surcharges in effect at time of shipment.',
    '  • All charges in USD unless otherwise stated.',
    '',
    'CLSynergy - Commercial Team',
  ].join('\n')

  const handleCopy = () => {
    navigator.clipboard.writeText(quotationText).then(() => {
      setCopied(true)
      onFlash?.('Quotation copied to clipboard')
      setTimeout(() => setCopied(false), 3000)
    }).catch(() => onFlash?.('Could not access clipboard - please copy manually'))
  }

  return (
    <Modal
      isOpen
      onClose={onCancel}
      title="Copy Quotation"
      footer={
        <>
          <Button onClick={onCancel}>Cancel</Button>
          <Button
            onClick={handleCopy}
            icon={copied ? <ClipboardCheck size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
          >
            {copied ? 'Copied!' : 'Copy to Clipboard'}
          </Button>
          <Button variant="primary" icon={<CheckCircle2 size={14} aria-hidden="true" />} onClick={() => onSent(quote.id)}>
            Mark as Sent
          </Button>
        </>
      }
    >
      <p className="m-0 text-label text-fg-muted">
        Copy the quotation below, then share it with {quote.customer_name} via your preferred channel
      </p>

      {/* Quote summary pill */}
      <div className="rounded-card border border-line-soft bg-canvas px-3 py-2 text-label text-fg-label">
        <span className="font-mono">{quote.id}</span>
        {' · '}{quote.origin} → {quote.destination}
        {' · '}{quote.quote_type}
        {' · '}{quote.lines.length} option{quote.lines.length === 1 ? '' : 's'}
        {' · '}<strong className="text-fg">USD {sell.toLocaleString()}</strong>
      </div>

      {/* Generated quotation text: monospace keeps its aligned columns */}
      <Textarea
        readOnly
        aria-label="Quotation text"
        value={quotationText}
        className="min-h-[280px] resize-y bg-canvas font-mono text-label leading-relaxed"
      />
    </Modal>
  )
}

// ============= Quote Builder Modal =============
function QuoteBuilderModal({
  customers, inquiries, preFillCustomer, preFillInquiry, onCancel, onSave,
}: {
  customers: Customer[]
  inquiries: Inquiry[]
  preFillCustomer?: string
  preFillInquiry?: Inquiry
  onCancel: () => void
  onSave: (q: Omit<Quote, 'id' | 'created_at' | 'status' | 'approval_reason'>) => void
}) {
  const [customerName, setCustomerName] = useState(preFillInquiry?.customer_name ?? preFillCustomer ?? '')
  const cust = findCustomer(customerName, customers)
  // Try to pre-fill route from the customer's most recent pending inquiry (fallback when no direct inquiry is provided).
  const linkedInquiry = useMemo(() => {
    if (preFillInquiry) return preFillInquiry
    if (!customerName) return undefined
    return inquiries.find(i => i.customer_name.toLowerCase() === customerName.toLowerCase() && i.status === 'pending')
  }, [customerName, inquiries, preFillInquiry])

  const [origin, setOrigin] = useState(preFillInquiry?.origin ?? linkedInquiry?.origin ?? cust?.location.split(',')[0].trim() ?? 'Colombo')
  const [destination, setDestination] = useState(preFillInquiry?.destination ?? linkedInquiry?.destination ?? '')
  const [quoteType, setQuoteType] = useState<QuoteType>('FCA')
  const [margin, setMargin] = useState<number>(cust?.min_margin_pct ?? 7)
  const [createdBy, setCreatedBy] = useState<number>(1)
  const [lines, setLines] = useState<QuoteLine[]>([
    {
      id: 'tmp-1',
      shipping_line: preFillInquiry?.preferred_liners?.[0] ?? 'Maersk',
      rate_type: 'Contractual',
      base_rate_usd: preFillInquiry?.preferred_rate ?? 0,
      transit_days: 7,
      free_time_days: 14,
      transshipment_points: 'Direct',
      destination_charges_usd: 100,
    },
  ])

  const customerItems = useMemo(() => uniqueItems(customers.map(c => ({ value: c.name }))), [customers])

  const addLine = () => {
    setLines(prev => [...prev, {
      id: `tmp-${prev.length + 1}-${Date.now()}`,
      shipping_line: BIG_SCHEDULE_LINES[prev.length % BIG_SCHEDULE_LINES.length],
      rate_type: 'Contractual',
      base_rate_usd: 0,
      transit_days: 7,
      free_time_days: 14,
      transshipment_points: 'Direct',
      destination_charges_usd: 100,
    }])
  }

  const updateLine = (id: string, patch: Partial<QuoteLine>) => {
    setLines(prev => prev.map(l => l.id === id ? { ...l, ...patch } : l))
  }

  const removeLine = (id: string) => {
    setLines(prev => prev.filter(l => l.id !== id))
  }

  const cost = lines.reduce((s, l) => s + l.base_rate_usd + l.destination_charges_usd, 0)
  const sell = Math.round(cost * (1 + margin / 100))
  const minMargin = cust?.min_margin_pct ?? 7
  const willNeedApproval = !!cust && margin < minMargin

  const canSave = customerName.trim() && origin.trim() && destination.trim() && lines.length > 0 && lines.every(l => l.shipping_line && l.base_rate_usd > 0)

  return (
    <Modal
      isOpen
      onClose={onCancel}
      title="New Quote"
      size="lg"
      footer={
        <>
          <Button onClick={onCancel}>Cancel</Button>
          <Button
            variant="primary"
            onClick={() => {
              if (!canSave) return
              onSave({
                inquiry_id: preFillInquiry?.id ?? linkedInquiry?.id,
                customer_name: customerName.trim(),
                origin: origin.trim(),
                destination: destination.trim(),
                quote_type: quoteType,
                margin_pct: margin,
                created_by: createdBy,
                lines: lines.map((l, i) => ({ ...l, id: `QL-${100 + i}-${Date.now()}` })),
              })
            }}
            disabled={!canSave}
          >
            {willNeedApproval ? 'Submit for Approval' : 'Save Quote'}
          </Button>
        </>
      }
    >
      <p className="m-0 text-label text-fg-muted">
        Build a multi-option quote · auto-routes for approval if margin &lt; customer floor
      </p>

      {/* Customer + route */}
      <div className="grid grid-cols-[1.4fr_1fr_1fr_1fr] gap-x-4 gap-y-3 items-start">
        <div className="flex flex-col gap-1">
          <Field label="Customer">
            {ids => <ComboBox {...ids} value={customerName} onChange={setCustomerName} items={customerItems} placeholder="Customer name" />}
          </Field>
          {cust && (
            <div className="text-label text-fg-muted">
              {cust.tier} · {cust.payment_terms} · floor {cust.min_margin_pct}%
              {cust.blacklisted && <span className="ml-1.5 text-danger">· blacklisted</span>}
              {cust.credit_hold && <span className="ml-1.5 text-warning">· credit hold</span>}
            </div>
          )}
        </div>
        <Field label="Origin">
          {ids => <Input {...ids} value={origin} onChange={e => setOrigin(e.target.value)} />}
        </Field>
        <Field label="Destination">
          {ids => <Input {...ids} value={destination} onChange={e => setDestination(e.target.value)} />}
        </Field>
        <Field label="Quote Type">
          {ids => <Select {...ids} value={quoteType} onChange={v => setQuoteType(v as QuoteType)} options={QUOTE_TYPE_OPTIONS} />}
        </Field>
      </div>

      {/* Big Schedule stub hint (Phase 7.1) */}
      <div className="rounded-control border border-line-soft bg-canvas px-2.5 py-1.5 text-label text-fg-muted">
        📡 Big Schedule lines available for this route: {BIG_SCHEDULE_LINES.join(', ')} (stub data - real integration in Phase 2)
      </div>

      {/* Rate lines */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <span id="qb-rate-options" className={labelClass}>Rate Options ({lines.length})</span>
          <Button size="sm" icon={<Plus size={14} aria-hidden="true" />} onClick={addLine}>Add line</Button>
        </div>
        <div className="-mx-1 overflow-x-auto">
          <table aria-labelledby="qb-rate-options" className="w-full border-collapse">
            <thead>
              <tr>
                <th className={BUILDER_TH}>Line</th>
                <th className={BUILDER_TH}>Type</th>
                <th className={BUILDER_TH}>Base $</th>
                <th className={BUILDER_TH}>Transit</th>
                <th className={BUILDER_TH}>Free</th>
                <th className={BUILDER_TH}>Via</th>
                <th className={BUILDER_TH}>Dest $</th>
                <th className={BUILDER_TH}><span className="sr-only">Remove</span></th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l, i) => (
                <tr key={l.id}>
                  <td className={BUILDER_TD}>
                    <ComboBox
                      aria-label={`Line ${i + 1} shipping line`}
                      className="w-[140px]"
                      value={l.shipping_line}
                      onChange={v => updateLine(l.id, { shipping_line: v })}
                      items={BIG_SCHEDULE_ITEMS}
                    />
                  </td>
                  <td className={BUILDER_TD}>
                    <Select
                      aria-label={`Line ${i + 1} rate type`}
                      className="w-[136px]"
                      value={l.rate_type}
                      onChange={v => updateLine(l.id, { rate_type: v as RateType })}
                      options={RATE_TYPE_OPTIONS}
                    />
                  </td>
                  <td className={BUILDER_TD}>
                    <NumberInput aria-label={`Line ${i + 1} base rate USD`} className="w-[88px]" value={l.base_rate_usd} onChange={e => updateLine(l.id, { base_rate_usd: Number(e.target.value) })} />
                  </td>
                  <td className={BUILDER_TD}>
                    <NumberInput aria-label={`Line ${i + 1} transit days`} className="w-16" value={l.transit_days} onChange={e => updateLine(l.id, { transit_days: Number(e.target.value) })} />
                  </td>
                  <td className={BUILDER_TD}>
                    <NumberInput aria-label={`Line ${i + 1} free time days`} className="w-16" value={l.free_time_days} onChange={e => updateLine(l.id, { free_time_days: Number(e.target.value) })} />
                  </td>
                  <td className={BUILDER_TD}>
                    <Input aria-label={`Line ${i + 1} transshipment via`} className="w-[110px]" value={l.transshipment_points} onChange={e => updateLine(l.id, { transshipment_points: e.target.value })} />
                  </td>
                  <td className={BUILDER_TD}>
                    <NumberInput aria-label={`Line ${i + 1} destination charges USD`} className="w-[88px]" value={l.destination_charges_usd} onChange={e => updateLine(l.id, { destination_charges_usd: Number(e.target.value) })} />
                  </td>
                  <td className={BUILDER_TD}>
                    {lines.length === 1 ? (
                      <Button className="w-8 px-0" icon={<Trash2 size={14} aria-hidden="true" />} aria-label={`Remove line ${i + 1}`} title={`Remove line ${i + 1}`} disabled />
                    ) : (
                      <Tooltip content={`Remove line ${i + 1}`}>
                        <Button className="w-8 px-0 text-danger" icon={<Trash2 size={14} aria-hidden="true" />} aria-label={`Remove line ${i + 1}`} onClick={() => removeLine(l.id)} />
                      </Tooltip>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Margin + employee + summary */}
      <div className="grid grid-cols-[1fr_1fr_1.2fr] items-end gap-x-4">
        <Field label="Margin %">
          {ids => <NumberInput {...ids} value={margin} onChange={e => setMargin(Number(e.target.value))} />}
        </Field>
        <Field label="Created by">
          {ids => <Select {...ids} value={String(createdBy)} onChange={v => setCreatedBy(Number(v))} options={EMPLOYEE_OPTIONS} />}
        </Field>
        <div className="rounded-card border border-line-soft bg-canvas px-3.5 py-2.5">
          <div className="text-label uppercase tracking-label text-fg-muted">Quote total</div>
          <div className="text-title font-extrabold text-fg">${sell.toLocaleString()}</div>
          <div className="text-label text-fg-muted">cost ${cost.toLocaleString()} + {margin}%</div>
        </div>
      </div>

      {/* Approval banner if margin under floor */}
      {willNeedApproval && (
        <div className="rounded-card border border-warning-line bg-warning-bg px-3.5 py-2.5 text-control font-semibold text-warning-fg">
          ⚠ This quote will be flagged Awaiting Approval - margin {margin}% is below {cust!.name}'s floor of {minMargin}%.
        </div>
      )}
    </Modal>
  )
}
