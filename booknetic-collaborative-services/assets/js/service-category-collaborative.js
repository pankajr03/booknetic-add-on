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
            settingsLoaded: false,

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
                
                // Reset settings loaded flag
                this.settingsLoaded = false;
                
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
                    </div>\
                ';

                form.append(html);
                console.log('Collaborative fields injected successfully');
                
                // Try to load existing settings if editing - with delay to ensure form is populated
                var self = this;
                setTimeout(function() {
                    var categoryId = self.getCategoryIdFromForm();
                    console.log('Checking for category ID to load settings:', categoryId);
                    if (categoryId && categoryId > 0) {
                        console.log('Loading settings for category:', categoryId);
                        self.loadCategorySettings(categoryId);
                    } else {
                        console.log('No valid category ID found, this is a new category');
                    }
                }, 300);
                
                // Try again with longer delay
                setTimeout(function() {
                    var categoryId = self.getCategoryIdFromForm();
                    if (categoryId && categoryId > 0 && !self.settingsLoaded) {
                        console.log('Second attempt - Loading settings for category:', categoryId);
                        self.loadCategorySettings(categoryId);
                    }
                }, 800);
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
                self.settingsLoaded = true; // Mark that we've attempted to load

                console.log('=== Loading Category Settings ===');
                console.log('Category ID:', categoryId);
                console.log('AJAX URL:', bkntcCollabCategory.ajaxurl);

                $.ajax({
                    url: bkntcCollabCategory.ajaxurl,
                    type: 'POST',
                    data: {
                        action: 'bkntc_collab_get_category_settings',
                        nonce: bkntcCollabCategory.nonce,
                        category_id: categoryId
                    },
                    success: function(response) {
                        console.log('=== Category Settings Response ===');
                        console.log('Success:', response.success);
                        console.log('Data:', response.data);
                        
                        if (response.success) {
                            var data = response.data;
                            var checkbox = $('#bkntc_collab_allow_multi_select');
                            
                            console.log('Checkbox element found:', checkbox.length > 0);
                            console.log('Setting allow_multi_select to:', data.allow_multi_select);
                            
                            checkbox.prop('checked', data.allow_multi_select == 1);
                            
                            console.log('Checkbox now checked:', checkbox.is(':checked'));
                        } else {
                            console.error('Failed to load settings:', response.data ? response.data.message : 'Unknown error');
                        }
                    },
                    error: function(xhr, status, error) {
                        console.error('=== AJAX Error Loading Settings ===');
                        console.error('Error:', error);
                        console.error('Response:', xhr.responseText);
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
                
                var checkbox = $('#bkntc_collab_allow_multi_select');
                var allowMultiSelect = checkbox.is(':checked') ? 1 : 0;

                console.log('Checkbox element:', checkbox.length > 0 ? 'Found' : 'NOT FOUND');
                console.log('Checkbox checked:', checkbox.is(':checked'));
                console.log('Saving:', {categoryId: categoryId, allowMultiSelect: allowMultiSelect});

                $.ajax({
                    url: bkntcCollabCategory.ajaxurl,
                    type: 'POST',
                    data: {
                        action: 'bkntc_collab_save_category_settings',
                        nonce: bkntcCollabCategory.nonce,
                        category_id: categoryId,
                        allow_multi_select: allowMultiSelect
                    },
                    success: function(response) {
                        console.log('=== COLLABORATIVE SETTINGS SAVE RESPONSE ===');
                        console.log('Success:', response.success);
                        console.log('Full response:', response);
                        console.log('Response.data:', response.data);
                        console.log('Response.data keys:', response.data ? Object.keys(response.data) : 'N/A');
                        
                        if (response.success) {
                            console.log('✓ Settings saved for category ' + categoryId);
                            console.log('response.data.settings:', response.data.settings);
                            console.log('response.data.message:', response.data.message);
                            console.log('response.data.updated_rows:', response.data.updated_rows);
                            
                            if (typeof booknetic !== 'undefined' && booknetic.toast) {
                                booknetic.toast('Collaborative settings saved', 'success');
                            }
                        } else {
                            console.error('✗ Save failed:', response);
                            console.error('Error message:', response.data ? response.data.message : 'Unknown');
                            if (typeof booknetic !== 'undefined' && booknetic.toast) {
                                booknetic.toast('Error: ' + (response.data ? response.data.message : 'Unknown error'), 'error');
                            }
                        }
                    },
                    error: function(xhr, status, error) {
                        console.error('=== COLLABORATIVE SETTINGS AJAX ERROR ===');
                        console.error('Error:', error);
                        console.error('Status:', status);
                        console.error('Response text:', xhr.responseText);
                        if (typeof booknetic !== 'undefined' && booknetic.toast) {
                            booknetic.toast('AJAX Error: ' + error, 'error');
                        }
                    }
                });
            },

            getCategoryIdFromForm: function() {
                var categoryId = 0;
                
                console.log('=== Detecting Category ID ===');
                
                // Method 1: Check URL parameters (for edit action)
                var urlParams = new URLSearchParams(window.location.search);
                if (urlParams.has('id')) {
                    categoryId = parseInt(urlParams.get('id'));
                    console.log('Method 1 - URL param "id":', categoryId);
                }
                
                // Method 2: Look for edit action data in AJAX
                if (!categoryId) {
                    var modal = $('.fs-modal:visible, .modal:visible').last();
                    // Check if modal has data-id attribute
                    if (modal.data('id')) {
                        categoryId = parseInt(modal.data('id'));
                        console.log('Method 2 - Modal data-id:', categoryId);
                    }
                }
                
                // Method 3: Try hidden input with name="id" from any visible form
                if (!categoryId) {
                    var form = $('.fs-modal:visible form, .modal:visible form, form:visible').last();
                    console.log('Found form:', form.length > 0);
                    
                    var idInput = form.find('input[name="id"], input[id="id"], input[type="hidden"]').filter(function() {
                        return $(this).attr('name') === 'id' || $(this).attr('id') === 'id';
                    });
                    
                    console.log('ID input elements found:', idInput.length);
                    idInput.each(function(i) {
                        console.log('  Input ' + i + ':', {
                            name: $(this).attr('name'),
                            id: $(this).attr('id'),
                            value: $(this).val()
                        });
                    });
                    
                    if (idInput.length && idInput.val()) {
                        categoryId = parseInt(idInput.val());
                        console.log('Method 3 - Form input[name="id"]:', categoryId);
                    }
                }
                
                // Method 4: Check if there's an input with class or data attribute
                if (!categoryId) {
                    var allInputs = $('form:visible input[type="hidden"]');
                    console.log('All hidden inputs in visible forms:', allInputs.length);
                    allInputs.each(function() {
                        var val = $(this).val();
                        var name = $(this).attr('name');
                        if (name === 'id' && val && !isNaN(val) && parseInt(val) > 0) {
                            categoryId = parseInt(val);
                            console.log('Method 4 - Found via scan:', categoryId);
                            return false; // break
                        }
                    });
                }
                
                // Method 5: Try to get from modal title or header
                if (!categoryId) {
                    var modalTitle = $('.fs-modal:visible .fs-modal-title, .modal:visible .modal-title').text();
                    console.log('Modal title:', modalTitle);
                    // If title contains "Edit" and numbers, try to extract ID
                    var match = modalTitle.match(/\#(\d+)/);
                    if (match) {
                        categoryId = parseInt(match[1]);
                        console.log('Method 5 - From modal title:', categoryId);
                    }
                }
                
                console.log('=== Final category ID:', categoryId, '===');
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
