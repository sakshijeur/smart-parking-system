const router = require('express').Router();
const db = require('../db');
const wrap = require('../wrap');
const { auth, role } = require('../middleware/auth');

// Team table: ParkingAreas. Columns are renamed in the API so the app keeps simple names.
const COLS = `id, owner_id, name, address, lat AS latitude, lng AS longitude,
  total_capacity AS total_slots, rate_per_hour AS price_per_hour,
  operating_hours, ev_facility, accessible_parking`;
const STATUS = `CASE status WHEN 'PENDING_APPROVAL' THEN 'pending' WHEN 'ACTIVE' THEN 'approved'
  WHEN 'REJECTED' THEN 'rejected' ELSE LOWER(status) END AS status`;

// GET /api/parking/nearby?lat=..&lng=..&radius_km=5   (ACTIVE areas only, nearest first)
router.get('/nearby', wrap(async (req, res) => {
  const lat = parseFloat(req.query.lat);
  const lng = parseFloat(req.query.lng);
  const radius = Math.min(parseFloat(req.query.radius_km) || 5, 100);
  if (isNaN(lat) || isNaN(lng)) return res.status(400).json({ message: 'lat and lng are required' });

  const [rows] = await db.query(
    `SELECT ${COLS},
       (6371 * ACOS(LEAST(1, COS(RADIANS(?)) * COS(RADIANS(lat)) * COS(RADIANS(lng) - RADIANS(?))
                           + SIN(RADIANS(?)) * SIN(RADIANS(lat))))) AS distance_km
     FROM ParkingAreas WHERE status='ACTIVE' AND lat IS NOT NULL AND lng IS NOT NULL
     HAVING distance_km <= ? ORDER BY distance_km ASC LIMIT 50`,
    [lat, lng, lat, radius]
  );
  res.json(rows);
}));

// ---- Owner ----
// GET /api/parking/mine
router.get('/mine', auth, role('owner'), wrap(async (req, res) => {
  const [rows] = await db.query(`SELECT ${COLS}, ${STATUS} FROM ParkingAreas WHERE owner_id=? ORDER BY id DESC`, [req.user.id]);
  res.json(rows);
}));

// POST /api/parking   (owner submits a listing -> PENDING_APPROVAL)
router.post('/', auth, role('owner'), wrap(async (req, res) => {
  const { name, address, operating_hours } = req.body;
  const latitude = parseFloat(req.body.latitude);
  const longitude = parseFloat(req.body.longitude);
  const slots = parseInt(req.body.total_slots, 10);
  const price = parseFloat(req.body.price_per_hour);
  const flag = (v) => (v === true || v === 'true' || v === 1 || v === '1' ? 1 : 0);

  if (!name || !address) return res.status(400).json({ message: 'Name and address are required' });
  if (isNaN(latitude) || latitude < -90 || latitude > 90 || isNaN(longitude) || longitude < -180 || longitude > 180)
    return res.status(400).json({ message: 'Valid location is required' });
  if (!(slots > 0)) return res.status(400).json({ message: 'Total slots must be more than 0' });
  if (isNaN(price) || price < 0) return res.status(400).json({ message: 'Enter a valid price per hour' });

  const [ins] = await db.query(
    `INSERT INTO ParkingAreas (owner_id,name,address,lat,lng,total_capacity,rate_per_hour,operating_hours,ev_facility,accessible_parking)
     VALUES (?,?,?,?,?,?,?,?,?,?)`,
    [req.user.id, name.trim(), address.trim(), latitude, longitude, slots, price,
     operating_hours || null, flag(req.body.ev_facility), flag(req.body.accessible_parking)]
  );
  res.status(201).json({ id: ins.insertId, status: 'pending' });
}));

// ---- Admin ----
// GET /api/parking/admin/pending
router.get('/admin/pending', auth, role('admin'), wrap(async (req, res) => {
  const [rows] = await db.query(
    `SELECT p.id, p.name, p.address, p.lat AS latitude, p.lng AS longitude,
            p.total_capacity AS total_slots, p.rate_per_hour AS price_per_hour,
            p.operating_hours, p.ev_facility, p.accessible_parking,
            u.name AS owner_name, u.phone AS owner_phone
     FROM ParkingAreas p LEFT JOIN Users u ON u.id=p.owner_id
     WHERE p.status='PENDING_APPROVAL' ORDER BY p.id ASC`
  );
  res.json(rows);
}));

// PATCH /api/parking/admin/:id/approve
router.patch('/admin/:id/approve', auth, role('admin'), wrap(async (req, res) => {
  const [r] = await db.query("UPDATE ParkingAreas SET status='ACTIVE' WHERE id=?", [req.params.id]);
  if (!r.affectedRows) return res.status(404).json({ message: 'Listing not found' });
  res.json({ message: 'Approved' });
}));

// PATCH /api/parking/admin/:id/reject
router.patch('/admin/:id/reject', auth, role('admin'), wrap(async (req, res) => {
  const [r] = await db.query("UPDATE ParkingAreas SET status='REJECTED' WHERE id=?", [req.params.id]);
  if (!r.affectedRows) return res.status(404).json({ message: 'Listing not found' });
  res.json({ message: 'Rejected' });
}));

// GET /api/parking/:id   (public details of an ACTIVE area)
router.get('/:id', wrap(async (req, res) => {
  const [rows] = await db.query(
    `SELECT p.id, p.name, p.address, p.lat AS latitude, p.lng AS longitude,
            p.total_capacity AS total_slots, p.rate_per_hour AS price_per_hour,
            p.operating_hours, p.ev_facility, p.accessible_parking,
            u.name AS owner_name, u.phone AS owner_phone
     FROM ParkingAreas p LEFT JOIN Users u ON u.id=p.owner_id
     WHERE p.id=? AND p.status='ACTIVE'`,
    [req.params.id]
  );
  if (!rows.length) return res.status(404).json({ message: 'Parking not found' });
  res.json(rows[0]);
}));

module.exports = router;