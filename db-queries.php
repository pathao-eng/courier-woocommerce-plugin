<?php

/**
 * Get post ids by search from post meta
 *
 * @param string $search
 *
 * @return array
 */
function ptc_get_post_ids_by_search_from_post_meta($search)
{
    global $wpdb;

    $search = '%' . $wpdb->esc_like($search) . '%'; // Sanitize the $search variable

    $query = $wpdb->prepare(/** @lang text */ "
    SELECT DISTINCT post_id
        FROM {$wpdb->prefix}postmeta
        WHERE   (meta_key = 'ptc_consignment_id' AND meta_value LIKE %s) OR
                (meta_key = 'ptc_status' AND meta_value LIKE %s)
    ", $search, $search);

    return $wpdb->get_col($query);
}

/**
 * Get post ids by search from orders
 *
 * @param string $search
 *
 * @return array
 */
function ptc_get_post_ids_by_billing_first_name($search)
{
    return wc_get_orders([
        'billing_first_name' => esc_sql($search),
        'return' => 'ids',
    ]);
}

/**
 * Get post ids by search from orders
 *
 * @param string $search
 *
 * @return array
 */
function ptc_get_post_ids_by_billing_last_name($search)
{
    return wc_get_orders([
        'billing_last_name' => esc_sql($search),
        'return' => 'ids',
    ]);
}

/**
 * Get post ids by status
 *
 * @param string $search
 *
 * @return array
 */
function ptc_get_post_ids_by_status($search)
{
    global $wpdb;

    $query = wc_get_orders([
        'status' => $search,
        'return' => 'ids',
    ]);

    return $query;
}

/**
 * Get post ids by search from post title
 *
 * @return array
 */
function ptc_get_all_pathao_orders()
{
    global $wpdb;

    return $wpdb->get_col(/** @lang text */ "
    SELECT DISTINCT post_id
        FROM {$wpdb->prefix}postmeta 
        WHERE (meta_key = 'ptc_consignment_id')
    ");
}

/**
 * Get post ids by search from post title
 *
 * @return string|null
 */
function ptc_get_all_pathao_orders_count()
{
    global $wpdb;

    return $wpdb->get_var(/** @lang text */ "
    SELECT COUNT(DISTINCT post_id)
        FROM {$wpdb->prefix}postmeta 
        WHERE (meta_key = 'ptc_consignment_id')
    ");
}

/**
 * Get total orders count
 *
 * @return int
 */
function ptc_wc_get_orders_count()
{

    $args = [
        'limit' => -1,
        'return' => 'ids',
    ];

    $query = wc_get_orders($args);

    return count($query);

}