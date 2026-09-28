-- Resets ALL test data back to a clean state, across both modules,
-- without dropping/recreating any tables.
--
-- Usage: mysql -u root -p smart_parking < reset-test-data.sql

USE smart_parking;

DELETE FROM Payments WHERE id > 0;
DELETE FROM Sessions WHERE id > 0;
DELETE FROM Reservations WHERE id > 0;

UPDATE Slots SET status = 'AVAILABLE' WHERE slot_number IN ('A1', 'A2', 'B1', 'E1');

-- Re-seed the one active overstayed session Person 4's module needs to test against.
UPDATE Slots SET status = 'OCCUPIED' WHERE slot_number = 'A3';

INSERT INTO Reservations (user_id, vehicle_id, slot_id, arrival_time_expected, duration_expected_minutes, status, qr_token, qr_used)
VALUES (1, 1, (SELECT id FROM Slots WHERE slot_number = 'A3'), DATE_SUB(NOW(), INTERVAL 3 HOUR), 120, 'CONFIRMED', CONCAT(UUID(), '-testtoken'), TRUE);

INSERT INTO Sessions (reservation_id, entry_time, status)
VALUES (LAST_INSERT_ID(), DATE_SUB(NOW(), INTERVAL 3 HOUR), 'ACTIVE');
