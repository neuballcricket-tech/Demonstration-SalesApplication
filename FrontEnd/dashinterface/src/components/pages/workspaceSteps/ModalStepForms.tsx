import React from 'react'
import {
  ChevronRight, AlertTriangle, Check, FileText, ShieldCheck, X,
  User, Mail, Loader2, MessageCircle, Edit3, Copy, ClipboardCheck,
  Ship, ChevronDown,
} from 'lucide-react'
import {
  ROLE_LABELS,
  type Inquiry, type Customer, type LinerRecord, type ContainerLine,
} from '../../../types'
import type { CompletedRateRequest, CompletedRateOption } from '../../../types'
import type { KycRequestRecord } from '../../../api'
import type { WorkspaceItem } from './types'
import { empName, openMailto, buildRateSection } from './utils'

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
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ModalStepForms(props: ModalStepFormsProps) {
  const {
    actionModal, setActionModal,
    formDecision, setFormDecision, formNote, setFormNote,
    formVessel, setFormVessel, formVoyage, setFormVoyage,
    quotationContent, setQuotationContent, quoteCopied, setQuoteCopied,
    selectedRateOptionIds, setSelectedRateOptionIds, bestRateOptionId, setBestRateOptionId,
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
    customers, linerList, activeEmployee,
    handleModalSubmit,
  } = props


  if (!actionModal) return null
  // These action kinds are rendered in other components (inline step forms)
  const excludedKinds = [
    'send-kyc', 'customer-response', 'booking-request', 'review-booking-request',
    'confirm-liner-booking', 'attach-release-order', 'release-booking',
    'send-draft-bl', 'generate-si', 'create-hbl', 'create-bl',
    'record-cutoff', 'request-si', 'submit-si', 'send-pre-advice',
    'save-vessel-schedule', 'create-vessel-booking',
  ]
  if (excludedKinds.includes(actionModal.actionKind)) return null

  return (
<div className="lt-modal-backdrop" onClick={() => setActionModal(null)}>
  <div className="lt-modal" onClick={e => e.stopPropagation()} style={{ width: 520, padding: '28px 30px' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
      <div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'ui-monospace, monospace', marginBottom: 6 }}>{actionModal.refId}</div>
        <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em' }}>{actionModal.actionLabel}</div>
      </div>
      <button className="lt-icon-btn" onClick={() => setActionModal(null)}><X size={14} /></button>
    </div>

    <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 22 }}>
      {actionModal.title}
    </div>

    {/* Verify KYC form (Finance) */}
    {actionModal.actionKind === 'verify-kyc' && (() => {
      const kycReq: KycRequestRecord | undefined = actionModal.sourceData?.kycRequest
      const docLabel = (label: string, val?: string) => (
        <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
          <span style={{
            width: 16, height: 16, borderRadius: 3, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700,
            background: val === 'true' ? '#16a34a' : '#dc2626', color: '#fff',
          }}>{val === 'true' ? '✓' : '✗'}</span>
          <span style={{ color: val === 'true' ? 'var(--text-primary)' : 'var(--text-muted)' }}>{label}</span>
        </div>
      )
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Client details */}
          {kycReq && (
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>Client Information</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 16px', fontSize: 12 }}>
                {kycReq.br_number && <div><span style={{ color: 'var(--text-muted)' }}>BR No: </span>{kycReq.br_number}</div>}
                {kycReq.cli_type && <div><span style={{ color: 'var(--text-muted)' }}>Type: </span>{kycReq.cli_type}</div>}
                {kycReq.currency && <div><span style={{ color: 'var(--text-muted)' }}>Currency: </span>{kycReq.currency}</div>}
                {kycReq.parent_organization && <div><span style={{ color: 'var(--text-muted)' }}>Parent Org: </span>{kycReq.parent_organization}</div>}
                {kycReq.website && <div style={{ gridColumn: '1 / -1' }}><span style={{ color: 'var(--text-muted)' }}>Website: </span>{kycReq.website}</div>}
                {kycReq.document_submission_deadline && <div style={{ gridColumn: '1 / -1' }}><span style={{ color: 'var(--text-muted)' }}>Doc Deadline: </span>{kycReq.document_submission_deadline}</div>}
              </div>
              {/* Business scope */}
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 4 }}>Business Scope</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 12px' }}>
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
                  <span key={String(label)} style={{ fontSize: 11, padding: '2px 7px', borderRadius: 10, background: 'rgba(15,143,168,0.12)', color: '#0f8fa8', fontWeight: 600 }}>{String(label)}</span>
                ) : null)}
              </div>
            </div>
          )}
          {/* Document checklist */}
          {kycReq?.docs && (
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>Document Checklist</div>
              {docLabel('BR Form', kycReq.docs.br_form)}
              {docLabel('VAT Certificate', kycReq.docs.vat_certificate)}
              {docLabel('SVAT Certificate', kycReq.docs.svat_certificate)}
              {docLabel('TIN Certificate', kycReq.docs.tin_certificate)}
              {docLabel('Form 20', kycReq.docs.form20)}
            </div>
          )}
          {/* Decision */}
          <div>
            <label className="lt-label">Decision</label>
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <button
                className={`db-btn ${formDecision === 'approve' ? 'primary' : ''}`}
                style={formDecision === 'approve' ? { background: '#16a34a', borderColor: '#16a34a' } : { background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
                onClick={() => setFormDecision('approve')}
              >
                <ShieldCheck size={13} style={{ marginRight: 4 }} /> Verified
              </button>
              <button
                className={`db-btn ${formDecision === 'reject' ? 'primary' : ''}`}
                style={formDecision === 'reject' ? { background: '#dc2626', borderColor: '#dc2626' } : { background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
                onClick={() => setFormDecision('reject')}
              >
                <AlertTriangle size={13} style={{ marginRight: 4 }} /> Flag Issues
              </button>
            </div>
          </div>
          <div>
            <label className="lt-label">{formDecision === 'reject' ? 'Issues Found' : 'Verification Note (optional)'}</label>
            <input className="lt-input" style={{ width: '100%' }} value={formNote} onChange={e => setFormNote(e.target.value)} placeholder={formDecision === 'reject' ? 'Describe the issues found...' : 'Optional verification notes...'} />
          </div>
        </div>
      )
    })()}

    {/* Prepare Quotation (Sales) */}
    {actionModal.actionKind === 'prepare-quotation' && (() => {
      const ctx = actionModal.previousContext
      const modalRr = actionModal.sourceData?.rateRequest as CompletedRateRequest | undefined
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ padding: '10px 14px', background: 'rgba(15,143,168,0.06)', border: '1px solid rgba(15,143,168,0.18)', borderRadius: 8, fontSize: 12, color: '#0f8fa8', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Edit3 size={14} />
            Review and edit the quotation below, then click <strong>Save Quotation</strong>. The quotation will appear in the Send Quote step for delivery.
          </div>

          {/* Saved rate options from backend — selectable */}
          {modalRr && modalRr.options.length > 0 && (() => {
            const validOpts = modalRr.options.filter(o => o.rate)

            // Helper: rebuild quotation text after selection or best-option changes
            const rebuildQuotation = (nextSelected: Set<number>, nextBest: number | null) => {
              const { inquiry: qInq2, container: qCont2 } = actionModal.sourceData as { inquiry: Inquiry; container: ContainerLine }
              const qCust2 = customers.find(c => c.name.toLowerCase() === qInq2.customer_name.toLowerCase())
              const dest2 = qCont2?.destination || qInq2.destination
              const cLabel = qCont2 ? `${qCont2.quantity}x ${qCont2.containerType}` : ''
              const comLabel = qCont2?.commodityType ? ` · ${qCont2.commodityType}` : qInq2.commodity_type ? ` · ${qInq2.commodity_type}` : ''
              const procRemark = modalRr.remark ?? ''
              const td = new Date().toISOString().slice(0, 10)
              const rs = buildRateSection(modalRr, [...nextSelected], nextBest, linerList, actionModal.previousContext)
              setQuotationContent(
`FREIGHT QUOTATION

To: ${qInq2.customer_name}${qCust2?.tier ? ` (${qCust2.tier})` : ''}
Date: ${td}
Reference: ${qInq2.id}

Dear ${qInq2.customer_name},

Thank you for your freight enquiry. We are pleased to offer the following:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SHIPMENT DETAILS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Route:       ${qInq2.origin} → ${dest2}
Cargo:       ${cLabel}${comLabel}
Service:     ${qInq2.delivery_type === 'door-to-door' ? 'Door-to-Door' : 'Port-to-Port'}${qInq2.incoterm ? ` (${qInq2.incoterm})` : ''}${qInq2.cargo_ready_date ? `\nCargo Ready: ${qInq2.cargo_ready_date}` : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RATE OPTIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${rs}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TERMS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Validity: 14 days from date of this quotation
• Rates subject to space and equipment availability
• Port surcharges, customs, and inland haulage quoted separately unless stated above
${procRemark ? `\nNOTES: ${procRemark}` : ''}
Please confirm your preferred option at your earliest convenience.

Best regards,
${activeEmployee.name}
ABC Logistics (Pvt) Ltd`
              )
            }

            const toggleOption = (optId: number) => {
              setSelectedRateOptionIds(prev => {
                const next = new Set(prev)
                if (next.has(optId)) {
                  next.delete(optId)
                  // If we removed the best, clear best or pick next selected
                  if (bestRateOptionId === optId) {
                    const remaining = [...next]
                    const nextBest = remaining.length > 0 ? remaining[0] : null
                    setBestRateOptionId(nextBest)
                    rebuildQuotation(next, nextBest)
                    return next
                  }
                } else {
                  next.add(optId)
                }
                rebuildQuotation(next, bestRateOptionId)
                return next
              })
            }

            const pickBest = (optId: number) => {
              // Selecting as best also ensures it's included
              setSelectedRateOptionIds(prev => {
                const next = new Set(prev)
                next.add(optId)
                setBestRateOptionId(optId)
                rebuildQuotation(next, optId)
                return next
              })
            }

            return (
              <div className="ws-context-card" style={{ marginTop: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <FileText size={11} style={{ color: '#0f8fa8' }} />
                    <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>
                      Rate Options ({validOpts.length})
                    </span>
                  </div>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                    {selectedRateOptionIds.size} included · tick best option
                  </span>
                </div>
                {validOpts.map((opt: CompletedRateOption) => {
                  const r = opt.rate!
                  const isSelected = selectedRateOptionIds.has(opt.option_id)
                  const isBest = bestRateOptionId === opt.option_id
                  const linerName = r.lin_id ? (linerList.find(l => l.lin_id === r.lin_id)?.name ?? `Liner #${r.lin_id}`) : null
                  const typeLabel = opt.rate_type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
                  const freeTime = r.free_time ?? r.free_days
                  return (
                    <div
                      key={opt.option_id}
                      style={{
                        padding: '8px 10px',
                        background: isBest ? 'rgba(15,143,168,0.08)' : isSelected ? 'rgba(15,143,168,0.03)' : 'var(--bg-card)',
                        border: `1.5px solid ${isBest ? '#0f8fa8' : isSelected ? 'rgba(15,143,168,0.18)' : 'var(--border)'}`,
                        borderRadius: 6, marginBottom: 6, fontSize: 11,
                        opacity: isSelected ? 1 : 0.5,
                        transition: 'all 0.15s',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {/* Include checkbox */}
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleOption(opt.option_id)}
                          style={{ accentColor: '#0f8fa8', cursor: 'pointer', margin: 0 }}
                        />
                        {/* Rate details */}
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontWeight: 600, color: 'var(--text)' }}>
                              {linerName ? `${linerName} — ` : ''}{r.rate ?? '—'} {r.currency ?? 'USD'}
                            </span>
                            <span style={{ fontSize: 10, padding: '2px 6px', background: 'rgba(15,143,168,0.1)', borderRadius: 4, color: '#0f8fa8' }}>
                              {typeLabel}
                            </span>
                          </div>
                          <div style={{ color: 'var(--text-muted)', marginTop: 3 }}>
                            {r.origin && r.destination ? `${r.origin} → ${r.destination}` : ''}
                            {r.container_type ? ` · ${r.container_type}` : ''}
                            {r.transit ? ` · ${r.transit}d transit` : ''}
                            {freeTime ? ` · ${freeTime}d free` : ''}
                            {r.valid_from && r.valid_to ? ` · valid ${r.valid_from} – ${r.valid_to}` : ''}
                          </div>
                        </div>
                        {/* Best option radio */}
                        <button
                          type="button"
                          title={isBest ? 'Recommended option' : 'Mark as recommended'}
                          onClick={() => pickBest(opt.option_id)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 4,
                            fontSize: 10, padding: '3px 8px', borderRadius: 4, cursor: 'pointer',
                            border: `1px solid ${isBest ? '#0f8fa8' : 'var(--border)'}`,
                            background: isBest ? '#0f8fa8' : 'transparent',
                            color: isBest ? '#fff' : 'var(--text-muted)',
                            fontWeight: isBest ? 600 : 400,
                            transition: 'all 0.15s',
                          }}
                        >
                          <Check size={10} />
                          Best
                        </button>
                      </div>
                    </div>
                  )
                })}
                {modalRr.remark && (
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, fontStyle: 'italic' }}>
                    Note: {modalRr.remark}
                  </div>
                )}
              </div>
            )
          })()}

          {/* Fallback: activity log context (when no saved rate request) */}
          {!modalRr && ctx && (
            <div className="ws-context-card" style={{ marginTop: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <User size={11} style={{ color: 'var(--text-muted)' }} />
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>
                  Rate brief from {empName(ctx.actor_id)} ({ROLE_LABELS[ctx.actor_role]})
                </span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{ctx.action}</div>
              {ctx.notes && (
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3, fontStyle: 'italic', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {ctx.notes.split('|').filter((s: string) => /rates?:/i.test(s)).map((s: string) => s.trim()).join(' · ') || ctx.notes.split('|').slice(0, 3).map((s: string) => s.trim()).join(' · ')}
                </div>
              )}
            </div>
          )}

          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <label className="lt-label" style={{ margin: 0 }}>Quotation Message</label>
              <button
                type="button"
                style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, padding: '4px 10px', borderRadius: 6, border: `1px solid ${quoteCopied ? 'rgba(22,163,74,0.4)' : 'rgba(15,143,168,0.3)'}`, background: quoteCopied ? 'rgba(22,163,74,0.08)' : 'rgba(15,143,168,0.06)', color: quoteCopied ? '#16a34a' : '#0f8fa8', cursor: 'pointer', transition: 'all 0.2s' }}
                onClick={() => {
                  navigator.clipboard.writeText(quotationContent).then(() => {
                    setQuoteCopied(true)
                    setTimeout(() => setQuoteCopied(false), 2500)
                  })
                }}
              >
                {quoteCopied ? <><ClipboardCheck size={11} /> Copied!</> : <><Copy size={11} /> Copy to Clipboard</>}
              </button>
            </div>
            <textarea
              className="lt-input"
              style={{ width: '100%', minHeight: 320, fontFamily: 'monospace', fontSize: 11.5, lineHeight: 1.6, resize: 'vertical' }}
              value={quotationContent}
              onChange={e => setQuotationContent(e.target.value)}
            />
          </div>

          <div>
            <label className="lt-label">Notes for CS (optional)</label>
            <input className="lt-input" style={{ width: '100%' }} value={formNote}
              onChange={e => setFormNote(e.target.value)}
              placeholder="Any delivery instructions for CS..." />
          </div>
        </div>
      )
    })()}

    {/* Send to Customer (CS) */}
    {actionModal.actionKind === 'send-to-customer' && (() => {
      const ctx = actionModal.previousContext
      // Extract quotation text from previous activity log
      const quotationText = ctx?.notes?.match(/Quotation:\n([\s\S]+)/)?.[1] ?? ''
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {ctx && (
            <div className="ws-context-card" style={{ marginTop: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <User size={11} style={{ color: 'var(--text-muted)' }} />
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>
                  {empName(ctx.actor_id)} ({ROLE_LABELS[ctx.actor_role]})
                </span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{ctx.action}</div>
            </div>
          )}

          {/* Quotation preview — collapsible */}
          {quotationText && (
            <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
              <button type="button" onClick={() => setDraftCollapsed(c => !c)}
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--bg-card)', border: 'none', cursor: 'pointer' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, color: '#0f8fa8', textTransform: 'uppercase' as const, letterSpacing: '0.05em' }}>
                  <FileText size={12} /> Quotation Document
                </span>
                <ChevronDown size={13} style={{ color: 'var(--text-muted)', transform: draftCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)', transition: 'transform 0.15s' }} />
              </button>
              {!draftCollapsed && (
                <div className="ws-doc-body" style={{ whiteSpace: 'pre-wrap', fontSize: 11, lineHeight: 1.5, maxHeight: 240, overflowY: 'auto', padding: '10px 12px', borderTop: '1px solid var(--border)' }}>
                  {quotationText}
                </div>
              )}
            </div>
          )}

          {/* Send method toggle */}
          <div>
            <label className="lt-label">Send Method</label>
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <button
                className={`db-btn ${sendMethod === 'email' ? 'primary' : ''}`}
                style={sendMethod !== 'email' ? { background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-secondary)' } : {}}
                onClick={() => { setSendMethod('email'); setEmailConfirmed(false) }}
              >
                <Mail size={13} style={{ marginRight: 4 }} /> Email
              </button>
              <button
                className={`db-btn ${sendMethod === 'whatsapp' ? 'primary' : ''}`}
                style={sendMethod === 'whatsapp' ? { background: '#25d366', borderColor: '#25d366' } : { background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
                onClick={() => { setSendMethod('whatsapp'); setEmailConfirmed(false) }}
              >
                <MessageCircle size={13} style={{ marginRight: 4 }} /> WhatsApp
              </button>
            </div>
          </div>

          {/* Email fields */}
          {sendMethod === 'email' && (
            <>
              <div>
                <label className="lt-label">Customer Email <span style={{ color: '#dc2626' }}>*</span></label>
                <input className="lt-input" style={{ width: '100%' }} type="email"
                  value={customerContactEmail} onChange={e => setCustomerContactEmail(e.target.value)}
                  placeholder="customer@example.com" autoFocus />
              </div>
              {customerContactEmail.includes('@') && (
                <>
                  <button className="db-btn" type="button"
                    onClick={() => openMailto(customerContactEmail, `Quotation for ${actionModal.sourceData.inquiry.customer_name} — ${actionModal.sourceData.inquiry.id}`, quotationText)}
                    style={{ background: '#0078d4', borderColor: '#0078d4', color: '#fff', width: '100%' }}>
                    <Mail size={13} style={{ marginRight: 6 }} /> Open in Outlook
                  </button>
                  <div style={{ padding: '10px 14px', background: 'rgba(0,120,212,0.06)', border: '1px solid rgba(0,120,212,0.2)', borderRadius: 8 }}>
                    <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, cursor: 'pointer', fontSize: 12, color: 'var(--text-secondary)' }}>
                      <input type="checkbox" checked={emailConfirmed} onChange={e => setEmailConfirmed(e.target.checked)} style={{ marginTop: 2 }} />
                      <span>
                        I confirm that I have sent this quotation to the customer via email.
                        <span style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                          Click "Open in Outlook" above, send the email, then check this box.
                        </span>
                      </span>
                    </label>
                  </div>
                </>
              )}
            </>
          )}

          {/* WhatsApp fields */}
          {sendMethod === 'whatsapp' && (
            <>
              <div>
                <label className="lt-label">Customer WhatsApp Number</label>
                <input className="lt-input" style={{ width: '100%' }}
                  value={customerContactPhone} onChange={e => setCustomerContactPhone(e.target.value)}
                  placeholder="+94 7X XXX XXXX" autoFocus />
              </div>
              <div style={{ padding: '10px 14px', background: 'rgba(37,211,102,0.06)', border: '1px solid rgba(37,211,102,0.2)', borderRadius: 8 }}>
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, cursor: 'pointer', fontSize: 12, color: 'var(--text-secondary)' }}>
                  <input
                    type="checkbox"
                    checked={waConfirmed}
                    onChange={e => setWaConfirmed(e.target.checked)}
                    style={{ marginTop: 2 }}
                  />
                  <span>
                    I confirm that I have sent this quotation to the customer via WhatsApp.
                    <span style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                      No WhatsApp integration is available — this is a manual confirmation.
                    </span>
                  </span>
                </label>
              </div>
            </>
          )}

          <div>
            <label className="lt-label">Notes (optional)</label>
            <input className="lt-input" style={{ width: '100%' }} value={formNote}
              onChange={e => setFormNote(e.target.value)}
              placeholder="Any additional notes..." />
          </div>
        </div>
      )
    })()}

    {/* Customer response form — now rendered inline in right panel */}


    {/* Confirm booking form — Procurement books via InttraAPI */}
    {actionModal.actionKind === 'confirm-booking' && (() => {
      const { booking: cbkg } = actionModal.sourceData
      const ctx = actionModal.previousContext
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {ctx && (
            <div className="ws-context-card" style={{ marginTop: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <User size={11} style={{ color: 'var(--text-muted)' }} />
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>
                  {empName(ctx.actor_id)} ({ROLE_LABELS[ctx.actor_role]})
                </span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{ctx.action}</div>
              {ctx.notes && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3, fontStyle: 'italic' }}>{ctx.notes}</div>}
            </div>
          )}

          {/* Booking summary */}
          <div style={{ padding: '10px 14px', background: 'rgba(15,143,168,0.06)', border: '1px solid rgba(15,143,168,0.15)', borderRadius: 8, fontSize: 12 }}>
            <strong>{cbkg.customer_name}</strong> — {cbkg.origin} → {cbkg.destination}
            <div style={{ color: 'var(--text-muted)', marginTop: 2 }}>
              {cbkg.quantity}x {cbkg.container_type} · {cbkg.shipping_line || 'Any liner'}
            </div>
          </div>

          {/* Vessel / voyage entry */}
          <div>
            <label className="lt-label">Vessel Name</label>
            <input className="lt-input" style={{ width: '100%' }} value={formVessel} onChange={e => setFormVessel(e.target.value)} placeholder="e.g. Maersk Seletar" />
          </div>
          <div>
            <label className="lt-label">Voyage Number</label>
            <input className="lt-input" style={{ width: '100%' }} value={formVoyage} onChange={e => setFormVoyage(e.target.value)} placeholder="e.g. VOY-2026-042" />
          </div>

          <div>
            <label className="lt-label">Notes (optional)</label>
            <input className="lt-input" style={{ width: '100%' }} value={formNote} onChange={e => setFormNote(e.target.value)} placeholder="Any additional notes..." />
          </div>
        </div>
      )
    })()}

    {/* Submit SI — now inline, see ternary chain above */}

    {/* BL Approval modal */}
    {actionModal.actionKind === 'bl-approval' && (() => {
      const { booking: baBkg } = actionModal.sourceData
      const isDtd = baBkg.delivery_type === 'door-to-door'
      const blType = isDtd ? 'House BL' : 'Master BL'
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* Booking summary */}
          <div style={{ padding: '10px 14px', background: 'rgba(15,143,168,0.06)', border: '1px solid rgba(15,143,168,0.15)', borderRadius: 8, fontSize: 12 }}>
            <strong>{baBkg.customer_name}</strong> — {baBkg.origin} → {baBkg.destination}
            <div style={{ color: 'var(--text-muted)', marginTop: 2 }}>
              {baBkg.quantity}x {baBkg.container_type} · {baBkg.shipping_line || 'No liner'}{isDtd ? ' · Door-to-Door' : ''}
            </div>
          </div>

          {/* Cutoff dates */}
          {(baBkg.si_cutoff_date || baBkg.bl_cutoff_date) && (
            <div style={{ display: 'flex', gap: 12, fontSize: 11 }}>
              {baBkg.si_cutoff_date && (
                <div style={{ flex: 1, padding: '6px 10px', background: 'rgba(8,145,178,0.06)', border: '1px solid rgba(8,145,178,0.15)', borderRadius: 6 }}>
                  <span style={{ color: 'var(--text-muted)' }}>SI Cutoff:</span> <strong>{baBkg.si_cutoff_date}</strong>
                </div>
              )}
              {baBkg.bl_cutoff_date && (
                <div style={{ flex: 1, padding: '6px 10px', background: 'rgba(217,119,6,0.06)', border: '1px solid rgba(217,119,6,0.15)', borderRadius: 6 }}>
                  <span style={{ color: 'var(--text-muted)' }}>BL Cutoff:</span> <strong>{baBkg.bl_cutoff_date}</strong>
                </div>
              )}
            </div>
          )}

          {actionModal.previousContext && (
            <div className="ws-context-card" style={{ marginTop: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <User size={11} style={{ color: 'var(--text-muted)' }} />
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>
                  {empName(actionModal.previousContext.actor_id)} ({ROLE_LABELS[actionModal.previousContext.actor_role]})
                </span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{actionModal.previousContext.action}</div>
            </div>
          )}

          <div>
            <label className="lt-label">Customer Response to {blType}</label>
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <button
                className={`db-btn ${blDecision === 'approved' ? 'primary' : ''}`}
                style={blDecision === 'approved' ? { background: '#16a34a', borderColor: '#16a34a' } : { background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
                onClick={() => setBlDecision('approved')}
              >
                <Check size={13} style={{ marginRight: 4 }} /> Approved
              </button>
              <button
                className={`db-btn ${blDecision === 'changes-requested' ? 'primary' : ''}`}
                style={blDecision === 'changes-requested' ? { background: '#d97706', borderColor: '#d97706' } : { background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
                onClick={() => setBlDecision('changes-requested')}
              >
                <Edit3 size={13} style={{ marginRight: 4 }} /> Changes Requested
              </button>
            </div>
          </div>

          {blDecision === 'changes-requested' && (
            <div>
              <label className="lt-label">Change Details <span style={{ color: '#dc2626' }}>*</span></label>
              <textarea
                className="lt-input"
                style={{ width: '100%', minHeight: 80, resize: 'vertical' }}
                value={formNote}
                onChange={e => setFormNote(e.target.value)}
                placeholder="Describe the changes requested by the customer..."
              />
            </div>
          )}

          {blDecision === 'approved' && (
            <div>
              <label className="lt-label">Notes (optional)</label>
              <input className="lt-input" style={{ width: '100%' }} value={formNote}
                onChange={e => setFormNote(e.target.value)}
                placeholder="Any notes..." />
            </div>
          )}
        </div>
      )
    })()}

    {/* Record Master BL modal */}
    {actionModal.actionKind === 'record-master-bl' && (() => {
      const { booking: mbBkg } = actionModal.sourceData
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* Booking summary */}
          <div style={{ padding: '10px 14px', background: 'rgba(15,143,168,0.06)', border: '1px solid rgba(15,143,168,0.15)', borderRadius: 8, fontSize: 12 }}>
            <strong>{mbBkg.customer_name}</strong> — {mbBkg.origin} → {mbBkg.destination}
            <div style={{ color: 'var(--text-muted)', marginTop: 2 }}>
              {mbBkg.quantity}x {mbBkg.container_type} · {mbBkg.shipping_line || 'No liner'} · Door-to-Door
            </div>
          </div>

          {/* Cutoff dates */}
          {(mbBkg.si_cutoff_date || mbBkg.bl_cutoff_date) && (
            <div style={{ display: 'flex', gap: 12, fontSize: 11 }}>
              {mbBkg.si_cutoff_date && (
                <div style={{ flex: 1, padding: '6px 10px', background: 'rgba(8,145,178,0.06)', border: '1px solid rgba(8,145,178,0.15)', borderRadius: 6 }}>
                  <span style={{ color: 'var(--text-muted)' }}>SI Cutoff:</span> <strong>{mbBkg.si_cutoff_date}</strong>
                </div>
              )}
              {mbBkg.bl_cutoff_date && (
                <div style={{ flex: 1, padding: '6px 10px', background: 'rgba(217,119,6,0.06)', border: '1px solid rgba(217,119,6,0.15)', borderRadius: 6 }}>
                  <span style={{ color: 'var(--text-muted)' }}>BL Cutoff:</span> <strong>{mbBkg.bl_cutoff_date}</strong>
                </div>
              )}
            </div>
          )}

          <div style={{ padding: '8px 12px', background: 'rgba(13,148,136,0.06)', border: '1px solid rgba(13,148,136,0.15)', borderRadius: 8, fontSize: 11, color: 'var(--text-secondary)' }}>
            <strong>Master BL</strong> — Issued by liner. Synergy is listed as shipper; destination agent as consignee.
          </div>

          <div>
            <label className="lt-label">Master BL Number <span style={{ color: '#dc2626' }}>*</span></label>
            <input className="lt-input" style={{ width: '100%' }} value={masterBlNumber}
              onChange={e => setMasterBlNumber(e.target.value)}
              placeholder="e.g. MAEU123456789" autoFocus />
          </div>

          <div>
            <label className="lt-label">Shipper (on Master BL)</label>
            <input className="lt-input" style={{ width: '100%' }} value={masterBlShipper}
              onChange={e => setMasterBlShipper(e.target.value)}
              placeholder="Synergy Shipping & Logistics" />
          </div>

          <div>
            <label className="lt-label">Consignee — Destination Agent <span style={{ color: '#dc2626' }}>*</span></label>
            <input className="lt-input" style={{ width: '100%' }} value={masterBlConsignee}
              onChange={e => setMasterBlConsignee(e.target.value)}
              placeholder="e.g. Rotterdam Forwarding BV" />
          </div>

          <div>
            <label className="lt-label">Notes (optional)</label>
            <input className="lt-input" style={{ width: '100%' }} value={formNote}
              onChange={e => setFormNote(e.target.value)}
              placeholder="Any notes..." />
          </div>
        </div>
      )
    })()}

    {/* Create House BL modal */}
    {actionModal.actionKind === 'create-house-bl' && (() => {
      const { booking: hbBkg } = actionModal.sourceData
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* Booking summary */}
          <div style={{ padding: '10px 14px', background: 'rgba(15,143,168,0.06)', border: '1px solid rgba(15,143,168,0.15)', borderRadius: 8, fontSize: 12 }}>
            <strong>{hbBkg.customer_name}</strong> — {hbBkg.origin} → {hbBkg.destination}
            <div style={{ color: 'var(--text-muted)', marginTop: 2 }}>
              {hbBkg.quantity}x {hbBkg.container_type} · {hbBkg.shipping_line || 'No liner'} · Door-to-Door
            </div>
          </div>

          {/* Cutoff dates */}
          {(hbBkg.si_cutoff_date || hbBkg.bl_cutoff_date) && (
            <div style={{ display: 'flex', gap: 12, fontSize: 11 }}>
              {hbBkg.si_cutoff_date && (
                <div style={{ flex: 1, padding: '6px 10px', background: 'rgba(8,145,178,0.06)', border: '1px solid rgba(8,145,178,0.15)', borderRadius: 6 }}>
                  <span style={{ color: 'var(--text-muted)' }}>SI Cutoff:</span> <strong>{hbBkg.si_cutoff_date}</strong>
                </div>
              )}
              {hbBkg.bl_cutoff_date && (
                <div style={{ flex: 1, padding: '6px 10px', background: 'rgba(217,119,6,0.06)', border: '1px solid rgba(217,119,6,0.15)', borderRadius: 6 }}>
                  <span style={{ color: 'var(--text-muted)' }}>BL Cutoff:</span> <strong>{hbBkg.bl_cutoff_date}</strong>
                </div>
              )}
            </div>
          )}

          {/* Master BL reference */}
          <div style={{ padding: '8px 12px', background: 'rgba(13,148,136,0.06)', border: '1px solid rgba(13,148,136,0.15)', borderRadius: 8, fontSize: 11 }}>
            <span style={{ color: 'var(--text-muted)' }}>Master BL:</span>{' '}
            <strong style={{ color: 'var(--text-primary)' }}>{hbBkg.master_bl_number || 'N/A'}</strong>
            <span style={{ color: 'var(--text-muted)', marginLeft: 8 }}>Shipper:</span>{' '}
            <span style={{ color: 'var(--text-secondary)' }}>{hbBkg.master_bl_shipper || 'N/A'}</span>
            <span style={{ color: 'var(--text-muted)', marginLeft: 8 }}>Consignee:</span>{' '}
            <span style={{ color: 'var(--text-secondary)' }}>{hbBkg.master_bl_consignee || 'N/A'}</span>
          </div>

          <div style={{ padding: '8px 12px', background: 'rgba(217,119,6,0.06)', border: '1px solid rgba(217,119,6,0.15)', borderRadius: 8, fontSize: 11, color: 'var(--text-secondary)' }}>
            <strong>House BL</strong> — Created by CS with actual shipper and consignee. Sent to customer for approval.
          </div>

          <div>
            <label className="lt-label">House BL Number <span style={{ color: '#dc2626' }}>*</span></label>
            <input className="lt-input" style={{ width: '100%' }} value={houseBlNumber}
              onChange={e => setHouseBlNumber(e.target.value)}
              placeholder="e.g. SYNHBL-2026-001" autoFocus />
          </div>

          <div>
            <label className="lt-label">Shipper (Actual)</label>
            <input className="lt-input" style={{ width: '100%' }} value={houseBlShipper}
              onChange={e => setHouseBlShipper(e.target.value)}
              placeholder="Actual shipper name" />
          </div>

          <div>
            <label className="lt-label">Consignee (Actual) <span style={{ color: '#dc2626' }}>*</span></label>
            <input className="lt-input" style={{ width: '100%' }} value={houseBlConsignee}
              onChange={e => setHouseBlConsignee(e.target.value)}
              placeholder="Actual consignee name" />
          </div>

          {/* Send House BL to customer */}
          <div>
            <label className="lt-label">Send House BL to Customer via</label>
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <button
                className={`db-btn ${sendMethod === 'email' ? 'primary' : ''}`}
                style={sendMethod !== 'email' ? { background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-secondary)' } : {}}
                onClick={() => { setSendMethod('email'); setEmailConfirmed(false) }}
              >
                <Mail size={13} style={{ marginRight: 4 }} /> Email
              </button>
              <button
                className={`db-btn ${sendMethod === 'whatsapp' ? 'primary' : ''}`}
                style={sendMethod === 'whatsapp' ? { background: '#25d366', borderColor: '#25d366' } : { background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
                onClick={() => { setSendMethod('whatsapp'); setEmailConfirmed(false) }}
              >
                <MessageCircle size={13} style={{ marginRight: 4 }} /> WhatsApp
              </button>
            </div>
          </div>

          {sendMethod === 'email' && (
            <>
              <div>
                <label className="lt-label">Customer Email <span style={{ color: '#dc2626' }}>*</span></label>
                <input className="lt-input" style={{ width: '100%' }} type="email"
                  value={customerContactEmail} onChange={e => setCustomerContactEmail(e.target.value)}
                  placeholder="customer@example.com" />
              </div>
              {customerContactEmail.includes('@') && (
                <>
                  <button className="db-btn" type="button"
                    onClick={() => openMailto(customerContactEmail, `House Bill of Lading ${houseBlNumber || '(pending)'} — ${hbBkg.customer_name}`, `House BL Number: ${houseBlNumber}\nShipper: ${houseBlShipper}\nConsignee: ${houseBlConsignee}\nBooking: ${hbBkg.id}\nMaster BL: ${hbBkg.master_bl_number || 'N/A'}`)}
                    style={{ background: '#0078d4', borderColor: '#0078d4', color: '#fff', width: '100%' }}>
                    <Mail size={13} style={{ marginRight: 6 }} /> Open in Outlook
                  </button>
                  <div style={{ padding: '10px 14px', background: 'rgba(0,120,212,0.06)', border: '1px solid rgba(0,120,212,0.2)', borderRadius: 8 }}>
                    <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, cursor: 'pointer', fontSize: 12, color: 'var(--text-secondary)' }}>
                      <input type="checkbox" checked={emailConfirmed} onChange={e => setEmailConfirmed(e.target.checked)} style={{ marginTop: 2 }} />
                      <span>
                        I confirm that I have sent the House BL to the customer via email.
                        <span style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                          Click "Open in Outlook" above, send the email, then check this box.
                        </span>
                      </span>
                    </label>
                  </div>
                </>
              )}
            </>
          )}

          {sendMethod === 'whatsapp' && (
            <>
              <div>
                <label className="lt-label">Customer WhatsApp Number</label>
                <input className="lt-input" style={{ width: '100%' }}
                  value={customerContactPhone} onChange={e => setCustomerContactPhone(e.target.value)}
                  placeholder="+94 7X XXX XXXX" />
              </div>
              <div style={{ padding: '10px 14px', background: 'rgba(37,211,102,0.06)', border: '1px solid rgba(37,211,102,0.2)', borderRadius: 8 }}>
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, cursor: 'pointer', fontSize: 12, color: 'var(--text-secondary)' }}>
                  <input type="checkbox" checked={waConfirmed} onChange={e => setWaConfirmed(e.target.checked)} style={{ marginTop: 2 }} />
                  <span>
                    I confirm that I have sent the House BL to the customer via WhatsApp.
                    <span style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                      No WhatsApp integration — manual confirmation.
                    </span>
                  </span>
                </label>
              </div>
            </>
          )}

          <div>
            <label className="lt-label">Notes (optional)</label>
            <input className="lt-input" style={{ width: '100%' }} value={formNote}
              onChange={e => setFormNote(e.target.value)}
              placeholder="Any notes..." />
          </div>
        </div>
      )
    })()}



    {/* Quote approval form */}
    {actionModal.actionKind === 'approve-quote' && (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div>
          <label className="lt-label">Decision</label>
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <button
              className={`db-btn ${formDecision === 'approve' ? 'primary' : ''}`}
              style={formDecision !== 'approve' ? { background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-secondary)' } : {}}
              onClick={() => setFormDecision('approve')}
            >
              Approve
            </button>
            <button
              className={`db-btn ${formDecision === 'reject' ? 'primary' : ''}`}
              style={formDecision === 'reject' ? { background: '#dc2626', borderColor: '#dc2626' } : { background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
              onClick={() => setFormDecision('reject')}
            >
              Reject
            </button>
          </div>
        </div>
        <div>
          <label className="lt-label">{formDecision === 'reject' ? 'Rejection Reason' : 'Approval Note (optional)'}</label>
          <input className="lt-input" style={{ width: '100%' }} value={formNote} onChange={e => setFormNote(e.target.value)} placeholder={formDecision === 'reject' ? 'Reason for rejection...' : 'Optional note...'} />
        </div>
      </div>
    )}

    {/* Job Reference Number — shown in Draft BL step */}
    {actionModal.actionKind === 'save-draft-bl' && (
      <div style={{ marginTop: 16 }}>
        <label className="lt-label">Job Reference Number <span style={{ color: '#dc2626' }}>*</span></label>
        <input className="lt-input" style={{ width: '100%' }}
          value={jobRefNumber} onChange={e => setJobRefNumber(e.target.value)}
          placeholder="Enter job reference number..." />
      </div>
    )}

    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24, paddingTop: 20, borderTop: '1px solid #eef2f6' }}>
      <button className="db-btn" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }} onClick={() => setActionModal(null)}>Cancel</button>
      <button
        className="db-btn primary"
        disabled={
          (actionModal.actionKind === 'prepare-quotation' && !quotationContent.trim()) ||
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
        }
        style={
          actionModal.actionKind === 'verify-kyc' && formDecision === 'reject' ? { background: '#dc2626', borderColor: '#dc2626' } :
          actionModal.actionKind === 'verify-kyc' ? { background: '#16a34a', borderColor: '#16a34a' } :
          actionModal.actionKind === 'approve-quote' && formDecision === 'reject' ? { background: '#dc2626', borderColor: '#dc2626' } :
          actionModal.actionKind === 'prepare-quotation' ? { background: '#0f8fa8', borderColor: '#0f8fa8' } :
          actionModal.actionKind === 'send-to-customer' && sendMethod === 'whatsapp' && waConfirmed ? { background: '#25d366', borderColor: '#25d366' } :
          actionModal.actionKind === 'send-to-customer' && sendMethod === 'email' && customerContactEmail.includes('@') && emailConfirmed ? {} :
          actionModal.actionKind === 'booking-request' ? { background: '#0f8fa8', borderColor: '#0f8fa8' } :
          actionModal.actionKind === 'confirm-booking' && formVessel.trim() ? { background: '#d97706', borderColor: '#d97706' } :
          actionModal.actionKind === 'confirm-booking' ? { opacity: 0.4, cursor: 'not-allowed' } :
          actionModal.actionKind === 'release-booking' && sendMethod === 'whatsapp' && waConfirmed ? { background: '#25d366', borderColor: '#25d366' } :
          actionModal.actionKind === 'release-booking' && sendMethod === 'email' && customerContactEmail.includes('@') ? {} :
          actionModal.actionKind === 'release-booking' ? { opacity: 0.4, cursor: 'not-allowed' } :
          actionModal.actionKind === 'bl-approval' && blDecision === 'approved' ? { background: '#16a34a', borderColor: '#16a34a' } :
          actionModal.actionKind === 'bl-approval' && blDecision === 'changes-requested' && formNote.trim() ? { background: '#d97706', borderColor: '#d97706' } :
          actionModal.actionKind === 'bl-approval' ? { opacity: 0.4, cursor: 'not-allowed' } :
          actionModal.actionKind === 'record-master-bl' && masterBlNumber.trim() && masterBlConsignee.trim() ? { background: '#0d9488', borderColor: '#0d9488' } :
          actionModal.actionKind === 'record-master-bl' ? { opacity: 0.4, cursor: 'not-allowed' } :
          actionModal.actionKind === 'create-house-bl' && sendMethod === 'whatsapp' && waConfirmed && houseBlNumber.trim() && houseBlConsignee.trim() ? { background: '#25d366', borderColor: '#25d366' } :
          actionModal.actionKind === 'create-house-bl' && sendMethod === 'email' && customerContactEmail.includes('@') && emailConfirmed && houseBlNumber.trim() && houseBlConsignee.trim() ? { background: '#d97706', borderColor: '#d97706' } :
          actionModal.actionKind === 'create-house-bl' ? { opacity: 0.4, cursor: 'not-allowed' } :
          (actionModal.actionKind === 'generate-si' && siIsNvocc && (!siField('shipper_name').trim() || !siField('consignee_name').trim())) ? { opacity: 0.4, cursor: 'not-allowed' } :
          (actionModal.actionKind === 'generate-si') ? { background: '#0891b2', borderColor: '#0891b2' } :
          (actionModal.actionKind === 'create-hbl' && (!hblField('shipperName').trim() || !hblField('consigneeName').trim())) ? { opacity: 0.4, cursor: 'not-allowed' } :
          (actionModal.actionKind === 'create-hbl') ? { background: '#d97706', borderColor: '#d97706' } :
          (actionModal.actionKind === 'create-bl' && (!mblField('shipperName').trim() || !mblField('consigneeName').trim())) ? { opacity: 0.4, cursor: 'not-allowed' } :
          (actionModal.actionKind === 'create-bl') ? { background: '#0d9488', borderColor: '#0d9488' } :
          (actionModal.actionKind === 'prepare-quotation' && !quotationContent.trim()) ? { opacity: 0.4, cursor: 'not-allowed' } :
          (actionModal.actionKind === 'send-to-customer' && ((sendMethod === 'email' && (!customerContactEmail.trim() || !customerContactEmail.includes('@') || !emailConfirmed)) || (sendMethod === 'whatsapp' && !waConfirmed))) ? { opacity: 0.4, cursor: 'not-allowed' } :
          {}
        }
        onClick={handleModalSubmit}
      >
        {kycSending ? <><Loader2 size={12} className="spin" /> Sending...</> :
         quotationSending ? <><Loader2 size={12} className="spin" /> Sending...</> :
         actionModal.actionKind === 'verify-kyc' && formDecision === 'reject' ? 'Flag & Return to CS' :
         actionModal.actionKind === 'verify-kyc' ? <><ShieldCheck size={12} /> Verify &amp; Push</> :
         actionModal.actionKind === 'prepare-quotation' ? <><ClipboardCheck size={12} /> Save Quotation</> :
         actionModal.actionKind === 'send-to-customer' && sendMethod === 'email' ? <><Mail size={12} /> Send via Email</> :
         actionModal.actionKind === 'send-to-customer' && sendMethod === 'whatsapp' ? <><MessageCircle size={12} /> Confirm WhatsApp Sent</> :
         actionModal.actionKind === 'booking-request' ? <><Ship size={12} /> Create Booking &amp; Send to Procurement</> :
         actionModal.actionKind === 'confirm-booking' && formVessel.trim() ?<><Ship size={12} /> Confirm Manually &amp; Send to CS</> :
         actionModal.actionKind === 'release-booking' && sendMethod === 'email' ? <><Mail size={12} /> Release &amp; Send via Email</> :
         actionModal.actionKind === 'release-booking' && sendMethod === 'whatsapp' ? <><MessageCircle size={12} /> Release &amp; Confirm WhatsApp Sent</> :
         actionModal.actionKind === 'bl-approval' && blDecision === 'approved' ? <><Check size={12} /> BL Approved</> :
         actionModal.actionKind === 'bl-approval' && blDecision === 'changes-requested' ? <><Edit3 size={12} /> Record Changes Requested</> :
         actionModal.actionKind === 'record-master-bl' ? <><FileText size={12} /> Record Master BL</> :
         actionModal.actionKind === 'create-house-bl' && sendMethod === 'email' ? <><Mail size={12} /> Create &amp; Send House BL via Email</> :
         actionModal.actionKind === 'create-house-bl' && sendMethod === 'whatsapp' ? <><MessageCircle size={12} /> Create &amp; Confirm House BL Sent</> :
         actionModal.actionKind === 'approve-quote' && formDecision === 'reject' ? 'Reject' :
         actionModal.actionKind === 'generate-si' && siIsNvocc ? <><FileText size={12} /> Generate SI Document</> :
         actionModal.actionKind === 'generate-si' && !siIsNvocc ? <><Check size={12} /> Confirm SI Submitted</> :
         actionModal.actionKind === 'create-hbl' ? <><FileText size={12} /> Create House BL</> :
         actionModal.actionKind === 'create-bl' ? <><FileText size={12} /> Record Master BL</> :
         <>Confirm &amp; Push <ChevronRight size={12} /></>}
      </button>
    </div>
  </div>
</div>
  )
}
