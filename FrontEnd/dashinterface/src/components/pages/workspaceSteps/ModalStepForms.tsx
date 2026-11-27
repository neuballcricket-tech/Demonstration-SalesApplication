import React, { useId, type ReactNode } from 'react'
import {
  ChevronRight, AlertTriangle, Check, FileText, ShieldCheck, X,
  Mail, Loader2, MessageCircle, Edit3,
  Ship,
} from 'lucide-react'
import {
  type Inquiry, type Customer, type LinerRecord, type ContainerLine,
  type CompletedRateRequest,
} from '../../../types'
import type { KycRequestRecord } from '../../../api'
import type { WorkspaceItem } from './types'
import { openMailto, generateQuotationPdf, openOutlookWithQuotation } from './utils'
import { Badge, Button, Field, Input, Modal, Textarea } from '../../ui'
import { labelClass } from '../../ui/controlStyles'
import { cn } from '../../../lib/cn'
import { ConfirmCheck, ContextCard, DraftPanel, SELECTED_DANGER, SELECTED_SUCCESS, SendMethodToggle } from './InlineStepForms'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface ModalStepFormsProps {
  actionModal: WorkspaceItem | null
  setActionModal: (v: WorkspaceItem | null) => void

  // Form state - verify KYC / approve-quote
  formDecision: 'approve' | 'reject'
  setFormDecision: (v: 'approve' | 'reject') => void
  formNote: string
  setFormNote: (v: string) => void
  formVessel: string
  setFormVessel: (v: string) => void
  formVoyage: string
  setFormVoyage: (v: string) => void

  // Quotation prep
  quotationContent: string
  setQuotationContent: (v: string) => void
  quoteCopied: boolean
  setQuoteCopied: (v: boolean) => void
  selectedRateOptionIds: Set<number>
  setSelectedRateOptionIds: React.Dispatch<React.SetStateAction<Set<number>>>
  bestRateOptionId: number | null
  setBestRateOptionId: (v: number | null) => void
  optionOverrides: Record<number, import('./types').QuotationOptionOverride>
  setOptionOverrides: React.Dispatch<React.SetStateAction<Record<number, import('./types').QuotationOptionOverride>>>

  // Send-to-customer
  sendMethod: 'email' | 'whatsapp'
  setSendMethod: (v: 'email' | 'whatsapp') => void
  waConfirmed: boolean
  setWaConfirmed: (v: boolean) => void
  emailConfirmed: boolean
  setEmailConfirmed: (v: boolean) => void
  draftCollapsed: boolean
  setDraftCollapsed: (v: boolean | ((prev: boolean) => boolean)) => void
  customerContactEmail: string
  setCustomerContactEmail: (v: string) => void
  customerContactPhone: string
  setCustomerContactPhone: (v: string) => void

  // Loading flags
  kycSending: boolean
  quotationSending: boolean

  // BL Approval
  blDecision: 'approved' | 'changes-requested'
  setBlDecision: (v: 'approved' | 'changes-requested') => void

  // Master BL
  masterBlNumber: string
  setMasterBlNumber: (v: string) => void
  masterBlShipper: string
  setMasterBlShipper: (v: string) => void
  masterBlConsignee: string
  setMasterBlConsignee: (v: string) => void

  // House BL
  houseBlNumber: string
  setHouseBlNumber: (v: string) => void
  houseBlShipper: string
  setHouseBlShipper: (v: string) => void
  houseBlConsignee: string
  setHouseBlConsignee: (v: string) => void

  // Draft BL
  jobRefNumber: string
  setJobRefNumber: (v: string) => void

  // SI / HBL / MBL field accessors (used in disabled/style logic)
  siIsNvocc: boolean
  siField: (key: string) => string
  hblField: (key: string) => string
  mblField: (key: string) => string

  // External data
  customers: Customer[]
  linerList: LinerRecord[]
  activeEmployee: { id: number; name: string }

  // Submit handler
  handleModalSubmit: () => void
  /** True while handleModalSubmit is waiting on the backend: the modal can't be dismissed (Esc, backdrop, Close, Cancel). */
  submitting: boolean
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Selected state of the "Changes Requested" BL decision (amber, like the old button). */
const SELECTED_WARNING = 'border-warning bg-warning text-white hover:bg-warning hover:opacity-90'

interface Choice { key: string; label: string; icon?: ReactNode; selected: boolean; selectedClass: string; onSelect: () => void }

/** Labelled group of decision buttons (Verified / Flag Issues, Approved / Changes Requested, Approve / Reject). */
function ChoiceGroup({ label, choices }: { label: string; choices: Choice[] }) {
  const id = useId()
  return (
    <div className="flex flex-col gap-1">
      <span id={id} className={labelClass}>{label}</span>
      <div role="group" aria-labelledby={id} className="flex gap-2">
        {choices.map(c => (
          <Button key={c.key} aria-pressed={c.selected} className={cn(c.selected && c.selectedClass)} icon={c.icon} onClick={c.onSelect}>
            {c.label}
          </Button>
        ))}
      </div>
    </div>
  )
}

/** Customer, route and containers of the booking the step is about. */
function BookingSummary({ bkg, extra }: { bkg: { customer_name: string; origin: string; destination: string; quantity: number; container_type: string }; extra: string }) {
  return (
    <div className="rounded-card border border-line-soft bg-primary-subtle px-3.5 py-2.5 text-control text-fg">
      <strong>{bkg.customer_name}</strong> - {bkg.origin} → {bkg.destination}
      <div className="mt-0.5 text-fg-muted">{bkg.quantity}x {bkg.container_type} · {extra}</div>
    </div>
  )
}

/** SI and BL cutoff dates, when the booking has them. */
function CutoffDates({ si, bl }: { si?: string; bl?: string }) {
  if (!si && !bl) return null
  return (
    <div className="flex gap-3 text-label">
      {si && (
        <div className="flex-1 rounded-card border border-line-soft bg-canvas px-2.5 py-1.5">
          <span className="text-fg-muted">SI Cutoff:</span> <strong className="text-fg">{si}</strong>
        </div>
      )}
      {bl && (
        <div className="flex-1 rounded-card border border-line-soft bg-canvas px-2.5 py-1.5">
          <span className="text-fg-muted">BL Cutoff:</span> <strong className="text-fg">{bl}</strong>
        </div>
      )}
    </div>
  )
}

/** Explanatory note above a BL form. */
function InfoNote({ children }: { children: ReactNode }) {
  return <div className="rounded-card border border-info-line bg-info-bg px-3 py-2 text-label text-fg-label">{children}</div>
}

/** Uppercase heading inside a KYC card. */
function CardHead({ children }: { children: ReactNode }) {
  return <h3 className="m-0 text-label font-bold uppercase tracking-label text-fg-muted">{children}</h3>
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ModalStepForms(props: ModalStepFormsProps) {
  const {
    actionModal, setActionModal,
    formDecision, setFormDecision, formNote, setFormNote,
    formVessel, setFormVessel, formVoyage, setFormVoyage,
    quotationContent,
    selectedRateOptionIds, bestRateOptionId,
    optionOverrides,
    sendMethod, setSendMethod, waConfirmed, setWaConfirmed, emailConfirmed, setEmailConfirmed,
    draftCollapsed, setDraftCollapsed, customerContactEmail, setCustomerContactEmail,
    customerContactPhone, setCustomerContactPhone,
    kycSending, quotationSending,
    blDecision, setBlDecision,
    masterBlNumber, setMasterBlNumber, masterBlShipper, setMasterBlShipper,
    masterBlConsignee, setMasterBlConsignee,
    houseBlNumber, setHouseBlNumber, houseBlShipper, setHouseBlShipper,
    houseBlConsignee, setHouseBlConsignee,
    jobRefNumber, setJobRefNumber,
    siIsNvocc, siField, hblField, mblField,
    linerList, activeEmployee,
    handleModalSubmit, submitting,
  } = props


  if (!actionModal) return null
  // These action kinds are rendered in other components (inline step forms)
  const excludedKinds = [
    'send-kyc', 'customer-response', 'prepare-quotation',
    'send-to-customer',
    'booking-request', 'review-booking-request',
    'confirm-liner-booking', 'attach-release-order', 'release-booking',
    'send-draft-bl', 'generate-si', 'create-hbl', 'create-bl',
    'record-cutoff', 'request-si', 'submit-si', 'send-pre-advice',
    'save-vessel-schedule', 'create-vessel-booking',
  ]
  if (excludedKinds.includes(actionModal.actionKind)) return null

  const close = () => setActionModal(null)
  const switchMethod = (m: 'email' | 'whatsapp') => { setSendMethod(m); setEmailConfirmed(false) }
  const submitDisabled =
    (actionModal.actionKind === 'send-to-customer' && sendMethod === 'email' && (!customerContactEmail.trim() || !customerContactEmail.includes('@') || !emailConfirmed)) ||
    (actionModal.actionKind === 'send-to-customer' && sendMethod === 'whatsapp' && !waConfirmed) ||
    (actionModal.actionKind === 'confirm-booking' && !formVessel.trim()) ||
    (actionModal.actionKind === 'release-booking' && sendMethod === 'email' && (!customerContactEmail.trim() || !customerContactEmail.includes('@'))) ||
    (actionModal.actionKind === 'release-booking' && sendMethod === 'whatsapp' && !waConfirmed) ||
    (actionModal.actionKind === 'bl-approval' && blDecision === 'changes-requested' && !formNote.trim()) ||
    (actionModal.actionKind === 'record-master-bl' && (!masterBlNumber.trim() || !masterBlConsignee.trim())) ||
    (actionModal.actionKind === 'create-house-bl' && (!houseBlNumber.trim() || !houseBlConsignee.trim())) ||
    (actionModal.actionKind === 'create-house-bl' && sendMethod === 'email' && (!customerContactEmail.trim() || !customerContactEmail.includes('@') || !emailConfirmed)) ||
    (actionModal.actionKind === 'create-house-bl' && sendMethod === 'whatsapp' && !waConfirmed) ||
    (actionModal.actionKind === 'generate-si' && siIsNvocc && (!siField('shipper_name').trim() || !siField('consignee_name').trim())) ||
    (actionModal.actionKind === 'create-hbl' && (!hblField('shipperName').trim() || !hblField('consigneeName').trim())) ||
    (actionModal.actionKind === 'create-bl' && (!mblField('shipperName').trim() || !mblField('consigneeName').trim())) ||
    kycSending || quotationSending
  // Rejecting decisions use the danger button; every other submit is primary.
  const submitIsReject = (actionModal.actionKind === 'verify-kyc' || actionModal.actionKind === 'approve-quote') && formDecision === 'reject'
  const ic = (Icon: typeof Mail) => <Icon size={14} aria-hidden="true" />

  return (
<Modal
  isOpen
  onClose={close}
  title={actionModal.actionLabel}
  isDismissable={!submitting}
  footer={
    <>
      <Button disabled={submitting} onClick={close}>Cancel</Button>
      <Button
        variant={submitIsReject ? 'danger' : 'primary'}
        // Not disabled while submitting: disabling the focused button would drop focus out of the dialog
        // (Esc would stop working afterwards). handleModalSubmit's in-flight guard ignores repeat presses.
        disabled={submitDisabled}
        onClick={handleModalSubmit}
      >
        {kycSending ? <><Loader2 size={14} aria-hidden="true" className="animate-spin" /> Sending...</> :
         quotationSending ? <><Loader2 size={14} aria-hidden="true" className="animate-spin" /> Sending...</> :
         actionModal.actionKind === 'verify-kyc' && formDecision === 'reject' ? 'Flag & Return to CS' :
         actionModal.actionKind === 'verify-kyc' ? <>{ic(ShieldCheck)} Verify &amp; Push</> :
         actionModal.actionKind === 'send-to-customer' && sendMethod === 'email' ? <>{ic(Mail)} Send via Email</> :
         actionModal.actionKind === 'send-to-customer' && sendMethod === 'whatsapp' ? <>{ic(MessageCircle)} Confirm WhatsApp Sent</> :
         actionModal.actionKind === 'booking-request' ? <>{ic(Ship)} Create Booking &amp; Send to Procurement</> :
         actionModal.actionKind === 'confirm-booking' && formVessel.trim() ?<>{ic(Ship)} Confirm Manually &amp; Send to CS</> :
         actionModal.actionKind === 'release-booking' && sendMethod === 'email' ? <>{ic(Mail)} Release &amp; Send via Email</> :
         actionModal.actionKind === 'release-booking' && sendMethod === 'whatsapp' ? <>{ic(MessageCircle)} Release &amp; Confirm WhatsApp Sent</> :
         actionModal.actionKind === 'bl-approval' && blDecision === 'approved' ? <>{ic(Check)} BL Approved</> :
         actionModal.actionKind === 'bl-approval' && blDecision === 'changes-requested' ? <>{ic(Edit3)} Record Changes Requested</> :
         actionModal.actionKind === 'record-master-bl' ? <>{ic(FileText)} Record Master BL</> :
         actionModal.actionKind === 'create-house-bl' && sendMethod === 'email' ? <>{ic(Mail)} Create &amp; Send House BL via Email</> :
         actionModal.actionKind === 'create-house-bl' && sendMethod === 'whatsapp' ? <>{ic(MessageCircle)} Create &amp; Confirm House BL Sent</> :
         actionModal.actionKind === 'approve-quote' && formDecision === 'reject' ? 'Reject' :
         actionModal.actionKind === 'generate-si' && siIsNvocc ? <>{ic(FileText)} Generate SI Document</> :
         actionModal.actionKind === 'generate-si' && !siIsNvocc ? <>{ic(Check)} Confirm SI Submitted</> :
         actionModal.actionKind === 'create-hbl' ? <>{ic(FileText)} Create House BL</> :
         actionModal.actionKind === 'create-bl' ? <>{ic(FileText)} Record Master BL</> :
         <>Confirm &amp; Push {ic(ChevronRight)}</>}
      </Button>
    </>
  }
>
    <div>
      <div className="font-mono text-label text-fg-muted">{actionModal.refId}</div>
      <p className="m-0 mt-1 text-body text-fg-label">{actionModal.title}</p>
    </div>

    {/* Verify KYC form (Finance) */}
    {actionModal.actionKind === 'verify-kyc' && (() => {
      const kycReq: KycRequestRecord | undefined = actionModal.sourceData?.kycRequest
      const docLabel = (label: string, val?: string) => (
        <div key={label} className="flex items-center gap-1.5 text-control">
          <span aria-hidden="true" className={cn('flex size-4 items-center justify-center rounded-control text-white', val === 'true' ? 'bg-success' : 'bg-danger')}>
            {val === 'true' ? <Check size={12} strokeWidth={3} /> : <X size={12} strokeWidth={3} />}
          </span>
          <span className={val === 'true' ? 'text-fg' : 'text-fg-muted'}>{label}</span>
          <span className="sr-only">{val === 'true' ? '(submitted)' : '(missing)'}</span>
        </div>
      )
      return (
        <div className="flex flex-col gap-3">
          {/* Client details */}
          {kycReq && (
            <div className="flex flex-col gap-2 rounded-card border border-line-soft bg-surface px-3.5 py-3">
              <CardHead>Client Information</CardHead>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-control text-fg">
                {kycReq.br_number && <div><span className="text-fg-muted">BR No: </span>{kycReq.br_number}</div>}
                {kycReq.cli_type && <div><span className="text-fg-muted">Type: </span>{kycReq.cli_type}</div>}
                {kycReq.currency && <div><span className="text-fg-muted">Currency: </span>{kycReq.currency}</div>}
                {kycReq.parent_organization && <div><span className="text-fg-muted">Parent Org: </span>{kycReq.parent_organization}</div>}
                {kycReq.website && <div className="col-span-full"><span className="text-fg-muted">Website: </span>{kycReq.website}</div>}
                {kycReq.document_submission_deadline && <div className="col-span-full"><span className="text-fg-muted">Doc Deadline: </span>{kycReq.document_submission_deadline}</div>}
              </div>
              {/* Business scope */}
              <div className="mt-1"><CardHead>Business Scope</CardHead></div>
              <div className="flex flex-wrap gap-x-3 gap-y-1">
                {[
                  ['Sea Imports', kycReq.sea_imports],
                  ['Sea Exports', kycReq.sea_exports],
                  ['Air Imports', kycReq.air_imports],
                  ['Air Exports', kycReq.air_exports],
                  ['Trade Lanes', kycReq.trade_lanes],
                  ['Forwarding', kycReq.forwarding],
                  ['Cross Trade', kycReq.cross_trade],
                  ['General Cargo', kycReq.general_cargo],
                  ['Dangerous Goods', kycReq.dangerous_goods],
                  ['Perishables', kycReq.perishable_goods],
                ].map(([label, val]) => val ? (
                  <Badge key={String(label)} tone="info">{String(label)}</Badge>
                ) : null)}
              </div>
            </div>
          )}
          {/* Document checklist */}
          {kycReq?.docs && (
            <div className="flex flex-col gap-2 rounded-card border border-line-soft bg-surface px-3.5 py-3">
              <CardHead>Document Checklist</CardHead>
              {docLabel('BR Form', kycReq.docs.br_form)}
              {docLabel('VAT Certificate', kycReq.docs.vat_certificate)}
              {docLabel('SVAT Certificate', kycReq.docs.svat_certificate)}
              {docLabel('TIN Certificate', kycReq.docs.tin_certificate)}
              {docLabel('Form 20', kycReq.docs.form20)}
            </div>
          )}
          {/* Decision */}
          <ChoiceGroup label="Decision" choices={[
            { key: 'approve', label: 'Verified', icon: ic(ShieldCheck), selected: formDecision === 'approve', selectedClass: SELECTED_SUCCESS, onSelect: () => setFormDecision('approve') },
            { key: 'reject', label: 'Flag Issues', icon: ic(AlertTriangle), selected: formDecision === 'reject', selectedClass: SELECTED_DANGER, onSelect: () => setFormDecision('reject') },
          ]} />
          <Field label={formDecision === 'reject' ? 'Issues Found' : 'Verification Note (optional)'}>
            {ids => <Input {...ids} value={formNote} onChange={e => setFormNote(e.target.value)} placeholder={formDecision === 'reject' ? 'Describe the issues found...' : 'Optional verification notes...'} />}
          </Field>
        </div>
      )
    })()}

    {/* Prepare Quotation - now rendered inline via InlineStepForms */}

    {/* Send to Customer (CS) */}
    {actionModal.actionKind === 'send-to-customer' && (() => {
      const ctx = actionModal.previousContext
      // Use live quotationContent state (persists from step 4), fallback to activity log
      const quotationFromLog = ctx?.notes?.match(/Quotation:\n([\s\S]+)/)?.[1] ?? ''
      const quotationText = quotationContent || quotationFromLog
      // Rate request data for generating the quotation attachment
      const stcInquiry = actionModal.sourceData.inquiry as Inquiry
      const stcContainer = actionModal.sourceData.container as ContainerLine | undefined
      const stcRr = actionModal.sourceData.rateRequest as CompletedRateRequest | undefined
      const stcOptions = stcRr?.options?.filter(o => o.rate && selectedRateOptionIds.has(o.option_id)) ?? []
      const canAttachQuotation = stcOptions.length > 0
      const computeFinal = (optId: number, baseRate: number) => {
        const ovr = optionOverrides[optId]
        if (!ovr) return baseRate
        return ovr.isPercentage ? baseRate * (1 + ovr.margin / 100) : baseRate + ovr.margin
      }
      const emailSubject = `Quotation for ${stcInquiry.customer_name} - ${stcInquiry.id}`
      const handleOpenOutlook = () => {
        if (canAttachQuotation) {
          // Generate .eml file with quotation HTML pre-attached
          openOutlookWithQuotation(customerContactEmail, emailSubject, quotationText, stcInquiry, stcContainer, stcRr!.options, selectedRateOptionIds, bestRateOptionId, optionOverrides, linerList, activeEmployee.name, computeFinal)
        } else {
          // Fallback: plain mailto with quotation text in body
          openMailto(customerContactEmail, emailSubject, quotationText)
        }
      }
      const handlePreviewPdf = () => {
        if (!canAttachQuotation) return
        generateQuotationPdf(stcInquiry, stcContainer, stcRr!.options, selectedRateOptionIds, bestRateOptionId, optionOverrides, linerList, activeEmployee.name, computeFinal)
      }
      return (
        <div className="flex flex-col gap-3">
          {ctx && <ContextCard ctx={ctx} />}

          {/* Quotation preview - collapsible */}
          {quotationText && (
            <DraftPanel title="Quotation Document" collapsed={draftCollapsed} onToggle={() => setDraftCollapsed(c => !c)}>
              <div className="max-h-60 overflow-y-auto whitespace-pre-wrap text-label leading-normal text-fg-label">{quotationText}</div>
            </DraftPanel>
          )}

          {/* Send method toggle */}
          <SendMethodToggle id="modal-stc-method-label" label="Send Method" value={sendMethod} onSelect={switchMethod} />

          {/* Email fields */}
          {sendMethod === 'email' && (
            <>
              <Field label="Customer Email" required>
                {ids => <Input {...ids} type="email" value={customerContactEmail} onChange={e => setCustomerContactEmail(e.target.value)} placeholder="customer@example.com" autoFocus />}
              </Field>
              {customerContactEmail.includes('@') && (
                <>
                  {/* Preview quotation PDF (optional) */}
                  {canAttachQuotation && (
                    <Button className="w-full justify-start" icon={ic(FileText)} onClick={handlePreviewPdf}>Preview Quotation</Button>
                  )}
                  {/* Open in Outlook - downloads .eml with quotation attached */}
                  <Button variant="primary" className="w-full justify-start" icon={ic(Mail)} onClick={handleOpenOutlook}>
                    Open in Outlook{canAttachQuotation ? ' with Quotation Attached' : ''}
                  </Button>
                  {canAttachQuotation && (
                    <p className="m-0 text-label leading-snug text-fg-muted">
                      An .eml file will download - double-click it to open in Outlook with the quotation pre-attached.
                    </p>
                  )}
                  {/* Confirm sent */}
                  <ConfirmCheck tone="info" checked={emailConfirmed} onChange={setEmailConfirmed}
                    hint="Open the .eml in Outlook, verify the attachment, send it, then check this box.">
                    I confirm that I have sent this quotation to the customer via email.
                  </ConfirmCheck>
                </>
              )}
            </>
          )}

          {/* WhatsApp fields */}
          {sendMethod === 'whatsapp' && (
            <>
              <Field label="Customer WhatsApp Number">
                {ids => <Input {...ids} value={customerContactPhone} onChange={e => setCustomerContactPhone(e.target.value)} placeholder="+94 7X XXX XXXX" autoFocus />}
              </Field>
              <ConfirmCheck tone="success" checked={waConfirmed} onChange={setWaConfirmed}
                hint="No WhatsApp integration is available - this is a manual confirmation.">
                I confirm that I have sent this quotation to the customer via WhatsApp.
              </ConfirmCheck>
            </>
          )}

          <Field label="Notes (optional)">
            {ids => <Input {...ids} value={formNote} onChange={e => setFormNote(e.target.value)} placeholder="Any additional notes..." />}
          </Field>
        </div>
      )
    })()}

    {/* Customer response form - now rendered inline in right panel */}


    {/* Confirm booking form - Procurement books via InttraAPI */}
    {actionModal.actionKind === 'confirm-booking' && (() => {
      const { booking: cbkg } = actionModal.sourceData
      const ctx = actionModal.previousContext
      return (
        <div className="flex flex-col gap-3">
          {ctx && <ContextCard ctx={ctx} showNotes />}

          {/* Booking summary */}
          <BookingSummary bkg={cbkg} extra={cbkg.shipping_line || 'Any liner'} />

          {/* Vessel / voyage entry */}
          <Field label="Vessel Name">
            {ids => <Input {...ids} value={formVessel} onChange={e => setFormVessel(e.target.value)} placeholder="e.g. Maersk Seletar" />}
          </Field>
          <Field label="Voyage Number">
            {ids => <Input {...ids} value={formVoyage} onChange={e => setFormVoyage(e.target.value)} placeholder="e.g. VOY-2026-042" />}
          </Field>

          <Field label="Notes (optional)">
            {ids => <Input {...ids} value={formNote} onChange={e => setFormNote(e.target.value)} placeholder="Any additional notes..." />}
          </Field>
        </div>
      )
    })()}

    {/* Submit SI - now inline, see ternary chain above */}

    {/* BL Approval modal */}
    {actionModal.actionKind === 'bl-approval' && (() => {
      const { booking: baBkg } = actionModal.sourceData
      const isDtd = baBkg.delivery_type === 'door-to-door'
      const blType = isDtd ? 'House BL' : 'Master BL'
      return (
        <div className="flex flex-col gap-3">
          {/* Booking summary */}
          <BookingSummary bkg={baBkg} extra={`${baBkg.shipping_line || 'No liner'}${isDtd ? ' · Door-to-Door' : ''}`} />

          {/* Cutoff dates */}
          <CutoffDates si={baBkg.si_cutoff_date} bl={baBkg.bl_cutoff_date} />

          {actionModal.previousContext && <ContextCard ctx={actionModal.previousContext} />}

          <ChoiceGroup label={`Customer Response to ${blType}`} choices={[
            { key: 'approved', label: 'Approved', icon: ic(Check), selected: blDecision === 'approved', selectedClass: SELECTED_SUCCESS, onSelect: () => setBlDecision('approved') },
            { key: 'changes', label: 'Changes Requested', icon: ic(Edit3), selected: blDecision === 'changes-requested', selectedClass: SELECTED_WARNING, onSelect: () => setBlDecision('changes-requested') },
          ]} />

          {blDecision === 'changes-requested' && (
            <Field label="Change Details" required>
              {ids => <Textarea {...ids} className="min-h-20 resize-y" value={formNote} onChange={e => setFormNote(e.target.value)} placeholder="Describe the changes requested by the customer..." />}
            </Field>
          )}

          {blDecision === 'approved' && (
            <Field label="Notes (optional)">
              {ids => <Input {...ids} value={formNote} onChange={e => setFormNote(e.target.value)} placeholder="Any notes..." />}
            </Field>
          )}
        </div>
      )
    })()}

    {/* Record Master BL modal */}
    {actionModal.actionKind === 'record-master-bl' && (() => {
      const { booking: mbBkg } = actionModal.sourceData
      return (
        <div className="flex flex-col gap-3">
          {/* Booking summary */}
          <BookingSummary bkg={mbBkg} extra={`${mbBkg.shipping_line || 'No liner'} · Door-to-Door`} />

          {/* Cutoff dates */}
          <CutoffDates si={mbBkg.si_cutoff_date} bl={mbBkg.bl_cutoff_date} />

          <InfoNote>
            <strong className="text-fg">Master BL</strong> - Issued by liner. Synergy is listed as shipper; destination agent as consignee.
          </InfoNote>

          <Field label="Master BL Number" required>
            {ids => <Input {...ids} value={masterBlNumber} onChange={e => setMasterBlNumber(e.target.value)} placeholder="e.g. MAEU123456789" autoFocus />}
          </Field>

          <Field label="Shipper (on Master BL)">
            {ids => <Input {...ids} value={masterBlShipper} onChange={e => setMasterBlShipper(e.target.value)} placeholder="Synergy Shipping & Logistics" />}
          </Field>

          <Field label="Consignee - Destination Agent" required>
            {ids => <Input {...ids} value={masterBlConsignee} onChange={e => setMasterBlConsignee(e.target.value)} placeholder="e.g. Rotterdam Forwarding BV" />}
          </Field>

          <Field label="Notes (optional)">
            {ids => <Input {...ids} value={formNote} onChange={e => setFormNote(e.target.value)} placeholder="Any notes..." />}
          </Field>
        </div>
      )
    })()}

    {/* Create House BL modal */}
    {actionModal.actionKind === 'create-house-bl' && (() => {
      const { booking: hbBkg } = actionModal.sourceData
      return (
        <div className="flex flex-col gap-3">
          {/* Booking summary */}
          <BookingSummary bkg={hbBkg} extra={`${hbBkg.shipping_line || 'No liner'} · Door-to-Door`} />

          {/* Cutoff dates */}
          <CutoffDates si={hbBkg.si_cutoff_date} bl={hbBkg.bl_cutoff_date} />

          {/* Master BL reference */}
          <div className="rounded-card border border-line-soft bg-canvas px-3 py-2 text-label">
            <span className="text-fg-muted">Master BL:</span>{' '}
            <strong className="text-fg">{hbBkg.master_bl_number || 'N/A'}</strong>
            <span className="ml-2 text-fg-muted">Shipper:</span>{' '}
            <span className="text-fg-label">{hbBkg.master_bl_shipper || 'N/A'}</span>
            <span className="ml-2 text-fg-muted">Consignee:</span>{' '}
            <span className="text-fg-label">{hbBkg.master_bl_consignee || 'N/A'}</span>
          </div>

          <InfoNote>
            <strong className="text-fg">House BL</strong> - Created by CS with actual shipper and consignee. Sent to customer for approval.
          </InfoNote>

          <Field label="House BL Number" required>
            {ids => <Input {...ids} value={houseBlNumber} onChange={e => setHouseBlNumber(e.target.value)} placeholder="e.g. SYNHBL-2026-001" autoFocus />}
          </Field>

          <Field label="Shipper (Actual)">
            {ids => <Input {...ids} value={houseBlShipper} onChange={e => setHouseBlShipper(e.target.value)} placeholder="Actual shipper name" />}
          </Field>

          <Field label="Consignee (Actual)" required>
            {ids => <Input {...ids} value={houseBlConsignee} onChange={e => setHouseBlConsignee(e.target.value)} placeholder="Actual consignee name" />}
          </Field>

          {/* Send House BL to customer */}
          <SendMethodToggle id="modal-hbl-method-label" label="Send House BL to Customer via" value={sendMethod} onSelect={switchMethod} />

          {sendMethod === 'email' && (
            <>
              <Field label="Customer Email" required>
                {ids => <Input {...ids} type="email" value={customerContactEmail} onChange={e => setCustomerContactEmail(e.target.value)} placeholder="customer@example.com" />}
              </Field>
              {customerContactEmail.includes('@') && (
                <>
                  <Button variant="primary" className="w-full justify-start" icon={ic(Mail)}
                    onClick={() => openMailto(customerContactEmail, `House Bill of Lading ${houseBlNumber || '(pending)'} - ${hbBkg.customer_name}`, `House BL Number: ${houseBlNumber}\nShipper: ${houseBlShipper}\nConsignee: ${houseBlConsignee}\nBooking: ${hbBkg.id}\nMaster BL: ${hbBkg.master_bl_number || 'N/A'}`)}>
                    Open in Outlook
                  </Button>
                  <ConfirmCheck tone="info" checked={emailConfirmed} onChange={setEmailConfirmed}
                    hint={'Click "Open in Outlook" above, send the email, then check this box.'}>
                    I confirm that I have sent the House BL to the customer via email.
                  </ConfirmCheck>
                </>
              )}
            </>
          )}

          {sendMethod === 'whatsapp' && (
            <>
              <Field label="Customer WhatsApp Number">
                {ids => <Input {...ids} value={customerContactPhone} onChange={e => setCustomerContactPhone(e.target.value)} placeholder="+94 7X XXX XXXX" />}
              </Field>
              <ConfirmCheck tone="success" checked={waConfirmed} onChange={setWaConfirmed}
                hint="No WhatsApp integration - manual confirmation.">
                I confirm that I have sent the House BL to the customer via WhatsApp.
              </ConfirmCheck>
            </>
          )}

          <Field label="Notes (optional)">
            {ids => <Input {...ids} value={formNote} onChange={e => setFormNote(e.target.value)} placeholder="Any notes..." />}
          </Field>
        </div>
      )
    })()}



    {/* Quote approval form */}
    {actionModal.actionKind === 'approve-quote' && (
      <div className="flex flex-col gap-3">
        <ChoiceGroup label="Decision" choices={[
          { key: 'approve', label: 'Approve', selected: formDecision === 'approve', selectedClass: SELECTED_SUCCESS, onSelect: () => setFormDecision('approve') },
          { key: 'reject', label: 'Reject', selected: formDecision === 'reject', selectedClass: SELECTED_DANGER, onSelect: () => setFormDecision('reject') },
        ]} />
        <Field label={formDecision === 'reject' ? 'Rejection Reason' : 'Approval Note (optional)'}>
          {ids => <Input {...ids} value={formNote} onChange={e => setFormNote(e.target.value)} placeholder={formDecision === 'reject' ? 'Reason for rejection...' : 'Optional note...'} />}
        </Field>
      </div>
    )}

    {/* Job Reference Number - shown in Draft BL step */}
    {actionModal.actionKind === 'save-draft-bl' && (
      <Field label="Job Reference Number" required>
        {ids => <Input {...ids} value={jobRefNumber} onChange={e => setJobRefNumber(e.target.value)} placeholder="Enter job reference number..." />}
      </Field>
    )}
</Modal>
  )
}
