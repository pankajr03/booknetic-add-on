(function($) {
    'use strict';

    console.log('════════════════════════════════════════════════════════');
    console.log('═══ Service Collaborative Script Loaded v2.1.0 ═══');
    console.log('════════════════════════════════════════════════════════');
    console.log('BookneticCollabFrontend available:', typeof BookneticCollabFrontend !== 'undefined');
    console.log('bookneticHooks available:', typeof bookneticHooks !== 'undefined');

    var collaborativeService = {
        categorySettings: null,
        selectedServices: [], // Array of {service_id, assigned_to}
        isMultiSelectMode: false
    };
    
    // Make it globally accessible for other steps
    window.collaborativeService = collaborativeService;

    // Hook after booking panel loads
    bookneticHooks.addAction('booking_panel_loaded', function(booknetic) {
        console.log('Service Collaborative: Booking panel loaded');
    });

    // Before service step loads - call standard step loader
    bookneticHooks.addAction('before_step_loading', function(booknetic, new_step_id, old_step_id) {
        if (new_step_id !== 'service')
            return;

        console.log('Service Collaborative: Before service step loading');
        booknetic.stepManager.loadStandartSteps(new_step_id, old_step_id);
    });

    // After service step loads - check category and convert to multi-select if enabled
    bookneticHooks.addAction('loaded_step', function(booknetic, new_step_id) {
        if (new_step_id !== 'service')
            return;

        console.log('Service Collaborative: Service step loaded');
        
        // Check if we need to enable multi-select mode
        setTimeout(function() {
            checkCategoryMultiSelect(booknetic);
        }, 200);
    });

    // Service step validation
    bookneticHooks.addFilter('step_validation_service', function(result, booknetic) {
        let booking_panel_js = booknetic.panel_js;

        if (!collaborativeService.isMultiSelectMode) {
            console.log('Service Collaborative: Single-select mode, using default validation');
            return result;
        }

        console.log('Service Collaborative: Multi-select mode validation');

        // Get selected services with assignments
        var selectedServices = [];
        var checkedBoxes = booking_panel_js.find('.booknetic_collab_service_checkbox input:checked');
        
        console.log('Found checked boxes:', checkedBoxes.length);
        
        checkedBoxes.each(function() {
            var serviceId = parseInt($(this).data('service-id'));
            var card = $(this).closest('.booknetic_service_card');
            var assignedTo = card.find('input[name="assign_to_' + serviceId + '"]:checked').val();
            
            console.log('Service ID:', serviceId, 'Assigned to:', assignedTo);
            
            if (!assignedTo) {
                assignedTo = 'me'; // Default to "me"
            }

            selectedServices.push({
                service_id: serviceId,
                assigned_to: assignedTo
            });
        });

        console.log('Selected services:', selectedServices);

        // Validate selection
        if (selectedServices.length === 0) {
            return {
                status: false,
                errorMsg: booknetic.__('select_service') || 'Please select at least one service.'
            };
        }

        // Check if assignment is set for all services
        for (var i = 0; i < selectedServices.length; i++) {
            if (!selectedServices[i].assigned_to) {
                return {
                    status: false,
                    errorMsg: 'Please assign each service to "Me" or "Guest".'
                };
            }
        }

        // Store selected services for cart
        collaborativeService.selectedServices = selectedServices;
        
        // Also store in panel data for access by other steps
        booking_panel_js.data('collaborative-selected-services', selectedServices);
        
        console.log('Service validation passed:', selectedServices);
        console.log('Stored in window.collaborativeService and panel data');

        return {
            status: true,
            errorMsg: ''
        };
    });

    // Hook to save selected services array to cart
    bookneticHooks.addFilter('bkntc_cart', function(cartItem, booknetic) {
        if (collaborativeService.isMultiSelectMode && collaborativeService.selectedServices && collaborativeService.selectedServices.length > 0) {
            cartItem.selected_services = collaborativeService.selectedServices;
            
            // For backward compatibility, set the first service as the main service
            cartItem.service = collaborativeService.selectedServices[0].service_id;
            cartItem.assigned_to = collaborativeService.selectedServices[0].assigned_to;
            
            console.log('Saved to cart - selected_services:', cartItem.selected_services);
        }
        
        return cartItem;
    });

    // Hook after information step to expand cart into individual service items
    bookneticHooks.addAction('before_next_step_information', function(booknetic) {
        console.log('=== BEFORE LEAVING INFORMATION STEP ===');
        console.log('Checking if cart needs expansion...');
        expandCartForMultiService(booknetic);
    });

    // Also trigger before loading cart step or confirm_details step
    bookneticHooks.addAction('before_step_loading', function(booknetic, new_step_id, old_step_id) {
        if (new_step_id === 'cart' || new_step_id === 'confirm_details') {
            console.log('=== BEFORE LOADING ' + new_step_id.toUpperCase() + ' ===');
            console.log('Checking if cart needs expansion...');
            
            // Only expand if we have date and time
            if (booknetic.cartArr && booknetic.cartArr.length > 0) {
                var hasDateTime = booknetic.cartArr[0].date && booknetic.cartArr[0].time;
                if (hasDateTime) {
                    console.log('Date/time exists, proceeding with expansion');
                    expandCartForMultiService(booknetic);
                } else {
                    console.log('⏸️ Skipping expansion - no date/time in cart yet');
                }
            }
        }
    });

    // CRITICAL: After information step, update customer data in already-expanded cart items
    bookneticHooks.addAction('step_end_information', function(booknetic) {
        console.log('=== INFORMATION STEP COMPLETED ===');
        
        if (!booknetic.cartArr || booknetic.cartArr.length === 0) {
            return;
        }
        
        // Check if cart is already expanded
        var isExpanded = booknetic.cartArr.length > 1 && booknetic.cartArr[0].is_collaborative_booking;
        
        if (isExpanded) {
            console.log('🔄 Cart already expanded, updating customer data in all items...');
            
            // Get the main customer data from the first item (or current item)
            var mainCustomerData = booknetic.cartArr[0].customer_data;
            console.log('Main customer data:', mainCustomerData);
            
            // Get guest data
            var guestData = collaborativeService.guestInformation || {};
            console.log('Guest data:', guestData);
            
            // Update each cart item with proper customer data
            booknetic.cartArr.forEach(function(item, index) {
                console.log('Updating cart item ' + index + ' for service ' + item.service + ' (assigned to: ' + item.assigned_to + ')');
                
                if (item.assigned_to === 'guest' && guestData[item.service]) {
                    // This service is for a guest - use guest data
                    var guestInfo = guestData[item.service];
                    console.log('✓ Using guest data for service ' + item.service);
                    
                    item.customer_data = {
                        email: guestInfo.email || '',
                        first_name: guestInfo.name ? guestInfo.name.split(' ')[0] : '',
                        last_name: guestInfo.name ? guestInfo.name.split(' ').slice(1).join(' ') : '',
                        phone: guestInfo.phone || ''
                    };
                    
                    item.email = guestInfo.email || '';
                    item.first_name = item.customer_data.first_name;
                    item.last_name = item.customer_data.last_name;
                    item.name = guestInfo.name || '';
                    item.phone = guestInfo.phone || '';
                    
                    console.log('✓ Updated guest customer_data:', item.customer_data);
                } else {
                    // This service is for main customer - use main customer data
                    console.log('✓ Using main customer data for service ' + item.service);
                    
                    if (mainCustomerData && mainCustomerData.email) {
                        item.customer_data = JSON.parse(JSON.stringify(mainCustomerData));
                        item.email = mainCustomerData.email;
                        item.first_name = mainCustomerData.first_name;
                        item.last_name = mainCustomerData.last_name;
                        item.name = (mainCustomerData.first_name + ' ' + mainCustomerData.last_name).trim();
                        item.phone = mainCustomerData.phone;
                        
                        console.log('✓ Updated main customer_data:', item.customer_data);
                    } else {
                        console.warn('⚠️ Main customer data missing!');
                    }
                }
            });
            
            console.log('✅ All cart items updated with customer data');
        } else {
            console.log('Cart not yet expanded, will expand later');
        }
    });

    // Function to expand cart into individual service items
    function expandCartForMultiService(booknetic) {
        if (!collaborativeService.isMultiSelectMode || !collaborativeService.selectedServices || collaborativeService.selectedServices.length <= 1) {
            return; // Single service, no need to expand
        }

        // Check if already expanded
        if (booknetic.cartArr.length > 1 && booknetic.cartArr[0].is_collaborative_booking) {
            console.log('Cart already expanded, skipping');
            return;
        }

        var currentCartItem = booknetic.cartArr[booknetic.cartCurrentIndex];
        if (!currentCartItem) {
            console.log('No current cart item found');
            return;
        }

        // Check if this cart item has already been expanded
        if (currentCartItem.is_collaborative_booking && !currentCartItem.selected_services) {
            console.log('Cart item already expanded');
            return;
        }

        console.log('=== EXPANDING CART: Creating individual items for each service ===');
        console.log('Current cart index:', booknetic.cartCurrentIndex);
        console.log('Current cart item:', currentCartItem);
        console.log('🔍 Customer data in cart item:', currentCartItem.customer_data);
        console.log('🔍 All keys in cart item:', Object.keys(currentCartItem));
        console.log('🔍 Customer ID:', currentCartItem.customer_id);
        console.log('🔍 Customer email field:', currentCartItem.email);
        console.log('🔍 Customer name field:', currentCartItem.name);
        console.log('🔍 Customer phone field:', currentCartItem.phone);

        // Get guest data if available
        var guestData = {};
        if (currentCartItem.guest_data) {
            guestData = currentCartItem.guest_data;
        } else if (window.BookneticCollaborativeInformation && typeof window.BookneticCollaborativeInformation.getGuestData === 'function') {
            guestData = window.BookneticCollaborativeInformation.getGuestData();
        }

        // Store the original cart item temporarily
        var originalItem = JSON.parse(JSON.stringify(currentCartItem));
        
        // Generate a unique group ID for this booking session
        var groupId = 'collab_' + Date.now();
        
        // Clear the current position
        booknetic.cartArr.splice(booknetic.cartCurrentIndex, 1);
        
        // Create individual cart items for each service
        collaborativeService.selectedServices.forEach(function(service, index) {
            console.log('🔄 Processing service ' + (index + 1) + '/' + collaborativeService.selectedServices.length + ': Service ID ' + service.service_id);
            
            var newItem = JSON.parse(JSON.stringify(originalItem));
            console.log('📋 New item created for service ' + service.service_id + ', has customer_data:', !!newItem.customer_data);
            if (newItem.customer_data) {
                console.log('📋 customer_data content:', newItem.customer_data);
            }
            
            // Set service-specific data
            newItem.service = service.service_id;
            newItem.assigned_to = service.assigned_to;
            newItem.is_collaborative_booking = true;
            newItem.collaborative_group_id = groupId;
            newItem.collaborative_service_index = index + 1;
            newItem.collaborative_total_services = collaborativeService.selectedServices.length;
            
            // CRITICAL: Clear any cached service-specific data that might interfere with backend processing
            // This forces the backend to fetch fresh data for each service
            delete newItem.serviceInf;
            delete newItem.service_price;
            delete newItem.service_duration;
            delete newItem.service_name;
            
            // CRITICAL: Ensure date and time are preserved for all items
            // All services share the same date/time in collaborative booking
            console.log('Preserving date/time for service ' + service.service_id + ':', {
                date: newItem.date,
                time: newItem.time,
                location: newItem.location,
                staff: newItem.staff,
                service_category: newItem.service_category
            });
            
            // CRITICAL FIX: Ensure all required fields are present and not undefined
            // This prevents the backend from showing "-" for date/time and "0.00" for price
            if (!newItem.date || !newItem.time) {
                console.error('⚠️ WARNING: Date or time is missing for service ' + service.service_id);
                console.log('Attempting to recover from original item...');
                newItem.date = originalItem.date;
                newItem.time = originalItem.time;
            }
            
            // Ensure staff ID is set (can be -1 for "any staff")
            if (newItem.staff === undefined || newItem.staff === null) {
                newItem.staff = originalItem.staff || -1;
            }
            
            // Ensure location is set
            if (!newItem.location && originalItem.location) {
                newItem.location = originalItem.location;
            }
            
            // Ensure service_category is set (use the original or clear it if not matching)
            if (!newItem.service_category && originalItem.service_category) {
                newItem.service_category = originalItem.service_category;
            }
            
            console.log('✓ Verified all required fields for service ' + service.service_id);
            console.log('✓ Cleared cached service data to force fresh backend lookup');
            
            // CRITICAL: Ensure customer data is copied to all cart items
            // The information step fills customer_data in the original item, and it needs to be in ALL items
            // Since newItem is already a deep copy of originalItem, it should have customer_data
            // But let's verify and copy explicitly to be safe
            
            console.log('Before customer data copy - Service ' + service.service_id + ':', {
                has_customer_data: !!newItem.customer_data,
                customer_data: newItem.customer_data,
                email: newItem.email,
                name: newItem.name
            });
            
            // Ensure customer_data exists in newItem (it should from the deep copy)
            console.log('🔍 Checking customer data for service ' + service.service_id + '...');
            console.log('🔍 originalItem has customer_data:', !!originalItem.customer_data);
            console.log('🔍 newItem has customer_data:', !!newItem.customer_data);
            
            if (originalItem.customer_data) {
                // Force re-copy to ensure it's there
                newItem.customer_data = JSON.parse(JSON.stringify(originalItem.customer_data));
                console.log('✓ Copied customer_data to service ' + service.service_id, newItem.customer_data);
                
                // Also copy customer data fields to root level for backend compatibility
                if (originalItem.customer_data.email) {
                    newItem.email = originalItem.customer_data.email;
                    console.log('✓ Copied email from customer_data to service ' + service.service_id + ':', newItem.email);
                } else {
                    console.log('⚠️ No email in customer_data for service ' + service.service_id);
                }
                
                // Handle first_name and last_name (Booknetic uses these instead of just "name")
                if (originalItem.customer_data.first_name || originalItem.customer_data.last_name) {
                    newItem.first_name = originalItem.customer_data.first_name;
                    newItem.last_name = originalItem.customer_data.last_name;
                    newItem.name = (originalItem.customer_data.first_name + ' ' + originalItem.customer_data.last_name).trim();
                    console.log('✓ Copied name from customer_data to service ' + service.service_id + ':', newItem.name);
                }
                
                if (originalItem.customer_data.phone) {
                    newItem.phone = originalItem.customer_data.phone;
                    console.log('✓ Copied phone from customer_data to service ' + service.service_id);
                } else {
                    console.log('⚠️ No phone in customer_data for service ' + service.service_id);
                }
            } else {
                console.log('⚠️ No customer_data object found in original item for service ' + service.service_id);
            }
            
            // Copy individual customer fields if they exist at root level (fallback for different Booknetic versions)
            if (originalItem.email && !newItem.email) {
                newItem.email = originalItem.email;
                console.log('✓ Copied email from root to service ' + service.service_id + ':', newItem.email);
            }
            if (originalItem.name && !newItem.name) {
                newItem.name = originalItem.name;
                console.log('✓ Copied name from root to service ' + service.service_id);
            }
            if (originalItem.phone && !newItem.phone) {
                newItem.phone = originalItem.phone;
                console.log('✓ Copied phone from root to service ' + service.service_id);
            }
            if (originalItem.customer_id) {
                newItem.customer_id = originalItem.customer_id;
                console.log('✓ Copied customer_id to service ' + service.service_id);
            }
            
            // If service is assigned to guest, use guest information for customer_data
            if (service.assigned_to === 'guest') {
                console.log('🎭 Service ' + service.service_id + ' assigned to guest');
                
                if (guestData[service.service_id]) {
                    // Guest data exists, use it for this service's customer_data
                    var guestInfo = guestData[service.service_id];
                    console.log('✓ Found guest data for service ' + service.service_id + ':', guestInfo);
                    
                    // Overwrite customer_data with guest information
                    newItem.customer_data = {
                        email: guestInfo.email || '',
                        first_name: guestInfo.name ? guestInfo.name.split(' ')[0] : '',
                        last_name: guestInfo.name ? guestInfo.name.split(' ').slice(1).join(' ') : '',
                        phone: guestInfo.phone || ''
                    };
                    
                    // Also set at root level
                    newItem.email = guestInfo.email || '';
                    newItem.first_name = newItem.customer_data.first_name;
                    newItem.last_name = newItem.customer_data.last_name;
                    newItem.name = guestInfo.name || '';
                    newItem.phone = guestInfo.phone || '';
                    
                    console.log('✓ Applied guest customer_data for service ' + service.service_id + ':', newItem.customer_data);
                    
                    // Also keep guest_info for reference
                    newItem.guest_info = guestInfo;
                    newItem.guest_info.service_id = service.service_id;
                } else {
                    // No guest data, use main customer data as fallback
                    console.log('⚠️ No guest data found for service ' + service.service_id + ', using main customer data as fallback');
                }
            } else {
                console.log('👤 Service ' + service.service_id + ' assigned to main customer (Me), using main customer data');
            }
            
            // Keep selected_services for reference but mark as expanded
            newItem.selected_services = collaborativeService.selectedServices;
            newItem._cart_expanded = true;
            
            // Insert at the position
            booknetic.cartArr.splice(booknetic.cartCurrentIndex + index, 0, newItem);
            
            console.log('Created cart item #' + (index + 1) + ' for service ' + service.service_id + ' (assigned to: ' + service.assigned_to + ')');
            console.log('Cart item data:', newItem);
        });
        
        console.log('✓ Cart expanded from 1 to ' + collaborativeService.selectedServices.length + ' items');
        console.log('✓ Group ID: ' + groupId);
        console.log('Updated cartArr length:', booknetic.cartArr.length);
        console.log('Updated cartArr:', booknetic.cartArr);
        
        // IMPORTANT: Don't change cartCurrentIndex - it should stay at the original position
        // This ensures the cart data is properly saved across all items
        console.log('Cart current index remains:', booknetic.cartCurrentIndex);
        
        // Update cart counter if available
        if (typeof booknetic.updateCartCounter === 'function') {
            booknetic.updateCartCounter();
        }
        
        // Force cart refresh - clear ALL cart HTML storage to force reload
        var cartContainer = booknetic.panel_js.find('[data-step-id="cart"]');
        if (cartContainer.length > 0) {
            cartContainer.empty(); // Force reload on next visit
        }
        
        // Also clear the HTML storage for cart to force proper reload
        booknetic.cartHTMLBody = [];
        booknetic.cartHTMLSideBar = [];
        console.log('✓ Cleared cart HTML cache to force reload');
    }

    // Debug: Log cart before confirmation
    bookneticHooks.addAction('before_step_loading', function(booknetic, new_step_id, old_step_id) {
        if (new_step_id === 'confirm_details') {
            console.log('=== CART DEBUG: Before Confirm Details ===');
            console.log('Total cart items:', booknetic.cartArr.length);
            console.log('Current index:', booknetic.cartCurrentIndex);
            console.log('Cart array:', booknetic.cartArr);
        }
    });

    // Hook to intercept ajaxParameters and ensure cart data is sent correctly
    bookneticHooks.addFilter('appointment_ajax_data', function(data, booknetic) {
        console.log('=== APPOINTMENT_AJAX_DATA FILTER CALLED ===');
        console.log('Cart array at filter time:', booknetic.cartArr);
        console.log('Cart length:', booknetic.cartArr.length);
        console.log('Current index:', booknetic.cartCurrentIndex);
        
        // Get the current step to avoid expanding during date/time selection
        var currentStep = booknetic.panel_js.find('.booknetic_appointment_step_element.booknetic_active_step').data('step-id');
        console.log('Current active step:', currentStep);
        
        // DON'T expand during date_time step - user hasn't selected date/time yet!
        var isDateTimeStep = currentStep === 'date_time' || 
                            currentStep === 'date_time_recurring' || 
                            currentStep === 'date_time_non_recurring';
        
        if (isDateTimeStep) {
            console.log('Currently on date/time step, skipping cart expansion (date/time not selected yet)');
            return data;
        }
        
        // CRITICAL: Re-expand cart if it was somehow collapsed
        // This handles the case where cart might have been cleared between confirm_details load and actual confirmation
        if (collaborativeService.isMultiSelectMode && 
            collaborativeService.selectedServices && 
            collaborativeService.selectedServices.length > 1) {
            
            // Check if cart needs expansion
            if (!booknetic.cartArr || booknetic.cartArr.length === 0) {
                console.log('🚨 CRITICAL: Cart is empty but we have selected services! Re-expanding now...');
                expandCartForMultiService(booknetic);
            } else if (booknetic.cartArr.length === 1 && booknetic.cartArr[0].selected_services) {
                // Before re-expanding, check if date/time exists
                if (!booknetic.cartArr[0].date || !booknetic.cartArr[0].time) {
                    console.log('⏸️ Skipping expansion - date/time not yet selected');
                    return data;
                }
                console.log('🚨 Cart has collapsed back to 1 item! Re-expanding now...');
                expandCartForMultiService(booknetic);
            } else if (booknetic.cartArr.length > 1 && !booknetic.cartArr[0].is_collaborative_booking) {
                console.log('🚨 Cart has multiple items but not marked as collaborative! Re-expanding now...');
                expandCartForMultiService(booknetic);
            }
        }
        
        // Check if this is a collaborative booking with multiple cart items
        if (booknetic.cartArr && booknetic.cartArr.length > 0) {
            var hasCollaborative = booknetic.cartArr.some(function(item) {
                return item && item.is_collaborative_booking;
            });
            
            if (hasCollaborative) {
                console.log('=== INTERCEPTING AJAX DATA FOR COLLABORATIVE BOOKING ===');
                console.log('Cart items count:', booknetic.cartArr.length);
                console.log('Current index:', booknetic.cartCurrentIndex);
                console.log('Full cart array:', booknetic.cartArr);
                
                // Re-serialize the cart to ensure all items are sent
                var cartData = JSON.stringify(booknetic.cartArr);
                console.log('Cart JSON being sent:', cartData);
                console.log('Cart JSON length:', cartData.length);
                
                // Update the cart data in FormData
                data.set('cart', cartData);
                data.set('current', booknetic.cartCurrentIndex);
                
                console.log('✓ Cart data updated in FormData');
            } else {
                console.log('No collaborative booking items found in cart');
            }
        } else {
            console.log('WARNING: Cart array is empty or undefined!');
            console.log('cartArr:', booknetic.cartArr);
            
            // Check if we have stored data
            if (collaborativeService.selectedServices && collaborativeService.selectedServices.length > 0) {
                console.log('WARNING: Cart is empty but we have selected services:', collaborativeService.selectedServices);
                console.log('This suggests the cart was cleared or expansion didn\'t happen');
            }
        }
        
        return data;
    });

    // Fetch category settings to check if multi-select is enabled
    function checkCategoryMultiSelect(booknetic) {
        let booking_panel_js = booknetic.panel_js;
        
        console.log('=== SERVICE COLLABORATIVE: CHECK MULTI-SELECT ===');
        console.log('BookneticCollabFrontend available:', typeof BookneticCollabFrontend !== 'undefined');
        
        // Get the category ID from the step
        var categoryId = getCurrentCategoryId(booking_panel_js);
        
        console.log('Category ID:', categoryId);
        
        if (!categoryId) {
            console.log('Service Collaborative: No category ID found, skipping multi-select check');
            return;
        }

        console.log('Service Collaborative: Checking category settings for ID:', categoryId);

        $.ajax({
            url: BookneticCollabFrontend.ajaxurl,
            type: 'POST',
            data: {
                action: 'bkntc_collab_get_category_settings_frontend',
                nonce: BookneticCollabFrontend.nonce,
                category_id: categoryId
            },
            success: function(response) {
                console.log('=== CATEGORY SETTINGS RESPONSE ===');
                console.log('Full response:', response);
                console.log('Response.success:', response.success);
                console.log('Response.data:', response.data);
                
                if (response.success && response.data) {
                    collaborativeService.categorySettings = response.data;
                    console.log('allow_multi_select value:', response.data.allow_multi_select);
                    console.log('allow_multi_select == 1:', response.data.allow_multi_select == 1);
                    
                    if (response.data.allow_multi_select == 1) {
                        console.log('✓ Service Collaborative: Multi-select ENABLED for category', categoryId);
                        collaborativeService.isMultiSelectMode = true;
                        console.log('About to convert to multi-select...');
                        convertServiceToMultiSelect(booknetic);
                        console.log('Conversion complete');
                    } else {
                        console.log('✗ Service Collaborative: Single-select mode (allow_multi_select =', response.data.allow_multi_select, ')');
                        collaborativeService.isMultiSelectMode = false;
                    }
                } else {
                    console.error('Invalid response structure:', response);
                }
            },
            error: function(xhr, status, error) {
                console.error('=== AJAX ERROR ===');
                console.error('Status:', status);
                console.error('Error:', error);
                console.error('Response text:', xhr.responseText);
            }
        });
    }

    // Get current category ID from service step
    function getCurrentCategoryId(panel) {
        console.log('>>> Getting category ID...');
        
        // Method 1: Check booknetic cartArr or data
        if (typeof window.BookneticData !== 'undefined' && window.BookneticData.category_id) {
            console.log('>>> Method 1: Found in BookneticData.category_id:', window.BookneticData.category_id);
            return window.BookneticData.category_id;
        }
        
        // Method 2: Check if category ID is in the step container
        var stepContainer = panel.find('[data-step-id="service"]');
        if (stepContainer.length > 0 && stepContainer.data('category-id')) {
            console.log('>>> Method 2: Found in step container:', stepContainer.data('category-id'));
            return stepContainer.data('category-id');
        }

        // Method 3: Try from category title element
        var categoryTitle = panel.find('.booknetic_category_title, [data-category-id]').first();
        if (categoryTitle.length > 0 && categoryTitle.data('category-id')) {
            console.log('>>> Method 3: Found in category title:', categoryTitle.data('category-id'));
            return categoryTitle.data('category-id');
        }

        // Method 4: Get from first service card's data-category attribute
        var firstServiceCard = panel.find('.booknetic_service_card').first();
        console.log('>>> First service card found:', firstServiceCard.length > 0);
        
        if (firstServiceCard.length > 0) {
            var categoryFromCard = firstServiceCard.data('category') || firstServiceCard.attr('data-category');
            if (categoryFromCard) {
                console.log('>>> Method 4a: Found in service card data-category:', categoryFromCard);
                return categoryFromCard;
            }
            
            // Try to get service ID and fetch category via AJAX
            var firstServiceId = firstServiceCard.data('id');
            console.log('>>> First service ID:', firstServiceId);
            
            if (firstServiceId) {
                console.log('>>> Method 4b: Trying AJAX to get category from service ID...');
                // Make synchronous AJAX call to get category from service
                var categoryId = null;
                $.ajax({
                    url: BookneticCollabFrontend.ajaxurl,
                    type: 'POST',
                    async: false,
                    data: {
                        action: 'bkntc_collab_get_service_category',
                        nonce: BookneticCollabFrontend.nonce,
                        service_id: firstServiceId
                    },
                    success: function(response) {
                        console.log('>>> AJAX response for service category:', response);
                        if (response.success && response.data && response.data.category_id) {
                            categoryId = response.data.category_id;
                            console.log('>>> Found category from AJAX:', categoryId);
                        }
                    },
                    error: function(xhr, status, error) {
                        console.error('>>> AJAX error getting service category:', error);
                    }
                });
                if (categoryId) {
                    return categoryId;
                }
            }
        }

        console.warn('>>> No category ID found by any method!');
        return null;
    }

    // Convert service cards to multi-select with checkboxes
    function convertServiceToMultiSelect(booknetic) {
        let panel = booknetic.panel_js;
        
        console.log('Service Collaborative: Converting to multi-select mode');

        var serviceCards = panel.find('.booknetic_service_card');
        
        if (serviceCards.length === 0) {
            console.log('Service Collaborative: No service cards found');
            return;
        }

        // Add hint text
        var hintHtml = '<div class="booknetic_collab_hint" style="background: #e3f2fd; padding: 12px; margin-bottom: 15px; border-left: 4px solid #2196F3; border-radius: 4px;">' +
                       '<strong style="color: #1976d2;">Multi-Service Booking:</strong> ' +
                       'Select multiple services and assign each to "Me" or "Guest".' +
                       '</div>';
        
        panel.find('.booknetic_services_container').before(hintHtml);

        // Convert each service card
        serviceCards.each(function() {
            var card = $(this);
            var serviceId = card.data('id');
            
            if (!serviceId) return;

            // CRITICAL: Unbind ALL existing click handlers from Booknetic's default behavior
            card.off('click');
            
            // Add checkbox
            if (card.find('.booknetic_collab_service_checkbox').length === 0) {
                var checkboxHtml = '<div class="booknetic_collab_service_checkbox" style="position: absolute; top: 10px; right: 10px; z-index: 10;">' +
                                   '<input type="checkbox" data-service-id="' + serviceId + '" style="width: 20px; height: 20px; cursor: pointer;">' +
                                   '</div>';
                card.append(checkboxHtml);
            }

            // Add assignment radio buttons
            if (card.find('.booknetic_collab_assignment').length === 0) {
                var assignmentHtml = '<div class="booknetic_collab_assignment" style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #e0e0e0; display: none;">' +
                                     '<label style="font-size: 12px; font-weight: 600; display: block; margin-bottom: 5px;">Assign to:</label>' +
                                     '<div style="display: flex; gap: 15px;">' +
                                     '<label style="font-size: 13px; cursor: pointer;">' +
                                     '<input type="radio" name="assign_to_' + serviceId + '" value="me" checked style="margin-right: 5px;">' +
                                     'Me' +
                                     '</label>' +
                                     '<label style="font-size: 13px; cursor: pointer;">' +
                                     '<input type="radio" name="assign_to_' + serviceId + '" value="guest" style="margin-right: 5px;">' +
                                     'Guest' +
                                     '</label>' +
                                     '</div>' +
                                     '</div>';
                card.append(assignmentHtml);
            }

            // Handle checkbox change
            card.find('.booknetic_collab_service_checkbox input').off('change').on('change', function(e) {
                e.stopPropagation();
                e.preventDefault();
                
                if ($(this).is(':checked')) {
                    card.addClass('booknetic_card_selected');
                    card.find('.booknetic_collab_assignment').slideDown(200);
                } else {
                    card.removeClass('booknetic_card_selected');
                    card.find('.booknetic_collab_assignment').slideUp(200);
                }

                updateSelectedCount(panel);
            });

            // Handle card click to toggle checkbox - use click with capture to intercept before Booknetic
            card.on('click.collaborative', function(e) {
                // Check what was clicked first
                var isCheckbox = $(e.target).is('input[type="checkbox"]');
                var isRadio = $(e.target).is('input[type="radio"]');
                var isLabel = $(e.target).is('label');
                
                // ALWAYS stop Booknetic's default handler from running
                e.stopImmediatePropagation();
                
                // Only preventDefault for non-input clicks
                if (!isCheckbox && !isRadio) {
                    e.preventDefault();
                }
                
                // Handle clicks on specific elements
                if (isCheckbox) {
                    // Checkbox clicked - let it toggle naturally, change event will handle UI
                    return;
                }
                
                if (isRadio) {
                    // Radio button clicked - let it work naturally
                    return;
                }
                
                if (isLabel) {
                    // Label clicked - check if it's for a radio button
                    var labelFor = $(e.target).closest('label').find('input[type="radio"]');
                    if (labelFor.length > 0) {
                        labelFor.prop('checked', true);
                        return;
                    }
                }

                // Card background clicked - toggle the checkbox
                var checkbox = $(this).find('.booknetic_collab_service_checkbox input');
                checkbox.prop('checked', !checkbox.prop('checked')).trigger('change');
                
                return false;
            });
        });

        // Add selected count indicator
        addSelectedCountIndicator(panel);

        // Restore previous selections if navigating back
        restorePreviousSelections(panel);

        // Add custom styling
        injectMultiSelectStyles();
    }

    // Update selected count indicator
    function updateSelectedCount(panel) {
        var count = panel.find('.booknetic_collab_service_checkbox input:checked').length;
        panel.find('.booknetic_collab_count').text(count + ' selected');
    }

    // Add selected count indicator
    function addSelectedCountIndicator(panel) {
        if (panel.find('.booknetic_collab_count_container').length > 0) {
            return;
        }

        var countHtml = '<div class="booknetic_collab_count_container" style="text-align: center; margin: 15px 0; font-weight: 600; color: #2196F3;">' +
                        '<span class="booknetic_collab_count">0 selected</span>' +
                        '</div>';
        
        panel.find('.booknetic_services_container').after(countHtml);
    }

    // Restore previous selections when navigating back
    function restorePreviousSelections(panel) {
        if (collaborativeService.selectedServices.length === 0) {
            return;
        }

        console.log('Service Collaborative: Restoring previous selections:', collaborativeService.selectedServices);

        collaborativeService.selectedServices.forEach(function(item) {
            var card = panel.find('.booknetic_service_card[data-id="' + item.service_id + '"]');
            if (card.length > 0) {
                card.find('.booknetic_collab_service_checkbox input').prop('checked', true).trigger('change');
                card.find('input[name="assign_to_' + item.service_id + '"][value="' + item.assigned_to + '"]').prop('checked', true);
            }
        });
    }

    // Inject custom styles for multi-select
    function injectMultiSelectStyles() {
        if ($('#booknetic_collab_service_styles').length > 0) {
            return;
        }

        var styles = '<style id="booknetic_collab_service_styles">' +
                     '.booknetic_service_card { position: relative; cursor: pointer; transition: all 0.2s; }' +
                     '.booknetic_service_card.booknetic_card_selected { border-color: #2196F3 !important; box-shadow: 0 0 0 2px rgba(33, 150, 243, 0.2); }' +
                     '.booknetic_collab_service_checkbox input:hover { transform: scale(1.1); }' +
                     '.booknetic_collab_assignment { animation: slideDown 0.2s; }' +
                     '@keyframes slideDown { from { opacity: 0; } to { opacity: 1; } }' +
                     '</style>';
        
        $('head').append(styles);
    }

})(jQuery);
