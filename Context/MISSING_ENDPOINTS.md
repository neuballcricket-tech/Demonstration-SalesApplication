# Missing Backend Endpoints — API Documentation

**Date:** 2026-09-11
**Reference:** `D:\Neuball\FreightOS\API_DOCUMENTATION.md`
**Frontend:** `FrontEnd/dashinterface/src/api.ts`

---

## Gap Analysis

The main API documentation covers Flow 1 through Flow 3 thoroughly, and the backend implements **all** documented endpoints. However, the frontend (`api.ts`) calls **11 additional endpoints** that are **not documented and not implemented** in the backend. This document provides the specification for each so backend developers can build them.

### Legacy Endpoints (migrate frontend, do NOT build)

These endpoints are called by the frontend but have documented replacements already implemented:

| Frontend Endpoint | Replacement (already implemented) |
|---|---|
| `POST /customers` | `POST /clients/clients` |
| `PATCH /customers/{name}` | `PATCH /clients/clients/{cli_id}` |
| `POST /quotes` | `POST /quotations/` |
| `PATCH /quotes/{quoteId}/status` | `PATCH /quotations/{id}/send` or `/response` |

> **Action:** Migrate frontend to use the documented endpoints. Do not build these on the backend.

---

## Priority Summary

| Priority | Endpoint | Reason |
|----------|----------|--------|
| **P0** | `GET /dashboard/init` | Frontend cannot render without it |
| **P0** | `GET /employees` | Required for all assignment dropdowns |
| **P0** | `GET /ports` | Required for origin/destination selectors |
| **P0** | `GET /trade-lanes` | Required for rate creation forms |
| **P1** | `PATCH /rate-requests/{id}` | Procurement workflow broken without it |
| **P1** | `POST /tasks` | Task management non-functional |
| **P1** | `PATCH /tasks/{id}/complete` | Task management non-functional |
| **P1** | `POST /followups` | Followup tracking non-functional |
| **P2** | `POST /send-kyc` | Email sending (manual workaround exists) |
| **P2** | `POST /send-quotation` | Email sending (manual workaround exists) |
| **P3** | `POST /activity-log` | Audit trail (frontend works without it) |

---

## Endpoint Specifications

---

### 1. `GET /dashboard/init`

Bulk-load all entities for the frontend dashboard in a single request. Reduces N+1 round-trips on page load.

**Category:** Core Infrastructure — P0
**Auth:** Required (Bearer token)
**Frontend function:** `fetchDashboardInit()` — `api.ts:104`

**Response** `200`

```json
{
  "customers": [
    {
      "fe_id": "CUS-001",
      "name": "Acme Exports",
      "tier": "A",
      "payment_terms": "Net 30",
      "location": "Colombo",
      "blacklisted": false,
      "credit_hold": false,
      "kyc_status": "kyc_completed",
      "contact_person": "John Silva",
      "contact_email": "john@acme.com",
      "contact_phone": "+94771234567",
      "customer_type": "DIR",
      "assigned_salesperson_id": 8
    }
  ],
  "inquiries": [ /* InquiryRow[] — same shape as GET /inquiries/inquiries */ ],
  "tasks": [
    {
      "fe_id": "TSK-001",
      "customer_name": "Acme Exports",
      "task": "Follow up on pricing",
      "due_date": "2026-09-15",
      "completed": false,
      "employee_id": 8,
      "created_at": "2026-09-10T14:30:00"
    }
  ],
  "missing_items": [],
  "followups": [
    {
      "fe_id": "FLW-001",
      "customer_name": "Acme Exports",
      "note": "Discussed Q4 volumes",
      "completion_flag": false,
      "employee_id": 8,
      "created_at": "2026-09-10T14:30:00"
    }
  ],
  "quotes": [],
  "shipments": [],
  "employees": [
    { "id": 8, "name": "Sales User", "role": "sales" }
  ],
  "bookings": [ /* BookingRequestRow[] */ ],
  "activity_log": [
    {
      "actor_role": "sales",
      "actor_id": 8,
      "action": "created_inquiry",
      "ref_type": "inquiry",
      "ref_id": "1",
      "customer_name": "Acme Exports",
      "pushed_to": "rate-check",
      "notes": null,
      "created_at": "2026-09-10T14:00:00"
    }
  ]
}
```

**Implementation notes:**
- Filter all entities by the authenticated user's `emp_id` (from JWT).
- Run all queries in parallel (`asyncio.gather`) for performance.
- This replaces ~10 individual GET calls on initial page load.
- The `customers` array should be built by joining `client`, `kyc_request`, and `contact_person` tables.
- `inquiries` should return the same shape as `GET /inquiries/inquiries`.
- `bookings` should return the same shape as `GET /booking-requests/made`.

---

### 2. `GET /employees`

List all employee records from the `employee` table.

**Category:** Core Infrastructure — P0
**Auth:** Required
**Frontend function:** `apiGetEmployeesDb()` — `api.ts:1023`

**Response** `200`

```json
[
  {
    "emp_id": 8,
    "name": "Sales User",
    "desig": "Sales Executive",
    "dept": "sales",
    "mail_id": "sales@clsynergy.com"
  }
]
```

**SQL:**

```sql
SELECT emp_id, name, desig, dept, mail_id
FROM employee
ORDER BY name
```

**Router registration:** Register at the app level (e.g., `app.include_router(employee_router)`) or as a standalone route.

---

### 3. `GET /ports`

List all port records from the `port` table.

**Category:** Core Infrastructure — P0
**Auth:** Required
**Frontend function:** `apiGetPorts()` — `api.ts:1002`

**Response** `200`

```json
[
  {
    "port_id": 1,
    "port_code": "LKCMB",
    "port_name": "Colombo",
    "country": "Sri Lanka",
    "country_code": "LK"
  }
]
```

**SQL:**

```sql
SELECT port_id, port_code, port_name, country, country_code
FROM port
ORDER BY port_code
```

**Note:** The frontend uses `port_code` as the primary identifier for origin/destination fields throughout the system. Ensure the column names match exactly.

---

### 4. `GET /trade-lanes`

List all trade lane records from the `trade_lane` table.

**Category:** Core Infrastructure — P0
**Auth:** Required
**Frontend function:** `apiGetTradeLanes()` — `api.ts:1010`

**Response** `200`

```json
[
  {
    "trln_id": 1,
    "trln_name": "Far East - Europe"
  }
]
```

**SQL:**

```sql
SELECT trln_id, trln_name
FROM trade_lane
ORDER BY trln_name
```

**Note:** The frontend maps `trln_id` to resolve liner names in the unified rate view. Field names must be `trln_id` and `trln_name` exactly (see `apiFetchAllRates()` in api.ts:877).

---

### 5. `POST /tasks`

Create a task/reminder linked to a customer.

**Category:** Task Management — P1
**Auth:** Required
**Frontend function:** `apiCreateTask()` — `api.ts:651`

**Request Body**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `customer_name` | string | yes | Customer name (for linking) |
| `task` | string | no | Task description |
| `due_date` | date | no | Due date (`YYYY-MM-DD`) |
| `employee_id` | int | no | Assigned employee (defaults to current user from JWT) |

**Response** `201`

```json
{
  "fe_id": "TSK-001",
  "customer_name": "Acme Exports",
  "task": "Follow up on pricing",
  "due_date": "2026-09-15",
  "completed": false,
  "employee_id": 8,
  "created_at": "2026-09-10T14:30:00"
}
```

**DB table:** `task`

```sql
CREATE TABLE task (
    task_id    SERIAL PRIMARY KEY,
    customer_name TEXT NOT NULL,
    task       TEXT,
    due_date   DATE,
    completed  BOOLEAN NOT NULL DEFAULT false,
    employee_id INTEGER REFERENCES employee(emp_id),
    created_at TIMESTAMP NOT NULL DEFAULT now()
);
```

**Implementation:**
- Generate `fe_id` as `'TSK-' || task_id` for frontend compatibility.
- Default `employee_id` to the authenticated user if not provided.

---

### 6. `PATCH /tasks/{task_id}/complete`

Mark a task as completed.

**Category:** Task Management — P1
**Auth:** Required
**Frontend function:** `apiCompleteTask()` — `api.ts:660`

**Path Parameters**

| Param | Type | Description |
|-------|------|-------------|
| `task_id` | string | The `fe_id` (e.g., `TSK-001`) or integer task ID |

**Response** `200`

```json
{ "success": true }
```

**SQL:**

```sql
-- If fe_id is passed (e.g., "TSK-42"), extract the integer suffix:
UPDATE task
SET completed = true
WHERE task_id = %(task_id)s
RETURNING *
```

**Errors:**
- `404` — Task not found

---

### 7. `POST /followups`

Create a followup note for a customer.

**Category:** Task Management — P1
**Auth:** Required
**Frontend function:** `apiCreateFollowup()` — `api.ts:581`

**Request Body**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `customer_name` | string | yes | Customer name |
| `note` | string | no | Followup note content |
| `completion_flag` | bool | no | Whether the followup is complete (default: `false`) |
| `employee_id` | int | no | Employee ID (defaults to current user from JWT) |

**Response** `201`

```json
{
  "fe_id": "FLW-001",
  "customer_name": "Acme Exports",
  "note": "Discussed Q4 volume commitments",
  "completion_flag": false,
  "employee_id": 8,
  "created_at": "2026-09-10T14:30:00"
}
```

**DB table:** `followup`

```sql
CREATE TABLE followup (
    followup_id    SERIAL PRIMARY KEY,
    customer_name  TEXT NOT NULL,
    note           TEXT,
    completion_flag BOOLEAN NOT NULL DEFAULT false,
    employee_id    INTEGER REFERENCES employee(emp_id),
    created_at     TIMESTAMP NOT NULL DEFAULT now()
);
```

**Implementation:**
- Generate `fe_id` as `'FLW-' || followup_id`.
- Default `employee_id` to the authenticated user if not provided.

---

### 8. `PATCH /rate-requests/{request_id}`

Update an existing rate request. Used when Procurement marks a request as fulfilled or updates the remark.

**Category:** Rate Requests — P1
**Auth:** Required
**Frontend function:** `apiPatchRateRequest()` — `api.ts:1069`
**Frontend comment:** *"NOTE: Requires PATCH /rate-requests/{request_id} to be added to the backend router."*

**Path Parameters**

| Param | Type | Description |
|-------|------|-------------|
| `request_id` | int | Rate request ID |

**Request Body** — All fields optional:

| Field | Type | Description |
|-------|------|-------------|
| `emp_id_requester` | int | Requester employee ID |
| `emp_id_requested` | int | Assignee employee ID |
| `is_given` | bool | Whether rate has been provided |
| `remark` | string | Updated remark/message |

**Response** `200` — Returns the updated rate request record.

```json
{
  "request_id": 1,
  "inq_id": 5,
  "emp_id_requested": 3,
  "is_given": true,
  "remark": "Rate provided: USD 850/TEU CMA CGM via Colombo-Hamburg"
}
```

**Implementation:**
- Add to the existing rate request router in `modules/rate_requests/rate_requests.py`.
- Use the same `exclude_unset` PATCH pattern as other endpoints.
- **No automatic workflow transition** — the option-add endpoint (`POST .../options`) handles that.

**SQL:**

```sql
UPDATE rate_request
SET emp_id_requested = COALESCE(%(emp_id_requested)s, emp_id_requested),
    is_given = COALESCE(%(is_given)s, is_given),
    remark = COALESCE(%(remark)s, remark)
WHERE request_id = %(request_id)s
RETURNING *
```

**Errors:**
- `400` — No fields provided for update
- `404` — Rate request not found

---

### 9. `POST /send-kyc`

Send a KYC form to a client via email (using Resend or similar email provider).

**Category:** Email — P2
**Auth:** Required
**Frontend function:** `apiSendKyc()` — `api.ts:767`

**Request Body**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `customer_name` | string | yes | Customer name (for email subject) |
| `recipient_email` | string | yes | Email address to send KYC form to |

**Response** `200`

```json
{
  "success": true,
  "message": "KYC form sent to john@acme.com"
}
```

**Implementation:**
- Use the Resend SDK (`resend.Emails.send()`).
- Email subject: `"KYC Form Request — {customer_name}"`
- Body: HTML template with a link to the KYC submission form or an embedded form.
- Log the send action for audit.
- Environment variable: `RESEND_API_KEY`

**Errors:**
- `400` — Missing required fields or invalid email format
- `502` — Email provider failure

---

### 10. `POST /send-quotation`

Send a quotation to a client via email.

**Category:** Email — P2
**Auth:** Required
**Frontend function:** `apiSendQuotation()` — `api.ts:774`

**Request Body**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `customer_name` | string | yes | Customer name |
| `recipient_email` | string | yes | Email address |
| `quote_id` | string | yes | Quotation ID (for reference in subject line) |
| `quotation_content` | string | yes | Rendered quotation content (HTML or plain text) |

**Response** `200`

```json
{
  "success": true,
  "message": "Quotation sent to john@acme.com"
}
```

**Implementation:**
- Use the Resend SDK.
- Email subject: `"Quotation #{quote_id} — {customer_name}"`
- Body: The `quotation_content` field (pre-rendered by the frontend).
- Consider also calling `PATCH /quotations/{quote_id}/send?status=sent` internally so the quotation status and workflow update automatically in a single round-trip.
- Environment variable: `RESEND_API_KEY`

**Errors:**
- `400` — Missing required fields or invalid email format
- `502` — Email provider failure

---

### 11. `POST /activity-log`

Record a general activity/audit entry. Currently a **no-op** in the frontend (`api.ts:1233` returns `{}`).

**Category:** Audit — P3
**Auth:** Required
**Frontend function:** `apiCreateActivity()` — `api.ts:1223`

**Request Body**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `actor_role` | string | yes | Role of the actor (`sales`, `cs`, `procurement`, `finance`, `docs`) |
| `actor_id` | int | yes | Employee ID of the actor |
| `action` | string | yes | Action performed (e.g., `created_inquiry`, `sent_quotation`, `approved_kyc`) |
| `ref_type` | string | yes | Entity type (`inquiry`, `quotation`, `booking`, `kyc`) |
| `ref_id` | string | yes | Entity ID |
| `customer_name` | string | yes | Customer name for display |
| `pushed_to` | string | yes | Stage the entity was pushed to |
| `notes` | string | no | Additional notes |

**Response** `201`

```json
{
  "log_id": 1,
  "actor_role": "sales",
  "actor_id": 8,
  "action": "created_inquiry",
  "ref_type": "inquiry",
  "ref_id": "1",
  "customer_name": "Acme Exports",
  "pushed_to": "rate-check",
  "notes": null,
  "created_at": "2026-09-10T14:00:00"
}
```

**DB table:** `activity_log`

```sql
CREATE TABLE activity_log (
    log_id        SERIAL PRIMARY KEY,
    actor_role    TEXT NOT NULL,
    actor_id      INTEGER NOT NULL REFERENCES employee(emp_id),
    action        TEXT NOT NULL,
    ref_type      TEXT NOT NULL,
    ref_id        TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    pushed_to     TEXT NOT NULL,
    notes         TEXT,
    created_at    TIMESTAMP NOT NULL DEFAULT now()
);

-- Index for dashboard query (filter by actor, order by recency)
CREATE INDEX idx_activity_log_actor ON activity_log(actor_id, created_at DESC);
```

**Implementation:**
- This is a simple insert-only endpoint (no updates or deletes needed).
- The `GET /dashboard/init` endpoint should query this table for the `activity_log` array in its response.
- Consider adding a `GET /activity-log?employee_id={id}&limit={n}` endpoint in the future for paginated access.

---

## Error Response Format

All new endpoints should follow the existing error conventions from the main API:

```json
// 400 Bad Request
{ "detail": "No fields provided for update" }

// 404 Not Found
{ "detail": "Task not found" }

// 422 Constraint Violation
{
  "detail": {
    "error": "constraint_violation",
    "constraint": "task_employee_id_fkey",
    "message": "insert or update on table \"task\" violates foreign key constraint"
  }
}

// 502 External Service Failure
{
  "detail": {
    "error": "email_send_failed",
    "message": "Resend API returned 500"
  }
}

// 503 Database Unavailable
{
  "detail": {
    "error": "database_unavailable",
    "message": "connection to server failed"
  }
}
```

---

## Database Migration Summary

New tables required (if not already present):

```sql
-- Task management
CREATE TABLE IF NOT EXISTS task (
    task_id       SERIAL PRIMARY KEY,
    customer_name TEXT NOT NULL,
    task          TEXT,
    due_date      DATE,
    completed     BOOLEAN NOT NULL DEFAULT false,
    employee_id   INTEGER REFERENCES employee(emp_id),
    created_at    TIMESTAMP NOT NULL DEFAULT now()
);

-- Followup notes
CREATE TABLE IF NOT EXISTS followup (
    followup_id    SERIAL PRIMARY KEY,
    customer_name  TEXT NOT NULL,
    note           TEXT,
    completion_flag BOOLEAN NOT NULL DEFAULT false,
    employee_id    INTEGER REFERENCES employee(emp_id),
    created_at     TIMESTAMP NOT NULL DEFAULT now()
);

-- Activity log / audit trail
CREATE TABLE IF NOT EXISTS activity_log (
    log_id        SERIAL PRIMARY KEY,
    actor_role    TEXT NOT NULL,
    actor_id      INTEGER NOT NULL REFERENCES employee(emp_id),
    action        TEXT NOT NULL,
    ref_type      TEXT NOT NULL,
    ref_id        TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    pushed_to     TEXT NOT NULL,
    notes         TEXT,
    created_at    TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activity_log_actor
    ON activity_log(actor_id, created_at DESC);
```

> **Note:** The `employee`, `port`, and `trade_lane` tables already exist in the schema — they just need GET endpoints exposed via routers. No DDL changes needed for endpoints 2, 3, and 4.
