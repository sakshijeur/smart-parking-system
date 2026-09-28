const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { createReservation } = require('../services/allocation');
const { tokenToQrImage } = require('../utils/qr');

/**
 * POST /api/reservations
 * Body: { userId, vehicleId, vehicleType, parkingAreaId, arrivalTime, durationMinutes }
 *
 * NOTE: In the full app, userId/vehicleId will come from the logged-in
 * session (Person 1's auth module) rather than the request body. Passing
 * them in the body for now lets you test this module standalone.
 */
router.post('/reservations', async (req, res) => {
  const { userId, vehicleId, vehicleType, parkingAreaId, arrivalTime, durationMinutes } = req.body;

  if (!userId || !vehicleId || !vehicleType || !parkingAreaId || !arrivalTime || !durationMinutes) {
    return res.status(400).json({ error: 'Missing required booking fields' });
  }

  if (!['CAR', 'BIKE', 'EV', 'OTHER'].includes(vehicleType)) {
    return res.status(400).json({ error: 'Invalid vehicleType' });
  }

  const durationNum = Number(durationMinutes);
  if (!Number.isFinite(durationNum) || durationNum <= 0 || durationNum > 1440) {
    return res.status(400).json({ error: 'durationMinutes must be a positive number, max 1440 (24 hours)' });
  }

  const arrivalDate = new Date(arrivalTime.replace(' ', 'T'));
  if (isNaN(arrivalDate.getTime())) {
    return res.status(400).json({ error: 'Invalid arrivalTime format' });
  }
  // Allow a 1-minute buffer for clock drift between client and server.
  if (arrivalDate.getTime() < Date.now() - 60 * 1000) {
    return res.status(400).json({ error: 'arrivalTime cannot be in the past' });
  }

  try {
    // Check the arrival time actually falls within this area's operating hours.
    const [areaCheckRows] = await pool.query(
      `SELECT operating_hours FROM ParkingAreas WHERE id = ? AND status = 'ACTIVE'`,
      [parkingAreaId]
    );

    if (areaCheckRows.length === 0) {
      return res.status(404).json({ error: 'Parking area not found or not active' });
    }

    const operatingHours = areaCheckRows[0].operating_hours; // e.g. "06:00-23:00"
    if (operatingHours && operatingHours.includes('-')) {
      const [openStr, closeStr] = operatingHours.split('-');
      const [openH, openM] = openStr.split(':').map(Number);
      const [closeH, closeM] = closeStr.split(':').map(Number);

      const arrivalMinutes = arrivalDate.getHours() * 60 + arrivalDate.getMinutes();
      const openMinutes = openH * 60 + openM;
      const closeMinutes = closeH * 60 + closeM;

      if (arrivalMinutes < openMinutes || arrivalMinutes > closeMinutes) {
        return res.status(400).json({
          error: `Arrival time is outside operating hours (${operatingHours})`
        });
      }
    }

    const result = await createReservation({
      userId, vehicleId, vehicleType, parkingAreaId, arrivalTime, durationMinutes
    });

    if (!result.success) {
      return res.status(409).json({ error: result.reason });
    }

    const qrImage = await tokenToQrImage(result.qrToken);

    // Look up the area's rate to return an estimated cost alongside the confirmation.
    // This is an ESTIMATE only — the real, final charge (including any overstay)
    // is calculated at exit time by Person 4's module.
    const [areaRows] = await pool.query(
      `SELECT rate_per_hour FROM ParkingAreas WHERE id = ?`,
      [parkingAreaId]
    );
    const ratePerHour = areaRows[0]?.rate_per_hour || 0;
    const estimatedCost = Number(((durationNum / 60) * ratePerHour).toFixed(2));

    res.status(201).json({
      reservationId: result.reservationId,
      slot: result.slot,
      qrToken: result.qrToken,
      qrImage, // base64 data URI the app can render directly in an <Image>
      estimatedCost,
      ratePerHour
    });
  } catch (err) {
    console.error('Booking error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/reservations/:id
 *
 * Returns everything the "My Reservation" screen needs to redisplay a
 * booking after the app restarts — including a freshly regenerated QR
 * image (we only store the signed token in the DB, not the image itself,
 * so we re-render it here from the same token every time).
 */
router.get('/reservations/:id', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT r.*, s.slot_number, s.parking_area_id, p.name AS parking_area_name
       FROM Reservations r
       JOIN Slots s ON r.slot_id = s.id
       JOIN ParkingAreas p ON s.parking_area_id = p.id
       WHERE r.id = ?`,
      [req.params.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Reservation not found' });
    }

    const reservation = rows[0];
    const qrImage = await tokenToQrImage(reservation.qr_token);

    res.json({ ...reservation, qrImage });
  } catch (err) {
    console.error('Fetch reservation error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
