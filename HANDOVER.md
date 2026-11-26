# CL Synergy - Developer Handover Document

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Business Context & Domain](#2-business-context--domain)
3. [Architecture Overview](#3-architecture-overview)
4. [Technology Stack](#4-technology-stack)
5. [Codebase Structure](#5-codebase-structure)
6. [Core Business Logic](#6-core-business-logic)
7. [Data Model & Type System](#7-data-model--type-system)
8. [Role-Based Access Control (RBAC)](#8-role-based-access-control-rbac)
9. [Workspace - The Central Hub](#9-workspace---the-central-hub)
10. [API Layer & Backend Integration](#10-api-layer--backend-integration)
11. [State Management](#11-state-management)
12. [Key UI Components](#12-key-ui-components)
13. [Deployment & Infrastructure](#13-deployment--infrastructure)
14. [Known Gaps & Technical Debt](#14-known-gaps--technical-debt)
15. [Getting Started](#15-getting-started)

---

## 1. Project Overview

**Product Name:** CL Synergy
**Domain:** Freight Forwarding / Logistics
**Purpose:** Replaces fragmented inquiry handling (WhatsApp, Email, Phone) with a unified platform that manages the full freight lifecycle: Inquiry -> Quotation -> Booking -> Shipment -> Delivery.

**Current Phase:** Phase 1 (MVP). The frontend is production-ready with full backend API integration. The backend (FastAPI) is a separate repository and runs at `72.60.199.165:8002` in the deployed environment.

**Primary Users:**
- **Customer Service (CS):** Handles incoming inquiries, KYC initiation, rate checks, quotation preparation/sending, booking requests, release orders, and post-booking SI/BL workflows.
- **Sales Executives:** Similar to CS for inquiry-through-quotation, but focused on customer relationship and deal closure.
- **Procurement:** Sources rates from carriers/INTTRA, reviews booking requests, confirms liner bookings, issues release orders.
- **Finance:** KYC verification/approval, quote margin approvals, customer flag management (blacklist, credit hold, tier changes).
- **Admin:** Full access to all workflows across all roles.

---

## 2. Business Context & Domain

### What is Freight Forwarding?

CL Synergy manages the process of arranging ocean freight shipments on behalf of clients. The core business flow:

1. **Inquiry Received:** A client asks for a shipping quote (e.g., "I need 2x 40HC containers from Colombo to Hamburg").
2. **KYC Check:** New clients must complete Know Your Customer onboarding before proceeding.
3. **Rate Sourcing:** CS/Sales checks internal rate databases (tariff, FAK, contracted, spot, NAC, special) or escalates to Procurement to source rates from carriers via INTTRA.
4. **Quotation:** A multi-option quotation is prepared showing different carrier/rate combinations with margin applied, then sent to the client.
5. **Customer Response:** Client accepts one option or the quote is marked as lost.
6. **Booking Request:** CS creates a booking request against the accepted quotation option.
7. **Procurement Fulfillment:** Procurement reviews the booking, negotiates with the liner, confirms the booking, and issues a Release Order (authorization to pick up empty containers).
8. **Post-Booking (SI/BL):** Shipping Instructions are collected, Bills of Lading are drafted, and cargo documentation is finalized.

### Key Domain Terms

| Term | Meaning |
|------|---------|
| **SBU** | Strategic Business Unit: Ocean Imports, Ocean Exports, Air Freight, Domestic |
| **FCL / LCL** | Full Container Load / Less than Container Load |
| **SI** | Shipping Instructions - documentation required by the carrier |
| **BL / HBL / MBL** | Bill of Lading / House BL / Master BL - cargo ownership documents |
| **INTTRA** | Industry platform for ocean schedule search and electronic booking |
| **SCAC** | Standard Carrier Alpha Code - 4-letter carrier identifier |
| **UN/LOCODE** | UN code for port identification (e.g., LKCMB = Colombo) |
| **RA Number** | Rate Agreement number assigned by the liner |
| **Release Order** | Authorization from Procurement allowing container pickup |
| **FAK Rate** | Freight All Kinds - a rate that applies regardless of commodity |
| **NAC Rate** | Named Account Contract - special rates for specific clients |
| **Spot Rate** | One-off rate valid for a very short window (minutes to hours) |
| **VGM** | Verified Gross Mass - mandatory container weight declaration |
| **Incoterm** | International commerce term (FOB, CIF, EXW, DDP, etc.) |
| **HS Code** | Harmonized System code for commodity classification |

---

## 3. Architecture Overview

```
                     +-------------------+
                     |   Nginx (Docker)  |
                     |   Port 80 / 6002  |
                     +--------+----------+
                              |
              +---------------+---------------+
              |                               |
     /api/* proxy to               Static SPA files
     72.60.199.165:8002           (Vite-built React)
              |
     +--------v----------+
     |  FastAPI Backend   |      <-- Separate repository
     |  (Python)          |
     |  Port 8002         |
     +--------------------+
              |
     +--------v----------+
     |  PostgreSQL DB     |
     +--------------------+
```

**Key architectural decisions:**
- **Frontend-only repository:** This repo contains only the React SPA. The backend is a separate FastAPI service.
- **Optimistic UI pattern:** State is updated in React immediately, then the API call runs in the background. If the API fails, the optimistic item is removed and an error toast is shown.
- **No client-side router:** Navigation is managed via a `currentPage` state variable in `App.tsx`, not React Router. Page switches are instant state changes.
- **No global state library:** All state lives in `App.tsx` via `useState` hooks and is passed down as props. The `RoleContext` is the only React Context in use.

---

## 4. Technology Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| UI Framework | React | 19.2.5 |
| Language | TypeScript | 6.0.2 (strict mode) |
| Build Tool | Vite | 8.0.9 |
| Charts | Recharts | 3.8.1 |
| Icons | Lucide React | 1.8.0 |
| PDF Export | html2pdf.js | 0.14.0 |
| Styling | Custom CSS (dashboard.css, ~70KB) | - |
| Fonts | Figtree, FiraSans, Roboto | - |
| Container | Docker + Nginx | Alpine |
| CI/CD | GitHub Actions -> AWS ECR -> EC2 | - |

**No additional runtime dependencies** (no React Router, no Redux, no Axios, no Tailwind).

---

## 5. Codebase Structure

```
FrontEnd/dashinterface/src/
|
|-- App.tsx                          # Root component: state, routing, all handler functions (~1360 lines)
|-- types.ts                         # Every TypeScript type, enum, constant, helper (~1620 lines)
|-- api.ts                           # REST API client for all backend endpoints (~1800 lines)
|-- hooks.ts                         # usePersistentState (localStorage), resetPersistentDemo
|-- RoleContext.ts                   # React Context for role-based access
|-- useWebSocket.ts                  # WebSocket connection handler
|-- mockData.ts                      # Demo seed data (used in earlier phases, now mostly dormant)
|
|-- components/
|   |-- layout/
|   |   |-- Sidebar.tsx              # Left nav - role-aware page list
|   |   |-- TopBar.tsx               # Header bar with employee name and role badge
|   |
|   |-- pages/
|   |   |-- Dashboard.tsx            # KPI cards, charts, activity summary
|   |   |-- ChatAssistant.tsx        # NLP-powered command center
|   |   |-- Workspace.tsx            # Central task hub - step-based workflow (~800 lines)
|   |   |-- NewInquiry.tsx           # Structured inquiry creation form
|   |   |-- InquiryList.tsx          # Inquiry table with inline editing
|   |   |-- Quotations.tsx           # Quote builder with margin checks
|   |   |-- RfqNew.tsx               # Bulk RFQ creation from Excel upload
|   |   |-- RecordRate.tsx           # Rate entry form for Procurement
|   |   |-- RateCheck.tsx            # Rate lookup + schedule search
|   |   |-- RateList.tsx             # Rate database browser (all 6 rate types)
|   |   |-- BookingList.tsx          # Booking management and status tracking
|   |   |-- Shipments.tsx            # Shipment tracking with leg progression
|   |   |-- TrackAndTrace.tsx        # Real-time INTTRA container tracking
|   |   |-- Schedules.tsx            # Ocean schedule search
|   |   |-- Followups.tsx            # Task and follow-up management
|   |   |-- Customers.tsx            # Customer master with flag management
|   |   |-- KYCForm.tsx              # KYC onboarding form
|   |   |-- Login.tsx                # Employee login screen
|   |   |-- Profile.tsx              # User profile / logout
|   |
|   |-- pages/workspaceSteps/        # Workspace sub-components
|   |   |-- InlineStepForms.tsx      # Forms rendered inline within workspace cards
|   |   |-- ModalStepForms.tsx       # Modal dialogs for complex step actions
|   |   |-- VesselCreatedPrompt.tsx  # Post-vessel-creation confirmation
|   |   |-- useWorkspaceActions.ts   # Hook: maps workspace items to action handlers
|   |   |-- usePendingItems.ts       # Hook: computes pending work items per step
|   |   |-- types.ts                 # WorkspaceItem, StepDef, BL types
|   |   |-- constants.ts             # Step definitions per role (CS_STEPS, PROCUREMENT_STEPS, etc.)
|   |   |-- utils.ts                 # Release order draft generation
|   |   |-- index.ts                 # Barrel exports
|   |
|   |-- shared/
|       |-- KPICard.tsx              # Metric display card
|       |-- NLQBox.tsx               # Natural language query input
|       |-- WorkflowStepper.tsx      # Visual step indicator
|       |-- SearchCombobox.tsx       # Typeahead dropdown
|       |-- PortCombobox.tsx         # Port search with UN/LOCODE
|       |-- TagInput.tsx             # Multi-value chip input
|       |-- CustomerEditModal.tsx    # Customer detail editor
|       |-- RateRecord.tsx           # Read-only rate display
```

---

## 6. Core Business Logic

### 6.1 Inquiry Lifecycle

An inquiry progresses through these **workflow stages** (defined in `types.ts:166-174`):

```
rate-check -> procurement-request (skippable) -> quotation-prep -> quotation-sent -> customer-response -> booking-request -> completed
```

**Three inquiry creation paths** (see `api.ts:180-430`):
1. **New Client + New Contact** (`POST /inquiries/inquiries-new-new`): Creates client, contact person, and inquiry in one call.
2. **Existing Client + New Contact** (`POST /inquiries/inquiries-old-new`): Uses `cli_id`, creates a new contact.
3. **Existing Client + Existing Contact** (`POST /inquiries/inquiries-old-old`): Uses both `cli_id` and `cp_id`.

**Inquiry creation routing logic** (see `App.tsx:997-1025`):
```
if (cli_id && cpid)   -> Case 3: apiCreateInquiryOldOld
else if (cli_id)      -> Case 2: apiCreateInquiryOldNew
else                  -> Case 1: apiCreateInquiry
```

**Backend row mapping** (`App.tsx:90-147`): The backend returns flat rows (one per container in a commodity-container join). `mapInquiryRows()` groups these by `inq_id` into the frontend `Inquiry` shape with a `containers[]` array.

### 6.2 Rate Sourcing

Rates come from **6 database tables**, unified into `UnifiedRate[]` by `apiFetchAllRates()` in `api.ts:866-889`:

| Rate Table | Frontend Type | Description |
|-----------|--------------|-------------|
| `tariff_rates` | Tariff Rate | Standard published rates from carriers |
| `fak_rates` | FAK | Freight-All-Kinds rates (commodity-agnostic) |
| `contracted_rates` | Contracted | Long-term contract rates |
| `vessel_by_vessel_rate` | Spot | Per-sailing rates with very short validity |
| `nac` | NAC | Named Account Contracts for specific clients |
| `special_rate` | Special | Custom/negotiated special rates |

**Rate request workflow:**
1. CS/Sales creates a rate request (`POST /rate-requests`) with selected ocean schedules.
2. If CS/Sales can handle it (rates already in DB), they mark `is_given=true`.
3. If escalated to Procurement, the request shows in Procurement's workspace.
4. Procurement adds rate options (`POST /rate-requests/{id}/options`) from the aggregate schedule+rates view.
5. Backend auto-advances workflow to `quotation_prep`.

### 6.3 Quotation Flow

Quotations go through these statuses: `Draft -> Awaiting Approval -> Approved -> Sent -> Confirmed | Lost`

**Key logic in `App.tsx:531-578`:**
- Margin check: If `margin_pct < customer.min_margin_pct`, status auto-sets to `Awaiting Approval` with the reason stored in `approval_reason`.
- Customer tier determines the margin floor: Key Account has the lowest floor, Walk-in the highest.
- Sending a quote advances the linked inquiry to `quotation-sent`.

**Backend quotation system** (`api.ts:1291-1515`):
- Quotation records are created separately from the legacy frontend Quote objects.
- Options are stored as individual rows linked to rate requests.
- PDF documents can be uploaded to S3 via `apiUploadQuotationDocument()`.
- Quote sending triggers `apiMarkQuotationSent()`, which auto-advances workflow.

### 6.4 Booking Flow

Booking statuses: `Pending Liner -> RA Assigned -> Liner Confirmed -> Released | Cancelled`

**Backend status mapping** (`types.ts:958-972`):
```
FE 'Pending Liner'    <-> BE 'request_initiated'
FE 'RA Assigned'      <-> BE 'request_reviewed'
FE 'Liner Confirmed'  <-> BE 'request_booking_success'
FE 'Released'         <-> BE 'release_order_received'
```

**Post-booking process (CS steps 9-10+):**
1. Record cut-off dates (SI, BL, VGM, Filing)
2. Send cut-off reminders to shippers
3. Collect and record Shipping Instructions
4. Generate SI / Liner BL instructions (for NVOCC lines)
5. (Future) Create House BL, Master BL, pre-advice/pre-alert

### 6.5 KYC (Know Your Customer)

KYC stages: `not_started -> pending_customer -> approved`

- New clients auto-get `kyc_status: 'not_started'` on inquiry creation.
- CS sends KYC form to client via email (`apiSendKyc()`).
- Finance reviews and approves KYC (`apiUpdateKycStage()`).
- KYC completion auto-advances any pending inquiries for that client past the KYC gate.

### 6.6 Chat / Command Center

The `ChatAssistant.tsx` component provides a **natural language command interface**. Intent detection (`types.ts:1352-1539`) parses free-text messages into structured actions:

| Intent | Example | Action |
|--------|---------|--------|
| `inquiry` | "Customer ABC needs 2x40HC from Colombo to Hamburg" | Creates inquiry |
| `followup` | "Spoke to Hayleys, waiting for documents" | Logs follow-up |
| `task` | "Remind me to call MAS by Friday" | Creates task |
| `complete` | "Mark Hayleys as done" | Completes inquiry |
| `reopen` | "Hayleys didn't actually confirm, mark as pending" | Reopens inquiry |
| `customer-flag` | "Blacklist ABC Trading" | Sets customer flag |
| `customer-add` | "Add new customer Lanka Exports, Regular tier, in Negombo" | Creates customer |
| `quote` | "Quote Hayleys" | Opens quote builder |

The parser uses regex-based pattern matching with fuzzy customer name matching (`findCustomerInText`, `findCustomerCandidates`) that handles business name normalization (strips "Pvt", "Ltd", "Inc", etc.).

---

## 7. Data Model & Type System

All types are centralized in `types.ts`. Key entities:

### Inquiry (`types.ts:300-341`)
Core entity. Contains origin/destination, delivery type, SBU, priority, commodity info, container lines, workflow stage, and backend IDs (`inq_id`, `cli_id`, `cpid`).

### ContainerLine (`types.ts:267-285`)
Represents a single container within an inquiry. Maps 1:1 with both a backend `CommodityNew` and `ContainerNew` row. Contains: container type, quantity, weight, commodity details, destination, FCL flag, door agents, free time, temperature (reefer).

### Customer (`types.ts:356-372`)
Master customer record with tier (Key Account / Regular / Walk-in), payment terms, blacklist/credit-hold flags, min margin percentage, KYC status.

### Booking (`types.ts:974-1042`)
Extensive type (~70 fields) covering the full booking lifecycle including SI cutoffs, BL statuses, master/house BL numbers, release order details, and all backend IDs.

### OceanSchedule (`types.ts:505-542`)
INTTRA schedule data with vessel details, port information, cutoff dates, and transit times. Uses camelCase (frontend convention) while the API returns snake_case.

### Rate Types
Six distinct rate table interfaces (`TariffRaw`, `NacRaw`, `ContractedRaw`, `VesselRaw`, `FakRaw`, `SpecialRaw` in `api.ts:828-833`) unified into `UnifiedRate` (`types.ts:677-700`).

---

## 8. Role-Based Access Control (RBAC)

### Role Definitions (`types.ts:43-77`)

Five roles with distinct page access, action permissions, and quick commands:

| Role | Employee IDs | Page Access | Key Actions |
|------|-------------|-------------|-------------|
| **CS** | 7 (cs-test) | Full inquiry-to-booking flow | Create inquiries, send KYC, send quotes, create bookings, release bookings |
| **Sales** | 8 (sales-test) | Inquiry through quotation | Create inquiries, create/send/confirm quotes |
| **Finance** | 6 (fin-test) | Customers, KYC | Approve quotes, verify KYC, manage customer flags/tiers |
| **Procurement** | 5 (procu-test) | Rates, bookings | Confirm bookings, manage rate requests |
| **Admin** | 9 (IT-AD) | All pages | All actions |

### Permission System (`types.ts:79-143`)

Actions are typed as `ActionId` strings (e.g., `'inquiry:create'`, `'quote:approve'`, `'booking:confirm'`). The `ROLE_ACTIONS` map defines which actions each role can perform. Components check permissions via:

```typescript
const { hasPermission } = useRole()
if (hasPermission('booking:create')) { /* show button */ }
```

### Implementation Note

Currently `canAccessPage` returns `true` for all roles (`App.tsx:333`) - this is a test override. The proper implementation should use `ROLE_PAGE_ACCESS` from `types.ts:63-69`.

---

## 9. Workspace - The Central Hub

The Workspace (`Workspace.tsx`) is the most complex component and the primary interface for all roles. It presents a **step-based workflow** where each role sees different steps relevant to their responsibilities.

### Step Architecture

Steps are defined per role in `constants.ts`:

**CS Steps (10+):** Inquiry -> KYC -> Rates -> Prepare Quotation -> Send Quote -> Response -> Booking Request -> Release Order -> Cut Offs -> SI Reminders / Record SI / Generate SI

**Procurement Steps (4):** Rate Check -> Booking Request Review -> Booking Confirmation -> Release Order

**Sales Steps (7):** Inquiry -> KYC -> Rates -> Prepare Quotation -> Send Quote -> Response -> Booking

**Finance Steps (1):** KYC Review

**Admin Steps (17+):** Superset of all role steps

### How Steps Work

1. Each `StepDef` has a `key`, `label`, `stepNumber`, and `actionKinds[]`.
2. `usePendingItems.ts` computes which inquiries/bookings are pending for each step by matching `actionKind` against the item's current state.
3. The workspace sidebar shows step numbers with pending item counts.
4. Clicking a step filters the main panel to show only relevant items.
5. Each item renders either an `InlineStepForm` (simple actions) or a `ModalStepForm` (complex multi-field actions).

### Step-to-Data Mapping

| ActionKind | Data Source | Condition |
|-----------|------------|-----------|
| `advance-workflow` | Inquiries at `rate-check` stage | Workflow needs advancing |
| `send-kyc` | Inquiries where `kycIncomplete=true` | KYC not yet sent |
| `check-rates` | Inquiries at `rate-check` stage | Rates need checking |
| `prepare-quotation` | Completed rate requests | Rates sourced, quote needed |
| `send-to-customer` | Unsent quotations | Quote prepared, needs sending |
| `customer-response` | Sent quotations | Waiting for client decision |
| `booking-request` | Accepted quotations | Client accepted, booking needed |
| `confirm-liner-booking` | Bookings at `Pending Liner` | Procurement needs to confirm |
| `attach-release-order` | Bookings at `Liner Confirmed` | RO needed |
| `release-booking` | Bookings with RO attached | CS needs to release |
| `record-cutoff` | Released bookings without cutoff dates | Cutoffs need recording |
| `request-si` | Bookings with cutoffs approaching | SI reminders needed |

---

## 10. API Layer & Backend Integration

### API Client Architecture (`api.ts`)

The API layer provides typed wrapper functions around `fetch()`. Key patterns:

**Base helpers** (`api.ts:24-78`):
- `get<T>(path)` / `post<T>(path, body)` / `patch<T>(path, body)` / `del<T>(path)` / `postFile<T>(path, file)`
- Base URL from `VITE_API_BASE` env var, falls back to `/api` (Nginx proxy in Docker).
- POST errors extract FastAPI validation detail for better error messages.

**Authentication** (`api.ts:85-87`):
- `apiSwitchUser(empId)` - `POST /auth/switch-user/{empId}` - sets the backend session.
- No JWT/OAuth - simple employee ID switching (MVP simplification).

### Critical API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/auth/switch-user/{empId}` | POST | Set active user session |
| `/inquiries/inquiries-new-new` | POST | Create inquiry (new client + new contact) |
| `/inquiries/inquiries-old-new` | POST | Create inquiry (existing client + new contact) |
| `/inquiries/inquiries-old-old` | POST | Create inquiry (existing client + existing contact) |
| `/inquiries/inquiries` | GET | Fetch all inquiries for current user |
| `/inquiries/workflow` | POST | Create workflow entry |
| `/inquiries/workflow/{inqId}` | PATCH | Advance workflow stage |
| `/inquiries/schedules` | GET | Search INTTRA ocean schedules |
| `/inquiries/schedules/aggregate-rates` | GET | Schedules with matched rate data |
| `/inquiries/rfq` | POST | Bulk RFQ creation |
| `/rate-requests` | POST | Create rate request |
| `/rate-requests/{id}/options` | POST | Add rate option (auto-advances workflow) |
| `/rate-requests/completed-for-quoting` | GET | Rate requests ready for quotation |
| `/quotations/` | POST | Create quotation record |
| `/quotations/{id}/send` | PATCH | Mark quotation as sent |
| `/quotations/{id}/response` | PATCH | Record customer acceptance/rejection |
| `/quotations/{id}/document` | POST | Upload quotation PDF to S3 |
| `/booking-requests` | POST | Create booking request |
| `/booking-requests/{id}/review` | PATCH | Procurement reviews booking |
| `/booking-requests/{id}/confirm` | PATCH | Confirm with liner |
| `/booking-requests/release-orders` | POST | Create release order |
| `/tracking/events` | GET | INTTRA container tracking |
| `/kyc/kyc-requests` | POST | Create KYC request |
| `/clients/clients` | GET | Fetch all clients |
| `/rates/{type}-rates` | GET/POST/PATCH | CRUD for 6 rate tables |
| `/liners` | GET | Liner master data |
| `/ports` | GET | Port master data |

### Workflow Auto-Advancement

The backend automatically advances the workflow stage as a side-effect of certain API calls:
- Creating a rate request -> `rate_check_in_progress`
- Adding a rate option -> `quotation_prep`
- Sending a quotation -> `quotation_sent`
- Recording customer response -> `customer_response`
- Creating a booking request -> `booking_request`
- Confirming a booking -> `completed`

The frontend's `advanceWorkflow()` function (`App.tsx:370-393`) accepts a `skipApi` flag to avoid redundant PATCH calls when the backend has already auto-advanced.

### Backend-Frontend Field Mapping Discrepancies

Important naming differences between frontend and backend (`api.ts:810-825`):

| Frontend Field | Backend Column | Notes |
|---------------|---------------|-------|
| `service_scope` | `iwe` | Import/Within/Export |
| `is_sold` | `issold` / `isSold` | Inconsistent casing in backend |
| `remark` | `note` | Different naming convention |
| `departure_date` | `etd` | Vessel rates only |
| `delivery_type` (kebab) | `service_mode` (SCREAMING_SNAKE) | e.g., `door-to-door` -> `DOOR_TO_DOOR` |
| `priority` (Title Case) | `priority` (UPPER) | e.g., `High` -> `HIGH` |

---

## 11. State Management

### State Architecture

All application state lives in `App.tsx` via `useState` hooks:

```typescript
const [inquiries, setInquiries] = useState<Inquiry[]>([])
const [tasks, setTasks] = useState<Task[]>([])
const [followups, setFollowups] = useState<Followup[]>([])
const [customers, setCustomers] = useState<Customer[]>([])
const [quotes, setQuotes] = useState<Quote[]>([])
const [shipments, setShipments] = useState<Shipment[]>([])
const [bookings, setBookings] = useState<Booking[]>([])
const [vesselSchedules, setVesselSchedules] = useState<VesselSchedule[]>([])
const [activityLog, setActivityLog] = useState<ActivityEntry[]>([])
const [clientList, setClientList] = useState<ClientRecord[]>([])
const [kycPendingClients, setKycPendingClients] = useState<KycPendingClient[]>([])
const [kycRequests, setKycRequests] = useState<KycRequestRecord[]>([])
```

### Initialization Flow

1. On app mount, check `sessionStorage` for `loggedInEmployeeId`.
2. If logged in: call `apiSwitchUser(empId)` then `loadAppData()`.
3. `loadAppData()` fetches in parallel:
   - `apiGetClientsDb()` + `apiGetLiners()` -> then `apiGetBookingRequests()` + `apiFetchPendingReleaseOrders()`
   - `apiGetKycPendingClients()`
   - `apiGetKycRequests()`
   - `apiFetchAllInquiries()` -> mapped via `mapInquiryRows()`
4. `initState` transitions from `'loading'` to `'ready'`.

### Optimistic Update Pattern

Every mutation follows the same pattern (example from `addInquiry`, `App.tsx:970-1073`):

```
1. Create a temp item with UUID (e.g., `INQ-${uuid()}`)
2. Prepend to state array immediately (user sees instant feedback)
3. Fire API call in background
4. On success: replace temp item with backend response (swaps temp UUID for real `inq_id`)
5. On failure: remove temp item from state, show error toast
```

### Data Refresh

`refreshData()` (`App.tsx:429-444`) re-fetches inquiries and bookings from the backend. Called after navigation events that may have caused backend state changes (e.g., returning from rate-check to workspace).

---

## 12. Key UI Components

### Dashboard (`Dashboard.tsx`)
KPI cards showing inquiry counts, hit rates, revenue metrics. Uses Recharts for bar/line charts. Activity feed showing recent actions.

### NewInquiry (`NewInquiry.tsx`)
Multi-section form: client selection (typeahead against `clientList`), contact person (new or existing), route details (origin/destination with port combobox), container panel (add/remove container lines), and optional fields (incoterm, priority, preferred liners).

### RfqNew (`RfqNew.tsx`)
Excel upload for bulk RFQ creation. Previews parsed rows with port matching before submission. Uses `apiPreviewRfq()` for server-side validation and `apiCreateRfq()` for batch creation.

### Quotations (`Quotations.tsx`)
Two-phase workflow:
1. **Build phase:** Select rates/options from completed rate requests, set margin per option, preview final amounts.
2. **Send phase:** Generate quotation document (HTML -> PDF via html2pdf.js), upload to S3, send via email.

### RateCheck (`RateCheck.tsx`)
Dual-mode rate checking:
- **CS/Sales variant:** Searches internal rate database, selects schedules, creates rate requests with `is_given=true`.
- **Procurement variant:** Searches INTTRA schedules, views aggregate rates per schedule, selects options.

### BookingList (`BookingList.tsx`)
Filterable table of all bookings with status badges. Shows progression through booking statuses with action buttons appropriate to current status and user role.

### TrackAndTrace (`TrackAndTrace.tsx`)
Real-time container tracking via INTTRA. Search by booking reference, BL number, or container number. Displays tracking events in chronological order with location and status details.

### Shared Components
- **SearchCombobox / PortCombobox:** Typeahead dropdowns for entity selection. PortCombobox loads from `ports.json` (3.6MB, ~80K ports).
- **WorkflowStepper:** Visual step indicator showing inquiry progression through workflow stages.
- **TagInput:** Multi-value input for preferred liners, door agents, etc.
- **NLQBox:** Natural language query input used in the Command Center.

---

## 13. Deployment & Infrastructure

### Local Development

```bash
cd FrontEnd/dashinterface
npm install
npm run dev        # Vite dev server on http://localhost:5173
```

Environment variables (`.env.development`):
```
VITE_API_BASE=http://localhost:8000
VITE_WS_URL=ws://localhost:8000/ws
```

### Docker Build

**Production (`Dockerfile`):**
```
Stage 1: node:20-alpine -> npm ci -> npx vite build
Stage 2: nginx:alpine -> copy dist/ -> Nginx config with /api proxy to 72.60.199.165:8002
```

**Exposed port:** 80 (Nginx), mapped to 6002 in docker-compose.

### CI/CD Pipeline (`.github/workflows/deploy.yml`)

Trigger: Push to `master` branch.

1. Build Docker image with AWS ECR login
2. Tag with `latest` and git SHA
3. Push to ECR
4. SSM command to EC2 instance: `docker compose pull && docker compose up -d`

**Required GitHub Secrets:**
- `AWS_DEPLOY_ROLE_ARN` - IAM role ARN for OIDC auth
- `AWS_REGION`
- `ECR_REPOSITORY` / `ECR_REGISTRY`
- `EC2_INSTANCE_ID`

### Docker Compose (local/dev)

```yaml
services:
  freight-fe-beta:
    image: thaarushi/freight-fe-beta:development
    container_name: freight-fe-beta
    ports:
      - "6002:80"
    restart: unless-stopped
```

---

## 14. Known Gaps & Technical Debt

### Backend Integration Gaps

1. **Activity log:** `apiCreateActivity()` is a no-op (`api.ts:1530-1543`) - no backend endpoint exists yet. Activity state is frontend-only.
2. **Contact persons:** `apiGetContactPersons()` returns `[]` (`api.ts:1010-1012`) - bulk endpoint missing, would require N+1 calls per client.
3. **Quotation rejection:** Backend `QuotationAcceptence.status` only accepts `'accepted'` - rejection will 422 (`api.ts:1372-1376`).
4. **Inquiry deletion:** Works but was added after the initial backend spec.

### Frontend Technical Debt

1. **App.tsx is too large** (~1360 lines): All state and handler functions live here. Should be refactored into custom hooks or a proper state management solution.
2. **No React Router:** Page navigation via state means no URL-based deep linking, no browser back/forward support.
3. **CSS is monolithic:** `dashboard.css` is ~70KB of hand-written CSS. No CSS modules, no utility classes, no component-scoped styles.
4. **Role access bypass:** `canAccessPage` currently returns `true` for all roles (`App.tsx:333`). The proper `ROLE_PAGE_ACCESS` check is commented out.
5. **Employee IDs are hardcoded:** `EMPLOYEES` array in `types.ts:393-399` has fixed test accounts (IDs 5-9).
6. **No error boundaries:** React error boundaries are not implemented.
7. **No test suite:** No unit tests, integration tests, or E2E tests exist.
8. **WebSocket unused:** `useWebSocket.ts` exists but is not imported anywhere in the current codebase.

### Data Model Discrepancies

1. **Snake_case vs camelCase:** Backend returns snake_case, frontend types use camelCase. `mapSchedule()` in `api.ts` handles both, but other mappers are inconsistent.
2. **Backend field name typos:** `acceptence_deadline` (should be `acceptance`) persists because changing it requires backend migration.
3. **Duplicate Booking types:** Frontend has both `Booking` (rich type with ~70 fields) and `BackendBookingRecord` (API response shape). Mapping between them is manual in `mapBackendBooking()`.

### Planned But Not Implemented

1. **BL Processing Pipeline** (Steps 11-17): Vessel schedule confirmation, vessel booking creation, draft BL, HBL/MBL creation, pre-advice/pre-alert. Step definitions exist but are commented out in `constants.ts:33-40`.
2. **Air Freight / Domestic SBUs:** Type definitions exist but no specialized UI.
3. **WebSocket real-time updates:** Infrastructure is in place but not wired up.
4. **Quote approval workflow:** Finance approval step is defined but the full flow (SBU head approval for below-floor margins) is frontend-only.

---

## 15. Getting Started

### Prerequisites
- Node.js 20+
- npm 9+
- Backend API running (or use mock data for UI-only work)

### Quick Start

```bash
# Clone and install
cd FrontEnd/dashinterface
npm install

# Start dev server
npm run dev
# Open http://localhost:5173

# Build for production
npm run build
npm run preview    # Test production build locally
```

### Test Accounts

| Employee ID | Username | Role |
|------------|----------|------|
| 5 | procu-test | Procurement |
| 6 | fin-test | Finance |
| 7 | cs-test | Customer Service |
| 8 | sales-test | Sales Executive |
| 9 | IT-AD | Admin (All Access) |

Login with any of these at the login screen. The backend session is set via `POST /auth/switch-user/{empId}`.

### Key Files to Read First

1. **`types.ts`** - Understand all domain types, workflow stages, role definitions
2. **`api.ts`** - See all backend endpoints and their request/response shapes
3. **`App.tsx`** - Understand state management, initialization flow, handler functions
4. **`constants.ts`** (workspaceSteps) - See per-role step definitions
5. **`Workspace.tsx`** - Understand the central task hub and step navigation

### Common Development Tasks

**Adding a new page:**
1. Create component in `components/pages/`
2. Add `PageId` to `types.ts`
3. Add to `PAGE_LABELS`, `ROLE_PAGE_ACCESS` in `types.ts`
4. Add `case` to `renderPage()` in `App.tsx`
5. Add sidebar entry in `Sidebar.tsx`

**Adding a new API endpoint:**
1. Add typed function in `api.ts` using `get<T>()` / `post<T>()` helpers
2. Import and call from the relevant component or `App.tsx` handler

**Adding a new workspace step:**
1. Add `StepDef` to the relevant role's array in `constants.ts`
2. Add matching `actionKind` logic in `usePendingItems.ts`
3. Add form UI in `InlineStepForms.tsx` or `ModalStepForms.tsx`
4. Add handler in `useWorkspaceActions.ts`

**Modifying the workflow:**
1. Update `WorkflowStage` type and `WORKFLOW_STAGES` in `types.ts`
2. Update `STAGE_MAP` and `BE_STAGE_TO_FE` in `api.ts`
3. Update `advanceWorkflow()` in `App.tsx`

---

*Document generated: 2026-11-26*
*Codebase branch: phase-1-br*
*Last commit: 6f02d88 (fixed docker.dev)*
