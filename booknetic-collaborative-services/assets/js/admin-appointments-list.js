/**
 * Admin Appointments List - Collaborative Booking Display
 * Shows visual indicators for appointments that are part of a collaborative booking group
 */

(function($) {
    'use strict';

    // Initialize when document is ready
    $(document).ready(function() {
        console.log('🔧 Initializing collaborative booking admin display...');
        
        // Watch for DataTable redraws
        setTimeout(function() {
            enhanceAppointmentsList();
        }, 1000);
        
        // Also enhance after AJAX calls (filtering, pagination, etc.)
        $(document).ajaxComplete(function() {
            setTimeout(function() {
                enhanceAppointmentsList();
            }, 500);
        });
    });

    /**
     * Enhance the appointments table to show collaborative booking groups
     */
    function enhanceAppointmentsList() {
        console.log('🔄 Enhancing appointments list for collaborative bookings...');
        
        // Get all appointment rows
        var $appointmentRows = $('.fs_data_table tbody tr');
        
        if ($appointmentRows.length === 0) {
            console.log('No appointment rows found');
            return;
        }
        
        console.log('Found ' + $appointmentRows.length + ' appointment rows');
        
        // Track which groups we've already marked
        var processedGroups = {};
        
        $appointmentRows.each(function(index) {
            var $row = $(this);
            
            // Skip if already processed
            if ($row.hasClass('collab-processed')) {
                return;
            }
            
            // Get the appointment ID from the row (usually in a data attribute or first cell)
            var appointmentId = $row.find('td:first').text().trim() || $row.attr('data-id');
            
            if (!appointmentId) {
                console.log('No appointment ID found for row ' + index);
                return;
            }
            
            // Mark as processed
            $row.addClass('collab-processed');
            
            // Check if this appointment has collaborative data (we'll add this via PHP filter)
            var collaborativeGroupId = $row.attr('data-collaborative-group');
            var collaborativeIndex = $row.attr('data-collaborative-index');
            var collaborativeTotal = $row.attr('data-collaborative-total');
            
            if (collaborativeGroupId) {
                console.log('Found collaborative appointment:', {
                    id: appointmentId,
                    group: collaborativeGroupId,
                    index: collaborativeIndex,
                    total: collaborativeTotal
                });
                
                // Add visual indicator
                addCollaborativeIndicator($row, collaborativeGroupId, collaborativeIndex, collaborativeTotal);
                
                // Track this group
                if (!processedGroups[collaborativeGroupId]) {
                    processedGroups[collaborativeGroupId] = [];
                }
                processedGroups[collaborativeGroupId].push($row);
            }
        });
        
        // Apply grouping styles
        applyGroupStyles(processedGroups);
    }

    /**
     * Add a visual indicator badge to the appointment row
     */
    function addCollaborativeIndicator($row, groupId, index, total) {
        // Check if indicator already exists
        if ($row.find('.collab-indicator').length > 0) {
            return;
        }
        
        // Create the indicator badge
        var badge = $('<span>', {
            class: 'collab-indicator',
            title: 'Part of collaborative booking group: ' + groupId,
            html: '<i class="fa fa-users"></i> ' + index + '/' + total
        }).css({
            'display': 'inline-block',
            'background': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            'color': 'white',
            'padding': '4px 8px',
            'border-radius': '4px',
            'font-size': '11px',
            'font-weight': 'bold',
            'margin-left': '8px',
            'vertical-align': 'middle',
            'cursor': 'help',
            'box-shadow': '0 2px 4px rgba(0,0,0,0.15)'
        });
        
        // Add to the first cell (usually the ID column)
        $row.find('td:first').append(badge);
        
        // Add a left border to make the group visually connected
        $row.css({
            'border-left': '4px solid #667eea',
            'background-color': index === '1' ? '#f8f9ff' : '#ffffff'
        });
    }

    /**
     * Apply visual grouping to related appointments
     */
    function applyGroupStyles(processedGroups) {
        $.each(processedGroups, function(groupId, rows) {
            if (rows.length < 2) {
                return; // Not really a group
            }
            
            console.log('Styling group ' + groupId + ' with ' + rows.length + ' appointments');
            
            // Add a connector line or grouping box
            var $firstRow = rows[0];
            var $lastRow = rows[rows.length - 1];
            
            // Add a subtle background to grouped rows
            $.each(rows, function(idx, $row) {
                $row.css({
                    'background-color': idx % 2 === 0 ? '#f8f9ff' : '#ffffff'
                });
                
                // Add border between different groups
                if (idx === rows.length - 1) {
                    $row.css('border-bottom', '2px solid #e0e0e0');
                }
            });
            
            // Add a "show group" button to the first appointment
            if ($firstRow.find('.collab-group-toggle').length === 0) {
                var toggleBtn = $('<button>', {
                    class: 'collab-group-toggle',
                    html: '<i class="fa fa-compress"></i> Collapse Group',
                    title: 'Hide/show related appointments in this group'
                }).css({
                    'margin-left': '10px',
                    'padding': '2px 8px',
                    'font-size': '11px',
                    'background': '#fff',
                    'border': '1px solid #667eea',
                    'color': '#667eea',
                    'border-radius': '3px',
                    'cursor': 'pointer'
                }).on('click', function(e) {
                    e.stopPropagation();
                    toggleGroupRows(rows, $(this));
                });
                
                $firstRow.find('td:first').append(toggleBtn);
            }
        });
    }

    /**
     * Toggle visibility of grouped appointments
     */
    function toggleGroupRows(rows, $button) {
        // Skip the first row (keep it visible)
        var $rowsToToggle = rows.slice(1);
        
        var isVisible = $rowsToToggle[0].is(':visible');
        
        if (isVisible) {
            // Hide the group
            $.each($rowsToToggle, function(idx, $row) {
                $row.slideUp(200);
            });
            $button.html('<i class="fa fa-expand"></i> Expand Group (' + $rowsToToggle.length + ')');
        } else {
            // Show the group
            $.each($rowsToToggle, function(idx, $row) {
                $row.slideDown(200);
            });
            $button.html('<i class="fa fa-compress"></i> Collapse Group');
        }
    }

})(jQuery);
