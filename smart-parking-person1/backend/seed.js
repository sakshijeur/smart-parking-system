// Creates the admin account, a demo owner and 3 approved demo parking lots.
// Usage: npm run seed            (or)  node seed.js <lat> <lng>   to put demo lots near you
require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('./src/db');

const lat = parseFloat(process.argv[2]) || 18.5204;
const lng = parseFloat(process.argv[3]) || 73.8567;

async function upsertUser(name, email, pw, role) {
  const hash = await bcrypt.hash(pw, 10);
  await db.query(
    `INSERT INTO users (name,email,password_hash,role) VALUES (?,?,?,?)
     ON DUPLICATE KEY UPDATE password_hash=VALUES(password_hash), role=VALUES(role)`,
    [name, email, hash, role]
  );
  const [[u]] = await db.query('SELECT id FROM users WHERE email=?', [email]);
  return u.id;
}

(async () => {
  await upsertUser('Admin', 'admin@smartparking.com', 'Admin@123', 'admin');
  const ownerId = await upsertUser('Demo Owner', 'owner@smartparking.com', 'Owner@123', 'owner');
  const [[c]] = await db.query('SELECT COUNT(*) AS n FROM parking_lots WHERE owner_id=?', [ownerId]);
  if (c.n === 0) {
    const lots = [
      ['City Center Parking', 'Main Road, Central Area', 0.004, 0.003, 40, 30],
      ['Green Park Lot', 'Park Street', -0.008, 0.006, 25, 20],
      ['Mall Basement Parking', 'Shopping Mall, Ring Road', 0.015, -0.012, 120, 50],
    ];
    for (const [n, a, dla, dlo, s, p] of lots) {
      await db.query(
        `INSERT INTO parking_lots (owner_id,name,address,latitude,longitude,total_slots,price_per_hour,description,status)
         VALUES (?,?,?,?,?,?,?,?, 'approved')`,
        [ownerId, n, a, lat + dla, lng + dlo, s, p, 'Demo parking lot']
      );
    }
  }
  console.log('Seed done.');
  console.log('Admin : admin@smartparking.com / Admin@123');
  console.log('Owner : owner@smartparking.com / Owner@123');
  process.exit(0);
})().catch((e) => { console.error(e.message); process.exit(1); });
