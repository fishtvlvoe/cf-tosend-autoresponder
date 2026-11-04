# SDKs

*Breadcrumbs: Docs > / > SDKs*

---

*Official URL: https://tosend.com/docs/sdks/*

Official SDKs for integrating toSend into your applications.

## Available SDKs

| Language | Package | Install |
| --- | --- | --- |
| Node.js | tosend | npm install tosend |
| Python | tosend | pip install tosend |
| Go | github.com/tosend/tosend-go | go get github.com/tosend/tosend-go |
| Laravel | tosend/tosend-laravel | composer require tosend/tosend-laravel |
| PHP | tosend/tosend-php | composer require tosend/tosend-php |

## Quick Start

Choose your language to get started:

Node.jsPythonGoLaravelPHP

```typescript
import { ToSend } from 'tosend';

const tosend = new ToSend('tsend_your_api_key');

await tosend.send({
  from: { email: 'hello@yourdomain.com', name: 'Your App' },
  to: [{ email: 'user@example.com' }],
  subject: 'Welcome!',
  html: '<h1>Hello!</h1>',
});
```

```python
from tosend import ToSend

client = ToSend("tsend_your_api_key")

response = client.send(
    from_address={"email": "hello@yourdomain.com", "name": "Your App"},
    to=[{"email": "user@example.com"}],
    subject="Welcome!",
    html="<h1>Hello!</h1>",
)
```

```go
client := tosend.New("tsend_your_api_key")

resp, err := client.Send(&tosend.SendEmailRequest{
    From:    tosend.Address{Email: "hello@yourdomain.com", Name: "Your App"},
    To:      []tosend.Address{{Email: "user@example.com"}},
    Subject: "Welcome!",
    HTML:    "<h1>Hello!</h1>",
})
```

```php
use ToSend\Laravel\Facades\ToSend;

ToSend::send([
    'from' => ['email' => 'hello@yourdomain.com', 'name' => 'Your App'],
    'to' => [['email' => 'user@example.com']],
    'subject' => 'Welcome!',
    'html' => '<h1>Hello!</h1>',
]);
```

```php
$tosend = new ToSend\Api('tsend_your_api_key');

$response = $tosend->send([
    'from' => ['email' => 'hello@yourdomain.com', 'name' => 'Your App'],
    'to' => [['email' => 'user@example.com']],
    'subject' => 'Welcome!',
    'html' => '<h1>Hello!</h1>',
]);
```

## Common Features

All SDKs support:

* **Send Email** - Send transactional emails with HTML and plain text
* **Batch Sending** - Send multiple emails in a single request
* **Attachments** - Include file attachments with your emails
* **CC/BCC** - Carbon copy and blind carbon copy recipients
* **Reply-To** - Custom reply-to addresses
* **Account Info** - Retrieve account details and domain status
* **Error Handling** - Detailed error responses with validation messages

## Source Code

All SDKs are open source and available on GitHub:

* [tosend/tosend-node](https://github.com/tosend/tosend-node)
* [tosend/tosend-python](https://github.com/tosend/tosend-python)
* [tosend/tosend-go](https://github.com/tosend/tosend-go)
* [tosend/tosend-laravel](https://github.com/tosend/tosend-laravel)
* [tosend/tosend-php](https://github.com/tosend/tosend-php)
