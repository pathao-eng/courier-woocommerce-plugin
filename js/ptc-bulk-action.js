jQuery(document).ready(function($) {

    let hotInstance;

    function renderHandsontable(selectedOrders) {
        const container = document.getElementById('hot-container');

        const data = selectedOrders.map(orderId => ({
            order_id: orderId,
            recipient_name: '',
            recipient_phone: '',
            delivery_type: '48',
            amount_to_collect: 100,
        }));

        hotInstance = new Handsontable(container, {
            data: data,
            columns: [
                { data: 'order_id', readOnly: true },
                { data: 'recipient_name', type: 'text' },
                { data: 'recipient_phone', type: 'text' },
                { data: 'recipient_secondary_phone', type: 'text' },
                { data: 'recipient_address', type: 'text' },
                { data: 'amount_to_collect', type: 'numeric' },
                { data: 'item_description', type: 'text' },
                { data: 'special_instruction', type: 'text' },
                {
                    data: 'store_id',
                    type: 'dropdown',
                    source: [
                        {
                            id: 1,
                            name: "store 1"
                        }
                    ],
                    optionLabel: 'name',
                    value: 'id',
                    allowInvalid: true,
                    strict: true,
                },
                {
                    data: 'delivery_type',
                    type: 'dropdown',
                    source: [
                        {
                            id: 48,
                            name: "normal"
                        }
                    ],
                    optionLabel: 'name',
                    value: 'id',
                    allowInvalid: true,
                    strict: true,
                },
                {
                    data: 'item_type',
                    type: 'dropdown',
                    source: [
                        {
                            id: 2,
                            name: "parcel"
                        },
                        {
                            id: 3,
                            name: "document"
                        }
                    ],
                    optionLabel: 'name',
                    value: 'id',
                    allowInvalid: true,
                    strict: true,
                },
                { data: 'item_quantity', type: 'numeric' },
                { data: 'item_weight', type: 'numeric' },
            ],
            colHeaders: [
                'Order ID',
                'Recipient Name',
                'Recipient Phone',
                'Recipient Secondary Phone',
                'Address',
                'Collectable Amount',
                'Note',
                'Special Instruction',
                'Store',
                'Delivery Type',
                'Item Type',
                'Quantity',
                'Weight',
            ],
            rowHeaders: true,
            width: '100%',
            height: 300,
            stretchH: 'all',
            licenseKey: 'non-commercial-and-evaluation'
        });
    }

    const form = $('#wc-orders-filter');

    $('body').append(`
        <div id="custom-modal-overlay" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%;
            background: rgba(0,0,0,0.5); z-index: 10000;">
             <div class="ptc-modal-bulk-order">
                <h2 class="wp-heading-inline ">Send with Pathao</h2>
                <div id="hot-container" style="margin: 50px auto; max-width:960px;"></div>
            </div>
        </div>
    `);


    form.on('click', 'input[type="submit"][name="bulk_action"], button[type="submit"][name="bulk_action"]', function(e) {

        console.log('Apply button clicked!');
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

            renderHandsontable(selectedOrders)

            $('#custom-modal-overlay').fadeIn();

            $('#modal-confirm').off('click').on('click', function() {
                $('#custom-modal-overlay').fadeOut();
                form.off('submit').submit();
            });

            $('#modal-cancel').off('click').on('click', function() {
                $('#custom-modal-overlay').fadeOut();
            });
        }
        submitter = null;
    });
});
