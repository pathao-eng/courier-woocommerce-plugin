jQuery(document).ready(function ($) {

    let hotInstance;
    function createBulkOrder(orders) {
        return $.post({
            url: ajaxurl,
            headers: {
                'X-WPTC-Nonce': ptcSettings.nonce
            },
            data: {
                action: "create_bulk_order_to_ptc",
                orders: orders
            },
            success: function (response) {
                console.log(response.data)
            },
            error: function (response) {
                console.log(response.data)
            }
        });
    }

    function getStores() {
        return new Promise((resolve, reject) => {
            $.post(ajaxurl, {action: 'get_stores'})
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

    function getOrders(orderIds) {
        return new Promise((resolve, reject) => {
            $.post(ajaxurl, {
                action: 'get_wc_order_bulk',
                order_id: orderIds
            })
                .done(response => {
                    const orders = response?.data;
                    resolve(orders);
                })
                .fail(err => reject(err));
        });
    }

    function getDeliveryTypes() {
        return [
            {id: 48, name: "Normal Delivery", selected: true},
            {id: 12, name: "On Demand", selected: false},
            {id: 24, name: "Express Delivery", selected: false}
        ];
    }

    function populateBulkModalData(data, stores, deliveryTypes, itemTypes) {


        let defaultStore = ''

        if (stores.length) {
            defaultStore = stores.find(store => store.is_default_store)?.name || stores[0]?.name
        }

        let defaultDeliveryType = deliveryTypes[0].name
        let defaultItemType = itemTypes[0].name

        let address = '';
        if (data?.shipping?.address_1 && data?.shipping?.address_2) {
            address = `${data?.shipping?.address_1}, ${data?.shipping?.address_2}, ${data?.shipping?.city}, ${data?.shipping?.state}, ${data?.shipping?.postcode}`;
        } else {
            address = `${data?.billing?.address_1}, ${data?.billing?.address_2}, ${data?.billing?.city}, ${data?.billing?.state}, ${data?.billing?.postcode}`;
        }

        return {
            merchant_order_id: data.id,
            recipient_name: data?.billing?.full_name,
            recipient_phone: data?.billing?.phone,
            recipient_secondary_phone: '',
            recipient_address: address,
            amount_to_collect: data.total,
            item_description: '',
            special_instruction: '',
            store_id: defaultStore,
            delivery_type: defaultDeliveryType,
            item_type: defaultItemType,
            item_quantity: data?.items.length,
            item_weight: 0.5
        }

    }

    function getItemTypes() {
        return [
            {id: 2, name: "Parcel"},
            {id: 1, name: "Document", selected: false},
            {id: 3, name: "Fragile", selected: false}
        ];
    }

    let stores = [];
    let deliveryTypes = [];
    let itemTypes = [];
    let storesWithID = {}
    let deliveryTypesWithID = {}
    let itemTypesWithID = {}

    async function renderHandsontable(selectedOrders) {
        const container = document.getElementById('hot-container');

        stores = (await getStores());
        const storesOnlyNames = stores?.map((item) => {
            storesWithID[item.name] = item.id
            return item.name
        })

        deliveryTypes = getDeliveryTypes();
        const deliveryTypesOnlyNames = deliveryTypes.map((item) => {
            deliveryTypesWithID[item.name] = item.id
            return item.name
        })

        itemTypes = getItemTypes();
        const itemTypesOnlyNames = itemTypes.map((item) => {
            itemTypesWithID[item.name] = item.id
            return item.name
        })

        const data = (await getOrders(selectedOrders.join(',')))?.map(order => populateBulkModalData(order, stores, deliveryTypes, itemTypes));

        hotInstance = new Handsontable(container, {
            data: data,
            columns: [
                {data: 'merchant_order_id', readOnly: true},
                {data: 'recipient_name', type: 'text'},
                {data: 'recipient_phone', type: 'text'},
                {data: 'recipient_secondary_phone', type: 'text'},
                {data: 'recipient_address', type: 'text'},
                {data: 'amount_to_collect', type: 'numeric'},
                {data: 'item_description', type: 'text'},
                {data: 'special_instruction', type: 'text'},
                {
                    data: 'store_id',
                    type: 'dropdown',
                    source: storesOnlyNames,
                    optionLabel: 'name',
                    value: 'id',
                    allowInvalid: true,
                    strict: true,
                },
                {
                    data: 'delivery_type',
                    type: 'dropdown',
                    source: deliveryTypesOnlyNames,
                    optionLabel: 'name',
                    value: 'id',
                    allowInvalid: true,
                    strict: true,
                },
                {
                    data: 'item_type',
                    type: 'dropdown',
                    source: itemTypesOnlyNames,
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

    $(document).on('click', '#ptc-bulk-modal-overlay', function (e) {
        if (e.target === this) {
            $(this).fadeOut();
            hotInstance?.destroy();
        }
    });

    $(document).on('click', '#post-send_with_pathao_bulk', function (e) {
        e.preventDefault();
        openModal()
    });

    form.on('click', 'input[type="submit"][name="bulk_action"], button[type="submit"][name="bulk_action"]', function(e) {

            const action = $('select[name="action"]').val() || $('select[name="action2"]').val();

            if (action === 'send_with_pathao') {
                e.preventDefault();

                openModal()
            }
        });


        async function openModal() {

            $('#ptc-loading-img').fadeIn()

            const selectedOrders = $('input[name="id[]"]:checked')
                .map(function () {
                    return $(this).val();
                })
                .get();

            if (selectedOrders.length === 0) {
                alert('Please select at least one order.');
                return;
            }

            $('#ptc-bulk-modal-overlay').fadeIn();

            await renderHandsontable(selectedOrders)

            $("#ptc-loading-img").fadeOut()

            $('#modal-confirm').off('click').on('click', async function () {
                const data = hotInstance?.getSourceData().map(item => {

                    item.store_id = storesWithID[item.store_id]
                    item.delivery_type = deliveryTypesWithID[item.delivery_type]
                    item.item_type = itemTypesWithID[item.item_type]

                    return item
                });

                await createBulkOrder(data);
                hotInstance?.destroy();
                $('#ptc-bulk-modal-overlay').fadeOut();
            });

            $('#modal-cancel').off('click').on('click', function () {
                hotInstance?.destroy();
                $('#ptc-bulk-modal-overlay').fadeOut();
            });
        }

});
