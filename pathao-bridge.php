<?php
function get_base_url($environment = null)
{
    $options = get_option('pt_hms_settings');
    $environment = $environment ?: $options['environment'] ?? 'live';

    return ($environment === 'staging') ? 'https://courier-api-sandbox.pathao.com' : 'https://api-hermes.pathao.com';
}

function get_ptc_merchant_panel_base_url($environment = null)
{
//    $options = get_option('pt_hms_settings');
//    $environment = $environment ?: $options['environment'] ?? 'live';
    return 'https://merchant.pathao.com';
}

function issue_access_token($clientId = null, $clientSecret = null, $environment = null)
{
    // Get settings from WordPress options
    $options = get_option('pt_hms_settings');

    $clientId = ($clientId ?:  $options['client_id']) ?? '';
    $clientSecret = ($clientSecret?: $options['client_secret']) ?? '';

    $base_url = get_base_url($environment) . "/aladdin/api/v1/external/login";

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

function pt_hms_get_user()
{
    $url = get_base_url() . '/aladdin/api/v1/user/short-info';
    $token = pt_hms_get_token();
    
    if ( ! $token ) {
        return null;
    }

    $args = array(
        'headers' => array(
            'Authorization' => 'Bearer ' . $token,
            'Content-Type' => 'application/json',
            'Accept' => 'application/json',
        ),
    );

    $response = wp_remote_get( $url, $args );

    if ( is_wp_error( $response ) ) {
        return null;
    }

    $body = wp_remote_retrieve_body( $response );
    $decoded = json_decode( $body, true );

    if ( json_last_error() !== JSON_ERROR_NONE || empty( $decoded['data'] ) ) {
        return null;
    }

    return $decoded;
}

function pt_hms_get_stores()
{
    $url = get_base_url() . "/aladdin/api/v1/stores";
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
    $url = get_base_url() . "/aladdin/api/v1/countries/1/city-list";
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
    $url = get_base_url() . "/aladdin/api/v1/cities/" . $city_id . "/zone-list";
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


function pt_hms_get_zone_list_bulk()
{
    $url = get_base_url() . "/aladdin/api/v1/zones/list";
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
    $url = get_base_url() . "/aladdin/api/v1/zones/" . $zone_id . "/area-list";
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

function pt_hms_get_area_list_bulk()
{
    $url = get_base_url() . "/aladdin/api/v1/areas/list";
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
    $api_url = get_base_url() . '/aladdin/api/v1/orders';
    $token = pt_hms_get_token();

    $payload = makeDto($order_data);

    $order = wc_get_order($payload['merchant_order_id']);

    /**
     * Fires before a single order is sent to Pathao.
     *
     * @param array     $payload The API payload that will be sent.
     * @param WC_Order|null $order   The WooCommerce order (null if not found).
     */
    do_action('pathao_before_send_order', $payload, $order);

    $args = array(
        'headers' => array(
            'Authorization' => 'Bearer ' . $token,
            'Content-Type' => 'application/json',
            'Accept' => 'application/json',
            'source' => 'woocommerce'
        ),
        'body' => json_encode($payload)
    );

    $response = wp_remote_post($api_url, $args);

    // status code 201 means created
    if (wp_remote_retrieve_response_code($response) >= 300) {
        $errorBody = json_decode(wp_remote_retrieve_body($response), true);

        /**
         * Fires when sending a single order to Pathao fails.
         *
         * @param array         $errorBody  Decoded error response body.
         * @param int           $statusCode HTTP response code.
         * @param array         $payload    The payload that was sent.
         * @param WC_Order|null $order      The WooCommerce order.
         */
        do_action('pathao_send_order_failed', $errorBody, wp_remote_retrieve_response_code($response), $payload, $order);

        wp_send_json_error($errorBody, wp_remote_retrieve_response_code($response));
    }

    if (is_wp_error($response)) {
        do_action('pathao_send_order_failed', ['message' => $response->get_error_message()], 0, $payload, $order);
        return $response->get_error_message();
    }

    $body = wp_remote_retrieve_body($response);
    $result = json_decode($body, true);

    /**
     * Fires after a single order is successfully sent to Pathao.
     *
     * @param array         $result  Decoded API response.
     * @param array         $payload The payload that was sent.
     * @param WC_Order|null $order   The WooCommerce order.
     */
    do_action('pathao_after_send_order', $result, $payload, $order);

    return $result;
}

/**
 * @param $order_data
 * @return array
 */
function makeDto($order_data): array
{

    $payload = [
        'store_id' => sanitize_text_field($order_data['store_id'] ?? 0),
        'merchant_order_id' => sanitize_text_field($order_data['merchant_order_id'] ?? ''),
        'recipient_name' => sanitize_text_field($order_data['recipient_name'] ?? ''),
        'recipient_phone' => sanitize_text_field($order_data['recipient_phone'] ?? ''),
        'recipient_secondary_phone' => sanitize_text_field($order_data['recipient_secondary_phone'] ?? ''),
        'recipient_address' => sanitize_text_field($order_data['recipient_address'] ?? ''),
        'delivery_type' => sanitize_text_field($order_data['delivery_type'] ?? 0),
        'item_type' => sanitize_text_field($order_data['item_type'] ?? 0),
        'special_instruction' => sanitize_text_field($order_data['special_instruction'] ?? ''),
        'item_quantity' => sanitize_text_field($order_data['item_quantity'] ?? 0),
        'item_weight' => (float)sanitize_text_field($order_data['item_weight'] ?? 0),
        'item_description' => sanitize_text_field($order_data['item_description'] ?? '')
    ];

    if (!empty($order_data['recipient_city'])) {
        $payload['recipient_city'] = (int)sanitize_text_field($order_data['recipient_city']);
    }

    if (!empty($order_data['recipient_zone'])) {
        $payload['recipient_zone'] = (int)sanitize_text_field($order_data['recipient_zone']);
    }

    if (!empty($order_data['recipient_area'])) {
        $payload['recipient_area'] = (int)sanitize_text_field($order_data['recipient_area']);
    }

    if ($order_data['amount_to_collect'] !== "") {
        $payload['amount_to_collect'] =  (int)sanitize_text_field($order_data['amount_to_collect']);
    }

    // Allow third-party code to override individual payload fields
    $orderId = $payload['merchant_order_id'];
    $order = $orderId ? wc_get_order($orderId) : null;

    if ($order) {
        $payload['recipient_name'] = sanitize_text_field(
            apply_filters('pathao_order_payload_recipient_name', $payload['recipient_name'], $order, $payload)
        );
        $payload['recipient_phone'] = sanitize_text_field(
            apply_filters('pathao_order_payload_recipient_phone', $payload['recipient_phone'], $order, $payload)
        );
        $payload['recipient_address'] = sanitize_text_field(
            apply_filters('pathao_order_payload_recipient_address', $payload['recipient_address'], $order, $payload)
        );
        $payload['item_description'] = sanitize_textarea_field(
            apply_filters('pathao_order_payload_item_description', $payload['item_description'], $order, $payload)
        );

        // Final catch-all filter for the complete payload
        $payload = apply_filters('pathao_order_payload', $payload, $order);

        // Re-sanitize the entire payload after the catch-all filter
        $payload = ptc_sanitize_payload($payload);
    }

    return $payload;
}

/**
 * Sanitize all string values in a payload array.
 *
 * @param array $payload
 * @return array
 */
function ptc_sanitize_payload(array $payload): array
{
    $numericKeys = ['store_id', 'recipient_city', 'recipient_zone', 'recipient_area',
                    'amount_to_collect', 'item_quantity', 'item_weight', 'delivery_type', 'item_type'];

    foreach ($payload as $key => $value) {
        if (in_array($key, $numericKeys, true)) {
            $payload[$key] = is_float($value) ? (float) $value : (int) $value;
        } elseif (is_string($value)) {
            $payload[$key] = ($key === 'item_description' || $key === 'special_instruction' || $key === 'recipient_address')
                ? sanitize_textarea_field($value)
                : sanitize_text_field($value);
        }
    }

    return $payload;
}

function pt_hms_create_new_order_bulk($order_data)
{
    $api_url = get_base_url() . '/aladdin/api/v1/orders/bulk';
    $token = pt_hms_get_token();

    $payload = [
        'orders' => $order_data
    ];

    /**
     * Fires before bulk orders are sent to Pathao.
     *
     * @param array $payload The full payload containing all orders.
     */
    do_action('pathao_before_send_bulk_orders', $payload);

    $args = [
        'headers' => [
            'Authorization' => 'Bearer ' . $token,
            'Content-Type' => 'application/json',
            'Accept' => 'application/json',
            'source' => 'woocommerce'
        ],
        'body' => json_encode($payload)
    ];

    $response = wp_remote_post($api_url, $args);

    // status code 201 means created
    if (wp_remote_retrieve_response_code($response) >= 300) {
        $errorBody = json_decode(wp_remote_retrieve_body($response), true);

        /**
         * Fires when sending bulk orders to Pathao fails.
         *
         * @param array $errorBody  Decoded error response body.
         * @param int   $statusCode HTTP response code.
         * @param array $payload    The payload that was sent.
         */
        do_action('pathao_send_bulk_orders_failed', $errorBody, wp_remote_retrieve_response_code($response), $payload);

        wp_send_json_error($errorBody, wp_remote_retrieve_response_code($response));
    }

    if (is_wp_error($response)) {
        do_action('pathao_send_bulk_orders_failed', ['message' => $response->get_error_message()], 0, $payload);
        return $response->get_error_message();
    }

    $body = wp_remote_retrieve_body($response);
    $result = json_decode($body, true);

    /**
     * Fires after bulk orders are successfully sent to Pathao.
     *
     * @param array $result  Decoded API response.
     * @param array $payload The payload that was sent.
     */
    do_action('pathao_after_send_bulk_orders', $result, $payload);

    return $result;
}
