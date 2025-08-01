<?php

// For logged-in users
add_action('wp_ajax_get_stores', 'pt_hms_ajax_get_stores');
add_action('wp_ajax_get_cities', 'pt_hms_ajax_get_cities');
add_action('wp_ajax_get_zones', 'pt_hms_ajax_get_zones');
add_action('wp_ajax_get_areas', 'pt_hms_ajax_get_areas');
add_action('wp_ajax_create_order_to_ptc', 'ajax_pt_hms_create_new_order');
add_action('wp_ajax_get_wc_order', 'ajax_pt_wc_order_details');
add_action('wp_ajax_get_wc_order_bulk', 'ajax_pt_wc_order_details_bulk');

function ptc_order_list_column_values_callback($value, $column_name, $post_meta)
{
    $value = $post_meta[$column_name] ?? $value;
    return apply_filters('ptc_order_list_column_value_' . $column_name, $value);
}

function ptc_order_list_columns($columns = [])
{
    return apply_filters('custom_table_columns', [
            'order_number' => __('Order', 'pathao_text_domain'),
            'date' => __('Date', 'pathao_text_domain'),
            'status' => __('Status', 'pathao_text_domain'),
            'total' => __('Total', 'pathao_text_domain'),
            'pathao' => __('Pathao Courier', 'pathao_text_domain'),
            'pathao_status' => __('Pathao Courier Status', 'pathao_text_domain'),
            'pathao_delivery_fee' => __('Pathao Courier Delivery Fee', 'pathao_text_domain'),

        ] + $columns);
}

function pt_hms_ajax_get_stores()
{
    $stores = pt_hms_get_stores();
    wp_send_json_success($stores);
}

function pt_hms_ajax_get_cities()
{
    $cities = pt_hms_get_cities();
    wp_send_json_success($cities);
}

function pt_hms_ajax_get_zones()
{
    if (isset($_POST['city_id'])) {
        $city_id = intval($_POST['city_id']);
        $zones = pt_hms_get_zones($city_id);
        wp_send_json_success($zones);
    } else {
        wp_send_json_error('Missing city_id parameter.');
    }
}

/**
 * @return void
 */
function pt_hms_ajax_get_areas()
{
    if (isset($_POST['zone_id'])) {
        $zone_id = intval($_POST['zone_id']);
        $areas = pt_hms_get_areas($zone_id);
        wp_send_json_success($areas);
    } else {
        wp_send_json_error('Missing zone_id parameter.');
    }
}

function ajax_pt_hms_create_new_order()
{
    $key = 'ptc_consignment_id';
    // Check nonce for security
    $nonce = wp_verify_nonce( $_SERVER['HTTP_X_WPTC_NONCE'] ?? '', 'wp_rest', false );

    if(!$nonce){

        wp_send_json_error([
            'error' => 'validation_failed',
            'message' => 'nonce mismatch'
            ], 403);
    }

    // sanitize input fields
    $orderData = array_map(function ($value) {
        return sanitize_text_field(trim((string)$value));
    }, $_POST['order_data'] ?? []);

    $orderId = trim($orderData['merchant_order_id'] ?? '');

    // check order already have the consignment id
    if (get_post_meta($orderId, $key, true)) {
        wp_send_json_error([
            'error' => 'validation_failed',
            'message' => 'Order already have a consignment id'
            ], 403);
    }

    $order = wc_get_order($orderId);

    if (!$order) {
        wp_send_json_error('no_order', 'No order found', 404);
    }

    // Call function to create a new order
    $response = pt_hms_create_new_order($orderData);

    if (is_wp_error($response)) {
        wp_send_json_error($response->get_error_message(), $response->get_error_code());
    }

    // add consignment_id to order meta
    update_post_meta($orderId, 'ptc_consignment_id', $response['data']['consignment_id']);
    update_post_meta($orderId, 'ptc_status', 'pending');
    update_post_meta($orderId, 'ptc_delivery_fee', $response['data']['delivery_fee']);

    // Send the response back to JavaScript
    wp_send_json($response);
}


function ajax_pt_wc_order_details()
{
    
    $orderId =  (int)$_POST['order_id'] ?? null;

    if (!$orderId) {
        wp_send_json_error('no_order_id', 'No order id found', 404);
    }

    $order = wc_get_order($orderId);

    if (!$order) {
        wp_send_json_error('no_order', 'No order found', 404);
    }

    $orderData = getPtOrderData($order);

    wp_send_json_success($orderData);
}

function ajax_pt_wc_order_details_bulk()
{

    $orderIds =  $_POST['order_id'] ?? null;

    if (!$orderIds) {
        wp_send_json_error('no_order_id', 'No order id found', 404);
    }

    $orderIds = explode(',', $orderIds);

    $orderData = [];
    foreach ($orderIds as $orderId) {
        $order = wc_get_order($orderId);
        $orderData[] = getPtOrderData($order);
    }

    wp_send_json_success($orderData);
}

/**
 * @param bool|WC_Order|WC_Order_Refund $order
 * @return array
 */
function getPtOrderData(bool|WC_Order|WC_Order_Refund $order): array
{
    $orderData = $order->get_data();
    $orderItems = 0;
    $totalWeight = 0;
    // add items to order
    $orderData['items'] = array_values(array_map(function ($item) use (&$orderItems, &$totalWeight) {

        $quantity = $item->get_quantity();
        $totalWeight += (float)$item->get_product()->get_weight();

        $orderItems += $quantity;

        return [
            'name' => $item->get_name(),
            'quantity' => $item->get_quantity(),
            'weight' => $totalWeight,
            'price' => $item->get_total(),
            'product_id' => $item->get_product_id(),
            'variation_id' => $item->get_variation_id(),
            'image' => wp_get_attachment_image_src($item->get_product()->get_image_id(), 'thumbnail')[0] ?? null,
            'product_url' => $item->get_product()->get_permalink(),
        ];

    }, $order->get_items()));

    $orderData['billing']['full_name'] = $order->get_formatted_billing_full_name();

    $orderData['total_items'] = $orderItems;
    $orderData['total_weight'] = $totalWeight;
    $orderData['payment_date'] = $order->get_date_paid();

    return $orderData;
}

add_action('rest_api_init', 'register_custom_endpoint');

function register_custom_endpoint() {
    register_rest_route('ptc/v1', '/webhook', array(
        'methods' => 'POST',
        'callback' => 'ptc_webhook_handler',
        'permission_callback' => function ($request) {

            if (isset($_SERVER['HTTP_X_PATHAO_SIGNATURE'])) {
                $client_secret = $_SERVER['HTTP_X_PATHAO_SIGNATURE'];
                $secret = get_option('pt_hms_settings')['webhook_secret'] ?? null;

                if (!$secret || $client_secret !== $secret) {
                    return false;
                }

                return true;
            }

        },
    ));
}

function ptc_webhook_handler($data) {

    $event = $data['event'];

    if ($event == 'webhook_integration') {
        return webhookResponse('Successfully accepted webhook_integration', 202);
    }

    $orderId = $data['merchant_order_id'];
    $status = $data['order_status'];
    $deliveryFee = $data['delivery_fee'];
    $order = wc_get_order($orderId);

    if (!$order) {
        wp_send_json_error('no_order', 'No order found', 404);
    }

    // add consignment_id to order meta
    update_post_meta($orderId, 'ptc_status', $status);
    update_post_meta($orderId, 'ptc_delivery_fee', $deliveryFee);

    return webhookResponse('Order status updated', 202);
}

/**
 * @return WP_Error|WP_HTTP_Response|WP_REST_Response
 */
function webhookResponse($message, $statusCode = 200)
{
    $response = rest_ensure_response(array(
        'status' => $statusCode,
        'message' => $message,
        'data' => null
    ));

    $response->set_status($statusCode);
    $response->header('X-Pathao-Merchant-Webhook-Integration-Secret', 'f3992ecc-59da-4cbe-a049-a13da2018d51');
    return $response;
}
