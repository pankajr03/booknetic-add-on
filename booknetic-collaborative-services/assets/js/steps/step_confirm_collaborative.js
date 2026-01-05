(function ($) {
    'use strict';

    // After confirm details step loads
    bookneticHooks.addAction('loaded_step', function (booknetic, new_step_id) {
        if (new_step_id !== 'confirm_details') return;

        console.log('Confirm details step loaded (collaborative fix)');
        setTimeout(function () {
            displayCollaborativeStaffInfo(booknetic);
        }, 100);
    });

    function displayCollaborativeStaffInfo(booknetic) {
        var panel = booknetic.panel_js;
        var confirmContainer = panel.find('[data-step-id="confirm_details"]');

        if (confirmContainer.length === 0) return;
        if (!Array.isArray(booknetic.cartArr) || booknetic.cartArr.length === 0) return;

        // Find staff row in confirm list
        var staffItem = null;
        confirmContainer.find('.booknetic_confirm_item').each(function () {
            var label = $(this)
                .find('.booknetic_confirm_item_label')
                .text()
                .toLowerCase();

            if (label.includes('staff')) {
                staffItem = $(this);
                return false;
            }
        });

        if (!staffItem) return;

        // Build correct staff list from cart items
        var staffHtml = '<div class="bkntc_collab_confirm_staff_display">';
        staffHtml += '<strong style="color:#2196F3;">Selected Staff:</strong>';
        staffHtml += '<ul style="margin:8px 0 0 20px; padding:0;">';

        booknetic.cartArr.forEach(function (cartItem, index) {
            var staffLabel = 'Any Available Staff';

            if (cartItem.staff && cartItem.staff !== -1) {
                staffLabel = 'Staff ID: ' + cartItem.staff;

                // Try to resolve staff name from DOM
                var staffCard = panel.find(
                    '[data-step-id="staff"] .booknetic_card[data-id="' + cartItem.staff + '"]'
                );

                if (staffCard.length > 0) {
                    var nameEl = staffCard.find('.booknetic_card_title, .booknetic_card_name');
                    if (nameEl.length > 0) {
                        staffLabel = nameEl.text().trim();
                    }
                }
            }

            staffHtml += '<li>Service #' + cartItem.service + ' → <strong>' + staffLabel + '</strong></li>';
        });

        staffHtml += '</ul></div>';

        // Inject HTML
        var valueElement = staffItem.find('.booknetic_confirm_item_value');
        if (valueElement.length > 0) {
            valueElement.html(staffHtml);
        }
    }

})(jQuery);
