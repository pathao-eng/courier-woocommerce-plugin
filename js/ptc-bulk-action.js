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
                {
                    data: 'delivery_type',
                    type: 'dropdown',
                    source: ['48', '49'],
                    allowInvalid: false,
                },
                { data: 'amount_to_collect', type: 'numeric' }
            ],
            colHeaders: ['Order ID', 'Recipient Name', 'Recipient Phone', 'Delivery Type', 'Amount to Collect'],
            rowHeaders: true,
            width: '100%',
            licenseKey: 'non-commercial-and-evaluation'
        });
    }

    const form = $('#wc-orders-filter');

    $('body').append(`
        <div id="custom-modal-overlay" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%;
            background: rgba(0,0,0,0.5); z-index: 10000;">
             <div style="padding: 50px; margin: 0 auto; max-width: 960px; background: white">
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
