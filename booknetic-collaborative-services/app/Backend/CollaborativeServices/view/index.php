<?php
$settings = $parameters['settings'] ?? [];
?>

<div class="m_header clearfix">
    <h2><?= esc_html($parameters['page_title']); ?></h2>
    <p><?= esc_html($parameters['description']); ?></p>
</div>

<div class="settings-light-portlet">
    <div class="portlet-body">
        <form id="collabForm">

            <label>
                <input type="checkbox" id="enabled" <?= !empty($settings['enabled']) ? 'checked' : ''; ?>>
                Enable Collaborative Services
            </label>

            <br><br>

            <select id="max_collaborators">
                <?php foreach ([2,3,4,5,0] as $v): ?>
                    <option value="<?= $v ?>" <?= ($settings['max_collaborators'] ?? 3) == $v ? 'selected' : '' ?>>
                        <?= $v == 0 ? 'No limit' : $v . ' staff'; ?>
                    </option>
                <?php endforeach; ?>
            </select>

            <br><br>

            <label>
                <input type="checkbox" id="notify_all" <?= !empty($settings['notify_all_staff']) ? 'checked' : ''; ?>>
                Notify all collaborators
            </label>

            <br>

            <label>
                <input type="checkbox" id="notify_changes" <?= !empty($settings['notify_changes']) ? 'checked' : ''; ?>>
                Notify on changes
            </label>

            <br><br>

            <button type="button" class="btn btn-success" id="saveBtn">Save</button>

        </form>
    </div>
</div>

<script>
jQuery(function ($) {

    $('#saveBtn').on('click', function () {

        let data = {
            enabled: $('#enabled').is(':checked') ? '1' : '0',
            max_collaborators: $('#max_collaborators').val(),
            notify_all_staff: $('#notify_all').is(':checked') ? '1' : '0',
            notify_changes: $('#notify_changes').is(':checked') ? '1' : '0'
        };

        // Use Booknetic's internal AJAX method (handles nonce and routing automatically)
        booknetic.ajax('settings.collaborative_services.save', data, function (response) {
            if (response.status === 'success') {
                booknetic.toast('Settings saved successfully!', 'success');
            } else {
                booknetic.toast(response.error_msg || 'Save failed', 'error');
            }
        });

    });

});
</script>
