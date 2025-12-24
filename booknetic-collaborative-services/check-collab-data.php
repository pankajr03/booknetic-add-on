<?php
/**
 * Diagnostic script to check collaborative booking data
 * Access this file in browser: /wp-content/plugins/booknetic-collaborative-services/check-collab-data.php
 */

// Load WordPress
require_once(__DIR__ . '/../../../../wp-load.php');

if (!current_user_can('manage_options')) {
    die('Permission denied');
}

global $wpdb;
$appointments_table = $wpdb->prefix . 'bkntc_appointments';

echo "<h2>Collaborative Booking Diagnostic</h2>";

// Check if collaborative_group_id column exists
echo "<h3>1. Checking if collaborative_group_id column exists:</h3>";
$columns = $wpdb->get_results("SHOW COLUMNS FROM {$appointments_table} LIKE 'collaborative_group_id'");

if (empty($columns)) {
    echo "<p style='color: red;'>❌ ERROR: collaborative_group_id column does NOT exist!</p>";
    echo "<p>Adding the column now...</p>";
    
    $result = $wpdb->query("ALTER TABLE {$appointments_table} 
        ADD COLUMN collaborative_group_id VARCHAR(255) DEFAULT NULL AFTER staff_id,
        ADD INDEX idx_collaborative_group_id (collaborative_group_id)");
    
    if ($result !== false) {
        echo "<p style='color: green;'>✓ Column added successfully!</p>";
    } else {
        echo "<p style='color: red;'>❌ Failed to add column: " . $wpdb->last_error . "</p>";
    }
} else {
    echo "<p style='color: green;'>✓ Column exists!</p>";
    foreach ($columns as $col) {
        echo "<pre>";
        print_r($col);
        echo "</pre>";
    }
}

// Check all columns in appointments table
echo "<h3>2. All columns in appointments table:</h3>";
$all_columns = $wpdb->get_results("SHOW COLUMNS FROM {$appointments_table}");
echo "<ul>";
foreach ($all_columns as $col) {
    echo "<li><strong>" . $col->Field . "</strong> (" . $col->Type . ")</li>";
}
echo "</ul>";

// Check if any appointments have collaborative_group_id set
echo "<h3>3. Appointments with collaborative_group_id:</h3>";
$collab_appointments = $wpdb->get_results(
    "SELECT id, customer_id, service_id, staff_id, collaborative_group_id, created_at 
     FROM {$appointments_table} 
     WHERE collaborative_group_id IS NOT NULL AND collaborative_group_id != '' 
     ORDER BY created_at DESC 
     LIMIT 10"
);

if (empty($collab_appointments)) {
    echo "<p style='color: orange;'>⚠️ No appointments with collaborative_group_id found.</p>";
    echo "<p>This means either:</p>";
    echo "<ul>";
    echo "<li>No collaborative bookings have been created yet</li>";
    echo "<li>The column wasn't being populated during booking</li>";
    echo "</ul>";
} else {
    echo "<p style='color: green;'>✓ Found " . count($collab_appointments) . " collaborative appointments:</p>";
    echo "<table border='1' cellpadding='5' style='border-collapse: collapse;'>";
    echo "<tr><th>ID</th><th>Customer ID</th><th>Service ID</th><th>Staff ID</th><th>Group ID</th><th>Created</th></tr>";
    foreach ($collab_appointments as $appt) {
        echo "<tr>";
        echo "<td>{$appt->id}</td>";
        echo "<td>{$appt->customer_id}</td>";
        echo "<td>{$appt->service_id}</td>";
        echo "<td>{$appt->staff_id}</td>";
        echo "<td>{$appt->collaborative_group_id}</td>";
        echo "<td>{$appt->created_at}</td>";
        echo "</tr>";
    }
    echo "</table>";
}

// Check recent appointments (collaborative or not)
echo "<h3>4. Last 5 appointments (all):</h3>";
$recent_appointments = $wpdb->get_results(
    "SELECT id, customer_id, service_id, collaborative_group_id, created_at 
     FROM {$appointments_table} 
     ORDER BY created_at DESC 
     LIMIT 5"
);

echo "<table border='1' cellpadding='5' style='border-collapse: collapse;'>";
echo "<tr><th>ID</th><th>Customer ID</th><th>Service ID</th><th>Group ID</th><th>Created</th></tr>";
foreach ($recent_appointments as $appt) {
    $groupId = $appt->collaborative_group_id ? $appt->collaborative_group_id : '<em>null</em>';
    echo "<tr>";
    echo "<td>{$appt->id}</td>";
    echo "<td>{$appt->customer_id}</td>";
    echo "<td>{$appt->service_id}</td>";
    echo "<td>{$groupId}</td>";
    echo "<td>{$appt->created_at}</td>";
    echo "</tr>";
}
echo "</table>";

echo "<hr>";
echo "<p><strong>Next Steps:</strong></p>";
echo "<ol>";
echo "<li>If column doesn't exist, run the plugin activation again</li>";
echo "<li>If column exists but no data, create a new collaborative booking to test</li>";
echo "<li>Check the console during booking to see if collaborative_group_id is being set</li>";
echo "</ol>";
?>
