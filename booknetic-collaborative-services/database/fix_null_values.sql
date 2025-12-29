-- Fix NULL values in core Booknetic services table
-- This prevents PHP 8.1+ deprecation warnings when editing services
-- Run this SQL when MySQL server is running

-- Update full_period_value NULL values to 0
UPDATE wp_bkntc_services 
SET full_period_value = 0 
WHERE full_period_value IS NULL;

-- Update notes NULL values to empty string
UPDATE wp_bkntc_services 
SET notes = '' 
WHERE notes IS NULL;

-- Verify the changes
SELECT 
    COUNT(*) as total_services,
    SUM(CASE WHEN full_period_value IS NULL THEN 1 ELSE 0 END) as null_full_period,
    SUM(CASE WHEN notes IS NULL THEN 1 ELSE 0 END) as null_notes
FROM wp_bkntc_services;
