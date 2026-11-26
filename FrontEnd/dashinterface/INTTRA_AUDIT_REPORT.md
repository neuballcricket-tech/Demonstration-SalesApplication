# INTTRA Booking Frontend → Backend Compatibility Audit Report

## 1. Verdict

**The frontend payload is structurally compatible with the backend Pydantic models for the PortToPort + FCL happy path, but has 5 confirmed schema-level incompatibilities that will cause Pydantic validation failures, plus 1 critical structural gap for door-movement bookings.**

---

## 2. Complete Submission Flow

```
User clicks "Submit INTTRA Booking"
        │
        ▼
useWorkspaceActions.ts:1922  — procBookingTab === 'inttra'
        │
        ▼
useWorkspaceActions.ts:1927-2079  — Build payload from flat inttraField(key) state
        │  Constructs: transactionContact, transactionLocations, references,
        │  parties (with charges), packageDetails, equipments (with haulage),
        │  transportLegs, boolean indicators, generalComments
        │
        ▼
api.ts:1682-1687  — apiSubmitInttraBooking(inqId, payload)
        │  → post('/booking-requests/${inqId}/inttra-booking', payload)
        │
        ▼
api.ts:30-47  — post() helper
        │  → fetch(URL, {method:'POST', body: JSON.stringify(payload)})
        │  On error: throws Error("POST path failed: STATUS — {JSON detail}")
        │
        ▼ (HTTP POST)
        │
router.py:120-129  — FastAPI endpoint
        │  raw = await request.json()
        │  payload = BookingRequest(**raw)         ← PYDANTIC VALIDATION
        │  return await service.create_inttra_booking(inq_id, payload)
        │
        ▼
inttra_booking.py:24-115  — create_inttra_booking()
        │  1. Fetch incoterm from inquiry table
        │  2. Collect & verify UNLOCs against port table
        │  3. assess_booking(payload, incoterm, known_unlocs)
        │     └→ If errors: HTTP 422 {"errors": ["msg1",...]}
        │  4. model_dump(by_alias=True, exclude_none=True)
        │  5. POST to INTTRA external API
        │     └→ On success: persist to booking_request table, return response
        │     └→ On failure: HTTP 502/504 with INTTRA error details
        │
        ▼ (Back to frontend)
        │
useWorkspaceActions.ts:2093-2097  — catch block
        │  setInttraError(err.message)  — raw string passed to display layer
        │
        ▼
InlineStepForms.tsx  — parseBackendErrors(inttraError)
        │  Extracts JSON from "POST path failed: STATUS — {json}"
        │  Routes to: Pydantic errors | Business rule errors | INTTRA errors | plain string
```

---

## 3. Discrepancy Report

### CRITICAL — Pydantic Validation Failures

#### D. Door Movement: Missing `haulage.points` (BLOCKING)

**Evidence:**

Frontend (useWorkspaceActions.ts:2034):
```typescript
haulage: { arrangement: inttraField(`eq_${ei}_haulage`) }
```

Backend requires (inttra_booking_types.py:583-589):
```python
if self.move_type in ("DoorToDoor", "DoorToPort"):
    haulage_roles = {
        point.haulage_party.party_role
        for point in (equipment.haulage.points or [])
    }
    if "ShipFrom" not in haulage_roles:
        raise ValueError("Door origin requires ShipFrom in equipments[].haulage.points")
```

**Problem:** Frontend sends `haulage: {arrangement: "CarrierMerchant"}` with no `points` array. For DoorToPort / DoorToDoor, the model validator requires `haulage.points` to contain a `HaulagePoint` whose `haulageParty.partyRole === "ShipFrom"`. Since `points` is `None`, the roles set is empty, and validation fails.

**Impact:** Every door-origin booking will be rejected by Pydantic with: `"Door origin requires ShipFrom in equipments[].haulage.points"`.

**Fix required:** Frontend must build `haulage.points` array with a `HaulagePoint` containing the ShipFrom party (a full `Party` object under `haulageParty`), plus optional `HaulageDate` entries.

---

#### K.1. `serviceType: ""` Instead of `null` (BLOCKING)

**Evidence:**

Frontend (useWorkspaceActions.ts:2064):
```typescript
serviceType: inttraField('serviceType'),
```

Backend (inttra_booking_types.py:520):
```python
service_type: Literal["FCL", "LCL"] | None = Field(None, alias="serviceType")
```

**Problem:** If the user doesn't select a service type, `inttraField('serviceType')` returns `""`. Empty string is not `"FCL"`, `"LCL"`, or `None`. Pydantic rejects it.

**Fix:** `serviceType: inttraField('serviceType') || null`

---

#### K.2. `carrierScac: ""` on Transport Legs (BLOCKING)

**Evidence:**

Frontend (useWorkspaceActions.ts:2049):
```typescript
carrierScac: inttraField(`leg_${li}_scac`),
```

Backend (inttra_booking_types.py:169):
```python
carrier_scac: Annotated[str, Field(min_length=4, max_length=4)] | None
```

**Problem:** If the SCAC field is empty, `""` fails `min_length=4`. Must be either a valid 4-char SCAC or omitted/null.

**Fix:** `carrierScac: inttraField(\`leg_${li}_scac\`) || undefined`

---

#### K.3. Empty `weightValue` in `goodsGrossWeight` (BLOCKING)

**Evidence:**

Frontend (useWorkspaceActions.ts:2016):
```typescript
goodsGrossWeight: {
    weightValue: inttraField(`pkg_${ki}_weight`),
    weightType: inttraField(`pkg_${ki}_weightUnit`) || 'KGM'
}
```

Backend (inttra_booking_types.py:26):
```python
WeightDecimal = Annotated[str, Field(max_length=18, pattern=r"^[0-9]+(?:\.[0-9]{1,3})?$")]
```

**Problem:** `goodsGrossWeight` is ALWAYS included (not conditional). If the weight field is empty, `weightValue: ""` fails the `WeightDecimal` regex pattern. `goodsGrossWeight` is mandatory on `PackageDetail` — it cannot be omitted.

**Fix:** Frontend form must require weight to be non-empty. Add validation before payload construction.

---

#### F. Temperature Value Format (BLOCKING when reefer used)

**Evidence:**

Frontend (useWorkspaceActions.ts:2037):
```typescript
eq.temperature = {
    value: inttraField(`eq_${ei}_reeferTemp`),
    type: inttraField(`eq_${ei}_reeferUnit`) || 'CEL'
}
```

Backend (inttra_booking_types.py:28-31):
```python
TemperatureValue = Annotated[str, Field(max_length=5,
    pattern=r"^(?:[0-9]{3}|-[0-9]{3}|[0-9]{2}\.[0-9]|-[0-9]{2}\.[0-9])$")]
```

**Problem:** The regex requires exactly 3 digits or 2 digits + 1 decimal. User inputs like `25` or `-18` don't match. Valid examples: `025`, `-018`, `25.0`, `-18.0`.

**Fix:** Pad/format the temperature value before serialization: `padTemperature("25") → "025"`, `padTemperature("-18") → "-018"`.

---

### MODERATE — Structural Issues

#### A. Transport Leg Locations Hardcoded to POR/PODel

**Evidence:**

Frontend (useWorkspaceActions.ts:2054-2055):
```typescript
startLocation: {
    identifierValue: inttraField('placeOfReceipt'),
    identifierType: inttraField('receiptIdentifierType') || 'UNLOC',
    locationType: 'PlaceOfLoad'
},
endLocation: {
    identifierValue: inttraField('placeOfDelivery'),
    identifierType: inttraField('deliveryIdentifierType') || 'UNLOC',
    locationType: 'PlaceOfDischarge'
},
```

Backend validation (validation.py:188-191):
```python
if first.location_type != "PlaceOfLoad":
    out.error("MAIN_LEG_START", ...)
if last.location_type != "PlaceOfDischarge":
    out.error("MAIN_LEG_END", ...)
```

**Analysis:** For **PortToPort**, POR === POL and PODel === POD, so this works correctly. For **door movements** (DoorToPort, PortToDoor, DoorToDoor), the POR/PODel may be door addresses, not port codes. The MainCarriage leg start/end should be the actual ports, not the door locations. The `locationType` is correctly set to `PlaceOfLoad`/`PlaceOfDischarge`, but the `identifierValue` will be wrong if it's a door address.

**Impact:** Door bookings may have incorrect port codes on transport legs.

---

### LOW — Business Logic Gaps (Pass Pydantic, May Fail INTTRA)

| ID | Issue | Pydantic | INTTRA Risk |
|----|-------|----------|-------------|
| B | `transportLegs: []` sent when no legs | Passes | Accepted if dates provided |
| E | `cargoHazardousIndicator: true` with no DG data | Passes | May be rejected |
| G | `cargoOutofGaugeIndicator: true` with no OOG details | Passes | May be rejected |
| H | Date value length may not match declared format | Passes schema | `_check_dates` warning |
| I | Empty HS code `""` as `goodsClassificationValue` | Passes (not None) | Likely rejected |

---

### NON-ISSUES (Confirmed Compatible)

| Area | Status |
|------|--------|
| `bookingState: "REQUEST"` matches `Literal["REQUEST"]` | ✓ |
| `customerChangeSummary: null` → Python `None` → passes validator | ✓ |
| `cargoOutofGaugeIndicator` casing matches alias exactly | ✓ |
| Charges structure (chargeType, paymentTerm, chargeLocation) | ✓ |
| Party structure (partyRole, partyName1, address, etc.) | ✓ |
| Reference structure (referenceType, referenceValue) | ✓ |
| TransactionLocations (PlaceOfReceipt, PlaceOfDelivery) | ✓ |
| LocationDate structure (dateValue, dateFormat, type) | ✓ |
| EquipmentSizeCode structure (sizeCodeType, sizeCodeValue) | ✓ |
| `lineNumber`, `count`, `sequenceNumber` integer/string types | ✓ |
| `vesselName`, `conveyanceNumber` use `|| undefined` correctly | ✓ |
| `perContainerReleaseFlag`, `notifyMe` boolean conditionals | ✓ |
| `generalComments` conditional inclusion | ✓ |

---

## 4. Field Mapping Table

| Frontend Form Key | Frontend JSON Key | Pydantic Field | Pydantic Alias | Type | Compatible? |
|---|---|---|---|---|---|
| `contactName` | `transactionContact.name` | `Contact.name` | `name` | S35 | ✓ |
| `contactType` | `transactionContact.contactType` | `Contact.contact_type` | `contactType` | Literal | ✓ |
| `contactEmail` | `transactionContact.emails` | `Contact.emails` | `emails` | list[str]\|None | ✓ |
| `contactPhone` | `transactionContact.phones` | `Contact.phones` | `phones` | list[str]\|None | ✓ |
| `moveType` | `moveType` | `BookingRequest.move_type` | `moveType` | Literal | ✓ |
| `serviceType` | `serviceType` | `BookingRequest.service_type` | `serviceType` | Literal\|None | **✗ `""` fails** |
| `shipmentId` | `shipmentId` | `BookingRequest.shipment_id` | `shipmentId` | S35\|None | ✓ (conditional) |
| `cargoHazardous` | `cargoHazardousIndicator` | `cargo_hazardous_indicator` | `cargoHazardousIndicator` | bool\|None | ✓ |
| `cargoControlledEnvironment` | `cargoControlledEnvironmentIndicator` | `cargo_controlled_environment_indicator` | `cargoControlledEnvironmentIndicator` | bool\|None | ✓ |
| `cargoEnvironmentalPollutant` | `cargoEnvironmentalPollutantIndicator` | `cargo_environmental_pollutant_indicator` | `cargoEnvironmentalPollutantIndicator` | bool\|None | ✓ |
| `cargoOutOfGauge` | `cargoOutofGaugeIndicator` | `cargo_out_of_gauge_indicator` | `cargoOutofGaugeIndicator` | bool\|None | ✓ |
| `placeOfReceipt` | `transactionLocations[0].identifierValue` | `Location.identifier_value` | `identifierValue` | S25 | ✓ |
| `receiptIdentifierType` | `transactionLocations[0].identifierType` | `Location.identifier_type` | `identifierType` | Literal | ✓ |
| `placeOfDelivery` | `transactionLocations[1].identifierValue` | `Location.identifier_value` | `identifierValue` | S25 | ✓ |
| `deliveryIdentifierType` | `transactionLocations[1].identifierType` | `Location.identifier_type` | `identifierType` | Literal | ✓ |
| `earliestDepartureDate` | `transactionLocations[N].locationDates[0].dateValue` | `LocationDate.date_value` | `dateValue` | S35 | ✓ |
| `locationDateFormat` | `transactionLocations[N].locationDates[0].dateFormat` | `LocationDate.date_format` | `dateFormat` | DateFormat | ✓ |
| `locationDateType` | `transactionLocations[N].locationDates[0].type` | `LocationDate.type` | `type` | Literal | ✓ |
| `ref_${i}_type` | `references[i].referenceType` | `Reference.reference_type` | `referenceType` | Literal | ✓ |
| `ref_${i}_value` | `references[i].referenceValue` | `Reference.reference_value` | `referenceValue` | str | ✓ |
| `party_${i}_role` | `parties[i].partyRole` | `Party.party_role` | `partyRole` | Literal | ✓ |
| `party_${i}_name` | `parties[i].partyName1` | `Party.party_name1` | `partyName1` | S35 | ✓ |
| `party_${i}_alias` | `parties[i].partyAlias` | `Party.party_alias` | `partyAlias` | S35\|None | ✓ |
| `party_${i}_inttraId` | `parties[i].partyINTTRACompanyId` | `Party.party_inttra_company_id` | `partyINTTRACompanyId` | S35\|None | ✓ |
| `party_${i}_address` | `parties[i].address.unstructuredAddress01` | `Address.unstructured_address01` | `unstructuredAddress01` | S35\|None | ✓ |
| `party_${i}_city` | `parties[i].address.city` | `Address.city` | `city` | S35\|None | ✓ |
| `party_${i}_country` | `parties[i].address.country.countryCodeValue` | `Country.country_code_value` | `countryCodeValue` | regex `^[A-Z]{2}$` | ✓ |
| `party_${i}_charge_${c}_type` | `parties[i].charges[c].chargeType` | `Charge.charge_type` | `chargeType` | Literal | ✓ |
| `party_${i}_charge_${c}_term` | `parties[i].charges[c].paymentTerm` | `Charge.payment_term` | `paymentTerm` | Literal | ✓ |
| *(auto-computed)* | `parties[i].charges[c].chargeLocation` | `Charge.charge_location` | `chargeLocation` | ChargeLocation\|None | ✓ |
| `pkg_${i}_goodsDesc` | `packageDetails[i].goodsDescription` | `PackageDetail.goods_description` | `goodsDescription` | S1024 | ✓ |
| `pkg_${i}_hsCode` | `packageDetails[i].goodsClassificationValue` | `PackageDetail.goods_classification_value` | `goodsClassificationValue` | S35\|None | ✓ |
| `pkg_${i}_classType` | `packageDetails[i].goodsClassificationType` | `PackageDetail.goods_classification_type` | `goodsClassificationType` | Literal\|None | ✓ |
| `pkg_${i}_weight` | `packageDetails[i].goodsGrossWeight.weightValue` | `Weight.weight_value` | `weightValue` | WeightDecimal | **✗ `""` fails** |
| `pkg_${i}_weightUnit` | `packageDetails[i].goodsGrossWeight.weightType` | `Weight.weight_type` | `weightType` | Literal | ✓ |
| `pkg_${i}_volume` | `packageDetails[i].goodsGrossVolume.volumeValue` | `Volume.volume_value` | `volumeValue` | VolumeDecimal | ✓ (conditional) |
| `pkg_${i}_pkgCount` | `packageDetails[i].count` | `PackageDetail.count` | `count` | PositiveCount | ✓ |
| `pkg_${i}_pkgCode` | `packageDetails[i].typeValue` | `PackageDetail.type_value` | `typeValue` | S17\|None | ✓ |
| `pkg_${i}_pkgDesc` | `packageDetails[i].typeDescription` | `PackageDetail.type_description` | `typeDescription` | S35\|None | ✓ |
| `eq_${i}_count` | `equipments[i].count` | `Equipment.count` | `count` | PositiveCount | ✓ |
| `eq_${i}_sizeCode` | `equipments[i].equipmentSizeCode.sizeCodeValue` | `EquipmentSizeCode.size_code_value` | `sizeCodeValue` | str | ✓ |
| `eq_${i}_haulage` | `equipments[i].haulage.arrangement` | `Haulage.arrangement` | `arrangement` | Literal | ✓ |
| *(missing)* | `equipments[i].haulage.points` | `Haulage.points` | `points` | list[HaulagePoint]\|None | **✗ never built** |
| `eq_${i}_svcType` | `equipments[i].serviceType` | `Equipment.service_type` | `serviceType` | Literal\|None | ✓ |
| `eq_${i}_supplier` | `equipments[i].supplierType` | `Equipment.supplier_type` | `supplierType` | Literal\|None | ✓ |
| `eq_${i}_reeferTemp` | `equipments[i].temperature.value` | `Temperature.value` | `value` | TemperatureValue | **✗ format** |
| `eq_${i}_reeferUnit` | `equipments[i].temperature.type` | `Temperature.type` | `type` | Literal | ✓ |
| `eq_${i}_comments` | `equipments[i].comments` | `Equipment.comments` | `comments` | str\|None | ✓ |
| `leg_${i}_stage` | `transportLegs[i].stage` | `TransportLeg.stage` | `stage` | Literal | ✓ |
| `leg_${i}_scac` | `transportLegs[i].carrierScac` | `TransportLeg.carrier_scac` | `carrierScac` | str(4,4)\|None | **✗ `""` fails** |
| `leg_${i}_vessel` | `transportLegs[i].vesselName` | `TransportLeg.vessel_name` | `vesselName` | S35\|None | ✓ |
| `leg_${i}_voyage` | `transportLegs[i].conveyanceNumber` | `TransportLeg.conveyance_number` | `conveyanceNumber` | S17\|None | ✓ |
| `leg_${i}_mode` | `transportLegs[i].mode` | `TransportLeg.mode` | `mode` | Literal\|None | ✓ |
| `leg_${i}_means` | `transportLegs[i].means` | `TransportLeg.means` | `means` | Literal\|None | ✓ |
| `placeOfReceipt` | `transportLegs[i].startLocation.identifierValue` | `LegLocation.identifier_value` | `identifierValue` | S25 | ⚠ wrong for door |
| `placeOfDelivery` | `transportLegs[i].endLocation.identifierValue` | `LegLocation.identifier_value` | `identifierValue` | S25 | ⚠ wrong for door |
| `generalComments` | `generalComments` | `BookingRequest.general_comments` | `generalComments` | str\|None | ✓ |

---

## 5. Backend Error Response Gap

The current backend error format (inttra_booking.py:66):
```python
raise HTTPException(status_code=422, detail={"errors": [i.message for i in result.errors]})
```

This sends only error **message strings**, not structured `Issue` objects. The frontend's `parseBackendErrors()` has a handler for `{detail: {issues: [...]}}` that would parse structured issues with severity, code, field, message, and source — but the backend never sends that format. The function falls through to the `{detail: {errors: [...]}}` handler which creates generic error issues without field paths or codes.

If the backend were changed to:
```python
raise HTTPException(status_code=422, detail={
    "errors": [i.message for i in result.errors],
    "issues": [i.as_dict() for i in result.issues],
})
```

The frontend would automatically display field-level error attribution and proper severity classification from the backend `assess_booking()` output.

---

## 6. Recommended Fixes (Priority Order)

| # | Fix | Severity | Files |
|---|-----|----------|-------|
| 1 | Use `\|\| undefined` for optional string fields (`serviceType`, `carrierScac`) to avoid sending `""` | Critical | useWorkspaceActions.ts |
| 2 | Add form validation requiring non-empty weight before payload construction | Critical | InlineStepForms.tsx or useWorkspaceActions.ts |
| 3 | Build `haulage.points` array with ShipFrom party for door-origin movements | Critical | useWorkspaceActions.ts |
| 4 | Format TemperatureValue to match `^([0-9]{3}\|-[0-9]{3}\|[0-9]{2}\\.[0-9]\|-[0-9]{2}\\.[0-9])$` | Critical | useWorkspaceActions.ts |
| 5 | Use per-leg location fields for transport leg start/end instead of POR/PODel | Moderate | useWorkspaceActions.ts |
| 6 | Backend: include structured `issues` array in 422 response alongside `errors` | Enhancement | inttra_booking.py |
