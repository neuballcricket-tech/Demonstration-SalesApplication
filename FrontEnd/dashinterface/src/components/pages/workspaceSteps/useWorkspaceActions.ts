// ---------------------------------------------------------------------------
// useWorkspaceActions -- extracted from Workspace.tsx
// Contains handleAction (~870 lines) and handleModalSubmit (~787 lines).
// This is a plain factory function (not a React hook) that returns callbacks.
// ---------------------------------------------------------------------------

import type React from 'react'
import {
  WORKFLOW_STAGES, ROLE_LABELS, stageRoleLabel,
  type Inquiry, type Booking, type Customer,
  type ActivityEntry, type WorkflowStage,
  type ContainerLine, type LinerRecord, type ClientRecord,
  type ReleaseOrderFields, type VesselSchedule,
  type QuoteStatus, type KycStatus, type UserRole,
} from '../../../types'
import type { CompletedRateRequest } from '../../../types'
import {
  apiCreateKycRequest, apiCreateQuotation, apiPatchQuotation,
  apiMarkQuotationSent, apiRecordQuotationResponse,
  apiUpdateKycStage, apiUploadQuotationDocument, BACKEND_ACTOR_ID,
  type KycPendingClient, type KycRequestRecord,
  type QuotationOptionPayload, type QuotationOptionRow,
} from '../../../api'
import type { WorkspaceItem, StepDef, BlContainerRow, MblContainerRow, QuotationOptionOverride } from './types'
import { buildRateSection, buildQuotationHtml, generateQuotationPdfBlob, generateReleaseOrderDraft, openMailto, empName } from './utils'
import { NVOCC_LINES } from './constants'

// ---------------------------------------------------------------------------
// Module-scope cache: inq_id → quote_id
// Survives React re-renders and Workspace remounts (but not full page refresh).
// Backed by sessionStorage for page-refresh survival.
// ---------------------------------------------------------------------------
const QUOTE_CACHE_KEY = 'ws_inq_quote_map'

/** Short, user-facing text for an API error. */
function errorText(err: unknown): string {
  return (err instanceof Error ? err.message : String(err)).slice(0, 160)
}

function saveQuotationId(inqId: number, quoteId: number) {
  try {
    const raw = sessionStorage.getItem(QUOTE_CACHE_KEY)
    const map: Record<string, number> = raw ? JSON.parse(raw) : {}
    map[String(inqId)] = quoteId
    sessionStorage.setItem(QUOTE_CACHE_KEY, JSON.stringify(map))
  } catch { /* storage unavailable */ }
}

export function lookupQuotationId(inqId: number | undefined): number | null {
  if (!inqId) return null
  try {
    const raw = sessionStorage.getItem(QUOTE_CACHE_KEY)
    if (!raw) return null
    const map: Record<string, number> = JSON.parse(raw)
    return map[String(inqId)] ?? null
  } catch { return null }
}

// ---------------------------------------------------------------------------
// Params interface
// ---------------------------------------------------------------------------

export interface UseWorkspaceActionsParams {
  customers: Customer[]
  inquiries: Inquiry[]
  activityLog: ActivityEntry[]
  clientList: ClientRecord[]
  linerList: LinerRecord[]
  vesselSchedules: VesselSchedule[]
  activeRole: UserRole
  activeEmployee: { id: number; name: string }
  roleSteps: StepDef[]
  actionModal: WorkspaceItem | null
  selectedItem: WorkspaceItem | null
  pendingVesselForBooking: React.MutableRefObject<{ vesselName: string; voyageNumber: string; pol: string; fpod: string; etdPol: string; etaFpod: string } | null>
  formVessel: string
  formVoyage: string
  formNote: string
  formDecision: 'approve' | 'reject'
  lastQuotationId: number | null
  quotationContent: string
  selectedRateOptionIds: Set<number>
  bestRateOptionId: number | null
  optionOverrides: Record<number, QuotationOptionOverride>
  sendMethod: 'email' | 'whatsapp'
  customerContactEmail: string
  customerContactPhone: string
  customerDecision: 'accepted' | 'rejected'
  linerBooked: 'yes' | 'no' | ''
  selectedOptionRateId: number | null
  bkShippingLine: string
  bkContainerType: string
  bkQuantity: number
  bkContainers: { type: string; qty: number }[]
  bkCommodity: string
  bkCargoReadyDate: string
  bkVessel: string
  bkVesselEtd: string
  bkVoyage: string
  bkPod: string
  bkContractNo: string
  bkAgreedRate: string
  bkRateRemark: string
  bkDeliveryTerm: string
  bkHsCode: string
  bkBlType: 'OBL' | 'Seaway Bill' | ''
  bkBookingType: 'Spot' | 'FAK' | ''
  bkReeferTemp: string
  bkDeliveryAgent: string
  bkSpecificRouting: string
  bkRaNumber: string
  roFields: ReleaseOrderFields
  blDecision: 'approved' | 'changes-requested'
  masterBlNumber: string
  masterBlShipper: string
  masterBlConsignee: string
  houseBlNumber: string
  houseBlShipper: string
  houseBlConsignee: string
  cutoffLiner: string
  cutoffSiDate: string
  cutoffBlDate: string
  cutoffVgmDate: string
  cutoffFilingDate: string
  cutoffNotes: string
  siContent: string
  vgmCertFileName: string
  jobRefNumber: string
  kycBrNumber: string
  kycParentOrg: string
  kycDeadline: string
  kycCliType: string
  kycCurrency: string
  kycWebsite: string
  kycSvatNo: string
  kycTaxExemptions: string
  kycSeaImports: boolean
  kycSeaExports: boolean
  kycTradeLanes: boolean
  kycForwarding: boolean
  kycCrossTrade: boolean
  kycAirImports: boolean
  kycAirExports: boolean
  kycGeneralCargo: boolean
  kycDangerousGoods: boolean
  kycPerishableGoods: boolean
  kycDocBrForm: string
  kycDocVatCert: string
  kycDocSvatCert: string
  kycDocTinCert: string
  kycDocForm20: string
  mblSelectedHblIds: string[]
  siIsNvocc: boolean
  siEmailDraft: string
  quotationOptions: QuotationOptionRow[]
  hblField: (key: string) => string
  mblField: (key: string) => string
  siField: (key: string) => string
  paField: (key: string) => string

  setActionModal: React.Dispatch<React.SetStateAction<WorkspaceItem | null>>
  setActiveStep: React.Dispatch<React.SetStateAction<string | null>>
  setFormVessel: React.Dispatch<React.SetStateAction<string>>
  setFormVoyage: React.Dispatch<React.SetStateAction<string>>
  setFormNote: React.Dispatch<React.SetStateAction<string>>
  setFormDecision: React.Dispatch<React.SetStateAction<'approve' | 'reject'>>
  setKycSending: React.Dispatch<React.SetStateAction<boolean>>
  setKycBrNumber: React.Dispatch<React.SetStateAction<string>>
  setKycParentOrg: React.Dispatch<React.SetStateAction<string>>
  setKycDeadline: React.Dispatch<React.SetStateAction<string>>
  setKycCliType: React.Dispatch<React.SetStateAction<string>>
  setKycCurrency: React.Dispatch<React.SetStateAction<string>>
  setKycWebsite: React.Dispatch<React.SetStateAction<string>>
  setKycSvatNo: React.Dispatch<React.SetStateAction<string>>
  setKycTaxExemptions: React.Dispatch<React.SetStateAction<string>>
  setKycSeaImports: React.Dispatch<React.SetStateAction<boolean>>
  setKycSeaExports: React.Dispatch<React.SetStateAction<boolean>>
  setKycTradeLanes: React.Dispatch<React.SetStateAction<boolean>>
  setKycForwarding: React.Dispatch<React.SetStateAction<boolean>>
  setKycCrossTrade: React.Dispatch<React.SetStateAction<boolean>>
  setKycAirImports: React.Dispatch<React.SetStateAction<boolean>>
  setKycAirExports: React.Dispatch<React.SetStateAction<boolean>>
  setKycGeneralCargo: React.Dispatch<React.SetStateAction<boolean>>
  setKycDangerousGoods: React.Dispatch<React.SetStateAction<boolean>>
  setKycPerishableGoods: React.Dispatch<React.SetStateAction<boolean>>
  setKycDocBrForm: React.Dispatch<React.SetStateAction<string>>
  setKycDocVatCert: React.Dispatch<React.SetStateAction<string>>
  setKycDocSvatCert: React.Dispatch<React.SetStateAction<string>>
  setKycDocTinCert: React.Dispatch<React.SetStateAction<string>>
  setKycDocForm20: React.Dispatch<React.SetStateAction<string>>
  setQuotationContent: React.Dispatch<React.SetStateAction<string>>
  setQuoteCopied: React.Dispatch<React.SetStateAction<boolean>>
  setSelectedRateOptionIds: React.Dispatch<React.SetStateAction<Set<number>>>
  setBestRateOptionId: React.Dispatch<React.SetStateAction<number | null>>
  setOptionOverrides: React.Dispatch<React.SetStateAction<Record<number, QuotationOptionOverride>>>
  setSendMethod: React.Dispatch<React.SetStateAction<'email' | 'whatsapp'>>
  setWaConfirmed: React.Dispatch<React.SetStateAction<boolean>>
  setEmailConfirmed: React.Dispatch<React.SetStateAction<boolean>>
  setDraftCollapsed: React.Dispatch<React.SetStateAction<boolean>>
  setCustomerContactEmail: React.Dispatch<React.SetStateAction<string>>
  setCustomerContactPhone: React.Dispatch<React.SetStateAction<string>>
  setQuotationSending: React.Dispatch<React.SetStateAction<boolean>>
  setCustomerDecision: React.Dispatch<React.SetStateAction<'accepted' | 'rejected'>>
  setLinerBooked: React.Dispatch<React.SetStateAction<'yes' | 'no' | ''>>
  setLastQuotationId: React.Dispatch<React.SetStateAction<number | null>>
  setQuotationOptions: React.Dispatch<React.SetStateAction<QuotationOptionRow[]>>
  setSelectedOptionRateId: React.Dispatch<React.SetStateAction<number | null>>
  setQuotationOptionsLoading: React.Dispatch<React.SetStateAction<boolean>>
  setBkShippingLine: React.Dispatch<React.SetStateAction<string>>
  setBkContainerType: React.Dispatch<React.SetStateAction<string>>
  setBkQuantity: React.Dispatch<React.SetStateAction<number>>
  setBkContainers: React.Dispatch<React.SetStateAction<{ type: string; qty: number }[]>>
  setBkCommodity: React.Dispatch<React.SetStateAction<string>>
  setBkCargoReadyDate: React.Dispatch<React.SetStateAction<string>>
  setBkVessel: React.Dispatch<React.SetStateAction<string>>
  setBkVesselEtd: React.Dispatch<React.SetStateAction<string>>
  setBkVoyage: React.Dispatch<React.SetStateAction<string>>
  setBkPod: React.Dispatch<React.SetStateAction<string>>
  setBkContractNo: React.Dispatch<React.SetStateAction<string>>
  setBkAgreedRate: React.Dispatch<React.SetStateAction<string>>
  setBkRateRemark: React.Dispatch<React.SetStateAction<string>>
  setBkDeliveryTerm: React.Dispatch<React.SetStateAction<string>>
  setBkHsCode: React.Dispatch<React.SetStateAction<string>>
  setBkBlType: React.Dispatch<React.SetStateAction<'OBL' | 'Seaway Bill' | ''>>
  setBkBookingType: React.Dispatch<React.SetStateAction<'Spot' | 'FAK' | ''>>
  setBkReeferTemp: React.Dispatch<React.SetStateAction<string>>
  setBkDeliveryAgent: React.Dispatch<React.SetStateAction<string>>
  setBkSpecificRouting: React.Dispatch<React.SetStateAction<string>>
  setBkRaNumber: React.Dispatch<React.SetStateAction<string>>
  setRoFields: React.Dispatch<React.SetStateAction<ReleaseOrderFields>>
  setReleasePhase: React.Dispatch<React.SetStateAction<'review' | 'send'>>
  setReleaseDraft: React.Dispatch<React.SetStateAction<string>>
  setRoRefCollapsed: React.Dispatch<React.SetStateAction<boolean>>
  setCutoffBookingId: React.Dispatch<React.SetStateAction<string>>
  setCutoffLiner: React.Dispatch<React.SetStateAction<string>>
  setCutoffMode: React.Dispatch<React.SetStateAction<'paste' | 'upload'>>
  setCutoffContent: React.Dispatch<React.SetStateAction<string>>
  setCutoffFileName: React.Dispatch<React.SetStateAction<string>>
  setCutoffNotes: React.Dispatch<React.SetStateAction<string>>
  setCutoffSiDate: React.Dispatch<React.SetStateAction<string>>
  setCutoffBlDate: React.Dispatch<React.SetStateAction<string>>
  setCutoffVgmDate: React.Dispatch<React.SetStateAction<string>>
  setCutoffFilingDate: React.Dispatch<React.SetStateAction<string>>
  setSiContent: React.Dispatch<React.SetStateAction<string>>
  setSiFileName: React.Dispatch<React.SetStateAction<string>>
  setSiMode: React.Dispatch<React.SetStateAction<'paste' | 'upload'>>
  setInttraSiLoading: React.Dispatch<React.SetStateAction<boolean>>
  setVgmCertFileName: React.Dispatch<React.SetStateAction<string>>
  setVgmCertContent: React.Dispatch<React.SetStateAction<string>>
  setJobRefNumber: React.Dispatch<React.SetStateAction<string>>
  setVesselScheduleType: React.Dispatch<React.SetStateAction<'FCL' | 'CONSOL' | 'BOTH'>>
  setVesselPol: React.Dispatch<React.SetStateAction<string>>
  setVesselEtaPol: React.Dispatch<React.SetStateAction<string>>
  setVesselEtdPol: React.Dispatch<React.SetStateAction<string>>
  setVesselRoutingType: React.Dispatch<React.SetStateAction<'DIRECT' | 'TRANSSHIPMENT'>>
  setVesselFinalPod: React.Dispatch<React.SetStateAction<string>>
  setVesselEtaFpod: React.Dispatch<React.SetStateAction<string>>
  setVesselRemarks: React.Dispatch<React.SetStateAction<string>>
  setVesselAgent: React.Dispatch<React.SetStateAction<string>>
  setSelectedReleaseOrderId: React.Dispatch<React.SetStateAction<string>>
  setShowVesselSuggestions: React.Dispatch<React.SetStateAction<boolean>>
  setBlDecision: React.Dispatch<React.SetStateAction<'approved' | 'changes-requested'>>
  setMasterBlNumber: React.Dispatch<React.SetStateAction<string>>
  setMasterBlShipper: React.Dispatch<React.SetStateAction<string>>
  setMasterBlConsignee: React.Dispatch<React.SetStateAction<string>>
  setHouseBlNumber: React.Dispatch<React.SetStateAction<string>>
  setHouseBlShipper: React.Dispatch<React.SetStateAction<string>>
  setHouseBlConsignee: React.Dispatch<React.SetStateAction<string>>
  setSiForm: React.Dispatch<React.SetStateAction<Record<string, string>>>
  setSiIsNvocc: React.Dispatch<React.SetStateAction<boolean>>
  setSiEmailShow: React.Dispatch<React.SetStateAction<boolean>>
  setSiEmailDraft: React.Dispatch<React.SetStateAction<string>>
  setSiLinerEmail: React.Dispatch<React.SetStateAction<string>>
  setHblForm: React.Dispatch<React.SetStateAction<Record<string, string>>>
  setHblContainers: React.Dispatch<React.SetStateAction<BlContainerRow[]>>
  setHblCollapsed: React.Dispatch<React.SetStateAction<Record<string, boolean>>>
  setMblForm: React.Dispatch<React.SetStateAction<Record<string, string>>>
  setMblContainers: React.Dispatch<React.SetStateAction<MblContainerRow[]>>
  setMblSelectedHblIds: React.Dispatch<React.SetStateAction<string[]>>
  setMblHblSearch: React.Dispatch<React.SetStateAction<string>>
  setPaForm: React.Dispatch<React.SetStateAction<Record<string, string>>>
  setBkgForm: React.Dispatch<React.SetStateAction<Record<string, string>>>
  setBlActiveTab: React.Dispatch<React.SetStateAction<'mbl' | 'hbl'>>
  setPaCopied: React.Dispatch<React.SetStateAction<boolean>>
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
    containers?: { type: string; qty: number }[];
  }) => string
  onSetBookingSiCutoff: (bookingId: string, date: string) => void
  onSetBookingBlCutoff: (bookingId: string, date: string) => void
  onSetBookingVgmCutoff: (bookingId: string, date: string) => void
  onSetBookingFilingCutoff: (bookingId: string, date: string) => void
  onMarkSiRequested: (bookingId: string) => void
  onMarkSiSubmitted: (bookingId: string) => void
  onMarkDraftBlSent: (bookingId: string, jobReferenceNumber?: string) => void
  onMarkLinerBlGenerated: (bookingId: string) => void
  onMarkPreAdviceSent: (bookingId: string) => void
  onMarkPreAlertSent: (bookingId: string) => void
  onSetBlStatus: (bookingId: string, status: 'pending' | 'approved' | 'changes-requested') => void
  onRecordMasterBl: (bookingId: string, data: { master_bl_number: string; shipper: string; consignee: string }) => void
  onCreateHouseBl: (bookingId: string, data: { house_bl_number: string; shipper: string; consignee: string }) => void
  onSetQuoteStatus: (quoteId: string, status: QuoteStatus) => void
  onUpdateCustomerKyc: (customerName: string, kycStatus: KycStatus) => void
  onLogActivity: (entry: Omit<ActivityEntry, 'id' | 'timestamp'>) => void
  onFlash: (msg: string, action?: { label: string; onClick: () => void }) => void
  onStartRateCheck: (inquiry: Inquiry, container?: ContainerLine, variant?: 'procurement' | 'cs-sales') => void
  onSetKycPendingClients: React.Dispatch<React.SetStateAction<KycPendingClient[]>>
  onSetKycRequests: React.Dispatch<React.SetStateAction<KycRequestRecord[]>>
  onRefreshKycRequests: () => void
}

// ---------------------------------------------------------------------------
// Factory function
// ---------------------------------------------------------------------------

export function useWorkspaceActions(p: UseWorkspaceActionsParams) {
  // Destructure everything from params so the function bodies can reference
  // variables by their original names (identical to Workspace.tsx).
  const {
    customers, inquiries, activityLog, clientList, linerList, vesselSchedules,
    activeRole, activeEmployee,
    roleSteps, actionModal, selectedItem, pendingVesselForBooking,
    formVessel, formVoyage, formNote, formDecision,
    lastQuotationId, quotationContent, selectedRateOptionIds, bestRateOptionId,
    optionOverrides,
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
    setOptionOverrides,
    setSendMethod, setWaConfirmed, setEmailConfirmed, setDraftCollapsed,
    setCustomerContactEmail, setCustomerContactPhone, setQuotationSending,
    setCustomerDecision, setLinerBooked,
    setLastQuotationId, setQuotationOptions, setSelectedOptionRateId, setQuotationOptionsLoading,
    setBkShippingLine, setBkContainerType, setBkQuantity, setBkContainers,
    setBkCommodity, setBkCargoReadyDate, setBkVessel, setBkVesselEtd, setBkVoyage, setBkPod,
    setBkContractNo, setBkAgreedRate, setBkRateRemark, setBkDeliveryTerm,
    setBkHsCode, setBkBlType, setBkBookingType, setBkReeferTemp, setBkDeliveryAgent,
    setBkSpecificRouting, setBkRaNumber,
    setRoFields, setReleasePhase, setReleaseDraft,
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
    setPaForm, setBkgForm,
    onAdvanceWorkflow, onConfirmBooking, onMarkRaAssigned, onRevertBookingRequest,
    onAttachReleaseOrder, onReleaseBooking, onAcknowledgeProcurement, onCreateBooking,
    onSetBookingSiCutoff, onSetBookingBlCutoff, onSetBookingVgmCutoff, onSetBookingFilingCutoff,
    onMarkSiRequested, onMarkSiSubmitted,
    onMarkDraftBlSent, onMarkLinerBlGenerated, onMarkPreAdviceSent, onMarkPreAlertSent,
    onSetBlStatus, onRecordMasterBl, onCreateHouseBl,
    onSetQuoteStatus, onUpdateCustomerKyc,
    onLogActivity, onFlash, onStartRateCheck,
    onSetKycPendingClients, onSetKycRequests, onRefreshKycRequests,
  } = p

  // Suppress unused-variable warnings for destructured names that are only
  // referenced inside the large switch bodies below.
  void bkQuantity; void bkContainerType; void bestRateOptionId; void quotationOptions;
  void siContent; void cutoffBlDate;


  const handleAction = async (item: WorkspaceItem) => {
    switch (item.actionKind) {
      case 'advance-workflow': {
        const { inquiry, container } = item.sourceData
        const resolvedNext = item.sourceData.nextStage as string
        onAdvanceWorkflow(inquiry.id, resolvedNext as WorkflowStage)
        const nextStageObj = WORKFLOW_STAGES.find(s => s.id === resolvedNext)!
        onLogActivity({
          actor_role: activeRole,
          actor_id: activeEmployee.id,
          action: `Completed ${WORKFLOW_STAGES.find(s => s.id === inquiry.workflow_stage)?.label}. Pushed to ${stageRoleLabel(nextStageObj)}.`,
          ref_type: 'inquiry',
          ref_id: inquiry.id,
          customer_name: inquiry.customer_name,
          pushed_to: nextStageObj.roles[0],
          notes: `${inquiry.request} · ${inquiry.origin} → ${inquiry.destination}`,
        })
        // All inquiries go directly to Rate Check; open it immediately
        if (resolvedNext === 'rate-check') {
          onStartRateCheck(inquiry, container, 'cs-sales')
          return
        }
        // Map the destination workflow stage to the step that will handle items there
        const stageActionMap: Record<string, string> = {
          'rate-check': 'check-rates', 'procurement-request': 'check-inttra-rates',
          'quotation-prep': 'prepare-quotation', 'quotation-sent': 'send-to-customer',
          'customer-response': 'customer-response', 'booking-request': 'booking-request',
        }
        const destActionKind = stageActionMap[resolvedNext]
        const destStep = destActionKind ? roleSteps.find(s => s.actionKinds.includes(destActionKind)) : null
        const csOrSales = (r: string) => r === 'CS' || r === 'Sales'
        const nextRole = nextStageObj.roles[0]
        const crossDept = activeRole !== 'Admin' && nextRole !== activeRole &&
                          !(csOrSales(activeRole) && csOrSales(nextRole))
        onFlash(`${inquiry.id} pushed to ${ROLE_LABELS[nextRole]}`,
          !crossDept && destStep ? { label: `Go to ${destStep.label}`, onClick: () => setActiveStep(destStep.key) } : undefined)
        break
      }
      case 'acknowledge-procurement': {
        const { booking } = item.sourceData
        onAcknowledgeProcurement(booking.id)
        onLogActivity({
          actor_role: activeRole,
          actor_id: activeEmployee.id,
          action: `Acknowledged urgent booking ${booking.id}`,
          ref_type: 'booking',
          ref_id: booking.id,
          customer_name: booking.customer_name,
          pushed_to: 'CS',
          notes: 'Procurement acknowledged urgent bypass booking.',
        })
        break
      }
      case 'check-rates': {
        const { inquiry, container } = item.sourceData
        onStartRateCheck(inquiry, container, 'cs-sales')
        return
      }
      case 'check-inttra-rates': {
        const { inquiry, container } = item.sourceData
        onStartRateCheck(inquiry, container, 'procurement')
        return
      }
      case 'prepare-quotation': {
        // Pre-fill quotation document from saved rate request data (fetched from backend)
        const { inquiry: qInq, container: qCont, rateRequest: rr } = item.sourceData as {
          inquiry: Inquiry; container: ContainerLine; rateRequest?: CompletedRateRequest
        }

        // Initialize all options as selected; pick the first as best by default
        if (rr && rr.options.length > 0) {
          const allIds = new Set(rr.options.filter(o => o.rate).map(o => o.option_id))
          setSelectedRateOptionIds(allIds)
          setBestRateOptionId(rr.options.find(o => o.rate)?.option_id ?? null)
        } else {
          setSelectedRateOptionIds(new Set())
          setBestRateOptionId(null)
        }

        const qCust = customers.find(c => c.name.toLowerCase() === qInq.customer_name.toLowerCase())

        // Initialize per-option overrides from customer's min_margin_pct
        const defaultMargin = qCust?.min_margin_pct ?? 0
        const overrides: Record<number, QuotationOptionOverride> = {}
        if (rr) {
          for (const opt of rr.options) {
            if (!opt.rate) continue
            overrides[opt.option_id] = {
              margin: defaultMargin,
              isPercentage: true,
              remark: opt.rate.note ?? opt.rate.special_remark ?? '',
            }
          }
        }
        setOptionOverrides(overrides)

        // Build rate section text from selected saved rate options
        const allOptionIds = rr?.options.filter(o => o.rate).map(o => o.option_id) ?? []
        const firstBest = allOptionIds[0] ?? null
        const rateSection = buildRateSection(rr, allOptionIds, firstBest, linerList, item.previousContext)

        // Container / route details
        const dest = qCont?.destination || qInq.destination
        const containerLabel = qCont ? `${qCont.quantity}× ${qCont.containerType}` : ''
        const commodityLabel = qCont?.commodityType ? ` · ${qCont.commodityType}` : qInq.commodity_type ? ` · ${qInq.commodity_type}` : ''
        const today = new Date().toISOString().slice(0, 10)

        setQuotationContent(
`FREIGHT QUOTATION

To: ${qInq.customer_name}${qCust?.tier ? ` (${qCust.tier})` : ''}
Date: ${today}
Reference: ${qInq.id}

Dear ${qInq.customer_name},

Thank you for your freight enquiry. We are pleased to offer the following:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SHIPMENT DETAILS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Route:       ${qInq.origin} → ${dest}
Cargo:       ${containerLabel}${commodityLabel}${qInq.incoterm ? `\nIncoterm:    ${qInq.incoterm}` : ''}${qInq.cargo_ready_date ? `\nCargo Ready: ${qInq.cargo_ready_date}` : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RATE OPTIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${rateSection}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TERMS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Validity: 14 days from date of this quotation
• Rates subject to space and equipment availability
• Port surcharges, customs, and inland haulage quoted separately unless stated above

Please confirm your preferred option at your earliest convenience.

Best regards,
${activeEmployee.name}
CLSynergy (Pvt) Ltd`
        )
        setQuoteCopied(false)
        setFormNote('')
        setActionModal(item)
        break
      }
      case 'send-to-customer': {
        // CS sends quotation to customer — pre-fill contact details if available
        setFormNote('')
        const sendCust = customers.find(c => c.name.toLowerCase() === item.customerName.toLowerCase())
        setCustomerContactEmail(sendCust?.contact_email ?? '')
        setCustomerContactPhone(sendCust?.contact_phone ?? '')
        setSendMethod(sendCust?.contact_email ? 'email' : 'whatsapp')
        setWaConfirmed(false)
        setEmailConfirmed(false)
        setDraftCollapsed(false)   // start expanded so email/quotation preview is visible
        setQuotationSending(false)

        // Auto-hydrate rate option selections if not already set
        // (handles direct navigation to step 5 or page refresh)
        const stcRr = item.sourceData.rateRequest as CompletedRateRequest | undefined
        if (stcRr?.options && selectedRateOptionIds.size === 0) {
          const allIds = new Set(stcRr.options.filter(o => o.rate).map(o => o.option_id))
          setSelectedRateOptionIds(allIds)
          if (bestRateOptionId === null && allIds.size > 0) {
            setBestRateOptionId([...allIds][0])
          }
          // Initialize per-option margin overrides
          if (Object.keys(optionOverrides).length === 0) {
            const defaultMargin = sendCust?.min_margin_pct ?? 0
            const ovr: Record<number, QuotationOptionOverride> = {}
            for (const opt of stcRr.options) {
              if (!opt.rate) continue
              ovr[opt.option_id] = { margin: defaultMargin, isPercentage: true, remark: opt.rate.note ?? opt.rate.special_remark ?? '' }
            }
            setOptionOverrides(ovr)
          }
        }

        // Rebuild quotation preview text if empty (page refresh / direct navigation)
        if (!quotationContent && stcRr) {
          const qInq = item.sourceData.inquiry as Inquiry
          const qCont = item.sourceData.container as ContainerLine | undefined
          const allOptIds = stcRr.options.filter(o => o.rate).map(o => o.option_id)
          const rateSection = buildRateSection(stcRr, allOptIds, allOptIds[0] ?? null, linerList, item.previousContext)
          const dest = qCont?.destination || qInq.destination
          const containerLabel = qCont ? `${qCont.quantity}× ${qCont.containerType}` : ''
          const commodityLabel = qCont?.commodityType ? ` · ${qCont.commodityType}` : qInq.commodity_type ? ` · ${qInq.commodity_type}` : ''
          const today = new Date().toISOString().slice(0, 10)
          setQuotationContent(
`FREIGHT QUOTATION

To: ${qInq.customer_name}${sendCust?.tier ? ` (${sendCust.tier})` : ''}
Date: ${today}
Reference: ${qInq.id}

Dear ${qInq.customer_name},

Thank you for your freight enquiry. We are pleased to offer the following:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SHIPMENT DETAILS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Route:       ${qInq.origin} → ${dest}
Cargo:       ${containerLabel}${commodityLabel}${qInq.incoterm ? `\nIncoterm:    ${qInq.incoterm}` : ''}${qInq.cargo_ready_date ? `\nCargo Ready: ${qInq.cargo_ready_date}` : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RATE OPTIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${rateSection}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TERMS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Validity: 14 days from date of this quotation
• Rates subject to space and equipment availability
• Port surcharges, customs, and inland haulage quoted separately unless stated above

Please confirm your preferred option at your earliest convenience.

Best regards,
${activeEmployee.name}
CLSynergy (Pvt) Ltd`
          )
        }

        setActionModal(item)
        break
      }
      case 'customer-response': {
        setFormNote('')
        setCustomerDecision('accepted')
        setQuotationOptions([])
        setSelectedOptionRateId(null)
        setQuotationOptionsLoading(false)
        // Use pre-loaded options from sentQuotations (passed via sourceData)
        const sentOpts = item.sourceData?.sentOptions as Array<{ option_id: number | null; rate_id: number | null; vessel: string | null; voyage: string | null; amt: number | null; remark: string | null; margin: number | null; is_percentage: boolean | null; final_amt: number | null; option_currency: string | null }> | undefined
        if (sentOpts && sentOpts.length > 0) {
          // Map sentQuotation rows into the shape expected by quotationOptions
          const opts = sentOpts
            .filter(o => o.option_id != null)
            .map(o => ({
              option_id: o.option_id!,
              rate_id: o.rate_id,
              vessel: o.vessel,
              voyage: o.voyage,
              amt: o.amt,
              remark: o.remark,
              margin: o.margin,
              is_percentage: o.is_percentage,
              final_amt: o.final_amt,
              currency: o.option_currency,
            }))
          // Only the option_* fields are read downstream; quote-level fields are not available here
          setQuotationOptions(opts as unknown as QuotationOptionRow[])
          if (opts.length === 1) setSelectedOptionRateId(opts[0].rate_id)
        }
        setActionModal(item)
        break
      }
      case 'booking-request': {
        // Pre-fill from accepted quotation data (GET /quotations/accepted)
        const { inquiry: brInq, acceptedQuotation: aq } = item.sourceData
        setFormNote('')

        // Use accepted quotation data for structured pre-fill when available
        if (aq) {
          // Resolve liner name from lin_id
          const resolvedLiner = aq.lin_id ? linerList.find(l => l.lin_id === aq.lin_id)?.name ?? '' : ''
          const ctFmt = (ct: string) => ct.replace(/\s+/g, '').replace(/(\d{2})(.*)/,(_, sz: string, tp: string) => `${sz}'${tp}`)
          const fmtContainer = ctFmt(aq.container_type || "20GP")

          setBkShippingLine(resolvedLiner)
          setBkContainerType(fmtContainer)
          setBkQuantity(aq.qty || 1)
          setBkContainers([{ type: fmtContainer, qty: aq.qty || 1 }])
          setBkCommodity(brInq?.containers?.[0]?.commodityName ?? '')
          setBkCargoReadyDate(aq.cargo_ready_date ?? brInq?.cargo_ready_date ?? '')
          setBkDeliveryTerm(aq.delivery_term ?? brInq?.incoterm ?? '')
          setBkHsCode(aq.hs_code ?? brInq?.containers?.[0]?.hs_code ?? '')
          setBkVessel(aq.vessel ?? '')
          setBkVesselEtd(aq.vessel_etd ? aq.vessel_etd.split('T')[0] : '')
          setBkVoyage(aq.voyage ?? '')
          setBkPod(aq.destination ?? brInq?.destination ?? '')
          setBkAgreedRate(aq.agreed_rate != null ? String(aq.agreed_rate) : '')
          setBkRateRemark(aq.rate_remark ?? '')
          setBkContractNo('')
          setBkBlType('')
          setBkBookingType('')
          setBkReeferTemp('')
          setBkDeliveryAgent('')
          setBkSpecificRouting('')
        } else {
          // Fallback: legacy pre-fill from inquiry data + activity log
          const allCtx = activityLog.filter(a => a.ref_id === brInq.id)
          let liner = ''
          let container = ''
          let qty = ''
          for (const entry of allCtx) {
            const n = entry.notes ?? ''
            const rateMatch = n.match(/Selected rates?:\s*(\w[\w\s-]*?)\s+\$/i)
            if (rateMatch && !liner) liner = rateMatch[1].trim()
            const manualMatch = n.match(/Manual Rate:\s*(\w[\w\s-]*?)\s+\$/i)
            if (manualMatch && !liner) liner = manualMatch[1].trim()
            const cMatch = n.match(/(\d{2}['']?\s*(?:GP|HC|OT|FR|RF))/i)
            if (cMatch && !container) container = cMatch[1].replace(/\s/g, '')
            const qMatch = n.match(/(\d+)\s*x\s*\d{2}['']?\s*(?:GP|HC|OT|FR|RF)/i)
            if (qMatch && !qty) qty = qMatch[1]
          }
          if (!container) container = brInq.request?.match(/(\d{2}['']?\s*(?:GP|HC|OT|FR|RF))/i)?.[1]?.replace(/\s/g, '') ?? ''
          if (!qty) qty = brInq.request?.match(/(\d+)/)?.[1] ?? '1'
          if (!liner && brInq.preferred_liners?.length) liner = brInq.preferred_liners[0]

          setBkShippingLine(liner)
          setBkContainerType(container || "20'GP")
          setBkQuantity(parseInt(qty, 10) || 1)
          const ctFmt = (ct: string) => ct.replace(/\s+/g, '').replace(/(\d{2})(.*)/,(_, sz: string, tp: string) => `${sz}'${tp}`)
          if (brInq.containers && brInq.containers.length > 0) {
            setBkContainers(brInq.containers.map((c: { containerType: string; quantity: number }) => ({ type: ctFmt(c.containerType), qty: c.quantity })))
          } else {
            setBkContainers([{ type: container || "20'GP", qty: parseInt(qty, 10) || 1 }])
          }
          setBkCommodity(brInq.containers?.[0]?.commodityName ?? '')
          setBkCargoReadyDate(brInq.cargo_ready_date ?? '')
          setBkDeliveryTerm(brInq.incoterm ?? '')
          setBkHsCode(brInq.containers?.[0]?.hs_code ?? '')
          setBkVessel('')
          setBkVesselEtd('')
          setBkVoyage('')
          setBkPod(brInq.destination ?? '')
          setBkContractNo('')
          setBkAgreedRate('')
          setBkRateRemark('')
          setBkBlType('')
          setBkBookingType('')
          setBkReeferTemp('')
          setBkDeliveryAgent('')
          setBkSpecificRouting('')
        }
        setActionModal(item)
        break
      }
      case 'review-booking-request': {
        // Pre-fill all form fields by parsing the booking's stored notes
        const { booking: rbBkg } = item.sourceData
        const noteParts = (rbBkg.notes ?? '').split(' | ')
        const getNote = (prefix: string) =>
          noteParts.find((p: string) => p.startsWith(prefix + ':'))?.slice(prefix.length + 1).trim() ?? ''
        setBkShippingLine(rbBkg.shipping_line ?? '')
        setBkContainerType(rbBkg.container_type ?? "20'GP")
        setBkQuantity(rbBkg.quantity ?? 1)
        // Parse containers from notes: "Containers: 2x20'GP, 1x40'HC"
        const ctnNote = getNote('Containers')
        if (ctnNote) {
          const parsed = ctnNote.split(',').map((s: string) => s.trim()).map((s: string) => {
            const m = s.match(/(\d+)\s*x\s*(.+)/)
            return m ? { type: m[2].trim(), qty: parseInt(m[1], 10) || 1 } : null
          }).filter(Boolean) as { type: string; qty: number }[]
          setBkContainers(parsed.length > 0 ? parsed : [{ type: rbBkg.container_type ?? "20'GP", qty: rbBkg.quantity ?? 1 }])
        } else {
          setBkContainers([{ type: rbBkg.container_type ?? "20'GP", qty: rbBkg.quantity ?? 1 }])
        }
        setBkCommodity(getNote('Commodity'))
        setBkCargoReadyDate(getNote('Cargo Ready'))
        setBkVessel(getNote('Vessel'))
        setBkVesselEtd(rbBkg.vessel_etd ?? '')
        setBkVoyage(getNote('Voyage'))
        setBkPod(rbBkg.destination ?? '')
        setBkContractNo(getNote('Contract'))
        setBkAgreedRate(getNote('Rate'))
        setBkRateRemark(getNote('Rate Remark'))
        setBkDeliveryTerm(getNote('Term'))
        setBkHsCode(getNote('HS'))
        setBkBlType((getNote('BL') as 'OBL' | 'Seaway Bill' | '') || '')
        setBkBookingType(
          noteParts.includes('Spot Booking') ? 'Spot' :
          noteParts.includes('FAK Booking')  ? 'FAK' : ''
        )
        setBkReeferTemp(getNote('Reefer/PTI'))
        setBkDeliveryAgent(getNote('Agent'))
        setBkSpecificRouting(getNote('Routing'))
        setBkRaNumber('')
        setFormNote('')
        setActionModal(item)
        break
      }
      case 'attach-release-order': {
        setRoFields({
          reference_nbr: '', pickup_empty_date: '', validity_expiration_date: '',
          pickup_depot: '', pickup_depot_address: '', cargo_description: '',
          cargo_weight: '', cut_off_date: '', etd: '', eta: '',
          next_port_of_discharge: '', transport_mode: '', transport_carrier: '',
        })
        setFormNote('')
        setActionModal(item)
        break
      }
      case 'confirm-liner-booking': {
        setLinerBooked('')
        setFormNote('')
        setActionModal(item)
        break
      }
      case 'confirm-booking': {
        setFormVessel('')
        setFormVoyage('')
        setFormNote('')
        setActionModal(item)
        break
      }
      case 'release-booking': {
        setFormNote('')
        setReleasePhase('review')
        const sendCust = customers.find(c => c.name.toLowerCase() === item.customerName.toLowerCase())
        setCustomerContactEmail(sendCust?.contact_email ?? '')
        setCustomerContactPhone(sendCust?.contact_phone ?? '')
        const initMethod: 'email' | 'whatsapp' = sendCust?.contact_email ? 'email' : 'whatsapp'
        setSendMethod(initMethod)
        setWaConfirmed(false)
        setEmailConfirmed(false)
        setDraftCollapsed(true)
        setReleaseDraft(generateReleaseOrderDraft(item.sourceData.booking as Booking, initMethod, empName(activeEmployee.id)))
        setActionModal(item)
        break
      }
      case 'record-cutoff': {
        const bkg = item.sourceData.booking
        setCutoffBookingId(bkg.id)
        setCutoffLiner(bkg.shipping_line || '')
        setCutoffMode('paste')
        setCutoffContent('')
        setCutoffFileName('')
        setCutoffNotes('')
        setCutoffSiDate('')
        setCutoffBlDate('')
        setCutoffVgmDate('')
        setCutoffFilingDate('')
        setActionModal(item)
        break
      }
      case 'request-si': {
        setFormNote('')
        setVgmCertFileName('')
        setVgmCertContent('')
        const siCust = customers.find(c => c.name.toLowerCase() === item.customerName.toLowerCase())
        setCustomerContactEmail(siCust?.contact_email ?? '')
        setCustomerContactPhone(siCust?.contact_phone ?? '')
        setSendMethod(siCust?.contact_email ? 'email' : 'whatsapp')
        setWaConfirmed(false)
        setEmailConfirmed(false)
        setActionModal(item)
        break
      }
      case 'submit-si': {
        setSiContent('')
        setSiFileName('')
        setSiMode('paste')
        setInttraSiLoading(false)
        setVgmCertFileName('')
        setVgmCertContent('')
        setFormNote('')
        setActionModal(item)
        break
      }
      case 'save-vessel-schedule': {
        const vsInit = item.sourceData.booking as Booking
        setVesselScheduleType('FCL')
        setFormVessel(vsInit.vessel_name || '')
        setFormVoyage(vsInit.voyage_number || '')
        setVesselPol(vsInit.origin || '')
        setVesselEtaPol('')
        setVesselEtdPol('')
        setVesselRoutingType('DIRECT')
        setVesselFinalPod(vsInit.destination || '')
        setVesselEtaFpod('')
        setVesselRemarks('')
        setVesselAgent('')
        setSelectedReleaseOrderId('')
        setShowVesselSuggestions(false)
        setActionModal(item)
        break
      }
      case 'create-vessel-booking': {
        const blBkgInit = item.sourceData.booking as Booking
        // Pre-fill vessel strip — use pending vessel if user came from the vessel step prompt
        const pv = pendingVesselForBooking.current
        if (pv) {
          setFormVessel(pv.vesselName); setFormVoyage(pv.voyageNumber)
          setVesselPol(pv.pol); setVesselFinalPod(pv.fpod)
          setVesselEtdPol(pv.etdPol); setVesselEtaFpod(pv.etaFpod)
          pendingVesselForBooking.current = null
        } else {
          setFormVessel(blBkgInit.vessel_name || '')
          setFormVoyage(blBkgInit.voyage_number || '')
          setVesselPol(blBkgInit.origin || '')
          setVesselFinalPod(blBkgInit.destination || '')
          setVesselEtdPol(''); setVesselEtaFpod('')
        }
        setVesselRoutingType('DIRECT')
        // Phase 2 booking form — prefill from booking + customer
        const blCust = customers.find(c => c.name.toLowerCase() === item.customerName.toLowerCase())
        // Look up the related inquiry by customer name for commodity / weight / incoterm
        const blInq = inquiries.find(i => i.customer_name.toLowerCase() === item.customerName.toLowerCase())
        const blCommodity = blInq?.containers?.[0]?.commodityName || blInq?.commodity_type || ''
        const blGoodsDesc = blInq?.containers?.[0]?.commodityName || ''
        const blPackageType = blInq?.containers?.[0]?.containerType || blBkgInit.container_type || ''
        // Map delivery_type → Gensoft CY/CY notation
        const deliveryTypeToBkg = (dt?: string) => {
          if (dt === 'door-to-door') return 'CY/DR'
          if (dt === 'port-to-door') return 'CY/DR'
          if (dt === 'door-to-port') return 'DR/CY'
          return 'CY/CY'
        }
        // Map customer tier → Gensoft customer category
        const tierToCategory = (tier?: string) => {
          if (tier === 'Key Account') return 'KEY ACCOUNT'
          return 'DIRECT'
        }
        setBkgForm({
          customer_category: tierToCategory(blCust?.tier),
          business_type: 'SALES NOMINATION',
          revenue_type: 'FREIGHT FORWARDING',
          customer: blBkgInit.customer_name || '',
          billing_party: blBkgInit.customer_name || '',
          sales_person: activeEmployee.name || '',
          cs_executive: '',
          documentation_by: '',
          inquiry_ref: blInq?.id || blBkgInit.id || '',
          quotation_ref: blBkgInit.quote_id || '',
          fcl_cutoff_date: blBkgInit.si_cutoff_date || '',
          lcl_cutoff_date: '',
          shipper_name: blBkgInit.customer_name || '',
          shipper_address: blCust?.location || '',
          actual_shipper: blBkgInit.customer_name || '',
          contact_person: blCust?.contact_person || '',
          telephone: blCust?.contact_phone || '',
          email_address: blCust?.contact_email || '',
          consignee: '',
          consignee_address: '',
          notify: blBkgInit.customer_name || '',
          notify_address: blCust?.location || '',
          commodity: blCommodity,
          receiving_terminal: blBkgInit.origin || '',   // vessel POL will override on Phase 1 → 2
          final_destination: blBkgInit.destination || '',
          transit_days: '',                              // computed on Phase 1 → 2
          eta_final_destination: '',                     // filled on Phase 1 → 2
          place_of_delivery: blBkgInit.destination || '',
          eta_place_of_delivery: '',                     // filled on Phase 1 → 2
          carrier: blBkgInit.shipping_line || '',
          booking_carrier_ref: '',
          intra_booking_no: '',
          po_no: '',
          email_ref: '',
          cargo_type: blInq?.commodity_type?.toLowerCase().includes('refrigerated') ? 'REEFER'
            : blInq?.commodity_type?.toLowerCase().includes('hazardous') ? 'HAZMAT'
            : 'GENERAL',
          freight_term: 'PREPAID',
          mbl_term: 'PREPAID',
          no_of_packages: blInq?.container_qty ? String(blInq.container_qty) : String(blBkgInit.quantity || ''),
          package_type: blPackageType,
          gross_weight: blInq?.cargo_weight ? String(blInq.cargo_weight) : '',
          volume_cbm: '',
          weight_measurement_ratio: '',
          container_size: blBkgInit.container_type || '',
          container_count: String(blBkgInit.quantity || 1),
          delivery_type_bkg: deliveryTypeToBkg(blBkgInit.delivery_type),
          incoterm: blInq?.incoterm || '',
          pickup_type: '',
          inland_haulage_type: '',
          bl_issue_type: 'OWN',
          hbl_issue_term: '',
          mbl_issue_term: '',
          bl_format: '',
          bl_number: blBkgInit.master_bl_number || '',
          shipping_bill_no: '',
          bl_cutoff_date: blBkgInit.bl_cutoff_date || '',
          bl_cutoff_time: '',
          vgm_cutoff_date: blBkgInit.vgm_cutoff_date || '',
          vgm_cutoff_time: '',
          destination_charges: 'COLLECT',
          permit_no: '',
          sob_date: '',                                  // filled on Phase 1 → 2 (ETD POL)
          marks_and_numbers: blInq?.remark || '',
          description_of_goods: blGoodsDesc,
          bl_instructions: '',
          remarks_customer: '',
          remarks_internal: blBkgInit.notes || '',
        })
        setFormNote('')
        setActionModal(item)
        break
      }
      case 'save-draft-bl': {
        const sdbInit = item.sourceData.booking as Booking
        setJobRefNumber(sdbInit.job_reference_number || '')
        setFormNote('')
        setActionModal(item)
        break
      }
      case 'generate-si': {
        const siBkg = item.sourceData.booking as Booking
        const siCust = customers.find(c => c.name.toLowerCase() === item.customerName.toLowerCase())
        const siInq = inquiries.find(i => i.customer_name.toLowerCase() === item.customerName.toLowerCase())
        const deliveryMap: Record<string, string> = { 'port-to-port': 'CY/CY', 'door-to-door': 'SD/SD', 'port-to-door': 'CY/SD' }
        setSiIsNvocc(NVOCC_LINES.has(siBkg.shipping_line))
        setSiEmailShow(false)
        setSiEmailDraft('')
        setSiLinerEmail('')
        setSiForm({
          to_liner: siBkg.shipping_line || '',
          attn: 'B/L DEPARTMENT',
          bl_type: 'ORIGINAL',
          booking_ref: siBkg.id || '',
          job_ref: siBkg.job_reference_number || '',
          shipper_name: siBkg.customer_name || '',
          shipper_address: siCust?.location || '',
          consignee_name: siBkg.master_bl_consignee || siBkg.house_bl_consignee || '',
          consignee_address: '',
          notify_name: '',
          notify_address: '',
          vessel: siBkg.vessel_name || '',
          voyage: siBkg.voyage_number || '',
          delivery_type: deliveryMap[siBkg.delivery_type || ''] || 'CY/CY',
          place_of_receipt: siBkg.origin || '',
          pol: siBkg.origin || '',
          pod: siBkg.destination || '',
          sob_date: '',
          container_no: '',
          seal_no: '',
          container_size: siBkg.container_type || '',
          marks_and_numbers: siInq?.remark || '',
          description_of_goods: siInq?.containers?.[0]?.commodityName || siInq?.commodity_type || '',
          weight_kgs: siInq?.cargo_weight ? String(siInq.cargo_weight) : '',
          volume_m3: '',
          freight: 'PREPAID',
          total_containers: `${siBkg.quantity || 1}x ${siBkg.container_type || ''}`,
          shipped_on_board: 'YES',
        })
        setFormNote('')
        setActionModal(item)
        break
      }
      case 'create-hbl': {
        const hblBkg = item.sourceData.booking as Booking
        const hblCust = customers.find(c => c.name.toLowerCase() === item.customerName.toLowerCase())
        const hblInq = inquiries.find(i => i.customer_name.toLowerCase() === item.customerName.toLowerCase())
        const hblVessel = vesselSchedules
          .filter(vs => vs.vessel_name === hblBkg.vessel_name && vs.voyage_number === hblBkg.voyage_number)
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
        const deliveryMap3: Record<string, string> = { 'port-to-port': 'CY/CY', 'door-to-door': 'DOOR/DOOR', 'port-to-door': 'CY/CFS', 'door-to-port': 'CFS/CY' }
        const parsedSizeH = (hblBkg.container_type || '').match(/(\d+)/)?.[1] || '20'
        const parsedTypeH = (hblBkg.container_type || '').replace(/\d+'\s*/, '').replace(/'/g, '') || 'GP'

        setHblForm({
          // Section 1: Job & Header Information
          jobNumber: hblBkg.job_reference_number || '',
          vesselVoyage: `${hblBkg.vessel_name || ''} / ${hblBkg.voyage_number || ''}`,
          etaColombo: hblVessel?.eta_fpod || '',
          sobDate: hblVessel?.etd_pol || '',
          warehouse: '', yardDepot: '',
          fclCutOff: hblBkg.bl_cutoff_date || '',
          noOfCntrType: `${hblBkg.quantity || 1}x ${hblBkg.container_type || ''}`,
          hdrRemarks: '',
          hdrDestination: hblBkg.destination || '',
          etaDestination: hblVessel?.eta_fpod || '',
          destinationAgent: '',
          carrier: hblBkg.shipping_line || '',
          carrierRef: '', exchangeRate: '',
          containerTypeDropdown: hblBkg.container_type || '',
          // Section 2: B/L Details
          branch: 'COLOMBO', bookingNo: hblBkg.id || '', shipmentCategory: 'LOCAL EXPORT',
          blType: hblBkg.bl_type || 'OWN', houseBlNo: hblBkg.house_bl_number || '', customBlNo: '',
          sttNo: '', hsCode: hblInq?.containers?.[0]?.hs_code || hblBkg.hs_code || '',
          // Section 3: Shipper / Consignee / Notify
          shipperName: hblBkg.house_bl_shipper || hblBkg.customer_name || '',
          shipperAddress: hblCust?.location || '',
          shipperRef: '', displayOnShipperInvoice: '0',
          emailRef: hblCust?.contact_email || '',
          consigneeName: hblBkg.house_bl_consignee || '',
          consigneeAddress: '', notifyType: '', notifyName: '', notifyAddress: '',
          alsoNotify: '',
          // Section 4: Operational & Customer Metadata
          customerCategory: 'CUSTOMER', businessType: 'FREE HAND',
          customerShipper: hblBkg.customer_name || '', billingParty: hblBkg.customer_name || '',
          salesPerson: '', csExecutive: activeEmployee.name || '',
          documentationBy: activeEmployee.name || '', introducedBy: '',
          cargoType: 'GENERAL',
          commodity: hblInq?.containers?.[0]?.commodityName || hblInq?.commodity_type || '',
          showContainersOnAttachment: '0',
          noOfContainersOnBl: String(hblBkg.quantity || 1),
          // Section 5: Package Details
          totalPackages: '', packageType: '', printDetails: 'PACKAGE DETAILS',
          grossWeight: hblInq?.cargo_weight ? String(hblInq.cargo_weight) : '',
          printGrossDecimals: '2', printGrossUnit: 'KGS',
          netWeight: '', printNetWith: 'BOTH',
          cbm: '', printCbmDecimals: '2',
          wmRatio: '1000',
          marksNumbers: hblInq?.remark || '',
          // Section 6: Goods Description & Routing
          descriptionPrefixTop: '',
          descriptionOfGoods: hblInq?.containers?.[0]?.commodityName || hblInq?.commodity_type || '',
          descriptionPrefixBottom: '',
          linerBlDescription: '',
          printToBlShipperSeal: '1',
          attachSheet: '',
          deliveryType: deliveryMap3[hblBkg.delivery_type || ''] || 'CY/CY',
          incoterm: hblInq?.incoterm || '', countryOfOrigin: 'SRI LANKA',
          portOfLoading: hblVessel?.pol || hblBkg.origin || '',
          portOfDischarge: hblVessel?.final_pod || hblBkg.destination || '',
          podEta: hblVessel?.eta_fpod || '', podAta: '',
          finalDestination: hblVessel?.final_pod || hblBkg.destination || '',
          fdEta: hblVessel?.eta_fpod || '', fdAta: '',
          placeOfDelivery: hblVessel?.final_pod || hblBkg.destination || '',
          podelEta: hblVessel?.eta_fpod || '', podelAta: '',
          transitTime: '', sapDescription: '',
          // Section 7: Freight & Financials
          deliveryNo: '',
          placeOfBlIssued: 'COLOMBO, SRI LANKA',
          dateOfBlIssued: new Date().toISOString().slice(0, 10),
          placeOfReceipt: hblBkg.origin || '',
          shippedOnBoardDate: hblVessel?.etd_pol || '',
          freightTerm: 'PREPAID', freightAmount: '',
          freightPayableAt: '', freightTermDetails: '',
          destinationCharges: 'COLLECT', originCharges: 'PREPAID',
          receivedForShipment: 'NO',
          remarks: hblBkg.notes || '',
          podAgent: '',
          // Section 8: POD Agent, B/L Terms & Manifest
          podAgentAddress: '', contactPerson: '',
          blTerm: 'NON-NEGO', noOfOriginalBls: 'THREE (3)',
          blStatus: '', holdCargo: '0', emailSurrenderLetter: '0',
          permitNo: '',
          agentForCarrier: hblBkg.shipping_line || '',
          printAgentForCarrier: '0',
          detentionDays: '',
          displayOnCarrierDraft: '0', displayTariffCharges: '0', displayAdditionalText: '0',
          blFormat: 'CLS',
          draftConfirmed: '0',
        })
        const hblCCount = hblBkg.quantity || 1
        setHblContainers(Array.from({ length: hblCCount }, () => ({
          containerNo: '', size: parsedSizeH, type: parsedTypeH,
          shipmentType: 'FCL/FCL', sealNo: '', packages: '',
          packageType: '', grossWeight: '', cbm: '',
        })))
        setHblCollapsed({})
        setFormNote('')
        setActionModal(item)
        break
      }
      case 'create-bl': {
        const blBkg = item.sourceData.booking as Booking
        const blVessel = vesselSchedules
          .filter(vs => vs.vessel_name === blBkg.vessel_name && vs.voyage_number === blBkg.voyage_number)
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
        // Pre-fill MBL form only (HBL is now a separate step)
        setMblForm({
          // 1. Job Header & Routing
          jobNumber: blBkg.job_reference_number || '',
          vesselVoyage: `${blBkg.vessel_name || ''} / ${blBkg.voyage_number || ''}`.replace(/^ \/ $/, ''),
          etaPol: '',
          sobDate: '',
          warehouse: '',
          yardDepot: '',
          fclCutOff: '',
          noOfCntrType: `${blBkg.quantity || 1}x ${blBkg.container_type || ''}`.trim(),
          remarks: '',
          destination: blVessel?.final_pod || blBkg.destination || '',
          etaDestination: blVessel?.eta_fpod || '',
          destinationAgent: '',
          carrier: (blBkg.shipping_line || '').toUpperCase(),
          carrierRef: '',
          exchangeRate: '',
          mblType: '',
          etdDate: blVessel?.etd_pol || '',
          // 3. Carrier B/L Instructions
          carrierBlInsRef: '',
          category: '',
          masterBlType: '',
          shipperName: 'CL SYNERGY LIMITED',
          shipperAddress: 'NO.30, 6TH FLOOR,\nR.A.DE MEL MAWATHA,\nCOLOMBO 03, SRI LANKA.',
          consigneeName: blBkg.master_bl_consignee || '',
          consigneeAddress: '',
          notifyParty: '',
          notifyAddress: '',
          detentionDays: '',
          displayOnCarrierDraft: '',
          displayContainerNumbers: '',
        })
        // Initialize HBL selection — pre-select the clicked booking if it has an HBL
        setMblSelectedHblIds(blBkg.house_bl_created ? [blBkg.id] : [])
        setMblHblSearch('')
        // Auto-populate B/L table from the selected booking's HBL data
        if (blBkg.house_bl_created && blBkg.house_bl_number) {
          setMblContainers([{
            containerNo: blBkg.house_bl_number,
            containerType: 'GENERAL',
            sealNo: '',
            poNumber: String(blBkg.quantity || 1),
            hsCode: blBkg.destination || '',
            description: blBkg.house_bl_shipper || blBkg.customer_name || '',
            grossWeight: '',
            cbm: '',
          }])
        } else {
          setMblContainers([{ containerNo: '', containerType: 'GENERAL', sealNo: '', poNumber: '', hsCode: '', description: '', grossWeight: '', cbm: '' }])
        }
        setHblCollapsed({})
        setFormNote('')
        setActionModal(item)
        break
      }
      case 'send-pre-advice': {
        const paBkg = item.sourceData.booking as Booking
        const paCust = customers.find(c => c.name.toLowerCase() === item.customerName.toLowerCase())
        const paInq = inquiries.find(i => i.customer_name.toLowerCase() === item.customerName.toLowerCase())
        const paVessel = vesselSchedules
          .filter(vs => vs.vessel_name === paBkg.vessel_name && vs.voyage_number === paBkg.voyage_number)
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
        const paConsignee = paBkg.master_bl_consignee || paBkg.house_bl_consignee || ''
        setPaForm({
          door_agent: '',
          door_agent_address: '',
          door_agent_contact: '',
          door_agent_email: '',
          bl_number: paBkg.master_bl_number || paBkg.house_bl_number || '',
          booking_ref: paBkg.id || '',
          shipper: paBkg.master_bl_shipper || paBkg.house_bl_shipper || paBkg.customer_name || '',
          shipper_address: paCust?.location || '',
          consignee: paConsignee,
          consignee_address: '',
          notify_party: paConsignee || paBkg.customer_name || '',
          notify_address: '',
          vessel: paBkg.vessel_name || '',
          voyage: paBkg.voyage_number || '',
          carrier: paBkg.shipping_line || '',
          pol: paVessel?.pol || paBkg.origin || '',
          pod: paVessel?.final_pod || paBkg.destination || '',
          final_destination: paVessel?.final_pod || paBkg.destination || '',
          eta_destination: paVessel?.eta_fpod || '',
          container_no: '',
          container_size: paBkg.container_type || '',
          container_count: String(paBkg.quantity || 1),
          seal_no: '',
          cargo_description: paInq?.containers?.[0]?.commodityName || paInq?.commodity_type || '',
          hs_code: '',
          no_of_packages: paInq?.container_qty ? String(paInq.container_qty) : String(paBkg.quantity || ''),
          package_type: paInq?.containers?.[0]?.containerType || paBkg.container_type || '',
          gross_weight: paInq?.cargo_weight ? String(paInq.cargo_weight) : '',
          net_weight: '',
          volume_cbm: '',
          freight_terms: 'PREPAID',
          delivery_address: paBkg.release_order_fields?.pickup_depot_address || '',
          delivery_contact: paCust?.contact_person || '',
          delivery_phone: paCust?.contact_phone || '',
          special_instructions: paInq?.remark || '',
          remarks: paBkg.notes || '',
        })
        setFormNote('')
        setCustomerContactEmail(paCust?.contact_email ?? '')
        setCustomerContactPhone(paCust?.contact_phone ?? '')
        setSendMethod(paCust?.contact_email ? 'email' : 'whatsapp')
        setWaConfirmed(false)
        setEmailConfirmed(false)
        setDraftCollapsed(true)
        setActionModal(item)
        break
      }
      case 'send-pre-alert': {
        const paBkg = item.sourceData.booking as Booking
        const paVessel = vesselSchedules
          .filter(vs => vs.vessel_name === paBkg.vessel_name && vs.voyage_number === paBkg.voyage_number)
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
        setPaForm({
          dest_agent: paBkg.delivery_agent || '',
          dest_agent_email: '',
          hbl_issue_term: paBkg.bl_type || 'ORIGINAL',
          mbl_issue_term: 'ORIGINAL',
          hbl_freight_term: 'PREPAID',
          mbl_freight_term: 'PREPAID',
          hbl_delivery_type: paBkg.delivery_type === 'door-to-door' ? 'CY/DOOR' : paBkg.delivery_type === 'port-to-door' ? 'CY/DOOR' : 'CY/CY',
          mbl_delivery_type: 'CY/CY',
          vessel: paBkg.vessel_name || '',
          voyage: paBkg.voyage_number || '',
          atd_origin: paVessel?.etd_pol || paBkg.vessel_etd || '',
          container_no: '',
          eta_destination: paVessel?.eta_fpod || '',
          hbl_number: paBkg.house_bl_number || '',
          mbl_number: paBkg.master_bl_number || '',
          shipper: paBkg.master_bl_shipper || paBkg.house_bl_shipper || paBkg.customer_name || '',
          consignee: paBkg.master_bl_consignee || paBkg.house_bl_consignee || '',
          carrier: paBkg.shipping_line || '',
          origin: paBkg.origin || '',
          destination: paBkg.destination || '',
        })
        setFormNote('')
        setCustomerContactEmail('')
        setSendMethod('email')
        setEmailConfirmed(false)
        setDraftCollapsed(true)
        setActionModal(item)
        break
      }
      case 'bl-approval': {
        setBlDecision('approved')
        setFormNote('')
        setActionModal(item)
        break
      }
      case 'record-master-bl': {
        setMasterBlNumber('')
        setMasterBlShipper('Synergy Shipping & Logistics')
        setMasterBlConsignee('')
        setFormNote('')
        setActionModal(item)
        break
      }
      case 'create-house-bl': {
        const { booking: hbBkg } = item.sourceData
        setHouseBlNumber('')
        setHouseBlShipper(hbBkg.customer_name)
        setHouseBlConsignee('')
        setFormNote('')
        const hbCust = customers.find(c => c.name.toLowerCase() === hbBkg.customer_name.toLowerCase())
        setCustomerContactEmail(hbCust?.contact_email ?? '')
        setCustomerContactPhone(hbCust?.contact_phone ?? '')
        setSendMethod(hbCust?.contact_email ? 'email' : 'whatsapp')
        setWaConfirmed(false)
        setEmailConfirmed(false)
        setActionModal(item)
        break
      }
      case 'send-kyc': {
        // Reset KYC document form
        setKycBrNumber('')
        setKycParentOrg('')
        setKycDeadline('')
        setKycCliType('')
        setKycCurrency('USD')
        setKycWebsite('')
        setKycSvatNo('')
        setKycTaxExemptions('N/A')
        setKycSeaImports(false)
        setKycSeaExports(false)
        setKycTradeLanes(false)
        setKycForwarding(false)
        setKycCrossTrade(false)
        setKycAirImports(false)
        setKycAirExports(false)
        setKycGeneralCargo(false)
        setKycDangerousGoods(false)
        setKycPerishableGoods(false)
        setKycDocBrForm('false')
        setKycDocVatCert('false')
        setKycDocSvatCert('false')
        setKycDocTinCert('false')
        setKycDocForm20('false')
        setFormNote('')
        setKycSending(false)
        setActionModal(item)
        break
      }
      default:
        // Actions needing a form modal
        setFormVessel('')
        setFormVoyage('')
        setFormNote('')
        setFormDecision('approve')
        setKycSending(false)
        setActionModal(item)
        break
    }

  }

  const handleModalSubmit = async () => {
    // attach-release-order renders inline without requiring actionModal — allow it through
    const effectiveKind = actionModal?.actionKind ?? (selectedItem?.actionKind === 'attach-release-order' ? 'attach-release-order' : null)
    if (!effectiveKind) return
    // Compute next-step action for interactive toast navigation
    // Skip for actions that push work to a different department (unless Admin who sees all)
    // prepare-quotation is handled entirely within Sales (no email/WA sending) so it stays in-dept for toast navigation
    const crossDeptActions = new Set(['send-kyc', 'verify-kyc', 'check-rates', 'check-inttra-rates', 'booking-request'])
    const nextStepAction = (() => {
      if (activeRole !== 'Admin' && crossDeptActions.has(effectiveKind)) return undefined
      const cur = roleSteps.find(s => s.actionKinds.includes(effectiveKind))
      const nxt = cur ? roleSteps.find(s => s.stepNumber === cur.stepNumber + 1) : null
      return nxt ? { label: `Go to ${nxt.label}`, onClick: () => setActiveStep(nxt.key) } : undefined
    })()
    // Every kind except attach-release-order is only reachable with actionModal set
    // (see effectiveKind above), so `modal` is actionModal whenever it is open.
    const modal = actionModal ?? selectedItem
    if (!modal) return
    switch (effectiveKind) {
      case 'send-kyc': {
        const { customer, inquiry: kycInquiry, kycClient: pendingKycClient } = modal.sourceData
        // Resolve backend cli_id: prefer kycClient.cli_id, fall back to clientList name lookup
        let cli_id: number | undefined
        if (pendingKycClient?.cli_id) {
          cli_id = pendingKycClient.cli_id
        } else {
          const lookupName = pendingKycClient?.name ?? customer?.name
          const kycClientRecord = lookupName
            ? clientList.find(c => c.name.toLowerCase() === lookupName.toLowerCase())
            : undefined
          cli_id = kycInquiry?.cli_id ?? kycClientRecord?.cli_id
        }
        if (!cli_id) {
          console.warn('[Workspace] KYC submit skipped — cli_id is undefined. sourceData:', modal.sourceData)
          onFlash(`Could not send the KYC request: ${modal.customerName} has no saved client record yet`)
          return  // keep the form open with the user's input
        }
        {
          setKycSending(true)
          try {
            console.log('[Workspace] Creating KYC request for cli_id:', cli_id)
            await apiCreateKycRequest(cli_id, {
              br_number: kycBrNumber,
              parent_organization: kycParentOrg || undefined,
              emp_id_sales: activeRole === 'Sales' ? BACKEND_ACTOR_ID : undefined,
              emp_id_cs:    activeRole === 'CS'    ? BACKEND_ACTOR_ID : undefined,
              document_submission_deadline: kycDeadline,
              cli_type: kycCliType,
              currency: kycCurrency,
              website:  kycWebsite  || undefined,
              svat_no:  kycSvatNo   || undefined,
              tax_exemptions: kycTaxExemptions,
              sea_imports:      kycSeaImports,
              sea_exports:      kycSeaExports,
              trade_lanes:      kycTradeLanes,
              forwarding:       kycForwarding,
              cross_trade:      kycCrossTrade,
              air_imports:      kycAirImports,
              air_exports:      kycAirExports,
              general_cargo:    kycGeneralCargo,
              dangerous_goods:  kycDangerousGoods,
              perishable_goods: kycPerishableGoods,
              docs: {
                cli_id,
                br_form:          kycDocBrForm,
                vat_certificate:  kycDocVatCert,
                svat_certificate: kycDocSvatCert,
                tin_certificate:  kycDocTinCert,
                form20:           kycDocForm20,
              },
            })
            console.log('[Workspace] KYC request created, refreshing data')
            if (pendingKycClient) {
              // Remove from pending queue so the item disappears immediately
              onSetKycPendingClients(prev => prev.filter(c => c.cli_id !== pendingKycClient.cli_id))
            }
            // Re-fetch KYC data so frontend picks up the backend's stage advancement
            onRefreshKycRequests()
          } catch (err) {
            console.error('[Workspace] KYC request failed:', err)
            onFlash(`Could not send the KYC request: ${errorText(err)}`)
            return  // keep the form open with the user's input
          } finally {
            setKycSending(false)
          }
        }
        const customerName = pendingKycClient?.name ?? customer?.name ?? modal.customerName
        if (!pendingKycClient) {
          // Legacy flow: update local customer record and advance inquiry
          if (customer) onUpdateCustomerKyc(customer.name, 'pending_customer')
          if (kycInquiry) onAdvanceWorkflow(kycInquiry.id, 'kyc-verification' as WorkflowStage)
        }
        onLogActivity({
          actor_role: activeRole,
          actor_id: activeEmployee.id,
          action: `KYC documents checked for ${customerName}. KYC request submitted. Pushed to Finance for final verification.`,
          ref_type: 'inquiry',
          ref_id: kycInquiry?.id ?? customer?.id ?? `CLI-${cli_id ?? ''}`,
          customer_name: customerName,
          pushed_to: 'Finance',
          notes: formNote || `KYC request created — BR: ${kycBrNumber}`,
        })
        onFlash(`KYC request created for ${customerName} — pushed to Finance`, nextStepAction)
        break
      }
      case 'verify-kyc': {
        const { kycRequest } = modal.sourceData
        const kycCliId = kycRequest?.cli_id
        const kycCustomerName = kycRequest?.name ?? modal.customerName
        const approved = formDecision === 'approve'
        if (approved) {
          // Mark KYC completed in backend
          if (kycCliId) {
            try {
              await apiUpdateKycStage(kycCliId, 'kyc_completed')
            } catch (err) {
              console.error('[Workspace] update KYC stage failed:', err)
              onFlash(`Could not verify KYC for ${kycCustomerName}: ${errorText(err)}`)
              return  // keep the form open with the user's input
            }
          }
          // Remove from Finance's review queue locally
          if (kycRequest) {
            onSetKycRequests(prev => prev.filter(r => r.kyc_id !== kycRequest.kyc_id))
          }
          // Update local customer record if present
          const matchedCustomer = customers.find(c => c.name.toLowerCase() === kycCustomerName.toLowerCase())
          if (matchedCustomer) onUpdateCustomerKyc(matchedCustomer.name, 'approved')
          onLogActivity({
            actor_role: activeRole,
            actor_id: activeEmployee.id,
            action: `KYC verified for ${kycCustomerName}. Customer cleared for rate check.`,
            ref_type: 'inquiry',
            ref_id: `CLI-${kycCliId ?? ''}`,
            customer_name: kycCustomerName,
            pushed_to: 'CS',
            notes: formNote || 'KYC documents verified and approved.',
          })
          onFlash(`KYC verified for ${kycCustomerName}`, nextStepAction)
        } else {
          // Reject — reset to uninitiated so CS's pending queue picks it up again
          if (kycCliId) {
            try {
              await apiUpdateKycStage(kycCliId, 'kyc_uninitiated')
            } catch (err) {
              console.error('[Workspace] update KYC stage (reject) failed:', err)
              onFlash(`Could not return KYC for ${kycCustomerName} to CS: ${errorText(err)}`)
              return  // keep the form open with the user's input
            }
          }
          // Remove from Finance's review queue locally
          if (kycRequest) {
            onSetKycRequests(prev => prev.filter(r => r.kyc_id !== kycRequest.kyc_id))
          }
          onLogActivity({
            actor_role: activeRole,
            actor_id: activeEmployee.id,
            action: `KYC flagged for ${kycCustomerName}. Returned to CS for resubmission.`,
            ref_type: 'inquiry',
            ref_id: `CLI-${kycCliId ?? ''}`,
            customer_name: kycCustomerName,
            pushed_to: 'CS',
            notes: formNote || 'KYC documents need resubmission.',
          })
          onFlash(`KYC flagged — ${kycCustomerName} returned to CS`, nextStepAction)
        }
        break
      }
      case 'prepare-quotation': {
        const { inquiry, rateRequest: saveRr, container: pqContainer } = modal.sourceData as {
          inquiry: Inquiry; rateRequest?: CompletedRateRequest; container?: ContainerLine
        }
        // Create quotation record in backend (status = in_prep).
        // Do NOT mark as sent here — that happens in the send-to-customer step.
        if (inquiry.inq_id) {
          const today = new Date().toISOString().slice(0, 10)
          const deadline = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10)

          // Build quotation options from the selected rate request options
          const quotationOptions: QuotationOptionPayload[] = []
          const pqComputeFinal = (optId: number, baseRate: number) => {
            const ovr = optionOverrides[optId]
            if (!ovr) return baseRate
            return ovr.isPercentage ? baseRate * (1 + ovr.margin / 100) : baseRate + ovr.margin
          }
          if (saveRr) {
            for (const opt of saveRr.options) {
              if (!opt.rate || !selectedRateOptionIds.has(opt.option_id)) continue
              const ovr = optionOverrides[opt.option_id] ?? { margin: 0, isPercentage: true, remark: '' }
              const baseAmt = opt.rate.rate ?? 0
              const finalAmt = ovr.isPercentage
                ? baseAmt * (1 + ovr.margin / 100)
                : baseAmt + ovr.margin
              quotationOptions.push({
                inq_id: inquiry.inq_id,
                rate_id: opt.rate_id,
                option_id: opt.option_id,
                amt: baseAmt,
                currency: opt.rate.currency ?? 'USD',
                vessel: opt.rate.vessel_name ?? opt.vessel_name ?? undefined,
                voyage: opt.rate.voyage ?? opt.voyage_number ?? undefined,
                remark: ovr.remark || undefined,
                margin: ovr.margin,
                is_percentage: ovr.isPercentage,
                final_amt: Math.round(finalAmt * 100) / 100,
              })
            }
          }

          // Build quotation HTML for the document upload
          const pqBodyHtml = saveRr
            ? buildQuotationHtml(inquiry, pqContainer, saveRr.options, selectedRateOptionIds, bestRateOptionId, optionOverrides, linerList, activeEmployee.name, pqComputeFinal)
            : undefined

          let created: Awaited<ReturnType<typeof apiCreateQuotation>>
          try {
            created = await apiCreateQuotation({
              inq_id: inquiry.inq_id,
              quote_date: today,
              sent_via: 'email',           // placeholder — updated to actual method in send step
              options: quotationOptions,
              acceptence_deadline: deadline,
            })
          } catch (err) {
            console.error('[Workspace] create quotation failed:', err)
            onFlash(`Could not save the quotation: ${errorText(err)}`)
            return  // keep the form open with the user's input
          }
          if (created.quote_id) {
            setLastQuotationId(created.quote_id)
            if (inquiry.inq_id != null) saveQuotationId(inquiry.inq_id, created.quote_id)

            // Generate PDF and upload document in the background (can take a few seconds);
            // the quotation itself is already saved, but tell the user if the upload fails.
            if (saveRr) {
              generateQuotationPdfBlob(inquiry, pqContainer, saveRr.options, selectedRateOptionIds, bestRateOptionId, optionOverrides, linerList, activeEmployee.name, pqComputeFinal)
                .then(pdfBlob => {
                  const fileName = `Quotation_${inquiry.id.replace(/[^a-zA-Z0-9-]/g, '_')}.pdf`
                  return apiUploadQuotationDocument(created.quote_id, pdfBlob, fileName, pqBodyHtml, { quotation_options: quotationOptions })
                })
                .then(docRes => console.log('[Workspace] Quotation document uploaded:', docRes.s3_url))
                .catch(err => {
                  console.error('[Workspace] quotation document upload failed:', err)
                  onFlash(`Quotation saved, but the PDF upload failed: ${errorText(err)}`)
                })
            }
          }
        }
        // Advance to quotation-sent — both CS and Sales go through the same Send Quote step
        onAdvanceWorkflow(inquiry.id, 'quotation-sent')
        onLogActivity({
          actor_role: activeRole,
          actor_id: activeEmployee.id,
          action: `Quotation prepared for ${inquiry.customer_name}. Ready to send.`,
          ref_type: 'inquiry',
          ref_id: inquiry.id,
          customer_name: inquiry.customer_name,
          pushed_to: 'CS',
          notes: formNote
            ? `${formNote} | Quotation:\n${quotationContent}`
            : `Quotation:\n${quotationContent}`,
        })
        onFlash(`${inquiry.id} → Quotation prepared — ready to send`, nextStepAction)
        break
      }
      case 'send-to-customer': {
        const { inquiry } = modal.sourceData
        // Update sent_via on the quotation record, then mark as sent.
        // PATCH must happen before marking sent (backend blocks PATCH once status = 'sent').
        const sendQuoteId = lastQuotationId ?? lookupQuotationId(inquiry.inq_id) ?? inquiry.quotation_id
        if (sendQuoteId) {
          const actualSentVia = sendMethod === 'email' ? 'email' : 'whatsapp'
          try {
            await apiPatchQuotation(sendQuoteId, { sent_via: actualSentVia })
            await apiMarkQuotationSent(sendQuoteId)
          } catch (err) {
            console.error('[Workspace] update/send quotation failed:', err)
            onFlash(`Could not mark the quotation as sent: ${errorText(err)}`)
            return  // keep the form open with the user's input
          }
        }

        // Email delivery endpoint not yet implemented on backend — skip apiSendQuotation call.
        // The quotation record is already marked as sent via apiMarkQuotationSent above.

        onAdvanceWorkflow(inquiry.id, 'customer-response')
        onLogActivity({
          actor_role: activeRole,
          actor_id: activeEmployee.id,
          action: sendMethod === 'email'
            ? `Quotation emailed to ${customerContactEmail}. Awaiting customer response.`
            : `Quotation sent via WhatsApp to ${customerContactPhone || 'customer'}. Awaiting customer response.`,
          ref_type: 'inquiry',
          ref_id: inquiry.id,
          customer_name: inquiry.customer_name,
          pushed_to: 'CS',
          notes: sendMethod === 'email'
            ? `Sent via Email to ${customerContactEmail}${formNote ? ` | ${formNote}` : ''}`
            : `Sent via WhatsApp to ${customerContactPhone}${formNote ? ` | ${formNote}` : ''}`,
        })
        onFlash(`${inquiry.id} → Quotation sent to ${inquiry.customer_name} via ${sendMethod === 'email' ? 'Email' : 'WhatsApp'}`, nextStepAction)
        break
      }
      case 'customer-response': {
        const { inquiry } = modal.sourceData
        // Record customer response in backend quotation record
        // Use quoteId from sentQuotations (sourceData) if available; fall back to legacy lookup
        const quoteId = modal.sourceData.quoteId ?? lastQuotationId ?? lookupQuotationId(inquiry.inq_id) ?? inquiry.quotation_id
        if (quoteId && customerDecision === 'accepted' && selectedOptionRateId != null) {
          try {
            await apiRecordQuotationResponse(quoteId, 'accepted', selectedOptionRateId)
          } catch (err) {
            console.error('[Workspace] record quotation response failed:', err)
            onFlash(`Could not record the customer's acceptance: ${errorText(err)}`)
            return  // keep the form open with the user's input
          }
        }
        if (customerDecision === 'accepted') {
          onAdvanceWorkflow(inquiry.id, 'booking-request')
          onLogActivity({
            actor_role: activeRole,
            actor_id: activeEmployee.id,
            action: `Customer ${inquiry.customer_name} accepted the quotation. Proceeding to booking.`,
            ref_type: 'inquiry',
            ref_id: inquiry.id,
            customer_name: inquiry.customer_name,
            pushed_to: 'CS',
            notes: `Customer accepted${formNote ? ` | ${formNote}` : ''}`,
          })
          onFlash(`${inquiry.id} → ${inquiry.customer_name} accepted — ready for booking request`, nextStepAction)
        } else {
          onAdvanceWorkflow(inquiry.id, 'completed')
          onLogActivity({
            actor_role: activeRole,
            actor_id: activeEmployee.id,
            action: `Customer ${inquiry.customer_name} rejected the quotation. Inquiry closed.`,
            ref_type: 'inquiry',
            ref_id: inquiry.id,
            customer_name: inquiry.customer_name,
            pushed_to: 'CS',
            notes: `Customer rejected${formNote ? ` | Reason: ${formNote}` : ''}`,
          })
          onFlash(`${inquiry.id} → ${inquiry.customer_name} rejected quotation — inquiry closed`)
        }
        break
      }
      case 'booking-request': {
        const { inquiry, acceptedQuotation: aqSubmit } = modal.sourceData
        const ctnSummary = bkContainers.map(c => `${c.qty}x${c.type}`).join(', ')
        // Resolve liner ID: prefer accepted quotation's lin_id, fallback to name lookup
        const resolvedLinId = aqSubmit?.lin_id ?? linerList.find(l => l.name.toLowerCase() === bkShippingLine.toLowerCase())?.lin_id
        const resolvedCommodityId = aqSubmit?.commodity ?? inquiry.com_ids?.[0]

        const bookingId = onCreateBooking({
          customer_name: aqSubmit?.client_name ?? inquiry.customer_name,
          quote_id: inquiry.id,
          shipping_line: bkShippingLine,
          container_type: bkContainers[0]?.type ?? bkContainerType,
          quantity: bkContainers.reduce((s, c) => s + c.qty, 0),
          origin: inquiry.origin,
          destination: bkPod || inquiry.destination,
          is_urgent: false,
          booked_by: BACKEND_ACTOR_ID,
          notes: [
            `Containers: ${ctnSummary}`,
            bkCommodity && `Commodity: ${bkCommodity}`,
            bkContractNo && `Contract: ${bkContractNo}`,
            bkAgreedRate && `Agreed Rate: ${bkAgreedRate}`,
            bkRateRemark && `Rate Remark: ${bkRateRemark}`,
            bkDeliveryTerm && `Delivery Term: ${bkDeliveryTerm}`,
            bkHsCode && `HS Code: ${bkHsCode}`,
            bkBlType && `BL Type: ${bkBlType}`,
            bkBookingType && `Booking Type: ${bkBookingType}`,
            bkSpecificRouting && `Routing: ${bkSpecificRouting}`,
            bkReeferTemp && `Reefer/PTI: ${bkReeferTemp}`,
            bkDeliveryAgent && `Delivery Agent: ${bkDeliveryAgent}`,
            bkCargoReadyDate && `Cargo Ready: ${bkCargoReadyDate}`,
            bkVessel && `Vessel: ${bkVessel}`,
            bkVoyage && `Voyage: ${bkVoyage}`,
            bkRaNumber && `RA No: ${bkRaNumber}`,
          ].filter(Boolean).join(' | ') || `Booking for ${inquiry.customer_name}: ${inquiry.request}`,
          delivery_type: aqSubmit?.delivery_type ?? inquiry.delivery_type,
          // Backend integration fields
          inq_id: aqSubmit?.inq_id ?? inquiry.inq_id,
          cli_id: aqSubmit?.cli_id ?? inquiry.cli_id,
          lin_id: resolvedLinId,
          commodity_id: resolvedCommodityId,
          vessel_etd: bkVesselEtd || undefined,
          agreed_rate: bkAgreedRate ? parseFloat(bkAgreedRate) : undefined,
          delivery_term: bkDeliveryTerm || undefined,
          hs_code: bkHsCode || undefined,
          bl_type: bkBlType || undefined,
          cargo_ready_date: bkCargoReadyDate || inquiry.cargo_ready_date || undefined,
          contract_no: bkContractNo || undefined,
          ra_number: bkRaNumber || undefined,
          specific_routing: bkSpecificRouting || undefined,
          booking_type: bkBookingType || undefined,
          reefer_temp: bkReeferTemp || undefined,
          delivery_agent: bkDeliveryAgent || undefined,
          vessel: bkVessel || undefined,
          voyage: bkVoyage || undefined,
          rate_remark: bkRateRemark || undefined,
          containers: bkContainers,
        })
        // Workflow auto-advances via POST /booking-requests; skip manual API call if backend IDs present
        onAdvanceWorkflow(inquiry.id, 'completed', !!(inquiry.inq_id && resolvedLinId))
        const noteParts = [
          ctnSummary,
          bkShippingLine || 'Any carrier',
          `${inquiry.origin} → ${bkPod || inquiry.destination}`,
          bkCommodity && `Commodity: ${bkCommodity}`,
          bkContractNo && `Contract: ${bkContractNo}`,
          bkAgreedRate && `Rate: $${bkAgreedRate}`,
          bkRateRemark && `Rate Remark: ${bkRateRemark}`,
          bkDeliveryTerm && `Term: ${bkDeliveryTerm}`,
          bkHsCode && `HS: ${bkHsCode}`,
          bkBlType && `BL: ${bkBlType}`,
          bkBookingType && `${bkBookingType} Booking`,
          bkReeferTemp && `Reefer/PTI: ${bkReeferTemp}`,
          bkDeliveryAgent && `Agent: ${bkDeliveryAgent}`,
          bkCargoReadyDate && `Cargo Ready: ${bkCargoReadyDate}`,
          bkVessel && `Vessel: ${bkVessel}`,
          bkVoyage && `Voyage: ${bkVoyage}`,
          bkRaNumber && `RA No: ${bkRaNumber}`,
        ].filter(Boolean).join(' | ')
        onLogActivity({
          actor_role: activeRole,
          actor_id: activeEmployee.id,
          action: `Booking request ${bookingId} created and sent to Procurement.`,
          ref_type: 'inquiry',
          ref_id: inquiry.id,
          customer_name: inquiry.customer_name,
          pushed_to: 'Procurement',
          notes: noteParts,
        })
        onFlash(`${inquiry.id} → Booking request sent to Procurement`, nextStepAction)
        break
      }
      case 'review-booking-request': {
        const { booking: rbBkg } = modal.sourceData
        // Assign the RA number — booking moves to proc-booking step for liner confirmation
        onMarkRaAssigned(rbBkg.id, bkRaNumber, [bkVessel, bkVoyage].filter(Boolean).join(' / ') || '', bkShippingLine)
        const rbNoteParts = [
          bkContainers.map(c => `${c.qty}x${c.type}`).join(', '),
          bkShippingLine && `Carrier: ${bkShippingLine}`,
          `${rbBkg.origin} → ${bkPod || rbBkg.destination}`,
          bkCommodity && `Commodity: ${bkCommodity}`,
          bkContractNo && `Contract: ${bkContractNo}`,
          bkAgreedRate && `Rate: $${bkAgreedRate}`,
          bkRateRemark && `Rate Remark: ${bkRateRemark}`,
          bkDeliveryTerm && `Term: ${bkDeliveryTerm}`,
          bkHsCode && `HS: ${bkHsCode}`,
          bkBlType && `BL: ${bkBlType}`,
          bkBookingType && `${bkBookingType} Booking`,
          bkReeferTemp && `Reefer/PTI: ${bkReeferTemp}`,
          bkDeliveryAgent && `Agent: ${bkDeliveryAgent}`,
          bkSpecificRouting && `Routing: ${bkSpecificRouting}`,
          bkCargoReadyDate && `Cargo Ready: ${bkCargoReadyDate}`,
          bkVessel && `Vessel: ${bkVessel}`,
          bkVoyage && `Voyage: ${bkVoyage}`,
          bkRaNumber && `RA#: ${bkRaNumber}`,
        ].filter(Boolean).join(' | ')
        onLogActivity({
          actor_role: activeRole,
          actor_id: activeEmployee.id,
          action: `RA# assigned for ${rbBkg.customer_name}.${bkRaNumber ? ` RA#: ${bkRaNumber}` : ''} Moved to Procurement Booking step.`,
          ref_type: 'booking',
          ref_id: rbBkg.id,
          customer_name: rbBkg.customer_name,
          pushed_to: 'Procurement',
          notes: rbNoteParts,
        })
        onFlash(`RA# assigned — ${rbBkg.customer_name} moved to Booking step`, nextStepAction)
        break
      }
      case 'attach-release-order': {
        const roBkg = (actionModal?.sourceData?.booking ?? selectedItem?.sourceData?.booking) as Booking
        if (!roBkg) break
        onAttachReleaseOrder(roBkg.id, roFields)
        onLogActivity({
          actor_role: activeRole,
          actor_id: activeEmployee.id,
          action: `Release order prepared for ${roBkg.customer_name} and sent to CS. Ref: ${roFields.reference_nbr || 'N/A'}.`,
          ref_type: 'booking',
          ref_id: roBkg.id,
          customer_name: roBkg.customer_name,
          pushed_to: 'CS',
          notes: `Release order sent to CS.${formNote ? ` | ${formNote}` : ''}`,
        })
        onFlash(`Release order sent to CS — ${roBkg.customer_name}`, nextStepAction)
        break
      }
      case 'confirm-liner-booking': {
        const { booking: cbBkg } = modal.sourceData
        if (linerBooked === 'yes') {
          onConfirmBooking(cbBkg.id, cbBkg.vessel_name, cbBkg.voyage_number)
          onLogActivity({
            actor_role: activeRole,
            actor_id: activeEmployee.id,
            action: `Liner booking confirmed for ${cbBkg.customer_name}. RA#: ${cbBkg.voyage_number || 'N/A'}.`,
            ref_type: 'booking',
            ref_id: cbBkg.id,
            customer_name: cbBkg.customer_name,
            pushed_to: 'CS',
            notes: `Liner confirmed. RA#: ${cbBkg.voyage_number || 'N/A'}${formNote ? ` | ${formNote}` : ''}`,
          })
          onFlash(`Liner confirmed — ${cbBkg.customer_name}`, nextStepAction)
        } else if (linerBooked === 'no') {
          onRevertBookingRequest(cbBkg.id)
          onLogActivity({
            actor_role: activeRole,
            actor_id: activeEmployee.id,
            action: `Liner booking failed for ${cbBkg.customer_name}. Booking reverted to Pending Liner.`,
            ref_type: 'booking',
            ref_id: cbBkg.id,
            customer_name: cbBkg.customer_name,
            pushed_to: 'Procurement',
            notes: `Booking failed. Reason: ${formNote || 'Not specified'}`,
          })
          onFlash(`Booking reverted — ${cbBkg.customer_name} (reason logged)`, nextStepAction)
        }
        break
      }
      case 'confirm-booking': {
        const { booking } = modal.sourceData
        onConfirmBooking(booking.id, formVessel, formVoyage)
        const confirmNotes = [
          `Vessel: ${formVessel || 'TBD'}, Voyage: ${formVoyage || 'TBD'}`,
          formNote ?? '',
        ].filter(Boolean).join(' | ')
        onLogActivity({
          actor_role: activeRole,
          actor_id: activeEmployee.id,
          action: `Liner confirmed. Vessel: ${formVessel || 'TBD'}, Voyage: ${formVoyage || 'TBD'}.`,
          ref_type: 'booking',
          ref_id: booking.id,
          customer_name: booking.customer_name,
          pushed_to: 'CS',
          notes: confirmNotes,
        })
        break
      }
      case 'release-booking': {
        const { booking } = modal.sourceData
        onReleaseBooking(booking.id, formNote)
        const sendVia = sendMethod === 'email'
          ? `via Email to ${customerContactEmail}`
          : `via WhatsApp to ${customerContactPhone || 'customer'}`
        onLogActivity({
          actor_role: activeRole,
          actor_id: activeEmployee.id,
          action: `Release order & booking confirmation sent to ${booking.customer_name} ${sendVia}.`,
          ref_type: 'booking',
          ref_id: booking.id,
          customer_name: booking.customer_name,
          pushed_to: 'CS',
          notes: `Sent ${sendVia}${formNote ? ` | ${formNote}` : ''}`,
        })
        onFlash(`${booking.id} → Release order sent to ${booking.customer_name} ${sendVia}`, nextStepAction)
        break
      }
      case 'record-cutoff': {
        const { booking } = modal.sourceData
        if (cutoffSiDate)     onSetBookingSiCutoff(booking.id, cutoffSiDate)
        if (cutoffBlDate)     onSetBookingBlCutoff(booking.id, cutoffBlDate)
        if (cutoffVgmDate)    onSetBookingVgmCutoff(booking.id, cutoffVgmDate)
        if (cutoffFilingDate) onSetBookingFilingCutoff(booking.id, cutoffFilingDate)
        const dateNotes = [
          cutoffSiDate     && `SI/BL: ${cutoffSiDate}`,
          cutoffVgmDate    && `VGM: ${cutoffVgmDate}`,
          cutoffFilingDate && `Filing: ${cutoffFilingDate}`,
        ].filter(Boolean).join(' | ')
        onLogActivity({
          actor_role: activeRole,
          actor_id: activeEmployee.id,
          action: `Recorded vessel cutoff schedule for ${booking.customer_name}. Liner: ${cutoffLiner || booking.shipping_line || 'N/A'}.${dateNotes ? ` ${dateNotes}.` : ''}`,
          ref_type: 'booking',
          ref_id: booking.id,
          customer_name: booking.customer_name,
          pushed_to: 'CS',
          notes: `Cutoff dates recorded.${cutoffNotes ? ` | ${cutoffNotes}` : ''}${dateNotes ? ` | ${dateNotes}` : ''}`,
        })
        onFlash(`${booking.id} → Cut off dates saved for ${booking.customer_name}`, nextStepAction)
        break
      }
      case 'request-si': {
        const { booking } = modal.sourceData
        onMarkSiRequested(booking.id)
        const sendVia = sendMethod === 'email'
          ? `via Email to ${customerContactEmail}`
          : `via WhatsApp to ${customerContactPhone || 'customer'}`
        const siblCutoff = booking.si_cutoff_date || booking.bl_cutoff_date
        onLogActivity({
          actor_role: activeRole,
          actor_id: activeEmployee.id,
          action: `Cutoff reminder sent to ${booking.customer_name} ${sendVia}. SI/BL cutoff: ${siblCutoff || 'N/A'}.${vgmCertFileName ? ` VGM certificate attached.` : ''}`,
          ref_type: 'booking',
          ref_id: booking.id,
          customer_name: booking.customer_name,
          pushed_to: 'CS',
          notes: `Cutoff reminder sent ${sendVia}. SI/BL: ${siblCutoff || 'N/A'}${vgmCertFileName ? ` | VGM cert: ${vgmCertFileName}` : ''}${formNote ? ` | ${formNote}` : ''}`,
        })
        onFlash(`${booking.id} → Cutoff reminder sent to ${booking.customer_name} ${sendVia}`, nextStepAction)
        break
      }
      case 'submit-si': {
        const { booking } = modal.sourceData
        onMarkSiSubmitted(booking.id)
        const method = 'manually'
        onLogActivity({
          actor_role: activeRole,
          actor_id: activeEmployee.id,
          action: `SI recorded for ${booking.customer_name} — submitted to ${booking.shipping_line || 'liner'} ${method}.${vgmCertFileName ? ` VGM document attached: ${vgmCertFileName}` : ''}`,
          ref_type: 'booking',
          ref_id: booking.id,
          customer_name: booking.customer_name,
          pushed_to: 'CS',
          notes: `SI recorded ${method}${siContent ? ` | SI document attached` : ''}${vgmCertFileName ? ` | VGM: ${vgmCertFileName}` : ''}${formNote ? ` | ${formNote}` : ''}`,
        })
        onFlash(`${booking.id} → SI recorded for ${booking.customer_name} (${booking.shipping_line || 'liner'})${vgmCertFileName ? ' (VGM attached)' : ''}`, nextStepAction)
        break
      }
      case 'save-draft-bl': {
        const { booking } = modal.sourceData
        onMarkDraftBlSent(booking.id, jobRefNumber)
        onLogActivity({
          actor_role: activeRole,
          actor_id: activeEmployee.id,
          action: `Draft BL saved for ${booking.customer_name}${jobRefNumber ? ` (Job Ref: ${jobRefNumber})` : ''}.`,
          ref_type: 'booking',
          ref_id: booking.id,
          customer_name: booking.customer_name,
          pushed_to: 'CS',
          notes: `Draft BL saved${jobRefNumber ? ` | Job Ref: ${jobRefNumber}` : ''}${formNote ? ` | ${formNote}` : ''}`,
        })
        onFlash(`${booking.id} → Draft BL saved for ${booking.customer_name}${jobRefNumber ? ` (Job Ref: ${jobRefNumber})` : ''}`, nextStepAction)
        break
      }
      case 'generate-si': {
        const { booking } = modal.sourceData
        onMarkLinerBlGenerated(booking.id)
        if (siIsNvocc) {
          onLogActivity({
            actor_role: activeRole,
            actor_id: activeEmployee.id,
            action: `Liner BL Instruction generated (NVOCC) for ${booking.customer_name} (${siField('to_liner') || booking.shipping_line}).`,
            ref_type: 'booking',
            ref_id: booking.id,
            customer_name: booking.customer_name,
            pushed_to: 'CS',
            notes: `SI generated (NVOCC) | BL Type: ${siField('bl_type')} | Booking: ${siField('booking_ref')} | ${siField('pol')} → ${siField('pod')}${siEmailDraft ? ' | Email drafted' : ''}${formNote ? ` | ${formNote}` : ''}`,
          })
          onFlash(`${booking.id} → Liner BL Instruction generated for ${booking.customer_name}${siEmailDraft ? ' (email drafted)' : ''}`, nextStepAction)
        } else {
          onLogActivity({
            actor_role: activeRole,
            actor_id: activeEmployee.id,
            action: `SI submission to liner confirmed for ${booking.customer_name} (${booking.shipping_line || 'liner'}).`,
            ref_type: 'booking',
            ref_id: booking.id,
            customer_name: booking.customer_name,
            pushed_to: 'CS',
            notes: `SI confirmed submitted to liner${formNote ? ` | ${formNote}` : ''}`,
          })
          onFlash(`${booking.id} → SI confirmed submitted to ${booking.shipping_line || 'liner'} for ${booking.customer_name}`, nextStepAction)
        }
        break
      }
      case 'create-hbl': {
        const { booking: hblBooking } = actionModal!.sourceData
        onCreateHouseBl(hblBooking.id, {
          house_bl_number: hblField('houseBlNo') || hblField('customBlNo') || '',
          shipper: hblField('shipperName'),
          consignee: hblField('consigneeName'),
        })
        onLogActivity({
          actor_role: activeRole,
          actor_id: activeEmployee.id,
          action: `Created House BL ${hblField('houseBlNo') || hblField('customBlNo')} for ${hblBooking.id}.`,
          ref_type: 'booking',
          ref_id: hblBooking.id,
          customer_name: hblBooking.customer_name,
          pushed_to: 'CS',
          notes: `House BL: ${hblField('houseBlNo') || hblField('customBlNo')} | Shipper: ${hblField('shipperName')} | Consignee: ${hblField('consigneeName')}${formNote ? ` | ${formNote}` : ''}`,
        })
        onFlash(`${hblBooking.id} → House BL created for ${hblBooking.customer_name}.`, nextStepAction)
        break
      }
      case 'create-bl': {
        const { booking } = actionModal!.sourceData
        const mblRef = mblField('carrierBlInsRef') || mblField('jobNumber')
        // Mark all selected HBL bookings as master_bl_recorded
        const idsToMark = mblSelectedHblIds.length > 0 ? mblSelectedHblIds : [booking.id]
        for (const bId of idsToMark) {
          onRecordMasterBl(bId, {
            master_bl_number: mblRef,
            shipper: mblField('shipperName'),
            consignee: mblField('consigneeName'),
          })
        }
        const hblNames = idsToMark.length > 1
          ? `${idsToMark.length} bookings (${idsToMark.join(', ')})`
          : booking.id
        onLogActivity({
          actor_role: activeRole,
          actor_id: activeEmployee.id,
          action: `Recorded Master BL for ${hblNames} — ${mblRef || 'N/A'}.`,
          ref_type: 'booking',
          ref_id: booking.id,
          customer_name: booking.customer_name,
          pushed_to: 'CS',
          notes: `Master BL Ref: ${mblRef || 'N/A'} | HBLs: ${idsToMark.join(', ')} | Shipper: ${mblField('shipperName')} | Consignee: ${mblField('consigneeName')}${formNote ? ` | ${formNote}` : ''}`,
        })
        onFlash(`Master BL recorded for ${hblNames}.`, nextStepAction)
        break
      }
      case 'send-pre-advice': {
        const { booking } = modal.sourceData
        onMarkPreAdviceSent(booking.id)
        const sendVia = sendMethod === 'email'
          ? `via Email to ${paField('door_agent_email')}`
          : `via WhatsApp`
        onLogActivity({
          actor_role: activeRole,
          actor_id: activeEmployee.id,
          action: `Pre-Advice sent to door agent ${paField('door_agent')} for ${booking.customer_name} ${sendVia}.`,
          ref_type: 'booking',
          ref_id: booking.id,
          customer_name: booking.customer_name,
          pushed_to: 'CS',
          notes: `Pre-Advice → ${paField('door_agent')} | ${booking.origin} → ${booking.destination} | B/L: ${paField('bl_number') || 'N/A'}${formNote ? ` | ${formNote}` : ''}`,
        })
        onFlash(`${booking.id} → Pre-Advice sent to ${paField('door_agent')} ${sendVia}`, nextStepAction)
        break
      }
      case 'send-pre-alert': {
        const { booking } = modal.sourceData
        // Auto-open Outlook with the pre-alert email
        const praSubject = `Pre-Alert — ${paField('hbl_number') || paField('mbl_number') || 'N/A'} — ${paField('vessel')} ${paField('voyage')}`
        const praBody = [
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
          activeEmployee.name,
          'Synergy Shipping & Logistics',
        ].join('\n')
        openMailto(paField('dest_agent_email'), praSubject, praBody)
        onMarkPreAlertSent(booking.id)
        onLogActivity({
          actor_role: activeRole,
          actor_id: activeEmployee.id,
          action: `Pre-Alert sent to destination agent ${paField('dest_agent')} for ${booking.customer_name} via Email to ${paField('dest_agent_email')}.`,
          ref_type: 'booking',
          ref_id: booking.id,
          customer_name: booking.customer_name,
          pushed_to: 'CS',
          notes: `Pre-Alert → ${paField('dest_agent')} | ${booking.origin} → ${booking.destination} | H B/L: ${paField('hbl_number') || 'N/A'}${formNote ? ` | ${formNote}` : ''}`,
        })
        onFlash(`${booking.id} → Pre-Alert sent to ${paField('dest_agent')}`, nextStepAction)
        break
      }
      case 'bl-approval': {
        const { booking } = modal.sourceData
        const approved = blDecision === 'approved'
        const baBlType = booking.delivery_type === 'door-to-door' ? 'House BL' : 'Master BL'
        onSetBlStatus(booking.id, blDecision)
        onLogActivity({
          actor_role: activeRole,
          actor_id: activeEmployee.id,
          action: approved
            ? `${booking.customer_name} approved ${baBlType} for ${booking.id}.`
            : `${booking.customer_name} requested changes to ${baBlType} for ${booking.id}.`,
          ref_type: 'booking',
          ref_id: booking.id,
          customer_name: booking.customer_name,
          pushed_to: 'CS',
          notes: approved
            ? `${baBlType} approved by customer${formNote ? ` | ${formNote}` : ''}`
            : `Changes requested: ${formNote || 'No details provided'}`,
        })
        onFlash(approved
          ? `${booking.id} → ${baBlType} approved by ${booking.customer_name}`
          : `${booking.id} → ${booking.customer_name} requested changes to ${baBlType}`,
          approved ? nextStepAction : undefined)
        break
      }
      case 'record-master-bl': {
        const { booking } = modal.sourceData
        onRecordMasterBl(booking.id, { master_bl_number: masterBlNumber, shipper: masterBlShipper, consignee: masterBlConsignee })
        onLogActivity({
          actor_role: activeRole,
          actor_id: activeEmployee.id,
          action: `Recorded Master BL ${masterBlNumber} for ${booking.id}.`,
          ref_type: 'booking',
          ref_id: booking.id,
          customer_name: booking.customer_name,
          pushed_to: 'CS',
          notes: `Master BL: ${masterBlNumber} | Shipper: ${masterBlShipper} | Consignee: ${masterBlConsignee}${formNote ? ` | ${formNote}` : ''}`,
        })
        onFlash(`${booking.id} → Master BL ${masterBlNumber} recorded`, nextStepAction)
        break
      }
      case 'create-house-bl': {
        const { booking } = modal.sourceData
        onCreateHouseBl(booking.id, { house_bl_number: houseBlNumber, shipper: houseBlShipper, consignee: houseBlConsignee })
        const hbSendVia = sendMethod === 'email'
          ? `via Email to ${customerContactEmail}`
          : `via WhatsApp to ${customerContactPhone || 'customer'}`
        onLogActivity({
          actor_role: activeRole,
          actor_id: activeEmployee.id,
          action: `Created House BL ${houseBlNumber} and sent to ${booking.customer_name} ${hbSendVia}. Awaiting customer approval.`,
          ref_type: 'booking',
          ref_id: booking.id,
          customer_name: booking.customer_name,
          pushed_to: 'CS',
          notes: `House BL: ${houseBlNumber} | Shipper: ${houseBlShipper} | Consignee: ${houseBlConsignee} | Master BL: ${booking.master_bl_number || 'N/A'} | Sent ${hbSendVia}${formNote ? ` | ${formNote}` : ''}`,
        })
        onFlash(`${booking.id} → House BL ${houseBlNumber} sent to ${booking.customer_name} ${hbSendVia}`, nextStepAction)
        break
      }
      case 'approve-quote': {
        const { quote } = modal.sourceData
        const approved = formDecision === 'approve'
        onSetQuoteStatus(quote.id, approved ? 'Approved' : 'Lost')
        onLogActivity({
          actor_role: activeRole,
          actor_id: activeEmployee.id,
          action: approved ? `Approved quotation ${quote.id}` : `Rejected quotation ${quote.id}`,
          ref_type: 'quote',
          ref_id: quote.id,
          customer_name: quote.customer_name,
          pushed_to: approved ? 'CS' : 'Sales',
          notes: formNote || (approved ? 'Quotation approved by Finance.' : 'Rejected.'),
        })
        break
      }
    }
    setActionModal(null)

  }

  return { handleAction, handleModalSubmit }
}
