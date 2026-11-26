import { useState, useEffect, type ReactNode } from 'react'
import { ArrowLeft, Plus, Save, X } from 'lucide-react'
import {
  SBUS, INQUIRY_PRIORITIES, COMMODITY_TYPES, CONTAINER_TYPES, CONTAINER_TYPE_LABELS,
  emptyContainerLine, linerDisplay,
  type Inquiry, type LinerRecord, type ContainerLine,
  type ClientRecord, type ContactPersonRecord,
  type SBU, type DeliveryType,
  type InquiryPriority, type CommodityType, type ContainerType,
} from '../../types'
import { apiGetLiners } from '../../api'
import TagInput from '../shared/TagInput'
import PortCombobox from '../shared/PortCombobox'
import SearchCombobox from '../shared/SearchCombobox'
import { Button, DatePicker, Field, Input, NumberInput, Select, Tooltip, type Option } from '../ui'
import { cn } from '../../lib/cn'

const CHANNELS = ['Email', 'WhatsApp', 'Phone', 'WeChat'] as const
type Channel = typeof CHANNELS[number]

const CHANNEL_OPTIONS: Option[] = CHANNELS.map(c => ({ value: c, label: c }))
const PRIORITY_OPTIONS: Option[] = INQUIRY_PRIORITIES.map(p => ({ value: p, label: p }))
const SBU_OPTIONS: Option[] = SBUS.map(s => ({ value: s, label: s }))
const DELIVERY_OPTIONS: Option[] = [
  { value: 'port-to-port', label: 'Port to Port' },
  { value: 'door-to-door', label: 'Door to Door' },
  { value: 'port-to-door', label: 'Port to Door' },
  { value: 'door-to-port', label: 'Door to Port' },
]
const COMMODITY_OPTIONS: Option[] = COMMODITY_TYPES.map(c => ({ value: c, label: c }))
const CONTAINER_OPTIONS: Option[] = CONTAINER_TYPES.map(c => ({ value: c, label: CONTAINER_TYPE_LABELS[c] }))
const FCL_OPTIONS: Option[] = [{ value: 'FCL', label: 'FCL' }, { value: 'LCL', label: 'LCL' }]

/** A titled form card: navy header bar, then a two-column field grid. */
function Section({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="overflow-hidden rounded-card border border-line-soft bg-surface">
      <div className="flex min-h-9 items-center justify-between bg-primary px-4 py-1">
        <h2 className="m-0 text-label font-bold uppercase tracking-label text-white">{title}</h2>
        {action}
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-3 p-4">{children}</div>
    </section>
  )
}

/** Sub-heading that splits a section's grid. */
function SubHead({ children }: { children: ReactNode }) {
  return (
    <h3 className="col-span-full m-0 mt-2 border-b border-line-soft pb-2 text-label font-bold uppercase tracking-label text-fg-muted">
      {children}
    </h3>
  )
}

interface NewInquiryProps {
  clientList: ClientRecord[]
  contactPersonList: ContactPersonRecord[]
  activeEmployee: { id: number; name: string }
  onCreateInquiry: (data: Omit<Inquiry, 'id' | 'created_at' | 'status' | 'completed_at' | 'followup_note' | 'inquiry_text'>) => Promise<Inquiry>
  onFlash: (msg: string, action?: { label: string; onClick: () => void }) => void
  onGoBack: () => void
}

export default function NewInquiry({ clientList, contactPersonList, activeEmployee, onCreateInquiry, onGoBack }: NewInquiryProps) {
  // Inquiry-level state
  const [niCustomer, setNiCustomer] = useState('')
  const [saving, setSaving] = useState(false)
  const [niOrigin, setNiOrigin] = useState('')
  const [niChannel, setNiChannel] = useState<Channel>('Email')
  const [niSbu, setNiSbu] = useState<SBU>('Ocean Imports')
  const [niDelivery, setNiDelivery] = useState<DeliveryType>('port-to-port')
  const [niPriority, setNiPriority] = useState<InquiryPriority>('Medium')
  const [niIncoterm, setNiIncoterm] = useState('')
  const [niCargoReadyDate, setNiCargoReadyDate] = useState('')
  const [niPreferredRate, setNiPreferredRate] = useState<number | ''>('')
  const [niPreferredLiners, setNiPreferredLiners] = useState<string[]>([])
  const [niRemark, setNiRemark] = useState('')
  const [niContactPerson, setNiContactPerson] = useState('')
  const [niContactDesignation, setNiContactDesignation] = useState('')
  const [niContactChannelId, setNiContactChannelId] = useState('')

  // Multi-container state
  const [containers, setContainers] = useState<ContainerLine[]>([emptyContainerLine()])

  // Reference data — liners fetched locally; clients/contacts come from app-level cache via props
  const [linerList, setLinerList] = useState<LinerRecord[]>([])

  useEffect(() => {
    apiGetLiners().then(setLinerList).catch(() => {})
  }, [])

  const formatLinerLabel = (name: string) => {
    const l = linerList.find(x => x.name === name)
    return l ? linerDisplay(l) : name
  }

  const updateContainer = (idx: number, patch: Partial<ContainerLine>) => {
    setContainers(prev => prev.map((c, i) => i === idx ? { ...c, ...patch } : c))
  }

  const addContainer = () => {
    const first = containers[0]
    setContainers(prev => [...prev, {
      ...emptyContainerLine(),
      commodityType: first?.commodityType ?? 'Miscellaneous manufactured articles — furniture, toys',
      commodityName: first?.commodityName ?? '',
      destination: first?.destination ?? '',
    }])
  }

  const removeContainer = (idx: number) => {
    if (containers.length <= 1) return
    setContainers(prev => prev.filter((_, i) => i !== idx))
  }

  const resetForm = () => {
    setNiCustomer(''); setNiOrigin('')
    setNiChannel('Email'); setNiSbu('Ocean Imports'); setNiDelivery('port-to-port')
    setNiPriority('Medium'); setNiIncoterm(''); setNiCargoReadyDate(''); setNiPreferredRate('')
    setNiPreferredLiners([])
    setNiRemark('')
    setNiContactPerson(''); setNiContactDesignation(''); setNiContactChannelId('')
    setContainers([emptyContainerLine()])
  }

  // Silently detect which backend case to use based on whether names match existing DB records.
  // Case 1: new customer name → new client + new contact
  // Case 2: name matches existing client, contact name not found → existing client + new contact
  // Case 3: both names match → existing client + existing contact
  const matchedCli = clientList.find(
    cl => cl.name.trim().toLowerCase() === niCustomer.trim().toLowerCase()
  ) ?? null
  const matchedCp = matchedCli
    ? (contactPersonList.find(
        cp => cp.cli_id === matchedCli.cli_id &&
              (cp.name ?? '').trim().toLowerCase() === niContactPerson.trim().toLowerCase()
      ) ?? null)
    : null

  const handleSave = async () => {
    const customerName = niCustomer.trim()
    if (!customerName || saving) return
    const firstContainer = containers[0]
    const autoRequest = [
      firstContainer ? `${firstContainer.quantity}x ${firstContainer.containerType}` : '',
      niOrigin.trim() || '',
      firstContainer?.destination.trim() ? `to ${firstContainer.destination.trim()}` : '',
      firstContainer?.commodityName.trim() ? `— ${firstContainer.commodityName.trim()}` : '',
    ].filter(Boolean).join(' ') || `Inquiry from ${customerName}`

    setSaving(true)
    try {
      await onCreateInquiry({
        customer_name: customerName,
        // Passing cli_id / cpid tells App.tsx which endpoint to route to (cases 2 and 3)
        ...(matchedCli ? { cli_id: matchedCli.cli_id } : {}),
        ...(matchedCp  ? { cpid:   matchedCp.cp_id   } : {}),
        request: autoRequest,
        origin: niOrigin.trim(),
        destination: firstContainer?.destination.trim() ?? '',
        delivery_type: niDelivery,
        sbu: niSbu,
        employee_id: activeEmployee.id,
        workflow_stage: 'rate-check',
        priority: niPriority,
        incoterm: niIncoterm.trim() || undefined,
        cargo_ready_date: niCargoReadyDate || undefined,
        preferred_rate: niPreferredRate !== '' ? niPreferredRate : undefined,
        commodity_type: firstContainer?.commodityType,
        container_type: firstContainer?.containerType,
        container_qty: firstContainer?.quantity,
        cargo_weight: firstContainer?.weight === '' ? undefined : firstContainer?.weight,
        is_fcl: firstContainer?.isFcl ?? true,
        remark: niRemark.trim() || undefined,
        // Contact fields omitted for case 3 (existing contact — backend already has them)
        channel:             matchedCp ? undefined : niChannel,
        contact_person:      matchedCp ? undefined : (niContactPerson.trim() || undefined),
        contact_designation: matchedCp ? undefined : (niContactDesignation.trim() || undefined),
        contact_channel_id:  matchedCp ? undefined : (niContactChannelId.trim() || undefined),
        containers,
        preferred_liners: niPreferredLiners.length > 0 ? niPreferredLiners : undefined,
      })
      resetForm()  // only after the backend has saved it
    } catch {
      // App already showed the error; keep the form so the user can fix and retry
    } finally {
      setSaving(false)
    }
  }

  const canSave = !!niCustomer.trim()

  const channelLabel = niChannel === 'Email' ? 'Email Address' : niChannel === 'WhatsApp' ? 'WhatsApp Number' : niChannel === 'Phone' ? 'Phone Number' : 'WeChat ID'

  const contactItems = (matchedCli
    ? contactPersonList.filter(cp => cp.cli_id === matchedCli.cli_id)
    : contactPersonList
  ).map(cp => ({ label: cp.name ?? '', sublabel: cp.email ?? undefined }))

  return (
    <div className="mx-auto max-w-[1200px] p-6">
      {/* Header */}
      <div className="mb-5 flex items-center gap-3">
        <Tooltip content="Back to Workspace">
          <Button size="sm" className="w-7 px-0" icon={<ArrowLeft size={16} aria-hidden="true" />} aria-label="Back to Workspace" onClick={onGoBack} />
        </Tooltip>
        <div>
          <div className="flex items-center gap-2 text-title font-bold text-fg">
            <Plus size={18} className="text-primary" aria-hidden="true" /> New Inquiry
          </div>
          <div className="mt-0.5 text-control text-fg-muted">
            Log a new shipping inquiry — it enters the workflow at Rate Check immediately. Save to submit and add another.
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4">

        {/* ═══════════════ INQUIRY DETAILS ═══════════════ */}
        <Section title="Inquiry Details">
          <Field label="Customer" required hint={matchedCli ? '✓ existing' : undefined} className="col-span-full">
            {ids => (
              <SearchCombobox
                id={ids.id}
                aria-labelledby={ids['aria-labelledby']}
                value={niCustomer}
                onChange={val => { setNiCustomer(val); setNiContactPerson('') }}
                items={clientList.map(cl => ({ label: cl.name, sublabel: cl.city ?? undefined }))}
                placeholder="Type or select customer name"
                autoFocus
              />
            )}
          </Field>

          {/* Contact Person + Designation (designation hidden when matchedCp) */}
          <Field label="Contact Person" hint={matchedCp ? '✓ existing' : undefined} className={cn(matchedCp && 'col-span-full')}>
            {ids => (
              <SearchCombobox
                id={ids.id}
                aria-labelledby={ids['aria-labelledby']}
                value={niContactPerson}
                onChange={setNiContactPerson}
                items={contactItems}
                placeholder="Name of the person making the inquiry"
              />
            )}
          </Field>
          {!matchedCp && (
            <Field label="Designation">
              {ids => <Input {...ids} value={niContactDesignation} onChange={e => setNiContactDesignation(e.target.value)} placeholder="e.g. Logistics Manager" />}
            </Field>
          )}

          {/* Channel + Channel ID — hidden when matchedCp */}
          {!matchedCp && (
            <>
              <Field label="Channel" required>
                {ids => <Select {...ids} value={niChannel} onChange={v => { setNiChannel(v as Channel); setNiContactChannelId('') }} options={CHANNEL_OPTIONS} />}
              </Field>
              <Field label={channelLabel}>
                {ids => (
                  <Input {...ids}
                    type={niChannel === 'Email' ? 'email' : niChannel === 'WeChat' ? 'text' : 'tel'}
                    value={niContactChannelId} onChange={e => setNiContactChannelId(e.target.value)}
                    placeholder={niChannel === 'Email' ? 'e.g. john@acme.com' : niChannel === 'WhatsApp' ? 'e.g. +94 77 123 4567' : niChannel === 'Phone' ? 'e.g. +94 11 234 5678' : 'e.g. john_doe'}
                  />
                )}
              </Field>
            </>
          )}

          <SubHead>Routing</SubHead>

          <Field label="Origin" required>
            {ids => <PortCombobox id={ids.id} aria-labelledby={ids['aria-labelledby']} value={niOrigin} onChange={setNiOrigin} placeholder="e.g. Colombo/Sri Lanka" />}
          </Field>
          <Field label="Priority" required>
            {ids => <Select {...ids} value={niPriority} onChange={v => setNiPriority(v as InquiryPriority)} options={PRIORITY_OPTIONS} />}
          </Field>

          <Field label="SBU" required>
            {ids => <Select {...ids} value={niSbu} onChange={v => setNiSbu(v as SBU)} options={SBU_OPTIONS} />}
          </Field>
          <Field label="Delivery Type" required>
            {ids => <Select {...ids} value={niDelivery} onChange={v => setNiDelivery(v as DeliveryType)} options={DELIVERY_OPTIONS} />}
          </Field>

          <Field label="Incoterm">
            {ids => <Input {...ids} value={niIncoterm} onChange={e => setNiIncoterm(e.target.value)} placeholder="e.g. FOB, CIF, EXW, DDP" />}
          </Field>
          <Field label="Cargo Ready">
            {ids => <DatePicker {...ids} value={niCargoReadyDate} onChange={setNiCargoReadyDate} />}
          </Field>

          <Field label="Preferred Rate">
            {ids => <NumberInput {...ids} value={niPreferredRate} onChange={e => setNiPreferredRate(e.target.value === '' ? '' : Number(e.target.value))} min={0} placeholder="e.g. 1200 USD" />}
          </Field>
          <Field label="Pref. Liners">
            {ids => <TagInput id={ids.id} aria-labelledby={ids['aria-labelledby']} values={niPreferredLiners} onChange={setNiPreferredLiners} suggestions={linerList.map(l => l.name)} placeholder="Type to add liners..." formatLabel={formatLinerLabel} />}
          </Field>

          <Field label="Remarks" className="col-span-full">
            {ids => <Input {...ids} value={niRemark} onChange={e => setNiRemark(e.target.value)} placeholder="Any special instructions or notes" />}
          </Field>
        </Section>

        {/* ═══════════════ CONTAINER SECTIONS ═══════════════ */}
        {containers.map((c, idx) => (
          <Section
            key={idx}
            title={`Container ${idx + 1}`}
            action={containers.length > 1 && (
              <Tooltip content="Remove container">
                <Button variant="ghost" size="sm" className="w-7 px-0 text-white hover:bg-primary-hover" icon={<X size={14} aria-hidden="true" />} aria-label={`Remove container ${idx + 1}`} onClick={() => removeContainer(idx)} />
              </Tooltip>
            )}
          >
            <Field label="Commodity Type" required>
              {ids => <Select {...ids} value={c.commodityType} onChange={v => updateContainer(idx, { commodityType: v as CommodityType })} options={COMMODITY_OPTIONS} />}
            </Field>
            <Field label="Commodity">
              {ids => <Input {...ids} value={c.commodityName} onChange={e => updateContainer(idx, { commodityName: e.target.value })} placeholder="e.g. Cotton T-shirts" />}
            </Field>

            <Field label="Destination" required>
              {ids => <PortCombobox id={ids.id} aria-labelledby={ids['aria-labelledby']} value={c.destination} onChange={dest => updateContainer(idx, { destination: dest })} placeholder="e.g. Hamburg/Germany" />}
            </Field>
            <Field label="Container" required>
              {ids => <Select {...ids} value={c.containerType} onChange={v => updateContainer(idx, { containerType: v as ContainerType })} options={CONTAINER_OPTIONS} />}
            </Field>

            <Field label="Qty" required>
              {ids => <NumberInput {...ids} value={c.quantity} onChange={e => updateContainer(idx, { quantity: Math.max(1, Number(e.target.value)) })} min={1} />}
            </Field>
            <Field label="Weight (kg)">
              {ids => <NumberInput {...ids} value={c.weight} onChange={e => updateContainer(idx, { weight: e.target.value === '' ? '' : Number(e.target.value) })} min={0} placeholder="e.g. 18000" />}
            </Field>

            <Field label="FCL / LCL" required>
              {ids => <Select {...ids} value={c.isFcl ? 'FCL' : 'LCL'} onChange={v => updateContainer(idx, { isFcl: v === 'FCL' })} options={FCL_OPTIONS} />}
            </Field>
            <Field label="Zip Code">
              {ids => <Input {...ids} value={c.zipCode} onChange={e => updateContainer(idx, { zipCode: e.target.value })} placeholder="e.g. 20095" />}
            </Field>

            <Field label="Free Time (days)">
              {ids => <NumberInput {...ids} value={c.freeTime} onChange={e => updateContainer(idx, { freeTime: e.target.value === '' ? '' : Number(e.target.value) })} min={0} placeholder="e.g. 14" />}
            </Field>
            <Field label="Temp. (°C)">
              {ids => <NumberInput {...ids} value={c.temperature ?? ''} onChange={e => updateContainer(idx, { temperature: e.target.value === '' ? undefined : Number(e.target.value) })} placeholder="e.g. -18" />}
            </Field>

            <Field label="HS Code" className="col-span-full">
              {ids => <Input {...ids} value={c.hs_code ?? ''} onChange={e => updateContainer(idx, { hs_code: e.target.value || undefined })} placeholder="e.g. 6109.10" />}
            </Field>

            <SubHead>Additional Details</SubHead>

            <Field label="Description" className="col-span-full">
              {ids => <Input {...ids} value={c.description ?? ''} onChange={e => updateContainer(idx, { description: e.target.value || undefined })} placeholder="Brief description of the goods" />}
            </Field>
            <Field label="Delivery Address" className="col-span-full">
              {ids => <Input {...ids} value={c.address ?? ''} onChange={e => updateContainer(idx, { address: e.target.value || undefined })} placeholder="Door delivery address (door-to-door only)" />}
            </Field>
            <Field label="Door Agent" className="col-span-full">
              {ids => <TagInput id={ids.id} aria-labelledby={ids['aria-labelledby']} values={c.doorAgents} onChange={doorAgents => updateContainer(idx, { doorAgents })} suggestions={linerList.map(l => l.name)} placeholder="Type to add door agents..." formatLabel={formatLinerLabel} />}
            </Field>
          </Section>
        ))}

        {/* Add Container button */}
        <Button size="sm" className="self-start" icon={<Plus size={14} aria-hidden="true" />} onClick={addContainer}>
          Add Container
        </Button>

        {/* Submit area */}
        <div className="flex justify-end gap-2">
          <Button onClick={onGoBack}>Back to Workspace</Button>
          <Button variant="primary" icon={<Save size={14} aria-hidden="true" />} isPending={saving} disabled={!canSave} onClick={handleSave}>
            {saving ? 'Saving…' : 'Save Inquiry'}
          </Button>
        </div>

      </div>
    </div>
  )
}
