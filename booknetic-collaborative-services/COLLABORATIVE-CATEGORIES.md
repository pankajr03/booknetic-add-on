# Service Category Collaborative Features

## Overview
This feature extends Booknetic Service Categories with collaborative booking capabilities, allowing you to define minimum/maximum staff requirements and eligible staff members for each service category.

## New Fields Added

When you add or edit a Service Category in Booknetic (`admin.php?page=booknetic&module=service_categories`), you'll now see three additional fields:

### 1. Minimum Staff (Min-Staff)
- **Type:** Numeric input
- **Purpose:** Define the least number of staff members required for services in this category
- **Default:** 0 (no minimum requirement)
- **Example:** Set to 2 if the service requires at least 2 staff members working together

### 2. Maximum Staff (Max-Staff)
- **Type:** Numeric input
- **Purpose:** Define the maximum number of staff members allowed for services in this category
- **Default:** 0 (unlimited)
- **Example:** Set to 5 to limit collaborative bookings to a maximum of 5 staff members
- **Note:** Setting to 0 means unlimited staff can be assigned

### 3. Staff Listing (Multiple Selection)
- **Type:** Multi-select dropdown
- **Purpose:** Choose which staff members are eligible for collaborative services in this category
- **Usage:** Hold Ctrl/Cmd key to select multiple staff members
- **Example:** Select only staff members who are trained for collaborative services

## How It Works

### Adding Collaborative Settings to a Category

1. Navigate to **Booknetic → Service Categories**
2. Click "Add Category" or click "Edit" on an existing category
3. Fill in the standard fields (Parent Category, Category Name)
4. Scroll down to see **"Collaborative Service Settings"** section
5. Configure:
   - **Minimum Staff:** Enter the minimum number (e.g., 2)
   - **Maximum Staff:** Enter the maximum number (e.g., 5, or 0 for unlimited)
   - **Eligible Staff:** Select one or more staff members from the list
6. Click "SAVE"

### Data Storage

- Settings are stored in WordPress options table
- Option key format: `bkntc_collab_category_{category_id}`
- Data structure:
  ```php
  [
      'min_staff' => 2,
      'max_staff' => 5,
      'staff_ids' => [1, 3, 5, 7]
  ]
  ```

### Editing Existing Categories

When you edit a category that already has collaborative settings:
- The form will automatically load and display the saved values
- All three fields will be pre-populated with existing data
- You can modify any field and save to update

## Technical Implementation

### Files Created

1. **ServiceCategoryCollaborative.php**
   - Location: `app/Backend/ServiceCategory/ServiceCategoryCollaborative.php`
   - Purpose: Main PHP class handling AJAX requests and data storage
   - AJAX Actions:
     - `bkntc_collab_get_category_settings` - Retrieve settings for a category
     - `bkntc_collab_save_category_settings` - Save settings for a category
     - `bkntc_collab_get_staff_list` - Get all active staff members

2. **ServiceIntegration.php**
   - Location: `app/Backend/ServiceCategory/ServiceIntegration.php`
   - Purpose: Service integration to show category settings in service modal
   - AJAX Actions:
     - `bkntc_collab_get_service_category_settings` - Get category settings for a service

3. **service-category-collaborative.js**
   - Location: `assets/js/service-category-collaborative.js`
   - Purpose: JavaScript to inject fields into Booknetic modal and handle saving
   - Features:
     - Modal field injection
     - Visual indicators
     - Bulk settings modal
     - Client-side validation
     - Staff list loading

4. **service-integration.js**
   - Location: `assets/js/service-integration.js`
   - Purpose: Display category collaborative info in service modals
   - Shows inherited settings when editing services

5. **service-category-collaborative.css**
   - Location: `assets/css/service-category-collaborative.css`
   - Purpose: Styling for the collaborative fields section

### Integration Points

- **Asset Enqueuing:** Only loads on `module=service_categories` page
- **Modal Injection:** JavaScript listens for Booknetic modal events
- **Save Hook:** Piggybacks on Booknetic's save button with delay
- **Nonce Security:** All AJAX requests protected with WordPress nonces

## API Usage

### Get Category Settings (PHP)

```php
$category_id = 5;
$settings = get_option('bkntc_collab_category_' . $category_id, []);

$min_staff = $settings['min_staff'] ?? 0;
$max_staff = $settings['max_staff'] ?? 0;
$staff_ids = $settings['staff_ids'] ?? [];
```

### Get Category Settings (JavaScript/AJAX)

```javascript
jQuery.ajax({
    url: ajaxurl,
    type: 'POST',
    data: {
        action: 'bkntc_collab_get_category_settings',
        nonce: bkntcCollabCategory.nonce,
        category_id: 5
    },
    success: function(response) {
        if (response.success) {
            console.log(response.data);
            // {min_staff: 2, max_staff: 5, staff_ids: [1,3,5]}
        }
    }
});
```

## Limitations & Notes

### New Categories
- When creating a **new category**, the collaborative settings are saved after the category is created
- On first save, settings are stored but you need to edit the category to modify them
- This is because Booknetic creates the category first, then we save collaborative settings

### Editing Categories
- When **editing existing categories**, all settings load and save properly
- The form pre-populates with existing values
- Changes are saved immediately when you click SAVE

### Staff List
- Only **active staff members** appear in the dropdown
- Staff list is loaded once when the page loads
- If you add new staff, refresh the Service Categories page to see them

## Features Implemented

### ✅ Core Features
1. **Minimum Staff (Min-Staff)** - Numeric input field
2. **Maximum Staff (Max-Staff)** - Numeric input field (0 = unlimited)
3. **Staff Listing** - Multi-select dropdown for eligible staff

### ✅ Advanced Features

#### 1. Client-Side Validation
- Validates that max_staff >= min_staff (when max is not 0)
- Ensures positive values only
- Warns if minimum staff set but no staff selected
- Shows user-friendly error messages using Booknetic toast notifications

#### 2. Visual Indicators
- "COLLAB" badge automatically appears on category rows with collaborative settings
- Purple badge clearly identifies categories with collaborative features
- Updates automatically when settings are applied

#### 3. Bulk Settings Application
- **"Bulk Collaborative Settings"** button on Service Categories page
- Apply settings to multiple categories at once
- Select multiple categories using Ctrl/Cmd
- Applies min/max staff and eligible staff to all selected categories
- Shows success message with count of updated categories

#### 4. Service Integration
- When editing a service, shows inherited collaborative settings from its category
- Information box displays category's collaborative requirements
- Automatically applies category settings to services within that category
- Visual feedback helps users understand service restrictions

#### 5. Better New Category Handling
- Improved detection of newly created category IDs
- Automatically saves collaborative settings after category creation
- Hooks into Booknetic's AJAX response to capture new IDs
- Fallback mechanisms ensure settings are saved

## Future Enhancements

Potential improvements for future versions:

1. ~~**Better New Category Handling**~~ ✅ **IMPLEMENTED**
2. ~~**Validation**~~ ✅ **IMPLEMENTED**
3. ~~**Bulk Settings**~~ ✅ **IMPLEMENTED**
4. ~~**Service Integration**~~ ✅ **IMPLEMENTED**
5. ~~**Visual Indicators**~~ ✅ **IMPLEMENTED**
6. **Import/Export:** Bulk import/export collaborative settings via CSV/JSON
7. **Advanced Filtering:** Filter category list by collaborative status
8. **Staff Availability Check:** Real-time validation against staff schedules
9. **Category Templates:** Save and reuse common collaborative configurations
10. **Reporting:** Analytics on collaborative booking patterns by category

## Using Advanced Features

### Bulk Settings Application

1. Navigate to **Booknetic → Service Categories**
2. Click **"Bulk Collaborative Settings"** button (next to "Add Category")
3. In the modal:
   - Select multiple categories (Ctrl/Cmd + click)
   - Set minimum and maximum staff
   - Select eligible staff members
4. Click **"APPLY TO SELECTED"**
5. Settings are applied to all selected categories instantly

### Service Integration Info

1. Navigate to **Booknetic → Services**
2. Add new service or edit existing one
3. Select a category with collaborative settings
4. Blue info box appears showing:
   - Minimum staff requirement
   - Maximum staff limit
   - Number of eligible staff members
5. This helps you understand what collaborative rules apply to the service

### Visual Indicators

- Categories with collaborative settings show a **purple "COLLAB" badge**
- Badge appears automatically next to category name in the list
- Helps quickly identify which categories have collaborative features
- Updates in real-time when settings are added or removed

## Troubleshooting

### Fields Not Showing
- Ensure you're on the Service Categories page (`module=service_categories`)
- Check browser console for JavaScript errors
- Verify assets are loading (check Network tab in DevTools)

### Settings Not Saving
- Check if you have `manage_options` capability
- Verify AJAX nonce is valid
- Check browser console for error messages
- For new categories, try editing after creation

### Staff List Empty
- Ensure you have active staff members in Booknetic
- Check database: `wp_booknetic_staff` table should have records with `is_active = 1`
- Refresh the page to reload staff list

## Support

For issues or questions:
- Check browser console for JavaScript errors
- Enable WordPress debug mode to see PHP errors
- Contact plugin developer with error details
