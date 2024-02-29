<?php
// Step 1: Register a Filter Hook for Columns
function custom_table_columns($columns) {
    // Allow others to modify the columns array
    $columns = apply_filters('custom_table_columns', $columns);
    return $columns;
}

// Step 2: Register a Filter Hook for Column Values
function custom_table_column_values($value, $column_name, $post_meta) {
    // Allow others to modify the column values
    $value = isset($post_meta[$column_name]) ? $post_meta[$column_name] : $value;
    $value = apply_filters('custom_table_column_value_' . $column_name, $value);
    return $value;
}

// Step 3: Define a Function to Output the Table
function custom_table_list_function() {
    // Get the columns array
    $columns = custom_table_columns(array('Column 1', 'Column 2'));

    // Get orders with metadata
    $orders = wc_get_orders(array(
        'limit' => -1, // Retrieve all orders
        'meta_query' => array(
            array(
                'key' => 'ptc_consignment_id',
            ),
        ),
    ));

    $html = '';

    // Loop through orders
    foreach ($orders as $order) {
        // Get order data
        $orderId = $order->get_id();
        $customerName = $order->get_billing_first_name() . ' ' . $order->get_billing_last_name();
        $total = $order->get_total();
        $consignmentId = $order->get_meta('ptc_consignment_id');
        $currencyCode = $order->get_currency();
        $currencySymbol = get_woocommerce_currency_symbol( $currencyCode );
        $date = date("F jS, Y", strtotime($order->get_date_created()));
        $editLink = get_edit_post_link($orderId);

        $html .= '
            <tr id="post-33" class="iedit author-self level-0 post-33 type-shop_order status-wc-processing post-password-required hentry">
                <th scope="row" class="check-column">			
                    <input id="cb-select-33" type="checkbox" name="post[]" value="'. $orderId .'">
                </th>
                <td class="order_number column-order_number has-row-actions column-primary" data-colname="Order">
                    <a href="#" class="order-preview" data-order-id="33" title="Preview">
                        Preview
                    </a>
                    <a href="'.$editLink.'" class="order-view">
                        <strong>#'.$orderId . $customerName .'</strong>
                    </a>
                </td>
                <td class="order_date column-order_date" data-colname="Date">
                    <time datetime="'. $date .'" title="'. $date .'">'. $date .'</time>
                </td>
                <td class="order_status column-order_status" data-colname="Status">
                    <mark class="order-status status-processing tips">
                        <span>Processing</span>
                    </mark>
                </td>
                <td class="order_total column-order_total" data-colname="Total">
                    <span class="woocommerce-Price-currencySymbol">
                        '.$currencySymbol.'</span> '.$total.'</span>
                    </span>
                </td>
                <td class="pathao column-pathao" data-colname="Pathao Courier">
                   '.$consignmentId.'
                </td>
                <td class="pathao_status column-pathao_status" data-colname="Pathao Courier Status">
                    <span id="33"> Pending </span>
                </td>
                <td class="pathao_delivery_fee column-pathao_delivery_fee" data-colname="Pathao Courier Delivery Fee">
                    <span id="ptc_delivery_fee-33"> 130 </span>
                </td>		
            </tr>
        ';

    }

    // Close your table HTML
    $html .= '</table>';

    // Output the HTML
    echo $html;
}

// Step 4: Hook Your Function to the Action
add_action('custom_table_list', 'custom_table_list_function');

// Step 5: Extend Columns
function custom_extend_columns($columns) {
    // Add extra column
    $columns[] = 'Extra Column';
    return $columns;
}
add_filter('custom_table_columns', 'custom_extend_columns');

?>


<form id="posts-filter" method="get">

    <p class="search-box">
        <label class="screen-reader-text" for="post-search-input">Search orders:</label>
        <input type="search" id="post-search-input" name="s" value="">
        <input type="submit" id="search-submit" class="button" value="Search orders"></p>

    <input type="hidden" name="post_status" class="post_status_page" value="all">
    <input type="hidden" name="post_type" class="post_type_page" value="shop_order">



    <input type="hidden" id="_wpnonce" name="_wpnonce" value="f0b40e5e22"><input type="hidden" name="_wp_http_referer" value="/wp-admin/edit.php?post_type=shop_order">	<div class="tablenav top">

        <div class="alignleft actions">
            <label for="filter-by-date" class="screen-reader-text">Filter by date</label>
            <select name="m" id="filter-by-date">
                <option selected="selected" value="0">All dates</option>
                <option value="202402">February 2024</option>
                <option value="202311">November 2023</option>
                <option value="202310">October 2023</option>
                <option value="202309">September 2023</option>
            </select>
            <input type="submit" name="filter_action" id="post-query-submit" class="button" value="Filter">
        </div>
        <div class="tablenav-pages one-page"><span class="displaying-num">11 items</span>
            <span class="pagination-links"><span class="tablenav-pages-navspan button disabled" aria-hidden="true">«</span>
            <span class="tablenav-pages-navspan button disabled" aria-hidden="true">‹</span>
            <span class="paging-input"><label for="current-page-selector" class="screen-reader-text">Current Page</label><input class="current-page" id="current-page-selector" type="text" name="paged" value="1" size="1" aria-describedby="table-paging"><span class="tablenav-paging-text"> of <span class="total-pages">1</span></span></span>
            <span class="tablenav-pages-navspan button disabled" aria-hidden="true">›</span>
            <span class="tablenav-pages-navspan button disabled" aria-hidden="true">»</span></span></div>
        <br class="clear">
    </div>
    <h2 class="screen-reader-text">Orders list</h2><table class="wp-list-table widefat fixed striped table-view-list posts">
        <thead>
        <tr>
            <td id="cb" class="manage-column column-cb check-column"><input id="cb-select-all-1" type="checkbox">
                <label for="cb-select-all-1"><span class="screen-reader-text">Select All</span></label></td><th scope="col" id="order_number" class="manage-column column-order_number column-primary sortable desc"><a href="http://hermes-wp.local/wp-admin/edit.php?post_type=shop_order&amp;orderby=ID&amp;order=asc"><span>Order</span><span class="sorting-indicators"><span class="sorting-indicator asc" aria-hidden="true"></span><span class="sorting-indicator desc" aria-hidden="true"></span></span> <span class="screen-reader-text">Sort ascending.</span></a></th><th scope="col" id="order_date" class="manage-column column-order_date sortable desc"><a href="http://hermes-wp.local/wp-admin/edit.php?post_type=shop_order&amp;orderby=date&amp;order=asc"><span>Date</span><span class="sorting-indicators"><span class="sorting-indicator asc" aria-hidden="true"></span><span class="sorting-indicator desc" aria-hidden="true"></span></span> <span class="screen-reader-text">Sort ascending.</span></a></th><th scope="col" id="order_status" class="manage-column column-order_status">Status</th><th scope="col" id="billing_address" class="manage-column column-billing_address hidden">Billing</th><th scope="col" id="shipping_address" class="manage-column column-shipping_address hidden">Ship to</th><th scope="col" id="order_total" class="manage-column column-order_total sortable desc"><a href="http://hermes-wp.local/wp-admin/edit.php?post_type=shop_order&amp;orderby=order_total&amp;order=asc"><span>Total</span><span class="sorting-indicators"><span class="sorting-indicator asc" aria-hidden="true"></span><span class="sorting-indicator desc" aria-hidden="true"></span></span> <span class="screen-reader-text">Sort ascending.</span></a></th><th scope="col" id="wc_actions" class="manage-column column-wc_actions hidden">Actions</th><th scope="col" id="pathao" class="manage-column column-pathao">Pathao Courier</th><th scope="col" id="pathao_status" class="manage-column column-pathao_status">Pathao Courier Status</th><th scope="col" id="pathao_delivery_fee" class="manage-column column-pathao_delivery_fee">Pathao Courier Delivery Fee</th>	</tr>
        </thead>

        <tbody id="the-list">
            <?php do_action('custom_table_list'); ?>
        </tbody>

        <tfoot>
            <tr>
            <td class="manage-column column-cb check-column"><input id="cb-select-all-2" type="checkbox">
                <label for="cb-select-all-2"><span class="screen-reader-text">Select All</span></label></td><th scope="col" class="manage-column column-order_number column-primary sortable desc"><a href="http://hermes-wp.local/wp-admin/edit.php?post_type=shop_order&amp;orderby=ID&amp;order=asc"><span>Order</span><span class="sorting-indicators"><span class="sorting-indicator asc" aria-hidden="true"></span><span class="sorting-indicator desc" aria-hidden="true"></span></span> <span class="screen-reader-text">Sort ascending.</span></a></th><th scope="col" class="manage-column column-order_date sortable desc"><a href="http://hermes-wp.local/wp-admin/edit.php?post_type=shop_order&amp;orderby=date&amp;order=asc"><span>Date</span><span class="sorting-indicators"><span class="sorting-indicator asc" aria-hidden="true"></span><span class="sorting-indicator desc" aria-hidden="true"></span></span> <span class="screen-reader-text">Sort ascending.</span></a></th><th scope="col" class="manage-column column-order_status">Status</th><th scope="col" class="manage-column column-billing_address hidden">Billing</th><th scope="col" class="manage-column column-shipping_address hidden">Ship to</th><th scope="col" class="manage-column column-order_total sortable desc"><a href="http://hermes-wp.local/wp-admin/edit.php?post_type=shop_order&amp;orderby=order_total&amp;order=asc"><span>Total</span><span class="sorting-indicators"><span class="sorting-indicator asc" aria-hidden="true"></span><span class="sorting-indicator desc" aria-hidden="true"></span></span> <span class="screen-reader-text">Sort ascending.</span></a></th><th scope="col" class="manage-column column-wc_actions hidden">Actions</th><th scope="col" class="manage-column column-pathao">Pathao Courier</th><th scope="col" class="manage-column column-pathao_status">Pathao Courier Status</th><th scope="col" class="manage-column column-pathao_delivery_fee">Pathao Courier Delivery Fee</th>	</tr>
        </tfoot>

    </table>
    <div class="tablenav bottom">

        <div class="alignleft actions">
        </div>
        <div class="tablenav-pages one-page"><span class="displaying-num">11 items</span>
            <span class="pagination-links"><span class="tablenav-pages-navspan button disabled" aria-hidden="true">«</span>
            <span class="tablenav-pages-navspan button disabled" aria-hidden="true">‹</span>
            <span class="screen-reader-text">Current Page</span><span id="table-paging" class="paging-input"><span class="tablenav-paging-text">1 of <span class="total-pages">1</span></span></span>
            <span class="tablenav-pages-navspan button disabled" aria-hidden="true">›</span>
            <span class="tablenav-pages-navspan button disabled" aria-hidden="true">»</span></span></div>
        <br class="clear">
    </div>

</form>