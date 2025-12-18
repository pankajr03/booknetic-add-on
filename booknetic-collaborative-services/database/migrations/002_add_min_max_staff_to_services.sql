-- Add min/max staff columns to services table
-- This stores per-service collaborative booking requirements

ALTER TABLE `wp_bkntc_services` 
  ADD COLUMN `collab_min_staff` INT(11) DEFAULT 1 AFTER `category_id`,
  ADD COLUMN `collab_max_staff` INT(11) DEFAULT 1 AFTER `collab_min_staff`;

-- Add comments for documentation
ALTER TABLE `wp_bkntc_services` 
  MODIFY COLUMN `collab_min_staff` INT(11) DEFAULT 1 COMMENT 'Minimum staff required for collaborative booking',
  MODIFY COLUMN `collab_max_staff` INT(11) DEFAULT 1 COMMENT 'Maximum staff allowed for collaborative booking';
