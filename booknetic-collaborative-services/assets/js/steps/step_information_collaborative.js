// alert('Booknetic: step_information_collaborative.js loaded! (top)');
console.log('Booknetic: typeof $:', typeof jQuery);
console.log('Booknetic: typeof bookneticHooks:', typeof bookneticHooks);
// Helper: Create guest information fields for guest-assigned services
function createGuestFields(booknetic, guestServices, guestInfoRequired, guestData) {
    console.log('[createGuestFields] called with', guestServices.length, 'guest services');
    var panel = booknetic.panel_js;
    var infoContainer = panel.find('.booknetic_appointment_container_body [data-step-id="information"]');
    console.log('[createGuestFields] infoContainer found:', infoContainer.length);
    if (infoContainer.length === 0) {
        console.error('[createGuestFields] Information step container not found!');
        return;
    }
    if (infoContainer.find('.bkntc_collab_guests_container').length === 0) {
        var guestsHtml = '<div class="bkntc_collab_guests_container" style="margin-top: 20px;"></div>';
        infoContainer.append(guestsHtml);
        console.log('[createGuestFields] Created new guests container');
    }
    var guestsContainer = infoContainer.find('.bkntc_collab_guests_container');
    console.log('[createGuestFields] guestsContainer exists:', guestsContainer.length);
    guestsContainer.empty();
    var headerHtml = '<div class="bkntc_collab_guests_header" style="padding: 15px; margin-bottom: 20px; background: #fff3e0; border-left: 4px solid #FF9800; border-radius: 4px;">';
    headerHtml += '<strong style="color: #E65100;">Guest Services:</strong> Please provide guest information for each service assigned to a guest (' + guestServices.length + ' service' + (guestServices.length > 1 ? 's' : '') + '). Your own details are already filled as the primary customer.';
    headerHtml += '</div>';
    guestsContainer.append(headerHtml);
    var serviceNames = {};
    panel.find('.booknetic_service_card').each(function () {
        var card = jQuery(this);
        var serviceId = card.data('id');
        var serviceName = card.find('.booknetic_service_card_title').text().trim();
        if (serviceId && serviceName) {
            serviceNames[serviceId] = serviceName;
        }
    });
    for (var i = 0; i < guestServices.length; i++) {
        var service = guestServices[i];
        var serviceId = service.service_id;
        var serviceName = serviceNames[serviceId] || 'Service #' + serviceId;
        var requiredMark = guestInfoRequired ? ' *' : ' (optional)';
        var requiredAttr = guestInfoRequired ? 'required' : '';
        var guestHtml = '<div class="bkntc_collab_guest_section" data-service-id="' + serviceId + '" style="padding: 20px; margin-bottom: 20px; border: 1px solid #ddd; border-radius: 8px; background: #fff;">';
        guestHtml += '<h4 style="margin-top: 0; color: #FF9800; font-size: 16px; font-weight: 600; margin-bottom: 5px;">Guest for: ' + serviceName + '</h4>';
        guestHtml += '<p style="margin: 0 0 15px 0; font-size: 13px; color: #666;">This service will be booked for the guest whose details you provide below.</p>';
        guestHtml += '<div class="form-group" style="margin-bottom: 15px;">';
        guestHtml += '<label for="bkntc_collab_guest_name_' + serviceId + '" style="display: block; margin-bottom: 5px; font-weight: 500;">Full Name' + requiredMark + '</label>';
        var storedName = guestData[serviceId] && guestData[serviceId].name ? guestData[serviceId].name : '';
        guestHtml += '<input type="text" id="bkntc_collab_guest_name_' + serviceId + '" class="form-control bkntc_collab_guest_name" name="collab_guest_name_' + serviceId + '" placeholder="Enter guest full name" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px;" data-service-id="' + serviceId + '" value="' + storedName + '" ' + requiredAttr + '>';
        guestHtml += '</div>';
        guestHtml += '<div class="form-group" style="margin-bottom: 15px;">';
        guestHtml += '<label for="bkntc_collab_guest_email_' + serviceId + '" style="display: block; margin-bottom: 5px; font-weight: 500;">Email' + requiredMark + '</label>';
        var storedEmail = guestData[serviceId] && guestData[serviceId].email ? guestData[serviceId].email : '';
        guestHtml += '<input type="email" id="bkntc_collab_guest_email_' + serviceId + '" class="form-control bkntc_collab_guest_email" name="collab_guest_email_' + serviceId + '" placeholder="Enter guest email address" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px;" data-service-id="' + serviceId + '" value="' + storedEmail + '" ' + requiredAttr + '>';
        guestHtml += '</div>';
        guestHtml += '<div class="form-group" style="margin-bottom: 0;">';
        guestHtml += '<label for="bkntc_collab_guest_phone_' + serviceId + '" style="display: block; margin-bottom: 5px; font-weight: 500;">Phone' + requiredMark + '</label>';
        var storedPhone = guestData[serviceId] && guestData[serviceId].phone ? guestData[serviceId].phone : '';
        guestHtml += '<input type="tel" id="bkntc_collab_guest_phone_' + serviceId + '" class="form-control bkntc_collab_guest_phone" name="collab_guest_phone_' + serviceId + '" placeholder="Enter guest phone number" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px;" data-service-id="' + serviceId + '" value="' + storedPhone + '" ' + requiredAttr + '>';
        guestHtml += '</div>';
        guestHtml += '</div>';
        guestsContainer.append(guestHtml);
        console.log('[createGuestFields] Created guest section for service', serviceId, serviceName);
    }
    guestsContainer.find('.bkntc_collab_guest_name, .bkntc_collab_guest_email, .bkntc_collab_guest_phone').on('keyup change input', function () {
        jQuery(this).removeClass('booknetic_input_error');
        var serviceId = parseInt(jQuery(this).data('service-id'));
        if (!guestData[serviceId]) {
            guestData[serviceId] = {};
        }
        if (jQuery(this).hasClass('bkntc_collab_guest_name')) {
            guestData[serviceId].name = $(this).val();
            console.log('[createGuestFields] Guest for service', serviceId, 'name saved:', $(this).val());
        } else if ($(this).hasClass('bkntc_collab_guest_email')) {
            guestData[serviceId].email = $(this).val();
            console.log('[createGuestFields] Guest for service', serviceId, 'email saved:', $(this).val());
        } else if ($(this).hasClass('bkntc_collab_guest_phone')) {
            guestData[serviceId].phone = $(this).val();
            console.log('[createGuestFields] Guest for service', serviceId, 'phone saved:', $(this).val());
        }
    });
    console.log('[createGuestFields] Created', guestServices.length, 'guest information sections');
    console.log('[createGuestFields] guestData state:', guestData);
}


// Helper: Clear guest fields (if you have this function, move its definition here)
function clearGuestFields(booknetic) {
    var panel = booknetic.panel_js;
    var infoContainer = panel.find('.booknetic_appointment_container_body [data-step-id="information"]');
    var guestsContainer = infoContainer.find('.bkntc_collab_guests_container');
    if (guestsContainer.length > 0) {
        guestsContainer.empty();
    }
}

// Helper: Save guest data (if you have this function, move its definition here)
function saveGuestData(booknetic) {
    // ...existing code for saveGuestData if present...
}

jQuery(function ($) {
    // DEBUG: Confirm script is loaded
    // Read required/optional setting from localized script
    var guestInfoRequired = (window.BookneticCollabFrontend && window.BookneticCollabFrontend.guest_info_required === 'required');
    'use strict';

    // Track guest services (services assigned to "Guest")
    var guestServices = [];
    var guestFieldsCreated = false;
    var guestData = {}; // {service_id: {name, email, phone, service_name}}

    // After information step loads - create guest fields for services assigned to "Guest"
    bookneticHooks.addAction('loaded_step', function (booknetic, new_step_id) {
        if (new_step_id !== 'information')
            return;

        console.log('=== STEP 6: Information Step Loaded ===');
        console.log('Checking for guest-assigned services');

        // Get selected services from collaborative service module
        var selectedServices = [];
        console.log('Found services from window.collaborativeService:');
        // Try multiple sources to get service data
        if (window.collaborativeService && window.collaborativeService.selectedServices) {
            selectedServices = window.collaborativeService.selectedServices;
            console.log('Found services from window.collaborativeService:', selectedServices);
        } else if (booknetic.panel_js.data('collaborative-selected-services')) {
            selectedServices = booknetic.panel_js.data('collaborative-selected-services');
            console.log('Found services from panel data:', selectedServices);
        }

        // Filter services assigned to "guest"
        guestServices = [];
        if (selectedServices && selectedServices.length > 0) {
            guestServices = selectedServices.filter(function (service) {
                return service.assigned_to === 'guest';
            });
            console.log('Guest-assigned services found:', guestServices.length);
            console.log('Guest services:', guestServices);
        } else {
            console.log('No services data found or empty');
        }

        // If no guest services, clean up any existing fields
        if (guestServices.length === 0) {
            clearGuestFields(booknetic);
            guestFieldsCreated = false;
            console.log('No guest services, cleared any existing guest fields');
            return;
        }

        console.log('Creating guest information fields for ' + guestServices.length + ' guest-assigned services');

        // Use a small delay to ensure DOM is fully ready
        setTimeout(function () {
            createGuestFields(booknetic, guestServices, guestInfoRequired, guestData);
            guestFieldsCreated = true;
        }, 100);
    });

    // Before leaving information step, save all guest data
    bookneticHooks.addAction('before_next_step_information', function (booknetic) {
        console.log('Saving guest data before leaving information step');
        saveGuestData(booknetic);
    });

    // Hook to add guest data to cart
    bookneticHooks.addFilter('bkntc_cart', function (cartItem, booknetic) {
        if (guestServices.length > 0 && Object.keys(guestData).length > 0) {
            cartItem.guest_data = guestData;
            cartItem.guest_services = guestServices;
            console.log('Added guest data to cart:', cartItem.guest_data);
            console.log('Added guest services to cart:', cartItem.guest_services);
        }
        return cartItem;
    });

    // Validate all guest fields - validates guest information for guest-assigned services
    bookneticHooks.addFilter('step_validation_information', function (result, booknetic) {
        let booking_panel_js = booknetic.panel_js;

        // If core validation already failed, return that result
        if (result.status === false) {
            return result;
        }

        // No guest services to validate
        if (guestServices.length === 0) {
            console.log('No guest services, skipping guest validation');
            return result;
        }

        console.log('Validating ' + guestServices.length + ' guest service sections');

        var hasError = false;

        // Validate each guest service section
        for (var i = 0; i < guestServices.length; i++) {
            var serviceId = guestServices[i].service_id;
            console.log('--- Validating guest service ' + serviceId + ' ---');

            // Use specific selector to target only content area, not navigation
            var guestSection = booking_panel_js.find('.booknetic_appointment_container_body .bkntc_collab_guest_section[data-service-id="' + serviceId + '"]').first();

            console.log('Checking guest section for service ' + serviceId + ', exists: ' + (guestSection.length > 0));

            if (guestSection.length === 0) {
                console.log('Guest section for service ' + serviceId + ' not found, skipping');
                continue;
            }

            // Check name
            var nameInput = guestSection.find('.bkntc_collab_guest_name').first();
            var nameValue = nameInput.length ? nameInput.val().trim() : '';
            // Fallback to guestData if DOM is empty
            if (!nameValue && guestData[serviceId] && guestData[serviceId].name) {
                nameValue = guestData[serviceId].name;
            }
            console.log('Guest service ' + serviceId + ' name value: "' + nameValue + '"');

            if (guestInfoRequired && nameValue === '') {
                nameInput.addClass('booknetic_input_error');
                hasError = 'Please fill in guest information for all guest-assigned services';
                console.log('Guest service ' + serviceId + ' name is empty');
            }

            // Check email
            var emailInput = guestSection.find('.bkntc_collab_guest_email').first();
            var emailValue = emailInput.length ? emailInput.val().trim() : '';
            // Fallback to guestData if DOM is empty
            if (!emailValue && guestData[serviceId] && guestData[serviceId].email) {
                emailValue = guestData[serviceId].email;
            }
            console.log('Guest service ' + serviceId + ' email value: "' + emailValue + '"');

            if (guestInfoRequired && emailValue === '') {
                emailInput.addClass('booknetic_input_error');
                hasError = 'Please fill in guest information for all guest-assigned services';
                console.log('Guest service ' + serviceId + ' email is empty');
            } else if (emailValue) {
                var email_regexp = /^(([^<>()\[\]\\.,;:\s@\"]+(\.[^<>()\[\]\\.,;:\s@\"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
                if (!email_regexp.test(emailValue.toLowerCase())) {
                    emailInput.addClass('booknetic_input_error');
                    hasError = 'Email is not valid for guest service ' + serviceId;
                    console.log('Guest service ' + serviceId + ' email is invalid');
                }
            }

            // Check phone
            var phoneInput = guestSection.find('.bkntc_collab_guest_phone').first();
            var phoneValue = phoneInput.length ? phoneInput.val().trim() : '';
            // Fallback to guestData if DOM is empty
            if (!phoneValue && guestData[serviceId] && guestData[serviceId].phone) {
                phoneValue = guestData[serviceId].phone;
            }
            console.log('Guest service ' + serviceId + ' phone value: "' + phoneValue + '"');

            if (guestInfoRequired && phoneValue === '') {
                phoneInput.addClass('booknetic_input_error');
                hasError = 'Please fill in guest information for all guest-assigned services';
                console.log('Guest service ' + serviceId + ' phone is empty');
            }
        }

        if (hasError !== false) {
            console.log('Guest validation failed: ' + hasError);
            return {
                status: false,
                errorMsg: hasError
            };
        }

        console.log('Guest validation passed');
        return result;
    });
});
// Helper: Create guest information fields for guest-assigned services
