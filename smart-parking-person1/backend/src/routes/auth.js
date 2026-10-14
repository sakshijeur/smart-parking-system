const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const wrap = require('../wrap');
const { auth } = require('../middleware/auth');

// Database roles (team schema) <-> roles used by the app
const TO_APP = { CUSTOMER: 'driver', OWNER: 'owner', ADMIN: 'admin', OPERATOR: 'operator' };

const pub = (u) => ({ id: u.id, name: u.name, email: u.email, phone: u.phone || null, role: TO_APP[u.role] || 'driver' });
const sign = (u) => jwt.sign({ id: u.id, role: pub(u).role }, process.env.JWT_SECRET, { expiresIn: '7d' });

// POST /api/auth/register  (role: driver | owner; admin cannot self-register)
router.post('/register', wrap(async (req, res) => {
  const { name, email, phone, password, role } = req.body;
  if (!name || !email || !password) return res.status(400).json({ message: 'Name, email and password are required' });
  if (!/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ message: 'Enter a valid email' });
  if (password.length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters' });

  const mail = email.trim().toLowerCase();
  const [exists] = await db.query('SELECT id FROM Users WHERE email=?', [mail]);
  if (exists.length) return res.status(409).json({ message: 'This email is already registered' });

  const dbRole = role === 'owner' ? 'OWNER' : 'CUSTOMER';
  const hash = await bcrypt.hash(password, 10);
  const [ins] = await db.query(
    'INSERT INTO Users (name,email,phone,password_hash,role) VALUES (?,?,?,?,?)',
    [name.trim(), mail, phone || null, hash, dbRole]
  );
  const user = { id: ins.insertId, name: name.trim(), email: mail, phone, role: dbRole };
  res.status(201).json({ token: sign(user), user: pub(user) });
}));

// POST /api/auth/login
router.post('/login', wrap(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: 'Email and password are required' });
  const [rows] = await db.query('SELECT * FROM Users WHERE email=?', [email.trim().toLowerCase()]);
  const user = rows[0];
  if (!user || !(await bcrypt.compare(password, user.password_hash)))
    return res.status(401).json({ message: 'Wrong email or password' });
  res.json({ token: sign(user), user: pub(user) });
}));

// GET /api/auth/me
router.get('/me', auth, wrap(async (req, res) => {
  const [rows] = await db.query('SELECT * FROM Users WHERE id=?', [req.user.id]);
  if (!rows[0]) return res.status(401).json({ message: 'Account not found' });
  res.json({ user: pub(rows[0]) });
}));

module.exports = router;