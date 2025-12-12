/**
 * Service Integration for Collaborative Categories
 * Shows collaborative settings info when editing services
 */
(function($) {
    'use strict';

    var ServiceIntegration = {
        init: function() {
            this.hookIntoServiceModal();
        },

        /**
         * Hook into service modal to show category collaborative info
         */
        hookIntoServiceModal: function() {
            var self = this;

            // Listen for service modal events
            $(document).on('change', '#input_category', function() {
                var categoryId = $(this).val();
                if (categoryId) {
                    self.showCategoryCollaborativeInfo(categoryId);
                }
            });

            // Also check on modal open
            $(document).on('click', '[data-load-modal="Services.add_new"], [data-action="edit"]', function() {
                setTimeout(function() {
                    var categoryId = $('#input_category').val();
                    if (categoryId) {
                        self.showCategoryCollaborativeInfo(categoryId);
                    }
                }, 500);
            });
        },

        /**
         * Show collaborative info for selected category
         */
        showCategoryCollaborativeInfo: function(categoryId) {
            $.ajax({
                url: bkntcCollabService.ajax_url,
                type: 'POST',
                data: {
                    action: 'bkntc_collab_get_service_category_settings',
                    nonce: bkntcCollabService.nonce,
                    category_id: categoryId
                },
                success: function(response) {
                    if (response.success && response.data) {
                        ServiceIntegration.displayCategoryInfo(response.data);
                    }
                }
            });
        },

        /**
         * Display category collaborative info in the modal
         */
        displayCategoryInfo: function(data) {
            // Remove existing info box
            $('.collab-category-info').remove();

            if (!data.has_settings) {
                return;
            }

            var infoHtml = '<div class="collab-category-info" style="background: #e8f4fd; border-left: 4px solid #6c63ff; padding: 12px; margin: 15px 0; border-radius: 4px;">';
            infoHtml += '<h5 style="margin: 0 0 8px 0; color: #6c63ff; font-size: 14px;"><i class="fa fa-info-circle"></i> Collaborative Category Settings</h5>';
            infoHtml += '<ul style="margin: 0; padding-left: 20px; font-size: 13px;">';
            
            if (data.min_staff > 0) {
                infoHtml += '<li><strong>Minimum Staff:</strong> ' + data.min_staff + '</li>';
            }
            
            if (data.max_staff > 0) {
                infoHtml += '<li><strong>Maximum Staff:</strong> ' + data.max_staff + '</li>';
            } else if (data.min_staff > 0) {
                infoHtml += '<li><strong>Maximum Staff:</strong> Unlimited</li>';
            }
            
            if (data.staff_ids && data.staff_ids.length > 0) {
                infoHtml += '<li><strong>Eligible Staff:</strong> ' + data.staff_ids.length + ' staff member(s) selected</li>';
            }
            
            infoHtml += '</ul>';
            infoHtml += '<p style="margin: 8px 0 0 0; font-size: 12px; color: #666;"><em>These settings from the category will apply to collaborative bookings for this service.</em></p>';
            infoHtml += '</div>';

            // Insert after category dropdown
            $('#input_category').closest('.form-group').after(infoHtml);
        }
    };

    // Initialize when document is ready
    $(document).ready(function() {
        // Only init if we're on services page
        if (window.location.href.indexOf('module=services') !== -1) {
            ServiceIntegration.init();
        }
    });

})(jQuery);
