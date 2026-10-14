const router = require('express').Router();
const db = require('../db');
const wrap = require('../wrap');
const { auth, role } = require('../middleware/auth');

router.use(auth, role('driver'));

const TYPES = ['car', 'bike', 'ev', 'other'];
const clean = (p) => String(p || '').toUpperCase().replace(/[\s-]/g, '');
const COLS = 'id, vehicle_number AS plate_number, LOWER(vehicle_type) AS type';

// GET /api/vehicles
router.get('/', wrap(async (req, res) => {
  const [rows] = await db.query(`SELECT ${COLS} FROM Vehicles WHERE user_id=? ORDER BY id DESC`, [req.user.id]);
  res.json(rows);
}));

// POST /api/vehicles
router.post('/', wrap(async (req, res) => {
  const plate = clean(req.body.plate_number);
  const type = String(req.body.type || 'car').toLowerCase();
  if (plate.length < 4) return res.status(400).json({ message: 'Enter a valid plate number' });
  if (!TYPES.includes(type)) return res.status(400).json({ message: 'Invalid vehicle type' });

  const [dup] = await db.query('SELECT id FROM Vehicles WHERE user_id=? AND vehicle_number=?', [req.user.id, plate]);
  if (dup.length) return res.status(409).json({ message: 'This vehicle is already added' });

  const [ins] = await db.query(
    'INSERT INTO Vehicles (user_id, vehicle_number, vehicle_type) VALUES (?,?,?)',
    [req.user.id, plate, type.toUpperCase()]
  );
  res.status(201).json({ id: ins.insertId });
}));

// PUT /api/vehicles/:id
router.put('/:id', wrap(async (req, res) => {
  const plate = clean(req.body.plate_number);
  const type = String(req.body.type || 'car').toLowerCase();
  if (plate.length < 4) return res.status(400).json({ message: 'Enter a valid plate number' });
  if (!TYPES.includes(type)) return res.status(400).json({ message: 'Invalid vehicle type' });

  const [own] = await db.query('SELECT id FROM Vehicles WHERE id=? AND user_id=?', [req.params.id, req.user.id]);
  if (!own.length) return res.status(404).json({ message: 'Vehicle not found' });
  const [dup] = await db.query('SELECT id FROM Vehicles WHERE user_id=? AND vehicle_number=? AND id<>?', [req.user.id, plate, req.params.id]);
  if (dup.length) return res.status(409).json({ message: 'This vehicle is already added' });

  await db.query('UPDATE Vehicles SET vehicle_number=?, vehicle_type=? WHERE id=?', [plate, type.toUpperCase(), req.params.id]);
  res.json({ message: 'Updated' });
}));

// DELETE /api/vehicles/:id
router.delete('/:id', wrap(async (req, res) => {
  const [own] = await db.query('SELECT id FROM Vehicles WHERE id=? AND user_id=?', [req.params.id, req.user.id]);
  if (!own.length) return res.status(404).json({ message: 'Vehicle not found' });
  try {
    await db.query('DELETE FROM Vehicles WHERE id=?', [req.params.id]);
    res.json({ message: 'Deleted' });
  } catch (e) {
    if (e.code === 'ER_ROW_IS_REFERENCED_2')
      return res.status(409).json({ message: 'This vehicle has reservations and cannot be deleted' });
    throw e;
  }
}));

module.exports = router;