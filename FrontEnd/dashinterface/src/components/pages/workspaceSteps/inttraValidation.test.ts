import { describe, it, expect, vi } from 'vitest'

// Mock browser-only modules pulled in transitively by useWorkspaceActions → utils
vi.mock('html2pdf.js', () => ({ default: () => ({}) }))

import {
  EXPECTED_HAULAGE,
  routeFromForm,
  computeAdvisories,
  expectedChargeTypes,
  incotermPaymentTerm,
  expectedPaymentUnloc,
  backendFieldToFormKey,
  mergeValidationIssues,
  parseBackendErrors,
  formatTemperature,
  type ValidationIssue,
  type RoutePoints,
} from './inttraValidation'
import { buildInttraPayload } from './useWorkspaceActions'

// ── Helper: build a form getter from a plain object ─────────────────────────
function formOf(fields: Record<string, string>) {
  return (key: string) => fields[key] ?? ''
}

// ── routeFromForm ───────────────────────────────────────────────────────────

describe('routeFromForm', () => {
  it('falls back to placeOfReceipt/placeOfDelivery when no legs exist', () => {
    const route = routeFromForm(formOf({
      placeOfReceipt: 'LKCMB',
      placeOfDelivery: 'NLRTM',
      legCount: '0',
    }))
    expect(route.placeOfReceipt).toBe('LKCMB')
    expect(route.portOfLoad).toBe('LKCMB')
    expect(route.portOfDischarge).toBe('NLRTM')
    expect(route.placeOfDelivery).toBe('NLRTM')
  })

  it('uses MainCarriage leg locations when available', () => {
    const route = routeFromForm(formOf({
      placeOfReceipt: 'LKCMB',
      placeOfDelivery: 'SGSIN',
      legCount: '1',
      leg_0_stage: 'MainCarriage',
      // per-leg location fields fall back to form-level
    }))
    expect(route.portOfLoad).toBe('LKCMB')
    expect(route.portOfDischarge).toBe('SGSIN')
  })

  it('uses per-leg startLoc/endLoc when present', () => {
    const route = routeFromForm(formOf({
      placeOfReceipt: 'DOORLOC',
      placeOfDelivery: 'DOORLOC2',
      legCount: '1',
      leg_0_stage: 'MainCarriage',
      leg_0_startLoc: 'INBOM',
      leg_0_endLoc: 'SGSIN',
    }))
    expect(route.placeOfReceipt).toBe('DOORLOC')
    expect(route.portOfLoad).toBe('INBOM')
    expect(route.portOfDischarge).toBe('SGSIN')
    expect(route.placeOfDelivery).toBe('DOORLOC2')
  })
})

// ── computeAdvisories — severity ────────────────────────────────────────────

describe('computeAdvisories', () => {
  it('PortToPort + MerchantMerchant → no haulage error', () => {
    const issues = computeAdvisories(formOf({
      moveType: 'PortToPort',
      eqCount: '1', eq_0_haulage: 'MerchantMerchant',
      partyCount: '0', incoterm: '', legCount: '0',
      placeOfReceipt: 'LKCMB', placeOfDelivery: 'NLRTM',
      receiptIdentifierType: 'UNLOC', deliveryIdentifierType: 'UNLOC',
    }))
    const haulageErrors = issues.filter(i => i.code === 'HAULAGE_MOVE_MISMATCH')
    expect(haulageErrors).toHaveLength(0)
  })

  it('PortToPort + CarrierCarrier → blocking error', () => {
    const issues = computeAdvisories(formOf({
      moveType: 'PortToPort',
      eqCount: '1', eq_0_haulage: 'CarrierCarrier',
      partyCount: '0', incoterm: '', legCount: '0',
      placeOfReceipt: 'LKCMB', placeOfDelivery: 'NLRTM',
      receiptIdentifierType: 'UNLOC', deliveryIdentifierType: 'UNLOC',
    }))
    const haulageErrors = issues.filter(i => i.code === 'HAULAGE_MOVE_MISMATCH')
    expect(haulageErrors).toHaveLength(1)
    expect(haulageErrors[0].severity).toBe('error')
    expect(haulageErrors[0].message).toContain('MerchantMerchant')
  })

  it('DoorToPort without ShipFrom → blocking error', () => {
    const issues = computeAdvisories(formOf({
      moveType: 'DoorToPort',
      eqCount: '1', eq_0_haulage: 'CarrierMerchant',
      partyCount: '1', party_0_role: 'Carrier',
      incoterm: '', legCount: '0',
      placeOfReceipt: 'LKCMB', placeOfDelivery: 'NLRTM',
      receiptIdentifierType: 'UNLOC', deliveryIdentifierType: 'UNLOC',
    }))
    const shipFromError = issues.find(i => i.code === 'SHIPFROM_REQUIRED')
    expect(shipFromError).toBeDefined()
    expect(shipFromError!.severity).toBe('error')
  })

  it('missing recommended ShipTo → warning, not error', () => {
    const issues = computeAdvisories(formOf({
      moveType: 'PortToDoor',
      eqCount: '1', eq_0_haulage: 'MerchantCarrier',
      partyCount: '1', party_0_role: 'Carrier',
      incoterm: '', legCount: '0',
      placeOfReceipt: 'LKCMB', placeOfDelivery: 'NLRTM',
      receiptIdentifierType: 'UNLOC', deliveryIdentifierType: 'UNLOC',
    }))
    const shipToWarn = issues.find(i => i.code === 'SHIPTO_RECOMMENDED')
    expect(shipToWarn).toBeDefined()
    expect(shipToWarn!.severity).toBe('warning')
  })

  it('invalid UNLOC format → warning, not error', () => {
    const issues = computeAdvisories(formOf({
      moveType: 'PortToPort',
      eqCount: '1', eq_0_haulage: 'MerchantMerchant',
      partyCount: '0', incoterm: '', legCount: '0',
      placeOfReceipt: 'bad', placeOfDelivery: 'NLRTM',
      receiptIdentifierType: 'UNLOC', deliveryIdentifierType: 'UNLOC',
    }))
    const unlocWarn = issues.find(i => i.code === 'UNLOC_FORMAT')
    expect(unlocWarn).toBeDefined()
    expect(unlocWarn!.severity).toBe('warning')
  })

  it('missing recommended charge → warning', () => {
    const issues = computeAdvisories(formOf({
      moveType: 'PortToPort',
      eqCount: '1', eq_0_haulage: 'MerchantMerchant',
      partyCount: '1', party_0_role: 'Carrier', party_0_chargeCount: '0',
      incoterm: '', legCount: '0',
      placeOfReceipt: 'LKCMB', placeOfDelivery: 'NLRTM',
      receiptIdentifierType: 'UNLOC', deliveryIdentifierType: 'UNLOC',
    }))
    const chargeWarns = issues.filter(i => i.code === 'CHARGE_TYPES_REVIEW')
    expect(chargeWarns.length).toBeGreaterThan(0)
    chargeWarns.forEach(w => expect(w.severity).toBe('warning'))
  })

  it('existing valid customer charges are not flagged', () => {
    const issues = computeAdvisories(formOf({
      moveType: 'PortToPort',
      eqCount: '1', eq_0_haulage: 'MerchantMerchant',
      partyCount: '1', party_0_role: 'Carrier',
      party_0_chargeCount: '3',
      party_0_charge_0_type: 'OceanFreight', party_0_charge_0_term: 'Prepaid',
      party_0_charge_1_type: 'OriginTerminalHandling', party_0_charge_1_term: 'Prepaid',
      party_0_charge_2_type: 'DestinationTerminalHandling', party_0_charge_2_term: 'Collect',
      incoterm: '', legCount: '0',
      placeOfReceipt: 'LKCMB', placeOfDelivery: 'NLRTM',
      receiptIdentifierType: 'UNLOC', deliveryIdentifierType: 'UNLOC',
    }))
    const chargeWarns = issues.filter(i => i.code === 'CHARGE_TYPES_REVIEW')
    expect(chargeWarns).toHaveLength(0)
  })

  it('incoterm/charge term mismatch → warning', () => {
    const issues = computeAdvisories(formOf({
      moveType: 'PortToPort',
      eqCount: '1', eq_0_haulage: 'MerchantMerchant',
      partyCount: '1', party_0_role: 'Carrier',
      party_0_chargeCount: '1',
      party_0_charge_0_type: 'OceanFreight',
      party_0_charge_0_term: 'Prepaid', // EXW suggests Collect
      incoterm: 'EXW', legCount: '0',
      placeOfReceipt: 'LKCMB', placeOfDelivery: 'NLRTM',
      receiptIdentifierType: 'UNLOC', deliveryIdentifierType: 'UNLOC',
    }))
    const incotermWarn = issues.find(i => i.code === 'INCOTERM_PAYMENT_MISMATCH')
    expect(incotermWarn).toBeDefined()
    expect(incotermWarn!.severity).toBe('warning')
    expect(incotermWarn!.message).toContain('Collect')
  })
})

// ── expectedChargeTypes ─────────────────────────────────────────────────────

describe('expectedChargeTypes', () => {
  it('PortToPort has 3 base charges', () => {
    expect(expectedChargeTypes('PortToPort')).toEqual([
      'OceanFreight', 'OriginTerminalHandling', 'DestinationTerminalHandling',
    ])
  })

  it('DoorToDoor adds OriginHaulage and DestinationHaulage', () => {
    const types = expectedChargeTypes('DoorToDoor')
    expect(types).toContain('OriginHaulage')
    expect(types).toContain('DestinationHaulage')
  })

  it('DoorToPort adds OriginHaulage but not DestinationHaulage', () => {
    const types = expectedChargeTypes('DoorToPort')
    expect(types).toContain('OriginHaulage')
    expect(types).not.toContain('DestinationHaulage')
  })
})

// ── incotermPaymentTerm ─────────────────────────────────────────────────────

describe('incotermPaymentTerm', () => {
  it('EXW OceanFreight → Collect', () => {
    expect(incotermPaymentTerm('EXW', 'OceanFreight')).toBe('Collect')
  })

  it('CIF OceanFreight → Prepaid', () => {
    expect(incotermPaymentTerm('CIF', 'OceanFreight')).toBe('Prepaid')
  })

  it('DDP DestinationTerminalHandling → Prepaid', () => {
    expect(incotermPaymentTerm('DDP', 'DestinationTerminalHandling')).toBe('Prepaid')
  })

  it('DAP DestinationHaulage → Prepaid (override)', () => {
    expect(incotermPaymentTerm('DAP', 'DestinationHaulage')).toBe('Prepaid')
  })

  it('Additional → null (user-defined)', () => {
    expect(incotermPaymentTerm('FOB', 'Additional')).toBeNull()
  })

  it('unknown incoterm → null', () => {
    expect(incotermPaymentTerm('UNKNOWN', 'OceanFreight')).toBeNull()
  })
})

// ── expectedPaymentUnloc ────────────────────────────────────────────────────

describe('expectedPaymentUnloc', () => {
  const route: RoutePoints = {
    placeOfReceipt: 'LKCMB',
    portOfLoad: 'INBOM',
    portOfDischarge: 'SGSIN',
    placeOfDelivery: 'MYPEN',
  }

  it('OceanFreight Prepaid → portOfLoad', () => {
    expect(expectedPaymentUnloc('OceanFreight', 'Prepaid', route)).toBe('INBOM')
  })

  it('OceanFreight Collect → portOfDischarge', () => {
    expect(expectedPaymentUnloc('OceanFreight', 'Collect', route)).toBe('SGSIN')
  })

  it('DestinationHaulage Collect → placeOfDelivery', () => {
    expect(expectedPaymentUnloc('DestinationHaulage', 'Collect', route)).toBe('MYPEN')
  })

  it('OriginHaulage Prepaid → placeOfReceipt', () => {
    expect(expectedPaymentUnloc('OriginHaulage', 'Prepaid', route)).toBe('LKCMB')
  })

  it('Additional → null', () => {
    expect(expectedPaymentUnloc('Additional', 'Prepaid', route)).toBeNull()
  })

  it('PayableElsewhere → null', () => {
    expect(expectedPaymentUnloc('OceanFreight', 'PayableElsewhere', route)).toBeNull()
  })
})

// ── backendFieldToFormKey ───────────────────────────────────────────────────

describe('backendFieldToFormKey', () => {
  it('maps equipments[0].haulage.arrangement → eq_0_haulage', () => {
    expect(backendFieldToFormKey('equipments[0].haulage.arrangement')).toBe('eq_0_haulage')
  })

  it('maps equipments[2].equipmentSizeCode → eq_2_sizeCode', () => {
    expect(backendFieldToFormKey('equipments[2].equipmentSizeCode')).toBe('eq_2_sizeCode')
  })

  it('maps parties[1] → party_1_role', () => {
    expect(backendFieldToFormKey('parties[1]')).toBe('party_1_role')
  })

  it('maps parties[0].charges[1] → party_0_charge_1_type', () => {
    expect(backendFieldToFormKey('parties[0].charges[1]')).toBe('party_0_charge_1_type')
  })

  it('maps transportLegs[0] → leg_0_stage', () => {
    expect(backendFieldToFormKey('transportLegs[0]')).toBe('leg_0_stage')
  })

  it('maps packageDetails[2] → pkg_2_goodsDesc', () => {
    expect(backendFieldToFormKey('packageDetails[2]')).toBe('pkg_2_goodsDesc')
  })

  it('maps transactionContact.emails → contactEmail', () => {
    expect(backendFieldToFormKey('transactionContact.emails')).toBe('contactEmail')
  })

  it('maps PlaceOfReceipt paths', () => {
    expect(backendFieldToFormKey('transactionLocations[PlaceOfReceipt]')).toBe('placeOfReceipt')
  })

  it('returns null for unmapped paths', () => {
    expect(backendFieldToFormKey('some.unknown.path')).toBeNull()
  })
})

// ── mergeValidationIssues ───────────────────────────────────────────────────

describe('mergeValidationIssues', () => {
  const localIssue: ValidationIssue = {
    severity: 'error', code: 'HAULAGE_MOVE_MISMATCH',
    field: 'equipments[0].haulage.arrangement',
    message: 'PortToPort expects MerchantMerchant; received CarrierCarrier',
    source: 'LOCAL',
  }
  const backendIssue: ValidationIssue = {
    severity: 'error', code: 'HAULAGE_MOVE_MISMATCH',
    field: 'equipments[0].haulage.arrangement',
    message: 'PortToPort expects MerchantMerchant; received CarrierCarrier (from backend)',
    source: 'INTTRA_GUIDE',
  }
  const otherIssue: ValidationIssue = {
    severity: 'warning', code: 'SHIPTO_RECOMMENDED',
    field: 'parties', message: 'ShipTo recommended',
    source: 'LOCAL',
  }

  it('returns local only when no backend issues', () => {
    expect(mergeValidationIssues([localIssue], undefined)).toEqual([localIssue])
    expect(mergeValidationIssues([localIssue], [])).toEqual([localIssue])
  })

  it('deduplicates by code+field, backend wins', () => {
    const merged = mergeValidationIssues([localIssue, otherIssue], [backendIssue])
    expect(merged).toHaveLength(2)
    expect(merged[0].source).toBe('INTTRA_GUIDE') // backend version
    expect(merged[1].code).toBe('SHIPTO_RECOMMENDED') // local unique
  })

  it('includes all backend issues', () => {
    const backendOnly: ValidationIssue = {
      severity: 'error', code: 'CONTRACT_OR_TARIFF',
      field: 'references', message: 'ContractNumber required',
      source: 'INTTRA_GUIDE',
    }
    const merged = mergeValidationIssues([], [backendOnly])
    expect(merged).toHaveLength(1)
    expect(merged[0].code).toBe('CONTRACT_OR_TARIFF')
  })
})

// ── parseBackendErrors ──────────────────────────────────────────────────────

describe('parseBackendErrors', () => {
  it('parses Pydantic validation errors', () => {
    const raw = 'POST /path failed: 422 \u2014 {"detail":[{"loc":["body","parties",1,"partyName1"],"msg":"Field required","type":"missing"}]}'
    const issues = parseBackendErrors(raw)
    expect(issues).not.toBeNull()
    expect(issues!).toHaveLength(1)
    expect(issues![0].severity).toBe('error')
    expect(issues![0].code).toBe('PYDANTIC_VALIDATION')
    expect(issues![0].field).toBe('parties.1.partyName1')
    expect(issues![0].message).toBe('Field required')
  })

  it('parses business rule errors ({errors: [...]})', () => {
    const raw = 'POST /path failed: 422 \u2014 {"detail":{"errors":["Haulage mismatch","Missing contract"]}}'
    const issues = parseBackendErrors(raw)
    expect(issues).not.toBeNull()
    expect(issues!).toHaveLength(2)
    expect(issues![0].severity).toBe('error')
    expect(issues![0].code).toBe('BUSINESS_RULE')
    expect(issues![0].message).toBe('Haulage mismatch')
  })

  it('parses structured issues from assess_booking', () => {
    const raw = 'POST /path failed: 422 \u2014 {"detail":{"errors":["x"],"issues":[{"severity":"error","code":"HAULAGE_MOVE_MISMATCH","field":"equipments[0].haulage.arrangement","message":"PortToPort expects MerchantMerchant","source":"INTTRA_GUIDE"}]}}'
    const issues = parseBackendErrors(raw)
    expect(issues).not.toBeNull()
    expect(issues![0].code).toBe('HAULAGE_MOVE_MISMATCH')
    expect(issues![0].severity).toBe('error')
    expect(issues![0].field).toBe('equipments[0].haulage.arrangement')
  })

  it('parses INTTRA errors ({code, message})', () => {
    const raw = 'POST /path failed: 502 \u2014 [{"code":"224099","message":"Carrier party is invalid"}]'
    const issues = parseBackendErrors(raw)
    expect(issues).not.toBeNull()
    expect(issues!).toHaveLength(1)
    expect(issues![0].code).toBe('224099')
    expect(issues![0].message).toBe('Carrier party is invalid')
  })

  it('parses plain string detail', () => {
    const raw = 'POST /path failed: 404 \u2014 {"detail":"Inquiry 99 not found"}'
    const issues = parseBackendErrors(raw)
    expect(issues).not.toBeNull()
    expect(issues!).toHaveLength(1)
    expect(issues![0].message).toBe('Inquiry 99 not found')
  })

  it('returns null for non-JSON error messages', () => {
    expect(parseBackendErrors('Something went wrong')).toBeNull()
  })

  it('returns null for empty string', () => {
    expect(parseBackendErrors('')).toBeNull()
  })

  it('backend returns warnings only → submission was allowed', () => {
    const raw = 'POST /path failed: 422 \u2014 {"detail":{"issues":[{"severity":"warning","code":"SHIPTO_RECOMMENDED","field":"parties","message":"ShipTo recommended","source":"INTTRA_GUIDE"}]}}'
    const issues = parseBackendErrors(raw)
    expect(issues).not.toBeNull()
    const errors = issues!.filter(i => i.severity === 'error')
    const warnings = issues!.filter(i => i.severity === 'warning')
    expect(errors).toHaveLength(0)
    expect(warnings).toHaveLength(1)
  })
})

// ── formatTemperature ───────────────────────────────────────────────────────

describe('formatTemperature', () => {
  it('pads short integer to 3 digits: "25" → "025"', () => {
    expect(formatTemperature('25')).toBe('025')
  })

  it('pads negative integer to 3 digits: "-18" → "-018"', () => {
    expect(formatTemperature('-18')).toBe('-018')
  })

  it('preserves already-valid decimal: "25.0" → "25.0"', () => {
    expect(formatTemperature('25.0')).toBe('25.0')
  })

  it('preserves negative decimal: "-18.0" → "-18.0"', () => {
    expect(formatTemperature('-18.0')).toBe('-18.0')
  })

  it('returns empty string for empty input', () => {
    expect(formatTemperature('')).toBe('')
  })

  it('trims whitespace: "  25  " → "025"', () => {
    expect(formatTemperature('  25  ')).toBe('025')
  })

  it('handles single digit: "5" → "005"', () => {
    expect(formatTemperature('5')).toBe('005')
  })

  it('handles 3-digit integer: "100" → "100"', () => {
    expect(formatTemperature('100')).toBe('100')
  })

  it('handles negative 3-digit: "-100" → "-100"', () => {
    expect(formatTemperature('-100')).toBe('-100')
  })

  it('truncates decimal to 1 digit: "25.67" → "25.6"', () => {
    expect(formatTemperature('25.67')).toBe('25.6')
  })

  it('pads decimal whole part: "5.3" → "05.3"', () => {
    expect(formatTemperature('5.3')).toBe('05.3')
  })
})

// ── buildInttraPayload ──────────────────────────────────────────────────────

describe('buildInttraPayload', () => {
  /** Minimal form state that produces a valid payload. */
  function minimalForm(overrides: Record<string, string> = {}): (k: string) => string {
    const fields: Record<string, string> = {
      contactName: 'Test User',
      contactEmail: 'test@example.com',
      moveType: 'PortToPort',
      placeOfReceipt: 'LKCMB',
      placeOfDelivery: 'NLRTM',
      receiptIdentifierType: 'UNLOC',
      deliveryIdentifierType: 'UNLOC',
      refCount: '0',
      partyCount: '0',
      pkgCount: '0',
      eqCount: '0',
      legCount: '0',
      ...overrides,
    }
    return (k: string) => fields[k] ?? ''
  }

  it('omits serviceType when empty (not "")', () => {
    const payload = buildInttraPayload(minimalForm({ serviceType: '' }))
    expect(payload).not.toHaveProperty('serviceType')
  })

  it('includes serviceType when provided', () => {
    const payload = buildInttraPayload(minimalForm({ serviceType: 'FCL' }))
    expect(payload.serviceType).toBe('FCL')
  })

  it('omits carrierScac from transport leg when empty', () => {
    const payload = buildInttraPayload(minimalForm({
      legCount: '1',
      leg_0_stage: 'MainCarriage',
      leg_0_scac: '',
    }))
    const legs = payload.transportLegs as Record<string, unknown>[]
    expect(legs).toHaveLength(1)
    expect(legs[0]).not.toHaveProperty('carrierScac')
  })

  it('includes carrierScac when provided', () => {
    const payload = buildInttraPayload(minimalForm({
      legCount: '1',
      leg_0_stage: 'MainCarriage',
      leg_0_scac: 'MAEU',
    }))
    const legs = payload.transportLegs as Record<string, unknown>[]
    expect(legs[0].carrierScac).toBe('MAEU')
  })

  it('defaults weight to "0" when empty', () => {
    const payload = buildInttraPayload(minimalForm({
      pkgCount: '1',
      pkg_0_goodsDesc: 'Test goods',
      pkg_0_weight: '',
    }))
    const pkgs = payload.packageDetails as Record<string, unknown>[]
    const weight = pkgs[0].goodsGrossWeight as Record<string, unknown>
    expect(weight.weightValue).toBe('0')
  })

  it('formats temperature via formatTemperature', () => {
    const payload = buildInttraPayload(minimalForm({
      eqCount: '1',
      eq_0_sizeCode: '20GP',
      eq_0_haulage: 'MerchantMerchant',
      eq_0_reeferTemp: '25',
      eq_0_reeferUnit: 'CEL',
    }))
    const eqs = payload.equipments as Record<string, unknown>[]
    const temp = eqs[0].temperature as Record<string, unknown>
    expect(temp.value).toBe('025')
  })

  it('does not include customerChangeSummary in output', () => {
    const payload = buildInttraPayload(minimalForm())
    expect(payload).not.toHaveProperty('customerChangeSummary')
  })

  // ── Per-leg locations ──

  it('uses per-leg startLoc/endLoc when provided', () => {
    const payload = buildInttraPayload(minimalForm({
      legCount: '1',
      leg_0_stage: 'MainCarriage',
      leg_0_scac: '',
      leg_0_startLoc: 'INBOM',
      leg_0_endLoc: 'SGSIN',
    }))
    const legs = payload.transportLegs as Record<string, unknown>[]
    const start = legs[0].startLocation as Record<string, unknown>
    const end = legs[0].endLocation as Record<string, unknown>
    expect(start.identifierValue).toBe('INBOM')
    expect(end.identifierValue).toBe('SGSIN')
  })

  it('falls back to form-level POR/PODel when per-leg locations empty', () => {
    const payload = buildInttraPayload(minimalForm({
      legCount: '1',
      leg_0_stage: 'MainCarriage',
      leg_0_scac: '',
      leg_0_startLoc: '',
      leg_0_endLoc: '',
    }))
    const legs = payload.transportLegs as Record<string, unknown>[]
    const start = legs[0].startLocation as Record<string, unknown>
    const end = legs[0].endLocation as Record<string, unknown>
    expect(start.identifierValue).toBe('LKCMB')
    expect(end.identifierValue).toBe('NLRTM')
  })

  // ── Haulage points ──

  it('adds haulage.points with ShipFrom for DoorToPort', () => {
    const payload = buildInttraPayload(minimalForm({
      moveType: 'DoorToPort',
      eqCount: '1',
      eq_0_sizeCode: '20GP',
      eq_0_haulage: 'CarrierMerchant',
      partyCount: '2',
      party_0_role: 'Carrier',
      party_0_name: 'Carrier Co',
      party_1_role: 'ShipFrom',
      party_1_name: 'Shipper Warehouse',
      party_1_address: '123 Main St',
      party_1_city: 'Colombo',
      party_1_country: 'LK',
    }))
    const eqs = payload.equipments as Record<string, unknown>[]
    const haulage = eqs[0].haulage as Record<string, unknown>
    expect(haulage.arrangement).toBe('CarrierMerchant')
    expect(haulage.points).toBeDefined()
    const points = haulage.points as Record<string, unknown>[]
    expect(points).toHaveLength(1)
    const hp = points[0].haulageParty as Record<string, unknown>
    expect(hp.partyRole).toBe('ShipFrom')
    expect(hp.partyName1).toBe('Shipper Warehouse')
    const addr = hp.address as Record<string, unknown>
    expect(addr.unstructuredAddress01).toBe('123 Main St')
    expect(addr.city).toBe('Colombo')
  })

  it('no haulage.points for PortToPort', () => {
    const payload = buildInttraPayload(minimalForm({
      moveType: 'PortToPort',
      eqCount: '1',
      eq_0_sizeCode: '20GP',
      eq_0_haulage: 'MerchantMerchant',
    }))
    const eqs = payload.equipments as Record<string, unknown>[]
    const haulage = eqs[0].haulage as Record<string, unknown>
    expect(haulage.points).toBeUndefined()
  })

  it('DoorToDoor has both ShipFrom + ShipTo in haulage.points', () => {
    const payload = buildInttraPayload(minimalForm({
      moveType: 'DoorToDoor',
      eqCount: '1',
      eq_0_sizeCode: '20GP',
      eq_0_haulage: 'CarrierCarrier',
      partyCount: '2',
      party_0_role: 'ShipFrom',
      party_0_name: 'Origin Warehouse',
      party_1_role: 'ShipTo',
      party_1_name: 'Destination Warehouse',
    }))
    const eqs = payload.equipments as Record<string, unknown>[]
    const points = (eqs[0].haulage as Record<string, unknown>).points as Record<string, unknown>[]
    expect(points).toHaveLength(2)
    expect((points[0].haulageParty as Record<string, unknown>).partyRole).toBe('ShipFrom')
    expect((points[1].haulageParty as Record<string, unknown>).partyRole).toBe('ShipTo')
  })

  // ── Charge location override ──

  it('uses locOverride when set for charge location', () => {
    const payload = buildInttraPayload(minimalForm({
      partyCount: '1',
      party_0_role: 'Carrier',
      party_0_name: 'Carrier Co',
      party_0_chargeCount: '1',
      party_0_charge_0_type: 'OceanFreight',
      party_0_charge_0_term: 'Prepaid',
      party_0_charge_0_locOverride: 'DEHAM',
      legCount: '0',
    }))
    const parties = payload.parties as Record<string, unknown>[]
    const charges = parties[0].charges as Record<string, unknown>[]
    const loc = charges[0].chargeLocation as Record<string, unknown>
    expect(loc.identifierValue).toBe('DEHAM')
  })

  it('falls back to auto-calculated location when no override', () => {
    const payload = buildInttraPayload(minimalForm({
      partyCount: '1',
      party_0_role: 'Carrier',
      party_0_name: 'Carrier Co',
      party_0_chargeCount: '1',
      party_0_charge_0_type: 'OceanFreight',
      party_0_charge_0_term: 'Prepaid',
      party_0_charge_0_locOverride: '',
      legCount: '0',
    }))
    const parties = payload.parties as Record<string, unknown>[]
    const charges = parties[0].charges as Record<string, unknown>[]
    const loc = charges[0].chargeLocation as Record<string, unknown>
    // With no legs, routeFromForm falls back to POR (LKCMB) for OceanFreight+Prepaid
    expect(loc.identifierValue).toBe('LKCMB')
  })
})

// ── computeAdvisories — LEG_PORT_DEFAULTED ─────────────────────────────────

describe('computeAdvisories — LEG_PORT_DEFAULTED', () => {
  it('warns for DoorToPort with no per-leg locations', () => {
    const issues = computeAdvisories(formOf({
      moveType: 'DoorToPort',
      eqCount: '1', eq_0_haulage: 'CarrierMerchant',
      partyCount: '1', party_0_role: 'ShipFrom',
      incoterm: '', legCount: '1',
      leg_0_stage: 'MainCarriage',
      leg_0_startLoc: '', leg_0_endLoc: '',
      placeOfReceipt: 'DOORADDR', placeOfDelivery: 'NLRTM',
      receiptIdentifierType: 'UNLOC', deliveryIdentifierType: 'UNLOC',
    }))
    const portWarns = issues.filter(i => i.code === 'LEG_PORT_DEFAULTED')
    expect(portWarns).toHaveLength(2) // start + end
    expect(portWarns[0].severity).toBe('warning')
  })

  it('no warning for PortToPort', () => {
    const issues = computeAdvisories(formOf({
      moveType: 'PortToPort',
      eqCount: '1', eq_0_haulage: 'MerchantMerchant',
      partyCount: '0', incoterm: '', legCount: '1',
      leg_0_stage: 'MainCarriage',
      leg_0_startLoc: '', leg_0_endLoc: '',
      placeOfReceipt: 'LKCMB', placeOfDelivery: 'NLRTM',
      receiptIdentifierType: 'UNLOC', deliveryIdentifierType: 'UNLOC',
    }))
    const portWarns = issues.filter(i => i.code === 'LEG_PORT_DEFAULTED')
    expect(portWarns).toHaveLength(0)
  })

  it('no warning when per-leg locations are set for DoorToPort', () => {
    const issues = computeAdvisories(formOf({
      moveType: 'DoorToPort',
      eqCount: '1', eq_0_haulage: 'CarrierMerchant',
      partyCount: '1', party_0_role: 'ShipFrom',
      incoterm: '', legCount: '1',
      leg_0_stage: 'MainCarriage',
      leg_0_startLoc: 'LKCMB', leg_0_endLoc: 'NLRTM',
      placeOfReceipt: 'DOORADDR', placeOfDelivery: 'NLRTM',
      receiptIdentifierType: 'UNLOC', deliveryIdentifierType: 'UNLOC',
    }))
    const portWarns = issues.filter(i => i.code === 'LEG_PORT_DEFAULTED')
    expect(portWarns).toHaveLength(0)
  })
})
