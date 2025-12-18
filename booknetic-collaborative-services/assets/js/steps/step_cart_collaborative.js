(function($) {
    'use strict';

    // After cart step loads - modify staff display to show all selected staff
    bookneticHooks.addAction('loaded_step', function(booknetic, new_step_id) {
        if (new_step_id !== 'cart')
            return;

        console.log('Cart step loaded, checking for collaborative staff in cart items');
        
        setTimeout(function() {
            modifyCartStaffDisplay(booknetic);
        }, 200);
    });

    // Helper: Modify cart display to show all selected staff
    function modifyCartStaffDisplay(booknetic) {
        var panel = booknetic.panel_js;
        
        // Loop through all cart items
        booknetic.cartArr.forEach(function(cartItem, index) {
            console.log('Processing cart item ' + index + ':', cartItem);
            
            if (!cartItem.collaborative_staff || cartItem.collaborative_staff.length === 0) {
                console.log('Cart item ' + index + ' has no collaborative staff');
                return;
            }

            var selectedStaff = cartItem.collaborative_staff;
            console.log('Cart item ' + index + ' has collaborative staff:', selectedStaff);

            // Find the corresponding cart row in the DOM
            var cartRow = panel.find('.booknetic-cart-col[data-index="' + index + '"]');
            if (cartRow.length === 0) {
                console.log('Cart row for item ' + index + ' not found');
                return;
            }

            // Find the staff display row within this cart item
            var staffDisplay = cartRow.find('.booknetic-cart-item-body-row').filter(function() {
                var firstCell = $(this).find('.booknetic-cart-item-body-cell').first();
                return firstCell.text().toLowerCase().includes('staff');
            });

            if (staffDisplay.length === 0) {
                console.log('Staff display not found for cart item ' + index);
                return;
            }

            console.log('Updating staff display for cart item ' + index);

            // Build multi-staff display
            var staffHtml = '<strong style="display: block; color: #2196F3; margin-bottom: 5px;">Selected Staff (' + selectedStaff.length + '):</strong>';
            staffHtml += '<ul style="margin: 0; padding-left: 18px; font-size: 13px;">';

            selectedStaff.forEach(function(staffId) {
                if (staffId === -1) {
                    staffHtml += '<li>Any Available Staff</li>';
                } else {
                    // Try to get staff name from the stored data or just show ID
                    var staffName = 'Staff #' + staffId;
                    
                    // Look for staff name in the booking panel data if available
                    var staffCard = panel.find('[data-step-id="staff"] .booknetic_card[data-id="' + staffId + '"]');
                    if (staffCard.length > 0) {
                        var nameElement = staffCard.find('.booknetic_card_title, .booknetic_card_name');
                        if (nameElement.length > 0) {
                            staffName = nameElement.text().trim();
                        }
                    }
                    
                    staffHtml += '<li>' + staffName + '</li>';
                }
            });

            staffHtml += '</ul>';

            // Replace the staff value in the cart item (second cell in the row)
            var valueElement = staffDisplay.find('.booknetic-cart-item-body-cell').eq(1);
            if (valueElement.length > 0) {
                valueElement.html(staffHtml);
                console.log('Updated cart item ' + index + ' staff display with ' + selectedStaff.length + ' staff');
            } else {
                console.log('Value element not found in staff row');
            }
        });
    }

})(jQuery);
