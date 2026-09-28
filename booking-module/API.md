# API Contract — Booking & Allocation Module (Person 2)

This documents every endpoint this module exposes, so Person 1, 3, and 4 can
build against it without reading the source code. Update this file the
moment any endpoint's shape changes — an out-of-date contract causes more
integration bugs than no contract at all.

Base URL (local dev): `http://localhost:4000`

---

## POST /api/reservations

Creates a booking: finds the nearest suitable available slot, locks it,
generates a signed QR, and returns everything needed to show a confirmation.

### Request Body

```json
{
  "userId": 1,
  "vehicleId": 1,
  "vehicleType": "CAR",
  "parkingAreaId": 1,
  "arrivalTime": "2026-09-30 17:00:00",
  "durationMinutes": 120
}
```

| Field | Type | Notes |
|---|---|---|
| `userId` | number | **Currently hardcoded to `1` on the frontend.** Once Person 1's auth exists, this must come from the logged-in session, not a text field. |
| `vehicleId` | number | Same — currently hardcoded to `1`. Needs Person 1's vehicle profile data. |
| `vehicleType` | string | One of `CAR`, `BIKE`, `EV`, `OTHER` |
| `parkingAreaId` | number | Which parking area to book at |
| `arrivalTime` | string | Format: `"YYYY-MM-DD HH:MM:SS"`, **local time, not UTC**. See the timezone warning below — this has already caused one real bug in this project. |
| `durationMinutes` | number | 1–1440 (max 24 hours) |

### Success Response — `201 Created`

```json
{
  "reservationId": 7,
  "slot": { "id": 3, "slot_number": "A2", "distance_from_entry": 35 },
  "qrToken": "7.c94b7899f7544c0ba7b5c316f46865e9f8efc3ad64a947b786363e277b8eb09",
  "qrImage": "data:image/png;base64,iVBORw0KG...",
  "estimatedCost": 40.00,
  "ratePerHour": 20.00
}
```

`qrImage` is a ready-to-render base64 PNG data URI — pass it straight into an `<Image source={{ uri: qrImage }} />`, no extra processing needed.

### Error Responses

| Status | Body | Meaning |
|---|---|---|
| 400 | `{ "error": "Missing required booking fields" }` | One of the required fields above wasn't sent |
| 400 | `{ "error": "Invalid vehicleType" }` | Not one of CAR/BIKE/EV/OTHER |
| 400 | `{ "error": "durationMinutes must be a positive number, max 1440 (24 hours)" }` | Duration out of range |
| 400 | `{ "error": "arrivalTime cannot be in the past" }` | See timezone warning below — this is the most common false-positive cause |
| 400 | `{ "error": "Arrival time is outside operating hours (06:00-23:00)" }` | Arrival falls outside the parking area's stated hours |
| 404 | `{ "error": "Parking area not found or not active" }` | Bad `parkingAreaId`, or the area's `status` isn't `ACTIVE` |
| 409 | `{ "error": "NO_SLOTS_AVAILABLE" }` | Every matching slot is currently RESERVED/OCCUPIED |

### ⚠️ Timezone warning (read this before integrating)

`arrivalTime` must be built from **local time components**, not
`.toISOString()` (which returns UTC). If you're in a timezone ahead of UTC
(e.g. IST, +5:30), sending a UTC-formatted string here causes the backend to
misread it as local time — several hours "in the past" — and you'll get a
false `arrivalTime cannot be in the past` error. Build it like this instead:

```javascript
function formatForMySQL(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
         `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}
```

---

## GET /api/reservations/:id

Fetches full details for one reservation — used to redisplay a booking
after the app restarts, or for anyone else (e.g. Person 3's lifecycle
module) needing to check a reservation's current state.

### Response — `200 OK`

```json
{
  "id": 7,
  "user_id": 1,
  "vehicle_id": 1,
  "slot_id": 3,
  "arrival_time_expected": "2026-09-30T17:00:00.000Z",
  "duration_expected_minutes": 120,
  "status": "CONFIRMED",
  "qr_token": "7.c94b7899...",
  "qr_used": 0,
  "created_at": "2026-09-27T10:15:00.000Z",
  "slot_number": "A2",
  "parking_area_id": 1,
  "parking_area_name": "Parking A",
  "qrImage": "data:image/png;base64,iVBORw0KG..."
}
```

Note: `qrImage` is **regenerated fresh on every call** from the stored
`qr_token` — it's not stored as an image in the database. If you need the
QR image again later, call this endpoint rather than trying to cache the
original response.

### Error Response

| Status | Body |
|---|---|
| 404 | `{ "error": "Reservation not found" }` |

**For Person 3:** this is likely the endpoint you'll poll/check when
verifying arrival via QR scan, before flipping status to `OCCUPIED`. The
`qr_token` field is what you should validate against the scanned QR
payload (see `backend/src/utils/qr.js` — `verifyQrToken()` — for the
signing/verification logic if you need to check it independently rather
than through this endpoint).

---

## GET /api/parking/:id

Returns parking area details plus live-calculated occupancy.

> **Ownership note:** this endpoint currently lives in this module purely
> so the Booking flow works standalone. It's conceptually part of
> Discovery — worth confirming with Person 1 whether it moves into their
> module once Discovery exists, or stays here. Either way, the response
> shape below shouldn't need to change.

### Response — `200 OK`

```json
{
  "id": 1,
  "name": "Parking A",
  "address": "Katraj Main Road",
  "totalCapacity": 100,
  "ratePerHour": 20.00,
  "operatingHours": "06:00-23:00",
  "evFacility": true,
  "accessibleParking": true,
  "parkingRules": "No overnight parking without prior approval...",
  "vehicleTypesSupported": ["CAR", "EV"],
  "occupancy": {
    "totalSlots": 4,
    "available": 3,
    "occupancyPercent": 25
  }
}
```

`occupancyPercent` is calculated live from actual `Slots` table statuses
(OCCUPIED + RESERVED vs total) — it's never a stored/stale number.

### Error Response

| Status | Body |
|---|---|
| 404 | `{ "error": "Parking area not found or not active" }` |

---

## Things every teammate should know before integrating

1. **Concurrency is handled** — booking uses `SELECT ... FOR UPDATE` row
   locking, so two simultaneous booking requests can never be given the
   same slot. Proven with `backend/test-concurrency.js`. You don't need to
   add your own locking on top of this.

2. **Reset test data anytime** with `database/reset-test-data.sql` — frees
   all slots back to `AVAILABLE` without touching table structure.

3. **Hardcoded values to watch for**, until replaced by real data:
   - `userId = 1`, `vehicleId = 1` (needs Person 1's auth)
   - `parkingAreaId = 1` (needs Person 1's discovery/nearby list)

4. **Reservation status values**: `PENDING`, `CONFIRMED`, `CANCELLED`. This
   module always creates reservations as `CONFIRMED` immediately (no
   pending-approval step) — Person 3's no-show/cancel logic is what
   transitions status further from here.

5. **Schema dependency**: this module needs `Users`, `Vehicles`,
   `ParkingAreas`, `Slots`, and `Reservations` tables to exist — see
   `database/schema.sql`. If Person 1 or 3 extend these tables (e.g. adding
   `role` to `Users`, or a `Sessions` table), let this module's owner know
   so the shared `database/schema.sql` stays correct for everyone.
