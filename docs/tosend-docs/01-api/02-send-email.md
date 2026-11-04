# Send Email

*Breadcrumbs: Docs > / > API reference*

---

*Official URL: https://tosend.com/docs/api/send-email/*

Send a single email to one or more recipients.

## Endpoint

```plaintext
POST /v2/emails
```

## Request Body

**Authentication:** Send your API key via the `Authorization: Bearer <api_key>` header.

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| from | object | Yes | Sender information |
| to | array | Yes | Array of recipient objects withemail(required) andname(optional). Max 50 recipients, and 50 in total acrossto,ccandbcc. |
| subject | string | Yes | Email subject line |
| html | string | No* | HTML content of the email |
| text | string | No* | Plain text content of the email |
| cc | array | No | Array of CC recipients withemail(required) andname(optional). Max 50. |
| bcc | array | No | Array of BCC recipients withemail(required) andname(optional). Max 50. |
| reply_to | object \| string | No | Reply-to address: object{ email, name }or an RFC 5322 string like"Support <support@acme.com>" |
| headers | object | No | Custom email headers (string keys and values). Values must be printable US-ASCII. SeeCustom Headers |
| attachments | array | No | Array of attachment objects. Total decoded size must be ≤ 10 MB |
| message_hash | string | No | Accepted for compatibility and ignored. toSend always generates themessage_id. SeeMessage ID |

\*At least one of `html` or `text` is required. If only `html` is provided, a plain text version is automatically generated.

### Limits

* **Subject**: ≤ 998 characters (RFC 5322 line length)
* **Recipients**: up to 50 each in `to`, `cc`, `bcc`, and 50 in total across all three
* **Attachments**: ≤ 10 MB total (sum of decoded sizes). Allowed MIME types include PDF, Office documents, text, common images, and common archives
* **Batch**: see [Batch Emails](/docs/api/batch-emails), up to 100 emails per request

### From Object

```json
{
  "name": "John Doe",
  "email": "john@yourdomain.com"
}
```

The `from` email domain must be verified in your toSend account.

### To Array

The `to` field must be an array of recipient objects. Each object requires an `email` field, and `name` is optional.

```json
{
  "to": [
    {
      "email": "jane@example.com"
    },
    {
      "name": "John Doe",
      "email": "john@example.com"
    }
  ]
}
```

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| email | string | Yes | Recipient email address |
| name | string | No | Recipient display name. If it would make the address longer than 320 characters once encoded, the name is dropped and the email is sent to the bare address. |

### CC and BCC Arrays

Same format as `to` - an array of objects with `email` (required) and `name` (optional):

```json
{
  "cc": [
    { "email": "manager@example.com" }
  ],
  "bcc": [
    { "name": "Archive", "email": "archive@example.com" }
  ]
}
```

### Reply-To

Either an object or an RFC 5322 string:

```json
{ "name": "Support Team", "email": "support@yourdomain.com" }
```

```json
"Support Team <support@yourdomain.com>"
```

A plain address string like `"support@yourdomain.com"` is also accepted. A `reply_to` of the wrong type (a number or an array) is ignored, but a malformed address is rejected with a `422`.

### Custom Headers

Pass additional headers as an object of string keys and values:

```json
{
  "headers": {
    "List-Unsubscribe": "<https://acme.com/unsubscribe/abc>",
    "X-Customer-Id": "cust_42"
  }
}
```

**Header values must be printable US-ASCII** (characters `0x20`–`0x7E`). This is
the email standard: header values are ASCII, and anything else (an accent, a
tab, a control character) is rejected with a `422`.

To send non-ASCII text in a header, encode it as an RFC 2047 encoded-word. For
example, `Boletín Mensual` becomes:

```json
{
  "headers": {
    "List-ID": "=?UTF-8?B?Qm9sZXTDrW4gTWVuc3VhbA==?= <list.acme.com>"
  }
}
```

Mail clients decode it back to the original text on display. Most mail libraries
have a helper for this (`mime.BEncoding.Encode` in Go, `Mail::Encodings` /
`mb_encode_mimeheader` in PHP, `email.header.Header` in Python).

`subject`, display names in `from`/`to`/`cc`/`bcc`, and the message body are
**not** subject to this rule. Send those as plain UTF-8 and toSend encodes
them for you.

Headers with dedicated API fields or ones generated at send time (`Subject`,
`From`, `To`, `Cc`, `Bcc`, `Sender`, `Date`, `Message-ID`, `Received`,
`Return-Path`, `MIME-Version`, `Content-Type`, `Content-Transfer-Encoding`,
`Content-Disposition`, `DKIM-Signature`, `Authentication-Results`) are dropped if supplied.
`Reply-To` is the exception: it is moved into the `reply_to` field rather than
dropped.

### Message ID

toSend generates a unique `message_id` for every email and returns it in the response. A `message_hash` in the request is accepted (up to 255 characters) but not used, so store the returned `message_id` against your own record to cross-reference it later, for example with the Admin API’s `GET /v2/emails/{message_id}`.

toSend does **not** deduplicate requests: sending the same email twice dispatches two emails. If you need idempotency, track what you have sent in your own application.

### Attachment Object

```json
{
  "type": "application/pdf",
  "name": "invoice.pdf",
  "content": "base64_encoded_content_here"
}
```

## Example Request

```bash
curl -X POST https://api.tosend.com/v2/emails \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your_api_key" \
  -d '{
    "from": {
      "name": "Acme Inc",
      "email": "hello@acme.com"
    },
    "to": [
      {
        "email": "jane@example.com"
      },
      {
        "name": "John Doe",
        "email": "john@example.com"
      }
    ],
    "subject": "Welcome to Acme!",
    "html": "<h1>Welcome!</h1><p>Thanks for signing up.</p>",
    "text": "Welcome! Thanks for signing up."
  }'
```

## Example with Attachments

```bash
curl -X POST https://api.tosend.com/v2/emails \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your_api_key" \
  -d '{
    "from": {
      "name": "Billing",
      "email": "billing@acme.com"
    },
    "to": [
      {
        "email": "customer@example.com"
      }
    ],
    "subject": "Your Invoice",
    "html": "<p>Please find your invoice attached.</p>",
    "attachments": [
      {
        "type": "application/pdf",
        "name": "invoice-001.pdf",
        "content": "JVBERi0xLjQKJ..."
      }
    ]
  }'
```

## Success Response

```json
{
  "message_id": "a1b2c3d4e5f6789..."
}
```

The `message_id` can be used to track the email status.

## Error Responses

### Missing API Key (401)

```json
{
  "status_code": 401,
  "message": "API key required. Provide via Authorization header or api_key field."
}
```

### Invalid API Key (401)

```json
{
  "status_code": 401,
  "message": "Invalid API key"
}
```

### Domain Not Verified (422)

```json
{
  "status_code": 422,
  "message": "Domain acme.com is not verified"
}
```

If the domain is not on your account at all, the message is `Domain acme.com not found for this account`.

### Domain Not Allowed for API Key (422)

```json
{
  "status_code": 422,
  "message": "API key is restricted to a different domain"
}
```

### Insufficient Credits (403)

```json
{
  "status_code": 403,
  "message": "Insufficient credit balance",
  "errors": {
    "credit_balance": "1000",
    "current_usage": "3000",
    "available": "-2000"
  }
}
```

### Missing Content (422)

```json
{
  "status_code": 422,
  "message": "Validation failed",
  "errors": {
    "subject": "\"subject\" is required and must be a non-empty string",
    "body": "At least one of \"html\" or \"text\" must be provided"
  }
}
```

### Too Many Recipients (422)

```json
{
  "status_code": 422,
  "message": "Validation failed",
  "errors": {
    "to": "\"to\" must contain no more than 50 recipients"
  }
}
```

More than 50 recipients across `to`, `cc` and `bcc` combined is reported under `errors.recipients`.

## Notes

* Disposable/temporary recipient addresses are filtered out before sending. Mixed batches (some valid, some disposable) still send to the valid recipients; dropped `to` addresses are recorded under `meta.spam_recipients` in the email log.
* If **all** recipients are disposable, the request is rejected with `403` and a single `spam` log row is created.
* The `from` email domain must be verified in your account before sending.
* Suppression checks (hard bounces, complaints) are performed just before dispatch, not during the API request. A `200` response does not guarantee the email will be sent; check the email log for final status.
