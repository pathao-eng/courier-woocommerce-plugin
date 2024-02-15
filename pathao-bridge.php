<?php
function get_base_url($environment = null)
{
    $options = get_option('pt_hms_settings');
    $environment = $environment ?: $options['environment'] ?? 'live';

    return ($environment === 'staging') ? 'https://courier-api-sandbox.pathao.com/' : 'https://api-hermes.pathao.com/';
}

function issue_access_token($clientId = null, $clientSecret = null, $environment = null)
{
    // Get settings from WordPress options
    $options = get_option('pt_hms_settings');

    $clientId = ($clientId ?:  $options['client_id']) ?? '';
    $clientSecret = ($clientSecret?: $options['client_secret']) ?? '';

    $base_url = get_base_url($environment) . "aladdin/api/v1/external/login";

    $response = wp_remote_post($base_url, array(
        'headers' => array(
            'accept' => 'application/json',
            'content-type' => 'application/json'
        ),
        'body' => json_encode(array(
            'client_id' => $clientId,
            'client_secret' => $clientSecret,
        ))
    ));

    if (is_wp_error($response)) {
        return $response->get_error_message();
    }

    $body = wp_remote_retrieve_body($response);

    return json_decode($body, true);
}

function pt_hms_get_token($reset = false)
{
    // Assuming you save the token data in the WordPress option table.
    $token_data = get_option('pt_hms_token_data');

    // Check if the token is expired.
    if ($reset) {
        $new_token_response = issue_access_token();

        if (isset($new_token_response['access_token'])) {
            // Update token data.
            update_option('pt_hms_token_data', transformTokenResponse($new_token_response));
        }
    } elseif ($token_data && time() > $token_data['expires_in']) {
        $refresh_response = issue_access_token();

        if (isset($refresh_response['access_token'])) {
            // Update token data.
            update_option('pt_hms_token_data', transformTokenResponse($refresh_response));
        }
    } elseif (!$token_data) {
        // If the token does not exist, issue a new token.
        $new_token_response = issue_access_token();
        if (isset($new_token_response['access_token'])) {
            // Save token data.
            update_option('pt_hms_token_data', transformTokenResponse($new_token_response));
        }
    }

    // Return the current access token.
    return $token_data ? $token_data['access_token'] : false;
}

/**
 * @param mixed $refresh_response
 * @return array
 */
function transformTokenResponse($refresh_response)
{
    return array(
        'access_token' => $refresh_response['access_token'],
        'refresh_token' => $refresh_response['refresh_token'],
        'expires_in' => time() + $refresh_response['expires_in']
    );
}

function pt_hms_get_stores()
{
    $url = get_base_url() . "aladdin/api/v1/stores";
    $token = pt_hms_get_token();

    $args = array(
        'headers' => array(
            'Authorization' => 'Bearer ' . $token,
            'Content-Type' => 'application/json',
            'Accept' => 'application/json',
        )
    );

    $response = wp_remote_get($url, $args);

    return json_decode(wp_remote_retrieve_body($response), true)['data']['data'] ?? [];
}

function pt_hms_get_cities()
{
    $url = get_base_url() . "aladdin/api/v1/countries/1/city-list";
    $token = pt_hms_get_token();

    $args = array(
        'headers' => array(
            'Authorization' => 'Bearer ' . $token,
            'Content-Type' => 'application/json',
            'Accept' => 'application/json',
        )
    );

    $response = wp_remote_get($url, $args);
    return json_decode(wp_remote_retrieve_body($response), true)['data']['data'];
}


function pt_hms_get_zones($city_id)
{
    $url = get_base_url() . "aladdin/api/v1/cities/" . $city_id . "/zone-list";
    $token = pt_hms_get_token();

    $args = array(
        'headers' => array(
            'Authorization' => 'Bearer ' . $token,
            'Content-Type' => 'application/json',
            'Accept' => 'application/json',
        )
    );

    $response = wp_remote_get($url, $args);
    return json_decode(wp_remote_retrieve_body($response), true);
}


function pt_hms_get_areas($zone_id)
{
    $url = get_base_url() . "aladdin/api/v1/zones/" . $zone_id . "/area-list";
    $token = pt_hms_get_token();

    $args = array(
        'headers' => array(
            'Authorization' => 'Bearer ' . $token,
            'Content-Type' => 'application/json',
            'Accept' => 'application/json',
        )
    );

    $response = wp_remote_get($url, $args);
    return json_decode(wp_remote_retrieve_body($response), true);
}

function pt_hms_create_new_order($order_data)
{
    $api_url = get_base_url() . 'aladdin/api/v1/orders';
    $token = pt_hms_get_token();

    $args = array(
        'headers' => array(
            'Authorization' => 'Bearer ' . $token,
            'Content-Type' => 'application/json',
            'Accept' => 'application/json',
            'source' => 'woocommerce'
        ),
        'body' => json_encode(array(
            'store_id' => sanitize_text_field($order_data['store_id']),
            'merchant_order_id' => sanitize_text_field($order_data['merchant_order_id']),
            'recipient_name' => sanitize_text_field($order_data['recipient_name']),
            'recipient_phone' => sanitize_text_field($order_data['recipient_phone']),
            'recipient_address' => sanitize_text_field($order_data['recipient_address']),
            'recipient_city' => (int)sanitize_text_field($order_data['recipient_city']),
            'recipient_zone' => (int)sanitize_text_field($order_data['recipient_zone']),
            'recipient_area' => (int)sanitize_text_field($order_data['recipient_area']),
            'delivery_type' => sanitize_text_field($order_data['delivery_type']),
            'item_type' => sanitize_text_field($order_data['item_type']),
            'special_instruction' => sanitize_text_field($order_data['special_instruction']),
            'item_quantity' => sanitize_text_field($order_data['item_quantity']),
            'item_weight' => sanitize_text_field($order_data['item_weight']),
            'amount_to_collect' => round(sanitize_text_field($order_data['amount_to_collect'])),
            'item_description' => sanitize_text_field($order_data['item_description'])
        ))
    );

    $response = wp_remote_post($api_url, $args);

    // status code 201 means created
    if (wp_remote_retrieve_response_code($response) >= 300) {
        wp_send_json_error(json_decode(wp_remote_retrieve_body($response), true), wp_remote_retrieve_response_code($response));
    }

    if (is_wp_error($response)) {
        return $response->get_error_message();
    }

    $body = wp_remote_retrieve_body($response);

    return json_decode($body, true);
}
