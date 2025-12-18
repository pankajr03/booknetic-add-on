(function($) {
    'use strict';

    var ServiceCollaborative = {
        init: function() {
            console.log('ServiceCollaborative: Initializing');
            
            // Hook into service modal open
            $(document).on('DOMNodeInserted', function(e) {
                if ($(e.target).hasClass('modal') || $(e.target).find('.modal').length > 0) {
                    setTimeout(function() {
                        ServiceCollaborative.injectServiceFields();
                    }, 500);
                }
            });

            // Hook into service save
            $(document).on('click', '.modal .btn-success', function() {
                setTimeout(function() {
                    ServiceCollaborative.saveServiceSettings();
                }, 100);
            });
        },

        injectServiceFields: function() {
            var modal = $('.modal:visible').last();
            if (modal.length === 0) return;

            var form = modal.find('form').first();
            if (form.length === 0) return;

            // Check if already injected
            if ($('#bkntc_collab_service_fields').length > 0) {
                console.log('ServiceCollaborative: Fields already injected');
                return;
            }

            // Check if this is the service modal (look for service-related fields)
            if (form.find('input[name="name"]').length === 0 || form.find('select[name="category_id"]').length === 0) {
                return;
            }

            console.log('ServiceCollaborative: Injecting min/max staff fields into service modal');

            var html = '\
                <div id="bkntc_collab_service_fields" class="form-row">\
                    <div class="form-group col-md-12">\
                        <label style="font-weight: 600; color: #2196F3; margin-bottom: 10px;">\
                            <span style="background: #2196F3; color: white; padding: 2px 8px; border-radius: 3px; font-size: 11px; margin-right: 5px;">COLLAB</span>\
                            Collaborative Booking Settings\
                        </label>\
                    </div>\
                    <div class="form-group col-md-6">\
                        <label for="bkntc_collab_service_min_staff">Minimum Staff Required</label>\
                        <input type="number" \
                               class="form-control" \
                               id="bkntc_collab_service_min_staff" \
                               name="collab_min_staff" \
                               min="1" \
                               value="1"\
                               placeholder="1">\
                        <small class="form-text text-muted">Minimum staff members required for this service</small>\
                    </div>\
                    <div class="form-group col-md-6">\
                        <label for="bkntc_collab_service_max_staff">Maximum Staff Allowed</label>\
                        <input type="number" \
                               class="form-control" \
                               id="bkntc_collab_service_max_staff" \
                               name="collab_max_staff" \
                               min="1" \
                               value="1"\
                               placeholder="1">\
                        <small class="form-text text-muted">Maximum staff members allowed for this service</small>\
                    </div>\
                </div>\
            ';

            // Insert before the last form-row (usually contains buttons)
            var lastFormRow = form.find('.form-row').last();
            if (lastFormRow.length > 0) {
                lastFormRow.before(html);
            } else {
                form.append(html);
            }

            console.log('ServiceCollaborative: Fields injected successfully');

            // Load existing values if editing
            this.loadServiceSettings();
        },

        loadServiceSettings: function() {
            var modal = $('.modal:visible').last();
            var serviceId = modal.find('input[name="id"]').val();

            if (!serviceId || serviceId == '' || serviceId == '0') {
                console.log('ServiceCollaborative: New service, using defaults');
                return;
            }

            console.log('ServiceCollaborative: Loading settings for service ID:', serviceId);

            $.ajax({
                url: ajaxurl,
                type: 'POST',
                data: {
                    action: 'bkntc_collab_get_service_settings',
                    service_id: serviceId
                },
                success: function(response) {
                    console.log('ServiceCollaborative: Load response:', response);
                    if (response.success && response.data) {
                        $('#bkntc_collab_service_min_staff').val(response.data.collab_min_staff || 1);
                        $('#bkntc_collab_service_max_staff').val(response.data.collab_max_staff || 1);
                    }
                }
            });
        },

        saveServiceSettings: function() {
            // Note: Booknetic will handle saving via its own AJAX
            // The fields with name="collab_min_staff" and name="collab_max_staff" 
            // will be included in the form submission automatically
            console.log('ServiceCollaborative: Min staff =', $('#bkntc_collab_service_min_staff').val());
            console.log('ServiceCollaborative: Max staff =', $('#bkntc_collab_service_max_staff').val());
        }
    };

    $(document).ready(function() {
        ServiceCollaborative.init();
    });

})(jQuery);
