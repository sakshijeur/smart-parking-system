-- ============================================================
-- UNIFIED SCHEMA — Smart Parking System
-- Covers Person 2 (Booking & Allocation) and Person 4 (Exit,
-- Payment, History & Owner Dashboard) in one script.
-- Run this ONCE. Both modules' backends point at the same
-- database — just different .env DB_NAME (same "smart_parking")
-- and different ports (4000 for Person 2, 4001 for Person 4).
-- ============================================================

CREATE DATABASE IF NOT EXISTS smart_parking;
USE smart_parking;

-- ---------- Core tables ----------

CREATE TABLE IF NOT EXISTS ParkingAreas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    owner_id INT NULL,
    name VARCHAR(150) NOT NULL,
    address VARCHAR(255),
    lat DECIMAL(10,8),
    lng DECIMAL(11,8),
    total_capacity INT NOT NULL,
    rate_per_hour DECIMAL(8,2) NOT NULL,
    operating_hours VARCHAR(100),
    ev_facility BOOLEAN DEFAULT FALSE,
    accessible_parking BOOLEAN DEFAULT FALSE,
    parking_rules TEXT,
    status ENUM('PENDING_APPROVAL','ACTIVE','REJECTED','SUSPENDED') DEFAULT 'ACTIVE'
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS Users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    role ENUM('CUSTOMER','OPERATOR','OWNER','ADMIN') DEFAULT 'CUSTOMER',
    assigned_parking_area_id INT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (assigned_parking_area_id) REFERENCES ParkingAreas(id)
) ENGINE=InnoDB;

ALTER TABLE ParkingAreas
ADD CONSTRAINT fk_parkingareas_owner FOREIGN KEY (owner_id) REFERENCES Users(id);

CREATE TABLE IF NOT EXISTS Vehicles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    vehicle_number VARCHAR(20) NOT NULL,
    vehicle_type ENUM('CAR','BIKE','EV','OTHER') NOT NULL,
    FOREIGN KEY (user_id) REFERENCES Users(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS Slots (
    id INT AUTO_INCREMENT PRIMARY KEY,
    parking_area_id INT NOT NULL,
    slot_number VARCHAR(10) NOT NULL,
    status ENUM('AVAILABLE','RESERVED','OCCUPIED') DEFAULT 'AVAILABLE',
    vehicle_type_supported ENUM('CAR','BIKE','EV','OTHER') NOT NULL,
    distance_from_entry INT,
    FOREIGN KEY (parking_area_id) REFERENCES ParkingAreas(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS Reservations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    vehicle_id INT NOT NULL,
    slot_id INT NOT NULL,
    arrival_time_expected DATETIME NOT NULL,
    duration_expected_minutes INT NOT NULL,
    status ENUM('PENDING','CONFIRMED','CANCELLED') DEFAULT 'PENDING',
    qr_token VARCHAR(255) UNIQUE NOT NULL,
    qr_used BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES Users(id),
    FOREIGN KEY (vehicle_id) REFERENCES Vehicles(id),
    FOREIGN KEY (slot_id) REFERENCES Slots(id)
) ENGINE=InnoDB;

-- ---------- Tables Person 4 owns ----------

CREATE TABLE IF NOT EXISTS Sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    reservation_id INT NOT NULL,
    entry_time DATETIME,
    exit_time DATETIME,
    overstay_minutes INT DEFAULT 0,
    status ENUM('ACTIVE','COMPLETED') DEFAULT 'ACTIVE',
    FOREIGN KEY (reservation_id) REFERENCES Reservations(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS Payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    session_id INT NOT NULL,
    base_amount DECIMAL(8,2) NOT NULL,
    overstay_charge DECIMAL(8,2) DEFAULT 0,
    total_amount DECIMAL(8,2) NOT NULL,
    payment_status ENUM('PENDING','PAID','FAILED') DEFAULT 'PENDING',
    paid_at DATETIME,
    FOREIGN KEY (session_id) REFERENCES Sessions(id)
) ENGINE=InnoDB;

-- ============================================================
-- SEED DATA
-- Designed so BOTH modules have working test data at once:
--   - Slots A1, A2, B1, E1 stay AVAILABLE -> for Person 2's
--     booking/allocation testing.
--   - Slot A3 starts OCCUPIED with an active, already-overstayed
--     session -> for Person 4's exit/payment testing, without
--     touching the slots Person 2 needs free.
-- ============================================================

INSERT INTO ParkingAreas (name, address, lat, lng, total_capacity, rate_per_hour, operating_hours, ev_facility, accessible_parking, parking_rules)
VALUES ('Parking A', 'Katraj Main Road', 18.4575, 73.8677, 100, 20.00, '06:00-23:00', TRUE, TRUE,
'No overnight parking without prior approval. Maximum stay 12 hours. Vehicles left beyond booked duration will incur overstay charges.');

INSERT INTO Users (name, email, password_hash, phone, role) VALUES
('Test Customer', 'customer@test.com', 'dummy_hash', '9999999999', 'CUSTOMER'),
('Test Owner', 'owner@test.com', 'dummy_hash', '8888888888', 'OWNER');

UPDATE ParkingAreas SET owner_id = 2 WHERE id = 1;

INSERT INTO Vehicles (user_id, vehicle_number, vehicle_type)
VALUES (1, 'MH12AB1234', 'CAR');

-- Slots for Person 2's booking testing (all AVAILABLE):
INSERT INTO Slots (parking_area_id, slot_number, status, vehicle_type_supported, distance_from_entry) VALUES
(1, 'A1', 'AVAILABLE', 'CAR', 20),
(1, 'A2', 'AVAILABLE', 'CAR', 35),
(1, 'B1', 'AVAILABLE', 'CAR', 50),
(1, 'E1', 'AVAILABLE', 'EV', 15);

-- Extra slot + active session for Person 4's exit/payment testing —
-- separate from the slots above so booking-testing isn't affected.
INSERT INTO Slots (parking_area_id, slot_number, status, vehicle_type_supported, distance_from_entry) VALUES
(1, 'A3', 'OCCUPIED', 'CAR', 25);

-- A reservation that "arrived" 3 hours ago and was booked for only 2 hours
-- — i.e. already 1 hour overstayed. Ready to test billing immediately.
INSERT INTO Reservations (user_id, vehicle_id, slot_id, arrival_time_expected, duration_expected_minutes, status, qr_token, qr_used)
VALUES (1, 1, 5, DATE_SUB(NOW(), INTERVAL 3 HOUR), 120, 'CONFIRMED', '1.testtoken000000000000000000000000000000000000000000000000000', TRUE);

INSERT INTO Sessions (reservation_id, entry_time, status)
VALUES (1, DATE_SUB(NOW(), INTERVAL 3 HOUR), 'ACTIVE');
