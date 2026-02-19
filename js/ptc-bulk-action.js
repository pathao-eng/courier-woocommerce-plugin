jQuery(document).ready(function ($) {

    let hotInstance;
    const list = $("#ptc-response-list");
    const loading = $("#ptc-bulk-loading-img");
    const modal = $("#ptc-bulk-modal-overlay");

    function createBulkOrder(orders) {
        $('#modal-confirm').prop('disabled', true);
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

                $('#modal-confirm').prop('disabled', false);
            }
        });
    }

    // Preload Button Handler in Bulk Modal
    $('#ptc-bulk-preload-btn').on('click', async function () {
        const $btn = $(this);
        const $progressContainer = $('#ptc-bulk-preload-progress');
        const $bar = $('#ptc-bulk-preload-bar');
        const $status = $('#ptc-bulk-preload-status');
        const $percent = $('#ptc-bulk-preload-percent');

        $btn.prop('disabled', true);
        $progressContainer.show();
        $bar.css('width', '0%');
        $status.text('Starting...');
        $percent.text('0%');

        try {
            await LocationDataManager.fetchAllWithProgress((current, total, message) => {
                const percentage = Math.round((current / total) * 100);
                $bar.css('width', `${percentage}%`);
                $status.text(message);
                $percent.text(`${percentage}%`);
            });

            // Complete
            $('#ptc-bulk-preload-container').hide();
            $('#hot-container').show();
            $('#ptc-modal-footer').show();

            // Resume normal flow
            const selectedOrders = getSelectedOrders();
            await renderHandsontable(selectedOrders);

        } catch (e) {
            console.error(e);
            $status.text('Error occurred. Please try again.');
            $bar.css('background', '#d63638');
            $btn.prop('disabled', false);
        }
    });

    function getOrders(orderIds) {
        loading.show();
        $('#modal-confirm').prop('disabled', true);
        return new Promise((resolve, reject) => {
            $.post(ajaxurl, {
                action: 'get_wc_order_bulk',
                order_id: orderIds
            })
                .done(response => {
                    const orders = response?.data;
                    resolve(orders);
                    loading.hide();
                    $('#modal-confirm').prop('disabled', false);
                })
                .fail(err => reject(err));
        });
    }

    function getDeliveryTypes() {
        return [
            { id: 48, name: "Normal Delivery", selected: true },
            { id: 12, name: "On Demand", selected: false },
            { id: 24, name: "Express Delivery", selected: false }
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
            recipient_city: null,
            recipient_zone: null,
            recipient_area: null,
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
            { id: 2, name: "Parcel" },
            { id: 1, name: "Document", selected: false },
            { id: 3, name: "Fragile", selected: false }
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

        const [storesData, citiesData] = await Promise.all([
            LocationDataManager.getStores(),
            LocationDataManager.getCities()
        ]);

        stores = storesData;
        const storesOnlyNames = stores?.map((item) => {
            storesWithID[item.name] = item.id
            return item.name
        })

        const cities = citiesData;
        const citiesOnlyNames = cities?.map((item) => {
            const name = LocationDataManager.normalize(item.name);
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

        const orderBulkDetails = await getOrders(selectedOrders.join(','))
        const data = (orderBulkDetails)?.map(order => populateBulkModalData(order, stores, deliveryTypes, itemTypes));

        hotInstance = new Handsontable(container, {
            data: data,
            columns: [
                { data: 'merchant_order_id', readOnly: true },
                { data: 'recipient_name', type: 'text' },
                { data: 'recipient_phone', type: 'text' },
                { data: 'recipient_secondary_phone', type: 'text' },
                {
                    data: 'recipient_city',
                    type: 'dropdown',
                    source: citiesOnlyNames,
                    optionLabel: 'name',
                    value: 'id',
                    allowInvalid: false,
                    filter: true,
                    validator: async function (value, callback) {
                        if (this.instance?.isEmptyRow(this.row)) {
                            callback(true);
                            return;
                        }

                        if (!value) {
                            callback(true)
                            return;
                        }

                        value = LocationDataManager.normalize(value);

                        const city = citiesOnlyNames.find(name => name === value ? value : '');

                        if (!city) {
                            callback(false)
                            return
                        }
                        callback(true)

                        const cityDetails = cityWithID[value];

                        // Fetch zones using LocationDataManager
                        const zones = await LocationDataManager.getZones(cityDetails.id);

                        cityWithID[value].zones = zones.map((item) => {
                            const name = LocationDataManager.normalize(item.name);
                            cityWithID[value].zoneWithID[name] = item
                            cityWithID[value].zoneWithID[name].areaWithID = {}
                            cityWithID[value].zoneWithID[name].areas = []
                            return name;
                        });

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
                    validator: async function (value, callback) {
                        if (this.instance?.isEmptyRow(this.row)) {
                            callback(true);
                            return;
                        }

                        if (!value) {
                            callback(true)
                            return;
                        }

                        value = LocationDataManager.normalize(value);

                        const cityValue = LocationDataManager.normalize(this.instance.getDataAtCell(this.row, 4));

                        // Ensure zones are loaded for this city
                        if (!cityWithID[cityValue] || !cityWithID[cityValue].zones) {
                            callback(false);
                            return;
                        }

                        const zone = cityWithID[cityValue].zones.find(name => name === value ? value : '');
                        if (!zone) {
                            callback(false)
                            return
                        }
                        callback(true)

                        const zoneDetails = cityWithID[cityValue].zoneWithID[value]

                        // Fetch areas using LocationDataManager
                        const areas = await LocationDataManager.getAreas(zoneDetails.id);

                        cityWithID[cityValue].zoneWithID[value].areas = areas.map((item) => {
                            const name = LocationDataManager.normalize(item.name);
                            cityWithID[cityValue].zoneWithID[value].areaWithID[name] = item
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
                    validator: async function (value, callback) {
                        if (this.instance?.isEmptyRow(this.row)) {
                            callback(true);
                            return;
                        }

                        if (!value) {
                            callback(true)
                            return;
                        }

                        value = LocationDataManager.normalize(value);

                        const cityValue = LocationDataManager.normalize(this.instance.getDataAtCell(this.row, 4));
                        const zoneValue = LocationDataManager.normalize(this.instance.getDataAtCell(this.row, 5));

                        if (!cityWithID[cityValue] ||
                            !cityWithID[cityValue].zoneWithID[zoneValue] ||
                            !cityWithID[cityValue].zoneWithID[zoneValue].areas) {
                            callback(false);
                            return;
                        }

                        const area = cityWithID[cityValue].zoneWithID[zoneValue].areas.find(name => name === value ? value : '');
                        if (!area) {
                            callback(false)
                            return
                        }
                        callback(true)

                    },
                },
                { data: 'recipient_address', type: 'text' },
                { data: 'amount_to_collect', type: 'numeric' },
                { data: 'item_description', type: 'text' },
                { data: 'special_instruction', type: 'text' },
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

        await prefillOrderLocations(hotInstance, orderBulkDetails, cities);
    }

    async function prefillOrderLocations(hotInstance, orderBulkDetails, cities) {
        const rows = hotInstance.getData();
        for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
            const orderId = hotInstance.getDataAtCell(rowIndex, 0);
            const orderDetails = orderBulkDetails.find((item) => item.id === orderId);

            let defaultCityId = orderDetails?.shipping?.city_id ?? orderDetails?.billing?.city_id;
            let defaultZoneId = orderDetails?.shipping?.zone_id ?? orderDetails?.billing?.zone_id;
            let defaultAreaId = orderDetails?.shipping?.area_id ?? orderDetails?.billing?.area_id;

            if (defaultCityId) {
                let defaultCity = cities.find((city) => city.id === defaultCityId);
                if (defaultCity) {
                    const defaultCityName = LocationDataManager.normalize(defaultCity.name);
                    hotInstance.setDataAtCell(rowIndex, 4, defaultCityName);

                    try {
                        const items = await LocationDataManager.getZones(defaultCity.id);
                        cityWithID[defaultCityName].zones = items.map(item => LocationDataManager.normalize(item.name));

                        items.forEach((item) => {
                            const name = LocationDataManager.normalize(item.name);
                            cityWithID[defaultCityName].zoneWithID[name] = item;
                            cityWithID[defaultCityName].zoneWithID[name].areaWithID = {};
                            cityWithID[defaultCityName].zoneWithID[name].areas = [];
                        });

                        const defaultZone = items.find((zone) => zone.id == defaultZoneId);

                        if (defaultZone) {
                            const defaultZoneName = LocationDataManager.normalize(defaultZone.name);
                            hotInstance.setDataAtCell(rowIndex, 5, defaultZoneName);

                            try {
                                const areas = await LocationDataManager.getAreas(defaultZone.id);
                                cityWithID[defaultCityName].zoneWithID[defaultZoneName].areas = areas.map(item => LocationDataManager.normalize(item.name));

                                areas.forEach((item) => {
                                    const name = LocationDataManager.normalize(item.name);
                                    cityWithID[defaultCityName].zoneWithID[defaultZoneName].areaWithID[name] = item;
                                });

                                const defaultArea = areas.find((area) => area.id == defaultAreaId);
                                if (defaultArea) {
                                    hotInstance.setDataAtCell(rowIndex, 6, LocationDataManager.normalize(defaultArea.name));
                                }
                            } catch (e) {
                                console.error('Error prefilling areas', e);
                            }
                        }
                    } catch (e) {
                        console.error('Error prefilling zones', e);
                    }
                }
            }
        }
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

    form.on('click', 'input[type="submit"][name="bulk_action"], button[type="submit"][name="bulk_action"]', function (e) {

        const action = $('select[name="action"]').val() || $('select[name="action2"]').val();

        if (action === 'send_with_pathao') {
            e.preventDefault();
            list.empty();

            openModal()
        }
    });


    function getSelectedOrders() {
        const selected = [];
        $('input[name="post[]"]:checked').each(function () {
            selected.push($(this).val());
        });
        // support for new woocommerce order table
        $('.wc-order-bulk-action-check:checked').each(function () {
            selected.push($(this).val());
        });
        // support for legacy/other selection method if needed (from old openModal)
        $('input[name="id[]"]:checked').each(function () {
            selected.push($(this).val());
        });

        return [...new Set(selected)];
    }

    async function openModal() {
        const selectedOrders = getSelectedOrders();

        if (selectedOrders.length === 0) {
            alert('Please select at least one order.');
            return;
        }

        modal.show();
        list.empty();

        // Reset UI states
        $('#ptc-bulk-preload-container').hide();
        $('#hot-container').hide();
        $('#ptc-modal-footer').hide();
        loading.hide();

        // Check if data is cached
        if (LocationDataManager.loadFromStorage()) {
            // Data exists, proceed normally
            $('#hot-container').show();
            $('#ptc-modal-footer').show();
            loading.show();
            await renderHandsontable(selectedOrders);
            loading.hide();
        } else {
            // Data missing, show preload UI
            $('#ptc-bulk-preload-container').show();
        }
    }

    // Event handlers for modal buttons
    $('#modal-confirm').on('click', async function () {
        if (!hotInstance) return;
        const data = hotInstance.getSourceData();
        // Filter out empty rows or invalid data if necessary
        const validData = data.filter(row => row.recipient_name && row.recipient_phone && row.recipient_address);

        if (validData.length === 0) {
            alert('No valid data to send.');
            return;
        }

        loading.show();
        list.empty();

        const ordersToCreate = validData.map(order => ({
            ...order,
            store_id: storesWithID[order.store_id],
            recipient_city: cityWithID[LocationDataManager.normalize(order.recipient_city)]?.id,
            recipient_zone: cityWithID[LocationDataManager.normalize(order.recipient_city)]?.zoneWithID[LocationDataManager.normalize(order.recipient_zone)]?.id,
            recipient_area: cityWithID[LocationDataManager.normalize(order.recipient_city)]?.zoneWithID[LocationDataManager.normalize(order.recipient_zone)]?.areaWithID[LocationDataManager.normalize(order.recipient_area)]?.id,
            delivery_type: deliveryTypesWithID[order.delivery_type],
            item_type: itemTypesWithID[order.item_type]
        }));

        await createBulkOrder(ordersToCreate);

        loading.hide();

    });

    $('#modal-cancel').on('click', function () {
        hotInstance?.destroy();
        list.empty();
        modal.fadeOut();
    });

});
