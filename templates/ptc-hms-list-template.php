<?php
function ptc_order_list_column_values_callback($value, $column_name, $post_meta) {
    $value = $post_meta[$column_name] ?? $value;
    return apply_filters('ptc_order_list_column_value_' . $column_name, $value);
}

function ptc_order_list_columns($columns = [])
{
    return apply_filters('custom_table_columns', [
            'order_number' => __('Order', 'textdomain'),
            'date' => __('Date', 'textdomain'),
            'status' => __('Status', 'textdomain'),
            'total' => __('Total', 'textdomain'),
            'pathao' => __('Pathao Courier', 'textdomain'),
            'pathao_status' => __('Pathao Courier Status', 'textdomain'),
            'pathao_delivery_fee' => __('Pathao Courier Delivery Fee', 'textdomain'),

        ] + $columns);
}

function ptc_order_list_callback() {

    $columns = ptc_order_list_columns();

    $orders = wc_get_orders([
        'limit' => -1,
        'meta_query' => [
            [
                'key' => 'ptc_consignment_id',
            ],
        ],
    ]);

    $html = '';

    foreach ($orders as $order) {
        $orderId = $order->get_id();
        $customerName = $order->get_billing_first_name() . ' ' . $order->get_billing_last_name();
        $total = $order->get_total();
        $consignmentId = $order->get_meta('ptc_consignment_id');
        $currencyCode = $order->get_currency();
        $currencySymbol = get_woocommerce_currency_symbol( $currencyCode );
        $date = date("F jS, Y", strtotime($order->get_date_created()));
        $editLink = get_edit_post_link($orderId);

        $td = '';

        foreach ($columns as $key => $column) {

            switch ($key) {
                case 'order_number':
                    $td .= '<td class="order_number column-order_number has-row-actions column-primary" data-colname="Order">
                        <a href="' . $editLink . '" class="order-view">
                            <strong>Preview #' . $orderId . $customerName . '</strong>
                            
                        </a>
                    </td>';
                    break;

                case 'date':
                    $td .= '<td class="order_number column-order_number has-row-actions column-primary" data-colname="Order">
                        <span>
                            ' . $date . '
                        </span>
                    </td>';
                    break;

                case 'status':
                    $td .= '<td class="order_number column-order_number has-row-actions column-primary" data-colname="Order">
                        <span>
                            ' . $order->get_status() . '
                        </span>
                    </td>';
                    break;

                case 'total':
                    $td .= '<td class="order_number column-order_number has-row-actions column-primary" data-colname="Order">
                        <span>
                            ' . $currencySymbol . $total . '
                        </span>
                    </td>';
                    break;

                case 'pathao':

                    $td .= '<td class="order_number column-order_number has-row-actions column-primary" data-colname="Order">
                        <span>
                            ' . $consignmentId . '
                        </span>
                    </td>';
                    break;

                case 'pathao_status':
                    $td .= '<td class="order_number column-order_number has-row-actions column-primary" data-colname="Order">
                        <span>
                            ' . ucfirst(get_post_meta($orderId, 'ptc_status', true)) . '
                        </span>
                    </td>';
                    break;

                case 'pathao_delivery_fee':
                    $td .= '<td class="order_number column-order_number has-row-actions column-primary" data-colname="Order">
                        <span>
                            ' . get_post_meta($orderId, 'ptc_delivery_fee', true) . '
                        </span>
                    </td>';
                    break;

                default:
                    $columnValue = ptc_order_list_column_values_callback("", $column, $orderId);
                    $td .= '<td>
                                <span>' . esc_html($columnValue) . '</span>
                            </td>';
            }

        }

        $html .= '
            <tr id="post-33" class="iedit author-self level-0 post-33 type-shop_order status-wc-processing post-password-required hentry">
                <th scope="row" class="check-column">			
                    <input id="cb-select-33" type="checkbox" name="post[]" value="'. $orderId .'">
                </th>
                '. $td .'
            </tr>
        ';

    }

    $html .= '</table>';

    echo $html;
}

add_action('ptc_order_list', 'ptc_order_list_callback');

?>


<form id="posts-filter" method="get">

    <p class="search-box">
        <label class="screen-reader-text" for="post-search-input">Search orders:</label>
        <input type="search" id="post-search-input" name="s" value="">
        <input type="submit" id="search-submit" class="button" value="Search orders"></p>

    <input type="hidden" name="post_status" class="post_status_page" value="all">
    <input type="hidden" name="post_type" class="post_type_page" value="shop_order">

    <div class="tablenav top">

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
        <div class="tablenav-pages one-page">
            <span class="displaying-num">11 items</span>
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
                     <label for="cb-select-all-1">
                         <span class="screen-reader-text">Select All</span>
                     </label>
                </td>

                <?php foreach (ptc_order_list_columns() as $column): ?>
                    <th scope="col" id="order_number" class="manage-column column-order_number column-primary sortable desc">
                        <span> <?php echo $column ?> </span>
                    </th>
                <?php endforeach; ?>
            </tr>
        </thead>

        <tbody id="the-list">
            <?php do_action('ptc_order_list'); ?>
        </tbody>

    </table>


</form>