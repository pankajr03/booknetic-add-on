(function($) {
    'use strict';

    // Before cart step loads - log cart data to debug date/time issues
    bookneticHooks.addAction('before_step_loading', function(booknetic, new_step_id, old_step_id) {
        if (new_step_id !== 'cart')
            return;

        console.log('=== BEFORE CART LOADING ===');
        console.log('Cart array length:', booknetic.cartArr.length);
        console.log('Full cart array:', booknetic.cartArr);
        
        booknetic.cartArr.forEach(function(item, index) {
            console.log('Cart item ' + index + ' detailed info:', {
                service_id: item.service,
                date: item.date,
                time: item.time,
                location: item.location,
                staff: item.staff,
                service_category: item.service_category,
                is_collaborative: item.is_collaborative_booking,
                has_serviceInf: !!item.serviceInf,
                has_cached_price: !!item.service_price,
                all_keys: Object.keys(item)
            });
            
            // Warn about potential issues
            if (!item.date) console.warn('⚠️ Cart item ' + index + ' has no date!');
            if (!item.time) console.warn('⚠️ Cart item ' + index + ' has no time!');
            if (!item.service) console.warn('⚠️ Cart item ' + index + ' has no service ID!');
        });
    });

    // After cart step loads - modify display to show service assignment and guest info
    bookneticHooks.addAction('loaded_step', function(booknetic, new_step_id) {
        if (new_step_id !== 'cart')
            return;

        console.log('=== CART STEP: Loading collaborative booking display ===');
        
        // Wait longer for DOM to be ready
        setTimeout(function() {
            modifyCartStaffDisplay(booknetic);
            addServiceAssignmentLabels(booknetic);
            groupCollaborativeItems(booknetic);
        }, 500); // Increased timeout
    });

    // Helper: Modify cart display to show all selected staff
    function modifyCartStaffDisplay(booknetic) {
        var panel = booknetic.panel_js;
        
        // Loop through all cart items
        booknetic.cartArr.forEach(function(cartItem, index) {
            console.log('Processing cart item ' + index + ':', cartItem);
            
            if (!cartItem.collaborative_staff || cartItem.collaborative_staff.length === 0) {
                console.log('Cart item ' + index + ' has no collaborative staff');
                return;
            }

            var selectedStaff = cartItem.collaborative_staff;
            console.log('Cart item ' + index + ' has collaborative staff:', selectedStaff);

            // Find the corresponding cart row in the DOM
            var cartRow = panel.find('.booknetic-cart-col[data-index="' + index + '"]');
            if (cartRow.length === 0) {
                console.log('Cart row for item ' + index + ' not found');
                return;
            }

            // Find the staff display row within this cart item
            var staffDisplay = cartRow.find('.booknetic-cart-item-body-row').filter(function() {
                var firstCell = $(this).find('.booknetic-cart-item-body-cell').first();
                return firstCell.text().toLowerCase().includes('staff');
            });

            if (staffDisplay.length === 0) {
                console.log('Staff display not found for cart item ' + index);
                return;
            }

            console.log('Updating staff display for cart item ' + index);

            // Build multi-staff display
            var staffHtml = '<strong style="display: block; color: #2196F3; margin-bottom: 5px;">Selected Staff (' + selectedStaff.length + '):</strong>';
            staffHtml += '<ul style="margin: 0; padding-left: 18px; font-size: 13px;">';

            selectedStaff.forEach(function(staffId) {
                if (staffId === -1) {
                    staffHtml += '<li>Any Available Staff</li>';
                } else {
                    // Try to get staff name from the stored data or just show ID
                    var staffName = 'Staff #' + staffId;
                    
                    // Look for staff name in the booking panel data if available
                    var staffCard = panel.find('[data-step-id="staff"] .booknetic_card[data-id="' + staffId + '"]');
                    if (staffCard.length > 0) {
                        var nameElement = staffCard.find('.booknetic_card_title, .booknetic_card_name');
                        if (nameElement.length > 0) {
                            staffName = nameElement.text().trim();
                        }
                    }
                    
                    staffHtml += '<li>' + staffName + '</li>';
                }
            });

            staffHtml += '</ul>';

            // Replace the staff value in the cart item (second cell in the row)
            var valueElement = staffDisplay.find('.booknetic-cart-item-body-cell').eq(1);
            if (valueElement.length > 0) {
                valueElement.html(staffHtml);
                console.log('Updated cart item ' + index + ' staff display with ' + selectedStaff.length + ' staff');
            } else {
                console.log('Value element not found in staff row');
            }
        });
    }

    // Helper: Add assignment labels (Me/Guest) and guest information to cart items
    function addServiceAssignmentLabels(booknetic) {
        var panel = booknetic.panel_js;
        
        console.log('Adding service assignment labels to cart items');
        console.log('Total cart items in array:', booknetic.cartArr.length);
        
        // Find the cart container
        var cartContainer = panel.find('[data-step-id="cart"] .booknetic-cart');
        console.log('Cart container found:', cartContainer.length > 0);
        
        // Get all cart columns
        var cartCols = cartContainer.find('.booknetic-cart-col');
        console.log('Cart columns found:', cartCols.length);
        
        // Loop through all cart items
        booknetic.cartArr.forEach(function(cartItem, index) {
            console.log('Processing cart item ' + index + ' for assignment labels:', cartItem);
            
            // Check if this is a collaborative booking
            if (!cartItem.is_collaborative_booking) {
                console.log('Cart item ' + index + ' is not a collaborative booking, skipping');
                return;
            }

            // Find the corresponding cart item in the DOM - try multiple selectors
            var cartItemEl = cartContainer.find('.booknetic-cart-col[data-index="' + index + '"]');
            if (cartItemEl.length === 0) {
                // Try without data-index
                cartItemEl = cartCols.eq(index);
            }
            
            if (cartItemEl.length === 0) {
                console.log('Cart item element for index ' + index + ' not found even with fallback');
                return;
            }
            
            console.log('Found cart item element for index ' + index);

            // Get the service title area - try multiple selectors
            var serviceTitleEl = cartItemEl.find('.booknetic-cart-item-head-title');
            if (serviceTitleEl.length === 0) {
                serviceTitleEl = cartItemEl.find('.booknetic-cart-item-head .booknetic-cart-item-head-text h5');
            }
            if (serviceTitleEl.length === 0) {
                serviceTitleEl = cartItemEl.find('.booknetic-cart-item-head h5');
            }
            
            if (serviceTitleEl.length === 0) {
                console.log('Service title element not found for cart item ' + index);
                console.log('Cart item HTML:', cartItemEl.html().substring(0, 200));
                return;
            }
            
            console.log('Found service title element for index ' + index);

            // Add assignment badge
            var assignedTo = cartItem.assigned_to || 'me';
            var badgeColor = assignedTo === 'guest' ? '#FF9800' : '#4CAF50';
            var badgeText = assignedTo === 'guest' ? 'Guest' : 'Me';
            
            // Remove any existing badges
            serviceTitleEl.find('.bkntc_assignment_badge').remove();
            
            // Add the badge
            var badgeHtml = '<span class="bkntc_assignment_badge" style="display: inline-block; margin-left: 10px; padding: 3px 10px; font-size: 11px; font-weight: 600; color: white; background: ' + badgeColor + '; border-radius: 12px; text-transform: uppercase;">For: ' + badgeText + '</span>';
            serviceTitleEl.append(badgeHtml);
            
            console.log('Added assignment badge "' + badgeText + '" to cart item ' + index);

            // If guest service, add guest information
            if (assignedTo === 'guest' && cartItem.guest_info) {
                var guestInfo = cartItem.guest_info;
                console.log('Adding guest information for cart item ' + index + ':', guestInfo);
                
                // Find the cart item body where we can add guest info
                var cartBodyRows = cartItemEl.find('.booknetic-cart-item-body-row');
                
                // Remove any existing guest info rows
                cartItemEl.find('.bkntc_guest_info_row').remove();
                
                // Create guest info row
                var guestInfoHtml = '<div class="booknetic-cart-item-body-row bkntc_guest_info_row" style="border-top: 1px dashed #ddd; margin-top: 8px; padding-top: 8px;">';
                guestInfoHtml += '<div class="booknetic-cart-item-body-cell" style="font-weight: 600; color: #FF9800;">Guest Info:</div>';
                guestInfoHtml += '<div class="booknetic-cart-item-body-cell">';
                guestInfoHtml += '<div style="font-size: 13px; line-height: 1.6;">';
                guestInfoHtml += '<strong>' + (guestInfo.name || 'N/A') + '</strong><br>';
                guestInfoHtml += '<span style="color: #666;">📧 ' + (guestInfo.email || 'N/A') + '</span><br>';
                guestInfoHtml += '<span style="color: #666;">📞 ' + (guestInfo.phone || 'N/A') + '</span>';
                guestInfoHtml += '</div>';
                guestInfoHtml += '</div>';
                guestInfoHtml += '</div>';
                
                // Add guest info after the last body row
                if (cartBodyRows.length > 0) {
                    cartBodyRows.last().after(guestInfoHtml);
                } else {
                    cartItemEl.find('.booknetic-cart-item-body').append(guestInfoHtml);
                }
                
                console.log('Added guest information to cart item ' + index);
            }
        });
    }

    // Helper: Group collaborative items visually in the cart
    function groupCollaborativeItems(booknetic) {
        var panel = booknetic.panel_js;
        
        console.log('Grouping collaborative cart items visually');
        
        // Find all collaborative booking groups
        var groups = {};
        booknetic.cartArr.forEach(function(cartItem, index) {
            if (cartItem.is_collaborative_booking && cartItem.collaborative_group_id) {
                var groupId = cartItem.collaborative_group_id;
                if (!groups[groupId]) {
                    groups[groupId] = [];
                }
                groups[groupId].push(index);
            }
        });
        
        console.log('Found collaborative groups:', groups);
        
        // Add visual grouping for each group
        Object.keys(groups).forEach(function(groupId) {
            var itemIndices = groups[groupId];
            if (itemIndices.length <= 1) return; // Not a multi-service group
            
            console.log('Adding visual grouping for group ' + groupId + ' with ' + itemIndices.length + ' items');
            
            // Add header before first item
            var firstItemEl = panel.find('.booknetic-cart-col[data-index="' + itemIndices[0] + '"]');
            if (firstItemEl.length > 0 && !firstItemEl.prev().hasClass('bkntc_collab_group_header')) {
                var headerHtml = '<div class="bkntc_collab_group_header" style="padding: 12px 15px; margin: 10px 0 5px 0; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 8px; font-weight: 600; font-size: 14px; box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);">';
                headerHtml += '🎯 Multi-Service Booking (' + itemIndices.length + ' services)';
                headerHtml += '</div>';
                firstItemEl.before(headerHtml);
            }
            
            // Add styling to group items
            itemIndices.forEach(function(index, i) {
                var itemEl = panel.find('.booknetic-cart-col[data-index="' + index + '"]');
                if (itemEl.length > 0) {
                    itemEl.css({
                        'border-left': '3px solid #667eea',
                        'background': i % 2 === 0 ? '#f8f9ff' : '#ffffff',
                        'margin-bottom': i === itemIndices.length - 1 ? '15px' : '5px'
                    });
                    
                    // Add service number badge
                    var serviceBadge = '<span class="bkntc_service_number" style="position: absolute; top: 10px; right: 10px; background: #667eea; color: white; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 600; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">' + (i + 1) + '</span>';
                    itemEl.find('.booknetic-cart-item-head').css('position', 'relative').find('.bkntc_service_number').remove();
                    itemEl.find('.booknetic-cart-item-head').append(serviceBadge);
                }
            });
        });
    }

})(jQuery);