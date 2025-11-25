<?php

/**
 * Plugin Name: Pathao Courier
 * Description: Pathao Courier plugin for WooCommerce
 * Version: 1.4.0
 * Author: Pathao
 * Text Domain: pathao-courier
 * Requires at least: 6.0
 * Tested up to: 6.4
 * Requires PHP: 7.0
 * Stable tag: 1.0.0
 * License: GPLv3
 * License URI: https://www.gnu.org/licenses/gpl-3.0.html
 */

defined( 'ABSPATH' ) || exit;

defined( 'PTC_CACHE_GROUP' ) || define( 'PTC_CACHE_GROUP', 'ptc_cache_' );
defined( 'PTC_CACHE_TTL' ) || define( 'PTC_CACHE_TTL', 86400 * 7 );
defined( 'PTC_PLUGIN_URL' ) || define( 'PTC_PLUGIN_URL', WP_PLUGIN_URL . '/' . plugin_basename( dirname( __FILE__ ) ) . '/' );
defined( 'PTC_PLUGIN_DIR' ) || define( 'PTC_PLUGIN_DIR', plugin_dir_path( __FILE__ ) );
defined( 'PTC_PLUGIN_TEMPLATE_DIR' ) || define( 'PTC_PLUGIN_TEMPLATE_DIR', plugin_dir_path( __FILE__ ) . 'templates/');
defined( 'PTC_PLUGIN_FILE' ) || define( 'PTC_PLUGIN_FILE', plugin_basename( __FILE__ ) );
defined( 'PTC_PLUGIN_PREFIX' ) || define( 'PTC_PLUGIN_PREFIX', 'ptc' );


require_once PTC_PLUGIN_DIR.'/settings-page.php';
require_once PTC_PLUGIN_DIR.'/pathao-bridge.php';
require_once PTC_PLUGIN_DIR.'/plugin-api.php';
require_once PTC_PLUGIN_DIR.'/wc-order-list.php';
require_once PTC_PLUGIN_DIR.'/db-queries.php';


const PTC_EMPTY_FLAG = '-';

// Enqueue styles and scripts
add_action('admin_enqueue_scripts', 'enqueue_custom_admin_script');
function enqueue_custom_admin_script($hook) {

    wp_enqueue_style(
        'ptc-admin-css', 
        plugin_dir_url(__FILE__) . 'css/ptc-admin-style.css',
        null,
        filemtime(plugin_dir_path( __FILE__ ) . '/css/ptc-admin-style.css'),
        'all'
    );

    wp_enqueue_script(
        'ptc-location-manager',
        plugin_dir_url(__FILE__) . 'js/ptc-location-manager.js',
        ['jquery'],
        filemtime(plugin_dir_path( __FILE__ ) . '/js/ptc-location-manager.js'),
        true
    );

    wp_enqueue_script(
        'ptc-admin-js',
        plugin_dir_url(__FILE__) . 'js/ptc-admin-script.js',
        ['jquery', 'ptc-location-manager'],
        filemtime(plugin_dir_path( __FILE__ ) . '/js/ptc-admin-script.js'),
        true
    );

    wp_enqueue_script(
        'ptc-admin-alpine-js',
        'https://cdn.jsdelivr.net/npm/alpinejs@3.13.5/dist/cdn.min.js',
        ['jquery'],
    );

    wp_localize_script( 'ptc-admin-js', 'ptcSettings', [
        'nonce' => wp_create_nonce( 'wp_rest' ),
        'merchantPanelBaseUrl' => get_ptc_merchant_panel_base_url(),
    ]);

    wp_enqueue_script(
        'ptc-bulk-action',
        plugin_dir_url( __FILE__ ) . 'js/ptc-bulk-action.js',
        ['jquery', 'ptc-location-manager'],
        filemtime(plugin_dir_path( __FILE__ ) . '/js/ptc-bulk-action.js'),
        true
    );
    wp_enqueue_style(
        'sweetalert2',
        'https://cdn.jsdelivr.net/npm/sweetalert2@11/dist/sweetalert2.min.css'
    );
    wp_enqueue_script(
        'sweetalert2',
        'https://cdn.jsdelivr.net/npm/sweetalert2@11/dist/sweetalert2.all.min.js',
        ['jquery'],
        null,
        true
    );

    wp_enqueue_script(
        'handsontable-js',
        'https://cdn.jsdelivr.net/npm/handsontable@13.0.0/dist/handsontable.full.min.js',
        ['jquery'],
        null,
        true
    );
    wp_enqueue_style(
        'handsontable-css',
        'https://cdn.jsdelivr.net/npm/handsontable@13.0.0/dist/handsontable.full.min.css'
    );
}


add_filter( 'bulk_actions-woocommerce_page_wc-orders', 'add_custom_bulk_action' );

function add_custom_bulk_action( $bulk_actions ) {
    $bulk_actions['send_with_pathao'] = __('Send with Pathao', 'pathao_text_domain');
    return $bulk_actions;
}


add_filter( 'handle_bulk_actions-woocommerce_page_wc-orders', 'handle_custom_bulk_action', 10, 3 );

function handle_custom_bulk_action( $redirect_to, $do_action, $post_ids ) {
    if ( $do_action !== 'send_with_pathao' ) {
        return $redirect_to;
    }


    // Process the selected orders
    foreach ( $post_ids as $order_id ) {
        // Get the order object
        $order = wc_get_order( $order_id );

        if ( $order ) {
            $orderData = transformData(getPtOrderData($order));





            echo 'send_with_pathao <pre>' . json_encode($orderData, JSON_PRETTY_PRINT) .'</pre>>';


        }
    }

//    die();

    $redirect_to = add_query_arg( 'example_updated', count( $post_ids ), $redirect_to );
    return $redirect_to;
}

function transformData(array $getPtOrderData)
{
    return [
        "store_id" => 1,
        "merchant_order_id" => 1,
        "recipient_name" => "Demo Recipient One",
        "recipient_phone" => "015XXXXXXXX",
        "recipient_address" => "House 123, Road 4, Sector 10, Uttara, Dhaka-1230, Bangladesh",
        "delivery_type" => 48,
        "item_type" => 2,
        "special_instruction" => "Do not put water",
        "item_quantity" => 2,
        "item_weight" => "0.5",
        "amount_to_collect" => 100,
        "item_description" => "This is a Cloth item, price- 3000",
    ];
}
