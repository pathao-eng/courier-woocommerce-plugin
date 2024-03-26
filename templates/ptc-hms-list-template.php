<?php

global $wpdb;

$minimumLimit = 20;
$maximumLimit = 100;

$limit = isset($_GET['limit']) ? absint($_GET['limit']) : $minimumLimit;
$page = isset( $_GET['paged'] ) ? absint( $_GET['paged'] ) : 1; // Current page number
$search = esc_sql(sanitize_text_field(isset( $_GET['search'] ) ?  esc_attr($_GET['search']) : ''));
$fromDate = !empty($_GET['from-date']) ? date('Y-m-d H:i:s',  strtotime(esc_attr($_GET['from-date']))) : '';
$toDate = !empty($_GET['to-date']) ? date('Y-m-d H:i:s',  strtotime(esc_attr($_GET['to-date']))) : '';
$ordersPageType = isset($_GET['orders_page_type']) ? esc_attr($_GET['orders_page_type']) : 'all';
$resetFilter = isset($_GET['filter_action_reset']);

if ($resetFilter) {
    wp_redirect(admin_url('admin.php?page='. PTC_PLUGIN_PAGE_TYPE));
}

if (!$fromDate) {
    $fromDate = '';
}

if (!$toDate) {
    $toDate = '';
}

if ($limit < 1) {
    $limit = $minimumLimit;
}

$offset = ( $page - 1 ) * $limit;

$wcOrdersPageType = 'shop_order';

$columns = ptc_order_list_columns();

$ids = [];

if ($search) {

    $ids = array_merge($ids, ptc_get_post_ids_by_billing_first_name($search));

    $ids = array_merge($ids, ptc_get_post_ids_by_billing_last_name($search));

    $ids = array_merge($ids, ptc_get_post_ids_by_search_from_post_meta($search));

    $ids = array_merge($ids, ptc_get_post_ids_by_status($search));
}

if ($ordersPageType == 'pathao') {
    $ids = ptc_get_all_pathao_orders();
}

$allOrdersPageLink = add_query_arg('orders_page_type', 'all');
$pathaoOrdersPageLink = add_query_arg('orders_page_type', 'pathao');

$pathaoOrdersCount = ptc_get_all_pathao_orders_count();

$args = [
    'limit' => $limit,
    'offset' => $offset,
    'type' => $wcOrdersPageType,
    'paginate' => true,
];

if ((int)($search)) { // if search is a number, then its order id
    $ids[] = (int)$search;
}

$ids = array_unique($ids);
if ($ids) {
    $args['post__in'] = $ids;
}

if ($fromDate) {
    $args['date_query'] = [
        [
            'after' => $fromDate,
            'inclusive' => false,
        ],
    ];
}

if ($toDate) {
    $args['date_query'] = $args['date_query'] ?? [];
    $args['date_query'][] = [
        'before' => $toDate,
        'inclusive' => false,
    ];
}

$query = wc_get_orders($args);

$orders = $query->orders;

$totalOrders = ptc_wc_get_orders_count();
$lastPage = $query->max_num_pages;
$siteUrl = get_site_url();
$nextPageLink = add_query_arg('paged', min($page + 1, $lastPage));
$lastPageLink = add_query_arg('paged', $lastPage);
$prevPageLink = add_query_arg('paged', max($page - 1, 1));
$firstPageLink = add_query_arg('paged', 1);

$search = $_GET['search'] ?? '';
?>

<ul class="subsubsub">
    <li class="all">
        <a href="<?php echo $siteUrl . $allOrdersPageLink  ?>" class="<?php echo $ordersPageType == 'all' || !$ordersPageType ? 'current' : '' ?>" aria-current="page">
            All <span class="count"><?php echo $totalOrders; ?></span>
        </a> |
    </li>
    <li class="wc-processing">
        <a href="<?php echo $siteUrl . $pathaoOrdersPageLink  ?>" class="<?php echo $ordersPageType == 'pathao' ? 'current' : '' ?>">
            Pathao Orders <span class="count">(<?php echo $pathaoOrdersCount; ?>)</span>
        </a>
    </li>
</ul>
<form id="posts-filter" method="get">

    <p class="search-box">
        <label class="screen-reader-text" for="post-search-input">Search orders:</label>
        <input type="search" id="post-search-input" name="search" value="<?php echo $search ?>">
        <input type="hidden" name="page" class="post_type_page" value="<?php echo PTC_PLUGIN_PAGE_TYPE ?>">
        <input type="submit" id="search-submit" class="button" value="Search orders">
    </p>

    <div class="tablenav top">

        <div class="alignleft actions">
            <label for="from-date" class="">From Date</label>
            <input type="date" id="from-date" class="ptc-datepicker" name="from-date" value="<?php echo $fromDate ? date('Y-m-d', strtotime($fromDate)) : ''; ?>" placeholder="From Date">

            <label for="to-date" class="">To Date</label>
            <input type="date" id="to-date" class="ptc-datepicker" name="to-date" value="<?php echo $toDate ? date('Y-m-d', strtotime($toDate)) : ''; ?>" placeholder="To Date">

            <label for="limit" class="limit">Number of items per page</label>
            <input type="number" id="limit" name="limit" value="<?php echo $limit; ?>" class="ptc-limit" min="<?php echo $minimumLimit; ?>" max="<?php echo $maximumLimit; ?>">
            <input type="submit" name="filter_action" id="post-query-submit" class="button" value="Filter">
            <input type="submit" name="filter_action_reset" id="post-query-submit" class="button" value="Clear Filter">
        </div>
        <div class="tablenav-pages one-page">
            <span class="displaying-num"><?php echo count($orders); ?> items</span>
            <span class="pagination-links"><span class="tablenav-pages-navspan button disabled"
                                                 aria-hidden="true">«</span>
            <span class="tablenav-pages-navspan button disabled" aria-hidden="true">‹</span>
            <span class="paging-input"><label for="current-page-selector"
                                              class="screen-reader-text">Current Page</label><input class="current-page"
                                                                                                    id="current-page-selector"
                                                                                                    type="text"
                                                                                                    name="paged"
                                                                                                    value="1" size="1"
                                                                                                    aria-describedby="table-paging"><span
                        class="tablenav-paging-text"> of <span class="total-pages">1</span></span></span>
            <span class="tablenav-pages-navspan button disabled" aria-hidden="true">›</span>
            <span class="tablenav-pages-navspan button disabled" aria-hidden="true">»</span></span></div>
        <br class="clear">
    </div>
    <h2 class="screen-reader-text">Orders list</h2>
    <table class="wp-list-table widefat fixed striped table-view-list posts">
        <thead>
        <tr>
            <td id="cb" class="manage-column column-cb check-column"><input id="cb-select-all-1" type="checkbox">
                <label for="cb-select-all-1">
                    <span class="screen-reader-text">Select All</span>
                </label>
            </td>

            <?php foreach (ptc_order_list_columns() as $column): ?>
                <th scope="col" id="order_number"
                    class="manage-column column-order_number column-primary sortable desc">
                    <span> <?php echo $column ?> </span>
                </th>
            <?php endforeach; ?>
        </tr>
        </thead>

        <tbody id="the-list">
            <?php foreach ($orders as $order): ?>

            <?php
                $orderId = $order->get_id();
                $customerName = $order->get_billing_first_name() . ' ' . $order->get_billing_last_name();
                $total = $order->get_total();
                $consignmentId = get_post_meta($orderId, 'ptc_consignment_id', true); // because its cache by WordPress its wont create any query issue (https://wordpress.stackexchange.com/a/282538)
                $currencyCode = $order->get_currency();
                $currencySymbol = get_woocommerce_currency_symbol($currencyCode);
                $date = date("F jS, Y", strtotime($order->get_date_created()));
                $editLink = $order->get_edit_order_url();
            ?>

            <tr id="post-33" class="author-self level-0 post-<?php echo $orderId ?> type-shop_order">
                <th scope="row" class="check-column">
                    <input id="cb-select-<?php echo $orderId ?>" type="checkbox" name="post[]" value="<?php echo $orderId ?>">
                </th>

                <?php foreach ($columns as $key => $column): ?>

                    <?php switch ($key):
                        case 'order_number': ?>
                               <td class="order_number column-order_number has-row-actions column-primary" data-colname="Order">
                                    <a href="<?php echo $editLink; ?>" class="order-view">
                                        <strong>#<?php echo $orderId .'-'. $customerName;  ?></strong>
                                    </a>
                                </td>
                        <?php break; ?>

                        <?php case 'date': ?>
                            <td class="order_number column-order_number has-row-actions column-primary" data-colname="Order">
                                        <span>
                                            <?php echo $date; ?>
                                        </span>
                            </td>
                        <?php break; ?>

                        <?php case 'status': ?>
                            <td class="order_number column-order_number has-row-actions column-primary" data-colname="Order">
                                        <span>
                                           <?php echo $order->get_status(); ?>
                                        </span>
                            </td>
                        <?php break; ?>

                        <?php case 'total': ?>
                            <td class="order_number column-order_number has-row-actions column-primary" data-colname="Order">
                                        <span>
                                            <?php echo $currencySymbol . $total; ?>
                                        </span>
                            </td>
                        <?php break; ?>

                        <?php case 'pathao': ?>

                            <?php if (!$consignmentId): ?>
                                <td class="order_number column-order_number has-row-actions column-primary" data-colname="Order">
                                    <button class="ptc-open-modal-button" data-order-id="<?php echo $orderId ?>">
                                        <?php echo __('Send with Pathao', 'textdomain') ?>
                                    </button>
                                </td>
                            <?php else: ?>
                                <td class="order_number column-order_number has-row-actions column-primary" data-colname="Order">
                                    <span>
                                        <a href="<?php echo get_ptc_merchant_panel_base_url() . '/courier/orders/'. $consignmentId ; ?>" class="order-view" target="_blank">
                                             <?php echo $consignmentId; ?>
                                        </a>
                                    </span>
                                </td>
                            <?php endif; ?>

                        <?php break; ?>

                        <?php case 'pathao_status': ?>
                            <td class="order_number column-order_number has-row-actions column-primary" data-colname="Order">
                                <span id="<?php echo $orderId ?>">
                                   <?php echo ucfirst(get_post_meta($orderId, 'ptc_status', true)); ?>
                                </span>
                            </td>
                        <?php break; ?>


                        <?php case 'pathao_delivery_fee': ?>
                            <td class="order_number column-order_number has-row-actions column-primary" data-colname="Order">
                                <span id="ptc_delivery_fee-<?php echo $orderId; ?>">
                                    <?php echo get_post_meta($orderId, 'ptc_delivery_fee', true); ?>
                                </span>
                            </td>
                        <?php break; ?>

                        <?php default:
                            $columnValue = ptc_order_list_column_values_callback("", $column, $orderId);
                        ?>
                            <td>
                                <span><?php echo esc_html($columnValue); ?></span>
                            </td>

                    <?php endswitch; ?>

                <?php endforeach; ?>

                <?php endforeach; ?>
            </tr>
        </tbody>

    </table>

    <?php if (!$search || $lastPage): ?>

    <div class="tablenav bottom">
        <div class="tablenav-pages"><span class="displaying-num"><?php echo count($orders); ?>  items</span>
            <span class="pagination-links">


                <?php if ($page > 1): ?>
                    <a class="first-page button " href="<?php echo $siteUrl . $firstPageLink ?>">
                        <span class="screen-reader-text ">
                            First page
                        </span>
                        <span aria-hidden="true">
                            «
                        </span>
                    </a>

                    <a class="prev-page button " href="<?php echo $siteUrl . $prevPageLink ?>">
                        <span class="screen-reader-text">Previous page</span>
                        <span aria-hidden="true">
                            ‹
                        </span>
                    </a>


                <?php else: ?>

                    <span class="screen-reader-text disabled">
                        First page
                    </span>
                    <span aria-hidden="true" class="tablenav-pages-navspan button disabled">
                        «
                    </span>

                    <span class="screen-reader-text">Previous page</span>
                    <span aria-hidden="true" class="tablenav-pages-navspan button disabled">
                        ‹
                    </span>

                <?php endif; ?>




                <span class="screen-reader-text">
                    Current Page
                </span>
                <span id="table-paging" class="paging-input">
                    <span class="tablenav-paging-text">
                        <?php echo $page  ?> of
                        <span class="total-pages">
                            <?php echo $lastPage; ?>
                        </span>
                    </span>
                </span>

                <?php if ($page != $lastPage):  ?>

                    <a class="next-page button" href="<?php echo $siteUrl . $nextPageLink ?>">
                        <span class="screen-reader-text">Next page</span><span aria-hidden="true">
                            ›
                        </span>
                    </a>
                        <a class="last-page button" href="<?php echo $siteUrl . $lastPageLink ?>">
                        <span class="screen-reader-text">
                            Last page
                        </span>
                        <span aria-hidden="true">
                            »
                        </span>
                    </a>

                <?php  else: ?>

                    <span aria-hidden="true" class="tablenav-pages-navspan button disabled" >
                        ›
                    </span>

                    <span aria-hidden="true" class="tablenav-pages-navspan button disabled">
                        »
                    </span>

                <?php endif; ?>


            </span>
        </div>
        <br class="clear">
    </div>

    <?php endif; ?>

</form>