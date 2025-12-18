(function() {
    'use strict';
    
    // Wait for jQuery to be available
    function initCollaborativeCategories() {
        if (typeof jQuery === 'undefined') {
            console.log('jQuery not ready yet, waiting...');
            setTimeout(initCollaborativeCategories, 100);
            return;
        }
        
        var $ = jQuery;
        console.log('Booknetic Collaborative Category Script Loaded with jQuery');

        var bkntcCollab = {
            staffList: [],
            currentCategoryId: null,

            init: function() {
                console.log('Initializing collaborative category features');
                this.loadStaffList();
                this.hookIntoBookneticAjax();
                this.bindSaveEvent();
            },

            hookIntoBookneticAjax: function() {
                var self = this;
                
                // Hook into jQuery AJAX complete event
                $(document).ajaxComplete(function(event, xhr, settings) {
                    // Check if this is a Booknetic modal load for service_categories
                    if (settings.data && typeof settings.data === 'string') {
                        if (settings.data.includes('module=service_categories') && 
                            (settings.data.includes('action=add_new') || settings.data.includes('action=edit'))) {
                            
                            console.log('Detected service category modal load via AJAX');
                            
                            // Wait for DOM to be ready
                            setTimeout(function() {
                                self.injectCollaborativeFields();
                            }, 100);
                            
                            setTimeout(function() {
                                self.injectCollaborativeFields();
                            }, 500);
                        }
                    }
                });
            },

            bindSaveEvent: function() {
                var self = this;
                
                // Listen for successful Booknetic save via AJAX
                $(document).ajaxSuccess(function(event, xhr, settings) {
                    console.log('AJAX Success detected:', {
                        url: settings.url,
                        dataType: typeof settings.data,
                        responseJSON: xhr.responseJSON,
                        responseText: xhr.responseText
                    });
                    
                    // Try to parse response if responseJSON is not available
                    var response = xhr.responseJSON;
                    if (!response && xhr.responseText) {
                        try {
                            response = JSON.parse(xhr.responseText);
                        } catch (e) {
                            // Not JSON
                        }
                    }
                    
                    // Check if response indicates a category save
                    if (response && response.id && response.status === 'ok') {
                        // Check if URL contains Booknetic
                        if (settings.url && (settings.url.includes('page=booknetic') || settings.url.includes('?page=booknetic'))) {
                            var categoryId = parseInt(response.id);
                            console.log('Detected Booknetic save with ID:', categoryId);
                            console.log('This is a category save, will save collaborative settings');
                            
                            setTimeout(function() {
                                self.performSave(categoryId);
                            }, 300);
                            return;
                        }
                    }
                });
                
                // Also listen for AJAX errors
                $(document).ajaxError(function(event, xhr, settings) {
                    if (settings.data && typeof settings.data === 'string') {
                        if (settings.data.includes('module=service_categories') && 
                            (settings.data.includes('action=save') || 
                             settings.data.includes('action=create') || 
                             settings.data.includes('action=update') || 
                             settings.data.includes('action=edit'))) {
                            console.error('Category save AJAX failed');
                            console.error('Response:', xhr.responseText);
                        }
                    }
                });
            },

            loadStaffList: function() {
                var self = this;
                
                console.log('Loading staff list from:', bkntcCollabCategory.ajaxurl);
                console.log('Using nonce:', bkntcCollabCategory.nonce);

                $.ajax({
                    url: bkntcCollabCategory.ajaxurl,
                    type: 'POST',
                    data: {
                        action: 'bkntc_collab_get_staff_list',
                        nonce: bkntcCollabCategory.nonce
                    },
                    success: function(response) {
                        console.log('Staff list response:', response);
                        if (response.success) {
                            self.staffList = response.data;
                            console.log('Loaded ' + self.staffList.length + ' staff members');
                        } else {
                            console.error('Staff list response failed:', response);
                        }
                    },
                    error: function(xhr, status, error) {
                        console.error('Error loading staff list:', error);
                        console.error('XHR:', xhr);
                        console.error('Status:', status);
                        console.error('Response Text:', xhr.responseText);
                    }
                });
            },

            injectCollaborativeFields: function() {
                console.log('Attempting to inject collaborative fields...');
                
                // Check if fields already exist
                if ($('#bkntc_collab_fields').length > 0) {
                    console.log('Fields already exist, skipping injection');
                    return;
                }

                // Look for the specific form in service category modal
                var form = $('#addServiceForm');
                
                if (form.length === 0) {
                    console.log('addServiceForm not found yet');
                    return;
                }

                console.log('Found addServiceForm, injecting fields...');

                var html = '\
                    <div id="bkntc_collab_fields" class="bkntc-collab-section">\
                        <div class="bkntc-collab-header">\
                            <h5>Collaborative Service Settings</h5>\
                            <span class="bkntc-collab-badge">COLLAB</span>\
                        </div>\
                        \
                        <div class="form-row">\
                            <div class="form-group col-md-12">\
                                <div class="form-check">\
                                    <input type="checkbox" \
                                           class="form-check-input" \
                                           id="bkntc_collab_allow_multi_select" \
                                           value="1">\
                                    <label class="form-check-label" for="bkntc_collab_allow_multi_select">\
                                        <strong>Enable Multiple Service Selection</strong>\
                                    </label>\
                                </div>\
                                <small class="form-text text-muted">Allow customers to select multiple services from this category in one booking</small>\
                            </div>\
                        </div>\
                        \
                        <div class="form-row">\
                            <div class="form-group col-md-6">\
                                <label for="bkntc_collab_min_staff">Minimum Staff</label>\
                                <input type="number" \
                                       class="form-control" \
                                       id="bkntc_collab_min_staff" \
                                       min="0" \
                                       value="0"\
                                       placeholder="0 = No minimum">\
                                <small class="form-text text-muted">Minimum staff members required</small>\
                            </div>\
                            \
                            <div class="form-group col-md-6">\
                                <label for="bkntc_collab_max_staff">Maximum Staff</label>\
                                <input type="number" \
                                       class="form-control" \
                                       id="bkntc_collab_max_staff" \
                                       min="0" \
                                       value="0"\
                                       placeholder="0 = Unlimited">\
                                <small class="form-text text-muted">0 means unlimited</small>\
                            </div>\
                        </div>\
                        \
                        <div class="form-row">\
                            <div class="form-group col-md-12">\
                                <label for="bkntc_collab_staff_ids">Eligible Staff</label>\
                                <select multiple \
                                        class="form-control" \
                                        id="bkntc_collab_staff_ids" \
                                        style="height: 120px;">\
                                </select>\
                                <small class="form-text text-muted">Hold Ctrl/Cmd to select multiple staff</small>\
                            </div>\
                        </div>\
                    </div>\
                ';

                form.append(html);
                console.log('Collaborative fields injected successfully');
                
                this.populateStaffDropdown();
                
                // Try to load existing settings if editing
                var categoryId = this.getCategoryIdFromForm();
                if (categoryId) {
                    console.log('Loading settings for category:', categoryId);
                    this.loadCategorySettings(categoryId);
                }
            },

            populateStaffDropdown: function() {
                var select = $('#bkntc_collab_staff_ids');
                select.empty();

                console.log('Populating staff dropdown with', this.staffList.length, 'staff');

                this.staffList.forEach(function(staff) {
                    select.append($('<option>', {
                        value: staff.id,
                        text: staff.name
                    }));
                });
            },

            loadCategorySettings: function(categoryId) {
                var self = this;

                $.ajax({
                    url: bkntcCollabCategory.ajaxurl,
                    type: 'POST',
                    data: {
                        action: 'bkntc_collab_get_category_settings',
                        nonce: bkntcCollabCategory.nonce,
                        category_id: categoryId
                    },
                    success: function(response) {
                        console.log('Category settings response:', response);
                        if (response.success) {
                            var data = response.data;
                            console.log('Loading settings data:', data);
                            
                            $('#bkntc_collab_allow_multi_select').prop('checked', data.allow_multi_select == 1);
                            $('#bkntc_collab_min_staff').val(data.min_staff || 0);
                            $('#bkntc_collab_max_staff').val(data.max_staff || 0);
                            
                            if (data.staff_ids && data.staff_ids.length > 0) {
                                console.log('Setting eligible staff:', data.staff_ids);
                                $('#bkntc_collab_staff_ids').val(data.staff_ids);
                            }
                        } else {
                            console.log('Failed to load category settings:', response);
                        }
                    }
                });
            },

            saveCategorySettings: function() {
                // For new categories, we need to get the ID from the response
                var categoryId = this.getCategoryIdFromForm();
                
                console.log('Attempting to save category settings for ID:', categoryId);
                
                if (!categoryId || categoryId == 0) {
                    console.log('Category ID is 0 (new category), settings saved on next edit');
                    return;
                }

                this.performSave(categoryId);
            },

            performSave: function(categoryId) {
                console.log('performSave called with categoryId:', categoryId);
                
                var allowMultiSelect = $('#bkntc_collab_allow_multi_select').is(':checked') ? 1 : 0;
                var minStaff = parseInt($('#bkntc_collab_min_staff').val()) || 0;
                var maxStaff = parseInt($('#bkntc_collab_max_staff').val()) || 0;
                var eligibleStaff = $('#bkntc_collab_staff_ids').val() || [];

                console.log('Saving:', {categoryId: categoryId, allowMultiSelect: allowMultiSelect, minStaff: minStaff, maxStaff: maxStaff, eligibleStaff: eligibleStaff});

                // Validation
                if (maxStaff > 0 && maxStaff < minStaff) {
                    if (typeof booknetic !== 'undefined' && booknetic.toast) {
                        booknetic.toast('Maximum staff cannot be less than minimum staff', 'error');
                    }
                    return;
                }

                $.ajax({
                    url: bkntcCollabCategory.ajaxurl,
                    type: 'POST',
                    data: {
                        action: 'bkntc_collab_save_category_settings',
                        nonce: bkntcCollabCategory.nonce,
                        category_id: categoryId,
                        allow_multi_select: allowMultiSelect,
                        min_staff: minStaff,
                        max_staff: maxStaff,
                        staff_ids: eligibleStaff
                    },
                    success: function(response) {
                        console.log('Save response:', response);
                        if (response.success) {
                            console.log('Collaborative settings saved for category ' + categoryId);
                            if (typeof booknetic !== 'undefined' && booknetic.toast) {
                                booknetic.toast('Collaborative settings saved', 'success');
                            }
                        } else {
                            console.error('Save failed:', response);
                            if (typeof booknetic !== 'undefined' && booknetic.toast) {
                                booknetic.toast('Error saving collaborative settings: ' + (response.data ? response.data.message : 'Unknown error'), 'error');
                            }
                        }
                    },
                    error: function(xhr, status, error) {
                        console.error('AJAX error saving collaborative settings:', error);
                        console.error('Status:', status);
                        console.error('Response:', xhr.responseText);
                        if (typeof booknetic !== 'undefined' && booknetic.toast) {
                            booknetic.toast('Error saving collaborative settings', 'error');
                        }
                    }
                });
            },

            getCategoryIdFromForm: function() {
                var categoryId = 0;
                
                // Method 1: Try hidden input with name="id"
                var idInput = $('#addServiceForm').find('[name="id"]');
                if (idInput.length && idInput.val()) {
                    categoryId = parseInt(idInput.val());
                }
                
                // Method 2: Try data attribute on form
                if (!categoryId) {
                    categoryId = parseInt($('#addServiceForm').data('id')) || 0;
                }
                
                // Method 3: Try to find it in the modal data
                if (!categoryId) {
                    var modal = $('.fs-modal.fs-modal-slide').last();
                    categoryId = parseInt(modal.data('category-id')) || 0;
                }
                
                // Method 4: Check if there's a script tag with category data
                if (!categoryId) {
                    var scriptTag = $('#add_new_JS');
                    categoryId = parseInt(scriptTag.data('category-id')) || 0;
                }
                
                console.log('Found category ID:', categoryId);
                return categoryId;
            }
        };

        // Initialize when DOM is ready
        $(document).ready(function() {
            bkntcCollab.init();
        });
    }
    
    // Start initialization
    initCollaborativeCategories();
})();
