-- Add allow_multi_select column to service categories table
-- This enables/disables multiple service selection per category
-- Note: Replace 'wp_' with your actual WordPress table prefix if different

ALTER TABLE `wp_bkntc_service_categories` 
  ADD COLUMN IF NOT EXISTS `allow_multi_select` TINYINT(1) DEFAULT 0;
