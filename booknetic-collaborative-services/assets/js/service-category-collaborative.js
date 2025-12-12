/**
 * Service Category Collaborative Fields
 * Injects collaborative booking fields into Booknetic service category modal
 */
(function($) {
    'use strict';

    var CollabCategoryFields = {
        staffList: [],
        currentCategoryId: 0,

        init: function() {
            this.hookIntoModal();
            this.loadStaffList();
            this.addVisualIndicators();
            this.addBulkSettingsButton();
        },

        /**
         * Add visual indicators to category table rows
         */
        addVisualIndicators: function() {
            var self = this;
            
            // Wait for table to load
            setTimeout(function() {
                var $table = $('table.table');
                if ($table.length === 0) return;

                // Get all category rows
                $table.find('tbody tr').each(function() {
                    var $row = $(this);
                    var categoryId = $row.find('[data-action="edit"]').data('id');
                    
                    if (categoryId) {
                        self.checkAndAddIndicator($row, categoryId);
                    }
                });
            }, 1000);
        },

        /**
         * Check if category has collaborative settings and add indicator
         */
        checkAndAddIndicator: function($row, categoryId) {
            $.ajax({
                url: bkntcCollabCategory.ajax_url,
                type: 'POST',
                data: {
                    action: 'bkntc_collab_get_category_settings',
                    nonce: bkntcCollabCategory.nonce,
                    category_id: categoryId
                },
                success: function(response) {
                    if (response.success && response.data) {
                        var hasSettings = response.data.min_staff > 0 || 
                                        response.data.max_staff > 0 || 
                                        (response.data.staff_ids && response.data.staff_ids.length > 0);
                        
                        if (hasSettings) {
                            var $nameCell = $row.find('td:eq(1)');
                            if ($nameCell.find('.collab-indicator').length === 0) {
                                var badge = '<span class="collab-indicator" title="Has collaborative settings" style="margin-left: 8px; background: #6c63ff; color: white; padding: 2px 8px; border-radius: 10px; font-size: 11px; font-weight: bold;">COLLAB</span>';
                                $nameCell.append(badge);
                            }
                        }
                    }
                }
            });
        },

        /**
         * Add bulk settings button to category page
         */
        addBulkSettingsButton: function() {
            var self = this;
            
            setTimeout(function() {
                var $addButton = $('.data-table-actions .btn-success');
                if ($addButton.length > 0 && $('.btn-bulk-collab').length === 0) {
                    var bulkBtn = '<button type="button" class="btn btn-primary btn-bulk-collab" style="margin-left: 10px;"><i class="fa fa-users"></i> Bulk Collaborative Settings</button>';
                    $addButton.after(bulkBtn);
                    
                    $('.btn-bulk-collab').on('click', function() {
                        self.showBulkSettingsModal();
                    });
                }
            }, 500);
        },

        /**
         * Show bulk settings modal
         */
        showBulkSettingsModal: function() {
            var self = this;
            
            var modalHtml = `
                <div class="fs-modal" id="collab-bulk-modal" style="display: block;">
                    <div class="fs-modal-dialog">
                        <div class="fs-modal-content">
                            <div class="fs-modal-title">
                                <div class="title-icon badge-lg badge-purple"><i class="fa fa-users"></i></div>
                                <div class="title-text">Apply Bulk Collaborative Settings</div>
                                <div class="close-btn" onclick="jQuery('#collab-bulk-modal').remove();"><i class="fa fa-times"></i></div>
                            </div>
                            <div class="fs-modal-body">
                                <div class="fs-modal-body-inner">
                                    <p>Apply these collaborative settings to all selected categories:</p>
                                    
                                    <div class="form-group">
                                        <label>Select Categories</label>
                                        <select multiple class="form-control" id="bulk_category_ids" style="height: 150px;">
                                        </select>
                                        <small class="form-text text-muted">Hold Ctrl/Cmd to select multiple</small>
                                    </div>
                                    
                                    <div class="form-row">
                                        <div class="form-group col-md-6">
                                            <label>Minimum Staff</label>
                                            <input type="number" class="form-control" id="bulk_min_staff" min="0" value="0">
                                        </div>
                                        <div class="form-group col-md-6">
                                            <label>Maximum Staff</label>
                                            <input type="number" class="form-control" id="bulk_max_staff" min="0" value="0">
                                        </div>
                                    </div>
                                    
                                    <div class="form-group">
                                        <label>Eligible Staff Members</label>
                                        <select multiple class="form-control" id="bulk_staff_ids" style="height: 120px;">
                                            ${self.getStaffOptionsHtml()}
                                        </select>
                                    </div>
                                </div>
                            </div>
                            <div class="fs-modal-footer">
                                <button type="button" class="btn btn-lg btn-default" onclick="jQuery('#collab-bulk-modal').remove();">CLOSE</button>
                                <button type="button" class="btn btn-lg btn-primary" id="apply_bulk_settings">APPLY TO SELECTED</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            $('body').append(modalHtml);
            
            // Load categories
            this.loadCategoriesForBulk();
            
            // Handle apply button
            $('#apply_bulk_settings').on('click', function() {
                self.applyBulkSettings();
            });
        },

        /**
         * Load categories for bulk modal
         */
        loadCategoriesForBulk: function() {
            // Get categories from the table
            var categories = [];
            $('table.table tbody tr').each(function() {
                var $row = $(this);
                var id = $row.find('[data-action="edit"]').data('id');
                var name = $row.find('td:eq(1)').text().trim().replace('COLLAB', '').trim();
                
                if (id && name) {
                    categories.push({id: id, name: name});
                }
            });
            
            var $select = $('#bulk_category_ids');
            $select.empty();
            
            categories.forEach(function(cat) {
                $select.append('<option value="' + cat.id + '">' + cat.name + '</option>');
            });
        },

        /**
         * Apply bulk settings to selected categories
         */
        applyBulkSettings: function() {
            var categoryIds = $('#bulk_category_ids').val() || [];
            var minStaff = parseInt($('#bulk_min_staff').val()) || 0;
            var maxStaff = parseInt($('#bulk_max_staff').val()) || 0;
            var staffIds = $('#bulk_staff_ids').val() || [];
            
            if (categoryIds.length === 0) {
                this.showError('Please select at least one category');
                return;
            }
            
            if (!this.validateSettings(minStaff, maxStaff)) {
                return;
            }
            
            var self = this;
            var completed = 0;
            
            categoryIds.forEach(function(categoryId) {
                $.ajax({
                    url: bkntcCollabCategory.ajax_url,
                    type: 'POST',
                    data: {
                        action: 'bkntc_collab_save_category_settings',
                        nonce: bkntcCollabCategory.nonce,
                        category_id: categoryId,
                        min_staff: minStaff,
                        max_staff: maxStaff,
                        staff_ids: staffIds
                    },
                    success: function() {
                        completed++;
                        if (completed === categoryIds.length) {
                            $('#collab-bulk-modal').remove();
                            if (typeof booknetic !== 'undefined' && booknetic.toast) {
                                booknetic.toast('Bulk settings applied to ' + completed + ' categories', 'success');
                            }
                            // Refresh indicators
                            setTimeout(function() {
                                self.addVisualIndicators();
                            }, 500);
                        }
                    }
                });
            });
        },

        /**
         * Hook into Booknetic's modal events to inject our fields
         */
        hookIntoModal: function() {
            var self = this;

            // Listen for modal shown event
            $(document).on('click', '[data-load-modal="Services.add_new"]', function() {
                setTimeout(function() {
                    self.injectFields();
                }, 500);
            });

            // Also listen for edit buttons
            $(document).on('click', '.table-actions [data-action="edit"]', function() {
                setTimeout(function() {
                    self.injectFields();
                }, 500);
            });
        },

        /**
         * Load staff list from server
         */
        loadStaffList: function() {
            var self = this;

            $.ajax({
                url: bkntcCollabCategory.ajax_url,
                type: 'POST',
                data: {
                    action: 'bkntc_collab_get_staff_list',
                    nonce: bkntcCollabCategory.nonce
                },
                success: function(response) {
                    if (response.success && response.data) {
                        self.staffList = response.data;
                    }
                }
            });
        },

        /**
         * Inject collaborative fields into the modal
         */
        injectFields: function() {
            var self = this;

            // Check if modal exists
            var $modal = $('.fs-modal:visible');
            if ($modal.length === 0) return;

            // Check if fields already injected
            if ($modal.find('#collab_min_staff').length > 0) return;

            // Get category ID from the form or modal data
            var categoryId = $('#add_new_JS').data('category-id') || 0;
            self.currentCategoryId = categoryId;

            // Find the form
            var $form = $modal.find('#addServiceForm');
            if ($form.length === 0) return;

            // Create collaborative fields HTML
            var fieldsHtml = `
                <div class="form-row collab-fields-section">
                    <div class="form-group col-md-12">
                        <hr style="margin: 20px 0;">
                        <h5 style="margin-bottom: 15px; color: #6c63ff;">Collaborative Service Settings</h5>
                    </div>
                    
                    <div class="form-group col-md-6">
                        <label for="collab_min_staff">Minimum Staff (Min-Staff)</label>
                        <input type="number" class="form-control" id="collab_min_staff" 
                               min="0" value="0" placeholder="e.g., 2">
                        <small class="form-text text-muted">Minimum number of staff required for this service</small>
                    </div>
                    
                    <div class="form-group col-md-6">
                        <label for="collab_max_staff">Maximum Staff (Max-Staff)</label>
                        <input type="number" class="form-control" id="collab_max_staff" 
                               min="0" value="0" placeholder="e.g., 5 (0 = unlimited)">
                        <small class="form-text text-muted">Maximum number of staff allowed (0 for unlimited)</small>
                    </div>
                    
                    <div class="form-group col-md-12">
                        <label for="collab_staff_ids">Eligible Staff Members</label>
                        <select multiple class="form-control" id="collab_staff_ids" 
                                style="height: 150px;">
                            ${self.getStaffOptionsHtml()}
                        </select>
                        <small class="form-text text-muted">Hold Ctrl/Cmd to select multiple staff members who can be assigned to this collaborative service</small>
                    </div>
                </div>
            `;

            // Append fields to form
            $form.append(fieldsHtml);

            // Load existing settings if editing
            if (categoryId > 0) {
                self.loadCategorySettings(categoryId);
            }

            // Hook into save button
            self.hookSaveButton();
        },

        /**
         * Generate HTML options for staff select
         */
        getStaffOptionsHtml: function() {
            var html = '';
            for (var i = 0; i < this.staffList.length; i++) {
                var staff = this.staffList[i];
                html += '<option value="' + staff.id + '">' + staff.name + '</option>';
            }
            return html || '<option disabled>No staff members found</option>';
        },

        /**
         * Load existing category settings
         */
        loadCategorySettings: function(categoryId) {
            $.ajax({
                url: bkntcCollabCategory.ajax_url,
                type: 'POST',
                data: {
                    action: 'bkntc_collab_get_category_settings',
                    nonce: bkntcCollabCategory.nonce,
                    category_id: categoryId
                },
                success: function(response) {
                    if (response.success && response.data) {
                        $('#collab_min_staff').val(response.data.min_staff || 0);
                        $('#collab_max_staff').val(response.data.max_staff || 0);
                        
                        // Select staff members
                        if (response.data.staff_ids && response.data.staff_ids.length > 0) {
                            $('#collab_staff_ids').val(response.data.staff_ids);
                        }
                    }
                }
            });
        },

        /**
         * Hook into Booknetic's save button to also save our fields
         */
        hookSaveButton: function() {
            var self = this;

            // Find the save button
            var $saveBtn = $('#save_new_category');
            if ($saveBtn.length === 0) return;

            // Unbind any previous handlers to avoid duplicates
            $saveBtn.off('click.collab');

            // Store reference to original Booknetic AJAX success if possible
            // We'll intercept the global AJAX success to catch the new category ID
            $(document).off('ajaxSuccess.collabCategory');
            $(document).on('ajaxSuccess.collabCategory', function(event, xhr, settings) {
                // Check if this is Booknetic's category save response
                if (settings.url && settings.url.indexOf('admin-ajax.php') !== -1 || 
                    settings.url && settings.url.indexOf('booknetic') !== -1) {
                    
                    try {
                        var response = JSON.parse(xhr.responseText);
                        
                        // If successful and has an ID, this might be our new category
                        if (response.status === 'ok' && response.id) {
                            self.currentCategoryId = response.id;
                            console.log('New category created with ID:', response.id);
                            
                            // Save collaborative settings for the new category
                            setTimeout(function() {
                                self.saveCollaborativeSettings();
                            }, 500);
                        }
                    } catch (e) {
                        // Not JSON or not relevant
                    }
                }
            });

            // Also add direct click handler as fallback
            $saveBtn.on('click.collab', function() {
                // Wait for Booknetic's AJAX to complete
                setTimeout(function() {
                    if (self.currentCategoryId > 0) {
                        self.saveCollaborativeSettings();
                    }
                }, 1500);
            });
        },

        /**
         * Validate collaborative settings before saving
         */
        validateSettings: function(minStaff, maxStaff) {
            // Check if values are non-negative
            if (minStaff < 0 || maxStaff < 0) {
                this.showError('Staff numbers must be positive values');
                return false;
            }

            // Check if max >= min (when max is not 0/unlimited)
            if (maxStaff > 0 && maxStaff < minStaff) {
                this.showError('Maximum staff must be greater than or equal to minimum staff');
                return false;
            }

            // Warn if min staff is set but no staff selected
            if (minStaff > 0 && $('#collab_staff_ids').val().length === 0) {
                this.showWarning('You set a minimum staff requirement but haven\'t selected any eligible staff members');
            }

            return true;
        },

        /**
         * Show error message using Booknetic toast or fallback to alert
         */
        showError: function(message) {
            if (typeof booknetic !== 'undefined' && booknetic.toast) {
                booknetic.toast(message, 'error');
            } else {
                alert('Error: ' + message);
            }
        },

        /**
         * Show warning message
         */
        showWarning: function(message) {
            if (typeof booknetic !== 'undefined' && booknetic.toast) {
                booknetic.toast(message, 'warning');
            } else {
                console.warn(message);
            }
        },

        /**
         * Save collaborative settings
         */
        saveCollaborativeSettings: function() {
            var categoryId = this.currentCategoryId;
            
            // Check if we have a valid category ID
            if (!categoryId || categoryId === 0) {
                console.log('Collaborative settings: No category ID available, skipping save');
                return;
            }

            var minStaff = parseInt($('#collab_min_staff').val()) || 0;
            var maxStaff = parseInt($('#collab_max_staff').val()) || 0;
            var staffIds = $('#collab_staff_ids').val() || [];

            // Validate settings
            if (!this.validateSettings(minStaff, maxStaff)) {
                return;
            }

            // Skip if no collaborative settings are set
            if (minStaff === 0 && maxStaff === 0 && staffIds.length === 0) {
                console.log('Collaborative settings: No values to save');
                return;
            }

            $.ajax({
                url: bkntcCollabCategory.ajax_url,
                type: 'POST',
                data: {
                    action: 'bkntc_collab_save_category_settings',
                    nonce: bkntcCollabCategory.nonce,
                    category_id: categoryId,
                    min_staff: minStaff,
                    max_staff: maxStaff,
                    staff_ids: staffIds
                },
                success: function(response) {
                    if (response.success) {
                        console.log('Collaborative settings saved successfully for category', categoryId);
                    } else {
                        console.error('Failed to save collaborative settings:', response.data);
                    }
                },
                error: function(xhr, status, error) {
                    console.error('AJAX error saving collaborative settings:', error);
                }
            });
        }
    };

    // Initialize when document is ready
    $(document).ready(function() {
        // Only init if we're on service categories page
        if (window.location.href.indexOf('module=service_categories') !== -1) {
            CollabCategoryFields.init();
        }
    });

})(jQuery);
