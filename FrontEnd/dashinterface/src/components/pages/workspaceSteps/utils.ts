import { EMPLOYEES } from '../../../types'
import type { ActivityEntry, Booking, LinerRecord } from '../../../types'
import type { CompletedRateOption, CompletedRateRequest } from '../../../types'

// ---------------------------------------------------------------------------
// Utility functions extracted from Workspace.tsx
// ---------------------------------------------------------------------------

export function empName(id: number): string {
  return EMPLOYEES.find(e => e.id === id)?.name ?? `EMP-${id}`
}

export function openMailto(to: string, subject: string, body: string): void {
  const url = `https://outlook.office.com/mail/deeplink/compose?to=${encodeURIComponent(to)}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
  window.open(url, '_blank')
}

export function formatRateOptionLine(
  opt: CompletedRateOption,
  isBest: boolean,
  liners: LinerRecord[],
): string {
  const r = opt.rate!
  const linerName = r.lin_id ? (liners.find(l => l.lin_id === r.lin_id)?.name ?? `Liner #${r.lin_id}`) : ''
  const typeLabel = opt.rate_type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
  const parts: string[] = []
  if (linerName) parts.push(linerName)
  parts.push(`${r.rate ?? '—'} ${r.currency ?? 'USD'}`)
  if (r.container_type) parts.push(r.container_type)
  if (r.transit) parts.push(`${r.transit}d transit`)
  const ft = r.free_time ?? r.free_days
  if (ft) parts.push(`${ft}d free`)
  if (r.valid_from && r.valid_to) parts.push(`valid ${r.valid_from} – ${r.valid_to}`)
  if (r.vessel_name) parts.push(`vessel: ${r.vessel_name}`)
  const prefix = isBest ? '  ★ ' : '  • '
  return `${prefix}[${typeLabel}] ${parts.join(' · ')}${isBest ? '  ← Recommended' : ''}`
}

export function buildRateSection(
  rr: CompletedRateRequest | undefined,
  selectedIds: number[],
  bestId: number | null,
  liners: LinerRecord[],
  fallbackCtx: ActivityEntry | null,
): string {
  const lines: string[] = []

  if (rr && rr.options.length > 0) {
    const selected = rr.options.filter(o => o.rate && selectedIds.includes(o.option_id))
    for (const opt of selected) {
      lines.push(formatRateOptionLine(opt, opt.option_id === bestId, liners))
    }
  }

  // Fallback: parse activity log notes
  if (lines.length === 0 && fallbackCtx) {
    const notes = fallbackCtx.notes ?? ''
    const dbRateMatch = notes.match(/DB Rates:\s*([^|]+)/i)
    const manualRateMatch = notes.match(/Manual Rates?:\s*([^|]+)/i)
    const dbRates = dbRateMatch?.[1]?.trim() ?? ''
    const manualRates = manualRateMatch?.[1]?.trim() ?? ''
    if (dbRates) dbRates.split(';').map(s => s.trim()).filter(Boolean).forEach(s => lines.push(`  • ${s}`))
    if (manualRates) manualRates.split('||').map(s => s.trim()).filter(Boolean).forEach(s => lines.push(`  • ${s}`))
  }

  return lines.length > 0 ? lines.join('\n') : '  • (Rate options to be confirmed — please edit)'
}

export function generateReleaseOrderDraft(bkg: Booking, method: 'email' | 'whatsapp', agentName: string): string {
  const ro = bkg.release_order_fields
  if (method === 'email') {
    return [
      `Subject: Release Order — ${bkg.id} — ${bkg.customer_name} — ${bkg.origin} → ${bkg.destination}`,
      '',
      `Dear ${bkg.customer_name},`,
      '',
      'Please find below your release order details for the above-referenced shipment.',
      '',
      '── RELEASE ORDER ──────────────────────────',
      ro?.reference_nbr   ? `Reference:     ${ro.reference_nbr}`           : '',
      ro?.pickup_depot    ? `Pick Up Depot: ${ro.pickup_depot}`             : '',
      ro?.pickup_depot_address ? `Depot Address: ${ro.pickup_depot_address}` : '',
      ro?.pickup_empty_date        ? `Pick Up Date:  ${ro.pickup_empty_date}`        : '',
      ro?.validity_expiration_date ? `Valid Until:   ${ro.validity_expiration_date}` : '',
      '',
      '── SHIPMENT DETAILS ────────────────────────',
      `Customer:      ${bkg.customer_name}`,
      `Origin:        ${bkg.origin}`,
      `Destination:   ${bkg.destination}`,
      `Container:     ${bkg.quantity}x ${bkg.container_type}`,
      ro?.cargo_description ? `Cargo:         ${ro.cargo_description}` : '',
      ro?.cargo_weight      ? `Weight:        ${ro.cargo_weight} kg`   : '',
      '',
      '── VESSEL SCHEDULE ─────────────────────────',
      `Carrier:       ${bkg.shipping_line}`,
      `Vessel:        ${bkg.vessel_name}`,
      `Voyage:        ${bkg.voyage_number}`,
      ro?.cut_off_date ? `Cut-Off:       ${ro.cut_off_date}` : '',
      ro?.etd          ? `ETD:           ${ro.etd}`           : '',
      ro?.eta          ? `ETA:           ${ro.eta}`           : '',
      '',
      'Please arrange to collect the empty containers from the depot before the cut-off date.',
      '',
      'Should you require any further assistance, please do not hesitate to contact us.',
      '',
      'Kind regards,',
      agentName,
      'Neuball Freight Services',
    ].filter(l => l !== null && l !== undefined).join('\n')
  } else {
    return [
      `*Release Order — ${bkg.customer_name}*`,
      `_${bkg.origin} → ${bkg.destination}_`,
      '',
      ro?.reference_nbr            ? `📋 *Reference:* ${ro.reference_nbr}`               : '',
      ro?.pickup_depot             ? `🏭 *Pick Up Depot:* ${ro.pickup_depot}`             : '',
      ro?.pickup_depot_address     ? `📍 *Address:* ${ro.pickup_depot_address}`           : '',
      ro?.pickup_empty_date        ? `📅 *Pick Up Date:* ${ro.pickup_empty_date}`         : '',
      ro?.validity_expiration_date ? `✅ *Valid Until:* ${ro.validity_expiration_date}`   : '',
      '',
      `🚢 *Vessel:* ${bkg.vessel_name}  |  *Voyage:* ${bkg.voyage_number}`,
      `📦 *Container:* ${bkg.quantity}x ${bkg.container_type}`,
      ro?.cut_off_date ? `⏰ *Cut-Off:* ${ro.cut_off_date}` : '',
      ro?.etd          ? `🛫 *ETD:* ${ro.etd}`               : '',
      ro?.eta          ? `🛬 *ETA:* ${ro.eta}`               : '',
      '',
      'Please arrange container pick-up before the cut-off date.',
      'Contact us if you need any assistance.',
    ].filter(l => l !== null && l !== undefined).join('\n')
  }
}

export function findContext(activityLog: ActivityEntry[], refId: string): ActivityEntry | null {
  return activityLog.find(a => a.ref_id === refId) ?? null
}
