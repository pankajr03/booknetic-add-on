(function($) {
    'use strict';

    // Track staff count from previous step
    var selectedStaffCount = 0;

    // After information step loads - duplicate fields for multiple staff
    bookneticHooks.addAction('loaded_step', function(booknetic, new_step_id) {
        if (new_step_id !== 'information')
            return;

        console.log('Information step loaded, checking for multi-staff booking');
        
        // Get selected staff count
        if (window.BookneticCollaborativeStaff && window.BookneticCollaborativeStaff.selectedStaff) {
            selectedStaffCount = window.BookneticCollaborativeStaff.selectedStaff.length;
            
            // Skip "Any staff" option
            if (selectedStaffCount === 1 && window.BookneticCollaborativeStaff.selectedStaff[0] === -1) {
                selectedStaffCount = 1;
                return; // Don't duplicate for "Any staff"
            }
        } else {
            selectedStaffCount = 1;
            return;
        }

        if (selectedStaffCount <= 1) {
            return; // Single staff, no duplication needed
        }

        console.log('Multi-staff booking detected: ' + selectedStaffCount + ' staff members');
        duplicateGuestFields(booknetic, selectedStaffCount);
    });

    // Validate all guest fields
    bookneticHooks.addFilter('step_validation_information', function(result, booknetic) {
        let booking_panel_js = booknetic.panel_js;

        if (selectedStaffCount <= 1) {
            return result; // Let core validation handle single guest
        }

        var hasError = false;

        // Validate each guest section
        for (var i = 1; i <= selectedStaffCount; i++) {
            var guestSection = booking_panel_js.find('.bkntc_collab_guest_section[data-guest-index="' + i + '"]');
            
            // Check name
            var nameInput = guestSection.find('.bkntc_collab_guest_name');
            if (nameInput.length && nameInput.val().trim() === '') {
                nameInput.addClass('booknetic_input_error');
                hasError = booknetic.__('fill_all_required') || 'Please fill all required fields';
            }

            // Check email
            var emailInput = guestSection.find('.bkntc_collab_guest_email');
            if (emailInput.length) {
                var emailValue = emailInput.val().trim();
                if (emailValue === '') {
                    emailInput.addClass('booknetic_input_error');
                    hasError = booknetic.__('fill_all_required') || 'Please fill all required fields';
                } else {
                    var email_regexp = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
                    if (!email_regexp.test(emailValue.toLowerCase())) {
                        emailInput.addClass('booknetic_input_error');
                        hasError = booknetic.__('email_is_not_valid') || 'Email is not valid';
                    }
                }
            }

            // Check phone
            var phoneInput = guestSection.find('.bkntc_collab_guest_phone');
            if (phoneInput.length) {
                var phoneValue = phoneInput.val().trim();
                if (phoneValue === '') {
                    phoneInput.addClass('booknetic_input_error');
                    hasError = booknetic.__('fill_all_required') || 'Please fill all required fields';
                }
            }
        }

        if (hasError !== false) {
            return {
                status: false,
                errorMsg: hasError
            };
        }

        return result;
    });

    // Helper: Duplicate guest information fields
    function duplicateGuestFields(booknetic, count) {
        var panel = booknetic.panel_js;
        var infoContainer = panel.find('[data-step-id="information"]');

        // Hide original form fields (we'll recreate them)
        infoContainer.find('.form-row').hide();
        infoContainer.find('.booknetic_social_login_facebook, .booknetic_social_login_google').parent().hide();
        infoContainer.find('#booknetic_bring_someone_section').hide();

        // Create container for multiple guest sections
        if (infoContainer.find('.bkntc_collab_guests_container').length === 0) {
            var guestsHtml = '<div class="bkntc_collab_guests_container" style="margin-top: 20px;"></div>';
            infoContainer.prepend(guestsHtml);
        }

        var guestsContainer = infoContainer.find('.bkntc_collab_guests_container');
        guestsContainer.empty();

        // Add header
        var headerHtml = '<div class="bkntc_collab_guests_header" style="padding: 15px; margin-bottom: 20px; background: #f0f7ff; border-left: 4px solid #2196F3; border-radius: 4px;">';
        headerHtml += '<strong>Multi-Staff Booking:</strong> Please provide guest information for each of the ' + count + ' selected staff members.';
        headerHtml += '</div>';
        guestsContainer.append(headerHtml);

        // Create a section for each guest
        for (var i = 1; i <= count; i++) {
            var guestHtml = '<div class="bkntc_collab_guest_section" data-guest-index="' + i + '" style="padding: 20px; margin-bottom: 20px; border: 1px solid #ddd; border-radius: 8px; background: #fff;">';
            guestHtml += '<h4 style="margin-top: 0; color: #2196F3; font-size: 16px; font-weight: 600; margin-bottom: 15px;">Guest #' + i + '</h4>';
            
            // Name field
            guestHtml += '<div class="form-group" style="margin-bottom: 15px;">';
            guestHtml += '<label for="bkntc_collab_guest_name_' + i + '" style="display: block; margin-bottom: 5px; font-weight: 500;">Full Name *</label>';
            guestHtml += '<input type="text" id="bkntc_collab_guest_name_' + i + '" class="form-control bkntc_collab_guest_name" name="collab_guest_name_' + i + '" placeholder="Enter full name" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px;">';
            guestHtml += '</div>';
            
            // Email field
            guestHtml += '<div class="form-group" style="margin-bottom: 15px;">';
            guestHtml += '<label for="bkntc_collab_guest_email_' + i + '" style="display: block; margin-bottom: 5px; font-weight: 500;">Email *</label>';
            guestHtml += '<input type="email" id="bkntc_collab_guest_email_' + i + '" class="form-control bkntc_collab_guest_email" name="collab_guest_email_' + i + '" placeholder="Enter email address" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px;">';
            guestHtml += '</div>';
            
            // Phone field
            guestHtml += '<div class="form-group" style="margin-bottom: 0;">';
            guestHtml += '<label for="bkntc_collab_guest_phone_' + i + '" style="display: block; margin-bottom: 5px; font-weight: 500;">Phone *</label>';
            guestHtml += '<input type="tel" id="bkntc_collab_guest_phone_' + i + '" class="form-control bkntc_collab_guest_phone" name="collab_guest_phone_' + i + '" placeholder="Enter phone number" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px;">';
            guestHtml += '</div>';
            
            guestHtml += '</div>';
            
            guestsContainer.append(guestHtml);
        }

        // Attach input error removal on keyup/change
        guestsContainer.find('.bkntc_collab_guest_name, .bkntc_collab_guest_email, .bkntc_collab_guest_phone').on('keyup change', function() {
            $(this).removeClass('booknetic_input_error');
        });

        console.log('Created ' + count + ' guest information sections');
    }

    // Expose to global scope for debugging
    window.BookneticCollaborativeInformation = {
        selectedStaffCount: function() {
            return selectedStaffCount;
        }
    };

})(jQuery);
