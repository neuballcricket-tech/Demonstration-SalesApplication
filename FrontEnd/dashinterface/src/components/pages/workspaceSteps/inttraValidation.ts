/**
 * INTTRA booking business-rule helpers — mirrors validation.py.
 * Pure functions + lookup tables. No React, no side effects.
 */

// ── Structured validation issue ─────────────────────────────────────────────

export interface ValidationIssue {
  severity: 'error' | 'warning'
  code: string
  field: string
  message: string
  source: string // "INTTRA_GUIDE" | "LOCAL" | "PYDANTIC"
}

/** Backend validate endpoint response shape. */
export interface BackendValidationResult {
  can_submit: boolean
  errors: ValidationIssue[]
  warnings: ValidationIssue[]
}

// ── Move type → expected equipment haulage ──────────────────────────────────
export const EXPECTED_HAULAGE: Record<string, string> = {
  PortToPort: 'MerchantMerchant',
  DoorToPort: 'CarrierMerchant',
  PortToDoor: 'MerchantCarrier',
  DoorToDoor: 'CarrierCarrier',
}

// ── Incoterm → (OceanFreight term, origin term, destination term) ───────────
export const INCOTERM_TERMS: Record<string, [string, string, string]> = {
  EXW: ['Collect', 'Collect', 'Collect'],
  FCA: ['Collect', 'Prepaid', 'Collect'],
  FOB: ['Collect', 'Prepaid', 'Collect'],
  CFR: ['Prepaid', 'Prepaid', 'Collect'],
  CIF: ['Prepaid', 'Prepaid', 'Collect'],
  CPT: ['Prepaid', 'Prepaid', 'Collect'],
  CIP: ['Prepaid', 'Prepaid', 'Collect'],
  DAP: ['Prepaid', 'Prepaid', 'Collect'],
  DPU: ['Prepaid', 'Prepaid', 'Collect'],
  DDP: ['Prepaid', 'Prepaid', 'Prepaid'],
}

export const UNLOC_RE = /^[A-Z]{2}[A-Z0-9]{3}$/

// ── Temperature formatting ──────────────────────────────────────────────────

/**
 * Pad a temperature value to match INTTRA's TemperatureValue pattern:
 *   ^([0-9]{3}|-[0-9]{3}|[0-9]{2}\.[0-9]|-[0-9]{2}\.[0-9])$
 *
 * "25" → "025", "-18" → "-018", "25.0" → "25.0", "-18.0" → "-18.0", "" → ""
 */
export function formatTemperature(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed) return trimmed
  const negative = trimmed.startsWith('-')
  const abs = negative ? trimmed.slice(1) : trimmed
  if (abs.includes('.')) {
    const [whole, frac] = abs.split('.')
    const w = whole.padStart(2, '0').slice(-2)
    const f = (frac || '0').slice(0, 1)
    return (negative ? '-' : '') + w + '.' + f
  }
  const padded = abs.padStart(3, '0').slice(-3)
  return (negative ? '-' : '') + padded
}

// ── Derived helpers ─────────────────────────────────────────────────────────

/** Charge types that should exist for a given moveType. */
export function expectedChargeTypes(moveType: string): string[] {
  const base = ['OceanFreight', 'OriginTerminalHandling', 'DestinationTerminalHandling']
  if (moveType === 'DoorToPort' || moveType === 'DoorToDoor') base.push('OriginHaulage')
  if (moveType === 'PortToDoor' || moveType === 'DoorToDoor') base.push('DestinationHaulage')
  return base
}

/** Payment term suggested by incoterm for a charge type. null = user-defined. */
export function incotermPaymentTerm(incoterm: string, chargeType: string): string | null {
  const row = INCOTERM_TERMS[incoterm]
  if (!row) return null
  if (chargeType === 'Additional') return null
  if (chargeType === 'OceanFreight') return row[0]
  if (chargeType === 'OriginTerminalHandling' || chargeType === 'OriginHaulage') return row[1]
  if (chargeType === 'DestinationHaulage' && (incoterm === 'DAP' || incoterm === 'DPU' || incoterm === 'DDP')) return 'Prepaid'
  // DestinationTerminalHandling, DestinationHaulage (non-DAP/DPU/DDP)
  return row[2]
}

export interface RoutePoints {
  placeOfReceipt: string
  portOfLoad: string
  portOfDischarge: string
  placeOfDelivery: string
}

/** UNLOC where payment should be made, per the charges-logic guide. */
export function expectedPaymentUnloc(
  chargeType: string, paymentTerm: string, route: RoutePoints,
): string | null {
  if (paymentTerm === 'PayableElsewhere' || chargeType === 'Additional') return null
  if (chargeType === 'OceanFreight' || chargeType === 'OriginTerminalHandling')
    return paymentTerm === 'Prepaid' ? route.portOfLoad : route.portOfDischarge
  if (chargeType === 'DestinationTerminalHandling')
    return paymentTerm === 'Collect' ? route.portOfDischarge : route.portOfLoad
  if (chargeType === 'OriginHaulage')
    return paymentTerm === 'Prepaid' ? route.placeOfReceipt : route.portOfDischarge
  if (chargeType === 'DestinationHaulage')
    return paymentTerm === 'Collect' ? route.placeOfDelivery : route.portOfLoad
  return null
}

/**
 * Build route points from the flat form state.
 *
 * POL/POD come from the MainCarriage transport leg start/end when present.
 * The form currently uses placeOfReceipt/placeOfDelivery as leg start/end
 * in the payload builder, so for PortToPort POR=POL and PODel=POD.
 * When per-leg location fields exist they will be used here.
 * When no transport legs are present, POL/POD are left empty.
 */
export function routeFromForm(f: (k: string) => string): RoutePoints {
  const legCount = parseInt(f('legCount')) || 0
  let pol = ''
  let pod = ''
  for (let i = 0; i < legCount; i++) {
    const stage = f(`leg_${i}_stage`)
    if (stage === 'MainCarriage' || legCount === 1) {
      // Use per-leg location if available, otherwise fall back to form-level locations
      if (!pol) pol = f(`leg_${i}_startLoc`) || f('placeOfReceipt')
      pod = f(`leg_${i}_endLoc`) || f('placeOfDelivery')
    }
  }
  return {
    placeOfReceipt: f('placeOfReceipt'),
    portOfLoad: pol || f('placeOfReceipt'),
    portOfDischarge: pod || f('placeOfDelivery'),
    placeOfDelivery: f('placeOfDelivery'),
  }
}

// ── Field path mapping ──────────────────────────────────────────────────────

/**
 * Map a backend field path (e.g. "equipments[0].haulage.arrangement")
 * to the corresponding frontend form key (e.g. "eq_0_haulage").
 * Returns null when no form field corresponds to the backend path.
 */
export function backendFieldToFormKey(fieldPath: string): string | null {
  const DIRECT: Record<string, string> = {
    'transactionContact.emails': 'contactEmail',
    'transactionContact.name': 'contactName',
    'transactionContact.phones': 'contactPhone',
    moveType: 'moveType',
    serviceType: 'serviceType',
    shipmentId: 'shipmentId',
    references: 'refCount',
    parties: 'partyCount',
    packageDetails: 'pkgCount',
    equipments: 'eqCount',
    transportLegs: 'legCount',
  }
  if (DIRECT[fieldPath]) return DIRECT[fieldPath]

  // equipments[N].haulage.arrangement → eq_N_haulage
  let m = fieldPath.match(/^equipments\[(\d+)]\.haulage\.arrangement$/)
  if (m) return `eq_${m[1]}_haulage`

  // equipments[N].equipmentSizeCode → eq_N_sizeCode
  m = fieldPath.match(/^equipments\[(\d+)]\.equipmentSizeCode/)
  if (m) return `eq_${m[1]}_sizeCode`

  // equipments[N].* generic
  m = fieldPath.match(/^equipments\[(\d+)]/)
  if (m) return `eq_${m[1]}_count`

  // parties[N].charges[C].* → party_N_charge_C_type
  m = fieldPath.match(/^parties\[(\d+)]\.charges\[(\d+)]/)
  if (m) return `party_${m[1]}_charge_${m[2]}_type`

  // parties[N].* → party_N_role
  m = fieldPath.match(/^parties\[(\d+)]/)
  if (m) return `party_${m[1]}_role`

  // transportLegs[N].* → leg_N_stage
  m = fieldPath.match(/^transportLegs\[(\d+)]/)
  if (m) return `leg_${m[1]}_stage`

  // packageDetails[N].* → pkg_N_goodsDesc
  m = fieldPath.match(/^packageDetails\[(\d+)]/)
  if (m) return `pkg_${m[1]}_goodsDesc`

  // Location paths
  if (fieldPath.includes('PlaceOfReceipt')) return 'placeOfReceipt'
  if (fieldPath.includes('PlaceOfDelivery')) return 'placeOfDelivery'

  return null
}

// ── Merge utility ───────────────────────────────────────────────────────────

/**
 * Merge local frontend issues with backend issues.
 * Deduplicate by (code, field) pair — backend issues take precedence.
 */
export function mergeValidationIssues(
  local: ValidationIssue[],
  backend: ValidationIssue[] | undefined,
): ValidationIssue[] {
  if (!backend?.length) return local
  const seen = new Set(backend.map(i => `${i.code}:${i.field}`))
  return [...backend, ...local.filter(i => !seen.has(`${i.code}:${i.field}`))]
}

// ── Local validation ────────────────────────────────────────────────────────

/**
 * Structured validation issues computed from the current form state.
 * Errors are blocking (prevent submission); warnings are non-blocking.
 */
export function computeAdvisories(f: (k: string) => string): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  const moveType = f('moveType')
  const expectedH = EXPECTED_HAULAGE[moveType]
  const incoterm = f('incoterm')
  const route = routeFromForm(f)

  // 1. Haulage mismatch — BLOCKING ERROR (backend: HAULAGE_MOVE_MISMATCH)
  const eqCount = parseInt(f('eqCount')) || 0
  for (let i = 0; i < eqCount; i++) {
    const h = f(`eq_${i}_haulage`)
    if (expectedH && h && h !== expectedH) {
      issues.push({
        severity: 'error',
        code: 'HAULAGE_MOVE_MISMATCH',
        field: `equipments[${i}].haulage.arrangement`,
        message: `${moveType} expects ${expectedH}; received ${h}`,
        source: 'LOCAL',
      })
    }
  }

  // 2. Missing expected charge types — WARNING
  const expected = expectedChargeTypes(moveType)
  const partyCount = parseInt(f('partyCount')) || 0
  const seenTypes = new Set<string>()
  for (let p = 0; p < partyCount; p++) {
    const cc = parseInt(f(`party_${p}_chargeCount`)) || 0
    for (let c = 0; c < cc; c++) seenTypes.add(f(`party_${p}_charge_${c}_type`))
  }
  for (const ct of expected) {
    if (!seenTypes.has(ct)) {
      issues.push({
        severity: 'warning',
        code: 'CHARGE_TYPES_REVIEW',
        field: 'parties[].charges',
        message: `${moveType} typically requires a ${ct} charge — not found on any party`,
        source: 'LOCAL',
      })
    }
  }

  // 3. ShipTo recommended for door delivery — WARNING
  if (moveType === 'PortToDoor' || moveType === 'DoorToDoor') {
    let hasShipTo = false
    for (let p = 0; p < partyCount; p++) { if (f(`party_${p}_role`) === 'ShipTo') hasShipTo = true }
    if (!hasShipTo) {
      issues.push({
        severity: 'warning',
        code: 'SHIPTO_RECOMMENDED',
        field: 'parties',
        message: 'ShipTo party is recommended for door delivery',
        source: 'LOCAL',
      })
    }
  }

  // 4. ShipFrom required for door pickup — BLOCKING ERROR
  if (moveType === 'DoorToPort' || moveType === 'DoorToDoor') {
    let hasShipFrom = false
    for (let p = 0; p < partyCount; p++) { if (f(`party_${p}_role`) === 'ShipFrom') hasShipFrom = true }
    if (!hasShipFrom) {
      issues.push({
        severity: 'error',
        code: 'SHIPFROM_REQUIRED',
        field: 'parties',
        message: 'Door pickup requires a ShipFrom party',
        source: 'LOCAL',
      })
    }
  }

  // 5. UNLOC format — WARNING (missing from local DB is never a blocking error)
  if (f('receiptIdentifierType') === 'UNLOC' && f('placeOfReceipt') && !UNLOC_RE.test(f('placeOfReceipt'))) {
    issues.push({
      severity: 'warning',
      code: 'UNLOC_FORMAT',
      field: 'transactionLocations[PlaceOfReceipt]',
      message: `Place of Receipt "${f('placeOfReceipt')}" is not a valid UN/LOCODE (e.g. LKCMB)`,
      source: 'LOCAL',
    })
  }
  if (f('deliveryIdentifierType') === 'UNLOC' && f('placeOfDelivery') && !UNLOC_RE.test(f('placeOfDelivery'))) {
    issues.push({
      severity: 'warning',
      code: 'UNLOC_FORMAT',
      field: 'transactionLocations[PlaceOfDelivery]',
      message: `Place of Delivery "${f('placeOfDelivery')}" is not a valid UN/LOCODE (e.g. NLRTM)`,
      source: 'LOCAL',
    })
  }

  // 6. Incoterm ↔ charge payment term mismatch — WARNING
  if (incoterm && INCOTERM_TERMS[incoterm]) {
    for (let p = 0; p < partyCount; p++) {
      const cc = parseInt(f(`party_${p}_chargeCount`)) || 0
      for (let c = 0; c < cc; c++) {
        const ct = f(`party_${p}_charge_${c}_type`)
        const term = f(`party_${p}_charge_${c}_term`)
        const suggested = incotermPaymentTerm(incoterm, ct)
        if (suggested && term && term !== suggested) {
          issues.push({
            severity: 'warning',
            code: 'INCOTERM_PAYMENT_MISMATCH',
            field: `parties[${p}].charges[${c}].paymentTerm`,
            message: `${ct} is ${term} but ${incoterm} suggests ${suggested}`,
            source: 'LOCAL',
          })
        }
      }
    }
  }

  // 7. Per-leg location defaulted — WARNING for non-PortToPort movements
  if (moveType !== 'PortToPort') {
    const legCount = parseInt(f('legCount')) || 0
    for (let i = 0; i < legCount; i++) {
      const stage = f(`leg_${i}_stage`)
      if (stage === 'MainCarriage' || legCount === 1) {
        if (!f(`leg_${i}_startLoc`)) {
          issues.push({
            severity: 'warning', code: 'LEG_PORT_DEFAULTED',
            field: `transportLegs[${i}].startLocation`,
            message: `Leg ${i + 1} load port defaults to Place of Receipt — set explicit port for ${moveType}`,
            source: 'LOCAL',
          })
        }
        if (!f(`leg_${i}_endLoc`)) {
          issues.push({
            severity: 'warning', code: 'LEG_PORT_DEFAULTED',
            field: `transportLegs[${i}].endLocation`,
            message: `Leg ${i + 1} discharge port defaults to Place of Delivery — set explicit port for ${moveType}`,
            source: 'LOCAL',
          })
        }
      }
    }
  }

  // 8. Payment location resolves to invalid UNLOC — WARNING
  for (let p = 0; p < partyCount; p++) {
    const cc = parseInt(f(`party_${p}_chargeCount`)) || 0
    for (let c = 0; c < cc; c++) {
      const ct = f(`party_${p}_charge_${c}_type`)
      const term = f(`party_${p}_charge_${c}_term`)
      const loc = expectedPaymentUnloc(ct, term, route)
      if (loc && !UNLOC_RE.test(loc)) {
        issues.push({
          severity: 'warning',
          code: 'PAYMENT_LOCATION_FORMAT',
          field: `parties[${p}].charges[${c}].chargeLocation`,
          message: `Payment location for ${ct} (${term}) resolves to "${loc}" which is not a valid UNLOC`,
          source: 'LOCAL',
        })
      }
    }
  }

  return issues
}

// ── Parse backend error response into ValidationIssue[] ─────────────────────

/**
 * Parse a backend error string (from catch block) into structured issues.
 * Handles:
 *   - Pydantic validation: {detail: [{loc, msg, type}]}
 *   - Business rule errors: {detail: {errors: ["msg1", "msg2"]}}
 *   - Business rule with issues: {detail: {errors: [...], issues: [{severity,code,field,message,source}]}}
 *   - INTTRA errors: [{code, message}]
 *   - Plain string detail: {detail: "message"}
 */
export function parseBackendErrors(rawErrorMessage: string): ValidationIssue[] | null {
  const jsonMatch = rawErrorMessage.match(/\s\u2014\s(.+)$/)
  if (!jsonMatch) return null

  try {
    const parsed = JSON.parse(jsonMatch[1])

    // Backend assess_booking structured issues: {detail: {issues: [...]}}
    if (parsed?.detail?.issues && Array.isArray(parsed.detail.issues)) {
      return parsed.detail.issues.map((i: Record<string, unknown>) => ({
        severity: i.severity === 'warning' ? 'warning' as const : 'error' as const,
        code: String(i.code || 'BACKEND'),
        field: String(i.field || ''),
        message: String(i.message || ''),
        source: String(i.source || 'INTTRA_GUIDE'),
      }))
    }

    // Business rule errors: {detail: {errors: ["msg1", ...]}}
    if (parsed?.detail?.errors && Array.isArray(parsed.detail.errors)) {
      return parsed.detail.errors.map((msg: string) => ({
        severity: 'error' as const,
        code: 'BUSINESS_RULE',
        field: '',
        message: String(msg),
        source: 'INTTRA_GUIDE',
      }))
    }

    // Pydantic validation: {detail: [{loc, msg, type}]}
    const details = Array.isArray(parsed?.detail) ? parsed.detail : Array.isArray(parsed) ? parsed : null
    if (details && details.length > 0) {
      return details.map((d: Record<string, unknown>) => {
        // Pydantic: {loc: [...], msg: "...", type: "..."}
        if (d.loc && d.msg) {
          const path = (d.loc as string[]).filter(s => s !== 'body').join('.')
          const msg = String(d.msg).replace(/^Value error,?\s*/i, '').replace(/^Field /i, 'Field ').trim()
          return {
            severity: 'error' as const,
            code: 'PYDANTIC_VALIDATION',
            field: path,
            message: msg,
            source: 'PYDANTIC',
          }
        }
        // INTTRA error: {code: "224099", message: "..."}
        if (d.message) {
          return {
            severity: 'error' as const,
            code: d.code ? String(d.code) : 'INTTRA_ERROR',
            field: '',
            message: String(d.message),
            source: 'INTTRA',
          }
        }
        return {
          severity: 'error' as const,
          code: 'UNKNOWN',
          field: '',
          message: JSON.stringify(d),
          source: 'BACKEND',
        }
      })
    }

    // Plain string detail
    if (typeof parsed?.detail === 'string') {
      return [{
        severity: 'error' as const,
        code: 'BACKEND',
        field: '',
        message: parsed.detail,
        source: 'BACKEND',
      }]
    }
  } catch { /* fall through */ }

  return null
}
