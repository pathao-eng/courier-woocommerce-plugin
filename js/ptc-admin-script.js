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

    $('.ptc-open-modal-button').on('click', async function (e) {
        e.preventDefault();
        hubSelection.hide();
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
        $.post(ajaxurl, {
            action: 'get_wc_order',
            order_id: orderID
        }, function (response) {
            orderData = response.data;
            populateModalData();
        });
    }

    let populateModalData = async function () {
        if (orderData) {

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

            // Autofill item description with product name + quantity, each on a new line
            const productDescriptions = orderData?.items?.map(item => `${item.name} x${item.quantity}`).join('\n');
            itemDescriptionInput.val(productDescriptions);
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

                    hubSelection.show();
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
});

jQuery(document).ready(function ($) {

    $.post(ajaxurl, {
        action: 'get_cities',
    }, function (response) {
        const cities = response.data;

        let options = '<option value="">Select city</option>';
        cities?.forEach(function (city) {
            options += `<option value="${city.city_id}">${city.city_name}</option>`;
        });

        $('#city').html(options);
    });

    $.post(ajaxurl, {
        action: 'get_stores',
    }, function (response) {
        const stores = response.data;

        let options = '<option value="">Select store</option>';
        stores.forEach(function (store) {

            let selected = store.is_default_store ? 'selected' : ''

            options += `<option ${selected} value="${store.store_id}">${store.store_name}</option>`;
        });

        $('#store').html(options);
    });


    $('#city').change(function () {
        $('#zone').html('<option value="">Select Zone</option>');
        $('#area').html('<option value="">Select Area</option>');
        const city_id = $(this).val();
        $.post(ajaxurl, {
            action: 'get_zones',
            city_id: city_id
        }, function (response) {
            const zones = response.data.data.data;
            let options = '<option value="">Select Zone</option>';
            zones.forEach(function (zone) {
                options += `<option value="${zone.zone_id}">${zone.zone_name}</option>`;
            });
            $('#zone').html(options);
        });
    });

    $('#zone').change(function () {
        $('#area').html('<option value="">Select Area</option>');

        const zone_id = $(this).val();
        $.post(ajaxurl, {
            action: 'get_areas',
            zone_id: zone_id
        }, function (response) {
            const areas = response.data.data.data;
            let options = '<option value="">Select Area</option>';
            areas.forEach(function (area) {
                options += `<option value="${area.area_id}">${area.area_name}</option>`;
            });
            $('#area').html(options);
        });
    });
});

