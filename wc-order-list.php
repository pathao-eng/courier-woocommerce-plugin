<?php
// Hook for adding admin columns and populating them
add_action('init', 'initialize_admin_columns');

add_filter('woocommerce_get_wp_query_args', function ($wp_query_args, $query_vars) {
    if (isset($query_vars['meta_query'])) {
        $meta_query = $wp_query_args['meta_query'] ?? [];
        $wp_query_args['meta_query'] = array_merge($meta_query, $query_vars['meta_query']);
    }
    return $wp_query_args;
}, 10, 2);

function initialize_admin_columns()
{
    add_filter('manage_edit-shop_order_columns', 'ptc_add_column_to_order_list');
    add_action('manage_shop_order_posts_custom_column', 'ptc_populate_store_column', 10, 2);

    add_filter('woocommerce_shop_order_list_table_columns', 'ptc_add_column_to_order_list'); // new woocommerce orders table
    add_action('woocommerce_shop_order_list_table_custom_column', 'ptc_populate_store_column_for_orders_table', 10, 2);// new woocommerce orders table
}

function ptc_add_column_to_order_list($columns)
{
    $columns['pathao'] = __('Pathao Courier', 'pathao_text_domain');
    $columns['pathao_status'] = __('Pathao Courier Status', 'pathao_text_domain');
    $columns['pathao_delivery_fee'] = __('Pathao Courier Delivery Fee', 'pathao_text_domain');
    return $columns;
}

function ptc_populate_store_column_for_orders_table($column, $order)
{
     ptc_populate_store_column($column, $order->get_id());
}


function ptc_populate_store_column($column, $post_id)
{
    if ($column === 'pathao') {
        $order = wc_get_order($post_id);
        echo ptc_render_store_modal_button($post_id);
    }

    if ($column === 'pathao_status') {
        $status = get_post_meta($post_id, 'ptc_status', true);
        echo sprintf('<span id="%s"> %s </span>', $post_id, ucfirst($status));
    }

    if ($column === 'pathao_delivery_fee') {
        $status = get_post_meta($post_id, 'ptc_delivery_fee', true);
        echo sprintf('<span id="ptc_delivery_fee-%s"> %s </span>', $post_id, ucfirst($status));
    }
}

function ptc_render_store_modal_button($post_id)
{
    $consignmentId = get_post_meta($post_id, 'ptc_consignment_id', true);

    $button = sprintf('<button class="ptc-open-modal-button" data-order-id="%s">%s</button>', $post_id, __('Send with Pathao', 'pathao_text_domain'));

    if ($consignmentId) {

        if ($consignmentId !== PTC_EMPTY_FLAG) {
            return sprintf('<a href="%s" class="order-view" target="_blank">
                                    %s
                              </a>',
                get_ptc_merchant_panel_base_url() . '/courier/orders/' . $consignmentId,
                $consignmentId
            );
        } else {
            return '---';
        }


    }

    return sprintf('<span class="ptc-assign-area">' . $button . '</span>', $post_id);
}

function render_form_group($label, $input, $formGroupClass = '')
{

    $id = strtolower(str_replace(' ', '-', $label));

    return sprintf('
        <div class="form-group %3$s">
            <label for="%1$s">
                %1$s:
            </label>
            <div class="form-input">
                %2$s
                <span id="%4$s" class="pt-field-error-message">error message</span>
            </div>
            
        </div>', $label, $input, $formGroupClass, "{$id}-error");
}


function ptc_render_store_modal_content()
{

    $nameForm = render_form_group('Name', '<input type="text" id="ptc_wc_order_name" name="name" value="">');
    $phoneForm = render_form_group('Phone', '<input type="text" id="ptc_wc_order_phone" name="phone" value="">');
    $SecondaryPhoneForm = render_form_group('Secondary Phone', '<input type="text" id="ptc_wc_order_secondary_phone" name="secondary_phone" value="">');

    $orderNumber = render_form_group('Order Number', '<input type="text" id="ptc_wc_order_number" name="order_number" value="" readonly>');
    $priceForm = render_form_group('Collectable Amount', '<input type="text" id="ptc_wc_order_price" name="ptc_wc_order_price">');
    $weightForm = render_form_group('Weight', '<input type="text" id="ptc_wc_order_weight" name="ptc_wc_order_weight" value="0.5">');
    $quantityForm = render_form_group('Quantity', '<input type="number" disabled id="ptc_wc_order_quantity" name="ptc_wc_order_quantity">');
    $addressForm = render_form_group('Address', '<textarea id="ptc_wc_shipping_address" name="address"></textarea>');

    $storeForm = render_form_group('Store', '<select id="store" required name="store"><option>Select store</option></select>');
    $citiesForm = render_form_group('City', '<select id="city" required name="city"><option>Select city</option></select>', 'ptc-field-hub-selection');
    $zoneForm = render_form_group('Zone', '<select id="zone" required name="zone"><option>Select zone</option></select>', 'ptc-field-hub-selection');
    $areaForm = render_form_group('Area', '<select id="area" name="area"><option>Select area</option></select>', 'ptc-field-hub-selection');

    $deliveryType = render_form_group('Delivery Type', '
            <select id="ptc_wc_delivery_type" name="ptc_wc_delivery_type">
                 <option value="48" selected>Normal Delivery</option>
                 <option value="12">On Demand</option>
                 <option value="24">Express Delivery</option>
            </select>
    ');

    $itemType = render_form_group('Item Type', '
            <select id="ptc_wc_item_type" name="ptc_wc_item_type">
                 <option value="2" selected>Parcel</option>
                 <option value="1">Document</option>
                 <option value="3">Fragile</option>
            </select>
    ');

    $itemDescription = render_form_group('Note', '<textarea id="ptc_wc_item_description" name="item_description"></textarea>');
    $specialInstruction = render_form_group('Special Instruction', '<textarea id="ptc_wc_special_instruction" name="special_instruction"></textarea>');


    echo
        '<div id="ptc-custom-modal" class="modal pt_hms_order_modal" style="display: none;">
      <div class="modal-content">
          <span class="close">&times;</span>
          <h2>Send this through Pathao Courier</h2>
          <hr>
          <?php if ($order): ?>
          
              <img src="'. PTC_PLUGIN_URL . 'assets/images/loading.gif'.'" id="ptc-loading-img" alt="Pathao Courier Logo" style="
                   height: 200px;
                   display: none; 
                   position: absolute;
                   left: 42%;
                   top: 50%;
               ">
               
              <div class="order-info">
                  <h3>Order Information</h3>
                  <p><strong>Total Price:</strong> <span id="ptc_wc_order_total_price"> </span> </p>
                  <p><strong>Payment Status:</strong> <span id="ptc_wc_order_payment_status"> </span> </p>
                  <h4>Order Items: <span id="ptc_wc_total_order_items"></span></h4>
                  <ul id="ptc_wc_order_items">
                  </ul>
              </div>
              <hr>
          <?php endif; ?>

          <!-- Preload Container -->
          <div id="ptc-single-preload-container" style="display: none; text-align: center; margin: 20px 0;">
            <p style="margin-bottom: 15px; font-size: 16px;">City, Zone, and Area data is missing. Please preload it to continue.</p>
            <button type="button" id="ptc-single-preload-btn" class="button button-primary button-large">
                <span class="dashicons dashicons-database-import" style="margin: 4px 5px 0 0;"></span>
                Preload City, Zone, Area & Store
            </button>
            
            <div id="ptc-single-preload-progress" style="display: none; margin-top: 20px; text-align: left;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                    <span id="ptc-single-preload-status">Starting...</span>
                    <span id="ptc-single-preload-percent">0%</span>
                </div>
                <div style="background: #f0f0f1; border-radius: 4px; height: 20px; overflow: hidden;">
                    <div id="ptc-single-preload-bar" style="background: #2271b1; height: 100%; width: 0%; transition: width 0.3s;"></div>
                </div>
            </div>
          </div>

          <div class="courier-settings">
            <div class="row">
                ' . $nameForm . '
                ' . $phoneForm . '
                ' . $SecondaryPhoneForm . '
            </div>
            <div class="row">
              <?= render_stores_dropdown(); ?>
              <?= render_item_type_dropdown(); ?>
              <?= render_order_type_dropdown(); ?>
            </div>
            <div class="row">
              ' . $orderNumber . '
              ' . $priceForm . '
              ' . $weightForm . '
              ' . $quantityForm . '
            </div>
            <div class="row">
            ' . $addressForm . '
            ' . $storeForm . '
            </div>

            <div class="row">
          
              ' . $citiesForm . '
              ' . $zoneForm . '
              ' . $areaForm . '
           </div>
            <div class="row">
              ' . $deliveryType . '
              ' . $itemType . '
              ' . $itemDescription . '
              ' . $specialInstruction . '
           </div>
          </div>
          <button id="ptc-submit-button" type="button">Send with Pathao Courier</button>
      </div>
  </div>';
}

add_action('admin_enqueue_scripts', 'ptc_render_store_modal_content');

function ptc_render_bulk_modal_content()
{
    echo
        '<div id="ptc-bulk-modal-overlay" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%;
            background: rgba(0,0,0,0.5); z-index: 10000;">
             <div class="ptc-modal-bulk-order">
             
                <img src="'. PTC_PLUGIN_URL . 'assets/images/courier-logo.svg'.'" 
                     alt="Pathao Courier Logo" 
                     style="height: 35px;">
                
                <h2 class="wp-heading-inline ">Send with Pathao</h2>
                <div id="hot-container" style="margin: 50px auto; max-width:960px;"></div>
                 <ul id="ptc-response-list"></ul>
                 <img src="'. PTC_PLUGIN_URL . 'assets/images/loading.gif'.'" id="ptc-loading-img"
                     alt="Pathao Courier Logo" 
                     style="height: 200px; display: none; ">

                 <!-- Preload Container -->
                 <div id="ptc-bulk-preload-container" style="display: none; text-align: center; margin: 40px 0;">
                    <p style="margin-bottom: 15px; font-size: 16px;">City, Zone, and Area data is missing. Please preload it to continue.</p>
                    <button type="button" id="ptc-bulk-preload-btn" class="button button-primary button-large">
                        <span class="dashicons dashicons-database-import" style="margin: 4px 5px 0 0;"></span>
                        Preload City, Zone, Area & Store
                    </button>
                    
                    <div id="ptc-bulk-preload-progress" style="display: none; margin-top: 20px; text-align: left;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                            <span id="ptc-bulk-preload-status">Starting...</span>
                            <span id="ptc-bulk-preload-percent">0%</span>
                        </div>
                        <div style="background: #f0f0f1; border-radius: 4px; height: 20px; overflow: hidden;">
                            <div id="ptc-bulk-preload-bar" style="background: #2271b1; height: 100%; width: 0%; transition: width 0.3s;"></div>
                        </div>
                    </div>
                 </div>

                 <div id="ptc-modal-footer" style="margin-top:15px; text-align:right;">
                    <button type="button" id="modal-cancel" class="button">Cancel</button>
                    <button type="button" id="modal-confirm" class="button button-primary">Confirm</button>
                </div>
            </div>
           
        </div>';
}

add_action('admin_enqueue_scripts', 'ptc_render_bulk_modal_content');
