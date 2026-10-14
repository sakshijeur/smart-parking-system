# Smart Parking: Person 1 module (Auth, Vehicles, Discovery, Owner Onboarding)

Stack: React Native (Expo SDK 57) + Node.js/Express + MySQL + JWT + bcrypt. Purple theme.

## What is included

| Feature | Backend | Mobile screen |
|---|---|---|
| Register / login (driver, owner), admin login | `POST /api/auth/register`, `/login`, `GET /me` | Login, Register |
| JWT session kept on phone | `middleware/auth.js` | `AuthContext.js` (SecureStore) |
| Vehicle profile CRUD (+ default vehicle) | `/api/vehicles` | Vehicles, VehicleForm |
| GPS nearby parking discovery | `GET /api/parking/nearby?lat&lng&radius_km` | Nearby, ParkingDetail |
| Owner listing form | `POST /api/parking`, `GET /api/parking/mine` | OwnerListings, AddListing |
| Admin approve / reject | `/api/parking/admin/pending`, `/:id/approve`, `/:id/reject` | AdminPending |

Roles decide the screens after login: driver, owner, admin.

## Step 1: Database
1. Install MySQL and start it.
2. Run the schema:
   ```
   mysql -u root -p < backend/schema.sql
   ```

## Step 2: Backend
```
cd backend
copy .env.example .env      (then open .env and put your MySQL password and a long random JWT_SECRET)
npm install
npm run seed                (creates admin + demo owner + 3 demo parking lots)
npm start
```
Test in a browser: http://localhost:5000/api/health should show {"ok":true}.

Demo parking lots are placed near the coordinates in seed.js. To put them near you:
`node seed.js <your_latitude> <your_longitude>`

Test accounts after seeding:
- Admin: admin@smartparking.com / Admin@123
- Owner: owner@smartparking.com / Owner@123
- Driver: register one from the app.

## Step 3: Mobile
1. Keep the project OUT of OneDrive (for example C:\dev\smart-parking-person1).
2. Open `mobile/src/config.js` and set API_URL:
   - Android emulator: `http://10.0.2.2:5000/api`
   - Real phone on same Wi-Fi: `http://<PC IPv4 from ipconfig>:5000/api` (allow port 5000 in Windows Firewall)
3. Run:
   ```
   cd mobile
   npm install
   npx expo install --fix
   npx expo start -c
   ```
   Press `a` for the Android emulator, or scan the QR with Expo Go.
4. Emulator GPS: Extended controls (...) > Location > set a point near your seed coordinates, otherwise "Nearby" will be empty.

## How to test the full flow
1. Register as Owner > Add parking (use my current location) > it shows Pending.
2. Login as admin > Pending Approvals > Approve (or Reject with a reason).
3. Register as Driver > Nearby shows approved lots > open details > Open in Maps.
4. Driver > Vehicles > add, edit, set default, delete.

## API summary
All except health, register, login, nearby and parking detail need `Authorization: Bearer <token>`.

| Method | Path | Who |
|---|---|---|
| POST | /api/auth/register | public (role driver or owner) |
| POST | /api/auth/login | public |
| GET | /api/auth/me | any logged in |
| GET/POST | /api/vehicles | driver |
| PUT/DELETE | /api/vehicles/:id | driver (own only) |
| GET | /api/parking/nearby | public |
| GET | /api/parking/:id | public (approved only) |
| GET/POST | /api/parking/mine, /api/parking | owner |
| GET | /api/parking/admin/pending | admin |
| PATCH | /api/parking/admin/:id/approve, /reject | admin |

## Common problems
- "Cannot reach server": backend not running, or wrong API_URL / firewall.
- Nearby is empty: no approved lots within the chosen distance. Re-run seed with your coordinates or approve a listing.
- "Table doesn't exist": schema.sql was not run.
- Metro `transformFile` error: move the project out of OneDrive, delete node_modules and package-lock.json, then run npm install again.
