import html2pdf from 'html2pdf.js'
import { EMPLOYEES } from '../../../types'
import type { ActivityEntry, Booking, LinerRecord, Inquiry, ContainerLine } from '../../../types'
import type { CompletedRateOption, CompletedRateRequest } from '../../../types'
import type { QuotationOptionOverride } from './types'

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


/** Short date format for the quotation text table. */
function fmtD(d: string | null | undefined): string {
  if (!d) return ''
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
}

/** Build a single row object from a CompletedRateOption. */
function optionToRow(
  opt: CompletedRateOption,
  isBest: boolean,
  liners: LinerRecord[],
  finalAmt?: number,
  marginOverride?: { margin: number; isPercentage: boolean },
) {
  const r = opt.rate!
  const linerName = r.lin_id ? (liners.find(l => l.lin_id === r.lin_id)?.name ?? `Liner #${r.lin_id}`) : '-'
  const typeLabel = opt.rate_type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
  const vesselLabel = opt.vessel_name || r.vessel_name || ''
  const vessel = vesselLabel ? `${vesselLabel}${opt.voyage_number ? ` / ${opt.voyage_number}` : ''}` : '-'
  const baseRate = r.rate ?? 0
  const currency = r.currency ?? 'USD'
  const displayFinal = finalAmt != null ? Math.round(finalAmt * 100) / 100 : baseRate
  const etd = fmtD(opt.etd_pol) || '-'
  const eta = fmtD(opt.eta_pod) || '-'
  const transit = (opt.etd_pol && opt.eta_pod)
    ? ''
    : r.transit ? `${r.transit}d` : ''
  const validity = (r.valid_from && r.valid_to) ? `${fmtD(r.valid_from)} – ${fmtD(r.valid_to)}` : ''
  const remark = opt.service_name || ''
  const containerType = r.container_type || ''
  const ft = r.free_time ?? r.free_days
  const freeTime = ft ? `${ft} days free time` : ''
  const cutoff = opt.bk_cutoff ? `Cutoff: ${fmtD(opt.bk_cutoff)}` : ''

  let marginLabel = ''
  if (marginOverride && marginOverride.margin !== 0) {
    marginLabel = marginOverride.isPercentage
      ? `+ ${marginOverride.margin}% margin`
      : `+ ${marginOverride.margin} ${currency} flat`
  }

  return {
    mark: isBest ? '★' : ' ',
    liner: linerName,
    vessel,
    type: typeLabel,
    rate: `${baseRate.toLocaleString()} ${currency}`,
    final: `${displayFinal.toLocaleString()} ${currency}`,
    etd,
    eta,
    validity,
    transit,
    remark,
    containerType,
    freeTime,
    cutoff,
    marginLabel,
    baseRate,
    currency,
    displayFinal,
  }
}

export function buildRateSection(
  rr: CompletedRateRequest | undefined,
  selectedIds: number[],
  bestId: number | null,
  liners: LinerRecord[],
  fallbackCtx: ActivityEntry | null,
  overrides?: Record<number, { margin: number; isPercentage: boolean }>,
): string {
  if (!rr || rr.options.length === 0) {
    // Fallback: parse activity log notes
    if (fallbackCtx) {
      const notes = fallbackCtx.notes ?? ''
      const dbRateMatch = notes.match(/DB Rates:\s*([^|]+)/i)
      const manualRateMatch = notes.match(/Manual Rates?:\s*([^|]+)/i)
      const dbRates = dbRateMatch?.[1]?.trim() ?? ''
      const manualRates = manualRateMatch?.[1]?.trim() ?? ''
      const lines: string[] = []
      if (dbRates) dbRates.split(';').map(s => s.trim()).filter(Boolean).forEach(s => lines.push(`  • ${s}`))
      if (manualRates) manualRates.split('||').map(s => s.trim()).filter(Boolean).forEach(s => lines.push(`  • ${s}`))
      if (lines.length) return lines.join('\n')
    }
    return '  (Rate options to be confirmed - please edit)'
  }

  const selected = rr.options.filter(o => o.rate && selectedIds.includes(o.option_id))
  if (selected.length === 0) return '  (No options selected)'

  // Build sentence-by-sentence paragraphs
  const paragraphs: string[] = []

  selected.forEach((opt, idx) => {
    const ovr = overrides?.[opt.option_id]
    let finalAmt: number | undefined
    if (ovr) {
      const baseRate = opt.rate!.rate ?? 0
      finalAmt = ovr.isPercentage ? baseRate * (1 + ovr.margin / 100) : baseRate + ovr.margin
    }
    const isBest = opt.option_id === bestId
    const r = optionToRow(opt, isBest, liners, finalAmt, ovr)

    const lines: string[] = []

    // Header: Option N (★ Recommended):
    const header = isBest ? `Option ${idx + 1} (Recommended):` : `Option ${idx + 1}:`
    lines.push(header)

    // Line 1: Liner - FinalAmt per ContainerType
    const mainLine = [r.liner, `${r.displayFinal.toLocaleString()} ${r.currency}`]
    if (r.containerType) mainLine.push(`per ${r.containerType}`)
    lines.push(`  ${mainLine.join(' - ')}`)

    // Line 2: Vessel/schedule OR transit
    if (r.vessel !== '-') {
      const schedParts = [`Vessel: ${r.vessel}`]
      if (r.etd !== '-') schedParts.push(`ETD ${r.etd}`)
      if (r.eta !== '-') schedParts.push(`ETA ${r.eta}`)
      lines.push(`  ${schedParts.join(' · ')}`)
    } else if (r.transit) {
      lines.push(`  Transit: ${r.transit}`)
    }

    // Line 3: Validity
    if (r.validity) lines.push(`  Valid: ${r.validity}`)

    // Line 4: Free time, cutoff
    const extras = [r.freeTime, r.cutoff].filter(Boolean)
    if (extras.length > 0) lines.push(`  ${extras.join(' · ')}`)

    paragraphs.push(lines.join('\n'))
  })

  return paragraphs.join('\n\n')
}

/** Legacy single-line formatter (kept for activity log summaries). */
export function formatRateOptionLine(
  opt: CompletedRateOption,
  isBest: boolean,
  liners: LinerRecord[],
  finalAmt?: number,
): string {
  const r = opt.rate!
  const linerName = r.lin_id ? (liners.find(l => l.lin_id === r.lin_id)?.name ?? `Liner #${r.lin_id}`) : ''
  const typeLabel = opt.rate_type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
  const displayRate = finalAmt != null ? Math.round(finalAmt * 100) / 100 : (r.rate ?? '-')
  const parts: string[] = []
  if (linerName) parts.push(linerName)
  parts.push(`${displayRate} ${r.currency ?? 'USD'}`)
  if (r.container_type) parts.push(r.container_type)
  const vesselLabel = opt.vessel_name || r.vessel_name
  if (vesselLabel) parts.push(`vessel: ${vesselLabel}${opt.voyage_number ? ` / ${opt.voyage_number}` : ''}`)
  if (opt.service_name) parts.push(`svc: ${opt.service_name}`)
  if (opt.etd_pol || opt.eta_pod) {
    const etd = fmtD(opt.etd_pol)
    const eta = fmtD(opt.eta_pod)
    if (etd && eta) parts.push(`${etd} → ${eta}`)
    else if (etd) parts.push(`ETD ${etd}`)
    else if (eta) parts.push(`ETA ${eta}`)
  } else if (r.transit) {
    parts.push(`${r.transit}d transit`)
  }
  if (opt.bk_cutoff) parts.push(`cutoff: ${fmtD(opt.bk_cutoff)}`)
  const ft = r.free_time ?? r.free_days
  if (ft) parts.push(`${ft}d free`)
  if (r.valid_from && r.valid_to) parts.push(`valid ${r.valid_from} – ${r.valid_to}`)
  const prefix = isBest ? '  ★ ' : '  • '
  return `${prefix}[${typeLabel}] ${parts.join(' · ')}${isBest ? '  ← Recommended' : ''}`
}

export function generateReleaseOrderDraft(bkg: Booking, method: 'email' | 'whatsapp', agentName: string): string {
  const ro = bkg.release_order_fields
  if (method === 'email') {
    return [
      `Subject: Release Order - ${bkg.id} - ${bkg.customer_name} - ${bkg.origin} → ${bkg.destination}`,
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
      `*Release Order - ${bkg.customer_name}*`,
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

/** Build the branded quotation HTML document (shared by preview, .eml attachment, and backend upload). */
export function buildQuotationHtml(
  inquiry: Inquiry,
  container: ContainerLine | undefined,
  options: CompletedRateOption[],
  selectedIds: Set<number>,
  bestId: number | null,
  _overrides: Record<number, QuotationOptionOverride>,
  liners: LinerRecord[],
  employeeName: string,
  computeFinal: (optId: number, baseRate: number) => number,
): string {
  const today = new Date().toISOString().slice(0, 10)
  const dest = container?.destination || inquiry.destination
  const containerLabel = container ? `${container.quantity}× ${container.containerType}` : '-'
  const commodity = container?.commodityType || inquiry.commodity_type || ''
  const fmtShort = (d: string | null | undefined) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'

  const selected = options.filter(o => o.rate && selectedIds.has(o.option_id))
  const tableRows = selected.map((opt, idx) => {
    const r = opt.rate!
    const linerName = r.lin_id ? (liners.find(l => l.lin_id === r.lin_id)?.name ?? `Liner #${r.lin_id}`) : '-'
    const baseRate = r.rate ?? 0
    const finalAmt = Math.round(computeFinal(opt.option_id, baseRate) * 100) / 100
    const currency = r.currency ?? 'USD'
    const vesselLabel = opt.vessel_name || r.vessel_name || ''
    const vessel = vesselLabel ? `${vesselLabel}${opt.voyage_number ? ` / ${opt.voyage_number}` : ''}` : '-'
    const etd = fmtShort(opt.etd_pol)
    const eta = fmtShort(opt.eta_pod)
    const isBest = opt.option_id === bestId
    const ft = r.free_time ?? r.free_days
    const freeTime = ft ? `${ft} days` : '-'
    const validTo = r.valid_to ? fmtShort(r.valid_to) : '-'

    return `<tr style="${isBest ? 'background:#eeeef8;' : idx % 2 ? 'background:#f8fafc;' : ''}">
      <td style="padding:8px 10px;border:1px solid #e2e8f0;text-align:center;font-weight:600;">${isBest ? '<span style="color:#f59e0b;">★</span> ' : ''}${idx + 1}</td>
      <td style="padding:8px 10px;border:1px solid #e2e8f0;font-weight:600;">${linerName}</td>
      <td style="padding:8px 10px;border:1px solid #e2e8f0;">${r.container_type || '-'}</td>
      <td style="padding:10px 16px;border:1px solid #e2e8f0;text-align:right;font-weight:700;font-size:14px;white-space:nowrap;">${finalAmt.toLocaleString()} ${currency}</td>
      <td style="padding:8px 10px;border:1px solid #e2e8f0;">${vessel}</td>
      <td style="padding:8px 10px;border:1px solid #e2e8f0;">${etd}</td>
      <td style="padding:8px 10px;border:1px solid #e2e8f0;">${eta}</td>
      <td style="padding:8px 10px;border:1px solid #e2e8f0;white-space:nowrap;">${validTo}</td>
      <td style="padding:8px 10px;border:1px solid #e2e8f0;text-align:center;">${freeTime}</td>
    </tr>`
  }).join('\n')

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Quotation - ${inquiry.id} - ${inquiry.customer_name}</title>
<style>
  @media print {
    body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    .no-print { display: none !important; }
  }
  body { font-family: 'Segoe UI', Arial, Helvetica, sans-serif; margin: 0; padding: 0; color: #1e293b; font-size: 13px; }
  .page { max-width: 800px; margin: 0 auto; padding: 24px; }
  .header { background: #2c2c82; color: #fff; padding: 24px 32px; display: flex; justify-content: space-between; align-items: center; }
  .header h1 { margin: 0; font-size: 22px; font-weight: 800; letter-spacing: 1px; }
  .header h1 .cyan { color: #53d8e9; }
  .header .brand { font-size: 13px; opacity: 0.85; margin-top: 4px; }
  .header .doc-title { text-align: right; }
  .header .doc-title h2 { margin: 0; font-size: 18px; font-weight: 700; letter-spacing: 0.5px; }
  .header .doc-title .date { font-size: 12px; opacity: 0.8; margin-top: 2px; }
  .details { display: grid; grid-template-columns: 1fr 1fr; gap: 0; border: 1px solid #e2e8f0; border-top: none; }
  .details .cell { padding: 10px 16px; border-bottom: 1px solid #e2e8f0; }
  .details .cell:nth-child(odd) { border-right: 1px solid #e2e8f0; }
  .details .lbl { font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px; }
  .details .val { font-size: 13px; font-weight: 600; color: #1e293b; }
  .section-title { font-size: 13px; font-weight: 700; color: #2c2c82; text-transform: uppercase; letter-spacing: 0.5px; margin: 24px 0 10px; padding-bottom: 6px; border-bottom: 2px solid #2c2c82; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th { background: #2c2c82; color: #fff; padding: 10px 10px; text-align: left; font-size: 11px; font-weight: 700; letter-spacing: 0.3px; border: 1px solid #232370; }
  .terms { margin-top: 24px; font-size: 12px; color: #475569; }
  .terms ul { margin: 6px 0; padding-left: 20px; }
  .terms li { margin-bottom: 4px; }
  .footer { margin-top: 32px; padding-top: 16px; border-top: 2px solid #2c2c82; display: flex; justify-content: space-between; font-size: 11px; color: #64748b; }
  .footer .company { font-weight: 700; color: #2c2c82; }
  .print-btn { position: fixed; top: 16px; right: 16px; padding: 10px 20px; background: #2c2c82; color: #fff; border: none; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer; z-index: 100; }
  .print-btn:hover { background: #232370; }
</style>
</head>
<body>
<button class="print-btn no-print" onclick="window.print()">Save as PDF / Print</button>
<div class="page">
  <div class="header">
    <div>
      <h1><span class="cyan">CLS</span>ynergy</h1>
      <div class="brand">CLSynergy (Pvt) Ltd</div>
    </div>
    <div class="doc-title">
      <h2>FREIGHT QUOTATION</h2>
      <div class="date">${today}</div>
    </div>
  </div>

  <div class="details">
    <div class="cell"><div class="lbl">Customer</div><div class="val">${inquiry.customer_name}</div></div>
    <div class="cell"><div class="lbl">Reference</div><div class="val">${inquiry.id}</div></div>
    <div class="cell"><div class="lbl">Route</div><div class="val">${inquiry.origin} → ${dest}</div></div>
    <div class="cell"><div class="lbl">Container</div><div class="val">${containerLabel}${commodity ? ` · ${commodity}` : ''}</div></div>
    <div class="cell"><div class="lbl">Incoterm</div><div class="val">${inquiry.incoterm || '-'}</div></div>
    <div class="cell"><div class="lbl">Cargo Ready</div><div class="val">${inquiry.cargo_ready_date || '-'}</div></div>
  </div>

  <div class="section-title">Rate Options</div>
  <table>
    <thead>
      <tr>
        <th style="text-align:center;width:40px;">#</th>
        <th>Carrier</th>
        <th>Container</th>
        <th style="text-align:right;min-width:120px;">Rate</th>
        <th>Vessel / Voyage</th>
        <th>ETD</th>
        <th>ETA</th>
        <th>Valid To</th>
        <th>Free Time</th>
      </tr>
    </thead>
    <tbody>
      ${tableRows || '<tr><td colspan="9" style="padding:16px;text-align:center;color:#94a3b8;border:1px solid #e2e8f0;">No rate options selected</td></tr>'}
    </tbody>
  </table>

  <div class="terms">
    <strong>Terms & Conditions</strong>
    <ul>
      <li>This quotation is valid for 14 days from the date of issue.</li>
      <li>Rates are subject to space and equipment availability at the time of booking.</li>
      <li>Port surcharges, customs duties, and inland haulage are quoted separately unless stated above.</li>
      <li>All rates are in the currency indicated and exclusive of applicable taxes.</li>
    </ul>
  </div>

  <p style="margin-top:24px;font-size:13px;">
    Please confirm your preferred option at your earliest convenience.<br>
    Should you have any questions, do not hesitate to contact us.
  </p>
  <p style="font-size:13px;margin-top:16px;">
    Best regards,<br>
    <strong>${employeeName}</strong><br>
    CLSynergy (Pvt) Ltd
  </p>

  <div class="footer">
    <span class="company">CLSynergy (Pvt) Ltd</span>
    <span>Generated on ${today}</span>
  </div>
</div>
</body>
</html>`
}

export function generateQuotationPdf(
  inquiry: Inquiry,
  container: ContainerLine | undefined,
  options: CompletedRateOption[],
  selectedIds: Set<number>,
  bestId: number | null,
  overrides: Record<number, QuotationOptionOverride>,
  liners: LinerRecord[],
  employeeName: string,
  computeFinal: (optId: number, baseRate: number) => number,
): void {
  const html = buildQuotationHtml(inquiry, container, options, selectedIds, bestId, overrides, liners, employeeName, computeFinal)
  const blob = new Blob([html], { type: 'text/html' })
  const url = URL.createObjectURL(blob)
  const win = window.open(url, '_blank')
  if (win) {
    win.addEventListener('afterprint', () => URL.revokeObjectURL(url))
  }
}

/**
 * Generate a PDF Blob from the quotation HTML using html2pdf.js.
 * Returns a Promise that resolves to the PDF Blob.
 */
export function generateQuotationPdfBlob(
  inquiry: Inquiry,
  container: ContainerLine | undefined,
  options: CompletedRateOption[],
  selectedIds: Set<number>,
  bestId: number | null,
  overrides: Record<number, QuotationOptionOverride>,
  liners: LinerRecord[],
  employeeName: string,
  computeFinal: (optId: number, baseRate: number) => number,
): Promise<Blob> {
  const htmlStr = buildQuotationHtml(inquiry, container, options, selectedIds, bestId, overrides, liners, employeeName, computeFinal)

  // Render HTML into an offscreen container so html2pdf can capture it
  const wrapper = document.createElement('div')
  wrapper.innerHTML = htmlStr
  wrapper.style.position = 'fixed'
  wrapper.style.left = '-9999px'
  wrapper.style.top = '0'
  document.body.appendChild(wrapper)

  return html2pdf()
    .set({
      margin: 0,
      filename: `Quotation_${inquiry.id.replace(/[^a-zA-Z0-9-]/g, '_')}.pdf`,
      image: { type: 'jpeg', quality: 0.95 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    })
    .from(wrapper)
    .outputPdf('blob')
    .then((blob: Blob) => {
      document.body.removeChild(wrapper)
      return blob
    })
}

/**
 * Open Outlook via a downloadable .eml file with the quotation HTML attached.
 * The user double-clicks the .eml → Outlook opens a pre-composed email with the attachment.
 */
export function openOutlookWithQuotation(
  toEmail: string,
  subject: string,
  bodyText: string,
  inquiry: Inquiry,
  container: ContainerLine | undefined,
  options: CompletedRateOption[],
  selectedIds: Set<number>,
  bestId: number | null,
  overrides: Record<number, QuotationOptionOverride>,
  liners: LinerRecord[],
  employeeName: string,
  computeFinal: (optId: number, baseRate: number) => number,
): void {
  const quotationHtml = buildQuotationHtml(inquiry, container, options, selectedIds, bestId, overrides, liners, employeeName, computeFinal)

  // Base64-encode the HTML attachment
  const b64 = btoa(unescape(encodeURIComponent(quotationHtml)))
  const filename = `CLSynergy_Quotation_${inquiry.id.replace(/[^a-zA-Z0-9-]/g, '_')}.html`

  // Build RFC 2822 .eml with MIME multipart/mixed
  const boundary = '----=_CLSynergy_' + Date.now()
  const eml = [
    `To: ${toEmail}`,
    `Subject: ${subject}`,
    'X-Unsent: 1',
    'MIME-Version: 1.0',
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset="utf-8"',
    'Content-Transfer-Encoding: quoted-printable',
    '',
    bodyText,
    '',
    `--${boundary}`,
    `Content-Type: text/html; name="${filename}"`,
    `Content-Disposition: attachment; filename="${filename}"`,
    'Content-Transfer-Encoding: base64',
    '',
    // Split base64 into 76-char lines per RFC 2045
    ...b64.match(/.{1,76}/g)!,
    '',
    `--${boundary}--`,
  ].join('\r\n')

  // Download as .eml file - opens in Outlook as a draft with the attachment
  const blob = new Blob([eml], { type: 'message/rfc822' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `Quotation_${inquiry.id.replace(/[^a-zA-Z0-9-]/g, '_')}.eml`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * Open Outlook via a downloadable .eml with pre-built HTML as the email body.
 * Used when the backend provides `body_html` from GET /quotations/unsent.
 */
export function openOutlookWithHtmlBody(
  toEmail: string,
  subject: string,
  bodyHtml: string,
  inquiryId: string,
): void {
  const boundary = '----=_CLSynergy_' + Date.now()
  const eml = [
    `To: ${toEmail}`,
    `Subject: ${subject}`,
    'X-Unsent: 1',
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset="utf-8"',
    'Content-Transfer-Encoding: quoted-printable',
    '',
    'Please view this email in an HTML-capable email client.',
    '',
    `--${boundary}`,
    'Content-Type: text/html; charset="utf-8"',
    'Content-Transfer-Encoding: quoted-printable',
    '',
    bodyHtml,
    '',
    `--${boundary}--`,
  ].join('\r\n')

  const blob = new Blob([eml], { type: 'message/rfc822' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `Quotation_${inquiryId.replace(/[^a-zA-Z0-9-]/g, '_')}.eml`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function findContext(activityLog: ActivityEntry[], refId: string): ActivityEntry | null {
  return activityLog.find(a => a.ref_id === refId) ?? null
}
