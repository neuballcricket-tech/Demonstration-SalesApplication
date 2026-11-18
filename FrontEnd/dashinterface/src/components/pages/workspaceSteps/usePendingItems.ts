import { useMemo } from 'react'
import {
  WORKFLOW_STAGES, stageRoleLabel, isSpotInquiry, daysUntil,
  type Inquiry, type Booking, type Quote, type Customer,
  type ActivityEntry, type ContainerLine, type WorkflowStage,
  type UserRole,
} from '../../../types'
import type { KycPendingClient, KycRequestRecord } from '../../../api'
import type { CompletedRateRequest } from '../../../types'
import type { WorkspaceItem } from './types'
import { findContext } from './utils'

// ---------------------------------------------------------------------------
// usePendingItems — derives the list of pending work items from live data.
// Extracted from the large useMemo block in Workspace.tsx.
// ---------------------------------------------------------------------------

export function usePendingItems(
  inquiries: Inquiry[],
  bookings: Booking[],
  quotes: Quote[],
  customers: Customer[],
  activityLog: ActivityEntry[],
  activeRole: UserRole,
  kycPendingClients: KycPendingClient[],
  kycRequests: KycRequestRecord[],
  completedRateRequests: CompletedRateRequest[],
): { pendingItems: WorkspaceItem[] } {


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
                containerType: inq.container_type ?? '20GP',
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

        // Attach saved rate request data for quotation-prep and send-to-customer work items
        const rateRequest = (inq.workflow_stage === 'quotation-prep' || inq.workflow_stage === 'quotation-sent') && inq.inq_id
          ? completedRateRequests.find(rr => rr.inq_id === inq.inq_id)
          : undefined

        // Only show quotation-prep items that have a completed rate request
        // (the backend's completed-for-quoting endpoint already filters by emp_id)
        if (inq.workflow_stage === 'quotation-prep' && !rateRequest) continue

        pending.push({
          type: 'inquiry',
          refId: inq.id,
          customerName: inq.customer_name,
          title,
          subtitle: `${inq.request} · ${routeLabel} · ${containerLabel} · ${inq.delivery_type === 'door-to-door' ? 'Door-to-Door' : 'Port-to-Port'}`,
          urgentFlag: isSpotInquiry(inq.inquiry_text ?? ''),
          createdAt: inq.created_at,
          previousContext: findContext(activityLog, inq.id),
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
          previousContext: findContext(activityLog, bkg.id),
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
          previousContext: findContext(activityLog, bkg.id),
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
          previousContext: findContext(activityLog, bkg.id),
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
          previousContext: findContext(activityLog, bkg.id),
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
          previousContext: findContext(activityLog, bkg.id),
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
        previousContext: findContext(activityLog, bkg.id),
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
        previousContext: findContext(activityLog, bkg.id),
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
        previousContext: findContext(activityLog, bkg.id),
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
        previousContext: findContext(activityLog, bkg.id),
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
        previousContext: findContext(activityLog, bkg.id),
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
        previousContext: findContext(activityLog, bkg.id),
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
        previousContext: findContext(activityLog, bkg.id),
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
        previousContext: findContext(activityLog, bkg.id),
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
        previousContext: findContext(activityLog, bkg.id),
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
        previousContext: findContext(activityLog, bkg.id),
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
        previousContext: findContext(activityLog, bkg.id),
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
        previousContext: findContext(activityLog, bkg.id),
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
          previousContext: findContext(activityLog, q.id),
          actionLabel: 'Approve / Reject',
          actionKind: 'approve-quote',
          sourceData: { quote: q },
        })
      }
    }

    // --- From KYC Pending Queue (GET /kyc/kyc-requests/pending) ---
    // CS and Sales see clients awaiting KYC initiation regardless of inquiry workflow stage
    if (!role || role === 'CS' || role === 'Sales') {
      const seenCliIds = new Set<number>()
      for (const client of kycPendingClients) {
        if (seenCliIds.has(client.cli_id)) continue
        seenCliIds.add(client.cli_id)
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

    // Deduplicate: same refId + actionKind + containerIdx should appear only once.
    // This guards against data-source duplication (optimistic inserts, StrictMode
    // double-fetches, or stale temp items surviving a refresh).
    const seen = new Set<string>()
    const deduped = pending.filter(item => {
      const ci = item.sourceData?.containerIdx ?? 0
      const key = `${item.refId}::${item.actionKind}::${ci}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })

    // Sort: urgent first, then by urgencySortKey (lower = more urgent), then newest first
    deduped.sort((a, b) => {
      if (a.urgentFlag !== b.urgentFlag) return a.urgentFlag ? -1 : 1
      // If both have urgencySortKey, sort by it (lower = more urgent)
      const aKey = a.urgencySortKey ?? Infinity
      const bKey = b.urgencySortKey ?? Infinity
      if (aKey !== bKey) return aKey - bKey
      if (!a.createdAt && b.createdAt) return 1
      if (a.createdAt && !b.createdAt) return -1
      return b.createdAt.localeCompare(a.createdAt)
    })

    return { pendingItems: deduped }
  }, [inquiries, bookings, quotes, customers, activityLog, activeRole, kycPendingClients, kycRequests, completedRateRequests]) // eslint-disable-line react-hooks/exhaustive-deps

  return { pendingItems }
}
