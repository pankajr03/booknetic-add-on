<?php
/**
 * Manually add collab_staff_ids column to appointments table
 * Run this file once by accessing it in browser or via CLI
 */

// Load WordPress
require_once(__DIR__ . '/../../../../wp-load.php');

global $wpdb;

$appointments_table = $wpdb->prefix . 'bkntc_appointments';

// Check if column exists
$columns = $wpdb->get_results("SHOW COLUMNS FROM {$appointments_table} LIKE 'collab_staff_ids'");

if (empty($columns)) {
    $result = $wpdb->query("ALTER TABLE {$appointments_table} 
        ADD COLUMN collab_staff_ids TEXT AFTER staff_id");
    
    if ($result !== false) {
        echo "SUCCESS: collab_staff_ids column added to {$appointments_table} table\n";
    } else {
        echo "ERROR: Failed to add column. Error: " . $wpdb->last_error . "\n";
    }
} else {
    echo "INFO: collab_staff_ids column already exists in {$appointments_table} table\n";
}

// Verify the column was added
$verify = $wpdb->get_results("SHOW COLUMNS FROM {$appointments_table}");
echo "\nCurrent columns in {$appointments_table}:\n";
foreach ($verify as $column) {
    echo "  - " . $column->Field . " (" . $column->Type . ")\n";
}
