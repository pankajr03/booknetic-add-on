(function($) {
    'use strict';

    console.log('=== DateTime-Staff Collaborative Script Loaded (LEGACY - DISABLED) ===');
    console.log('This script is disabled in favor of step_date_time_staff_combined.js');
    console.log('To re-enable, remove the return statement below');
    
    // DISABLED: New combined step (step_date_time_staff_combined.js) handles this now
    // This old implementation caused back navigation issues
    return;

    var collaborativeDateTimeStaff = {
        isMultiServiceMode: false,
        selectedServices: [],
        selectedDateTime: null,
        selectedStaff: {}, // {service_id: [staff_ids]}
        availableStaff: {},
        currentView: 'date' // 'date' or 'staff'
    };

    // === STEP 5: NAVIGATION LOGIC ===
    // Control step flow based on multi-service mode
    
    // Hook to control which step comes after datetime
    bookneticHooks.addFilter('next_step_after_date_time', function(next_step, booknetic) {
        console.log('Navigation: Determining next step after date_time. Current next:', next_step);
        console.log('Multi-service mode:', collaborativeDateTimeStaff.isMultiServiceMode);
        
        if (collaborativeDateTimeStaff.isMultiServiceMode) {
            // In multi-service mode, skip the separate staff step since we already selected staff
            // Go directly to information or next applicable step
            if (next_step === 'staff') {
                console.log('Navigation: Skipping staff step in multi-service mode');
                return booknetic.stepManager.getNextStepAfter('staff'); // Get the step after staff
            }
        }
        
        return next_step;
    });
    
    // Hook to hide/show staff step based on mode
    bookneticHooks.addFilter('step_is_visible_staff', function(is_visible, booknetic) {
        if (collaborativeDateTimeStaff.isMultiServiceMode) {
            console.log('Navigation: Hiding staff step (already selected in combined view)');
            return false; // Hide staff step in multi-service mode
        }
        return is_visible; // Show normally in single-service mode
    });
    
    // Update sidebar step visibility when mode changes
    function updateStepVisibility(booknetic) {
        var panel = booknetic.panel_js;
        
        if (collaborativeDateTimeStaff.isMultiServiceMode) {
            // Hide staff step in sidebar
            panel.find('.booknetic_appointment_step_element[data-step="staff"]').addClass('booknetic_hidden');
            console.log('Navigation: Staff step hidden in sidebar');
        } else {
            // Show staff step in sidebar (normal mode)
            panel.find('.booknetic_appointment_step_element[data-step="staff"]').removeClass('booknetic_hidden');
            console.log('Navigation: Staff step shown in sidebar');
        }
    }
    
    // Hook before any step loads to control visibility
    bookneticHooks.addAction('before_step_loading', function(booknetic, new_step_id, old_step_id) {
        // If trying to load staff step in multi-service mode, skip it
        if (new_step_id === 'staff' && collaborativeDateTimeStaff.isMultiServiceMode) {
            console.log('Navigation: Intercepting staff step load, redirecting to next step');
            var nextStep = booknetic.stepManager.getNextStepAfter('staff');
            if (nextStep) {
                setTimeout(function() {
                    booknetic.goForward();
                }, 100);
            }
        }
    }, 5); // High priority to run early

    // Listen for service selection changes to reset state when user actually changes services
    bookneticHooks.addAction('service_selected', function(booknetic, serviceData) {
        console.log('Service selection changed, will need to re-evaluate multi-service mode');
        // Don't reset immediately - let the service step's logic handle it
        // Just log that a change occurred
    });
    
    // Hook to detect when leaving service step - validate if state needs reset
    bookneticHooks.addAction('leaving_step_service', function(booknetic) {
        console.log('Leaving service step, validating multi-service state...');
        // Re-check if services changed - this will update our state
        checkMultiServiceMode(booknetic);
    });

    // Hook before datetime step loads
    bookneticHooks.addAction('before_step_loading', function(booknetic, new_step_id, old_step_id) {
        var isDateTimeStep = (new_step_id === 'date_time' || 
                              new_step_id === 'date_time_recurring' || 
                              new_step_id === 'date_time_non_recurring' ||
                              new_step_id === 'date_time_staff_combined');
        
        var isLeavingDateTimeStep = old_step_id && (old_step_id === 'date_time' || old_step_id === 'date_time_recurring' || old_step_id === 'date_time_non_recurring');
        
        // Completely remove hint and staff section when leaving datetime step (but not when navigating between datetime variations)
        if (isLeavingDateTimeStep && !isDateTimeStep) {
            console.log('Navigation: Leaving datetime step, cleaning up collaborative elements');
            $('.booknetic_collab_datetime_hint').remove();
            $('.booknetic_collab_staff_section').remove();
        }
        
        if (!isDateTimeStep) {
            return;
        }

        console.log('DateTime-Staff Collaborative: Before datetime step loading, step:', new_step_id);
        console.log('Old step:', old_step_id, 'New step:', new_step_id);
        
        // IMPORTANT: Check multi-service mode BEFORE loading the step
        checkMultiServiceMode(booknetic);
        console.log('Checked multi-service mode:', collaborativeDateTimeStaff.isMultiServiceMode);
        
        // Detect if we're coming back from Information step
        var isBackFromInformation = (old_step_id === 'information' || old_step_id === 'confirm_details') && isDateTimeStep;
        console.log('Is back from information?', isBackFromInformation);
        
        // For the combined step, force multi-service mode
        if (new_step_id === 'date_time_staff_combined') {
            console.log('DateTime-Staff Collaborative: Combined step detected, forcing multi-service mode');
            collaborativeDateTimeStaff.isMultiServiceMode = true;
        }
        
        // Load standard datetime step first (except for combined step which needs custom handling)
        if (new_step_id !== 'date_time_staff_combined') {
            booknetic.stepManager.loadStandartSteps(new_step_id, old_step_id);
            
            // If multi-service mode and coming back from information, immediately setup collaborative view
            if (collaborativeDateTimeStaff.isMultiServiceMode && isBackFromInformation) {
                console.log('Back navigation detected - will create collaborative view immediately after step loads');
                // Use a shorter timeout and force creation
                setTimeout(function() {
                    console.log('Creating collaborative view for backward navigation...');
                    createCombinedViewForBackNav(booknetic);
                }, 200);
            }
        }
    });

    // Hook after datetime step loads
    bookneticHooks.addAction('loaded_step', function(booknetic, new_step_id, old_step_id) {
        console.log('=== LOADED_STEP HOOK TRIGGERED ===');
        console.log('New step:', new_step_id, 'Old step:', old_step_id);
        
        // When returning to service selection, clean up UI but DON'T reset state yet
        // State will be preserved until user actually changes service selection
        if (new_step_id === 'service') {
            console.log('Navigation: Returned to service selection, cleaning up UI only');
            $('.booknetic_collab_datetime_hint').remove();
            $('.booknetic_collab_staff_section').remove();
            // IMPORTANT: Don't reset state here - preserve it for when user goes forward again
            // Only reset datetime/staff since those become invalid when going back
            collaborativeDateTimeStaff.selectedDateTime = null;
            collaborativeDateTimeStaff.selectedStaff = {};
            collaborativeDateTimeStaff.availableStaff = {};
            console.log('Preserved multi-service mode and selected services for potential re-entry');
            return;
        }
        
        // Preserve state when navigating to other steps (location, information, confirm, etc.)
        console.log('Loaded step:', new_step_id);
        console.log('Preserving collaborative state:', {
            isMultiServiceMode: collaborativeDateTimeStaff.isMultiServiceMode,
            selectedServicesCount: collaborativeDateTimeStaff.selectedServices.length,
            hasDateTime: !!collaborativeDateTimeStaff.selectedDateTime,
            hasStaff: Object.keys(collaborativeDateTimeStaff.selectedStaff).length
        });
        
        var isDateTimeStep = (new_step_id === 'date_time' || 
                              new_step_id === 'date_time_recurring' || 
                              new_step_id === 'date_time_non_recurring' ||
                              new_step_id === 'date_time_staff_combined');
        
        if (!isDateTimeStep) {
            return;
        }

        console.log('DateTime-Staff Collaborative: DateTime step loaded, step:', new_step_id);
        console.log('Current multi-service mode status:', collaborativeDateTimeStaff.isMultiServiceMode);
        console.log('Selected services:', collaborativeDateTimeStaff.selectedServices);
        
        // Re-check multi-service mode (critical when navigating back from information OR re-entering after back to services)
        // This ensures we have the latest state
        console.log('Re-checking multi-service mode...');
        checkMultiServiceMode(booknetic);
        
        console.log('After re-check - Multi-service mode:', collaborativeDateTimeStaff.isMultiServiceMode);
        console.log('After re-check - Selected services count:', collaborativeDateTimeStaff.selectedServices.length);
        console.log('After re-check - Panel data mode:', booknetic.panel_js.data('collab-multi-service-mode'));
        console.log('After re-check - Panel data services:', booknetic.panel_js.data('collab-selected-services'));
        console.log('State restoration complete, ready to render');

        // ALWAYS show combined view when in multi-service mode, regardless of step ID
        if (collaborativeDateTimeStaff.isMultiServiceMode || new_step_id === 'date_time_staff_combined') {
            console.log('✓ Multi-service mode detected, WILL create combined view');
            console.log('Navigation context - Old step:', old_step_id, '→ New step:', new_step_id);
            
            // Check if collaborative view already exists (from backward navigation)
            var panel = booknetic.panel_js;
            var existingHint = panel.find('.booknetic_collab_datetime_hint');
            var existingStaffSection = panel.find('.booknetic_collab_staff_section');
            
            if (existingHint.length > 0 || existingStaffSection.length > 0) {
                console.log('Collaborative view already exists (backward navigation), cleaning and recreating...');
                existingHint.remove();
                existingStaffSection.remove();
            }
            
            // Convert to combined datetime-staff view
            // Try multiple times with increasing delays to ensure success
            var attemptViewCreation = function(attemptNumber) {
                var delay = attemptNumber === 1 ? 100 : (attemptNumber === 2 ? 300 : 500);
                
                setTimeout(function() {
                    console.log('Attempt #' + attemptNumber + ' - Executing combined view creation (delay: ' + delay + 'ms)...');
                    
                    var panel = booknetic.panel_js;
                    var contentArea = panel.find('.booknetic_appointment_container_body');
                    
                    console.log('Content area found:', contentArea.length);
                    console.log('Content area visible:', contentArea.is(':visible'));
                    console.log('Content area HTML length:', contentArea.html().length);
                    
                    if (contentArea.length === 0 || contentArea.html().length < 100) {
                        console.warn('Content area not ready yet, attempt #' + attemptNumber);
                        if (attemptNumber < 3) {
                            attemptViewCreation(attemptNumber + 1);
                        } else {
                            console.error('Failed to find content area after 3 attempts');
                        }
                        return;
                    }
                    
                    // Clean up any existing collaborative elements
                    panel.find('.booknetic_collab_datetime_hint').remove();
                    panel.find('.booknetic_collab_staff_section').remove();
                    console.log('Cleaned up existing collaborative elements');
                    
                    // Create the view
                    createCombinedView(booknetic);
                    
                    // Verify creation
                    setTimeout(function() {
                        var createdHint = panel.find('.booknetic_collab_datetime_hint');
                        var createdStaff = panel.find('.booknetic_collab_staff_section');
                        
                        console.log('View creation verification:');
                        console.log('- Hint element:', createdHint.length);
                        console.log('- Staff section:', createdStaff.length);
                        
                        if (createdHint.length === 0 || createdStaff.length === 0) {
                            console.error('View creation FAILED! Retrying...');
                            if (attemptNumber < 3) {
                                attemptViewCreation(attemptNumber + 1);
                            }
                        } else {
                            console.log('✓ View creation SUCCESSFUL!');
                            
                            // Add fallback DOM event listeners
                            setupTimeSelectionListener(booknetic);
                            setupDateSelectionListener(booknetic);
                            
                            // If we already have a datetime selection, restore staff view
                            if (collaborativeDateTimeStaff.selectedDateTime) {
                                console.log('Restoring staff selection from previous state');
                                console.log('DateTime:', collaborativeDateTimeStaff.selectedDateTime);
                                console.log('Available staff:', Object.keys(collaborativeDateTimeStaff.availableStaff));
                                
                                setTimeout(function() {
                                    var staffSection = panel.find('.booknetic_collab_staff_section');
                                    console.log('Staff section found:', staffSection.length);
                                    
                                    if (staffSection.length > 0) {
                                        staffSection.show();
                                        
                                        // Re-render staff if available, otherwise reload them
                                        if (Object.keys(collaborativeDateTimeStaff.availableStaff).length > 0) {
                                            console.log('Re-rendering existing staff data');
                                            renderStaffSelection(booknetic);
                                        } else {
                                            console.log('No cached staff, reloading from server');
                                            loadAvailableStaff(booknetic);
                                        }
                                    } else {
                                        console.warn('Staff section not found in DOM after creation');
                                    }
                                }, 200);
                            }
                        }
                    }, 100);
                }, delay);
            };
            
            // Start the first attempt
            attemptViewCreation(1);
        } else {
            console.log('Single-service mode, using standard datetime view');
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

    // Save selected staff to cart
    bookneticHooks.addFilter('bkntc_cart', function(cartItem, booknetic) {
        if (collaborativeDateTimeStaff.isMultiServiceMode && Object.keys(collaborativeDateTimeStaff.selectedStaff).length > 0) {
            cartItem.selected_staff = collaborativeDateTimeStaff.selectedStaff;
            console.log('DateTime-Staff Collaborative: Saved staff to cart', cartItem.selected_staff);
        }
        
        return cartItem;
    });

    // Check if we're in multi-service mode
    function checkMultiServiceMode(booknetic) {
        // Try multiple ways to get cart/selected services data
        var selectedServices = null;
        
        // Method -1: Check panel data FIRST (most reliable for re-entry after back navigation)
        if (booknetic.panel_js) {
            var panelServices = booknetic.panel_js.data('collab-selected-services');
            var panelMode = booknetic.panel_js.data('collab-multi-service-mode');
            
            if (panelMode && panelServices && panelServices.length > 0) {
                selectedServices = panelServices;
                collaborativeDateTimeStaff.isMultiServiceMode = true;
                collaborativeDateTimeStaff.selectedServices = selectedServices;
                console.log('Restored multi-service state from panel data:', selectedServices);
            }
        }
        
        // Method 0: Check our own stored state (important for backward navigation)
        if (!selectedServices && collaborativeDateTimeStaff.selectedServices && collaborativeDateTimeStaff.selectedServices.length > 0) {
            selectedServices = collaborativeDateTimeStaff.selectedServices;
            console.log('Using already stored selected services:', selectedServices);
        }
        
        // Method 1: Check if cart data exists in booknetic object
        if (!selectedServices && booknetic.cartArr && booknetic.cartArr.length > 0 && booknetic.cartArr[0].selected_services) {
            selectedServices = booknetic.cartArr[0].selected_services;
            console.log('Found services in cart:', selectedServices);
        }
        
        // Method 2: Check globalCartData if it exists
        if (!selectedServices && typeof window.bookneticCartData !== 'undefined' && window.bookneticCartData.selected_services) {
            selectedServices = window.bookneticCartData.selected_services;
            console.log('Found services in global cart data:', selectedServices);
        }
        
        // Method 3: Check if data was stored by service step
        if (!selectedServices && typeof window.collaborativeService !== 'undefined' && window.collaborativeService.selectedServices) {
            selectedServices = window.collaborativeService.selectedServices;
            console.log('Found services in window.collaborativeService:', selectedServices);
        }
        
        // Method 4: Check step_service_collaborative's stored data
        if (!selectedServices && booknetic.panel_js) {
            var serviceStepData = booknetic.panel_js.data('collaborative-selected-services');
            if (serviceStepData) {
                selectedServices = serviceStepData;
                console.log('Found services in panel data:', selectedServices);
            }
        }
        
        console.log('DateTime-Staff Collaborative: Checking multi-service mode');
        console.log('Final selected services:', selectedServices);
        
        if (selectedServices && selectedServices.length > 1) {
            collaborativeDateTimeStaff.isMultiServiceMode = true;
            collaborativeDateTimeStaff.selectedServices = selectedServices;
            
            // Store in panel data for persistence across navigation
            if (booknetic.panel_js) {
                booknetic.panel_js.data('collab-multi-service-mode', true);
                booknetic.panel_js.data('collab-selected-services', selectedServices);
                console.log('Stored multi-service state in panel data for persistence');
            }
            
            console.log('DateTime-Staff Collaborative: Multi-service mode enabled with', selectedServices.length, 'services');
            
            // Update step visibility
            updateStepVisibility(booknetic);
        } else {
            collaborativeDateTimeStaff.isMultiServiceMode = false;
            
            // Clear panel data
            if (booknetic.panel_js) {
                booknetic.panel_js.removeData('collab-multi-service-mode');
                booknetic.panel_js.removeData('collab-selected-services');
            }
            
            console.log('DateTime-Staff Collaborative: Single-service mode (found', (selectedServices ? selectedServices.length : 0), 'services)');
            
            // Update step visibility
            updateStepVisibility(booknetic);
        }
    }

    // Create combined view specifically for backward navigation (more aggressive)
    function createCombinedViewForBackNav(booknetic) {
        console.log('Creating collaborative view for backward navigation (forced mode)');
        var panel = booknetic.panel_js;
        
        // Aggressively clean up any existing elements
        panel.find('.booknetic_collab_datetime_hint').remove();
        panel.find('.booknetic_collab_staff_section').remove();
        
        // Force create the view
        createCombinedView(booknetic);
        
        // If we have saved state, immediately show staff section
        if (collaborativeDateTimeStaff.selectedDateTime && Object.keys(collaborativeDateTimeStaff.availableStaff).length > 0) {
            console.log('Restoring staff view immediately for backward navigation');
            setTimeout(function() {
                var staffSection = panel.find('.booknetic_collab_staff_section');
                if (staffSection.length > 0) {
                    staffSection.show();
                    renderStaffSelection(booknetic);
                    console.log('Staff view restored successfully');
                }
            }, 100);
        } else if (collaborativeDateTimeStaff.selectedDateTime) {
            // Have datetime but no staff - reload staff
            console.log('Have datetime but no staff cache - reloading...');
            setTimeout(function() {
                loadAvailableStaff(booknetic);
            }, 100);
        }
    }
    
    // Create combined datetime-staff view
    function createCombinedView(booknetic) {
        var panel = booknetic.panel_js;
        
        // First, clean up any existing collaborative elements from previous navigation
        $('.booknetic_collab_datetime_hint').remove();
        $('.booknetic_collab_staff_section').remove();
        
        console.log('DateTime-Staff Collaborative: Cleaned up any existing collaborative elements');
        
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

        console.log('DateTime-Staff Collaborative: Creating combined view in main content area');

        // Add single hint text at the top of the main content area (right side)
        var hintHtml = '<div class="booknetic_collab_datetime_hint" style="background: #e8f5e9; padding: 12px; margin-bottom: 15px; border-left: 4px solid #4caf50; border-radius: 4px;">' +
                       '<strong style="color: #2e7d32;">Combined Booking Coll:</strong> ' +
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
        
        // Safety check - ensure collaborative view exists
        if (staffSection.length === 0 || staffContent.length === 0) {
            console.error('Cannot load staff - collaborative view not found! Creating it first...');
            createCombinedView(booknetic);
            
            // Re-query after creating
            setTimeout(function() {
                staffSection = panel.find('.booknetic_collab_staff_section');
                staffContent = panel.find('.booknetic_collab_staff_content');
                
                if (staffSection.length === 0 || staffContent.length === 0) {
                    console.error('Still cannot find collaborative view after creation!');
                    return;
                }
                
                // Now proceed with loading
                proceedWithStaffLoading(booknetic, panel, staffSection, staffContent);
            }, 300);
            return;
        }
        
        proceedWithStaffLoading(booknetic, panel, staffSection, staffContent);
    }
    
    // Separated logic for actual staff loading
    function proceedWithStaffLoading(booknetic, panel, staffSection, staffContent) {
        console.log('Proceeding with staff loading...');

        
        // Show staff section with loading state
        staffSection.slideDown(300);
        staffContent.html('<div class="booknetic_collab_staff_loading" style="text-align: center; padding: 40px;">' +
                          '<div class="booknetic_loading_icon" style="margin-bottom: 10px;"></div>' +
                          '<p style="color: #666;">Loading available staff...</p>' +
                          '</div>');

        // Scroll to staff section (with safety check)
        setTimeout(function() {
            if (staffSection.length > 0 && staffSection.is(':visible') && staffSection.offset()) {
                $('html, body').animate({
                    scrollTop: staffSection.offset().top - 100
                }, 500);
            } else {
                console.warn('Staff section not found or not visible for scrolling');
            }
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
