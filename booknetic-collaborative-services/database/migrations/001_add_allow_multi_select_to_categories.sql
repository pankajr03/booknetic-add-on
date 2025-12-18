-- Add allow_multi_select column to service categories table
-- This enables/disables multiple service selection per category

ALTER TABLE `wp_bkntc_service_categories` 
  ADD COLUMN `allow_multi_select` TINYINT(1) DEFAULT 0 AFTER `collab_eligible_staff`;

-- Add comment for documentation
ALTER TABLE `wp_bkntc_service_categories` 
  MODIFY COLUMN `allow_multi_select` TINYINT(1) DEFAULT 0 COMMENT 'Enable multiple service selection for this category';
