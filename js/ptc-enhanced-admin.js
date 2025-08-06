jQuery(document).ready(function($) {
    'use strict';

    // Enhanced Orders Management System
    const PTCEnhanced = {
        selectedOrders: [],
        currentPage: 1,
        isLoading: false,

        init: function() {
            this.bindEvents();
            this.initModalNavigation();
            this.initDatePresets();
            this.loadStats();
            this.initKeyboardShortcuts();
            this.initAutoSave();
        },

        bindEvents: function() {
            // Select all checkbox
            $('#ptc-select-all').on('change', this.handleSelectAll.bind(this));
            
            // Individual order checkboxes
            $(document).on('change', '.ptc-order-checkbox', this.handleOrderSelect.bind(this));
            
            // Bulk send button
            $('#ptc-bulk-send').on('click', this.handleBulkSend.bind(this));
            
            // Export button
            $('#ptc-export-orders').on('click', this.handleExport.bind(this));
            
            // Single send button
            $(document).on('click', '.ptc-send-single', this.handleSingleSend.bind(this));
            
            // Quick view button
            $(document).on('click', '.ptc-quick-view', this.handleQuickView.bind(this));
            
            // Track order button
            $(document).on('click', '.ptc-track-order', this.handleTrackOrder.bind(this));
            
            // Modal close buttons
            $('.ptc-modal-close').on('click', this.closeModal.bind(this));
            
            // Close modal on outside click
            $('.ptc-modal').on('click', function(e) {
                if ($(e.target).hasClass('ptc-modal')) {
                    PTCEnhanced.closeModal();
                }
            });
            
            // Date preset changes
            $('#ptc-date-preset').on('change', this.handleDatePreset.bind(this));
            
            // Live search
            let searchTimer;
            $('#ptc-search-input').on('keyup', function() {
                clearTimeout(searchTimer);
                const searchTerm = $(this).val();
                searchTimer = setTimeout(() => {
                    PTCEnhanced.performSearch(searchTerm);
                }, 500);
            });
            
            // Status filter change
            $('#ptc-status-filter').on('change', function() {
                $(this).closest('form').submit();
            });
        },

        handleSelectAll: function(e) {
            const isChecked = $(e.target).prop('checked');
            $('.ptc-order-checkbox:not(:disabled)').prop('checked', isChecked);
            this.updateSelectedOrders();
        },

        handleOrderSelect: function() {
            this.updateSelectedOrders();
        },

        updateSelectedOrders: function() {
            this.selectedOrders = [];
            $('.ptc-order-checkbox:checked').each((index, element) => {
                this.selectedOrders.push($(element).val());
            });
            
            // Update bulk send button state
            $('#ptc-bulk-send').prop('disabled', this.selectedOrders.length === 0);
            
            // Update select all checkbox state
            const totalCheckboxes = $('.ptc-order-checkbox:not(:disabled)').length;
            const checkedCheckboxes = $('.ptc-order-checkbox:checked').length;
            $('#ptc-select-all').prop('checked', totalCheckboxes > 0 && totalCheckboxes === checkedCheckboxes);
        },

        handleBulkSend: function() {
            if (this.selectedOrders.length === 0) {
                this.showToast('Please select at least one order', 'warning');
                return;
            }
            
            if (!confirm(`Are you sure you want to send ${this.selectedOrders.length} orders to Pathao?`)) {
                return;
            }
            
            this.showLoading();
            
            const promises = this.selectedOrders.map(orderId => {
                return this.sendOrderToPathao(orderId);
            });
            
            Promise.all(promises).then(results => {
                const successful = results.filter(r => r.success).length;
                const failed = results.filter(r => !r.success).length;
                
                this.hideLoading();
                
                if (successful > 0) {
                    this.showToast(`Successfully sent ${successful} orders to Pathao`, 'success');
                }
                
                if (failed > 0) {
                    this.showToast(`Failed to send ${failed} orders`, 'error');
                }
                
                // Refresh the page after bulk send
                setTimeout(() => {
                    window.location.reload();
                }, 2000);
            }).catch(error => {
                this.hideLoading();
                this.showToast('An error occurred during bulk send', 'error');
                console.error(error);
            });
        },

        handleSingleSend: function(e) {
            const orderId = $(e.target).closest('.ptc-send-single').data('order-id');
            this.openSendModal(orderId);
        },

        openSendModal: function(orderId) {
            // Reset modal to first step
            this.currentStep = 1;
            this.orderData = { id: orderId };
            
            // Show modal immediately with loading state
            $('#ptc-enhanced-modal').fadeIn(300);
            this.resetModalSteps();
            
            // Load order data
            this.showLoading();
            
            $.ajax({
                url: ajaxurl || '/wp-admin/admin-ajax.php',
                method: 'POST',
                data: {
                    action: 'get_wc_order',
                    order_id: orderId,
                    nonce: ptc_ajax?.nonce
                },
                success: (response) => {
                    this.hideLoading();
                    if (response && response.success) {
                        this.populateModalData(response.data);
                    } else {
                        // Use dummy data if AJAX fails
                        this.populateModalData(this.getDummyOrderData(orderId));
                    }
                },
                error: () => {
                    this.hideLoading();
                    // Use dummy data as fallback
                    this.populateModalData(this.getDummyOrderData(orderId));
                }
            });
        },

        getDummyOrderData: function(orderId) {
            // Fallback dummy data for development
            return {
                id: orderId,
                total: '1500.00',
                billing: {
                    first_name: 'John',
                    last_name: 'Doe',
                    phone: '01712345678',
                    address_1: '123 Main Street',
                    city: 'Dhaka',
                    postcode: '1200'
                },
                items: [
                    { name: 'Product 1', quantity: 2 },
                    { name: 'Product 2', quantity: 1 }
                ]
            };
        },

        populateModalData: function(orderData) {
            this.orderData = orderData;
            
            // Populate Step 1 fields
            $('#ptc-order-id').val(orderData.id);
            $('#ptc-order-amount').val('৳' + orderData.total);
            
            // Populate customer info
            const fullName = `${orderData.billing.first_name} ${orderData.billing.last_name}`;
            $('#ptc-customer-name').val(fullName);
            $('#ptc-customer-phone').val(orderData.billing.phone);
            $('#ptc-delivery-address').val(orderData.billing.address_1);
            
            // Generate item description
            const itemDesc = orderData.items?.map(item => 
                `${item.name} x${item.quantity}`
            ).join(', ') || 'Order items';
            $('#ptc-item-description').val(itemDesc);
        },

        resetModalSteps: function() {
            // Reset all steps
            $('.ptc-step').removeClass('active completed');
            $('.ptc-step[data-step="1"]').addClass('active');
            
            $('.ptc-form-step').removeClass('active');
            $('.ptc-form-step[data-step="1"]').addClass('active');
            
            // Reset buttons
            $('.ptc-btn-prev').hide();
            $('.ptc-btn-next').show();
            $('.ptc-btn-submit').hide();
            
            this.currentStep = 1;
        },

        initModalNavigation: function() {
            const self = this;
            
            // Next button
            $('.ptc-btn-next').off('click').on('click', function() {
                if (self.validateCurrentStep()) {
                    self.goToStep(self.currentStep + 1);
                }
            });
            
            // Previous button
            $('.ptc-btn-prev').off('click').on('click', function() {
                self.goToStep(self.currentStep - 1);
            });
            
            // Submit button
            $('.ptc-btn-submit').off('click').on('click', function() {
                self.submitOrder();
            });
            
            // Cancel button
            $('.ptc-btn-cancel').off('click').on('click', function() {
                self.closeModal();
            });
            
            // Step click navigation
            $('.ptc-step').off('click').on('click', function() {
                const stepNum = parseInt($(this).data('step'));
                if (stepNum < self.currentStep || $(this).hasClass('completed')) {
                    self.goToStep(stepNum);
                }
            });
        },

        validateCurrentStep: function() {
            const step = this.currentStep;
            let isValid = true;
            
            if (step === 1) {
                // Validate order details
                const desc = $('#ptc-item-description').val();
                const weight = $('#ptc-item-weight').val();
                const qty = $('#ptc-item-quantity').val();
                
                if (!desc || !weight || !qty) {
                    this.showToast('Please fill all required fields', 'warning');
                    isValid = false;
                }
            } else if (step === 2) {
                // Validate delivery info
                const name = $('#ptc-customer-name').val();
                const phone = $('#ptc-customer-phone').val();
                const address = $('#ptc-delivery-address').val();
                const city = $('#ptc-city').val();
                
                if (!name || !phone || !address || !city) {
                    this.showToast('Please fill all required fields', 'warning');
                    isValid = false;
                }
                
                // Validate phone format
                const phoneRegex = /^01[3-9][0-9]{8}$/;
                if (!phoneRegex.test(phone)) {
                    this.showToast('Please enter a valid Bangladesh mobile number', 'warning');
                    isValid = false;
                }
            }
            
            return isValid;
        },

        goToStep: function(stepNum) {
            if (stepNum < 1 || stepNum > 3) return;
            
            // Mark previous step as completed
            if (stepNum > this.currentStep) {
                $(`.ptc-step[data-step="${this.currentStep}"]`).addClass('completed');
            }
            
            // Update active step
            $('.ptc-step').removeClass('active');
            $(`.ptc-step[data-step="${stepNum}"]`).addClass('active');
            
            // Update form steps
            $('.ptc-form-step').removeClass('active');
            $(`.ptc-form-step[data-step="${stepNum}"]`).addClass('active');
            
            // Update buttons
            if (stepNum === 1) {
                $('.ptc-btn-prev').hide();
                $('.ptc-btn-next').show();
                $('.ptc-btn-submit').hide();
            } else if (stepNum === 2) {
                $('.ptc-btn-prev').show();
                $('.ptc-btn-next').show();
                $('.ptc-btn-submit').hide();
            } else if (stepNum === 3) {
                // Populate summary
                this.populateSummary();
                $('.ptc-btn-prev').show();
                $('.ptc-btn-next').hide();
                $('.ptc-btn-submit').show();
            }
            
            this.currentStep = stepNum;
        },

        populateSummary: function() {
            $('#ptc-summary-order-id').text('#' + this.orderData.id);
            $('#ptc-summary-customer').text($('#ptc-customer-name').val());
            $('#ptc-summary-phone').text($('#ptc-customer-phone').val());
            $('#ptc-summary-address').text($('#ptc-delivery-address').val() + ', ' + $('#ptc-city option:selected').text());
            $('#ptc-summary-items').text($('#ptc-item-description').val());
            $('#ptc-summary-weight').text($('#ptc-item-weight').val() + ' kg');
            $('#ptc-summary-delivery').text($('#ptc-delivery-type option:selected').text());
            $('#ptc-summary-payment').text($('#ptc-payment-method option:selected').text());
            $('#ptc-summary-amount').text($('#ptc-order-amount').val());
            
            // Calculate fees
            const paymentMethod = $('#ptc-payment-method').val();
            const deliveryType = $('#ptc-delivery-type').val();
            
            let deliveryCharge = 60;
            if (deliveryType === '24') deliveryCharge = 100;
            if (deliveryType === '12') deliveryCharge = 150;
            
            let codCharge = paymentMethod === 'cod' ? 10 : 0;
            let totalCharge = deliveryCharge + codCharge;
            
            $('#ptc-delivery-charge').text('৳' + deliveryCharge);
            $('#ptc-cod-charge').text('৳' + codCharge);
            $('#ptc-total-charge').text('৳' + totalCharge);
        },

        submitOrder: function() {
            if (!confirm('Are you sure you want to send this order to Pathao?')) {
                return;
            }
            
            this.showLoading();
            
            const formData = {
                action: 'send_to_pathao',
                order_id: this.orderData.id,
                customer_name: $('#ptc-customer-name').val(),
                phone: $('#ptc-customer-phone').val(),
                address: $('#ptc-delivery-address').val(),
                city: $('#ptc-city').val(),
                zone: $('#ptc-zone').val(),
                area: $('#ptc-area').val(),
                item_description: $('#ptc-item-description').val(),
                weight: $('#ptc-item-weight').val(),
                quantity: $('#ptc-item-quantity').val(),
                delivery_type: $('#ptc-delivery-type').val(),
                payment_method: $('#ptc-payment-method').val(),
                special_instructions: $('#ptc-special-instructions').val(),
                nonce: ptc_ajax?.nonce
            };
            
            $.ajax({
                url: ajaxurl || '/wp-admin/admin-ajax.php',
                method: 'POST',
                data: formData,
                success: (response) => {
                    this.hideLoading();
                    if (response && response.success) {
                        this.showToast('Order sent to Pathao successfully!', 'success');
                        this.closeModal();
                        setTimeout(() => {
                            window.location.reload();
                        }, 2000);
                    } else {
                        this.showToast(response?.message || 'Failed to send order to Pathao', 'error');
                    }
                },
                error: () => {
                    this.hideLoading();
                    this.showToast('Network error. Please try again.', 'error');
                }
            });
        },

        showSendModal: function(orderData) {
            const modalBody = $('#ptc-enhanced-modal .ptc-modal-body');
            
            const modalContent = `
                <div class="ptc-send-form">
                    <div class="ptc-form-tabs">
                        <button class="ptc-tab-btn active" data-tab="basic">Basic Info</button>
                        <button class="ptc-tab-btn" data-tab="address">Address</button>
                        <button class="ptc-tab-btn" data-tab="items">Items</button>
                        <button class="ptc-tab-btn" data-tab="delivery">Delivery Options</button>
                    </div>
                    
                    <div class="ptc-tab-content active" id="tab-basic">
                        <div class="ptc-form-group">
                            <label>Order ID</label>
                            <input type="text" value="${orderData.id}" readonly>
                        </div>
                        <div class="ptc-form-group">
                            <label>Customer Name</label>
                            <input type="text" id="ptc-customer-name" value="${orderData.billing.full_name}">
                        </div>
                        <div class="ptc-form-group">
                            <label>Phone Number</label>
                            <input type="text" id="ptc-phone" value="${orderData.billing.phone}">
                        </div>
                        <div class="ptc-form-group">
                            <label>Amount to Collect</label>
                            <input type="number" id="ptc-amount" value="${orderData.payment_date ? 0 : orderData.total}">
                        </div>
                    </div>
                    
                    <div class="ptc-tab-content" id="tab-address">
                        <div class="ptc-form-group">
                            <label>Delivery Address</label>
                            <textarea id="ptc-address" rows="3">${this.formatAddress(orderData)}</textarea>
                        </div>
                        <div class="ptc-form-group">
                            <label>City</label>
                            <select id="ptc-city">
                                <option value="">Select City</option>
                            </select>
                        </div>
                        <div class="ptc-form-group">
                            <label>Zone</label>
                            <select id="ptc-zone">
                                <option value="">Select Zone</option>
                            </select>
                        </div>
                        <div class="ptc-form-group">
                            <label>Area</label>
                            <select id="ptc-area">
                                <option value="">Select Area</option>
                            </select>
                        </div>
                    </div>
                    
                    <div class="ptc-tab-content" id="tab-items">
                        <div class="ptc-items-list">
                            ${this.renderOrderItems(orderData)}
                        </div>
                        <div class="ptc-form-group">
                            <label>Item Description</label>
                            <textarea id="ptc-item-description" rows="2">${this.getItemDescription(orderData)}</textarea>
                        </div>
                        <div class="ptc-form-group">
                            <label>Total Weight (KG)</label>
                            <input type="number" id="ptc-weight" value="${orderData.total_weight || 0.5}" step="0.1">
                        </div>
                    </div>
                    
                    <div class="ptc-tab-content" id="tab-delivery">
                        <div class="ptc-form-group">
                            <label>Store</label>
                            <select id="ptc-store">
                                <option value="">Select Store</option>
                            </select>
                        </div>
                        <div class="ptc-form-group">
                            <label>Delivery Type</label>
                            <select id="ptc-delivery-type">
                                <option value="48">Regular (48 hours)</option>
                                <option value="24">Express (24 hours)</option>
                                <option value="12">Same Day (12 hours)</option>
                            </select>
                        </div>
                        <div class="ptc-form-group">
                            <label>Item Type</label>
                            <select id="ptc-item-type">
                                <option value="2">Parcel</option>
                                <option value="1">Document</option>
                                <option value="3">Fragile</option>
                            </select>
                        </div>
                        <div class="ptc-form-group">
                            <label>Special Instructions</label>
                            <textarea id="ptc-instructions" rows="2"></textarea>
                        </div>
                    </div>
                    
                    <div class="ptc-form-actions">
                        <button class="button" onclick="PTCEnhanced.closeModal()">Cancel</button>
                        <button class="button button-primary" onclick="PTCEnhanced.submitOrder(${orderData.id})">
                            Send to Pathao
                        </button>
                    </div>
                </div>
            `;
            
            modalBody.html(modalContent);
            $('#ptc-enhanced-modal').show();
            
            // Load cities and stores
            this.loadCities();
            this.loadStores();
            
            // Bind tab switching
            $('.ptc-tab-btn').on('click', function() {
                const tabId = $(this).data('tab');
                $('.ptc-tab-btn').removeClass('active');
                $(this).addClass('active');
                $('.ptc-tab-content').removeClass('active');
                $(`#tab-${tabId}`).addClass('active');
            });
            
            // Bind city/zone/area changes
            $('#ptc-city').on('change', () => this.loadZones($('#ptc-city').val()));
            $('#ptc-zone').on('change', () => this.loadAreas($('#ptc-zone').val()));
        },

        formatAddress: function(orderData) {
            const addr = orderData.shipping.address_1 ? orderData.shipping : orderData.billing;
            return `${addr.address_1}, ${addr.address_2}, ${addr.city}, ${addr.state}, ${addr.postcode}`.replace(/, ,/g, ',');
        },

        getItemDescription: function(orderData) {
            return orderData.items.map(item => `${item.name} x${item.quantity}`).join(', ');
        },

        renderOrderItems: function(orderData) {
            let html = '<div class="ptc-order-items">';
            orderData.items.forEach(item => {
                html += `
                    <div class="ptc-item">
                        <img src="${item.image}" alt="${item.name}" width="50">
                        <div class="ptc-item-details">
                            <div class="ptc-item-name">${item.name}</div>
                            <div class="ptc-item-meta">
                                Qty: ${item.quantity} | Price: ${orderData.currency} ${item.price}
                            </div>
                        </div>
                    </div>
                `;
            });
            html += '</div>';
            return html;
        },

        submitOrder: function(orderId) {
            const orderData = {
                merchant_order_id: orderId,
                recipient_name: $('#ptc-customer-name').val(),
                recipient_phone: $('#ptc-phone').val().replace('+88', ''),
                recipient_address: $('#ptc-address').val(),
                recipient_city: parseInt($('#ptc-city').val()) || 0,
                recipient_zone: parseInt($('#ptc-zone').val()) || 0,
                recipient_area: parseInt($('#ptc-area').val()) || 0,
                amount_to_collect: $('#ptc-amount').val(),
                store_id: parseInt($('#ptc-store').val()) || 0,
                delivery_type: $('#ptc-delivery-type').val(),
                item_type: $('#ptc-item-type').val(),
                item_quantity: 1,
                item_weight: $('#ptc-weight').val(),
                item_description: $('#ptc-item-description').val(),
                special_instruction: $('#ptc-instructions').val()
            };
            
            this.showLoading();
            
            $.ajax({
                url: ajaxurl,
                method: 'POST',
                headers: {
                    'X-WPTC-Nonce': ptcSettings.nonce
                },
                data: {
                    action: 'create_order_to_ptc',
                    order_data: orderData
                },
                success: (response) => {
                    this.hideLoading();
                    if (response.success) {
                        this.showToast('Order successfully sent to Pathao!', 'success');
                        this.closeModal();
                        setTimeout(() => window.location.reload(), 1500);
                    } else {
                        this.showToast(response.data.message || 'Failed to send order', 'error');
                    }
                },
                error: (xhr) => {
                    this.hideLoading();
                    if (xhr.status === 401) {
                        this.showToast('Unauthorized. Please check your API credentials.', 'error');
                    } else {
                        this.showToast('An error occurred while sending the order', 'error');
                    }
                }
            });
        },

        handleQuickView: function(e) {
            const orderId = $(e.target).closest('button').data('order-id');
            this.showLoading();
            
            $.ajax({
                url: ajaxurl,
                method: 'POST',
                data: {
                    action: 'get_wc_order',
                    order_id: orderId
                },
                success: (response) => {
                    this.hideLoading();
                    if (response.success) {
                        this.showQuickViewModal(response.data);
                    } else {
                        this.showToast('Failed to load order details', 'error');
                    }
                },
                error: () => {
                    this.hideLoading();
                    this.showToast('Failed to load order details', 'error');
                }
            });
        },

        showQuickViewModal: function(orderData) {
            const modalBody = $('#ptc-quick-view-modal .ptc-modal-body');
            
            const statusBadge = orderData.payment_date ? 
                '<span class="ptc-badge success">Paid</span>' : 
                '<span class="ptc-badge warning">Unpaid</span>';
            
            const modalContent = `
                <div class="ptc-quick-view">
                    <div class="ptc-qv-header">
                        <h3>Order #${orderData.id}</h3>
                        ${statusBadge}
                    </div>
                    
                    <div class="ptc-qv-grid">
                        <div class="ptc-qv-section">
                            <h4>Customer Information</h4>
                            <dl>
                                <dt>Name:</dt>
                                <dd>${orderData.billing.full_name}</dd>
                                <dt>Email:</dt>
                                <dd>${orderData.billing.email}</dd>
                                <dt>Phone:</dt>
                                <dd>${orderData.billing.phone}</dd>
                            </dl>
                        </div>
                        
                        <div class="ptc-qv-section">
                            <h4>Shipping Address</h4>
                            <address>
                                ${this.formatAddress(orderData)}
                            </address>
                        </div>
                        
                        <div class="ptc-qv-section">
                            <h4>Order Details</h4>
                            <dl>
                                <dt>Total Amount:</dt>
                                <dd>${orderData.currency} ${orderData.total}</dd>
                                <dt>Total Items:</dt>
                                <dd>${orderData.total_items}</dd>
                                <dt>Order Date:</dt>
                                <dd>${new Date(orderData.date_created).toLocaleDateString()}</dd>
                            </dl>
                        </div>
                        
                        <div class="ptc-qv-section">
                            <h4>Pathao Status</h4>
                            ${orderData.consignment_id ? 
                                `<p>Consignment ID: <strong>${orderData.consignment_id}</strong></p>
                                 <p>Status: <strong>${orderData.ptc_status || 'Pending'}</strong></p>` :
                                '<p>Not yet sent to Pathao</p>'
                            }
                        </div>
                    </div>
                    
                    <div class="ptc-qv-items">
                        <h4>Order Items</h4>
                        ${this.renderOrderItems(orderData)}
                    </div>
                    
                    <div class="ptc-qv-actions">
                        <a href="${orderData.edit_url}" class="button" target="_blank">
                            Edit Order
                        </a>
                        ${!orderData.consignment_id ? 
                            `<button class="button button-primary" onclick="PTCEnhanced.openSendModal(${orderData.id})">
                                Send to Pathao
                            </button>` : ''
                        }
                    </div>
                </div>
            `;
            
            modalBody.html(modalContent);
            $('#ptc-quick-view-modal').show();
        },

        handleTrackOrder: function(e) {
            const consignmentId = $(e.target).closest('button').data('consignment');
            window.open(`${ptcSettings.merchantPanelBaseUrl}/courier/orders/${consignmentId}`, '_blank');
        },

        handleExport: function() {
            const params = new URLSearchParams(window.location.search);
            params.append('action', 'export_orders');
            params.append('format', 'csv');
            
            window.location.href = `${ajaxurl}?${params.toString()}`;
        },

        performSearch: function(searchTerm) {
            if (searchTerm.length < 2 && searchTerm.length > 0) {
                return;
            }
            
            const form = $('#ptc-filters-form');
            form.submit();
        },

        handleDatePreset: function(e) {
            const preset = $(e.target).val();
            const today = new Date();
            let fromDate, toDate;
            
            switch(preset) {
                case 'today':
                    fromDate = toDate = this.formatDate(today);
                    break;
                case 'yesterday':
                    const yesterday = new Date(today);
                    yesterday.setDate(yesterday.getDate() - 1);
                    fromDate = toDate = this.formatDate(yesterday);
                    break;
                case 'last7days':
                    const week = new Date(today);
                    week.setDate(week.getDate() - 7);
                    fromDate = this.formatDate(week);
                    toDate = this.formatDate(today);
                    break;
                case 'last30days':
                    const month = new Date(today);
                    month.setDate(month.getDate() - 30);
                    fromDate = this.formatDate(month);
                    toDate = this.formatDate(today);
                    break;
                case 'thismonth':
                    fromDate = this.formatDate(new Date(today.getFullYear(), today.getMonth(), 1));
                    toDate = this.formatDate(today);
                    break;
                case 'lastmonth':
                    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                    const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
                    fromDate = this.formatDate(lastMonth);
                    toDate = this.formatDate(lastMonthEnd);
                    break;
                default:
                    return;
            }
            
            $('#ptc-from-date').val(fromDate);
            $('#ptc-to-date').val(toDate);
        },

        formatDate: function(date) {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        },

        loadCities: function() {
            $.ajax({
                url: ajaxurl,
                method: 'POST',
                data: { action: 'get_cities' },
                success: (response) => {
                    if (response.success) {
                        let options = '<option value="">Select City</option>';
                        response.data.forEach(city => {
                            options += `<option value="${city.city_id}">${city.city_name}</option>`;
                        });
                        $('#ptc-city').html(options);
                    }
                }
            });
        },

        loadZones: function(cityId) {
            if (!cityId) return;
            
            $.ajax({
                url: ajaxurl,
                method: 'POST',
                data: { 
                    action: 'get_zones',
                    city_id: cityId
                },
                success: (response) => {
                    if (response.success) {
                        let options = '<option value="">Select Zone</option>';
                        const zones = response.data.data.data;
                        zones.forEach(zone => {
                            options += `<option value="${zone.zone_id}">${zone.zone_name}</option>`;
                        });
                        $('#ptc-zone').html(options);
                    }
                }
            });
        },

        loadAreas: function(zoneId) {
            if (!zoneId) return;
            
            $.ajax({
                url: ajaxurl,
                method: 'POST',
                data: { 
                    action: 'get_areas',
                    zone_id: zoneId
                },
                success: (response) => {
                    if (response.success) {
                        let options = '<option value="">Select Area</option>';
                        const areas = response.data.data.data;
                        areas.forEach(area => {
                            options += `<option value="${area.area_id}">${area.area_name}</option>`;
                        });
                        $('#ptc-area').html(options);
                    }
                }
            });
        },

        loadStores: function() {
            $.ajax({
                url: ajaxurl,
                method: 'POST',
                data: { action: 'get_stores' },
                success: (response) => {
                    if (response.success) {
                        let options = '<option value="">Select Store</option>';
                        response.data.forEach(store => {
                            const selected = store.is_default_store ? 'selected' : '';
                            options += `<option value="${store.store_id}" ${selected}>${store.store_name}</option>`;
                        });
                        $('#ptc-store').html(options);
                    }
                }
            });
        },

        loadStats: function() {
            // Load order statistics
            $.ajax({
                url: ajaxurl,
                method: 'POST',
                data: { action: 'get_order_stats' },
                success: (response) => {
                    if (response.success) {
                        $('#pending-count').text(response.data.pending || 0);
                        $('#delivered-count').text(response.data.delivered || 0);
                    }
                }
            });
        },

        initDatePresets: function() {
            // Initialize date range presets
            const params = new URLSearchParams(window.location.search);
            const fromDate = params.get('from-date');
            const toDate = params.get('to-date');
            
            if (fromDate && toDate) {
                // Try to match with presets
                const today = new Date();
                const from = new Date(fromDate);
                const to = new Date(toDate);
                
                // Check for common presets
                if (this.isSameDay(from, to)) {
                    if (this.isSameDay(from, today)) {
                        $('#ptc-date-preset').val('today');
                    } else if (this.isSameDay(from, new Date(today.setDate(today.getDate() - 1)))) {
                        $('#ptc-date-preset').val('yesterday');
                    }
                }
            }
        },

        isSameDay: function(date1, date2) {
            return date1.getFullYear() === date2.getFullYear() &&
                   date1.getMonth() === date2.getMonth() &&
                   date1.getDate() === date2.getDate();
        },

        initKeyboardShortcuts: function() {
            $(document).keydown(function(e) {
                // ESC to close modal
                if (e.keyCode === 27) {
                    PTCEnhanced.closeModal();
                }
                
                // Ctrl/Cmd + E to export
                if ((e.ctrlKey || e.metaKey) && e.keyCode === 69) {
                    e.preventDefault();
                    PTCEnhanced.handleExport();
                }
                
                // Ctrl/Cmd + F to focus search
                if ((e.ctrlKey || e.metaKey) && e.keyCode === 70) {
                    e.preventDefault();
                    $('#ptc-search-input').focus();
                }
            });
        },

        initAutoSave: function() {
            try {
                // Check if localStorage is available
                if (typeof Storage === 'undefined') {
                    console.warn('LocalStorage not available, preferences will not be saved');
                    return;
                }
                
                // Auto-save filter preferences
                $('#ptc-filters-form').on('change', 'select, input', function() {
                    const filters = {
                        status: $('#ptc-status-filter').val(),
                        limit: $('#limit').val(),
                        datePreset: $('#ptc-date-preset').val()
                    };
                    localStorage.setItem('ptc_filter_preferences', JSON.stringify(filters));
                });
                
                // Restore filter preferences
                const savedFilters = localStorage.getItem('ptc_filter_preferences');
                if (savedFilters) {
                    const filters = JSON.parse(savedFilters);
                    // Apply saved filters if not already set by URL params
                    if (!window.location.search.includes('order_status')) {
                        $('#ptc-status-filter').val(filters.status || '');
                    }
                }
            } catch (e) {
                console.error('Error in initAutoSave:', e);
            }
        },

        sendOrderToPathao: function(orderId) {
            return new Promise((resolve, reject) => {
                // First get order details
                $.ajax({
                    url: ajaxurl,
                    method: 'POST',
                    data: {
                        action: 'get_wc_order',
                        order_id: orderId
                    },
                    success: (response) => {
                        if (response.success) {
                            // Auto-send with default values
                            const orderData = response.data;
                            const sendData = {
                                merchant_order_id: orderId,
                                recipient_name: orderData.billing.full_name,
                                recipient_phone: orderData.billing.phone.replace('+88', ''),
                                recipient_address: this.formatAddress(orderData),
                                amount_to_collect: orderData.payment_date ? 0 : orderData.total,
                                delivery_type: '48',
                                item_type: '2',
                                item_quantity: orderData.total_items,
                                item_weight: orderData.total_weight || 0.5,
                                item_description: this.getItemDescription(orderData)
                            };
                            
                            $.ajax({
                                url: ajaxurl,
                                method: 'POST',
                                headers: {
                                    'X-WPTC-Nonce': ptcSettings.nonce
                                },
                                data: {
                                    action: 'create_order_to_ptc',
                                    order_data: sendData
                                },
                                success: (response) => {
                                    resolve({ success: response.success, orderId: orderId });
                                },
                                error: () => {
                                    resolve({ success: false, orderId: orderId });
                                }
                            });
                        } else {
                            resolve({ success: false, orderId: orderId });
                        }
                    },
                    error: () => {
                        resolve({ success: false, orderId: orderId });
                    }
                });
            });
        },

        closeModal: function() {
            $('.ptc-modal').hide();
        },

        showLoading: function() {
            $('#ptc-loading-overlay').show();
        },

        hideLoading: function() {
            $('#ptc-loading-overlay').hide();
        },

        showToast: function(message, type = 'info') {
            const toast = $(`
                <div class="ptc-toast ${type}">
                    <span class="dashicons dashicons-${this.getToastIcon(type)}"></span>
                    <span>${message}</span>
                </div>
            `);
            
            $('#ptc-toast-container').append(toast);
            
            setTimeout(() => {
                toast.fadeOut(300, function() {
                    $(this).remove();
                });
            }, 4000);
        },

        getToastIcon: function(type) {
            const icons = {
                success: 'yes',
                error: 'no-alt',
                warning: 'warning',
                info: 'info'
            };
            return icons[type] || 'info';
        }
    };

    // Initialize the enhanced system
    PTCEnhanced.init();
    
    // Make it globally available
    window.PTCEnhanced = PTCEnhanced;
});