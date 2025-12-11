<?php

defined('ABSPATH') || exit;

/**
 * Simple file logger for the collaborative services plugin.
 * Appends messages to app/logs/debug.log inside the plugin folder.
 */
function bkntc_cs_log($message)
{
    // Normalize message
    if (is_array($message) || is_object($message)) {
        $message = print_r($message, true);
    }

    $logDir = BKNTCCS_PLUGIN_DIR . 'app/logs/';
    if (!file_exists($logDir)) {
        wp_mkdir_p($logDir);
    }

    $logFile = $logDir . 'debug.log';
    $time = date('Y-m-d H:i:s');
    $line = "[{$time}] " . $message . PHP_EOL;

    // Use error_log with message type 3 (append to file)
    error_log($line, 3, $logFile);
}
