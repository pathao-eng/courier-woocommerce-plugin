<?php
global $wpdb;

$minimumLimit = 20;
$maximumLimit = 100;

$limit = isset($_GET['limit']) ? absint($_GET['limit']) : $minimumLimit;
$page = isset($_GET['paged']) ? absint($_GET['paged']) : 1;
$search = sanitize_text_field($_GET['search'] ?? '');
$fromDate = !empty($_GET['from-date']) ? date('Y-m-d H:i:s', strtotime(esc_attr($_GET['from-date']))) : '';
$toDate = !empty($_GET['to-date']) ? date('Y-m-d H:i:s', strtotime(esc_attr($_GET['to-date']))) : '';
$ordersPageType = $_GET['orders_page_type'] ?? 'all';
$orderStatus = $_GET['order_status'] ?? '';
$resetFilter = isset($_GET['filter_action_reset']);

if ($resetFilter) {
    wp_redirect(admin_url('admin.php?page=' . PTC_PLUGIN_PAGE_TYPE));
    exit;
}

$offset = ($page - 1) * $limit;
$wcOrdersPageType = 'shop_order';
$columns = ptc_order_list_columns();

$args = [
    'limit' => $limit,
    'offset' => $offset,
    'type' => $wcOrdersPageType,
    'paginate' => true,
];

if ($orderStatus) {
    $args['status'] = $orderStatus;
}

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

if ((int)$search) {
    $ids[] = (int)$search;
}

$ids = array_unique($ids);
if ($ids) {
    $args['post__in'] = $ids;
}

if ($fromDate) {
    $args['date_query'] = [
        ['after' => $fromDate, 'inclusive' => false]
    ];
}

if ($toDate) {
    $args['date_query'] = $args['date_query'] ?? [];
    $args['date_query'][] = ['before' => $toDate, 'inclusive' => false];
}

$query = wc_get_orders($args);
$orders = $query->orders;
$totalOrders = ptc_wc_get_orders_count();
$pathaoOrdersCount = ptc_get_all_pathao_orders_count();
$lastPage = $query->max_num_pages;
$siteUrl = get_site_url();
?>

<div class="ptc-enhanced-orders-wrapper">
    <!-- Header Section -->
    <div class="ptc-orders-header">
        <div class="ptc-header-top">
            <div class="ptc-brand">
                <?php if (file_exists(PTC_PLUGIN_DIR . 'assets/images/courier-logo.svg')): ?>
                    <img src="<?php echo PTC_PLUGIN_URL . 'assets/images/courier-logo.svg'; ?>" alt="Pathao Courier" style="height: 30px;">
                <?php else: ?>
                    <span class="dashicons dashicons-airplane" style="font-size: 24px; color: #2271b1;"></span>
                <?php endif; ?>
                <h1>Orders Management</h1>
            </div>
            <div class="ptc-header-actions">
                <button class="button ptc-export-btn" id="ptc-export-orders">
                    <span class="dashicons dashicons-download"></span> Export
                </button>
                <button class="button button-primary ptc-bulk-send" id="ptc-bulk-send" disabled>
                    <span class="dashicons dashicons-airplane"></span> Bulk Send to Pathao
                </button>
            </div>
        </div>
        
        <!-- Stats Cards -->
        <div class="ptc-stats-cards">
            <div class="ptc-stat-card">
                <div class="stat-icon"><span class="dashicons dashicons-cart"></span></div>
                <div class="stat-content">
                    <div class="stat-value"><?php echo $totalOrders; ?></div>
                    <div class="stat-label">Total Orders</div>
                </div>
            </div>
            <div class="ptc-stat-card">
                <div class="stat-icon pathao"><span class="dashicons dashicons-airplane"></span></div>
                <div class="stat-content">
                    <div class="stat-value"><?php echo $pathaoOrdersCount; ?></div>
                    <div class="stat-label">Pathao Orders</div>
                </div>
            </div>
            <div class="ptc-stat-card">
                <div class="stat-icon pending"><span class="dashicons dashicons-clock"></span></div>
                <div class="stat-content">
                    <div class="stat-value" id="pending-count">0</div>
                    <div class="stat-label">Pending</div>
                </div>
            </div>
            <div class="ptc-stat-card">
                <div class="stat-icon delivered"><span class="dashicons dashicons-yes-alt"></span></div>
                <div class="stat-content">
                    <div class="stat-value" id="delivered-count">0</div>
                    <div class="stat-label">Delivered</div>
                </div>
            </div>
        </div>
    </div>

    <!-- Filters Section -->
    <div class="ptc-filters-section">
        <form id="ptc-filters-form" method="get">
            <input type="hidden" name="page" value="<?php echo PTC_PLUGIN_PAGE_TYPE ?>">
            
            <div class="ptc-filters-row">
                <!-- Search Box -->
                <div class="ptc-filter-group ptc-search-group">
                    <div class="ptc-search-wrapper">
                        <span class="dashicons dashicons-search"></span>
                        <input type="search" 
                               id="ptc-search-input" 
                               name="search" 
                               placeholder="Search orders, customer, phone, consignment ID..." 
                               value="<?php echo esc_attr($search); ?>"
                               class="ptc-search-input">
                    </div>
                </div>

                <!-- Status Filter -->
                <div class="ptc-filter-group">
                    <select name="order_status" id="ptc-status-filter" class="ptc-select">
                        <option value="">All Status</option>
                        <?php foreach (wc_get_order_statuses() as $status_key => $status_label): ?>
                            <option value="<?php echo esc_attr($status_key); ?>" <?php selected($orderStatus, $status_key); ?>>
                                <?php echo esc_html($status_label); ?>
                            </option>
                        <?php endforeach; ?>
                    </select>
                </div>

                <!-- Date Range -->
                <div class="ptc-filter-group ptc-date-range">
                    <div class="ptc-date-preset">
                        <select id="ptc-date-preset" class="ptc-select">
                            <option value="">Custom Range</option>
                            <option value="today">Today</option>
                            <option value="yesterday">Yesterday</option>
                            <option value="last7days">Last 7 Days</option>
                            <option value="last30days">Last 30 Days</option>
                            <option value="thismonth">This Month</option>
                            <option value="lastmonth">Last Month</option>
                        </select>
                    </div>
                    <input type="date" 
                           name="from-date" 
                           id="ptc-from-date" 
                           value="<?php echo $fromDate ? date('Y-m-d', strtotime($fromDate)) : ''; ?>"
                           class="ptc-date-input">
                    <span class="ptc-date-separator">to</span>
                    <input type="date" 
                           name="to-date" 
                           id="ptc-to-date" 
                           value="<?php echo $toDate ? date('Y-m-d', strtotime($toDate)) : ''; ?>"
                           class="ptc-date-input">
                </div>

                <!-- Order Type Tabs -->
                <div class="ptc-filter-group ptc-order-type-tabs">
                    <a href="?page=<?php echo PTC_PLUGIN_PAGE_TYPE; ?>&orders_page_type=all" 
                       class="ptc-tab <?php echo $ordersPageType == 'all' ? 'active' : ''; ?>">
                        All Orders
                    </a>
                    <a href="?page=<?php echo PTC_PLUGIN_PAGE_TYPE; ?>&orders_page_type=pathao" 
                       class="ptc-tab <?php echo $ordersPageType == 'pathao' ? 'active' : ''; ?>">
                        Pathao Orders
                    </a>
                </div>

                <!-- Action Buttons -->
                <div class="ptc-filter-actions">
                    <button type="submit" class="button button-primary">
                        <span class="dashicons dashicons-filter"></span> Apply Filters
                    </button>
                    <button type="submit" name="filter_action_reset" class="button">
                        <span class="dashicons dashicons-dismiss"></span> Clear
                    </button>
                </div>
            </div>
        </form>
    </div>

    <!-- Orders Table -->
    <div class="ptc-orders-table-wrapper">
        <table class="ptc-orders-table">
            <thead>
                <tr>
                    <th class="check-column">
                        <input type="checkbox" id="ptc-select-all">
                    </th>
                    <th>Order</th>
                    <th>Customer</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th>Total</th>
                    <th>Pathao</th>
                    <th>Delivery Status</th>
                    <th>Delivery Fee</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody id="ptc-orders-tbody">
                <?php if (empty($orders)): ?>
                    <tr>
                        <td colspan="10" class="ptc-no-orders">
                            <div class="ptc-empty-state">
                                <span class="dashicons dashicons-info"></span>
                                <p>No orders found matching your criteria.</p>
                            </div>
                        </td>
                    </tr>
                <?php else: ?>
                    <?php foreach ($orders as $order): 
                        $orderId = $order->get_id();
                        $customerName = $order->get_billing_first_name() . ' ' . $order->get_billing_last_name();
                        $customerPhone = $order->get_billing_phone();
                        $total = $order->get_total();
                        $consignmentId = get_post_meta($orderId, 'ptc_consignment_id', true);
                        $ptcStatus = get_post_meta($orderId, 'ptc_status', true);
                        $deliveryFee = get_post_meta($orderId, 'ptc_delivery_fee', true);
                        $currencySymbol = get_woocommerce_currency_symbol($order->get_currency());
                        $orderDate = $order->get_date_created();
                        $editLink = $order->get_edit_order_url();
                        $status = $order->get_status();
                        
                        // Status badge colors
                        $statusColors = [
                            'pending' => '#f39c12',
                            'processing' => '#3498db',
                            'on-hold' => '#95a5a6',
                            'completed' => '#27ae60',
                            'cancelled' => '#e74c3c',
                            'refunded' => '#9b59b6',
                            'failed' => '#c0392b'
                        ];
                        $statusColor = $statusColors[$status] ?? '#7f8c8d';
                    ?>
                        <tr class="ptc-order-row" data-order-id="<?php echo $orderId; ?>">
                            <td class="check-column">
                                <input type="checkbox" class="ptc-order-checkbox" value="<?php echo $orderId; ?>" 
                                       <?php echo $consignmentId ? 'disabled' : ''; ?>>
                            </td>
                            <td class="ptc-order-id">
                                <a href="<?php echo $editLink; ?>" class="ptc-order-link">
                                    #<?php echo $orderId; ?>
                                </a>
                            </td>
                            <td class="ptc-customer-info">
                                <div class="customer-name"><?php echo esc_html($customerName); ?></div>
                                <div class="customer-phone"><?php echo esc_html($customerPhone); ?></div>
                            </td>
                            <td class="ptc-order-date">
                                <div class="date"><?php echo $orderDate->date('M d, Y'); ?></div>
                                <div class="time"><?php echo $orderDate->date('h:i A'); ?></div>
                            </td>
                            <td class="ptc-order-status">
                                <span class="ptc-status-badge" style="background-color: <?php echo $statusColor; ?>">
                                    <?php echo ucfirst($status); ?>
                                </span>
                            </td>
                            <td class="ptc-order-total">
                                <strong><?php echo $currencySymbol . number_format($total, 2); ?></strong>
                            </td>
                            <td class="ptc-pathao-status">
                                <?php if ($consignmentId): ?>
                                    <a href="<?php echo get_ptc_merchant_panel_base_url() . '/courier/orders/' . $consignmentId; ?>" 
                                       target="_blank" 
                                       class="ptc-consignment-link">
                                        <?php echo $consignmentId; ?>
                                    </a>
                                <?php else: ?>
                                    <button class="button button-small ptc-send-single" data-order-id="<?php echo $orderId; ?>">
                                        Send to Pathao
                                    </button>
                                <?php endif; ?>
                            </td>
                            <td class="ptc-delivery-status">
                                <?php if ($ptcStatus): ?>
                                    <span class="ptc-delivery-badge ptc-status-<?php echo strtolower($ptcStatus); ?>">
                                        <?php echo ucfirst($ptcStatus); ?>
                                    </span>
                                <?php else: ?>
                                    <span class="ptc-na">-</span>
                                <?php endif; ?>
                            </td>
                            <td class="ptc-delivery-fee">
                                <?php echo $deliveryFee ? $currencySymbol . $deliveryFee : '-'; ?>
                            </td>
                            <td class="ptc-actions">
                                <div class="ptc-action-buttons">
                                    <button class="ptc-action-btn ptc-quick-view" 
                                            data-order-id="<?php echo $orderId; ?>" 
                                            title="Quick View">
                                        <span class="dashicons dashicons-visibility"></span>
                                    </button>
                                    <?php if ($consignmentId): ?>
                                        <button class="ptc-action-btn ptc-track-order" 
                                                data-consignment="<?php echo $consignmentId; ?>" 
                                                title="Track Order">
                                            <span class="dashicons dashicons-location"></span>
                                        </button>
                                    <?php endif; ?>
                                </div>
                            </td>
                        </tr>
                    <?php endforeach; ?>
                <?php endif; ?>
            </tbody>
        </table>
    </div>

    <!-- Pagination -->
    <?php if ($lastPage > 1): ?>
    <div class="ptc-pagination">
        <div class="ptc-pagination-info">
            Showing <?php echo (($page - 1) * $limit) + 1; ?> to <?php echo min($page * $limit, $query->total); ?> 
            of <?php echo $query->total; ?> orders
        </div>
        <div class="ptc-pagination-controls">
            <?php if ($page > 1): ?>
                <a href="?page=<?php echo PTC_PLUGIN_PAGE_TYPE; ?>&paged=1<?php echo $search ? '&search=' . $search : ''; ?>" 
                   class="ptc-page-btn">First</a>
                <a href="?page=<?php echo PTC_PLUGIN_PAGE_TYPE; ?>&paged=<?php echo $page - 1; ?><?php echo $search ? '&search=' . $search : ''; ?>" 
                   class="ptc-page-btn">Previous</a>
            <?php endif; ?>
            
            <?php
            $start = max(1, $page - 2);
            $end = min($lastPage, $page + 2);
            
            for ($i = $start; $i <= $end; $i++): ?>
                <a href="?page=<?php echo PTC_PLUGIN_PAGE_TYPE; ?>&paged=<?php echo $i; ?><?php echo $search ? '&search=' . $search : ''; ?>" 
                   class="ptc-page-btn <?php echo $i == $page ? 'active' : ''; ?>">
                    <?php echo $i; ?>
                </a>
            <?php endfor; ?>
            
            <?php if ($page < $lastPage): ?>
                <a href="?page=<?php echo PTC_PLUGIN_PAGE_TYPE; ?>&paged=<?php echo $page + 1; ?><?php echo $search ? '&search=' . $search : ''; ?>" 
                   class="ptc-page-btn">Next</a>
                <a href="?page=<?php echo PTC_PLUGIN_PAGE_TYPE; ?>&paged=<?php echo $lastPage; ?><?php echo $search ? '&search=' . $search : ''; ?>" 
                   class="ptc-page-btn">Last</a>
            <?php endif; ?>
        </div>
    </div>
    <?php endif; ?>
</div>

<!-- Enhanced Send to Pathao Modal -->
<div id="ptc-enhanced-modal" class="ptc-modal">
    <div class="ptc-modal-content ptc-send-modal">
        <div class="ptc-modal-header">
            <div class="ptc-modal-title">
                <span class="dashicons dashicons-airplane"></span>
                <h2>Send Order to Pathao Courier</h2>
            </div>
            <button class="ptc-modal-close" title="Close (ESC)">&times;</button>
        </div>
        
        <!-- Progress Steps -->
        <div class="ptc-modal-steps">
            <div class="ptc-step active" data-step="1">
                <span class="step-number">1</span>
                <span class="step-label">Order Details</span>
            </div>
            <div class="ptc-step" data-step="2">
                <span class="step-number">2</span>
                <span class="step-label">Delivery Info</span>
            </div>
            <div class="ptc-step" data-step="3">
                <span class="step-number">3</span>
                <span class="step-label">Confirmation</span>
            </div>
        </div>
        
        <div class="ptc-modal-body">
            <form id="ptc-send-order-form" class="ptc-form-modern">
                <!-- Step 1: Order Details -->
                <div class="ptc-form-step active" data-step="1">
                    <div class="ptc-form-section">
                        <h3 class="section-title">
                            <span class="dashicons dashicons-cart"></span>
                            Order Information
                        </h3>
                        <div class="ptc-form-grid">
                            <div class="ptc-form-group">
                                <label for="ptc-order-id">Order ID</label>
                                <input type="text" id="ptc-order-id" class="ptc-input" readonly>
                                <span class="ptc-field-icon"><span class="dashicons dashicons-tag"></span></span>
                            </div>
                            <div class="ptc-form-group">
                                <label for="ptc-order-amount">Order Amount</label>
                                <input type="text" id="ptc-order-amount" class="ptc-input" readonly>
                                <span class="ptc-field-icon"><span class="dashicons dashicons-money-alt"></span></span>
                            </div>
                        </div>
                        
                        <div class="ptc-form-group">
                            <label for="ptc-item-description">Item Description <span class="required">*</span></label>
                            <textarea id="ptc-item-description" class="ptc-textarea" rows="3" 
                                      placeholder="Enter product details (e.g., T-shirt x2, Shoes x1)" required></textarea>
                            <span class="ptc-help-text">Describe the items being delivered</span>
                        </div>
                        
                        <div class="ptc-form-grid">
                            <div class="ptc-form-group">
                                <label for="ptc-item-weight">Weight (kg) <span class="required">*</span></label>
                                <input type="number" id="ptc-item-weight" class="ptc-input" 
                                       min="0.1" step="0.1" placeholder="0.5" required>
                                <span class="ptc-help-text">Package weight in kilograms</span>
                            </div>
                            <div class="ptc-form-group">
                                <label for="ptc-item-quantity">Quantity <span class="required">*</span></label>
                                <input type="number" id="ptc-item-quantity" class="ptc-input" 
                                       min="1" placeholder="1" value="1" required>
                                <span class="ptc-help-text">Number of packages</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Step 2: Delivery Information -->
                <div class="ptc-form-step" data-step="2">
                    <div class="ptc-form-section">
                        <h3 class="section-title">
                            <span class="dashicons dashicons-location"></span>
                            Delivery Details
                        </h3>
                        
                        <!-- Customer Info -->
                        <div class="ptc-info-card">
                            <h4>Customer Information</h4>
                            <div class="ptc-form-grid">
                                <div class="ptc-form-group">
                                    <label for="ptc-customer-name">Full Name <span class="required">*</span></label>
                                    <input type="text" id="ptc-customer-name" class="ptc-input" required>
                                    <span class="ptc-field-icon"><span class="dashicons dashicons-admin-users"></span></span>
                                </div>
                                <div class="ptc-form-group">
                                    <label for="ptc-customer-phone">Phone Number <span class="required">*</span></label>
                                    <input type="tel" id="ptc-customer-phone" class="ptc-input" 
                                           pattern="01[3-9][0-9]{8}" placeholder="01XXXXXXXXX" required>
                                    <span class="ptc-field-icon"><span class="dashicons dashicons-phone"></span></span>
                                    <span class="ptc-help-text">Bangladesh mobile number</span>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Delivery Address -->
                        <div class="ptc-info-card">
                            <h4>Delivery Address</h4>
                            <div class="ptc-form-group">
                                <label for="ptc-delivery-address">Full Address <span class="required">*</span></label>
                                <textarea id="ptc-delivery-address" class="ptc-textarea" rows="2" required></textarea>
                                <span class="ptc-help-text">House/Road/Area details</span>
                            </div>
                            
                            <div class="ptc-form-grid">
                                <div class="ptc-form-group">
                                    <label for="ptc-city">City <span class="required">*</span></label>
                                    <select id="ptc-city" class="ptc-select" required>
                                        <option value="">Select City</option>
                                        <option value="1">Dhaka</option>
                                        <option value="2">Chattogram</option>
                                        <option value="3">Sylhet</option>
                                        <option value="4">Khulna</option>
                                        <option value="5">Rajshahi</option>
                                        <option value="6">Barishal</option>
                                        <option value="7">Rangpur</option>
                                        <option value="8">Mymensingh</option>
                                    </select>
                                </div>
                                <div class="ptc-form-group">
                                    <label for="ptc-zone">Zone <span class="required">*</span></label>
                                    <select id="ptc-zone" class="ptc-select" required>
                                        <option value="">Select Zone</option>
                                    </select>
                                </div>
                                <div class="ptc-form-group">
                                    <label for="ptc-area">Area <span class="required">*</span></label>
                                    <select id="ptc-area" class="ptc-select" required>
                                        <option value="">Select Area</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Delivery Options -->
                        <div class="ptc-info-card">
                            <h4>Delivery Options</h4>
                            <div class="ptc-form-grid">
                                <div class="ptc-form-group">
                                    <label for="ptc-delivery-type">Delivery Type <span class="required">*</span></label>
                                    <select id="ptc-delivery-type" class="ptc-select" required>
                                        <option value="48">Regular (48 hours)</option>
                                        <option value="24">Express (24 hours)</option>
                                        <option value="12">Same Day (12 hours)</option>
                                    </select>
                                </div>
                                <div class="ptc-form-group">
                                    <label for="ptc-payment-method">Payment Method <span class="required">*</span></label>
                                    <select id="ptc-payment-method" class="ptc-select" required>
                                        <option value="cod">Cash on Delivery (COD)</option>
                                        <option value="prepaid">Prepaid</option>
                                    </select>
                                </div>
                            </div>
                            
                            <div class="ptc-form-group">
                                <label for="ptc-special-instructions">Special Instructions</label>
                                <textarea id="ptc-special-instructions" class="ptc-textarea" rows="2" 
                                          placeholder="Any special delivery instructions..."></textarea>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Step 3: Confirmation -->
                <div class="ptc-form-step" data-step="3">
                    <div class="ptc-form-section">
                        <h3 class="section-title">
                            <span class="dashicons dashicons-yes-alt"></span>
                            Review & Confirm
                        </h3>
                        
                        <div class="ptc-summary-card">
                            <div class="ptc-summary-header">
                                <h4>Order Summary</h4>
                                <span class="ptc-order-badge" id="ptc-summary-order-id"></span>
                            </div>
                            
                            <div class="ptc-summary-grid">
                                <div class="ptc-summary-item">
                                    <span class="label">Customer:</span>
                                    <span class="value" id="ptc-summary-customer"></span>
                                </div>
                                <div class="ptc-summary-item">
                                    <span class="label">Phone:</span>
                                    <span class="value" id="ptc-summary-phone"></span>
                                </div>
                                <div class="ptc-summary-item">
                                    <span class="label">Address:</span>
                                    <span class="value" id="ptc-summary-address"></span>
                                </div>
                                <div class="ptc-summary-item">
                                    <span class="label">Items:</span>
                                    <span class="value" id="ptc-summary-items"></span>
                                </div>
                                <div class="ptc-summary-item">
                                    <span class="label">Weight:</span>
                                    <span class="value" id="ptc-summary-weight"></span>
                                </div>
                                <div class="ptc-summary-item">
                                    <span class="label">Delivery Type:</span>
                                    <span class="value" id="ptc-summary-delivery"></span>
                                </div>
                                <div class="ptc-summary-item">
                                    <span class="label">Payment:</span>
                                    <span class="value" id="ptc-summary-payment"></span>
                                </div>
                                <div class="ptc-summary-item highlight">
                                    <span class="label">Total Amount:</span>
                                    <span class="value" id="ptc-summary-amount"></span>
                                </div>
                            </div>
                            
                            <div class="ptc-fee-breakdown">
                                <h5>Fee Breakdown</h5>
                                <div class="fee-item">
                                    <span>Delivery Charge:</span>
                                    <span id="ptc-delivery-charge">৳60</span>
                                </div>
                                <div class="fee-item">
                                    <span>COD Charge:</span>
                                    <span id="ptc-cod-charge">৳10</span>
                                </div>
                                <div class="fee-item total">
                                    <span>Total Charge:</span>
                                    <span id="ptc-total-charge">৳70</span>
                                </div>
                            </div>
                        </div>
                        
                        <div class="ptc-confirmation-notice">
                            <span class="dashicons dashicons-info"></span>
                            <p>Please review all details carefully. Once submitted, the order will be sent to Pathao for processing.</p>
                        </div>
                    </div>
                </div>
            </form>
        </div>
        
        <div class="ptc-modal-footer">
            <div class="ptc-footer-left">
                <button type="button" class="button ptc-btn-prev" style="display:none;">
                    <span class="dashicons dashicons-arrow-left-alt"></span> Previous
                </button>
            </div>
            <div class="ptc-footer-right">
                <button type="button" class="button ptc-btn-cancel">Cancel</button>
                <button type="button" class="button button-primary ptc-btn-next">
                    Next <span class="dashicons dashicons-arrow-right-alt"></span>
                </button>
                <button type="button" class="button button-primary ptc-btn-submit" style="display:none;">
                    <span class="dashicons dashicons-yes"></span> Send to Pathao
                </button>
            </div>
        </div>
    </div>
</div>

<!-- Bulk Send Spreadsheet Modal -->
<div id="ptc-bulk-send-modal" class="ptc-modal ptc-bulk-modal">
    <div class="ptc-modal-content ptc-bulk-content">
        <div class="ptc-modal-header">
            <div class="ptc-modal-title">
                <span class="dashicons dashicons-airplane"></span>
                <h2>Bulk Send to Pathao - <span id="ptc-bulk-count">0</span> Orders</h2>
            </div>
            <button class="ptc-modal-close" title="Close (ESC)">&times;</button>
        </div>
        
        <!-- Bulk Operations Toolbar -->
        <div class="ptc-bulk-toolbar">
            <div class="ptc-toolbar-left">
                <div class="ptc-toolbar-group">
                    <button class="button ptc-select-all-rows" title="Select All">
                        <span class="dashicons dashicons-yes"></span> Select All
                    </button>
                    <button class="button ptc-deselect-all-rows" title="Deselect All">
                        <span class="dashicons dashicons-dismiss"></span> Deselect All
                    </button>
                </div>
                
                <div class="ptc-toolbar-separator"></div>
                
                <div class="ptc-toolbar-group">
                    <label for="ptc-bulk-delivery-type">Delivery Type:</label>
                    <select id="ptc-bulk-delivery-type" class="ptc-bulk-selector">
                        <option value="">- Apply to Selected -</option>
                        <option value="48">Regular (48h)</option>
                        <option value="24">Express (24h)</option>
                        <option value="12">Same Day (12h)</option>
                    </select>
                    
                    <label for="ptc-bulk-payment-method">Payment:</label>
                    <select id="ptc-bulk-payment-method" class="ptc-bulk-selector">
                        <option value="">- Apply to Selected -</option>
                        <option value="cod">Cash on Delivery</option>
                        <option value="prepaid">Prepaid</option>
                    </select>
                    
                    <button class="button ptc-auto-calculate-weight" title="Auto-calculate weights">
                        <span class="dashicons dashicons-calculator"></span> Auto Weight
                    </button>
                </div>
            </div>
            
            <div class="ptc-toolbar-right">
                <div class="ptc-validation-summary">
                    <span class="ptc-valid-count">0 Valid</span>
                    <span class="ptc-invalid-count">0 Invalid</span>
                </div>
                <button class="button ptc-validate-all" title="Validate All Rows">
                    <span class="dashicons dashicons-yes-alt"></span> Validate All
                </button>
            </div>
        </div>
        
        <div class="ptc-modal-body ptc-bulk-body">
            <!-- Spreadsheet Table -->
            <div class="ptc-bulk-table-container">
                <table class="ptc-bulk-table" id="ptc-bulk-orders-table">
                    <thead>
                        <tr>
                            <th class="ptc-col-select">
                                <input type="checkbox" id="ptc-bulk-select-all" title="Select All">
                            </th>
                            <th class="ptc-col-order">Order ID</th>
                            <th class="ptc-col-amount">Amount</th>
                            <th class="ptc-col-customer">Customer Name</th>
                            <th class="ptc-col-phone">Phone</th>
                            <th class="ptc-col-address">Address</th>
                            <th class="ptc-col-city">City</th>
                            <th class="ptc-col-zone">Zone</th>
                            <th class="ptc-col-area">Area</th>
                            <th class="ptc-col-items">Item Description</th>
                            <th class="ptc-col-weight">Weight (kg)</th>
                            <th class="ptc-col-quantity">Qty</th>
                            <th class="ptc-col-delivery">Delivery Type</th>
                            <th class="ptc-col-payment">Payment Method</th>
                            <th class="ptc-col-instructions">Special Instructions</th>
                            <th class="ptc-col-status">Status</th>
                            <th class="ptc-col-actions">Actions</th>
                        </tr>
                    </thead>
                    <tbody id="ptc-bulk-orders-body">
                        <!-- Rows will be populated via JavaScript -->
                    </tbody>
                </table>
            </div>
            
            <!-- Loading State -->
            <div class="ptc-bulk-loading" id="ptc-bulk-loading" style="display: none;">
                <div class="ptc-spinner"></div>
                <p>Loading order details...</p>
            </div>
            
            <!-- Empty State -->
            <div class="ptc-bulk-empty" id="ptc-bulk-empty" style="display: none;">
                <span class="dashicons dashicons-cart"></span>
                <h3>No Orders Selected</h3>
                <p>Select orders from the main table to bulk send to Pathao.</p>
            </div>
            
            <!-- Processing Progress -->
            <div class="ptc-bulk-progress" id="ptc-bulk-progress" style="display: none;">
                <h3>Processing Orders...</h3>
                <div class="ptc-progress-bar">
                    <div class="ptc-progress-fill" id="ptc-progress-fill"></div>
                </div>
                <div class="ptc-progress-text">
                    <span id="ptc-progress-current">0</span> of <span id="ptc-progress-total">0</span> orders processed
                    <span class="ptc-progress-status" id="ptc-progress-status">Starting...</span>
                </div>
                <button class="button ptc-cancel-processing" id="ptc-cancel-processing">Cancel</button>
            </div>
        </div>
        
        <div class="ptc-modal-footer ptc-bulk-footer">
            <div class="ptc-footer-left">
                <div class="ptc-bulk-summary">
                    <span id="ptc-selected-summary">0 orders selected</span>
                    <span class="ptc-separator">•</span>
                    <span id="ptc-validation-summary">0 ready to send</span>
                </div>
            </div>
            <div class="ptc-footer-right">
                <button type="button" class="button ptc-btn-cancel">Cancel</button>
                <button type="button" class="button ptc-save-draft">Save Draft</button>
                <button type="button" class="button button-primary ptc-bulk-submit" disabled>
                    <span class="dashicons dashicons-airplane"></span> Send Selected to Pathao
                </button>
            </div>
        </div>
    </div>
</div>

<!-- Quick View Modal -->
<div id="ptc-quick-view-modal" class="ptc-modal">
    <div class="ptc-modal-content ptc-quick-view-content">
        <div class="ptc-modal-header">
            <h2>Order Quick View</h2>
            <button class="ptc-modal-close">&times;</button>
        </div>
        <div class="ptc-modal-body">
            <!-- Quick view content will be loaded here -->
        </div>
    </div>
</div>

<!-- Toast Container -->
<div id="ptc-toast-container"></div>

<!-- Loading Overlay -->
<div id="ptc-loading-overlay">
    <div class="ptc-spinner"></div>
</div>