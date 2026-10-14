const jwt = require('jsonwebtoken');

// Checks the "Authorization: Bearer <token>" header and sets req.user = {id, role}
exports.auth = (req, res, next) => {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (!token) return res.status(401).json({ message: 'Please login first' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ message: 'Session expired, please login again' });
  }
};

// Allows only the listed roles, e.g. role('owner')
exports.role = (...roles) => (req, res, next) =>
  roles.includes(req.user.role) ? next() : res.status(403).json({ message: 'You are not allowed to do this' });
