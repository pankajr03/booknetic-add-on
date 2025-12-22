(function($) {
    'use strict';

    console.log('=== DateTime-Staff Collaborative Script Loaded ===');

    var collaborativeDateTimeStaff = {
        isMultiServiceMode: false,
        selectedServices: [],
        selectedDateTime: null,
        selectedStaff: {}, // {service_id: [staff_ids]}
        availableStaff: {},
        currentView: 'date' // 'date' or 'staff'
    };

    // Hook before any step loads - handle navigation logic
    bookneticHooks.addAction('before_step_loading', function(booknetic, new_step_id, old_step_id) {
        var isDateTimeStep = (new_step_id === 'date_time' || 
                              new_step_id === 'date_time_recurring' || 
                              new_step_id === 'date_time_non_recurring' ||
                              new_step_id === 'date_time_staff_combined');
        
        var isStaffStep = (new_step_id === 'staff');
        
        // Hide hint when leaving datetime step
        if (old_step_id && (old_step_id === 'date_time' || old_step_id === 'date_time_recurring' || old_step_id === 'date_time_non_recurring')) {
            $('.booknetic_collab_datetime_hint').hide();
            $('.booknetic_collab_staff_section').hide();
        }
        
        // STEP 5: Skip staff step if in multi-service mode (already handled in combined step)
        if (isStaffStep && collaborativeDateTimeStaff.isMultiServiceMode) {
            console.log('=== STEP 5: Skipping separate staff step (already handled in combined datetime-staff) ===');
            
            // Automatically move to next step
            setTimeout(function() {
                booknetic.moveNextStep();
            }, 100);
            return;
        }
        
        if (!isDateTimeStep) {
            return;
        }

        console.log('DateTime-Staff Collaborative: Before datetime step loading, step:', new_step_id);
        
        // Check if we're in multi-service mode
        checkMultiServiceMode(booknetic);
        
        // For the combined step, force multi-service mode
        if (new_step_id === 'date_time_staff_combined') {
            console.log('DateTime-Staff Collaborative: Combined step detected, forcing multi-service mode');
            collaborativeDateTimeStaff.isMultiServiceMode = true;
        }
        
        // Load standard datetime step first (except for combined step which needs custom handling)
        if (new_step_id !== 'date_time_staff_combined') {
            booknetic.stepManager.loadStandartSteps(new_step_id, old_step_id);
        }
    });

    // Hook after datetime step loads
    bookneticHooks.addAction('loaded_step', function(booknetic, new_step_id) {
        var isDateTimeStep = (new_step_id === 'date_time' || 
                              new_step_id === 'date_time_recurring' || 
                              new_step_id === 'date_time_non_recurring' ||
                              new_step_id === 'date_time_staff_combined');
        
        if (!isDateTimeStep) {
            return;
        }

        console.log('DateTime-Staff Collaborative: DateTime step loaded, step:', new_step_id);
        console.log('Multi-service mode:', collaborativeDateTimeStaff.isMultiServiceMode);

        // Always show combined view for the combined step OR when in multi-service mode
        if (new_step_id === 'date_time_staff_combined' || collaborativeDateTimeStaff.isMultiServiceMode) {
            // Convert to combined datetime-staff view
            setTimeout(function() {
                createCombinedView(booknetic);
                
                // Add fallback DOM event listeners
                setupTimeSelectionListener(booknetic);
                setupDateSelectionListener(booknetic);
            }, 300);
        }
    });
    
    // Setup date selection listener
    function setupDateSelectionListener(booknetic) {
        var panel = booknetic.panel_js;
        
        console.log('Setting up date selection DOM listener...');
        
        // Listen for date selection
        panel.off('click', '.booknetic_calendar_td, .booknetic_date_slot, .fs-date, [data-date]');
        panel.on('click', '.booknetic_calendar_td, .booknetic_date_slot, .fs-date, [data-date]', function(e) {
            var clickedElement = $(this);
            var selectedDate = clickedElement.data('date') || clickedElement.attr('data-date');
            
            if (selectedDate) {
                console.log('Date selected from DOM:', selectedDate);
                
                // Store the date temporarily
                if (!collaborativeDateTimeStaff.selectedDateTime) {
                    collaborativeDateTimeStaff.selectedDateTime = {};
                }
                collaborativeDateTimeStaff.selectedDateTime.date = selectedDate;
            }
        });
    }
    
    // Setup DOM-based time selection listener (fallback)
    function setupTimeSelectionListener(booknetic) {
        var panel = booknetic.panel_js;
        
        console.log('Setting up time selection DOM listener...');
        
        // Listen for clicks on time slots
        panel.off('click', '.time-slot, .booknetic_time_line, [data-time]');
        panel.on('click', '.time-slot, .booknetic_time_line, [data-time]', function(e) {
            var clickedElement = $(this);
            console.log('Time slot clicked (DOM event)', clickedElement);
            
            // Try to get time from the clicked element
            var selectedTime = clickedElement.data('time') || 
                              clickedElement.attr('data-time') ||
                              clickedElement.text().trim();
            
            console.log('Clicked time:', selectedTime);
            
            // Wait a bit for Booknetic to update internal data
            setTimeout(function() {
                // Try multiple methods to get the date
                var selectedDate = null;
                
                // Method 0: Check if we already have a date stored
                if (collaborativeDateTimeStaff.selectedDateTime && collaborativeDateTimeStaff.selectedDateTime.date) {
                    selectedDate = collaborativeDateTimeStaff.selectedDateTime.date;
                    console.log('Using previously stored date:', selectedDate);
                }
                
                // Method 1: From Booknetic's data object
                if (!selectedDate && booknetic.dateBasedData && booknetic.dateBasedData.selected_date) {
                    selectedDate = booknetic.dateBasedData.selected_date;
                }
                
                // Method 2: From panel data
                if (!selectedDate && panel.data('selected-date')) {
                    selectedDate = panel.data('selected-date');
                }
                
                // Method 3: From calendar active date
                if (!selectedDate) {
                    var activeDate = panel.find('.booknetic_calendar .booknetic_active_date, .fs-calendar .fs-active');
                    if (activeDate.length > 0) {
                        selectedDate = activeDate.data('date') || activeDate.attr('data-date');
                    }
                }
                
                // Method 4: Check cart
                if (booknetic.cartArr && booknetic.cartArr.length > 0) {
                    var cartItem = booknetic.cartArr[0];
                    
                    if (!selectedDate && cartItem.date) {
                        selectedDate = cartItem.date;
                    }
                    
                    if (!selectedTime && cartItem.time) {
                        selectedTime = cartItem.time;
                    }
                    
                    console.log('From cart - Date:', cartItem.date, 'Time:', cartItem.time);
                }
                
                console.log('Captured - Date:', selectedDate, 'Time:', selectedTime);
                
                if (selectedDate && selectedTime) {
                    console.log('✓ Storing datetime:', selectedDate, selectedTime);
                    
                    collaborativeDateTimeStaff.selectedDateTime = {
                        date: selectedDate,
                        time: selectedTime
                    };
                    
                    // Load staff if in multi-service mode
                    if (collaborativeDateTimeStaff.isMultiServiceMode) {
                        console.log('Loading staff for multi-service mode...');
                        loadAvailableStaff(booknetic);
                    }
                } else {
                    console.log('⚠ Could not capture complete datetime - Date:', selectedDate, 'Time:', selectedTime);
                }
            }, 300);
        });
    }

    // Hook after time is selected
    bookneticHooks.addAction('time_selected', function(booknetic, date, time) {
        console.log('=== TIME SELECTED EVENT ===');
        console.log('Multi-service mode:', collaborativeDateTimeStaff.isMultiServiceMode);
        console.log('Date:', date, 'Time:', time);
        
        // Always store the datetime selection
        collaborativeDateTimeStaff.selectedDateTime = {
            date: date,
            time: time
        };
        console.log('Stored datetime:', collaborativeDateTimeStaff.selectedDateTime);
        
        if (!collaborativeDateTimeStaff.isMultiServiceMode) {
            console.log('Not in multi-service mode, skipping staff loading');
            return;
        }

        console.log('DateTime-Staff Collaborative: Time selected', date, time);

        // Load available staff for all selected services
        console.log('About to load available staff for services:', collaborativeDateTimeStaff.selectedServices);
        loadAvailableStaff(booknetic);
    });

    // Validate datetime-staff step
    bookneticHooks.addFilter('step_validation_date_time', function(result, booknetic) {
        if (!collaborativeDateTimeStaff.isMultiServiceMode) {
            console.log('Single-service mode, using default validation');
            return result;
        }

        console.log('DateTime-Staff Collaborative: Validating datetime-staff step');
        console.log('Stored datetime:', collaborativeDateTimeStaff.selectedDateTime);
        console.log('Cart data:', booknetic.cartArr);
        
        // Try multiple methods to get datetime
        
        // Method 1: Check our stored value
        if (!collaborativeDateTimeStaff.selectedDateTime) {
            // Method 2: Try cart
            if (booknetic.cartArr && booknetic.cartArr.length > 0) {
                var cartItem = booknetic.cartArr[0];
                console.log('Cart item:', cartItem);
                
                if (cartItem.date && cartItem.time) {
                    console.log('Found datetime in cart');
                    collaborativeDateTimeStaff.selectedDateTime = {
                        date: cartItem.date,
                        time: cartItem.time
                    };
                }
            }
            
            // Method 3: Read from UI elements (most reliable during validation)
            if (!collaborativeDateTimeStaff.selectedDateTime) {
                var panel = booknetic.panel_js;
                var selectedDate = panel.find('.booknetic_calendar input[name="booknetic_selected_date"]').val() ||
                                   panel.find('.fs-selected-date').data('date') ||
                                   panel.find('.booknetic_active_date').data('date');
                                   
                var selectedTime = panel.find('.booknetic_time_line.booknetic_active_time').data('time') ||
                                   panel.find('.time-slot.selected').data('time') ||
                                   panel.find('input[name="selected_time"]').val();
                
                console.log('Reading from UI - Date:', selectedDate, 'Time:', selectedTime);
                
                if (selectedDate && selectedTime) {
                    console.log('Found datetime in UI elements!');
                    collaborativeDateTimeStaff.selectedDateTime = {
                        date: selectedDate,
                        time: selectedTime
                    };
                }
            }
        }
        
        // Check if datetime is selected
        if (!collaborativeDateTimeStaff.selectedDateTime) {
            console.log('VALIDATION FAILED: No datetime selected');
            return {
                status: false,
                errorMsg: 'Please select a date and time.'
            };
        }

        console.log('DateTime selected OK:', collaborativeDateTimeStaff.selectedDateTime);
        console.log('Checking staff...', collaborativeDateTimeStaff.selectedStaff);
        
        // Check if staff is selected for all services
        for (var i = 0; i < collaborativeDateTimeStaff.selectedServices.length; i++) {
            var serviceId = collaborativeDateTimeStaff.selectedServices[i].service_id;
            var assignedStaff = collaborativeDateTimeStaff.selectedStaff[serviceId];
            
            if (!assignedStaff || assignedStaff.length === 0) {
                console.log('VALIDATION FAILED: No staff for service', serviceId);
                return {
                    status: false,
                    errorMsg: 'Please select staff for all services.'
                };
            }
        }

        console.log('DateTime-Staff Collaborative: Validation passed!');
        return {
            status: true,
            errorMsg: ''
        };
    });

    // Also validate the other datetime step variations
    bookneticHooks.addFilter('step_validation_date_time_recurring', function(result, booknetic) {
        return bookneticHooks.applyFilters('step_validation_date_time', result, booknetic);
    });

    bookneticHooks.addFilter('step_validation_date_time_non_recurring', function(result, booknetic) {
        return bookneticHooks.applyFilters('step_validation_date_time', result, booknetic);
    });

    // STEP 5: Save selected staff and service assignments to cart for next steps
    bookneticHooks.addFilter('bkntc_cart', function(cartItem, booknetic) {
        if (!collaborativeDateTimeStaff.isMultiServiceMode) {
            return cartItem;
        }
        
        console.log('=== STEP 5: Updating cart with multi-service data ===');
        
        // Save staff selections
        if (Object.keys(collaborativeDateTimeStaff.selectedStaff).length > 0) {
            cartItem.collaborative_staff = collaborativeDateTimeStaff.selectedStaff;
            console.log('Saved staff assignments:', cartItem.collaborative_staff);
        }
        
        // Ensure selected services are in cart
        if (collaborativeDateTimeStaff.selectedServices && collaborativeDateTimeStaff.selectedServices.length > 0) {
            cartItem.selected_services = collaborativeDateTimeStaff.selectedServices;
            console.log('Saved service selections:', cartItem.selected_services);
        }
        
        // Mark as multi-service booking for backend processing
        cartItem.is_multi_service = true;
        
        console.log('Updated cart item:', cartItem);
        
        return cartItem;
    });
    
    // STEP 5: Handle backward navigation - restore state when going back to datetime step
    bookneticHooks.addAction('step_changed', function(booknetic, current_step, previous_step) {
        console.log('=== STEP 5: Step changed from', previous_step, 'to', current_step, '===');
        
        // If going back to datetime step, restore the combined view
        if (current_step === 'date_time' && collaborativeDateTimeStaff.isMultiServiceMode) {
            console.log('Restoring combined datetime-staff view');
            setTimeout(function() {
                // Show the hint and staff section if they were hidden
                $('.booknetic_collab_datetime_hint').show();
                if (Object.keys(collaborativeDateTimeStaff.selectedStaff).length > 0) {
                    $('.booknetic_collab_staff_section').show();
                }
            }, 500);
        }
    });

    // Check if we're in multi-service mode
    function checkMultiServiceMode(booknetic) {
        // Try multiple ways to get cart/selected services data
        var selectedServices = null;
        
        // Method 1: Check if cart data exists in booknetic object
        if (booknetic.cartArr && booknetic.cartArr.length > 0 && booknetic.cartArr[0].selected_services) {
            selectedServices = booknetic.cartArr[0].selected_services;
        }
        
        // Method 2: Check globalCartData if it exists
        if (!selectedServices && typeof window.bookneticCartData !== 'undefined' && window.bookneticCartData.selected_services) {
            selectedServices = window.bookneticCartData.selected_services;
        }
        
        // Method 3: Check if data was stored by service step
        if (!selectedServices && typeof window.collaborativeService !== 'undefined' && window.collaborativeService.selectedServices) {
            selectedServices = window.collaborativeService.selectedServices;
        }
        
        // Method 4: Check step_service_collaborative's stored data
        if (!selectedServices && booknetic.panel_js) {
            var serviceStepData = booknetic.panel_js.data('collaborative-selected-services');
            if (serviceStepData) {
                selectedServices = serviceStepData;
            }
        }
        
        console.log('DateTime-Staff Collaborative: Checking multi-service mode');
        console.log('Found selected services:', selectedServices);
        
        if (selectedServices && selectedServices.length > 1) {
            collaborativeDateTimeStaff.isMultiServiceMode = true;
            collaborativeDateTimeStaff.selectedServices = selectedServices;
            console.log('DateTime-Staff Collaborative: Multi-service mode enabled with', selectedServices.length, 'services');
        } else {
            collaborativeDateTimeStaff.isMultiServiceMode = false;
            console.log('DateTime-Staff Collaborative: Single-service mode (found', (selectedServices ? selectedServices.length : 0), 'services)');
        }
    }

    // Create combined datetime-staff view
    function createCombinedView(booknetic) {
        var panel = booknetic.panel_js;
        
        // Find the main content container (right side), NOT the step label in sidebar
        var contentArea = panel.find('.booknetic_appointment_container_body');
        
        if (contentArea.length === 0) {
            console.warn('Could not find .booknetic_appointment_container_body, trying alternative');
            contentArea = panel.find('.booknetic_appointment_steps_content');
        }

        if (contentArea.length === 0) {
            console.warn('Could not find content area!');
            return;
        }

        // Check if already initialized
        if (contentArea.find('.booknetic_collab_datetime_hint').length > 0) {
            console.log('DateTime-Staff Collaborative: Combined view already exists, skipping');
            return;
        }

        console.log('DateTime-Staff Collaborative: Creating combined view in main content area');

        // Add single hint text at the top of the main content area (right side)
        var hintHtml = '<div class="booknetic_collab_datetime_hint" style="background: #e8f5e9; padding: 12px; margin-bottom: 15px; border-left: 4px solid #4caf50; border-radius: 4px;">' +
                       '<strong style="color: #2e7d32;">Combined Booking:</strong> ' +
                       'First select a date & time, then assign staff for each service.' +
                       '</div>';
        
        contentArea.prepend(hintHtml);

        // Create staff selection container (hidden initially)
        var staffHtml = '<div class="booknetic_collab_staff_section" style="display: none; margin-top: 20px;">' +
                        '<div class="booknetic_collab_staff_header" style="padding: 15px; background: #f5f5f5; border-radius: 4px; margin-bottom: 15px;">' +
                        '<h4 style="margin: 0 0 5px 0; color: #333;">Step 2: Select Staff</h4>' +
                        '<p style="margin: 0; color: #666; font-size: 14px;">Choose staff members for each service</p>' +
                        '</div>' +
                        '<div class="booknetic_collab_staff_content">' +
                        '<div class="booknetic_collab_staff_loading" style="text-align: center; padding: 40px; color: #666;">' +
                        'Please select a date & time first...' +
                        '</div>' +
                        '</div>' +
                        '</div>';
        
        contentArea.append(staffHtml);

        console.log('DateTime-Staff Collaborative: Combined view created');
    }

    // Load available staff for selected datetime
    function loadAvailableStaff(booknetic) {
        var panel = booknetic.panel_js;
        var staffSection = panel.find('.booknetic_collab_staff_section');
        var staffContent = panel.find('.booknetic_collab_staff_content');
        
        console.log('DateTime-Staff Collaborative: Loading available staff');

        // Show staff section with loading state
        staffSection.slideDown(300);
        staffContent.html('<div class="booknetic_collab_staff_loading" style="text-align: center; padding: 40px;">' +
                          '<div class="booknetic_loading_icon" style="margin-bottom: 10px;"></div>' +
                          '<p style="color: #666;">Loading available staff...</p>' +
                          '</div>');

        // Scroll to staff section
        setTimeout(function() {
            $('html, body').animate({
                scrollTop: staffSection.offset().top - 100
            }, 500);
        }, 350);

        // Get available staff for each service
        var servicePromises = [];
        
        collaborativeDateTimeStaff.selectedServices.forEach(function(serviceItem) {
            var promise = $.ajax({
                url: BookneticCollabFrontend.ajaxurl,
                type: 'POST',
                data: {
                    action: 'bkntc_collab_get_available_staff',
                    nonce: BookneticCollabFrontend.nonce,
                    service_id: serviceItem.service_id,
                    date: collaborativeDateTimeStaff.selectedDateTime.date,
                    time: collaborativeDateTimeStaff.selectedDateTime.time
                }
            });
            servicePromises.push(promise);
        });

        // Wait for all staff lookups to complete
        $.when.apply($, servicePromises).done(function() {
            console.log('=== AJAX RESPONSES RECEIVED ===');
            console.log('Raw arguments:', arguments);
            
            var responses = arguments;
            
            // Handle single vs multiple responses
            if (collaborativeDateTimeStaff.selectedServices.length === 1) {
                responses = [responses];
            }

            // Process responses
            for (var i = 0; i < responses.length; i++) {
                var response = responses[i][0]; // [data, textStatus, jqXHR]
                var serviceId = collaborativeDateTimeStaff.selectedServices[i].service_id;
                
                console.log('Processing response for service', serviceId, ':', response);
                
                if (response && response.success && response.data) {
                    collaborativeDateTimeStaff.availableStaff[serviceId] = response.data.staff || [];
                    console.log('Staff for service', serviceId, ':', collaborativeDateTimeStaff.availableStaff[serviceId]);
                } else {
                    console.warn('No staff data for service', serviceId);
                    collaborativeDateTimeStaff.availableStaff[serviceId] = [];
                }
            }

            console.log('DateTime-Staff Collaborative: Available staff loaded', collaborativeDateTimeStaff.availableStaff);
            
            // Render staff selection UI
            renderStaffSelection(booknetic);
        }).fail(function(error) {
            console.error('DateTime-Staff Collaborative: Failed to load staff', error);
            console.error('Error details:', error.responseText);
            staffContent.html('<div style="text-align: center; padding: 40px; color: #f44336;">' +
                              '<strong>Error loading staff</strong><br>' +
                              'Please check the console for details.' +
                              '</div>');
        });
    }

    // Render staff selection UI
    function renderStaffSelection(booknetic) {
        var panel = booknetic.panel_js;
        var staffContent = panel.find('.booknetic_collab_staff_content');
        
        console.log('DateTime-Staff Collaborative: Rendering staff selection');

        var html = '<div class="booknetic_collab_staff_list">';

        // Show each service with its available staff
        collaborativeDateTimeStaff.selectedServices.forEach(function(serviceItem) {
            var serviceId = serviceItem.service_id;
            var assignedTo = serviceItem.assigned_to;
            var availableStaff = collaborativeDateTimeStaff.availableStaff[serviceId] || [];
            
            // Get service name from the service card (stored earlier)
            var serviceName = 'Service #' + serviceId;
            var serviceCard = $('.booknetic_service_card[data-id="' + serviceId + '"]');
            if (serviceCard.length > 0) {
                serviceName = serviceCard.find('.booknetic_service_card_title').text().trim();
            }

            html += '<div class="booknetic_collab_service_staff" style="margin-bottom: 30px; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;" data-service-id="' + serviceId + '">';
            html += '<h4 style="margin: 0 0 10px 0; color: #333; font-size: 16px;">' + serviceName + '</h4>';
            html += '<p style="margin: 0 0 15px 0; font-size: 13px; color: #666;">For: <strong>' + (assignedTo === 'me' ? 'You' : 'Guest') + '</strong></p>';

            if (availableStaff.length === 0) {
                html += '<p style="color: #f44336; padding: 15px; background: #ffebee; border-radius: 4px; text-align: center;">No staff available for this time slot.</p>';
            } else {
                html += '<div class="booknetic_collab_staff_cards" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 15px; margin-top: 15px;">';
                
                availableStaff.forEach(function(staff) {
                    var isSelected = collaborativeDateTimeStaff.selectedStaff[serviceId] && 
                                     collaborativeDateTimeStaff.selectedStaff[serviceId].indexOf(staff.id) !== -1;
                    
                    html += '<div class="booknetic_collab_staff_card ' + (isSelected ? 'selected' : '') + '" ' +
                            'data-staff-id="' + staff.id + '" ' +
                            'style="position: relative; padding: 20px 15px; border: 2px solid ' + (isSelected ? '#2196F3' : '#e0e0e0') + '; ' +
                            'border-radius: 8px; cursor: pointer; text-align: center; transition: all 0.2s; background: ' + (isSelected ? '#e3f2fd' : '#fff') + ';"' +
                            'onmouseover="this.style.borderColor=\'#2196F3\'; this.style.transform=\'translateY(-2px)\'; this.style.boxShadow=\'0 4px 8px rgba(0,0,0,0.1)\';" ' +
                            'onmouseout="if(!this.classList.contains(\'selected\')){this.style.borderColor=\'#e0e0e0\'; this.style.transform=\'translateY(0)\'; this.style.boxShadow=\'none\';} else {this.style.transform=\'translateY(0)\'; this.style.boxShadow=\'none\';}">';
                    
                    // Add checkbox in top-right corner
                    html += '<div style="position: absolute; top: 8px; right: 8px;">' +
                            '<input type="checkbox" ' + (isSelected ? 'checked' : '') + ' ' +
                            'style="width: 18px; height: 18px; cursor: pointer; pointer-events: none;">' +
                            '</div>';
                    
                    if (staff.profile_image) {
                        html += '<img src="' + staff.profile_image + '" style="width: 70px; height: 70px; border-radius: 50%; margin-bottom: 12px; object-fit: cover; border: 3px solid ' + (isSelected ? '#2196F3' : '#e0e0e0') + ';">';
                    } else {
                        html += '<div style="width: 70px; height: 70px; border-radius: 50%; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); ' +
                                'margin: 0 auto 12px; display: flex; align-items: center; justify-content: center; ' +
                                'font-size: 28px; font-weight: 600; color: #fff; border: 3px solid ' + (isSelected ? '#2196F3' : '#e0e0e0') + ';">' +
                                staff.name.charAt(0).toUpperCase() + '</div>';
                    }
                    
                    html += '<div style="font-weight: 600; font-size: 15px; color: #333; margin-bottom: 4px;">' + staff.name + '</div>';
                    
                    if (staff.email) {
                        html += '<div style="font-size: 12px; color: #999;">' + staff.email + '</div>';
                    }
                    
                    html += '</div>';
                });
                
                html += '</div>';
                html += '<p style="margin-top: 15px; font-size: 13px; color: #666; text-align: center;"><em>Click on staff cards to select/deselect</em></p>';
            }

            html += '</div>';
        });

        html += '</div>';

        staffContent.html(html);

        // Handle staff card clicks
        panel.on('click', '.booknetic_collab_staff_card', function() {
            var staffId = parseInt($(this).data('staff-id'));
            var serviceSection = $(this).closest('.booknetic_collab_service_staff');
            var serviceId = parseInt(serviceSection.data('service-id'));
            var checkbox = $(this).find('input[type="checkbox"]');

            // Toggle selection
            if (!collaborativeDateTimeStaff.selectedStaff[serviceId]) {
                collaborativeDateTimeStaff.selectedStaff[serviceId] = [];
            }

            var index = collaborativeDateTimeStaff.selectedStaff[serviceId].indexOf(staffId);
            
            if (index === -1) {
                // Select staff
                collaborativeDateTimeStaff.selectedStaff[serviceId].push(staffId);
                $(this).addClass('selected').css({
                    'border-color': '#2196F3',
                    'background': '#e3f2fd'
                });
                checkbox.prop('checked', true);
            } else {
                // Deselect staff
                collaborativeDateTimeStaff.selectedStaff[serviceId].splice(index, 1);
                $(this).removeClass('selected').css({
                    'border-color': '#e0e0e0',
                    'background': '#fff'
                });
                checkbox.prop('checked', false);
            }

            console.log('DateTime-Staff Collaborative: Staff selection updated', collaborativeDateTimeStaff.selectedStaff);
        });

        console.log('DateTime-Staff Collaborative: Staff selection rendered');
    }

})(jQuery);
