# Webhooks

*Breadcrumbs: Docs > / > User guide*

---

*Official URL: https://tosend.com/docs/guide/webhooks/*

Webhooks notify your application in real-time when email events occur, such as bounces or spam complaints.

## Creating a Webhook

1. Go to **Webhooks** in your dashboard
2. Click **Create Webhook**
3. Enter your endpoint URL (a public host name on port 443, 80 or 8080; use HTTPS)
4. Select the events you want to receive
5. Optionally, restrict to a specific domain
6. Click **Create Webhook**

## Events

| Event | Description |
| --- | --- |
| bounced | Email could not be delivered (hard or soft bounce) |
| complaint | Recipient marked the email as spam |

These two are the complete list. There are no `delivered`, `opened` or `clicked` events.

> [!NOTE] **Why there is no unsubscribe event**
> We pass your own `List-Unsubscribe` and `List-Unsubscribe-Post` headers through untouched, so a
> one-click unsubscribe goes straight from the recipient’s mail client to the URL you nominated.
> The opt-out reaches your application directly and never needs a round trip through us, which is
> why there is nothing for us to send you an event about.
> 
> Bounces and complaints are different: those originate at the receiving mail server rather than
> with you, so we are the only ones who can tell you about them. We also add every hard-bounced and
> complained address to your suppression list automatically, whether or not you consume these
> webhooks.

## Request Headers

Every webhook `POST` includes:

| Header | Description |
| --- | --- |
| Content-Type | application/json |
| User-Agent | ToSend-Webhook/2.0 |
| X-ToSend-Event | Event type:bouncedorcomplaint |
| X-ToSend-Timestamp | ISO-8601 UTC timestamp of dispatch |
| X-ToSend-Signature | sha256=<hex>HMAC signature (only when the webhook has a secret configured) |

## Webhook Payload

When an event occurs, toSend sends a `POST` request with this top-level shape:

```json
{
  "type": "bounced",
  "data": { /* event-specific fields */ },
  "created_at": "2026-04-18T10:30:00.000Z"
}
```

| Field | Type | Description |
| --- | --- | --- |
| type | string | Event type:bouncedorcomplaint |
| data | object | Event-specific payload (see below) |
| created_at | string | ISO-8601 UTC timestamp when the webhook was dispatched |
| mail | object | Present only wheninclude_messageis enabled (see below) |

### Bounce Event

```json
{
  "type": "bounced",
  "data": {
    "email": "recipient@example.com",
    "bounce_type": "Permanent",
    "bounce_sub_type": "General",
    "is_hard_bounce": true,
    "sender_fault": false,
    "reason": "smtp; 550 5.1.1 The email account does not exist",
    "timestamp": "2026-04-18T10:29:58.000Z",
    "message_id": "msg_abc123..."
  },
  "created_at": "2026-04-18T10:30:00.000Z"
}
```

| dataField | Type | Description |
| --- | --- | --- |
| email | string | The recipient address that bounced. Always a bare address (user@example.com), never aDisplay Name <user@example.com>form, so it can be compared or looked up directly. |
| bounce_type | string | Permanent,Transient, orUndetermined. It issuppressionwhen the send was stopped because the address was already on your suppression list. |
| bounce_sub_type | string | E.g.General,NoEmail,Suppressed,OnAccountSuppressionList,SuppressionList(already on your suppression list),NoMxRecords(the recipient domain has no mail server; sent as aPermanentbounce without attempting delivery).SenderBlocklistedmeans the receiving server rejected the sending IP on a public blocklist; the address is fine and is not suppressed. |
| is_hard_bounce | boolean | truefor permanent bounces,falsefor soft |
| sender_fault | boolean | truewhen the bounce was caused by the message or the sending side (ContentRejected,MessageTooLarge,AttachmentRejected,SenderBlocklisted) rather than the recipient. Do not penalise the recipient when this istrue. |
| reason | string | SMTP diagnostic message |
| timestamp | string | When the bounce was reported |
| message_id | string | Themessage_idreturned when you sent the email |

> [!TIP] **is_hard_bounceis a JSON boolean, not a string**
> Branch on `is_hard_bounce` to decide whether to unsubscribe a contact: `true` means the address is permanently undeliverable, `false` means a temporary failure you should leave alone.
> 
> It is a real JSON boolean, so after decoding you have `true`, not the string `"true"`. In PHP and WordPress in particular, casting it to a string first gives `"1"` and `""`, which is a common source of conditions that never match. Compare the decoded value directly.

### What toSend already does for you

You do not need to suppress these addresses yourself. toSend stops sending to them automatically, and releases them on its own:

| Event | Held for |
| --- | --- |
| Hard bounce | 60 days |
| Soft bounce (mailbox full) | 24 hours, then sending resumes automatically |
| Other soft bounce | 2 hours, from the second one within 2 hours (a single one is not held) |
| Complaint | 180 days |

So there is nothing to un-suppress after a soft bounce. Use the webhook to update your own contact records; the sending side is already handled. You can view and remove entries at any time from the **Suppressions** page.

### Complaint Event

```json
{
  "type": "complaint",
  "data": {
    "email": "recipient@example.com",
    "feedback_type": "abuse",
    "reason": "abuse",
    "timestamp": "2026-04-18T10:29:58.000Z",
    "message_id": "msg_abc123..."
  },
  "created_at": "2026-04-18T10:30:00.000Z"
}
```

| dataField | Type | Description |
| --- | --- | --- |
| email | string | The recipient who complained. Always a bare address, as with bounce events. |
| feedback_type | string | ARF feedback type (abuse,fraud,other, etc.) |
| reason | string | Same asfeedback_type |
| timestamp | string | When the complaint was reported |
| message_id | string | Themessage_idreturned when you sent the email |

### Include Message Content

Set `include_message` to `true` when you create or update a webhook through the [Admin API](/docs/api/admin-api) to receive the full email metadata alongside the event. The dashboard does not show this option. Useful for debugging; increases payload size.

When enabled, a `mail` object is added at the top level:

```json
{
  "type": "bounced",
  "data": { "...": "..." },
  "created_at": "2026-04-18T10:30:00.000Z",
  "mail": {
    "id": "msg_abc123...",
    "subject": "Welcome to our platform",
    "from_name": "Your App",
    "from_email": "noreply@yourdomain.com",
    "reply_to": "support@yourdomain.com",
    "to_details": [{ "email": "recipient@example.com", "name": "John" }],
    "other_recipients": { "cc": [], "bcc": [] },
    "custom_headers": { "X-Campaign": "welcome-v2" },
    "status": "bounced",
    "error_message": "smtp; 550 5.1.1 The email account does not exist",
    "created_at": "2026-04-18T10:28:14.000Z"
  }
}
```

| Field | Type | Description |
| --- | --- | --- |
| mail.id | string | Themessage_id(same asdata.message_id) |
| mail.subject | string | Email subject line |
| mail.from_name | string \| null | Sender display name |
| mail.from_email | string | Sender email address |
| mail.reply_to | string \| null | Reply-to address |
| mail.to_details | array | torecipients[{email, name}] |
| mail.other_recipients | object | { cc: [...], bcc: [...] } |
| mail.custom_headers | object \| null | Custom headers supplied at send time |
| mail.status | string | Log status:sent,bounced,complained,suppressed,failed |
| mail.error_message | string \| null | Error message if delivery failed |
| mail.created_at | string | When the email was accepted (ISO-8601 UTC) |

> [!NOTE] **Note**
> `mail` does **not** include `html` or `text` bodies. Request bodies are stored in object storage and are not replayed in webhooks.

## Verifying Signatures

When a webhook has a secret configured, every request is signed with HMAC-SHA256 over the raw request body using your secret. The hex digest is sent in the `X-ToSend-Signature` header as `sha256=<hex>`.

Compute the same HMAC on your side and compare in constant time:

```javascript
// Node.js / Express: receive the raw body (not the parsed JSON)
import crypto from 'node:crypto';
import express from 'express';

const app = express();

app.post(
  '/webhooks/tosend',
  express.raw({ type: 'application/json' }),
  (req, res) => {
    const signature = req.header('X-ToSend-Signature') || '';
    const expected =
      'sha256=' +
      crypto
        .createHmac('sha256', process.env.TOSEND_WEBHOOK_SECRET)
        .update(req.body) // Buffer of the raw bytes
        .digest('hex');

    const ok =
      signature.length === expected.length &&
      crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));

    if (!ok) return res.status(401).send('Invalid signature');

    const event = JSON.parse(req.body.toString('utf8'));
    res.status(200).json({ received: true });
    processWebhook(event);
  },
);
```

```python
# Python / Flask
import hmac, hashlib, os
from flask import Flask, request, abort

app = Flask(__name__)

@app.post("/webhooks/tosend")
def tosend_webhook():
    secret = os.environ["TOSEND_WEBHOOK_SECRET"].encode()
    expected = "sha256=" + hmac.new(secret, request.data, hashlib.sha256).hexdigest()
    sig = request.headers.get("X-ToSend-Signature", "")
    if not hmac.compare_digest(sig, expected):
        abort(401)
    # request.get_json() is safe to call after signature verification
    return {"received": True}, 200
```

> [!WARNING] **Use the raw body**
> Signatures are computed over the exact bytes sent. If your framework parses and re-serializes JSON before you verify, the signature will not match. Always verify against the raw request body.

## Domain Scoping

* **All Domains**: Receive events for all domains in your account
* **Specific Domain**: Only receive events for the selected domain

## Managing Webhooks

### Update a Webhook

Click **Edit** on a webhook to change:

* Endpoint URL
* Event subscriptions
* Domain scope
* Status (Active/Disabled)

### Delete a Webhook

1. Find the webhook in your list
2. Click **Delete**
3. Confirm deletion

## Responding to Webhooks

Your endpoint must acknowledge each event with:

1. A `2xx` status code, such as `200`
2. A JSON body with `Content-Type: application/json`, such as `{"received": true}`
3. A response within 10 seconds, so process the event asynchronously if that takes longer

```javascript
// Example Express.js handler
app.post('/webhooks/tosend', (req, res) => {
  const event = req.body;

  // Acknowledge immediately
  res.status(200).json({ received: true });

  // Process asynchronously
  processWebhook(event);
});
```

## Delivery and Failures

**Each event is delivered once.** If your endpoint returns a non-2xx status, answers with an HTML page, or does not respond within 10 seconds, the delivery is recorded as failed in the webhook log in your dashboard and is **not** retried. The event is not queued for later.

This means a webhook endpoint that is down, even briefly, loses the events it missed. If that matters for your use case, reconcile against the **Logs** page, which holds every bounce and complaint for 14 days regardless of webhook outcome, and your **Suppressions** list, which is not pruned.

The webhook log in your dashboard shows the status code, the `Content-Type`, and the first 500 bytes of each response your endpoint sent, so you can see what actually answered.

> [!WARNING] **A 2xx HTML page is recorded as failed**
> Something in front of your application, such as a firewall, a bot-protection layer, or a hosting security module, can answer with a 2xx of its own while your code never runs. When a 2xx response is an HTML page, toSend records the delivery as failed and shows the page it received.
> 
> If your log shows successful deliveries while your handler logs nothing, check the response body in the log. It should be the JSON your handler sent. Then test your endpoint from an external machine that has never visited your site.

## Best Practices

* **Use HTTPS**: `http://` endpoints are accepted, but the payload then travels unencrypted
* **Respond quickly**: Return a 2xx JSON response within 10 seconds, then process asynchronously
* **Handle duplicates**: The same event may be delivered more than once, so dedupe on `data.message_id` + `type`
* **Verify the signature**: Always check `X-ToSend-Signature` against the raw request body when a secret is configured
