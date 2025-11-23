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

    const LocationDataManager = {
        stores: null,
        cities: null,
        zones: {}, // Cache zones by cityId
        areas: {}, // Cache areas by zoneId

        // Cache configuration
        CACHE_KEY: 'ptc_location_data',

        // Promises for in-flight requests to prevent duplicates
        _storesPromise: null,
        _citiesPromise: null,
        _zonesPromises: {},
        _areasPromises: {},

        // Helper to normalize names for keys
        normalize(name) {
            return name ? name.trim().toLowerCase() : '';
        },

        // Helper to process items in batches
        async processBatch(items, batchSize, processFn) {
            const results = [];
            for (let i = 0; i < items.length; i += batchSize) {
                const batch = items.slice(i, i + batchSize);
                const batchResults = await Promise.all(batch.map(item => processFn(item)));
                results.push(...batchResults);
            }
            return results;
        },

        loadFromStorage() {
            try {
                const cached = localStorage.getItem(this.CACHE_KEY);
                if (!cached) return false;

                const data = JSON.parse(cached);

                this.stores = data.stores;
                this.cities = data.cities;
                this.zones = data.zones;
                this.areas = data.areas;
                return true;
            } catch (e) {
                console.error('Failed to load location data from storage', e);
                return false;
            }
        },

        saveToStorage() {
            try {
                const data = {
                    timestamp: Date.now(),
                    stores: this.stores,
                    cities: this.cities,
                    zones: this.zones,
                    areas: this.areas
                };
                localStorage.setItem(this.CACHE_KEY, JSON.stringify(data));
            } catch (e) {
                console.error('Failed to save location data to storage', e);
            }
        },

        async fetchAllWithProgress(onProgress) {
            // 1. Fetch Cities
            onProgress(0, 100, 'Fetching cities...');
            const cities = await this.getCities();
            if (!cities || cities.length === 0) {
                onProgress(100, 100, 'No cities found.');
                return;
            }

            // 2. Fetch Zones
            const totalCities = cities.length;
            let citiesProcessed = 0;

            const allZones = await this.processBatch(cities, 5, async (city) => {
                try {
                    const zones = await this.getZones(city.id);
                    citiesProcessed++;
                    const percent = Math.round((citiesProcessed / totalCities) * 40); // Cities = 40% of progress
                    onProgress(percent, 100, `Fetching zones for ${city.name}...`);
                    return { cityId: city.id, zones };
                } catch (e) {
                    console.error(`Failed to fetch zones for city ${city.id}`, e);
                    return { cityId: city.id, zones: [] };
                }
            });

            // Flatten zones list
            const zonesToFetch = allZones.flatMap(item => item.zones);
            const totalZones = zonesToFetch.length;
            let zonesProcessed = 0;

            // 3. Fetch Areas
            await this.processBatch(zonesToFetch, 5, async (zone) => {
                try {
                    await this.getAreas(zone.id);
                    zonesProcessed++;
                    const percent = 40 + Math.round((zonesProcessed / totalZones) * 50); // Areas = 50% of progress
                    onProgress(percent, 100, `Fetching areas for ${zone.name}...`);
                } catch (e) {
                    console.error(`Failed to fetch areas for zone ${zone.id}`, e);
                }
            });

            // 4. Fetch Stores
            onProgress(90, 100, 'Fetching stores...');
            await this.getStores();

            // 5. Save
            onProgress(95, 100, 'Saving to local storage...');
            this.saveToStorage();

            onProgress(100, 100, 'Complete!');
        },

        async fetchAll() {
            // Deprecated: Use fetchAllWithProgress or loadFromStorage directly
            // Kept for backward compatibility if needed, but logic moved to explicit preload flow
            if (this.loadFromStorage()) {
                if (!this.stores) await this.getStores();
                return;
            }
            // Fallback to old behavior if called directly (though UI now blocks this)
            await this.fetchAllWithProgress(() => { });
        },

        getStores() {
            if (this.stores) return Promise.resolve(this.stores);
            if (this._storesPromise) return this._storesPromise;

            this._storesPromise = new Promise((resolve, reject) => {
                $.post(ajaxurl, { action: 'get_stores' })
                    .done(response => {
                        this.stores = response?.data.map(store => ({
                            id: store.store_id,
                            name: store.store_name,
                            is_default_store: store.is_default_store,
                            is_active: store.is_active,
                            selected: store.is_default_store
                        }));
                        resolve(this.stores);
                    })
                    .fail(err => {
                        this._storesPromise = null;
                        reject(err);
                    });
            });
            return this._storesPromise;
        },

        getCities() {
            if (this.cities) return Promise.resolve(this.cities);
            if (this._citiesPromise) return this._citiesPromise;

            this._citiesPromise = new Promise((resolve, reject) => {
                $.post(ajaxurl, { action: 'get_cities' })
                    .done(response => {
                        this.cities = response?.data.map(city => ({
                            id: city?.city_id,
                            name: city?.city_name
                        }));
                        resolve(this.cities);
                    })
                    .fail(err => {
                        this._citiesPromise = null;
                        reject(err);
                    });
            });
            return this._citiesPromise;
        },

        getZones(cityId) {
            if (!cityId) return Promise.resolve([]);
            if (this.zones[cityId]) return Promise.resolve(this.zones[cityId]);
            if (this._zonesPromises[cityId]) return this._zonesPromises[cityId];

            this._zonesPromises[cityId] = new Promise((resolve, reject) => {
                $.post(ajaxurl, {
                    action: 'get_zones',
                    city_id: cityId
                })
                    .done(response => {
                        const zones = response?.data?.data?.data?.map(zone => ({
                            id: zone?.zone_id,
                            name: zone?.zone_name
                        })) || [];
                        this.zones[cityId] = zones;
                        resolve(zones);
                    })
                    .fail(err => {
                        delete this._zonesPromises[cityId];
                        reject(err);
                    });
            });
            return this._zonesPromises[cityId];
        },

        getAreas(zoneId) {
            if (!zoneId) return Promise.resolve([]);
            if (this.areas[zoneId]) return Promise.resolve(this.areas[zoneId]);
            if (this._areasPromises[zoneId]) return this._areasPromises[zoneId];

            this._areasPromises[zoneId] = new Promise((resolve, reject) => {
                $.post(ajaxurl, {
                    action: 'get_areas',
                    zone_id: zoneId
                })
                    .done(response => {
                        const areas = response?.data?.data?.data?.map(area => ({
                            id: area?.area_id,
                            name: area?.area_name
                        })) || [];
                        this.areas[zoneId] = areas;
                        resolve(areas);
                    })
                    .fail(err => {
                        delete this._areasPromises[zoneId];
                        reject(err);
                    });
            });
            return this._areasPromises[zoneId];
        }
    };

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

        // let defaultCityId = data?.shipping?.city_id ?? data?.billing?.city_id
        // let defaultZoneId = data?.shipping?.zone_id ?? data?.billing?.city_id
        // let defaultAreaId = data?.shipping?.area_id ?? data?.billing?.city_id
        // let defaultZone = null

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

        stores = (await LocationDataManager.getStores());
        const storesOnlyNames = stores?.map((item) => {
            storesWithID[item.name] = item.id
            return item.name
        })

        const cities = (await LocationDataManager.getCities());
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

        hotInstance.getData().forEach((row, rowIndex) => {
            // hotInstance.setDataAtCell(rowIndex, 3, "High"); // update column 3
            const orderId = hotInstance.getDataAtCell(rowIndex, 0)
            const orderDetails = orderBulkDetails.find((item) => {
                return item.id === orderId
            })

            let defaultCityId = orderDetails?.shipping?.city_id ?? orderDetails?.billing?.city_id
            let defaultZoneId = orderDetails?.shipping?.zone_id ?? orderDetails?.billing?.zone_id
            let defaultAreaId = orderDetails?.shipping?.area_id ?? orderDetails?.billing?.area_id
            let defaultZone = null

            if (defaultCityId) {
                let defaultCity = cities.find((city) => {
                    return city.id === defaultCityId
                })

                const defaultCityName = LocationDataManager.normalize(defaultCity?.name);

                hotInstance.setDataAtCell(rowIndex, 4, defaultCityName);

                console.log(cityWithID[defaultCityName].zones)
                // hotInstance.render();
                if (defaultCity) {

                    LocationDataManager.getZones(defaultCity.id).then((items) => {

                        const defaultCityName = LocationDataManager.normalize(defaultCity.name);

                        cityWithID[defaultCityName].zones = items.map(item => LocationDataManager.normalize(item.name));

                        items.forEach((item) => {
                            const name = LocationDataManager.normalize(item.name);
                            cityWithID[defaultCityName].zoneWithID[name] = item
                            cityWithID[defaultCityName].zoneWithID[name].areaWithID = {}
                            cityWithID[defaultCityName].zoneWithID[name].areas = []
                        })


                        defaultZone = items.find((zone) => {
                            return zone.id === defaultZoneId
                        })

                        if (defaultZone) {
                            console.log({ defaultZone })
                            // hotInstance.setCellMeta(rowIndex, 5, 'source', ["sagar", "dash"]);
                            hotInstance.setDataAtCell(rowIndex, 5, LocationDataManager.normalize(defaultZone.name));
                        }

                        // hotInstance.render();
                    })

                }
            }

            console.log({ orderId, orderDetails })
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

        // Event handlers for modal buttons
        $('#modal-confirm').off('click').on('click', async function () {
            if (!hotInstance) return;
            const data = hotInstance.getSourceData();
            // Filter out empty rows or invalid data if necessary
            // The validator logic in Handsontable handles visual feedback, but we should ensure we don't send garbage
            const validData = data.filter(row => row.recipient_name && row.recipient_phone && row.recipient_address);

            if (validData.length === 0) {
                alert('No valid data to send.');
                return;
            }

            loading.show();
            $('#modal-confirm').prop('disabled', true);
            list.empty();

            for (const order of validData) {
                // Map data to backend format
                const orderData = {
                    ...order,
                    store_id: storesWithID[order.store_id],
                    recipient_city: cityWithID[LocationDataManager.normalize(order.recipient_city)]?.id,
                    recipient_zone: cityWithID[LocationDataManager.normalize(order.recipient_city)]?.zoneWithID[LocationDataManager.normalize(order.recipient_zone)]?.id,
                    recipient_area: cityWithID[LocationDataManager.normalize(order.recipient_city)]?.zoneWithID[LocationDataManager.normalize(order.recipient_zone)]?.areaWithID[LocationDataManager.normalize(order.recipient_area)]?.id,
                    delivery_type: deliveryTypesWithID[order.delivery_type],
                    item_type: itemTypesWithID[order.item_type]
                };

                try {
                    const response = await createOrder(orderData);
                    const li = $('<li>').text(`Order ${order.merchant_order_id}: Success (Consignment ID: ${response.consignment_id})`).css('color', 'green');
                    list.append(li);
                } catch (error) {
                    const li = $('<li>').text(`Order ${order.merchant_order_id}: Failed (${error.message || 'Unknown error'})`).css('color', 'red');
                    list.append(li);
                }
            }

            loading.hide();
            $('#modal-confirm').prop('disabled', false);
        });

        $('#modal-cancel').off('click').on('click', function () {
            hotInstance?.destroy();
            list.empty();
            modal.fadeOut();
        });
    }

});
