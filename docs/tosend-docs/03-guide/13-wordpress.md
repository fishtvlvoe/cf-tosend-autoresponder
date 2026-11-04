# WordPress

*Breadcrumbs: Docs > / > User guide*

---

*Official URL: https://tosend.com/docs/guide/wordpress/*

Connect your WordPress site to toSend using the free [FluentSMTP](https://wordpress.org/plugins/fluent-smtp/) plugin.

## Installation

1. Install **FluentSMTP** from the WordPress plugin directory
2. Go to **Settings** → **FluentSMTP** in your WordPress admin
3. Click **Add Connection** and select **toSend** as your connection provider

![Select toSend Provider](/images/selector.png)

## Configuration

After selecting toSend, configure your connection settings:

![toSend Configuration](/images/config.png)

### Sender Settings

| Field | Description |
| --- | --- |
| From Email | Your sender email address (must use a verified domain) |
| From Name | The name that appears as the sender |
| Force From Email | Always use this email as the sender (recommended) |

### toSend API Settings

1. Get your API key from your [toSend dashboard](https://dash.tosend.com/app/api-keys)
2. Paste the API key in the **API Key** field
3. Click **Save Connection Settings**

> [!TIP] **Secure Storage**
> Your API key is securely encrypted using WordPress SALTS before saving to the database. You can also store the key in your `wp-config.php` file by selecting “Store in wp-config.php” and defining the `FLUENTMAIL_TOSEND_API_KEY` constant.

## Testing

After saving your settings:

1. Click **Send Test Email** in the FluentSMTP top bar
2. Enter a recipient email address
3. Click **Send Test Email**
4. Check your inbox to confirm delivery

## Features

FluentSMTP with toSend provides:

* **Email Logging**: View all sent emails in your WordPress admin
* **Delivery Reports**: Track successful deliveries and failures
* **Fallback Connection**: Configure a backup email provider
* **Multiple Connections**: Use different providers for different purposes

## Requirements

* WordPress 6.5 or higher
* PHP 7.4 or higher
* A verified domain in your toSend account

## Links

* [FluentSMTP Plugin](https://wordpress.org/plugins/fluent-smtp/)
* [FluentSMTP Documentation](https://fluentsmtp.com/docs/)
