(function($) {
    'use strict';

    var collaborativeStaff = {
        categoryRules: null,
        selectedStaff: []
    };

    // Hook after booking panel loads - attach event handlers
    bookneticHooks.addAction('booking_panel_loaded', function(booknetic) {
        let booking_panel_js = booknetic.panel_js;

        // Watch for service selection to fetch category rules
        booking_panel_js.on('click', '.booknetic_service_card', function() {
            var serviceId = $(this).data('id');
            if (serviceId) {
                console.log('Service selected:', serviceId);
                fetchCategoryRules(serviceId);
            }
        });

        // Check if service is already selected (e.g., from URL params)
        setTimeout(function() {
            var currentService = booknetic.getSelected.service();
            if (currentService > 0) {
                console.log('Service already selected on load:', currentService);
                fetchCategoryRules(currentService);
            }
        }, 500);
    });

    // Before staff step loads - call standard step loader
    bookneticHooks.addAction('before_step_loading', function(booknetic, new_step_id, old_step_id) {
        if (new_step_id !== 'staff')
            return;

        booknetic.stepManager.loadStandartSteps(new_step_id, old_step_id);
    });

    // After staff step loads - convert to multi-select
    bookneticHooks.addAction('loaded_step', function(booknetic, new_step_id) {
        if (new_step_id !== 'staff')
            return;

        console.log('Staff step loaded, converting to multi-select');
        setTimeout(function() {
            convertStaffToMultiSelect(booknetic);
        }, 100);
    });

    // Staff step validation - check min/max rules
    bookneticHooks.addFilter('step_validation_staff', function(result, booknetic) {
        let booking_panel_js = booknetic.panel_js;

        // Get selected staff
        var selectedStaff = [];
        booking_panel_js.find('.booknetic_collab_checkbox input:checked').each(function() {
            selectedStaff.push(parseInt($(this).data('staff-id')));
        });

        // Check if "Any staff" is selected
        if (booking_panel_js.find('.booknetic_card[data-id="-1"]').hasClass('booknetic_card_selected')) {
            selectedStaff = [-1];
        }

        // Validate selection
        if (selectedStaff.length === 0) {
            return {
                status: false,
                errorMsg: booknetic.__('select_staff') || 'Please select at least one staff member.'
            };
        }

        // Validate against category rules
        if (collaborativeStaff.categoryRules && selectedStaff[0] !== -1) {
            if (collaborativeStaff.categoryRules.min && selectedStaff.length < collaborativeStaff.categoryRules.min) {
                return {
                    status: false,
                    errorMsg: 'Please select at least ' + collaborativeStaff.categoryRules.min + ' staff members.'
                };
            }

            if (collaborativeStaff.categoryRules.max && selectedStaff.length > collaborativeStaff.categoryRules.max) {
                return {
                    status: false,
                    errorMsg: 'Maximum ' + collaborativeStaff.categoryRules.max + ' staff members can be selected.'
                };
            }
        }

        // Store selected staff for later use
        collaborativeStaff.selectedStaff = selectedStaff;
        console.log('Staff validation passed:', selectedStaff);

        return result;
    });

    // Hook to save selected staff array to cart instead of single staff ID
    bookneticHooks.addFilter('bkntc_cart', function(cartItem, booknetic) {
        if (collaborativeStaff.selectedStaff && collaborativeStaff.selectedStaff.length > 0) {
            // Store all selected staff as an array
            cartItem['collaborative_staff'] = collaborativeStaff.selectedStaff;
            console.log('Saved to cart - collaborative_staff:', collaborativeStaff.selectedStaff);
        }
        return cartItem;
    });

    // Helper: Fetch category rules via AJAX
    function fetchCategoryRules(service_id) {
        $.ajax({
            url: BookneticCollabFrontend.ajaxurl,
            type: 'POST',
            data: {
                action: 'bkntc_collab_get_frontend_category_rules',
                nonce: BookneticCollabFrontend.nonce,
                service_id: service_id
            },
            success: function(response) {
                console.log('Category rules response:', response);
                if (response.success && response.data) {
                    collaborativeStaff.categoryRules = response.data;
                    console.log('Category rules loaded:', collaborativeStaff.categoryRules);
                } else {
                    collaborativeStaff.categoryRules = null;
                }
            },
            error: function(xhr, status, error) {
                console.error('Failed to fetch category rules:', error);
                collaborativeStaff.categoryRules = null;
            }
        });
    }

    // Helper: Convert staff cards to multi-select UI
    function convertStaffToMultiSelect(booknetic) {
        var panel = booknetic.panel_js;

        // Find staff cards
        var staffCards = panel.find('.booknetic_card_container .booknetic_card[data-id]');
        if (staffCards.length === 0) {
            console.log('No staff cards found');
            return;
        }

        // Check if already converted
        if (panel.find('.booknetic_collab_staff_selector').length > 0) {
            console.log('Staff multi-select already initialized');
            return;
        }

        // Add multi-select indicator to cards
        staffCards.each(function() {
            var card = $(this);
            var staffId = card.data('id');

            // Skip "Any staff" option
            if (staffId == -1) {
                return;
            }

            // Add checkbox for selection
            if (card.find('.booknetic_collab_checkbox').length === 0) {
                card.append('<div class="booknetic_collab_checkbox"><input type="checkbox" data-staff-id="' + staffId + '"></div>');
            }
        });

        // Add hint text about min/max requirements
        var hintHtml = '<div class="booknetic_collab_staff_hint" style="padding: 15px; margin: 15px 0; background: #f0f7ff; border-left: 4px solid #2196F3; border-radius: 4px;">';
        
        if (collaborativeStaff.categoryRules && collaborativeStaff.categoryRules.min && collaborativeStaff.categoryRules.max) {
            hintHtml += '<strong>Multi-Staff Booking:</strong> Select between ' + collaborativeStaff.categoryRules.min + ' and ' + collaborativeStaff.categoryRules.max + ' staff members.';
        } else {
            hintHtml += '<strong>Multi-Staff Booking:</strong> You can select multiple staff members for this service.';
        }
        
        hintHtml += '</div>';

        panel.find('.booknetic_card_container').before(hintHtml);

        // Override click behavior for multi-select
        staffCards.off('click').on('click', function(e) {
            e.preventDefault();
            e.stopPropagation();

            var card = $(this);
            var staffId = card.data('id');

            if (staffId == -1) {
                // "Any staff" selected - clear multi-select and select single
                collaborativeStaff.selectedStaff = [-1];
                staffCards.removeClass('booknetic_card_selected');
                staffCards.find('.booknetic_collab_checkbox input').prop('checked', false);
                card.addClass('booknetic_card_selected');
            } else {
                // Toggle staff selection
                var checkbox = card.find('.booknetic_collab_checkbox input');
                var isChecked = checkbox.prop('checked');

                // Remove "Any staff" if selected
                panel.find('.booknetic_card[data-id="-1"]').removeClass('booknetic_card_selected');

                if (!isChecked) {
                    // Check max limit
                    if (collaborativeStaff.categoryRules && collaborativeStaff.categoryRules.max) {
                        var currentCount = panel.find('.booknetic_collab_checkbox input:checked').length;
                        if (currentCount >= collaborativeStaff.categoryRules.max) {
                            alert('Maximum ' + collaborativeStaff.categoryRules.max + ' staff members can be selected.');
                            return;
                        }
                    }

                    checkbox.prop('checked', true);
                    card.addClass('booknetic_card_selected');
                } else {
                    checkbox.prop('checked', false);
                    card.removeClass('booknetic_card_selected');
                }

                // Update selected staff array
                updateSelectedStaff(panel);
            }
        });

        // Add custom CSS
        if ($('#booknetic_collab_staff_styles').length === 0) {
            $('head').append(`
                <style id="booknetic_collab_staff_styles">
                    .booknetic_collab_checkbox {
                        position: absolute;
                        top: 10px;
                        right: 10px;
                        width: 24px;
                        height: 24px;
                        background: white;
                        border: 2px solid #ddd;
                        border-radius: 4px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        z-index: 10;
                    }
                    .booknetic_collab_checkbox input[type="checkbox"] {
                        width: 18px;
                        height: 18px;
                        cursor: pointer;
                    }
                    .booknetic_card {
                        position: relative;
                        cursor: pointer;
                        transition: all 0.3s ease;
                    }
                    .booknetic_card.booknetic_card_selected {
                        border: 2px solid #2196F3;
                        box-shadow: 0 2px 8px rgba(33, 150, 243, 0.3);
                    }
                    .booknetic_collab_staff_hint {
                        font-size: 14px;
                        line-height: 1.6;
                    }
                </style>
            `);
        }

        console.log('Staff multi-select UI initialized');
    }

    // Helper: Update selected staff array and sync classes
    function updateSelectedStaff(panel) {
        collaborativeStaff.selectedStaff = [];

        panel.find('.booknetic_collab_checkbox input:checked').each(function() {
            collaborativeStaff.selectedStaff.push(parseInt($(this).data('staff-id')));
        });

        // Sync core selection class for compatibility with Booknetic internals
        panel.find('.booknetic_card').removeClass('booknetic_card_selected');
        panel.find('.booknetic_collab_checkbox input:checked').each(function() {
            var id = $(this).data('staff-id');
            panel.find('.booknetic_card[data-id="' + id + '"]').addClass('booknetic_card_selected');
        });

        console.log('Selected staff updated:', collaborativeStaff.selectedStaff);
    }

    // Expose to global scope for debugging
    window.BookneticCollaborativeStaff = collaborativeStaff;

})(jQuery);
