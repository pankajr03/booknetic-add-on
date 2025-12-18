-- Create guest data table for storing guest information
-- Links guest details to specific appointments in group bookings

CREATE TABLE IF NOT EXISTS `wp_bkntc_appointment_guests` (
  `id` INT(11) AUTO_INCREMENT PRIMARY KEY,
  `appointment_id` INT(11) NOT NULL,
  `guest_name` VARCHAR(255) DEFAULT NULL,
  `guest_email` VARCHAR(255) DEFAULT NULL,
  `guest_phone` VARCHAR(255) DEFAULT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`appointment_id`) REFERENCES `wp_bkntc_appointments`(`id`) ON DELETE CASCADE,
  INDEX `idx_appointment_id` (`appointment_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
