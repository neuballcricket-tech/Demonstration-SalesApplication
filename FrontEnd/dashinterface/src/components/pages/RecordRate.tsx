import { useState, useEffect, useRef } from 'react'
import { ArrowLeft, Check, DollarSign, FileText, FileSpreadsheet, Plus, Upload, X } from 'lucide-react'
import {
  RATE_SOURCE_COLORS, portOptions, linerDisplay,
  type PortRecord, type LinerRecord, type TradeLaneRecord, type EmployeeRecord, type ClientRecord,
  type RateSourceType,
} from '../../types'
import { apiGetPorts, apiGetLiners, apiGetTradeLanes, apiGetEmployeesDb, apiGetClientsDb, apiCreateTariffRate, apiCreateContractedRate, apiCreateNacRate, apiPreviewBulkTariffRates, apiBulkCreateTariffRates, BACKEND_ACTOR_ID, type BulkTariffPreviewRow } from '../../api'
import TagInput from '../shared/TagInput'
import { FIELD_LABEL, INPUT_STYLE } from './pageStyles'

interface TariffContainerRate {
  containerType: string
  weight: string
  rate: number | ''
  currency: string
}
const emptyTariffContainer = (): TariffContainerRate => ({ containerType: '', weight: '', rate: '', currency: 'USD' })

interface ContractedContainerRate {
  containerType: string
  contractedVolume: string
  weight: string
  rate: number | ''
  currency: string
}
const emptyContractedContainer = (): ContractedContainerRate => ({ containerType: '', contractedVolume: '', weight: '', rate: '', currency: 'USD' })

interface RecordRateProps {
  onFlash: (msg: string, action?: { label: string; onClick: () => void }) => void
  onGoBack: () => void
}

export default function RecordRate({ onFlash, onGoBack }: RecordRateProps) {
  // Mode: edit form or review summary
  const [mode, setMode] = useState<'edit' | 'review'>('edit')
  // Rate type
  const [rrType, setRrType] = useState<RateSourceType>('Tariff Rate')
  // FK-backed fields
  const [rrLinerId, setRrLinerId] = useState<number | ''>('')
  const [rrTradeLaneId, setRrTradeLaneId] = useState<number | ''>('')
  // Common fields
  const [, setRrContainerType] = useState('')
  const [, setRrRate] = useState<number | ''>('')
  const [, setRrCurrency] = useState('USD')
  const [rrValidFrom, setRrValidFrom] = useState('')
  const [rrValidTo, setRrValidTo] = useState('')
  // Contracted extras
  const [rrContractId, setRrContractId] = useState('')
  const [rrSalesPersonId, setRrSalesPersonId] = useState<number | ''>('')
  const [rrServiceLane, setRrServiceLane] = useState('')
  const [rrOrigin, setRrOrigin] = useState('')
  const [rrDestination, setRrDestination] = useState('')
  const [rrFreeTime, setRrFreeTime] = useState('')
  const [, setRrContainerWeight] = useState('')
  const [, setRrContractedVolume] = useState('')
  const [rrNote, setRrNote] = useState('')
  const [rrSpecialRemark, setRrSpecialRemark] = useState('')
  // Tariff — per-container rates
  const [rrTariffContainers, setRrTariffContainers] = useState<TariffContainerRate[]>([emptyTariffContainer()])
  // Contracted — per-container rates
  const [rrContractedContainers, setRrContractedContainers] = useState<ContractedContainerRate[]>([emptyContractedContainer()])
  // NAC — per-container rates (same shape as Contracted)
  const [rrNacContainers, setRrNacContainers] = useState<ContractedContainerRate[]>([emptyContractedContainer()])
  // NAC extras
  const [rrNacRefNo, setRrNacRefNo] = useState('')
  const [rrNacCustomerName, setRrNacCustomerName] = useState('')
  // Contracted — applicable customers
  const [rrApplicableCustomers, setRrApplicableCustomers] = useState<string[]>([])

  // Bulk upload state
  const [entryMode, setEntryMode] = useState<'manual' | 'bulk'>('manual')
  const [bulkRows, setBulkRows] = useState<BulkTariffPreviewRow[]>([])
  const [bulkUploading, setBulkUploading] = useState(false)
  const [bulkSaving, setBulkSaving] = useState(false)
  const [saving, setSaving] = useState(false)
  const [bulkNote, setBulkNote] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const now = new Date()
  const [bulkLinerId, setBulkLinerId] = useState<number | ''>('')
  const [bulkMonth, setBulkMonth] = useState(now.getMonth() + 1) // 1-12
  const [bulkYear, setBulkYear] = useState(now.getFullYear())

  // Reference data
  const [portList, setPortList] = useState<PortRecord[]>([])
  const [linerList, setLinerList] = useState<LinerRecord[]>([])
  const [tradeLaneList, setTradeLaneList] = useState<TradeLaneRecord[]>([])
  const [dbEmployeeList, setDbEmployeeList] = useState<EmployeeRecord[]>([])
  const [dbClientList, setDbClientList] = useState<ClientRecord[]>([])

  useEffect(() => {
    apiGetPorts().then(setPortList).catch(() => {})
    apiGetLiners().then(setLinerList).catch(() => {})
    apiGetTradeLanes().then(setTradeLaneList).catch(() => {})
    apiGetEmployeesDb().then(setDbEmployeeList).catch(() => {})
    apiGetClientsDb().then(setDbClientList).catch(() => {})
  }, [])

  const resetForm = () => {
    setMode('edit')
    setRrType('Tariff Rate'); setRrLinerId(''); setRrTradeLaneId('')
    setRrContainerType(''); setRrRate(''); setRrCurrency('USD')
    setRrValidFrom(''); setRrValidTo('')
    setRrContractId(''); setRrSalesPersonId(''); setRrServiceLane('')
    setRrOrigin(''); setRrDestination(''); setRrFreeTime('')
    setRrContainerWeight(''); setRrContractedVolume('')
    setRrNote(''); setRrSpecialRemark('')
    setRrNacRefNo(''); setRrNacCustomerName('')
    setRrApplicableCustomers([])
    setRrTariffContainers([emptyTariffContainer()])
    setRrContractedContainers([emptyContractedContainer()])
    setRrNacContainers([emptyContractedContainer()])
    setEntryMode('manual'); setBulkRows([]); setBulkNote('')
    setBulkLinerId(''); setBulkMonth(now.getMonth() + 1); setBulkYear(now.getFullYear())
  }

  // Name resolution helpers for review
  const linerName = linerList.find(l => l.lin_id === rrLinerId)?.name ?? '—'
  const laneName = tradeLaneList.find(t => t.trln_id === rrTradeLaneId)?.trln_name ?? '—'
  const salesName = dbEmployeeList.find(e => e.emp_id === rrSalesPersonId)?.name ?? '—'

  // Tariff container helpers
  const updateTariffContainer = (idx: number, patch: Partial<TariffContainerRate>) =>
    setRrTariffContainers(prev => prev.map((c, i) => i === idx ? { ...c, ...patch } : c))
  const addTariffContainer = () => setRrTariffContainers(prev => [...prev, emptyTariffContainer()])
  const removeTariffContainer = (idx: number) => setRrTariffContainers(prev => prev.filter((_, i) => i !== idx))

  // Contracted container helpers
  const updateContractedContainer = (idx: number, patch: Partial<ContractedContainerRate>) =>
    setRrContractedContainers(prev => prev.map((c, i) => i === idx ? { ...c, ...patch } : c))
  const addContractedContainer = () => setRrContractedContainers(prev => [...prev, emptyContractedContainer()])
  const removeContractedContainer = (idx: number) => setRrContractedContainers(prev => prev.filter((_, i) => i !== idx))

  // NAC container helpers
  const updateNacContainer = (idx: number, patch: Partial<ContractedContainerRate>) =>
    setRrNacContainers(prev => prev.map((c, i) => i === idx ? { ...c, ...patch } : c))
  const addNacContainer = () => setRrNacContainers(prev => [...prev, emptyContractedContainer()])
  const removeNacContainer = (idx: number) => setRrNacContainers(prev => prev.filter((_, i) => i !== idx))

  // Bulk upload handlers
  const handleBulkFile = async (file: File) => {
    setBulkUploading(true)
    setBulkNote('')
    try {
      const res = await apiPreviewBulkTariffRates(file)
      if (res.rows.length === 0) {
        onFlash('No tariff rates found in that file')
        return
      }
      setBulkRows(res.rows)
      const bits = [`${res.rows.length} rate(s) loaded`]
      if (res.unknown_count) bits.push(`${res.unknown_count} unrecognised value(s)`)
      if (res.skipped.length) bits.push(`${res.skipped.length} row(s) skipped`)
      setBulkNote(bits.join(' · '))
      onFlash(bits.join(' · '))
    } catch (e) {
      onFlash(`Could not read the file: ${(e as Error).message}`)
    } finally {
      setBulkUploading(false)
    }
  }

  const handleBulkSave = async () => {
    if (bulkRows.length === 0 || bulkLinerId === '') return
    setBulkSaving(true)
    try {
      const res = await apiBulkCreateTariffRates({
        lin_id: bulkLinerId,
        month: bulkMonth,
        year: bulkYear,
        rows: bulkRows,
      })
      onFlash(`${res.created} tariff rate(s) saved successfully`)
      resetForm()
    } catch (e) {
      onFlash(`Bulk save failed: ${(e as Error).message}`)
    } finally {
      setBulkSaving(false)
    }
  }

  const removeBulkRow = (idx: number) => setBulkRows(prev => prev.filter((_, i) => i !== idx))

  const handleSave = async () => {
    if (saving) return
    // The backend requires a valid trade lane on every rate
    if (rrTradeLaneId === '') {
      onFlash(tradeLaneList.length === 0
        ? 'No trade lanes are set up in the system yet, so rates cannot be saved. Ask an administrator to add trade lanes.'
        : 'Select a trade lane before saving.')
      return
    }
    const trLnId = rrTradeLaneId
    const salespersonId = rrSalesPersonId !== '' ? rrSalesPersonId : BACKEND_ACTOR_ID
    const summarise = (arr: (TariffContainerRate | ContractedContainerRate)[]) =>
      arr.filter(c => c.rate !== '').map(c => `${c.containerType || '?'}: ${c.rate} ${c.currency}`).join(', ')
    const containers = rrType === 'Tariff Rate' ? rrTariffContainers : rrType === 'Contracted' ? rrContractedContainers : rrNacContainers

    // One POST per container row that has a rate
    type SaveJob = { row: TariffContainerRate | ContractedContainerRate; request: () => Promise<unknown> }
    let jobs: SaveJob[]
    if (rrType === 'Tariff Rate') {
      jobs = rrTariffContainers.filter(c => c.rate !== '').map(ct => ({
        row: ct,
        request: () => apiCreateTariffRate({
          lin_id: rrLinerId !== '' ? rrLinerId : undefined,
          tr_ln_id: trLnId,
          updated_by: BACKEND_ACTOR_ID,
          salesperson: salespersonId,
          origin: rrOrigin,
          destination: rrDestination,
          valid_from: rrValidFrom || undefined,
          valid_to: rrValidTo || undefined,
          max_weight: ct.weight.trim() ? (parseInt(ct.weight) || 0) : 0,
          container_type: ct.containerType || undefined,
          rate: ct.rate,
          currency: ct.currency,
          free_time: rrFreeTime.trim() || undefined,
          note: rrNote || undefined,
          special_remark: rrSpecialRemark || undefined,
        }),
      }))
    } else if (rrType === 'Contracted') {
      jobs = rrContractedContainers.filter(c => c.rate !== '').map(cc => ({
        row: cc,
        request: () => apiCreateContractedRate({
          lin_id: rrLinerId !== '' ? rrLinerId : undefined,
          tr_ln_id: trLnId,
          contract_ref_id: rrContractId || undefined,
          valid_from: rrValidFrom || undefined,
          valid_to: rrValidTo || undefined,
          contracted_volume: cc.contractedVolume.trim() ? (parseInt(cc.contractedVolume) || 0) : 0,
          container_type: cc.containerType || undefined,
          updated_by: BACKEND_ACTOR_ID,
          origin: rrOrigin,
          destination: rrDestination,
          rate: cc.rate,
          currency: cc.currency,
          emp_id_sales: salespersonId,
          emp_id_cs: BACKEND_ACTOR_ID,
          free_time: rrFreeTime.trim() || undefined,
          max_weight: cc.weight.trim() ? parseInt(cc.weight) : undefined,
          note: rrNote || undefined,
          special_remark: rrSpecialRemark || undefined,
          client_ids: rrApplicableCustomers.length > 0
            ? rrApplicableCustomers
                .map(name => dbClientList.find(c => c.name === name)?.cli_id)
                .filter((id): id is number => id !== undefined)
            : undefined,
        }),
      }))
    } else {
      // NAC
      const cliId = dbClientList.find(c => c.name === rrNacCustomerName)?.cli_id
      jobs = rrNacContainers.filter(c => c.rate !== '').map(nc => ({
        row: nc,
        request: () => apiCreateNacRate({
          cli_id: cliId,
          lin_id: rrLinerId !== '' ? rrLinerId : undefined,
          tr_ln_id: trLnId,
          nac_ref_id: rrNacRefNo || undefined,
          origin: rrOrigin,
          destination: rrDestination,
          valid_from: rrValidFrom || undefined,
          valid_to: rrValidTo || undefined,
          container_type: nc.containerType || undefined,
          rate: nc.rate,
          currency: nc.currency,
          contracted_volume: nc.contractedVolume.trim() ? (parseInt(nc.contractedVolume) || 0) : 0,
          emp_id_sales: salespersonId,
          emp_id_cs: BACKEND_ACTOR_ID,
          free_time: rrFreeTime.trim() || undefined,
          max_weight: nc.weight.trim() ? parseInt(nc.weight) : undefined,
          note: rrNote || undefined,
          special_remark: rrSpecialRemark || undefined,
        }),
      }))
    }

    setSaving(true)
    try {
      const results = await Promise.allSettled(jobs.map(j => j.request()))
      const failed = jobs.filter((_, i) => results[i].status === 'rejected')
      if (failed.length === 0) {
        onFlash(`Rate recorded: ${rrType} · ${linerName} · ${laneName} · ${summarise(containers)}`)
        resetForm()
        return
      }
      // Keep only the rows that did not save, so pressing Save again cannot create duplicates
      const failedRows = new Set<object>(failed.map(j => j.row))
      const keepUnsaved = <T extends { rate: number | '' }>(rows: T[]) => rows.filter(r => r.rate === '' || failedRows.has(r))
      if (rrType === 'Tariff Rate') setRrTariffContainers(rows => keepUnsaved(rows))
      else if (rrType === 'Contracted') setRrContractedContainers(rows => keepUnsaved(rows))
      else setRrNacContainers(rows => keepUnsaved(rows))
      const reasons = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected').map(r => r.reason)
      console.error('[RecordRate] rate save failed:', reasons)
      const firstReason = reasons[0] instanceof Error ? reasons[0].message : String(reasons[0])
      const saved = jobs.length - failed.length
      onFlash(`${saved} of ${jobs.length} rate row(s) saved, ${failed.length} failed. Fix and press Confirm & Save again. (${firstReason.slice(0, 140)})`)
    } finally {
      setSaving(false)
    }
  }

  const canSave = rrType === 'Tariff Rate'
    ? rrTariffContainers.some(c => c.rate !== '')
    : rrType === 'Contracted'
      ? rrContractedContainers.some(c => c.rate !== '')
      : rrNacContainers.some(c => c.rate !== '')
  const selectStyle = { width: '100%', padding: '10px 12px', fontSize: 13, borderRadius: 8 } as const
  const secHead: React.CSSProperties = { gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid var(--border)', paddingBottom: 6, marginTop: 10 }
  const secDot = (color: string): React.CSSProperties => ({ width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0 })

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button className="lt-icon-btn" onClick={mode === 'review' ? () => setMode('edit') : onGoBack} title={mode === 'review' ? 'Back to Edit' : 'Back to Workspace'} style={{ padding: 6 }}>
          <ArrowLeft size={18} />
        </button>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8 }}>
            {mode === 'review' ? <><FileText size={18} style={{ color: '#0f8fa8' }} /> Review Rate</> : <><DollarSign size={18} style={{ color: '#0f8fa8' }} /> Record Rate</>}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
            {mode === 'review'
              ? 'Verify the details below. Click Back to make changes, or Confirm to save.'
              : 'Add a new rate to the database — select rate type and fill in the details.'}
          </div>
        </div>
      </div>

      {/* Form / Review */}
      <div style={{ background: 'var(--bg-card, #fff)', border: '1px solid var(--border)', borderRadius: 10, padding: 18 }}>

        {mode === 'edit' && <>
        {/* Rate Type Selector */}
        <div style={{ marginBottom: 14 }}>
          <label style={FIELD_LABEL}>Rate Type <span style={{ color: '#dc2626' }}>*</span></label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
            {(['Tariff Rate', 'Contracted', 'NAC'] as RateSourceType[]).map(t => (
              <button
                key={t}
                className="db-btn"
                style={{
                  fontSize: 11, padding: '5px 10px', borderRadius: 6,
                  background: rrType === t ? RATE_SOURCE_COLORS[t] : 'var(--bg-card)',
                  color: rrType === t ? '#fff' : 'var(--text-secondary)',
                  border: rrType === t ? `1px solid ${RATE_SOURCE_COLORS[t]}` : '1px solid var(--border)',
                }}
                onClick={() => setRrType(t)}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Entry mode toggle — only for Tariff Rate */}
        {rrType === 'Tariff Rate' && (
          <div style={{ marginBottom: 14 }}>
            <label style={FIELD_LABEL}>Entry Mode</label>
            <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
              {([['manual', 'Manual Entry'], ['bulk', 'Excel Upload']] as const).map(([key, label]) => (
                <button
                  key={key}
                  className="db-btn"
                  style={{
                    fontSize: 11, padding: '5px 10px', borderRadius: 6,
                    display: 'flex', alignItems: 'center', gap: 5,
                    background: entryMode === key ? '#0d9488' : 'var(--bg-card)',
                    color: entryMode === key ? '#fff' : 'var(--text-secondary)',
                    border: entryMode === key ? '1px solid #0d9488' : '1px solid var(--border)',
                  }}
                  onClick={() => setEntryMode(key)}
                >
                  {key === 'bulk' && <FileSpreadsheet size={12} />}
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ---- Bulk Upload UI ---- */}
        {rrType === 'Tariff Rate' && entryMode === 'bulk' && (
          <div style={{ marginBottom: 10 }}>
            {/* Liner, Month, Year selectors */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div>
                <label style={FIELD_LABEL}>Liner <span style={{ color: '#dc2626' }}>*</span></label>
                <select style={{ ...INPUT_STYLE, padding: '10px 12px', fontSize: 13, borderRadius: 8 }}
                        value={bulkLinerId} onChange={e => setBulkLinerId(e.target.value === '' ? '' : Number(e.target.value))}>
                  <option value="">— Select liner —</option>
                  {linerList.filter(l => ['ONE', 'PIL', 'LAEC', 'Standardized'].includes(l.name)).map(l => <option key={l.lin_id} value={l.lin_id}>{linerDisplay(l)}{l.is_on_inttra ? ' (INTTRA)' : ''}{l.has_portal ? ' (Portal)' : ''}</option>)}
                </select>
              </div>
              <div>
                <label style={FIELD_LABEL}>Month <span style={{ color: '#dc2626' }}>*</span></label>
                <select style={{ ...INPUT_STYLE, padding: '10px 12px', fontSize: 13, borderRadius: 8 }}
                        value={bulkMonth} onChange={e => setBulkMonth(Number(e.target.value))}>
                  {['January','February','March','April','May','June','July','August','September','October','November','December'].map((m, i) => (
                    <option key={i + 1} value={i + 1}>{m}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={FIELD_LABEL}>Year <span style={{ color: '#dc2626' }}>*</span></label>
                <select style={{ ...INPUT_STYLE, padding: '10px 12px', fontSize: 13, borderRadius: 8 }}
                        value={bulkYear} onChange={e => setBulkYear(Number(e.target.value))}>
                  {Array.from({ length: 5 }, (_, i) => now.getFullYear() - 1 + i).map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Upload area */}
            <div style={{
              border: '2px dashed var(--border)', borderRadius: 10,
              padding: '20px 16px', marginBottom: 16, display: 'flex',
              alignItems: 'center', gap: 14, flexWrap: 'wrap',
              opacity: bulkLinerId === '' ? 0.5 : 1,
              pointerEvents: bulkLinerId === '' ? 'none' : 'auto',
            }}>
              <FileSpreadsheet size={20} style={{ color: '#0d9488' }} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>Upload tariff rate spreadsheet</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                  Columns: Origin, Destination, Container Type, Rate, Currency, Free Time, Max Weight, Note
                </div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                disabled={bulkUploading || bulkLinerId === ''}
                onChange={e => { const f = e.target.files?.[0]; if (f) handleBulkFile(f); e.target.value = '' }}
                style={{ fontSize: 12, marginLeft: 'auto' }}
              />
              {bulkUploading && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Reading...</span>}
              {bulkNote && <span style={{ fontSize: 12, color: '#0d9488' }}>{bulkNote}</span>}
            </div>
            {bulkLinerId === '' && <div style={{ fontSize: 11, color: '#d97706', marginTop: -10, marginBottom: 12 }}>Select a liner first to enable file upload</div>}

            {/* Preview table */}
            {bulkRows.length > 0 && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <strong style={{ fontSize: 14 }}>Preview ({bulkRows.length} rates)</strong>
                  <button className="db-btn" style={{ fontSize: 11, marginLeft: 'auto' }}
                          onClick={() => { setBulkRows([]); setBulkNote(''); if (fileInputRef.current) fileInputRef.current.value = '' }}>
                    Clear
                  </button>
                </div>
                <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: 8 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead>
                      <tr style={{ background: 'var(--bg)', borderBottom: '1px solid var(--border)' }}>
                        {['#', 'Origin', 'Destination', 'Liner', 'Container', 'Rate', 'Curr', 'Valid From', 'Valid To', 'Free Time', 'Weight', 'Note', ''].map((h, i) => (
                          <th key={i} style={{ padding: '8px 6px', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {bulkRows.map((r, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td style={{ padding: '6px', color: 'var(--text-muted)' }}>{i + 1}</td>
                          <td style={{ padding: '6px' }}>{r.origin}</td>
                          <td style={{ padding: '6px' }}>{r.destination}</td>
                          <td style={{ padding: '6px' }}>{r.liner}</td>
                          <td style={{ padding: '6px' }}>{r.container_type}</td>
                          <td style={{ padding: '6px', fontWeight: 600 }}>{r.rate}</td>
                          <td style={{ padding: '6px' }}>{r.currency}</td>
                          <td style={{ padding: '6px' }}>{r.valid_from}</td>
                          <td style={{ padding: '6px' }}>{r.valid_to}</td>
                          <td style={{ padding: '6px' }}>{r.free_time || '—'}</td>
                          <td style={{ padding: '6px' }}>{r.max_weight || '—'}</td>
                          <td style={{ padding: '6px', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.note || '—'}</td>
                          <td style={{ padding: '6px' }}>
                            <button className="lt-icon-btn" title="Remove" style={{ padding: 2 }} onClick={() => removeBulkRow(i)}>
                              <X size={12} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Save button */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
                  <button className="db-btn" style={{ fontSize: 12 }} onClick={onGoBack}>Cancel</button>
                  <button
                    className="db-btn primary"
                    style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12 }}
                    disabled={bulkSaving || bulkRows.length === 0 || bulkLinerId === ''}
                    onClick={handleBulkSave}
                  >
                    <Upload size={14} /> {bulkSaving ? 'Saving...' : `Save ${bulkRows.length} Tariff Rate(s)`}
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* ---- Tariff Rate fields (manual) ---- */}
        {rrType === 'Tariff Rate' && entryMode === 'manual' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
            {/* — Carrier & Service — */}
            <div style={secHead}><span style={secDot(RATE_SOURCE_COLORS['Tariff Rate'])} />Carrier & Service</div>
            <div>
              <label style={FIELD_LABEL}>Liner <span style={{ color: '#dc2626' }}>*</span></label>
              <select style={{ ...INPUT_STYLE, ...selectStyle }} value={rrLinerId} onChange={e => setRrLinerId(e.target.value === '' ? '' : Number(e.target.value))}>
                <option value="">— Select liner —</option>
                {linerList.map(l => <option key={l.lin_id} value={l.lin_id}>{linerDisplay(l)}{l.is_on_inttra ? ' (INTTRA)' : ''}{l.has_portal ? ' (Portal)' : ''}</option>)}
              </select>
            </div>
            <div>
              <label style={FIELD_LABEL}>Trade Lane <span style={{ color: '#dc2626' }}>*</span></label>
              <select style={{ ...INPUT_STYLE, ...selectStyle }} value={rrTradeLaneId} onChange={e => setRrTradeLaneId(e.target.value === '' ? '' : Number(e.target.value))}>
                <option value="">— Select trade lane —</option>
                {tradeLaneList.map(t => <option key={t.trln_id} value={t.trln_id}>{t.trln_name}</option>)}
              </select>
            </div>
            <div>
              <label style={FIELD_LABEL}>Salesperson</label>
              <select style={{ ...INPUT_STYLE, ...selectStyle }} value={rrSalesPersonId} onChange={e => setRrSalesPersonId(e.target.value === '' ? '' : Number(e.target.value))}>
                <option value="">— Select salesperson —</option>
                {dbEmployeeList.map(e => <option key={e.emp_id} value={e.emp_id}>{e.name}{e.desig ? ` (${e.desig})` : ''}</option>)}
              </select>
            </div>

            {/* — Route — */}
            <div style={secHead}><span style={secDot(RATE_SOURCE_COLORS['Tariff Rate'])} />Route</div>
            <div>
              <label style={FIELD_LABEL}>Origin <span style={{ color: '#dc2626' }}>*</span></label>
              <input list="rr-tr-ports-origin" style={INPUT_STYLE} value={rrOrigin} onChange={e => setRrOrigin(e.target.value)} placeholder="e.g. Colombo/Sri Lanka or LKCMB" />
              <datalist id="rr-tr-ports-origin">
                {portOptions(portList).map((o, i) => <option key={i} value={o.value} label={o.label} />)}
              </datalist>
            </div>
            <div>
              <label style={FIELD_LABEL}>Destination <span style={{ color: '#dc2626' }}>*</span></label>
              <input list="rr-tr-ports-dest" style={INPUT_STYLE} value={rrDestination} onChange={e => setRrDestination(e.target.value)} placeholder="e.g. Hamburg/Germany or DEHAM" />
              <datalist id="rr-tr-ports-dest">
                {portOptions(portList).map((o, i) => <option key={i} value={o.value} label={o.label} />)}
              </datalist>
            </div>
            <div>
              <label style={FIELD_LABEL}>Free Time (days)</label>
              <input type="number" style={INPUT_STYLE} value={rrFreeTime} onChange={e => setRrFreeTime(e.target.value)} min={0} placeholder="e.g. 14" />
            </div>
            <div>
              <label style={FIELD_LABEL}>Service Lane</label>
              <input list="rr-tr-service-lanes" style={INPUT_STYLE} value={rrServiceLane} onChange={e => setRrServiceLane(e.target.value)} placeholder="Type to filter..." />
              <datalist id="rr-tr-service-lanes">
                {tradeLaneList.map(t => <option key={t.trln_id} value={t.trln_name} />)}
              </datalist>
            </div>
            {/* — Validity — */}
            <div style={secHead}><span style={secDot(RATE_SOURCE_COLORS['Tariff Rate'])} />Validity</div>
            <div>
              <label style={FIELD_LABEL}>Valid From <span style={{ color: '#dc2626' }}>*</span></label>
              <input type="date" style={INPUT_STYLE} value={rrValidFrom} onChange={e => setRrValidFrom(e.target.value)} />
            </div>
            <div>
              <label style={FIELD_LABEL}>Valid To <span style={{ color: '#dc2626' }}>*</span></label>
              <input type="date" style={INPUT_STYLE} value={rrValidTo} onChange={e => setRrValidTo(e.target.value)} />
            </div>

            {/* — Container Rates — */}
            <div style={{ ...secHead, justifyContent: 'space-between' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={secDot(RATE_SOURCE_COLORS['Tariff Rate'])} />Container Rates</span>
              <button type="button" className="db-btn" style={{ fontSize: 10, padding: '2px 8px', display: 'flex', alignItems: 'center', gap: 3 }} onClick={addTariffContainer}><Plus size={11} /> Add</button>
            </div>
            <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr 1fr 0.65fr 28px', gap: 8 }}>
                <label style={{ ...FIELD_LABEL, margin: 0 }}>Container Type <span style={{ color: '#dc2626' }}>*</span></label>
                <label style={{ ...FIELD_LABEL, margin: 0 }}>Max Weight</label>
                <label style={{ ...FIELD_LABEL, margin: 0 }}>Rate <span style={{ color: '#dc2626' }}>*</span></label>
                <label style={{ ...FIELD_LABEL, margin: 0 }}>Currency</label>
                <div />
              </div>
              {rrTariffContainers.map((ct, idx) => (
                <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr 1fr 0.65fr 28px', gap: 8, alignItems: 'center' }}>
                  <select style={{ ...INPUT_STYLE, fontSize: 12, padding: '8px 10px', borderRadius: 8 }} value={ct.containerType} onChange={e => updateTariffContainer(idx, { containerType: e.target.value })}>
                    <option value="">— Select —</option>
                    <option value="20GP">20GP</option><option value="40GP">40GP</option><option value="40HC">40HC</option>
                    <option value="20 Reefer">20 Reefer</option><option value="40 Reefer">40 Reefer</option>
                    <option value="20 Flat Rack">20 Flat Rack</option><option value="40 Flat Rack">40 Flat Rack</option>
                    <option value="20 Open Tops">20 Open Tops</option><option value="40 Open Tops">40 Open Tops</option>
                  </select>
                  <input style={INPUT_STYLE} value={ct.weight} onChange={e => updateTariffContainer(idx, { weight: e.target.value })} placeholder="e.g. 28000 kg" />
                  <input type="number" style={INPUT_STYLE} value={ct.rate} onChange={e => updateTariffContainer(idx, { rate: e.target.value === '' ? '' : Number(e.target.value) })} min={0} placeholder="e.g. 2100.00" />
                  <select style={{ ...INPUT_STYLE, fontSize: 12, padding: '8px 6px', borderRadius: 8 }} value={ct.currency} onChange={e => updateTariffContainer(idx, { currency: e.target.value })}>
                    <option value="USD">USD</option><option value="EUR">EUR</option><option value="LKR">LKR</option><option value="GBP">GBP</option><option value="SGD">SGD</option>
                  </select>
                  <button type="button" className="lt-icon-btn" title="Remove" style={{ padding: 3, opacity: rrTariffContainers.length > 1 ? 1 : 0.3, cursor: rrTariffContainers.length > 1 ? 'pointer' : 'not-allowed' }} disabled={rrTariffContainers.length === 1} onClick={() => removeTariffContainer(idx)}>
                    <X size={13} />
                  </button>
                </div>
              ))}
            </div>

            {/* — Additional Information — */}
            <div style={secHead}><span style={secDot(RATE_SOURCE_COLORS['Tariff Rate'])} />Additional Information</div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={FIELD_LABEL}>Note</label>
              <input style={INPUT_STYLE} value={rrNote} onChange={e => setRrNote(e.target.value)} placeholder="Any notes..." />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={FIELD_LABEL}>Analysis Note</label>
              <input style={INPUT_STYLE} value={rrSpecialRemark} onChange={e => setRrSpecialRemark(e.target.value)} placeholder="Special remarks..." />
            </div>
          </div>
        )}

        {/* ---- Contracted fields ---- */}
        {rrType === 'Contracted' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
            {/* — Contract & Assignment — */}
            <div style={secHead}><span style={secDot(RATE_SOURCE_COLORS['Contracted'])} />Contract & Assignment</div>
            <div>
              <label style={FIELD_LABEL}>Contract Reference <span style={{ color: '#dc2626' }}>*</span></label>
              <input style={INPUT_STYLE} value={rrContractId} onChange={e => setRrContractId(e.target.value)} placeholder="Sent by the liner" />
            </div>
            <div>
              <label style={FIELD_LABEL}>Liner <span style={{ color: '#dc2626' }}>*</span></label>
              <select style={{ ...INPUT_STYLE, ...selectStyle }} value={rrLinerId} onChange={e => setRrLinerId(e.target.value === '' ? '' : Number(e.target.value))}>
                <option value="">— Select liner —</option>
                {linerList.map(l => <option key={l.lin_id} value={l.lin_id}>{linerDisplay(l)}{l.is_on_inttra ? ' (INTTRA)' : ''}{l.has_portal ? ' (Portal)' : ''}</option>)}
              </select>
            </div>
            <div>
              <label style={FIELD_LABEL}>Sales Person</label>
              <select style={{ ...INPUT_STYLE, ...selectStyle }} value={rrSalesPersonId} onChange={e => setRrSalesPersonId(e.target.value === '' ? '' : Number(e.target.value))}>
                <option value="">— Select salesperson —</option>
                {dbEmployeeList.map(e => <option key={e.emp_id} value={e.emp_id}>{e.name}{e.desig ? ` (${e.desig})` : ''}</option>)}
              </select>
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={FIELD_LABEL}>Applicable Customers</label>
              <TagInput
                values={rrApplicableCustomers}
                onChange={setRrApplicableCustomers}
                suggestions={dbClientList.map(c => c.name)}
                placeholder="Type to add customers..."
              />
            </div>

            {/* — Route — */}
            <div style={secHead}><span style={secDot(RATE_SOURCE_COLORS['Contracted'])} />Route</div>
            <div>
              <label style={FIELD_LABEL}>Origin <span style={{ color: '#dc2626' }}>*</span></label>
              <input list="rr-c-ports-origin" style={INPUT_STYLE} value={rrOrigin} onChange={e => setRrOrigin(e.target.value)} placeholder="e.g. Colombo/Sri Lanka or LKCMB" />
              <datalist id="rr-c-ports-origin">
                {portOptions(portList).map((o, i) => <option key={i} value={o.value} label={o.label} />)}
              </datalist>
            </div>
            <div>
              <label style={FIELD_LABEL}>Destination <span style={{ color: '#dc2626' }}>*</span></label>
              <input list="rr-c-ports-dest" style={INPUT_STYLE} value={rrDestination} onChange={e => setRrDestination(e.target.value)} placeholder="e.g. Hamburg/Germany or DEHAM" />
              <datalist id="rr-c-ports-dest">
                {portOptions(portList).map((o, i) => <option key={i} value={o.value} label={o.label} />)}
              </datalist>
            </div>
            <div>
              <label style={FIELD_LABEL}>Free Time (days)</label>
              <input type="number" style={INPUT_STYLE} value={rrFreeTime} onChange={e => setRrFreeTime(e.target.value)} min={0} placeholder="e.g. 14" />
            </div>
            <div>
              <label style={FIELD_LABEL}>Service Lane</label>
              <input list="rr-service-lanes" style={INPUT_STYLE} value={rrServiceLane} onChange={e => setRrServiceLane(e.target.value)} placeholder="Type to filter..." />
              <datalist id="rr-service-lanes">
                {tradeLaneList.map(t => <option key={t.trln_id} value={t.trln_name} />)}
              </datalist>
            </div>
            {/* — Validity — */}
            <div style={secHead}><span style={secDot(RATE_SOURCE_COLORS['Contracted'])} />Validity</div>
            <div>
              <label style={FIELD_LABEL}>Valid From <span style={{ color: '#dc2626' }}>*</span></label>
              <input type="date" style={INPUT_STYLE} value={rrValidFrom} onChange={e => setRrValidFrom(e.target.value)} />
            </div>
            <div>
              <label style={FIELD_LABEL}>Valid To <span style={{ color: '#dc2626' }}>*</span></label>
              <input type="date" style={INPUT_STYLE} value={rrValidTo} onChange={e => setRrValidTo(e.target.value)} />
            </div>

            {/* — Container Rates — */}
            <div style={{ ...secHead, justifyContent: 'space-between' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={secDot(RATE_SOURCE_COLORS['Contracted'])} />Container Rates</span>
              <button type="button" className="db-btn" style={{ fontSize: 10, padding: '2px 8px', display: 'flex', alignItems: 'center', gap: 3 }} onClick={addContractedContainer}><Plus size={11} /> Add</button>
            </div>
            <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.65fr 0.75fr 0.85fr 0.6fr 28px', gap: 8 }}>
                <label style={{ ...FIELD_LABEL, margin: 0 }}>Container Type <span style={{ color: '#dc2626' }}>*</span></label>
                <label style={{ ...FIELD_LABEL, margin: 0 }}>Contracted TUs</label>
                <label style={{ ...FIELD_LABEL, margin: 0 }}>Max Weight</label>
                <label style={{ ...FIELD_LABEL, margin: 0 }}>Rate <span style={{ color: '#dc2626' }}>*</span></label>
                <label style={{ ...FIELD_LABEL, margin: 0 }}>Currency</label>
                <div />
              </div>
              {rrContractedContainers.map((cc, idx) => (
                <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.65fr 0.75fr 0.85fr 0.6fr 28px', gap: 8, alignItems: 'center' }}>
                  <select style={{ ...INPUT_STYLE, fontSize: 12, padding: '8px 10px', borderRadius: 8 }} value={cc.containerType} onChange={e => updateContractedContainer(idx, { containerType: e.target.value })}>
                    <option value="">— Select —</option>
                    <option value="20GP">20GP</option><option value="40GP">40GP</option><option value="40HC">40HC</option>
                  </select>
                  <input type="number" style={INPUT_STYLE} value={cc.contractedVolume} onChange={e => updateContractedContainer(idx, { contractedVolume: e.target.value })} min={0} placeholder="e.g. 500" />
                  <input style={INPUT_STYLE} value={cc.weight} onChange={e => updateContractedContainer(idx, { weight: e.target.value })} placeholder="e.g. 28000 kg" />
                  <input type="number" style={INPUT_STYLE} value={cc.rate} onChange={e => updateContractedContainer(idx, { rate: e.target.value === '' ? '' : Number(e.target.value) })} min={0} placeholder="e.g. 2450.00" />
                  <select style={{ ...INPUT_STYLE, fontSize: 12, padding: '8px 6px', borderRadius: 8 }} value={cc.currency} onChange={e => updateContractedContainer(idx, { currency: e.target.value })}>
                    <option value="USD">USD</option><option value="EUR">EUR</option><option value="LKR">LKR</option><option value="GBP">GBP</option><option value="SGD">SGD</option>
                  </select>
                  <button type="button" className="lt-icon-btn" title="Remove" style={{ padding: 3, opacity: rrContractedContainers.length > 1 ? 1 : 0.3, cursor: rrContractedContainers.length > 1 ? 'pointer' : 'not-allowed' }} disabled={rrContractedContainers.length === 1} onClick={() => removeContractedContainer(idx)}>
                    <X size={13} />
                  </button>
                </div>
              ))}
            </div>

            {/* — Additional Information — */}
            <div style={secHead}><span style={secDot(RATE_SOURCE_COLORS['Contracted'])} />Additional Information</div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={FIELD_LABEL}>Note</label>
              <input style={INPUT_STYLE} value={rrNote} onChange={e => setRrNote(e.target.value)} placeholder="Any notes..." />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={FIELD_LABEL}>Analysis Note</label>
              <input style={INPUT_STYLE} value={rrSpecialRemark} onChange={e => setRrSpecialRemark(e.target.value)} placeholder="Special remarks..." />
            </div>
          </div>
        )}

        {/* ---- NAC fields ---- */}
        {rrType === 'NAC' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
            {/* — Customer & Reference — */}
            <div style={secHead}><span style={secDot(RATE_SOURCE_COLORS['NAC'])} />Customer & Reference</div>
            <div>
              <label style={FIELD_LABEL}>NAC Reference No</label>
              <input style={INPUT_STYLE} value={rrNacRefNo} onChange={e => setRrNacRefNo(e.target.value)} placeholder="e.g. NAC-2026-001" />
            </div>
            <div>
              <label style={FIELD_LABEL}>Customer Name <span style={{ color: '#dc2626' }}>*</span></label>
              <input list="rr-nac-clients" style={INPUT_STYLE} value={rrNacCustomerName} onChange={e => setRrNacCustomerName(e.target.value)} placeholder="Type to filter..." />
              <datalist id="rr-nac-clients">
                {dbClientList.map(c => <option key={c.cli_id} value={c.name} />)}
              </datalist>
            </div>
            <div>
              <label style={FIELD_LABEL}>Sales Person <span style={{ color: '#dc2626' }}>*</span></label>
              <select style={{ ...INPUT_STYLE, ...selectStyle }} value={rrSalesPersonId} onChange={e => setRrSalesPersonId(e.target.value === '' ? '' : Number(e.target.value))}>
                <option value="">— Select salesperson —</option>
                {dbEmployeeList.map(e => <option key={e.emp_id} value={e.emp_id}>{e.name}{e.desig ? ` (${e.desig})` : ''}</option>)}
              </select>
            </div>

            {/* — Carrier & Route — */}
            <div style={secHead}><span style={secDot(RATE_SOURCE_COLORS['NAC'])} />Carrier & Route</div>
            <div>
              <label style={FIELD_LABEL}>Liner <span style={{ color: '#dc2626' }}>*</span></label>
              <select style={{ ...INPUT_STYLE, ...selectStyle }} value={rrLinerId} onChange={e => setRrLinerId(e.target.value === '' ? '' : Number(e.target.value))}>
                <option value="">— Select liner —</option>
                {linerList.map(l => <option key={l.lin_id} value={l.lin_id}>{linerDisplay(l)}{l.is_on_inttra ? ' (INTTRA)' : ''}{l.has_portal ? ' (Portal)' : ''}</option>)}
              </select>
            </div>
            <div>
              <label style={FIELD_LABEL}>Origin <span style={{ color: '#dc2626' }}>*</span></label>
              <input list="rr-nac-ports-origin" style={INPUT_STYLE} value={rrOrigin} onChange={e => setRrOrigin(e.target.value)} placeholder="e.g. Colombo/Sri Lanka or LKCMB" />
              <datalist id="rr-nac-ports-origin">
                {portOptions(portList).map((o, i) => <option key={i} value={o.value} label={o.label} />)}
              </datalist>
            </div>
            <div>
              <label style={FIELD_LABEL}>Destination <span style={{ color: '#dc2626' }}>*</span></label>
              <input list="rr-nac-ports-dest" style={INPUT_STYLE} value={rrDestination} onChange={e => setRrDestination(e.target.value)} placeholder="e.g. Hamburg/Germany or DEHAM" />
              <datalist id="rr-nac-ports-dest">
                {portOptions(portList).map((o, i) => <option key={i} value={o.value} label={o.label} />)}
              </datalist>
            </div>
            <div>
              <label style={FIELD_LABEL}>Free Time (days)</label>
              <input type="number" style={INPUT_STYLE} value={rrFreeTime} onChange={e => setRrFreeTime(e.target.value)} min={0} placeholder="e.g. 14" />
            </div>

            {/* — Validity — */}
            <div style={secHead}><span style={secDot(RATE_SOURCE_COLORS['NAC'])} />Validity</div>
            <div>
              <label style={FIELD_LABEL}>Valid From <span style={{ color: '#dc2626' }}>*</span></label>
              <input type="date" style={INPUT_STYLE} value={rrValidFrom} onChange={e => setRrValidFrom(e.target.value)} />
            </div>
            <div>
              <label style={FIELD_LABEL}>Valid To <span style={{ color: '#dc2626' }}>*</span></label>
              <input type="date" style={INPUT_STYLE} value={rrValidTo} onChange={e => setRrValidTo(e.target.value)} />
            </div>

            {/* — Container Rates — */}
            <div style={{ ...secHead, justifyContent: 'space-between' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={secDot(RATE_SOURCE_COLORS['NAC'])} />Container Rates</span>
              <button type="button" className="db-btn" style={{ fontSize: 10, padding: '2px 8px', display: 'flex', alignItems: 'center', gap: 3 }} onClick={addNacContainer}><Plus size={11} /> Add</button>
            </div>
            <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.65fr 0.75fr 0.85fr 0.6fr 28px', gap: 8 }}>
                <label style={{ ...FIELD_LABEL, margin: 0 }}>Container Type <span style={{ color: '#dc2626' }}>*</span></label>
                <label style={{ ...FIELD_LABEL, margin: 0 }}>Contracted TUs</label>
                <label style={{ ...FIELD_LABEL, margin: 0 }}>Max Weight</label>
                <label style={{ ...FIELD_LABEL, margin: 0 }}>Rate <span style={{ color: '#dc2626' }}>*</span></label>
                <label style={{ ...FIELD_LABEL, margin: 0 }}>Currency</label>
                <div />
              </div>
              {rrNacContainers.map((nc, idx) => (
                <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.65fr 0.75fr 0.85fr 0.6fr 28px', gap: 8, alignItems: 'center' }}>
                  <select style={{ ...INPUT_STYLE, fontSize: 12, padding: '8px 10px', borderRadius: 8 }} value={nc.containerType} onChange={e => updateNacContainer(idx, { containerType: e.target.value })}>
                    <option value="">— Select —</option>
                    <option value="20GP">20GP</option><option value="40GP">40GP</option><option value="40HC">40HC</option>
                  </select>
                  <input type="number" style={INPUT_STYLE} value={nc.contractedVolume} onChange={e => updateNacContainer(idx, { contractedVolume: e.target.value })} min={0} placeholder="e.g. 500" />
                  <input style={INPUT_STYLE} value={nc.weight} onChange={e => updateNacContainer(idx, { weight: e.target.value })} placeholder="e.g. 28000 kg" />
                  <input type="number" style={INPUT_STYLE} value={nc.rate} onChange={e => updateNacContainer(idx, { rate: e.target.value === '' ? '' : Number(e.target.value) })} min={0} placeholder="e.g. 3200.00" />
                  <select style={{ ...INPUT_STYLE, fontSize: 12, padding: '8px 6px', borderRadius: 8 }} value={nc.currency} onChange={e => updateNacContainer(idx, { currency: e.target.value })}>
                    <option value="USD">USD</option><option value="EUR">EUR</option><option value="LKR">LKR</option><option value="GBP">GBP</option><option value="SGD">SGD</option>
                  </select>
                  <button type="button" className="lt-icon-btn" title="Remove" style={{ padding: 3, opacity: rrNacContainers.length > 1 ? 1 : 0.3, cursor: rrNacContainers.length > 1 ? 'pointer' : 'not-allowed' }} disabled={rrNacContainers.length === 1} onClick={() => removeNacContainer(idx)}>
                    <X size={13} />
                  </button>
                </div>
              ))}
            </div>

            {/* — Additional Information — */}
            <div style={secHead}><span style={secDot(RATE_SOURCE_COLORS['NAC'])} />Additional Information</div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={FIELD_LABEL}>Note</label>
              <input style={INPUT_STYLE} value={rrNote} onChange={e => setRrNote(e.target.value)} placeholder="Any notes..." />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={FIELD_LABEL}>Analysis Note</label>
              <input style={INPUT_STYLE} value={rrSpecialRemark} onChange={e => setRrSpecialRemark(e.target.value)} placeholder="Special remarks..." />
            </div>
          </div>
        )}


        {/* Edit Actions (manual mode only) */}
        {!(rrType === 'Tariff Rate' && entryMode === 'bulk') && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, borderTop: '1px solid var(--border)', paddingTop: 16, marginTop: 16 }}>
          <button className="db-btn" style={{ fontSize: 12 }} onClick={onGoBack}>Back to Workspace</button>
          <button
            className="db-btn primary"
            style={{
              display: 'flex', alignItems: 'center', gap: 5, fontSize: 12,
              opacity: canSave ? 1 : 0.5,
              cursor: canSave ? 'pointer' : 'not-allowed',
            }}
            disabled={!canSave}
            onClick={() => setMode('review')}
          >
            <FileText size={12} /> Review & Save
          </button>
        </div>
        )}
        </>}

        {/* ======== REVIEW MODE ======== */}
        {mode === 'review' && (() => {
          const accent = RATE_SOURCE_COLORS[rrType]
          const row = (label: string, value: string) => (
            <div className="ws-doc-row" style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{label}</span>
              <strong style={{ fontSize: 12, color: 'var(--text)' }}>{value || '—'}</strong>
            </div>
          )
          const containerRows = (arr: (TariffContainerRate | ContractedContainerRate)[]) =>
            arr.filter(c => c.rate !== '').map((c, i) => (
              <div key={i} style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 10, background: 'var(--bg)', marginTop: i > 0 ? 6 : 0 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Container {i + 1}</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px 16px', fontSize: 12 }}>
                  <span style={{ color: 'var(--text-muted)' }}>Type</span><strong>{c.containerType || '—'}</strong>
                  {'contractedVolume' in c && c.contractedVolume && <><span style={{ color: 'var(--text-muted)' }}>Contracted TUs</span><strong>{c.contractedVolume}</strong></>}
                  {c.weight && <><span style={{ color: 'var(--text-muted)' }}>Max Weight</span><strong>{c.weight}</strong></>}
                  <span style={{ color: 'var(--text-muted)' }}>Rate</span><strong>{c.rate} {c.currency}</strong>
                </div>
              </div>
            ))

          return <>
            {/* Rate type badge */}
            <div style={{ marginBottom: 16 }}>
              <span style={{ display: 'inline-block', padding: '4px 12px', borderRadius: 6, fontSize: 11, fontWeight: 700, color: '#fff', background: accent }}>{rrType}</span>
            </div>

            {/* Common fields */}
            <div style={{ marginBottom: 16 }}>
              {rrType === 'Tariff Rate' && <>
                <div style={secHead}><span style={secDot(accent)} />Carrier & Service</div>
                {row('Liner', linerName)}
                {row('Trade Lane', laneName)}
                {row('Salesperson', salesName)}
                {row('Service Lane', rrServiceLane)}
              </>}

              {rrType === 'Contracted' && <>
                <div style={secHead}><span style={secDot(accent)} />Contract & Assignment</div>
                {row('Contract Reference', rrContractId)}
                {row('Liner', linerName)}
                {row('Sales Person', salesName)}
                {row('Service Lane', rrServiceLane)}
                {rrApplicableCustomers.length > 0 && row('Applicable Customers', rrApplicableCustomers.join(', '))}
              </>}

              {rrType === 'NAC' && <>
                <div style={secHead}><span style={secDot(accent)} />Customer & Reference</div>
                {row('NAC Reference No', rrNacRefNo)}
                {row('Customer Name', rrNacCustomerName)}
                {row('Sales Person', salesName)}
                <div style={{ ...secHead, marginTop: 16 }}><span style={secDot(accent)} />Carrier</div>
                {row('Liner', linerName)}
              </>}
            </div>

            {/* Route */}
            <div style={{ marginBottom: 16 }}>
              <div style={secHead}><span style={secDot(accent)} />Route</div>
              {row('Origin', rrOrigin)}
              {row('Destination', rrDestination)}
              {row('Free Time', rrFreeTime ? `${rrFreeTime} days` : '—')}
            </div>

            {/* Validity */}
            <div style={{ marginBottom: 16 }}>
              <div style={secHead}><span style={secDot(accent)} />Validity</div>
              {row('Valid From', rrValidFrom)}
              {row('Valid To', rrValidTo)}
            </div>

            {/* Container Rates */}
            <div style={{ marginBottom: 16 }}>
              <div style={secHead}><span style={secDot(accent)} />Container Rates</div>
              {rrType === 'Tariff Rate' && containerRows(rrTariffContainers)}
              {rrType === 'Contracted' && containerRows(rrContractedContainers)}
              {rrType === 'NAC' && containerRows(rrNacContainers)}
            </div>

            {/* Additional Info */}
            {(rrNote || rrSpecialRemark) && <div style={{ marginBottom: 8 }}>
              <div style={secHead}><span style={secDot(accent)} />Additional Information</div>
              {rrNote && row('Note', rrNote)}
              {rrSpecialRemark && row('Analysis Note', rrSpecialRemark)}
            </div>}

            {/* Review Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, borderTop: '1px solid var(--border)', paddingTop: 16, marginTop: 16 }}>
              <button className="db-btn" style={{ fontSize: 12 }} onClick={() => setMode('edit')}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><ArrowLeft size={12} /> Back to Edit</span>
              </button>
              <button
                className="db-btn primary"
                style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, ...(saving ? { opacity: 0.6, cursor: 'wait' } : {}) }}
                onClick={handleSave}
                disabled={saving}
              >
                <Check size={12} /> {saving ? 'Saving…' : 'Confirm & Save'}
              </button>
            </div>
          </>
        })()}
      </div>
    </div>
  )
}
