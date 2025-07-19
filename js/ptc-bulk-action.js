jQuery(document).ready(function($) {
    const form = $('#wc-orders-filter');

    $('body').append(`
        <div id="custom-modal-overlay" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%;
            background: rgba(0,0,0,0.5); z-index: 10000;">
            <div id="custom-modal" class="ptc-modal-bulk-order">
                <h2 class="wp-heading-inline ">Send with Pathao</h2>
                <div style="overflow-x:auto;">
                    <table class="wp-list-table widefat fixed striped " id="order-edit-table">
                        <thead>
                            <tr>
                                <th>Order ID</th>
                                <th>Recipient Name</th>
                                <th>Recipient Phone</th>
                                <th>Recipient Secondary Phone</th>
                                <th>Address</th>
                                <th>Collectable Amount</th>
                                <th>Note</th>
                                <th>Special Instruction</th>
                                <th>Store</th>
                                <th>Delivery Type</th>
                                <th>Item Type</th>
                                <th>Quantity</th>
                                <th>Weight</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody></tbody>
                    </table>
                </div>
                <div style="margin-top:15px; text-align:right;">
                    <button type="button" id="modal-cancel" class="button">Cancel</button>
                    <button type="button" id="modal-confirm" class="button button-primary">Confirm</button>
                </div>
            </div>
        </div>
    `);

    form.on('submit', function(e) {
        const action = $('select[name="action"]').val() || $('select[name="action2"]').val();

        if (action === 'send_with_pathao') {
            e.preventDefault();

            const selectedOrders = $('input[name="id[]"]:checked')
                .map(function() { return $(this).val(); })
                .get();

            if (selectedOrders.length === 0) {
                alert('Please select at least one order.');
                return;
            }

            const tbody = $('#order-edit-table tbody');
            tbody.empty();

            tbody.append(`
                    <tr>
                        <td>--</td>
                        <td>--</td>
                        <td>--</td>
                        <td>--</td>
                        <td>--</td>
                        <td>--</td>
                        <td><input type="text" name="default_item_description" value=""></td>
                        <td><input type="text" name="default_special_instruction" value=""></td>
                        <td>
                            <select name="default_store_id">
                                <option value="">-- Select --</option>
                                <option value="48">Pathao Regular</option>
                            </select>
                        </td>
                        <td>
                            <select name="default_delivery_type">
                                <option value="">-- Select --</option>
                            </select>
                        </td>
                        <td>
                            <select name="default_item_type">
                                <option value="">-- Select --</option>
                            </select>
                        </td>
                        <td><input type="number" value="0" name="default_item_quantity"></td>
                        <td><input type="number" value="0"   name="default_item_weight"></td>
                        <td><button type="button" id="ptc-apply-btn" class="button button-primary ptc-item-btn">Apply for all</button></td>
                    </tr>
                `);

            // Populate rows (placeholder editable fields)
            selectedOrders.forEach(id => {
                tbody.append(`
                    <tr>
                        <td>${id}<input type="hidden" name="edited_orders[${id}][order_id]" value="${id}"></td>
                        <td><input type="text" name="edited_orders[${id}][recipient_name]" value=""></td>
                        <td><input type="text" name="edited_orders[${id}][recipient_phone]" value=""></td>
                        <td><input type="text" name="edited_orders[${id}][recipient_secondary_phone]" value=""></td>
                        <td><input type="text" name="edited_orders[${id}][recipient_address]" value=""></td>
                        <td><input type="text" name="edited_orders[${id}][amount_to_collect]" value=""></td>
                        <td><input type="text" name="edited_orders[${id}][item_description]" value=""></td>
                        <td><input type="text" name="edited_orders[${id}][special_instruction]" value=""></td>
                        <td>
                            <select name="edited_orders[${id}][store_id]">
                                <option value="48">Pathao Regular</option>
                            </select>
                        </td>
                        <td>
                            <select name="edited_orders[${id}][delivery_type]">
                                <option value="48" selected>Pathao Regular</option>
                                <option value="49">Pathao Express</option>
                            </select>
                        </td>
                        <td>
                            <select name="edited_orders[${id}][item_type]">
                                <option value="48" selected>Pathao Regular</option>
                                <option value="49">Pathao Express</option>
                            </select>
                        </td>
                        <td><input type="number" value="0" name="edited_orders[${id}][item_quantity]" value=""></td>
                        <td><input type="number" value="0.5"   name="edited_orders[${id}][item_weight]" value=""></td>
                        <td><button type="button" id="ptc-apply-btn" class="button button-danger ptc-item-btn">❌</button></td>
                    </tr>
                `);
            });

            $('#custom-modal-overlay').fadeIn();

            $('#modal-confirm').off('click').on('click', function() {
                $('#custom-modal-overlay').fadeOut();
                form.off('submit').submit();
            });

            $('#modal-cancel').off('click').on('click', function() {
                $('#custom-modal-overlay').fadeOut();
            });
        }
    });
});
