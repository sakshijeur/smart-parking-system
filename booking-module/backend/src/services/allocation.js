const pool = require('../config/db');
const { generateQrToken } = require('../utils/qr');

/**
 * Creates a reservation by finding and locking the best available slot.
 *
 * Allocation rules (from the master plan):
 *   1. Filter slots by vehicle type compatibility
 *   2. Only AVAILABLE slots
 *   3. Sort by nearest distance from entry
 *   4. Pick the single best match
 *
 * Concurrency safety:
 *   Runs inside a transaction using "SELECT ... FOR UPDATE" so that if two
 *   customers book at the same moment, the second one's query waits until
 *   the first transaction commits/rolls back — they can never be assigned
 *   the same slot.
 */
async function createReservation({ userId, vehicleId, vehicleType, parkingAreaId, arrivalTime, durationMinutes }) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // Lock the best matching slot row so no other transaction can grab it
    // until we commit or roll back.
    const [slots] = await connection.query(
      `SELECT id, slot_number, distance_from_entry
       FROM Slots
       WHERE parking_area_id = ?
         AND vehicle_type_supported = ?
         AND status = 'AVAILABLE'
       ORDER BY distance_from_entry ASC
       LIMIT 1
       FOR UPDATE`,
      [parkingAreaId, vehicleType]
    );

    if (slots.length === 0) {
      await connection.rollback();
      return { success: false, reason: 'NO_SLOTS_AVAILABLE' };
    }

    const chosenSlot = slots[0];

    // Mark the slot RESERVED
    await connection.query(
      `UPDATE Slots SET status = 'RESERVED' WHERE id = ?`,
      [chosenSlot.id]
    );

    // Create the reservation row (qr_token filled in after we have the insertId)
    const [result] = await connection.query(
      `INSERT INTO Reservations
         (user_id, vehicle_id, slot_id, arrival_time_expected, duration_expected_minutes, status, qr_token)
       VALUES (?, ?, ?, ?, ?, 'CONFIRMED', 'PENDING')`,
      [userId, vehicleId, chosenSlot.id, arrivalTime, durationMinutes]
    );

    const reservationId = result.insertId;
    const qrToken = generateQrToken(reservationId);

    await connection.query(
      `UPDATE Reservations SET qr_token = ? WHERE id = ?`,
      [qrToken, reservationId]
    );

    await connection.commit();

    return {
      success: true,
      reservationId,
      slot: chosenSlot,
      qrToken
    };
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

module.exports = { createReservation };
