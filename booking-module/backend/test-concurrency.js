/**
 * Concurrency test — proves the allocation engine is safe against
 * double-booking when two requests arrive at (almost) the same instant.
 *
 * What it does:
 *   Fires two POST /api/reservations requests in parallel, both asking
 *   for a CAR slot at the same parking area, at the same time.
 *
 * What a PASS looks like:
 *   The two requests get two DIFFERENT slot numbers back (e.g. A1 and A2).
 *   This proves the "FOR UPDATE" row lock in allocation.js is working —
 *   without it, both requests could read the same "AVAILABLE" slot before
 *   either commits, and you'd get the same slot number twice (a real bug).
 *
 * Usage:
 *   1. Run `mysql -u root -p smart_parking < ../database/reset-test-data.sql` first,
 *      so you have known-fresh slots to test against.
 *   2. Make sure the backend is running (`npm run dev`).
 *   3. In a separate terminal: `node test-concurrency.js`
 */

const API_BASE = 'http://localhost:4000';

// Builds "YYYY-MM-DD HH:MM:SS" using LOCAL time components (matches what
// the frontend sends). Using toISOString() here would give UTC time, which
// the backend then misreads as local time — causing a false
// "arrivalTime cannot be in the past" error whenever your timezone is
// ahead of UTC (e.g. IST, UTC+5:30).
function formatForMySQL(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
         `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

async function bookSlot(label) {
  const arrivalDate = new Date(Date.now() + 5 * 60 * 1000); // 5 min from now
  const res = await fetch(`${API_BASE}/api/reservations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: 1,
      vehicleId: 1,
      vehicleType: 'CAR',
      parkingAreaId: 1,
      arrivalTime: formatForMySQL(arrivalDate),
      durationMinutes: 60
    })
  });
  const data = await res.json();
  return { label, status: res.status, data };
}

async function main() {
  console.log('Firing two simultaneous booking requests...\n');

  // Promise.all fires both requests at essentially the same instant,
  // which is exactly the race condition scenario we're testing.
  const [resultA, resultB] = await Promise.all([
    bookSlot('Request A'),
    bookSlot('Request B')
  ]);

  console.log(resultA.label, '->', resultA.status, resultA.data);
  console.log(resultB.label, '->', resultB.status, resultB.data);

  const slotA = resultA.data?.slot?.slot_number;
  const slotB = resultB.data?.slot?.slot_number;

  console.log('\n--- Result ---');
  if (slotA && slotB && slotA !== slotB) {
    console.log(`✅ PASS — got two different slots (${slotA} and ${slotB}). No double-booking.`);
  } else if (slotA && slotB && slotA === slotB) {
    console.log(`❌ FAIL — both requests got the SAME slot (${slotA})! Concurrency lock is not working.`);
  } else {
    console.log('⚠️  Could not compare slots — check the raw output above (maybe one request failed, e.g. NO_SLOTS_AVAILABLE if you forgot to reset test data first).');
  }
}

main().catch(err => console.error('Test script error:', err));
