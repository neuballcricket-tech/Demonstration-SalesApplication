// InlineStepForms -- extracted from Workspace.tsx ternary chain
import React, { type ReactNode } from "react"
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
import { Badge, Button, Checkbox, ComboBox, DatePicker, Field, FileButton, Input, NumberInput, Select, Textarea, Tooltip, type ComboBoxItem, type Option } from "../../ui"
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
      <FileButton accept={accept} size="sm" aria-describedby={describedBy}
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
  showVesselSuggestions, setShowVesselSuggestions,
  vesselDropOpen, setVesselDropOpen, voyageDropOpen, setVoyageDropOpen,
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
  const urgencyClass = { danger: 'text-danger', warning: 'text-warning', info: 'text-accent' }[urgencyTone]
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

  const paSectionHeader = (title: string) => (
    <div style={{ fontSize: 11, fontWeight: 700, color: '#0891b2', textTransform: 'uppercase', letterSpacing: 0.5, padding: '12px 0 6px', borderBottom: '2px solid #0891b220' }}>{title}</div>
  )
  const paInput = (label: string, key: string, opts?: { readOnly?: boolean; span?: boolean }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3, gridColumn: opts?.span ? '1 / -1' : undefined }}>
      <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)' }}>{label}</label>
      <input value={paField(key)} onChange={e => setPaField(key, e.target.value)} readOnly={opts?.readOnly}
        style={{ padding: '6px 8px', borderRadius: 6, border: '1px solid var(--border)', fontSize: 12, background: opts?.readOnly ? 'rgba(0,0,0,0.03)' : 'var(--bg-card)' }} />
    </div>
  )
  const paTextarea = (label: string, key: string) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3, gridColumn: '1 / -1' }}>
      <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)' }}>{label}</label>
      <textarea value={paField(key)} onChange={e => setPaField(key, e.target.value)} rows={3}
        style={{ padding: '6px 8px', borderRadius: 6, border: '1px solid var(--border)', fontSize: 12, resize: 'vertical', fontFamily: 'inherit' }} />
    </div>
  )

  return (
    <div style={{ padding: 20, overflowY: 'auto', maxHeight: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <FileText size={18} style={{ color: '#0891b2' }} />
        <span style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>Pre-Advice Notice</span>
      </div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>
        {paBkg.id} &middot; {paBkg.customer_name} &middot; {paBkg.origin} &rarr; {paBkg.destination}
      </div>
      {blCutoff && (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 6, background: '#fef3c7', color: '#92400e', fontSize: 11, fontWeight: 600, marginBottom: 14 }}>
          <Clock size={12} /> BL Cutoff: {blCutoff}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 14px' }}>
        {/* Door Agent */}
        {paSectionHeader('Door Agent')}
        <div style={{ gridColumn: '1 / -1', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 14px' }}>
          {paInput('Agent Name', 'door_agent')}
          {paInput('Contact Person', 'door_agent_contact')}
          {paInput('Address', 'door_agent_address', { span: true })}
          {paInput('Email', 'door_agent_email')}
        </div>

        {/* Shipment Reference */}
        {paSectionHeader('Shipment Reference')}
        <div style={{ gridColumn: '1 / -1', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 14px' }}>
          {paInput('B/L Number', 'bl_number')}
          {paInput('Booking Ref', 'booking_ref', { readOnly: true })}
        </div>

        {/* Parties */}
        {paSectionHeader('Parties')}
        <div style={{ gridColumn: '1 / -1', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 14px' }}>
          {paInput('Shipper', 'shipper')}
          {paInput('Shipper Address', 'shipper_address')}
          {paInput('Consignee', 'consignee')}
          {paInput('Consignee Address', 'consignee_address')}
          {paInput('Notify Party', 'notify_party')}
          {paInput('Notify Address', 'notify_address')}
        </div>

        {/* Vessel & Route */}
        {paSectionHeader('Vessel & Route')}
        <div style={{ gridColumn: '1 / -1', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 14px' }}>
          {paInput('Vessel', 'vessel', { readOnly: true })}
          {paInput('Voyage', 'voyage', { readOnly: true })}
          {paInput('Carrier', 'carrier', { readOnly: true })}
          {paInput('Port of Loading', 'pol', { readOnly: true })}
          {paInput('Port of Discharge', 'pod', { readOnly: true })}
          {paInput('Final Destination', 'final_destination')}
          {paInput('ETA Destination', 'eta_destination')}
        </div>

        {/* Container Details */}
        {paSectionHeader('Container Details')}
        <div style={{ gridColumn: '1 / -1', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 14px' }}>
          {paInput('Container No.', 'container_no')}
          {paInput('Size / Type', 'container_size', { readOnly: true })}
          {paInput('Qty', 'container_count', { readOnly: true })}
          {paInput('Seal No.', 'seal_no')}
        </div>

        {/* Cargo Details */}
        {paSectionHeader('Cargo Details')}
        <div style={{ gridColumn: '1 / -1', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 14px' }}>
          {paTextarea('Description of Goods', 'cargo_description')}
          {paInput('HS Code', 'hs_code')}
          {paInput('No. of Packages', 'no_of_packages')}
          {paInput('Package Type', 'package_type')}
          {paInput('Gross Weight (kg)', 'gross_weight')}
          {paInput('Net Weight (kg)', 'net_weight')}
          {paInput('Volume (CBM)', 'volume_cbm')}
          {paInput('Freight Terms', 'freight_terms')}
        </div>

        {/* Door Delivery */}
        {paSectionHeader('Door Delivery')}
        <div style={{ gridColumn: '1 / -1', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 14px' }}>
          {paTextarea('Delivery Address', 'delivery_address')}
          {paInput('Contact at Delivery', 'delivery_contact')}
          {paInput('Phone', 'delivery_phone')}
          {paTextarea('Special Instructions', 'special_instructions')}
          {paTextarea('Remarks', 'remarks')}
        </div>
      </div>

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
        return (
          <>
            {/* Generated Email — collapsible */}
            <div style={{ marginTop: 18, border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
              <button type="button" onClick={() => setDraftCollapsed(c => !c)}
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--bg-card)', border: 'none', cursor: 'pointer' }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#0891b2', textTransform: 'uppercase' as const, letterSpacing: 0.5 }}>Generated Email</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {!draftCollapsed && (
                    <button type="button"
                      style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, background: paCopied ? '#dcfce7' : 'none', border: paCopied ? '1px solid #86efac' : 'none', cursor: 'pointer', color: paCopied ? '#16a34a' : 'var(--text-muted)', padding: '3px 8px', borderRadius: 5 }}
                      onClick={e => { e.stopPropagation(); navigator.clipboard.writeText(emailBody); setPaCopied(true); setTimeout(() => setPaCopied(false), 2000) }}>
                      {paCopied ? <><ClipboardCheck size={11} /> Copied!</> : <><Copy size={11} /> Copy</>}
                    </button>
                  )}
                  <ChevronDown size={13} style={{ color: 'var(--text-muted)', transform: draftCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)', transition: 'transform 0.15s' }} />
                </span>
              </button>
              {!draftCollapsed && (
                <div style={{ padding: '10px 12px', borderTop: '1px solid var(--border)' }}>
                  <textarea
                    readOnly
                    rows={18}
                    value={emailBody}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid var(--border)', fontSize: 11, fontFamily: 'ui-monospace, monospace', lineHeight: 1.6, resize: 'vertical', background: 'rgba(0,0,0,0.02)', color: 'var(--text)', boxSizing: 'border-box' }}
                  />
                </div>
              )}
            </div>

            {/* Send Method */}
            <div style={{ marginTop: 14, padding: '14px 16px', borderRadius: 10, background: 'rgba(8,145,178,0.04)', border: '1px solid rgba(8,145,178,0.12)' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#0891b2', marginBottom: 8 }}>SEND TO DOOR AGENT</div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                <button onClick={() => { setSendMethod('email'); setEmailConfirmed(false) }}
                  style={{ padding: '5px 14px', borderRadius: 6, border: sendMethod === 'email' ? '1.5px solid #0891b2' : '1px solid var(--border)', background: sendMethod === 'email' ? '#0891b210' : 'var(--bg-card)', fontSize: 11, fontWeight: 600, color: sendMethod === 'email' ? '#0891b2' : 'var(--text-secondary)', cursor: 'pointer' }}>
                  <Mail size={11} style={{ marginRight: 4 }} /> Email
                </button>
                <button onClick={() => { setSendMethod('whatsapp'); setWaConfirmed(false); setEmailConfirmed(false) }}
                  style={{ padding: '5px 14px', borderRadius: 6, border: sendMethod === 'whatsapp' ? '1.5px solid #25d366' : '1px solid var(--border)', background: sendMethod === 'whatsapp' ? '#25d36610' : 'var(--bg-card)', fontSize: 11, fontWeight: 600, color: sendMethod === 'whatsapp' ? '#25d366' : 'var(--text-secondary)', cursor: 'pointer' }}>
                  <MessageCircle size={11} style={{ marginRight: 4 }} /> WhatsApp
                </button>
              </div>
              {sendMethod === 'email' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <input placeholder="Door agent email" value={paField('door_agent_email')} onChange={e => setPaField('door_agent_email', e.target.value)}
                    style={{ width: '100%', padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border)', fontSize: 12, boxSizing: 'border-box' }} />
                  {paField('door_agent_email').includes('@') && (
                    <>
                      <button className="db-btn" type="button"
                        onClick={() => openMailto(paField('door_agent_email'), paEmailSubject, paEmailBodyOnly)}
                        style={{ background: '#0078d4', borderColor: '#0078d4', color: '#fff', width: '100%' }}>
                        <Mail size={13} style={{ marginRight: 6 }} /> Open in Outlook
                      </button>
                      <div style={{ padding: '10px 14px', background: 'rgba(0,120,212,0.06)', border: '1px solid rgba(0,120,212,0.2)', borderRadius: 8 }}>
                        <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, cursor: 'pointer', fontSize: 11, color: 'var(--text-secondary)' }}>
                          <input type="checkbox" checked={emailConfirmed} onChange={e => setEmailConfirmed(e.target.checked)} style={{ marginTop: 2 }} />
                          <span>
                            I confirm that I have sent this pre-advice to the door agent via email.
                            <span style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Click "Open in Outlook" above, send the email, then check this box.</span>
                          </span>
                        </label>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: waConfirmed ? '#16a34a' : 'var(--text-secondary)', cursor: 'pointer' }}>
                  <input type="checkbox" checked={waConfirmed} onChange={e => setWaConfirmed(e.target.checked)} />
                  I have sent the pre-advice via WhatsApp (copy message above first)
                </label>
              )}
            </div>

            {/* Notes */}
            <div style={{ marginTop: 12 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)' }}>Internal Notes</label>
              <textarea value={formNote} onChange={e => setFormNote(e.target.value)} rows={2} placeholder="Optional notes..."
                style={{ width: '100%', padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border)', fontSize: 12, resize: 'vertical', fontFamily: 'inherit', marginTop: 4, boxSizing: 'border-box' }} />
            </div>

            {/* Submit */}
            <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
              <button
                disabled={
                  !paField('door_agent').trim() ||
                  (sendMethod === 'email' && (!paField('door_agent_email').includes('@') || !emailConfirmed)) ||
                  (sendMethod === 'whatsapp' && !waConfirmed)
                }
                onClick={() => handleModalSubmit()}
                style={{
                  padding: '8px 22px', borderRadius: 8, border: 'none', fontWeight: 700, fontSize: 12,
                  background: '#0891b2', color: '#fff', cursor: 'pointer',
                  opacity: (!paField('door_agent').trim() || (sendMethod === 'email' && (!paField('door_agent_email').includes('@') || !emailConfirmed)) || (sendMethod === 'whatsapp' && !waConfirmed)) ? 0.4 : 1,
                }}>
                <FileText size={12} style={{ marginRight: 4 }} /> Send Pre-Advice
              </button>
            </div>
          </>
        )
      })()}
    </div>
  )
})() : selectedItem.actionKind === 'send-pre-alert' && actionModal ? (() => {
  const paBkg = actionModal.sourceData.booking as Booking

  const praSectionHeader = (title: string) => (
    <div style={{ fontSize: 11, fontWeight: 700, color: '#7c3aed', textTransform: 'uppercase', letterSpacing: 0.5, padding: '12px 0 6px', borderBottom: '2px solid #7c3aed20' }}>{title}</div>
  )
  const praInput = (label: string, key: string, opts?: { readOnly?: boolean; span?: boolean }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3, gridColumn: opts?.span ? '1 / -1' : undefined }}>
      <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)' }}>{label}</label>
      <input value={paField(key)} onChange={e => setPaField(key, e.target.value)} readOnly={opts?.readOnly}
        style={{ padding: '6px 8px', borderRadius: 6, border: '1px solid var(--border)', fontSize: 12, background: opts?.readOnly ? 'rgba(0,0,0,0.03)' : 'var(--bg-card)' }} />
    </div>
  )
  const praSelect = (label: string, key: string, options: string[]) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)' }}>{label}</label>
      <select value={paField(key)} onChange={e => setPaField(key, e.target.value)}
        style={{ padding: '6px 8px', borderRadius: 6, border: '1px solid var(--border)', fontSize: 12, background: 'var(--bg-card)' }}>
        {options.map(o => <option key={o} value={o}>{o || '—'}</option>)}
      </select>
    </div>
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

  return (
    <div style={{ padding: 20, overflowY: 'auto', maxHeight: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <Send size={18} style={{ color: '#7c3aed' }} />
        <span style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>Pre-Alert to Destination Agent</span>
      </div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 14 }}>
        {paBkg.id} &middot; {paBkg.customer_name} &middot; {paBkg.origin} &rarr; {paBkg.destination}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 14px' }}>
        {/* Destination Agent */}
        {praSectionHeader('Destination Agent')}
        <div style={{ gridColumn: '1 / -1', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 14px' }}>
          {praInput('Agent Name', 'dest_agent')}
          {praInput('Agent Email', 'dest_agent_email')}
        </div>

        {/* Shipment Details */}
        {praSectionHeader('Shipment Details')}
        <div style={{ gridColumn: '1 / -1', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 14px' }}>
          {praSelect('HBL Issue Term', 'hbl_issue_term', ISSUE_TERMS)}
          {praSelect('MBL Issue Term', 'mbl_issue_term', ISSUE_TERMS)}
          {praSelect('HBL Freight Term', 'hbl_freight_term', FREIGHT_TERMS)}
          {praSelect('MBL Freight Term', 'mbl_freight_term', FREIGHT_TERMS)}
          {praSelect('HBL Delivery Type', 'hbl_delivery_type', DELIVERY_TYPES)}
          {praSelect('MBL Delivery Type', 'mbl_delivery_type', DELIVERY_TYPES)}
        </div>

        {/* Vessel & Route */}
        {praSectionHeader('Vessel & Route')}
        <div style={{ gridColumn: '1 / -1', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 14px' }}>
          {praInput('Vessel', 'vessel', { readOnly: true })}
          {praInput('Voyage', 'voyage', { readOnly: true })}
          {praInput('ATD ' + (paField('origin') || 'Origin'), 'atd_origin')}
          {praInput('Container No.', 'container_no')}
          {praInput('ETA ' + (paField('destination') || 'Destination'), 'eta_destination')}
          {praInput('Carrier', 'carrier', { readOnly: true })}
        </div>

        {/* BL References */}
        {praSectionHeader('BL References')}
        <div style={{ gridColumn: '1 / -1', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 14px' }}>
          {praInput('H B/L No.', 'hbl_number')}
          {praInput('M B/L No.', 'mbl_number')}
          {praInput('Shipper', 'shipper', { readOnly: true })}
          {praInput('Consignee', 'consignee', { readOnly: true })}
        </div>
      </div>

      {/* Generated Email — collapsible */}
      <div style={{ marginTop: 18, border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
        <button type="button" onClick={() => setDraftCollapsed(c => !c)}
          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--bg-card)', border: 'none', cursor: 'pointer' }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#7c3aed', textTransform: 'uppercase' as const, letterSpacing: 0.5 }}>Generated Email</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {!draftCollapsed && (
              <button type="button"
                style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, background: paCopied ? '#dcfce7' : 'none', border: paCopied ? '1px solid #86efac' : 'none', cursor: 'pointer', color: paCopied ? '#16a34a' : 'var(--text-muted)', padding: '3px 8px', borderRadius: 5 }}
                onClick={e => { e.stopPropagation(); navigator.clipboard.writeText(praEmailBody); setPaCopied(true); setTimeout(() => setPaCopied(false), 2000) }}>
                {paCopied ? <><ClipboardCheck size={11} /> Copied!</> : <><Copy size={11} /> Copy</>}
              </button>
            )}
            <ChevronDown size={13} style={{ color: 'var(--text-muted)', transform: draftCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)', transition: 'transform 0.15s' }} />
          </span>
        </button>
        {!draftCollapsed && (
          <div style={{ padding: '10px 12px', borderTop: '1px solid var(--border)' }}>
            <textarea
              readOnly
              rows={18}
              value={praEmailBody}
              style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid var(--border)', fontSize: 11, fontFamily: 'ui-monospace, monospace', lineHeight: 1.6, resize: 'vertical', background: 'rgba(0,0,0,0.02)', color: 'var(--text)', boxSizing: 'border-box' }}
            />
          </div>
        )}
      </div>

      {/* Notes */}
      <div style={{ marginTop: 14 }}>
        <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)' }}>Internal Notes</label>
        <textarea value={formNote} onChange={e => setFormNote(e.target.value)} rows={2} placeholder="Optional notes..."
          style={{ width: '100%', padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border)', fontSize: 12, resize: 'vertical', fontFamily: 'inherit', marginTop: 4, boxSizing: 'border-box' }} />
      </div>

      {/* Submit — auto-opens Outlook Web with pre-alert email */}
      <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
        <button
          disabled={
            !paField('dest_agent').trim() ||
            !paField('dest_agent_email').includes('@')
          }
          onClick={() => handleModalSubmit()}
          style={{
            padding: '8px 22px', borderRadius: 8, border: 'none', fontWeight: 700, fontSize: 12,
            background: '#7c3aed', color: '#fff', cursor: 'pointer',
            opacity: (!paField('dest_agent').trim() || !paField('dest_agent_email').includes('@')) ? 0.4 : 1,
          }}>
          <Mail size={12} style={{ marginRight: 4 }} /> Send Pre-Alert
        </button>
      </div>
    </div>
  )
})() : selectedItem.actionKind === 'release-booking' && actionModal ? (() => {
  const rbkg = actionModal.sourceData.booking as Booking
  const ro = rbkg.release_order_fields
  const roRow = (label: string, value: string | undefined) =>
    value ? (
      <div key={label} style={{ display: 'grid', gridTemplateColumns: '150px 1fr', borderBottom: '1px solid rgba(124,58,237,0.12)' }}>
        <div style={{ padding: '6px 12px', background: 'rgba(124,58,237,0.06)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: 0.4, color: '#7c3aed', display: 'flex', alignItems: 'center', borderRight: '1px solid rgba(124,58,237,0.12)' }}>{label}</div>
        <div style={{ padding: '6px 12px', fontSize: 12, color: 'var(--text)' }}>{value}</div>
      </div>
    ) : null
  const switchMethod = (m: 'email' | 'whatsapp') => {
    setSendMethod(m)
    setReleaseDraft(mkReleaseOrderDraft(rbkg, m))
    setWaConfirmed(false)
    setEmailConfirmed(false)
  }
  const canSend = sendMethod === 'email'
    ? customerContactEmail.includes('@') && releaseDraft.trim() && emailConfirmed
    : waConfirmed && releaseDraft.trim()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* ═══════ PHASE 1: REVIEW RELEASE ORDER ═══════ */}
      {releasePhase === 'review' && (
        <>
          {/* Header */}
          <div style={{ padding: '10px 14px', background: '#7c3aed', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <FileText size={14} style={{ color: '#fff' }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: '#fff', letterSpacing: 0.5 }}>RELEASE ORDER — REVIEW</span>
            </div>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase' as const, letterSpacing: 0.5 }}>Step 1 of 2</span>
          </div>

          {/* Booking summary */}
          <div style={{ padding: '10px 14px', background: 'rgba(124,58,237,0.04)', border: '1px solid rgba(124,58,237,0.15)', borderRadius: 8, fontSize: 12 }}>
            <strong>{rbkg.customer_name}</strong> — {rbkg.origin} → {rbkg.destination}
            <div style={{ color: 'var(--text-muted)', marginTop: 2 }}>
              {rbkg.quantity}x {rbkg.container_type} · {rbkg.shipping_line || 'No liner'} · {rbkg.vessel_name || 'No vessel'} / {rbkg.voyage_number || '—'}
            </div>
          </div>

          {/* Release Order details */}
          {ro ? (
            <div style={{ border: '1px solid rgba(124,58,237,0.25)', borderRadius: 8, overflow: 'hidden' }}>
              {/* RO header */}
              <div style={{ padding: '8px 12px', background: 'rgba(124,58,237,0.08)', borderBottom: '1px solid rgba(124,58,237,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#7c3aed', textTransform: 'uppercase' as const, letterSpacing: 0.5 }}>Release Order Details</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: '#7c3aed', fontFamily: 'monospace' }}>{ro.reference_nbr}</span>
              </div>

              {/* Liner Reference section */}
              <div style={{ padding: '6px 12px', background: 'rgba(124,58,237,0.03)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: 0.5, color: '#94a3b8', borderBottom: '1px solid rgba(124,58,237,0.08)' }}>Liner Reference</div>
              {roRow('Reference No.',  ro.reference_nbr)}
              {roRow('Pick Up Date',   ro.pickup_empty_date)}
              {roRow('Valid Until',    ro.validity_expiration_date)}

              {/* Depot section */}
              <div style={{ padding: '6px 12px', background: 'rgba(124,58,237,0.03)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: 0.5, color: '#94a3b8', borderBottom: '1px solid rgba(124,58,237,0.08)' }}>Pick Up Depot</div>
              {roRow('Depot Name',     ro.pickup_depot)}
              {roRow('Depot Address',  ro.pickup_depot_address)}

              {/* Routing section */}
              <div style={{ padding: '6px 12px', background: 'rgba(124,58,237,0.03)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: 0.5, color: '#94a3b8', borderBottom: '1px solid rgba(124,58,237,0.08)' }}>Routing & Schedule</div>
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
              <div style={{ padding: '6px 12px', background: 'rgba(124,58,237,0.03)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: 0.5, color: '#94a3b8', borderBottom: '1px solid rgba(124,58,237,0.08)' }}>Cargo & Container</div>
              {roRow('Container',      `${rbkg.quantity}x ${rbkg.container_type}`)}
              {roRow('Cargo',          ro.cargo_description)}
              {roRow('Weight',         ro.cargo_weight ? `${ro.cargo_weight} kg` : undefined)}
              {ro.transport_mode ? roRow('Transport Mode', ro.transport_mode) : null}
              {ro.transport_carrier ? roRow('Transport Carrier', ro.transport_carrier) : null}
            </div>
          ) : (
            <div style={{ padding: '20px 14px', background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, textAlign: 'center' as const }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#dc2626', marginBottom: 4 }}>No Release Order Attached</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Procurement has not yet attached a release order to this booking.</div>
            </div>
          )}

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
            <button type="button"
              disabled={!ro}
              style={{
                flex: 1, padding: '10px 16px', border: '1px solid #7c3aed', borderRadius: 8,
                background: '#7c3aed', color: '#fff', fontWeight: 600, fontSize: 13,
                cursor: !ro ? 'not-allowed' : 'pointer',
                opacity: !ro ? 0.4 : 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}
              onClick={() => setReleasePhase('send')}
            >
              <Send size={12} /> Proceed to Release
            </button>
          </div>
        </>
      )}

      {/* ═══════ PHASE 2: SEND TO CUSTOMER ═══════ */}
      {releasePhase === 'send' && (
        <>
          {/* Header */}
          <div style={{ padding: '10px 14px', background: '#7c3aed', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Send size={14} style={{ color: '#fff' }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: '#fff', letterSpacing: 0.5 }}>RELEASE TO CUSTOMER</span>
            </div>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase' as const, letterSpacing: 0.5 }}>Step 2 of 2</span>
          </div>

          {/* Back to review link */}
          <button type="button" onClick={() => setReleasePhase('review')}
            style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#7c3aed', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontWeight: 600 }}>
            ← Back to Release Order Review
          </button>

          {/* Compact RO reference */}
          {ro && (
            <div style={{ padding: '8px 12px', background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.15)', borderRadius: 8, fontSize: 11, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span><strong style={{ color: '#7c3aed' }}>R/O:</strong> {ro.reference_nbr} · {rbkg.customer_name}</span>
              <span style={{ color: 'var(--text-muted)' }}>{rbkg.origin} → {rbkg.destination}</span>
            </div>
          )}

          {/* Send method */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: 0.4, color: 'var(--text-muted)', marginBottom: 8 }}>Send via</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className={`db-btn ${sendMethod === 'email' ? 'primary' : ''}`}
                style={sendMethod !== 'email' ? { background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-secondary)' } : {}}
                onClick={() => switchMethod('email')}
              >
                <Mail size={13} style={{ marginRight: 4 }} /> Email
              </button>
              <button
                className={`db-btn ${sendMethod === 'whatsapp' ? 'primary' : ''}`}
                style={sendMethod === 'whatsapp' ? { background: '#25d366', borderColor: '#25d366' } : { background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
                onClick={() => switchMethod('whatsapp')}
              >
                <MessageCircle size={13} style={{ marginRight: 4 }} /> WhatsApp
              </button>
            </div>
          </div>

          {/* Contact input */}
          {sendMethod === 'email' && (
            <div>
              <label className="lt-label">Customer Email <span style={{ color: '#dc2626' }}>*</span></label>
              <input className="lt-input" style={{ width: '100%' }} type="email"
                value={customerContactEmail} onChange={e => setCustomerContactEmail(e.target.value)}
                placeholder="customer@example.com" />
            </div>
          )}
          {sendMethod === 'whatsapp' && (
            <div>
              <label className="lt-label">Customer WhatsApp Number</label>
              <input className="lt-input" style={{ width: '100%' }}
                value={customerContactPhone} onChange={e => setCustomerContactPhone(e.target.value)}
                placeholder="+94 7X XXX XXXX" />
            </div>
          )}

          {/* Open in Outlook + confirmation (email) */}
          {sendMethod === 'email' && customerContactEmail.includes('@') && (
            <>
              <button className="db-btn" type="button"
                onClick={() => openMailto(customerContactEmail, `Release Order — ${rbkg.id} — ${rbkg.customer_name}`, releaseDraft)}
                style={{ background: '#0078d4', borderColor: '#0078d4', color: '#fff', width: '100%' }}>
                <Mail size={13} style={{ marginRight: 6 }} /> Open in Outlook
              </button>
              <div style={{ padding: '10px 14px', background: 'rgba(0,120,212,0.06)', border: '1px solid rgba(0,120,212,0.2)', borderRadius: 8 }}>
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, cursor: 'pointer', fontSize: 12, color: 'var(--text-secondary)' }}>
                  <input type="checkbox" checked={emailConfirmed} onChange={e => setEmailConfirmed(e.target.checked)} style={{ marginTop: 2 }} />
                  <span>
                    I confirm that I have sent this release order to the customer via email.
                    <span style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                      Click "Open in Outlook" above, send the email, then check this box.
                    </span>
                  </span>
                </label>
              </div>
            </>
          )}

          {/* Draft message — collapsible */}
          <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
            <button type="button" onClick={() => setDraftCollapsed(c => !c)}
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--bg-card)', border: 'none', cursor: 'pointer' }}>
              <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: 0.4, color: sendMethod === 'whatsapp' ? '#25d366' : 'var(--text-muted)' }}>
                {sendMethod === 'email' ? 'Email Draft' : 'WhatsApp Message'}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {!draftCollapsed && (
                  <button type="button"
                    style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '2px 6px', borderRadius: 4 }}
                    onClick={e => { e.stopPropagation(); navigator.clipboard.writeText(releaseDraft) }}
                    title="Copy to clipboard">
                    <Copy size={12} /> Copy
                  </button>
                )}
                <ChevronDown size={13} style={{ color: 'var(--text-muted)', transform: draftCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)', transition: 'transform 0.15s' }} />
              </span>
            </button>
            {!draftCollapsed && (
              <div style={{ padding: '10px 12px', borderTop: '1px solid var(--border)' }}>
                <textarea
                  className="lt-input"
                  rows={sendMethod === 'email' ? 14 : 12}
                  style={{ width: '100%', resize: 'vertical' as const, fontFamily: sendMethod === 'email' ? 'ui-monospace, monospace' : 'inherit', fontSize: 11.5, lineHeight: 1.6 }}
                  value={releaseDraft}
                  onChange={e => setReleaseDraft(e.target.value)}
                />
              </div>
            )}
          </div>

          {/* WhatsApp manual confirm */}
          {sendMethod === 'whatsapp' && (
            <div style={{ padding: '10px 14px', background: 'rgba(37,211,102,0.06)', border: '1px solid rgba(37,211,102,0.2)', borderRadius: 8 }}>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, cursor: 'pointer', fontSize: 12, color: 'var(--text-secondary)' }}>
                <input type="checkbox" checked={waConfirmed} onChange={e => setWaConfirmed(e.target.checked)} style={{ marginTop: 2 }} />
                <span>
                  I confirm I have sent the release order to the customer via WhatsApp.
                  <span style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Copy the message above and paste it into WhatsApp, then check this box.</span>
                </span>
              </label>
            </div>
          )}

          {/* Optional notes */}
          <div>
            <label className="lt-label">Internal Note (optional)</label>
            <input className="lt-input" style={{ width: '100%' }} value={formNote}
              onChange={e => setFormNote(e.target.value)}
              placeholder="Collection instructions, remarks, etc." />
          </div>

          {/* Submit */}
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              className="db-btn primary"
              disabled={!canSend}
              style={
                !canSend ? { opacity: 0.4, cursor: 'not-allowed' } :
                sendMethod === 'whatsapp' ? { background: '#25d366', borderColor: '#25d366' } : {}
              }
              onClick={handleModalSubmit}
            >
              {sendMethod === 'email'
                ? <><Mail size={12} style={{ marginRight: 6 }} /> Send Release Order via Email</>
                : <><MessageCircle size={12} style={{ marginRight: 6 }} /> Confirm WhatsApp Sent</>
              }
            </button>
          </div>
        </>
      )}
    </div>
  )
})() : selectedItem.actionKind === 'attach-release-order' ? (() => {
  const roBkg = selectedItem.sourceData.booking as Booking
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {/* Header */}
      <div style={{ padding: '8px 14px', background: '#7c3aed', borderRadius: '8px 8px 0 0', marginBottom: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: '#fff', letterSpacing: 0.5 }}>RELEASE ORDER</span>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)' }}>Attach & send to CS</span>
      </div>
      {/* Booking summary — read-only */}
      <div style={{ border: '1px solid var(--border)', borderRadius: '0 0 8px 8px', overflow: 'hidden', marginBottom: 16 }}>
        {[
          { label: 'Customer',   value: roBkg.customer_name },
          { label: 'Carrier',    value: roBkg.shipping_line || '—' },
          { label: 'Container',  value: `${roBkg.quantity}x ${roBkg.container_type}` },
          { label: 'Vessel',     value: roBkg.vessel_name || '—' },
          { label: 'Voyage',     value: roBkg.voyage_number || '—' },
          { label: 'Route',      value: `${roBkg.origin} → ${roBkg.destination}` },
        ].map(({ label, value }) => (
          <div key={label} style={{ display: 'grid', gridTemplateColumns: '100px 1fr', borderBottom: '1px solid var(--border)' }}>
            <div style={{ padding: '7px 12px', background: 'var(--bg-card)', borderRight: '1px solid var(--border)', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}>{label}</div>
            <div style={{ padding: '7px 12px', fontSize: 12, color: 'var(--text)' }}>{value}</div>
          </div>
        ))}
      </div>
      {/* Release Order Fields — structured form matching liner release order format */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: 0.4, color: '#7c3aed', marginBottom: 10 }}>Release Order Details</div>

        {/* Liner Reference */}
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: 0.5, color: 'var(--text-muted)', marginBottom: 6 }}>Liner Reference</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 12 }}>
          <div>
            <label className="lt-label">Reference Nbr</label>
            <input className="lt-input" style={{ width: '100%' }} value={roFields.reference_nbr}
              onChange={e => setRoFields(f => ({ ...f, reference_nbr: e.target.value }))}
              placeholder="e.g. EBKG16474591" />
          </div>
          <div>
            <label className="lt-label">Pick Up Empty Date</label>
            <input type="date" className="lt-input" style={{ width: '100%' }} value={roFields.pickup_empty_date}
              onChange={e => setRoFields(f => ({ ...f, pickup_empty_date: e.target.value }))} />
          </div>
          <div>
            <label className="lt-label">Validity Expiration</label>
            <input type="date" className="lt-input" style={{ width: '100%' }} value={roFields.validity_expiration_date}
              onChange={e => setRoFields(f => ({ ...f, validity_expiration_date: e.target.value }))} />
          </div>
        </div>

        {/* Pick Up Depot */}
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: 0.5, color: 'var(--text-muted)', marginBottom: 6 }}>Pick Up Depot</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 8, marginBottom: 12 }}>
          <div>
            <label className="lt-label">Depot Name</label>
            <input className="lt-input" style={{ width: '100%' }} value={roFields.pickup_depot}
              onChange={e => setRoFields(f => ({ ...f, pickup_depot: e.target.value }))}
              placeholder="e.g. Spectra Integrated Logistics" />
          </div>
          <div>
            <label className="lt-label">Depot Address</label>
            <input className="lt-input" style={{ width: '100%' }} value={roFields.pickup_depot_address}
              onChange={e => setRoFields(f => ({ ...f, pickup_depot_address: e.target.value }))}
              placeholder="Full address" />
          </div>
        </div>

        {/* Cargo */}
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: 0.5, color: 'var(--text-muted)', marginBottom: 6 }}>Cargo</div>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 8, marginBottom: 12 }}>
          <div>
            <label className="lt-label">Cargo Description</label>
            <input className="lt-input" style={{ width: '100%' }} value={roFields.cargo_description}
              onChange={e => setRoFields(f => ({ ...f, cargo_description: e.target.value }))}
              placeholder="e.g. Coconut Milk" />
          </div>
          <div>
            <label className="lt-label">Cargo Weight (kg)</label>
            <input className="lt-input" style={{ width: '100%' }} value={roFields.cargo_weight}
              onChange={e => setRoFields(f => ({ ...f, cargo_weight: e.target.value }))}
              placeholder="e.g. 16,000" />
          </div>
        </div>

        {/* Schedule */}
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: 0.5, color: 'var(--text-muted)', marginBottom: 6 }}>Vessel Schedule</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 12 }}>
          <div>
            <label className="lt-label">Cut-Off Date</label>
            <input type="date" className="lt-input" style={{ width: '100%' }} value={roFields.cut_off_date}
              onChange={e => setRoFields(f => ({ ...f, cut_off_date: e.target.value }))} />
          </div>
          <div>
            <label className="lt-label">ETD</label>
            <input type="date" className="lt-input" style={{ width: '100%' }} value={roFields.etd}
              onChange={e => setRoFields(f => ({ ...f, etd: e.target.value }))} />
          </div>
          <div>
            <label className="lt-label">ETA (Destination)</label>
            <input type="date" className="lt-input" style={{ width: '100%' }} value={roFields.eta}
              onChange={e => setRoFields(f => ({ ...f, eta: e.target.value }))} />
          </div>
        </div>

        {/* Optional */}
        <div>
          <label className="lt-label">Next Port of Discharge (if transshipment)</label>
          <input className="lt-input" style={{ width: '100%' }} value={roFields.next_port_of_discharge ?? ''}
            onChange={e => setRoFields(f => ({ ...f, next_port_of_discharge: e.target.value }))}
            placeholder="Optional — leave blank for direct service" />
        </div>
      </div>

      {/* Notes */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>Notes for CS (optional)</div>
        <textarea className="lt-input" rows={2} style={{ width: '100%', resize: 'vertical' as const, fontSize: 13 }}
          value={formNote} onChange={e => setFormNote(e.target.value)}
          placeholder="Any instructions or remarks for the CS team…" />
      </div>
      {/* Submit */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button className="db-btn primary"
          style={{ background: '#7c3aed', borderColor: '#7c3aed' }}
          disabled={!roFields.reference_nbr.trim()}
          onClick={handleModalSubmit}>
          <Send size={12} style={{ marginRight: 6 }} /> Send Release Order to CS
        </button>
      </div>
    </div>
  )
})() : selectedItem.actionKind === 'confirm-liner-booking' && actionModal ? (() => {
  const { booking: cbBkg } = actionModal.sourceData
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {/* Form header */}
      <div style={{ padding: '8px 14px', background: '#16a34a', borderRadius: '8px 8px 0 0', marginBottom: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: '#fff', letterSpacing: 0.5 }}>LINER BOOKING CONFIRMATION</span>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)' }}>RA# {cbBkg.voyage_number || '—'}</span>
      </div>
      {/* Booking summary — read-only */}
      <div style={{ border: '1px solid var(--border)', borderRadius: '0 0 8px 8px', overflow: 'hidden', marginBottom: 16 }}>
        {[
          { label: 'Customer', value: cbBkg.customer_name },
          { label: 'Carrier', value: cbBkg.shipping_line || '—' },
          { label: 'Container', value: `${cbBkg.quantity}x ${cbBkg.container_type}` },
          { label: 'RA Number', value: cbBkg.voyage_number || 'Not assigned' },
          { label: 'Vessel', value: cbBkg.vessel_name || '—' },
          { label: 'Route', value: `${cbBkg.origin} → ${cbBkg.destination}` },
        ].map(({ label, value }) => (
          <div key={label} style={{ display: 'grid', gridTemplateColumns: '120px 1fr', borderBottom: '1px solid var(--border)' }}>
            <div style={{ padding: '8px 12px', background: 'var(--bg-card)', borderRight: '1px solid var(--border)', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}>{label}</div>
            <div style={{ padding: '8px 12px', fontSize: 12, color: 'var(--text)', fontWeight: label === 'RA Number' ? 700 : 400 }}>{value}</div>
          </div>
        ))}
      </div>
      {/* Booked? toggle */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 10 }}>Was the liner booking confirmed?</div>
        <div style={{ display: 'flex', gap: 10 }}>
          {(['yes', 'no'] as const).map(v => (
            <button key={v} onClick={() => setLinerBooked(v)}
              style={{ flex: 1, padding: '10px 0', borderRadius: 8, border: `2px solid ${linerBooked === v ? (v === 'yes' ? '#16a34a' : '#dc2626') : 'var(--border)'}`,
                background: linerBooked === v ? (v === 'yes' ? 'rgba(22,163,74,0.08)' : 'rgba(220,38,38,0.06)') : '#fff',
                color: linerBooked === v ? (v === 'yes' ? '#16a34a' : '#dc2626') : 'var(--text-secondary)',
                fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
              {v === 'yes' ? '✓ Yes, booked' : '✗ No, couldn\'t book'}
            </button>
          ))}
        </div>
      </div>
      {/* Reason — shown only when No */}
      {linerBooked === 'no' && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#dc2626', marginBottom: 6 }}>Reason (required)</div>
          <textarea className="lt-input" rows={3} style={{ width: '100%', resize: 'vertical' as const, fontSize: 13 }}
            value={formNote} onChange={e => setFormNote(e.target.value)}
            placeholder="Explain why the booking couldn't be made…" />
        </div>
      )}
      {/* Submit */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 4 }}>
        <button className="db-btn primary"
          disabled={!linerBooked || (linerBooked === 'no' && !formNote.trim())}
          style={{ background: linerBooked === 'no' ? '#dc2626' : '#16a34a', borderColor: linerBooked === 'no' ? '#dc2626' : '#16a34a',
            opacity: (!linerBooked || (linerBooked === 'no' && !formNote.trim())) ? 0.5 : 1 }}
          onClick={handleModalSubmit}>
          {linerBooked === 'no' ? 'Revert to Pending Liner' : 'Confirm Liner Booking'}
        </button>
      </div>
    </div>
  )
})() : selectedItem.actionKind === 'submit-si' && actionModal ? (() => {
  const siBkg = actionModal.sourceData.booking as Booking
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {/* Header */}
      <div style={{ padding: '8px 14px', background: '#0891b2', borderRadius: '8px 8px 0 0', marginBottom: 1 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: '#fff', letterSpacing: 0.5 }}>RECORD SHIPPING INSTRUCTIONS</span>
      </div>
      <div style={{ border: '1px solid var(--border)', borderRadius: '0 0 8px 8px', overflow: 'hidden' }}>
        {/* Booking summary */}
        <div style={{ padding: '10px 14px', background: 'rgba(8,145,178,0.04)', borderBottom: '1px solid var(--border)', fontSize: 12 }}>
          <strong>{siBkg.customer_name}</strong> — {siBkg.origin} → {siBkg.destination}
          <span style={{ color: 'var(--text-muted)', marginLeft: 8 }}>
            {siBkg.quantity}x {siBkg.container_type} · {siBkg.shipping_line || 'No liner'}
          </span>
        </div>

        {/* Cutoff dates */}
        {(siBkg.si_cutoff_date || siBkg.bl_cutoff_date || siBkg.vgm_cutoff_date) && (
          <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border)' }}>
            {siBkg.si_cutoff_date && (
              <div style={{ flex: 1, padding: '6px 12px', background: 'rgba(8,145,178,0.04)', borderRight: '1px solid var(--border)', fontSize: 11 }}>
                <span style={{ color: 'var(--text-muted)' }}>SI Cutoff:</span> <strong>{siBkg.si_cutoff_date}</strong>
              </div>
            )}
            {siBkg.bl_cutoff_date && (
              <div style={{ flex: 1, padding: '6px 12px', background: 'rgba(217,119,6,0.04)', borderRight: '1px solid var(--border)', fontSize: 11 }}>
                <span style={{ color: 'var(--text-muted)' }}>BL Cutoff:</span> <strong>{siBkg.bl_cutoff_date}</strong>
              </div>
            )}
            {siBkg.vgm_cutoff_date && (
              <div style={{ flex: 1, padding: '6px 12px', background: 'rgba(168,85,247,0.04)', fontSize: 11 }}>
                <span style={{ color: 'var(--text-muted)' }}>VGM Cutoff:</span> <strong>{siBkg.vgm_cutoff_date}</strong>
              </div>
            )}
          </div>
        )}

        {/* Collapsible Release Order reference */}
        {siBkg.release_order_fields && (() => {
          const siRo = siBkg.release_order_fields!
          return (
            <div style={{ borderBottom: '1px solid var(--border)' }}>
              <button type="button" onClick={() => setRoRefCollapsed(!roRefCollapsed)}
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'rgba(124,58,237,0.06)', border: 'none', cursor: 'pointer', borderBottom: !roRefCollapsed ? '1px solid rgba(124,58,237,0.12)' : 'none' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <FileText size={12} style={{ color: '#7c3aed' }} />
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#7c3aed', textTransform: 'uppercase' as const, letterSpacing: 0.4 }}>Release Order Reference</span>
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{siRo.reference_nbr}</span>
                  <ChevronDown size={14} style={{ color: '#7c3aed', transform: roRefCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
                </span>
              </button>
              {!roRefCollapsed && (
                <div style={{ fontSize: 11 }}>
                  {[
                    ['Reference No.', siRo.reference_nbr],
                    ['Pick Up Date', siRo.pickup_empty_date],
                    ['Valid Until', siRo.validity_expiration_date],
                    ['Depot', siRo.pickup_depot],
                    ['Depot Address', siRo.pickup_depot_address],
                    ['Vessel', siBkg.vessel_name],
                    ['Voyage', siBkg.voyage_number],
                    ['Cut-Off', siRo.cut_off_date],
                    ['ETD', siRo.etd],
                    ['ETA', siRo.eta],
                    ['Container', `${siBkg.quantity}x ${siBkg.container_type}`],
                    ['Cargo', siRo.cargo_description],
                    ['Weight', siRo.cargo_weight ? `${siRo.cargo_weight} kg` : undefined],
                  ].filter(([, v]) => v).map(([label, value]) => (
                    <div key={label} style={{ display: 'grid', gridTemplateColumns: '120px 1fr', borderBottom: '1px solid rgba(124,58,237,0.08)' }}>
                      <div style={{ padding: '4px 10px', background: 'rgba(124,58,237,0.04)', fontSize: 11, fontWeight: 600, color: '#7c3aed', display: 'flex', alignItems: 'center', borderRight: '1px solid rgba(124,58,237,0.08)' }}>{label}</div>
                      <div style={{ padding: '4px 10px', fontSize: 11, color: 'var(--text)' }}>{value}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })()}

        {/* SI Document section */}
        <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#0891b2', marginBottom: 6 }}>SI DOCUMENT</div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <button
              className={`db-btn ${siMode === 'paste' ? 'primary' : ''}`}
              style={siMode !== 'paste' ? { background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-secondary)', fontSize: 11 } : { fontSize: 11 }}
              onClick={() => setSiMode('paste')}
            >
              <ClipboardPaste size={12} style={{ marginRight: 4 }} /> Paste
            </button>
            <button
              className={`db-btn ${siMode === 'upload' ? 'primary' : ''}`}
              style={siMode !== 'upload' ? { background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-secondary)', fontSize: 11 } : { fontSize: 11 }}
              onClick={() => setSiMode('upload')}
            >
              <Paperclip size={12} style={{ marginRight: 4 }} /> Upload
            </button>
          </div>

          {siMode === 'paste' && (
            <textarea
              className="lt-input"
              style={{ width: '100%', minHeight: 90, fontFamily: 'monospace', fontSize: 11, lineHeight: 1.5, resize: 'vertical' }}
              value={siContent}
              onChange={e => setSiContent(e.target.value)}
              placeholder="Paste shipping instructions here..."
            />
          )}

          {siMode === 'upload' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <label className="db-btn"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, cursor: 'pointer', background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                <Paperclip size={12} />
                {siFileName ? 'Replace file' : 'Choose file'}
                <input type="file" accept=".pdf,.xlsx,.xls,.csv,.png,.jpg,.jpeg,.txt,.doc,.docx" style={{ display: 'none' }}
                  onChange={e => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    setSiFileName(file.name)
                    const reader = new FileReader()
                    reader.onload = () => setSiContent(reader.result as string)
                    reader.readAsDataURL(file)
                    e.target.value = ''
                  }} />
              </label>
              {siFileName && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                  <FileText size={13} style={{ color: '#16a34a' }} />
                  <span style={{ fontWeight: 600 }}>{siFileName}</span>
                  <button style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: 'var(--text-muted)' }}
                    onClick={() => { setSiFileName(''); setSiContent('') }} title="Remove file"><X size={12} /></button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* VGM Document section */}
        <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#7c3aed', marginBottom: 6 }}>VGM DOCUMENT <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(optional)</span></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label className="db-btn"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, cursor: 'pointer', background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
              <Paperclip size={12} />
              {vgmCertFileName ? 'Replace file' : 'Upload VGM'}
              <input type="file" accept=".pdf,.xlsx,.xls,.csv,.png,.jpg,.jpeg,.doc,.docx" style={{ display: 'none' }}
                onChange={e => {
                  const f = e.target.files?.[0]
                  if (!f) return
                  setVgmCertFileName(f.name)
                  const r = new FileReader()
                  r.onload = () => setVgmCertContent(r.result as string)
                  r.readAsDataURL(f)
                  e.target.value = ''
                }} />
            </label>
            {vgmCertFileName && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                <FileText size={13} style={{ color: '#16a34a' }} />
                <span style={{ fontWeight: 600 }}>{vgmCertFileName}</span>
                <button style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: 'var(--text-muted)' }}
                  onClick={() => { setVgmCertFileName(''); setVgmCertContent('') }}><X size={12} /></button>
              </div>
            )}
          </div>
        </div>

        {/* Notes */}
        <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr' }}>
          <div style={{ padding: '8px 12px', background: 'var(--bg-card)', borderRight: '1px solid var(--border)', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}>Notes</div>
          <div style={{ padding: '4px 8px' }}>
            <input className="lt-input" style={{ width: '100%', border: 'none', background: 'transparent', padding: '4px 0' }}
              value={formNote} onChange={e => setFormNote(e.target.value)} placeholder="Any notes about the SI submission..." />
          </div>
        </div>
      </div>

      {/* Submit */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
        <button className="db-btn primary"
          disabled={!siContent.trim() || inttraSiLoading}
          style={siContent.trim() ? { background: '#0891b2', borderColor: '#0891b2' } : { opacity: 0.4, cursor: 'not-allowed' }}
          onClick={handleModalSubmit}>
          <Globe size={12} /> Record SI{vgmCertFileName ? ' (VGM attached)' : ''}
        </button>
      </div>
    </div>
  )
})() : selectedItem.actionKind === 'generate-si' && actionModal ? (() => {
  const gsBkg = actionModal.sourceData.booking as Booking
  const gsInput = (label: string, key: string, opts?: { placeholder?: string; readOnly?: boolean; span2?: boolean; type?: string }) => (
    <div style={opts?.span2 ? { gridColumn: '1 / -1' } : {}}>
      <label className="lt-label">{label}</label>
      <input className="lt-input" style={{ width: '100%', ...(opts?.readOnly ? { background: 'rgba(0,0,0,0.03)' } : {}) }}
        type={opts?.type || 'text'}
        value={siField(key)} onChange={e => setSiField(key, e.target.value)}
        placeholder={opts?.placeholder || ''} readOnly={opts?.readOnly} />
    </div>
  )
  const gsTextarea = (label: string, key: string, placeholder?: string) => (
    <div style={{ gridColumn: '1 / -1' }}>
      <label className="lt-label">{label}</label>
      <textarea className="lt-input" rows={3} style={{ width: '100%', resize: 'vertical' as const, fontSize: 12 }}
        value={siField(key)} onChange={e => setSiField(key, e.target.value)}
        placeholder={placeholder || ''} />
    </div>
  )
  const gsSectionHeader = (title: string) => (
    <div style={{ padding: '6px 12px', background: 'rgba(8,145,178,0.08)', borderLeft: '3px solid #0891b2', borderRadius: '0 6px 6px 0', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.05em', color: '#0891b2', marginTop: 4 }}>{title}</div>
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Header */}
      <div style={{ padding: '8px 14px', background: '#0891b2', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: '#fff', letterSpacing: 0.5 }}>GENERATE SI</span>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)' }}>{gsBkg.customer_name}</span>
      </div>

      {/* Booking summary */}
      <div style={{ padding: '10px 14px', background: 'rgba(44,44,130,0.06)', border: '1px solid rgba(44,44,130,0.15)', borderRadius: 8, fontSize: 12 }}>
        <strong>{gsBkg.customer_name}</strong> — {gsBkg.origin} → {gsBkg.destination}
        <div style={{ color: 'var(--text-muted)', marginTop: 2 }}>
          {gsBkg.quantity}x {gsBkg.container_type} · {gsBkg.shipping_line || 'No liner'}
          {gsBkg.job_reference_number && <span style={{ marginLeft: 8 }}>· Job Ref: <strong>{gsBkg.job_reference_number}</strong></span>}
        </div>
      </div>

      {/* ══════ NON-NVOCC: Simple confirmation ══════ */}
      {!siIsNvocc && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ padding: '16px 18px', background: 'rgba(22,163,74,0.06)', border: '1px solid rgba(22,163,74,0.2)', borderRadius: 8 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#15803d', marginBottom: 8 }}>Confirm SI Submitted to Liner</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              For non-NVOCC shipments, the Shipping Instructions are submitted directly to the liner by the shipper or through the liner's portal.
              Please confirm that the SI has been submitted for this booking.
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label className="lt-label">Shipping Line</label>
              <input className="lt-input" style={{ width: '100%', background: 'rgba(0,0,0,0.03)' }} value={gsBkg.shipping_line || ''} readOnly />
            </div>
            <div>
              <label className="lt-label">Booking Ref</label>
              <input className="lt-input" style={{ width: '100%', background: 'rgba(0,0,0,0.03)' }} value={gsBkg.id} readOnly />
            </div>
          </div>
          <div>
            <label className="lt-label">Notes (optional)</label>
            <input className="lt-input" style={{ width: '100%' }} value={formNote}
              onChange={e => setFormNote(e.target.value)} placeholder="e.g. SI submitted via INTTRA portal on..." />
          </div>
        </div>
      )}

      {/* ══════ NVOCC: Full SI Generation Form ══════ */}
      {siIsNvocc && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* ── HEADER INFO ── */}
          {gsSectionHeader('Addressed To')}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {gsInput('To (Shipping Line)', 'to_liner', { placeholder: 'e.g. HAPAG LLOYD' })}
            {gsInput('Attn', 'attn', { placeholder: 'e.g. B/L DEPARTMENT' })}
            <div>
              <label className="lt-label">BL Type</label>
              <select className="lt-input" style={{ width: '100%' }} value={siField('bl_type')} onChange={e => setSiField('bl_type', e.target.value)}>
                <option value="ORIGINAL">ORIGINAL</option>
                <option value="SEAWAY BILL">SEAWAY BILL</option>
                <option value="TELEX RELEASE">TELEX RELEASE</option>
                <option value="EXPRESS RELEASE">EXPRESS RELEASE</option>
              </select>
            </div>
          </div>

          {/* ── REFERENCE ── */}
          {gsSectionHeader('Reference')}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {gsInput('Booking Ref', 'booking_ref', { readOnly: true })}
            {gsInput('Job Ref', 'job_ref', { readOnly: true })}
          </div>

          {/* ── PARTIES ── */}
          {gsSectionHeader('Parties')}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 10 }}>
            {gsInput('Shipper Name', 'shipper_name', { placeholder: 'Shipper company name' })}
            {gsTextarea('Shipper Address', 'shipper_address', 'Full shipper address...')}
            {gsInput('Consignee Name', 'consignee_name', { placeholder: 'Consignee company name' })}
            {gsTextarea('Consignee Address', 'consignee_address', 'Full consignee address...')}
            {gsInput('Notify Party Name', 'notify_name', { placeholder: 'Notify party name' })}
            {gsTextarea('Notify Party Address', 'notify_address', 'Notify party address...')}
          </div>

          {/* ── VESSEL & ROUTE ── */}
          {gsSectionHeader('Vessel & Route')}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {gsInput('Vessel', 'vessel')}
            {gsInput('Voyage', 'voyage')}
            <div>
              <label className="lt-label">Delivery Type</label>
              <select className="lt-input" style={{ width: '100%' }} value={siField('delivery_type')} onChange={e => setSiField('delivery_type', e.target.value)}>
                <option value="CY/CY">CY/CY</option>
                <option value="CY/SD">CY/SD</option>
                <option value="SD/CY">SD/CY</option>
                <option value="SD/SD">SD/SD</option>
              </select>
            </div>
            {gsInput('Place of Receipt', 'place_of_receipt')}
            {gsInput('Port of Loading (POL)', 'pol')}
            {gsInput('Port of Discharge (POD)', 'pod')}
            {gsInput('SOB Date', 'sob_date', { type: 'date' })}
          </div>

          {/* ── CONTAINER DETAILS ── */}
          {gsSectionHeader('Container Details')}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {gsInput('Container No', 'container_no', { placeholder: 'e.g. HLBU1234567' })}
            {gsInput('Seal No', 'seal_no', { placeholder: 'e.g. SL123456' })}
            {gsInput('Container Size/Type', 'container_size', { readOnly: true })}
          </div>

          {/* ── CARGO DETAILS ── */}
          {gsSectionHeader('Cargo Details')}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {gsTextarea('Marks & Nos', 'marks_and_numbers', 'Marks and numbers...')}
            {gsTextarea('Description of Goods', 'description_of_goods', 'Commodity description...')}
            {gsInput('Weight (KGS)', 'weight_kgs', { placeholder: '0.00', type: 'number' })}
            {gsInput('Volume (M3)', 'volume_m3', { placeholder: '0.00', type: 'number' })}
          </div>

          {/* ── TERMS ── */}
          {gsSectionHeader('Terms')}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label className="lt-label">Freight</label>
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                {(['PREPAID', 'COLLECT'] as const).map(f => (
                  <button key={f}
                    className={`db-btn ${siField('freight') === f ? 'primary' : ''}`}
                    style={siField('freight') !== f ? { background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-secondary)' } : {}}
                    onClick={() => setSiField('freight', f)}>
                    {f}
                  </button>
                ))}
              </div>
            </div>
            {gsInput('Total Containers', 'total_containers', { readOnly: true })}
            <div>
              <label className="lt-label">Shipped on Board</label>
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                {(['YES', 'NO'] as const).map(v => (
                  <button key={v}
                    className={`db-btn ${siField('shipped_on_board') === v ? 'primary' : ''}`}
                    style={siField('shipped_on_board') !== v ? { background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-secondary)' } : {}}
                    onClick={() => setSiField('shipped_on_board', v)}>
                    {v}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="lt-label">Notes (optional)</label>
            <input className="lt-input" style={{ width: '100%' }} value={formNote}
              onChange={e => setFormNote(e.target.value)} placeholder="Internal notes..." />
          </div>

          {/* ── SEND TO LINER ── */}
          <div style={{ borderTop: '2px solid var(--border)', paddingTop: 14, marginTop: 4, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div>
              <label className="lt-label">Liner Email Address <span style={{ color: '#dc2626' }}>*</span></label>
              <input className="lt-input" type="email" style={{ width: '100%', marginTop: 4 }}
                value={siLinerEmail} onChange={e => setSiLinerEmail(e.target.value)}
                placeholder="bl@hapag-lloyd.com" />
            </div>
            <button className="db-btn" type="button"
              disabled={!siLinerEmail.includes('@')}
              onClick={() => {
                const draft = siEmailDraft.trim() || generateEmailDraft()
                const lines = draft.split('\n')
                const subject = lines[0].replace(/^Subject:\s*/i, '').trim()
                const body = lines.slice(2).join('\n')
                openMailto(siLinerEmail, subject, body)
              }}
              style={siLinerEmail.includes('@')
                ? { background: '#0078d4', borderColor: '#0078d4', color: '#fff', width: '100%' }
                : { opacity: 0.4, cursor: 'not-allowed', width: '100%' }}>
              <Mail size={13} style={{ marginRight: 6 }} /> Open in Outlook
            </button>

            {/* Draft — collapsible, optional */}
            {!siEmailShow ? (
              <button
                className="db-btn"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: '#0891b2', fontWeight: 600, fontSize: 12, width: '100%', padding: '10px 0' }}
                onClick={generateEmailDraft}>
                <ChevronDown size={13} style={{ marginRight: 6, transform: 'rotate(-90deg)' }} />
                View Email Draft
              </button>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#0891b2', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Email Draft to Liner</span>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="db-btn" style={{ fontSize: 11, background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
                      onClick={() => { navigator.clipboard.writeText(siEmailDraft) }}>
                      <ClipboardPaste size={11} style={{ marginRight: 4 }} /> Copy
                    </button>
                    <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 11 }}
                      onClick={() => setSiEmailShow(false)}>Collapse</button>
                  </div>
                </div>
                <textarea
                  className="lt-input mono"
                  rows={16}
                  style={{ width: '100%', resize: 'vertical', fontSize: 11, lineHeight: 1.6, fontFamily: 'ui-monospace, "Cascadia Code", monospace' }}
                  value={siEmailDraft}
                  onChange={e => setSiEmailDraft(e.target.value)}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Submit (this step renders inline only, so it needs its own button) */}
      {(() => {
        const gsDisabled = siIsNvocc && (!siField('shipper_name').trim() || !siField('consignee_name').trim())
        return (
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button className="db-btn primary" onClick={handleModalSubmit} disabled={gsDisabled}
              style={gsDisabled ? { opacity: 0.4, cursor: 'not-allowed' } : { background: '#0891b2', borderColor: '#0891b2' }}>
              {siIsNvocc
                ? <><FileText size={12} /> Generate SI Document</>
                : <><Check size={12} /> Confirm SI Submitted</>}
            </button>
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
  const tabBtn = (label: string, val: typeof vesselScheduleType) => (
    <button key={val} onClick={() => setVesselScheduleType(val)} style={{ flex: 1, padding: '7px 0', fontSize: 12, fontWeight: 700, border: '1px solid var(--border)', cursor: 'pointer', borderRadius: 0, background: vesselScheduleType === val ? '#0891b2' : 'var(--bg-card)', color: vesselScheduleType === val ? '#fff' : 'var(--text-secondary)' }}>
      {label}
    </button>
  )
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ padding: '8px 14px', background: '#0891b2', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: '#fff', letterSpacing: 0.5 }}>VESSEL SCHEDULE</span>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)' }}>{blBkg.customer_name} · {blBkg.origin} → {blBkg.destination}</span>
      </div>

      {roBookings.length > 0 && (
        <div>
          <label className="lt-label">Pre-fill from Release Order (optional)</label>
          <select className="lt-input" style={{ width: '100%' }} value={selectedReleaseOrderId} onChange={e => applyReleaseOrder(e.target.value)}>
            <option value="">— Select a release order —</option>
            {roBookings.map(b => (
              <option key={b.id} value={b.id}>{b.customer_name} · {b.vessel_name} / {b.voyage_number} ({b.origin} → {b.destination})</option>
            ))}
          </select>
        </div>
      )}

      <div>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>Vessel Schedule Type</div>
        <div style={{ display: 'flex', borderRadius: 6, overflow: 'hidden', border: '1px solid var(--border)' }}>
          {tabBtn('FCL', 'FCL')}{tabBtn('CONSOL', 'CONSOL')}{tabBtn('BOTH', 'BOTH')}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div style={{ position: 'relative' }}>
          <label className="lt-label">Vessel</label>
          <input className="lt-input" style={{ width: '100%' }} value={formVessel}
            onChange={e => { setFormVessel(e.target.value); setShowVesselSuggestions(true) }}
            onFocus={() => setShowVesselSuggestions(true)}
            onBlur={() => setTimeout(() => setShowVesselSuggestions(false), 200)}
            placeholder="e.g. MSC America" autoComplete="off" />
          {showVesselSuggestions && vesselMatches.length > 0 && (
            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 20, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.12)', maxHeight: 220, overflowY: 'auto', marginTop: 2 }}>
              <div style={{ padding: '6px 10px', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid var(--border)' }}>Recent vessels (last 2 weeks)</div>
              {vesselMatches.map(vs => (
                <button key={vs.id} onMouseDown={e => { e.preventDefault(); applyVesselSchedule(vs) }}
                  style={{ display: 'block', width: '100%', padding: '8px 10px', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left', fontSize: 12, borderBottom: '1px solid var(--border)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(8,145,178,0.06)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
                  <div style={{ fontWeight: 600, color: 'var(--text)' }}>{vs.vessel_name} / {vs.voyage_number}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{vs.pol}{vs.final_pod ? ` → ${vs.final_pod}` : ''}{vs.etd_pol ? ` · ETD ${vs.etd_pol}` : ''} · {vs.schedule_type}</div>
                </button>
              ))}
            </div>
          )}
        </div>
        <div>
          <label className="lt-label">Voyage</label>
          <input className="lt-input" style={{ width: '100%' }} value={formVoyage} onChange={e => setFormVoyage(e.target.value)} placeholder="e.g. QB614W" />
        </div>
        <div>
          <label className="lt-label">Port of Loading</label>
          <input className="lt-input" style={{ width: '100%' }} value={vesselPol} onChange={e => setVesselPol(e.target.value)} placeholder="e.g. Colombo" />
        </div>
        <div>
          <label className="lt-label">ETD POL</label>
          <div style={{ display: 'flex', gap: 4 }}>
            <input type="date" className="lt-input" style={{ flex: 1 }} value={vesselEtdPol} onChange={e => setVesselEtdPol(e.target.value)} />
            {vesselEtdPol && <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '0 4px' }} onClick={() => setVesselEtdPol('')}><X size={13} /></button>}
          </div>
        </div>
        <div>
          <label className="lt-label">ETA POL</label>
          <div style={{ display: 'flex', gap: 4 }}>
            <input type="date" className="lt-input" style={{ flex: 1 }} value={vesselEtaPol} onChange={e => setVesselEtaPol(e.target.value)} />
            {vesselEtaPol && <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '0 4px' }} onClick={() => setVesselEtaPol('')}><X size={13} /></button>}
          </div>
        </div>
        <div>
          <label className="lt-label">Routing Type</label>
          <select className="lt-input" style={{ width: '100%' }} value={vesselRoutingType} onChange={e => setVesselRoutingType(e.target.value as 'DIRECT' | 'TRANSSHIPMENT')}>
            <option value="DIRECT">Direct</option>
            <option value="TRANSSHIPMENT">Transshipment</option>
          </select>
        </div>
        <div>
          <label className="lt-label">Final Port of Discharge</label>
          <input className="lt-input" style={{ width: '100%' }} value={vesselFinalPod} onChange={e => setVesselFinalPod(e.target.value)} placeholder="e.g. Felixstowe" />
        </div>
        <div>
          <label className="lt-label">ETA FPOD</label>
          <div style={{ display: 'flex', gap: 4 }}>
            <input type="date" className="lt-input" style={{ flex: 1 }} value={vesselEtaFpod} onChange={e => setVesselEtaFpod(e.target.value)} />
            {vesselEtaFpod && <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '0 4px' }} onClick={() => setVesselEtaFpod('')}><X size={13} /></button>}
          </div>
        </div>
      </div>

      <div>
        <label className="lt-label">Remarks</label>
        <textarea className="lt-input" rows={2} style={{ width: '100%', resize: 'vertical' as const, fontSize: 13 }} value={vesselRemarks} onChange={e => setVesselRemarks(e.target.value)} placeholder="Any remarks about the vessel schedule..." />
      </div>
      <div>
        <label className="lt-label">Agent</label>
        <textarea className="lt-input" rows={2} style={{ width: '100%', resize: 'vertical' as const, fontSize: 13 }} value={vesselAgent} onChange={e => setVesselAgent(e.target.value)} placeholder="Agent details..." />
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button className="db-btn primary"
          disabled={!formVessel.trim() || !formVoyage.trim()}
          style={!formVessel.trim() || !formVoyage.trim() ? { opacity: 0.4, cursor: 'not-allowed' } : { background: '#0891b2', borderColor: '#0891b2' }}
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
        </button>
      </div>


    </div>
  )
})() : selectedItem.actionKind === 'create-vessel-booking' && actionModal ? (() => {
  const blBkg = actionModal.sourceData.booking as Booking
  const sectionHeader = (title: string) => (
    <div style={{ padding: '6px 12px', background: 'rgba(8,145,178,0.08)', borderLeft: '3px solid #0891b2', borderRadius: '0 6px 6px 0', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.05em', color: '#0891b2', marginTop: 4 }}>{title}</div>
  )
  const formInput = (label: string, key: string, opts?: { type?: string; placeholder?: string; span2?: boolean; readOnly?: boolean }) => (
    <div style={opts?.span2 ? { gridColumn: '1 / -1' } : {}}>
      <label className="lt-label">{label}</label>
      <input className="lt-input" style={{ width: '100%', ...(opts?.readOnly ? { background: 'rgba(0,0,0,0.03)' } : {}) }}
        type={opts?.type || 'text'} value={bkgField(key)} onChange={e => setBkgField(key, e.target.value)}
        placeholder={opts?.placeholder || ''} readOnly={opts?.readOnly} />
    </div>
  )
  const formSelect = (label: string, key: string, options: string[]) => (
    <div>
      <label className="lt-label">{label}</label>
      <select className="lt-input" style={{ width: '100%' }} value={bkgField(key)} onChange={e => setBkgField(key, e.target.value)}>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  )
  const formTextarea = (label: string, key: string, placeholder?: string) => (
    <div style={{ gridColumn: '1 / -1' }}>
      <label className="lt-label">{label}</label>
      <textarea className="lt-input" rows={2} style={{ width: '100%', resize: 'vertical' as const, fontSize: 12 }}
        value={bkgField(key)} onChange={e => setBkgField(key, e.target.value)} placeholder={placeholder || ''} />
    </div>
  )
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* ── Unknown vessel / voyage warning modal ── */}
      {unknownVoyageWarning && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.45)' }}
          onClick={() => setUnknownVoyageWarning(null)}>
          <div style={{ background: 'var(--bg-card)', borderRadius: 12, padding: '24px 28px', maxWidth: 420, width: '90%', boxShadow: '0 8px 32px rgba(0,0,0,0.22)', border: '1px solid var(--border)' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
              <div style={{ flexShrink: 0, width: 36, height: 36, borderRadius: 8, background: 'rgba(217,119,6,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <AlertTriangle size={18} style={{ color: '#d97706' }} />
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>
                  {unknownVoyageWarning.field === 'vessel' ? 'Vessel Not Found' : 'Voyage Not Found'}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.55 }}>
                  <strong style={{ color: 'var(--text)' }}>"{unknownVoyageWarning.value}"</strong> does not match any open {unknownVoyageWarning.field} record.
                  <br /><br />
                  Please verify that you typed it correctly, or go to the <strong>Vessel step (Step 11)</strong> to add this {unknownVoyageWarning.field} as a new open voyage first.
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 6 }}>
              <button className="db-btn"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
                onClick={() => setUnknownVoyageWarning(null)}>
                Keep Editing
              </button>
              <button className="db-btn"
                style={{ background: '#d97706', borderColor: '#d97706', color: '#fff' }}
                onClick={() => { setUnknownVoyageWarning(null); setActionModal(null); setActiveStep('cs-bl-vessel') }}>
                Go to Vessel Step
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ padding: '8px 14px', background: '#0891b2', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: '#fff', letterSpacing: 0.5 }}>BOOKING</span>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)' }}>{blBkg.customer_name} · {blBkg.origin} → {blBkg.destination}</span>
      </div>

      {(formVessel || formVoyage) && (
        <div style={{ padding: '8px 12px', background: 'rgba(8,145,178,0.06)', border: '1px solid rgba(8,145,178,0.15)', borderRadius: 8, fontSize: 12, display: 'flex', flexWrap: 'wrap', gap: '4px 16px' }}>
          {formVessel && <span><span style={{ color: 'var(--text-muted)' }}>Vessel:</span> <strong>{formVessel}</strong></span>}
          {formVoyage && <span><span style={{ color: 'var(--text-muted)' }}>Voyage:</span> <strong>{formVoyage}</strong></span>}
          {vesselPol && <span><span style={{ color: 'var(--text-muted)' }}>POL:</span> {vesselPol}</span>}
          {vesselFinalPod && <span><span style={{ color: 'var(--text-muted)' }}>FPOD:</span> {vesselFinalPod}</span>}
          {vesselEtdPol && <span><span style={{ color: 'var(--text-muted)' }}>ETD:</span> {vesselEtdPol}</span>}
          {vesselEtaFpod && <span><span style={{ color: 'var(--text-muted)' }}>ETA:</span> {vesselEtaFpod}</span>}
        </div>
      )}

      {sectionHeader('Vessel Details')}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {/* Vessel combobox */}
        <div style={{ position: 'relative' }}>
          <label className="lt-label">Vessel</label>
          <input className="lt-input" style={{ width: '100%' }}
            value={formVessel}
            onChange={e => { setFormVessel(e.target.value); setVesselDropOpen(true) }}
            onFocus={() => setVesselDropOpen(true)}
            onBlur={() => setTimeout(() => {
              setVesselDropOpen(false)
              if (vesselPickedRef.current) { vesselPickedRef.current = false; return }
              const v = formVessel.trim()
              if (v && !MOCK_OPEN_VOYAGES.some(o => o.vesselName.toLowerCase() === v.toLowerCase()))
                setUnknownVoyageWarning({ field: 'vessel', value: v })
            }, 150)}
            placeholder="Search vessel name…" />
          {vesselDropOpen && (() => {
            const q = formVessel.toLowerCase()
            const uniqueVessels = MOCK_OPEN_VOYAGES
              .filter(v => v.vesselName.toLowerCase().includes(q))
              .filter((v, i, arr) => arr.findIndex(x => x.vesselName === v.vesselName) === i)
            return uniqueVessels.length > 0 ? (
              <div style={{ position: 'absolute', zIndex: 200, top: 'calc(100% + 2px)', left: 0, right: 0, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 6, boxShadow: '0 4px 16px rgba(0,0,0,0.14)', maxHeight: 180, overflowY: 'auto' as const }}>
                {uniqueVessels.map(v => (
                  <div key={v.vesselName}
                    onMouseDown={() => { vesselPickedRef.current = true; setFormVessel(v.vesselName); setVesselDropOpen(false) }}
                    style={{ padding: '7px 10px', cursor: 'pointer', fontSize: 12, borderBottom: '1px solid var(--border)' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(8,145,178,0.08)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <strong>{v.vesselName}</strong>
                    <span style={{ color: 'var(--text-muted)', marginLeft: 8, fontSize: 11 }}>{v.shippingLine}</span>
                  </div>
                ))}
              </div>
            ) : null
          })()}
        </div>

        {/* Voyage combobox — selecting a voyage auto-fills all vessel fields */}
        <div style={{ position: 'relative' }}>
          <label className="lt-label">Voyage</label>
          <input className="lt-input" style={{ width: '100%' }}
            value={formVoyage}
            onChange={e => { setFormVoyage(e.target.value); setVoyageDropOpen(true) }}
            onFocus={() => setVoyageDropOpen(true)}
            onBlur={() => setTimeout(() => {
              setVoyageDropOpen(false)
              if (voyagePickedRef.current) { voyagePickedRef.current = false; return }
              const v = formVoyage.trim()
              if (v && !MOCK_OPEN_VOYAGES.some(o => o.voyageNumber.toLowerCase() === v.toLowerCase()))
                setUnknownVoyageWarning({ field: 'voyage', value: v })
            }, 150)}
            placeholder="Search voyage number…" />
          {voyageDropOpen && (() => {
            const q = formVoyage.toLowerCase()
            const vesselQ = formVessel.trim().toLowerCase()
            const matches = MOCK_OPEN_VOYAGES.filter(v =>
              (v.voyageNumber.toLowerCase().includes(q) || v.vesselName.toLowerCase().includes(q)) &&
              (!vesselQ || v.vesselName.toLowerCase().includes(vesselQ))
            )
            return matches.length > 0 ? (
              <div style={{ position: 'absolute', zIndex: 200, top: 'calc(100% + 2px)', left: 0, right: 0, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 6, boxShadow: '0 4px 16px rgba(0,0,0,0.14)', maxHeight: 220, overflowY: 'auto' as const }}>
                {matches.map(v => (
                  <div key={v.id}
                    onMouseDown={() => {
                      voyagePickedRef.current = true
                      setFormVessel(v.vesselName)
                      setFormVoyage(v.voyageNumber)
                      setVesselPol(v.pol)
                      setVesselFinalPod(v.fpod)
                      setVesselEtdPol(v.etdPol)
                      setVesselEtaFpod(v.etaFpod)
                      setVoyageDropOpen(false)
                    }}
                    style={{ padding: '7px 10px', cursor: 'pointer', borderBottom: '1px solid var(--border)' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(8,145,178,0.08)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <div style={{ fontSize: 12 }}><strong>{v.voyageNumber}</strong> <span style={{ color: 'var(--text-muted)', marginLeft: 6, fontSize: 11 }}>{v.vesselName} · {v.shippingLine}</span></div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{v.pol} → {v.fpod} &nbsp;·&nbsp; ETD {v.etdPol} &nbsp;·&nbsp; ETA {v.etaFpod}</div>
                  </div>
                ))}
              </div>
            ) : null
          })()}
        </div>
        <div><label className="lt-label">Port of Loading</label><input className="lt-input" style={{ width: '100%', background: 'rgba(0,0,0,0.03)' }} value={vesselPol} readOnly /></div>
        <div><label className="lt-label">Port of Discharge</label><input className="lt-input" style={{ width: '100%', background: 'rgba(0,0,0,0.03)' }} value={vesselFinalPod} readOnly /></div>
        <div><label className="lt-label">ETD POL</label><input className="lt-input" style={{ width: '100%', background: 'rgba(0,0,0,0.03)' }} value={vesselEtdPol} readOnly /></div>
        <div><label className="lt-label">ETA FPOD</label><input className="lt-input" style={{ width: '100%', background: 'rgba(0,0,0,0.03)' }} value={vesselEtaFpod} readOnly /></div>
        {formInput('SOB Date', 'sob_date', { type: 'date' })}
        <div><label className="lt-label">Routing Type</label><input className="lt-input" style={{ width: '100%', background: 'rgba(0,0,0,0.03)' }} value={vesselRoutingType} readOnly /></div>
      </div>

      {sectionHeader('Business Details')}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
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
      </div>

      {sectionHeader('Shipping Details')}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
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
      </div>

      {sectionHeader('Cargo & Container')}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
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
      </div>

      <div style={{ padding: '8px 12px', background: 'rgba(217,119,6,0.06)', border: '1px solid rgba(217,119,6,0.15)', borderRadius: 8, fontSize: 12 }}>
        <strong>Container:</strong> {bkgField('container_count')}x {bkgField('container_size')}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {formSelect('Delivery Type', 'delivery_type_bkg', ['CFS/DOOR', 'DOOR/CFS', 'DOOR/DOOR', 'DOOR/CY', 'CY/DOOR', 'CY/CY', 'CY/CFS', 'CY/RR', 'CFS/CY', 'CFS/CFS', 'DOOR/PORT', 'PORT/DOOR', 'PORT/PORT', 'TILLING TITE', 'CHECK'])}
        {formInput('Incoterm', 'incoterm', { placeholder: 'e.g. FOB, CIF, EXW, DDP' })}
        {formInput('Pickup Type', 'pickup_type')}
        {formInput('Inland Haulage Type', 'inland_haulage_type')}
      </div>

      {sectionHeader('B/L Details')}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
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
      </div>

      {sectionHeader('Remarks')}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 10 }}>
        {formTextarea('Marks and Numbers', 'marks_and_numbers', 'Marks, numbers, container numbers...')}
        {formTextarea('Description of Goods', 'description_of_goods', 'Goods description for B/L...')}
        {formTextarea('B/L Instructions', 'bl_instructions', 'Special B/L instructions...')}
        {formTextarea('Remarks (Customer)', 'remarks_customer', 'Customer-facing remarks...')}
        {formTextarea('Remarks (Internal)', 'remarks_internal', 'Internal notes...')}
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 4 }}>
        <button className="db-btn primary"
          style={{ background: '#0891b2', borderColor: '#0891b2' }}
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
        </button>
      </div>
    </div>
  )
})() : selectedItem.actionKind === 'create-hbl' && actionModal ? (() => {
  const chblBkg = actionModal.sourceData.booking as Booking
  // Helper: input field
  const hInput = (label: string, key: string, opts?: { placeholder?: string; readOnly?: boolean; span2?: boolean; type?: string }) => (
    <div style={opts?.span2 ? { gridColumn: '1 / -1' } : {}}>
      <label className="lt-label">{label}</label>
      <input className="lt-input" style={{ width: '100%', ...(opts?.readOnly ? { background: 'rgba(0,0,0,0.03)' } : {}) }}
        type={opts?.type || 'text'}
        value={hblField(key)}
        onChange={e => setHblField(key, e.target.value)}
        placeholder={opts?.placeholder || ''} readOnly={opts?.readOnly} />
    </div>
  )
  const hTextarea = (label: string, key: string, rows: number, placeholder?: string) => (
    <div style={{ gridColumn: '1 / -1' }}>
      <label className="lt-label">{label}</label>
      <textarea className="lt-input" rows={rows} style={{ width: '100%', resize: 'vertical' as const, fontSize: 12 }}
        value={hblField(key)}
        onChange={e => setHblField(key, e.target.value)}
        placeholder={placeholder || ''} />
    </div>
  )
  const hSelect = (label: string, key: string, options: string[]) => (
    <div>
      <label className="lt-label">{label}</label>
      <select className="lt-input" style={{ width: '100%' }}
        value={hblField(key)}
        onChange={e => setHblField(key, e.target.value)}>
        {options.map(o => <option key={o} value={o}>{o || '—'}</option>)}
      </select>
    </div>
  )
  const hCheck = (label: string, key: string) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <input type="checkbox" checked={hblField(key) === '1'}
        onChange={e => setHblField(key, e.target.checked ? '1' : '0')} />
      <label className="lt-label" style={{ margin: 0 }}>{label}</label>
    </div>
  )
  const hSection = (sectionId: string, title: string, hint?: string) => (
    <div onClick={() => toggleHblSection(sectionId)} style={{
      padding: '8px 12px', background: 'rgba(217,119,6,0.08)',
      borderLeft: '3px solid #d97706', borderRadius: '0 6px 6px 0',
      fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const,
      letterSpacing: '0.05em', color: '#d97706', marginTop: 4,
      cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    }}>
      <span>{title}{hint ? <span style={{ fontWeight: 400, textTransform: 'none' as const, marginLeft: 8, fontSize: 11, color: '#64748b' }}>{hint}</span> : null}</span>
      <span style={{ fontSize: 14, lineHeight: 1 }}>{hblCollapsed[sectionId] ? '+' : '−'}</span>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Header banner */}
      <div style={{ padding: '8px 14px', background: '#d97706', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: '#fff', letterSpacing: 0.5 }}>HOUSE BILL OF LADING</span>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)' }}>{chblBkg.customer_name} · {chblBkg.origin} → {chblBkg.destination}</span>
      </div>

      {/* Booking summary strip */}
      <div style={{ padding: '10px 14px', background: 'rgba(217,119,6,0.06)', border: '1px solid rgba(217,119,6,0.15)', borderRadius: 8, fontSize: 12 }}>
        <strong>{chblBkg.customer_name}</strong> — {chblBkg.origin} → {chblBkg.destination}
        <div style={{ color: 'var(--text-muted)', marginTop: 2 }}>
          {chblBkg.quantity}x {chblBkg.container_type} · {chblBkg.shipping_line || 'No liner'} · Job Ref: {chblBkg.job_reference_number || 'N/A'}
        </div>
      </div>

      {/* Section 1: Job & Header Information */}
      {hSection('hbl-jobheader', 'Job & Header Information', 'Voyage & schedule details')}
      {!hblCollapsed['hbl-jobheader'] && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, padding: '8px 0' }}>
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
        </div>
      )}

      {/* Section 2: B/L Details */}
      {hSection('hbl-bl', 'B/L Details', 'Identifiers')}
      {!hblCollapsed['hbl-bl'] && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, padding: '8px 0' }}>
          {hSelect('Branch', 'branch', ['COLOMBO', 'GALLE', 'HAMBANTOTA'])}
          {hInput('Booking No.', 'bookingNo', { readOnly: true })}
          {hSelect('Shipment Category', 'shipmentCategory', ['LOCAL EXPORT', 'RE-EXPORT', 'TRANSHIPMENT', 'CROSS TRADE'])}
          {hSelect('B/L Type', 'blType', ['OWN', 'THROUGH', 'CARRIER BL', 'RMAT', 'SWITCH BL', 'AGENT BL'])}
          {hInput('Sub Job / House BL #', 'houseBlNo', { placeholder: 'System-generated' })}
          {hInput('Custom BL #', 'customBlNo')}
          {hInput('STT #', 'sttNo', { placeholder: 'Transhipment only' })}
          {hInput('HS Code', 'hsCode', { placeholder: 'e.g. 2009.89' })}
        </div>
      )}

      {/* Section 3: Shipper / Consignee / Notify */}
      {hSection('hbl-parties', 'Shipper, Consignee & Notify', 'Shipper, consignee, notify party')}
      {!hblCollapsed['hbl-parties'] && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, padding: '8px 0' }}>
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
        </div>
      )}

      {/* Section 4: Operational & Customer Metadata */}
      {hSection('hbl-operational', 'Operational & Customer Metadata')}
      {!hblCollapsed['hbl-operational'] && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, padding: '8px 0' }}>
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
        </div>
      )}

      {/* Section 5: Containers & Package Details */}
      {hSection('hbl-containers', 'Containers & Package Details', `${hblContainers.length} row(s)`)}
      {!hblCollapsed['hbl-containers'] && (
        <div style={{ padding: '8px 0' }}>
          {/* Container rows table */}
          <div style={{ overflowX: 'auto', marginBottom: 12 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
              <thead>
                <tr style={{ background: 'rgba(217,119,6,0.06)' }}>
                  {['Container #', 'Size', 'Type', 'SHP Type', 'Seal No', 'Pkgs', 'Pkg Type', 'G/W', 'CBM', ''].map(h => (
                    <th key={h} style={{ padding: '6px 4px', textAlign: 'left', fontWeight: 600, borderBottom: '1px solid var(--border)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {hblContainers.map((row, idx) => (
                  <tr key={idx}>
                    <td style={{ padding: '3px 2px' }}><input className="lt-input" style={{ width: 100 }} value={row.containerNo} onChange={e => { const u = [...hblContainers]; u[idx] = { ...u[idx], containerNo: e.target.value }; setHblContainers(u) }} /></td>
                    <td style={{ padding: '3px 2px' }}><input className="lt-input" style={{ width: 40 }} value={row.size} onChange={e => { const u = [...hblContainers]; u[idx] = { ...u[idx], size: e.target.value }; setHblContainers(u) }} /></td>
                    <td style={{ padding: '3px 2px' }}><input className="lt-input" style={{ width: 50 }} value={row.type} onChange={e => { const u = [...hblContainers]; u[idx] = { ...u[idx], type: e.target.value }; setHblContainers(u) }} /></td>
                    <td style={{ padding: '3px 2px' }}><input className="lt-input" style={{ width: 60 }} value={row.shipmentType} onChange={e => { const u = [...hblContainers]; u[idx] = { ...u[idx], shipmentType: e.target.value }; setHblContainers(u) }} /></td>
                    <td style={{ padding: '3px 2px' }}><input className="lt-input" style={{ width: 70 }} value={row.sealNo} onChange={e => { const u = [...hblContainers]; u[idx] = { ...u[idx], sealNo: e.target.value }; setHblContainers(u) }} /></td>
                    <td style={{ padding: '3px 2px' }}><input className="lt-input" style={{ width: 40 }} type="number" value={row.packages} onChange={e => { const u = [...hblContainers]; u[idx] = { ...u[idx], packages: e.target.value }; setHblContainers(u) }} /></td>
                    <td style={{ padding: '3px 2px' }}><input className="lt-input" style={{ width: 60 }} value={row.packageType} onChange={e => { const u = [...hblContainers]; u[idx] = { ...u[idx], packageType: e.target.value }; setHblContainers(u) }} /></td>
                    <td style={{ padding: '3px 2px' }}><input className="lt-input" style={{ width: 55 }} type="number" value={row.grossWeight} onChange={e => { const u = [...hblContainers]; u[idx] = { ...u[idx], grossWeight: e.target.value }; setHblContainers(u) }} /></td>
                    <td style={{ padding: '3px 2px' }}><input className="lt-input" style={{ width: 50 }} type="number" value={row.cbm} onChange={e => { const u = [...hblContainers]; u[idx] = { ...u[idx], cbm: e.target.value }; setHblContainers(u) }} /></td>
                    <td style={{ padding: '3px 2px' }}>
                      {hblContainers.length > 1 && <button className="lt-icon-btn" onClick={() => setHblContainers(hblContainers.filter((_, i) => i !== idx))} title="Remove">×</button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button className="db-btn" style={{ marginTop: 4, fontSize: 11, padding: '4px 10px' }}
              onClick={() => setHblContainers([...hblContainers, { containerNo: '', size: '20', type: 'GP', shipmentType: 'FCL/FCL', sealNo: '', packages: '', packageType: '', grossWeight: '', cbm: '' }])}>
              + Add Container
            </button>
          </div>

          {/* Package summary */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
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
        </div>
      )}

      {/* Section 6: Goods Description & Routing */}
      {hSection('hbl-goods', 'Goods Description & Routing')}
      {!hblCollapsed['hbl-goods'] && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, padding: '8px 0' }}>
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
        </div>
      )}

      {/* Section 7: Freight & Financials */}
      {hSection('hbl-freight', 'Freight & Financials')}
      {!hblCollapsed['hbl-freight'] && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, padding: '8px 0' }}>
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
        </div>
      )}

      {/* Section 8: POD Agent, B/L Terms & Manifest */}
      {hSection('hbl-terms', 'POD Agent, B/L Terms & Manifest')}
      {!hblCollapsed['hbl-terms'] && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, padding: '8px 0' }}>
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
        </div>
      )}

      {/* Manifest Charges Table */}
      {hSection('hbl-manifest', 'Manifest Charges', 'Freight charges breakdown')}
      {!hblCollapsed['hbl-manifest'] && (
        <div style={{ padding: '8px 0', fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic' }}>
          Manifest charges will be managed via the Gensoft integration. Enter charges in Gensoft after saving the HBL.
        </div>
      )}

      {/* Notes */}
      <div>
        <label className="lt-label">Notes (optional)</label>
        <input className="lt-input" style={{ width: '100%' }} value={formNote}
          onChange={e => setFormNote(e.target.value)} placeholder="Internal notes..." />
      </div>
    </div>
  )
})() : selectedItem.actionKind === 'create-bl' && actionModal ? (() => {
  // Helper: input field
  const cbInput = (form: 'mbl' | 'hbl', label: string, key: string, opts?: { placeholder?: string; readOnly?: boolean; span2?: boolean; type?: string }) => (
    <div style={opts?.span2 ? { gridColumn: '1 / -1' } : {}}>
      <label className="lt-label">{label}</label>
      <input className="lt-input" style={{ width: '100%', ...(opts?.readOnly ? { background: 'rgba(0,0,0,0.03)' } : {}) }}
        type={opts?.type || 'text'}
        value={form === 'mbl' ? mblField(key) : hblField(key)}
        onChange={e => form === 'mbl' ? setMblField(key, e.target.value) : setHblField(key, e.target.value)}
        placeholder={opts?.placeholder || ''} readOnly={opts?.readOnly} />
    </div>
  )
  // Helper: textarea field
  const cbTextarea = (form: 'mbl' | 'hbl', label: string, key: string, rows: number, placeholder?: string) => (
    <div style={{ gridColumn: '1 / -1' }}>
      <label className="lt-label">{label}</label>
      <textarea className="lt-input" rows={rows} style={{ width: '100%', resize: 'vertical' as const, fontSize: 12 }}
        value={form === 'mbl' ? mblField(key) : hblField(key)}
        onChange={e => form === 'mbl' ? setMblField(key, e.target.value) : setHblField(key, e.target.value)}
        placeholder={placeholder || ''} />
    </div>
  )
  // Helper: select field
  const cbSelect = (form: 'mbl' | 'hbl', label: string, key: string, options: string[]) => (
    <div>
      <label className="lt-label">{label}</label>
      <select className="lt-input" style={{ width: '100%' }}
        value={form === 'mbl' ? mblField(key) : hblField(key)}
        onChange={e => form === 'mbl' ? setMblField(key, e.target.value) : setHblField(key, e.target.value)}>
        {options.map(o => <option key={o} value={o}>{o || '—'}</option>)}
      </select>
    </div>
  )
  // Helper: accordion section header
  const cbSection = (sectionId: string, title: string, hint?: string) => (
    <div onClick={() => toggleHblSection(sectionId)} style={{
      padding: '8px 12px', background: 'rgba(8,145,178,0.08)',
      borderLeft: '3px solid #0891b2', borderRadius: '0 6px 6px 0',
      fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const,
      letterSpacing: '0.05em', color: '#0891b2', marginTop: 4,
      cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    }}>
      <span>{title}{hint ? <span style={{ fontWeight: 400, textTransform: 'none' as const, marginLeft: 8, fontSize: 11, color: '#64748b' }}>{hint}</span> : null}</span>
      <span style={{ fontSize: 14, lineHeight: 1 }}>{hblCollapsed[sectionId] ? '+' : '−'}</span>
    </div>
  )

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Header banner */}
      <div style={{ padding: '8px 14px', background: '#0d9488', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: '#fff', letterSpacing: 0.5 }}>MASTER BILL OF LADING</span>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)' }}>{mblSelectedHblIds.length} HBL(s) selected</span>
      </div>

      {/* HBL Search & Select Panel */}
      <div style={{ border: '1px solid rgba(13,148,136,0.25)', borderRadius: 8, overflow: 'hidden' }}>
        <div style={{ padding: '8px 12px', background: 'rgba(13,148,136,0.06)', borderBottom: '1px solid rgba(13,148,136,0.15)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Search size={14} style={{ color: '#0d9488', flexShrink: 0 }} />
          <input className="lt-input" style={{ width: '100%', border: 'none', background: 'transparent', fontSize: 12, padding: '4px 0' }}
            value={mblHblSearch} onChange={e => setMblHblSearch(e.target.value)}
            placeholder="Search HBLs by customer, BL number, booking ID, origin, destination..." />
          {mblHblSearch && (
            <button type="button" onClick={() => setMblHblSearch('')}
              style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: 14, padding: 0, lineHeight: 1 }}>×</button>
          )}
        </div>
        <div style={{ maxHeight: 200, overflowY: 'auto' as const }}>
          {filteredHblBookings.length === 0 ? (
            <div style={{ padding: '16px 12px', fontSize: 11, color: 'var(--text-muted)', textAlign: 'center' as const }}>
              {mblHblSearch ? 'No HBLs match your search.' : 'No HBLs available for MBL assignment.'}
            </div>
          ) : filteredHblBookings.map(hb => {
            const isSelected = mblSelectedHblIds.includes(hb.id)
            return (
              <div key={hb.id} onClick={() => toggleHblSelection(hb.id)} style={{
                padding: '8px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10,
                borderBottom: '1px solid var(--border)',
                background: isSelected ? 'rgba(13,148,136,0.08)' : 'transparent',
              }}>
                <div style={{
                  width: 16, height: 16, borderRadius: 3, border: isSelected ? '2px solid #0d9488' : '2px solid #cbd5e1',
                  background: isSelected ? '#0d9488' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  {isSelected && <Check size={10} style={{ color: '#fff' }} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: isSelected ? '#0d9488' : 'var(--text)' }}>
                    {hb.house_bl_number || hb.id} — {hb.customer_name}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>
                    {hb.origin} → {hb.destination} · {hb.quantity}x {hb.container_type} · {hb.shipping_line || 'No liner'}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
        {selectedHblBookings.length > 0 && (
          <div style={{ padding: '6px 12px', background: 'rgba(13,148,136,0.04)', borderTop: '1px solid rgba(13,148,136,0.15)', fontSize: 11, color: '#0d9488', fontWeight: 600 }}>
            Selected: {selectedHblBookings.map(b => b.house_bl_number || b.id).join(', ')}
          </div>
        )}
      </div>

      {/* ===== MBL FORM — 3 Sections ===== */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>

          {/* Section 1: Job Header & Routing Information */}
          {cbSection('mbl-jobheader', 'Job Header & Routing', 'Job, vessel & routing details')}
          {!hblCollapsed['mbl-jobheader'] && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, padding: '8px 0' }}>
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

          {/* Section 2: B/L Table (auto-populated from selected HBLs) */}
          {cbSection('mbl-bltable', 'B/L Table', `${selectedHblBookings.length} HBL(s)`)}
          {!hblCollapsed['mbl-bltable'] && (
            <div style={{ padding: '8px 0' }}>
              {selectedHblBookings.length === 0 ? (
                <div style={{ padding: '16px 12px', fontSize: 11, color: 'var(--text-muted)', textAlign: 'center' as const, background: 'rgba(0,0,0,0.02)', borderRadius: 6, border: '1px dashed var(--border)' }}>
                  Select one or more HBLs above to populate this table.
                </div>
              ) : (
                <div style={{ overflowX: 'auto' as const }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '100px 120px 90px 80px 70px 70px 70px 60px 1fr', gap: 4, fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4, paddingLeft: 2, minWidth: 700 }}>
                    <span>BL No.</span><span>Shipper</span><span>Final Dest</span><span>Cargo Type</span><span>No. of Pkgs</span><span>Pkg Type</span><span>GW (kg)</span><span>CBM</span><span>Container / Seal</span>
                  </div>
                  {selectedHblBookings.map((hb) => (
                    <div key={hb.id} style={{ display: 'grid', gridTemplateColumns: '100px 120px 90px 80px 70px 70px 70px 60px 1fr', gap: 4, marginBottom: 3, minWidth: 700, fontSize: 11 }}>
                      <div className="lt-input" style={{ width: '100%', padding: '3px 4px', background: 'rgba(0,0,0,0.03)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }} title={hb.house_bl_number || hb.id}>
                        {hb.house_bl_number || hb.id}
                      </div>
                      <div className="lt-input" style={{ width: '100%', padding: '3px 4px', background: 'rgba(0,0,0,0.03)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }} title={hb.house_bl_shipper || hb.customer_name}>
                        {hb.house_bl_shipper || hb.customer_name}
                      </div>
                      <div className="lt-input" style={{ width: '100%', padding: '3px 4px', background: 'rgba(0,0,0,0.03)' }}>{hb.destination}</div>
                      <div className="lt-input" style={{ width: '100%', padding: '3px 4px', background: 'rgba(0,0,0,0.03)' }}>General</div>
                      <div className="lt-input" style={{ width: '100%', padding: '3px 4px', background: 'rgba(0,0,0,0.03)' }}>{hb.quantity || 1}</div>
                      <div className="lt-input" style={{ width: '100%', padding: '3px 4px', background: 'rgba(0,0,0,0.03)' }}>{hb.container_type}</div>
                      <div className="lt-input" style={{ width: '100%', padding: '3px 4px', background: 'rgba(0,0,0,0.03)' }}>—</div>
                      <div className="lt-input" style={{ width: '100%', padding: '3px 4px', background: 'rgba(0,0,0,0.03)' }}>—</div>
                      <div className="lt-input" style={{ width: '100%', padding: '3px 4px', background: 'rgba(0,0,0,0.03)' }}>—</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Section 3: Carrier B/L Instructions */}
          {cbSection('mbl-carrierins', 'Carrier B/L Instructions', 'Carrier draft details')}
          {!hblCollapsed['mbl-carrierins'] && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, padding: '8px 0' }}>
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
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, gridColumn: '1 / -1' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: 'pointer' }}>
                  <input type="checkbox" checked={mblField('displayOnCarrierDraft') === 'true'}
                    onChange={e => setMblField('displayOnCarrierDraft', e.target.checked ? 'true' : '')} />
                  Display on Carrier Draft
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: 'pointer', marginLeft: 16 }}>
                  <input type="checkbox" checked={mblField('displayContainerNumbers') === 'true'}
                    onChange={e => setMblField('displayContainerNumbers', e.target.checked ? 'true' : '')} />
                  Display Container Numbers
                </label>
              </div>
            </div>
          )}
        </div>

      {/* Notes */}
      <div>
        <label className="lt-label">Notes (optional)</label>
        <input className="lt-input" style={{ width: '100%' }} value={formNote}
          onChange={e => setFormNote(e.target.value)} placeholder="Internal notes..." />
      </div>

      {/* Submit (this step renders inline only, so it needs its own button) */}
      {(() => {
        const blDisabled = !mblField('shipperName').trim() || !mblField('consigneeName').trim()
        return (
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button className="db-btn primary" onClick={handleModalSubmit} disabled={blDisabled}
              style={blDisabled ? { opacity: 0.4, cursor: 'not-allowed' } : { background: '#0d9488', borderColor: '#0d9488' }}>
              <FileText size={12} /> Record Master BL
            </button>
          </div>
        )
      })()}
    </div>
  )
})() : (selectedItem.actionKind === 'booking-request' || selectedItem.actionKind === 'review-booking-request') && actionModal ? (() => {
  const isCS = selectedItem.actionKind === 'booking-request'
  const isReefer = bkContainers.some(c => c.type.includes('RF'))
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {/* Form header */}
      <div style={{ padding: '8px 14px', background: 'var(--accent)', borderRadius: '8px 8px 0 0', marginBottom: 1 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: '#fff', letterSpacing: 0.5 }}>BOOKING FORMAT REQUEST</span>
        {!isCS && <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', marginLeft: 10 }}>Submitted by CS — review and add RA number</span>}
      </div>
      {/* Fields table */}
      <div style={{ border: '1px solid var(--border)', borderRadius: '0 0 8px 8px', overflow: 'hidden' }}>
        {/* Carrier */}
        <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', borderBottom: '1px solid var(--border)' }}>
          <div style={{ padding: '8px 12px', background: 'var(--bg-card)', borderRight: '1px solid var(--border)', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}>Carrier<span style={{ color: '#ef4444', marginLeft: 2 }}>*</span></div>
          <div style={{ padding: '4px 8px' }}>
            {actionModal?.sourceData?.acceptedQuotation?.lin_id && bkShippingLine ? (
              <span style={{ display: 'block', padding: '4px 0', fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{bkShippingLine}</span>
            ) : (
              <select className="lt-input" style={{ width: '100%', border: 'none', background: 'transparent', padding: '4px 0' }}
                value={bkShippingLine} onChange={e => setBkShippingLine(e.target.value)}>
                <option value="">— Select carrier —</option>
                {linerList.map(l => <option key={l.lin_id} value={l.name}>{linerDisplay(l)}</option>)}
              </select>
            )}
          </div>
        </div>
        {/* Containers (dynamic list) */}
        <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', borderBottom: '1px solid var(--border)' }}>
          <div style={{ padding: '8px 12px', background: 'var(--bg-card)', borderRight: '1px solid var(--border)', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'flex-start', paddingTop: 10 }}>
            Containers<span style={{ color: '#ef4444', marginLeft: 2 }}>*</span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 4 }}>({bkContainers.reduce((s, c) => s + c.qty, 0)})</span>
          </div>
          <div style={{ padding: '4px 8px', display: 'flex', flexDirection: 'column', gap: 4 }}>
            {bkContainers.map((ctn, ci) => (
              <div key={ci} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <input className="lt-input" style={{ width: 48, border: '1px solid var(--border)', borderRadius: 4, background: 'transparent', padding: '3px 4px', textAlign: 'center' }}
                  type="number" min={1} value={ctn.qty}
                  onChange={e => setBkContainers((prev: {type: string; qty: number}[]) => prev.map((c: {type: string; qty: number}, i: number) => i === ci ? { ...c, qty: Math.max(1, parseInt(e.target.value) || 1) } : c))} />
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>×</span>
                <select className="lt-input" style={{ flex: 1, border: '1px solid var(--border)', borderRadius: 4, background: 'transparent', padding: '3px 4px', fontSize: 12 }}
                  value={ctn.type} onChange={e => setBkContainers((prev: {type: string; qty: number}[]) => prev.map((c: {type: string; qty: number}, i: number) => i === ci ? { ...c, type: e.target.value } : c))}>
                  <option value="20'GP">20' GP</option><option value="40'GP">40' GP</option>
                  <option value="40'HC">40' HC</option><option value="20'RF">20' RF (Reefer)</option>
                  <option value="40'RF">40' RF (Reefer)</option><option value="20'OT">20' OT (Open Top)</option>
                  <option value="40'OT">40' OT (Open Top)</option><option value="20'FR">20' FR (Flat Rack)</option>
                  <option value="40'FR">40' FR (Flat Rack)</option>
                </select>
                {bkContainers.length > 1 && (
                  <button type="button" onClick={() => setBkContainers((prev: {type: string; qty: number}[]) => prev.filter((_: {type: string; qty: number}, i: number) => i !== ci))}
                    style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#ef4444', fontSize: 14, padding: '0 2px', lineHeight: 1 }}
                    title="Remove">×</button>
                )}
              </div>
            ))}
            <button type="button" onClick={() => setBkContainers((prev: {type: string; qty: number}[]) => [...prev, { type: "20'GP", qty: 1 }])}
              style={{ border: '1px dashed var(--border)', borderRadius: 4, background: 'transparent', cursor: 'pointer', padding: '3px 8px', fontSize: 11, color: 'var(--accent)', fontWeight: 600, alignSelf: 'flex-start', marginTop: 2 }}>
              + Add Container
            </button>
          </div>
        </div>
        {/* Commodity */}
        <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', borderBottom: '1px solid var(--border)' }}>
          <div style={{ padding: '8px 12px', background: 'var(--bg-card)', borderRight: '1px solid var(--border)', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}>Commodity</div>
          <div style={{ padding: '4px 8px' }}>
            <input className="lt-input" style={{ width: '100%', border: 'none', background: 'transparent', padding: '4px 0' }}
              value={bkCommodity} onChange={e => setBkCommodity(e.target.value)} placeholder="e.g. Coconut Milk, Garments" />
          </div>
        </div>
        {/* Cargo Ready Date */}
        <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', borderBottom: '1px solid var(--border)' }}>
          <div style={{ padding: '8px 12px', background: 'var(--bg-card)', borderRight: '1px solid var(--border)', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}>Cargo Ready Date<span style={{ color: '#ef4444', marginLeft: 2 }}>*</span></div>
          <div style={{ padding: '4px 8px' }}>
            <input className="lt-input" type="date" style={{ width: '100%', border: 'none', background: 'transparent', padding: '4px 0' }}
              value={bkCargoReadyDate} onChange={e => setBkCargoReadyDate(e.target.value)} />
          </div>
        </div>
        {/* Vessel + Vessel ETD */}
        <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr 90px 1fr', borderBottom: '1px solid var(--border)' }}>
          <div style={{ padding: '8px 12px', background: 'var(--bg-card)', borderRight: '1px solid var(--border)', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}>Vessel<span style={{ color: '#ef4444', marginLeft: 2 }}>*</span></div>
          <div style={{ padding: '4px 8px', borderRight: '1px solid var(--border)' }}>
            <input className="lt-input" style={{ width: '100%', border: 'none', background: 'transparent', padding: '4px 0' }}
              value={bkVessel} onChange={e => setBkVessel(e.target.value)} placeholder="e.g. MSC Asya" />
          </div>
          <div style={{ padding: '8px 8px', background: 'var(--bg-card)', borderRight: '1px solid var(--border)', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}>ETD<span style={{ color: '#ef4444', marginLeft: 2 }}>*</span></div>
          <div style={{ padding: '4px 8px' }}>
            <input className="lt-input" type="date" style={{ width: '100%', border: 'none', background: 'transparent', padding: '4px 0' }}
              value={bkVesselEtd} onChange={e => setBkVesselEtd(e.target.value)} />
          </div>
        </div>
        {/* Voyage */}
        <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', borderBottom: '1px solid var(--border)' }}>
          <div style={{ padding: '8px 12px', background: 'var(--bg-card)', borderRight: '1px solid var(--border)', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}>Voyage<span style={{ color: '#ef4444', marginLeft: 2 }}>*</span></div>
          <div style={{ padding: '4px 8px' }}>
            <input className="lt-input" style={{ width: '100%', border: 'none', background: 'transparent', padding: '4px 0' }}
              value={bkVoyage} onChange={e => setBkVoyage(e.target.value)} placeholder="e.g. MA622R" />
          </div>
        </div>
        {/* POD */}
        <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', borderBottom: '1px solid var(--border)' }}>
          <div style={{ padding: '8px 12px', background: 'var(--bg-card)', borderRight: '1px solid var(--border)', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}>POD</div>
          <div style={{ padding: '4px 8px' }}>
            <input className="lt-input" style={{ width: '100%', border: 'none', background: 'transparent', padding: '4px 0' }}
              value={bkPod} onChange={e => setBkPod(e.target.value)} placeholder="Port of Discharge" />
          </div>
        </div>
        {/* Customer */}
        <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', borderBottom: '1px solid var(--border)' }}>
          <div style={{ padding: '8px 12px', background: 'var(--bg-card)', borderRight: '1px solid var(--border)', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}>Customer</div>
          <div style={{ padding: '8px 10px', fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{selectedItem.customerName}</div>
        </div>
        {/* Agreed Rate + Rate Remark */}
        <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr 100px 1fr', borderBottom: '1px solid var(--border)' }}>
          <div style={{ padding: '8px 12px', background: 'var(--bg-card)', borderRight: '1px solid var(--border)', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}>Agreed Rate<span style={{ color: '#ef4444', marginLeft: 2 }}>*</span></div>
          <div style={{ padding: '4px 8px', borderRight: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>$</span>
            <input className="lt-input" type="number" min={0} step="any" style={{ width: '100%', border: 'none', background: 'transparent', padding: '4px 0' }}
              value={bkAgreedRate} onChange={e => { const v = e.target.value; if (v === '' || /^\d*\.?\d*$/.test(v)) setBkAgreedRate(v) }} placeholder="e.g. 1200" />
          </div>
          <div style={{ padding: '8px 8px', background: 'var(--bg-card)', borderRight: '1px solid var(--border)', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}>Rate Remark</div>
          <div style={{ padding: '4px 8px' }}>
            <input className="lt-input" style={{ width: '100%', border: 'none', background: 'transparent', padding: '4px 0' }}
              value={bkRateRemark} onChange={e => setBkRateRemark(e.target.value)} placeholder="e.g. As per contract, TBD" />
          </div>
        </div>
        {/* Delivery Term */}
        <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', borderBottom: '1px solid var(--border)' }}>
          <div style={{ padding: '8px 12px', background: 'var(--bg-card)', borderRight: '1px solid var(--border)', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}>Delivery Term<span style={{ color: '#ef4444', marginLeft: 2 }}>*</span></div>
          <div style={{ padding: '4px 8px' }}>
            <input className="lt-input" style={{ width: '100%', border: 'none', background: 'transparent', padding: '4px 0' }}
              value={bkDeliveryTerm} onChange={e => setBkDeliveryTerm(e.target.value)} placeholder="CY/CY" />
          </div>
        </div>
        {/* HS Code */}
        <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', borderBottom: '1px solid var(--border)' }}>
          <div style={{ padding: '8px 12px', background: 'var(--bg-card)', borderRight: '1px solid var(--border)', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}>HS Code<span style={{ color: '#ef4444', marginLeft: 2 }}>*</span></div>
          <div style={{ padding: '4px 8px' }}>
            <input className="lt-input" style={{ width: '100%', border: 'none', background: 'transparent', padding: '4px 0' }}
              value={bkHsCode} onChange={e => setBkHsCode(e.target.value)} placeholder="Harmonized System code" />
          </div>
        </div>
        {/* Special Instructions header */}
        <div style={{ padding: '7px 12px', background: 'rgba(44,44,130,0.12)', borderBottom: '1px solid var(--border)' }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', letterSpacing: 0.4 }}>SPECIAL INSTRUCTIONS</span>
        </div>
        {/* Contract No + RA No (mutually exclusive) */}
        <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr 90px 1fr', borderBottom: '1px solid var(--border)' }}>
          <div style={{ padding: '8px 12px', background: 'var(--bg-card)', borderRight: '1px solid var(--border)', fontSize: 11, fontWeight: 600, color: bkRaNumber ? 'var(--text-muted)' : 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}>Contract No</div>
          <div style={{ padding: '4px 8px', borderRight: '1px solid var(--border)', opacity: bkRaNumber ? 0.4 : 1 }}>
            <input className="lt-input" style={{ width: '100%', border: 'none', background: 'transparent', padding: '4px 0' }}
              value={bkContractNo} onChange={e => { setBkContractNo(e.target.value); if (e.target.value) setBkRaNumber('') }}
              disabled={!!bkRaNumber} placeholder={bkRaNumber ? 'N/A (RA No is set)' : 'e.g. 26-751GAC'} />
          </div>
          <div style={{ padding: '8px 8px', background: bkContractNo ? 'var(--bg-card)' : 'rgba(22,163,74,0.06)', borderRight: '1px solid var(--border)', fontSize: 11, fontWeight: 600, color: bkContractNo ? 'var(--text-muted)' : '#16a34a', display: 'flex', alignItems: 'center' }}>RA No</div>
          <div style={{ padding: '4px 8px', opacity: bkContractNo ? 0.4 : 1 }}>
            <input className="lt-input" style={{ width: '100%', border: 'none', background: 'transparent', padding: '4px 0', fontWeight: 600 }}
              value={bkRaNumber} onChange={e => { setBkRaNumber(e.target.value); if (e.target.value) setBkContractNo('') }}
              disabled={!!bkContractNo} placeholder={bkContractNo ? 'N/A (Contract is set)' : 'Liner booking ref'} />
          </div>
        </div>
        {bkContractNo && bkRaNumber && (
          <div style={{ padding: '6px 12px', background: '#fef2f2', color: '#dc2626', fontSize: 11, fontWeight: 600 }}>
            A customer cannot have both Contract No and RA No. Please clear one.
          </div>
        )}
        {/* Specific Routing */}
        <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', borderBottom: '1px solid var(--border)' }}>
          <div style={{ padding: '8px 12px', background: 'var(--bg-card)', borderRight: '1px solid var(--border)', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}>Specific Routing</div>
          <div style={{ padding: '4px 8px' }}>
            <input className="lt-input" style={{ width: '100%', border: 'none', background: 'transparent', padding: '4px 0' }}
              value={bkSpecificRouting} onChange={e => setBkSpecificRouting(e.target.value)} placeholder="e.g. via Singapore, avoid Suez" />
          </div>
        </div>
        {/* BL Type */}
        <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', borderBottom: '1px solid var(--border)' }}>
          <div style={{ padding: '8px 12px', background: 'var(--bg-card)', borderRight: '1px solid var(--border)', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}>BL Type<span style={{ color: '#ef4444', marginLeft: 2 }}>*</span></div>
          <div style={{ padding: '6px 10px', display: 'flex', gap: 16, alignItems: 'center' }}>
            {(['OBL', 'Seaway Bill'] as const).map(t => (
              <label key={t} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 12, color: 'var(--text-secondary)' }}>
                <input type="radio" name="rp-bk-bl-type" checked={bkBlType === t} onChange={() => setBkBlType(t)} />{t}
              </label>
            ))}
          </div>
        </div>
        {/* Booking Type */}
        <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', borderBottom: '1px solid var(--border)' }}>
          <div style={{ padding: '8px 12px', background: 'var(--bg-card)', borderRight: '1px solid var(--border)', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', lineHeight: 1.3 }}>If MKL/SAF<br /><span style={{ fontWeight: 400 }}>(Spot/FAK)</span></div>
          <div style={{ padding: '6px 10px', display: 'flex', gap: 16, alignItems: 'center' }}>
            {(['Spot', 'FAK'] as const).map(t => (
              <label key={t} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 12, color: 'var(--text-secondary)' }}>
                <input type="radio" name="rp-bk-booking-type" checked={bkBookingType === t} onChange={() => setBkBookingType(t)} />{t} Booking
              </label>
            ))}
          </div>
        </div>
        {/* Reefer Temp / PTI */}
        <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', borderBottom: '1px solid var(--border)' }}>
          <div style={{ padding: '8px 12px', background: isReefer ? 'rgba(14,165,233,0.08)' : 'var(--bg-card)', borderRight: '1px solid var(--border)', fontSize: 11, fontWeight: 600, color: isReefer ? '#0ea5e9' : 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>Reefer/PTI</div>
          <div style={{ padding: '4px 8px' }}>
            <input className="lt-input" style={{ width: '100%', border: 'none', background: 'transparent', padding: '4px 0' }}
              value={bkReeferTemp} onChange={e => setBkReeferTemp(e.target.value)}
              placeholder={isReefer ? 'e.g. -18°C, PTI required' : 'N/A'} />
          </div>
        </div>
        {/* Delivery Agent */}
        <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr' }}>
          <div style={{ padding: '8px 12px', background: 'var(--bg-card)', borderRight: '1px solid var(--border)', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}>Delivery Agent</div>
          <div style={{ padding: '4px 8px' }}>
            <input className="lt-input" style={{ width: '100%', border: 'none', background: 'transparent', padding: '4px 0' }}
              value={bkDeliveryAgent} onChange={e => setBkDeliveryAgent(e.target.value)} placeholder="Will advise / agent name" />
          </div>
        </div>
      </div>
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 20 }}>
            {bookingDisabled && (
              <div style={{ fontSize: 11, color: '#dc2626', padding: '0 2px' }}>
                Missing required fields: {missingFields.join(', ')}
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button className="db-btn primary" onClick={handleModalSubmit} disabled={bookingDisabled}
                style={bookingDisabled ? { opacity: 0.4, cursor: 'not-allowed' } : {}}>
                {isCS
                  ? <><Ship size={12} /> Create Booking &amp; Send to Procurement</>
                  : <><Ship size={12} /> Assign RA Number &amp; Move to Booking</>
                }
              </button>
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
