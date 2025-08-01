jQuery(document).ready(function($) {

    let hotInstance;

    function getStores() {
        return new Promise((resolve, reject) => {
            $.post(ajaxurl, { action: 'get_stores' })
                .done(response => {
                    const stores = response?.data.map(store => ({
                        id: store.store_id,
                        name: store.store_name,
                        is_default_store: store.is_default_store,
                        is_active: store.is_active,
                        selected: store.is_default_store
                    }));
                    resolve(stores);
                })
                .fail(err => reject(err));
        });
    }

    function getDeliveryTypes() {
        return [
            { id: "48", name: "Normal Delivery", selected: true },
            { id: "12", name: "On Demand", selected: false },
            { id: "24", name: "Express Delivery", selected: false }
        ];
    }

    function getItemTypes() {
        return [
            { id: "2", name: "Parcel"},
            { id: "1", name: "Document", selected: false },
            { id: "3", name: "Fragile", selected: false }
        ];
    }

    async function renderHandsontable(selectedOrders) {
        const container = document.getElementById('hot-container');

        const data = selectedOrders.map(orderId => ({
            order_id: orderId,
            recipient_name: '',
            recipient_phone: '',
            // delivery_type: '48',
            amount_to_collect: 100,
        }));

        const stores = (await getStores())?.map((item) => {
            return item.name
        });
        const deliveryTypes = getDeliveryTypes().map((item) => {
            return item.name
        });
        const itemTypes = getItemTypes().map((item) => {
            return item.name
        });

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
                    source: stores,
                    optionLabel: 'name',
                    value: 'id',
                    allowInvalid: true,
                    strict: true,
                },
                {
                    data: 'delivery_type',
                    type: 'dropdown',
                    source: deliveryTypes,
                    optionLabel: 'name',
                    value: 'id',
                    allowInvalid: true,
                    strict: true,
                },
                {
                    data: 'item_type',
                    type: 'dropdown',
                    source: itemTypes,
                    optionLabel: 'name',
                    value: 'id',
                    allowInvalid: true,
                    strict: true,
                },
                {
                    data: 'item_quantity',
                    type: 'numeric'
                },
                {
                    data: 'item_weight',
                    type: 'numeric',
                },
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
        <div id="ptc-bulk-modal-overlay" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%;
            background: rgba(0,0,0,0.5); z-index: 10000;">
             <div class="ptc-modal-bulk-order">
                <h2 class="wp-heading-inline ">Send with Pathao</h2>
                <div id="hot-container" style="margin: 50px auto; max-width:960px;"></div>
            </div>
        </div>
    `);

    $(document).on('click', '#ptc-bulk-modal-overlay', function (e) {
        if (e.target === this) {
            $(this).fadeOut();
            hotInstance?.destroy();
        }
    });

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

            $('#ptc-bulk-modal-overlay').fadeIn();

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
