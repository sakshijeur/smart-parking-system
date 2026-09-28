# Person 2 Module — Booking & Slot Allocation Engine

## UI Theme
This module now matches the team's approved UI mockup (purple theme, card
layouts, dark QR screen). Shared colors/spacing live in `frontend/theme.js`
— when other teammates build their screens, importing from this same file
keeps the whole app visually consistent instead of everyone picking their
own colors.

Screens built to match the mockup:
- **Parking Details** — purple banner header, occupancy progress bar, info tiles, facility pills
- **Book Your Slot** — vehicle pills, arrival/duration fields, live cost estimate
- **Slot Reserved!** — green success screen with reservation summary card
- **Scan QR Code** — dark full-screen QR display, matches the "show to operator" screen
- **My Booking** — Active/History tabs + bottom nav (Home/Bookings/Profile — Home and Profile are stubbed until teammates build them)

## What this does
- **Parking Details screen**: shows address, live occupancy %, capacity,
  rates, hours, supported vehicle types, EV/accessible info, and rules.
- **Booking screen**: given vehicle type, arrival time, and duration,
  automatically finds and locks the nearest suitable AVAILABLE slot
  (concurrency-safe), creates the reservation, and generates a signed QR code.
- **Live cost estimate** shown while booking, and the final estimate shown
  on the confirmation card — calculated from the area's real hourly rate.
- **Operating hours validation** — rejects a booking if the arrival time
  falls outside the parking area's stated hours.
- **My Reservation screen**: your last successful booking is saved on-device
  (via AsyncStorage) and can be reopened anytime — even after fully closing
  and restarting the app — showing live status and a re-rendered QR code.
- **Concurrency test script** (`test-concurrency.js`) that proves two
  simultaneous booking requests can never be given the same slot.

## Proving the concurrency lock actually works

```
cd backend
mysql -u root -p smart_parking < ../database/reset-test-data.sql   # ensure fresh slots
npm run dev                                              # in one terminal
node test-concurrency.js                                 # in another terminal
```

You should see `✅ PASS` with two different slot numbers. This is genuinely
worth demonstrating in your project report/demo — most basic student
projects don't handle this race condition at all.


## Backend setup

1. Install MySQL locally (or use XAMPP) and make sure it's running.
2. Load the schema + sample data (this is a **shared schema** — the same
   file also covers Person 4's Sessions/Payments tables, so run it once
   and both modules' backends work against the same database):
   ```
   mysql -u root -p < ../database/schema.sql
   ```
3. Set up environment variables:
   ```
   cd backend
   cp .env.example .env
   ```
   Edit `.env` and fill in your real MySQL password and a random `QR_SECRET`.
4. Install dependencies and run:
   ```
   npm install
   npm run dev
   ```
5. Server runs at `http://localhost:4000`. Check `http://localhost:4000/health`.

## Test the API directly (before touching the frontend)

```bash
curl -X POST http://localhost:4000/api/reservations \
  -H "Content-Type: application/json" \
  -d '{
    "userId": 1,
    "vehicleId": 1,
    "vehicleType": "CAR",
    "parkingAreaId": 1,
    "arrivalTime": "2026-09-23 17:00:00",
    "durationMinutes": 120
  }'
```

You should get back a `reservationId`, the assigned `slot`, and a `qrImage`
(base64 PNG). Run it twice in a row — the second call should get a
*different* slot (A2, not A1), proving the allocation logic works.

## Frontend setup

```
cd frontend
npm install
npx expo start
```

Scan the QR with Expo Go on your phone. **Important:** if testing on a real
phone (not an emulator on the same machine), change `API_BASE` in `App.js`
from `localhost` to your computer's LAN IP address (e.g. `192.168.1.5`),
otherwise the phone can't reach your backend.

## Running out of test slots?

We seed 3 CAR slots (A1, A2, B1) and 1 EV slot (E1) as AVAILABLE for booking
tests. There's also a 5th slot (A3) that starts OCCUPIED on purpose — it's
seeded with an active, already-overstayed session for **Person 4's**
exit/payment module to test against. Don't be confused if occupancy shows
1 slot taken before you've booked anything — that's expected, not a bug.

After a few test bookings, you'll see `NO_SLOTS_AVAILABLE` on A1/A2/B1/E1 —
that's expected too. Reset everything back to a clean state:
```
mysql -u root -p smart_parking < ../database/reset-test-data.sql
```

## What's stubbed for now (until teammates' modules are ready)

- `userId` / `vehicleId` / the parking area shown are hard-coded — swap these
  for real values once Person 1's login/discovery screens are ready.
- There's no operator scanner yet to consume the QR — that's Person 3's module.

## Files

```
backend/
  (schema + reset scripts live in ../database/ — shared with the whole team)
  .env.example             - copy to .env and fill in
  src/
    server.js              - Express entry point
    config/db.js            - MySQL connection pool
    services/allocation.js  - the core allocation algorithm (concurrency-safe)
    utils/qr.js              - signed QR token generation/verification
    routes/bookings.js      - POST /api/reservations, GET /api/reservations/:id
    routes/parking.js       - GET /api/parking/:id (details + live occupancy)

frontend/
  theme.js                   - shared colors/spacing/typography (design tokens)
  App.js                    - five-screen flow: Details -> Booking -> Confirmation -> QR, plus My Booking
```
