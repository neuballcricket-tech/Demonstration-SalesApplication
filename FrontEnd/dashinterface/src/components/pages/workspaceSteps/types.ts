import type { ActivityEntry } from '../../../types'

// ---------------------------------------------------------------------------
// Internal types used by Workspace and its sub-components
// ---------------------------------------------------------------------------

export type ItemType = 'inquiry' | 'booking' | 'quote' | 'customer'

export interface WorkspaceItem {
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
  /** RFQ group number - present when this inquiry came from an uploaded tender. */
  rfqRef?: number
}

export interface StepDef {
  key: string
  label: string
  actionKinds: string[]
  stepNumber: number
  group?: string
}

export interface BlContainerRow {
  containerNo: string
  size: string
  type: string
  shipmentType: string
  sealNo: string
  packages: string
  packageType: string
  grossWeight: string
  cbm: string
}

export interface MblContainerRow {
  containerNo: string
  containerType: string
  sealNo: string
  poNumber: string
  hsCode: string
  description: string
  grossWeight: string
  cbm: string
}

/** Per-option margin/remark overrides for the prepare-quotation step. */
export interface QuotationOptionOverride {
  margin: number
  isPercentage: boolean
  remark: string
}
