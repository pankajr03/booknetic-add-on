(function($) {
    'use strict';

    // After confirm details step loads - display all selected staff
    bookneticHooks.addAction('loaded_step', function(booknetic, new_step_id) {
        if (new_step_id !== 'confirm_details')
            return;

        console.log('Confirm details step loaded, displaying collaborative staff info');
        setTimeout(function() {
            displayCollaborativeStaffInfo(booknetic);
        }, 100);
    });

    // Helper: Display all selected staff on confirm page
    function displayCollaborativeStaffInfo(booknetic) {
        var panel = booknetic.panel_js;
        var confirmContainer = panel.find('[data-step-id="confirm_details"]');

        if (confirmContainer.length === 0) {
            console.log('Confirm container not found');
            return;
        }

        // Get collaborative staff data from cart
        var cartData = booknetic.cartArr[booknetic.cartCurrentIndex];
        console.log('Cart data:', cartData);
        console.log('collaborative_staff in cart:', cartData.collaborative_staff);
        
        if (!cartData || !cartData.collaborative_staff || cartData.collaborative_staff.length === 0) {
            console.log('No collaborative staff data found');
            return;
        }

        var selectedStaff = cartData.collaborative_staff;
        console.log('Displaying collaborative staff:', selectedStaff);

        // Find existing staff display - look for the staff item in the confirm list
        var confirmItems = confirmContainer.find('.booknetic_confirm_item');
        console.log('Confirm items found:', confirmItems.length);
        
        var staffItem = null;
        confirmItems.each(function() {
            var label = $(this).find('.booknetic_confirm_item_label').text();
            console.log('Confirm item label:', label);
            if (label.toLowerCase().includes('staff') || label === 'Staff') {
                staffItem = $(this);
                return false;
            }
        });

        if (!staffItem || staffItem.length === 0) {
            console.log('No staff item found in confirm details');
            return;
        }

        console.log('Staff item found, updating with collaborative staff');

        // Build multi-staff display HTML
        var staffHtml = '<div class="bkntc_collab_confirm_staff_display">';
        staffHtml += '<strong style="color: #2196F3;">Selected Staff (' + selectedStaff.length + '):</strong>';
        staffHtml += '<ul style="margin: 8px 0 0 20px; padding: 0;">';

        // Display all selected staff
        selectedStaff.forEach(function(staffId, index) {
            if (staffId === -1) {
                staffHtml += '<li>Any Available Staff</li>';
            } else {
                staffHtml += '<li>Staff ID: ' + staffId + '</li>';
            }
        });

        staffHtml += '</ul></div>';

        // Replace the staff value display
        var valueElement = staffItem.find('.booknetic_confirm_item_value');
        if (valueElement.length > 0) {
            valueElement.html(staffHtml);
            console.log('Staff display updated with ' + selectedStaff.length + ' staff members');
        } else {
            console.log('Value element not found in staff item');
        }
    }

})(jQuery);
