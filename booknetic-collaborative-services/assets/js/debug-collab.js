/*
 * Debugging Helper for Collaborative Services
 * Run these commands in browser console on the Booknetic categories page
 */

// Test 1: Check if jQuery is available
console.log('jQuery available:', typeof jQuery !== 'undefined');

// Test 2: Check if collaborative checkbox exists in DOM
console.log('Checkbox exists:', jQuery('#bkntc_collab_allow_multi_select').length > 0);

// Test 3: Check checkbox state
console.log('Checkbox checked:', jQuery('#bkntc_collab_allow_multi_select').is(':checked'));

// Test 4: Check if AJAX config exists
console.log('bkntcCollabCategory exists:', typeof bkntcCollabCategory !== 'undefined');
if (typeof bkntcCollabCategory !== 'undefined') {
    console.log('AJAX URL:', bkntcCollabCategory.ajaxurl);
    console.log('Nonce:', bkntcCollabCategory.nonce);
}

// Test 5: Try to get category ID
function testGetCategoryId() {
    var form = jQuery('.fs-modal:visible form, .modal:visible form').last();
    var idInput = form.find('input[name="id"]');
    console.log('Form found:', form.length);
    console.log('ID input found:', idInput.length);
    console.log('ID value:', idInput.val());
    return idInput.val();
}

// Test 6: Manual save test
function testSaveSettings(categoryId) {
    var allowMultiSelect = jQuery('#bkntc_collab_allow_multi_select').is(':checked') ? 1 : 0;
    
    console.log('Testing save with:', {
        categoryId: categoryId,
        allowMultiSelect: allowMultiSelect
    });
    
    jQuery.ajax({
        url: bkntcCollabCategory.ajaxurl,
        type: 'POST',
        data: {
            action: 'bkntc_collab_save_category_settings',
            nonce: bkntcCollabCategory.nonce,
            category_id: categoryId,
            allow_multi_select: allowMultiSelect
        },
        success: function(response) {
            console.log('Save response:', response);
        },
        error: function(xhr, status, error) {
            console.error('Save error:', error);
            console.error('Response:', xhr.responseText);
        }
    });
}

// Run all tests
console.log('=== Running Collaborative Services Debug Tests ===');
console.log('Current page URL:', window.location.href);
