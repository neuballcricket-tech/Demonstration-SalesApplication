# CLS Workflow — CS & Procurement (High-Level)

---

## CS Workflow

```
  [New Booking / Inquiry]
          │
          ▼
   1. Inquiry
          │
          ▼
   2. KYC
          │
          ▼
   3. Rates
          │
          ▼
   4. Prepare Quote
          │
          ▼
   5. Send Quote
          │
          ▼
   6. Customer Response
       ├─ Rejected ──► (end)
       └─ Accepted
          │
          ▼
   7. Booking
          │
          ▼
   8. Release
          │
          ▼
   9. Cutoff  ◄── Record vessel cutoff schedule
          │
          ▼
  10. Generate SI  ◄── Request SI → Record SI → Pre-Advice → Generate SI
          │
          ▼
  11. Vessel  ◄── Confirm vessel schedule
          │
          ▼
  12. Vessel Booking  ◄── Create booking in Gensoft
          │
          ▼
  13. Draft BL  ◄── Record job reference number
          │
          ▼
  14. Create BL  ◄── Record MBL + Create HBL
          │
          ▼
       [Done]
```

---

## Procurement Workflow

Triggered when CS confirms a booking and notifies Procurement.

```
  [Procurement Notified]
          │
          ▼
   1. Rate Check  ◄── Check rates via INTTRA
          │
          ▼
   2. Booking Request  ◄── Review CS booking request
          │
          ▼
   3. Booking  ◄── Confirm liner booking with shipping line
          │
          ▼
   4. Release Order  ◄── Attach release order to booking
          │
          ▼
       [Done → feeds back to CS Step 8: Release]
```

---

## How They Connect

```
  CS Step 7: Booking
       │
       └──► Procurement notified
                 │
                 ▼
            Proc Step 1–4
                 │
                 ▼
            Release Order attached
                 │
                 └──► CS Step 8: Release
```
