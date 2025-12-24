/**
 * Admin Appointments List - Collaborative Booking Display
 * Shows visual indicators for appointments that are part of a collaborative booking group
 */

(function ($) {
    'use strict';

    // Initialize when document is ready
    $(document).ready(function () {
        console.log('🔧 Initializing collaborative booking admin display...');

        // Wait for Booknetic dataTable to be ready
        if (typeof booknetic !== 'undefined' && booknetic.dataTable) {
            console.log('✓ Booknetic dataTable found');

            // Hook into Booknetic's dataTable reload event
            var originalOnLoad = booknetic.dataTable.onLoadFn;
            booknetic.dataTable.onLoadFn = function (tableDiv) {
                if (originalOnLoad) {
                    originalOnLoad(tableDiv);
                }
                console.log('📊 DataTable loaded, enhancing...');
                setTimeout(enhanceAppointmentsList, 500);
            };
        }

        // Initial load
        setTimeout(function () {
            enhanceAppointmentsList();
        }, 2000);
    });

    /**
     * Enhance the appointments table to show collaborative booking groups
     */
    function enhanceAppointmentsList() {
        console.log('🔄 Enhancing appointments list for collaborative bookings...');

        // Booknetic uses fs_data_table_layout class for its tables
        var $appointmentRows = $('table.fs_data_table_layout tbody tr');

        if ($appointmentRows.length === 0) {
            console.log('⚠️ No rows found, checking all tables...');
            console.log('Available tables:', $('table').length);
            $('table').each(function (i) {
                var $table = $(this);
                console.log('Table ' + i + ':', 'Class:', $table.attr('class'), 'Rows:', $table.find('tbody tr').length);
            });
            return;
        }

        console.log('✓ Found ' + $appointmentRows.length + ' appointment rows');

        // Get all appointment IDs
        var appointmentIds = [];
        var rowMap = {}; // Map ID to row element

        $appointmentRows.each(function (index) {
            var $row = $(this);

            // Try to get ID from data attribute first
            var appointmentId = $row.attr('data-id');

            // If not found, get from first cell (ID column)
            if (!appointmentId) {
                var $firstCell = $row.find('td').first();
                var cellHtml = $firstCell.html();
                var cellText = $firstCell.text().trim();

                // Extract just the number
                var matches = cellText.match(/^\d+/);
                if (matches) {
                    appointmentId = matches[0];
                }

                console.log('Row ' + index + ' - First cell HTML:', cellHtml.substring(0, 100));
                console.log('Row ' + index + ' - Extracted ID:', appointmentId);
            }

            if (appointmentId && !isNaN(appointmentId)) {
                appointmentId = parseInt(appointmentId);
                appointmentIds.push(appointmentId);
                rowMap[appointmentId] = $row;
            }
        });

        if (appointmentIds.length === 0) {
            console.log('❌ No valid appointment IDs found');
            return;
        }

        console.log('📋 Appointment IDs:', appointmentIds);

        // Use WordPress ajaxurl
        var ajaxUrl = (typeof ajaxurl !== 'undefined') ? ajaxurl : '/wp-admin/admin-ajax.php';
        console.log('🌐 AJAX URL:', ajaxUrl);

        // Fetch collaborative group data via AJAX
        $.ajax({
            url: ajaxUrl,
            type: 'POST',
            data: {
                action: 'bkntc_collab_get_appointment_groups',
                appointment_ids: appointmentIds
            },
            success: function (response) {
                console.log('✓ AJAX Response:', response);

                if (response.success && response.data) {
                    console.log('✓ Collaborative data found:', Object.keys(response.data).length, 'appointments');
                    applyCollaborativeBadges(rowMap, response.data);
                } else {
                    console.log('⚠️ No collaborative data or unsuccessful response');
                }
            },
            error: function (xhr, status, error) {
                console.error('❌ AJAX Failed:', {
                    status: status,
                    error: error,
                    responseText: xhr.responseText.substring(0, 200)
                });
            }
        });
    }

    /**
     * Apply collaborative badges to appointment rows
     */
    function applyCollaborativeBadges(rowMap, collaborativeData) {
        console.log('🎨 Applying badges...');

        var badgesAdded = 0;

        $.each(collaborativeData, function (appointmentId, data) {
            var $row = rowMap[appointmentId];

            if (!$row || $row.length === 0) {
                console.log('⚠️ Row not found for appointment', appointmentId);
                return;
            }

            console.log('Adding badge for appointment', appointmentId, data);
            addCollaborativeBadge($row, appointmentId, data);
            badgesAdded++;
        });

        console.log('✅ Added', badgesAdded, 'collaborative badges');
    }

    /**
     * Add a visual indicator badge to the appointment row
     */
    function addCollaborativeBadge($row, appointmentId, data) {
        var $firstCell = $row.find('td').first();

        // Check if badge already exists
        if ($firstCell.find('.collab-indicator').length > 0) {
            console.log('Badge already exists for', appointmentId);
            return;
        }

        // Create the indicator badge
        var badge = $('<span>', {
            class: 'collab-indicator',
            title: 'Part of collaborative booking group: ' + data.group_id,
            html: '<i class="fa fa-users"></i> ' + data.index + '/' + data.total
        }).css({
            'display': 'inline-block',
            'background': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            'color': 'white',
            'padding': '3px 7px',
            'border-radius': '4px',
            'font-size': '10px',
            'font-weight': 'bold',
            'margin-left': '6px',
            'vertical-align': 'middle',
            'cursor': 'help',
            'box-shadow': '0 2px 4px rgba(0,0,0,0.15)'
        });

        // Add to the first cell (ID column)
        $firstCell.append(badge);

        console.log('✓ Badge added for appointment', appointmentId);
    }

})(jQuery);
