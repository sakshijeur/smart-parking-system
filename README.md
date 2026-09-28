# Smart Parking Management System

An intelligent parking app: find nearby parking, check occupancy, book a
slot (auto-assigned to the nearest suitable one), verify arrival by QR,
and handle no-shows, overstays, exit and payment.

## Repository layout

```
smart-parking-system/
  database/            <- ONE shared schema + reset script for everybody
    schema.sql
    reset-test-data.sql
  booking-module/      <- Person 2: Booking, slot allocation, QR, details screen
    backend/
    frontend/
    API.md             <- endpoint contract (read this before integrating)
    GUIDE.md
  (other modules get their own folder here)
```

Each teammate adds their module as its own top-level folder
(e.g. `auth-discovery-module/`, `lifecycle-module/`, `payment-module/`).
Everyone shares the single `database/` folder.

## First-time setup (everyone)

1. Install Node.js, MySQL Server, and Git.
2. Clone the repo and load the shared database **once**:
   ```
   git clone <repo-url>
   cd smart-parking-system
   mysql -u root -p < database/schema.sql
   ```
3. Follow the README inside your module's folder for backend/frontend setup.

## Module status

| Module | Owner | Status |
|---|---|---|
| Booking, allocation, QR, parking details | Person 2 | Done — see `booking-module/` |
| Auth, discovery, owner onboarding | Person 1 | In progress |
| Reservation lifecycle (QR verify, no-show, overstay) | Person 3 | In progress |
| Exit, payment, history, owner dashboard | Person 4 | In progress |

## Team workflow (please follow)

- **Never commit directly to `main`.** Work on your own branch:
  ```
  git checkout -b your-module-name
  git add .
  git commit -m "Describe what you changed"
  git push origin your-module-name
  ```
- Open a **Pull Request** on GitHub when your work is ready; a teammate
  glances at it before it merges.
- **Never commit `.env` files** — they hold passwords. Only `.env.example`
  goes in the repo (the `.gitignore` already enforces this).
- **Shared files need a heads-up:** `database/schema.sql` and any server
  entry file where routes get registered. Tell the team before changing
  them so nobody's work breaks.
- Before starting work each day: `git pull origin main`.

## Ports

| Service | Port |
|---|---|
| Booking backend | 4000 |
| Other backends | pick the next free port (4001, 4002, ...) and note it here |
