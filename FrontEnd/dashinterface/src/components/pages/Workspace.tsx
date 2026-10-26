import React, { useState, useMemo, useEffect, useRef } from 'react'
import { Inbox, User, ChevronDown, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import {
  EMPLOYEES, WORKFLOW_STAGES, ROLE_LABELS, ROLE_COLORS, stageRoleLabel,
  isSpotInquiry, daysUntil,
  type Inquiry, type Booking, type Quote, type Customer,
  type ActivityEntry, type WorkflowStage,
  type QuoteStatus, type KycStatus,
  type ContainerLine, type LinerRecord, type ClientRecord,
  type ReleaseOrderFields,
} from '../../types'
import { useRole } from '../../RoleContext'
import { apiGetLiners, apiFetchCompletedRateRequests, type KycPendingClient, type KycRequestRecord, type QuotationOptionRow } from '../../api'
import type { CompletedRateRequest } from '../../types'
import InlineStepForms from './workspaceSteps/InlineStepForms'
import ModalStepForms from './workspaceSteps/ModalStepForms'
import VesselCreatedPrompt from './workspaceSteps/VesselCreatedPrompt'
import { useWorkspaceActions } from './workspaceSteps/useWorkspaceActions'
import { generateReleaseOrderDraft } from './workspaceSteps/utils'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface WorkspaceProps {
  inquiries: Inquiry[]
  bookings: Booking[]
  quotes: Quote[]
  customers: Customer[]
  clientList: ClientRecord[]
  activityLog: ActivityEntry[]
  onGoTo: (page: import('../../types').PageId) => void
  onAdvanceWorkflow: (inquiryId: string, nextStage: WorkflowStage, skipApi?: boolean) => void
  onConfirmBooking: (bookingId: string, vesselName: string, voyageNumber: string) => void
  onMarkRaAssigned: (bookingId: string, raNumber: string, vessel: string, carrier: string) => void
  onRevertBookingRequest: (bookingId: string) => void
  onAttachReleaseOrder: (bookingId: string, fields: ReleaseOrderFields) => void
  onReleaseBooking: (bookingId: string, note: string) => void
  onAcknowledgeProcurement: (bookingId: string) => void
  onCreateBooking: (payload: {
    customer_name: string; quote_id: string; shipping_line: string;
    container_type: string; quantity: number; origin: string; destination: string;
    is_urgent: boolean; booked_by: number; notes: string; delivery_type?: 'port-to-port' | 'door-to-door';
    inq_id?: number; cli_id?: number; lin_id?: number; commodity_id?: number;
    vessel_etd?: string; agreed_rate?: number; delivery_term?: string;
    hs_code?: string; bl_type?: string; cargo_ready_date?: string;
    contract_no?: string; ra_number?: string; specific_routing?: string;
    booking_type?: string; reefer_temp?: string; delivery_agent?: string;
    vessel?: string; voyage?: string; rate_remark?: string;
  }) => string
  onSetBookingSiCutoff: (bookingId: string, date: string) => void
  onSetBookingBlCutoff: (bookingId: string, date: string) => void
  onSetBookingVgmCutoff: (bookingId: string, date: string) => void
  onSetBookingFilingCutoff: (bookingId: string, date: string) => void
  onMarkSiRequested: (bookingId: string) => void
  onMarkSiSubmitted: (bookingId: string) => void
  vesselSchedules: import('../../types').VesselSchedule[]
  onAddVesselSchedule: (vs: Omit<import('../../types').VesselSchedule, 'id'>) => void
  onMarkBlVesselConfirmed: (bookingId: string) => void
  onMarkBlBookingCreated: (bookingId: string) => void
  onMarkDraftBlSent: (bookingId: string, jobReferenceNumber?: string) => void
  onMarkLinerBlGenerated: (bookingId: string) => void
  onMarkPreAdviceSent: (bookingId: string) => void
  onMarkPreAlertSent: (bookingId: string) => void
  onSetBlStatus: (bookingId: string, status: 'pending' | 'approved' | 'changes-requested') => void
  onRecordMasterBl: (bookingId: string, data: { master_bl_number: string; shipper: string; consignee: string }) => void
  onCreateHouseBl: (bookingId: string, data: { house_bl_number: string; shipper: string; consignee: string }) => void
  onSetQuoteStatus: (quoteId: string, status: QuoteStatus) => void
  onUpdateCustomerKyc: (customerName: string, kycStatus: KycStatus) => void
  onAutoAdvanceForCustomer: (customerName: string, targetStage: WorkflowStage) => void
  onLogActivity: (entry: Omit<ActivityEntry, 'id' | 'timestamp'>) => void
  onFlash: (msg: string, action?: { label: string; onClick: () => void }) => void
  onStartRateCheck: (inquiry: Inquiry, container?: ContainerLine, variant?: 'procurement' | 'cs-sales') => void
  kycPendingClients: KycPendingClient[]
  onSetKycPendingClients: React.Dispatch<React.SetStateAction<KycPendingClient[]>>
  kycRequests: KycRequestRecord[]
  onSetKycRequests: React.Dispatch<React.SetStateAction<KycRequestRecord[]>>
  onRefreshKycRequests: () => void
  initialStep?: string   // When set, Workspace opens directly on this step key (used after rate-check → Prepare Quotation)
}

// ---------------------------------------------------------------------------
// Internal types
// ---------------------------------------------------------------------------

type ItemType = 'inquiry' | 'booking' | 'quote' | 'customer'

interface WorkspaceItem {
  type: ItemType
  refId: string
  customerName: string
  title: string
  subtitle: string
  urgentFlag: boolean
  createdAt: string
  previousContext: ActivityEntry | null
  actionLabel: string
  actionKind: string
  sourceData: any // eslint-disable-line @typescript-eslint/no-explicit-any
  /** Lower = more urgent. Used for cutoff-based sorting (e.g. SI reminders). */
  urgencySortKey?: number
  /** True when the client's KYC is not yet completed for this inquiry. */
  kycIncomplete?: boolean
  /** RFQ group number — present when this inquiry came from an uploaded tender. */
  rfqRef?: number
}

const TYPE_BADGE_CLASS: Record<ItemType, string> = {
  inquiry: 'db-badge accent',
  booking: 'db-badge warning',
  quote: 'db-badge purple',
  customer: 'db-badge',
}

// ---------------------------------------------------------------------------
// Step-based navigation — per-role workflow steps
// ---------------------------------------------------------------------------

interface StepDef {
  key: string
  label: string
  actionKinds: string[]
  stepNumber: number
  group?: string
}

const CS_STEPS: StepDef[] = [
  { key: 'cs-inquiry',    label: 'Inquiry',     actionKinds: ['advance-workflow'],   stepNumber: 1 },
  { key: 'cs-kyc',        label: 'KYC',         actionKinds: ['send-kyc'],           stepNumber: 2 },
  { key: 'cs-rates',      label: 'Rates',       actionKinds: ['check-rates'],        stepNumber: 3 },
  { key: 'cs-prep-quote', label: 'Prepare Quotation', actionKinds: ['prepare-quotation'], stepNumber: 4 },
  { key: 'cs-send-quote', label: 'Send Quote',  actionKinds: ['send-to-customer'],   stepNumber: 5 },
  { key: 'cs-response',   label: 'Response',    actionKinds: ['customer-response'],  stepNumber: 6 },
  { key: 'cs-booking',    label: 'Booking Request', actionKinds: ['booking-request'],    stepNumber: 7 },
  { key: 'cs-release',    label: 'Release Order', actionKinds: ['release-booking'],  stepNumber: 8 },
  { key: 'cs-cutoff',     label: 'Cut Offs',          actionKinds: ['record-cutoff'],   stepNumber: 9 },
  { key: 'cs-si',          label: 'Cut Off Reminders', actionKinds: ['request-si'],       stepNumber: 10, group: 'post-cutoff' },
  { key: 'cs-record-si',   label: 'Record SI',         actionKinds: ['submit-si'],        stepNumber: 10, group: 'post-cutoff' },

  { key: 'cs-generate-si', label: 'Generate SI',       actionKinds: ['generate-si'],          stepNumber: 10, group: 'post-cutoff' },
  { key: 'cs-bl-vessel',   label: 'Vessel',            actionKinds: ['save-vessel-schedule'], stepNumber: 11 },
  { key: 'cs-bl-booking',  label: 'Booking Creation', actionKinds: ['create-vessel-booking'], stepNumber: 12 },
  { key: 'cs-draft-bl',    label: 'Draft BL',          actionKinds: ['save-draft-bl'],        stepNumber: 13 },
  { key: 'cs-create-hbl',  label: 'Create HBL',        actionKinds: ['create-hbl'],           stepNumber: 14 },
  { key: 'cs-create-bl',   label: 'Create MBL',        actionKinds: ['create-bl'],            stepNumber: 15 },
  { key: 'cs-pre-advice',  label: 'Pre-Advice',        actionKinds: ['send-pre-advice'],      stepNumber: 16 },
  { key: 'cs-pre-alert',   label: 'Pre-Alert',         actionKinds: ['send-pre-alert'],       stepNumber: 17 },
]

const FINANCE_STEPS: StepDef[] = [
  { key: 'fin-kyc',       label: 'KYC Review',  actionKinds: ['verify-kyc'],         stepNumber: 1 },
  // { key: 'fin-approvals', label: 'Approvals',   actionKinds: ['approve-quote'],      stepNumber: 2 },
]

const PROCUREMENT_STEPS: StepDef[] = [
  { key: 'proc-rates',        label: 'Rate Check',       actionKinds: ['check-inttra-rates'],         stepNumber: 1 },
  { key: 'proc-booking-req',  label: 'Booking Request',  actionKinds: ['review-booking-request'],     stepNumber: 2 },
  { key: 'proc-booking',      label: 'Booking',          actionKinds: ['confirm-liner-booking'],      stepNumber: 3 },
  { key: 'proc-release',      label: 'Release Order',    actionKinds: ['attach-release-order'],       stepNumber: 4 },
  // { key: 'proc-urgent',   label: 'Urgent',      actionKinds: ['acknowledge-procurement'],  stepNumber: 4 },
]

const SALES_STEPS: StepDef[] = [
  { key: 'sales-inquiry',    label: 'Inquiry',           actionKinds: ['advance-workflow'],    stepNumber: 1 },
  { key: 'sales-kyc',        label: 'KYC',               actionKinds: ['send-kyc'],            stepNumber: 2 },
  { key: 'sales-rates',      label: 'Rates',             actionKinds: ['check-rates'],         stepNumber: 3 },
  { key: 'sales-prep-quote', label: 'Prepare Quotation', actionKinds: ['prepare-quotation'],   stepNumber: 4 },
  { key: 'sales-send-quote', label: 'Send Quote',        actionKinds: ['send-to-customer'],    stepNumber: 5 },
  { key: 'sales-response',   label: 'Response',          actionKinds: ['customer-response'],   stepNumber: 6 },
  { key: 'sales-booking',    label: 'Booking',           actionKinds: ['booking-request'],     stepNumber: 7 },
]

const ADMIN_STEPS: StepDef[] = [
  { key: 'adm-inquiry',     label: 'Inquiry',      actionKinds: ['advance-workflow'],        stepNumber: 1 },
  { key: 'adm-kyc-send',    label: 'KYC Send',     actionKinds: ['send-kyc'],               stepNumber: 2 },
  { key: 'adm-kyc-review',  label: 'KYC Review',   actionKinds: ['verify-kyc'],             stepNumber: 3 },
  { key: 'adm-rates-ams',   label: 'Database Rates',    actionKinds: ['check-rates'],            stepNumber: 4 },
  { key: 'adm-rates-inttra',label: 'Inttra Rates',  actionKinds: ['check-inttra-rates'],    stepNumber: 5 },
  { key: 'adm-quotation',   label: 'Quotation',    actionKinds: ['prepare-quotation'],       stepNumber: 6 },
  { key: 'adm-send-quote',  label: 'Send Quote',   actionKinds: ['send-to-customer'],        stepNumber: 7 },
  { key: 'adm-approvals',   label: 'Approvals',    actionKinds: ['approve-quote'],           stepNumber: 8 },
  { key: 'adm-response',    label: 'Response',     actionKinds: ['customer-response'],       stepNumber: 9 },
  { key: 'adm-booking',     label: 'Booking',      actionKinds: ['booking-request'],         stepNumber: 10 },
  { key: 'adm-book-liner',  label: 'Book Liner',   actionKinds: ['confirm-booking'],         stepNumber: 11 },
  { key: 'adm-proc-release',label: 'Release Order',actionKinds: ['attach-release-order'],    stepNumber: 12 },
  { key: 'adm-urgent',      label: 'Urgent',       actionKinds: ['acknowledge-procurement'], stepNumber: 13 },
  { key: 'adm-release',     label: 'Release',      actionKinds: ['release-booking'],         stepNumber: 14 },
  { key: 'adm-cutoff',      label: 'Cutoff',       actionKinds: ['record-cutoff'],           stepNumber: 14 },
  { key: 'adm-si',          label: 'Cut Off Reminders',  actionKinds: ['request-si'],       stepNumber: 15, group: 'post-cutoff' },
  { key: 'adm-record-si',   label: 'Record SI',          actionKinds: ['submit-si'],        stepNumber: 15, group: 'post-cutoff' },
  { key: 'adm-pre-advice',  label: 'Pre-Advice',         actionKinds: ['send-pre-advice'],  stepNumber: 15, group: 'post-cutoff' },
  { key: 'adm-generate-si', label: 'Generate SI',        actionKinds: ['generate-si'],      stepNumber: 15, group: 'post-cutoff' },
  { key: 'adm-create-bl',   label: 'Create BL',          actionKinds: ['create-bl'],        stepNumber: 16 },
  { key: 'adm-bl-approval', label: 'BL Approval',        actionKinds: ['bl-approval'],      stepNumber: 17 },
]

const ROLE_STEP_MAP: Record<string, StepDef[]> = {
  CS: CS_STEPS,
  Finance: FINANCE_STEPS,
  Procurement: PROCUREMENT_STEPS,
  Sales: SALES_STEPS,
  Admin: ADMIN_STEPS,
}


// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function Workspace({
  inquiries, bookings, quotes, customers, clientList, activityLog,
  onGoTo, onAdvanceWorkflow, onConfirmBooking, onMarkRaAssigned, onRevertBookingRequest, onAttachReleaseOrder, onReleaseBooking,
  onAcknowledgeProcurement, onCreateBooking,
  onSetBookingSiCutoff, onSetBookingBlCutoff, onSetBookingVgmCutoff, onSetBookingFilingCutoff,
  onMarkSiRequested, onMarkSiSubmitted, vesselSchedules, onAddVesselSchedule, onMarkBlVesselConfirmed, onMarkBlBookingCreated, onMarkDraftBlSent, onMarkLinerBlGenerated, onMarkPreAdviceSent, onMarkPreAlertSent, onSetBlStatus,
  onRecordMasterBl, onCreateHouseBl,
  onSetQuoteStatus, onUpdateCustomerKyc,
  onLogActivity, onFlash, onStartRateCheck,
  kycPendingClients, onSetKycPendingClients,
  kycRequests, onSetKycRequests, onRefreshKycRequests,
  initialStep,
}: WorkspaceProps) {
  const { activeRole, activeEmployee } = useRole()

  // Modal state for actions that need a form
  const [actionModal, setActionModal] = useState<WorkspaceItem | null>(null)
  const [formVessel, setFormVessel] = useState('')
  const [formVoyage, setFormVoyage] = useState('')
  const [formNote, setFormNote] = useState('')
  const [formDecision, setFormDecision] = useState<'approve' | 'reject'>('approve')
  const [kycSending, setKycSending] = useState(false)
  // kycPendingClients come from props (fetched in App.tsx loadAppData alongside inquiries)
  // KYC document form state (Check Documents modal — CS/Sales fill in and submit to backend)
  const [kycBrNumber, setKycBrNumber] = useState('')
  const [kycParentOrg, setKycParentOrg] = useState('')
  const [kycDeadline, setKycDeadline] = useState('')
  const [kycCliType, setKycCliType] = useState('')
  const [kycCurrency, setKycCurrency] = useState('USD')
  const [kycWebsite, setKycWebsite] = useState('')
  const [kycSvatNo, setKycSvatNo] = useState('')
  const [kycTaxExemptions, setKycTaxExemptions] = useState('N/A')
  const [kycSeaImports, setKycSeaImports] = useState(false)
  const [kycSeaExports, setKycSeaExports] = useState(false)
  const [kycTradeLanes, setKycTradeLanes] = useState(false)
  const [kycForwarding, setKycForwarding] = useState(false)
  const [kycCrossTrade, setKycCrossTrade] = useState(false)
  const [kycAirImports, setKycAirImports] = useState(false)
  const [kycAirExports, setKycAirExports] = useState(false)
  const [kycGeneralCargo, setKycGeneralCargo] = useState(false)
  const [kycDangerousGoods, setKycDangerousGoods] = useState(false)
  const [kycPerishableGoods, setKycPerishableGoods] = useState(false)
  // Document checklist — backend accepts 'true' or 'false' as strings
  const [kycDocBrForm, setKycDocBrForm] = useState('false')
  const [kycDocVatCert, setKycDocVatCert] = useState('false')
  const [kycDocSvatCert, setKycDocSvatCert] = useState('false')
  const [kycDocTinCert, setKycDocTinCert] = useState('false')
  const [kycDocForm20, setKycDocForm20] = useState('false')
  // Quotation prep state (Sales edits document)
  const [quotationContent, setQuotationContent] = useState('')
  const [quoteCopied, setQuoteCopied] = useState(false)
  // Selected rate option IDs for quotation prep — user ticks which options to include
  const [selectedRateOptionIds, setSelectedRateOptionIds] = useState<Set<number>>(new Set())
  // The single "best option" recommended to the customer
  const [bestRateOptionId, setBestRateOptionId] = useState<number | null>(null)
  const [paCopied, setPaCopied] = useState(false)
  // Send-to-customer state (CS sends via Email or WhatsApp)
  const [sendMethod, setSendMethod] = useState<'email' | 'whatsapp'>('email')
  const [waConfirmed, setWaConfirmed] = useState(false)
  const [emailConfirmed, setEmailConfirmed] = useState(false)
  const [draftCollapsed, setDraftCollapsed] = useState(true)
  const [customerContactEmail, setCustomerContactEmail] = useState('')
  const [customerContactPhone, setCustomerContactPhone] = useState('')
  const [quotationSending, setQuotationSending] = useState(false)
  // Customer response state (accept / reject)
  const [customerDecision, setCustomerDecision] = useState<'accepted' | 'rejected'>('accepted')
  // Liner booking confirmation state (Procurement Booking step)
  const [linerBooked, setLinerBooked] = useState<'yes' | 'no' | ''>('')
  // Backend quotation ID — set in prepare-quotation, used in customer-response
  const [lastQuotationId, setLastQuotationId] = useState<number | null>(null)
  // Quotation options loaded from backend for the customer-response modal
  const [quotationOptions, setQuotationOptions] = useState<QuotationOptionRow[]>([])
  const [selectedOptionRateId, setSelectedOptionRateId] = useState<number | null>(null)
  const [quotationOptionsLoading, setQuotationOptionsLoading] = useState(false)
  // Booking request form state
  const [bkShippingLine, setBkShippingLine] = useState('')       // Carrier
  const [bkContainerType, setBkContainerType] = useState("20'GP")
  const [bkQuantity, setBkQuantity] = useState(1)
  // Dynamic container list (prefilled from inquiry, editable)
  const [bkContainers, setBkContainers] = useState<{ type: string; qty: number }[]>([{ type: "20'GP", qty: 1 }])
  const [bkCommodity, setBkCommodity] = useState('')
  const [bkCargoReadyDate, setBkCargoReadyDate] = useState('')
  const [bkVessel, setBkVessel] = useState('')                   // Vessel name
  const [bkVesselEtd, setBkVesselEtd] = useState('')             // Vessel ETD (required by backend)
  const [bkVoyage, setBkVoyage] = useState('')                   // Voyage number
  const [bkPod, setBkPod] = useState('')                        // Port of Discharge
  const [bkContractNo, setBkContractNo] = useState('')
  const [bkAgreedRate, setBkAgreedRate] = useState('')
  const [bkRateRemark, setBkRateRemark] = useState('')
  const [bkDeliveryTerm, setBkDeliveryTerm] = useState('')
  const [bkHsCode, setBkHsCode] = useState('')
  const [bkBlType, setBkBlType] = useState<'OBL' | 'Seaway Bill' | ''>('')
  const [bkBookingType, setBkBookingType] = useState<'Spot' | 'FAK' | ''>('')
  const [bkReeferTemp, setBkReeferTemp] = useState('')
  const [bkDeliveryAgent, setBkDeliveryAgent] = useState('')
  const [bkSpecificRouting, setBkSpecificRouting] = useState('')
  const [bkRaNumber, setBkRaNumber] = useState('')        // RA number — added by Procurement

  // Release order attachment state (Procurement Release Order step)
  const [roFields, setRoFields] = useState<ReleaseOrderFields>({
    reference_nbr: '', pickup_empty_date: '', validity_expiration_date: '',
    pickup_depot: '', pickup_depot_address: '', cargo_description: '',
    cargo_weight: '', cut_off_date: '', etd: '', eta: '',
    next_port_of_discharge: '', transport_mode: '', transport_carrier: '',
  })
  // CS Release Order — two-phase: review first, then send
  const [releasePhase, setReleasePhase] = useState<'review' | 'send'>('review')
  const [releaseDraft, setReleaseDraft] = useState('')
  const [roRefCollapsed, setRoRefCollapsed] = useState(true)

  // Vessel cutoff schedule panel state
  // cutoffPanelOpen removed — cutoff is now a workflow step modal
  const [_cutoffBookingId, setCutoffBookingId] = useState('')
  const [cutoffLiner, setCutoffLiner] = useState('')
  const [cutoffMode, setCutoffMode] = useState<'paste' | 'upload'>('paste')
  const [cutoffContent, setCutoffContent] = useState('')
  const [cutoffFileName, setCutoffFileName] = useState('')

  // Reference data
  const [linerList, setLinerList] = useState<LinerRecord[]>([])
  useEffect(() => { apiGetLiners().then(setLinerList).catch(() => {}) }, [])

  // Completed rate requests for quotation prep (Step 4)
  const [completedRateRequests, setCompletedRateRequests] = useState<CompletedRateRequest[]>([])
  useEffect(() => {
    if (activeRole === 'CS' || activeRole === 'Sales' || activeRole === 'Admin') {
      apiFetchCompletedRateRequests()
        .then(res => setCompletedRateRequests(res.requests))
        .catch(() => {})
    }
  }, [activeRole])
  const [cutoffNotes, setCutoffNotes] = useState('')
  const [cutoffSiDate, setCutoffSiDate] = useState('')
  const [cutoffBlDate, setCutoffBlDate] = useState('')
  const [cutoffVgmDate, setCutoffVgmDate] = useState('')
  const [cutoffFilingDate, setCutoffFilingDate] = useState('')
  // Submit SI to liner state
  const [siContent, setSiContent] = useState('')
  const [siFileName, setSiFileName] = useState('')
  const [siMode, setSiMode] = useState<'paste' | 'upload'>('paste')
  const [inttraSiLoading, setInttraSiLoading] = useState(false)
  // VGM certificate upload
  const [vgmCertFileName, setVgmCertFileName] = useState('')
  const [vgmCertContent, setVgmCertContent] = useState('')
  // Draft BL state
  const [_draftBlContent, _setDraftBlContent] = useState('')
  const [_draftBlFileName, _setDraftBlFileName] = useState('')
  const [_draftBlMode, _setDraftBlMode] = useState<'paste' | 'upload'>('paste')
  const [jobRefNumber, setJobRefNumber] = useState('')
  // Draft BL — Phase 1 vessel / Phase 2 booking / Phase 3 save
  const [draftBlPhase, setDraftBlPhase] = useState<1 | 2 | 3>(1)
  const [vesselScheduleType, setVesselScheduleType] = useState<'FCL' | 'CONSOL' | 'BOTH'>('FCL')
  const [vesselPol, setVesselPol] = useState('')
  const [vesselEtaPol, setVesselEtaPol] = useState('')
  const [vesselEtdPol, setVesselEtdPol] = useState('')
  const [vesselRoutingType, setVesselRoutingType] = useState<'DIRECT' | 'TRANSSHIPMENT'>('DIRECT')
  const [vesselFinalPod, setVesselFinalPod] = useState('')
  const [vesselEtaFpod, setVesselEtaFpod] = useState('')
  const [vesselRemarks, setVesselRemarks] = useState('')
  const [vesselAgent, setVesselAgent] = useState('')
  const [selectedReleaseOrderId, setSelectedReleaseOrderId] = useState('')
  const [showVesselSuggestions, setShowVesselSuggestions] = useState(false)
  const [vesselDropOpen, setVesselDropOpen] = useState(false)
  const [voyageDropOpen, setVoyageDropOpen] = useState(false)
  const [unknownVoyageWarning, setUnknownVoyageWarning] = useState<{ field: 'vessel' | 'voyage'; value: string } | null>(null)
  const vesselPickedRef = useRef(false)   // true when user just selected from the vessel dropdown
  const voyagePickedRef = useRef(false)   // true when user just selected from the voyage dropdown
  const [vesselCreatedPrompt, setVesselCreatedPrompt] = useState<{ vesselName: string; voyageNumber: string; pol: string; fpod: string; etdPol: string; etaFpod: string; bookingId: string } | null>(null)
  const pendingVesselForBooking = useRef<{ vesselName: string; voyageNumber: string; pol: string; fpod: string; etdPol: string; etaFpod: string } | null>(null)
  // Draft BL — Phase 2 booking form (Gensoft fields)
  const [bkgForm, setBkgForm] = useState<Record<string, string>>({})
  const bkgField = (key: string) => bkgForm[key] ?? ''
  const setBkgField = (key: string, value: string) => setBkgForm(prev => ({ ...prev, [key]: value }))
  // BL Approval state
  const [blDecision, setBlDecision] = useState<'approved' | 'changes-requested'>('approved')
  // Master BL state
  const [masterBlNumber, setMasterBlNumber] = useState('')
  const [masterBlShipper, setMasterBlShipper] = useState('Synergy Shipping & Logistics')
  const [masterBlConsignee, setMasterBlConsignee] = useState('')
  // House BL state
  const [houseBlNumber, setHouseBlNumber] = useState('')
  const [houseBlShipper, setHouseBlShipper] = useState('')
  const [houseBlConsignee, setHouseBlConsignee] = useState('')
  // Generate SI (Liner BL Instruction) state
  const [siForm, setSiForm] = useState<Record<string, string>>({})
  const siField = (key: string) => siForm[key] ?? ''
  const setSiField = (key: string, value: string) => setSiForm(prev => ({ ...prev, [key]: value }))
  const [siIsNvocc, setSiIsNvocc] = useState(true)
  const [siEmailShow, setSiEmailShow] = useState(false)
  const [siEmailDraft, setSiEmailDraft] = useState('')
  const [siLinerEmail, setSiLinerEmail] = useState('')
  // Create BL (combined MBL + HBL) state
  const [_blActiveTab, setBlActiveTab] = useState<'mbl' | 'hbl'>('mbl')
  const [mblForm, setMblForm] = useState<Record<string, string>>({})
  const mblField = (key: string) => mblForm[key] ?? ''
  const setMblField = (key: string, value: string) => setMblForm(prev => ({ ...prev, [key]: value }))
  const [hblForm, setHblForm] = useState<Record<string, string>>({})
  const hblField = (key: string) => hblForm[key] ?? ''
  const setHblField = (key: string, value: string) => setHblForm(prev => ({ ...prev, [key]: value }))
  interface BlContainerRow { containerNo: string; size: string; type: string; shipmentType: string; sealNo: string; packages: string; packageType: string; grossWeight: string; cbm: string }
  const [hblContainers, setHblContainers] = useState<BlContainerRow[]>([])
  interface MblContainerRow { containerNo: string; containerType: string; sealNo: string; poNumber: string; hsCode: string; description: string; grossWeight: string; cbm: string }
  const [mblContainers, setMblContainers] = useState<MblContainerRow[]>([{ containerNo: '', containerType: "40' HIGH CUBE", sealNo: '', poNumber: '', hsCode: '', description: '', grossWeight: '', cbm: '' }])
  const [hblCollapsed, setHblCollapsed] = useState<Record<string, boolean>>({})
  const toggleHblSection = (sectionId: string) => setHblCollapsed(prev => ({ ...prev, [sectionId]: !prev[sectionId] }))
  // MBL step: HBL selection state — search and pick HBLs to attach to this Master BL
  const [mblSelectedHblIds, setMblSelectedHblIds] = useState<string[]>([])
  const [mblHblSearch, setMblHblSearch] = useState('')
  // Pre-Advice state
  const [paForm, setPaForm] = useState<Record<string, string>>({})
  const paField = (key: string) => paForm[key] ?? ''
  const setPaField = (key: string, value: string) => setPaForm(prev => ({ ...prev, [key]: value }))

  // Step navigation state — initialStep lets the parent jump directly to a specific step on mount
  const [activeStep, setActiveStep] = useState<string | null>(initialStep ?? null)
  useEffect(() => { setActiveStep(null) }, [activeRole])

  const empName = (id: number) => EMPLOYEES.find(e => e.id === id)?.name ?? `EMP-${id}`

  const mkReleaseOrderDraft = (bkg: Booking, method: 'email' | 'whatsapp') =>
    generateReleaseOrderDraft(bkg, method, empName(activeEmployee.id))

  const findContext = (refId: string): ActivityEntry | null =>
    activityLog.find(a => a.ref_id === refId) ?? null

  // ---------------------------------------------------------------------------
  // Derive pending items from existing data
  // ---------------------------------------------------------------------------

  const { pendingItems } = useMemo(() => {
    const pending: WorkspaceItem[] = []
    const role = activeRole === 'Admin' ? null : activeRole

    // --- From Inquiries (by workflow_stage) ---
    // Multi-container inquiries are split: one work item per container.
    for (const inq of inquiries) {
      if (inq.status === 'completed' || !inq.workflow_stage) continue
      const stage = WORKFLOW_STAGES.find(s => s.id === inq.workflow_stage)
      if (!stage) continue
      if (role && !stage.roles.includes(role)) continue
      if (inq.workflow_stage === 'completed') continue

      // Determine the next stage (simple step+1 — no KYC routing, all inquiries start at rate-check)
      const resolvedNextStage = WORKFLOW_STAGES.find(s => s.step === stage.step + 1)
      if (!resolvedNextStage) continue

      const cust = customers.find(c => c.name.toLowerCase() === inq.customer_name.toLowerCase())

      // Build the list of containers to iterate over.
      // If the inquiry has no containers array, create a single synthetic entry.
      const containerEntries: { container: ContainerLine; containerIdx: number }[] =
        inq.containers && inq.containers.length > 0
          ? inq.containers.map((c, ci) => ({ container: c, containerIdx: ci }))
          : [{
              container: {
                containerType: inq.container_type ?? '20 GP',
                quantity: inq.container_qty ?? 1,
                weight: inq.cargo_weight ?? '',
                commodityType: inq.commodity_type ?? 'Miscellaneous manufactured articles — furniture, toys',
                commodityName: '',
                destination: inq.destination,
                isFcl: inq.is_fcl ?? true,
                zipCode: '',
                doorAgents: [],
                freeTime: '',
              },
              containerIdx: 0,
            }]

      for (const { container: cont, containerIdx: ci } of containerEntries) {
        const dest = cont.destination || inq.destination
        const containerLabel = `${cont.quantity}x ${cont.containerType}`
        const routeLabel = `${inq.origin} → ${dest}`

        let title = ''
        let actionKind = 'advance-workflow'
        let actionLabel = `Push to ${stageRoleLabel(resolvedNextStage)}`

        switch (inq.workflow_stage) {
          case 'rate-check':
            title = `Rate check: ${routeLabel} · ${containerLabel}`
            actionKind = 'check-rates'
            actionLabel = 'Check Rates (Database + Spot + INTTRA)'
            break
          case 'procurement-request':
            title = `Procurement escalation: ${routeLabel} · ${containerLabel}`
            actionKind = 'check-inttra-rates'
            actionLabel = 'Check Rates'
            break
          case 'quotation-prep':
            title = `Prepare quotation for ${inq.customer_name} · ${containerLabel}`
            actionKind = 'prepare-quotation'
            actionLabel = 'Prepare Quotation'
            break
          case 'quotation-sent':
            title = `Send quotation to ${inq.customer_name}`
            actionKind = 'send-to-customer'
            actionLabel = 'Send to Customer'
            break
          case 'customer-response':
            title = `Awaiting response from ${inq.customer_name}`
            actionKind = 'customer-response'
            actionLabel = 'Record Response'
            break
          case 'booking-request':
            title = `Create booking for ${inq.customer_name} · ${containerLabel}`
            actionKind = 'booking-request'
            actionLabel = 'Create Booking'
            break
          default:                    title = `${stage.label} — ${inq.customer_name}`
        }

        // Attach saved rate request data for quotation-prep work items
        const rateRequest = inq.workflow_stage === 'quotation-prep' && inq.inq_id
          ? completedRateRequests.find(rr => rr.inq_id === inq.inq_id)
          : undefined

        pending.push({
          type: 'inquiry',
          refId: inq.id,
          customerName: inq.customer_name,
          title,
          subtitle: `${inq.request} · ${routeLabel} · ${containerLabel} · ${inq.delivery_type === 'door-to-door' ? 'Door-to-Door' : 'Port-to-Port'}`,
          urgentFlag: isSpotInquiry(inq.inquiry_text ?? ''),
          createdAt: inq.created_at,
          previousContext: findContext(inq.id),
          actionLabel,
          actionKind,
          sourceData: { inquiry: inq, nextStage: resolvedNextStage.id, container: cont, containerIdx: ci, customer: cust, rateRequest },
          kycIncomplete: inq.kyc_completed === false,
          rfqRef: inq.rfq_ref,
        })
      }
    }

    // --- From Bookings (by status) ---
    for (const bkg of bookings) {
      if (bkg.status === 'Pending Liner' && (!role || role === 'Procurement')) {
        pending.push({
          type: 'booking',
          refId: bkg.id,
          customerName: bkg.customer_name,
          title: `Booking request from CS — ${bkg.customer_name}`,
          subtitle: `${bkg.quantity}x ${bkg.container_type} · ${bkg.origin} → ${bkg.destination} · ${bkg.shipping_line || 'Any carrier'}`,
          urgentFlag: bkg.is_urgent,
          createdAt: bkg.created_at,
          previousContext: findContext(bkg.id),
          actionLabel: 'Review & Process',
          actionKind: 'review-booking-request',
          sourceData: { booking: bkg },
        })
      }

      if (bkg.status === 'RA Assigned' && (!role || role === 'Procurement')) {
        pending.push({
          type: 'booking',
          refId: bkg.id,
          customerName: bkg.customer_name,
          title: `Confirm liner booking — ${bkg.customer_name}`,
          subtitle: `${bkg.quantity}x ${bkg.container_type} · ${bkg.shipping_line} · RA# ${bkg.voyage_number || 'pending'}`,
          urgentFlag: bkg.is_urgent,
          createdAt: bkg.created_at,
          previousContext: findContext(bkg.id),
          actionLabel: 'Confirm Booking',
          actionKind: 'confirm-liner-booking',
          sourceData: { booking: bkg },
        })
      }

      if (bkg.status === 'Liner Confirmed' && !bkg.release_order_attached && (!role || role === 'Procurement')) {
        pending.push({
          type: 'booking',
          refId: bkg.id,
          customerName: bkg.customer_name,
          title: `Attach release order — ${bkg.customer_name}`,
          subtitle: `${bkg.quantity}x ${bkg.container_type} · ${bkg.shipping_line} · ${bkg.vessel_name}${bkg.voyage_number ? ` / ${bkg.voyage_number}` : ''}`,
          urgentFlag: bkg.is_urgent,
          createdAt: bkg.created_at,
          previousContext: findContext(bkg.id),
          actionLabel: 'Attach Release Order',
          actionKind: 'attach-release-order',
          sourceData: { booking: bkg },
        })
      }

      if (bkg.status === 'Liner Confirmed' && !bkg.released_by && bkg.release_order_attached && (!role || role === 'CS')) {
        pending.push({
          type: 'booking',
          refId: bkg.id,
          customerName: bkg.customer_name,
          title: `Release booking to ${bkg.customer_name}`,
          subtitle: `${bkg.quantity}x ${bkg.container_type} · ${bkg.vessel_name}${bkg.voyage_number ? ` / ${bkg.voyage_number}` : ''}`,
          urgentFlag: bkg.is_urgent,
          createdAt: bkg.created_at,
          previousContext: findContext(bkg.id),
          actionLabel: 'Release to Customer',
          actionKind: 'release-booking',
          sourceData: { booking: bkg },
        })
      }

      if (bkg.is_urgent && !bkg.procurement_notified && bkg.status !== 'Pending Liner' && (!role || role === 'Procurement')) {
        pending.push({
          type: 'booking',
          refId: bkg.id,
          customerName: bkg.customer_name,
          title: `Acknowledge urgent booking for ${bkg.customer_name}`,
          subtitle: `Urgent bypass — CS booked directly. ${bkg.quantity}x ${bkg.container_type} · ${bkg.shipping_line}`,
          urgentFlag: true,
          createdAt: bkg.created_at,
          previousContext: findContext(bkg.id),
          actionLabel: 'Acknowledge',
          actionKind: 'acknowledge-procurement',
          sourceData: { booking: bkg },
        })
      }
    }

    // --- From Bookings (record cutoff schedule) ---
    for (const bkg of bookings) {
      if (bkg.status !== 'Released') continue
      if (role && role !== 'CS') continue
      const hasCutoff = activityLog.some(a => a.ref_id === bkg.id && a.action.includes('Recorded vessel cutoff schedule'))
      if (hasCutoff) continue

      pending.push({
        type: 'booking',
        refId: bkg.id,
        customerName: bkg.customer_name,
        title: `Record vessel cutoff schedule for ${bkg.customer_name}`,
        subtitle: `${bkg.quantity}x ${bkg.container_type} · ${bkg.origin} → ${bkg.destination} · ${bkg.shipping_line || 'No liner'}`,
        urgentFlag: false,
        createdAt: bkg.created_at,
        previousContext: findContext(bkg.id),
        actionLabel: 'Record Cutoff',
        actionKind: 'record-cutoff',
        sourceData: { booking: bkg },
      })
    }

    // --- From Bookings (SI reminder — show all with cutoff dates, sorted by urgency) ---
    for (const bkg of bookings) {
      if (bkg.si_requested) continue
      const cutoffDate = bkg.bl_cutoff_date || bkg.si_cutoff_date
      if (!cutoffDate) continue
      if (bkg.status !== 'Liner Confirmed' && bkg.status !== 'Released') continue
      if (role && role !== 'CS') continue

      const dLeft = daysUntil(cutoffDate)
      const isOvd = dLeft < 0
      const urgencyText = isOvd
        ? `OVERDUE by ${Math.abs(dLeft)} day(s)`
        : dLeft === 0 ? 'Due TODAY' : `${dLeft} day(s) left`

      pending.push({
        type: 'booking',
        refId: bkg.id,
        customerName: bkg.customer_name,
        title: `Send cutoff reminder to ${bkg.customer_name}`,
        subtitle: `${bkg.quantity}x ${bkg.container_type} · ${bkg.origin} → ${bkg.destination} · SI/BL cutoff: ${cutoffDate} (${urgencyText})`,
        urgentFlag: isOvd || dLeft <= 2,
        createdAt: bkg.created_at,
        previousContext: findContext(bkg.id),
        actionLabel: 'Send Reminder',
        actionKind: 'request-si',
        sourceData: { booking: bkg },
        urgencySortKey: dLeft,
      })
    }

    // Helper: build cutoff date suffix for subtitles
    const cutoffSuffix = (bkg: Booking) => {
      const parts: string[] = []
      const sibl = bkg.si_cutoff_date || bkg.bl_cutoff_date
      if (sibl) parts.push(`SI/BL: ${sibl}`)
      if (bkg.vgm_cutoff_date) parts.push(`VGM: ${bkg.vgm_cutoff_date}`)
      return parts.length ? ` · ${parts.join(' · ')}` : ''
    }

    // --- From Bookings (record SI) — parallel with reminders, Pre-Advice & Generate SI ---
    for (const bkg of bookings) {
      if (bkg.si_submitted) continue
      const hasCutoffDates = bkg.si_cutoff_date || bkg.bl_cutoff_date || bkg.vgm_cutoff_date
      if (!hasCutoffDates) continue
      if (bkg.status !== 'Liner Confirmed' && bkg.status !== 'Released') continue
      if (role && role !== 'CS') continue

      pending.push({
        type: 'booking',
        refId: bkg.id,
        customerName: bkg.customer_name,
        title: `Record SI for ${bkg.customer_name}`,
        subtitle: `${bkg.quantity}x ${bkg.container_type} · ${bkg.origin} → ${bkg.destination}${cutoffSuffix(bkg)}`,
        urgentFlag: false,
        createdAt: bkg.created_at,
        previousContext: findContext(bkg.id),
        actionLabel: 'Record SI',
        actionKind: 'submit-si',
        sourceData: { booking: bkg },
      })
    }

    // --- Generate SI / Liner BL Instruction — parallel with reminders, Record SI & Pre-Advice ---
    for (const bkg of bookings) {
      if (bkg.liner_bl_instruction_generated) continue
      const hasCutoffDates = bkg.si_cutoff_date || bkg.bl_cutoff_date || bkg.vgm_cutoff_date
      if (!hasCutoffDates) continue
      if (bkg.status !== 'Liner Confirmed' && bkg.status !== 'Released') continue
      if (role && role !== 'CS') continue

      pending.push({
        type: 'booking',
        refId: bkg.id,
        customerName: bkg.customer_name,
        title: `Generate SI / Liner BL Instruction for ${bkg.customer_name}`,
        subtitle: `${bkg.quantity}x ${bkg.container_type} · ${bkg.origin} → ${bkg.destination}${cutoffSuffix(bkg)}`,
        urgentFlag: false,
        createdAt: bkg.created_at,
        previousContext: findContext(bkg.id),
        actionLabel: 'Generate SI',
        actionKind: 'generate-si',
        sourceData: { booking: bkg },
      })
    }

    // --- Step 11: Vessel Schedule — CS confirms vessel details for BL processing ---
    for (const bkg of bookings) {
      if (!bkg.liner_bl_instruction_generated) continue
      if (bkg.bl_vessel_confirmed) continue
      if (bkg.status !== 'Liner Confirmed' && bkg.status !== 'Released') continue
      if (role && role !== 'CS') continue

      pending.push({
        type: 'booking',
        refId: bkg.id,
        customerName: bkg.customer_name,
        title: `Confirm vessel schedule for ${bkg.customer_name}`,
        subtitle: `${bkg.quantity}x ${bkg.container_type} · ${bkg.origin} → ${bkg.destination} · ${bkg.shipping_line || 'No liner'}${cutoffSuffix(bkg)}`,
        urgentFlag: false,
        createdAt: bkg.created_at,
        previousContext: findContext(bkg.id),
        actionLabel: 'Vessel Schedule',
        actionKind: 'save-vessel-schedule',
        sourceData: { booking: bkg },
      })
    }

    // --- Step 12: Vessel Booking — CS creates Gensoft booking ---
    for (const bkg of bookings) {
      if (!bkg.bl_vessel_confirmed) continue
      if (bkg.bl_booking_created) continue
      if (bkg.status !== 'Liner Confirmed' && bkg.status !== 'Released') continue
      if (role && role !== 'CS') continue

      pending.push({
        type: 'booking',
        refId: bkg.id,
        customerName: bkg.customer_name,
        title: `Create vessel booking for ${bkg.customer_name}`,
        subtitle: `${bkg.quantity}x ${bkg.container_type} · ${bkg.origin} → ${bkg.destination} · ${bkg.shipping_line || 'No liner'}${cutoffSuffix(bkg)}`,
        urgentFlag: false,
        createdAt: bkg.created_at,
        previousContext: findContext(bkg.id),
        actionLabel: 'Create Booking',
        actionKind: 'create-vessel-booking',
        sourceData: { booking: bkg },
      })
    }

    // --- Step 13: Draft BL — CS records job reference number ---
    for (const bkg of bookings) {
      if (!bkg.bl_booking_created) continue
      if (bkg.draft_bl_sent) continue
      if (bkg.status !== 'Liner Confirmed' && bkg.status !== 'Released') continue
      if (role && role !== 'CS') continue

      pending.push({
        type: 'booking',
        refId: bkg.id,
        customerName: bkg.customer_name,
        title: `Save Draft BL for ${bkg.customer_name}`,
        subtitle: `${bkg.quantity}x ${bkg.container_type} · ${bkg.origin} → ${bkg.destination} · ${bkg.shipping_line || 'No liner'}${cutoffSuffix(bkg)}`,
        urgentFlag: false,
        createdAt: bkg.created_at,
        previousContext: findContext(bkg.id),
        actionLabel: 'Save Draft BL',
        actionKind: 'save-draft-bl',
        sourceData: { booking: bkg },
      })
    }

    // --- Step 14: Create HBL (after Draft BL saved, until HBL created) ---
    for (const bkg of bookings) {
      if (!bkg.draft_bl_sent) continue
      if (bkg.house_bl_created) continue
      if (bkg.status !== 'Liner Confirmed' && bkg.status !== 'Released') continue
      if (role && role !== 'CS') continue

      pending.push({
        type: 'booking',
        refId: bkg.id,
        customerName: bkg.customer_name,
        title: `Create House BL for ${bkg.customer_name}`,
        subtitle: `${bkg.quantity}x ${bkg.container_type} · ${bkg.origin} → ${bkg.destination}${cutoffSuffix(bkg)}`,
        urgentFlag: false,
        createdAt: bkg.created_at,
        previousContext: findContext(bkg.id),
        actionLabel: 'Create HBL',
        actionKind: 'create-hbl',
        sourceData: { booking: bkg },
      })
    }

    // --- Step 15: Create MBL (after Draft BL saved, until MBL recorded) ---
    for (const bkg of bookings) {
      if (!bkg.draft_bl_sent) continue
      if (bkg.master_bl_recorded) continue
      if (bkg.status !== 'Liner Confirmed' && bkg.status !== 'Released') continue
      if (role && role !== 'CS') continue

      pending.push({
        type: 'booking',
        refId: bkg.id,
        customerName: bkg.customer_name,
        title: `Create Master BL for ${bkg.customer_name}`,
        subtitle: `${bkg.quantity}x ${bkg.container_type} · ${bkg.origin} → ${bkg.destination}${cutoffSuffix(bkg)}`,
        urgentFlag: false,
        createdAt: bkg.created_at,
        previousContext: findContext(bkg.id),
        actionLabel: 'Create MBL',
        actionKind: 'create-bl',
        sourceData: { booking: bkg },
      })
    }

    // --- Pre-Advice (door-to-door / port-to-door only) — parallel with reminders, Record SI & Generate SI ---
    for (const bkg of bookings) {
      if (bkg.delivery_type !== 'door-to-door' && bkg.delivery_type !== 'port-to-door') continue
      if (bkg.pre_advice_sent) continue
      const hasCutoffDates = bkg.si_cutoff_date || bkg.bl_cutoff_date || bkg.vgm_cutoff_date
      if (!hasCutoffDates) continue
      if (bkg.status !== 'Liner Confirmed' && bkg.status !== 'Released') continue
      if (role && role !== 'CS') continue

      const blCutoff = bkg.bl_cutoff_date || bkg.si_cutoff_date
      const urgencyText = blCutoff ? (() => {
        const dl = daysUntil(blCutoff)
        return dl < 0 ? `OVERDUE by ${Math.abs(dl)} day(s)` : dl === 0 ? 'Due TODAY' : `${dl} day(s) to BL cutoff`
      })() : ''

      pending.push({
        type: 'booking',
        refId: bkg.id,
        customerName: bkg.customer_name,
        title: `Send Pre-Advice to door agent for ${bkg.customer_name}`,
        subtitle: `${bkg.quantity}x ${bkg.container_type} · ${bkg.origin} → ${bkg.destination}${blCutoff ? ` · BL cutoff: ${blCutoff} (${urgencyText})` : ''}`,
        urgentFlag: blCutoff ? daysUntil(blCutoff) <= 1 : false,
        createdAt: bkg.created_at,
        previousContext: findContext(bkg.id),
        actionLabel: 'Send Pre-Advice',
        actionKind: 'send-pre-advice',
        sourceData: { booking: bkg },
      })
    }

    // --- Pre-Alert (bookings that completed pre-advice) ---
    for (const bkg of bookings) {
      if (!bkg.pre_advice_sent) continue
      if (bkg.pre_alert_sent) continue
      if (role && role !== 'CS') continue
      pending.push({
        type: 'booking',
        refId: bkg.id,
        customerName: bkg.customer_name,
        title: `Send Pre-Alert for ${bkg.customer_name}`,
        subtitle: `${bkg.quantity}x ${bkg.container_type} · ${bkg.origin} → ${bkg.destination}`,
        urgentFlag: bkg.is_urgent,
        createdAt: bkg.created_at,
        previousContext: findContext(bkg.id),
        actionLabel: 'Send Pre-Alert',
        actionKind: 'send-pre-alert',
        sourceData: { booking: bkg },
      })
    }

    // --- BL Approval (port-to-port: after Liner BL Instruction generated; door-to-door: after House BL sent) ---
    for (const bkg of bookings) {
      const isDtd = bkg.delivery_type === 'door-to-door'
      if (isDtd) {
        if (!bkg.house_bl_created) continue
      } else {
        if (!bkg.liner_bl_instruction_generated) continue
      }
      if (bkg.bl_status && bkg.bl_status !== 'pending') continue
      if (bkg.status !== 'Liner Confirmed' && bkg.status !== 'Released') continue
      if (role && role !== 'CS') continue

      const blLabel = isDtd ? 'House BL' : 'Master BL'
      pending.push({
        type: 'booking',
        refId: bkg.id,
        customerName: bkg.customer_name,
        title: `Record ${blLabel} approval from ${bkg.customer_name}`,
        subtitle: `${bkg.quantity}x ${bkg.container_type} · ${bkg.origin} → ${bkg.destination}${cutoffSuffix(bkg)}`,
        urgentFlag: false,
        createdAt: bkg.created_at,
        previousContext: findContext(bkg.id),
        actionLabel: 'Record Response',
        actionKind: 'bl-approval',
        sourceData: { booking: bkg },
      })
    }

    // --- From Quotes (by status) ---
    for (const q of quotes) {
      if (q.status === 'Awaiting Approval' && (!role || role === 'Finance')) {
        pending.push({
          type: 'quote',
          refId: q.id,
          customerName: q.customer_name,
          title: `Approve quotation for ${q.customer_name}`,
          subtitle: `${q.origin} → ${q.destination} · Margin ${q.margin_pct}%${q.approval_reason ? ` · ${q.approval_reason}` : ''}`,
          urgentFlag: false,
          createdAt: q.created_at,
          previousContext: findContext(q.id),
          actionLabel: 'Approve / Reject',
          actionKind: 'approve-quote',
          sourceData: { quote: q },
        })
      }
    }

    // --- From KYC Pending Queue (GET /kyc/kyc-requests/pending) ---
    // CS and Sales see clients awaiting KYC initiation regardless of inquiry workflow stage
    if (!role || role === 'CS' || role === 'Sales') {
      for (const client of kycPendingClients) {
        pending.push({
          type: 'inquiry',
          refId: `KYC-${client.cli_id}`,
          customerName: client.name,
          title: `Initiate KYC for ${client.name}`,
          subtitle: [client.addr_city, client.addr_country].filter(Boolean).join(', ') || 'No address on file',
          urgentFlag: false,
          createdAt: '',
          previousContext: null,
          actionLabel: 'Check Documents',
          actionKind: 'send-kyc',
          sourceData: { kycClient: client },
        })
      }
    }

    // --- From KYC Requests (GET /kyc/kyc-requests/requests) ---
    // Finance and Admin see submitted KYC requests awaiting review (kyc_pending stage)
    if (!role || role === 'Finance') {
      for (const req of kycRequests) {
        if (req.kyc_stage !== 'kyc_pending' && req.kyc_stage !== 'documents_submitted') continue
        const docsSubmitted = req.docs
          ? Object.values(req.docs).filter(v => v === 'true').length
          : 0
        const totalDocs = req.docs ? Object.keys(req.docs).length : 0
        pending.push({
          type: 'inquiry',
          refId: `KYC-REQ-${req.kyc_id}`,
          customerName: req.name ?? `Client #${req.cli_id}`,
          title: `Verify KYC for ${req.name ?? `Client #${req.cli_id}`}`,
          subtitle: `${docsSubmitted}/${totalDocs} documents submitted · ${req.cli_type ?? 'Unknown type'} · ${req.currency ?? ''}`.trim().replace(/\s·\s$/, ''),
          urgentFlag: false,
          createdAt: req.document_submission_deadline ?? '',
          previousContext: null,
          actionLabel: 'Review KYC',
          actionKind: 'verify-kyc',
          sourceData: { kycRequest: req },
        })
      }
    }

    // Sort: urgent first, then by urgencySortKey (lower = more urgent), then newest first
    pending.sort((a, b) => {
      if (a.urgentFlag !== b.urgentFlag) return a.urgentFlag ? -1 : 1
      // If both have urgencySortKey, sort by it (lower = more urgent)
      const aKey = a.urgencySortKey ?? Infinity
      const bKey = b.urgencySortKey ?? Infinity
      if (aKey !== bKey) return aKey - bKey
      if (!a.createdAt && b.createdAt) return 1
      if (a.createdAt && !b.createdAt) return -1
      return b.createdAt.localeCompare(a.createdAt)
    })

    return { pendingItems: pending }
  }, [inquiries, bookings, quotes, customers, activityLog, activeRole, kycPendingClients, kycRequests, completedRateRequests]) // eslint-disable-line react-hooks/exhaustive-deps

  // ---------------------------------------------------------------------------
  // Step-based filtering (replaces filter chips)
  // ---------------------------------------------------------------------------

  const roleSteps = ROLE_STEP_MAP[activeRole] ?? CS_STEPS

  const stepCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const step of roleSteps) {
      counts[step.key] = pendingItems.filter(i => step.actionKinds.includes(i.actionKind)).length
    }
    return counts
  }, [pendingItems, roleSteps])

  // For parallel groups: a group is "available" if ANY step in it has items
  const groupHasItems = useMemo(() => {
    const result: Record<string, boolean> = {}
    for (const step of roleSteps) {
      if (step.group) {
        if (!result[step.group]) result[step.group] = false
        if ((stepCounts[step.key] ?? 0) > 0) result[step.group] = true
      }
    }
    return result
  }, [roleSteps, stepCounts])

  const effectiveStep = useMemo(() => {
    if (activeStep && roleSteps.some(s => s.key === activeStep)) return activeStep
    const firstWithItems = roleSteps.find(s => (stepCounts[s.key] ?? 0) > 0)
    return firstWithItems?.key ?? roleSteps[0]?.key ?? null
  }, [activeStep, roleSteps, stepCounts])

  const filteredItems = useMemo(() => {
    if (!effectiveStep) return pendingItems
    const step = roleSteps.find(s => s.key === effectiveStep)
    if (!step) return pendingItems
    return pendingItems.filter(i => step.actionKinds.includes(i.actionKind))
  }, [pendingItems, effectiveStep, roleSteps])


  // Group work items by RFQ. Items with no rfq_ref stay ungrouped and sort last.
  const itemGroups = useMemo(() => {
    const groups = new Map<number | null, WorkspaceItem[]>()
    for (const it of filteredItems) {
      const k = it.rfqRef ?? null
      if (!groups.has(k)) groups.set(k, [])
      groups.get(k)!.push(it)
    }
    return [...groups.entries()]
      .sort((a, b) => (a[0] ?? Infinity) - (b[0] ?? Infinity))
      .map(([rfqRef, items]) => ({ rfqRef, items }))
  }, [filteredItems])

// ---------------------------------------------------------------------------
  // Action handlers (extracted to useWorkspaceActions)

  // Selected item for split-panel detail view
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null)
  const selectedItem = useMemo(() => {
    if (!selectedItemId) return filteredItems[0] ?? null
    return filteredItems.find(i => `${i.type}-${i.refId}-${i.actionKind}-${(i.sourceData as any)?.containerIdx ?? 0}` === selectedItemId) ?? filteredItems[0] ?? null
  }, [selectedItemId, filteredItems])

  const getItemKey = (item: WorkspaceItem) => `${item.type}-${item.refId}-${item.actionKind}-${(item.sourceData as any)?.containerIdx ?? 0}`
  // ---------------------------------------------------------------------------

  const { handleAction, handleModalSubmit } = useWorkspaceActions({
    customers, inquiries, activityLog, clientList, linerList, vesselSchedules,
    activeRole, activeEmployee,
    roleSteps, actionModal, selectedItem, pendingVesselForBooking,
    formVessel, formVoyage, formNote, formDecision,
    lastQuotationId, quotationContent, selectedRateOptionIds, bestRateOptionId,
    sendMethod, customerContactEmail, customerContactPhone,
    customerDecision, linerBooked, selectedOptionRateId,
    bkShippingLine, bkContainerType, bkQuantity, bkContainers,
    bkCommodity, bkCargoReadyDate, bkVessel, bkVesselEtd, bkVoyage, bkPod,
    bkContractNo, bkAgreedRate, bkRateRemark, bkDeliveryTerm,
    bkHsCode, bkBlType, bkBookingType, bkReeferTemp, bkDeliveryAgent,
    bkSpecificRouting, bkRaNumber,
    roFields, blDecision,
    masterBlNumber, masterBlShipper, masterBlConsignee,
    houseBlNumber, houseBlShipper, houseBlConsignee,
    cutoffLiner, cutoffSiDate, cutoffBlDate, cutoffVgmDate, cutoffFilingDate, cutoffNotes,
    siContent, vgmCertFileName, jobRefNumber,
    kycBrNumber, kycParentOrg, kycDeadline, kycCliType, kycCurrency,
    kycWebsite, kycSvatNo, kycTaxExemptions,
    kycSeaImports, kycSeaExports, kycTradeLanes, kycForwarding, kycCrossTrade,
    kycAirImports, kycAirExports, kycGeneralCargo, kycDangerousGoods, kycPerishableGoods,
    kycDocBrForm, kycDocVatCert, kycDocSvatCert, kycDocTinCert, kycDocForm20,
    mblSelectedHblIds, siIsNvocc, siEmailDraft, quotationOptions,
    hblField, mblField, siField, paField,
    setActionModal, setActiveStep,
    setFormVessel, setFormVoyage, setFormNote, setFormDecision,
    setKycSending, setKycBrNumber, setKycParentOrg, setKycDeadline,
    setKycCliType, setKycCurrency, setKycWebsite, setKycSvatNo, setKycTaxExemptions,
    setKycSeaImports, setKycSeaExports, setKycTradeLanes, setKycForwarding, setKycCrossTrade,
    setKycAirImports, setKycAirExports, setKycGeneralCargo, setKycDangerousGoods, setKycPerishableGoods,
    setKycDocBrForm, setKycDocVatCert, setKycDocSvatCert, setKycDocTinCert, setKycDocForm20,
    setQuotationContent, setQuoteCopied, setSelectedRateOptionIds, setBestRateOptionId,
    setSendMethod, setWaConfirmed, setEmailConfirmed, setDraftCollapsed,
    setCustomerContactEmail, setCustomerContactPhone, setQuotationSending,
    setCustomerDecision, setLinerBooked,
    setLastQuotationId, setQuotationOptions, setSelectedOptionRateId, setQuotationOptionsLoading,
    setBkShippingLine, setBkContainerType, setBkQuantity, setBkContainers,
    setBkCommodity, setBkCargoReadyDate, setBkVessel, setBkVesselEtd, setBkVoyage, setBkPod,
    setBkContractNo, setBkAgreedRate, setBkRateRemark, setBkDeliveryTerm,
    setBkHsCode, setBkBlType, setBkBookingType, setBkReeferTemp, setBkDeliveryAgent,
    setBkSpecificRouting, setBkRaNumber,
    setRoFields, setReleasePhase, setReleaseDraft, setRoRefCollapsed,
    setCutoffBookingId, setCutoffLiner, setCutoffMode, setCutoffContent, setCutoffFileName,
    setCutoffNotes, setCutoffSiDate, setCutoffBlDate, setCutoffVgmDate, setCutoffFilingDate,
    setSiContent, setSiFileName, setSiMode, setInttraSiLoading,
    setVgmCertFileName, setVgmCertContent, setJobRefNumber,
    setVesselScheduleType, setVesselPol, setVesselEtaPol, setVesselEtdPol,
    setVesselRoutingType, setVesselFinalPod, setVesselEtaFpod,
    setVesselRemarks, setVesselAgent, setSelectedReleaseOrderId, setShowVesselSuggestions,
    setBlDecision, setMasterBlNumber, setMasterBlShipper, setMasterBlConsignee,
    setHouseBlNumber, setHouseBlShipper, setHouseBlConsignee,
    setSiForm, setSiIsNvocc, setSiEmailShow, setSiEmailDraft, setSiLinerEmail,
    setHblForm, setHblContainers, setHblCollapsed,
    setMblForm, setMblContainers, setMblSelectedHblIds, setMblHblSearch,
    setPaForm, setBkgForm, setBlActiveTab, setPaCopied,
    onAdvanceWorkflow, onConfirmBooking, onMarkRaAssigned, onRevertBookingRequest,
    onAttachReleaseOrder, onReleaseBooking, onAcknowledgeProcurement, onCreateBooking,
    onSetBookingSiCutoff, onSetBookingBlCutoff, onSetBookingVgmCutoff, onSetBookingFilingCutoff,
    onMarkSiRequested, onMarkSiSubmitted,
    onMarkDraftBlSent, onMarkLinerBlGenerated, onMarkPreAdviceSent, onMarkPreAlertSent,
    onSetBlStatus, onRecordMasterBl, onCreateHouseBl,
    onSetQuoteStatus, onUpdateCustomerKyc,
    onLogActivity, onFlash, onStartRateCheck,
    onSetKycPendingClients, onSetKycRequests, onRefreshKycRequests,
  })

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const roleColor = ROLE_COLORS[activeRole]

  // Left panel collapse state
  const [leftPanelOpen, setLeftPanelOpen] = useState(true)
  const [stepRibbonOpen, setStepRibbonOpen] = useState(true)


  return (
    <div className="ws-split-layout db-page-anim">
      <div className="ws-split-body">
      {/* ---- Left Panel: Item List ---- */}
      <div className={`ws-left-panel ${leftPanelOpen ? '' : 'ws-left-collapsed'}`}>
        {leftPanelOpen ? (
          <>
        <div style={{ padding: '20px 20px 14px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
          <div>
            <h1 style={{ fontSize: 19, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text)' }}>Your workspace</h1>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>
              {filteredItems.length} item{filteredItems.length !== 1 ? 's' : ''} in this step
            </p>
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {(effectiveStep === 'cs-inquiry' || effectiveStep === 'adm-inquiry' || effectiveStep === 'sales-inquiry') && (
            <button
              onClick={() => onGoTo('new-inquiry')}
              title="New Inquiry"
              style={{ flexShrink: 0, width: 30, height: 30, borderRadius: 8, background: '#0f8fa8', color: '#fff', border: 'none', fontSize: 17, fontWeight: 600, cursor: 'pointer', lineHeight: 1 }}
            >+</button>
          )}
          {effectiveStep === 'proc-rates' && (
            <button
              onClick={() => onGoTo('record-rate')}
              title="Record Rate"
              style={{ flexShrink: 0, width: 30, height: 30, borderRadius: 8, background: '#d97706', color: '#fff', border: 'none', fontSize: 17, fontWeight: 600, cursor: 'pointer', lineHeight: 1 }}
            >+</button>
          )}
          <button onClick={() => setLeftPanelOpen(false)} title="Collapse panel"
            style={{ flexShrink: 0, width: 28, height: 28, borderRadius: 6, background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <PanelLeftClose size={14} />
          </button>
          </div>
        </div>
        <div className="ws-left-scroll">
          {filteredItems.length === 0 ? (
            <div style={{ padding: '28px 10px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
              Nothing in this step right now.
            </div>
          ) : (
            itemGroups.map(group => (
              <div key={group.rfqRef ?? 'ungrouped'}>
                {group.rfqRef != null && (
                  <div style={{
                    padding: '7px 11px', margin: '10px 0 5px',
                    background: 'rgba(44,44,130,0.07)', borderLeft: '3px solid #2c2c82',
                    borderRadius: 4, fontSize: 11, fontWeight: 700, color: '#2c2c82',
                    textTransform: 'uppercase', letterSpacing: '0.04em',
                  }}>
                    RFQ-{group.rfqRef} · {group.items[0].customerName} · {group.items.length} route{group.items.length !== 1 ? 's' : ''}
                  </div>
                )}
                {group.items.map(item => {
              const key = getItemKey(item)
              const isSelected = selectedItem ? getItemKey(selectedItem) === key : false
              return (
                <div
                  key={key}
                  onClick={() => {
                    setSelectedItemId(key)
                    if (item.actionKind === 'send-kyc' || item.actionKind === 'customer-response' || item.actionKind === 'booking-request' || item.actionKind === 'review-booking-request' || item.actionKind === 'confirm-liner-booking' || item.actionKind === 'attach-release-order' || item.actionKind === 'release-booking' || item.actionKind === 'save-draft-bl' || item.actionKind === 'send-draft-bl' || item.actionKind === 'generate-si' || item.actionKind === 'create-hbl' || item.actionKind === 'create-bl' || item.actionKind === 'record-cutoff' || item.actionKind === 'request-si' || item.actionKind === 'submit-si' || item.actionKind === 'send-pre-advice') {
                      handleAction(item)
                    }
                  }}
                  className={`ws-list-item ${isSelected ? 'active' : ''}`}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{item.customerName}</span>
                    {item.urgentFlag && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#dc2626', marginLeft: 'auto', flexShrink: 0 }} />}
                    {item.kycIncomplete && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#f59e0b', marginLeft: item.urgentFlag ? 0 : 'auto', flexShrink: 0 }} title="KYC pending" />}
                  </div>
                  <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>{item.subtitle}</div>
                  <span className={TYPE_BADGE_CLASS[item.type]} style={{ fontSize: 10 }}>{item.actionLabel}</span>
                </div>
              )
                })}
              </div>
            ))
          )}
        </div>
          </>
        ) : (
          <div className="ws-left-collapsed-content">
            <button onClick={() => setLeftPanelOpen(true)} title="Expand panel"
              style={{ width: 32, height: 32, borderRadius: 6, background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
              <PanelLeftOpen size={15} />
            </button>
            <div style={{ writingMode: 'vertical-rl', textOrientation: 'mixed', transform: 'rotate(180deg)', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
              {filteredItems.length} item{filteredItems.length !== 1 ? 's' : ''}
            </div>
          </div>
        )}
      </div>

      {/* ---- Right Panel: Detail + Action ---- */}
      <div className="ws-right-panel">
        {selectedItem ? (
          <div style={{ maxWidth: '100%' }}>
            {/* Ref ID + badges */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 12, color: '#94a3b8' }}>{selectedItem.refId}</span>
              {selectedItem.urgentFlag && (
                <span style={{ padding: '2px 8px', borderRadius: 999, fontSize: 10, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.04em', background: 'rgba(220,38,38,0.08)', color: '#dc2626' }}>Urgent</span>
              )}
              {selectedItem.kycIncomplete && (
                <span style={{ padding: '2px 8px', borderRadius: 999, fontSize: 10, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.04em', background: 'rgba(245,158,11,0.1)', color: '#b45309' }}>KYC Pending</span>
              )}
              <span className={TYPE_BADGE_CLASS[selectedItem.type]}>{selectedItem.type}</span>
            </div>

            {/* Customer / Title */}
            <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 4, color: 'var(--text)' }}>{selectedItem.customerName}</h1>
            <p style={{ fontSize: 15, color: '#475569', marginBottom: 24 }}>{selectedItem.title}</p>

            {/* Where it came from - context card */}
            {selectedItem.previousContext && (
              <div style={{ padding: '14px 16px', background: '#fff', border: '1px solid #e2e8f0', borderLeft: '3px solid #0f8fa8', borderRadius: 10, marginBottom: 26 }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.05em', color: '#94a3b8', marginBottom: 6 }}>Where it came from</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <User size={11} style={{ color: 'var(--text-muted)' }} />
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>
                    {empName(selectedItem.previousContext.actor_id)} ({ROLE_LABELS[selectedItem.previousContext.actor_role]})
                  </span>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 'auto' }}>{selectedItem.previousContext.timestamp}</span>
                </div>
                <div style={{ fontSize: 13.5, color: '#334155', lineHeight: 1.55 }}>{selectedItem.previousContext.action}</div>
                {selectedItem.previousContext.notes && (
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, fontStyle: 'italic' }}>{selectedItem.previousContext.notes}</div>
                )}
              </div>
            )}

            {/* Complete this step */}
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.05em', color: '#94a3b8', marginBottom: 14 }}>Complete this step</div>


            <InlineStepForms
              selectedItem={selectedItem}
              actionModal={actionModal}
              kycBrNumber={kycBrNumber}
              setKycBrNumber={setKycBrNumber}
              kycParentOrg={kycParentOrg}
              setKycParentOrg={setKycParentOrg}
              kycDeadline={kycDeadline}
              setKycDeadline={setKycDeadline}
              kycCliType={kycCliType}
              setKycCliType={setKycCliType}
              kycCurrency={kycCurrency}
              setKycCurrency={setKycCurrency}
              kycWebsite={kycWebsite}
              setKycWebsite={setKycWebsite}
              kycSvatNo={kycSvatNo}
              setKycSvatNo={setKycSvatNo}
              kycTaxExemptions={kycTaxExemptions}
              setKycTaxExemptions={setKycTaxExemptions}
              kycSeaImports={kycSeaImports}
              setKycSeaImports={setKycSeaImports}
              kycSeaExports={kycSeaExports}
              setKycSeaExports={setKycSeaExports}
              kycTradeLanes={kycTradeLanes}
              setKycTradeLanes={setKycTradeLanes}
              kycForwarding={kycForwarding}
              setKycForwarding={setKycForwarding}
              kycCrossTrade={kycCrossTrade}
              setKycCrossTrade={setKycCrossTrade}
              kycAirImports={kycAirImports}
              setKycAirImports={setKycAirImports}
              kycAirExports={kycAirExports}
              setKycAirExports={setKycAirExports}
              kycGeneralCargo={kycGeneralCargo}
              setKycGeneralCargo={setKycGeneralCargo}
              kycDangerousGoods={kycDangerousGoods}
              setKycDangerousGoods={setKycDangerousGoods}
              kycPerishableGoods={kycPerishableGoods}
              setKycPerishableGoods={setKycPerishableGoods}
              kycDocBrForm={kycDocBrForm}
              setKycDocBrForm={setKycDocBrForm}
              kycDocVatCert={kycDocVatCert}
              setKycDocVatCert={setKycDocVatCert}
              kycDocSvatCert={kycDocSvatCert}
              setKycDocSvatCert={setKycDocSvatCert}
              kycDocTinCert={kycDocTinCert}
              setKycDocTinCert={setKycDocTinCert}
              kycDocForm20={kycDocForm20}
              setKycDocForm20={setKycDocForm20}
              customerDecision={customerDecision}
              setCustomerDecision={setCustomerDecision}
              quotationOptions={quotationOptions}
              quotationOptionsLoading={quotationOptionsLoading}
              selectedOptionRateId={selectedOptionRateId}
              setSelectedOptionRateId={setSelectedOptionRateId}
              cutoffLiner={cutoffLiner}
              setCutoffLiner={setCutoffLiner}
              cutoffMode={cutoffMode}
              setCutoffMode={setCutoffMode}
              cutoffContent={cutoffContent}
              setCutoffContent={setCutoffContent}
              cutoffFileName={cutoffFileName}
              setCutoffFileName={setCutoffFileName}
              cutoffNotes={cutoffNotes}
              setCutoffNotes={setCutoffNotes}
              cutoffSiDate={cutoffSiDate}
              setCutoffSiDate={setCutoffSiDate}
              cutoffBlDate={cutoffBlDate}
              setCutoffBlDate={setCutoffBlDate}
              cutoffVgmDate={cutoffVgmDate}
              setCutoffVgmDate={setCutoffVgmDate}
              cutoffFilingDate={cutoffFilingDate}
              setCutoffFilingDate={setCutoffFilingDate}
              roRefCollapsed={roRefCollapsed}
              setRoRefCollapsed={setRoRefCollapsed}
              sendMethod={sendMethod}
              setSendMethod={setSendMethod}
              waConfirmed={waConfirmed}
              setWaConfirmed={setWaConfirmed}
              emailConfirmed={emailConfirmed}
              setEmailConfirmed={setEmailConfirmed}
              draftCollapsed={draftCollapsed}
              setDraftCollapsed={setDraftCollapsed}
              customerContactEmail={customerContactEmail}
              setCustomerContactEmail={setCustomerContactEmail}
              customerContactPhone={customerContactPhone}
              setCustomerContactPhone={setCustomerContactPhone}
              vgmCertFileName={vgmCertFileName}
              setVgmCertFileName={setVgmCertFileName}
              vgmCertContent={vgmCertContent}
              setVgmCertContent={setVgmCertContent}
              paField={paField}
              setPaField={setPaField}
              paCopied={paCopied}
              setPaCopied={setPaCopied}
              releasePhase={releasePhase}
              setReleasePhase={setReleasePhase}
              releaseDraft={releaseDraft}
              setReleaseDraft={setReleaseDraft}
              mkReleaseOrderDraft={mkReleaseOrderDraft}
              roFields={roFields}
              setRoFields={setRoFields}
              linerBooked={linerBooked}
              setLinerBooked={setLinerBooked}
              siContent={siContent}
              setSiContent={setSiContent}
              siFileName={siFileName}
              setSiFileName={setSiFileName}
              siMode={siMode}
              setSiMode={setSiMode}
              inttraSiLoading={inttraSiLoading}
              siField={siField}
              setSiField={setSiField}
              siIsNvocc={siIsNvocc}
              siEmailShow={siEmailShow}
              setSiEmailShow={setSiEmailShow}
              siEmailDraft={siEmailDraft}
              setSiEmailDraft={setSiEmailDraft}
              siLinerEmail={siLinerEmail}
              setSiLinerEmail={setSiLinerEmail}
              vesselScheduleType={vesselScheduleType}
              setVesselScheduleType={setVesselScheduleType}
              formVessel={formVessel}
              setFormVessel={setFormVessel}
              formVoyage={formVoyage}
              setFormVoyage={setFormVoyage}
              vesselPol={vesselPol}
              setVesselPol={setVesselPol}
              vesselEtaPol={vesselEtaPol}
              setVesselEtaPol={setVesselEtaPol}
              vesselEtdPol={vesselEtdPol}
              setVesselEtdPol={setVesselEtdPol}
              vesselRoutingType={vesselRoutingType}
              setVesselRoutingType={setVesselRoutingType}
              vesselFinalPod={vesselFinalPod}
              setVesselFinalPod={setVesselFinalPod}
              vesselEtaFpod={vesselEtaFpod}
              setVesselEtaFpod={setVesselEtaFpod}
              vesselRemarks={vesselRemarks}
              setVesselRemarks={setVesselRemarks}
              vesselAgent={vesselAgent}
              setVesselAgent={setVesselAgent}
              selectedReleaseOrderId={selectedReleaseOrderId}
              setSelectedReleaseOrderId={setSelectedReleaseOrderId}
              showVesselSuggestions={showVesselSuggestions}
              setShowVesselSuggestions={setShowVesselSuggestions}
              draftBlPhase={draftBlPhase}
              setDraftBlPhase={setDraftBlPhase}
              vesselDropOpen={vesselDropOpen}
              setVesselDropOpen={setVesselDropOpen}
              voyageDropOpen={voyageDropOpen}
              setVoyageDropOpen={setVoyageDropOpen}
              unknownVoyageWarning={unknownVoyageWarning}
              setUnknownVoyageWarning={setUnknownVoyageWarning}
              vesselPickedRef={vesselPickedRef}
              voyagePickedRef={voyagePickedRef}
              bkgField={bkgField}
              setBkgField={setBkgField}
              hblField={hblField}
              setHblField={setHblField}
              hblContainers={hblContainers}
              setHblContainers={setHblContainers}
              hblCollapsed={hblCollapsed}
              toggleHblSection={toggleHblSection}
              mblField={mblField}
              setMblField={setMblField}
              mblContainers={mblContainers}
              setMblContainers={setMblContainers}
              mblSelectedHblIds={mblSelectedHblIds}
              setMblSelectedHblIds={setMblSelectedHblIds}
              mblHblSearch={mblHblSearch}
              setMblHblSearch={setMblHblSearch}
              bkShippingLine={bkShippingLine}
              setBkShippingLine={setBkShippingLine}
              bkContainerType={bkContainerType}
              setBkContainerType={setBkContainerType}
              bkQuantity={bkQuantity}
              setBkQuantity={setBkQuantity}
              bkContainers={bkContainers}
              setBkContainers={setBkContainers}
              bkCommodity={bkCommodity}
              setBkCommodity={setBkCommodity}
              bkCargoReadyDate={bkCargoReadyDate}
              setBkCargoReadyDate={setBkCargoReadyDate}
              bkVessel={bkVessel}
              setBkVessel={setBkVessel}
              bkVesselEtd={bkVesselEtd}
              setBkVesselEtd={setBkVesselEtd}
              bkVoyage={bkVoyage}
              setBkVoyage={setBkVoyage}
              bkPod={bkPod}
              setBkPod={setBkPod}
              bkContractNo={bkContractNo}
              setBkContractNo={setBkContractNo}
              bkAgreedRate={bkAgreedRate}
              setBkAgreedRate={setBkAgreedRate}
              bkRateRemark={bkRateRemark}
              setBkRateRemark={setBkRateRemark}
              bkDeliveryTerm={bkDeliveryTerm}
              setBkDeliveryTerm={setBkDeliveryTerm}
              bkHsCode={bkHsCode}
              setBkHsCode={setBkHsCode}
              bkBlType={bkBlType}
              setBkBlType={setBkBlType}
              bkBookingType={bkBookingType}
              setBkBookingType={setBkBookingType}
              bkReeferTemp={bkReeferTemp}
              setBkReeferTemp={setBkReeferTemp}
              bkDeliveryAgent={bkDeliveryAgent}
              setBkDeliveryAgent={setBkDeliveryAgent}
              bkSpecificRouting={bkSpecificRouting}
              setBkSpecificRouting={setBkSpecificRouting}
              bkRaNumber={bkRaNumber}
              setBkRaNumber={setBkRaNumber}
              formNote={formNote}
              setFormNote={setFormNote}
              linerList={linerList}
              bookings={bookings}
              vesselSchedules={vesselSchedules}
              activeEmployee={activeEmployee}
              activeRole={activeRole}
              handleModalSubmit={handleModalSubmit}
              handleAction={handleAction}
              onAddVesselSchedule={onAddVesselSchedule}
              onMarkBlVesselConfirmed={onMarkBlVesselConfirmed}
              onMarkBlBookingCreated={onMarkBlBookingCreated}
              onLogActivity={onLogActivity}
              onFlash={onFlash}
              setActionModal={setActionModal}
              setVesselCreatedPrompt={setVesselCreatedPrompt}
              setActiveStep={setActiveStep}
            />

          </div>
        ) : (
          <div style={{ maxWidth: 420, margin: '60px auto 0', textAlign: 'center' }}>
            <Inbox size={40} style={{ color: 'var(--text-muted)', marginBottom: 14, opacity: 0.4 }} />
            <div style={{ fontSize: 17, fontWeight: 700, color: '#334155', marginBottom: 6 }}>All caught up</div>
            <div style={{ fontSize: 13, color: '#94a3b8' }}>No items need your attention in this step.</div>
          </div>
        )}
      </div>
      </div>{/* end ws-split-body */}

      {/* Step Navigation Bar */}
      <div style={{
        position: 'sticky',
        bottom: 0,
        left: 0,
        right: 0,
        background: 'var(--bg-card)',
        borderTop: '1px solid var(--border)',
        zIndex: 10,
        boxShadow: '0 -2px 12px rgba(0,0,0,0.04)',
        transition: 'max-height 0.2s ease',
        overflow: 'hidden',
      }}>
        {/* Collapse / expand toggle bar */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 14px', height: 28, borderBottom: stepRibbonOpen ? '1px solid var(--border)' : 'none',
        }}>
          <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
            {stepRibbonOpen ? 'Steps' : (() => {
              const active = roleSteps.find(s => s.key === effectiveStep)
              return active ? `Step ${active.stepNumber} — ${active.label}` : 'Steps'
            })()}
          </span>
          <button onClick={() => setStepRibbonOpen(o => !o)} title={stepRibbonOpen ? 'Collapse steps' : 'Expand steps'}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 2, display: 'flex', alignItems: 'center' }}>
            <ChevronDown size={14} style={{ transform: stepRibbonOpen ? 'rotate(0deg)' : 'rotate(180deg)', transition: 'transform 0.2s' }} />
          </button>
        </div>
        {stepRibbonOpen && <div style={{
          padding: '10px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: 0,
          overflowX: 'auto',
        }}>
        {(() => {
          // Group consecutive steps that share a group tag
          const chunks: (StepDef | StepDef[])[] = []
          let ci = 0
          while (ci < roleSteps.length) {
            const s = roleSteps[ci]
            if (s.group) {
              const grp: StepDef[] = [s]
              while (ci + 1 < roleSteps.length && roleSteps[ci + 1].group === s.group) {
                grp.push(roleSteps[++ci])
              }
              chunks.push(grp)
            } else {
              chunks.push(s)
            }
            ci++
          }

          const renderStepBtn = (step: StepDef, compact?: boolean) => {
            const count = stepCounts[step.key] ?? 0
            const isActive = effectiveStep === step.key
            const isGroupAvailable = step.group ? (groupHasItems[step.group] ?? false) : false
            const isEmpty = count === 0 && !isGroupAvailable
            const isGreyedOut = false
            return (
              <button
                key={step.key}
                onClick={() => { if (!isGreyedOut) setActiveStep(step.key) }}
                style={{
                  display: 'flex',
                  flexDirection: compact ? 'row' : 'column',
                  alignItems: 'center',
                  gap: compact ? 6 : 3,
                  padding: compact ? '3px 10px' : '6px 14px',
                  minWidth: compact ? undefined : 80,
                  border: 'none',
                  borderRadius: compact ? 6 : 10,
                  cursor: isGreyedOut ? 'not-allowed' : 'pointer',
                  background: isActive && !isGreyedOut ? roleColor + '12' : 'transparent',
                  transition: 'background 0.15s',
                  flexShrink: 0,
                  position: 'relative',
                  opacity: isGreyedOut ? 0.35 : 1,
                  pointerEvents: isGreyedOut ? 'none' as const : undefined,
                }}
              >
                <div style={{
                  width: compact ? 18 : 26,
                  height: compact ? 18 : 26,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: compact ? 9 : 11,
                  fontWeight: 700,
                  background: isGreyedOut ? 'rgba(0,0,0,0.06)' : isActive ? roleColor : isEmpty ? 'rgba(0,0,0,0.06)' : roleColor + '18',
                  color: isGreyedOut ? '#aaa' : isActive ? '#fff' : isEmpty ? 'var(--text-muted)' : roleColor,
                  transition: 'all 0.15s',
                  flexShrink: 0,
                }}>
                  {step.stepNumber}
                </div>
                <span style={{
                  fontSize: compact ? 9 : 10,
                  fontWeight: isActive && !isGreyedOut ? 700 : 600,
                  color: isGreyedOut ? '#aaa' : isActive ? roleColor : isEmpty ? 'var(--text-muted)' : 'var(--text-secondary)',
                  whiteSpace: 'nowrap',
                  transition: 'color 0.15s',
                }}>
                  {step.label}
                </span>
                {count > 0 && (
                  <span style={{
                    ...(compact ? {} : { position: 'absolute' as const, top: 2, right: 6 }),
                    minWidth: compact ? 14 : 16,
                    height: compact ? 14 : 16,
                    borderRadius: compact ? 7 : 8,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: compact ? 8 : 9,
                    fontWeight: 700,
                    background: isActive ? roleColor : '#ef4444',
                    color: '#fff',
                    padding: '0 3px',
                    lineHeight: 1,
                    marginLeft: compact ? 'auto' : undefined,
                  }}>
                    {count}
                  </span>
                )}
              </button>
            )
          }

          return chunks.map((chunk, idx) => {
            if (Array.isArray(chunk)) {
              return (
                <div key={`grp-${idx}`} style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                  <div style={{
                    width: 3,
                    alignSelf: 'stretch',
                    background: `${roleColor}30`,
                    borderRadius: 2,
                    margin: '2px 0',
                  }} />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {chunk.map(s => renderStepBtn(s, true))}
                  </div>
                </div>
              )
            }
            return renderStepBtn(chunk as StepDef)
          })
        })()}
      </div>}
      </div>

      {/* Action Modal — extracted to ModalStepForms */}
      <ModalStepForms
        actionModal={actionModal}
        setActionModal={setActionModal}
        formDecision={formDecision}
        setFormDecision={setFormDecision}
        formNote={formNote}
        setFormNote={setFormNote}
        formVessel={formVessel}
        setFormVessel={setFormVessel}
        formVoyage={formVoyage}
        setFormVoyage={setFormVoyage}
        quotationContent={quotationContent}
        setQuotationContent={setQuotationContent}
        quoteCopied={quoteCopied}
        setQuoteCopied={setQuoteCopied}
        selectedRateOptionIds={selectedRateOptionIds}
        setSelectedRateOptionIds={setSelectedRateOptionIds}
        bestRateOptionId={bestRateOptionId}
        setBestRateOptionId={setBestRateOptionId}
        sendMethod={sendMethod}
        setSendMethod={setSendMethod}
        waConfirmed={waConfirmed}
        setWaConfirmed={setWaConfirmed}
        emailConfirmed={emailConfirmed}
        setEmailConfirmed={setEmailConfirmed}
        draftCollapsed={draftCollapsed}
        setDraftCollapsed={setDraftCollapsed}
        customerContactEmail={customerContactEmail}
        setCustomerContactEmail={setCustomerContactEmail}
        customerContactPhone={customerContactPhone}
        setCustomerContactPhone={setCustomerContactPhone}
        kycSending={kycSending}
        quotationSending={quotationSending}
        blDecision={blDecision}
        setBlDecision={setBlDecision}
        masterBlNumber={masterBlNumber}
        setMasterBlNumber={setMasterBlNumber}
        masterBlShipper={masterBlShipper}
        setMasterBlShipper={setMasterBlShipper}
        masterBlConsignee={masterBlConsignee}
        setMasterBlConsignee={setMasterBlConsignee}
        houseBlNumber={houseBlNumber}
        setHouseBlNumber={setHouseBlNumber}
        houseBlShipper={houseBlShipper}
        setHouseBlShipper={setHouseBlShipper}
        houseBlConsignee={houseBlConsignee}
        setHouseBlConsignee={setHouseBlConsignee}
        jobRefNumber={jobRefNumber}
        setJobRefNumber={setJobRefNumber}
        siIsNvocc={siIsNvocc}
        siField={siField}
        hblField={hblField}
        mblField={mblField}
        customers={customers}
        linerList={linerList}
        activeEmployee={activeEmployee}
        handleModalSubmit={handleModalSubmit}
      />


      {/* ── "Create Booking?" prompt ── */}
      {vesselCreatedPrompt && (
        <VesselCreatedPrompt
          prompt={vesselCreatedPrompt}
          bookings={bookings}
          onDismiss={() => setVesselCreatedPrompt(null)}
          onCreateBooking={(p, bkg) => {
            pendingVesselForBooking.current = { ...p }
            setVesselCreatedPrompt(null)
            setActiveStep('cs-bl-booking')
            handleAction({
              type: 'booking', refId: bkg.id, customerName: bkg.customer_name,
              title: `Booking: ${bkg.id}`, subtitle: `${bkg.origin} → ${bkg.destination}`,
              urgentFlag: bkg.is_urgent || false, createdAt: bkg.created_at || '',
              previousContext: null, actionLabel: 'Create Vessel Booking',
              actionKind: 'create-vessel-booking', sourceData: { booking: bkg },
            })
          }}
        />
      )}

    </div>
  )
}
