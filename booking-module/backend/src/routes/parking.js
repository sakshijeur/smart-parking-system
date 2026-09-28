const express = require('express');
const router = express.Router();
const pool = require('../config/db');

/**
 * GET /api/parking/:id
 *
 * Returns everything the Parking Details screen needs (Phase 2, step 14 of
 * the master plan): address, capacity, live occupancy %, rates, hours,
 * vehicle types supported, EV/accessible facilities, and rules.
 *
 * NOTE: this lives in Person 2's module for now so the Parking Details ->
 * Booking flow works standalone. Once Person 1's Discovery module exists,
 * this route (or an equivalent one) will likely move there — the frontend
 * just needs *a* working /api/parking/:id to call, wherever it ends up living.
 */
router.get('/parking/:id', async (req, res) => {
  const parkingAreaId = req.params.id;

  try {
    const [areaRows] = await pool.query(
      `SELECT * FROM ParkingAreas WHERE id = ? AND status = 'ACTIVE'`,
      [parkingAreaId]
    );

    if (areaRows.length === 0) {
      return res.status(404).json({ error: 'Parking area not found or not active' });
    }

    const area = areaRows[0];

    // Occupancy: how many slots are OCCUPIED or RESERVED vs total slots defined.
    const [occupancyRows] = await pool.query(
      `SELECT
         COUNT(*) AS totalSlots,
         SUM(CASE WHEN status = 'OCCUPIED' THEN 1 ELSE 0 END) AS occupied,
         SUM(CASE WHEN status = 'RESERVED' THEN 1 ELSE 0 END) AS reserved,
         SUM(CASE WHEN status = 'AVAILABLE' THEN 1 ELSE 0 END) AS available
       FROM Slots
       WHERE parking_area_id = ?`,
      [parkingAreaId]
    );

    const stats = occupancyRows[0];
    const totalSlots = Number(stats.totalSlots) || 0;
    const occupiedOrReserved = Number(stats.occupied || 0) + Number(stats.reserved || 0);
    const occupancyPercent = totalSlots > 0
      ? Math.round((occupiedOrReserved / totalSlots) * 100)
      : 0;

    // Distinct vehicle types this parking area actually has slots for.
    const [vehicleTypeRows] = await pool.query(
      `SELECT DISTINCT vehicle_type_supported FROM Slots WHERE parking_area_id = ?`,
      [parkingAreaId]
    );
    const vehicleTypesSupported = vehicleTypeRows.map(r => r.vehicle_type_supported);

    res.json({
      id: area.id,
      name: area.name,
      address: area.address,
      totalCapacity: area.total_capacity,
      ratePerHour: area.rate_per_hour,
      operatingHours: area.operating_hours,
      evFacility: !!area.ev_facility,
      accessibleParking: !!area.accessible_parking,
      parkingRules: area.parking_rules,
      vehicleTypesSupported,
      occupancy: {
        totalSlots,
        available: Number(stats.available || 0),
        occupancyPercent
      }
    });
  } catch (err) {
    console.error('Fetch parking details error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
