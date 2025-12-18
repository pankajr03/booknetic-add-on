(function($) {
    'use strict';

    console.log('=== Service Collaborative Script Loaded ===');
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
            
            console.log('Saved to cart - selected_services:', cartItem.selected_services);
        }
        
        return cartItem;
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
        // Method 1: Check if category ID is in the step container
        var stepContainer = panel.find('[data-step-id="service"]');
        if (stepContainer.length > 0 && stepContainer.data('category-id')) {
            return stepContainer.data('category-id');
        }

        // Method 2: Get from first service card via AJAX or stored data
        // Since services can belong to different categories, we'll get it from the first service
        var firstServiceId = panel.find('.booknetic_service_card').first().data('id');
        if (firstServiceId) {
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
                    if (response.success && response.data && response.data.category_id) {
                        categoryId = response.data.category_id;
                    }
                }
            });
            return categoryId;
        }

        // Method 3: Try from category title element
        var categoryTitle = panel.find('.booknetic_category_title, [data-category-id]').first();
        if (categoryTitle.length > 0 && categoryTitle.data('category-id')) {
            return categoryTitle.data('category-id');
        }

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
