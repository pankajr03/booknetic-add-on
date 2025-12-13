(function($) {
    'use strict';

    if (typeof bookneticHooks === 'undefined') {
        console.warn('Booknetic hooks not available, collaborative frontend features disabled');
        return;
    }

    var collaborativeBooking = {
        categoryRules: null,
        selectedStaff: [],

        init: function() {
            console.log('Collaborative booking frontend initialized');
            this.hookIntoBookingPanel();
        },

        hookIntoBookingPanel: function() {
            var self = this;

            // Hook after booking panel loads
            bookneticHooks.addAction('booking_panel_loaded', function(booknetic) {
                console.log('Booking panel loaded, initializing collaborative features');
                self.booknetic = booknetic;
                self.reorderSteps(booknetic);
                self.attachServiceChangeListener(booknetic);
            });

            // Hook when staff step is loading
            bookneticHooks.addAction('before_step_loading', function(booknetic, new_step_id, old_step_id) {
                if (new_step_id === 'staff') {
                    console.log('Staff step loading, preparing multi-staff UI');
                    self.prepareStaffStep(booknetic);
                }
            });

            // Hook after staff step HTML is loaded
            bookneticHooks.addFilter('step_loaded', function(result, booknetic, step_id) {
                if (step_id === 'staff') {
                    console.log('Staff step HTML loaded, converting to multi-select');
                    setTimeout(function() {
                        self.convertStaffToMultiSelect(booknetic);
                    }, 100);
                }
                return result;
            });

            // Validate staff selection before moving forward
            bookneticHooks.addFilter('step_validation_staff', function(result, booknetic) {
                return self.validateStaffSelection(result, booknetic);
            });
        },

        reorderSteps: function(booknetic) {
            var panel = booknetic.panel_js;
            var head = panel.find('.booknetic_appointment_steps_body');
            var body = panel.find('.booknetic_appointment_container_body');
            var activeId = head.find('.booknetic_active_step').data('step-id');

            // Desired order: Location -> Service -> Date & Time -> Staff -> rest
            var desiredOrder = [
                'location',
                'service',
                'date_time',
                'date_time_non_recurring',
                'date_time_recurring',
                'staff',
                'service_extras',
                'cart',
                'information',
                'confirm_details'
            ];

            desiredOrder.forEach(function(stepId) {
                var headEl = head.children('[data-step-id="' + stepId + '"]');
                if (headEl.length) {
                    headEl.detach().appendTo(head);
                }

                var bodyEl = body.children('[data-step-id="' + stepId + '"]');
                if (bodyEl.length) {
                    bodyEl.detach().appendTo(body);
                }
            });

            // Keep the currently active step active, or default to the first visible
            head.find('.booknetic_active_step').removeClass('booknetic_active_step');
            var newActive = head.children('[data-step-id="' + activeId + '"]');
            if (!newActive.length || newActive.hasClass('booknetic_menu_hidden')) {
                newActive = head.children('.booknetic_appointment_step_element').not('.booknetic_menu_hidden').first();
            }
            newActive.addClass('booknetic_active_step');

            // Sync header title and footer navigation after DOM reorder
            panel.find('.booknetic_appointment_container_header_text').text(newActive.data('title'));
            if (booknetic.stepManager && typeof booknetic.stepManager.refreshStepNumbers === 'function') {
                booknetic.stepManager.refreshStepNumbers();
            }
            if (booknetic.stepManager && typeof booknetic.stepManager.updateBookingPanelFooter === 'function') {
                booknetic.stepManager.updateBookingPanelFooter();
            }
            if (booknetic.stepManager && typeof booknetic.stepManager.updateGoNextBtn === 'function') {
                booknetic.stepManager.updateGoNextBtn(newActive);
            }
        },

        attachServiceChangeListener: function(booknetic) {
            var self = this;
            
            // Hook into booking panel to detect service selection
            var panel = booknetic.panel_js;
            
            // Watch for service card clicks
            panel.on('click', '.booknetic_service_card', function() {
                var serviceId = $(this).data('id');
                if (serviceId) {
                    console.log('Service selected:', serviceId);
                    self.fetchCategoryRules(serviceId, booknetic);
                }
            });
            
            // Also check if service is already selected (e.g., from URL params)
            var currentService = booknetic.getSelected.service();
            if (currentService > 0) {
                console.log('Service already selected on load:', currentService);
                self.fetchCategoryRules(currentService, booknetic);
            }
        },

        fetchCategoryRules: function(service_id, booknetic) {
            var self = this;

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
                        self.categoryRules = response.data;
                        console.log('Category rules loaded:', self.categoryRules);
                    } else {
                        self.categoryRules = null;
                    }
                },
                error: function(xhr, status, error) {
                    console.error('Failed to fetch category rules:', error);
                    self.categoryRules = null;
                }
            });
        },

        prepareStaffStep: function(booknetic) {
            // Prepare any data needed before staff step loads
            console.log('Preparing staff step with rules:', this.categoryRules);
        },

        convertStaffToMultiSelect: function(booknetic) {
            var self = this;
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
            
            if (self.categoryRules && self.categoryRules.min && self.categoryRules.max) {
                hintHtml += '<strong>Multi-Staff Booking:</strong> Select between ' + self.categoryRules.min + ' and ' + self.categoryRules.max + ' staff members.';
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
                    self.selectedStaff = [-1];
                    staffCards.removeClass('booknetic_selected booknetic_card_selected');
                    staffCards.find('.booknetic_collab_checkbox input').prop('checked', false);
                    card.addClass('booknetic_selected booknetic_card_selected');
                } else {
                    // Toggle staff selection
                    var checkbox = card.find('.booknetic_collab_checkbox input');
                    var isChecked = checkbox.prop('checked');

                    // Remove "Any staff" if selected
                    panel.find('.booknetic_card[data-id="-1"]').removeClass('booknetic_selected booknetic_card_selected');

                    if (!isChecked) {
                        // Check max limit
                        if (self.categoryRules && self.categoryRules.max) {
                            var currentCount = panel.find('.booknetic_collab_checkbox input:checked').length;
                            if (currentCount >= self.categoryRules.max) {
                                alert('Maximum ' + self.categoryRules.max + ' staff members can be selected.');
                                return;
                            }
                        }

                        checkbox.prop('checked', true);
                        card.addClass('booknetic_selected booknetic_card_selected');
                    } else {
                        checkbox.prop('checked', false);
                        card.removeClass('booknetic_selected booknetic_card_selected');
                    }

                    // Update selected staff array
                    self.updateSelectedStaff(panel);
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
                        .booknetic_card.booknetic_selected {
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
        },

        updateSelectedStaff: function(panel) {
            this.selectedStaff = [];
            var self = this;

            panel.find('.booknetic_collab_checkbox input:checked').each(function() {
                self.selectedStaff.push(parseInt($(this).data('staff-id')));
            });

            // Sync core selection class for compatibility with Booknetic internals
            panel.find('.booknetic_card').removeClass('booknetic_card_selected');
            panel.find('.booknetic_collab_checkbox input:checked').each(function() {
                var id = $(this).data('staff-id');
                panel.find('.booknetic_card[data-id="' + id + '"]').addClass('booknetic_card_selected');
            });

            console.log('Selected staff updated:', this.selectedStaff);
        },

        validateStaffSelection: function(result, booknetic) {
            var panel = booknetic.panel_js;

            // Get selected staff
            var selectedStaff = [];
            panel.find('.booknetic_collab_checkbox input:checked').each(function() {
                selectedStaff.push(parseInt($(this).data('staff-id')));
            });

            // Check if "Any staff" is selected
            if (panel.find('.booknetic_card[data-id="-1"]').hasClass('booknetic_selected')) {
                selectedStaff = [-1];
            }

            // Validate selection
            if (selectedStaff.length === 0) {
                return {
                    status: false,
                    errorMsg: 'Please select at least one staff member.'
                };
            }

            // Validate against category rules
            if (this.categoryRules && selectedStaff[0] !== -1) {
                if (this.categoryRules.min && selectedStaff.length < this.categoryRules.min) {
                    return {
                        status: false,
                        errorMsg: 'Please select at least ' + this.categoryRules.min + ' staff members.'
                    };
                }

                if (this.categoryRules.max && selectedStaff.length > this.categoryRules.max) {
                    return {
                        status: false,
                        errorMsg: 'Maximum ' + this.categoryRules.max + ' staff members can be selected.'
                    };
                }
            }

            // Store selected staff for later use
            this.selectedStaff = selectedStaff;
            console.log('Staff validation passed:', selectedStaff);

            return result;
        }
    };

    // Initialize when document is ready
    $(document).ready(function() {
        collaborativeBooking.init();
    });

    // Expose to global scope for debugging
    window.BookneticCollaborativeBooking = collaborativeBooking;

})(jQuery);
