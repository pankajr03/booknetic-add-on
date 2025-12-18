(function($) {
    'use strict';

    // Track staff count from previous step
    var selectedStaffCount = 0;
    var extraGuestCount = 0;
    var guestFieldsCreated = false;
    var guestData = {};

    // After information step loads - duplicate fields for multiple staff
    bookneticHooks.addAction('loaded_step', function(booknetic, new_step_id) {
        if (new_step_id !== 'information')
            return;

        console.log('Information step loaded, checking for multi-staff booking');
        
        // Get selected staff count
        if (window.BookneticCollaborativeStaff && window.BookneticCollaborativeStaff.selectedStaff) {
            selectedStaffCount = window.BookneticCollaborativeStaff.selectedStaff.length;

            // Treat "Any staff" as single
            if (selectedStaffCount === 1 && window.BookneticCollaborativeStaff.selectedStaff[0] === -1) {
                selectedStaffCount = 1;
            }
        } else {
            selectedStaffCount = 1;
        }

        console.log('Selected staff count: ' + selectedStaffCount);
        extraGuestCount = Math.max(0, selectedStaffCount - 1);
        console.log('Extra guest count: ' + extraGuestCount);

        if (extraGuestCount === 0) {
            // Clean up any previous extra sections
            clearExtraGuestFields(booknetic);
            guestFieldsCreated = false;
            console.log('No extra guests needed, cleared any existing sections');
            return;
        }

        console.log('Multi-staff booking detected: ' + selectedStaffCount + ' staff members, creating ' + extraGuestCount + ' extra guest sections');
        duplicateGuestFields(booknetic, extraGuestCount);
        guestFieldsCreated = true;
    });

    // Validate all guest fields - only validates extra guests, doesn't block core validation
    bookneticHooks.addFilter('step_validation_information', function(result, booknetic) {
        let booking_panel_js = booknetic.panel_js;

        // If core validation already failed, return that result
        if (result.status === false) {
            return result;
        }

        // No extra guests to validate
        if (extraGuestCount <= 0) {
            return result;
        }

        console.log('Validating ' + extraGuestCount + ' extra guest sections');

        var hasError = false;

        // Validate each extra guest section
        for (var i = 1; i <= extraGuestCount; i++) {
            console.log('--- Validating guest ' + i + ' ---');
            
            var guestSection = booking_panel_js.find('.bkntc_collab_guest_section[data-guest-index="' + i + '"]').first();
            
            console.log('Checking guest section ' + i + ', exists: ' + (guestSection.length > 0));
            console.log('Guest section HTML length: ' + (guestSection.html() ? guestSection.html().length : 0));
            
            if (guestSection.length === 0) {
                console.log('Guest section ' + i + ' not found, skipping');
                continue;
            }

            // Check name - try multiple selectors
            var nameInput = guestSection.find('.bkntc_collab_guest_name').first();
            console.log('Name input found: ' + (nameInput.length > 0));
            console.log('Name input ID: ' + (nameInput.attr('id') || 'NO ID'));
            console.log('Name input name attr: ' + (nameInput.attr('name') || 'NO NAME'));
            
            if (nameInput.length > 0) {
                console.log('Name input element:', nameInput[0]);
                console.log('Name input.prop("value"):', nameInput.prop('value'));
                console.log('Name input DOM value attr:', nameInput[0].value);
            }
            
            var nameValue = nameInput.length ? nameInput.val().trim() : '';
            // Fallback to guestData if DOM is empty
            if (!nameValue && guestData[i] && guestData[i].name) {
                nameValue = guestData[i].name;
            }
            console.log('Guest #' + (i+1) + ' name value: "' + nameValue + '" (length: ' + nameValue.length + ')');
            console.log('Guest data for #' + i + ':', guestData[i]);
            
            if (nameValue === '') {
                nameInput.addClass('booknetic_input_error');
                hasError = 'Please fill in guest information for all selected staff members';
                console.log('Guest #' + (i+1) + ' name is empty');
            }

            // Check email
            var emailInput = guestSection.find('.bkntc_collab_guest_email').first();
            var emailValue = emailInput.length ? emailInput.val().trim() : '';
            // Fallback to guestData if DOM is empty
            if (!emailValue && guestData[i] && guestData[i].email) {
                emailValue = guestData[i].email;
            }
            console.log('Guest #' + (i+1) + ' email value: "' + emailValue + '"');
            
            if (emailValue === '') {
                emailInput.addClass('booknetic_input_error');
                hasError = 'Please fill in guest information for all selected staff members';
                console.log('Guest #' + (i+1) + ' email is empty');
            } else {
                var email_regexp = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
                if (!email_regexp.test(emailValue.toLowerCase())) {
                    emailInput.addClass('booknetic_input_error');
                    hasError = 'Email is not valid for guest #' + (i + 1);
                    console.log('Guest #' + (i+1) + ' email is invalid');
                }
            }

            // Check phone
            var phoneInput = guestSection.find('.bkntc_collab_guest_phone').first();
            var phoneValue = phoneInput.length ? phoneInput.val().trim() : '';
            // Fallback to guestData if DOM is empty
            if (!phoneValue && guestData[i] && guestData[i].phone) {
                phoneValue = guestData[i].phone;
            }
            console.log('Guest #' + (i+1) + ' phone value: "' + phoneValue + '"');
            
            if (phoneValue === '') {
                phoneInput.addClass('booknetic_input_error');
                hasError = 'Please fill in guest information for all selected staff members';
                console.log('Guest #' + (i+1) + ' phone is empty');
            }
        }

        if (hasError !== false) {
            console.log('Extra guest validation failed: ' + hasError);
            return {
                status: false,
                errorMsg: hasError
            };
        }

        console.log('Extra guest validation passed');
        return result;
    });

    // Helper: Duplicate guest information fields
    function duplicateGuestFields(booknetic, count) {
        console.log('duplicateGuestFields called with count: ' + count);
        
        var panel = booknetic.panel_js;
        var infoContainer = panel.find('[data-step-id="information"]');
        
        console.log('Information container found: ' + (infoContainer.length > 0));

        // Create container for extra guest sections
        if (infoContainer.find('.bkntc_collab_guests_container').length === 0) {
            var guestsHtml = '<div class="bkntc_collab_guests_container" style="margin-top: 20px;"></div>';
            infoContainer.append(guestsHtml);
            console.log('Created new guests container');
        }

        var guestsContainer = infoContainer.find('.bkntc_collab_guests_container');
        console.log('Guests container exists: ' + (guestsContainer.length > 0));

        // Check if sections already exist with the correct count
        var existingSections = guestsContainer.find('.bkntc_collab_guest_section').length;
        console.log('Existing sections: ' + existingSections + ', required: ' + count);
        
        if (existingSections === count && guestsContainer.find('.bkntc_collab_guests_header').length > 0) {
            console.log('Guest sections already exist with correct count (' + count + '), preserving existing data');
            return;
        }

        // Clear container only if count changed
        console.log('Clearing container and recreating sections');
        guestsContainer.empty();

        // Add header
        var headerHtml = '<div class="bkntc_collab_guests_header" style="padding: 15px; margin-bottom: 20px; background: #f0f7ff; border-left: 4px solid #2196F3; border-radius: 4px;">';
        headerHtml += '<strong>Multi-Staff Booking:</strong> Please add guest information for each additional staff member (' + count + ' more). Your own details stay as the primary customer.';
        headerHtml += '</div>';
        guestsContainer.append(headerHtml);

        // Create a section for each extra guest (starting from #2)
        for (var i = 1; i <= count; i++) {
            var guestNumber = i + 1; // Customer is #1
            var guestHtml = '<div class="bkntc_collab_guest_section" data-guest-index="' + i + '" style="padding: 20px; margin-bottom: 20px; border: 1px solid #ddd; border-radius: 8px; background: #fff;">';
            guestHtml += '<h4 style="margin-top: 0; color: #2196F3; font-size: 16px; font-weight: 600; margin-bottom: 15px;">Guest #' + guestNumber + '</h4>';
            
            // Name field
            guestHtml += '<div class="form-group" style="margin-bottom: 15px;">';
            guestHtml += '<label for="bkntc_collab_guest_name_' + i + '" style="display: block; margin-bottom: 5px; font-weight: 500;">Full Name *</label>';
            var storedName = guestData[i] && guestData[i].name ? guestData[i].name : '';
            guestHtml += '<input type="text" id="bkntc_collab_guest_name_' + i + '" class="form-control bkntc_collab_guest_name" name="collab_guest_name_' + i + '" placeholder="Enter full name" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px;" data-guest-index="' + i + '" value="' + storedName + '">';
            guestHtml += '</div>';
            
            // Email field
            guestHtml += '<div class="form-group" style="margin-bottom: 15px;">';
            guestHtml += '<label for="bkntc_collab_guest_email_' + i + '" style="display: block; margin-bottom: 5px; font-weight: 500;">Email *</label>';
            var storedEmail = guestData[i] && guestData[i].email ? guestData[i].email : '';
            guestHtml += '<input type="email" id="bkntc_collab_guest_email_' + i + '" class="form-control bkntc_collab_guest_email" name="collab_guest_email_' + i + '" placeholder="Enter email address" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px;" data-guest-index="' + i + '" value="' + storedEmail + '">';
            guestHtml += '</div>';
            
            // Phone field
            guestHtml += '<div class="form-group" style="margin-bottom: 0;">';
            guestHtml += '<label for="bkntc_collab_guest_phone_' + i + '" style="display: block; margin-bottom: 5px; font-weight: 500;">Phone *</label>';
            var storedPhone = guestData[i] && guestData[i].phone ? guestData[i].phone : '';
            guestHtml += '<input type="tel" id="bkntc_collab_guest_phone_' + i + '" class="form-control bkntc_collab_guest_phone" name="collab_guest_phone_' + i + '" placeholder="Enter phone number" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px;" data-guest-index="' + i + '" value="' + storedPhone + '">';
            guestHtml += '</div>';
            
            guestHtml += '</div>';
            
            guestsContainer.append(guestHtml);
            console.log('Created guest section ' + i + ' with ID: bkntc_collab_guest_name_' + i);
        }

        // Attach input error removal on keyup/change
        guestsContainer.find('.bkntc_collab_guest_name, .bkntc_collab_guest_email, .bkntc_collab_guest_phone').on('keyup change input', function() {
            $(this).removeClass('booknetic_input_error');
            var idx = parseInt($(this).data('guest-index'));
            if (!guestData[idx]) {
                guestData[idx] = {};
            }
            if ($(this).hasClass('bkntc_collab_guest_name')) {
                guestData[idx].name = $(this).val();
                console.log('Guest ' + idx + ' name saved: ' + $(this).val());
            } else if ($(this).hasClass('bkntc_collab_guest_email')) {
                guestData[idx].email = $(this).val();
                console.log('Guest ' + idx + ' email saved: ' + $(this).val());
            } else if ($(this).hasClass('bkntc_collab_guest_phone')) {
                guestData[idx].phone = $(this).val();
                console.log('Guest ' + idx + ' phone saved: ' + $(this).val());
            }
        });

        console.log('Created ' + count + ' extra guest information sections');
        console.log('guestData state:', guestData);
    }

    function clearExtraGuestFields(booknetic) {
        var panel = booknetic.panel_js;
        var infoContainer = panel.find('[data-step-id="information"]');
        infoContainer.find('.bkntc_collab_guests_container').remove();
        guestFieldsCreated = false;
        guestData = {};
    }

    // Expose to global scope for debugging
    window.BookneticCollaborativeInformation = {
        selectedStaffCount: function() {
            return selectedStaffCount;
        }
    };

})(jQuery);
