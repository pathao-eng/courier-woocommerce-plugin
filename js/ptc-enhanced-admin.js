jQuery(document).ready(function($) {
    'use strict';

    // Enhanced Orders Management System
    const PTCEnhanced = {
        selectedOrders: [],
        currentPage: 1,
        isLoading: false,
        bulkOrders: [],
        currentRow: 0,
        currentCol: 0,
        isProcessing: false,

        init: function() {
            this.bindEvents();
            this.initModalNavigation();
            this.initBulkModalHandlers();
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
            
            // Open new bulk send modal
            this.openBulkSendModal();
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

        // ===== BULK SEND FUNCTIONALITY =====
        
        openBulkSendModal: function() {
            if (this.selectedOrders.length === 0) {
                this.showToast('Please select orders first', 'warning');
                return;
            }
            
            // Show modal and loading state
            $('#ptc-bulk-send-modal').fadeIn(300);
            this.showBulkLoading();
            
            // Update header count
            $('#ptc-bulk-count').text(this.selectedOrders.length);
            
            // Load order details
            this.loadBulkOrders();
        },
        
        initBulkModalHandlers: function() {
            const self = this;
            
            // Toolbar actions
            $('.ptc-select-all-rows').on('click', function() {
                self.selectAllBulkRows(true);
            });
            
            $('.ptc-deselect-all-rows').on('click', function() {
                self.selectAllBulkRows(false);
            });
            
            $('#ptc-bulk-select-all').on('change', function() {
                self.selectAllBulkRows($(this).prop('checked'));
            });
            
            // Bulk apply dropdowns
            $('#ptc-bulk-delivery-type').on('change', function() {
                const value = $(this).val();
                if (value) {
                    self.applyToSelectedRows('delivery_type', value);
                    $(this).val(''); // Reset dropdown
                }
            });
            
            $('#ptc-bulk-payment-method').on('change', function() {
                const value = $(this).val();
                if (value) {
                    self.applyToSelectedRows('payment_method', value);
                    $(this).val(''); // Reset dropdown
                }
            });
            
            // Auto calculate weight
            $('.ptc-auto-calculate-weight').on('click', function() {
                self.autoCalculateWeights();
            });
            
            // Validate all
            $('.ptc-validate-all').on('click', function() {
                self.validateAllRows();
            });
            
            // Submit bulk orders
            $('.ptc-bulk-submit').on('click', function() {
                self.submitBulkOrders();
            });
            
            // Cancel processing
            $('#ptc-cancel-processing').on('click', function() {
                self.cancelBulkProcessing();
            });
            
            // Save draft
            $('.ptc-save-draft').on('click', function() {
                self.saveBulkDraft();
            });
        },
        
        loadBulkOrders: function() {
            const self = this;
            
            // Load real order details from WordPress
            self.showBulkLoading();
            
            // Load each order individually via AJAX
            let loadedOrders = [];
            let completedRequests = 0;
            const totalOrders = self.selectedOrders.length;
            
            if (totalOrders === 0) {
                self.hideBulkLoading();
                $('#ptc-bulk-empty').show();
                return;
            }
            
            self.selectedOrders.forEach((orderId, index) => {
                $.ajax({
                    url: ajaxurl || '/wp-admin/admin-ajax.php',
                    method: 'POST',
                    data: {
                        action: 'get_wc_order',
                        order_id: orderId,
                        nonce: ptc_ajax?.nonce
                    },
                    success: (response) => {
                        completedRequests++;
                        
                        if (response.success && response.data) {
                            loadedOrders[index] = self.createBulkOrderDataFromResponse(orderId, response.data, index);
                        } else {
                            // Fallback to mock data if order loading fails
                            loadedOrders[index] = self.createBulkOrderData(orderId, index);
                        }
                        
                        // Update loading progress
                        $('#ptc-bulk-loading p').text(`Loading order details... ${completedRequests}/${totalOrders}`);
                        
                        // When all orders are loaded
                        if (completedRequests === totalOrders) {
                            self.bulkOrders = loadedOrders.filter(order => order !== undefined);
                            self.renderBulkTable();
                            self.hideBulkLoading();
                        }
                    },
                    error: () => {
                        completedRequests++;
                        // Use fallback mock data on error
                        loadedOrders[index] = self.createBulkOrderData(orderId, index);
                        
                        $('#ptc-bulk-loading p').text(`Loading order details... ${completedRequests}/${totalOrders}`);
                        
                        if (completedRequests === totalOrders) {
                            self.bulkOrders = loadedOrders.filter(order => order !== undefined);
                            self.renderBulkTable();
                            self.hideBulkLoading();
                        }
                    }
                });
            });
        },
        
        createBulkOrderDataFromResponse: function(orderId, orderData, index) {
            // Create bulk order data from real WooCommerce order response
            const billingData = orderData.billing || {};
            const shippingData = orderData.shipping || {};
            
            // Use shipping address if available, otherwise billing
            const customerData = {
                name: shippingData.first_name && shippingData.last_name 
                    ? `${shippingData.first_name} ${shippingData.last_name}`.trim()
                    : `${billingData.first_name} ${billingData.last_name}`.trim() || 'Customer',
                phone: shippingData.phone || billingData.phone || '',
                address: this.formatOrderAddress(shippingData.address_1 ? shippingData : billingData)
            };
            
            return {
                id: orderId,
                selected: false,
                order_amount: orderData.total || '0.00',
                customer_name: customerData.name,
                phone: customerData.phone,
                address: customerData.address,
                city: '1', // Default to Dhaka, user can change
                zone: '',
                area: '',
                item_description: this.formatOrderItems(orderData.items || []),
                weight: this.estimateOrderWeight(orderData.items || []),
                quantity: this.calculateOrderQuantity(orderData.items || []),
                delivery_type: '48', // Default to Regular
                payment_method: 'cod', // Default to COD
                special_instructions: orderData.customer_note || '',
                status: 'pending',
                validation: { valid: false, errors: [] }
            };
        },
        
        formatOrderAddress: function(addressData) {
            const parts = [
                addressData.address_1,
                addressData.address_2,
                addressData.city,
                addressData.state,
                addressData.postcode
            ].filter(part => part && part.trim());
            
            return parts.join(', ') || 'Address not provided';
        },
        
        formatOrderItems: function(items) {
            if (!items || items.length === 0) return 'No items';
            
            return items.map(item => `${item.name} x${item.quantity}`).join(', ');
        },
        
        estimateOrderWeight: function(items) {
            if (!items || items.length === 0) return '0.5';
            
            // Simple estimation: 0.3kg per item on average
            const totalQuantity = items.reduce((sum, item) => sum + (parseInt(item.quantity) || 1), 0);
            return Math.max(0.1, totalQuantity * 0.3).toFixed(1);
        },
        
        calculateOrderQuantity: function(items) {
            if (!items || items.length === 0) return '1';
            
            // Total quantity of all items
            const totalQuantity = items.reduce((sum, item) => sum + (parseInt(item.quantity) || 1), 0);
            return totalQuantity.toString();
        },
        
        createBulkOrderData: function(orderId, index) {
            // Fallback mock order data (used when real data loading fails)
            const customers = ['John Doe', 'Jane Smith', 'Ahmed Khan', 'Sarah Wilson', 'Mike Johnson'];
            const phones = ['01712345678', '01887654321', '01912345678', '01512345678', '01612345678'];
            const addresses = ['123 Main St', '456 Road Ave', '789 Lane Rd', '321 Street Blvd', '654 Path Way'];
            const cities = ['1', '2', '3', '4', '5']; // Dhaka, Chittagong, etc.
            const zones = ['1', '2', '3', '4', '5'];
            const areas = ['1', '2', '3', '4', '5'];
            const items = ['T-shirt x2, Jeans x1', 'Shoes x1, Socks x3', 'Books x5', 'Electronics x1', 'Home Decor x2'];
            const amounts = ['1500.00', '2300.00', '1200.00', '3400.00', '890.00'];
            
            return {
                id: orderId,
                selected: true,
                order_amount: amounts[index % amounts.length],
                customer_name: customers[index % customers.length],
                phone: phones[index % phones.length],
                address: addresses[index % addresses.length],
                city: cities[index % cities.length],
                zone: zones[index % zones.length],
                area: areas[index % areas.length],
                item_description: items[index % items.length],
                weight: '0.5',
                quantity: '1',
                delivery_type: '48',
                payment_method: 'cod',
                special_instructions: '',
                status: 'pending',
                validation: { valid: false, errors: ['All fields required'] }
            };
        },
        
        renderBulkTable: function() {
            const tbody = $('#ptc-bulk-orders-body');
            tbody.empty();
            
            this.bulkOrders.forEach((order, index) => {
                tbody.append(this.createBulkTableRow(order, index));
            });
            
            this.bindBulkTableEvents();
            this.updateBulkSummary();
        },
        
        createBulkTableRow: function(order, index) {
            const rowClass = `ptc-bulk-row ${order.selected ? 'selected' : ''} ${order.validation.valid ? 'valid' : 'invalid'}`;
            const statusIcon = this.getStatusIcon(order.status);
            
            return `
                <tr class="${rowClass}" data-order-id="${order.id}" data-row="${index}">
                    <td class="ptc-col-select">
                        <input type="checkbox" class="ptc-bulk-row-select" ${order.selected ? 'checked' : ''}>
                    </td>
                    <td class="ptc-col-order">#${order.id}</td>
                    <td class="ptc-col-amount">৳${order.order_amount}</td>
                    <td class="ptc-col-customer ptc-editable-cell" data-field="customer_name">${order.customer_name}</td>
                    <td class="ptc-col-phone ptc-editable-cell" data-field="phone">${order.phone}</td>
                    <td class="ptc-col-address ptc-editable-cell" data-field="address" title="${order.address}">${this.truncateText(order.address, 35)}</td>
                    <td class="ptc-col-city ptc-editable-cell ptc-select-cell" data-field="city">${this.getCityText(order.city)}</td>
                    <td class="ptc-col-zone ptc-editable-cell ptc-select-cell" data-field="zone">${this.getZoneText(order.zone)}</td>
                    <td class="ptc-col-area ptc-editable-cell ptc-select-cell" data-field="area">${this.getAreaText(order.area)}</td>
                    <td class="ptc-col-items ptc-editable-cell" data-field="item_description" title="${order.item_description}">${this.truncateText(order.item_description, 40)}</td>
                    <td class="ptc-col-weight ptc-editable-cell" data-field="weight">${order.weight}</td>
                    <td class="ptc-col-quantity ptc-editable-cell" data-field="quantity">${order.quantity}</td>
                    <td class="ptc-col-delivery ptc-editable-cell ptc-select-cell" data-field="delivery_type">
                        ${this.getDeliveryTypeText(order.delivery_type)}
                    </td>
                    <td class="ptc-col-payment ptc-editable-cell ptc-select-cell" data-field="payment_method">
                        ${this.getPaymentMethodText(order.payment_method)}
                    </td>
                    <td class="ptc-col-instructions ptc-editable-cell" data-field="special_instructions">${order.special_instructions || '-'}</td>
                    <td class="ptc-col-status">${statusIcon}</td>
                    <td class="ptc-col-actions">
                        <div class="ptc-row-actions">
                            <button class="ptc-row-action duplicate" title="Duplicate Row" data-action="duplicate">
                                <span class="dashicons dashicons-admin-page"></span>
                            </button>
                            <button class="ptc-row-action delete" title="Remove Row" data-action="delete">
                                <span class="dashicons dashicons-trash"></span>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        },
        
        bindBulkTableEvents: function() {
            const self = this;
            
            // Row selection
            $(document).off('change', '.ptc-bulk-row-select').on('change', '.ptc-bulk-row-select', function() {
                const row = $(this).closest('tr');
                const rowIndex = parseInt(row.data('row'));
                const isSelected = $(this).prop('checked');
                
                self.bulkOrders[rowIndex].selected = isSelected;
                row.toggleClass('selected', isSelected);
                
                self.updateBulkSummary();
                self.updateSelectAllState();
            });
            
            // Inline editing
            $(document).off('click', '.ptc-editable-cell').on('click', '.ptc-editable-cell', function(e) {
                if (!$(this).hasClass('editing')) {
                    self.startCellEdit($(this));
                }
            });
            
            // Row actions
            $(document).off('click', '.ptc-row-action').on('click', '.ptc-row-action', function(e) {
                e.stopPropagation();
                const action = $(this).data('action');
                const row = $(this).closest('tr');
                const rowIndex = parseInt(row.data('row'));
                
                if (action === 'duplicate') {
                    self.duplicateBulkRow(rowIndex);
                } else if (action === 'delete') {
                    self.deleteBulkRow(rowIndex);
                }
            });
        },
        
        startCellEdit: function($cell) {
            const field = $cell.data('field');
            const row = $cell.closest('tr');
            const rowIndex = parseInt(row.data('row'));
            const currentValue = this.bulkOrders[rowIndex][field];
            
            $cell.addClass('editing');
            
            let inputHtml = '';
            if ($cell.hasClass('ptc-select-cell')) {
                if (field === 'delivery_type') {
                    inputHtml = `
                        <select class="ptc-cell-select">
                            <option value="48" ${currentValue === '48' ? 'selected' : ''}>Regular (48 hours)</option>
                            <option value="24" ${currentValue === '24' ? 'selected' : ''}>Express (24 hours)</option>
                            <option value="12" ${currentValue === '12' ? 'selected' : ''}>Same Day (12 hours)</option>
                        </select>
                    `;
                } else if (field === 'payment_method') {
                    inputHtml = `
                        <select class="ptc-cell-select">
                            <option value="cod" ${currentValue === 'cod' ? 'selected' : ''}>Cash on Delivery (COD)</option>
                            <option value="prepaid" ${currentValue === 'prepaid' ? 'selected' : ''}>Prepaid</option>
                        </select>
                    `;
                } else if (field === 'city') {
                    inputHtml = `
                        <select class="ptc-cell-select">
                            <option value="">Select City</option>
                            <option value="1" ${currentValue === '1' ? 'selected' : ''}>Dhaka</option>
                            <option value="2" ${currentValue === '2' ? 'selected' : ''}>Chattogram</option>
                            <option value="3" ${currentValue === '3' ? 'selected' : ''}>Sylhet</option>
                            <option value="4" ${currentValue === '4' ? 'selected' : ''}>Khulna</option>
                            <option value="5" ${currentValue === '5' ? 'selected' : ''}>Rajshahi</option>
                            <option value="6" ${currentValue === '6' ? 'selected' : ''}>Barishal</option>
                            <option value="7" ${currentValue === '7' ? 'selected' : ''}>Rangpur</option>
                            <option value="8" ${currentValue === '8' ? 'selected' : ''}>Mymensingh</option>
                        </select>
                    `;
                } else if (field === 'zone') {
                    // Get city value for this row to load appropriate zones
                    const cityId = this.bulkOrders[rowIndex].city;
                    inputHtml = `
                        <select class="ptc-cell-select" data-field="zone" data-row="${rowIndex}">
                            <option value="">Select Zone</option>
                        </select>
                    `;
                    // Load zones dynamically after rendering
                    setTimeout(() => this.loadBulkZones(cityId, rowIndex, currentValue), 10);
                } else if (field === 'area') {
                    // Get zone value for this row to load appropriate areas  
                    const zoneId = this.bulkOrders[rowIndex].zone;
                    inputHtml = `
                        <select class="ptc-cell-select" data-field="area" data-row="${rowIndex}">
                            <option value="">Select Area</option>
                        </select>
                    `;
                    // Load areas dynamically after rendering
                    setTimeout(() => this.loadBulkAreas(zoneId, rowIndex, currentValue), 10);
                }
            } else if (field === 'special_instructions' || field === 'item_description' || field === 'address') {
                inputHtml = `<textarea class="ptc-cell-textarea">${currentValue}</textarea>`;
            } else {
                const inputType = (field === 'weight' || field === 'quantity') ? 'number' : 'text';
                const min = (field === 'weight') ? '0.1' : (field === 'quantity') ? '1' : '';
                const step = (field === 'weight') ? '0.1' : '1';
                
                inputHtml = `<input type="${inputType}" class="ptc-cell-input" value="${currentValue}" ${inputType === 'number' ? `min="${min}" step="${step}"` : ''}>`;
            }
            
            $cell.html(inputHtml);
            $cell.find('input, select, textarea').focus().select();
            
            // Handle blur/enter to save
            $cell.find('input, select, textarea').on('blur keydown', (e) => {
                if (e.type === 'blur' || e.keyCode === 13) {
                    e.preventDefault();
                    this.finishCellEdit($cell, rowIndex, field);
                } else if (e.keyCode === 27) { // Escape key
                    this.cancelCellEdit($cell, currentValue);
                }
            });
        },
        
        finishCellEdit: function($cell, rowIndex, field) {
            const newValue = $cell.find('input, select, textarea').val();
            this.bulkOrders[rowIndex][field] = newValue;
            
            // Handle cascading dropdowns
            if (field === 'city') {
                // Reset zone and area when city changes
                this.bulkOrders[rowIndex].zone = '';
                this.bulkOrders[rowIndex].area = '';
                
                // Update zone and area cells in the same row
                const row = $cell.closest('tr');
                row.find('[data-field="zone"]').html(this.getZoneText(''));
                row.find('[data-field="area"]').html(this.getAreaText(''));
            } else if (field === 'zone') {
                // Reset area when zone changes
                this.bulkOrders[rowIndex].area = '';
                
                // Update area cell in the same row
                const row = $cell.closest('tr');
                row.find('[data-field="area"]').html(this.getAreaText(''));
            }
            
            // Update display value
            let displayValue = newValue;
            if (field === 'delivery_type') {
                displayValue = this.getDeliveryTypeText(newValue);
            } else if (field === 'payment_method') {
                displayValue = this.getPaymentMethodText(newValue);
            } else if (field === 'city') {
                displayValue = this.getCityText(newValue);
            } else if (field === 'zone') {
                displayValue = this.getZoneText(newValue);
            } else if (field === 'area') {
                displayValue = this.getAreaText(newValue);
            } else if (field === 'address') {
                displayValue = this.truncateText(newValue, 35);
                $cell.attr('title', newValue);
            } else if (field === 'item_description') {
                displayValue = this.truncateText(newValue, 40);
                $cell.attr('title', newValue);
            } else if (field === 'special_instructions') {
                displayValue = newValue || '-';
            }
            
            $cell.removeClass('editing').html(displayValue);
            
            // Validate the row
            this.validateBulkRow(rowIndex);
            this.updateBulkSummary();
        },
        
        cancelCellEdit: function($cell, originalValue) {
            let displayValue = originalValue;
            $cell.removeClass('editing').html(displayValue);
        },
        
        // Helper functions for bulk operations
        truncateText: function(text, length) {
            return text.length > length ? text.substring(0, length) + '...' : text;
        },
        
        getDeliveryTypeText: function(value) {
            const types = {
                '48': 'Regular (48 hours)',
                '24': 'Express (24 hours)',
                '12': 'Same Day (12 hours)'
            };
            return types[value] || value;
        },
        
        getPaymentMethodText: function(value) {
            const methods = {
                'cod': 'Cash on Delivery (COD)',
                'prepaid': 'Prepaid'
            };
            return methods[value] || value;
        },
        
        getCityText: function(value) {
            const cities = {
                '1': 'Dhaka',
                '2': 'Chattogram',
                '3': 'Sylhet',
                '4': 'Khulna',
                '5': 'Rajshahi',
                '6': 'Barishal',
                '7': 'Rangpur',
                '8': 'Mymensingh'
            };
            return cities[value] || 'Select City';
        },
        
        getZoneText: function(value) {
            // Return stored zone text from cached data, or fetch if needed
            if (value && this.zoneData && this.zoneData[value]) {
                return this.zoneData[value];
            }
            return value ? `Zone ${value}` : 'Select Zone';
        },
        
        getAreaText: function(value) {
            // Return stored area text from cached data, or fetch if needed
            if (value && this.areaData && this.areaData[value]) {
                return this.areaData[value];
            }
            return value ? `Area ${value}` : 'Select Area';
        },
        
        getStatusIcon: function(status) {
            const icons = {
                'pending': '<span class="ptc-status-icon ptc-status-pending" title="Pending">⏳</span>',
                'processing': '<span class="ptc-status-icon ptc-status-processing" title="Processing">⚙️</span>',
                'success': '<span class="ptc-status-icon ptc-status-success" title="Success">✅</span>',
                'error': '<span class="ptc-status-icon ptc-status-error" title="Error">❌</span>',
                'warning': '<span class="ptc-status-icon ptc-status-warning" title="Warning">⚠️</span>'
            };
            return icons[status] || icons['pending'];
        },
        
        selectAllBulkRows: function(selected) {
            this.bulkOrders.forEach((order, index) => {
                order.selected = selected;
                const row = $(`tr[data-row="${index}"]`);
                row.toggleClass('selected', selected);
                row.find('.ptc-bulk-row-select').prop('checked', selected);
            });
            this.updateBulkSummary();
        },
        
        updateSelectAllState: function() {
            const totalRows = this.bulkOrders.length;
            const selectedRows = this.bulkOrders.filter(order => order.selected).length;
            
            const selectAll = $('#ptc-bulk-select-all');
            selectAll.prop('checked', totalRows > 0 && totalRows === selectedRows);
            selectAll.prop('indeterminate', selectedRows > 0 && selectedRows < totalRows);
        },
        
        applyToSelectedRows: function(field, value) {
            let appliedCount = 0;
            
            this.bulkOrders.forEach((order, index) => {
                if (order.selected) {
                    order[field] = value;
                    appliedCount++;
                    
                    // Update the display
                    const row = $(`tr[data-row="${index}"]`);
                    const cell = row.find(`[data-field="${field}"]`);
                    
                    let displayValue = value;
                    if (field === 'delivery_type') {
                        displayValue = this.getDeliveryTypeText(value);
                    } else if (field === 'payment_method') {
                        displayValue = this.getPaymentMethodText(value);
                    }
                    
                    cell.html(displayValue);
                    
                    // Re-validate the row
                    this.validateBulkRow(index);
                }
            });
            
            if (appliedCount > 0) {
                this.showToast(`Applied to ${appliedCount} selected rows`, 'success');
                this.updateBulkSummary();
            } else {
                this.showToast('No rows selected', 'warning');
            }
        },
        
        autoCalculateWeights: function() {
            let calculatedCount = 0;
            
            this.bulkOrders.forEach((order, index) => {
                if (order.selected) {
                    // Simple weight calculation based on items (mock logic)
                    const itemCount = (order.item_description.match(/x\d+/g) || []).reduce((sum, match) => {
                        return sum + parseInt(match.replace('x', ''));
                    }, 1);
                    
                    const estimatedWeight = Math.max(0.1, itemCount * 0.3).toFixed(1);
                    order.weight = estimatedWeight;
                    calculatedCount++;
                    
                    // Update display
                    const row = $(`tr[data-row="${index}"]`);
                    row.find('[data-field="weight"]').html(estimatedWeight);
                    
                    this.validateBulkRow(index);
                }
            });
            
            if (calculatedCount > 0) {
                this.showToast(`Calculated weights for ${calculatedCount} orders`, 'success');
                this.updateBulkSummary();
            } else {
                this.showToast('No rows selected', 'warning');
            }
        },
        
        validateBulkRow: function(index) {
            const order = this.bulkOrders[index];
            const errors = [];
            
            // Validation rules for all fields from single send modal
            if (!order.customer_name || !order.customer_name.trim()) {
                errors.push('Customer name required');
            }
            
            if (!order.phone || !order.phone.match(/^01[3-9]\d{8}$/)) {
                errors.push('Valid phone number required (01XXXXXXXXX)');
            }
            
            if (!order.address || !order.address.trim()) {
                errors.push('Address required');
            }
            
            if (!order.city) {
                errors.push('City required');
            }
            
            if (!order.zone) {
                errors.push('Zone required');
            }
            
            if (!order.area) {
                errors.push('Area required');
            }
            
            if (!order.item_description || !order.item_description.trim()) {
                errors.push('Item description required');
            }
            
            if (!order.weight || parseFloat(order.weight) < 0.1) {
                errors.push('Valid weight required (minimum 0.1 kg)');
            }
            
            if (!order.quantity || parseInt(order.quantity) < 1) {
                errors.push('Valid quantity required (minimum 1 package)');
            }
            
            if (!order.delivery_type) {
                errors.push('Delivery type required');
            }
            
            if (!order.payment_method) {
                errors.push('Payment method required');
            }
            
            order.validation = {
                valid: errors.length === 0,
                errors: errors
            };
            
            // Update row styling
            const row = $(`tr[data-row="${index}"]`);
            row.removeClass('valid invalid').addClass(order.validation.valid ? 'valid' : 'invalid');
            
            // Update validation indicators
            if (order.validation.valid) {
                row.removeClass('ptc-validation-error ptc-validation-warning').addClass('ptc-validation-success');
                row.attr('title', 'Ready to send ✓');
            } else {
                row.removeClass('ptc-validation-success ptc-validation-warning').addClass('ptc-validation-error');
                row.attr('title', 'Issues: ' + errors.join(' • '));
            }
        },
        
        validateAllRows: function() {
            this.bulkOrders.forEach((order, index) => {
                this.validateBulkRow(index);
            });
            this.updateBulkSummary();
            
            const validCount = this.bulkOrders.filter(o => o.validation.valid).length;
            const totalCount = this.bulkOrders.length;
            
            this.showToast(`Validation complete: ${validCount}/${totalCount} orders ready`, 
                validCount === totalCount ? 'success' : 'warning');
        },
        
        updateBulkSummary: function() {
            const selectedCount = this.bulkOrders.filter(o => o.selected).length;
            const validCount = this.bulkOrders.filter(o => o.selected && o.validation.valid).length;
            const invalidCount = selectedCount - validCount;
            
            $('#ptc-selected-summary').text(`${selectedCount} orders selected`);
            $('#ptc-validation-summary').text(`${validCount} ready to send`);
            
            $('.ptc-valid-count').text(`${validCount} Valid`);
            $('.ptc-invalid-count').text(`${invalidCount} Invalid`);
            
            // Enable/disable submit button
            $('.ptc-bulk-submit').prop('disabled', validCount === 0);
        },
        
        duplicateBulkRow: function(index) {
            const originalOrder = {...this.bulkOrders[index]};
            originalOrder.selected = false; // Don't select the duplicate by default
            
            this.bulkOrders.splice(index + 1, 0, originalOrder);
            this.renderBulkTable();
            
            this.showToast('Row duplicated', 'success');
        },
        
        deleteBulkRow: function(index) {
            if (this.bulkOrders.length <= 1) {
                this.showToast('Cannot delete the last row', 'warning');
                return;
            }
            
            this.bulkOrders.splice(index, 1);
            this.renderBulkTable();
            
            this.showToast('Row deleted', 'success');
        },
        
        showBulkLoading: function() {
            $('#ptc-bulk-loading').show();
            $('.ptc-bulk-table-container').hide();
            $('#ptc-bulk-empty').hide();
        },
        
        hideBulkLoading: function() {
            $('#ptc-bulk-loading').hide();
            $('.ptc-bulk-table-container').show();
        },
        
        submitBulkOrders: function() {
            const selectedOrders = this.bulkOrders.filter(o => o.selected && o.validation.valid);
            
            if (selectedOrders.length === 0) {
                this.showToast('No valid orders selected', 'warning');
                return;
            }
            
            if (!confirm(`Send ${selectedOrders.length} orders to Pathao Courier?`)) {
                return;
            }
            
            this.startBulkProcessing(selectedOrders);
        },
        
        startBulkProcessing: function(orders) {
            // Hide table, show progress
            $('.ptc-bulk-table-container').hide();
            $('#ptc-bulk-progress').show();
            
            this.isProcessing = true;
            const total = orders.length;
            let processed = 0;
            let successful = 0;
            let failed = 0;
            
            $('#ptc-progress-total').text(total);
            $('#ptc-progress-current').text(0);
            $('#ptc-progress-fill').css('width', '0%');
            $('#ptc-progress-status').text('Starting...');
            
            // Process orders in batches
            this.processBatch(orders, 0, (result) => {
                processed++;
                if (result.success) successful++;
                else failed++;
                
                const progress = Math.round((processed / total) * 100);
                $('#ptc-progress-current').text(processed);
                $('#ptc-progress-fill').css('width', progress + '%');
                
                let statusText;
                if (processed === total) {
                    statusText = 'Complete!';
                } else {
                    statusText = `Processing order #${orders[processed]?.id || processed + 1}...`;
                }
                $('#ptc-progress-status').text(statusText);
                
                if (processed === total) {
                    // All done
                    setTimeout(() => {
                        this.completeBulkProcessing(successful, failed);
                    }, 1000);
                }
            });
        },
        
        processBatch: function(orders, index, callback) {
            if (index >= orders.length || !this.isProcessing) {
                return;
            }
            
            const order = orders[index];
            
            // Update row status to processing
            const rowIndex = this.bulkOrders.findIndex(o => o.id === order.id);
            if (rowIndex !== -1) {
                this.bulkOrders[rowIndex].status = 'processing';
                // Update the table row to show processing status
                this.updateBulkTableRow(rowIndex);
            }
            
            // Make real API call using the same action as single send - USE SAME STORE LOGIC AS SINGLE SEND
            const orderData = {
                store_id: $('#ptc-store').val() || '1', // Same store logic as single send
                merchant_order_id: order.id,
                recipient_name: order.customer_name,
                recipient_phone: order.phone,
                recipient_secondary_phone: '', // Optional field
                recipient_address: order.address,
                recipient_city: order.city,
                recipient_zone: order.zone,
                recipient_area: order.area,
                delivery_type: order.delivery_type,
                item_type: '2', // Default item type
                special_instruction: order.special_instructions,
                item_quantity: order.quantity,
                item_weight: order.weight,
                amount_to_collect: order.order_amount || '0',
                item_description: order.item_description
            };

            $.ajax({
                url: ajaxurl || '/wp-admin/admin-ajax.php',
                method: 'POST',
                headers: {
                    'X-WPTC-Nonce': ptc_ajax?.nonce
                },
                data: {
                    action: 'create_order_to_ptc',
                    order_data: orderData
                },
                success: (response) => {
                    const success = response && response.success;
                    
                    callback({ 
                        success: success, 
                        orderId: order.id,
                        message: response ? (response.message || response.data?.message || 'API call completed') : 'Unknown response',
                        consignmentId: response?.data?.consignment_id
                    });
                    
                    // Update row status
                    if (rowIndex !== -1) {
                        this.bulkOrders[rowIndex].status = success ? 'success' : 'error';
                        this.bulkOrders[rowIndex].consignment_id = success ? response?.data?.consignment_id : null;
                        this.bulkOrders[rowIndex].error_message = success ? null : (response?.message || response?.data?.message || 'API call failed');
                        this.updateBulkTableRow(rowIndex);
                    }
                    
                    // Process next order after a short delay
                    setTimeout(() => {
                        this.processBatch(orders, index + 1, callback);
                    }, 1000); // 1 second delay between requests
                },
                error: (xhr, status, error) => {
                    callback({ 
                        success: false, 
                        orderId: order.id,
                        message: `Network error: ${error}`,
                        consignmentId: null
                    });
                    
                    // Update row status
                    if (rowIndex !== -1) {
                        this.bulkOrders[rowIndex].status = 'error';
                        this.bulkOrders[rowIndex].error_message = `Network error: ${error}`;
                        this.updateBulkTableRow(rowIndex);
                    }
                    
                    // Process next order after a short delay
                    setTimeout(() => {
                        this.processBatch(orders, index + 1, callback);
                    }, 1000); // 1 second delay between requests
                }
            });
        },
        
        updateBulkTableRow: function(rowIndex) {
            const order = this.bulkOrders[rowIndex];
            const row = $(`tr[data-row="${rowIndex}"]`);
            
            if (row.length) {
                // Update status cell
                const statusCell = row.find('.ptc-col-status');
                const statusIcon = this.getStatusIcon(order.status);
                statusCell.html(statusIcon);
                
                // Update row styling based on status
                row.removeClass('valid invalid processing success error')
                   .addClass(order.status);
                
                // Update tooltip
                let tooltipText = `Order #${order.id} - ${order.status}`;
                if (order.error_message) {
                    tooltipText += `: ${order.error_message}`;
                } else if (order.consignment_id) {
                    tooltipText += `: Consignment #${order.consignment_id}`;
                }
                row.attr('title', tooltipText);
            }
        },
        
        completeBulkProcessing: function(successful, failed) {
            this.isProcessing = false;
            
            // Hide progress, show results
            $('#ptc-bulk-progress').hide();
            $('.ptc-bulk-table-container').show();
            
            // Re-render table with updated statuses
            this.renderBulkTable();
            
            // Show summary
            let message = `Bulk processing complete! `;
            if (successful > 0) message += `${successful} orders sent successfully. `;
            if (failed > 0) message += `${failed} orders failed.`;
            
            this.showToast(message, failed === 0 ? 'success' : 'warning');
            
            // Auto-close modal after delay if all successful
            if (failed === 0) {
                setTimeout(() => {
                    this.closeModal();
                    window.location.reload();
                }, 3000);
            }
        },
        
        cancelBulkProcessing: function() {
            if (this.isProcessing && confirm('Cancel the bulk processing?')) {
                this.isProcessing = false;
                $('#ptc-bulk-progress').hide();
                $('.ptc-bulk-table-container').show();
                this.showToast('Processing cancelled', 'info');
            }
        },
        
        saveBulkDraft: function() {
            try {
                if (typeof Storage !== 'undefined') {
                    const draftData = {
                        orders: this.bulkOrders,
                        timestamp: Date.now()
                    };
                    localStorage.setItem('ptc_bulk_draft', JSON.stringify(draftData));
                    this.showToast('Draft saved successfully', 'success');
                } else {
                    this.showToast('Cannot save draft - storage not available', 'warning');
                }
            } catch (e) {
                console.error('Error saving draft:', e);
                this.showToast('Error saving draft', 'error');
            }
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
            
            const orderData = {
                store_id: $('#ptc-store').val() || '1', // Default store ID
                merchant_order_id: this.orderData.id,
                recipient_name: $('#ptc-customer-name').val(),
                recipient_phone: $('#ptc-customer-phone').val(),
                recipient_secondary_phone: '', // Optional field
                recipient_address: $('#ptc-delivery-address').val(),
                recipient_city: $('#ptc-city').val(),
                recipient_zone: $('#ptc-zone').val(), 
                recipient_area: $('#ptc-area').val(),
                delivery_type: $('#ptc-delivery-type').val(),
                item_type: '2', // Default item type
                special_instruction: $('#ptc-special-instructions').val(),
                item_quantity: $('#ptc-item-quantity').val(),
                item_weight: $('#ptc-item-weight').val(),
                amount_to_collect: this.orderData.total || '0',
                item_description: $('#ptc-item-description').val()
            };

            $.ajax({
                url: ajaxurl || '/wp-admin/admin-ajax.php',
                method: 'POST',
                headers: {
                    'X-WPTC-Nonce': ptc_ajax?.nonce
                },
                data: {
                    action: 'create_order_to_ptc',
                    order_data: orderData
                },
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
            const self = this;
            
            $(document).keydown(function(e) {
                // ESC to close modal
                if (e.keyCode === 27) {
                    self.closeModal();
                }
                
                // Ctrl/Cmd + E to export
                if ((e.ctrlKey || e.metaKey) && e.keyCode === 69) {
                    e.preventDefault();
                    self.handleExport();
                }
                
                // Ctrl/Cmd + F to focus search
                if ((e.ctrlKey || e.metaKey) && e.keyCode === 70) {
                    e.preventDefault();
                    $('#ptc-search-input').focus();
                }
                
                // Bulk modal keyboard shortcuts
                if ($('#ptc-bulk-send-modal').is(':visible')) {
                    self.handleBulkKeyboardShortcuts(e);
                }
            });
        },
        
        handleBulkKeyboardShortcuts: function(e) {
            // Ctrl/Cmd + A - Select all rows
            if ((e.ctrlKey || e.metaKey) && e.keyCode === 65) {
                e.preventDefault();
                this.selectAllBulkRows(true);
            }
            
            // Ctrl/Cmd + Shift + A - Deselect all rows  
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.keyCode === 65) {
                e.preventDefault();
                this.selectAllBulkRows(false);
            }
            
            // Ctrl/Cmd + S - Save draft
            if ((e.ctrlKey || e.metaKey) && e.keyCode === 83) {
                e.preventDefault();
                this.saveBulkDraft();
            }
            
            // Ctrl/Cmd + Enter - Submit bulk orders
            if ((e.ctrlKey || e.metaKey) && e.keyCode === 13) {
                e.preventDefault();
                this.submitBulkOrders();
            }
            
            // F2 - Start editing focused cell
            if (e.keyCode === 113) { // F2
                e.preventDefault();
                const focusedCell = $('.ptc-bulk-table td.focused');
                if (focusedCell.length && focusedCell.hasClass('ptc-editable-cell')) {
                    this.startCellEdit(focusedCell);
                }
            }
            
            // Arrow key navigation
            if ([37, 38, 39, 40].includes(e.keyCode)) { // Arrow keys
                e.preventDefault();
                this.handleArrowKeyNavigation(e.keyCode);
            }
            
            // Tab navigation
            if (e.keyCode === 9) { // Tab
                e.preventDefault();
                this.handleTabNavigation(e.shiftKey);
            }
            
            // Delete key - Remove selected rows
            if (e.keyCode === 46) { // Delete
                e.preventDefault();
                this.deleteSelectedRows();
            }
            
            // Ctrl/Cmd + D - Duplicate selected rows
            if ((e.ctrlKey || e.metaKey) && e.keyCode === 68) {
                e.preventDefault();
                this.duplicateSelectedRows();
            }
        },
        
        handleArrowKeyNavigation: function(keyCode) {
            const table = $('.ptc-bulk-table');
            const rows = table.find('tbody tr');
            const cols = table.find('thead th').length;
            
            let newRow = this.currentRow;
            let newCol = this.currentCol;
            
            switch(keyCode) {
                case 37: // Left arrow
                    newCol = Math.max(1, newCol - 1); // Skip select column (0)
                    break;
                case 38: // Up arrow
                    newRow = Math.max(0, newRow - 1);
                    break;
                case 39: // Right arrow
                    newCol = Math.min(cols - 1, newCol + 1);
                    break;
                case 40: // Down arrow
                    newRow = Math.min(rows.length - 1, newRow + 1);
                    break;
            }
            
            this.focusCell(newRow, newCol);
        },
        
        handleTabNavigation: function(backward) {
            const table = $('.ptc-bulk-table');
            const rows = table.find('tbody tr');
            // Updated editable column indices: customer(3), phone(4), address(5), city(6), zone(7), area(8), items(9), weight(10), qty(11), delivery(12), payment(13), instructions(14)
            const editableCols = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];
            
            let newRow = this.currentRow;
            let newCol = this.currentCol;
            
            if (backward) {
                // Move to previous editable cell
                const currentIndex = editableCols.indexOf(newCol);
                if (currentIndex > 0) {
                    newCol = editableCols[currentIndex - 1];
                } else if (newRow > 0) {
                    newRow--;
                    newCol = editableCols[editableCols.length - 1];
                }
            } else {
                // Move to next editable cell
                const currentIndex = editableCols.indexOf(newCol);
                if (currentIndex < editableCols.length - 1) {
                    newCol = editableCols[currentIndex + 1];
                } else if (newRow < rows.length - 1) {
                    newRow++;
                    newCol = editableCols[0];
                }
            }
            
            this.focusCell(newRow, newCol);
        },
        
        focusCell: function(row, col) {
            // Remove previous focus
            $('.ptc-bulk-table tbody tr').removeClass('focused');
            $('.ptc-bulk-table tbody td').removeClass('focused');
            
            // Add new focus
            const targetRow = $(`.ptc-bulk-table tbody tr[data-row="${row}"]`);
            const targetCell = targetRow.find('td').eq(col);
            
            if (targetRow.length && targetCell.length) {
                targetRow.addClass('focused');
                targetCell.addClass('focused');
                
                this.currentRow = row;
                this.currentCol = col;
                
                // Scroll into view if needed
                targetCell[0].scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'nearest',
                    inline: 'nearest'
                });
            }
        },
        
        deleteSelectedRows: function() {
            const selectedRows = this.bulkOrders
                .map((order, index) => ({ order, index }))
                .filter(item => item.order.selected);
            
            if (selectedRows.length === 0) {
                this.showToast('No rows selected', 'warning');
                return;
            }
            
            if (selectedRows.length === this.bulkOrders.length) {
                this.showToast('Cannot delete all rows', 'warning');
                return;
            }
            
            if (confirm(`Delete ${selectedRows.length} selected rows?`)) {
                // Remove rows in reverse order to maintain indices
                selectedRows.reverse().forEach(item => {
                    this.bulkOrders.splice(item.index, 1);
                });
                
                this.renderBulkTable();
                this.showToast(`Deleted ${selectedRows.length} rows`, 'success');
            }
        },
        
        duplicateSelectedRows: function() {
            const selectedRows = this.bulkOrders
                .map((order, index) => ({ order, index }))
                .filter(item => item.order.selected);
            
            if (selectedRows.length === 0) {
                this.showToast('No rows selected', 'warning');
                return;
            }
            
            // Duplicate each selected row
            let duplicatedCount = 0;
            selectedRows.forEach(item => {
                const duplicateOrder = {...item.order};
                duplicateOrder.selected = false; // Don't select duplicates by default
                this.bulkOrders.splice(item.index + 1, 0, duplicateOrder);
                duplicatedCount++;
            });
            
            this.renderBulkTable();
            this.showToast(`Duplicated ${duplicatedCount} rows`, 'success');
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
        },

        // Bulk-specific zone/area loading functions
        loadBulkZones: function(cityId, rowIndex, selectedValue) {
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
                        
                        // Cache zone data for display purposes
                        if (!this.zoneData) this.zoneData = {};
                        
                        zones.forEach(zone => {
                            // Store in cache
                            this.zoneData[zone.zone_id] = zone.zone_name;
                            
                            const isSelected = selectedValue === zone.zone_id ? 'selected' : '';
                            options += `<option value="${zone.zone_id}" ${isSelected}>${zone.zone_name}</option>`;
                        });
                        
                        // Update the specific cell dropdown
                        $(`.ptc-cell-select[data-field="zone"][data-row="${rowIndex}"]`).html(options);
                    }
                }
            });
        },
        
        loadBulkAreas: function(zoneId, rowIndex, selectedValue) {
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
                        
                        // Cache area data for display purposes  
                        if (!this.areaData) this.areaData = {};
                        
                        areas.forEach(area => {
                            // Store in cache
                            this.areaData[area.area_id] = area.area_name;
                            
                            const isSelected = selectedValue === area.area_id ? 'selected' : '';
                            options += `<option value="${area.area_id}" ${isSelected}>${area.area_name}</option>`;
                        });
                        
                        // Update the specific cell dropdown
                        $(`.ptc-cell-select[data-field="area"][data-row="${rowIndex}"]`).html(options);
                    }
                }
            });
        }
    };

    // Initialize the enhanced system
    PTCEnhanced.init();
    
    // Make it globally available
    window.PTCEnhanced = PTCEnhanced;
});