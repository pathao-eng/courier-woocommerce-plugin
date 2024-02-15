

jQuery(document).ready(function ($) {


    var orderData = {}
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

    $('.column-pathao').on('click', function (e) {
        e.preventDefault();
    });

    $('.ptc-open-modal-button').on('click', async function (e) {
        e.preventDefault();
        var orderID = $(this).data('order-id');
        $('#ptc_wc_order_number').val(orderID);  // Set the Order ID in a hidden field
        ptcModal.show();
        clearModalData();
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
            nameInput.val(orderData?.billing?.full_name);
            phoneInput.val(orderData?.billing?.phone);
            shippingAddressInput.val(`${orderData?.shipping?.address_1}, ${orderData?.shipping?.address_2}, ${orderData?.shipping?.city}, ${orderData?.shipping?.state}, ${orderData?.shipping?.postcode}`);

            totalPriceDom.html(`${orderData.total} ${orderData.currency}`);

            // check payment date, if payment date is available then set total price to 0
            if (orderData?.payment_date) {
                totalPriceInput.val(0);
                $('#ptc_wc_order_payment_status').html('paid');
            } else {
                totalPriceInput.val(orderData.total);
                $('#ptc_wc_order_payment_status').html('unpaid');
            }

            totalWeightInput.val(orderData.total_weight ? orderData.total_weight : 1);
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
    }

    $('#ptc-submit-button').on('click', function (event) {

        let orderId = $('#ptc_wc_order_number').val();
        const orderData = {
            merchant_order_id: orderId,
            recipient_name: $('#ptc_wc_order_name').val(),
            recipient_phone: $('#ptc_wc_order_phone').val().replace('+88', ''),
            recipient_address: $('#ptc_wc_shipping_address').val(),
            recipient_city: $('#city').val(),
            recipient_zone: $('#zone').val(),
            recipient_area: $('#area').val(),
            amount_to_collect: $('#ptc_wc_order_price').val(),
            store_id: $('#store').val(),
            delivery_type: $('#ptc_wc_delivery_type').val(),
            item_type: $('#ptc_wc_item_type').val(),
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
               let consignmentId = response.data.consignment_id;
               let deliveryFee = response.data.delivery_fee;

               $(`[data-order-id="${orderId}"].ptc-open-modal-button`).parent().html(`<pre> ${consignmentId} </pre>`);
               $(`span#${orderId}`).html(`Pending`);
               $(`span#ptc_delivery_fee-${orderId}`).html(deliveryFee);

               ptcModal.hide();
               
            },
            error: function (response) {

                if (response.status === 401) {
                    alert('Unauthorized access. Please reset your token.');
                    return;
                }

                alert(concatErrorMessages(response?.responseJSON?.data.errors))
            }
        });

    });

});


jQuery(document).ready(function ($) {

    $.post(ajaxurl, {
        action: 'get_cities',
    }, function (response) {
        const cities = response.data;

        let options = '<option value="">Select city</option>';
        cities.forEach(function (city) {
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

function concatErrorMessages(errors) {
    let concatenatedErrors = '';

    if (typeof errors === 'string') {
        return errors;
    }

    for (const [key, value] of Object.entries(errors)) {
        concatenatedErrors += `${value} \n`;
    }

    return concatenatedErrors.trim(); // Trim leading and trailing whitespaces
}