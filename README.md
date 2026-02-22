# Pathao Courier Plugin For WordPress WooCommerce

## Description

This WordPress plugin is designed to enhance your website's functionality by providing courier service features.
Whether you need seamless package tracking or a user-friendly way to manage deliveries, our plugin has you covered.

![img_7.png](screenshots%2Fimg_7.png)
![img_8.png](screenshots%2Fimg_8.png)
## Features

- Easy to implement
- Sync orders to the Pathao Merchant Panel
- Webhook Implementations
- Real-time order status updates
- Bulk Order Creation

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

   - Client ID: Enter your client ID and Client Secret Key, which you will get from Pathao [Merchant Panel](https://merchant.pathao.com/courier/developer-api).

     ![img_5.png](screenshots%2Fimg_5.png)

   - Webhook URL: Enter your webhook URL, which you will get from Pathao [Merchant Panel](https://merchant.pathao.com/courier/developer-api).

     ![img_6.png](screenshots%2Fimg_6.png)

   - Click 'Save Changes' to save your settings.
## Usage

To use, follow these steps:

1. Add any product to the cart. Then go to the checkout page.
2. Fill up the billing details and place the order.
3. Go to the admin panel and check the order Woocommerce -> orders.

![img_7.png](screenshots%2Fimg_7.png)

5. Click on the 'Send with Pathao' button to send the order to the Pathao Merchant Panel.
6. You will see a modal with the order details. Fill in the details and click on the 'Send to Pathao' button.

![img_8.png](screenshots%2Fimg_8.png)

### Bulk Order Creation

You can now create orders in bulk!

1. **Preload Location Data (Recommended):**
   - Go to **Settings > Pathao Courier**.
   - Click the **Preload City, Zone & Area** button. This fetches and caches all location data for faster loading.

   ![img_9.png](screenshots%2Fimg_9.png)

2. **Select Orders:**
   - Go to **WooCommerce > Orders**.
   - Select the orders you want to send.
   - Choose **Send with Pathao** from the Bulk Actions dropdown and click **Apply**.

3. **Bulk Order Modal:**
   - If you haven't preloaded data, you will see a prompt to fetch it.

     ![img_10.png](screenshots%2Fimg_10.png)

   - Once loaded, you will see a grid view of your orders.
   - **City, Zone, and Area** will be automatically selected if you store data for any of these meta keys.
   ```
   _billing_pathao_city
   _billing_pathao_zone
   _billing_pathao_area

   _shipping_pathao_city
   _shipping_pathao_zone
   _shipping_pathao_area
      
   ```
   - You can edit any details directly in the grid.

     ![img_11.png](screenshots%2Fimg_11.png)

   - Click **Confirm** to create all orders at once.


## Note
If you are facing any issues with the latest plugin version, you can use the previous version of the plugin from [here](https://github.com/pathao-eng/courier-woocommerce-plugin/releases/tag/1.0.4).

## License
This plugin is released under the [GPL V3](https://github.com/pathao-eng/courier-woocommerce-plugin/blob/main/license.txt).

## Support

If you have any questions or need help, please get in touch with us at

- Email: [support@pathao.com](mailto:support@pathao.com)
- Phone: [+8809610003030](tel:+8809610003030)
