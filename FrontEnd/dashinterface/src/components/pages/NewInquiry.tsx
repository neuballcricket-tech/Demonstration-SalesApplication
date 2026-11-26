import { useState, useEffect } from 'react'
import { ArrowLeft, Plus, Save } from 'lucide-react'
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
  const [niChannel, setNiChannel] = useState<'WhatsApp' | 'Email' | 'Phone' | 'WeChat'>('Email')
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

  // Style-guide tokens
  const labelCell: React.CSSProperties = { padding: '8px 12px', background: 'var(--bg-card)', borderRight: '1px solid var(--border)', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }
  const labelCellNarrow: React.CSSProperties = { ...labelCell, padding: '8px 8px' }
  const valCell: React.CSSProperties = { padding: '4px 8px' }
  const valCellBR: React.CSSProperties = { ...valCell, borderRight: '1px solid var(--border)' }
  const inputStyle: React.CSSProperties = { width: '100%', border: 'none', background: 'transparent', padding: '4px 0' }
  const rowBorder: React.CSSProperties = { borderBottom: '1px solid var(--border)' }

  const channelLabel = niChannel === 'Email' ? 'Email Address' : niChannel === 'WhatsApp' ? 'WhatsApp Number' : niChannel === 'Phone' ? 'Phone Number' : 'WeChat ID'

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button className="lt-icon-btn" onClick={onGoBack} title="Back to Workspace" style={{ padding: 6 }}>
          <ArrowLeft size={18} />
        </button>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Plus size={18} style={{ color: '#0f8fa8' }} /> New Inquiry
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
            Log a new shipping inquiry — it enters the workflow at Rate Check immediately. Save to submit and add another.
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* ═══════════════ INQUIRY DETAILS ═══════════════ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {/* Header bar */}
          <div style={{ padding: '8px 14px', background: 'var(--accent)', borderRadius: '8px 8px 0 0', marginBottom: 1 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#fff', letterSpacing: 0.5 }}>INQUIRY DETAILS</span>
          </div>

          {/* Fields table */}
          <div style={{ border: '1px solid var(--border)', borderRadius: '0 0 8px 8px', overflow: 'hidden' }}>
            {/* Customer — full width */}
            <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', ...rowBorder }}>
              <div style={labelCell}>
                Customer <span style={{ color: '#dc2626', marginLeft: 2 }}>*</span>
                {matchedCli && <span style={{ marginLeft: 6, fontSize: 10, color: '#16a34a', fontWeight: 500 }}>✓ existing</span>}
              </div>
              <div style={valCell}>
                <SearchCombobox
                  value={niCustomer}
                  onChange={val => { setNiCustomer(val); setNiContactPerson('') }}
                  items={clientList.map(cl => ({ label: cl.name, sublabel: cl.city ?? undefined }))}
                  placeholder="Type or select customer name"
                  autoFocus
                />
              </div>
            </div>

            {/* Contact Person + Designation (hidden when matchedCp) */}
            {!matchedCp ? (
              <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr 110px 1fr', ...rowBorder }}>
                <div style={labelCell}>
                  Contact Person
                </div>
                <div style={valCellBR}>
                  <SearchCombobox
                    value={niContactPerson}
                    onChange={setNiContactPerson}
                    items={(matchedCli
                      ? contactPersonList.filter(cp => cp.cli_id === matchedCli.cli_id)
                      : contactPersonList
                    ).map(cp => ({ label: cp.name ?? '', sublabel: cp.email ?? undefined }))}
                    placeholder="Name of the person making the inquiry"
                  />
                </div>
                <div style={labelCellNarrow}>Designation</div>
                <div style={valCell}>
                  <input className="lt-input" style={inputStyle} value={niContactDesignation} onChange={e => setNiContactDesignation(e.target.value)} placeholder="e.g. Logistics Manager" />
                </div>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', ...rowBorder }}>
                <div style={labelCell}>
                  Contact Person
                  <span style={{ marginLeft: 6, fontSize: 10, color: '#16a34a', fontWeight: 500 }}>✓ existing</span>
                </div>
                <div style={valCell}>
                  <SearchCombobox
                    value={niContactPerson}
                    onChange={setNiContactPerson}
                    items={(matchedCli
                      ? contactPersonList.filter(cp => cp.cli_id === matchedCli.cli_id)
                      : contactPersonList
                    ).map(cp => ({ label: cp.name ?? '', sublabel: cp.email ?? undefined }))}
                    placeholder="Name of the person making the inquiry"
                  />
                </div>
              </div>
            )}

            {/* Channel + Channel ID — hidden when matchedCp */}
            {!matchedCp && (
              <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr 110px 1fr', ...rowBorder }}>
                <div style={labelCell}>Channel <span style={{ color: '#dc2626', marginLeft: 2 }}>*</span></div>
                <div style={valCellBR}>
                  <select className="lt-input" style={inputStyle} value={niChannel} onChange={e => { setNiChannel(e.target.value as 'WhatsApp' | 'Email' | 'Phone' | 'WeChat'); setNiContactChannelId('') }}>
                    <option>Email</option><option>WhatsApp</option><option>Phone</option><option>WeChat</option>
                  </select>
                </div>
                <div style={labelCellNarrow}>{channelLabel}</div>
                <div style={valCell}>
                  <input className="lt-input" style={inputStyle}
                    type={niChannel === 'Email' ? 'email' : niChannel === 'WeChat' ? 'text' : 'tel'}
                    value={niContactChannelId} onChange={e => setNiContactChannelId(e.target.value)}
                    placeholder={niChannel === 'Email' ? 'e.g. john@acme.com' : niChannel === 'WhatsApp' ? 'e.g. +94 77 123 4567' : niChannel === 'Phone' ? 'e.g. +94 11 234 5678' : 'e.g. john_doe'}
                  />
                </div>
              </div>
            )}

            {/* ─── ROUTING divider ─── */}
            <div style={{ padding: '7px 12px', background: 'rgba(15,143,168,0.12)', ...rowBorder }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', letterSpacing: 0.4 }}>ROUTING</span>
            </div>

            {/* Origin + Priority */}
            <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr 110px 1fr', ...rowBorder }}>
              <div style={labelCell}>Origin <span style={{ color: '#dc2626', marginLeft: 2 }}>*</span></div>
              <div style={valCellBR}>
                <PortCombobox value={niOrigin} onChange={setNiOrigin} placeholder="e.g. Colombo/Sri Lanka" />
              </div>
              <div style={labelCellNarrow}>Priority <span style={{ color: '#dc2626', marginLeft: 2 }}>*</span></div>
              <div style={valCell}>
                <select className="lt-input" style={inputStyle} value={niPriority} onChange={e => setNiPriority(e.target.value as InquiryPriority)}>
                  {INQUIRY_PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>

            {/* SBU + Delivery Type */}
            <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr 110px 1fr', ...rowBorder }}>
              <div style={labelCell}>SBU <span style={{ color: '#dc2626', marginLeft: 2 }}>*</span></div>
              <div style={valCellBR}>
                <select className="lt-input" style={inputStyle} value={niSbu} onChange={e => setNiSbu(e.target.value as SBU)}>
                  {SBUS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div style={labelCellNarrow}>Delivery Type <span style={{ color: '#dc2626', marginLeft: 2 }}>*</span></div>
              <div style={valCell}>
                <select className="lt-input" style={inputStyle} value={niDelivery} onChange={e => setNiDelivery(e.target.value as DeliveryType)}>
                  <option value="port-to-port">Port to Port</option>
                  <option value="door-to-door">Door to Door</option>
                  <option value="port-to-door">Port to Door</option>
                  <option value="door-to-port">Door to Port</option>
                </select>
              </div>
            </div>

            {/* Incoterm + Cargo Ready Date */}
            <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr 110px 1fr', ...rowBorder }}>
              <div style={labelCell}>Incoterm</div>
              <div style={valCellBR}>
                <input className="lt-input" style={inputStyle} value={niIncoterm} onChange={e => setNiIncoterm(e.target.value)} placeholder="e.g. FOB, CIF, EXW, DDP" />
              </div>
              <div style={labelCellNarrow}>Cargo Ready</div>
              <div style={valCell}>
                <input className="lt-input" type="date" style={inputStyle} value={niCargoReadyDate} onChange={e => setNiCargoReadyDate(e.target.value)} />
              </div>
            </div>

            {/* Preferred Rate + Preferred Liners */}
            <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr 110px 1fr', ...rowBorder }}>
              <div style={labelCell}>Preferred Rate</div>
              <div style={valCellBR}>
                <input className="lt-input" type="number" style={inputStyle} value={niPreferredRate} onChange={e => setNiPreferredRate(e.target.value === '' ? '' : Number(e.target.value))} min={0} placeholder="e.g. 1200 USD" />
              </div>
              <div style={labelCellNarrow}>Pref. Liners</div>
              <div style={valCell}>
                <TagInput values={niPreferredLiners} onChange={setNiPreferredLiners} suggestions={linerList.map(l => l.name)} placeholder="Type to add liners..." formatLabel={formatLinerLabel} />
              </div>
            </div>

            {/* Remarks — full width, last row */}
            <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr' }}>
              <div style={labelCell}>Remarks</div>
              <div style={valCell}>
                <input className="lt-input" style={inputStyle} value={niRemark} onChange={e => setNiRemark(e.target.value)} placeholder="Any special instructions or notes" />
              </div>
            </div>
          </div>
        </div>

        {/* ═══════════════ CONTAINER SECTIONS ═══════════════ */}
        {containers.map((c, idx) => (
          <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {/* Container header bar */}
            <div style={{ padding: '8px 14px', background: 'var(--accent)', borderRadius: '8px 8px 0 0', marginBottom: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#fff', letterSpacing: 0.5 }}>CONTAINER {idx + 1}</span>
              {containers.length > 1 && (
                <button type="button" onClick={() => removeContainer(idx)} title="Remove container"
                  style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.7)', fontSize: 14, padding: '0 2px', lineHeight: 1 }}>
                  ×
                </button>
              )}
            </div>

            {/* Container fields table */}
            <div style={{ border: '1px solid var(--border)', borderRadius: '0 0 8px 8px', overflow: 'hidden' }}>
              {/* Commodity Type + Commodity Name */}
              <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr 110px 1fr', ...rowBorder }}>
                <div style={labelCell}>Commodity Type <span style={{ color: '#dc2626', marginLeft: 2 }}>*</span></div>
                <div style={valCellBR}>
                  <select className="lt-input" style={inputStyle} value={c.commodityType} onChange={e => updateContainer(idx, { commodityType: e.target.value as CommodityType })}>
                    {COMMODITY_TYPES.map(ct => <option key={ct} value={ct}>{ct}</option>)}
                  </select>
                </div>
                <div style={labelCellNarrow}>Commodity</div>
                <div style={valCell}>
                  <input className="lt-input" style={inputStyle} value={c.commodityName} onChange={e => updateContainer(idx, { commodityName: e.target.value })} placeholder="e.g. Cotton T-shirts" />
                </div>
              </div>

              {/* Destination + Container Type */}
              <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr 110px 1fr', ...rowBorder }}>
                <div style={labelCell}>Destination <span style={{ color: '#dc2626', marginLeft: 2 }}>*</span></div>
                <div style={valCellBR}>
                  <PortCombobox value={c.destination} onChange={dest => updateContainer(idx, { destination: dest })} placeholder="e.g. Hamburg/Germany" />
                </div>
                <div style={labelCellNarrow}>Container <span style={{ color: '#dc2626', marginLeft: 2 }}>*</span></div>
                <div style={valCell}>
                  <select className="lt-input" style={inputStyle} value={c.containerType} onChange={e => updateContainer(idx, { containerType: e.target.value as ContainerType })}>
                    {CONTAINER_TYPES.map(ct => <option key={ct} value={ct}>{CONTAINER_TYPE_LABELS[ct]}</option>)}
                  </select>
                </div>
              </div>

              {/* Qty + Weight */}
              <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr 110px 1fr', ...rowBorder }}>
                <div style={labelCell}>Qty <span style={{ color: '#dc2626', marginLeft: 2 }}>*</span></div>
                <div style={valCellBR}>
                  <input className="lt-input" type="number" style={inputStyle} value={c.quantity} onChange={e => updateContainer(idx, { quantity: Math.max(1, Number(e.target.value)) })} min={1} />
                </div>
                <div style={labelCellNarrow}>Weight (kg)</div>
                <div style={valCell}>
                  <input className="lt-input" type="number" style={inputStyle} value={c.weight} onChange={e => updateContainer(idx, { weight: e.target.value === '' ? '' : Number(e.target.value) })} min={0} placeholder="e.g. 18000" />
                </div>
              </div>

              {/* FCL/LCL + Zip Code */}
              <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr 110px 1fr', ...rowBorder }}>
                <div style={labelCell}>FCL / LCL <span style={{ color: '#dc2626', marginLeft: 2 }}>*</span></div>
                <div style={valCellBR}>
                  <select className="lt-input" style={inputStyle} value={c.isFcl ? 'FCL' : 'LCL'} onChange={e => updateContainer(idx, { isFcl: e.target.value === 'FCL' })}>
                    <option value="FCL">FCL</option>
                    <option value="LCL">LCL</option>
                  </select>
                </div>
                <div style={labelCellNarrow}>Zip Code</div>
                <div style={valCell}>
                  <input className="lt-input" style={inputStyle} value={c.zipCode} onChange={e => updateContainer(idx, { zipCode: e.target.value })} placeholder="e.g. 20095" />
                </div>
              </div>

              {/* Free Time + Temperature */}
              <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr 110px 1fr', ...rowBorder }}>
                <div style={labelCell}>Free Time (days)</div>
                <div style={valCellBR}>
                  <input className="lt-input" type="number" style={inputStyle} value={c.freeTime} onChange={e => updateContainer(idx, { freeTime: e.target.value === '' ? '' : Number(e.target.value) })} min={0} placeholder="e.g. 14" />
                </div>
                <div style={labelCellNarrow}>Temp. (°C)</div>
                <div style={valCell}>
                  <input className="lt-input" type="number" style={inputStyle} value={c.temperature ?? ''} onChange={e => updateContainer(idx, { temperature: e.target.value === '' ? undefined : Number(e.target.value) })} placeholder="e.g. -18" />
                </div>
              </div>

              {/* HS Code — single value */}
              <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', ...rowBorder }}>
                <div style={labelCell}>HS Code</div>
                <div style={valCell}>
                  <input className="lt-input" style={inputStyle} value={c.hs_code ?? ''} onChange={e => updateContainer(idx, { hs_code: e.target.value || undefined })} placeholder="e.g. 6109.10" />
                </div>
              </div>

              {/* ─── ADDITIONAL DETAILS divider ─── */}
              <div style={{ padding: '7px 12px', background: 'rgba(15,143,168,0.12)', ...rowBorder }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', letterSpacing: 0.4 }}>ADDITIONAL DETAILS</span>
              </div>

              {/* Description — full width */}
              <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', ...rowBorder }}>
                <div style={labelCell}>Description</div>
                <div style={valCell}>
                  <input className="lt-input" style={inputStyle} value={c.description ?? ''} onChange={e => updateContainer(idx, { description: e.target.value || undefined })} placeholder="Brief description of the goods" />
                </div>
              </div>

              {/* Delivery Address — full width */}
              <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', ...rowBorder }}>
                <div style={labelCell}>Delivery Address</div>
                <div style={valCell}>
                  <input className="lt-input" style={inputStyle} value={c.address ?? ''} onChange={e => updateContainer(idx, { address: e.target.value || undefined })} placeholder="Door delivery address (door-to-door only)" />
                </div>
              </div>

              {/* Door Agent — full width, last row (no borderBottom) */}
              <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr' }}>
                <div style={labelCell}>Door Agent</div>
                <div style={valCell}>
                  <TagInput values={c.doorAgents} onChange={doorAgents => updateContainer(idx, { doorAgents })} suggestions={linerList.map(l => l.name)} placeholder="Type to add door agents..." formatLabel={formatLinerLabel} />
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* Add Container button */}
        <button type="button" onClick={addContainer}
          style={{ border: '1px dashed var(--border)', borderRadius: 4, background: 'transparent', cursor: 'pointer', padding: '6px 12px', fontSize: 11, color: 'var(--accent)', fontWeight: 600, alignSelf: 'flex-start' }}>
          + Add Container
        </button>

        {/* Submit area */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 4 }}>
          <button className="db-btn" style={{ fontSize: 12 }} onClick={onGoBack}>Back to Workspace</button>
          <button
            className="db-btn primary"
            style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, opacity: canSave ? 1 : 0.5, cursor: canSave ? 'pointer' : 'not-allowed' }}
            disabled={!canSave || saving}
            onClick={handleSave}
          >
            <Save size={12} /> {saving ? 'Saving…' : 'Save Inquiry'}
          </button>
        </div>

      </div>
    </div>
  )
}
