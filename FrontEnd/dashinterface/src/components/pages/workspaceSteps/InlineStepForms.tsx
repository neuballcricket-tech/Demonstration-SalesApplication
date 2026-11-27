// InlineStepForms -- extracted from Workspace.tsx ternary chain
import React, { useId, type ReactNode } from "react"
import {
  AlertTriangle, Check, Paperclip, ClipboardPaste,
  FileText, Ship, ShieldCheck, X, User, Mail, Loader2, MessageSquare,
  Globe, MessageCircle, Copy, ClipboardCheck, Send, Clock, Search, ChevronDown, ChevronRight,
} from "lucide-react"
import { MOCK_OPEN_VOYAGES } from "../../../mockData"
import {
  ROLE_LABELS, daysUntil, linerDisplay, type UserRole,
  type Booking, type LinerRecord, type ReleaseOrderFields,
  type Inquiry, type ActivityEntry,
} from "../../../types"
import { apiGetQuotationFile, type KycPendingClient, type QuotationOptionRow, type UnsentQuotation } from "../../../api"
import type { CompletedRateRequest } from "../../../types"
import type { WorkspaceItem, BlContainerRow, MblContainerRow, QuotationOptionOverride } from "./types"
import { empName, openMailto, buildRateSection, generateQuotationPdf } from "./utils"
import { lookupQuotationId } from "./useWorkspaceActions"
import { Badge, Button, Checkbox, ComboBox, DatePicker, Field, FileButton, Input, Modal, NumberInput, Radio, RadioGroup, Select, Textarea, TimeField, Tooltip, type ComboBoxItem, type Option } from "../../ui"
import { labelClass } from "../../ui/controlStyles"
import { cn } from "../../../lib/cn"

export interface InlineStepFormsProps {
  selectedItem: WorkspaceItem
  actionModal: WorkspaceItem | null
  kycBrNumber: string; setKycBrNumber: (v: string) => void
  kycParentOrg: string; setKycParentOrg: (v: string) => void
  kycDeadline: string; setKycDeadline: (v: string) => void
  kycCliType: string; setKycCliType: (v: string) => void
  kycCurrency: string; setKycCurrency: (v: string) => void
  kycWebsite: string; setKycWebsite: (v: string) => void
  kycSvatNo: string; setKycSvatNo: (v: string) => void
  kycTaxExemptions: string; setKycTaxExemptions: (v: string) => void
  kycSeaImports: boolean; setKycSeaImports: (v: boolean) => void
  kycSeaExports: boolean; setKycSeaExports: (v: boolean) => void
  kycTradeLanes: boolean; setKycTradeLanes: (v: boolean) => void
  kycForwarding: boolean; setKycForwarding: (v: boolean) => void
  kycCrossTrade: boolean; setKycCrossTrade: (v: boolean) => void
  kycAirImports: boolean; setKycAirImports: (v: boolean) => void
  kycAirExports: boolean; setKycAirExports: (v: boolean) => void
  kycGeneralCargo: boolean; setKycGeneralCargo: (v: boolean) => void
  kycDangerousGoods: boolean; setKycDangerousGoods: (v: boolean) => void
  kycPerishableGoods: boolean; setKycPerishableGoods: (v: boolean) => void
  kycDocBrForm: string; setKycDocBrForm: (v: string) => void
  kycDocVatCert: string; setKycDocVatCert: (v: string) => void
  kycDocSvatCert: string; setKycDocSvatCert: (v: string) => void
  kycDocTinCert: string; setKycDocTinCert: (v: string) => void
  kycDocForm20: string; setKycDocForm20: (v: string) => void
  customerDecision: "accepted" | "rejected"; setCustomerDecision: (v: "accepted" | "rejected") => void
  quotationOptions: QuotationOptionRow[]; quotationOptionsLoading: boolean
  selectedOptionRateId: number | null; setSelectedOptionRateId: (v: number | null) => void
  selectedRateOptionIds: Set<number>; setSelectedRateOptionIds: React.Dispatch<React.SetStateAction<Set<number>>>
  bestRateOptionId: number | null; setBestRateOptionId: (v: number | null) => void
  optionOverrides: Record<number, QuotationOptionOverride>; setOptionOverrides: React.Dispatch<React.SetStateAction<Record<number, QuotationOptionOverride>>>
  quotationContent: string; setQuotationContent: React.Dispatch<React.SetStateAction<string>>
  quoteCopied: boolean; setQuoteCopied: (v: boolean) => void
  cutoffLiner: string; setCutoffLiner: (v: string) => void
  cutoffMode: "paste" | "upload"; setCutoffMode: (v: "paste" | "upload") => void
  cutoffContent: string; setCutoffContent: (v: string) => void
  cutoffFileName: string; setCutoffFileName: (v: string) => void
  cutoffNotes: string; setCutoffNotes: (v: string) => void
  cutoffSiDate: string; setCutoffSiDate: (v: string) => void
  cutoffBlDate: string; setCutoffBlDate: (v: string) => void
  cutoffVgmDate: string; setCutoffVgmDate: (v: string) => void
  cutoffFilingDate: string; setCutoffFilingDate: (v: string) => void
  roRefCollapsed: boolean; setRoRefCollapsed: (v: boolean) => void
  sendMethod: "email" | "whatsapp"; setSendMethod: (v: "email" | "whatsapp") => void
  waConfirmed: boolean; setWaConfirmed: (v: boolean) => void
  emailConfirmed: boolean; setEmailConfirmed: (v: boolean) => void
  draftCollapsed: boolean; setDraftCollapsed: (v: boolean | ((prev: boolean) => boolean)) => void
  customerContactEmail: string; setCustomerContactEmail: (v: string) => void
  customerContactPhone: string; setCustomerContactPhone: (v: string) => void
  vgmCertFileName: string; setVgmCertFileName: (v: string) => void
  vgmCertContent: string; setVgmCertContent: (v: string) => void
  paField: (key: string) => string; setPaField: (key: string, value: string) => void
  paCopied: boolean; setPaCopied: (v: boolean) => void
  releasePhase: "review" | "send"; setReleasePhase: (v: "review" | "send") => void
  releaseDraft: string; setReleaseDraft: (v: string) => void
  mkReleaseOrderDraft: (bkg: Booking, method: "email" | "whatsapp") => string
  roFields: ReleaseOrderFields; setRoFields: (v: ReleaseOrderFields | ((prev: ReleaseOrderFields) => ReleaseOrderFields)) => void
  linerBooked: "yes" | "no" | ""; setLinerBooked: (v: "yes" | "no" | "") => void
  siContent: string; setSiContent: (v: string) => void
  siFileName: string; setSiFileName: (v: string) => void
  siMode: "paste" | "upload"; setSiMode: (v: "paste" | "upload") => void
  inttraSiLoading: boolean
  siField: (key: string) => string; setSiField: (key: string, value: string) => void
  siIsNvocc: boolean
  siEmailShow: boolean; setSiEmailShow: (v: boolean) => void
  siEmailDraft: string; setSiEmailDraft: (v: string) => void
  siLinerEmail: string; setSiLinerEmail: (v: string) => void
  vesselScheduleType: "FCL" | "CONSOL" | "BOTH"; setVesselScheduleType: (v: "FCL" | "CONSOL" | "BOTH") => void
  formVessel: string; setFormVessel: (v: string) => void
  formVoyage: string; setFormVoyage: (v: string) => void
  vesselPol: string; setVesselPol: (v: string) => void
  vesselEtaPol: string; setVesselEtaPol: (v: string) => void
  vesselEtdPol: string; setVesselEtdPol: (v: string) => void
  vesselRoutingType: "DIRECT" | "TRANSSHIPMENT"; setVesselRoutingType: (v: "DIRECT" | "TRANSSHIPMENT") => void
  vesselFinalPod: string; setVesselFinalPod: (v: string) => void
  vesselEtaFpod: string; setVesselEtaFpod: (v: string) => void
  vesselRemarks: string; setVesselRemarks: (v: string) => void
  vesselAgent: string; setVesselAgent: (v: string) => void
  selectedReleaseOrderId: string; setSelectedReleaseOrderId: (v: string) => void
  showVesselSuggestions: boolean; setShowVesselSuggestions: (v: boolean) => void
  draftBlPhase: 1 | 2 | 3; setDraftBlPhase: (v: 1 | 2 | 3) => void
  vesselDropOpen: boolean; setVesselDropOpen: (v: boolean) => void
  voyageDropOpen: boolean; setVoyageDropOpen: (v: boolean) => void
  unknownVoyageWarning: { field: "vessel" | "voyage"; value: string } | null; setUnknownVoyageWarning: (v: { field: "vessel" | "voyage"; value: string } | null) => void
  vesselPickedRef: React.MutableRefObject<boolean>
  voyagePickedRef: React.MutableRefObject<boolean>
  bkgField: (key: string) => string; setBkgField: (key: string, value: string) => void
  hblField: (key: string) => string; setHblField: (key: string, value: string) => void
  hblContainers: BlContainerRow[]; setHblContainers: (v: BlContainerRow[]) => void
  hblCollapsed: Record<string, boolean>; toggleHblSection: (sectionId: string) => void
  mblField: (key: string) => string; setMblField: (key: string, value: string) => void
  mblContainers: MblContainerRow[]; setMblContainers: (v: MblContainerRow[]) => void
  mblSelectedHblIds: string[]; setMblSelectedHblIds: (v: string[] | ((prev: string[]) => string[])) => void
  mblHblSearch: string; setMblHblSearch: (v: string) => void
  bkShippingLine: string; setBkShippingLine: (v: string) => void
  bkContainerType: string; setBkContainerType: (v: string) => void
  bkQuantity: number; setBkQuantity: (v: number) => void
  bkContainers: { type: string; qty: number }[]; setBkContainers: (v: { type: string; qty: number }[] | ((prev: { type: string; qty: number }[]) => { type: string; qty: number }[])) => void
  bkCommodity: string; setBkCommodity: (v: string) => void
  bkCargoReadyDate: string; setBkCargoReadyDate: (v: string) => void
  bkVessel: string; setBkVessel: (v: string) => void
  bkVesselEtd: string; setBkVesselEtd: (v: string) => void
  bkVoyage: string; setBkVoyage: (v: string) => void
  bkPod: string; setBkPod: (v: string) => void
  bkContractNo: string; setBkContractNo: (v: string) => void
  bkAgreedRate: string; setBkAgreedRate: (v: string) => void
  bkRateRemark: string; setBkRateRemark: (v: string) => void
  bkDeliveryTerm: string; setBkDeliveryTerm: (v: string) => void
  bkHsCode: string; setBkHsCode: (v: string) => void
  bkBlType: "OBL" | "Seaway Bill" | ""; setBkBlType: (v: "OBL" | "Seaway Bill" | "") => void
  bkBookingType: "Spot" | "FAK" | ""; setBkBookingType: (v: "Spot" | "FAK" | "") => void
  bkReeferTemp: string; setBkReeferTemp: (v: string) => void
  bkDeliveryAgent: string; setBkDeliveryAgent: (v: string) => void
  bkSpecificRouting: string; setBkSpecificRouting: (v: string) => void
  bkRaNumber: string; setBkRaNumber: (v: string) => void
  formNote: string; setFormNote: (v: string) => void
  linerList: LinerRecord[]
  bookings: Booking[]
  vesselSchedules: import("../../../types").VesselSchedule[]
  unsentQuotations: UnsentQuotation[]
  lastQuotationId: number | null
  activeEmployee: { id: number; name: string }
  activeRole: string
  handleModalSubmit: () => void
  handleAction: (item: WorkspaceItem) => void
  onAddVesselSchedule: (vs: Omit<import("../../../types").VesselSchedule, "id">) => void
  onMarkBlVesselConfirmed: (bookingId: string) => void
  onMarkBlBookingCreated: (bookingId: string) => void
  onLogActivity: (entry: Omit<import("../../../types").ActivityEntry, "id" | "timestamp">) => void
  onFlash: (msg: string, action?: { label: string; onClick: () => void }) => void
  setActionModal: (item: WorkspaceItem | null) => void
  setVesselCreatedPrompt: (v: { vesselName: string; voyageNumber: string; pol: string; fpod: string; etdPol: string; etaFpod: string; bookingId: string } | null) => void
  setActiveStep: (v: string | null) => void
}

const KYC_CLIENT_TYPE_OPTIONS: Option[] = ['Shipper', 'Buyer', 'Agent', 'Trader'].map(v => ({ value: v, label: v }))
const KYC_CURRENCY_OPTIONS: Option[] = ['USD', 'LKR', 'EUR', 'GBP'].map(v => ({ value: v, label: v }))

/** Selected state of a toggle button in a group (Send Method). */
const SELECTED_TOGGLE = 'border-primary bg-primary text-white hover:bg-primary-hover'
/** Success state: the selected "Accepted" decision and "Download Quotation PDF" after the file was fetched. */
const SELECTED_SUCCESS = 'border-success bg-success text-white hover:bg-success'
/** Danger state: the selected "Rejected" decision. */
const SELECTED_DANGER = 'border-danger bg-danger text-white hover:bg-danger hover:opacity-90'
/** Column layout of the Prepare Quotation rate-option table (header and rows). */
const PQ_GRID = 'grid grid-cols-[48px_1fr_110px_80px_104px_80px_1fr]'

/** Navy title bar at the top of a step form. */
function StepHeader({ icon, title, subtitle, className }: { icon?: ReactNode; title: string; subtitle?: string; className?: string }) {
  return (
    <div className={cn('flex min-h-9 items-center gap-2 rounded-card bg-primary px-4 py-1 text-white', className)}>
      {icon}
      <h2 className="m-0 text-label font-bold uppercase tracking-label text-white">{title}</h2>
      {subtitle && <span className="ml-1 text-label text-white opacity-80">{subtitle}</span>}
    </div>
  )
}

/** Sub-heading above a group of fields. */
function SectionHead({ children }: { children: ReactNode }) {
  return (
    <h3 className="m-0 border-b border-line-soft pb-2 text-label font-bold uppercase tracking-label text-fg-muted">
      {children}
    </h3>
  )
}

/** Read-only value from the client registry (KYC). */
function RegistryValue({ label, strong, className, children }: { label: string; strong?: boolean; className?: string; children: ReactNode }) {
  return (
    <div className={className}>
      <div className="mb-0.5 text-label text-fg-muted">{label}</div>
      <div className={cn('text-control text-fg', strong && 'font-semibold')}>{children}</div>
    </div>
  )
}

/** Label-cell row of a summary table (Prepare Quotation, booking and release order details). */
function SummaryRow({ label, strong = true, className, children }: { label: string; strong?: boolean; className?: string; children: ReactNode }) {
  return (
    <div className={cn('grid grid-cols-[140px_1fr] border-b border-line-soft', className)}>
      <div className={cn(labelClass, 'flex items-center border-r border-line-soft bg-canvas px-3 py-2')}>{label}</div>
      <div className={cn('px-2.5 py-2 text-control text-fg', strong && 'font-semibold')}>{children}</div>
    </div>
  )
}

/** Collapsible release order summary above the Cut Offs and Cut Off Reminder forms. */
function ReleaseOrderReference({ ro, bkg, collapsed, onToggle }: { ro: ReleaseOrderFields; bkg: Booking; collapsed: boolean; onToggle: () => void }) {
  const rows: [string, string | undefined][] = [
    ['Reference No.', ro.reference_nbr],
    ['Pick Up Date', ro.pickup_empty_date],
    ['Valid Until', ro.validity_expiration_date],
    ['Depot', ro.pickup_depot],
    ['Depot Address', ro.pickup_depot_address],
    ['Vessel', bkg.vessel_name],
    ['Voyage', bkg.voyage_number],
    ['Cut-Off', ro.cut_off_date],
    ['ETD', ro.etd],
    ['ETA', ro.eta],
    ['Container', `${bkg.quantity}x ${bkg.container_type}`],
    ['Cargo', ro.cargo_description],
    ['Weight', ro.cargo_weight ? `${ro.cargo_weight} kg` : undefined],
  ]
  return (
    <div className="overflow-hidden rounded-card border border-line-soft">
      <button type="button" aria-expanded={!collapsed} onClick={onToggle}
        className="flex w-full items-center justify-between border-none bg-primary-subtle px-3 py-2 text-label hover:bg-surface-hover">
        <span className="flex items-center gap-1.5 font-bold uppercase tracking-label text-primary">
          <FileText size={12} aria-hidden="true" /> Release Order Reference
        </span>
        <span className="flex items-center gap-1.5">
          <span className="font-mono text-fg-muted">{ro.reference_nbr}</span>
          <ChevronDown size={14} aria-hidden="true" className={cn('text-primary transition-transform', collapsed && '-rotate-90')} />
        </span>
      </button>
      {!collapsed && (
        <div className="border-t border-line-soft">
          {rows.filter(([, v]) => v).map(([label, value]) => (
            <SummaryRow key={label} label={label} strong={false} className="last:border-b-0">{value}</SummaryRow>
          ))}
        </div>
      )}
    </div>
  )
}

/** Email / WhatsApp toggle group. */
function SendMethodToggle({ id, label, value, onSelect }: { id: string; label: string; value: 'email' | 'whatsapp'; onSelect: (m: 'email' | 'whatsapp') => void }) {
  return (
    <div className="flex flex-col gap-1">
      <span id={id} className={labelClass}>{label}</span>
      <div role="group" aria-labelledby={id} className="flex gap-2">
        <Button aria-pressed={value === 'email'} className={cn(value === 'email' && SELECTED_TOGGLE)}
          icon={<Mail size={14} aria-hidden="true" />} onClick={() => onSelect('email')}>
          Email
        </Button>
        <Button aria-pressed={value === 'whatsapp'} className={cn(value === 'whatsapp' && SELECTED_TOGGLE)}
          icon={<MessageCircle size={14} aria-hidden="true" />} onClick={() => onSelect('whatsapp')}>
          WhatsApp
        </Button>
      </div>
    </div>
  )
}

/** Single-choice group of toggle buttons whose labels are their values (Freight, Shipped on Board, Vessel Schedule Type). */
function ToggleGroup<T extends string>({ label, options, value, onSelect, stretch }: {
  label: string; options: readonly T[]; value: string; onSelect: (v: T) => void; stretch?: boolean
}) {
  const id = useId()
  return (
    <div className="flex flex-col gap-1">
      <span id={id} className={labelClass}>{label}</span>
      <div role="group" aria-labelledby={id} className="flex gap-2">
        {options.map(o => (
          <Button key={o} aria-pressed={value === o} className={cn(stretch && 'flex-1', value === o && SELECTED_TOGGLE)}
            onClick={() => onSelect(o)}>
            {o}
          </Button>
        ))}
      </div>
    </div>
  )
}

/** "I confirm that I have sent…" checkbox in a tinted box (info for email, success for WhatsApp). */
function ConfirmCheck({ tone, checked, onChange, hint, children }: { tone: 'info' | 'success'; checked: boolean; onChange: (v: boolean) => void; hint: string; children: ReactNode }) {
  return (
    <div className={cn('rounded-card border px-3.5 py-2.5', tone === 'info' ? 'border-info-line bg-info-bg' : 'border-success-line bg-success-bg')}>
      <Checkbox checked={checked} onChange={onChange} className="items-start">
        <span className="leading-4 text-fg-label">
          {children}
          <span className="mt-0.5 block text-label text-fg-muted">{hint}</span>
        </span>
      </Checkbox>
    </div>
  )
}

/** File picker plus the chosen file's name and a remove button. */
function FileAttach({ accept, label, fileName, onFile, onRemove, describedBy }: {
  accept: string; label: string; fileName: string; onFile: (file: File) => void; onRemove: () => void; describedBy?: string
}) {
  return (
    <div className="flex items-center gap-2">
      <FileButton accept={accept} aria-describedby={describedBy}
        onSelect={files => { const file = files[0]; if (file) onFile(file) }}>
        {fileName ? 'Replace file' : label}
      </FileButton>
      {fileName && (
        <div className="flex items-center gap-1.5 text-control">
          <FileText size={14} className="text-success" aria-hidden="true" />
          <span className="font-semibold text-fg">{fileName}</span>
          <Tooltip content="Remove file">
            <Button variant="ghost" size="sm" className="w-7 px-0" aria-label={`Remove ${fileName}`}
              icon={<X size={12} aria-hidden="true" />} onClick={onRemove} />
          </Tooltip>
        </div>
      )}
    </div>
  )
}

/** Headed two-column group of fields (Pre-Advice, Pre-Alert). */
function FormSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <SectionHead>{title}</SectionHead>
      <div className="grid grid-cols-2 gap-x-4 gap-y-3">{children}</div>
    </section>
  )
}

/** Section heading that shows or hides the fields below it (House BL, Master BL). */
function CollapsibleHead({ title, hint, collapsed, onToggle }: { title: string; hint?: string; collapsed: boolean; onToggle: () => void }) {
  return (
    <h3 className="m-0 border-b border-line-soft">
      <button type="button" aria-expanded={!collapsed} onClick={onToggle}
        className="flex w-full items-center gap-2 border-none bg-transparent px-0 pt-0 pb-2 text-left text-label">
        <span className="font-bold uppercase tracking-label text-primary">{title}</span>
        {hint && <span className="text-fg-muted">{hint}</span>}
        <ChevronDown size={14} aria-hidden="true" className={cn('ml-auto text-fg-muted transition-transform', collapsed && '-rotate-90')} />
      </button>
    </h3>
  )
}

/** Collapsible generated message. `action` (e.g. Copy) sits beside the toggle, shown while expanded. */
function DraftPanel({ title, collapsed, onToggle, action, children }: { title: string; collapsed: boolean; onToggle: () => void; action?: ReactNode; children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-card border border-line-soft">
      <div className="flex items-center gap-2 bg-canvas pr-2">
        <button type="button" aria-expanded={!collapsed} onClick={onToggle}
          className="flex flex-1 items-center justify-between border-none bg-transparent px-3 py-2 text-label hover:bg-surface-hover">
          <span className="font-bold uppercase tracking-label text-primary">{title}</span>
          <ChevronDown size={14} aria-hidden="true" className={cn('text-fg-muted transition-transform', collapsed && '-rotate-90')} />
        </button>
        {!collapsed && action}
      </div>
      {!collapsed && <div className="border-t border-line-soft p-3">{children}</div>}
    </div>
  )
}

/** Who handed the item over, and what they did. */
function ContextCard({ ctx }: { ctx: ActivityEntry }) {
  return (
    <div className="rounded-card border border-line-soft border-l-[3px] border-l-primary bg-surface px-4 py-3.5">
      <div className="mb-1 flex items-center gap-1.5">
        <User size={11} className="text-fg-muted" aria-hidden="true" />
        <span className="text-label font-semibold text-fg-label">
          {empName(ctx.actor_id)} ({ROLE_LABELS[ctx.actor_role]})
        </span>
      </div>
      <div className="text-control text-fg-label">{ctx.action}</div>
    </div>
  )
}

export default function InlineStepForms({
  selectedItem, actionModal,
  kycBrNumber, setKycBrNumber, kycParentOrg, setKycParentOrg, kycDeadline, setKycDeadline,
  kycCliType, setKycCliType, kycCurrency, setKycCurrency, kycWebsite, setKycWebsite,
  kycSvatNo, setKycSvatNo, kycTaxExemptions, setKycTaxExemptions,
  kycSeaImports, setKycSeaImports, kycSeaExports, setKycSeaExports,
  kycTradeLanes, setKycTradeLanes, kycForwarding, setKycForwarding,
  kycCrossTrade, setKycCrossTrade, kycAirImports, setKycAirImports,
  kycAirExports, setKycAirExports, kycGeneralCargo, setKycGeneralCargo,
  kycDangerousGoods, setKycDangerousGoods, kycPerishableGoods, setKycPerishableGoods,
  kycDocBrForm, setKycDocBrForm, kycDocVatCert, setKycDocVatCert,
  kycDocSvatCert, setKycDocSvatCert, kycDocTinCert, setKycDocTinCert,
  kycDocForm20, setKycDocForm20,
  customerDecision, setCustomerDecision, quotationOptions, quotationOptionsLoading,
  selectedOptionRateId, setSelectedOptionRateId,
  selectedRateOptionIds, setSelectedRateOptionIds,
  bestRateOptionId, setBestRateOptionId,
  optionOverrides, setOptionOverrides,
  quotationContent, setQuotationContent,
  quoteCopied, setQuoteCopied,
  cutoffLiner, setCutoffLiner, cutoffMode, setCutoffMode,
  cutoffContent, setCutoffContent, cutoffFileName, setCutoffFileName,
  cutoffNotes, setCutoffNotes, cutoffSiDate, setCutoffSiDate,
  setCutoffBlDate, cutoffVgmDate, setCutoffVgmDate,
  cutoffFilingDate, setCutoffFilingDate,
  roRefCollapsed, setRoRefCollapsed,
  sendMethod, setSendMethod, waConfirmed, setWaConfirmed,
  emailConfirmed, setEmailConfirmed, draftCollapsed, setDraftCollapsed,
  customerContactEmail, setCustomerContactEmail,
  customerContactPhone, setCustomerContactPhone,
  vgmCertFileName, setVgmCertFileName, setVgmCertContent,
  paField, setPaField, paCopied, setPaCopied,
  releasePhase, setReleasePhase, releaseDraft, setReleaseDraft, mkReleaseOrderDraft,
  roFields, setRoFields, linerBooked, setLinerBooked,
  siContent, setSiContent, siFileName, setSiFileName, siMode, setSiMode, inttraSiLoading,
  siField, setSiField, siIsNvocc, siEmailShow, setSiEmailShow,
  siEmailDraft, setSiEmailDraft, siLinerEmail, setSiLinerEmail,
  vesselScheduleType, setVesselScheduleType,
  formVessel, setFormVessel, formVoyage, setFormVoyage,
  vesselPol, setVesselPol, vesselEtaPol, setVesselEtaPol,
  vesselEtdPol, setVesselEtdPol, vesselRoutingType, setVesselRoutingType,
  vesselFinalPod, setVesselFinalPod, vesselEtaFpod, setVesselEtaFpod,
  vesselRemarks, setVesselRemarks, vesselAgent, setVesselAgent,
  selectedReleaseOrderId, setSelectedReleaseOrderId,
  voyageDropOpen, setVoyageDropOpen,
  showVesselSuggestions, setShowVesselSuggestions,
  unknownVoyageWarning, setUnknownVoyageWarning,
  vesselPickedRef, voyagePickedRef, bkgField, setBkgField,
  hblField, setHblField, hblContainers, setHblContainers,
  hblCollapsed, toggleHblSection,
  mblField, setMblField, setMblContainers,
  mblSelectedHblIds, setMblSelectedHblIds, mblHblSearch, setMblHblSearch,
  bkShippingLine, setBkShippingLine, 
  bkContainers, setBkContainers,
  bkCommodity, setBkCommodity, bkCargoReadyDate, setBkCargoReadyDate,
  bkVessel, setBkVessel, bkVesselEtd, setBkVesselEtd,
  bkVoyage, setBkVoyage, bkPod, setBkPod,
  bkContractNo, setBkContractNo, bkAgreedRate, setBkAgreedRate,
  bkRateRemark, setBkRateRemark, bkDeliveryTerm, setBkDeliveryTerm,
  bkHsCode, setBkHsCode, bkBlType, setBkBlType,
  bkBookingType, setBkBookingType, bkReeferTemp, setBkReeferTemp,
  bkDeliveryAgent, setBkDeliveryAgent, bkSpecificRouting, setBkSpecificRouting,
  bkRaNumber, setBkRaNumber, formNote, setFormNote,
  linerList, bookings, vesselSchedules, unsentQuotations, lastQuotationId, activeEmployee, activeRole,
  handleModalSubmit, handleAction,
  onAddVesselSchedule, onMarkBlVesselConfirmed, onMarkBlBookingCreated,
  onLogActivity, onFlash, setActionModal,
  setVesselCreatedPrompt, setActiveStep,
}: InlineStepFormsProps) {
  // PDF download state for send-to-customer step
  const [pdfDownloading, setPdfDownloading] = React.useState(false)
  const [pdfDownloaded, setPdfDownloaded] = React.useState(false)

  // Auto-initialise state when send-to-customer is auto-selected (no card click yet)
  React.useEffect(() => {
    if (selectedItem.actionKind === 'send-to-customer' && !actionModal) {
      handleAction(selectedItem)
    }
  }, [selectedItem.actionKind, selectedItem.refId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Regenerate the RATE OPTIONS section of the quotation draft when margins/selections change
  React.useEffect(() => {
    if (selectedItem.actionKind !== 'prepare-quotation' || !actionModal) return
    const { rateRequest: rr } = actionModal.sourceData as { rateRequest?: CompletedRateRequest }
    if (!rr) return

    const selectedArr = Array.from(selectedRateOptionIds)
    const rateSection = buildRateSection(rr, selectedArr, bestRateOptionId, linerList, actionModal.previousContext, optionOverrides)

    setQuotationContent(prev => {
      // Splice the updated RATE OPTIONS block into the existing quotation text
      const marker = '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
      const rateHeaderIdx = prev.indexOf('RATE OPTIONS')
      if (rateHeaderIdx === -1) return prev
      // Find the divider line after RATE OPTIONS header
      const afterHeader = prev.indexOf(marker, rateHeaderIdx)
      if (afterHeader === -1) return prev
      const sectionStart = afterHeader + marker.length + 1 // skip past the divider + newline
      // Find the next divider (marks the start of TERMS or next section)
      const sectionEnd = prev.indexOf(marker, sectionStart)
      if (sectionEnd === -1) return prev
      // Replace the content between the two dividers
      return prev.slice(0, sectionStart) + rateSection + '\n\n' + prev.slice(sectionEnd)
    })
    setQuoteCopied(false)
  }, [selectedRateOptionIds, bestRateOptionId, optionOverrides]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
{selectedItem.actionKind === 'send-kyc' && actionModal ? (() => {
  const kycClient = actionModal.sourceData.kycClient as KycPendingClient | undefined
  return (
    <div className="flex flex-col gap-4">
      <StepHeader icon={<ShieldCheck size={14} aria-hidden="true" />} title="KYC — CHECK DOCUMENTS" />

      {/* Pre-fetched client registry data */}
      {kycClient && (() => {
        const address = [kycClient.addr_street_ln, kycClient.addr_city, kycClient.addr_country].filter(Boolean).join(', ')
        return (
          <div className="rounded-card border border-line-soft border-l-[3px] border-l-accent bg-canvas px-3.5 py-3">
            <div className="mb-2.5 text-label font-bold uppercase tracking-label text-accent">From Client Registry</div>
            <div className="grid grid-cols-3 gap-x-4 gap-y-1.5">
              {kycClient.vat_no && <RegistryValue label="VAT No." strong>{kycClient.vat_no}</RegistryValue>}
              {kycClient.tin && <RegistryValue label="TIN" strong>{kycClient.tin}</RegistryValue>}
              {kycClient.credit_limit != null && <RegistryValue label="Credit Limit" strong>{kycClient.credit_limit.toLocaleString()}</RegistryValue>}
              {address && <RegistryValue label="Address" className="col-span-full">{address}</RegistryValue>}
            </div>
          </div>
        )
      })()}

      {/* Client Information */}
      <section className="flex flex-col gap-3">
        <SectionHead>Client Information</SectionHead>
        <div className="grid grid-cols-2 gap-x-4 gap-y-3">
          <Field label="Customer">
            {ids => <Input {...ids} value={actionModal.customerName} disabled />}
          </Field>
          <Field label="BR Number" required>
            {ids => <Input {...ids} value={kycBrNumber} onChange={e => setKycBrNumber(e.target.value)} placeholder="e.g. PV 12345" autoFocus />}
          </Field>
          <Field label="Parent Organisation">
            {ids => <Input {...ids} value={kycParentOrg} onChange={e => setKycParentOrg(e.target.value)} placeholder="If subsidiary, enter parent name" />}
          </Field>
          <Field label="Client Type" required>
            {ids => <Select {...ids} value={kycCliType} onChange={setKycCliType} placeholder="Select type..." options={KYC_CLIENT_TYPE_OPTIONS} />}
          </Field>
          <Field label="Currency" required>
            {ids => <Select {...ids} value={kycCurrency} onChange={setKycCurrency} options={KYC_CURRENCY_OPTIONS} />}
          </Field>
          <Field label="Document Submission Deadline" required>
            {ids => <DatePicker {...ids} value={kycDeadline} onChange={setKycDeadline} />}
          </Field>
          <Field label="Website">
            {ids => <Input {...ids} value={kycWebsite} onChange={e => setKycWebsite(e.target.value)} placeholder="https://..." />}
          </Field>
          <Field label="SVAT No.">
            {ids => <Input {...ids} value={kycSvatNo} onChange={e => setKycSvatNo(e.target.value)} placeholder="SVAT registration number" />}
          </Field>
          <Field label="Tax Exemptions" className="col-span-full">
            {ids => <Input {...ids} value={kycTaxExemptions} onChange={e => setKycTaxExemptions(e.target.value)} placeholder="e.g. N/A, BOI exemption..." />}
          </Field>
        </div>
      </section>

      {/* Services Required */}
      <section className="flex flex-col gap-3">
        <SectionHead>Services Required</SectionHead>
        <div className="grid grid-cols-2 gap-x-6 gap-y-2">
          {([
            ['Sea Imports', kycSeaImports, setKycSeaImports],
            ['Sea Exports', kycSeaExports, setKycSeaExports],
            ['Trade Lanes', kycTradeLanes, setKycTradeLanes],
            ['Forwarding', kycForwarding, setKycForwarding],
            ['Cross Trade', kycCrossTrade, setKycCrossTrade],
            ['Air Imports', kycAirImports, setKycAirImports],
            ['Air Exports', kycAirExports, setKycAirExports],
            ['General Cargo', kycGeneralCargo, setKycGeneralCargo],
            ['Dangerous Goods', kycDangerousGoods, setKycDangerousGoods],
            ['Perishable Goods', kycPerishableGoods, setKycPerishableGoods],
          ] as [string, boolean, (v: boolean) => void][]).map(([label, val, setter]) => (
            <Checkbox key={label} checked={val} onChange={setter}>{label}</Checkbox>
          ))}
        </div>
      </section>

      {/* Document Checklist */}
      <section className="flex flex-col gap-3">
        <SectionHead>Document Checklist</SectionHead>
        <div className="flex flex-col gap-2 rounded-card border border-line-soft bg-canvas px-3.5 py-3">
          {([
            ['BR Form', kycDocBrForm, setKycDocBrForm],
            ['VAT Certificate', kycDocVatCert, setKycDocVatCert],
            ['SVAT Certificate', kycDocSvatCert, setKycDocSvatCert],
            ['TIN Certificate', kycDocTinCert, setKycDocTinCert],
            ['Form 20', kycDocForm20, setKycDocForm20],
          ] as [string, string, (v: string) => void][]).map(([label, val, setter]) => {
            const received = val === 'true'
            return (
              <Checkbox key={label} checked={received} onChange={checked => setter(checked ? 'true' : 'false')} className="flex w-full">
                <span className={cn(received && 'font-semibold text-success')}>{label}</span>
                <span className={cn('ml-auto text-label font-semibold', received ? 'text-success' : 'text-fg-muted')}>{received ? 'Received' : 'Pending'}</span>
              </Checkbox>
            )
          })}
        </div>
      </section>

      <Field label="Notes (optional)">
        {ids => <Input {...ids} value={formNote} onChange={e => setFormNote(e.target.value)} placeholder="Any additional notes..." />}
      </Field>

      {/* Submit button */}
      <div className="flex justify-end">
        <Button variant="primary" icon={<ShieldCheck size={14} aria-hidden="true" />}
          disabled={!kycBrNumber.trim() || !kycCliType || !kycDeadline}
          onClick={handleModalSubmit}>
          Submit KYC Request
        </Button>
      </div>
    </div>
  )
})() : selectedItem.actionKind === 'prepare-quotation' && actionModal ? (() => {
  const { inquiry: pqInq, container: pqCont, rateRequest: pqRr } = actionModal.sourceData as {
    inquiry: import('../../../types').Inquiry; container: import('../../../types').ContainerLine; rateRequest?: CompletedRateRequest
  }
  const pqOptions = pqRr?.options.filter(o => o.rate) ?? []
  const pqDest = pqCont?.destination || pqInq.destination
  const pqContainerLabel = pqCont ? `${pqCont.quantity}× ${pqCont.containerType}` : ''
  const pqCommodity = pqCont?.commodityType || pqInq.commodity_type || ''

  const computeFinal = (optId: number, baseRate: number) => {
    const ovr = optionOverrides[optId]
    if (!ovr) return baseRate
    return ovr.isPercentage ? baseRate * (1 + ovr.margin / 100) : baseRate + ovr.margin
  }

  // Check if any selected option has zero or negative margin
  const hasInvalidMargin = pqOptions.some(opt => {
    if (!selectedRateOptionIds.has(opt.option_id)) return false
    const ovr = optionOverrides[opt.option_id]
    if (!ovr) return true // no override means margin=0
    return ovr.margin <= 0
  })

  return (
    <div className="flex flex-col">
      <StepHeader className="mb-px rounded-b-none" title="PREPARE QUOTATION" subtitle="Select rates, set margins, and review before sending" />

      {/* Fields */}
      <div className="overflow-hidden rounded-b-card border border-line-soft bg-surface">
        <SummaryRow label="Customer">{pqInq.customer_name}</SummaryRow>
        <SummaryRow label="Route">{pqInq.origin} → {pqDest}</SummaryRow>
        <SummaryRow label="Cargo">{pqContainerLabel}{pqCommodity ? ` · ${pqCommodity}` : ''}</SummaryRow>

        {/* RATE OPTIONS section divider */}
        <div className="border-b border-line-soft bg-primary-subtle px-3 py-2">
          <span className="text-label font-bold uppercase tracking-label text-primary">RATE OPTIONS</span>
          <span className="ml-2 text-label text-fg-muted">{pqOptions.length} option{pqOptions.length !== 1 ? 's' : ''}</span>
        </div>

        {/* Rate options table header */}
        {pqOptions.length > 0 && (
          <div className={cn(PQ_GRID, 'border-b border-line-soft bg-canvas text-label font-bold text-fg-muted')}>
            <div className="px-1 py-1.5"></div>
            <div className="border-r border-line-soft px-2 py-1.5">LINER / VESSEL</div>
            <div className="border-r border-line-soft px-2 py-1.5 text-center">SCHEDULE</div>
            <div className="border-r border-line-soft px-2 py-1.5 text-right">RATE</div>
            <div className="border-r border-line-soft px-2 py-1.5 text-center">MARGIN</div>
            <div className="border-r border-line-soft px-2 py-1.5 text-right">FINAL</div>
            <div className="px-2 py-1.5">REMARK</div>
          </div>
        )}

        {/* Rate option rows */}
        {pqOptions.map((opt, idx) => {
          const r = opt.rate!
          const isSelected = selectedRateOptionIds.has(opt.option_id)
          const isBest = bestRateOptionId === opt.option_id
          const ovr = optionOverrides[opt.option_id] ?? { margin: 0, isPercentage: true, remark: '' }
          const baseRate = r.rate ?? 0
          const finalAmt = computeFinal(opt.option_id, baseRate)
          const linerName = r.lin_id ? (linerList.find(l => l.lin_id === r.lin_id)?.name ?? `Liner #${r.lin_id}`) : opt.rate_type.replace(/_/g, ' ')
          const typeLabel = opt.rate_type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
          const isLast = idx === pqOptions.length - 1
          const fmtShort = (d: string | null | undefined) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : null
          const vesselLabel = opt.vessel_name || r.vessel_name || null
          const voyageLabel = opt.voyage_number || null
          const optionName = `${linerName}${vesselLabel ? ` ${vesselLabel}` : ''}${voyageLabel ? ` / ${voyageLabel}` : ''}`
          const marginInvalid = isSelected && ovr.margin <= 0
          const markupLabel = ovr.isPercentage ? 'Percentage markup' : 'Flat amount markup'
          // A disabled button can't be focused or hovered, so it gets no tooltip.
          const markupButton = (
            <Button className={cn('w-8 px-0', ovr.isPercentage ? 'text-primary' : 'text-fg-muted')}
              onClick={() => setOptionOverrides(prev => ({ ...prev, [opt.option_id]: { ...ovr, isPercentage: !ovr.isPercentage } }))}
              disabled={!isSelected}>
              {ovr.isPercentage ? '%' : '$'}
            </Button>
          )

          return (
            <div key={opt.option_id} className={cn(PQ_GRID, !isLast && 'border-b border-line-soft', !isSelected && 'opacity-40', isBest && 'bg-success-bg')}>
              {/* Checkbox + best star */}
              <div className="flex items-center justify-center gap-1 px-1 py-1.5">
                <Checkbox checked={isSelected} aria-label={`Include ${optionName}`}
                  onChange={() => {
                    setSelectedRateOptionIds(prev => {
                      const next = new Set(prev)
                      if (next.has(opt.option_id)) next.delete(opt.option_id)
                      else next.add(opt.option_id)
                      return next
                    })
                  }}
                />
                <Tooltip content={isBest ? 'Best rate' : 'Mark as best'}>
                  <button type="button" aria-label={`Best rate: ${optionName}`} aria-pressed={isBest}
                    onClick={() => setBestRateOptionId(isBest ? null : opt.option_id)}
                    className={cn('border-none bg-transparent p-0 text-body leading-none', isBest ? 'text-warning' : 'text-fg-muted')}>
                    {isBest ? '★' : '☆'}
                  </button>
                </Tooltip>
              </div>

              {/* Liner / Vessel info */}
              <div className="flex flex-col justify-center gap-px border-r border-line-soft px-2 py-1.5">
                <span className="text-control font-semibold text-fg">{linerName}</span>
                {vesselLabel && <span className="text-label text-fg-label">{vesselLabel}{voyageLabel ? ` / ${voyageLabel}` : ''}</span>}
                <span className="text-label text-fg-muted">{typeLabel}{opt.service_name ? ` · ${opt.service_name}` : ''}</span>
              </div>

              {/* Schedule — ETD / ETA / Cutoff */}
              <div className="flex flex-col justify-center gap-px border-r border-line-soft px-2 py-1.5 text-label">
                {(opt.etd_pol || opt.eta_pod) ? (<>
                  {opt.etd_pol && <div className="text-fg-label">ETD {fmtShort(opt.etd_pol)}</div>}
                  {opt.eta_pod && <div className="text-fg-label">ETA {fmtShort(opt.eta_pod)}</div>}
                  {opt.bk_cutoff && <div className="text-warning">Cut {fmtShort(opt.bk_cutoff)}</div>}
                </>) : (
                  <span className="text-fg-muted">{r.transit ? `${r.transit}d transit` : '—'}</span>
                )}
              </div>

              {/* Base rate */}
              <div className="flex items-center justify-end border-r border-line-soft px-2 py-1.5 text-control font-semibold text-fg">
                {baseRate.toLocaleString()} {r.currency ?? 'USD'}
              </div>

              {/* Margin input + toggle */}
              <div className="flex items-center gap-1 border-r border-line-soft px-1 py-1">
                <NumberInput step="any" aria-label={`Margin: ${optionName}`}
                  className={cn('w-12 text-right', marginInvalid && 'bg-danger-bg')}
                  aria-invalid={marginInvalid || undefined}
                  value={ovr.margin}
                  onChange={e => {
                    const val = parseFloat(e.target.value) || 0
                    setOptionOverrides(prev => ({ ...prev, [opt.option_id]: { ...ovr, margin: val } }))
                  }}
                  disabled={!isSelected}
                />
                {isSelected ? <Tooltip content={markupLabel}>{markupButton}</Tooltip> : markupButton}
              </div>

              {/* Final amount */}
              <div className={cn('flex items-center justify-end border-r border-line-soft px-2 py-1.5 text-control font-bold', isBest ? 'text-success' : 'text-fg')}>
                {(Math.round(finalAmt * 100) / 100).toLocaleString()}
              </div>

              {/* Remark input */}
              <div className="flex items-center px-1.5 py-1">
                <Input aria-label={`Remark: ${optionName}`}
                  value={ovr.remark}
                  onChange={e => setOptionOverrides(prev => ({ ...prev, [opt.option_id]: { ...ovr, remark: e.target.value } }))}
                  placeholder="Add remark…"
                  disabled={!isSelected}
                />
              </div>
            </div>
          )
        })}

        {pqOptions.length === 0 && (
          <div className="px-3 py-4 text-center text-control text-fg-muted">
            No rate options available. Rate check may not have been completed.
          </div>
        )}

        {/* QUOTATION DOCUMENT section divider */}
        <div className="border-b border-line-soft bg-primary-subtle px-3 py-2">
          <span id="ws-pq-document-label" className="text-label font-bold uppercase tracking-label text-primary">QUOTATION DOCUMENT</span>
        </div>

        {/* Quotation textarea */}
        <div className="border-b border-line-soft px-2.5 py-2">
          <Textarea aria-labelledby="ws-pq-document-label"
            className="min-h-[140px] resize-y font-mono text-label"
            value={quotationContent}
            onChange={e => { setQuotationContent(e.target.value); setQuoteCopied(false) }}
          />
          <div className="mt-1 flex justify-end gap-2">
            <Button size="sm" icon={<FileText size={14} aria-hidden="true" />}
              onClick={() => generateQuotationPdf(
                pqInq,
                pqCont,
                pqOptions,
                selectedRateOptionIds,
                bestRateOptionId,
                optionOverrides,
                linerList,
                activeEmployee.name,
                computeFinal,
              )}>
              Download PDF
            </Button>
            <Button size="sm" className={cn(quoteCopied && 'text-success')}
              icon={quoteCopied ? <ClipboardCheck size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
              onClick={() => { navigator.clipboard.writeText(quotationContent); setQuoteCopied(true) }}>
              {quoteCopied ? 'Copied' : 'Copy to Clipboard'}
            </Button>
          </div>
        </div>

        {/* Notes row */}
        <div className="grid grid-cols-[140px_1fr]">
          <label htmlFor="ws-pq-notes" className={cn(labelClass, 'flex items-center border-r border-line-soft bg-canvas px-3 py-2')}>Notes</label>
          <div className="px-2 py-1">
            <Input id="ws-pq-notes" value={formNote} onChange={e => setFormNote(e.target.value)} placeholder="Internal notes (optional)" />
          </div>
        </div>
      </div>

      {/* Margin warning */}
      {hasInvalidMargin && selectedRateOptionIds.size > 0 && (
        <div className="mt-3 flex items-center gap-2 rounded-card border border-danger-line bg-danger-bg px-3.5 py-2 text-control text-danger">
          <AlertTriangle size={14} className="shrink-0" aria-hidden="true" />
          <span>One or more selected options have a <strong>zero or negative margin</strong>. Special permission is required to proceed with non-positive margins.</span>
        </div>
      )}

      {/* Submit */}
      <div className="mt-5 flex justify-end gap-2.5">
        <Button variant="primary" icon={<Send size={14} aria-hidden="true" />}
          disabled={(selectedRateOptionIds.size === 0 && pqOptions.length > 0) || hasInvalidMargin}
          onClick={handleModalSubmit}>
          Save Quotation
        </Button>
      </div>
    </div>
  )
})() : selectedItem.actionKind === 'customer-response' && actionModal ? (() => {
  const ctx = actionModal.previousContext
  const crDisabled = customerDecision === 'accepted' && quotationOptions.length > 0 && selectedOptionRateId == null
  return (
    <div className="flex flex-col gap-3">
      <StepHeader icon={<MessageSquare size={14} aria-hidden="true" />} title="RECORD CUSTOMER RESPONSE" />

      {/* Previous context */}
      {ctx && <ContextCard ctx={ctx} />}

      {/* Customer Decision */}
      <div className="flex flex-col gap-1">
        <span id="ws-cr-decision-label" className={labelClass}>Customer Decision</span>
        <div role="group" aria-labelledby="ws-cr-decision-label" className="flex gap-2">
          <Button aria-pressed={customerDecision === 'accepted'} className={cn(customerDecision === 'accepted' && SELECTED_SUCCESS)}
            icon={<Check size={14} aria-hidden="true" />}
            onClick={() => setCustomerDecision('accepted')}>
            Accepted
          </Button>
          <Button aria-pressed={customerDecision === 'rejected'} className={cn(customerDecision === 'rejected' && SELECTED_DANGER)}
            icon={<X size={14} aria-hidden="true" />}
            onClick={() => setCustomerDecision('rejected')}>
            Rejected
          </Button>
        </div>
      </div>

      {/* Quotation option selection — shown only when accepted */}
      {customerDecision === 'accepted' && (
        <div className="flex flex-col gap-1">
          <span id="ws-cr-option-label" className={labelClass}>Accepted Option</span>
          {quotationOptionsLoading ? (
            <div role="status" className="flex items-center gap-1.5 py-2 text-control text-fg-muted">
              <Loader2 size={14} className="animate-spin" aria-hidden="true" /> Loading options…
            </div>
          ) : quotationOptions.length === 0 ? (
            <div className="py-2 text-control text-fg-muted">
              No options found for this quotation.
            </div>
          ) : (
            <div role="group" aria-labelledby="ws-cr-option-label" className="flex flex-col gap-1.5">
              {quotationOptions.map(opt => {
                const isSelected = selectedOptionRateId === opt.rate_id
                return (
                  <button
                    key={opt.option_id}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => setSelectedOptionRateId(opt.rate_id)}
                    className={cn(
                      'flex w-full items-center gap-2.5 rounded-card border px-3 py-2.5 text-left text-control',
                      isSelected ? 'border-primary bg-primary-subtle' : 'border-line bg-surface hover:bg-surface-hover',
                    )}
                  >
                    <span aria-hidden="true" className={cn('size-4 shrink-0 rounded-full bg-surface', isSelected ? 'border-4 border-primary' : 'border-2 border-line')} />
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold text-fg">
                        {opt.vessel ? `${opt.vessel}${opt.voyage ? ` / ${opt.voyage}` : ''}` : `Option ${opt.option_id}`}
                      </span>
                      <span className="mt-0.5 block text-label text-fg-label">
                        {opt.option_currency ?? 'USD'} {opt.final_amt != null ? Number(opt.final_amt).toLocaleString(undefined, { minimumFractionDigits: 2 }) : opt.amt != null ? Number(opt.amt).toLocaleString(undefined, { minimumFractionDigits: 2 }) : '—'}
                        {opt.rate_id != null && <span className="ml-2 text-fg-muted">Rate #{opt.rate_id}</span>}
                      </span>
                    </span>
                    {isSelected && <Check size={14} className="shrink-0 text-primary" aria-hidden="true" />}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Notes */}
      <Field label={`${customerDecision === 'rejected' ? 'Rejection Reason' : 'Notes'} (optional)`}>
        {ids => <Input {...ids} value={formNote}
          onChange={e => setFormNote(e.target.value)}
          placeholder={customerDecision === 'rejected' ? 'Reason for rejection...' : 'Any follow-up notes...'} />}
      </Field>

      {/* Submit button */}
      <div className="flex justify-end pt-1">
        <Button variant={customerDecision === 'accepted' ? 'primary' : 'danger'}
          disabled={crDisabled}
          icon={customerDecision === 'accepted' ? <Check size={14} aria-hidden="true" /> : <X size={14} aria-hidden="true" />}
          onClick={handleModalSubmit}>
          {customerDecision === 'accepted'
            ? 'Customer Accepted — Proceed to Booking'
            : 'Customer Rejected — Close Inquiry'}
        </Button>
      </div>
    </div>
  )
})() : selectedItem.actionKind === 'record-cutoff' && actionModal ? (() => {
  const coBkg = actionModal.sourceData.booking as Booking
  const coRo = coBkg.release_order_fields
  // Same entries as the old datalist: value = liner name, shown with its SCAC. ComboBox items are keyed by value, so repeats are dropped.
  const coLinerItems: ComboBoxItem[] = linerList
    .filter((l, i, all) => l.name && all.findIndex(x => x.name === l.name) === i)
    .map(l => ({ value: l.name, description: linerDisplay(l) }))
  return (
    <div className="flex flex-col gap-4">
      {/* Booking summary */}
      <div className="rounded-card border border-line-soft bg-primary-subtle px-3.5 py-2.5 text-control text-fg">
        <strong>{coBkg.customer_name}</strong> — {coBkg.origin} → {coBkg.destination}
        <div className="mt-0.5 text-fg-muted">
          {coBkg.quantity}x {coBkg.container_type} · {coBkg.shipping_line || 'No liner'}
        </div>
      </div>

      {/* Collapsible Release Order reference */}
      {coRo && <ReleaseOrderReference ro={coRo} bkg={coBkg} collapsed={roRefCollapsed} onToggle={() => setRoRefCollapsed(!roRefCollapsed)} />}

      <Field label="Shipping Line / Liner">
        {ids => <ComboBox {...ids} value={cutoffLiner} onChange={setCutoffLiner} items={coLinerItems}
          placeholder="e.g. Maersk, MSC, Hapag-Lloyd" />}
      </Field>

      {/* Paste / Upload toggle */}
      <div className="flex flex-col gap-1">
        <span id="ws-co-schedule-label" className={labelClass}>Cutoff Schedule</span>
        <div role="group" aria-labelledby="ws-co-schedule-label" className="mb-1 flex gap-2">
          <Button aria-pressed={cutoffMode === 'paste'} className={cn(cutoffMode === 'paste' && SELECTED_TOGGLE)}
            icon={<ClipboardPaste size={14} aria-hidden="true" />}
            onClick={() => setCutoffMode('paste')}>
            Paste
          </Button>
          <Button aria-pressed={cutoffMode === 'upload'} className={cn(cutoffMode === 'upload' && SELECTED_TOGGLE)}
            icon={<Paperclip size={14} aria-hidden="true" />}
            onClick={() => setCutoffMode('upload')}>
            Upload
          </Button>
        </div>
        {cutoffMode === 'paste' && (
          <Textarea aria-labelledby="ws-co-schedule-label" className="min-h-[90px] resize-y font-mono text-label leading-normal"
            value={cutoffContent} onChange={e => setCutoffContent(e.target.value)}
            placeholder="Paste vessel cutoff schedule here..." />
        )}
        {cutoffMode === 'upload' && (
          <FileAttach accept=".pdf,.xlsx,.xls,.csv,.png,.jpg,.jpeg,.txt" label="Choose file" fileName={cutoffFileName}
            describedBy="ws-co-schedule-label"
            onFile={file => {
              setCutoffFileName(file.name)
              const reader = new FileReader()
              reader.onload = () => setCutoffContent(reader.result as string)
              reader.readAsDataURL(file)
            }}
            onRemove={() => { setCutoffFileName(''); setCutoffContent('') }} />
        )}
      </div>

      <section className="flex flex-col gap-3">
        <SectionHead>Cutoff Dates from Liner</SectionHead>
        <div className="grid grid-cols-2 gap-x-4 gap-y-3">
          <Field label="SI/BL Cutoff Date">
            {ids => <DatePicker {...ids} value={cutoffSiDate} onChange={v => { setCutoffSiDate(v); setCutoffBlDate(v) }} />}
          </Field>
          <Field label="VGM Cutoff Date">
            {ids => <DatePicker {...ids} value={cutoffVgmDate} onChange={setCutoffVgmDate} />}
          </Field>
          <Field label="Filing Cutoff Date">
            {ids => <DatePicker {...ids} value={cutoffFilingDate} onChange={setCutoffFilingDate} />}
          </Field>
        </div>
      </section>
      <p className="m-0 text-label text-fg-muted">
        SI/BL cutoff dates trigger downstream follow-up tasks and reminders.
      </p>

      <Field label="Notes (optional)">
        {ids => <Input {...ids} value={cutoffNotes}
          onChange={e => setCutoffNotes(e.target.value)}
          placeholder="Any notes about vessel cutoff schedule..." />}
      </Field>

      {/* Submit button */}
      <div className="flex justify-end">
        <Button variant="primary" icon={<Ship size={14} aria-hidden="true" />} onClick={handleModalSubmit}>
          Record Cutoff & Push
        </Button>
      </div>
    </div>
  )
})() : selectedItem.actionKind === 'request-si' && actionModal ? (() => {
  const siBkg = actionModal.sourceData.booking as Booking
  const ctx = actionModal.previousContext
  const siblCutoff = siBkg.si_cutoff_date || siBkg.bl_cutoff_date
  const dLeft = siblCutoff ? daysUntil(siblCutoff) : 999
  const isOvd = dLeft < 0
  const urgencyTone = isOvd ? 'danger' : dLeft === 0 ? 'warning' : 'info'
  const urgencyCard = { danger: 'border-danger-line bg-danger-bg', warning: 'border-warning-line bg-warning-bg', info: 'border-info-line bg-info-bg' }[urgencyTone]
  const urgencyClass = { danger: 'text-danger', warning: 'text-warning', info: 'text-info-fg' }[urgencyTone]
  const urgencyLabel = isOvd
    ? `OVERDUE by ${Math.abs(dLeft)} day(s)`
    : dLeft === 0 ? 'Due TODAY' : `${dLeft} day(s) remaining`
  const canSend = sendMethod === 'email'
    ? customerContactEmail.trim() !== '' && customerContactEmail.includes('@') && emailConfirmed
    : waConfirmed
  const cutoffRow = (label: string, date: string) => {
    const d = daysUntil(date)
    return (
      <div className="flex items-center gap-2">
        <span className="w-25 text-label font-semibold text-fg-muted">{label}</span>
        <span className="font-bold">{date}</span>
        <span className="text-label text-fg-muted">({d < 0 ? `${Math.abs(d)}d overdue` : `${d}d left`})</span>
      </div>
    )
  }
  return (
    <div className="flex flex-col gap-4">
      {/* Context card */}
      {ctx && <ContextCard ctx={ctx} />}

      {/* Collapsible Release Order reference */}
      {siBkg.release_order_fields && (
        <ReleaseOrderReference ro={siBkg.release_order_fields} bkg={siBkg} collapsed={roRefCollapsed} onToggle={() => setRoRefCollapsed(!roRefCollapsed)} />
      )}

      {/* Cutoff dates card */}
      <div className={cn('rounded-card border px-4 py-3.5', urgencyCard)}>
        <div className="mb-2 flex items-center gap-1.5">
          <AlertTriangle size={14} className={urgencyClass} aria-hidden="true" />
          <span className={cn('text-control font-bold', urgencyClass)}>Cutoff Dates</span>
          <Badge tone={urgencyTone} className="ml-auto">{urgencyLabel}</Badge>
        </div>
        <div className="mb-2 flex flex-col gap-1 text-control text-fg">
          {siblCutoff && cutoffRow('SI/BL Cutoff', siblCutoff)}
          {siBkg.vgm_cutoff_date && cutoffRow('VGM Cutoff', siBkg.vgm_cutoff_date)}
          {siBkg.filing_cutoff_date && cutoffRow('Filing Cutoff', siBkg.filing_cutoff_date)}
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-control text-fg">
          <div><span className="text-fg-muted">Customer:</span> <strong>{siBkg.customer_name}</strong></div>
          <div><span className="text-fg-muted">Route:</span> {siBkg.origin} → {siBkg.destination}</div>
          <div><span className="text-fg-muted">Vessel:</span> {siBkg.vessel_name || 'TBD'}</div>
          <div><span className="text-fg-muted">Voyage:</span> {siBkg.voyage_number || 'TBD'}</div>
          <div><span className="text-fg-muted">Container:</span> {siBkg.quantity}x {siBkg.container_type}</div>
          <div><span className="text-fg-muted">Liner:</span> {siBkg.shipping_line || 'N/A'}</div>
        </div>
      </div>

      {/* Send method toggle */}
      <SendMethodToggle id="ws-si-method-label" label="Contact Customer via" value={sendMethod}
        onSelect={m => { setSendMethod(m); setEmailConfirmed(false) }} />

      {sendMethod === 'email' && (
        <>
          <Field label="Customer Email" required>
            {ids => <Input {...ids} type="email"
              value={customerContactEmail} onChange={e => setCustomerContactEmail(e.target.value)}
              placeholder="customer@example.com" />}
          </Field>
          {customerContactEmail.includes('@') && (
            <>
              <Button variant="primary" className="w-full justify-start" icon={<Mail size={14} aria-hidden="true" />}
                onClick={() => openMailto(customerContactEmail, `SI/BL Cutoff Reminder — ${siBkg.id} — ${siBkg.customer_name}`, `Dear ${siBkg.customer_name},\n\nThis is a reminder that the SI/BL cutoff date is approaching${siblCutoff ? ` (${siblCutoff})` : ''}. Please submit your shipping instructions at your earliest convenience.\n\nBest regards,\n${activeEmployee.name}\nSynergy Shipping & Logistics`)}>
                Open in Outlook
              </Button>
              <ConfirmCheck tone="info" checked={emailConfirmed} onChange={setEmailConfirmed}
                hint='Click "Open in Outlook" above, send the email, then check this box.'>
                I confirm that I have sent the cutoff reminder to the customer via email.
              </ConfirmCheck>
            </>
          )}
        </>
      )}

      {sendMethod === 'whatsapp' && (
        <>
          <Field label="Customer WhatsApp Number">
            {ids => <Input {...ids}
              value={customerContactPhone} onChange={e => setCustomerContactPhone(e.target.value)}
              placeholder="+94 7X XXX XXXX" />}
          </Field>
          <ConfirmCheck tone="success" checked={waConfirmed} onChange={setWaConfirmed}
            hint="No WhatsApp integration — manual confirmation.">
            I confirm that I have sent the cutoff reminder to the customer via WhatsApp.
          </ConfirmCheck>
        </>
      )}

      {/* VGM Certificate upload */}
      {siBkg.vgm_cutoff_date && (
        <div className="flex flex-col gap-1">
          <span id="ws-si-vgm-label" className={labelClass}>VGM Certificate (optional)</span>
          <FileAttach accept=".pdf,.xlsx,.xls,.csv,.png,.jpg,.jpeg,.doc,.docx" label="Attach VGM certificate" fileName={vgmCertFileName}
            describedBy="ws-si-vgm-label"
            onFile={f => {
              setVgmCertFileName(f.name)
              const r = new FileReader()
              r.onload = () => setVgmCertContent(r.result as string)
              r.readAsDataURL(f)
            }}
            onRemove={() => { setVgmCertFileName(''); setVgmCertContent('') }} />
        </div>
      )}

      <Field label="Notes (optional)">
        {ids => <Input {...ids} value={formNote}
          onChange={e => setFormNote(e.target.value)}
          placeholder="Any instructions or reminders for the customer..." />}
      </Field>

      {/* Submit button */}
      <div className="flex justify-end">
        <Button variant="primary" disabled={!canSend}
          icon={sendMethod === 'email' ? <Mail size={14} aria-hidden="true" /> : <MessageCircle size={14} aria-hidden="true" />}
          onClick={handleModalSubmit}>
          {sendMethod === 'email' ? 'Send Reminder via Email' : 'Confirm Reminder Sent'}
        </Button>
      </div>
    </div>
  )
})() : selectedItem.actionKind === 'send-pre-advice' && actionModal ? (() => {
  const paBkg = actionModal.sourceData.booking as Booking
  const blCutoff = paBkg.bl_cutoff_date || paBkg.si_cutoff_date

  const paInput = (label: string, key: string, opts?: { readOnly?: boolean; span?: boolean }) => (
    <Field label={label} className={cn(opts?.span && 'col-span-full')}>
      {ids => <Input {...ids} value={paField(key)} onChange={e => setPaField(key, e.target.value)} readOnly={opts?.readOnly}
        className={cn(opts?.readOnly && 'bg-canvas')} />}
    </Field>
  )
  const paTextarea = (label: string, key: string) => (
    <Field label={label} className="col-span-full">
      {ids => <Textarea {...ids} value={paField(key)} onChange={e => setPaField(key, e.target.value)} rows={3} className="resize-y" />}
    </Field>
  )

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex flex-col gap-1.5">
        <StepHeader icon={<FileText size={14} aria-hidden="true" />} title="Pre-Advice Notice" />
        <div className="text-label text-fg-muted">
          {paBkg.id} &middot; {paBkg.customer_name} &middot; {paBkg.origin} &rarr; {paBkg.destination}
        </div>
        {blCutoff && (
          <Badge tone="warning" className="gap-1 self-start">
            <Clock size={12} aria-hidden="true" /> BL Cutoff: {blCutoff}
          </Badge>
        )}
      </div>

      <FormSection title="Door Agent">
        {paInput('Agent Name', 'door_agent')}
        {paInput('Contact Person', 'door_agent_contact')}
        {paInput('Address', 'door_agent_address', { span: true })}
        {paInput('Email', 'door_agent_email')}
      </FormSection>

      <FormSection title="Shipment Reference">
        {paInput('B/L Number', 'bl_number')}
        {paInput('Booking Ref', 'booking_ref', { readOnly: true })}
      </FormSection>

      <FormSection title="Parties">
        {paInput('Shipper', 'shipper')}
        {paInput('Shipper Address', 'shipper_address')}
        {paInput('Consignee', 'consignee')}
        {paInput('Consignee Address', 'consignee_address')}
        {paInput('Notify Party', 'notify_party')}
        {paInput('Notify Address', 'notify_address')}
      </FormSection>

      <FormSection title="Vessel & Route">
        {paInput('Vessel', 'vessel', { readOnly: true })}
        {paInput('Voyage', 'voyage', { readOnly: true })}
        {paInput('Carrier', 'carrier', { readOnly: true })}
        {paInput('Port of Loading', 'pol', { readOnly: true })}
        {paInput('Port of Discharge', 'pod', { readOnly: true })}
        {paInput('Final Destination', 'final_destination')}
        {paInput('ETA Destination', 'eta_destination')}
      </FormSection>

      <FormSection title="Container Details">
        {paInput('Container No.', 'container_no')}
        {paInput('Size / Type', 'container_size', { readOnly: true })}
        {paInput('Qty', 'container_count', { readOnly: true })}
        {paInput('Seal No.', 'seal_no')}
      </FormSection>

      <FormSection title="Cargo Details">
        {paTextarea('Description of Goods', 'cargo_description')}
        {paInput('HS Code', 'hs_code')}
        {paInput('No. of Packages', 'no_of_packages')}
        {paInput('Package Type', 'package_type')}
        {paInput('Gross Weight (kg)', 'gross_weight')}
        {paInput('Net Weight (kg)', 'net_weight')}
        {paInput('Volume (CBM)', 'volume_cbm')}
        {paInput('Freight Terms', 'freight_terms')}
      </FormSection>

      <FormSection title="Door Delivery">
        {paTextarea('Delivery Address', 'delivery_address')}
        {paInput('Contact at Delivery', 'delivery_contact')}
        {paInput('Phone', 'delivery_phone')}
        {paTextarea('Special Instructions', 'special_instructions')}
        {paTextarea('Remarks', 'remarks')}
      </FormSection>

      {/* Generated Email Body */}
      {(() => {
        const emailBody = [
          `Subject: PRE-ADVICE — ${paField('bl_number') || paBkg.id} — ${paField('vessel')} ${paField('voyage')} — ${paField('pol')} → ${paField('final_destination')}`,
          ``,
          `Dear ${paField('door_agent') || '[Door Agent]'},`,
          ``,
          `Please find below the pre-advice details for the following shipment. Kindly arrange door delivery accordingly.`,
          ``,
          `════════════════════════════════════════`,
          `  SHIPMENT REFERENCE`,
          `════════════════════════════════════════`,
          `B/L Number       : ${paField('bl_number') || 'N/A'}`,
          `Booking Ref      : ${paField('booking_ref')}`,
          `Carrier          : ${paField('carrier')}`,
          ``,
          `════════════════════════════════════════`,
          `  PARTIES`,
          `════════════════════════════════════════`,
          `Shipper          : ${paField('shipper')}`,
          ...(paField('shipper_address') ? [`                   ${paField('shipper_address')}`] : []),
          `Consignee        : ${paField('consignee') || 'N/A'}`,
          ...(paField('consignee_address') ? [`                   ${paField('consignee_address')}`] : []),
          `Notify Party     : ${paField('notify_party') || 'SAME AS CONSIGNEE'}`,
          ...(paField('notify_address') ? [`                   ${paField('notify_address')}`] : []),
          ``,
          `════════════════════════════════════════`,
          `  VESSEL & ROUTE`,
          `════════════════════════════════════════`,
          `Vessel / Voyage  : ${paField('vessel')} / ${paField('voyage')}`,
          `Port of Loading  : ${paField('pol')}`,
          `Port of Discharge: ${paField('pod')}`,
          `Final Destination: ${paField('final_destination')}`,
          `ETA Destination  : ${paField('eta_destination') || 'TBC'}`,
          ``,
          `════════════════════════════════════════`,
          `  CONTAINER DETAILS`,
          `════════════════════════════════════════`,
          `Container No.    : ${paField('container_no') || 'TBC'}`,
          `Size / Type      : ${paField('container_size')} × ${paField('container_count')}`,
          `Seal No.         : ${paField('seal_no') || 'TBC'}`,
          ``,
          `════════════════════════════════════════`,
          `  CARGO DETAILS`,
          `════════════════════════════════════════`,
          `Description      : ${paField('cargo_description') || 'N/A'}`,
          ...(paField('hs_code') ? [`HS Code          : ${paField('hs_code')}`] : []),
          `No. of Packages  : ${paField('no_of_packages') || 'N/A'} ${paField('package_type') || ''}`.trimEnd(),
          `Gross Weight     : ${paField('gross_weight') ? paField('gross_weight') + ' kg' : 'N/A'}`,
          ...(paField('net_weight') ? [`Net Weight       : ${paField('net_weight')} kg`] : []),
          `Volume           : ${paField('volume_cbm') ? paField('volume_cbm') + ' CBM' : 'N/A'}`,
          `Freight Terms    : ${paField('freight_terms')}`,
          ``,
          `════════════════════════════════════════`,
          `  DOOR DELIVERY`,
          `════════════════════════════════════════`,
          `Delivery Address : ${paField('delivery_address') || 'N/A'}`,
          ...(paField('delivery_contact') ? [`Contact Person   : ${paField('delivery_contact')}`] : []),
          ...(paField('delivery_phone') ? [`Phone            : ${paField('delivery_phone')}`] : []),
          ...(paField('special_instructions') ? [`\nSpecial Instructions:\n${paField('special_instructions')}`] : []),
          ...(paField('remarks') ? [`\nRemarks:\n${paField('remarks')}`] : []),
          ``,
          `════════════════════════════════════════`,
          ``,
          `Please confirm receipt of this pre-advice and arrange delivery as per the above details.`,
          ``,
          `Best regards,`,
          `${activeEmployee.name}`,
          `Synergy Shipping & Logistics`,
        ].join('\n')

        const paEmailSubject = `PRE-ADVICE — ${paField('bl_number') || paBkg.id} — ${paField('vessel')} ${paField('voyage')} — ${paField('pol')} → ${paField('final_destination')}`
        const paEmailBodyOnly = emailBody.split('\n').slice(2).join('\n')
        const paDisabled =
          !paField('door_agent').trim() ||
          (sendMethod === 'email' && (!paField('door_agent_email').includes('@') || !emailConfirmed)) ||
          (sendMethod === 'whatsapp' && !waConfirmed)
        return (
          <>
            {/* Generated Email — collapsible */}
            <DraftPanel title="Generated Email" collapsed={draftCollapsed} onToggle={() => setDraftCollapsed(c => !c)}
              action={
                <Button variant="ghost" size="sm" className={cn(paCopied && 'border-success-line bg-success-bg text-success')}
                  icon={paCopied ? <ClipboardCheck size={12} aria-hidden="true" /> : <Copy size={12} aria-hidden="true" />}
                  onClick={() => { navigator.clipboard.writeText(emailBody); setPaCopied(true); setTimeout(() => setPaCopied(false), 2000) }}>
                  {paCopied ? 'Copied!' : 'Copy'}
                </Button>
              }>
              <Textarea readOnly rows={18} aria-label="Generated Email" value={emailBody}
                className="resize-y bg-canvas font-mono text-label leading-relaxed" />
            </DraftPanel>

            {/* Send Method */}
            <div className="flex flex-col gap-2.5 rounded-card border border-line-soft bg-canvas px-4 py-3.5">
              <SendMethodToggle id="ws-pa-method-label" label="Send to Door Agent" value={sendMethod}
                onSelect={m => { setSendMethod(m); if (m === 'whatsapp') setWaConfirmed(false); setEmailConfirmed(false) }} />
              {sendMethod === 'email' ? (
                <>
                  <Input aria-label="Door agent email" placeholder="Door agent email" value={paField('door_agent_email')}
                    onChange={e => setPaField('door_agent_email', e.target.value)} />
                  {paField('door_agent_email').includes('@') && (
                    <>
                      <Button variant="primary" className="w-full justify-start" icon={<Mail size={14} aria-hidden="true" />}
                        onClick={() => openMailto(paField('door_agent_email'), paEmailSubject, paEmailBodyOnly)}>
                        Open in Outlook
                      </Button>
                      <ConfirmCheck tone="info" checked={emailConfirmed} onChange={setEmailConfirmed}
                        hint='Click "Open in Outlook" above, send the email, then check this box.'>
                        I confirm that I have sent this pre-advice to the door agent via email.
                      </ConfirmCheck>
                    </>
                  )}
                </>
              ) : (
                <Checkbox checked={waConfirmed} onChange={setWaConfirmed}>
                  <span className={cn(waConfirmed ? 'text-success' : 'text-fg-label')}>
                    I have sent the pre-advice via WhatsApp (copy message above first)
                  </span>
                </Checkbox>
              )}
            </div>

            {/* Notes */}
            <Field label="Internal Notes">
              {ids => <Textarea {...ids} value={formNote} onChange={e => setFormNote(e.target.value)} rows={2}
                placeholder="Optional notes..." className="resize-y" />}
            </Field>

            {/* Submit */}
            <div className="flex justify-end">
              <Button variant="primary" disabled={paDisabled} icon={<FileText size={14} aria-hidden="true" />}
                onClick={() => handleModalSubmit()}>
                Send Pre-Advice
              </Button>
            </div>
          </>
        )
      })()}
    </div>
  )
})() : selectedItem.actionKind === 'send-pre-alert' && actionModal ? (() => {
  const paBkg = actionModal.sourceData.booking as Booking

  const praInput = (label: string, key: string, opts?: { readOnly?: boolean; span?: boolean }) => (
    <Field label={label} className={cn(opts?.span && 'col-span-full')}>
      {ids => <Input {...ids} value={paField(key)} onChange={e => setPaField(key, e.target.value)} readOnly={opts?.readOnly}
        className={cn(opts?.readOnly && 'bg-canvas')} />}
    </Field>
  )
  const praSelect = (label: string, key: string, options: string[]) => (
    <Field label={label}>
      {ids => <Select {...ids} value={paField(key)} onChange={v => setPaField(key, v)}
        options={options.map(o => ({ value: o, label: o || '—' }))} />}
    </Field>
  )

  const praEmailBody = [
    `Subject: Pre-Alert — ${paField('hbl_number') || paField('mbl_number') || 'N/A'} — ${paField('vessel')} ${paField('voyage')}`,
    '',
    'Dear Sir / Madam,',
    '',
    'Greetings!',
    '',
    'Please find the below pre-alert for your reference.',
    '',
    '──────────────────────────────────────',
    `HBL Issue Term      : ${paField('hbl_issue_term')}`,
    `MBL Issue Term      : ${paField('mbl_issue_term')}`,
    `HBL Freight Term    : ${paField('hbl_freight_term')}`,
    `MBL Freight Term    : ${paField('mbl_freight_term')}`,
    `HBL Delivery Type   : ${paField('hbl_delivery_type')}`,
    `MBL Delivery Type   : ${paField('mbl_delivery_type')}`,
    `Vessel / Voyage     : ${paField('vessel')} / ${paField('voyage')}`,
    `ATD ${paField('origin') || 'Origin'}        : ${paField('atd_origin') || 'TBC'}`,
    `Container No        : ${paField('container_no') || 'TBC'}`,
    `ETA ${paField('destination') || 'Destination'}    : ${paField('eta_destination') || 'TBC'}`,
    `H B/L No            : ${paField('hbl_number') || 'N/A'}`,
    `M B/L No            : ${paField('mbl_number') || 'N/A'}`,
    '──────────────────────────────────────',
    '',
    'Please do the needful.',
    '',
    'Thank you.',
    `${activeEmployee.name}`,
    'Synergy Shipping & Logistics',
  ].join('\n')

  const ISSUE_TERMS = ['', 'COPY', 'DRAFT', 'NON-NEGO', 'ORIGINAL', 'SEAWAY', 'SURRENDER', 'AS PER B/L INSTRUCTIONS']
  const FREIGHT_TERMS = ['', 'PREPAID', 'COLLECT']
  const DELIVERY_TYPES = ['', 'CY/CY', 'CY/DOOR', 'DOOR/DOOR']

  const praDisabled = !paField('dest_agent').trim() || !paField('dest_agent_email').includes('@')

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex flex-col gap-1.5">
        <StepHeader icon={<Send size={14} aria-hidden="true" />} title="Pre-Alert to Destination Agent" />
        <div className="text-label text-fg-muted">
          {paBkg.id} &middot; {paBkg.customer_name} &middot; {paBkg.origin} &rarr; {paBkg.destination}
        </div>
      </div>

      <FormSection title="Destination Agent">
        {praInput('Agent Name', 'dest_agent')}
        {praInput('Agent Email', 'dest_agent_email')}
      </FormSection>

      <FormSection title="Shipment Details">
        {praSelect('HBL Issue Term', 'hbl_issue_term', ISSUE_TERMS)}
        {praSelect('MBL Issue Term', 'mbl_issue_term', ISSUE_TERMS)}
        {praSelect('HBL Freight Term', 'hbl_freight_term', FREIGHT_TERMS)}
        {praSelect('MBL Freight Term', 'mbl_freight_term', FREIGHT_TERMS)}
        {praSelect('HBL Delivery Type', 'hbl_delivery_type', DELIVERY_TYPES)}
        {praSelect('MBL Delivery Type', 'mbl_delivery_type', DELIVERY_TYPES)}
      </FormSection>

      <FormSection title="Vessel & Route">
        {praInput('Vessel', 'vessel', { readOnly: true })}
        {praInput('Voyage', 'voyage', { readOnly: true })}
        {praInput('ATD ' + (paField('origin') || 'Origin'), 'atd_origin')}
        {praInput('Container No.', 'container_no')}
        {praInput('ETA ' + (paField('destination') || 'Destination'), 'eta_destination')}
        {praInput('Carrier', 'carrier', { readOnly: true })}
      </FormSection>

      <FormSection title="BL References">
        {praInput('H B/L No.', 'hbl_number')}
        {praInput('M B/L No.', 'mbl_number')}
        {praInput('Shipper', 'shipper', { readOnly: true })}
        {praInput('Consignee', 'consignee', { readOnly: true })}
      </FormSection>

      {/* Generated Email — collapsible */}
      <DraftPanel title="Generated Email" collapsed={draftCollapsed} onToggle={() => setDraftCollapsed(c => !c)}
        action={
          <Button variant="ghost" size="sm" className={cn(paCopied && 'border-success-line bg-success-bg text-success')}
            icon={paCopied ? <ClipboardCheck size={12} aria-hidden="true" /> : <Copy size={12} aria-hidden="true" />}
            onClick={() => { navigator.clipboard.writeText(praEmailBody); setPaCopied(true); setTimeout(() => setPaCopied(false), 2000) }}>
            {paCopied ? 'Copied!' : 'Copy'}
          </Button>
        }>
        <Textarea readOnly rows={18} aria-label="Generated Email" value={praEmailBody}
          className="resize-y bg-canvas font-mono text-label leading-relaxed" />
      </DraftPanel>

      {/* Notes */}
      <Field label="Internal Notes">
        {ids => <Textarea {...ids} value={formNote} onChange={e => setFormNote(e.target.value)} rows={2}
          placeholder="Optional notes..." className="resize-y" />}
      </Field>

      {/* Submit — auto-opens Outlook Web with pre-alert email */}
      <div className="flex justify-end">
        <Button variant="primary" disabled={praDisabled} icon={<Mail size={14} aria-hidden="true" />}
          onClick={() => handleModalSubmit()}>
          Send Pre-Alert
        </Button>
      </div>
    </div>
  )
})() : selectedItem.actionKind === 'release-booking' && actionModal ? (() => {
  const rbkg = actionModal.sourceData.booking as Booking
  const ro = rbkg.release_order_fields
  const roRow = (label: string, value: string | undefined) =>
    value ? <SummaryRow key={label} label={label} strong={false} className="grid-cols-[160px_1fr]">{value}</SummaryRow> : null
  const roGroup = (title: string) => (
    <div className="border-b border-line-soft px-3 py-1.5 text-label font-bold uppercase tracking-label text-fg-muted">{title}</div>
  )
  const switchMethod = (m: 'email' | 'whatsapp') => {
    setSendMethod(m)
    setReleaseDraft(mkReleaseOrderDraft(rbkg, m))
    setWaConfirmed(false)
    setEmailConfirmed(false)
  }
  const canSend = sendMethod === 'email'
    ? customerContactEmail.includes('@') && releaseDraft.trim() && emailConfirmed
    : waConfirmed && releaseDraft.trim()
  const draftTitle = sendMethod === 'email' ? 'Email Draft' : 'WhatsApp Message'

  return (
    <div className="flex flex-col gap-4">

      {/* ═══════ PHASE 1: REVIEW RELEASE ORDER ═══════ */}
      {releasePhase === 'review' && (
        <>
          <StepHeader icon={<FileText size={14} aria-hidden="true" />} title="RELEASE ORDER — REVIEW" subtitle="Step 1 of 2" />

          {/* Booking summary */}
          <div className="rounded-card border border-line-soft bg-primary-subtle px-3.5 py-2.5 text-control text-fg">
            <strong>{rbkg.customer_name}</strong> — {rbkg.origin} → {rbkg.destination}
            <div className="mt-0.5 text-fg-muted">
              {rbkg.quantity}x {rbkg.container_type} · {rbkg.shipping_line || 'No liner'} · {rbkg.vessel_name || 'No vessel'} / {rbkg.voyage_number || '—'}
            </div>
          </div>

          {/* Release Order details */}
          {ro ? (
            <div className="overflow-hidden rounded-card border border-line-soft bg-surface">
              {/* RO header */}
              <div className="flex items-center justify-between border-b border-line-soft bg-primary-subtle px-3 py-2 text-label">
                <span className="font-bold uppercase tracking-label text-primary">Release Order Details</span>
                <span className="font-mono font-semibold text-primary">{ro.reference_nbr}</span>
              </div>

              {/* Liner Reference section */}
              {roGroup('Liner Reference')}
              {roRow('Reference No.',  ro.reference_nbr)}
              {roRow('Pick Up Date',   ro.pickup_empty_date)}
              {roRow('Valid Until',    ro.validity_expiration_date)}

              {/* Depot section */}
              {roGroup('Pick Up Depot')}
              {roRow('Depot Name',     ro.pickup_depot)}
              {roRow('Depot Address',  ro.pickup_depot_address)}

              {/* Routing section */}
              {roGroup('Routing & Schedule')}
              {roRow('Booking Client', rbkg.customer_name)}
              {roRow('Port of Loading', rbkg.origin)}
              {ro.next_port_of_discharge ? roRow('Next Port', ro.next_port_of_discharge) : null}
              {roRow('Port of Discharge', rbkg.destination)}
              {roRow('Vessel',         rbkg.vessel_name)}
              {roRow('Voyage',         rbkg.voyage_number)}
              {roRow('Cut-Off',        ro.cut_off_date)}
              {roRow('ETD',            ro.etd)}
              {roRow('ETA',            ro.eta)}

              {/* Cargo section */}
              {roGroup('Cargo & Container')}
              {roRow('Container',      `${rbkg.quantity}x ${rbkg.container_type}`)}
              {roRow('Cargo',          ro.cargo_description)}
              {roRow('Weight',         ro.cargo_weight ? `${ro.cargo_weight} kg` : undefined)}
              {ro.transport_mode ? roRow('Transport Mode', ro.transport_mode) : null}
              {ro.transport_carrier ? roRow('Transport Carrier', ro.transport_carrier) : null}
            </div>
          ) : (
            <div className="rounded-card border border-danger-line bg-danger-bg px-3.5 py-5 text-center">
              <div className="mb-1 text-control font-semibold text-danger">No Release Order Attached</div>
              <div className="text-label text-fg-muted">Procurement has not yet attached a release order to this booking.</div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-2.5 pt-1">
            <Button variant="primary" className="flex-1" disabled={!ro} icon={<Send size={14} aria-hidden="true" />}
              onClick={() => setReleasePhase('send')}>
              Proceed to Release
            </Button>
          </div>
        </>
      )}

      {/* ═══════ PHASE 2: SEND TO CUSTOMER ═══════ */}
      {releasePhase === 'send' && (
        <>
          <StepHeader icon={<Send size={14} aria-hidden="true" />} title="RELEASE TO CUSTOMER" subtitle="Step 2 of 2" />

          {/* Back to review link */}
          <button type="button" onClick={() => setReleasePhase('review')}
            className="self-start border-none bg-transparent p-0 text-label font-semibold text-primary hover:underline">
            ← Back to Release Order Review
          </button>

          {/* Compact RO reference */}
          {ro && (
            <div className="flex items-center justify-between rounded-card border border-line-soft bg-primary-subtle px-3 py-2 text-label text-fg">
              <span><strong className="text-primary">R/O:</strong> {ro.reference_nbr} · {rbkg.customer_name}</span>
              <span className="text-fg-muted">{rbkg.origin} → {rbkg.destination}</span>
            </div>
          )}

          {/* Send method */}
          <SendMethodToggle id="ws-rb-method-label" label="Send via" value={sendMethod} onSelect={switchMethod} />

          {/* Contact input */}
          {sendMethod === 'email' && (
            <Field label="Customer Email" required>
              {ids => <Input {...ids} type="email"
                value={customerContactEmail} onChange={e => setCustomerContactEmail(e.target.value)}
                placeholder="customer@example.com" />}
            </Field>
          )}
          {sendMethod === 'whatsapp' && (
            <Field label="Customer WhatsApp Number">
              {ids => <Input {...ids}
                value={customerContactPhone} onChange={e => setCustomerContactPhone(e.target.value)}
                placeholder="+94 7X XXX XXXX" />}
            </Field>
          )}

          {/* Open in Outlook + confirmation (email) */}
          {sendMethod === 'email' && customerContactEmail.includes('@') && (
            <>
              <Button variant="primary" className="w-full justify-start" icon={<Mail size={14} aria-hidden="true" />}
                onClick={() => openMailto(customerContactEmail, `Release Order — ${rbkg.id} — ${rbkg.customer_name}`, releaseDraft)}>
                Open in Outlook
              </Button>
              <ConfirmCheck tone="info" checked={emailConfirmed} onChange={setEmailConfirmed}
                hint='Click "Open in Outlook" above, send the email, then check this box.'>
                I confirm that I have sent this release order to the customer via email.
              </ConfirmCheck>
            </>
          )}

          {/* Draft message — collapsible */}
          <DraftPanel title={draftTitle} collapsed={draftCollapsed} onToggle={() => setDraftCollapsed(c => !c)}
            action={
              <Tooltip content="Copy to clipboard">
                <Button variant="ghost" size="sm" icon={<Copy size={12} aria-hidden="true" />}
                  onClick={() => navigator.clipboard.writeText(releaseDraft)}>
                  Copy
                </Button>
              </Tooltip>
            }>
            <Textarea aria-label={draftTitle}
              rows={sendMethod === 'email' ? 14 : 12}
              className={cn('resize-y text-label leading-relaxed', sendMethod === 'email' && 'font-mono')}
              value={releaseDraft}
              onChange={e => setReleaseDraft(e.target.value)} />
          </DraftPanel>

          {/* WhatsApp manual confirm */}
          {sendMethod === 'whatsapp' && (
            <ConfirmCheck tone="success" checked={waConfirmed} onChange={setWaConfirmed}
              hint="Copy the message above and paste it into WhatsApp, then check this box.">
              I confirm I have sent the release order to the customer via WhatsApp.
            </ConfirmCheck>
          )}

          {/* Optional notes */}
          <Field label="Internal Note (optional)">
            {ids => <Input {...ids} value={formNote}
              onChange={e => setFormNote(e.target.value)}
              placeholder="Collection instructions, remarks, etc." />}
          </Field>

          {/* Submit */}
          <div className="flex justify-end">
            <Button variant="primary" disabled={!canSend}
              icon={sendMethod === 'email' ? <Mail size={14} aria-hidden="true" /> : <MessageCircle size={14} aria-hidden="true" />}
              onClick={handleModalSubmit}>
              {sendMethod === 'email' ? 'Send Release Order via Email' : 'Confirm WhatsApp Sent'}
            </Button>
          </div>
        </>
      )}
    </div>
  )
})() : selectedItem.actionKind === 'attach-release-order' ? (() => {
  const roBkg = selectedItem.sourceData.booking as Booking
  const roGroup = (title: string, grid: string, children: ReactNode) => (
    <div className="flex flex-col gap-1.5">
      <h4 className="m-0 text-label font-bold uppercase tracking-label text-primary">{title}</h4>
      <div className={cn('grid gap-x-4 gap-y-3', grid)}>{children}</div>
    </div>
  )
  return (
    <div className="flex flex-col gap-4">
      <div>
        <StepHeader className="mb-px rounded-b-none" title="RELEASE ORDER" subtitle="Attach & send to CS" />
        {/* Booking summary — read-only */}
        <div className="overflow-hidden rounded-b-card border border-line-soft bg-surface">
          {[
            { label: 'Customer',   value: roBkg.customer_name },
            { label: 'Carrier',    value: roBkg.shipping_line || '—' },
            { label: 'Container',  value: `${roBkg.quantity}x ${roBkg.container_type}` },
            { label: 'Vessel',     value: roBkg.vessel_name || '—' },
            { label: 'Voyage',     value: roBkg.voyage_number || '—' },
            { label: 'Route',      value: `${roBkg.origin} → ${roBkg.destination}` },
          ].map(({ label, value }) => (
            <SummaryRow key={label} label={label} strong={false} className="last:border-b-0">{value}</SummaryRow>
          ))}
        </div>
      </div>

      {/* Release Order Fields — structured form matching liner release order format */}
      <section className="flex flex-col gap-4">
        <SectionHead>Release Order Details</SectionHead>

        {roGroup('Liner Reference', 'grid-cols-3', <>
          <Field label="Reference Nbr">
            {ids => <Input {...ids} value={roFields.reference_nbr}
              onChange={e => setRoFields(f => ({ ...f, reference_nbr: e.target.value }))}
              placeholder="e.g. EBKG16474591" />}
          </Field>
          <Field label="Pick Up Empty Date">
            {ids => <DatePicker {...ids} value={roFields.pickup_empty_date}
              onChange={v => setRoFields(f => ({ ...f, pickup_empty_date: v }))} />}
          </Field>
          <Field label="Validity Expiration">
            {ids => <DatePicker {...ids} value={roFields.validity_expiration_date}
              onChange={v => setRoFields(f => ({ ...f, validity_expiration_date: v }))} />}
          </Field>
        </>)}

        {roGroup('Pick Up Depot', 'grid-cols-[1fr_2fr]', <>
          <Field label="Depot Name">
            {ids => <Input {...ids} value={roFields.pickup_depot}
              onChange={e => setRoFields(f => ({ ...f, pickup_depot: e.target.value }))}
              placeholder="e.g. Spectra Integrated Logistics" />}
          </Field>
          <Field label="Depot Address">
            {ids => <Input {...ids} value={roFields.pickup_depot_address}
              onChange={e => setRoFields(f => ({ ...f, pickup_depot_address: e.target.value }))}
              placeholder="Full address" />}
          </Field>
        </>)}

        {roGroup('Cargo', 'grid-cols-[2fr_1fr]', <>
          <Field label="Cargo Description">
            {ids => <Input {...ids} value={roFields.cargo_description}
              onChange={e => setRoFields(f => ({ ...f, cargo_description: e.target.value }))}
              placeholder="e.g. Coconut Milk" />}
          </Field>
          <Field label="Cargo Weight (kg)">
            {ids => <Input {...ids} value={roFields.cargo_weight}
              onChange={e => setRoFields(f => ({ ...f, cargo_weight: e.target.value }))}
              placeholder="e.g. 16,000" />}
          </Field>
        </>)}

        {roGroup('Vessel Schedule', 'grid-cols-3', <>
          <Field label="Cut-Off Date">
            {ids => <DatePicker {...ids} value={roFields.cut_off_date}
              onChange={v => setRoFields(f => ({ ...f, cut_off_date: v }))} />}
          </Field>
          <Field label="ETD">
            {ids => <DatePicker {...ids} value={roFields.etd}
              onChange={v => setRoFields(f => ({ ...f, etd: v }))} />}
          </Field>
          <Field label="ETA (Destination)">
            {ids => <DatePicker {...ids} value={roFields.eta}
              onChange={v => setRoFields(f => ({ ...f, eta: v }))} />}
          </Field>
        </>)}

        {/* Optional */}
        <Field label="Next Port of Discharge (if transshipment)">
          {ids => <Input {...ids} value={roFields.next_port_of_discharge ?? ''}
            onChange={e => setRoFields(f => ({ ...f, next_port_of_discharge: e.target.value }))}
            placeholder="Optional — leave blank for direct service" />}
        </Field>
      </section>

      {/* Notes */}
      <Field label="Notes for CS (optional)">
        {ids => <Textarea {...ids} rows={2} className="resize-y"
          value={formNote} onChange={e => setFormNote(e.target.value)}
          placeholder="Any instructions or remarks for the CS team…" />}
      </Field>
      {/* Submit */}
      <div className="flex justify-end">
        <Button variant="primary" disabled={!roFields.reference_nbr.trim()} icon={<Send size={14} aria-hidden="true" />}
          onClick={handleModalSubmit}>
          Send Release Order to CS
        </Button>
      </div>
    </div>
  )
})() : selectedItem.actionKind === 'confirm-liner-booking' && actionModal ? (() => {
  const { booking: cbBkg } = actionModal.sourceData
  return (
    <div className="flex flex-col gap-4">
      <div>
        <StepHeader className="mb-px rounded-b-none" title="LINER BOOKING CONFIRMATION" subtitle={`RA# ${cbBkg.voyage_number || '—'}`} />
        {/* Booking summary — read-only */}
        <div className="overflow-hidden rounded-b-card border border-line-soft bg-surface">
          {[
            { label: 'Customer', value: cbBkg.customer_name },
            { label: 'Carrier', value: cbBkg.shipping_line || '—' },
            { label: 'Container', value: `${cbBkg.quantity}x ${cbBkg.container_type}` },
            { label: 'RA Number', value: cbBkg.voyage_number || 'Not assigned' },
            { label: 'Vessel', value: cbBkg.vessel_name || '—' },
            { label: 'Route', value: `${cbBkg.origin} → ${cbBkg.destination}` },
          ].map(({ label, value }) => (
            <SummaryRow key={label} label={label} strong={label === 'RA Number'} className="last:border-b-0">{value}</SummaryRow>
          ))}
        </div>
      </div>
      {/* Booked? toggle */}
      <div className="flex flex-col gap-1">
        <span id="ws-clb-booked-label" className={labelClass}>Was the liner booking confirmed?</span>
        <div role="group" aria-labelledby="ws-clb-booked-label" className="flex gap-2.5">
          {(['yes', 'no'] as const).map(v => (
            <Button key={v} aria-pressed={linerBooked === v}
              className={cn('flex-1', linerBooked === v && (v === 'yes' ? SELECTED_SUCCESS : SELECTED_DANGER))}
              icon={v === 'yes' ? <Check size={14} aria-hidden="true" /> : <X size={14} aria-hidden="true" />}
              onClick={() => setLinerBooked(v)}>
              {v === 'yes' ? 'Yes, booked' : 'No, couldn\'t book'}
            </Button>
          ))}
        </div>
      </div>
      {/* Reason — shown only when No */}
      {linerBooked === 'no' && (
        <Field label="Reason (required)">
          {ids => <Textarea {...ids} rows={3} className="resize-y"
            value={formNote} onChange={e => setFormNote(e.target.value)}
            placeholder="Explain why the booking couldn't be made…" />}
        </Field>
      )}
      {/* Submit */}
      <div className="flex justify-end gap-2.5">
        <Button variant={linerBooked === 'no' ? 'danger' : 'primary'}
          disabled={!linerBooked || (linerBooked === 'no' && !formNote.trim())}
          onClick={handleModalSubmit}>
          {linerBooked === 'no' ? 'Revert to Pending Liner' : 'Confirm Liner Booking'}
        </Button>
      </div>
    </div>
  )
})() : selectedItem.actionKind === 'submit-si' && actionModal ? (() => {
  const siBkg = actionModal.sourceData.booking as Booking
  const siCutoffCell = 'flex-1 border-r border-line-soft px-3 py-1.5 last:border-r-0'
  return (
    <div className="flex flex-col gap-4">
      <StepHeader title="RECORD SHIPPING INSTRUCTIONS" />

      {/* Booking summary */}
      <div className="rounded-card border border-line-soft bg-primary-subtle px-3.5 py-2.5 text-control text-fg">
        <strong>{siBkg.customer_name}</strong> — {siBkg.origin} → {siBkg.destination}
        <span className="ml-2 text-fg-muted">
          {siBkg.quantity}x {siBkg.container_type} · {siBkg.shipping_line || 'No liner'}
        </span>
      </div>

      {/* Cutoff dates */}
      {(siBkg.si_cutoff_date || siBkg.bl_cutoff_date || siBkg.vgm_cutoff_date) && (
        <div className="flex overflow-hidden rounded-card border border-line-soft bg-canvas text-label text-fg">
          {siBkg.si_cutoff_date && (
            <div className={siCutoffCell}><span className="text-fg-muted">SI Cutoff:</span> <strong>{siBkg.si_cutoff_date}</strong></div>
          )}
          {siBkg.bl_cutoff_date && (
            <div className={siCutoffCell}><span className="text-fg-muted">BL Cutoff:</span> <strong>{siBkg.bl_cutoff_date}</strong></div>
          )}
          {siBkg.vgm_cutoff_date && (
            <div className={siCutoffCell}><span className="text-fg-muted">VGM Cutoff:</span> <strong>{siBkg.vgm_cutoff_date}</strong></div>
          )}
        </div>
      )}

      {/* Collapsible Release Order reference */}
      {siBkg.release_order_fields && (
        <ReleaseOrderReference ro={siBkg.release_order_fields} bkg={siBkg} collapsed={roRefCollapsed} onToggle={() => setRoRefCollapsed(!roRefCollapsed)} />
      )}

      {/* SI Document: Paste / Upload */}
      <div className="flex flex-col gap-1">
        <span id="ws-ssi-doc-label" className={labelClass}>SI Document</span>
        <div role="group" aria-labelledby="ws-ssi-doc-label" className="mb-1 flex gap-2">
          <Button aria-pressed={siMode === 'paste'} className={cn(siMode === 'paste' && SELECTED_TOGGLE)}
            icon={<ClipboardPaste size={14} aria-hidden="true" />}
            onClick={() => setSiMode('paste')}>
            Paste
          </Button>
          <Button aria-pressed={siMode === 'upload'} className={cn(siMode === 'upload' && SELECTED_TOGGLE)}
            icon={<Paperclip size={14} aria-hidden="true" />}
            onClick={() => setSiMode('upload')}>
            Upload
          </Button>
        </div>
        {siMode === 'paste' && (
          <Textarea aria-labelledby="ws-ssi-doc-label" className="min-h-[90px] resize-y font-mono text-label leading-normal"
            value={siContent} onChange={e => setSiContent(e.target.value)}
            placeholder="Paste shipping instructions here..." />
        )}
        {siMode === 'upload' && (
          <FileAttach accept=".pdf,.xlsx,.xls,.csv,.png,.jpg,.jpeg,.txt,.doc,.docx" label="Choose file" fileName={siFileName}
            describedBy="ws-ssi-doc-label"
            onFile={file => {
              setSiFileName(file.name)
              const reader = new FileReader()
              reader.onload = () => setSiContent(reader.result as string)
              reader.readAsDataURL(file)
            }}
            onRemove={() => { setSiFileName(''); setSiContent('') }} />
        )}
      </div>

      {/* VGM Document */}
      <div className="flex flex-col gap-1">
        <span id="ws-ssi-vgm-label" className={labelClass}>VGM Document (optional)</span>
        <FileAttach accept=".pdf,.xlsx,.xls,.csv,.png,.jpg,.jpeg,.doc,.docx" label="Upload VGM" fileName={vgmCertFileName}
          describedBy="ws-ssi-vgm-label"
          onFile={f => {
            setVgmCertFileName(f.name)
            const r = new FileReader()
            r.onload = () => setVgmCertContent(r.result as string)
            r.readAsDataURL(f)
          }}
          onRemove={() => { setVgmCertFileName(''); setVgmCertContent('') }} />
      </div>

      <Field label="Notes">
        {ids => <Input {...ids} value={formNote} onChange={e => setFormNote(e.target.value)}
          placeholder="Any notes about the SI submission..." />}
      </Field>

      {/* Submit */}
      <div className="flex justify-end">
        <Button variant="primary" disabled={!siContent.trim() || inttraSiLoading}
          icon={<Globe size={14} aria-hidden="true" />} onClick={handleModalSubmit}>
          Record SI{vgmCertFileName ? ' (VGM attached)' : ''}
        </Button>
      </div>
    </div>
  )
})() : selectedItem.actionKind === 'generate-si' && actionModal ? (() => {
  const gsBkg = actionModal.sourceData.booking as Booking
  const gsInput = (label: string, key: string, opts?: { placeholder?: string; readOnly?: boolean; span2?: boolean; type?: string }) => (
    <Field label={label} className={cn(opts?.span2 && 'col-span-full')}>
      {ids => opts?.type === 'date'
        ? <DatePicker {...ids} value={siField(key)} onChange={v => setSiField(key, v)} />
        : <Input {...ids} type={opts?.type || 'text'}
          value={siField(key)} onChange={e => setSiField(key, e.target.value)}
          placeholder={opts?.placeholder || ''} readOnly={opts?.readOnly} className={cn(opts?.readOnly && 'bg-canvas')} />}
    </Field>
  )
  const gsTextarea = (label: string, key: string, placeholder?: string) => (
    <Field label={label} className="col-span-full">
      {ids => <Textarea {...ids} rows={3} className="resize-y"
        value={siField(key)} onChange={e => setSiField(key, e.target.value)}
        placeholder={placeholder || ''} />}
    </Field>
  )
  const gsSelect = (label: string, key: string, options: string[]) => (
    <Field label={label}>
      {ids => <Select {...ids} value={siField(key)} onChange={v => setSiField(key, v)}
        options={options.map(o => ({ value: o, label: o }))} />}
    </Field>
  )
  // Generate pre-filled email draft for NVOCC
  const generateEmailDraft = (): string => {
    const liner = siField('to_liner') || gsBkg.shipping_line || 'Liner'
    const lines = [
      `Subject: Shipping Instructions / Liner BL Instruction — ${siField('booking_ref')} — ${siField('pol')} → ${siField('pod')}`,
      '',
      `Dear ${liner},`,
      '',
      `Attn: ${siField('attn') || 'B/L Department'}`,
      '',
      `Please find below our Shipping Instructions for the above-referenced booking.`,
      '',
      '── BOOKING DETAILS ──────────────────────────',
      `Booking Ref:       ${siField('booking_ref')}`,
      siField('job_ref') ? `Job Ref:           ${siField('job_ref')}` : '',
      `BL Type:           ${siField('bl_type')}`,
      `Vessel / Voyage:   ${siField('vessel')} / ${siField('voyage')}`,
      `Delivery Type:     ${siField('delivery_type')}`,
      '',
      '── PARTIES ──────────────────────────────────',
      `Shipper:           ${siField('shipper_name')}`,
      siField('shipper_address') ? `                   ${siField('shipper_address').replace(/\n/g, '\n                   ')}` : '',
      `Consignee:         ${siField('consignee_name')}`,
      siField('consignee_address') ? `                   ${siField('consignee_address').replace(/\n/g, '\n                   ')}` : '',
      siField('notify_name') ? `Notify Party:      ${siField('notify_name')}` : '',
      '',
      '── ROUTING ──────────────────────────────────',
      `Place of Receipt:  ${siField('place_of_receipt')}`,
      `Port of Loading:   ${siField('pol')}`,
      `Port of Discharge: ${siField('pod')}`,
      siField('sob_date') ? `SOB Date:          ${siField('sob_date')}` : '',
      '',
      '── CONTAINER & CARGO ────────────────────────',
      `Container:         ${siField('container_no') || 'TBA'} (${siField('container_size')})`,
      siField('seal_no') ? `Seal No:           ${siField('seal_no')}` : '',
      `Description:       ${siField('description_of_goods')}`,
      `Weight:            ${siField('weight_kgs') || '—'} KGS`,
      siField('volume_m3') ? `Volume:            ${siField('volume_m3')} M3` : '',
      `Freight:           ${siField('freight')}`,
      `Total:             ${siField('total_containers')}`,
      '',
      'Please process the above instructions and issue the B/L accordingly.',
      '',
      'Thank you.',
      '',
      'Best regards,',
      `${activeEmployee.name || 'CS Team'}`,
      'Synergy Shipping & Logistics',
    ].filter(l => l !== '').join('\n')
    setSiEmailDraft(lines)
    setSiEmailShow(true)
    return lines
  }
  return (
    <div className="flex flex-col gap-4">
      <StepHeader title="GENERATE SI" subtitle={gsBkg.customer_name} />

      {/* Booking summary */}
      <div className="rounded-card border border-line-soft bg-primary-subtle px-3.5 py-2.5 text-control text-fg">
        <strong>{gsBkg.customer_name}</strong> — {gsBkg.origin} → {gsBkg.destination}
        <div className="mt-0.5 text-fg-muted">
          {gsBkg.quantity}x {gsBkg.container_type} · {gsBkg.shipping_line || 'No liner'}
          {gsBkg.job_reference_number && <span className="ml-2">· Job Ref: <strong>{gsBkg.job_reference_number}</strong></span>}
        </div>
      </div>

      {/* ══════ NON-NVOCC: Simple confirmation ══════ */}
      {!siIsNvocc && (
        <div className="flex flex-col gap-4">
          <div className="rounded-card border border-success-line bg-success-bg px-4 py-3.5">
            <div className="mb-2 text-control font-bold text-success">Confirm SI Submitted to Liner</div>
            <div className="text-control leading-relaxed text-fg-label">
              For non-NVOCC shipments, the Shipping Instructions are submitted directly to the liner by the shipper or through the liner's portal.
              Please confirm that the SI has been submitted for this booking.
            </div>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-3">
            <Field label="Shipping Line">
              {ids => <Input {...ids} value={gsBkg.shipping_line || ''} readOnly className="bg-canvas" />}
            </Field>
            <Field label="Booking Ref">
              {ids => <Input {...ids} value={gsBkg.id} readOnly className="bg-canvas" />}
            </Field>
          </div>
          <Field label="Notes (optional)">
            {ids => <Input {...ids} value={formNote}
              onChange={e => setFormNote(e.target.value)} placeholder="e.g. SI submitted via INTTRA portal on..." />}
          </Field>
        </div>
      )}

      {/* ══════ NVOCC: Full SI Generation Form ══════ */}
      {siIsNvocc && (
        <div className="flex flex-col gap-4">
          <FormSection title="Addressed To">
            {gsInput('To (Shipping Line)', 'to_liner', { placeholder: 'e.g. HAPAG LLOYD' })}
            {gsInput('Attn', 'attn', { placeholder: 'e.g. B/L DEPARTMENT' })}
            {gsSelect('BL Type', 'bl_type', ['ORIGINAL', 'SEAWAY BILL', 'TELEX RELEASE', 'EXPRESS RELEASE'])}
          </FormSection>

          <FormSection title="Reference">
            {gsInput('Booking Ref', 'booking_ref', { readOnly: true })}
            {gsInput('Job Ref', 'job_ref', { readOnly: true })}
          </FormSection>

          {/* One column */}
          <section className="flex flex-col gap-3">
            <SectionHead>Parties</SectionHead>
            {gsInput('Shipper Name', 'shipper_name', { placeholder: 'Shipper company name' })}
            {gsTextarea('Shipper Address', 'shipper_address', 'Full shipper address...')}
            {gsInput('Consignee Name', 'consignee_name', { placeholder: 'Consignee company name' })}
            {gsTextarea('Consignee Address', 'consignee_address', 'Full consignee address...')}
            {gsInput('Notify Party Name', 'notify_name', { placeholder: 'Notify party name' })}
            {gsTextarea('Notify Party Address', 'notify_address', 'Notify party address...')}
          </section>

          <FormSection title="Vessel & Route">
            {gsInput('Vessel', 'vessel')}
            {gsInput('Voyage', 'voyage')}
            {gsSelect('Delivery Type', 'delivery_type', ['CY/CY', 'CY/SD', 'SD/CY', 'SD/SD'])}
            {gsInput('Place of Receipt', 'place_of_receipt')}
            {gsInput('Port of Loading (POL)', 'pol')}
            {gsInput('Port of Discharge (POD)', 'pod')}
            {gsInput('SOB Date', 'sob_date', { type: 'date' })}
          </FormSection>

          <FormSection title="Container Details">
            {gsInput('Container No', 'container_no', { placeholder: 'e.g. HLBU1234567' })}
            {gsInput('Seal No', 'seal_no', { placeholder: 'e.g. SL123456' })}
            {gsInput('Container Size/Type', 'container_size', { readOnly: true })}
          </FormSection>

          <FormSection title="Cargo Details">
            {gsTextarea('Marks & Nos', 'marks_and_numbers', 'Marks and numbers...')}
            {gsTextarea('Description of Goods', 'description_of_goods', 'Commodity description...')}
            {gsInput('Weight (KGS)', 'weight_kgs', { placeholder: '0.00', type: 'number' })}
            {gsInput('Volume (M3)', 'volume_m3', { placeholder: '0.00', type: 'number' })}
          </FormSection>

          <FormSection title="Terms">
            <ToggleGroup label="Freight" options={['PREPAID', 'COLLECT'] as const} value={siField('freight')}
              onSelect={f => setSiField('freight', f)} />
            {gsInput('Total Containers', 'total_containers', { readOnly: true })}
            <ToggleGroup label="Shipped on Board" options={['YES', 'NO'] as const} value={siField('shipped_on_board')}
              onSelect={v => setSiField('shipped_on_board', v)} />
          </FormSection>

          <Field label="Notes (optional)">
            {ids => <Input {...ids} value={formNote}
              onChange={e => setFormNote(e.target.value)} placeholder="Internal notes..." />}
          </Field>

          {/* ── SEND TO LINER ── */}
          <div className="flex flex-col gap-3 border-t-2 border-line pt-4">
            <Field label="Liner Email Address" required>
              {ids => <Input {...ids} type="email"
                value={siLinerEmail} onChange={e => setSiLinerEmail(e.target.value)}
                placeholder="bl@hapag-lloyd.com" />}
            </Field>
            <Button variant="primary" className="w-full justify-start" icon={<Mail size={14} aria-hidden="true" />}
              disabled={!siLinerEmail.includes('@')}
              onClick={() => {
                const draft = siEmailDraft.trim() || generateEmailDraft()
                const lines = draft.split('\n')
                const subject = lines[0].replace(/^Subject:\s*/i, '').trim()
                const body = lines.slice(2).join('\n')
                openMailto(siLinerEmail, subject, body)
              }}>
              Open in Outlook
            </Button>

            {/* Draft — collapsible, optional */}
            {!siEmailShow ? (
              <Button className="w-full font-semibold text-primary" icon={<ChevronRight size={14} aria-hidden="true" />}
                onClick={generateEmailDraft}>
                View Email Draft
              </Button>
            ) : (
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span id="ws-gs-draft-label" className="text-label font-bold uppercase tracking-label text-primary">Email Draft to Liner</span>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" icon={<ClipboardPaste size={12} aria-hidden="true" />}
                      onClick={() => { navigator.clipboard.writeText(siEmailDraft) }}>
                      Copy
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setSiEmailShow(false)}>Collapse</Button>
                  </div>
                </div>
                <Textarea aria-labelledby="ws-gs-draft-label" rows={16} className="resize-y font-mono text-label leading-relaxed"
                  value={siEmailDraft} onChange={e => setSiEmailDraft(e.target.value)} />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Submit (this step renders inline only, so it needs its own button) */}
      {(() => {
        const gsDisabled = siIsNvocc && (!siField('shipper_name').trim() || !siField('consignee_name').trim())
        return (
          <div className="flex justify-end">
            <Button variant="primary" onClick={handleModalSubmit} disabled={gsDisabled}
              icon={siIsNvocc ? <FileText size={14} aria-hidden="true" /> : <Check size={14} aria-hidden="true" />}>
              {siIsNvocc ? 'Generate SI Document' : 'Confirm SI Submitted'}
            </Button>
          </div>
        )
      })()}
    </div>
  )
})() : selectedItem.actionKind === 'save-vessel-schedule' && actionModal ? (() => {
  const blBkg = actionModal.sourceData.booking as Booking
  const roBookings = bookings.filter(b => b.release_order_fields)
  const applyReleaseOrder = (roId: string) => {
    setSelectedReleaseOrderId(roId)
    const ro = bookings.find(b => b.id === roId)
    if (!ro) return
    setFormVessel(ro.vessel_name || '')
    setFormVoyage(ro.voyage_number || '')
    setVesselPol(ro.origin || '')
    setVesselFinalPod(ro.destination || '')
    if (ro.release_order_fields) {
      setVesselEtdPol(ro.release_order_fields.etd || '')
      setVesselEtaFpod(ro.release_order_fields.eta || '')
    }
  }
  const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()
  const vesselMatches = formVessel.trim().length >= 2
    ? vesselSchedules
        .filter(vs => vs.created_at >= twoWeeksAgo && vs.vessel_name.toLowerCase().includes(formVessel.trim().toLowerCase()))
        .reduce<typeof vesselSchedules>((acc, vs) => {
          const key = `${vs.vessel_name.toLowerCase()}|${vs.voyage_number.toLowerCase()}`
          const existing = acc.findIndex(v => `${v.vessel_name.toLowerCase()}|${v.voyage_number.toLowerCase()}` === key)
          if (existing >= 0) { if (vs.created_at > acc[existing].created_at) acc[existing] = vs }
          else acc.push(vs)
          return acc
        }, [])
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
        .slice(0, 5)
    : []
  const applyVesselSchedule = (vs: typeof vesselSchedules[number]) => {
    setFormVessel(vs.vessel_name); setFormVoyage(vs.voyage_number)
    setVesselScheduleType(vs.schedule_type); setVesselPol(vs.pol)
    setVesselEtaPol(vs.eta_pol); setVesselEtdPol(vs.etd_pol)
    setVesselRoutingType(vs.routing_type); setVesselFinalPod(vs.final_pod)
    setVesselEtaFpod(vs.eta_fpod); setVesselRemarks(vs.remarks)
    setVesselAgent(vs.agent); setShowVesselSuggestions(false)
  }
  // Picking a suggestion fills the whole schedule; items are keyed by schedule id because one vessel can have several voyages.
  // The pick replaces the text with the vessel name, which would reopen the list, so right after a pick (fields match a
  // suggestion and showVesselSuggestions is false) the list is empty. Typing or leaving the field shows it again.
  const vesselJustPicked = !showVesselSuggestions && vesselMatches.some(vs => vs.vessel_name === formVessel && vs.voyage_number === formVoyage)
  const vesselItems: ComboBoxItem[] = (vesselJustPicked ? [] : vesselMatches).map(vs => ({
    value: vs.id,
    label: `${vs.vessel_name} / ${vs.voyage_number}`,
    description: `${vs.pol}${vs.final_pod ? ` → ${vs.final_pod}` : ''}${vs.etd_pol ? ` · ETD ${vs.etd_pol}` : ''} · ${vs.schedule_type}`,
  }))
  const svsDate = (label: string, value: string, onChange: (v: string) => void) => (
    <Field label={label}>
      {ids => (
        <div className="flex gap-1">
          <DatePicker {...ids} className="flex-1" value={value} onChange={onChange} />
          {value && (
            <Tooltip content={`Clear ${label}`}>
              <Button variant="ghost" className="w-8 px-0" aria-label={`Clear ${label}`}
                icon={<X size={14} aria-hidden="true" />} onClick={() => onChange('')} />
            </Tooltip>
          )}
        </div>
      )}
    </Field>
  )
  return (
    <div className="flex flex-col gap-4">
      <StepHeader title="VESSEL SCHEDULE" subtitle={`${blBkg.customer_name} · ${blBkg.origin} → ${blBkg.destination}`} />

      {roBookings.length > 0 && (
        <Field label="Pre-fill from Release Order (optional)">
          {ids => <Select {...ids} value={selectedReleaseOrderId} onChange={applyReleaseOrder}
            options={[
              { value: '', label: '— Select a release order —' },
              ...roBookings.map(b => ({ value: b.id, label: `${b.customer_name} · ${b.vessel_name} / ${b.voyage_number} (${b.origin} → ${b.destination})` })),
            ]} />}
        </Field>
      )}

      <ToggleGroup label="Vessel Schedule Type" options={['FCL', 'CONSOL', 'BOTH'] as const} value={vesselScheduleType}
        onSelect={setVesselScheduleType} stretch />

      <div className="grid grid-cols-2 gap-x-4 gap-y-3">
        <Field label="Vessel" hint="Recent vessels from the last 2 weeks">
          {ids => <ComboBox {...ids} value={formVessel} onChange={v => { setFormVessel(v); setShowVesselSuggestions(true) }} items={vesselItems}
            filter={() => true} menuTrigger="focus" onBlur={() => setShowVesselSuggestions(true)}
            onPick={id => { const vs = vesselMatches.find(v => v.id === id); if (vs) applyVesselSchedule(vs) }}
            placeholder="e.g. MSC America" />}
        </Field>
        <Field label="Voyage">
          {ids => <Input {...ids} value={formVoyage} onChange={e => setFormVoyage(e.target.value)} placeholder="e.g. QB614W" />}
        </Field>
        <Field label="Port of Loading">
          {ids => <Input {...ids} value={vesselPol} onChange={e => setVesselPol(e.target.value)} placeholder="e.g. Colombo" />}
        </Field>
        {svsDate('ETD POL', vesselEtdPol, setVesselEtdPol)}
        {svsDate('ETA POL', vesselEtaPol, setVesselEtaPol)}
        <Field label="Routing Type">
          {ids => <Select {...ids} value={vesselRoutingType} onChange={v => setVesselRoutingType(v as 'DIRECT' | 'TRANSSHIPMENT')}
            options={[{ value: 'DIRECT', label: 'Direct' }, { value: 'TRANSSHIPMENT', label: 'Transshipment' }]} />}
        </Field>
        <Field label="Final Port of Discharge">
          {ids => <Input {...ids} value={vesselFinalPod} onChange={e => setVesselFinalPod(e.target.value)} placeholder="e.g. Felixstowe" />}
        </Field>
        {svsDate('ETA FPOD', vesselEtaFpod, setVesselEtaFpod)}
      </div>

      <Field label="Remarks">
        {ids => <Textarea {...ids} rows={2} className="resize-y" value={vesselRemarks} onChange={e => setVesselRemarks(e.target.value)} placeholder="Any remarks about the vessel schedule..." />}
      </Field>
      <Field label="Agent">
        {ids => <Textarea {...ids} rows={2} className="resize-y" value={vesselAgent} onChange={e => setVesselAgent(e.target.value)} placeholder="Agent details..." />}
      </Field>

      <div className="flex justify-end">
        <Button variant="primary"
          disabled={!formVessel.trim() || !formVoyage.trim()}
          onClick={() => {
            onAddVesselSchedule({
              vessel_name: formVessel.trim(), voyage_number: formVoyage.trim(),
              schedule_type: vesselScheduleType, pol: vesselPol.trim(),
              eta_pol: vesselEtaPol, etd_pol: vesselEtdPol,
              routing_type: vesselRoutingType, final_pod: vesselFinalPod.trim(),
              eta_fpod: vesselEtaFpod, remarks: vesselRemarks.trim(),
              agent: vesselAgent.trim(), created_at: new Date().toISOString(),
              created_by: activeEmployee.id,
            })
            onMarkBlVesselConfirmed(blBkg.id)
            onLogActivity({
              actor_role: activeRole as UserRole, actor_id: activeEmployee.id,
              action: `Vessel schedule confirmed for ${blBkg.customer_name}: ${formVessel.trim()} / ${formVoyage.trim()}${vesselEtdPol ? ` · ETD ${vesselEtdPol}` : ''}`,
              ref_type: 'booking', ref_id: blBkg.id, customer_name: blBkg.customer_name, pushed_to: 'CS', notes: '',
            })
            onFlash(`Vessel schedule saved for ${blBkg.customer_name}`)
            setVesselCreatedPrompt({
              vesselName: formVessel.trim(), voyageNumber: formVoyage.trim(),
              pol: vesselPol.trim(), fpod: vesselFinalPod.trim(),
              etdPol: vesselEtdPol, etaFpod: vesselEtaFpod,
              bookingId: blBkg.id,
            })
            setActionModal(null)
          }}>
          Confirm Vessel Schedule →
        </Button>
      </div>
    </div>
  )
})() : selectedItem.actionKind === 'create-vessel-booking' && actionModal ? (() => {
  const blBkg = actionModal.sourceData.booking as Booking
  const formInput = (label: string, key: string, opts?: { type?: string; placeholder?: string; span2?: boolean; readOnly?: boolean }) => (
    <Field label={label} className={cn(opts?.span2 && 'col-span-full')}>
      {ids => opts?.type === 'date'
        ? <DatePicker {...ids} value={bkgField(key)} onChange={v => setBkgField(key, v)} />
        : opts?.type === 'time'
          ? <TimeField {...ids} value={bkgField(key)} onChange={v => setBkgField(key, v)} />
          : <Input {...ids} type={opts?.type || 'text'} value={bkgField(key)} onChange={e => setBkgField(key, e.target.value)}
            placeholder={opts?.placeholder || ''} readOnly={opts?.readOnly} className={cn(opts?.readOnly && 'bg-canvas')} />}
    </Field>
  )
  const formSelect = (label: string, key: string, options: string[]) => (
    <Field label={label}>
      {ids => <Select {...ids} value={bkgField(key)} onChange={v => setBkgField(key, v)}
        options={options.map(o => ({ value: o, label: o || '—' }))} />}
    </Field>
  )
  const formTextarea = (label: string, key: string, placeholder?: string) => (
    <Field label={label} className="col-span-full">
      {ids => <Textarea {...ids} rows={2} className="resize-y"
        value={bkgField(key)} onChange={e => setBkgField(key, e.target.value)} placeholder={placeholder || ''} />}
    </Field>
  )
  const readOnlyInput = (label: string, value: string) => (
    <Field label={label}>
      {ids => <Input {...ids} value={value} readOnly className="bg-canvas" />}
    </Field>
  )
  // Same lists as the old hand-made dropdowns: unique vessel names, and voyages narrowed by the typed vessel.
  const cvbVesselQ = formVessel.toLowerCase()
  const cvbVesselItems: ComboBoxItem[] = MOCK_OPEN_VOYAGES
    .filter(v => v.vesselName.toLowerCase().includes(cvbVesselQ))
    .filter((v, i, arr) => arr.findIndex(x => x.vesselName === v.vesselName) === i)
    .map(v => ({ value: v.vesselName, description: v.shippingLine }))
  const cvbVoyageQ = formVoyage.toLowerCase()
  const cvbVesselFilter = formVessel.trim().toLowerCase()
  // Keyed by id so repeated voyage numbers stay separate. A pick sets the text to the voyage number, which would reopen the
  // list, so right after a pick (vessel and voyage match an open voyage, voyageDropOpen false) the list is empty.
  const cvbVoyageJustPicked = !voyageDropOpen && MOCK_OPEN_VOYAGES.some(v => v.vesselName === formVessel && v.voyageNumber === formVoyage)
  const cvbVoyageItems: ComboBoxItem[] = cvbVoyageJustPicked ? [] : MOCK_OPEN_VOYAGES
    .filter(v =>
      (v.voyageNumber.toLowerCase().includes(cvbVoyageQ) || v.vesselName.toLowerCase().includes(cvbVoyageQ)) &&
      (!cvbVesselFilter || v.vesselName.toLowerCase().includes(cvbVesselFilter))
    )
    .map(v => ({ value: v.id, label: `${v.voyageNumber} · ${v.vesselName} · ${v.shippingLine}`, description: `${v.pol} → ${v.fpod} · ETD ${v.etdPol} · ETA ${v.etaFpod}` }))
  return (
    <div className="flex flex-col gap-4">

      {/* ── Unknown vessel / voyage warning ── */}
      <Modal isOpen={!!unknownVoyageWarning} onClose={() => setUnknownVoyageWarning(null)} size="sm"
        title={unknownVoyageWarning?.field === 'vessel' ? 'Vessel Not Found' : 'Voyage Not Found'}
        footer={<>
          <Button onClick={() => setUnknownVoyageWarning(null)}>
            Keep Editing
          </Button>
          <Button variant="primary"
            onClick={() => { setUnknownVoyageWarning(null); setActionModal(null); setActiveStep('cs-bl-vessel') }}>
            Go to Vessel Step
          </Button>
        </>}>
        {unknownVoyageWarning && (
          <div className="flex items-start gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-card bg-warning-bg">
              <AlertTriangle size={18} className="text-warning" aria-hidden="true" />
            </div>
            <div className="text-control leading-relaxed text-fg-label">
              <strong className="text-fg">"{unknownVoyageWarning.value}"</strong> does not match any open {unknownVoyageWarning.field} record.
              <br /><br />
              Please verify that you typed it correctly, or go to the <strong>Vessel step (Step 11)</strong> to add this {unknownVoyageWarning.field} as a new open voyage first.
            </div>
          </div>
        )}
      </Modal>

      <StepHeader title="BOOKING" subtitle={`${blBkg.customer_name} · ${blBkg.origin} → ${blBkg.destination}`} />

      {(formVessel || formVoyage) && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 rounded-card border border-line-soft bg-primary-subtle px-3 py-2 text-control text-fg">
          {formVessel && <span><span className="text-fg-muted">Vessel:</span> <strong>{formVessel}</strong></span>}
          {formVoyage && <span><span className="text-fg-muted">Voyage:</span> <strong>{formVoyage}</strong></span>}
          {vesselPol && <span><span className="text-fg-muted">POL:</span> {vesselPol}</span>}
          {vesselFinalPod && <span><span className="text-fg-muted">FPOD:</span> {vesselFinalPod}</span>}
          {vesselEtdPol && <span><span className="text-fg-muted">ETD:</span> {vesselEtdPol}</span>}
          {vesselEtaFpod && <span><span className="text-fg-muted">ETA:</span> {vesselEtaFpod}</span>}
        </div>
      )}

      <FormSection title="Vessel Details">
        {/* Vessel combobox; a typed name that matches no open voyage raises the warning on blur */}
        <Field label="Vessel">
          {ids => <ComboBox {...ids} value={formVessel} items={cvbVesselItems} filter={() => true} menuTrigger="focus"
            onChange={v => { vesselPickedRef.current = false; setFormVessel(v) }}
            onPick={() => { vesselPickedRef.current = true }}
            onBlur={() => setTimeout(() => {
              if (vesselPickedRef.current) { vesselPickedRef.current = false; return }
              const v = formVessel.trim()
              if (v && !MOCK_OPEN_VOYAGES.some(o => o.vesselName.toLowerCase() === v.toLowerCase()))
                setUnknownVoyageWarning({ field: 'vessel', value: v })
            }, 150)}
            placeholder="Search vessel name…" />}
        </Field>

        {/* Voyage combobox — selecting a voyage auto-fills all vessel fields */}
        <Field label="Voyage">
          {ids => <ComboBox {...ids} value={formVoyage} items={cvbVoyageItems} filter={() => true} menuTrigger="focus"
            onChange={v => { voyagePickedRef.current = false; setFormVoyage(v); setVoyageDropOpen(true) }}
            onPick={id => {
              const v = MOCK_OPEN_VOYAGES.find(o => o.id === id)
              if (!v) return
              voyagePickedRef.current = true
              setVoyageDropOpen(false)
              setFormVessel(v.vesselName)
              setFormVoyage(v.voyageNumber)
              setVesselPol(v.pol)
              setVesselFinalPod(v.fpod)
              setVesselEtdPol(v.etdPol)
              setVesselEtaFpod(v.etaFpod)
            }}
            onBlur={() => { setVoyageDropOpen(true); setTimeout(() => {
              if (voyagePickedRef.current) { voyagePickedRef.current = false; return }
              const v = formVoyage.trim()
              if (v && !MOCK_OPEN_VOYAGES.some(o => o.voyageNumber.toLowerCase() === v.toLowerCase()))
                setUnknownVoyageWarning({ field: 'voyage', value: v })
            }, 150) }}
            placeholder="Search voyage number…" />}
        </Field>
        {readOnlyInput('Port of Loading', vesselPol)}
        {readOnlyInput('Port of Discharge', vesselFinalPod)}
        {readOnlyInput('ETD POL', vesselEtdPol)}
        {readOnlyInput('ETA FPOD', vesselEtaFpod)}
        {formInput('SOB Date', 'sob_date', { type: 'date' })}
        {readOnlyInput('Routing Type', vesselRoutingType)}
      </FormSection>

      <FormSection title="Business Details">
        {formInput('Inquiry Ref No', 'inquiry_ref')}
        {formInput('Quotation Ref No', 'quotation_ref')}
        {formSelect('Customer Category', 'customer_category', ['CUSTOMER', 'FORWARDER'])}
        {formSelect('Business Type', 'business_type', ['SALES NOMINATION', 'AGENT NOMINATION', 'FREE HAND'])}
        {formSelect('Revenue Type', 'revenue_type', ['FREIGHT FORWARDING', 'FREIGHT BROKERING'])}
        {formInput('Customer', 'customer')}
        {formInput('Billing Party', 'billing_party')}
        {formInput('Sales Person', 'sales_person')}
        {formInput('CS Executive', 'cs_executive')}
        {formInput('Documentation By', 'documentation_by')}
        {formInput('FCL Cutoff Date', 'fcl_cutoff_date', { type: 'date' })}
        {formInput('LCL Cutoff Date', 'lcl_cutoff_date', { type: 'date' })}
      </FormSection>

      <FormSection title="Shipping Details">
        {formInput('Shipper Name (Booking Party)', 'shipper_name', { span2: true })}
        {formTextarea('Shipper Address', 'shipper_address')}
        {formInput('Actual Shipper', 'actual_shipper', { span2: true })}
        {formInput('Contact Person', 'contact_person')}
        {formInput('Telephone', 'telephone')}
        {formInput('Email Address', 'email_address', { type: 'email', span2: true })}
        {formInput('Consignee', 'consignee', { span2: true })}
        {formTextarea('Consignee Address', 'consignee_address')}
        {formInput('Notify', 'notify', { span2: true })}
        {formTextarea('Notify Address', 'notify_address')}
      </FormSection>

      <FormSection title="Cargo & Container">
        {formInput('Commodity', 'commodity', { span2: true })}
        {formInput('Receiving Terminal', 'receiving_terminal')}
        {formInput('Final Destination', 'final_destination')}
        {formInput('Transit Days', 'transit_days', { type: 'number' })}
        {formInput('ETA Final Destination', 'eta_final_destination', { type: 'date' })}
        {formInput('Place of Delivery', 'place_of_delivery')}
        {formInput('ETA Place of Delivery', 'eta_place_of_delivery', { type: 'date' })}
        {formInput('Carrier', 'carrier')}
        {formInput('Booking Carrier Ref', 'booking_carrier_ref')}
        {formInput('INTRA Booking No', 'intra_booking_no')}
        {formInput('PO No', 'po_no')}
        {formInput('Email Ref', 'email_ref')}
        {formSelect('Cargo Type', 'cargo_type', ['GENERAL', 'DG'])}
        {formSelect('Freight Term', 'freight_term', ['PREPAID', 'COLLECT'])}
        {formSelect('MB/L Term', 'mbl_term', ['PREPAID', 'COLLECT'])}
        {formInput('No of Packages', 'no_of_packages', { type: 'number' })}
        {formInput('Package Type', 'package_type', { placeholder: 'e.g. Pallets, Cartons' })}
        {formInput('Gross Weight (KG)', 'gross_weight', { type: 'number' })}
        {formInput('Net Weight (KG)', 'net_weight', { type: 'number' })}
        {formInput('Volume (CBM)', 'volume_cbm', { type: 'number' })}
        {formInput('Weight/Measurement Ratio', 'weight_measurement_ratio')}
      </FormSection>

      <div className="rounded-card border border-warning-line bg-warning-bg px-3 py-2 text-control text-fg">
        <strong>Container:</strong> {bkgField('container_count')}x {bkgField('container_size')}
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-3">
        {formSelect('Delivery Type', 'delivery_type_bkg', ['CFS/DOOR', 'DOOR/CFS', 'DOOR/DOOR', 'DOOR/CY', 'CY/DOOR', 'CY/CY', 'CY/CFS', 'CY/RR', 'CFS/CY', 'CFS/CFS', 'DOOR/PORT', 'PORT/DOOR', 'PORT/PORT', 'TILLING TITE', 'CHECK'])}
        {formInput('Incoterm', 'incoterm', { placeholder: 'e.g. FOB, CIF, EXW, DDP' })}
        {formInput('Pickup Type', 'pickup_type')}
        {formInput('Inland Haulage Type', 'inland_haulage_type')}
      </div>

      <FormSection title="B/L Details">
        {formSelect('B/L Issue Type', 'bl_issue_type', ['OWN', 'THROUGH', 'CARRIER BL', 'RMAT', 'SWITCH BL', 'AGENT BL'])}
        {formSelect('HB/L Issue Term', 'hbl_issue_term', ['', 'COPY', 'DRAFT', 'NON-NEGO', 'ORIGINAL', 'SEAWAY', 'SURRENDER', 'AS PER B/L INSTRUCTIONS'])}
        {formSelect('MB/L Issue Term', 'mbl_issue_term', ['', 'COPY', 'DRAFT', 'NON-NEGO', 'ORIGINAL', 'SEAWAY', 'SURRENDER', 'AS PER B/L INSTRUCTIONS'])}
        {formSelect('B/L Format', 'bl_format', ['SELECT HBL FORMAT', 'CLS', 'CLS BDT', 'CLS NONE-NEGO', 'CLS LIGENTIA', 'CLS LOGFRET', 'CLS_FMC', 'CLS_BDT(SW)', 'TRANSMODAL', 'TRANSMODAL(SW)'])}
        {formInput('B/L Number', 'bl_number')}
        {formInput('Shipping Bill No', 'shipping_bill_no')}
        {formInput('B/L Cutoff Date', 'bl_cutoff_date', { type: 'date' })}
        {formInput('B/L Cutoff Time', 'bl_cutoff_time', { type: 'time' })}
        {formInput('VGM Cutoff Date', 'vgm_cutoff_date', { type: 'date' })}
        {formInput('VGM Cutoff Time', 'vgm_cutoff_time', { type: 'time' })}
        {formSelect('Destination Charges', 'destination_charges', ['COLLECT', 'PREPAID'])}
        {formInput('Permit No', 'permit_no')}
      </FormSection>

      {/* One column */}
      <section className="flex flex-col gap-3">
        <SectionHead>Remarks</SectionHead>
        {formTextarea('Marks and Numbers', 'marks_and_numbers', 'Marks, numbers, container numbers...')}
        {formTextarea('Description of Goods', 'description_of_goods', 'Goods description for B/L...')}
        {formTextarea('B/L Instructions', 'bl_instructions', 'Special B/L instructions...')}
        {formTextarea('Remarks (Customer)', 'remarks_customer', 'Customer-facing remarks...')}
        {formTextarea('Remarks (Internal)', 'remarks_internal', 'Internal notes...')}
      </section>

      <div className="flex justify-end">
        <Button variant="primary"
          onClick={() => {
            onMarkBlBookingCreated(blBkg.id)
            onLogActivity({
              actor_role: activeRole as UserRole, actor_id: activeEmployee.id,
              action: `Vessel booking created in Gensoft for ${blBkg.customer_name}.`,
              ref_type: 'booking', ref_id: blBkg.id, customer_name: blBkg.customer_name, pushed_to: 'CS',
              notes: `Customer: ${bkgField('customer')} | Carrier: ${bkgField('carrier')} | Incoterm: ${bkgField('incoterm')}`,
            })
            onFlash(`Vessel booking saved for ${blBkg.customer_name}`)
            setActionModal(null)
          }}>
          Save Booking →
        </Button>
      </div>
    </div>
  )
})() : selectedItem.actionKind === 'create-hbl' && actionModal ? (() => {
  const chblBkg = actionModal.sourceData.booking as Booking
  // Helper: input field
  const hInput = (label: string, key: string, opts?: { placeholder?: string; readOnly?: boolean; span2?: boolean; type?: string }) => (
    <Field label={label} className={cn(opts?.span2 && 'col-span-full')}>
      {ids => opts?.type === 'date'
        ? <DatePicker {...ids} value={hblField(key)} onChange={v => setHblField(key, v)} />
        : <Input {...ids} type={opts?.type || 'text'}
          value={hblField(key)}
          onChange={e => setHblField(key, e.target.value)}
          placeholder={opts?.placeholder || ''} readOnly={opts?.readOnly} className={cn(opts?.readOnly && 'bg-canvas')} />}
    </Field>
  )
  const hTextarea = (label: string, key: string, rows: number, placeholder?: string) => (
    <Field label={label} className="col-span-full">
      {ids => <Textarea {...ids} rows={rows} className="resize-y"
        value={hblField(key)}
        onChange={e => setHblField(key, e.target.value)}
        placeholder={placeholder || ''} />}
    </Field>
  )
  const hSelect = (label: string, key: string, options: string[]) => (
    <Field label={label}>
      {ids => <Select {...ids} value={hblField(key)} onChange={v => setHblField(key, v)}
        options={options.map(o => ({ value: o, label: o || '—' }))} />}
    </Field>
  )
  // Sits at the bottom of its grid cell, level with the inputs beside it.
  const hCheck = (label: string, key: string) => (
    <Checkbox className="h-8 self-end" checked={hblField(key) === '1'}
      onChange={checked => setHblField(key, checked ? '1' : '0')}>
      {label}
    </Checkbox>
  )
  // Collapsible section: heading plus a 3-column (or 2-column) grid of fields.
  const hSection = (sectionId: string, title: string, hint: string | undefined, cols: string, children: ReactNode) => (
    <section className="flex flex-col gap-3">
      <CollapsibleHead title={title} hint={hint} collapsed={!!hblCollapsed[sectionId]} onToggle={() => toggleHblSection(sectionId)} />
      {!hblCollapsed[sectionId] && <div className={cn('grid gap-x-4 gap-y-3', cols)}>{children}</div>}
    </section>
  )
  const updateRow = (idx: number, patch: Partial<BlContainerRow>) => {
    const u = [...hblContainers]; u[idx] = { ...u[idx], ...patch }; setHblContainers(u)
  }
  const hblColumns: { key: keyof BlContainerRow; label: string; width: string; type?: string }[] = [
    { key: 'containerNo', label: 'Container #', width: 'w-[15%]' },
    { key: 'size', label: 'Size', width: 'w-[8%]' },
    { key: 'type', label: 'Type', width: 'w-[8%]' },
    { key: 'shipmentType', label: 'SHP Type', width: 'w-[12%]' },
    { key: 'sealNo', label: 'Seal No', width: 'w-[11%]' },
    { key: 'packages', label: 'Pkgs', width: 'w-[9%]', type: 'number' },
    { key: 'packageType', label: 'Pkg Type', width: 'w-[11%]' },
    { key: 'grossWeight', label: 'G/W', width: 'w-[10%]', type: 'number' },
    { key: 'cbm', label: 'CBM', width: 'w-[9%]', type: 'number' },
  ]

  return (
    <div className="flex flex-col gap-4">
      <StepHeader title="HOUSE BILL OF LADING" subtitle={`${chblBkg.customer_name} · ${chblBkg.origin} → ${chblBkg.destination}`} />

      {/* Booking summary strip */}
      <div className="rounded-card border border-line-soft bg-primary-subtle px-3.5 py-2.5 text-control text-fg">
        <strong>{chblBkg.customer_name}</strong> — {chblBkg.origin} → {chblBkg.destination}
        <div className="mt-0.5 text-fg-muted">
          {chblBkg.quantity}x {chblBkg.container_type} · {chblBkg.shipping_line || 'No liner'} · Job Ref: {chblBkg.job_reference_number || 'N/A'}
        </div>
      </div>

      {/* Section 1: Job & Header Information */}
      {hSection('hbl-jobheader', 'Job & Header Information', 'Voyage & schedule details', 'grid-cols-3', <>
        {hInput('Job #', 'jobNumber')}
        {hInput('Vessel / Voyage', 'vesselVoyage', { readOnly: true })}
        {hInput('ETA Colombo, Sri Lanka', 'etaColombo', { type: 'date' })}
        {hInput('SOB Date Colombo, Sri Lanka', 'sobDate', { type: 'date' })}
        {hInput('Warehouse', 'warehouse')}
        {hInput('Yard / Depot', 'yardDepot')}
        {hInput('FCL Cut Off', 'fclCutOff', { type: 'date' })}
        {hInput('No. of CNTR & Type', 'noOfCntrType', { readOnly: true })}
        {hInput('Remarks', 'hdrRemarks')}
        {hInput('Destination', 'hdrDestination')}
        {hInput('ETA Destination', 'etaDestination', { type: 'date' })}
        {hInput('Destination Agent', 'destinationAgent')}
        {hInput('Carrier', 'carrier', { readOnly: true })}
        {hInput('Carrier Ref #', 'carrierRef')}
        {hInput('Exchange Rate', 'exchangeRate')}
        {hSelect('Container Type', 'containerTypeDropdown', ["20'GP", "40'GP", "40'HC", "20'RF", "40'RF", "20'OT", "40'OT", "45'HC"])}
      </>)}

      {/* Section 2: B/L Details */}
      {hSection('hbl-bl', 'B/L Details', 'Identifiers', 'grid-cols-3', <>
        {hSelect('Branch', 'branch', ['COLOMBO', 'GALLE', 'HAMBANTOTA'])}
        {hInput('Booking No.', 'bookingNo', { readOnly: true })}
        {hSelect('Shipment Category', 'shipmentCategory', ['LOCAL EXPORT', 'RE-EXPORT', 'TRANSHIPMENT', 'CROSS TRADE'])}
        {hSelect('B/L Type', 'blType', ['OWN', 'THROUGH', 'CARRIER BL', 'RMAT', 'SWITCH BL', 'AGENT BL'])}
        {hInput('Sub Job / House BL #', 'houseBlNo', { placeholder: 'System-generated' })}
        {hInput('Custom BL #', 'customBlNo')}
        {hInput('STT #', 'sttNo', { placeholder: 'Transhipment only' })}
        {hInput('HS Code', 'hsCode', { placeholder: 'e.g. 2009.89' })}
      </>)}

      {/* Section 3: Shipper / Consignee / Notify */}
      {hSection('hbl-parties', 'Shipper, Consignee & Notify', 'Shipper, consignee, notify party', 'grid-cols-2', <>
        {hInput('Shipper Name *', 'shipperName', { span2: true })}
        {hTextarea('Shipper Address', 'shipperAddress', 3)}
        {hInput('Shipper Reference (PO#)', 'shipperRef')}
        {hCheck('Display on Shipper Invoice', 'displayOnShipperInvoice')}
        {hInput('Email Reference', 'emailRef', { span2: true })}
        {hInput('Consignee Name *', 'consigneeName', { span2: true })}
        {hTextarea('Consignee Address', 'consigneeAddress', 3)}
        {hSelect('Notify Type', 'notifyType', ['', 'NONE', 'SAME AS CONSIGNEE'])}
        {hInput('Notify Name', 'notifyName')}
        {hTextarea('Notify Address', 'notifyAddress', 3)}
        {hInput('Also Notify', 'alsoNotify', { span2: true })}
      </>)}

      {/* Section 4: Operational & Customer Metadata */}
      {hSection('hbl-operational', 'Operational & Customer Metadata', undefined, 'grid-cols-3', <>
        {hSelect('Customer Category', 'customerCategory', ['CUSTOMER', 'FORWARDER'])}
        {hSelect('Business Type', 'businessType', ['SALES NOMINATION', 'AGENT NOMINATION', 'FREE HAND'])}
        {hInput('Customer / Shipper', 'customerShipper')}
        {hInput('Billing Party', 'billingParty')}
        {hInput('Sales Person', 'salesPerson')}
        {hInput('CS Executive', 'csExecutive')}
        {hInput('Documentation By', 'documentationBy')}
        {hInput('Introduce By', 'introducedBy')}
        {hSelect('Cargo Type', 'cargoType', ['GENERAL', 'DG'])}
        {hInput('Commodity', 'commodity')}
        {hCheck('Show Containers on Attachment', 'showContainersOnAttachment')}
        {hInput('No. of Containers on BL', 'noOfContainersOnBl', { type: 'number' })}
      </>)}

      {/* Section 5: Containers & Package Details */}
      <section className="flex flex-col gap-3">
        <CollapsibleHead title="Containers & Package Details" hint={`${hblContainers.length} row(s)`}
          collapsed={!!hblCollapsed['hbl-containers']} onToggle={() => toggleHblSection('hbl-containers')} />
        {!hblCollapsed['hbl-containers'] && (<>
          {/* Container rows table */}
          <div className="flex flex-col items-start gap-2 overflow-x-auto">
            <table className="w-full table-fixed border-collapse text-label">
              <thead>
                <tr className="bg-canvas">
                  {hblColumns.map(c => (
                    <th key={c.key} className={cn(c.width, 'border-b border-line-soft px-1 py-1.5 text-left font-semibold text-fg-label')}>{c.label}</th>
                  ))}
                  <th className="w-[7%] border-b border-line-soft"><span className="sr-only">Remove</span></th>
                </tr>
              </thead>
              <tbody>
                {hblContainers.map((row, idx) => (
                  <tr key={idx}>
                    {hblColumns.map(c => (
                      <td key={c.key} className="px-0.5 py-1">
                        <Input aria-label={`${c.label} row ${idx + 1}`} type={c.type} className="px-1.5"
                          value={row[c.key]} onChange={e => updateRow(idx, { [c.key]: e.target.value })} />
                      </td>
                    ))}
                    <td className="px-0.5 py-1">
                      {hblContainers.length > 1 && (
                        <Tooltip content="Remove">
                          <Button variant="ghost" className="w-8 px-0" aria-label={`Remove container row ${idx + 1}`}
                            icon={<X size={14} aria-hidden="true" />}
                            onClick={() => setHblContainers(hblContainers.filter((_, i) => i !== idx))} />
                        </Tooltip>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Button size="sm"
              onClick={() => setHblContainers([...hblContainers, { containerNo: '', size: '20', type: 'GP', shipmentType: 'FCL/FCL', sealNo: '', packages: '', packageType: '', grossWeight: '', cbm: '' }])}>
              + Add Container
            </Button>
          </div>

          {/* Package summary */}
          <div className="grid grid-cols-3 gap-x-4 gap-y-3">
            {hInput('No. of Packages in Figures', 'totalPackages', { type: 'number' })}
            {hSelect('Package Type', 'packageType', ['', 'PALLETS', 'CARTONS', 'BAGS', 'DRUMS', 'BALES', 'PIECES'])}
            {hSelect('Print Details', 'printDetails', ['PACKAGE DETAILS', 'CONTAINER DETAILS', 'BOTH', 'NONE'])}
            {hInput('Gross Weight', 'grossWeight', { type: 'number' })}
            {hSelect('Print With (Decimals)', 'printGrossDecimals', ['0', '1', '2', '3'])}
            {hSelect('Print With (Unit)', 'printGrossUnit', ['KGS', 'LBS', 'MT'])}
            {hInput('Net Weight', 'netWeight', { type: 'number' })}
            {hSelect('Print With (Weight)', 'printNetWith', ['BOTH', 'GROSS ONLY', 'NET ONLY', 'NONE'])}
            {hInput('CBM (Volume)', 'cbm', { type: 'number' })}
            {hSelect('Print Decimals', 'printCbmDecimals', ['0', '1', '2', '3'])}
            {hInput('Weight / Measurement Ratio', 'wmRatio', { type: 'number' })}
          </div>
          {hTextarea('Marks & Numbers', 'marksNumbers', 4, 'CONTAINER AND SEAL DETAILS AS PER ATTACHED SHEET')}
        </>)}
      </section>

      {/* Section 6: Goods Description & Routing */}
      {hSection('hbl-goods', 'Goods Description & Routing', undefined, 'grid-cols-3', <>
        {hTextarea('Description Prefix (Top)', 'descriptionPrefixTop', 3)}
        {hTextarea('Description of Goods *', 'descriptionOfGoods', 5, 'e.g. 06X20GP CONTAINERS FCL/FCL...')}
        {hTextarea('Description Prefix (Bottom)', 'descriptionPrefixBottom', 3)}
        {hTextarea('Liner B/L Description', 'linerBlDescription', 4, 'What goes to the carrier for the master bill')}
        {hCheck("Print to B/L Shipper's Load Count & Seal", 'printToBlShipperSeal')}
        {hSelect('Attach Sheet', 'attachSheet', ['', 'NONE', 'PAGE 1', 'PAGE 2', 'ALL PAGES'])}
        {hSelect('Delivery Type', 'deliveryType', ['CFS/DOOR', 'DOOR/CFS', 'DOOR/DOOR', 'DOOR/CY', 'CY/DOOR', 'CY/CY', 'CY/CFS', 'CY/RR', 'CFS/CY', 'CFS/CFS', 'DOOR/PORT', 'PORT/DOOR', 'PORT/PORT'])}
        {hSelect('Incoterm', 'incoterm', ['', 'EXW', 'FCA', 'FAS', 'FOB', 'CFR', 'CIF', 'CPT', 'CIP', 'DAP', 'DPU', 'DDP'])}
        {hSelect('Country of Origin', 'countryOfOrigin', ['SRI LANKA', 'INDIA', 'CHINA', 'BANGLADESH', 'VIETNAM', 'THAILAND', 'PAKISTAN'])}
        {hInput('Port of Loading', 'portOfLoading')}
        {hInput('Port of Discharge', 'portOfDischarge')}
        {hInput('Port of Discharge ETA', 'podEta', { type: 'date' })}
        {hInput('Port of Discharge ATA', 'podAta', { type: 'date' })}
        {hInput('Final Destination', 'finalDestination')}
        {hInput('Final Destination ETA', 'fdEta', { type: 'date' })}
        {hInput('Final Destination ATA', 'fdAta', { type: 'date' })}
        {hInput('Place of Delivery', 'placeOfDelivery')}
        {hInput('Place of Delivery ETA', 'podelEta', { type: 'date' })}
        {hInput('Place of Delivery ATA', 'podelAta', { type: 'date' })}
        {hInput('Transit Time', 'transitTime', { type: 'number' })}
        {hTextarea('SAP Description', 'sapDescription', 3)}
      </>)}

      {/* Section 7: Freight & Financials */}
      {hSection('hbl-freight', 'Freight & Financials', undefined, 'grid-cols-3', <>
        {hInput('Delivery No', 'deliveryNo')}
        {hInput('Place of BL Issued', 'placeOfBlIssued')}
        {hInput('Date of BL Issued', 'dateOfBlIssued', { type: 'date' })}
        {hInput('Place of Receipt', 'placeOfReceipt')}
        {hInput('Shipped on Board Date', 'shippedOnBoardDate', { type: 'date' })}
        {hSelect('Freight Term', 'freightTerm', ['PREPAID', 'COLLECT'])}
        {hInput('Freight Amount', 'freightAmount', { type: 'number' })}
        {hTextarea('Freight Payable At', 'freightPayableAt', 2)}
        {hTextarea('Freight Term Details', 'freightTermDetails', 2)}
        {hSelect('Destination Charges', 'destinationCharges', ['COLLECT', 'PREPAID'])}
        {hSelect('Origin Charges', 'originCharges', ['PREPAID', 'COLLECT'])}
        {hSelect('Received for Shipment', 'receivedForShipment', ['NO', 'YES'])}
        {hTextarea('Remarks', 'remarks', 3)}
        {hInput('POD Agent', 'podAgent')}
      </>)}

      {/* Section 8: POD Agent, B/L Terms & Manifest */}
      {hSection('hbl-terms', 'POD Agent, B/L Terms & Manifest', undefined, 'grid-cols-3', <>
        {hTextarea('POD Agent Address', 'podAgentAddress', 3)}
        {hInput('Contact Person', 'contactPerson')}
        {hInput('B/L Term', 'blTerm')}
        {hSelect('No. of Original BLs', 'noOfOriginalBls', ['ZERO (0)', 'ONE (1)', 'TWO (2)', 'THREE (3)'])}
        {hSelect('BL Status', 'blStatus', ['', 'ORIGINAL', 'SURRENDERED', 'SEAWAY', 'EXPRESS'])}
        {hCheck('Hold Cargo', 'holdCargo')}
        {hCheck('Email Surrender Letter', 'emailSurrenderLetter')}
        {hInput('Permit No', 'permitNo')}
        {hInput('Agent for Carrier', 'agentForCarrier')}
        {hCheck('Print Agent for Carrier', 'printAgentForCarrier')}
        {hInput('Detention Days', 'detentionDays', { placeholder: 'e.g. 14 DAYS FREE DETENTION & DEMURRAGE AT DESTINATION' })}
        {hCheck('Display on Carrier Draft', 'displayOnCarrierDraft')}
        {hCheck('Display Tariff Charges', 'displayTariffCharges')}
        {hCheck('Display Additional Text', 'displayAdditionalText')}
        {hSelect('B/L Format', 'blFormat', ['SELECT HBL FORMAT', 'CLS', 'CLS BDT', 'CLS NONE-NEGO', 'CLS LIGENTIA', 'CLS LOGFRET', 'CLS_FMC', 'CLS_BDT(SW)', 'TRANSMODAL', 'TRANSMODAL(SW)'])}
        {hCheck('Draft Confirmed', 'draftConfirmed')}
      </>)}

      {/* Manifest Charges Table */}
      <section className="flex flex-col gap-3">
        <CollapsibleHead title="Manifest Charges" hint="Freight charges breakdown"
          collapsed={!!hblCollapsed['hbl-manifest']} onToggle={() => toggleHblSection('hbl-manifest')} />
        {!hblCollapsed['hbl-manifest'] && (
          <p className="m-0 text-label italic text-fg-muted">
            Manifest charges will be managed via the Gensoft integration. Enter charges in Gensoft after saving the HBL.
          </p>
        )}
      </section>

      {/* Notes */}
      <Field label="Notes (optional)">
        {ids => <Input {...ids} value={formNote}
          onChange={e => setFormNote(e.target.value)} placeholder="Internal notes..." />}
      </Field>
    </div>
  )
})() : selectedItem.actionKind === 'create-bl' && actionModal ? (() => {
  // Helper: input field
  const cbInput = (form: 'mbl' | 'hbl', label: string, key: string, opts?: { placeholder?: string; readOnly?: boolean; span2?: boolean; type?: string }) => (
    <Field label={label} className={cn(opts?.span2 && 'col-span-full')}>
      {ids => opts?.type === 'date'
        ? <DatePicker {...ids} value={form === 'mbl' ? mblField(key) : hblField(key)}
          onChange={v => form === 'mbl' ? setMblField(key, v) : setHblField(key, v)} />
        : <Input {...ids} type={opts?.type || 'text'}
          value={form === 'mbl' ? mblField(key) : hblField(key)}
          onChange={e => form === 'mbl' ? setMblField(key, e.target.value) : setHblField(key, e.target.value)}
          placeholder={opts?.placeholder || ''} readOnly={opts?.readOnly} className={cn(opts?.readOnly && 'bg-canvas')} />}
    </Field>
  )
  // Helper: textarea field
  const cbTextarea = (form: 'mbl' | 'hbl', label: string, key: string, rows: number, placeholder?: string) => (
    <Field label={label} className="col-span-full">
      {ids => <Textarea {...ids} rows={rows} className="resize-y"
        value={form === 'mbl' ? mblField(key) : hblField(key)}
        onChange={e => form === 'mbl' ? setMblField(key, e.target.value) : setHblField(key, e.target.value)}
        placeholder={placeholder || ''} />}
    </Field>
  )
  // Helper: select field
  const cbSelect = (form: 'mbl' | 'hbl', label: string, key: string, options: string[]) => (
    <Field label={label}>
      {ids => <Select {...ids} value={form === 'mbl' ? mblField(key) : hblField(key)}
        onChange={v => form === 'mbl' ? setMblField(key, v) : setHblField(key, v)}
        options={options.map(o => ({ value: o, label: o || '—' }))} />}
    </Field>
  )
  // Helper: accordion section heading
  const cbHead = (sectionId: string, title: string, hint?: string) => (
    <CollapsibleHead title={title} hint={hint} collapsed={!!hblCollapsed[sectionId]} onToggle={() => toggleHblSection(sectionId)} />
  )
  const cbCell = 'truncate rounded-control border border-line-soft bg-canvas px-1 py-0.5'
  const cbTableGrid = 'grid min-w-[700px] grid-cols-[100px_120px_90px_80px_70px_70px_70px_60px_1fr] gap-1'

  // Gather all bookings with HBLs that don't yet have an MBL
  const availableHblBookings = bookings.filter(b =>
    b.house_bl_created && !b.master_bl_recorded &&
    (b.status === 'Liner Confirmed' || b.status === 'Released')
  )
  const searchLower = mblHblSearch.toLowerCase()
  const filteredHblBookings = mblHblSearch
    ? availableHblBookings.filter(b =>
        b.customer_name.toLowerCase().includes(searchLower) ||
        (b.house_bl_number || '').toLowerCase().includes(searchLower) ||
        b.id.toLowerCase().includes(searchLower) ||
        b.destination.toLowerCase().includes(searchLower) ||
        b.origin.toLowerCase().includes(searchLower)
      )
    : availableHblBookings
  const selectedHblBookings = bookings.filter(b => mblSelectedHblIds.includes(b.id))

  const toggleHblSelection = (bookingId: string) => {
    setMblSelectedHblIds(prev => {
      const next = prev.includes(bookingId)
        ? prev.filter(id => id !== bookingId)
        : [...prev, bookingId]
      // Rebuild B/L table from newly selected bookings
      const selectedBkgs = bookings.filter(b => next.includes(b.id))
      if (selectedBkgs.length > 0) {
        setMblContainers(selectedBkgs.map(b => ({
          containerNo: b.house_bl_number || '',
          containerType: 'GENERAL',
          sealNo: '',
          poNumber: String(b.quantity || 1),
          hsCode: b.destination || '',
          description: b.house_bl_shipper || b.customer_name || '',
          grossWeight: '',
          cbm: '',
        })))
      } else {
        setMblContainers([{ containerNo: '', containerType: 'GENERAL', sealNo: '', poNumber: '', hsCode: '', description: '', grossWeight: '', cbm: '' }])
      }
      return next
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <StepHeader title="MASTER BILL OF LADING" subtitle={`${mblSelectedHblIds.length} HBL(s) selected`} />

      {/* HBL Search & Select Panel */}
      <div className="overflow-hidden rounded-card border border-line-soft">
        <div className="flex items-center gap-2 border-b border-line-soft bg-canvas px-3 py-2">
          <Search size={14} className="shrink-0 text-fg-muted" aria-hidden="true" />
          <Input aria-label="Search HBLs" className="flex-1"
            value={mblHblSearch} onChange={e => setMblHblSearch(e.target.value)}
            placeholder="Search HBLs by customer, BL number, booking ID, origin, destination..." />
          {mblHblSearch && (
            <Tooltip content="Clear search">
              <Button variant="ghost" className="w-8 px-0" aria-label="Clear search"
                icon={<X size={14} aria-hidden="true" />} onClick={() => setMblHblSearch('')} />
            </Tooltip>
          )}
        </div>
        <div className="max-h-[200px] overflow-y-auto">
          {filteredHblBookings.length === 0 ? (
            <div className="px-3 py-4 text-center text-label text-fg-muted">
              {mblHblSearch ? 'No HBLs match your search.' : 'No HBLs available for MBL assignment.'}
            </div>
          ) : filteredHblBookings.map(hb => {
            const isSelected = mblSelectedHblIds.includes(hb.id)
            return (
              <div key={hb.id} className={cn('border-b border-line-soft last:border-b-0', isSelected && 'bg-primary-subtle')}>
                <Checkbox checked={isSelected} onChange={() => toggleHblSelection(hb.id)} className="flex w-full gap-2.5 px-3 py-2">
                  <span className="flex min-w-0 flex-1 flex-col gap-px">
                    <span className={cn('font-semibold', isSelected ? 'text-primary' : 'text-fg')}>
                      {hb.house_bl_number || hb.id} — {hb.customer_name}
                    </span>
                    <span className="text-label text-fg-muted">
                      {hb.origin} → {hb.destination} · {hb.quantity}x {hb.container_type} · {hb.shipping_line || 'No liner'}
                    </span>
                  </span>
                </Checkbox>
              </div>
            )
          })}
        </div>
        {selectedHblBookings.length > 0 && (
          <div className="border-t border-line-soft bg-primary-subtle px-3 py-1.5 text-label font-semibold text-primary">
            Selected: {selectedHblBookings.map(b => b.house_bl_number || b.id).join(', ')}
          </div>
        )}
      </div>

      {/* ===== MBL FORM — 3 Sections ===== */}

      {/* Section 1: Job Header & Routing Information */}
      <section className="flex flex-col gap-3">
        {cbHead('mbl-jobheader', 'Job Header & Routing', 'Job, vessel & routing details')}
        {!hblCollapsed['mbl-jobheader'] && (
          <div className="grid grid-cols-2 gap-x-4 gap-y-3">
              {cbInput('mbl', 'Job #', 'jobNumber', { placeholder: 'Job reference number' })}
              {cbInput('mbl', 'Vessel / Voy', 'vesselVoyage', { placeholder: 'e.g. EVER GIVEN / 1234N' })}
              {cbInput('mbl', 'ETA LKCMB (POL)', 'etaPol', { type: 'date' })}
              {cbInput('mbl', 'SOB Colombo, Sri Lanka', 'sobDate', { type: 'date' })}
              {cbInput('mbl', 'Warehouse', 'warehouse')}
              {cbInput('mbl', 'Yard / Depot', 'yardDepot')}
              {cbInput('mbl', 'FCL Cut Off', 'fclCutOff', { type: 'date' })}
              {cbInput('mbl', 'No. of CNTR & Type', 'noOfCntrType', { placeholder: 'e.g. 2x 40HC' })}
              {cbInput('mbl', 'Remarks', 'remarks', { span2: true })}
              {cbInput('mbl', 'Destination', 'destination')}
              {cbInput('mbl', 'ETA Destination', 'etaDestination', { type: 'date' })}
              {cbInput('mbl', 'Destination Agent', 'destinationAgent')}
              {cbInput('mbl', 'Carrier', 'carrier')}
              {cbInput('mbl', 'Carrier Ref #', 'carrierRef')}
              {cbInput('mbl', 'Exchange Rate', 'exchangeRate', { type: 'number', placeholder: '0.00' })}
              {cbSelect('mbl', 'Type', 'mblType', ['', 'FCL', 'LCL', 'BREAK BULK', 'RORO'])}
              {cbInput('mbl', 'ETD Date', 'etdDate', { type: 'date' })}
          </div>
        )}
      </section>

      {/* Section 2: B/L Table (auto-populated from selected HBLs) */}
      <section className="flex flex-col gap-3">
        {cbHead('mbl-bltable', 'B/L Table', `${selectedHblBookings.length} HBL(s)`)}
        {!hblCollapsed['mbl-bltable'] && (
          selectedHblBookings.length === 0 ? (
            <div className="rounded-card border border-dashed border-line bg-canvas px-3 py-4 text-center text-label text-fg-muted">
              Select one or more HBLs above to populate this table.
            </div>
          ) : (
            <div className="overflow-x-auto text-label">
              <div className={cn(cbTableGrid, 'mb-1 pl-0.5 font-semibold text-fg-muted')}>
                <span>BL No.</span><span>Shipper</span><span>Final Dest</span><span>Cargo Type</span><span>No. of Pkgs</span><span>Pkg Type</span><span>GW (kg)</span><span>CBM</span><span>Container / Seal</span>
              </div>
              {selectedHblBookings.map((hb) => (
                <div key={hb.id} className={cn(cbTableGrid, 'mb-1 text-fg')}>
                  <div className={cbCell} title={hb.house_bl_number || hb.id}>{hb.house_bl_number || hb.id}</div>
                  <div className={cbCell} title={hb.house_bl_shipper || hb.customer_name}>{hb.house_bl_shipper || hb.customer_name}</div>
                  <div className={cbCell}>{hb.destination}</div>
                  <div className={cbCell}>General</div>
                  <div className={cbCell}>{hb.quantity || 1}</div>
                  <div className={cbCell}>{hb.container_type}</div>
                  <div className={cbCell}>—</div>
                  <div className={cbCell}>—</div>
                  <div className={cbCell}>—</div>
                </div>
              ))}
            </div>
          )
        )}
      </section>

      {/* Section 3: Carrier B/L Instructions */}
      <section className="flex flex-col gap-3">
        {cbHead('mbl-carrierins', 'Carrier B/L Instructions', 'Carrier draft details')}
        {!hblCollapsed['mbl-carrierins'] && (
          <div className="grid grid-cols-2 gap-x-4 gap-y-3">
              {cbInput('mbl', 'Carrier BL Ins. Reference', 'carrierBlInsRef')}
              {cbSelect('mbl', 'Category', 'category', ['', 'CUSTOMER', 'FORWARDER'])}
              {cbSelect('mbl', 'Master B/L Type', 'masterBlType', ['', 'ORIGINAL', 'SEAWAY BILL', 'EXPRESS RELEASE', 'TELEX RELEASE'])}
              {cbInput('mbl', 'Shipper Name *', 'shipperName')}
              {cbTextarea('mbl', 'Shipper Address (incl. Tel & Fax)', 'shipperAddress', 3, 'Full address with telephone and fax')}
              {cbInput('mbl', 'Consignee Name *', 'consigneeName')}
              {cbTextarea('mbl', 'Consignee Address (incl. Tel & Fax)', 'consigneeAddress', 3, 'Full address with telephone and fax')}
              {cbInput('mbl', 'Notify Party', 'notifyParty')}
              {cbTextarea('mbl', 'Notify Address (incl. Tel & Fax)', 'notifyAddress', 3, 'Full address with telephone and fax')}
              {cbInput('mbl', 'Detention Days', 'detentionDays')}
            <div className="col-span-full flex items-center gap-6">
              <Checkbox checked={mblField('displayOnCarrierDraft') === 'true'}
                onChange={checked => setMblField('displayOnCarrierDraft', checked ? 'true' : '')}>
                Display on Carrier Draft
              </Checkbox>
              <Checkbox checked={mblField('displayContainerNumbers') === 'true'}
                onChange={checked => setMblField('displayContainerNumbers', checked ? 'true' : '')}>
                Display Container Numbers
              </Checkbox>
            </div>
          </div>
        )}
      </section>

      {/* Notes */}
      <Field label="Notes (optional)">
        {ids => <Input {...ids} value={formNote}
          onChange={e => setFormNote(e.target.value)} placeholder="Internal notes..." />}
      </Field>

      {/* Submit (this step renders inline only, so it needs its own button) */}
      {(() => {
        const blDisabled = !mblField('shipperName').trim() || !mblField('consigneeName').trim()
        return (
          <div className="flex justify-end">
            <Button variant="primary" onClick={handleModalSubmit} disabled={blDisabled}
              icon={<FileText size={14} aria-hidden="true" />}>
              Record Master BL
            </Button>
          </div>
        )
      })()}
    </div>
  )
})() : (selectedItem.actionKind === 'booking-request' || selectedItem.actionKind === 'review-booking-request') && actionModal ? (() => {
  const isCS = selectedItem.actionKind === 'booking-request'
  const isReefer = bkContainers.some(c => c.type.includes('RF'))
  // Same entries as the old <select>; Select options are keyed by value, so repeated liner names are dropped.
  const brCarrierOptions: Option[] = [
    { value: '', label: '— Select carrier —' },
    ...linerList
      .filter((l, i, all) => all.findIndex(x => x.name === l.name) === i)
      .map(l => ({ value: l.name, label: linerDisplay(l) })),
  ]
  const brContainerOptions: Option[] = [
    { value: "20'GP", label: "20' GP" }, { value: "40'GP", label: "40' GP" },
    { value: "40'HC", label: "40' HC" }, { value: "20'RF", label: "20' RF (Reefer)" },
    { value: "40'RF", label: "40' RF (Reefer)" }, { value: "20'OT", label: "20' OT (Open Top)" },
    { value: "40'OT", label: "40' OT (Open Top)" }, { value: "20'FR", label: "20' FR (Flat Rack)" },
    { value: "40'FR", label: "40' FR (Flat Rack)" },
  ]
  const brText = (label: string, value: string, onChange: (v: string) => void, placeholder: string, required?: boolean) => (
    <Field label={label} required={required}>
      {ids => <Input {...ids} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />}
    </Field>
  )
  return (
    <div className="flex flex-col gap-4">
      <StepHeader title="BOOKING FORMAT REQUEST" subtitle={!isCS ? 'Submitted by CS — review and add RA number' : undefined} />

      <div className="grid grid-cols-2 gap-x-4 gap-y-3">
        <Field label="Carrier" required className="col-span-full">
          {ids => actionModal?.sourceData?.acceptedQuotation?.lin_id && bkShippingLine
            ? <Input {...ids} value={bkShippingLine} readOnly className="bg-canvas font-semibold" />
            : <Select {...ids} value={bkShippingLine} onChange={setBkShippingLine} options={brCarrierOptions} />}
        </Field>

        {/* Containers (dynamic list) */}
        <div className="col-span-full flex flex-col gap-1">
          <span id="ws-br-containers-label" className={labelClass}>
            Containers<span aria-hidden="true" className="ml-0.5 text-danger">*</span>
            <span className="ml-1 font-normal normal-case text-fg-muted">({bkContainers.reduce((s, c) => s + c.qty, 0)})</span>
          </span>
          <div role="group" aria-labelledby="ws-br-containers-label" className="flex flex-col gap-2">
            {bkContainers.map((ctn, ci) => (
              <div key={ci} className="flex items-center gap-2">
                <NumberInput aria-label={`Quantity, container ${ci + 1}`} className="w-18 text-center"
                  min={1} value={ctn.qty}
                  onChange={e => setBkContainers((prev: {type: string; qty: number}[]) => prev.map((c: {type: string; qty: number}, i: number) => i === ci ? { ...c, qty: Math.max(1, parseInt(e.target.value) || 1) } : c))} />
                <span aria-hidden="true" className="text-control text-fg-muted">×</span>
                <Select aria-label={`Type, container ${ci + 1}`} className="flex-1" options={brContainerOptions}
                  value={ctn.type} onChange={v => setBkContainers((prev: {type: string; qty: number}[]) => prev.map((c: {type: string; qty: number}, i: number) => i === ci ? { ...c, type: v } : c))} />
                {bkContainers.length > 1 && (
                  <Tooltip content="Remove">
                    <Button variant="ghost" className="w-8 px-0 text-danger" aria-label={`Remove container ${ci + 1}`}
                      icon={<X size={14} aria-hidden="true" />}
                      onClick={() => setBkContainers((prev: {type: string; qty: number}[]) => prev.filter((_: {type: string; qty: number}, i: number) => i !== ci))} />
                  </Tooltip>
                )}
              </div>
            ))}
          </div>
          <Button size="sm" className="mt-1 self-start"
            onClick={() => setBkContainers((prev: {type: string; qty: number}[]) => [...prev, { type: "20'GP", qty: 1 }])}>
            + Add Container
          </Button>
        </div>

        {brText('Commodity', bkCommodity, setBkCommodity, 'e.g. Coconut Milk, Garments')}
        <Field label="Cargo Ready Date" required>
          {ids => <DatePicker {...ids} value={bkCargoReadyDate} onChange={setBkCargoReadyDate} />}
        </Field>
        {brText('Vessel', bkVessel, setBkVessel, 'e.g. MSC Asya', true)}
        <Field label="ETD" required>
          {ids => <DatePicker {...ids} value={bkVesselEtd} onChange={setBkVesselEtd} />}
        </Field>
        {brText('Voyage', bkVoyage, setBkVoyage, 'e.g. MA622R', true)}
        {brText('POD', bkPod, setBkPod, 'Port of Discharge')}
        <Field label="Customer" className="col-span-full">
          {ids => <Input {...ids} value={selectedItem.customerName} readOnly className="bg-canvas font-semibold" />}
        </Field>
        <Field label="Agreed Rate" required>
          {ids => (
            <div className="relative">
              <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-2.5 flex items-center text-control text-fg-muted">$</span>
              <Input {...ids} type="number" min={0} step="any" className="pl-6"
                value={bkAgreedRate} onChange={e => { const v = e.target.value; if (v === '' || /^\d*\.?\d*$/.test(v)) setBkAgreedRate(v) }} placeholder="e.g. 1200" />
            </div>
          )}
        </Field>
        {brText('Rate Remark', bkRateRemark, setBkRateRemark, 'e.g. As per contract, TBD')}
        {brText('Delivery Term', bkDeliveryTerm, setBkDeliveryTerm, 'CY/CY', true)}
        {brText('HS Code', bkHsCode, setBkHsCode, 'Harmonized System code', true)}
      </div>

      <section className="flex flex-col gap-3">
        <SectionHead>Special Instructions</SectionHead>
        <div className="grid grid-cols-2 gap-x-4 gap-y-3">
          {/* Contract No + RA No (mutually exclusive) */}
          <Field label="Contract No">
            {ids => <Input {...ids}
              value={bkContractNo} onChange={e => { setBkContractNo(e.target.value); if (e.target.value) setBkRaNumber('') }}
              disabled={!!bkRaNumber} placeholder={bkRaNumber ? 'N/A (RA No is set)' : 'e.g. 26-751GAC'} />}
          </Field>
          <Field label="RA No">
            {ids => <Input {...ids} className="font-semibold"
              value={bkRaNumber} onChange={e => { setBkRaNumber(e.target.value); if (e.target.value) setBkContractNo('') }}
              disabled={!!bkContractNo} placeholder={bkContractNo ? 'N/A (Contract is set)' : 'Liner booking ref'} />}
          </Field>
          {bkContractNo && bkRaNumber && (
            <div className="col-span-full rounded-card border border-danger-line bg-danger-bg px-3 py-1.5 text-label font-semibold text-danger">
              A customer cannot have both Contract No and RA No. Please clear one.
            </div>
          )}
          <div className="col-span-full">
            {brText('Specific Routing', bkSpecificRouting, setBkSpecificRouting, 'e.g. via Singapore, avoid Suez')}
          </div>
          <div className="flex flex-col gap-1">
            <span id="ws-br-bltype-label" className={labelClass}>BL Type<span aria-hidden="true" className="ml-0.5 text-danger">*</span></span>
            <RadioGroup aria-labelledby="ws-br-bltype-label" orientation="horizontal" className="min-h-8 justify-center"
              value={bkBlType} onChange={v => setBkBlType(v as 'OBL' | 'Seaway Bill')}>
              {(['OBL', 'Seaway Bill'] as const).map(t => <Radio key={t} value={t}>{t}</Radio>)}
            </RadioGroup>
          </div>
          <div className="flex flex-col gap-1">
            <span id="ws-br-booking-type-label" className={labelClass}>If MKL/SAF (Spot/FAK)</span>
            <RadioGroup aria-labelledby="ws-br-booking-type-label" orientation="horizontal" className="min-h-8 justify-center"
              value={bkBookingType} onChange={v => setBkBookingType(v as 'Spot' | 'FAK')}>
              {(['Spot', 'FAK'] as const).map(t => <Radio key={t} value={t}>{t} Booking</Radio>)}
            </RadioGroup>
          </div>
          {brText('Reefer/PTI', bkReeferTemp, setBkReeferTemp, isReefer ? 'e.g. -18°C, PTI required' : 'N/A')}
          {brText('Delivery Agent', bkDeliveryAgent, setBkDeliveryAgent, 'Will advise / agent name')}
        </div>
      </section>

      {/* Submit */}
      {(() => {
        const missingFields: string[] = []
        if (!bkShippingLine) missingFields.push('Carrier')
        if (!bkContainers.length) missingFields.push('Containers')
        if (!bkVessel) missingFields.push('Vessel')
        if (!bkVesselEtd) missingFields.push('ETD')
        if (!bkVoyage) missingFields.push('Voyage')
        if (!bkCargoReadyDate) missingFields.push('Cargo Ready Date')
        if (!bkAgreedRate) missingFields.push('Agreed Rate')
        if (!bkDeliveryTerm) missingFields.push('Delivery Term')
        if (!bkHsCode) missingFields.push('HS Code')
        if (!bkBlType) missingFields.push('BL Type')
        const bookingDisabled = missingFields.length > 0
        return (
          <div className="flex flex-col gap-2">
            {bookingDisabled && (
              <div className="text-label text-danger">
                Missing required fields: {missingFields.join(', ')}
              </div>
            )}
            <div className="flex justify-end">
              <Button variant="primary" onClick={handleModalSubmit} disabled={bookingDisabled}
                icon={<Ship size={14} aria-hidden="true" />}>
                {isCS ? 'Create Booking & Send to Procurement' : 'Assign RA Number & Move to Booking'}
              </Button>
            </div>
          </div>
        )
      })()}
    </div>
  )
})() : selectedItem.actionKind === 'send-to-customer' && actionModal ? (() => {
  const ctx = actionModal.previousContext
  const quotationFromLog = ctx?.notes?.match(/Quotation:\n([\s\S]+)/)?.[1] ?? ''
  const stcInquiry = actionModal.sourceData.inquiry as Inquiry
  // Fallback: extract plain text from backend body_html if no local quotation content
  const unsentQuote = unsentQuotations.find(q => q.inq_id === stcInquiry.inq_id)
  let quotationText = quotationContent || quotationFromLog
  if (!quotationText && unsentQuote?.body_html) {
    const tmp = document.createElement('div')
    tmp.innerHTML = unsentQuote.body_html
    quotationText = (tmp.textContent || tmp.innerText || '').replace(/\n{3,}/g, '\n\n').trim()
  }
  const emailSubject = `Quotation for ${stcInquiry.customer_name} — ${stcInquiry.id}`

  // Resolve quote_id for fetching the saved PDF from S3
  const resolvedQuoteId = lastQuotationId ?? lookupQuotationId(stcInquiry.inq_id) ?? unsentQuote?.quote_id ?? (stcInquiry as Inquiry & { quotation_id?: number }).quotation_id ?? null

  const handleOpenOutlook = () => {
    openMailto(customerContactEmail, emailSubject, quotationText)
  }
  const handleDownloadPdf = () => {
    if (!resolvedQuoteId) return
    setPdfDownloading(true)
    apiGetQuotationFile(resolvedQuoteId)
      .then(res => {
        window.open(res.download_url, '_blank')
        setPdfDownloaded(true)
      })
      .catch(err => {
        console.error('[Workspace] Failed to fetch quotation file:', err)
        onFlash('Could not download the quotation file. It may not have been saved yet.')
      })
      .finally(() => setPdfDownloading(false))
  }

  const stcDisabled =
    (sendMethod === 'email' && (!customerContactEmail.trim() || !customerContactEmail.includes('@') || !emailConfirmed)) ||
    (sendMethod === 'whatsapp' && !waConfirmed)

  return (
    <div className="flex flex-col gap-3">
      {ctx && <ContextCard ctx={ctx} />}

      {/* Quotation preview — collapsible, plain text only */}
      {quotationText && (
        <div className="overflow-hidden rounded-card border border-line-soft">
          <button type="button" aria-expanded={!draftCollapsed} onClick={() => setDraftCollapsed(c => !c)}
            className="flex w-full items-center justify-between border-none bg-canvas px-3 py-2 text-label hover:bg-surface-hover">
            <span className="flex items-center gap-1.5 font-bold uppercase tracking-label text-primary">
              <FileText size={12} aria-hidden="true" /> Quotation Preview
            </span>
            <ChevronDown size={14} aria-hidden="true" className={cn('text-fg-muted transition-transform', draftCollapsed && '-rotate-90')} />
          </button>
          {!draftCollapsed && (
            <div className="max-h-60 overflow-y-auto whitespace-pre-wrap border-t border-line-soft bg-canvas px-3 py-2.5 text-label leading-normal text-fg-label">
              {quotationText}
            </div>
          )}
        </div>
      )}

      {/* Send method toggle */}
      <div className="flex flex-col gap-1">
        <span id="ws-stc-method-label" className={labelClass}>Send Method</span>
        <div role="group" aria-labelledby="ws-stc-method-label" className="flex gap-2">
          <Button aria-pressed={sendMethod === 'email'} className={cn(sendMethod === 'email' && SELECTED_TOGGLE)}
            icon={<Mail size={14} aria-hidden="true" />}
            onClick={() => { setSendMethod('email'); setEmailConfirmed(false) }}>
            Email
          </Button>
          <Button aria-pressed={sendMethod === 'whatsapp'} className={cn(sendMethod === 'whatsapp' && SELECTED_TOGGLE)}
            icon={<MessageCircle size={14} aria-hidden="true" />}
            onClick={() => { setSendMethod('whatsapp'); setEmailConfirmed(false) }}>
            WhatsApp
          </Button>
        </div>
      </div>

      {/* Email fields */}
      {sendMethod === 'email' && (
        <>
          <Field label="Customer Email" required>
            {ids => <Input {...ids} type="email"
              value={customerContactEmail} onChange={e => setCustomerContactEmail(e.target.value)}
              placeholder="customer@example.com" autoFocus />}
          </Field>
          {customerContactEmail.includes('@') && (
            <>
              {/* Download quotation PDF from S3 */}
              {resolvedQuoteId && (
                <Button className={cn('w-full justify-start', pdfDownloaded && SELECTED_SUCCESS)}
                  icon={<FileText size={14} aria-hidden="true" />}
                  isPending={pdfDownloading} onClick={handleDownloadPdf}>
                  {pdfDownloading ? 'Downloading...' : pdfDownloaded ? 'Downloaded — attach to email' : 'Download Quotation PDF'}
                </Button>
              )}
              {/* Open Outlook compose with quotation text in body */}
              <Button variant="primary" className="w-full justify-start" icon={<Mail size={14} aria-hidden="true" />} onClick={handleOpenOutlook}>
                Open in Outlook
              </Button>
              <p className="m-0 px-0.5 text-label leading-snug text-fg-muted">
                {resolvedQuoteId
                  ? 'Download the PDF first, then open Outlook and attach it to the email before sending.'
                  : 'Opens Outlook with the quotation text. Attach any files manually if needed.'}
              </p>
              <div className="rounded-card border border-info-line bg-info-bg px-3.5 py-2.5">
                <Checkbox checked={emailConfirmed} onChange={setEmailConfirmed} className="items-start">
                  <span className="leading-4 text-fg-label">
                    I confirm that I have sent this quotation to the customer via email.
                    <span className="mt-0.5 block text-label text-fg-muted">
                      Download the PDF, open Outlook, attach the file, verify the content, send it, then check this box.
                    </span>
                  </span>
                </Checkbox>
              </div>
            </>
          )}
        </>
      )}

      {/* WhatsApp fields */}
      {sendMethod === 'whatsapp' && (
        <>
          <Field label="Customer WhatsApp Number" required>
            {ids => <Input {...ids}
              value={customerContactPhone} onChange={e => setCustomerContactPhone(e.target.value)}
              placeholder="+94 7X XXX XXXX" autoFocus />}
          </Field>
          {customerContactPhone.replace(/\s/g, '').length >= 8 && (
            <>
              {/* Download quotation PDF for WhatsApp attachment */}
              {resolvedQuoteId && (
                <Button className={cn('w-full justify-start', pdfDownloaded && SELECTED_SUCCESS)}
                  icon={<FileText size={14} aria-hidden="true" />}
                  isPending={pdfDownloading} onClick={handleDownloadPdf}>
                  {pdfDownloading ? 'Downloading...' : pdfDownloaded ? 'Downloaded — attach to WhatsApp' : 'Download Quotation PDF'}
                </Button>
              )}
              {/* Open WhatsApp with pre-filled message */}
              <Button variant="primary" className="w-full justify-start" icon={<MessageCircle size={14} aria-hidden="true" />}
                onClick={() => {
                  const phone = customerContactPhone.replace(/[\s\-()]/g, '').replace(/^\+/, '')
                  const waUrl = `https://web.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(quotationText)}`
                  window.open(waUrl, '_blank')
                }}>
                Open in WhatsApp
              </Button>
              <p className="m-0 px-0.5 text-label leading-snug text-fg-muted">
                {resolvedQuoteId
                  ? 'Download the PDF first, then open WhatsApp and attach it to the chat before sending.'
                  : 'Opens WhatsApp Web with the quotation text pre-filled.'}
              </p>
              <div className="rounded-card border border-success-line bg-success-bg px-3.5 py-2.5">
                <Checkbox checked={waConfirmed} onChange={setWaConfirmed} className="items-start">
                  <span className="leading-4 text-fg-label">
                    I confirm that I have sent this quotation to the customer via WhatsApp.
                    <span className="mt-0.5 block text-label text-fg-muted">
                      Download the PDF, open WhatsApp, attach the file, verify the content, send it, then check this box.
                    </span>
                  </span>
                </Checkbox>
              </div>
            </>
          )}
        </>
      )}

      <Field label="Notes (optional)">
        {ids => <Input {...ids} value={formNote}
          onChange={e => setFormNote(e.target.value)}
          placeholder="Any additional notes..." />}
      </Field>

      {/* Submit */}
      <div className="flex justify-end gap-2.5 border-t border-line-soft pt-4">
        <Button variant="primary" disabled={stcDisabled}
          icon={sendMethod === 'email' ? <Mail size={14} aria-hidden="true" /> : <MessageCircle size={14} aria-hidden="true" />}
          onClick={handleModalSubmit}>
          {sendMethod === 'email' ? 'Send via Email' : 'Confirm WhatsApp Sent'}
        </Button>
      </div>
    </div>
  )
})() : (
  // Default fallback — safety net for unknown/future action kinds.
  // For action kinds that already fire immediately when the card is clicked
  // (navigate-away, modal-open, or workflow-advance), skip the button entirely
  // so the right panel just shows item context without a redundant intermediary.
  (() => {
    const IMMEDIATE_KINDS = new Set([
      'check-rates', 'check-inttra-rates',
      'confirm-booking', 'bl-approval',
      'verify-kyc', 'approve-quote', 'record-master-bl', 'create-house-bl',
      'acknowledge-procurement', 'advance-workflow',
    ])
    const isImmediate = IMMEDIATE_KINDS.has(selectedItem.actionKind)
    return (
      <div className="rounded-card border border-line-soft bg-surface p-6">
        <div className="mb-4 text-title font-bold text-fg">{selectedItem.actionLabel}</div>
        <div className="mb-4 text-control text-fg-muted">{selectedItem.subtitle}</div>
        {!isImmediate && (
          <div className="flex justify-end gap-2.5 border-t border-line-soft pt-4">
            <Button variant="primary" onClick={() => handleAction(selectedItem)}>
              {selectedItem.actionLabel} <ChevronRight size={14} aria-hidden="true" />
            </Button>
          </div>
        )}
      </div>
    )
  })()
)}
    </>
  )
}
