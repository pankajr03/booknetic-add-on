// Wait for jQuery to be available before running the main code
// Force ajaxurl to correct value if not set or set incorrectly
window.ajaxurl = '/wp-admin/admin-ajax.php';

(function waitForjQuery() {
    if (typeof window.jQuery === 'undefined') {
        console.warn('[COLLAB] Waiting for jQuery...');
        setTimeout(waitForjQuery, 50);
        return;
    }

    (function ($) {

        var ServiceCollaborative = {

            injectServiceFields: function () {
                console.log('%c[COLLAB] injectServiceFields called', 'color: #FF9800;');

                // Try modal-based form first
                var modal = $('.modal:visible').last();
                var form = modal.find('form').first();

                // Fallback to direct form ID
                if (form.length === 0) {
                    form = $('#addServiceForm');
                }

                console.log('[COLLAB] Form found:', form.length);
                if (form.length === 0) return;

                // Prevent duplicate injection
                if ($('#bkntc_collab_service_fields').length) {
                    console.log('[COLLAB] Fields already injected');
                    return;
                }

                // Validate service modal
                var nameField = form.find('#input_name');
                var categoryField = form.find('#input_category');

                if (!nameField.length || !categoryField.length) {
                    console.log('[COLLAB] Not a service modal');
                    return;
                }

                console.log('%c[COLLAB] ✓ Service modal detected', 'color: #4CAF50; font-weight: bold;');

                var html = `
                    <div id="bkntc_collab_service_fields" class="form-row">
                        <div class="form-group col-md-12">
                            <label style="font-weight:600;color:#2196F3;margin-bottom:10px;">
                                <span style="background:#2196F3;color:#fff;padding:2px 8px;border-radius:3px;font-size:11px;margin-right:5px;">
                                    COLLAB
                                </span>
                                Collaborative Booking Settings
                            </label>
                        </div>

                        <div class="form-group col-md-6">
                            <label for="bkntc_collab_service_min_staff">Minimum Staff Required</label>
                            <input type="number"
                                   class="form-control"
                                   id="bkntc_collab_service_min_staff"
                                   name="collab_min_staff"
                                   min="1"
                                   value="1">
                            <small class="form-text text-muted">
                                Minimum staff members required for this service
                            </small>
                        </div>

                        <div class="form-group col-md-6">
                            <label for="bkntc_collab_service_max_staff">Maximum Staff Allowed</label>
                            <input type="number"
                                   class="form-control"
                                   id="bkntc_collab_service_max_staff"
                                   name="collab_max_staff"
                                   min="1"
                                   value="1">
                            <small class="form-text text-muted">
                                Maximum staff members allowed for this service
                            </small>
                        </div>
                    </div>
                `;

                var firstRow = form.find('.form-row').first();
                if (firstRow.length) {
                    firstRow.after(html);
                } else {
                    form.prepend(html);
                }

                console.log('%c[COLLAB] ✓ Fields injected successfully', 'color:#4CAF50;');
            },

            init: function () {
                const self = this;
                $(document).ready(() => {
                    self.injectServiceFields();

                    // MutationObserver to watch for modal or #addServiceForm
                    const observer = new MutationObserver(() => {
                        if ($('.modal:visible form').length || $('#addServiceForm').length) {
                            self.injectServiceFields();
                        }
                    });
                    observer.observe(document.body, { childList: true, subtree: true });
                });

                // Re-inject on tab switch
                $(document).on('click', '[data-tab="details"]', () => {
                    setTimeout(() => {
                        self.injectServiceFields();
                    }, 100);
                });

            },

            saveCollabFields: function (serviceId) {
                var minStaff = parseInt($('#bkntc_collab_service_min_staff').val()) || 1;
                var maxStaff = parseInt($('#bkntc_collab_service_max_staff').val()) || 1;
                if (minStaff < 1 || maxStaff < 1 || minStaff > maxStaff) {
                    alert('Invalid staff values');
                    return;
                }
                $.post(ajaxurl, {
                    action: 'bkntc_collab_save_service_collab_fields',
                    id: serviceId,
                    collab_min_staff: minStaff,
                    collab_max_staff: maxStaff,
                    nonce: (window.bkntcCollabService && window.bkntcCollabService.nonce) ? window.bkntcCollabService.nonce : ''
                }, function (response) {
                    if (response.success) {
                        console.log('[COLLAB] Collaborative staff fields saved');
                    } else {
                        console.error('[COLLAB][ERROR] Failed to save collaborative staff fields:', response);
                        alert('Failed to save collaborative staff fields: ' + (response.data && response.data.message ? response.data.message : 'Unknown error') + '\nFull response: ' + JSON.stringify(response));
                    }
                }).fail(function (jqXHR, textStatus, errorThrown) {
                    console.error('[COLLAB][AJAX ERROR]', textStatus, errorThrown, jqXHR.responseText);
                    alert('AJAX error: ' + textStatus + ' - ' + errorThrown + '\n' + jqXHR.responseText);
                });
            }
        };


        // Initialize
        console.log('%c[COLLAB] Initializing ServiceCollaborative', 'color:#2196F3;');
        ServiceCollaborative.init();

        // Listen for Booknetic service save (modal close)
        $(document).on('modal.hide', '.fs-modal', function () {
            var serviceId = $("#add_new_JS").data('service-id') || window.serviceId || null;
            console.log('[COLLAB][DEBUG] modal.hide triggered, serviceId:', serviceId);
            if (serviceId && window.ServiceCollaborative && typeof window.ServiceCollaborative.saveCollabFields === 'function') {
                console.log('[COLLAB][DEBUG] Calling saveCollabFields with serviceId:', serviceId);
                window.ServiceCollaborative.saveCollabFields(serviceId);
            } else {
                console.log('[COLLAB][DEBUG] Not calling saveCollabFields. serviceId:', serviceId, 'window.ServiceCollaborative:', window.ServiceCollaborative);
            }
        });

        // Listen for Booknetic service save button click
        $(document).on('click', '#addServiceSave', function (e) {
            var serviceId = $("#add_new_JS").data('service-id') || window.serviceId || null;
            console.log('[COLLAB][DEBUG] #addServiceSave clicked, serviceId:', serviceId);
            if (serviceId && window.ServiceCollaborative && typeof window.ServiceCollaborative.saveCollabFields === 'function') {
                console.log('[COLLAB][DEBUG] Calling saveCollabFields with serviceId:', serviceId);
                window.ServiceCollaborative.saveCollabFields(serviceId);
            } else {
                console.log('[COLLAB][DEBUG] Not calling saveCollabFields. serviceId:', serviceId, 'window.ServiceCollaborative:', window.ServiceCollaborative);
            }
        });

        // Expose for debugging
        window.ServiceCollaborative = ServiceCollaborative;

    })(jQuery);

})();
