<div class="bkntc-collaborative-services">
    <h2><?php echo bkntc__('Collaborative Services view'); ?></h2>
    
    <form id="collaborative-services-form">
        <div class="bkntc-form-group">
            <label for="service_name"><?php echo bkntc__('Service Name'); ?></label>
            <input type="text" id="service_name" name="service_name" class="form-control" placeholder="<?php echo bkntc__('Enter service name'); ?>">
        </div>

        <button type="submit" class="btn btn-primary"><?php echo bkntc__('Save Settings'); ?></button>
    </form>
</div>

<script>
document.getElementById('collaborative-services-form')?.addEventListener('submit', function(e) {
    e.preventDefault();
    
    const formData = new FormData(this);
    const data = Object.fromEntries(formData);

    booknetic.ajax('settings.collaborative_services.save', data, {
        success: function(response) {
            if (response.success) {
                booknetic.notify('success', response.message);
            }
        },
        error: function(error) {
            booknetic.notify('error', error.message || 'Error saving settings');
        }
    });
});
</script>

<style>
.bkntc-collaborative-services {
    padding: 20px;
}

.bkntc-form-group {
    margin-bottom: 20px;
}

.bkntc-form-group label {
    display: block;
    margin-bottom: 8px;
    font-weight: 500;
}

.bkntc-form-group input {
    width: 100%;
    max-width: 400px;
    padding: 8px 12px;
    border: 1px solid #ddd;
    border-radius: 4px;
}
</style>
