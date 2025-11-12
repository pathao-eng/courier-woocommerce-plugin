jQuery(document).ready(function ($) {

    let hotInstance;
    const list = $("#ptc-response-list");
    const loading = $("#ptc-loading-img");
    const modal = $("#ptc-bulk-modal-overlay");

    function createBulkOrder(orders) {
        loading.fadeIn()
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
                loading.fadeOut()
                const message = response.message
                list.empty();
                list.append(`<li style='color: #00a32a'>${message}</li>`)


                setTimeout(() => {
                    hotInstance?.destroy();
                    $('#ptc-bulk-modal-overlay').fadeOut();
                    location.reload();
                }, 2000);
            },
            error: function (xhr, status, errorThrown) {
                loading.fadeOut()
                const res = xhr.responseJSON || {};
                const errors = res.data?.errors || res.errors || {};
                list.empty();

                // Show each error in the UL
                Object.entries(errors).forEach(([path, msgs]) => {
                    const msg = Array.isArray(msgs) ? msgs.join(", ") : String(msgs);
                    list.append(`<li style="color:#d33">${msg}</li>`);
                });

                if (!Object.keys(errors).length) {
                    list.append(`<li style="color:#d33">Unexpected error: ${errText || 'Unknown'}</li>`);
                }
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

    function getCities() {
        return new Promise((resolve, reject) => {
            $.post(ajaxurl, {action: 'get_cities'})
                .done(response => {
                    const cities = response?.data.map(city => ({
                        id: city?.city_id,
                        name: city?.city_name
                    }));
                    resolve(cities);
                })
                .fail(err => reject(err));
        });
    }

    function getZones(cityId) {
        return new Promise((resolve, reject) => {
            $.post(
                ajaxurl,
                {
                    action: 'get_zones',
                    city_id: cityId
                }
            )
                .done(response => {
                    const zones = response?.data?.data?.data?.map(zone => ({
                        id: zone?.zone_id,
                        name: zone?.zone_name
                    }));
                    resolve(zones);
                })
                .fail(err => reject(err));
        });
    }

    function getAreas(zoneId) {
        return new Promise((resolve, reject) => {
            $.post(
                ajaxurl,
                {
                    action: 'get_areas',
                    zone_id: zoneId
                }
            )
                .done(response => {
                    const areas = response?.data?.data?.data?.map(area => ({
                        id: area?.area_id,
                        name: area?.area_name
                    }));
                    resolve(areas);
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
    let cityWithID = {}
    let deliveryTypesWithID = {}
    let itemTypesWithID = {}

    async function renderHandsontable(selectedOrders) {
        const container = document.getElementById('hot-container');

        stores = (await getStores());
        const storesOnlyNames = stores?.map((item) => {
            storesWithID[item.name] = item.id
            return item.name
        })

        cities = (await getCities());
        const citiesOnlyNames = cities?.map((item) => {
            const name = item.name.trim().toLowerCase()
            cityWithID[name] = item
            cityWithID[name].zoneWithID = {}

            cityWithID[name].zones = []
            return name
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
                {
                    data: 'recipient_city',
                    type: 'dropdown',
                    source: citiesOnlyNames,
                    optionLabel: 'name',
                    value: 'id',
                    allowInvalid: false,
                    filter: true,
                    validator: async function(value, callback) {
                        if (this.instance?.isEmptyRow(this.row)) {
                            callback(true);
                            return;
                        }

                        if (!value){
                            callback(true)
                            return;
                        }

                        value = value.trim().toLowerCase()

                        const city = citiesOnlyNames.find(name => name === value ? value : '');

                        if (!city) {
                            callback(false)
                            return
                        }
                        callback(true)

                        const cityDetails = cityWithID[value];

                        cityWithID[value].zones = (await getZones(cityDetails.id))?.map((item) => {
                            const name = item.name.trim().toLowerCase()
                            cityWithID[value].zoneWithID[name] = item
                            cityWithID[value].zoneWithID[name].areaWithID = {}
                            cityWithID[value].zoneWithID[name].areas = []
                            return item.name.trim().toLowerCase()
                        })

                        this.instance.setCellMeta(this.row, 5, 'source', cityWithID[value].zones);
                    },
                },
                {
                    data: 'recipient_zone',
                    type: 'dropdown',
                    source: [],
                    optionLabel: 'name',
                    value: 'id',
                    allowInvalid: false,
                    filter: true,
                    validator: async function(value, callback) {
                        if (this.instance?.isEmptyRow(this.row)) {
                            callback(true);
                            return;
                        }

                        if (!value){
                            callback(true)
                            return;
                        }

                        value = value.trim().toLowerCase()

                        const cityValue = this.instance.getDataAtCell(this.row, 4)?.trim()?.toLowerCase()
                        const zone = await cityWithID[cityValue].zones.find(name => name === value ? value : '');
                        if (!zone) {
                            callback(false)
                            return
                        }
                        callback(true)

                        const zoneDetails = cityWithID[cityValue].zoneWithID[value]

                        cityWithID[cityValue].zoneWithID[value].areas = (await getAreas(zoneDetails.id))?.map((item) => {
                            const name = item.name.trim().toLowerCase()
                            cityWithID[cityValue].zoneWithID[value].areaWithID = item
                            return name
                        })

                        this.instance.setCellMeta(this.row, 6, 'source', cityWithID[cityValue].zoneWithID[value].areas);

                    },
                },
                {
                    data: 'recipient_area',
                    type: 'dropdown',
                    source: [],
                    optionLabel: 'name',
                    value: 'id',
                    allowInvalid: true,
                    filter: true,
                    validator: async function(value, callback) {
                        if (this.instance?.isEmptyRow(this.row)) {
                            callback(true);
                            return;
                        }

                        if (!value){
                            callback(true)
                            return;
                        }

                        value = value.trim().toLowerCase()

                        const cityValue = this.instance.getDataAtCell(this.row, 4)?.trim()?.toLowerCase()
                        const zoneValue = this.instance.getDataAtCell(this.row, 5)?.trim()?.toLowerCase()
                        const area = await cityWithID[cityValue].zoneWithID[zoneValue].areas.find(name => name === value ? value : '');
                        if (!area) {
                            callback(false)
                            return
                        }
                        callback(true)

                    },
                },
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
                'Recipient City',
                'Recipient Zone',
                'Recipient Area',
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
        list.empty();
        openModal()
    });

    form.on('click', 'input[type="submit"][name="bulk_action"], button[type="submit"][name="bulk_action"]', function(e) {

            const action = $('select[name="action"]').val() || $('select[name="action2"]').val();

            if (action === 'send_with_pathao') {
                e.preventDefault();
                list.empty();

                openModal()
            }
        });


        async function openModal() {

            loading.fadeIn()

            const selectedOrders = $('input[name="id[]"]:checked')
                .map(function () {
                    return $(this).val();
                })
                .get();

            if (selectedOrders.length === 0) {
                alert('Please select at least one order.');
                return;
            }

            modal.fadeIn();

            await renderHandsontable(selectedOrders)

            loading.fadeOut()

            $('#modal-confirm').off('click').on('click', async function () {
                const data = hotInstance?.getSourceData().map(item => {

                    item.store_id = storesWithID[item.store_id]
                    item.delivery_type = deliveryTypesWithID[item.delivery_type]
                    item.item_type = itemTypesWithID[item.item_type]

                    return item
                });

                await createBulkOrder(data);
            });

            $('#modal-cancel').off('click').on('click', function () {
                hotInstance?.destroy();
                list.empty();
                modal.fadeOut();
            });
        }

});
