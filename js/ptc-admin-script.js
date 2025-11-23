jQuery(document).ready(function ($) {

    let orderData = {};
    const nameInput = $('#ptc_wc_order_name');
    const phoneInput = $('#ptc_wc_order_phone');
    const shippingAddressInput = $('#ptc_wc_shipping_address');
    const totalPriceDom = $('#ptc_wc_order_total_price');
    const totalPriceInput = $('#ptc_wc_order_price');
    const totalWeightInput = $('#ptc_wc_order_weight');
    const totalQuantityInput = $('#ptc_wc_order_quantity');
    const orderItemsDom = $('#ptc_wc_order_items');
    const orderTotalItemsDom = $('#ptc_wc_total_order_items');
    const ptcModal = $('#ptc-custom-modal');
    const hubSelection = $('.ptc-field-hub-selection');
    const secondaryPhoneInput = $('#ptc_wc_order_secondary_phone');
    const cityInput = $('#city');
    const zoneInput = $('#zone');
    const areaInput = $('#area');
    const itemDescriptionInput = $('#ptc_wc_item_description');
    const specialInstructionInput = $('#ptc_wc_special_instruction');
    const storeIdInput = $('#store');
    const deliveryTypeInput = $('#ptc_wc_delivery_type');
    const itemTypeInput = $('#ptc_wc_item_type');
    const loading = $("#ptc-loading-img");

    $('.ptc-open-modal-button').on('click', async function (e) {
        e.preventDefault();
        //hubSelection.hide();
        var orderID = $(this).data('order-id');
        $('#ptc_wc_order_number').val(orderID);  // Set the Order ID in a hidden field
        ptcModal.show();
        clearModalData();
        clearErrorMessages()
        await getOrderInfoAndPopulateModalData(orderID);
    });

    $('.close').on('click', function () {
        $('#custom-modal').hide();
        orderData = {};
    });

    // Close the modal if clicked outside the modal content
    ptcModal.on('click', function (e) {
        if ($(e.target).closest('.modal-content').length === 0) {
            ptcModal.hide();
            orderData = {};
        }
    });

    let getOrderInfoAndPopulateModalData = async function (orderID) {
        loading.fadeIn()
        $.post(ajaxurl, {
            action: 'get_wc_order',
            order_id: orderID
        }, async function (response) {
            orderData = response.data;
            await populateModalData();
            loading.fadeOut()
        });
    }

    let populateModalData = async function () {
        if (orderData) {
            // Try to load from storage first
            LocationDataManager.loadFromStorage();

            let address = '';
            if (orderData?.shipping?.address_1 && orderData?.shipping?.address_2) {
                address = `${orderData?.shipping?.address_1}, ${orderData?.shipping?.address_2}, ${orderData?.shipping?.city}, ${orderData?.shipping?.state}, ${orderData?.shipping?.postcode}`;
            } else {
                address = `${orderData?.billing?.address_1}, ${orderData?.billing?.address_2}, ${orderData?.billing?.city}, ${orderData?.billing?.state}, ${orderData?.billing?.postcode}`;
            }

            nameInput.val(orderData?.billing?.full_name);
            phoneInput.val(orderData?.billing?.phone);
            shippingAddressInput.val(address);

            totalPriceDom.html(`${orderData.total} ${orderData.currency}`);

            // check payment date, if payment date is available then set total price to 0
            if (orderData?.payment_date) {
                totalPriceInput.val(0);
                $('#ptc_wc_order_payment_status').html('paid');
            } else {
                totalPriceInput.val(orderData.total);
                $('#ptc_wc_order_payment_status').html('unpaid');
            }

            totalWeightInput.val(orderData.total_weight ? orderData.total_weight : 0.5);
            totalQuantityInput.val(orderData.total_items);

            let orderItems = '';

            orderData?.items?.forEach(function (item) {
                orderItems += `
                <li> 
                    <img width="40px" src="${item.image}" /> 
                    ${item.name}, 
                    Price: ${item.price} ${orderData.currency}, 
                    Quantity: ${item.quantity}  
                    <a href="${item.product_url}">Detail</a>
                </li>`;
            });

            orderTotalItemsDom.html(orderData?.total_items);

            orderItemsDom.html(orderItems);

            let defaultCityId = orderData?.shipping?.city_id ?? orderData?.billing?.city_id
            let defaultZoneId = orderData?.shipping?.zone_id ?? orderData?.billing?.city_id
            let defaultAreaId = orderData?.shipping?.area_id ?? orderData?.billing?.city_id
            await populateCityZoneArea(defaultCityId, defaultZoneId, defaultAreaId);
            await populateStores();
        }

    }

    let clearModalData = function () {
        nameInput.val('');
        phoneInput.val('');
        shippingAddressInput.val('');
        totalPriceDom.html('');
        orderItemsDom.html('');
        orderTotalItemsDom.html('');
        totalPriceInput.val('');
        totalWeightInput.val('');
        totalQuantityInput.val('');
        secondaryPhoneInput.val('');
        cityInput.val('');
        zoneInput.val('');
        areaInput.val('');
        itemDescriptionInput.val('');
        specialInstructionInput.val('');
        storeIdInput.val('');
        deliveryTypeInput.val('48');
        itemTypeInput.val('2');
    }

    $('#ptc-submit-button').on('click', function (event) {

        let orderId = $('#ptc_wc_order_number').val();
        const orderData = {
            merchant_order_id: orderId,
            recipient_name: nameInput.val(),
            recipient_phone: phoneInput.val().replace('+88', ''),
            recipient_secondary_phone: secondaryPhoneInput.val().replace('+88', ''),
            recipient_address: shippingAddressInput.val(),
            recipient_city: +cityInput.val() || 0,
            recipient_zone: +zoneInput.val() || 0,
            recipient_area: +areaInput.val() || 0,
            item_description: itemDescriptionInput.val() || '',
            special_instruction: specialInstructionInput.val() || '',
            amount_to_collect: totalPriceInput.val(),
            store_id: +storeIdInput.val() || 0,
            delivery_type: deliveryTypeInput.val(),
            item_type: itemTypeInput.val(),
            item_quantity: totalQuantityInput.val(),
            item_weight: totalWeightInput.val(),
        };

        $.post({
            url: ajaxurl,
            headers: {
                'X-WPTC-Nonce': ptcSettings.nonce
            },
            data: {
                action: "create_order_to_ptc",
                order_data: orderData
            },
            success: function (response) {
                let consignmentId = response.data?.consignment_id;
                let deliveryFee = response.data?.delivery_fee;

                $(`[data-order-id="${orderId}"].ptc-open-modal-button`).parent().html(`
                    <a href="${ptcSettings?.merchantPanelBaseUrl}/courier/orders/${consignmentId}" class="order-view" target="_blank">
                      ${consignmentId}
                    </a>
               `);

                $(`span#${orderId}`).html(`Pending`);
                $(`span#ptc_delivery_fee-${orderId}`).html(deliveryFee);

                ptcModal.hide();

            },
            error: function (response) {

                if (response.status === 401) {
                    alert('Unauthorized access. Please reset your token.');
                    return;
                }

                if (
                    'recipient_city' in response?.responseJSON?.data.errors ||
                    'recipient_zone' in response?.responseJSON?.data.errors
                ) {
                    response.responseJSON.data.errors['recipient_address'] = 'Wrong address, please select the correct city and zone instead';

                    //hubSelection.show();
                }

                showErrorMessages(response?.responseJSON?.data.errors);
            }
        });

    });

    function showErrorMessages(errors) {

        const responseFiledMappingWithFieldLabel = {
            'recipient_name': 'name',
            'recipient_address': 'address',
            'recipient_city': 'city',
            'recipient_zone': 'zone',
            'recipient_area': 'area',
            'recipient_phone': 'phone',
            'amount_to_collect': 'collectable-amount',
            'store_id': 'store',
            'delivery_type': 'delivery-type',
            'item_type': 'item-type',
            'item_quantity': 'quantity',
            'item_weight': 'weight',
        };

        if (typeof errors === 'string') {
            alert(errors);
            return;
        }

        for (const [key, value] of Object.entries(errors)) {

            if (responseFiledMappingWithFieldLabel[key]) {
                const errorField = $(`#${responseFiledMappingWithFieldLabel[key]}-error`);
                if (!errorField) {
                    continue;
                }
                errorField.show();
                errorField.html(value);
            }

            $(`#${key}`).next().html(value);
        }
    }

    function clearErrorMessages() {

        const responseFiledMappingWithFieldLabel = {
            'recipient_name': 'name',
            'recipient_address': 'address',
            'recipient_city': 'city',
            'recipient_zone': 'zone',
            'recipient_area': 'area',
            'recipient_phone': 'phone',
            'amount_to_collect': 'collectable-amount',
            'store_id': 'store',
            'delivery_type': 'delivery-type',
            'item_type': 'item-type',
            'item_quantity': 'quantity',
            'item_weight': 'weight',
        };

        for (const [key, value] of Object.entries(responseFiledMappingWithFieldLabel)) {

            const errorField = $(`#${responseFiledMappingWithFieldLabel[key]}-error`);

            if (!errorField) {
                continue;
            }

            errorField.hide();
            errorField.html('');

            $(`#${key}`).next().html('');
        }
    }

    async function populateCityZoneArea(defaultCityId, defaultZoneId, defaultAreaId) {
        const cityDom = $('#city');
        const zoneDom = $('#zone');
        const areaDom = $('#area');

        const cities = await LocationDataManager.getCities();
        let options = '<option value="">Select city</option>';
        cities?.forEach(function (city) {
            options += `<option ${defaultCityId == city.id ? 'selected' : ''} value="${city.id}">${city.name}</option>`;
        });

        cityDom.html(options);

        if (defaultCityId) {
            cityDom.trigger('change');
        }

        cityDom.off('change').on('change', async function () {
            zoneDom.html('<option value="">Select Zone</option>');
            areaDom.html('<option value="">Select Area</option>');
            const city_id = $(this).val();
            if (!city_id) return;

            const zones = await LocationDataManager.getZones(city_id);
            let options = '<option value="">Select Zone</option>';
            zones.forEach(function (zone) {
                options += `<option ${defaultZoneId == zone.id ? 'selected' : ''} value="${zone.id}">${zone.name}</option>`;
            });
            zoneDom.html(options);

            if (defaultZoneId && zones.some(z => z.id == defaultZoneId)) {
                zoneDom.trigger('change');
                defaultZoneId = null;
            }
        });

        zoneDom.off('change').on('change', async function () {
            areaDom.html('<option value="">Select Area</option>');
            const zone_id = $(this).val();
            if (!zone_id) return;

            const areas = await LocationDataManager.getAreas(zone_id);
            let options = '<option value="">Select Area</option>';
            areas.forEach(function (area) {
                options += `<option ${defaultAreaId == area.id ? 'selected' : ''} value="${area.id}">${area.name}</option>`;
            });
            areaDom.html(options);
            defaultAreaId = null;
        });

        if (defaultCityId) {
            cityDom.trigger('change');
            defaultCityId = null;
        }
    }

    async function populateStores() {
        const stores = await LocationDataManager.getStores();
        let options = '<option value="">Select store</option>';
        stores?.forEach(function (store) {
            let selected = store.is_default_store ? 'selected' : '';
            options += `<option ${selected} value="${store.id}">${store.name}</option>`;
        });
        $('#store').html(options);
    }

});



// Preload Button Handler
jQuery(document).ready(function ($) {

    $('#preload-city-zones-btn').on('click', async function () {
        const $btn = $(this);
        const $container = $('#preload-progress-container');
        const $bar = $('#preload-progress-bar');
        const $status = $('#preload-status-text');
        const $percent = $('#preload-percentage');

        if (confirm('This will fetch all city, zone, and area data from the API. This process may take a few minutes. Do you want to continue?')) {
            $btn.prop('disabled', true);
            $container.show();
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

                // Show success toast (using the existing showToast function if available in scope, or fallback)
                // Note: showToast is defined in settings-page.php script block, not here.
                // We can assume the user sees the "Complete!" message.
                alert('Data synchronization complete!');

            } catch (e) {
                console.error(e);
                alert('An error occurred during synchronization.');
                $status.text('Error occurred.');
                $bar.css('background', '#d63638');
            } finally {
                $btn.prop('disabled', false);
                setTimeout(() => {
                    $container.fadeOut();
                }, 3000);
            }
        }
    });
});
