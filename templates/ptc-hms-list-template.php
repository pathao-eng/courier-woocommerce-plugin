<?php

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
        <tr id="post-47" class="iedit author-self level-0 post-47 type-shop_order status-wc-processing post-password-required hentry">
            <th scope="row" class="check-column">			<input id="cb-select-47" type="checkbox" name="post[]" value="47">
                <label for="cb-select-47">
				<span class="screen-reader-text">
				Select Order – February 28, 2024 @ 09:26 AM				</span>
                </label>
                <div class="locked-indicator">
                    <span class="locked-indicator-icon" aria-hidden="true"></span>
                    <span class="screen-reader-text">
				“Order – February 28, 2024 @ 09:26 AM” is locked				</span>
                </div>
            </th><td class="order_number column-order_number has-row-actions column-primary" data-colname="Order"><a href="#" class="order-preview" data-order-id="47" title="Preview">Preview</a><a href="http://hermes-wp.local/wp-admin/post.php?post=47&amp;action=edit" class="order-view"><strong>#47 Sagar Dash</strong></a></td><td class="order_date column-order_date" data-colname="Date"><time datetime="2024-02-28T09:26:52+00:00" title="February 28, 2024 9:26 am">3 hours ago</time></td><td class="order_status column-order_status" data-colname="Status"><mark class="order-status status-processing tips"><span>Processing</span></mark></td><td class="billing_address column-billing_address hidden" data-colname="Billing">Sagar Dash, Pathao, 653, Gabtalla, Moghbazar, Dhaka, 1212<span class="description">via Cash on delivery</span></td><td class="shipping_address column-shipping_address hidden" data-colname="Ship to"><a target="_blank" href="https://maps.google.com/maps?&amp;q=653%2C%20Gabtalla%2C%20%2C%20Moghbazar%2C%20BD-13%2C%201212%2C%20BD&amp;z=16">Sagar Dash, Pathao, 653, Gabtalla, Moghbazar, Dhaka, 1212</a><span class="description">via Free shipping</span></td><td class="order_total column-order_total" data-colname="Total"><span class="tips"><span class="woocommerce-Price-amount amount"><span class="woocommerce-Price-currencySymbol">$</span>38.00</span></span></td><td class="wc_actions column-wc_actions hidden" data-colname="Actions"><p><a class="button wc-action-button wc-action-button-complete complete" href="http://hermes-wp.local/wp-admin/admin-ajax.php?action=woocommerce_mark_order_status&amp;status=completed&amp;order_id=47&amp;_wpnonce=9341383fc6" aria-label="Complete">Complete</a></p></td><td class="pathao column-pathao" data-colname="Pathao Courier"><span class="ptc-assign-area"><button class="ptc-open-modal-button" data-order-id="47">Send with Pathao</button></span></td><td class="pathao_status column-pathao_status" data-colname="Pathao Courier Status"><span id="47">  </span></td><td class="pathao_delivery_fee column-pathao_delivery_fee" data-colname="Pathao Courier Delivery Fee"><span id="ptc_delivery_fee-47">  </span></td>		</tr>
        <tr id="post-46" class="iedit author-self level-0 post-46 type-shop_order status-wc-processing post-password-required hentry">
            <th scope="row" class="check-column">			<input id="cb-select-46" type="checkbox" name="post[]" value="46">
                <label for="cb-select-46">
				<span class="screen-reader-text">
				Select Order – February 15, 2024 @ 07:38 PM				</span>
                </label>
                <div class="locked-indicator">
                    <span class="locked-indicator-icon" aria-hidden="true"></span>
                    <span class="screen-reader-text">
				“Order – February 15, 2024 @ 07:38 PM” is locked				</span>
                </div>
            </th><td class="order_number column-order_number has-row-actions column-primary" data-colname="Order"><a href="#" class="order-preview" data-order-id="46" title="Preview">Preview</a><a href="http://hermes-wp.local/wp-admin/post.php?post=46&amp;action=edit" class="order-view"><strong>#46 Sagar Dash</strong></a></td><td class="order_date column-order_date" data-colname="Date"><time datetime="2024-02-15T19:38:06+00:00" title="February 15, 2024 7:38 pm">Feb 15, 2024</time></td><td class="order_status column-order_status" data-colname="Status"><mark class="order-status status-processing tips"><span>Processing</span></mark></td><td class="billing_address column-billing_address hidden" data-colname="Billing">Sagar Dash, Pathao, 653, Gabtalla, Moghbazar, Dhaka, 1212<span class="description">via Cash on delivery</span></td><td class="shipping_address column-shipping_address hidden" data-colname="Ship to"><a target="_blank" href="https://maps.google.com/maps?&amp;q=653%2C%20Gabtalla%2C%20%2C%20Moghbazar%2C%20BD-13%2C%201212%2C%20BD&amp;z=16">Sagar Dash, Pathao, 653, Gabtalla, Moghbazar, Dhaka, 1212</a><span class="description">via Free shipping</span></td><td class="order_total column-order_total" data-colname="Total"><span class="tips"><span class="woocommerce-Price-amount amount"><span class="woocommerce-Price-currencySymbol">$</span>43.00</span></span></td><td class="wc_actions column-wc_actions hidden" data-colname="Actions"><p><a class="button wc-action-button wc-action-button-complete complete" href="http://hermes-wp.local/wp-admin/admin-ajax.php?action=woocommerce_mark_order_status&amp;status=completed&amp;order_id=46&amp;_wpnonce=9341383fc6" aria-label="Complete">Complete</a></p></td><td class="pathao column-pathao" data-colname="Pathao Courier"><pre> DS150224Y356TQ </pre></td><td class="pathao_status column-pathao_status" data-colname="Pathao Courier Status"><span id="46"> Pending </span></td><td class="pathao_delivery_fee column-pathao_delivery_fee" data-colname="Pathao Courier Delivery Fee"><span id="ptc_delivery_fee-46"> 145 </span></td>		</tr>
        <tr id="post-33" class="iedit author-self level-0 post-33 type-shop_order status-wc-processing post-password-required hentry">
            <th scope="row" class="check-column">			<input id="cb-select-33" type="checkbox" name="post[]" value="33">
                <label for="cb-select-33">
				<span class="screen-reader-text">
				Select Order – September 17, 2023 @ 07:50 AM				</span>
                </label>
                <div class="locked-indicator">
                    <span class="locked-indicator-icon" aria-hidden="true"></span>
                    <span class="screen-reader-text">
				“Order – September 17, 2023 @ 07:50 AM” is locked				</span>
                </div>
            </th><td class="order_number column-order_number has-row-actions column-primary" data-colname="Order"><a href="#" class="order-preview" data-order-id="33" title="Preview">Preview</a><a href="http://hermes-wp.local/wp-admin/post.php?post=33&amp;action=edit" class="order-view"><strong>#33 Sagar Dash</strong></a></td><td class="order_date column-order_date" data-colname="Date"><time datetime="2023-09-17T07:50:24+00:00" title="September 17, 2023 7:50 am">Sep 17, 2023</time></td><td class="order_status column-order_status" data-colname="Status"><mark class="order-status status-processing tips"><span>Processing</span></mark></td><td class="billing_address column-billing_address hidden" data-colname="Billing">Sagar Dash, Pathao, Dhaka, Dhaka, Dhaka, 1212<span class="description">via Cash on delivery</span></td><td class="shipping_address column-shipping_address hidden" data-colname="Ship to"><a target="_blank" href="https://maps.google.com/maps?&amp;q=Dhaka%2C%20%2C%20Dhaka%2C%20BD-13%2C%201212%2C%20BD&amp;z=16">Sagar Dash, Pathao, Dhaka, Dhaka, Dhaka, 1212</a><span class="description">via Free shipping</span></td><td class="order_total column-order_total" data-colname="Total"><span class="tips"><span class="woocommerce-Price-amount amount"><span class="woocommerce-Price-currencySymbol">$</span>100.00</span></span></td><td class="wc_actions column-wc_actions hidden" data-colname="Actions"><p><a class="button wc-action-button wc-action-button-complete complete" href="http://hermes-wp.local/wp-admin/admin-ajax.php?action=woocommerce_mark_order_status&amp;status=completed&amp;order_id=33&amp;_wpnonce=9341383fc6" aria-label="Complete">Complete</a></p></td><td class="pathao column-pathao" data-colname="Pathao Courier"><pre> DO211123BXPVDM </pre></td><td class="pathao_status column-pathao_status" data-colname="Pathao Courier Status"><span id="33"> Pending </span></td><td class="pathao_delivery_fee column-pathao_delivery_fee" data-colname="Pathao Courier Delivery Fee"><span id="ptc_delivery_fee-33"> 130 </span></td>		</tr>
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
