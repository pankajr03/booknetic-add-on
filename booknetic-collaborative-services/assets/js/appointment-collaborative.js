(function () {
    'use strict';

    function initAppointmentCollab() {
        if (typeof jQuery === 'undefined') {
            setTimeout(initAppointmentCollab, 100);
            return;
        }

        var $ = jQuery;
        console.log('Appointment Collaborative Script Loaded');

        var appointmentCollab = {
            currentAppointmentId: null,
            initInProgress: false,

            init: function () {
                console.log('Initializing appointment multi-staff feature');
                try {
                    this.hookIntoBookneticAjax();
                    this.bindSaveEvent();
                    this.attachServiceRulesHook();
                    console.log('Appointment multi-staff initialization complete');
                } catch (e) {
                    console.error('Error initializing appointment multi-staff:', e);
                }
            },

            hookIntoBookneticAjax: function () {
                var self = this;

                try {
                    $(document).ajaxComplete(function (event, xhr, settings) {
                        try {
                            if (settings.data && typeof settings.data === 'string') {
                                if (settings.data.includes('module=appointments') &&
                                    (settings.data.includes('action=add_new') || settings.data.includes('action=edit'))) {

                                    console.log('Detected appointment modal load');

                                    setTimeout(function () {
                                        self.convertToMultiSelect();
                                        self.interceptSaveButton();
                                    }, 200);

                                    setTimeout(function () {
                                        self.convertToMultiSelect();
                                        self.interceptSaveButton();
                                    }, 500);
                                }
                            }
                        } catch (e) {
                            console.error('Error in ajaxComplete handler:', e);
                        }
                    });
                    console.log('AJAX hook attached successfully');
                } catch (e) {
                    console.error('Error hooking into AJAX:', e);
                }

                // Fallback: observe DOM for appointment modal content and #input_staff appearance
                try {
                    var domObserver = new MutationObserver(function (mutations) {
                        mutations.forEach(function (m) {
                            if (m.addedNodes && m.addedNodes.length) {
                                if (jQuery('#input_staff').length && jQuery('#collab_staff_multi').length === 0) {
                                    console.log('Detected #input_staff in DOM (fallback), initializing multi-select');
                                    self.convertToMultiSelect();
                                }
                            }
                        });
                    });
                    domObserver.observe(document.body, { childList: true, subtree: true });
                    console.log('DOM observer attached for fallback initialization');
                } catch (e) {
                    console.error('Error attaching DOM observer:', e);
                }
            },

            interceptSaveButton: function () {
                // No longer needed - we're not modifying the original dropdown
                console.log('Save interception not needed with separate additional staff field');
            },

            convertToMultiSelect: function () {
                console.log('Replacing Staff with multi-select UI (with hidden primary)');

                // Avoid duplicate setup
                if ($('#collab_staff_multi').length > 0 && $('#collab_staff_primary').length > 0) {
                    console.log('Multi-select UI already initialized, skipping');
                    return;
                }

                // Debounce rapid re-initialization
                if (this.initInProgress) {
                    console.log('Initialization already in progress, skipping');
                    return;
                }
                this.initInProgress = true;

                // Find the staff dropdown
                var originalSelect = $('#input_staff');
                if (originalSelect.length === 0) {
                    console.log('Staff dropdown not found (#input_staff)');
                    this.initInProgress = false;
                    return;
                }

                var self = this;
                var optionCount = originalSelect.find('option').length;
                if (optionCount === 0) {
                    console.log('Staff options not loaded yet; waiting for options to appear...');
                    if (!originalSelect.data('collab-watching-options')) {
                        originalSelect.data('collab-watching-options', true);
                        var optObserver = new MutationObserver(function (muts) {
                            muts.forEach(function (m) {
                                if (m.addedNodes && originalSelect.find('option').length > 0) {
                                    console.log('Staff options detected, re-running multi-select init');
                                    try { optObserver.disconnect(); } catch (e) { }
                                    originalSelect.data('collab-watching-options', false);
                                    setTimeout(function () { self.convertToMultiSelect(); }, 50);
                                }
                            });
                        });
                        optObserver.observe(originalSelect[0], { childList: true, subtree: true });
                    }
                    this.initInProgress = false;
                    return;
                }

                // Build multi-select container
                var containerHtml = '' +
                    '<div class="form-group" id="collab_staff_container" style="margin-top: 8px;">'
                    + '  <label>Staff (Multi-select)</label>'
                    + '  <select class="form-control" id="collab_staff_multi" multiple style="min-height: 140px;"></select>'
                    + '  <small class="form-text text-muted">First selected = primary; others = collaborators.</small>'
                    + '  <div id="collab_staff_hint" style="margin-top:5px; font-size:12px; color:#666;"></div>'
                    + '</div>';

                // Insert after original field
                var group = originalSelect.closest('.form-group');
                group.after(containerHtml);

                var multiSelect = $('#collab_staff_multi');

                // Create hidden single-select to mirror primary for Booknetic
                var hiddenPrimary = $('<select/>', {
                    id: 'collab_staff_primary',
                    name: originalSelect.attr('name') || 'staff',
                    style: 'display:none;'
                });

                var originalOptions = originalSelect.find('option').clone();
                console.log('Original staff options count:', originalOptions.length);
                hiddenPrimary.append(originalOptions);

                // Replace original with hidden (so Booknetic still reads a single value)
                originalSelect.replaceWith(hiddenPrimary);

                // Function to sync multi-select with hidden primary
                var syncMultiSelectOptions = function () {
                    var optionsToClone = hiddenPrimary.find('option').clone();
                    var currentValues = multiSelect.val() || [];
                    console.log('Syncing options - count:', optionsToClone.length);

                    multiSelect.empty().append(optionsToClone);
                    multiSelect.find('option[value=""]').remove();

                    // Restore previous selections if possible
                    if (currentValues.length > 0) {
                        multiSelect.val(currentValues);
                    }

                    try { multiSelect.trigger('change.select2'); } catch (e) { }
                    console.log('Multi-select options synced:', multiSelect.find('option').length);
                };

                // Initial population
                syncMultiSelectOptions();

                // Initialize Select2 if available
                try { multiSelect.select2({ width: '100%', placeholder: 'Select staff' }); } catch (e) { }

                // Sync logic: when user changes multi-select
                var syncPrimary = function () {
                    var selected = multiSelect.val() || [];
                    // First selected is primary
                    var primary = selected.length ? selected[0] : '';
                    hiddenPrimary.val(primary);
                    console.log('Primary staff set to:', primary, 'Collaborators:', selected.slice(1));
                    // Store collaborators for later save
                    multiSelect.data('collab-staff-ids', selected);
                };

                multiSelect.on('change', syncPrimary);

                // Watch for staff options being populated by Booknetic (e.g., after service selection)
                var mo = new MutationObserver(function (muts) {
                    muts.forEach(function (m) {
                        if (m.type === 'childList' && m.addedNodes.length > 0) {
                            // Check if new options were added to hidden primary
                            var newOptions = hiddenPrimary.find('option').length;
                            if (newOptions > 0) {
                                console.log('Detected staff options update in hidden primary, syncing multi-select');
                                syncMultiSelectOptions();
                            }
                        }
                    });
                });
                mo.observe(hiddenPrimary[0], { childList: true, subtree: true });

                // Initial primary selection from existing value
                setTimeout(function () {
                    var existingPrimary = hiddenPrimary.val();
                    if (existingPrimary) {
                        multiSelect.val([existingPrimary]);
                        try { multiSelect.trigger('change.select2'); } catch (e) { }
                        syncPrimary();
                    }
                }, 300);

                console.log('Multi-select Staff UI ready');

                // Optional: show min/max hints if available from global config
                try {
                    var hintEl = $('#collab_staff_hint');
                    var minMax = window.bkntcCollabSvcRules || null; // expected to be injected elsewhere if available
                    if (minMax && minMax.min != null && minMax.max != null) {
                        hintEl.text('Select between ' + minMax.min + ' and ' + minMax.max + ' staff for this service category.');
                    }
                } catch (e) { }

                this.initInProgress = false;
            },

            loadAppointmentStaff: function (appointmentId) {
                var self = this;

                $.ajax({
                    url: bkntcCollabAppointment.ajaxurl,
                    type: 'POST',
                    data: {
                        action: 'bkntc_collab_get_appointment_staff',
                        nonce: bkntcCollabAppointment.nonce,
                        appointment_id: appointmentId
                    },
                    success: function (response) {
                        console.log('Appointment staff response:', response);
                        if (response.success && response.data.staff_ids && response.data.staff_ids.length > 0) {
                            var allStaffIds = response.data.staff_ids;
                            var primaryStaffId = response.data.primary_staff_id || allStaffIds[0];

                            console.log('Primary staff ID:', primaryStaffId);
                            console.log('All staff IDs:', allStaffIds);

                            // Preselect in multi-select: include primary first
                            var multiSelect = $('#collab_staff_multi');
                            if (multiSelect.length) {
                                // Ensure primary is first in selection array
                                var ordered = [primaryStaffId].concat(allStaffIds.filter(function (id) { return id != primaryStaffId; }));
                                multiSelect.val(ordered);
                                try { multiSelect.trigger('change.select2'); } catch (e) { }
                                // Sync hidden primary
                                $('#collab_staff_primary').val(primaryStaffId);
                                multiSelect.data('collab-staff-ids', ordered);
                                console.log('Preselected collaborators in multi-select:', ordered);
                            }
                        }
                    },
                    error: function (xhr, status, error) {
                        console.error('Error loading appointment staff:', error);
                        // Silently fail for load errors - might be new appointment
                    }
                });
            },

            bindSaveEvent: function () {
                var self = this;

                try {
                    // Only listen for successful saves, don't interfere with the request
                    $(document).ajaxSuccess(function (event, xhr, settings) {
                        try {
                            // Try to parse response
                            var response = xhr.responseJSON;
                            if (!response && xhr.responseText) {
                                try {
                                    response = JSON.parse(xhr.responseText);
                                } catch (e) {
                                    // Not JSON
                                }
                            }

                            // Check if this is an appointment save
                            if (response && response.id && response.status === 'ok') {
                                // Check if settings indicate an appointment action
                                if (settings.data && typeof settings.data === 'string' &&
                                    settings.data.includes('module=appointments') &&
                                    settings.data.includes('action=create_appointment')) {

                                    var appointmentId = parseInt(response.id);
                                    console.log('Detected appointment save with ID:', appointmentId);

                                    setTimeout(function () {
                                        self.saveAppointmentStaff(appointmentId);
                                    }, 300);
                                }
                            }
                        } catch (e) {
                            console.error('Error in ajaxSuccess handler:', e);
                        }
                    });
                    console.log('Save event listener attached successfully');
                } catch (e) {
                    console.error('Error binding save event:', e);
                }
            },

            // Fetch min/max rules when service changes and resync staff options
            attachServiceRulesHook: function () {
                var self = this;

                var attachHandler = function () {
                    var $service = $('#input_service');
                    console.log('attachServiceRulesHook: found #input_service?', $service.length > 0);
                    if ($service.length === 0) {
                        return false;
                    }

                    $service.off('change.bkntcCollab').on('change.bkntcCollab', function () {
                        console.log('SERVICE CHANGED EVENT FIRED');
                        var sid = $service.val();
                        console.log('Selected service ID:', sid);
                        if (!sid) return;

                        // Wait a moment for Booknetic to populate staff options, then sync
                        console.log('Service changed, waiting for staff options to populate...');
                        setTimeout(function () {
                            var $multiSelect = $('#collab_staff_multi');
                            if ($multiSelect.length) {
                                var $hidden = $('#collab_staff_primary');
                                if ($hidden.length) {
                                    var optionsCount = $hidden.find('option').length;
                                    console.log('Staff options available after service change:', optionsCount);
                                    var optionsToClone = $hidden.find('option').clone();
                                    var currentValues = $multiSelect.val() || [];
                                    $multiSelect.empty().append(optionsToClone);
                                    $multiSelect.find('option[value=""]').remove();
                                    if (currentValues.length) {
                                        $multiSelect.val(currentValues);
                                    }
                                    try { $multiSelect.trigger('change.select2'); } catch (e) { }
                                }
                            }
                        }, 350);

                        $.ajax({
                            url: bkntcCollabAppointment.ajaxurl,
                            type: 'POST',
                            data: {
                                action: 'bkntc_collab_get_category_rules',
                                nonce: bkntcCollabAppointment.nonce,
                                service_id: sid
                            },
                            success: function (resp) {
                                if (resp && resp.success) {
                                    window.bkntcCollabSvcRules = resp.data;
                                    var hintEl = $('#collab_staff_hint');
                                    if (hintEl.length) {
                                        var mm = resp.data;
                                        if (mm && mm.min != null && mm.max != null) {
                                            hintEl.text('Select between ' + mm.min + ' and ' + mm.max + ' staff for this service category.');
                                        } else {
                                            hintEl.text('');
                                        }
                                    }
                                }
                            }
                        });
                    });

                    return true;
                };

                // Try immediate attach; if not present, observe DOM until it appears
                if (!attachHandler()) {
                    console.log('WARNING: #input_service not found, observing DOM to attach when available');
                    var serviceObserver = new MutationObserver(function (muts) {
                        var found = false;
                        muts.forEach(function (m) {
                            if (m.addedNodes && m.addedNodes.length) {
                                if ($('#input_service').length) {
                                    found = true;
                                }
                            }
                        });
                        if (found) {
                            var attached = attachHandler();
                            if (attached) {
                                try { serviceObserver.disconnect(); } catch (e) { }
                                console.log('Service change hook attached after DOM observation');
                            }
                        }
                    });
                    serviceObserver.observe(document.body, { childList: true, subtree: true });
                }
            },

            saveAppointmentStaff: function (appointmentId) {
                console.log('Saving appointment staff for ID:', appointmentId);

                // Primary from hidden single-select; collaborators from multi-select
                var primaryStaff = $('#collab_staff_primary').val();
                var selectedAll = $('#collab_staff_multi').data('collab-staff-ids') || $('#collab_staff_multi').val() || [];

                // Ensure primary is first
                var allStaffIds = [];
                if (primaryStaff) allStaffIds.push(primaryStaff);
                (selectedAll || []).forEach(function (id) { if (allStaffIds.indexOf(id) === -1) allStaffIds.push(id); });

                console.log('Primary staff:', primaryStaff);
                console.log('All selected staff:', selectedAll);
                console.log('All staff IDs to save:', allStaffIds);

                if (allStaffIds.length === 0) {
                    console.log('No staff selected, skipping collaborative staff save');
                    return;
                }

                // Build data object with staff_ids[] array
                var data = {
                    action: 'bkntc_collab_save_appointment_staff',
                    nonce: bkntcCollabAppointment.nonce,
                    appointment_id: appointmentId
                };

                // Add each staff ID as staff_ids[]
                for (var i = 0; i < allStaffIds.length; i++) {
                    data['staff_ids[' + i + ']'] = allStaffIds[i];
                }

                $.ajax({
                    url: bkntcCollabAppointment.ajaxurl,
                    type: 'POST',
                    data: data,
                    success: function (response) {
                        console.log('Save staff response:', response);
                        if (response.success) {
                            console.log('Appointment staff saved successfully');
                        } else {
                            console.error('Save failed:', response);
                        }
                    },
                    error: function (xhr, status, error) {
                        console.error('Error saving appointment staff:', error);
                    }
                });
            },

            getAppointmentIdFromForm: function () {
                // Try to find appointment ID from form
                var idInput = $('[name="id"]');
                if (idInput.length && idInput.val()) {
                    return parseInt(idInput.val());
                }
                return 0;
            }
        };

        // Don't initialize immediately, wait for jQuery to be ready
        // This prevents interference with Booknetic's page load
        if (document.readyState === 'loading') {
            $(document).ready(function () {
                setTimeout(function () {
                    appointmentCollab.init();
                }, 500);
            });
        } else {
            setTimeout(function () {
                appointmentCollab.init();
            }, 500);
        }
    }

    initAppointmentCollab();
})();
