# PHP SDK

*Breadcrumbs: Docs > / > SDKs*

---

*Official URL: https://tosend.com/docs/sdks/php/*

Official PHP SDK for the toSend email API.

* **Package**: `tosend/tosend-php`
* **Requirements**: PHP 7.4+, cURL extension
* **Repository**: [tosend/tosend-php](https://github.com/tosend/tosend-php)

## Installation

### With Composer

```bash
composer require tosend/tosend-php
```

### Without Composer

The SDK has no external dependencies, so you can use it without Composer:

1. Download [`src/Api.php`](https://github.com/tosend/tosend-php/blob/master/src/Api.php) and [`src/ToSendException.php`](https://github.com/tosend/tosend-php/blob/master/src/ToSendException.php) (plus [`src/AdminApi.php`](https://github.com/tosend/tosend-php/blob/master/src/AdminApi.php) for the Admin API)
2. Place them anywhere in your project
3. Include them in your code:

```php
require_once 'path/to/ToSendException.php';
require_once 'path/to/Api.php';

$tosend = new ToSend\Api('tsend_your_api_key');
```

> [!TIP] **Tip**
> The SDK only requires PHP 7.4+ with the `curl` and `json` extensions, which are included in most PHP installations.

## Quick Start

```php
use ToSend\Api;

$tosend = new Api('tsend_your_api_key');

$response = $tosend->send([
    'from' => [
        'email' => 'hello@yourdomain.com',
        'name' => 'Your App'
    ],
    'to' => [
        ['email' => 'user@example.com']
    ],
    'subject' => 'Hello from toSend!',
    'html' => '<h1>Welcome!</h1><p>Thanks for signing up.</p>'
]);

echo $response['message_id'];
```

## Configuration

### Simple

```php
$tosend = new ToSend\Api('tsend_your_api_key');
```

### Custom Base URL

```php
$tosend = new ToSend\Api('tsend_your_api_key');
$tosend->setBaseUrl('https://custom-api.example.com');
```

## Send Email

### Basic Email

```php
$response = $tosend->send([
    'from' => [
        'email' => 'hello@yourdomain.com',
        'name' => 'Your App'  // optional
    ],
    'to' => [
        ['email' => 'user@example.com'],
        ['email' => 'another@example.com', 'name' => 'John Doe']
    ],
    'subject' => 'Welcome!',
    'html' => '<h1>Hello</h1>',
    'text' => 'Hello'  // optional, auto-generated from HTML if not provided
]);
```

### With CC, BCC, and Reply-To

```php
$response = $tosend->send([
    'from' => ['email' => 'hello@yourdomain.com'],
    'to' => [['email' => 'user@example.com']],
    'cc' => [['email' => 'cc@example.com']],
    'bcc' => [['email' => 'bcc@example.com']],
    'reply_to' => ['email' => 'support@yourdomain.com', 'name' => 'Support'],
    'subject' => 'Hello',
    'html' => '<p>Hello World</p>'
]);
```

### With Attachments

```php
$response = $tosend->send([
    'from' => ['email' => 'hello@yourdomain.com'],
    'to' => [['email' => 'user@example.com']],
    'subject' => 'Your Invoice',
    'html' => '<p>Please find your invoice attached.</p>',
    'attachments' => [
        [
            'type' => 'application/pdf',
            'name' => 'invoice.pdf',
            'content' => base64_encode(file_get_contents('invoice.pdf'))
        ]
    ]
]);
```

## Batch Sending

Send multiple emails in a single request:

```php
$response = $tosend->batch([
    [
        'from' => ['email' => 'hello@yourdomain.com'],
        'to' => [['email' => 'user1@example.com']],
        'subject' => 'Hello User 1',
        'html' => '<p>Hello!</p>'
    ],
    [
        'from' => ['email' => 'hello@yourdomain.com'],
        'to' => [['email' => 'user2@example.com']],
        'subject' => 'Hello User 2',
        'html' => '<p>Hello!</p>'
    ]
]);

foreach ($response['results'] as $result) {
    if ($result['status'] === 'success') {
        echo "Sent: " . $result['message_id'] . "\n";
    } else {
        echo "Failed: " . $result['message'] . "\n";
    }
}
```

## Account Info

```php
$info = $tosend->getAccountInfo();

echo "Status: " . $info['account']['status'] . "\n";
echo "Credits: " . ($info['account']['credit_balance'] ?? 'unlimited') . "\n";

foreach ($info['domains'] as $domain) {
    echo $domain['domain_name'] . ": " . $domain['verification_status'] . "\n";
}
```

## Error Handling

```php
use ToSend\Api;
use ToSend\ToSendException;

try {
    $response = $tosend->send([
        'from' => ['email' => 'hello@yourdomain.com'],
        'to' => [['email' => 'user@example.com']],
        'subject' => 'Hello',
        'html' => '<p>Hello</p>'
    ]);
} catch (ToSendException $e) {
    echo "Error: " . $e->getMessage() . "\n";
    echo "Code: " . $e->getCode() . "\n";

    // Get detailed validation errors (a string per field, or an array of messages)
    foreach ($e->getErrors() as $field => $messages) {
        foreach ((array) $messages as $message) {
            echo "$field: $message\n";
        }
    }
}
```

## Admin API

`ToSend\AdminApi` is a separate client for the [Admin API](/docs/api/admin-api). It takes an admin key (`tsend_admin_...`) and refuses a sending key at construction. Each call needs the matching [scope](/docs/api/admin-api#scopes) on the key.

```php
$admin = new \ToSend\AdminApi(getenv('TOSEND_ADMIN_KEY'));

// Act on one of your client teams (sends X-Account-Id)
$client = $admin->forAccount(4203);

$domain = $client->createDomain('client.example.com');
$detail = $client->getDomain($domain['id']);
print_r($detail['dns_records']['dkim']); // show these records to your client

// Needs api_keys:write and emails:send
$key = $client->createSendingKey('Client: Acme Corp');
echo $key['api_key']; // returned once, store it now

// Needs emails:send
$client->send([
    'from'    => ['email' => 'hello@client.example.com'],
    'to'      => [['email' => 'user@example.com']],
    'subject' => 'Hi',
    'html'    => '<p>Hello</p>',
]);
```

Also available: `getInfo` (checks the key and lists its scopes), `listDomains`, `deleteDomain`, `listEmails`, `getEmail`, `listSuppressions`, `deleteSuppression`, `listWebhooks`, `createWebhook`, `updateWebhook`, `deleteWebhook`, `listSendingKeys`, `deleteSendingKey`, `listTeams`, `createTeam`, `updateTeam` and `batch`. List methods take `page` and `per_page` and return `data`, `total`, `page` and `per_page`.

## API Reference

### `new Api(string $apiKey)`

Create a new Api instance with your API key.

### `send(array $params): array`

Send a single email. Returns `['message_id' => '...']` on success.

**Parameters:**

* `from` (required) - Sender address `['email' => '...', 'name' => '...']`
* `to` (required) - Array of recipient addresses
* `subject` (required) - Email subject
* `html` (required unless `text` is set) - HTML content
* `text` (optional) - Plain text content, auto-generated from `html` if omitted
* `cc` (optional) - Array of CC addresses
* `bcc` (optional) - Array of BCC addresses
* `reply_to` (optional) - Reply-to address
* `attachments` (optional) - Array of attachments

### `batch(array $emails): array`

Send multiple emails. Returns `['results' => [...]]` with status for each email.

### `getAccountInfo(): array`

Get account and domain information.

### `setBaseUrl(string $url): self`

Set a custom API base URL (useful for testing).
