# Missing Backend Endpoints — Documentation & BL Workflow

**Date:** 2026-09-14
**Scope:** Endpoints the frontend (Workspace.tsx, App.tsx) already has UI for but NO backend API call exists.
**Reference specs:** `Context/bl_field_spec.json` (HBL), `Context/mbl_field_spec.json` (MBL)

---

## Overview

The frontend has complete forms and handler functions for the entire documentation workflow (Steps 9–17 in the Workspace), but **all state mutations are frontend-only** — nothing persists to the database. The existing `apiPatchJobBooking()` endpoint can handle simple field updates on the `job_bookings` table, but MBL and HBL are complex multi-section documents that need their own tables.

### What already exists in the backend

| Endpoint | Purpose |
|----------|---------|
| `POST /documentation/cutoffs` | Create cutoff dates record |
| `PATCH /documentation/cutoffs/{id}` | Update cutoff fields |
| `PATCH /documentation/cutoffs/{id}/submit-si` | Submit SI text to cutoff record |
| `GET /documentation/cutoffs/reminders` | Fetch SI reminder queue |
| `PATCH /documentation/cutoffs/{id}/send-reminder` | Mark reminder as sent |
| `GET /documentation/job-creation/voyages` | List all vessel schedules |
| `GET /documentation/job-creation/voyages/mine` | List current user's vessel schedules |
| `POST /documentation/job-creation/voyages` | Create vessel schedule |
| `PATCH /documentation/job-creation/voyages/{vs_id}` | Update vessel schedule |
| `GET /documentation/job-creation/bookings` | List job bookings |
| `POST /documentation/job-creation/bookings` | Create job booking |
| `PATCH /documentation/job-creation/bookings/{bkg_id}` | Update job booking |

### What is missing

**11 new endpoints** across 4 categories:

| # | Priority | Endpoint | Category |
|---|----------|----------|----------|
| 1 | P0 | `POST /documentation/master-bl` | MBL Creation |
| 2 | P0 | `GET /documentation/master-bl/{mbl_id}` | MBL Retrieval |
| 3 | P0 | `PATCH /documentation/master-bl/{mbl_id}` | MBL Update |
| 4 | P0 | `POST /documentation/house-bl` | HBL Creation |
| 5 | P0 | `GET /documentation/house-bl/{hbl_id}` | HBL Retrieval |
| 6 | P0 | `PATCH /documentation/house-bl/{hbl_id}` | HBL Update |
| 7 | P1 | `PATCH /documentation/job-creation/bookings/{bkg_id}/status` | Workflow Status Flags |
| 8 | P1 | `POST /documentation/generate-si` | SI Document Generation |
| 9 | P1 | `POST /documentation/send-pre-advice` | Pre-Advice Email |
| 10 | P2 | `GET /documentation/house-bl/by-booking/{bkg_id}` | HBL Lookup by Booking |
| 11 | P2 | `GET /documentation/master-bl/by-booking/{bkg_id}` | MBL Lookup by Booking |

---

## Database Schema

### New Tables

```sql
-- ============================================================
-- Master Bill of Lading (Sea Waybill)
-- Source: Context/mbl_field_spec.json (13 sections)
-- ============================================================
CREATE TABLE master_bl (
    mbl_id              SERIAL PRIMARY KEY,
    bkg_id              INTEGER NOT NULL REFERENCES job_bookings(bkg_id),
    vs_id               INTEGER REFERENCES vessel_schedule(vs_id),
    status              VARCHAR(20) NOT NULL DEFAULT 'draft',
        -- draft | submitted | approved | amended

    -- Document header
    waybill_no          VARCHAR(20),            -- Carrier-assigned (e.g. MEDUKL812774)
    waybill_seq         SMALLINT DEFAULT 1,
    rider_pages         SMALLINT DEFAULT 1,
    transport_type      VARCHAR(20) DEFAULT 'PORT-TO-PORT',
        -- PORT-TO-PORT | COMBINED TRANSPORT
    lloyds_imo          VARCHAR(10),            -- 7-digit IMO vessel identifier

    -- Carrier
    carrier_name        VARCHAR(80),
    carrier_address     TEXT,
    carrier_website     VARCHAR(120),

    -- Shipper (= freight forwarder on MBL)
    shipper_name        VARCHAR(70) NOT NULL,
    shipper_address     TEXT,
    shipper_contact_name  VARCHAR(70),
    shipper_contact_phone VARCHAR(20),
    shipper_contact_email VARCHAR(120),

    -- Consignee (= destination agent on MBL)
    consignee_name      VARCHAR(70) NOT NULL,
    consignee_address   TEXT,

    -- Notify parties
    notify_clause       TEXT,
    notify_name         VARCHAR(70),
    notify_address      TEXT,
    notify_contact_name VARCHAR(70),
    notify_contact_phone VARCHAR(20),
    notify_contact_email VARCHAR(120),

    -- POD agent
    pod_agent_name      VARCHAR(80),
    pod_agent_dept      VARCHAR(60),
    pod_agent_address   TEXT,
    pod_agent_phone     VARCHAR(20),
    pod_agent_fax       VARCHAR(20),
    pod_agent_email     VARCHAR(120),

    -- Vessel & voyage
    vessel_voyage       VARCHAR(50),
    port_of_loading     VARCHAR(50),
    port_of_discharge   VARCHAR(50),
    place_of_receipt    VARCHAR(50),
    place_of_delivery   VARCHAR(50),
    load_type           VARCHAR(10) DEFAULT 'FCL/FCL',

    -- References
    booking_ref         VARCHAR(20),            -- Carrier's booking ref
    shipper_ref         VARCHAR(35),            -- CLS job number
    carrier_receipt     VARCHAR(20),

    -- Cargo summary
    total_items         INTEGER,
    total_gross_weight  DECIMAL(12,3),
    weight_unit         VARCHAR(5) DEFAULT 'KGS',
    total_net_weight    DECIMAL(12,3),
    cargo_description   TEXT,                   -- Cargo clause / load statement

    -- Freight & charges
    freight_charges     VARCHAR(30) DEFAULT 'AS PER AGREEMENT',
    freight_clause      VARCHAR(120),
    declared_value      VARCHAR(20),

    -- Issuance & signature
    place_of_issue      VARCHAR(50),
    date_of_issue       DATE,
    shipped_on_board_date DATE,
    signed_on_behalf_of VARCHAR(120),
    signing_agent       VARCHAR(70),
    agent_code          VARCHAR(20),
    agent_capacity      VARCHAR(80),

    -- Special clauses
    thermal_clause      TEXT,
    pallets_clause      TEXT,
    rider_note          VARCHAR(120),

    created_by          INTEGER REFERENCES employee(emp_id),
    created_at          TIMESTAMP NOT NULL DEFAULT now(),
    updated_at          TIMESTAMP NOT NULL DEFAULT now()
);

-- MBL container lines (rider page)
CREATE TABLE master_bl_container (
    mbl_cont_id     SERIAL PRIMARY KEY,
    mbl_id          INTEGER NOT NULL REFERENCES master_bl(mbl_id) ON DELETE CASCADE,
    container_no    CHAR(11),               -- ISO 6346 with check digit
    container_type  VARCHAR(20),            -- 20' DRY VAN, 40' HIGH CUBE, etc.
    seal_no         VARCHAR(20),
    po_number       VARCHAR(35),
    hs_code         VARCHAR(12),
    description_of_goods TEXT,
    gross_weight    DECIMAL(12,3),
    cbm             DECIMAL(10,3),
    sort_order      SMALLINT DEFAULT 0
);

-- ============================================================
-- House Bill of Lading
-- Source: Context/bl_field_spec.json (10 sections)
-- ============================================================
CREATE TABLE house_bl (
    hbl_id              SERIAL PRIMARY KEY,
    bkg_id              INTEGER NOT NULL REFERENCES job_bookings(bkg_id),
    mbl_id              INTEGER REFERENCES master_bl(mbl_id),
    status              VARCHAR(20) NOT NULL DEFAULT 'draft',
        -- draft | pending_approval | approved | changes_requested | confirmed

    -- B/L details
    branch              VARCHAR(20) DEFAULT 'COLOMBO',
    booking_no          VARCHAR(20),
    shipment_category   VARCHAR(20) DEFAULT 'LOCAL EXPORT',
        -- LOCAL EXPORT | RE-EXPORT | TRANSHIPMENT | CROSS TRADE
    bl_type             VARCHAR(15),
        -- OWN | CO-LOAD | MASTER ONLY
    house_bl_no         VARCHAR(30),            -- System-generated
    custom_bl_no        VARCHAR(30),
    stt_no              VARCHAR(20),            -- Transhipment only
    hs_code             VARCHAR(12),
    delivery_no         VARCHAR(20),

    -- Parties
    shipper_name        VARCHAR(70) NOT NULL,
    shipper_ref         VARCHAR(35),
    email_ref           VARCHAR(120),
    shipper_address     TEXT NOT NULL,
    shipper_tel         BOOLEAN DEFAULT false,
    shipper_fax         BOOLEAN DEFAULT false,
    shipper_on_invoice  BOOLEAN DEFAULT false,
    consigned_to        VARCHAR(25),
        -- '' | TO ORDER | TO ORDER OF SHIPPER | TO ORDER OF BANK | STRAIGHT / NAMED
    consignee_name      VARCHAR(70) NOT NULL,
    consignee_address   TEXT NOT NULL,
    notify_type         VARCHAR(20),
        -- '' | SAME AS CONSIGNEE | THIRD PARTY | AGENT
    notify_name         VARCHAR(70),
    notify_address      TEXT,
    also_notify         TEXT,
    customer_category   VARCHAR(20) DEFAULT 'DIRECT',
        -- DIRECT | AGENT | NOMINATION | CO-LOADER
    business_type       VARCHAR(25) DEFAULT 'AGENT NOMINATION',
        -- AGENT NOMINATION | FREE HAND | CONTROLLED | TRIANGLE
    customer_shipper    VARCHAR(70),            -- FK → customer
    billing_party       VARCHAR(70),            -- FK → customer
    emp_id_sales        INTEGER REFERENCES employee(emp_id),
    emp_id_cs           INTEGER REFERENCES employee(emp_id),
    emp_id_doc          INTEGER REFERENCES employee(emp_id),
    introduced_by       INTEGER REFERENCES employee(emp_id),
    nominated_agent     VARCHAR(70),

    -- Cargo summary
    cargo_type          VARCHAR(20) DEFAULT 'GENERAL',
        -- GENERAL | REEFER | HAZARDOUS | OUT OF GAUGE
    commodity           VARCHAR(60),
    no_of_containers    INTEGER,
    show_cntr_on_bl     BOOLEAN DEFAULT true,
    show_cntr_on_attachment BOOLEAN DEFAULT false,
    total_packages      DECIMAL(12,2),
    package_type        VARCHAR(20),
    print_details       VARCHAR(20) DEFAULT 'PACKAGE DETAILS',
        -- PACKAGE DETAILS | CONTAINER DETAILS | BOTH | NONE
    gross_weight        DECIMAL(12,3),
    weight_uom          VARCHAR(5) DEFAULT 'KG',
    gross_decimals      SMALLINT DEFAULT 2,
    net_weight          DECIMAL(12,3),
    net_print_with      VARCHAR(15) DEFAULT 'BOTH',
        -- BOTH | GROSS ONLY | NET ONLY | NONE
    cbm                 DECIMAL(10,3),
    cbm_decimals        SMALLINT DEFAULT 2,
    wm_ratio            INTEGER DEFAULT 1000,
    marks_numbers       TEXT,

    -- Goods description
    description_of_goods TEXT,
    liner_bl_description TEXT,
    description_prefix  VARCHAR(120),
    print_to_bl_text    VARCHAR(60),
    print_to_bl         BOOLEAN DEFAULT false,
    attach_sheet        VARCHAR(3) DEFAULT 'NO',
    sap_description     TEXT,

    -- Routing and delivery
    delivery_type       VARCHAR(10) DEFAULT 'CY/CY',
        -- CY/CY | CY/CFS | CFS/CY | CFS/CFS | DOOR/DOOR
    incoterm            VARCHAR(5),
    country_of_origin   VARCHAR(40),
    transit_time        INTEGER,
    place_of_receipt    VARCHAR(50),
    port_of_loading     VARCHAR(50),
    pol_code            CHAR(5),                -- UN/LOCODE
    port_of_discharge   VARCHAR(50),
    pod_code            CHAR(5),                -- UN/LOCODE
    pod_eta             DATE,
    pod_ata             DATE,
    final_destination   VARCHAR(50),
    fd_code             CHAR(5),
    fd_eta              DATE,
    place_of_delivery   VARCHAR(50),
    podel_code          CHAR(5),
    podel_eta           DATE,

    -- Issuance
    place_of_bl_issued  VARCHAR(50),
    date_of_bl_issued   DATE,
    shipped_on_board_date DATE,
    received_for_shipment VARCHAR(3) DEFAULT 'NO',
    bl_term             VARCHAR(15) DEFAULT 'NON-NEGO',
        -- NON-NEGO | NEGOTIABLE | SEAWAY | EXPRESS
    no_of_original_bls  VARCHAR(10) DEFAULT 'ZERO (0)',
    permit_no           VARCHAR(25),
    surrendered         BOOLEAN DEFAULT false,
    hold_cargo          BOOLEAN DEFAULT false,
    email_surrender_letter BOOLEAN DEFAULT false,
    remarks             TEXT,

    -- Freight and charges
    freight_term        VARCHAR(25) DEFAULT 'PREPAID',
        -- PREPAID | COLLECT | PAYABLE AS ARRANGED
    freight_term_text   VARCHAR(60),
    freight_amount      DECIMAL(14,2),
    freight_payable_at  VARCHAR(120),
    freight_term_details TEXT,
    origin_charges      VARCHAR(10) DEFAULT 'PREPAID',
    destination_charges VARCHAR(10) DEFAULT 'COLLECT',

    -- Destination agent and carrier
    pod_agent           VARCHAR(70),
    pod_agent_contact   VARCHAR(70),
    pod_agent_address   TEXT,
    agent_for_carrier   VARCHAR(70),
    detention_days      VARCHAR(120),
    bl_format           VARCHAR(15) DEFAULT 'CLS_FMC',
        -- CLS_FMC | CLS_STD | CLS_NEUTRAL
    print_agent_for_carrier BOOLEAN DEFAULT false,
    display_on_carrier_draft BOOLEAN DEFAULT false,
    display_tariff_charges BOOLEAN DEFAULT false,
    display_additional_text BOOLEAN DEFAULT false,
    draft_confirmed     BOOLEAN DEFAULT false,

    created_by          INTEGER REFERENCES employee(emp_id),
    created_at          TIMESTAMP NOT NULL DEFAULT now(),
    updated_at          TIMESTAMP NOT NULL DEFAULT now()
);

-- HBL container lines
CREATE TABLE house_bl_container (
    hbl_cont_id     SERIAL PRIMARY KEY,
    hbl_id          INTEGER NOT NULL REFERENCES house_bl(hbl_id) ON DELETE CASCADE,
    container_no    CHAR(11),               -- ISO 6346 with check digit
    size            VARCHAR(5),             -- 20 | 40 | 45
    type            VARCHAR(5),             -- GP | HC | RF | OT | FR | TK
    shipment_type   VARCHAR(10),            -- FCL/FCL | FCL/LCL | LCL/LCL | LCL/FCL
    seal_no         VARCHAR(20),
    packages        DECIMAL(12,2),
    package_type    VARCHAR(20),
    gross_weight    DECIMAL(12,3),
    cbm             DECIMAL(10,3),
    sort_order      SMALLINT DEFAULT 0
);

-- HBL manifest charge lines
CREATE TABLE house_bl_charge (
    charge_id       SERIAL PRIMARY KEY,
    hbl_id          INTEGER NOT NULL REFERENCES house_bl(hbl_id) ON DELETE CASCADE,
    description     VARCHAR(60) NOT NULL,
    rate_type       VARCHAR(10) NOT NULL,
        -- BL | CNTR | TON | CBM | W/M | PKG | LUMPSUM
    quantity        DECIMAL(10,2) NOT NULL,
    currency        CHAR(3) NOT NULL,       -- ISO 4217
    exchange_rate   DECIMAL(12,4) NOT NULL,
    prepaid_rate    DECIMAL(14,2),
    prepaid_total   DECIMAL(14,2),
    collect_rate    DECIMAL(14,2),
    collect_total   DECIMAL(14,2),
    sort_order      SMALLINT DEFAULT 0
);

-- Add workflow status columns to existing job_bookings table
ALTER TABLE job_bookings ADD COLUMN IF NOT EXISTS si_requested        BOOLEAN DEFAULT false;
ALTER TABLE job_bookings ADD COLUMN IF NOT EXISTS si_submitted        BOOLEAN DEFAULT false;
ALTER TABLE job_bookings ADD COLUMN IF NOT EXISTS draft_bl_sent       BOOLEAN DEFAULT false;
ALTER TABLE job_bookings ADD COLUMN IF NOT EXISTS liner_bl_generated  BOOLEAN DEFAULT false;
ALTER TABLE job_bookings ADD COLUMN IF NOT EXISTS pre_advice_sent     BOOLEAN DEFAULT false;
ALTER TABLE job_bookings ADD COLUMN IF NOT EXISTS bl_approval_status  VARCHAR(20) DEFAULT 'pending';
    -- pending | approved | changes_requested
ALTER TABLE job_bookings ADD COLUMN IF NOT EXISTS master_bl_recorded  BOOLEAN DEFAULT false;
ALTER TABLE job_bookings ADD COLUMN IF NOT EXISTS house_bl_created    BOOLEAN DEFAULT false;
ALTER TABLE job_bookings ADD COLUMN IF NOT EXISTS job_reference_number VARCHAR(30);
```

---

## Endpoint Specifications

---

### 1. `POST /documentation/master-bl`

Create a Master Bill of Lading (Sea Waybill) record.

**Category:** MBL — P0
**Auth:** Required
**Frontend handler:** `recordMasterBl()` in `App.tsx`, full MBL form in `Workspace.tsx`

**Request Body**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `bkg_id` | int | yes | Job booking ID (FK) |
| `vs_id` | int | no | Vessel schedule ID (FK) |
| `waybill_no` | string | yes | Carrier-assigned waybill number (e.g. `MEDUKL812774`) |
| `waybill_seq` | int | no | Number & sequence of waybills (default: 1) |
| `rider_pages` | int | no | Number of rider pages (default: 1) |
| `transport_type` | string | no | `PORT-TO-PORT` or `COMBINED TRANSPORT` (default: `PORT-TO-PORT`) |
| `lloyds_imo` | string | no | 7-digit IMO vessel identifier |
| `carrier_name` | string | no | Carrier name (e.g. `MEDITERRANEAN SHIPPING COMPANY S.A.`) |
| `carrier_address` | string | no | Carrier address |
| `carrier_website` | string | no | Carrier website |
| `shipper_name` | string | yes | Shipper — the freight forwarder on MBL (e.g. `CL SYNERGY LIMITED`) |
| `shipper_address` | string | no | Shipper address |
| `shipper_contact_name` | string | no | Contact name |
| `shipper_contact_phone` | string | no | Contact phone |
| `shipper_contact_email` | string | no | Contact email |
| `consignee_name` | string | yes | Consignee — the destination agent on MBL |
| `consignee_address` | string | no | Consignee address |
| `notify_clause` | string | no | Disclaimer clause |
| `notify_name` | string | no | Notify party name |
| `notify_address` | string | no | Notify party address |
| `notify_contact_name` | string | no | Notify contact name |
| `notify_contact_phone` | string | no | Notify contact phone |
| `notify_contact_email` | string | no | Notify contact email |
| `pod_agent_name` | string | no | POD agent name |
| `pod_agent_dept` | string | no | POD agent department |
| `pod_agent_address` | string | no | POD agent address |
| `pod_agent_phone` | string | no | POD agent phone |
| `pod_agent_fax` | string | no | POD agent fax |
| `pod_agent_email` | string | no | POD agent email |
| `vessel_voyage` | string | no | Vessel name & voyage number |
| `port_of_loading` | string | no | Port of loading |
| `port_of_discharge` | string | no | Port of discharge |
| `place_of_receipt` | string | no | Place of receipt (Combined Transport only) |
| `place_of_delivery` | string | no | Place of delivery (Combined Transport only) |
| `load_type` | string | no | `FCL/FCL`, `FCL/LCL`, `LCL/LCL`, or `LCL/FCL` |
| `booking_ref` | string | no | Carrier's booking reference |
| `shipper_ref` | string | no | CLS job number |
| `carrier_receipt` | string | no | Carrier's receipt count |
| `total_items` | int | no | Total items / packages |
| `total_gross_weight` | decimal | no | Total gross weight |
| `weight_unit` | string | no | `KGS`, `LBS`, or `MT` |
| `total_net_weight` | decimal | no | Total net weight |
| `cargo_description` | string | no | Cargo clause / load statement |
| `freight_charges` | string | no | `AS PER AGREEMENT`, `PREPAID`, `COLLECT`, or `PAYABLE AT DESTINATION` |
| `freight_clause` | string | no | Freight clause text |
| `declared_value` | string | no | Ad valorem declared value |
| `place_of_issue` | string | no | Place of issue |
| `date_of_issue` | date | no | Date of issue |
| `shipped_on_board_date` | date | no | Shipped on board date |
| `signed_on_behalf_of` | string | no | Signed on behalf of carrier |
| `signing_agent` | string | no | Signing agent company |
| `agent_code` | string | no | Agent code |
| `agent_capacity` | string | no | Agent capacity |
| `thermal_clause` | string | no | Thermal / seasonal clause |
| `pallets_clause` | string | no | Pallets / equipment clause |
| `rider_note` | string | no | Rider reference note |
| `containers` | array | no | Container line items (see below) |

**Container line item:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `container_no` | string | yes | Container number (ISO 6346 with check digit, 11 chars) |
| `container_type` | string | yes | Type/size (e.g. `40' HIGH CUBE`) |
| `seal_no` | string | no | Seal number |
| `po_number` | string | no | PO number |
| `hs_code` | string | no | HS code |
| `description_of_goods` | string | yes | Description of goods |
| `gross_weight` | decimal | yes | Gross weight (KGS) |
| `cbm` | decimal | no | Volume in CBM |

**Response** `201`

```json
{
  "mbl_id": 1,
  "bkg_id": 5,
  "status": "draft",
  "waybill_no": "MEDUKL885309",
  "shipper_name": "CL SYNERGY LIMITED",
  "consignee_name": "PFE EXPRESS LIMITED",
  "port_of_loading": "COLOMBO",
  "port_of_discharge": "FELIXSTOWE",
  "containers": [
    {
      "mbl_cont_id": 1,
      "container_no": "MSCU1234567",
      "container_type": "40' HIGH CUBE",
      "gross_weight": 20736.000,
      "cbm": 30.000
    }
  ],
  "created_at": "2026-09-14T10:00:00"
}
```

**Side effects:**
- Set `job_bookings.master_bl_recorded = true` for the referenced `bkg_id`.

**Cross-field validation rules (from mbl_field_spec.json):**
- `sum(containers.gross_weight) = total_gross_weight`
- `total_net_weight <= total_gross_weight`
- `shipped_on_board_date >= date_of_issue`
- `transport_type = PORT-TO-PORT` implies `place_of_receipt` is blank
- `transport_type = COMBINED TRANSPORT` implies `place_of_receipt` is present
- `port_of_loading != port_of_discharge`

---

### 2. `GET /documentation/master-bl/{mbl_id}`

Fetch a Master BL record with all container lines.

**Category:** MBL — P0
**Auth:** Required

**Response** `200` — Same structure as POST response.

**Error** `404` — Master BL not found.

---

### 3. `PATCH /documentation/master-bl/{mbl_id}`

Update a Master BL record. Only include fields that need updating. Container lines can be replaced wholesale.

**Category:** MBL — P0
**Auth:** Required

**Request Body** — All fields optional, same as POST body.

If `containers` array is provided, replace all existing container lines (delete old, insert new).

**Response** `200` — Returns the updated MBL record with containers.

**Error** `404` — Master BL not found.

---

### 4. `POST /documentation/house-bl`

Create a House Bill of Lading record.

**Category:** HBL — P0
**Auth:** Required
**Frontend handler:** `createHouseBl()` in `App.tsx`, full HBL form in `Workspace.tsx`

**Request Body**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `bkg_id` | int | yes | Job booking ID (FK) |
| `mbl_id` | int | no | Master BL ID (FK — links HBL to its MBL) |
| **B/L Details** | | | |
| `branch` | string | no | Branch (`COLOMBO`, `GALLE`, `HAMBANTOTA`) |
| `booking_no` | string | yes | Booking number |
| `shipment_category` | string | no | `LOCAL EXPORT`, `RE-EXPORT`, `TRANSHIPMENT`, `CROSS TRADE` |
| `bl_type` | string | yes | `OWN`, `CO-LOAD`, `MASTER ONLY` |
| `house_bl_no` | string | yes | House BL number (system-generated) |
| `custom_bl_no` | string | no | Custom BL number for customs |
| `stt_no` | string | no | STT number (transhipment only) |
| `hs_code` | string | no | HS code |
| `delivery_no` | string | no | Delivery number |
| **Parties** | | | |
| `shipper_name` | string | yes | Shipper name (cargo owner on HBL) |
| `shipper_ref` | string | no | Shipper reference / PO number |
| `email_ref` | string | no | Email reference |
| `shipper_address` | string | yes | Shipper address |
| `shipper_tel` | bool | no | Show telephone on shipper block |
| `shipper_fax` | bool | no | Show fax on shipper block |
| `shipper_on_invoice` | bool | no | Show ref on shipper invoice |
| `consigned_to` | string | no | `""`, `TO ORDER`, `TO ORDER OF SHIPPER`, `TO ORDER OF BANK`, `STRAIGHT / NAMED` |
| `consignee_name` | string | yes | Consignee name (buyer on HBL) |
| `consignee_address` | string | yes | Consignee address |
| `notify_type` | string | no | `""`, `SAME AS CONSIGNEE`, `THIRD PARTY`, `AGENT` |
| `notify_name` | string | no | Notify party name |
| `notify_address` | string | no | Notify party address |
| `also_notify` | string | no | Also notify party |
| `customer_category` | string | no | `DIRECT`, `AGENT`, `NOMINATION`, `CO-LOADER` |
| `business_type` | string | no | `AGENT NOMINATION`, `FREE HAND`, `CONTROLLED`, `TRIANGLE` |
| `customer_shipper` | string | no | Customer / shipper for billing |
| `billing_party` | string | no | Billing party name |
| `emp_id_sales` | int | no | Sales person (FK → employee) |
| `emp_id_cs` | int | no | CS executive (FK → employee) |
| `emp_id_doc` | int | no | Documentation officer (FK → employee) |
| `introduced_by` | int | no | Introduced by (FK → employee) |
| `nominated_agent` | string | no | Nominated agent name |
| **Cargo Summary** | | | |
| `cargo_type` | string | no | `GENERAL`, `REEFER`, `HAZARDOUS`, `OUT OF GAUGE` |
| `commodity` | string | no | Commodity description |
| `no_of_containers` | int | no | Number of containers on BL |
| `show_cntr_on_bl` | bool | no | Show containers on BL (default: true) |
| `show_cntr_on_attachment` | bool | no | Show containers on attachment |
| `total_packages` | decimal | no | Total packages in figures |
| `package_type` | string | no | Package type (e.g. `TRAYS`) |
| `print_details` | string | no | `PACKAGE DETAILS`, `CONTAINER DETAILS`, `BOTH`, `NONE` |
| `gross_weight` | decimal | no | Gross weight |
| `weight_uom` | string | no | `KG`, `LBS`, `MT` |
| `gross_decimals` | int | no | Gross weight decimal places |
| `net_weight` | decimal | no | Net weight |
| `net_print_with` | string | no | `BOTH`, `GROSS ONLY`, `NET ONLY`, `NONE` |
| `cbm` | decimal | no | Volume in CBM |
| `cbm_decimals` | int | no | CBM decimal places |
| `wm_ratio` | int | no | Weight/measurement ratio (default: 1000) |
| `marks_numbers` | string | no | Marks & numbers |
| **Goods Description** | | | |
| `description_of_goods` | string | no | Description of goods |
| `liner_bl_description` | string | no | Description for liner BL |
| `description_prefix` | string | no | Description prefix |
| `print_to_bl_text` | string | no | Clause printed on BL |
| `print_to_bl` | bool | no | Print clause to BL |
| `attach_sheet` | string | no | `NO` or `YES` |
| `sap_description` | string | no | SAP description |
| **Routing** | | | |
| `delivery_type` | string | no | `CY/CY`, `CY/CFS`, `CFS/CY`, `CFS/CFS`, `DOOR/DOOR` |
| `incoterm` | string | no | Incoterm (EXW, FOB, CIF, etc.) |
| `country_of_origin` | string | no | Country of origin |
| `transit_time` | int | no | Transit time in days |
| `place_of_receipt` | string | no | Place of receipt |
| `port_of_loading` | string | no | Port of loading |
| `pol_code` | string | no | POL UN/LOCODE (e.g. `LKCMB`) |
| `port_of_discharge` | string | no | Port of discharge |
| `pod_code` | string | no | POD UN/LOCODE |
| `pod_eta` | date | no | POD ETA |
| `pod_ata` | date | no | POD ATA |
| `final_destination` | string | no | Final destination |
| `fd_code` | string | no | Final destination code |
| `fd_eta` | date | no | Final destination ETA |
| `place_of_delivery` | string | no | Place of delivery |
| `podel_code` | string | no | Place of delivery code |
| `podel_eta` | date | no | Place of delivery ETA |
| **Issuance** | | | |
| `place_of_bl_issued` | string | no | Place of BL issued |
| `date_of_bl_issued` | date | no | Date of BL issued |
| `shipped_on_board_date` | date | no | Shipped on board date |
| `received_for_shipment` | string | no | `NO` or `YES` |
| `bl_term` | string | no | `NON-NEGO`, `NEGOTIABLE`, `SEAWAY`, `EXPRESS` |
| `no_of_original_bls` | string | no | `ZERO (0)`, `ONE (1)`, `TWO (2)`, `THREE (3)` |
| `permit_no` | string | no | Permit number |
| `surrendered` | bool | no | Surrendered flag |
| `hold_cargo` | bool | no | Hold cargo flag |
| `email_surrender_letter` | bool | no | Email surrender letter flag |
| `remarks` | string | no | Remarks |
| **Freight** | | | |
| `freight_term` | string | no | `PREPAID`, `COLLECT`, `PAYABLE AS ARRANGED` |
| `freight_term_text` | string | no | Freight term text |
| `freight_amount` | decimal | no | Freight amount |
| `freight_payable_at` | string | no | Freight payable at |
| `freight_term_details` | string | no | Freight term details |
| `origin_charges` | string | no | `PREPAID` or `COLLECT` |
| `destination_charges` | string | no | `PREPAID` or `COLLECT` |
| **Agent & Carrier** | | | |
| `pod_agent` | string | no | POD agent name |
| `pod_agent_contact` | string | no | POD agent contact person |
| `pod_agent_address` | string | no | POD agent address |
| `agent_for_carrier` | string | no | Agent for carrier |
| `detention_days` | string | no | Detention / demurrage clause |
| `bl_format` | string | no | `CLS_FMC`, `CLS_STD`, `CLS_NEUTRAL` |
| `print_agent_for_carrier` | bool | no | Print flag |
| `display_on_carrier_draft` | bool | no | Print flag |
| `display_tariff_charges` | bool | no | Print flag |
| `display_additional_text` | bool | no | Print flag |
| `draft_confirmed` | bool | no | Draft confirmed flag |
| **Child arrays** | | | |
| `containers` | array | no | Container line items (see below) |
| `charges` | array | no | Manifest charge line items (see below) |

**Container line item:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `container_no` | string | yes | Container number (ISO 6346, 11 chars) |
| `size` | string | yes | `20`, `40`, `45` |
| `type` | string | yes | `GP`, `HC`, `RF`, `OT`, `FR`, `TK` |
| `shipment_type` | string | yes | `FCL/FCL`, `FCL/LCL`, `LCL/LCL`, `LCL/FCL` |
| `seal_no` | string | yes | Seal number |
| `packages` | decimal | yes | Number of packages |
| `package_type` | string | yes | Package type |
| `gross_weight` | decimal | yes | Gross weight |
| `cbm` | decimal | yes | Volume in CBM |

**Manifest charge line item:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `description` | string | yes | Charge description |
| `rate_type` | string | yes | `BL`, `CNTR`, `TON`, `CBM`, `W/M`, `PKG`, `LUMPSUM` |
| `quantity` | decimal | yes | Quantity |
| `currency` | string | yes | ISO 4217 currency code (3 chars) |
| `exchange_rate` | decimal | yes | Exchange rate |
| `prepaid_rate` | decimal | no | Prepaid rate (mutually exclusive with collect_rate) |
| `prepaid_total` | decimal | no | Computed: `quantity * prepaid_rate` |
| `collect_rate` | decimal | no | Collect rate |
| `collect_total` | decimal | no | Computed: `quantity * collect_rate` |

**Response** `201`

```json
{
  "hbl_id": 1,
  "bkg_id": 5,
  "mbl_id": 1,
  "status": "draft",
  "house_bl_no": "CLSSENGP26090033-01",
  "bl_type": "OWN",
  "shipper_name": "NDC EXPORTS (PVT) LTD",
  "consignee_name": "EIE IMPORT GMBH",
  "port_of_loading": "COLOMBO,SRI LANKA",
  "port_of_discharge": "LONDON GATEWAY, UNITED KINGDOM",
  "containers": [ /* ... */ ],
  "charges": [ /* ... */ ],
  "created_at": "2026-09-14T10:00:00"
}
```

**Side effects:**
- Set `job_bookings.house_bl_created = true` for the referenced `bkg_id`.

**Cross-field validation rules (from bl_field_spec.json):**
- `count(containers) = no_of_containers`
- `sum(containers.packages) = total_packages`
- `sum(containers.gross_weight) = gross_weight`
- `sum(containers.cbm) = cbm`
- `net_weight <= gross_weight`
- `bl_term = NEGOTIABLE` implies `no_of_original_bls >= 1`
- `surrendered = true` implies `no_of_original_bls = ZERO (0)`
- `date_of_bl_issued >= shipped_on_board_date`
- `pod_eta > shipped_on_board_date`
- `pol_code != pod_code`
- `freight_term = COLLECT` implies `freight_payable_at` is present
- Charge line: `prepaid_rate` and `collect_rate` are mutually exclusive
- `draft_confirmed = true` implies zero validation errors

---

### 5. `GET /documentation/house-bl/{hbl_id}`

Fetch a House BL record with all container lines and charge lines.

**Category:** HBL — P0
**Auth:** Required

**Response** `200` — Same structure as POST response.

**Error** `404` — House BL not found.

---

### 6. `PATCH /documentation/house-bl/{hbl_id}`

Update a House BL record. Only include fields that need updating.

**Category:** HBL — P0
**Auth:** Required

**Request Body** — All fields optional, same as POST body.

If `containers` array is provided, replace all existing container lines (delete old, insert new).
If `charges` array is provided, replace all existing charge lines (delete old, insert new).

**Response** `200` — Returns the updated HBL record.

**Error** `404` — House BL not found.
**Error** `409` — Cannot modify a confirmed BL (`draft_confirmed = true`). Require explicit `draft_confirmed = false` to unlock.

---

### 7. `PATCH /documentation/job-creation/bookings/{bkg_id}/status`

Update workflow status flags on a job booking. Used by the frontend for all the status-toggle operations (SI requested, draft BL sent, BL approval, etc.).

**Category:** Workflow Status — P1
**Auth:** Required
**Frontend handlers:** `markSiRequested()`, `markSiSubmitted()`, `markDraftBlSent()`, `markLinerBlGenerated()`, `markPreAdviceSent()`, `setBlStatus()` in `App.tsx`

**Path Parameters**

| Param | Type | Description |
|-------|------|-------------|
| `bkg_id` | int | Job booking ID |

**Request Body** — All fields optional, only include what changed:

| Field | Type | Description |
|-------|------|-------------|
| `si_requested` | bool | SI has been requested from customer |
| `si_submitted` | bool | SI has been submitted to liner |
| `draft_bl_sent` | bool | Draft BL has been sent |
| `liner_bl_generated` | bool | Liner BL instruction / SI document generated |
| `pre_advice_sent` | bool | Pre-advice sent to door agent |
| `bl_approval_status` | string | `pending`, `approved`, or `changes_requested` |
| `master_bl_recorded` | bool | Master BL has been recorded |
| `house_bl_created` | bool | House BL has been created |
| `job_reference_number` | string | Job reference number |

**Response** `200`

```json
{
  "bkg_id": 5,
  "si_requested": true,
  "si_submitted": false,
  "draft_bl_sent": false,
  "liner_bl_generated": false,
  "pre_advice_sent": false,
  "bl_approval_status": "pending",
  "master_bl_recorded": false,
  "house_bl_created": false,
  "job_reference_number": null
}
```

**Implementation:**
- This is a thin wrapper around `PATCH /documentation/job-creation/bookings/{bkg_id}` that only touches the status columns.
- Alternatively, these columns can be added to the existing `PATCH .../bookings/{bkg_id}` endpoint — the frontend can just include them in the payload. In that case, this endpoint is not needed as a separate route.

**Error** `404` — Booking not found.

---

### 8. `POST /documentation/generate-si`

Generate a Shipping Instruction / Liner BL Instruction document. Used when CLS (as NVOCC) needs to send SI to the shipping line (e.g. ECU Worldwide, Consolidators International, Sea Consortium).

**Category:** SI Generation — P1
**Auth:** Required
**Frontend handler:** Generate SI form in `Workspace.tsx`

**Request Body**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `bkg_id` | int | yes | Job booking ID |
| `shipper_name` | string | yes | Shipper name (freight forwarder = CLS) |
| `consignee_name` | string | yes | Consignee name (destination agent) |
| `recipient_email` | string | yes | Email address to send SI to (liner's doc team) |
| `booking_ref` | string | no | Carrier booking reference |
| `vessel_name` | string | no | Vessel name |
| `voyage_number` | string | no | Voyage number |
| `port_of_loading` | string | no | POL |
| `port_of_discharge` | string | no | POD |
| `bl_type` | string | no | `OWN`, `CO-LOAD`, `MASTER ONLY` |
| `containers` | array | no | Container details (container_no, type, seal, weight) |
| `description_of_goods` | string | no | Goods description for SI |

**Response** `200`

```json
{
  "success": true,
  "message": "SI generated and sent to docs@ecu-worldwide.com",
  "si_document_url": "/documents/si/SI-2026-0001.pdf"
}
```

**Side effects:**
- Set `job_bookings.liner_bl_generated = true` for the referenced `bkg_id`.
- Send email via Resend with the generated SI as PDF attachment.
- Log activity: `"Liner BL Instruction generated (NVOCC) for {customer}"`

**Error** `400` — Missing required fields.
**Error** `502` — Email provider failure.

---

### 9. `POST /documentation/send-pre-advice`

Send a pre-advice notification to the door agent for door-to-door / port-to-door deliveries.

**Category:** Pre-Advice — P1
**Auth:** Required
**Frontend handler:** Send Pre-Advice form in `Workspace.tsx`

**Request Body**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `bkg_id` | int | yes | Job booking ID |
| `recipient_email` | string | yes | Door agent email address |
| `door_agent_name` | string | no | Door agent company name |
| `door_agent_contact` | string | no | Door agent contact person |
| `bl_number` | string | no | BL number for reference |
| `container_details` | string | no | Container number, type, and quantity |
| `eta_destination` | string | no | ETA at destination |
| `delivery_address` | string | no | Final delivery address |
| `consignee_name` | string | no | Consignee name |
| `special_instructions` | string | no | Special delivery instructions |

**Response** `200`

```json
{
  "success": true,
  "message": "Pre-advice sent to agent@doordelivery.com"
}
```

**Side effects:**
- Set `job_bookings.pre_advice_sent = true` for the referenced `bkg_id`.
- Send email via Resend.

**Error** `400` — Missing required fields.
**Error** `502` — Email provider failure.

---

### 10. `GET /documentation/house-bl/by-booking/{bkg_id}`

Fetch all House BLs linked to a specific job booking. A single booking can have multiple HBLs (e.g. consol shipments).

**Category:** HBL Lookup — P2
**Auth:** Required

**Response** `200`

```json
[
  {
    "hbl_id": 1,
    "bkg_id": 5,
    "mbl_id": 1,
    "status": "draft",
    "house_bl_no": "CLSSENGP26090033-01",
    "shipper_name": "NDC EXPORTS (PVT) LTD",
    "consignee_name": "EIE IMPORT GMBH",
    "bl_type": "OWN",
    "created_at": "2026-09-14T10:00:00"
  }
]
```

Returns an empty array `[]` if no HBLs exist for this booking.

---

### 11. `GET /documentation/master-bl/by-booking/{bkg_id}`

Fetch the Master BL linked to a specific job booking. Typically one MBL per booking.

**Category:** MBL Lookup — P2
**Auth:** Required

**Response** `200` — Returns MBL record (same structure as `GET /documentation/master-bl/{mbl_id}`) or `null` if none exists.

---

## Error Response Format

Follow the same conventions as the main API:

```json
// 400 Bad Request
{ "detail": "No fields provided for update" }

// 404 Not Found
{ "detail": "House BL not found" }

// 409 Conflict — cannot modify confirmed BL
{
  "detail": {
    "error": "bl_confirmed",
    "message": "Cannot modify a confirmed House BL. Set draft_confirmed=false to unlock."
  }
}

// 422 Constraint Violation
{
  "detail": {
    "error": "constraint_violation",
    "constraint": "house_bl_bkg_id_fkey",
    "message": "insert or update on table \"house_bl\" violates foreign key constraint"
  }
}

// 422 Validation
{
  "detail": {
    "error": "validation_failed",
    "rules_violated": [
      "sum(containers.gross_weight) != gross_weight",
      "surrendered = true but no_of_original_bls != ZERO (0)"
    ]
  }
}
```

---

## Router Registration

```python
# In main.py or app.py, add alongside existing documentation routes:

from modules.documentation.master_bl import router as master_bl_router
from modules.documentation.house_bl import router as house_bl_router
from modules.documentation.si_generation import router as si_router
from modules.documentation.pre_advice import router as pre_advice_router

app.include_router(master_bl_router, prefix="/documentation/master-bl", tags=["Documentation - MBL"])
app.include_router(house_bl_router, prefix="/documentation/house-bl", tags=["Documentation - HBL"])
app.include_router(si_router, prefix="/documentation", tags=["Documentation - SI"])
app.include_router(pre_advice_router, prefix="/documentation", tags=["Documentation - Pre-Advice"])
```

---

## Implementation Order

| Step | What | Dependencies |
|------|------|-------------|
| 1 | Run DDL migrations (create tables, alter job_bookings) | None |
| 2 | `PATCH .../bookings/{bkg_id}/status` — workflow flags | DDL done |
| 3 | `POST` + `GET` + `PATCH` Master BL (endpoints 1–3) | DDL done |
| 4 | `POST` + `GET` + `PATCH` House BL (endpoints 4–6) | DDL done, MBL optional |
| 5 | `POST /documentation/generate-si` | Resend API key configured |
| 6 | `POST /documentation/send-pre-advice` | Resend API key configured |
| 7 | Lookup endpoints (10–11) | MBL + HBL tables exist |
