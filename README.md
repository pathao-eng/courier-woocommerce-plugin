# Pathao Courier Plugin For WordPress Woocommerce

## Description

This WordPress plugin is designed to enhance your website's functionality by providing courier service features.
Whether you need seamless package tracking or a user-friendly way to manage deliveries, our plugin has you covered.

![img_7.png](screenshots%2Fimg_7.png)
![img_8.png](screenshots%2Fimg_8.png)
## Features

- Easy to implement
- Sync orders to the Pathao Merchant Panel
- Webhook Implementations
- Realtime order status updates

## Features v.1.1.0
- Added order creation without city/zone/area.
- Separate order list template
- New template for the "All Orders" page and Added a general settings page.
- Added date and limit filter on the template page.
## Bug Fixes
- Fixed CSS style for modal.
- Changed in validation UI response.
- Changed default weight value
- Default weight 1kg to 0.5kg
- Refactored the codes.
- Refactored all endpoints.

## Requirements
- Requires at least: 6.0
- Tested up to: 6.4
- Requires PHP: 7.3
- Stable tag: 3.18.3
- Beta tag: 3.18.0-beta4
- License: GPLv3


## Installation

1. Download the plugin zip file.

![img.png](screenshots%2Fimg.png)

2. **Upload Plugin:**
   - Go to the WordPress admin dashboard and navigate to 'Plugins > Add New Plugin'.

     ![img_1.png](screenshots%2Fimg_1.png)

   - Click 'Upload Plugin' and choose the zip file you just downloaded.

     ![img_2.png](screenshots%2Fimg_2.png)

   - Click 'Install Now' and activate the plugin.

     ![img_3.png](screenshots%2Fimg_3.png)

   - Or, unzip the file on your computer and upload the 'wordpress-pathao-courier-plugin' folder via FTP to your '/wp-content/plugins/' directory.

4. **Setup Plugin:**
   - Go to the WordPress admin dashboard and navigate to 'Settings > Pathao Courier'.
     You will see a page 'Pathao Courier Settings' with the following options:

     ![img_4.png](screenshots%2Fimg_4.png)

   - Client ID: Enter your client ID and Client Secret Key. which you will get from Pathao [Merchant Panel](https://merchant.pathao.com/courier/developer-api).

     ![img_5.png](screenshots%2Fimg_5.png)

   - Webhook URL: Enter your webhook URL which you will get from Pathao [Merchant Panel](https://merchant.pathao.com/courier/developer-api).

     ![img_6.png](screenshots%2Fimg_6.png)

   - Click 'Save Changes' to save your settings.
## Usage

To use follow these steps:

1. Add any product to the cart. Then go to the checkout page.
2. Fill up the billing details and place the order.
3. Go to the admin panel and check the order Woocommerce -> orders.

![img_7.png](screenshots%2Fimg_7.png)

5. Click on the button 'Send with Pathao' to send the order to the Pathao Merchant Panel.
6. You will see a modal with the order details. Fill up the details and click on the button 'Send to Pathao'.

![img_8.png](screenshots%2Fimg_8.png)


## Support

If you have any questions or need help, please contact us at 

- Email: [support@pathao.com](mailto:support@pathao.com)
- Phone: [+8809610003030](tel:+8809610003030)

## Note
If you are facing any issues with latest plugin version, you can use the previous version of the plugin from [here](https://github.com/pathao-eng/courier-woocommerce-plugin/releases/tag/1.0.4).

> **License:** This plugin is released under the [GPL V3](https://github.com/pathao-eng/courier-woocommerce-plugin/blob/main/license.txt).

