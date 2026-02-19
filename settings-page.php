<?php
defined('ABSPATH') || exit;
defined('PTC_PLUGIN_PAGE_TYPE') || define('PTC_PLUGIN_PAGE_TYPE', 'pt_hms_orders');
defined('PTC_PLUGIN_SETTINGS_PAGE_TYPE') || define('PTC_PLUGIN_SETTINGS_PAGE_TYPE', 'pt_hms_settings');

add_action('wp_ajax_get_token', 'ajax_get_token');
add_action('wp_ajax_reset_token', 'ajax_reset_token');
add_action('update_option_pt_hms_settings', 'pt_hms_on_option_update', 10, 3);
add_action('admin_menu', 'pt_hms_menu_page'); // Admin menu setup, Pathao Courier page
add_action('admin_menu', 'pt_hms_orders_page'); // submenu settings page
add_action('admin_init', 'pt_hms_settings_init');

function ajax_get_token()
{
    $data = issue_access_token(
        $_POST['client_id'] ?? '',
        $_POST['client_secret'] ?? '',
        $_POST['environment'] ?? ''
    );

    $token = $data['access_token'] ?? null;

    if ($token) {
        wp_send_json_success($data);
    } else {
        wp_send_json_error(array('message' => 'Failed to retrieve the token.'));
    }
}

function ajax_reset_token()
{
    $token = pt_hms_get_token(true);
    if ($token) {
        wp_send_json_success(array('access_token' => $token));
    } else {
        wp_send_json_error(array('message' => 'Failed to retrieve the token.'));
    }
}

function pt_hms_on_option_update($old_value, $new_value, $option)
{
    // Reset the token stored in the database.
    delete_option('pt_hms_token_data');

    // Fetch a new token.
    pt_hms_get_token();
}

function pt_hms_menu_page()
{
    add_menu_page(
        'Pathao Courier',
        'Pathao Courier',
        'manage_options',
        PTC_PLUGIN_SETTINGS_PAGE_TYPE,
        'pt_hms_settings_page_callback',
        'dashicons-car',
        6
    );
}

// Render the settings page
function pt_hms_settings_page_callback()
{
    $options = get_option('pt_hms_settings');
    $all_fields_filled = isset(
        $options['client_id'],
        $options['client_secret'],
        $options['environment']
    );

    $token = $all_fields_filled ? pt_hms_get_token() : null;
    ?>
    <div class="wrap">
        <div style="margin: 20px 0 20px;">
            <div>
            <div>
                <img src="<?php echo PTC_PLUGIN_URL . 'assets/images/courier-logo.svg'; ?>" 
                     alt="Pathao Courier Logo" 
                     style="height: 35px;">
                <h1 style="margin: 0; padding: 0; font-size: 23px; font-weight: 400;">Pathao Courier Settings</h1>
            </div>
            </div>
            <?php if ($all_fields_filled && !$token): ?>
                <div class="notice notice-error" style="margin: 15px 0 0;">
                    <p>
                        <strong>Error:</strong> API credentials are invalid. Please check your credentials and try again.
                    </p>
                </div>
            <?php endif; ?>
        </div>

        <!-- Merchant Info (fetched from API, stored in localStorage) -->
        <div class="card" id="ptc-merchant-info-card" style="max-width: 800px; padding: 20px; margin-top: 20px;">
            <h2 style="margin-top: 0;">Merchant Info</h2>
            <div id="ptc-merchant-info-content">
                <p class="description">Loading…</p>
            </div>
            <p style="margin-top: 12px;">
                <button type="button" id="ptc-refresh-merchant-btn" class="button button-secondary">
                    <span class="dashicons dashicons-update" style="margin: 4px 5px 0 0; vertical-align: middle;"></span>
                    Refresh merchant info
                </button>
            </p>
        </div>

        <!-- Add Toast Container -->
        <div id="ptc-toast-container" style="position: fixed; top: 50px; right: 20px; z-index: 9999;"></div>

        <!-- Add Toast Styles -->
        <style>
            .ptc-toast {
                min-width: 300px;
                margin-bottom: 10px;
                padding: 15px 20px;
                border-radius: 4px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                font-size: 14px;
                opacity: 0;
                transform: translateX(100%);
                transition: all 0.3s ease-in-out;
            }

            .ptc-toast.show {
                opacity: 1;
                transform: translateX(0);
            }

            .ptc-toast-error {
                background: #fff;
                border-left: 4px solid #dc3232;
            }

            .ptc-toast-success {
                background: #fff;
                border-left: 4px solid #46b450;
            }

            .ptc-toast-title {
                font-weight: 600;
                margin-bottom: 5px;
            }

            .ptc-toast-message {
                color: #555;
            }
        </style>

        <div class="card" style="max-width: 800px; padding: 20px; margin-top: 20px;">
            <form method="post" action="options.php">
                <?php
                settings_fields('pt_hms_settings_group');
                do_settings_sections('pt_hms_settings');
                submit_button('Save Settings');
                ?>
            </form>
        </div>

        <!-- Token Management Section -->
        <div class="card" style="max-width: 800px; padding: 20px; margin-top: 20px;">
            <h2 style="margin-top: 0;">API Connection Test</h2>
            <p class="description">Verify your API credentials and manage the connection token.</p>

            <div style="margin-top: 15px;">
                <button type="button" id="fetch-token-btn" class="button button-primary">
                    <span class="dashicons dashicons-test" style="margin: 4px 5px 0 0;"></span>
                    Test API Connection
                </button>

                <?php if ($token): ?>
                    <button type="button" id="reset-token-btn" class="button">
                        <span class="dashicons dashicons-update" style="margin: 4px 5px 0 0;"></span>
                        Reset Token
                    </button>
                <?php endif; ?>
            </div>
        </div>

        <!-- Data Synchronization Section (hidden when country_id = 1) -->
        <div id="ptc-data-sync-card" class="card" style="max-width: 800px; padding: 20px; margin-top: 20px;">
            <h2 style="margin-top: 0;">Data Synchronization</h2>
            <p class="description">Preload city, zone, and area data to speed up order creation.</p>

            <div style="margin-top: 15px;">
                <button type="button" id="preload-city-zones-btn" class="button button-secondary">
                    <span class="dashicons dashicons-database-import" style="margin: 4px 5px 0 0;"></span>
                    Preload City, Zone, Area & Store
                </button>
            </div>

            <div id="preload-progress-container" style="display: none; margin-top: 20px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                    <span id="preload-status-text" style="font-weight: 600;">Starting...</span>
                    <span id="preload-percentage">0%</span>
                </div>
                <div style="background: #f0f0f1; border-radius: 4px; height: 20px; overflow: hidden;">
                    <div id="preload-progress-bar" style="background: #2271b1; height: 100%; width: 0%; transition: width 0.3s;"></div>
                </div>
            </div>
        </div>

        <script type="text/javascript">
            jQuery(document).ready(function ($) {
                function showToast(title, message, type = 'error') {
                    const toast = $(`
                        <div class="ptc-toast ptc-toast-${type}">
                            <div class="ptc-toast-title">${title}</div>
                            <div class="ptc-toast-message">${message}</div>
                        </div>
                    `);

                    $('#ptc-toast-container').append(toast);

                    // Trigger reflow to enable animation
                    toast[0].offsetHeight;

                    // Show toast
                    toast.addClass('show');

                    // Remove toast after 4 seconds
                    setTimeout(() => {
                        toast.removeClass('show');
                        setTimeout(() => toast.remove(), 300);
                    }, 4000);
                }

                $('#fetch-token-btn').on('click', function () {
                    const $btn = $(this);
                    $btn.prop('disabled', true).text('Testing...');

                    let clientId = $('#client_id').val();
                    let clientSecret = $('#client_secret').val();
                    let environment = $('#client_environment').val();

                    if (!clientId || !clientSecret || !environment) {
                        showToast('Validation Error', 'Please fill in all required fields.');
                        $btn.prop('disabled', false).html('<span class="dashicons dashicons-test" style="margin: 4px 5px 0 0;"></span>Test API Connection');
                        return;
                    }

                    $.ajax({
                        url: ajaxurl,
                        method: 'POST',
                        data: {
                            action: 'get_token',
                            client_id: clientId,
                            client_secret: clientSecret,
                            environment: environment
                        },
                        success: function (response) {
                            if (response.success) {
                                showToast('Success', 'API connection successful!', 'success');
                            } else {
                                showToast('Connection Failed', response.data.message);
                            }
                        },
                        error: function () {
                            showToast('Error', 'Failed to retrieve token. Please check your credentials and try again.');
                        },
                        complete: function () {
                            $btn.prop('disabled', false).html('<span class="dashicons dashicons-test" style="margin: 4px 5px 0 0;"></span>Test API Connection');
                        }
                    });
                });

                $('#reset-token-btn').on('click', function () {
                    const $btn = $(this);
                    $btn.prop('disabled', true).text('Resetting...');

                    $.ajax({
                        url: ajaxurl,
                        method: 'POST',
                        data: {
                            action: 'reset_token',
                        },
                        success: function (response) {
                            if (response.success) {
                                showToast('Success', 'Token has been successfully reset.', 'success');
                            } else {
                                showToast('Reset Failed', response.data.message);
                            }
                        },
                        error: function () {
                            showToast('Error', 'An error occurred while resetting the token.');
                        },
                        complete: function () {
                            $btn.prop('disabled', false).html('<span class="dashicons dashicons-update" style="margin: 4px 5px 0 0;"></span>Reset Token');
                        }
                    });
                });

                // Merchant info: fetch from /aladdin/api/v1/user, store in localStorage, show short summary
                var PTC_USER_STORAGE_KEY = 'ptc_user';

                function escapeHtml(str) {
                    if (str == null || str === '') return '—';
                    var div = document.createElement('div');
                    div.textContent = str;
                    return div.innerHTML;
                }

                function renderMerchantInfo(apiResponse) {
                    var $content = $('#ptc-merchant-info-content');
                    if (!apiResponse || !apiResponse.data) {
                        $content.html('<p class="description">Connect your API and save settings to see merchant info.</p>');
                        return;
                    }
                    var d = apiResponse.data;
                    if (d.country_id === 1) {
                        $('#ptc-data-sync-card').hide();
                    }
                    var html = '<table class="widefat striped" style="max-width: 480px;">' +
                        '<tr><th style="width: 140px;">Merchant</th><td>' + escapeHtml(d.merchant_name) + '</td></tr>' +
                        '<tr><th>Email</th><td>' + escapeHtml(d.user_email) + '</td></tr>' +
                        '<tr><th>Phone</th><td>' + escapeHtml(d.user_phone) + '</td></tr>' +
                        '<tr><th>Merchant Country</th><td>' + escapeHtml(d.country_id = 1 ? 'Bangladesh' : 'Nepal') + '</td></tr>' +
                        '</table>';
                    $content.html(html);
                }

                function fetchMerchantInfo() {
                    var $content = $('#ptc-merchant-info-content');
                    var $btn = $('#ptc-refresh-merchant-btn');
                    $content.html('<p class="description">Loading…</p>');
                    $btn.prop('disabled', true);

                    $.post(ajaxurl, { action: 'get_ptc_user' })
                        .done(function (response) {
                            if (response.success && response.data) {
                                try {
                                    localStorage.setItem(PTC_USER_STORAGE_KEY, JSON.stringify(response.data));
                                } catch (e) {}
                                renderMerchantInfo(response.data);
                            } else {
                                var cached = null;
                                try {
                                    var raw = localStorage.getItem(PTC_USER_STORAGE_KEY);
                                    if (raw) cached = JSON.parse(raw);
                                } catch (e) {}
                                if (cached && cached.data) {
                                    renderMerchantInfo(cached);
                                } else {
                                    $content.html('<p class="description">Could not load merchant info. Save your API settings and try again.</p>');
                                }
                            }
                        })
                        .fail(function () {
                            var cached = null;
                            try {
                                var raw = localStorage.getItem(PTC_USER_STORAGE_KEY);
                                if (raw) cached = JSON.parse(raw);
                            } catch (e) {}
                            if (cached && cached.data) {
                                renderMerchantInfo(cached);
                            } else {
                                $content.html('<p class="description">Could not load merchant info. Save your API settings and try again.</p>');
                            }
                        })
                        .always(function () {
                            $btn.prop('disabled', false);
                        });
                }

                // Show cached first, then refresh from API
                try {
                    var raw = localStorage.getItem(PTC_USER_STORAGE_KEY);
                    if (raw) {
                        var cached = JSON.parse(raw);
                        if (cached && cached.data) {
                            renderMerchantInfo(cached);
                            if (cached.data.country_id === 1) $('#ptc-data-sync-card').hide();
                        }
                    }
                } catch (e) {}
                fetchMerchantInfo();

                $('#ptc-refresh-merchant-btn').on('click', function () {
                    fetchMerchantInfo();
                });
            });
        </script>
    </div>
    <?php
}

// Add submenu page to the 'Settings' menu
function pt_hms_orders_page()
{
    add_submenu_page(
        PTC_PLUGIN_SETTINGS_PAGE_TYPE,
        'Orders',
        'Orders',
        'manage_options',
        PTC_PLUGIN_PAGE_TYPE,
        'pt_hms_pathao_courier_page_callback'
    );

}

// Callback function to display the content of the submenu page
function pt_hms_pathao_courier_page_callback()
{
    echo '<div class="wrap">';
    echo '<h2>Pathao Courier Order Page</h2>';
    echo '<p>Manage your deliveries without any distraction</p>';

    ob_start();
    include_once PTC_PLUGIN_TEMPLATE_DIR . 'ptc-hms-list-template.php';
    echo ob_get_clean();

    echo '</div>';
}

// Admin init callback
function pt_hms_settings_init()
{
    register_setting('pt_hms_settings_group', 'pt_hms_settings');

    // API Credentials
    add_settings_section('section_one', 'API Credentials', 'section_one_callback', 'pt_hms_settings');
    add_settings_field('client_id', 'Client ID', 'field_client_id_callback', 'pt_hms_settings', 'section_one');
    add_settings_field('client_secret', 'Client Secret', 'field_client_secret_callback', 'pt_hms_settings', 'section_one');

    add_settings_field('environment', 'Environment', 'field_environment_callback', 'pt_hms_settings', 'section_one');
    add_settings_field('client_webhook', 'Client Default Webhook', 'field_webhook_callback', 'pt_hms_settings', 'section_one');
    add_settings_field('client_webhook_secret', 'Client Webhook Secret', 'field_webhook_secret_callback', 'pt_hms_settings', 'section_one');
}

function section_one_callback()
{
    echo '<p class="description" style="margin-bottom: 20px;">Enter your Pathao API credentials below. You can find these in your Pathao merchant dashboard.</p>';
}

function field_client_id_callback()
{
    $options = get_option('pt_hms_settings');
    $value = is_array($options) && isset($options['client_id']) ? $options['client_id'] : '';
    echo "<input type='text' id='client_id' name='pt_hms_settings[client_id]' value='{$value}' class='regular-text' />";
    echo "<p class='description'>Your Pathao API Client ID</p>";
}

function field_client_secret_callback()
{
    $options = get_option('pt_hms_settings');
    $value = is_array($options) && isset($options['client_secret']) ? $options['client_secret'] : '';
    echo "<input type='password' id='client_secret' name='pt_hms_settings[client_secret]' value='{$value}' class='regular-text' />";
    echo "<p class='description'>Your Pathao API Client Secret</p>";
}

function field_webhook_callback()
{
    $baseUrl = get_site_url();
    echo "{$baseUrl}/wp-json/ptc/v1/webhook";
    echo "<p class='description'>
            This is the default <a href=\"https://merchant.pathao.com/courier/developer-api\">webhook</a> URL that will be used for all orders.
          </p>";
}

function field_webhook_secret_callback()
{
    $options = get_option('pt_hms_settings');
    $clientSecret = $options['client_secret'] ?? '';
    $webhookSecret = $options['webhook_secret'] ?? '';
    $value = $webhookSecret ? $webhookSecret : $clientSecret;
    echo "<input type='text' name='pt_hms_settings[webhook_secret]' value='{$value}' style='width: 300px;' />";
    echo "<p class='description'>
            The default <a href=\"https://merchant.pathao.com/courier/developer-api\">webhook</a> secret will be your client secret if you don't provide any webhook secret.
            </p>";
}

function field_username_callback()
{
    $options = get_option('pt_hms_settings');
    $value = is_array($options) && isset($options['username']) ? $options['username'] : '';
    echo "<input type='text' name='pt_hms_settings[username]' value='{$value}' style='width: 300px;' />";
}

function field_password_callback()
{
    $options = get_option('pt_hms_settings');
    $value = is_array($options) && isset($options['password']) ? $options['password'] : '';
    echo "<input type='password' name='pt_hms_settings[password]' value='{$value}' style='width: 300px;' />";
}

function field_environment_callback()
{
    $options = get_option('pt_hms_settings');
    $selected = is_array($options) && isset($options['environment']) ? $options['environment'] : '';
    echo "<select name='pt_hms_settings[environment]' id='client_environment'  style='width: 300px;'>
      <option value='live' " . selected($selected, 'live', false) . ">Live</option>
      <option value='staging' " . selected($selected, 'staging', false) . ">Staging</option>
  </select>";
}

function field_default_store_callback()
{
    $stores = pt_hms_get_stores(); // Assuming this function returns an array of stores
    if (!$stores || !is_array($stores) || empty($stores)) {
        echo "No stores found.";
        return;
    }

    $options = get_option('pt_hms_settings');
    $selected_store = is_array($options) && isset($options['default_store']) ? $options['default_store'] : '';

    echo "<select name='pt_hms_settings[default_store]' style='width: 300px;'>";
    foreach ($stores as $store) {
        $selected = ($selected_store == $store['store_id']) ? 'selected' : '';
        echo "<option value='{$store['store_id']}' $selected>{$store['store_name']}</option>";
    }
    echo "</select>";
}
