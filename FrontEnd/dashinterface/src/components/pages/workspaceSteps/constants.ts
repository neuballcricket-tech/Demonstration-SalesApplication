import type { ItemType, StepDef } from './types'

// ---------------------------------------------------------------------------
// Badge class map
// ---------------------------------------------------------------------------

export const TYPE_BADGE_CLASS: Record<ItemType, string> = {
  inquiry: 'db-badge accent',
  booking: 'db-badge warning',
  quote: 'db-badge purple',
  customer: 'db-badge',
}

// ---------------------------------------------------------------------------
// Step-based navigation — per-role workflow steps
// ---------------------------------------------------------------------------

export const CS_STEPS: StepDef[] = [
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

  // --- Steps 11–17: BL processing pipeline — reserved for future release ---
  // { key: 'cs-bl-vessel',   label: 'Vessel',           actionKinds: ['save-vessel-schedule'],  stepNumber: 11 },
  // { key: 'cs-bl-booking',  label: 'Booking Creation', actionKinds: ['create-vessel-booking'], stepNumber: 12 },
  // { key: 'cs-draft-bl',    label: 'Draft BL',         actionKinds: ['save-draft-bl'],         stepNumber: 13 },
  // { key: 'cs-create-hbl',  label: 'Create HBL',       actionKinds: ['create-hbl'],            stepNumber: 14 },
  // { key: 'cs-create-bl',   label: 'Create MBL',       actionKinds: ['create-bl'],             stepNumber: 15 },
  // { key: 'cs-pre-advice',  label: 'Pre-Advice',       actionKinds: ['send-pre-advice'],       stepNumber: 16 },
  // { key: 'cs-pre-alert',   label: 'Pre-Alert',        actionKinds: ['send-pre-alert'],        stepNumber: 17 },
]

export const FINANCE_STEPS: StepDef[] = [
  { key: 'fin-kyc',       label: 'KYC Review',  actionKinds: ['verify-kyc'],         stepNumber: 1 },
  // { key: 'fin-approvals', label: 'Approvals',   actionKinds: ['approve-quote'],      stepNumber: 2 },
]

export const PROCUREMENT_STEPS: StepDef[] = [
  { key: 'proc-rates',        label: 'Rate Check',       actionKinds: ['check-inttra-rates'],         stepNumber: 1 },
  { key: 'proc-booking-req',  label: 'Booking Request',  actionKinds: ['review-booking-request'],     stepNumber: 2 },
  { key: 'proc-booking',      label: 'Booking',          actionKinds: ['confirm-liner-booking'],      stepNumber: 3 },
  { key: 'proc-release',      label: 'Release Order',    actionKinds: ['attach-release-order'],       stepNumber: 4 },
  // { key: 'proc-urgent',   label: 'Urgent',      actionKinds: ['acknowledge-procurement'],  stepNumber: 4 },
]

export const SALES_STEPS: StepDef[] = [
  { key: 'sales-inquiry',    label: 'Inquiry',           actionKinds: ['advance-workflow'],    stepNumber: 1 },
  { key: 'sales-kyc',        label: 'KYC',               actionKinds: ['send-kyc'],            stepNumber: 2 },
  { key: 'sales-rates',      label: 'Rates',             actionKinds: ['check-rates'],         stepNumber: 3 },
  { key: 'sales-prep-quote', label: 'Prepare Quotation', actionKinds: ['prepare-quotation'],   stepNumber: 4 },
  { key: 'sales-send-quote', label: 'Send Quote',        actionKinds: ['send-to-customer'],    stepNumber: 5 },
  { key: 'sales-response',   label: 'Response',          actionKinds: ['customer-response'],   stepNumber: 6 },
  { key: 'sales-booking',    label: 'Booking',           actionKinds: ['booking-request'],     stepNumber: 7 },
]

export const ADMIN_STEPS: StepDef[] = [
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

export const ROLE_STEP_MAP: Record<string, StepDef[]> = {
  CS: CS_STEPS,
  Finance: FINANCE_STEPS,
  Procurement: PROCUREMENT_STEPS,
  Sales: SALES_STEPS,
  Admin: ADMIN_STEPS,
}

// NVOCC shipping lines — SI generation + email drafting is available for these
export const NVOCC_LINES = new Set(['ECU Worldwide', 'Consolidators International', 'Sea Consortium'])
