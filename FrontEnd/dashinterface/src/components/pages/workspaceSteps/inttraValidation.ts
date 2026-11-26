/**
 * INTTRA booking business-rule helpers — mirrors validation.py.
 * Pure functions + lookup tables. No React, no side effects.
 */

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

/** Build route points from the flat form state. */
export function routeFromForm(f: (k: string) => string): RoutePoints {
  // For PortToPort the port equals the place; for door types they can differ.
  // Currently the form only has placeOfReceipt / placeOfDelivery and
  // the first transport leg uses them as PlaceOfLoad / PlaceOfDischarge.
  return {
    placeOfReceipt: f('placeOfReceipt'),
    portOfLoad: f('placeOfReceipt'),
    portOfDischarge: f('placeOfDelivery'),
    placeOfDelivery: f('placeOfDelivery'),
  }
}

/** Non-blocking advisory messages (like routing_advisories in backend). */
export function computeAdvisories(f: (k: string) => string): string[] {
  const notes: string[] = []
  const moveType = f('moveType')
  const expectedH = EXPECTED_HAULAGE[moveType]
  const incoterm = f('incoterm')
  const route = routeFromForm(f)

  // 1. Haulage mismatch
  const eqCount = parseInt(f('eqCount')) || 0
  for (let i = 0; i < eqCount; i++) {
    const h = f(`eq_${i}_haulage`)
    if (expectedH && h && h !== expectedH) {
      notes.push(`Equipment #${i + 1} haulage is ${h} but ${moveType} expects ${expectedH}`)
    }
  }

  // 2. Missing expected charge types
  const expected = expectedChargeTypes(moveType)
  const partyCount = parseInt(f('partyCount')) || 0
  const seenTypes = new Set<string>()
  for (let p = 0; p < partyCount; p++) {
    const cc = parseInt(f(`party_${p}_chargeCount`)) || 0
    for (let c = 0; c < cc; c++) seenTypes.add(f(`party_${p}_charge_${c}_type`))
  }
  for (const ct of expected) {
    if (!seenTypes.has(ct)) notes.push(`${moveType} typically requires a ${ct} charge — not found on any party`)
  }

  // 3. ShipTo recommended for door delivery
  if (moveType === 'PortToDoor' || moveType === 'DoorToDoor') {
    let hasShipTo = false
    for (let p = 0; p < partyCount; p++) { if (f(`party_${p}_role`) === 'ShipTo') hasShipTo = true }
    if (!hasShipTo) notes.push('ShipTo party is recommended for door delivery')
  }

  // 4. UNLOC format
  if (f('receiptIdentifierType') === 'UNLOC' && f('placeOfReceipt') && !UNLOC_RE.test(f('placeOfReceipt')))
    notes.push(`Place of Receipt "${f('placeOfReceipt')}" is not a valid UN/LOCODE (e.g. LKCMB)`)
  if (f('deliveryIdentifierType') === 'UNLOC' && f('placeOfDelivery') && !UNLOC_RE.test(f('placeOfDelivery')))
    notes.push(`Place of Delivery "${f('placeOfDelivery')}" is not a valid UN/LOCODE (e.g. NLRTM)`)

  // 5. Incoterm ↔ charge payment term mismatch
  if (incoterm && INCOTERM_TERMS[incoterm]) {
    for (let p = 0; p < partyCount; p++) {
      const cc = parseInt(f(`party_${p}_chargeCount`)) || 0
      for (let c = 0; c < cc; c++) {
        const ct = f(`party_${p}_charge_${c}_type`)
        const term = f(`party_${p}_charge_${c}_term`)
        const expected = incotermPaymentTerm(incoterm, ct)
        if (expected && term && term !== expected)
          notes.push(`${ct} is ${term} but ${incoterm} suggests ${expected}`)
      }
    }
  }

  // 6. Payment location advisory
  for (let p = 0; p < partyCount; p++) {
    const cc = parseInt(f(`party_${p}_chargeCount`)) || 0
    for (let c = 0; c < cc; c++) {
      const ct = f(`party_${p}_charge_${c}_type`)
      const term = f(`party_${p}_charge_${c}_term`)
      const loc = expectedPaymentUnloc(ct, term, route)
      if (loc && !UNLOC_RE.test(loc))
        notes.push(`Payment location for ${ct} (${term}) resolves to "${loc}" which is not a valid UNLOC`)
    }
  }

  return notes
}
