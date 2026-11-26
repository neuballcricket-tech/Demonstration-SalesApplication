import { useState, useEffect, useMemo, type ReactNode } from 'react'
import { ArrowLeft, Check, DollarSign, FileText, FileSpreadsheet, Plus, Upload, X } from 'lucide-react'
import {
  RATE_SOURCE_COLORS, portOptions, linerDisplay,
  type PortRecord, type LinerRecord, type TradeLaneRecord, type EmployeeRecord, type ClientRecord,
  type RateSourceType,
} from '../../types'
import { apiGetPorts, apiGetLiners, apiGetTradeLanes, apiGetEmployeesDb, apiGetClientsDb, apiCreateTariffRate, apiCreateContractedRate, apiCreateNacRate, apiPreviewBulkTariffRates, apiBulkCreateTariffRates, BACKEND_ACTOR_ID, type BulkTariffPreviewRow } from '../../api'
import TagInput from '../shared/TagInput'
import { Button, ComboBox, DatePicker, Field, FileButton, Input, NumberInput, Select, Tooltip, type ComboBoxItem, type Option } from '../ui'
import { labelClass } from '../ui/controlStyles'
import { cn } from '../../lib/cn'

/** Drops empty and repeated values (ComboBox items are keyed by value). */
const uniqueItems = (items: ComboBoxItem[]): ComboBoxItem[] => {
  const seen = new Set<string>()
  return items.filter(item => {
    if (!item.value || seen.has(item.value)) return false
    seen.add(item.value)
    return true
  })
}

const TARIFF_CONTAINER_OPTIONS: Option[] = ['20GP', '40GP', '40HC', '20 Reefer', '40 Reefer', '20 Flat Rack', '40 Flat Rack', '20 Open Tops', '40 Open Tops'].map(v => ({ value: v, label: v }))
const CONTRACTED_CONTAINER_OPTIONS: Option[] = ['20GP', '40GP', '40HC'].map(v => ({ value: v, label: v }))
const CURRENCY_OPTIONS: Option[] = ['USD', 'EUR', 'LKR', 'GBP', 'SGD'].map(v => ({ value: v, label: v }))
const MONTH_OPTIONS: Option[] = ['January','February','March','April','May','June','July','August','September','October','November','December'].map((m, i) => ({ value: String(i + 1), label: m }))

/** Section heading with a dot in the rate type's colour. */
function SectionHead({ color, className, action, children }: { color: string; className?: string; action?: ReactNode; children: ReactNode }) {
  return (
    <div className={cn('col-span-full mt-2 flex items-center gap-2 border-b border-line-soft pb-2 text-label font-bold uppercase tracking-label text-fg-muted', className)}>
      <span className="size-1.5 shrink-0 rounded-full" style={{ background: color }} />
      {children}
      {action && <span className="ml-auto">{action}</span>}
    </div>
  )
}

/** Icon-only "Remove" button. The tooltip is left off while disabled: a disabled button cannot be focused or hovered. */
function RemoveButton({ label, size = 'md', disabled, onClick }: { label: string; size?: 'sm' | 'md'; disabled?: boolean; onClick: () => void }) {
  const button = (
    <Button variant="ghost" size={size} className={size === 'sm' ? 'w-7 px-0' : 'w-8 px-0'} icon={<X size={14} aria-hidden="true" />} aria-label={label} disabled={disabled} onClick={onClick} />
  )
  return disabled ? button : <Tooltip content="Remove">{button}</Tooltip>
}

/** Column heading above the container-rate rows. */
function ColumnLabel({ required, children }: { required?: boolean; children: ReactNode }) {
  return (
    <span className={labelClass}>
      {children}
      {required && <span aria-hidden="true" className="ml-0.5 text-danger">*</span>}
    </span>
  )
}

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

  // Options for the shared controls
  const linerOptions: Option[] = linerList.map(l => ({ value: String(l.lin_id), label: `${linerDisplay(l)}${l.is_on_inttra ? ' (INTTRA)' : ''}${l.has_portal ? ' (Portal)' : ''}` }))
  const bulkLinerOptions = linerOptions.filter((_, i) => ['ONE', 'PIL', 'LAEC', 'Standardized'].includes(linerList[i].name))
  const tradeLaneOptions: Option[] = tradeLaneList.map(t => ({ value: String(t.trln_id), label: t.trln_name }))
  const salesOptions: Option[] = dbEmployeeList.map(e => ({ value: String(e.emp_id), label: `${e.name}${e.desig ? ` (${e.desig})` : ''}` }))
  // Optional salesperson: the empty choice stays selectable
  const optionalSalesOptions: Option[] = [{ value: '', label: '— Select salesperson —' }, ...salesOptions]
  const yearOptions: Option[] = Array.from({ length: 5 }, (_, i) => now.getFullYear() - 1 + i).map(y => ({ value: String(y), label: String(y) }))
  const portItems = useMemo(() => uniqueItems(portOptions(portList).map(o => ({ value: o.value, description: o.label }))), [portList])
  const serviceLaneItems = uniqueItems(tradeLaneList.map(t => ({ value: t.trln_name })))
  const clientItems = uniqueItems(dbClientList.map(c => ({ value: c.name })))
  const toId = (v: string): number | '' => v === '' ? '' : Number(v)

  return (
    <div className="mx-auto max-w-[1200px] p-6">
      {/* Header */}
      <div className="mb-5 flex items-center gap-3">
        <Tooltip content={mode === 'review' ? 'Back to Edit' : 'Back to Workspace'}>
          <Button
            size="sm"
            className="w-7 px-0"
            icon={<ArrowLeft size={16} aria-hidden="true" />}
            aria-label={mode === 'review' ? 'Back to Edit' : 'Back to Workspace'}
            onClick={mode === 'review' ? () => setMode('edit') : onGoBack}
          />
        </Tooltip>
        <div>
          <div className="flex items-center gap-2 text-title font-bold text-fg">
            {mode === 'review' ? <><FileText size={18} className="text-primary" aria-hidden="true" /> Review Rate</> : <><DollarSign size={18} className="text-primary" aria-hidden="true" /> Record Rate</>}
          </div>
          <div className="mt-0.5 text-control text-fg-muted">
            {mode === 'review'
              ? 'Verify the details below. Click Back to make changes, or Confirm to save.'
              : 'Add a new rate to the database — select rate type and fill in the details.'}
          </div>
        </div>
      </div>

      {/* Form / Review */}
      <div className="rounded-card border border-line-soft bg-surface p-4">

        {mode === 'edit' && <>
        {/* Rate Type Selector */}
        <div className="mb-4 flex flex-col gap-1">
          <span id="rr-rate-type-label" className={labelClass}>Rate Type<span aria-hidden="true" className="ml-0.5 text-danger">*</span></span>
          <div role="group" aria-labelledby="rr-rate-type-label" className="flex flex-wrap gap-2">
            {(['Tariff Rate', 'Contracted', 'NAC'] as RateSourceType[]).map(t => (
              <Button
                key={t}
                size="sm"
                aria-pressed={rrType === t}
                className={cn(rrType === t && 'text-white')}
                style={rrType === t ? { background: RATE_SOURCE_COLORS[t], borderColor: RATE_SOURCE_COLORS[t] } : undefined}
                onClick={() => setRrType(t)}
              >
                {t}
              </Button>
            ))}
          </div>
        </div>

        {/* Entry mode toggle — only for Tariff Rate */}
        {rrType === 'Tariff Rate' && (
          <div className="mb-4 flex flex-col gap-1">
            <span id="rr-entry-mode-label" className={labelClass}>Entry Mode</span>
            <div role="group" aria-labelledby="rr-entry-mode-label" className="flex gap-2">
              {([['manual', 'Manual Entry'], ['bulk', 'Excel Upload']] as const).map(([key, label]) => (
                <Button
                  key={key}
                  size="sm"
                  aria-pressed={entryMode === key}
                  className={cn(entryMode === key && 'border-primary bg-primary text-white hover:bg-primary-hover')}
                  icon={key === 'bulk' ? <FileSpreadsheet size={14} aria-hidden="true" /> : undefined}
                  onClick={() => setEntryMode(key)}
                >
                  {label}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* ---- Bulk Upload UI ---- */}
        {rrType === 'Tariff Rate' && entryMode === 'bulk' && (
          <div className="mb-3">
            {/* Liner, Month, Year selectors */}
            <div className="mb-4 grid grid-cols-3 gap-4">
              <Field label="Liner" required>
                {ids => <Select {...ids} value={String(bulkLinerId)} onChange={v => setBulkLinerId(toId(v))} placeholder="— Select liner —" options={bulkLinerOptions} />}
              </Field>
              <Field label="Month" required>
                {ids => <Select {...ids} value={String(bulkMonth)} onChange={v => setBulkMonth(Number(v))} placeholder="— Select —" options={MONTH_OPTIONS} />}
              </Field>
              <Field label="Year" required>
                {ids => <Select {...ids} value={String(bulkYear)} onChange={v => setBulkYear(Number(v))} placeholder="— Select —" options={yearOptions} />}
              </Field>
            </div>

            {/* Upload area */}
            <div className={cn(
              'mb-4 flex flex-wrap items-center gap-4 rounded-card border-2 border-dashed border-line px-4 py-5',
              bulkLinerId === '' && 'pointer-events-none opacity-50',
            )}>
              <FileSpreadsheet size={20} className="text-accent" aria-hidden="true" />
              <div>
                <div className="text-control font-semibold text-fg">Upload tariff rate spreadsheet</div>
                <div className="mt-0.5 text-label text-fg-muted">
                  Columns: Origin, Destination, Container Type, Rate, Currency, Free Time, Max Weight, Note
                </div>
              </div>
              <FileButton
                className="ml-auto"
                accept=".xlsx,.xls"
                isDisabled={bulkUploading || bulkLinerId === ''}
                onSelect={files => { const f = files[0]; if (f) handleBulkFile(f) }}
              >
                Choose File
              </FileButton>
              {bulkUploading && <span className="text-control text-fg-muted">Reading...</span>}
              {bulkNote && <span className="text-control text-accent">{bulkNote}</span>}
            </div>
            {bulkLinerId === '' && <div className="-mt-3 mb-3 text-label text-warning">Select a liner first to enable file upload</div>}

            {/* Preview table */}
            {bulkRows.length > 0 && (
              <>
                <div className="mb-3 flex items-center gap-3">
                  <strong className="text-body text-fg">Preview ({bulkRows.length} rates)</strong>
                  <Button size="sm" className="ml-auto" onClick={() => { setBulkRows([]); setBulkNote('') }}>
                    Clear
                  </Button>
                </div>
                <div className="overflow-x-auto rounded-card border border-line-soft">
                  <table className="w-full border-collapse text-control">
                    <thead>
                      <tr className="border-b border-line-soft bg-canvas">
                        {['#', 'Origin', 'Destination', 'Liner', 'Container', 'Rate', 'Curr', 'Valid From', 'Valid To', 'Free Time', 'Weight', 'Note', ''].map((h, i) => (
                          <th key={i} className="whitespace-nowrap px-2 py-2 text-left font-semibold text-fg-muted">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {bulkRows.map((r, i) => (
                        <tr key={i} className="border-b border-line-soft text-fg">
                          <td className="px-2 py-1 text-fg-muted">{i + 1}</td>
                          <td className="px-2 py-1">{r.origin}</td>
                          <td className="px-2 py-1">{r.destination}</td>
                          <td className="px-2 py-1">{r.liner}</td>
                          <td className="px-2 py-1">{r.container_type}</td>
                          <td className="px-2 py-1 font-semibold">{r.rate}</td>
                          <td className="px-2 py-1">{r.currency}</td>
                          <td className="px-2 py-1">{r.valid_from}</td>
                          <td className="px-2 py-1">{r.valid_to}</td>
                          <td className="px-2 py-1">{r.free_time || '—'}</td>
                          <td className="px-2 py-1">{r.max_weight || '—'}</td>
                          <td className="max-w-[120px] truncate px-2 py-1">{r.note || '—'}</td>
                          <td className="px-2 py-1">
                            <RemoveButton size="sm" label={`Remove row ${i + 1}`} onClick={() => removeBulkRow(i)} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Save button */}
                <div className="mt-4 flex justify-end gap-2">
                  <Button onClick={onGoBack}>Cancel</Button>
                  <Button
                    variant="primary"
                    isPending={bulkSaving}
                    icon={<Upload size={14} aria-hidden="true" />}
                    disabled={bulkRows.length === 0 || bulkLinerId === ''}
                    onClick={handleBulkSave}
                  >
                    {bulkSaving ? 'Saving...' : `Save ${bulkRows.length} Tariff Rate(s)`}
                  </Button>
                </div>
              </>
            )}
          </div>
        )}

        {/* ---- Tariff Rate fields (manual) ---- */}
        {rrType === 'Tariff Rate' && entryMode === 'manual' && (
          <div className="mb-3 grid grid-cols-2 gap-x-4 gap-y-3">
            {/* — Carrier & Service — */}
            <SectionHead color={RATE_SOURCE_COLORS['Tariff Rate']}>Carrier & Service</SectionHead>
            <Field label="Liner" required>
              {ids => <Select {...ids} value={String(rrLinerId)} onChange={v => setRrLinerId(toId(v))} placeholder="— Select liner —" options={linerOptions} />}
            </Field>
            <Field label="Trade Lane" required>
              {ids => <Select {...ids} value={String(rrTradeLaneId)} onChange={v => setRrTradeLaneId(toId(v))} placeholder="— Select trade lane —" options={tradeLaneOptions} />}
            </Field>
            <Field label="Salesperson">
              {ids => <Select {...ids} value={String(rrSalesPersonId)} onChange={v => setRrSalesPersonId(toId(v))} options={optionalSalesOptions} />}
            </Field>

            {/* — Route — */}
            <SectionHead color={RATE_SOURCE_COLORS['Tariff Rate']}>Route</SectionHead>
            <Field label="Origin" required>
              {ids => <ComboBox {...ids} value={rrOrigin} onChange={setRrOrigin} items={portItems} placeholder="e.g. Colombo/Sri Lanka or LKCMB" />}
            </Field>
            <Field label="Destination" required>
              {ids => <ComboBox {...ids} value={rrDestination} onChange={setRrDestination} items={portItems} placeholder="e.g. Hamburg/Germany or DEHAM" />}
            </Field>
            <Field label="Free Time (days)">
              {ids => <NumberInput {...ids} value={rrFreeTime} onChange={e => setRrFreeTime(e.target.value)} min={0} placeholder="e.g. 14" />}
            </Field>
            <Field label="Service Lane">
              {ids => <ComboBox {...ids} value={rrServiceLane} onChange={setRrServiceLane} items={serviceLaneItems} placeholder="Type to filter..." />}
            </Field>
            {/* — Validity — */}
            <SectionHead color={RATE_SOURCE_COLORS['Tariff Rate']}>Validity</SectionHead>
            <Field label="Valid From" required>
              {ids => <DatePicker {...ids} value={rrValidFrom} onChange={setRrValidFrom} />}
            </Field>
            <Field label="Valid To" required>
              {ids => <DatePicker {...ids} value={rrValidTo} onChange={setRrValidTo} />}
            </Field>

            {/* — Container Rates — */}
            <SectionHead color={RATE_SOURCE_COLORS['Tariff Rate']} action={<Button size="sm" icon={<Plus size={14} aria-hidden="true" />} onClick={addTariffContainer}>Add</Button>}>Container Rates</SectionHead>
            <div className="col-span-full flex flex-col gap-2">
              <div className="grid grid-cols-[1.2fr_0.8fr_1fr_0.65fr_32px] gap-2">
                <ColumnLabel required>Container Type</ColumnLabel>
                <ColumnLabel>Max Weight</ColumnLabel>
                <ColumnLabel required>Rate</ColumnLabel>
                <ColumnLabel>Currency</ColumnLabel>
                <div />
              </div>
              {rrTariffContainers.map((ct, idx) => (
                <div key={idx} className="grid grid-cols-[1.2fr_0.8fr_1fr_0.65fr_32px] items-center gap-2">
                  <Select aria-label={`Container type, row ${idx + 1}`} value={ct.containerType} onChange={v => updateTariffContainer(idx, { containerType: v })} placeholder="— Select —" options={TARIFF_CONTAINER_OPTIONS} />
                  <Input aria-label={`Max weight, row ${idx + 1}`} value={ct.weight} onChange={e => updateTariffContainer(idx, { weight: e.target.value })} placeholder="e.g. 28000 kg" />
                  <NumberInput aria-label={`Rate, row ${idx + 1}`} value={ct.rate} onChange={e => updateTariffContainer(idx, { rate: e.target.value === '' ? '' : Number(e.target.value) })} min={0} placeholder="e.g. 2100.00" />
                  <Select aria-label={`Currency, row ${idx + 1}`} value={ct.currency} onChange={v => updateTariffContainer(idx, { currency: v })} placeholder="— Select —" options={CURRENCY_OPTIONS} />
                  <RemoveButton label={`Remove row ${idx + 1}`} disabled={rrTariffContainers.length === 1} onClick={() => removeTariffContainer(idx)} />
                </div>
              ))}
            </div>

            {/* — Additional Information — */}
            <SectionHead color={RATE_SOURCE_COLORS['Tariff Rate']}>Additional Information</SectionHead>
            <Field label="Note" className="col-span-full">
              {ids => <Input {...ids} value={rrNote} onChange={e => setRrNote(e.target.value)} placeholder="Any notes..." />}
            </Field>
            <Field label="Analysis Note" className="col-span-full">
              {ids => <Input {...ids} value={rrSpecialRemark} onChange={e => setRrSpecialRemark(e.target.value)} placeholder="Special remarks..." />}
            </Field>
          </div>
        )}

        {/* ---- Contracted fields ---- */}
        {rrType === 'Contracted' && (
          <div className="mb-3 grid grid-cols-2 gap-x-4 gap-y-3">
            {/* — Contract & Assignment — */}
            <SectionHead color={RATE_SOURCE_COLORS['Contracted']}>Contract & Assignment</SectionHead>
            <Field label="Contract Reference" required>
              {ids => <Input {...ids} value={rrContractId} onChange={e => setRrContractId(e.target.value)} placeholder="Sent by the liner" />}
            </Field>
            <Field label="Liner" required>
              {ids => <Select {...ids} value={String(rrLinerId)} onChange={v => setRrLinerId(toId(v))} placeholder="— Select liner —" options={linerOptions} />}
            </Field>
            <Field label="Sales Person">
              {ids => <Select {...ids} value={String(rrSalesPersonId)} onChange={v => setRrSalesPersonId(toId(v))} options={optionalSalesOptions} />}
            </Field>
            <div className="col-span-full flex flex-col gap-1">
              <span className={labelClass}>Applicable Customers</span>
              <TagInput
                values={rrApplicableCustomers}
                onChange={setRrApplicableCustomers}
                suggestions={dbClientList.map(c => c.name)}
                placeholder="Type to add customers..."
              />
            </div>

            {/* — Route — */}
            <SectionHead color={RATE_SOURCE_COLORS['Contracted']}>Route</SectionHead>
            <Field label="Origin" required>
              {ids => <ComboBox {...ids} value={rrOrigin} onChange={setRrOrigin} items={portItems} placeholder="e.g. Colombo/Sri Lanka or LKCMB" />}
            </Field>
            <Field label="Destination" required>
              {ids => <ComboBox {...ids} value={rrDestination} onChange={setRrDestination} items={portItems} placeholder="e.g. Hamburg/Germany or DEHAM" />}
            </Field>
            <Field label="Free Time (days)">
              {ids => <NumberInput {...ids} value={rrFreeTime} onChange={e => setRrFreeTime(e.target.value)} min={0} placeholder="e.g. 14" />}
            </Field>
            <Field label="Service Lane">
              {ids => <ComboBox {...ids} value={rrServiceLane} onChange={setRrServiceLane} items={serviceLaneItems} placeholder="Type to filter..." />}
            </Field>
            {/* — Validity — */}
            <SectionHead color={RATE_SOURCE_COLORS['Contracted']}>Validity</SectionHead>
            <Field label="Valid From" required>
              {ids => <DatePicker {...ids} value={rrValidFrom} onChange={setRrValidFrom} />}
            </Field>
            <Field label="Valid To" required>
              {ids => <DatePicker {...ids} value={rrValidTo} onChange={setRrValidTo} />}
            </Field>

            {/* — Container Rates — */}
            <SectionHead color={RATE_SOURCE_COLORS['Contracted']} action={<Button size="sm" icon={<Plus size={14} aria-hidden="true" />} onClick={addContractedContainer}>Add</Button>}>Container Rates</SectionHead>
            <div className="col-span-full flex flex-col gap-2">
              <div className="grid grid-cols-[1.1fr_0.65fr_0.75fr_0.85fr_0.6fr_32px] gap-2">
                <ColumnLabel required>Container Type</ColumnLabel>
                <ColumnLabel>Contracted TUs</ColumnLabel>
                <ColumnLabel>Max Weight</ColumnLabel>
                <ColumnLabel required>Rate</ColumnLabel>
                <ColumnLabel>Currency</ColumnLabel>
                <div />
              </div>
              {rrContractedContainers.map((cc, idx) => (
                <div key={idx} className="grid grid-cols-[1.1fr_0.65fr_0.75fr_0.85fr_0.6fr_32px] items-center gap-2">
                  <Select aria-label={`Container type, row ${idx + 1}`} value={cc.containerType} onChange={v => updateContractedContainer(idx, { containerType: v })} placeholder="— Select —" options={CONTRACTED_CONTAINER_OPTIONS} />
                  <NumberInput aria-label={`Contracted TUs, row ${idx + 1}`} value={cc.contractedVolume} onChange={e => updateContractedContainer(idx, { contractedVolume: e.target.value })} min={0} placeholder="e.g. 500" />
                  <Input aria-label={`Max weight, row ${idx + 1}`} value={cc.weight} onChange={e => updateContractedContainer(idx, { weight: e.target.value })} placeholder="e.g. 28000 kg" />
                  <NumberInput aria-label={`Rate, row ${idx + 1}`} value={cc.rate} onChange={e => updateContractedContainer(idx, { rate: e.target.value === '' ? '' : Number(e.target.value) })} min={0} placeholder="e.g. 2450.00" />
                  <Select aria-label={`Currency, row ${idx + 1}`} value={cc.currency} onChange={v => updateContractedContainer(idx, { currency: v })} placeholder="— Select —" options={CURRENCY_OPTIONS} />
                  <RemoveButton label={`Remove row ${idx + 1}`} disabled={rrContractedContainers.length === 1} onClick={() => removeContractedContainer(idx)} />
                </div>
              ))}
            </div>

            {/* — Additional Information — */}
            <SectionHead color={RATE_SOURCE_COLORS['Contracted']}>Additional Information</SectionHead>
            <Field label="Note" className="col-span-full">
              {ids => <Input {...ids} value={rrNote} onChange={e => setRrNote(e.target.value)} placeholder="Any notes..." />}
            </Field>
            <Field label="Analysis Note" className="col-span-full">
              {ids => <Input {...ids} value={rrSpecialRemark} onChange={e => setRrSpecialRemark(e.target.value)} placeholder="Special remarks..." />}
            </Field>
          </div>
        )}

        {/* ---- NAC fields ---- */}
        {rrType === 'NAC' && (
          <div className="mb-3 grid grid-cols-2 gap-x-4 gap-y-3">
            {/* — Customer & Reference — */}
            <SectionHead color={RATE_SOURCE_COLORS['NAC']}>Customer & Reference</SectionHead>
            <Field label="NAC Reference No">
              {ids => <Input {...ids} value={rrNacRefNo} onChange={e => setRrNacRefNo(e.target.value)} placeholder="e.g. NAC-2026-001" />}
            </Field>
            <Field label="Customer Name" required>
              {ids => <ComboBox {...ids} value={rrNacCustomerName} onChange={setRrNacCustomerName} items={clientItems} placeholder="Type to filter..." />}
            </Field>
            <Field label="Sales Person" required>
              {ids => <Select {...ids} value={String(rrSalesPersonId)} onChange={v => setRrSalesPersonId(toId(v))} placeholder="— Select salesperson —" options={salesOptions} />}
            </Field>

            {/* — Carrier & Route — */}
            <SectionHead color={RATE_SOURCE_COLORS['NAC']}>Carrier & Route</SectionHead>
            <Field label="Liner" required>
              {ids => <Select {...ids} value={String(rrLinerId)} onChange={v => setRrLinerId(toId(v))} placeholder="— Select liner —" options={linerOptions} />}
            </Field>
            <Field label="Origin" required>
              {ids => <ComboBox {...ids} value={rrOrigin} onChange={setRrOrigin} items={portItems} placeholder="e.g. Colombo/Sri Lanka or LKCMB" />}
            </Field>
            <Field label="Destination" required>
              {ids => <ComboBox {...ids} value={rrDestination} onChange={setRrDestination} items={portItems} placeholder="e.g. Hamburg/Germany or DEHAM" />}
            </Field>
            <Field label="Free Time (days)">
              {ids => <NumberInput {...ids} value={rrFreeTime} onChange={e => setRrFreeTime(e.target.value)} min={0} placeholder="e.g. 14" />}
            </Field>

            {/* — Validity — */}
            <SectionHead color={RATE_SOURCE_COLORS['NAC']}>Validity</SectionHead>
            <Field label="Valid From" required>
              {ids => <DatePicker {...ids} value={rrValidFrom} onChange={setRrValidFrom} />}
            </Field>
            <Field label="Valid To" required>
              {ids => <DatePicker {...ids} value={rrValidTo} onChange={setRrValidTo} />}
            </Field>

            {/* — Container Rates — */}
            <SectionHead color={RATE_SOURCE_COLORS['NAC']} action={<Button size="sm" icon={<Plus size={14} aria-hidden="true" />} onClick={addNacContainer}>Add</Button>}>Container Rates</SectionHead>
            <div className="col-span-full flex flex-col gap-2">
              <div className="grid grid-cols-[1.1fr_0.65fr_0.75fr_0.85fr_0.6fr_32px] gap-2">
                <ColumnLabel required>Container Type</ColumnLabel>
                <ColumnLabel>Contracted TUs</ColumnLabel>
                <ColumnLabel>Max Weight</ColumnLabel>
                <ColumnLabel required>Rate</ColumnLabel>
                <ColumnLabel>Currency</ColumnLabel>
                <div />
              </div>
              {rrNacContainers.map((nc, idx) => (
                <div key={idx} className="grid grid-cols-[1.1fr_0.65fr_0.75fr_0.85fr_0.6fr_32px] items-center gap-2">
                  <Select aria-label={`Container type, row ${idx + 1}`} value={nc.containerType} onChange={v => updateNacContainer(idx, { containerType: v })} placeholder="— Select —" options={CONTRACTED_CONTAINER_OPTIONS} />
                  <NumberInput aria-label={`Contracted TUs, row ${idx + 1}`} value={nc.contractedVolume} onChange={e => updateNacContainer(idx, { contractedVolume: e.target.value })} min={0} placeholder="e.g. 500" />
                  <Input aria-label={`Max weight, row ${idx + 1}`} value={nc.weight} onChange={e => updateNacContainer(idx, { weight: e.target.value })} placeholder="e.g. 28000 kg" />
                  <NumberInput aria-label={`Rate, row ${idx + 1}`} value={nc.rate} onChange={e => updateNacContainer(idx, { rate: e.target.value === '' ? '' : Number(e.target.value) })} min={0} placeholder="e.g. 3200.00" />
                  <Select aria-label={`Currency, row ${idx + 1}`} value={nc.currency} onChange={v => updateNacContainer(idx, { currency: v })} placeholder="— Select —" options={CURRENCY_OPTIONS} />
                  <RemoveButton label={`Remove row ${idx + 1}`} disabled={rrNacContainers.length === 1} onClick={() => removeNacContainer(idx)} />
                </div>
              ))}
            </div>

            {/* — Additional Information — */}
            <SectionHead color={RATE_SOURCE_COLORS['NAC']}>Additional Information</SectionHead>
            <Field label="Note" className="col-span-full">
              {ids => <Input {...ids} value={rrNote} onChange={e => setRrNote(e.target.value)} placeholder="Any notes..." />}
            </Field>
            <Field label="Analysis Note" className="col-span-full">
              {ids => <Input {...ids} value={rrSpecialRemark} onChange={e => setRrSpecialRemark(e.target.value)} placeholder="Special remarks..." />}
            </Field>
          </div>
        )}


        {/* Edit Actions (manual mode only) */}
        {!(rrType === 'Tariff Rate' && entryMode === 'bulk') && (
        <div className="mt-4 flex justify-end gap-2 border-t border-line-soft pt-4">
          <Button onClick={onGoBack}>Back to Workspace</Button>
          <Button
            variant="primary"
            icon={<FileText size={14} aria-hidden="true" />}
            disabled={!canSave}
            onClick={() => setMode('review')}
          >
            Review & Save
          </Button>
        </div>
        )}
        </>}

        {/* ======== REVIEW MODE ======== */}
        {mode === 'review' && (() => {
          const accent = RATE_SOURCE_COLORS[rrType]
          const row = (label: string, value: string) => (
            <div className="flex justify-between border-b border-line-soft py-1 text-control">
              <span className="text-fg-muted">{label}</span>
              <strong className="font-bold text-fg">{value || '—'}</strong>
            </div>
          )
          const containerRows = (arr: (TariffContainerRate | ContractedContainerRate)[]) =>
            arr.filter(c => c.rate !== '').map((c, i) => (
              <div key={i} className={cn('rounded-card border border-line-soft bg-canvas p-3', i > 0 && 'mt-2')}>
                <div className="mb-1 text-label font-bold uppercase text-fg-muted">Container {i + 1}</div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-control text-fg">
                  <span className="text-fg-muted">Type</span><strong>{c.containerType || '—'}</strong>
                  {'contractedVolume' in c && c.contractedVolume && <><span className="text-fg-muted">Contracted TUs</span><strong>{c.contractedVolume}</strong></>}
                  {c.weight && <><span className="text-fg-muted">Max Weight</span><strong>{c.weight}</strong></>}
                  <span className="text-fg-muted">Rate</span><strong>{c.rate} {c.currency}</strong>
                </div>
              </div>
            ))

          return <>
            {/* Rate type badge */}
            <div className="mb-4">
              <span className="inline-block rounded-control px-3 py-1 text-label font-bold text-white" style={{ background: accent }}>{rrType}</span>
            </div>

            {/* Common fields */}
            <div className="mb-4">
              {rrType === 'Tariff Rate' && <>
                <SectionHead color={accent}>Carrier & Service</SectionHead>
                {row('Liner', linerName)}
                {row('Trade Lane', laneName)}
                {row('Salesperson', salesName)}
                {row('Service Lane', rrServiceLane)}
              </>}

              {rrType === 'Contracted' && <>
                <SectionHead color={accent}>Contract & Assignment</SectionHead>
                {row('Contract Reference', rrContractId)}
                {row('Liner', linerName)}
                {row('Sales Person', salesName)}
                {row('Service Lane', rrServiceLane)}
                {rrApplicableCustomers.length > 0 && row('Applicable Customers', rrApplicableCustomers.join(', '))}
              </>}

              {rrType === 'NAC' && <>
                <SectionHead color={accent}>Customer & Reference</SectionHead>
                {row('NAC Reference No', rrNacRefNo)}
                {row('Customer Name', rrNacCustomerName)}
                {row('Sales Person', salesName)}
                <SectionHead color={accent} className="mt-4">Carrier</SectionHead>
                {row('Liner', linerName)}
              </>}
            </div>

            {/* Route */}
            <div className="mb-4">
              <SectionHead color={accent}>Route</SectionHead>
              {row('Origin', rrOrigin)}
              {row('Destination', rrDestination)}
              {row('Free Time', rrFreeTime ? `${rrFreeTime} days` : '—')}
            </div>

            {/* Validity */}
            <div className="mb-4">
              <SectionHead color={accent}>Validity</SectionHead>
              {row('Valid From', rrValidFrom)}
              {row('Valid To', rrValidTo)}
            </div>

            {/* Container Rates */}
            <div className="mb-4">
              <SectionHead color={accent} className="mb-2">Container Rates</SectionHead>
              {rrType === 'Tariff Rate' && containerRows(rrTariffContainers)}
              {rrType === 'Contracted' && containerRows(rrContractedContainers)}
              {rrType === 'NAC' && containerRows(rrNacContainers)}
            </div>

            {/* Additional Info */}
            {(rrNote || rrSpecialRemark) && <div className="mb-2">
              <SectionHead color={accent}>Additional Information</SectionHead>
              {rrNote && row('Note', rrNote)}
              {rrSpecialRemark && row('Analysis Note', rrSpecialRemark)}
            </div>}

            {/* Review Actions */}
            <div className="mt-4 flex justify-end gap-2 border-t border-line-soft pt-4">
              <Button icon={<ArrowLeft size={14} aria-hidden="true" />} onClick={() => setMode('edit')}>
                Back to Edit
              </Button>
              <Button
                variant="primary"
                isPending={saving}
                icon={<Check size={14} aria-hidden="true" />}
                onClick={handleSave}
              >
                {saving ? 'Saving…' : 'Confirm & Save'}
              </Button>
            </div>
          </>
        })()}
      </div>
    </div>
  )
}
