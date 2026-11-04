# toSend Complete Developer Documentation & Integration Reference
> Downloaded for future project integrations: API, SDKs, Webhooks, SMTP, and MCP.
> Source: https://tosend.com/docs/

---

## Table of Contents

- [API Reference: API Introduction & Authentication](#api-introduction--authentication)
- [API Reference: Send Email](#send-email)
- [API Reference: Batch Emails](#batch-emails)
- [API Reference: Account Info](#account-info)
- [API Reference: Admin API](#admin-api)
- [SDKs: SDKs Overview](#sdks-overview)
- [SDKs: Node.js SDK](#nodejs-sdk)
- [SDKs: Python SDK](#python-sdk)
- [SDKs: PHP SDK](#php-sdk)
- [SDKs: Laravel SDK](#laravel-sdk)
- [SDKs: Go SDK](#go-sdk)
- [Guides: Documentation Overview](#documentation-overview)
- [Guides: Domains & Verification](#domains--verification)
- [Guides: DMARC Configuration](#dmarc-configuration)
- [Guides: API Keys](#api-keys)
- [Guides: Send with SMTP](#send-with-smtp)
- [Guides: AI Apps & Model Context Protocol (MCP)](#ai-apps--model-context-protocol-mcp)
- [Guides: Webhooks](#webhooks)
- [Guides: Email Logs](#email-logs)
- [Guides: Suppressions](#suppressions)
- [Guides: Metrics](#metrics)
- [Guides: Billing & Credits](#billing--credits)
- [Guides: Data Location & EU Region](#data-location--eu-region)
- [Guides: WordPress & FluentSMTP](#wordpress--fluentsmtp)
- [Migration: Migrate from FluentSMTP](#migrate-from-fluentsmtp)
- [Migration: Migrate from Resend](#migrate-from-resend)
- [Migration: Migrate from Postmark](#migrate-from-postmark)
- [Migration: Migrate from Mailgun](#migrate-from-mailgun)
- [Migration: Migrate from SendGrid](#migrate-from-sendgrid)

---


<a id="api-introduction--authentication"></a>

# Introduction

*Breadcrumbs: Docs > / > API reference*

---

*Official URL: https://tosend.com/docs/api/introduction/*

toSend is an email sending API that makes it easy to send transactional emails at scale, with reliable delivery and comprehensive tracking.

## Base URL

```plaintext
https://api.tosend.com
```

## Authentication

All API requests require authentication using an API key. Include your API key in the `Authorization` header:

```plaintext
Authorization: Bearer your_api_key_here
```

> [!TIP] **Tip**
> You can also send the API key in the request body as `api_key`. Header authentication is recommended.
> 
> ```json
> {
>   "api_key": "your_api_key_here"
> }
> ```

You can generate API keys from your [toSend dashboard](https://dash.tosend.com/app/api-keys). An API key can be restricted to a single sending domain for added security.

An [Admin API](/docs/api/admin-api) key (`tsend_admin_...`) that holds the `emails:send` scope can also send, but only in the `Authorization` header; the `api_key` body field is refused for admin keys.

## Response Format

All responses are returned in JSON format.

### Success Response

```json
{
  "message_id": "abc123def456..."
}
```

### Error Response

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

#### Error Response Fields

| Field | Type | Description |
| --- | --- | --- |
| status_code | integer | HTTP status code |
| message | string | Human-readable error message |
| errors | object | Field-specific errors, keyed by field name (for exampleto[0]orheaders.X-Foo), each value a message string (optional) |

Branch on the HTTP status code (or `status_code`); see [HTTP Status Codes](#http-status-codes) below. Only the per-item results of a [batch send](/docs/api/batch-emails) carry an `error_type` field.

## Rate Limits

Requests are rate limited per team: up to 100 requests per second on `POST /v2/emails` and 10 requests per second on `POST /v2/emails/batch`, measured over a 10-second window. Over the limit, the API returns `429` with a `Retry-After` header (in seconds). The `limit_per_second` value in [`GET /v2/info`](/docs/api/account-info) is informational and is not enforced.

## Per-Request Limits

| Limit | Value |
| --- | --- |
| Recipients per email (to,cc,bcc) | 50 each, and 50 in total across all three |
| Subject length | 998 characters |
| Total attachment size per email | 10 MB |
| Emails per batch request | 100 |

## HTTP Status Codes

| Code | Description |
| --- | --- |
| 200 | Success: all emails accepted |
| 207 | Multi-Status: batch where at least one entry failed validation or was all-disposable |
| 400 | Malformed JSON body |
| 401 | API key missing, invalid, or disabled |
| 403 | Account not active, insufficient credits, all recipients disposable, or an admin key without theemails:sendscope |
| 422 | Validation error, or the sender domain is not found, not verified, or not allowed for this API key |
| 429 | Rate limit exceeded |
| 500 | Server error |

## Response Headers

Successful send and batch responses include diagnostic headers you can log for support tickets:

| Header | Description |
| --- | --- |
| X-Tenant-Id | Numeric ID of the account that sent the request |
| X-Recipient-Count | Total recipients accepted for dispatch (after disposable filtering) |
| X-Step-Auth,X-Step-Validate | Server-side timings in milliseconds (single send only) |


---


<a id="send-email"></a>

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


---


<a id="batch-emails"></a>

# Batch Emails

*Breadcrumbs: Docs > / > API reference*

---

*Official URL: https://tosend.com/docs/api/batch-emails/*

Send multiple emails in a single API request. Each email in the batch is processed independently.

## Endpoint

```plaintext
POST /v2/emails/batch
```

## Request Body

**Authentication:** Send your API key via the `Authorization: Bearer <api_key>` header, or pass an `api_key` field in the wrapped request body (see below).

The batch endpoint accepts two body shapes:

**1. Wrapped object** (recommended):

```json
{
  "api_key": "tsend_...",   // optional if using Authorization header
  "emails": [ /* email objects */ ]
}
```

**2. Bare array**:

```json
[ /* email objects */ ]
```

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| emails | array | Yes (in wrapped form) | Array of 1–100 email objects |
| api_key | string | No | API key, as an alternative to theAuthorizationheader |

Each email object follows the same schema as the [Send Email](/docs/api/send-email) endpoint, including `reply_to`, `headers`, and `attachments`.

## Example Request

```bash
curl -X POST https://api.tosend.com/v2/emails/batch \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your_api_key" \
  -d '{
    "emails": [
      {
        "from": {
          "name": "Acme Inc",
          "email": "hello@acme.com"
        },
        "to": [
          { "email": "user1@example.com" },
          { "name": "Jane", "email": "jane@example.com" }
        ],
        "subject": "Welcome User 1!",
        "html": "<h1>Welcome!</h1>"
      },
      {
        "from": {
          "name": "Acme Inc",
          "email": "hello@acme.com"
        },
        "to": [
          { "email": "user2@example.com" }
        ],
        "subject": "Welcome User 2!",
        "html": "<h1>Welcome!</h1>"
      }
    ]
  }'
```

## Success Response

```json
{
  "results": [
    {
      "status": "success",
      "message_id": "a1b2c3d4e5f6789..."
    },
    {
      "status": "success",
      "message_id": "b2c3d4e5f6789a1..."
    }
  ]
}
```

The HTTP status is `200` when every email is accepted.

## Partial Success Response

When some emails fail validation, the response status is **`207 Multi-Status`**. The `results` array is returned in the same order as the input, and successful emails are still processed:

```json
{
  "results": [
    {
      "status": "success",
      "message_id": "a1b2c3d4e5f6789..."
    },
    {
      "status": "error",
      "status_code": 422,
      "error_type": "validation_error",
      "message": "Domain unknown.com not found for this account"
    },
    {
      "status": "spam",
      "message": "All recipient email addresses are marked as spam / disposable.",
      "errors": {
        "to": {
          "spam": "All recipient email addresses are marked as spam / disposable."
        }
      }
    }
  ]
}
```

## Result Statuses

| Status | Description |
| --- | --- |
| success | Email was accepted and queued for delivery |
| error | The item was rejected: validation failed, or the sender domain was not found, not verified, or not allowed for this key. Seemessage, anderrorswhen present |
| spam | All recipients were filtered as spam/disposable |

A failed item does not affect the rest of the batch; the others are still
accepted and queued. `errors` names the field that failed, so an item rejected
for a bad custom header reads:

```json
{
  "status": "error",
  "status_code": 422,
  "error_type": "validation_error",
  "message": "Validation failed",
  "errors": {
    "headers.List-ID": "Header value must be printable US-ASCII. Encode non-ASCII text as an RFC 2047 encoded-word (e.g. \"=?UTF-8?B?…?=\")"
  }
}
```

## Error Responses

### Empty Emails Array (422)

```json
{
  "status_code": 422,
  "message": "No emails provided"
}
```

A body that is neither an array nor an object with an `emails` array returns `422` with `Request body must be an array of emails or { emails: [...] }`.

### Batch Size Exceeded (422)

```json
{
  "status_code": 422,
  "message": "Maximum 100 emails per batch"
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

## Notes

* Maximum 100 emails per batch request
* Credit balance is checked against the **sum of all valid recipients** before any email is queued; if there isn’t enough credit for the whole batch, the request fails with `403`
* Each email in the batch is validated independently
* Failed emails do not affect the processing of other emails in the batch
* Results are returned in the same index order as the input array
* HTTP status is `200` when all emails succeed, `207` when at least one email returned `error` or `spam`
* The total recipient count across all emails counts toward your usage


---


<a id="account-info"></a>

# Account Info

*Breadcrumbs: Docs > / > API reference*

---

*Official URL: https://tosend.com/docs/api/account-info/*

Retrieve information about your toSend account and its sending domains. Useful for verifying an API key, checking credit balance before sending, and confirming domain verification status.

## Endpoint

```plaintext
GET /v2/info
```

## Authentication

Send your API key via the `Authorization` header:

```plaintext
Authorization: Bearer your_api_key
```

Called with an [Admin API](/docs/api/admin-api#checking-a-key) key (`tsend_admin_...`), this endpoint returns the admin view instead: the account the key acts on (including its 30-day bounce and complaint rates), the key and its scopes, and the domains only when the key has `domains:read`.

## Example Request

```bash
curl -X GET https://api.tosend.com/v2/info \
  -H "Authorization: Bearer your_api_key"
```

## Success Response

```json
{
  "account": {
    "id": 142,
    "status": "active",
    "plan_type": "free",
    "credit_balance": 48750,
    "monthly_email_limit": 100000,
    "limit_per_second": 14,
    "ses_region": "us-east-1",
    "ses_status": "healthy"
  },
  "domains": [
    {
      "id": 88,
      "domain_name": "acme.com",
      "verification_status": "verified",
      "is_default": 1,
      "total_sent": 24189,
      "total_bounced": 212,
      "total_complained": 7
    },
    {
      "id": 112,
      "domain_name": "mail.acme.com",
      "verification_status": "pending",
      "is_default": 0,
      "total_sent": 0,
      "total_bounced": 0,
      "total_complained": 0
    }
  ]
}
```

## Response Fields

### Account Object

| Field | Type | Description |
| --- | --- | --- |
| id | number | Internal tenant identifier |
| status | string | Account status. Alwaysactivehere: a suspended or blocked account gets403instead |
| plan_type | string | Legacy plan label (freeby default). Not an indicator of paid status |
| credit_balance | number \| null | Remaining prepaid send credits.nullif the plan is not credit-based |
| monthly_email_limit | number | Legacy field, not enforced. Your effective limit iscredit_balance |
| limit_per_second | number | Informational only, not enforced. SeeRate Limits |
| ses_region | string | Sending region:us-east-1by default,eu-central-1for EU teams |
| ses_status | string | Sending reputation state:healthy,unhealthy, orrisky |

### Domain Object

| Field | Type | Description |
| --- | --- | --- |
| id | number | Internal domain identifier |
| domain_name | string | The domain name |
| verification_status | string | verified,pending, ordraft(DNS records not yet detected) |
| is_default | number | 1if this is the account’s default sending domain, otherwise0 |
| total_sent | number | Lifetime sends attributed to this domain |
| total_bounced | number | Lifetime bounce count |
| total_complained | number | Lifetime complaint count |

## Notes

* If your API key is restricted to a specific domain, the `domains` array still returns every domain on the account, in any verification status; only sending is restricted.
* Bounce and complaint rates are not returned to a sending key. Call this endpoint with an [admin key](/docs/api/admin-api#checking-a-key) to get the 30-day `bounce_rate` and `complaint_rate`.
* A `credit_balance` of `null` means the account is on a plan that does not consume credits (e.g. an enterprise contract).
* Check `credit_balance` before high-volume campaigns to avoid a `403 Insufficient credit balance` rejection.


---


<a id="admin-api"></a>

# Admin API

*Breadcrumbs: Docs > / > API reference*

---

*Official URL: https://tosend.com/docs/api/admin-api/*

The Admin API lets you manage your toSend account programmatically: add sending domains and read their DNS records, pull delivery logs, manage suppressions and webhooks, mint sending keys, and provision client teams.

It is built for platforms that onboard clients automatically: agencies, hosting providers and anyone running toSend underneath their own product.

## Admin keys are separate from sending keys

An Admin API key is a **different type of credential** from the sending keys you use with `/v2/emails`:

|  | Sending key | Admin key |
| --- | --- | --- |
| Prefix | tsend_... | tsend_admin_... |
| Can send email | Yes | Only with theemails:sendscope |
| Can manage the account | No | Within the scopes you grant |
| Reach | One domain, or all domains on one team | The account and every team under it |

A sending key can never use an Admin API endpoint (it returns `401`), so adding the Admin API did not widen what your existing sending keys can do.

> [!WARNING] **Caution**
> Grant each admin key only the scopes the system using it needs. Whatever you grant applies to your account and all of its teams. Store the key in a secret manager, never in client-side code or a public repository, and revoke it immediately if it leaks.

## Scopes

When you create an admin key you choose what it may do. **Nothing is granted by default.**

| Scope | Allows |
| --- | --- |
| domains:read | GET /v2/domains,GET /v2/domains/{id}, and the domain list inGET /v2/info |
| domains:write | POST /v2/domains,DELETE /v2/domains/{id} |
| emails:read | GET /v2/emails,GET /v2/emails/{message_id}(delivery logs) |
| emails:send | POST /v2/emails,POST /v2/emails/batch |
| suppressions:read | GET /v2/suppressions |
| suppressions:write | DELETE /v2/suppressions |
| webhooks:read | GET /v2/webhooks |
| webhooks:write | POST,PUTandDELETE /v2/webhooks |
| api_keys:read | GET /v2/api-keys |
| api_keys:write | DELETE /v2/api-keys/{id}, andPOST /v2/api-keystogether withemails:send |
| teams:read | GET /v2/teams |
| teams:write | POST /v2/teams,PUT /v2/teams/{id} |

Each `:write` scope includes its `:read`. Creating a sending key needs both `api_keys:write` and `emails:send`, because a new sending key can send email: sending stays one explicit permission. `GET /v2/info` needs no scope: any key can read the account summary for the team it targets (status, pooled credits, bounce and complaint rates) and its own scopes, while the domain list there needs `domains:read`. A request outside the key’s scopes returns `403` with `errors.code` set to `insufficient_scope` and `errors.required_scope` naming what was missing. Scopes are fixed when the key is created; to change them, create a new key and revoke the old one.

## Sending with an admin key

A key with the `emails:send` scope can send through the normal sending endpoints, with the same request body as a sending key:

```bash
curl https://api.tosend.com/v2/emails \
  -H "Authorization: Bearer tsend_admin_your_key" \
  -H "X-Account-Id: 4203" \
  -H "Content-Type: application/json" \
  -d '{"from": {"email": "hello@client.com"}, "to": [{"email": "user@example.com"}], "subject": "Hi", "html": "<p>Hello</p>"}'
```

`X-Account-Id` picks the team the email is sent as, so one key can send for every client team; omit it to send as your own account. The `from` domain must be verified on that team. A suspended team cannot send, and if the team that owns the key is suspended, the key cannot send for any team.

Admin keys cannot be used over [SMTP](/docs/guide/smtp); the SMTP server refuses them at login. Use a sending key there: SMTP credentials live in plugin settings and config files, and a sending key can do nothing but send. The key must be in the `Authorization` header (a body `api_key` field is refused for admin keys). These sends appear in the logs without a sending-key id.

## Creating an admin key

Admin keys are created in the dashboard: open **[API Keys](https://dash.tosend.com/app/api-keys)**, find the **Admin API** card, click **Set up**, then **Create admin key** and choose its permissions. There is no API endpoint that mints one, on purpose: a key that can create more keys turns a single leak into access that revoking the original would not close.

Admin keys are created on your main account, not on a child team, and an account can hold up to 10 at a time.

The key is shown **once**, at creation. It is stored hashed, so nobody, including toSend support, can retrieve it afterwards. If you lose it, revoke it and create another.

A revoked key stops working within a minute, as cached copies of it expire across our network.

## Base URL and authentication

```plaintext
https://api.tosend.com
```

```plaintext
Authorization: Bearer tsend_admin_your_key_here
```

Unlike sending keys, an admin key must be sent in the `Authorization` header. There is no query-parameter or request-body fallback, because a credential in a URL ends up in access logs, proxy logs and browser history.

## Working with teams

If your account has child teams, one admin key covers all of them. Name the team you want to act on with the `X-Account-Id` header:

```bash
curl https://api.tosend.com/v2/domains \
  -H "Authorization: Bearer tsend_admin_your_key" \
  -H "X-Account-Id: 4182"
```

Omit the header and the request applies to your own account. Every response echoes back an `X-Account-Id` header naming the team that was actually acted on, so you can assert on it rather than hope.

A key held by a child team (for example, one created before that team was moved under your account) reaches only that team. It cannot reach its parent or its sibling teams.

## Checking a key

```plaintext
GET /v2/info
```

Returns the account the key acts on, its pooled credit balance, the key itself (including its `scopes`), and, for a key with `domains:read`, the account’s domains. The quickest way to confirm a key works and to see which team it is pointed at:

```json
{
  "account": {
    "id": 4182,
    "status": "active",
    "plan_type": "pro",
    "credit_balance": 254277,
    "credits_shared": false,
    "limit_per_second": 14,
    "ses_region": "us-east-1",
    "bounce_rate": 0.004,
    "complaint_rate": 0.0001
  },
  "key": { "id": 91, "title": "Provisioning service", "type": "admin", "acting_on": 4182, "owned_by": 4182, "scopes": ["domains:read", "domains:write"] },
  "domains": [ ]
}
```

`credit_balance` is always the pooled figure for the whole account, never a child team’s own column (which is always `0`).

`bounce_rate` and `complaint_rate` cover the team the key acts on over the last 30 days, as fractions between 0 and 1 (`0.004` = 0.4%). They count every email that reached a receiving server, and are `0` for a team that has sent nothing. A sending key calling this endpoint does not get them.

## Rate limits

| Endpoint group | Limit |
| --- | --- |
| POST /v2/domains | 60 per minute |
| All other writes,GET /v2/domains/{id},GET /v2/teams, and any list request withsearch | 300 per minute |
| Other reads | Not rate limited (100 records per page) |

`GET /v2/domains/{id}` and `GET /v2/teams` count against the write bucket because they are served live from the dashboard rather than the edge cache. A `search` does a full-text match rather than an indexed lookup, so it counts against the same bucket.

Limits count against the account that owns the key, across every team it acts on. Exceeding a limit returns `429`.

Sending with an admin key (`POST /v2/emails` and `/v2/emails/batch`) is not part of these buckets; it follows the same limits as a sending key.

## Errors

Errors return a JSON body with the HTTP status, a message and, where useful, an `errors` object of flat string values:

```json
{
  "status_code": 403,
  "message": "This admin key does not have the domains:read scope.",
  "errors": { "code": "insufficient_scope", "required_scope": "domains:read" }
}
```

Branch on the HTTP status and `errors.code`, not on the message text.

## Paging

List endpoints page up to 10,000 records deep. A request past that (for example `per_page=100&page=101`) returns `422`; narrow the results with filters such as `status`, `domain` or a `from`/`to` date range instead.

---

# Domains

## List domains

```plaintext
GET /v2/domains
```

```json
{
  "data": [
    {
      "id": "9f2c4a1b8e7d3f6a5c0b2d4e6f8a1c3b",
      "domain_name": "client.example.com",
      "verification_status": "verified",
      "is_default": false,
      "ses_region": "us-east-1",
      "total_sent": 12480,
      "total_bounced": 31,
      "total_complained": 2,
      "updated_at": "2026-09-14T09:12:44Z"
    }
  ],
  "total": 22,
  "page": 1,
  "per_page": 25,
  "account_id": 4182
}
```

Accepts `page` and `per_page` (1–100, default 25). The `id` is the domain identifier used everywhere else in this API, including the one `POST /v2/domains` returns.

## Add a domain

```plaintext
POST /v2/domains
```

```json
{
  "name": "client.example.com"
}
```

Returns `201` with the new domain:

```json
{
  "data": {
    "id": "9f2c4a1b8e7d3f6a5c0b2d4e6f8a1c3b",
    "domain_name": "client.example.com",
    "verification_status": "draft",
    "created_at": "2026-09-21 11:04:52"
  }
}
```

### Verification happens by itself

**You do not need to trigger or poll for verification.** A new domain starts in `draft`. toSend checks public DNS every 10 minutes, and as soon as your DKIM, SPF and MX records resolve, the domain is provisioned and moves to `verified` on its own.

There is no “verify” endpoint to call. If you want to surface progress in your own UI, read `verification_status` from `GET /v2/domains/{id}` on a slow interval; every few minutes is plenty.

### Errors

| Status | Meaning |
| --- | --- |
| 409 | The domain already exists. See below. |
| 402 | Subdomain sending requires credits on the account. |
| 422 | Not a valid public domain name. |

> [!NOTE] **Note**
> **Treat `409` as “already exists”, not as a failure.** Domain names are unique across all of toSend, so if your request timed out and you retried, the second call returns `409` for a domain the first call created successfully. Follow a `409` with `GET /v2/domains` to find it rather than reporting an error to your user.

## Get a domain and its DNS records

```plaintext
GET /v2/domains/{id}
```

Returns the records your customer must publish:

```json
{
  "data": {
    "id": "9f2c4a1b8e7d3f6a5c0b2d4e6f8a1c3b",
    "domain_name": "client.example.com",
    "verification_status": "draft",
    "dmarc_policy": null,
    "created_at": "2026-09-21 11:04:52",
    "dns_records": {
      "dkim": {
        "type": "TXT",
        "name": "tosend._domainkey.client",
        "content": "p=MIGfMA0GCSqGSIb3DQEBAQUAA4GN...",
        "TTL": "auto",
        "priority": ""
      },
      "spf": [
        {
          "type": "MX",
          "name": "send.client",
          "content": "feedback-smtp.us-east-1.amazonses.com",
          "TTL": "auto",
          "priority": "10"
        },
        {
          "type": "TXT",
          "name": "send.client",
          "content": "v=spf1 include:amazonses.com ~all",
          "TTL": "auto",
          "priority": ""
        }
      ]
    },
    "auto_verification": { "active": true, "reason": "" }
  }
}
```

`verification_status` is the field to poll: it is the result of the automatic 10-minute DNS check, so it reflects real DNS state without this endpoint doing a lookup of its own. `auto_verification.active` tells you whether that automatic check still covers this domain; it turns off once the domain is verified (`reason: "verified"`), for drafts older than 30 days (`"expired"`), and when toSend support has paused checks on the domain (`"paused"`).

> [!NOTE] **Note**
> This endpoint does not resolve DNS on your behalf, so the individual records carry no per-record status. It is rate limited alongside the write endpoints rather than being treated as a free read. Poll `verification_status` on a slow interval (every few minutes), not in a tight loop.


> [!WARNING] **Caution**
> The DKIM key is unique to the team that owns the domain. Do not cache a DKIM value and reuse it for another domain or another team; it will not verify.

## Delete a domain

```plaintext
DELETE /v2/domains/{id}
```

```json
{
  "deleted": true,
  "warning": "Remove this domain's DNS records (DKIM, SPF and MX) from your zone. Records left published can allow the domain to be re-verified elsewhere."
}
```

Act on that warning in your own workflow: removing the domain from toSend does not remove anything from your customer’s DNS zone.

---

# Email logs

## List messages

```plaintext
GET /v2/emails
```

| Parameter | Description |
| --- | --- |
| page | Page number, from 1 |
| per_page | 1–100, default 25 |
| status | pending,sent,bounced,complained,suppressed,failed,spam(every recipient was a disposable address, so nothing was sent) |
| domain | Domain name or domain id |
| from/to | ISO 8601 date bounds |
| search | Matches subject, from address or recipient |

```json
{
  "data": [
    {
      "id": "msg_4f8a1c3b9e2d7a6c",
      "status": "sent",
      "subject": "Your receipt",
      "from": "billing@client.example.com",
      "from_name": "Example Billing",
      "to": [{ "email": "customer@gmail.com" }],
      "reply_to": null,
      "recipients_count": 1,
      "error": null,
      "has_attachments": false,
      "sent_at": "2026-09-20T14:22:08Z",
      "created_at": "2026-09-20T14:22:07Z"
    }
  ],
  "total": 4821,
  "page": 1,
  "per_page": 25
}
```

The `id` is the same `message_id` that `POST /v2/emails` returned when you sent the message.

> [!NOTE] **Note**
> There is no `delivered` status. A message accepted by the receiving mail server reads as `sent`. Bounces and complaints arrive afterwards and change the status to `bounced` or `complained`.

## Get one message

```plaintext
GET /v2/emails/{message_id}
```

---

# Suppressions

## List suppressed addresses

```plaintext
GET /v2/suppressions
```

Accepts `page`, `per_page`, `search`, and `status` (`bounced`, `complained`, `suppressed`).

## Reactivate an address

```plaintext
DELETE /v2/suppressions?email=customer@example.com
```

Removes an address from your suppression list so it can receive mail again. Limited to **500 per day per account**, shared with the dashboard. The email can also be sent as a JSON body (`{"email": "..."}`).

```json
{
  "deleted": true,
  "message": "Suppression removed. This address can now receive emails again.",
  "used_today": 12,
  "remaining_today": 488,
  "daily_limit": 500
}
```

> [!WARNING] **Caution**
> Reactivating an address that hard-bounced will usually just bounce again, and repeated bounces damage your sending reputation. Only reactivate when you have a reason to believe the mailbox is working again.



---

# Webhooks

```plaintext
GET    /v2/webhooks
POST   /v2/webhooks
PUT    /v2/webhooks/{id}
DELETE /v2/webhooks/{id}
```

`GET` is paginated (`page`, `per_page`) and returns each webhook as:

```json
{
  "id": 318,
  "title": "Bounce handler",
  "url": "https://example.com/hooks/tosend",
  "events": ["bounced"],
  "status": "active",
  "include_message": false,
  "created_at": "2026-09-21T11:06:10.000Z",
  "updated_at": "2026-09-21T11:06:10.000Z"
}
```

Create a webhook with `POST`:

```json
{
  "title": "Bounce handler",
  "url": "https://example.com/hooks/tosend",
  "events": ["bounced"],
  "include_message": false
}
```

`PUT` accepts any of `title`, `url`, `events`, `include_message` and `status` (`active` or `inactive`, to pause a webhook without deleting it), and returns the updated webhook.

The response to `POST` includes a `secret`, generated by toSend, that signs every delivery to this webhook. The API returns it only in this response, so store it when you create the webhook (you can also view it later in the dashboard). You cannot set your own.

The `url` must be `https://` or `http://` on port 443, 80 or 8080, point to a public host name (not `localhost`, a private IP address or an IP literal), and be at most 2,048 characters. `title` is optional (up to 100 characters). A team can have up to 100 webhooks.

**Supported events are `bounced` and `complaint`.** Anything else returns `422`. toSend does not emit delivery, open or click events. Open and click tracking do not exist in the product, and there is deliberately no unsubscribe event, because your own `List-Unsubscribe` header is preserved end to end so opt-outs reach your system directly.

---

# Sending API keys

```plaintext
GET    /v2/api-keys
POST   /v2/api-keys
DELETE /v2/api-keys/{id}
```

Use this to give each of your clients their own sending key:

```json
{
  "name": "Client: Acme Corp",
  "domain": "9f2c4a1b8e7d3f6a5c0b2d4e6f8a1c3b"
}
```

Omit `domain` to create a key valid for every domain on the team. The created key is returned **once**:

```json
{
  "data": {
    "id": 9214,
    "name": "Client: Acme Corp",
    "api_key": "tsend_0a1b2c3d4e5f60718293a4b5c6d7e8f9",
    "created_at": "2026-09-21 11:08:33"
  }
}
```

Creating a key needs both the `api_keys:write` and `emails:send` scopes (see [Scopes](#scopes)).

`GET` is paginated (`page`, `per_page`) and returns keys masked:

```json
{
  "data": [
    {
      "id": 9214,
      "title": "Client: Acme Corp",
      "key": "tsend_0a...e8f9",
      "status": "active",
      "domain": "client.example.com",
      "created_at": "2026-09-21 11:08:33"
    }
  ],
  "total": 1,
  "page": 1,
  "per_page": 25
}
```

`domain` is `null` for a key valid on every domain. A deleted key stops working within a minute. These endpoints handle **sending** keys only; admin keys are created and revoked in the dashboard, and never appear here.

---

# Teams

Teams give each client their own isolated sending reputation, suppression list and domains, while credits stay pooled at the parent account.

## List teams

```plaintext
GET /v2/teams
```

```json
{
  "data": {
    "account": { "id": 4182, "name": "Northwind Agency", "status": "active", "credit_balance": 254277 },
    "teams": [
      { "id": 4190, "name": "Acme Corp", "status": "active" },
      { "id": 4203, "name": "Globex", "status": "suspended" }
    ],
    "credits_shared": true
  }
}
```

`credit_balance` is the pooled balance for the whole account. Child teams draw on it and have no separate balance of their own. The list always describes the account that owns the key, whatever `X-Account-Id` you send. Deleted teams are not listed.

## Create a team

```plaintext
POST /v2/teams
```

```json
{ "name": "Acme Corp" }
```

Returns `201` with the new team:

```json
{ "data": { "id": 4211, "name": "Acme Corp", "status": "active" } }
```

The name must be 2 to 100 characters. Only the parent account can create teams, so do not send `X-Account-Id`. Teams are limited to 25 by default; contact support to raise it.

A team has no separate login: everything is managed from your account, through the dashboard or this API.

## Update a team

```plaintext
PUT /v2/teams/{id}
```

```json
{ "name": "Acme Corporation", "status": "suspended" }
```

Send `name`, `status` (`active` or `suspended`), or both, without `X-Account-Id` as for create. The response has the same shape as create. Suspending a team stops its sending immediately and leaves its domains and data intact.

You can reactivate a team you suspended yourself. If toSend suspended the team (for example for a high bounce rate), setting `"status": "active"` returns `403` with the code `suspended_by_platform`. Retrying will not change that; contact support to have the suspension reviewed.

> [!NOTE] **Note**
> There is no endpoint to delete a team. Suspend it instead, or delete it from the dashboard.



---

# A typical onboarding flow

1. `POST /v2/teams`: create a team for the client *(optional; skip if all clients share one team)*
2. `POST /v2/domains` with `X-Account-Id`: add their sending domain
3. `GET /v2/domains/{id}`: read the DNS records and show them to your client
4. Wait. toSend verifies automatically once the records resolve; no call needed
5. `GET /v2/domains/{id}` on a slow poll: surface `verification_status` in your UI
6. `POST /v2/api-keys`: mint a sending key for the client
7. Your client sends through `POST /v2/emails` with that key

Steps 2 and 3 can also be done for up to 50 domains at once from the dashboard, and toSend can email the DNS records straight to your client if you would rather not build that screen yourself.


---


<a id="sdks-overview"></a>

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


---


<a id="nodejs-sdk"></a>

# Node.js SDK

*Breadcrumbs: Docs > / > SDKs*

---

*Official URL: https://tosend.com/docs/sdks/node/*

Official Node.js SDK for the toSend email API.

* **Package**: `tosend`
* **Requirements**: Node.js 18+
* **Repository**: [tosend/tosend-node](https://github.com/tosend/tosend-node)

## Installation

```bash
npm install tosend
```

## Quick Start

```typescript
import { ToSend } from 'tosend';

const tosend = new ToSend('tsend_your_api_key');

const response = await tosend.send({
  from: { email: 'hello@yourdomain.com', name: 'Your App' },
  to: [{ email: 'user@example.com' }],
  subject: 'Welcome!',
  html: '<h1>Hello!</h1><p>Thanks for signing up.</p>',
});

console.log(response.message_id);
```

## Configuration

### Simple (API key only)

```typescript
const tosend = new ToSend('tsend_your_api_key');
```

### With Options

```typescript
const tosend = new ToSend({
  apiKey: 'tsend_your_api_key',
  baseUrl: 'https://api.tosend.com', // optional
  timeout: 30000, // optional, in milliseconds
});
```

## Send Email

### Basic Email

```typescript
const response = await tosend.send({
  from: { email: 'hello@yourdomain.com', name: 'Your App' },
  to: [
    { email: 'user@example.com' },
    { email: 'another@example.com', name: 'John Doe' },
  ],
  subject: 'Hello!',
  html: '<h1>Welcome</h1>',
  text: 'Welcome', // optional
});
```

### With CC, BCC, and Reply-To

```typescript
const response = await tosend.send({
  from: { email: 'hello@yourdomain.com' },
  to: [{ email: 'user@example.com' }],
  cc: [{ email: 'cc@example.com' }],
  bcc: [{ email: 'bcc@example.com' }],
  reply_to: { email: 'support@yourdomain.com', name: 'Support' },
  subject: 'Hello',
  html: '<p>Hello World</p>',
});
```

### With Attachments

```typescript
import * as fs from 'fs';

const response = await tosend.send({
  from: { email: 'hello@yourdomain.com' },
  to: [{ email: 'user@example.com' }],
  subject: 'Your Invoice',
  html: '<p>Please find your invoice attached.</p>',
  attachments: [
    {
      type: 'application/pdf',
      name: 'invoice.pdf',
      content: fs.readFileSync('invoice.pdf').toString('base64'),
    },
  ],
});
```

## Batch Sending

Send multiple emails in a single request:

```typescript
const response = await tosend.batch([
  {
    from: { email: 'hello@yourdomain.com' },
    to: [{ email: 'user1@example.com' }],
    subject: 'Hello User 1',
    html: '<p>Welcome!</p>',
  },
  {
    from: { email: 'hello@yourdomain.com' },
    to: [{ email: 'user2@example.com' }],
    subject: 'Hello User 2',
    html: '<p>Welcome!</p>',
  },
]);

response.results.forEach((result) => {
  if (result.status === 'success') {
    console.log('Sent:', result.message_id);
  } else {
    console.log('Failed:', result.message);
  }
});
```

## Account Info

```typescript
const info = await tosend.getAccountInfo();

console.log(info.account.status);          // 'active'
console.log(info.account.credit_balance);  // null = no credit limit
console.log(info.account.limit_per_second);

info.domains.forEach((domain) => {
  console.log(domain.domain_name, domain.verification_status);
});
```

## Error Handling

```typescript
import { ToSend, ToSendError } from 'tosend';

try {
  const response = await tosend.send({
    from: { email: 'hello@yourdomain.com' },
    to: [{ email: 'user@example.com' }],
    subject: 'Hello',
    html: '<p>Hello</p>',
  });
} catch (error) {
  if (error instanceof ToSendError) {
    console.log('Error:', error.message);
    console.log('Code:', error.code);
    console.log('Errors:', error.errors);

    if (error.isValidationError) {
      // Handle validation error (422)
    }

    if (error.isAuthenticationError) {
      // Handle auth error (401/403)
    }

    if (error.isRateLimitError) {
      // Handle rate limit (429)
    }
  }
}
```

## Admin API

`ToSendAdmin` is a separate client for the [Admin API](/docs/api/admin-api). It takes an admin key (`tsend_admin_...`) and refuses a sending key at construction. Each call needs the matching [scope](/docs/api/admin-api#scopes) on the key.

```typescript
import { ToSendAdmin } from 'tosend';

const admin = new ToSendAdmin(process.env.TOSEND_ADMIN_KEY!);

// Act on one of your client teams (sends X-Account-Id)
const client = admin.forAccount(4203);

const domain = await client.createDomain('client.example.com');
const detail = await client.getDomain(domain.id);
console.log(detail.dns_records.dkim); // show these records to your client

// Needs api_keys:write and emails:send
const key = await client.createSendingKey('Client: Acme Corp');
console.log(key.api_key); // returned once, store it now

// Needs emails:send
await client.send({
  from: { email: 'hello@client.example.com' },
  to: [{ email: 'user@example.com' }],
  subject: 'Hi',
  html: '<p>Hello</p>',
});
```

Also available: `getInfo` (checks the key and lists its scopes), `listDomains`, `deleteDomain`, `listEmails`, `getEmail`, `listSuppressions`, `deleteSuppression`, `listWebhooks`, `createWebhook`, `updateWebhook`, `deleteWebhook`, `listSendingKeys`, `deleteSendingKey`, `listTeams`, `createTeam`, `updateTeam` and `batch`. List methods take `page` and `per_page` and return `{ data, total, page, per_page }`.

## TypeScript

Full TypeScript support with exported types:

```typescript
import {
  ToSend,
  ToSendError,
  SendEmailParams,
  SendEmailResponse,
  BatchEmailResponse,
  AccountInfo,
  Address,
  Attachment,
} from 'tosend';
```


---


<a id="python-sdk"></a>

# Python SDK

*Breadcrumbs: Docs > / > SDKs*

---

*Official URL: https://tosend.com/docs/sdks/python/*

Official Python SDK for the toSend email API.

* **Package**: [`tosend`](https://pypi.org/project/tosend/)
* **Requirements**: Python 3.8+
* **Repository**: [tosend/tosend-python](https://github.com/tosend/tosend-python)

## Installation

```bash
pip install tosend
```

## Quick Start

```python
from tosend import ToSend

client = ToSend("tsend_your_api_key")

response = client.send(
    from_address={"email": "hello@yourdomain.com", "name": "Your App"},
    to=[{"email": "user@example.com"}],
    subject="Welcome!",
    html="<h1>Hello!</h1><p>Thanks for signing up.</p>",
)

print(response.message_id)
```

## Configuration

### Simple

```python
client = ToSend("tsend_your_api_key")
```

### With Options

```python
client = ToSend(
    api_key="tsend_your_api_key",
    base_url="https://api.tosend.com",  # optional
    timeout=60,  # optional, in seconds
)
```

## Send Email

### Basic Email

```python
response = client.send(
    from_address={"email": "hello@yourdomain.com", "name": "Your App"},
    to=[
        {"email": "user@example.com"},
        {"email": "another@example.com", "name": "John Doe"},
    ],
    subject="Hello!",
    html="<h1>Welcome</h1>",
    text="Welcome",  # optional
)
```

### With CC, BCC, and Reply-To

```python
response = client.send(
    from_address={"email": "hello@yourdomain.com"},
    to=[{"email": "user@example.com"}],
    cc=[{"email": "cc@example.com"}],
    bcc=[{"email": "bcc@example.com"}],
    reply_to={"email": "support@yourdomain.com", "name": "Support"},
    subject="Hello",
    html="<p>Hello World</p>",
)
```

### With Attachments

```python
import base64

with open("invoice.pdf", "rb") as f:
    content = base64.b64encode(f.read()).decode()

response = client.send(
    from_address={"email": "hello@yourdomain.com"},
    to=[{"email": "user@example.com"}],
    subject="Your Invoice",
    html="<p>Please find your invoice attached.</p>",
    attachments=[
        {
            "type": "application/pdf",
            "name": "invoice.pdf",
            "content": content,
        }
    ],
)
```

## Batch Sending

Send multiple emails in a single request:

```python
response = client.batch([
    {
        "from": {"email": "hello@yourdomain.com"},
        "to": [{"email": "user1@example.com"}],
        "subject": "Hello User 1",
        "html": "<p>Welcome!</p>",
    },
    {
        "from": {"email": "hello@yourdomain.com"},
        "to": [{"email": "user2@example.com"}],
        "subject": "Hello User 2",
        "html": "<p>Welcome!</p>",
    },
])

for result in response.results:
    if result.status == "success":
        print(f"Sent: {result.message_id}")
    else:
        print(f"Failed: {result.message}")
```

## Account Info

```python
info = client.get_account_info()

print(info.account.status)            # "active"
print(info.account.credit_balance)    # None means the account does not consume credits
print(info.account.limit_per_second)

for domain in info.domains:
    print(f"{domain.domain_name}: {domain.verification_status}")
```

## Admin API

`ToSendAdmin` is a separate client for the [Admin API](/docs/api/admin-api). It takes an admin key (`tsend_admin_...`) and refuses a sending key at construction. Each call needs the matching [scope](/docs/api/admin-api#scopes) on the key; a missing one raises `ToSendError` with status 403 and `error.code == "insufficient_scope"`.

```python
import os
from tosend import ToSendAdmin

admin = ToSendAdmin(os.environ["TOSEND_ADMIN_KEY"])

# Act on one of your client teams (sends X-Account-Id)
client = admin.for_account(4203)

domain = client.create_domain("client.example.com")
detail = client.get_domain(domain["id"])
print(detail["dns_records"]["dkim"])  # show these records to your client

# Needs api_keys:write and emails:send
key = client.create_sending_key("Client: Acme Corp")
print(key["api_key"])  # returned once, store it now

# Needs emails:send
client.send(
    from_address={"email": "hello@client.example.com"},
    to=[{"email": "user@example.com"}],
    subject="Hi",
    html="<p>Hello</p>",
)
```

Also available: `get_info`, `list_domains`, `delete_domain`, `list_emails`, `get_email`, `list_suppressions`, `delete_suppression`, `list_webhooks`, `create_webhook`, `update_webhook`, `delete_webhook`, `list_sending_keys`, `delete_sending_key`, `list_teams`, `create_team`, `update_team` and `batch`. List methods take `page` and `per_page` and return a dict with `data`, `total`, `page` and `per_page`; single-resource methods return the resource as a dict.

## Error Handling

```python
from tosend import ToSend, ToSendError

client = ToSend("tsend_your_api_key")

try:
    response = client.send(
        from_address={"email": "hello@yourdomain.com"},
        to=[{"email": "user@example.com"}],
        subject="Hello",
        html="<p>Hello</p>",
    )
except ToSendError as e:
    print(f"Error: {e.message}")
    print(f"Status: {e.status_code}")
    print(f"Details: {e.errors}")

    if e.is_validation_error:
        # Handle validation error (422)
        pass

    if e.is_authentication_error:
        # Handle auth error (401/403)
        pass

    if e.is_rate_limit_error:
        # Handle rate limit (429)
        pass
```

## Type Hints

The SDK includes full type hints. You can use the provided dataclasses:

```python
from tosend import ToSend, Address, SendEmailRequest

client = ToSend("tsend_your_api_key")

# Using Address dataclass
from_addr = Address(email="hello@yourdomain.com", name="Your App")
to_addr = Address(email="user@example.com")

response = client.send(
    from_address=from_addr,
    to=[to_addr],
    subject="Hello!",
    html="<h1>Welcome!</h1>",
)
```

## Zero Dependencies

The Python SDK uses only the standard library and has no external dependencies.


---


<a id="php-sdk"></a>

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


---


<a id="laravel-sdk"></a>

# Laravel SDK

*Breadcrumbs: Docs > / > SDKs*

---

*Official URL: https://tosend.com/docs/sdks/laravel/*

Official Laravel SDK for the toSend email API.

* **Package**: `tosend/tosend-laravel`
* **Requirements**: PHP 8.1+, Laravel 10.x, 11.x, 12.x or 13.x
* **Repository**: [tosend/tosend-laravel](https://github.com/tosend/tosend-laravel)

## Installation

```bash
composer require tosend/tosend-laravel
```

## Configuration

Add your API key to your `.env` file:

```ini
TOSEND_API_KEY=tsend_your_api_key
```

Optionally publish the config file:

```bash
php artisan vendor:publish --tag=tosend-config
```

### Configuration Options

```php
// config/tosend.php
return [
    'api_key' => env('TOSEND_API_KEY'),
    'admin_key' => env('TOSEND_ADMIN_KEY'), // optional, only for the Admin API client
    'api_url' => env('TOSEND_API_URL', 'https://api.tosend.com'),
    'from' => [
        'address' => env('TOSEND_FROM_ADDRESS', env('MAIL_FROM_ADDRESS')),
        'name' => env('TOSEND_FROM_NAME', env('MAIL_FROM_NAME')),
    ],
    'timeout' => env('TOSEND_TIMEOUT', 30),
];
```

## Quick Start

### Using the Facade

```php
use ToSend\Laravel\Facades\ToSend;

$response = ToSend::send([
    'from' => ['email' => 'hello@yourdomain.com', 'name' => 'Your App'],
    'to' => [['email' => 'user@example.com']],
    'subject' => 'Welcome!',
    'html' => '<h1>Hello World</h1>',
]);

echo $response->messageId;
```

### Using Dependency Injection

```php
use ToSend\Laravel\Contracts\ToSendClient;

class EmailController extends Controller
{
    public function send(ToSendClient $tosend)
    {
        $response = $tosend->send([
            'from' => ['email' => 'hello@yourdomain.com'],
            'to' => [['email' => 'user@example.com']],
            'subject' => 'Hello!',
            'html' => '<p>Welcome to our app!</p>',
        ]);

        return $response->messageId;
    }
}
```

## Send Email

### Using the Email Builder

```php
use ToSend\Laravel\Facades\ToSend;
use ToSend\Laravel\Data\Email;
use ToSend\Laravel\Data\Attachment;

$email = Email::make(
    from: ['email' => 'hello@yourdomain.com', 'name' => 'Your App'],
    subject: 'Your Invoice'
)
    ->to(['email' => 'user@example.com', 'name' => 'John Doe'])
    ->to('another@example.com')
    ->cc('manager@example.com')
    ->bcc(['email' => 'archive@example.com'])
    ->html('<h1>Invoice Attached</h1>')
    ->text('Invoice Attached')
    ->attach(Attachment::fromPath('/path/to/invoice.pdf'));

$response = ToSend::send($email);
```

## Batch Sending

```php
use ToSend\Laravel\Facades\ToSend;

$response = ToSend::batch([
    [
        'from' => ['email' => 'hello@yourdomain.com'],
        'to' => [['email' => 'user1@example.com']],
        'subject' => 'Hello User 1',
        'html' => '<p>Welcome!</p>',
    ],
    [
        'from' => ['email' => 'hello@yourdomain.com'],
        'to' => [['email' => 'user2@example.com']],
        'subject' => 'Hello User 2',
        'html' => '<p>Welcome!</p>',
    ],
]);

// Check results
echo "Sent: " . $response->successCount();
echo "Failed: " . $response->failedCount();

foreach ($response->results as $result) {
    if ($result->isSuccess()) {
        echo "Sent: " . $result->messageId;
    } else {
        echo "Failed: " . $result->message;
    }
}
```

## Account Info

```php
use ToSend\Laravel\Facades\ToSend;

$info = ToSend::getAccountInfo();

echo $info->id;
echo $info->status;           // 'active'
echo $info->creditBalance;    // null means the account does not consume credits
echo $info->limitPerSecond;

foreach ($info->domains as $domain) {
    echo $domain->domainName . ': ' . $domain->verificationStatus;
}

// Get only verified domains
$verified = $info->verifiedDomains();
```

## Admin API

`ToSend\Laravel\ToSendAdmin` is a separate client for the [Admin API](/docs/api/admin-api). It takes an admin key (`tsend_admin_...`) and refuses a sending key at construction. Each call needs the matching [scope](/docs/api/admin-api#scopes) on the key; a missing one throws a `403` whose `getErrorCode()` is `insufficient_scope`.

Admin keys are created on your main account in the dashboard, under **API Keys** → **Admin API**. Add yours to `.env`:

```plaintext
TOSEND_ADMIN_KEY=tsend_admin_your_key
```

```php
use ToSend\Laravel\ToSendAdmin;

$admin = app(ToSendAdmin::class);

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

Also available: `getInfo`, `listDomains`, `deleteDomain`, `listEmails`, `getEmail`, `listSuppressions`, `deleteSuppression`, `listWebhooks`, `createWebhook`, `updateWebhook`, `deleteWebhook`, `listSendingKeys`, `deleteSendingKey`, `listTeams`, `createTeam`, `updateTeam` and `batch`. List methods take `page` and `per_page` and return `data`, `total`, `page` and `per_page`. Resolving `ToSendAdmin` without `TOSEND_ADMIN_KEY` set throws a `ToSendException`; the sending client is unaffected.

## Laravel Mail Integration

Use toSend as your default Laravel mail driver.

### Configure Mail Driver

```ini
MAIL_MAILER=tosend
TOSEND_API_KEY=tsend_your_api_key
TOSEND_FROM_ADDRESS=hello@yourdomain.com
TOSEND_FROM_NAME="Your App"
```

```php
// config/mail.php
'mailers' => [
    'tosend' => [
        'transport' => 'tosend',
    ],
],
```

### Send with Laravel Mail

```php
use Illuminate\Support\Facades\Mail;

// Using a Mailable
Mail::to('user@example.com')->send(new WelcomeEmail());

// Using a specific mailer
Mail::mailer('tosend')
    ->to('user@example.com')
    ->send(new WelcomeEmail());
```

### Create a Mailable

```php
namespace App\Mail;

use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Mail\Mailables\Attachment;

class WelcomeEmail extends Mailable
{
    public function envelope(): Envelope
    {
        return new Envelope(
            from: new \Illuminate\Mail\Mailables\Address('hello@yourdomain.com', 'Your App'),
            subject: 'Welcome to Our App',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.welcome',
        );
    }

    public function attachments(): array
    {
        return [
            Attachment::fromPath('/path/to/file.pdf'),
        ];
    }
}
```

## Attachments

### From File Path

```php
use ToSend\Laravel\Data\Attachment;

$attachment = Attachment::fromPath('/path/to/document.pdf');

// With custom name and type
$attachment = Attachment::fromPath(
    path: '/path/to/document.pdf',
    name: 'custom-name.pdf',
    type: 'application/pdf'
);
```

### From Content

```php
$attachment = Attachment::fromContent(
    content: $pdfContent,
    name: 'report.pdf',
    type: 'application/pdf'
);
```

### From Base64

```php
$attachment = Attachment::fromBase64(
    base64Content: $base64String,
    name: 'image.png',
    type: 'image/png'
);
```

## Error Handling

```php
use ToSend\Laravel\Facades\ToSend;
use ToSend\Laravel\Exceptions\ToSendException;

try {
    $response = ToSend::send([
        'from' => ['email' => 'hello@yourdomain.com'],
        'to' => [['email' => 'user@example.com']],
        'subject' => 'Hello',
        'html' => '<p>Hello</p>',
    ]);
} catch (ToSendException $e) {
    // Get error message
    echo $e->getMessage();

    // Get HTTP status code
    echo $e->getCode();

    // Get validation errors
    $errors = $e->getErrors();

    // Check error type
    if ($e->isValidationError()) {
        // Handle validation error (422)
    }

    if ($e->isAuthenticationError()) {
        // Handle auth error (401/403)
    }

    if ($e->isRateLimitError()) {
        // Handle rate limit (429)
    }
}
```

## Testing

Mock the toSend client in your tests:

```php
use ToSend\Laravel\Contracts\ToSendClient;
use ToSend\Laravel\Data\EmailResponse;

public function test_sends_welcome_email()
{
    $mock = $this->mock(ToSendClient::class);

    $mock->shouldReceive('send')
        ->once()
        ->andReturn(new EmailResponse(messageId: 'test-message-id'));

    // Your test code...
}
```

Or use a custom base URL for testing:

```ini
# .env.testing
TOSEND_API_URL=http://localhost:8080
```


---


<a id="go-sdk"></a>

# Go SDK

*Breadcrumbs: Docs > / > SDKs*

---

*Official URL: https://tosend.com/docs/sdks/go/*

Official Go SDK for the toSend email API.

* **Package**: `github.com/tosend/tosend-go`
* **Requirements**: Go 1.21+
* **Repository**: [tosend/tosend-go](https://github.com/tosend/tosend-go)

## Installation

```bash
go get github.com/tosend/tosend-go
```

## Quick Start

```go
package main

import (
    "fmt"
    "log"

    "github.com/tosend/tosend-go"
)

func main() {
    client := tosend.New("tsend_your_api_key")

    resp, err := client.Send(&tosend.SendEmailRequest{
        From:    tosend.Address{Email: "hello@yourdomain.com", Name: "Your App"},
        To:      []tosend.Address{{Email: "user@example.com"}},
        Subject: "Welcome!",
        HTML:    "<h1>Hello!</h1><p>Thanks for signing up.</p>",
    })
    if err != nil {
        log.Fatal(err)
    }

    fmt.Println("Message ID:", resp.MessageID)
}
```

## Configuration

### Simple

```go
client := tosend.New("tsend_your_api_key")
```

### With Options

```go
import "time"

client := tosend.New("tsend_your_api_key",
    tosend.WithBaseURL("https://api.tosend.com"),
    tosend.WithTimeout(60 * time.Second),
)
```

### Custom HTTP Client

```go
httpClient := &http.Client{
    Timeout: 60 * time.Second,
    Transport: &http.Transport{
        MaxIdleConns: 10,
    },
}

client := tosend.New("tsend_your_api_key",
    tosend.WithHTTPClient(httpClient),
)
```

## Send Email

### Basic Email

```go
resp, err := client.Send(&tosend.SendEmailRequest{
    From: tosend.Address{
        Email: "hello@yourdomain.com",
        Name:  "Your App",
    },
    To: []tosend.Address{
        {Email: "user@example.com"},
        {Email: "another@example.com", Name: "John Doe"},
    },
    Subject: "Hello!",
    HTML:    "<h1>Welcome</h1>",
    Text:    "Welcome", // optional
})
```

### With CC, BCC, and Reply-To

```go
resp, err := client.Send(&tosend.SendEmailRequest{
    From:    tosend.Address{Email: "hello@yourdomain.com"},
    To:      []tosend.Address{{Email: "user@example.com"}},
    CC:      []tosend.Address{{Email: "cc@example.com"}},
    BCC:     []tosend.Address{{Email: "bcc@example.com"}},
    ReplyTo: &tosend.Address{Email: "support@yourdomain.com", Name: "Support"},
    Subject: "Hello",
    HTML:    "<p>Hello World</p>",
})
```

### With Attachments

```go
import (
    "encoding/base64"
    "os"
)

content, _ := os.ReadFile("invoice.pdf")
encoded := base64.StdEncoding.EncodeToString(content)

resp, err := client.Send(&tosend.SendEmailRequest{
    From:    tosend.Address{Email: "hello@yourdomain.com"},
    To:      []tosend.Address{{Email: "user@example.com"}},
    Subject: "Your Invoice",
    HTML:    "<p>Please find your invoice attached.</p>",
    Attachments: []tosend.Attachment{
        {
            Type:    "application/pdf",
            Name:    "invoice.pdf",
            Content: encoded,
        },
    },
})
```

## Batch Sending

Send multiple emails in a single request:

```go
resp, err := client.Batch([]tosend.SendEmailRequest{
    {
        From:    tosend.Address{Email: "hello@yourdomain.com"},
        To:      []tosend.Address{{Email: "user1@example.com"}},
        Subject: "Hello User 1",
        HTML:    "<p>Welcome!</p>",
    },
    {
        From:    tosend.Address{Email: "hello@yourdomain.com"},
        To:      []tosend.Address{{Email: "user2@example.com"}},
        Subject: "Hello User 2",
        HTML:    "<p>Welcome!</p>",
    },
})

for _, result := range resp.Results {
    if result.Status == "success" {
        fmt.Println("Sent:", result.MessageID)
    } else {
        fmt.Println("Failed:", result.Message)
    }
}
```

## Account Info

```go
info, err := client.GetAccountInfo()
if err != nil {
    log.Fatal(err)
}

fmt.Println("Account:", info.Account.ID, info.Account.Status)
if info.Account.CreditBalance != nil { // nil = no credit limit
    fmt.Println("Credits:", *info.Account.CreditBalance)
}
fmt.Println("Rate limit:", info.Account.LimitPerSecond, "per second")

for _, domain := range info.Domains {
    fmt.Printf("%s: %s\n", domain.DomainName, domain.VerificationStatus)
}
```

## Admin API

`tosend.NewAdmin` returns a separate client for the [Admin API](/docs/api/admin-api). It takes an admin key (`tsend_admin_...`) and returns an error for a sending key. Each call needs the matching [scope](/docs/api/admin-api#scopes) on the key; a missing scope returns a `*tosend.Error` whose `Code()` is `"insufficient_scope"`.

```go
admin, err := tosend.NewAdmin(os.Getenv("TOSEND_ADMIN_KEY"))
if err != nil {
    log.Fatal(err)
}

// Act on one of your client teams (sends X-Account-Id)
client := admin.ForAccount(4203)

domain, err := client.CreateDomain("client.example.com")
detail, err := client.GetDomain(domain.ID)
fmt.Println(detail.DNSRecords.DKIM.Content) // show these records to your client

// Needs api_keys:write and emails:send
key, err := client.CreateSendingKey("Client: Acme Corp", "")
fmt.Println(key.APIKey) // returned once, store it now

// Needs emails:send
_, err = client.Send(&tosend.SendEmailRequest{
    From:    tosend.Address{Email: "hello@client.example.com"},
    To:      []tosend.Address{{Email: "user@example.com"}},
    Subject: "Hi",
    HTML:    "<p>Hello</p>",
})
```

Also available: `GetInfo`, `ListDomains`, `DeleteDomain`, `ListEmails`, `GetEmail`, `ListSuppressions`, `DeleteSuppression`, `ListWebhooks`, `CreateWebhook`, `UpdateWebhook`, `DeleteWebhook`, `ListSendingKeys`, `DeleteSendingKey`, `ListTeams`, `CreateTeam`, `UpdateTeam` and `Batch`. List methods take paging parameters and return a `*tosend.Page[T]` with `Data`, `Total`, `Page` and `PerPage`.

## Error Handling

```go
resp, err := client.Send(&tosend.SendEmailRequest{
    From:    tosend.Address{Email: "hello@yourdomain.com"},
    To:      []tosend.Address{{Email: "user@example.com"}},
    Subject: "Hello",
    HTML:    "<p>Hello</p>",
})

if err != nil {
    if apiErr, ok := err.(*tosend.Error); ok {
        fmt.Println("Error:", apiErr.Message)
        fmt.Println("Status:", apiErr.StatusCode)
        fmt.Println("Type:", apiErr.ErrorType)   // often empty; branch on StatusCode
        fmt.Println("Details:", apiErr.Errors)    // map[string]any
        fmt.Println("Code:", apiErr.Code())       // e.g. "insufficient_scope"
    } else {
        fmt.Println("Error:", err)
    }
    return
}

fmt.Println("Sent:", resp.MessageID)
```


---


<a id="documentation-overview"></a>

# Documentation

> How to send email from your website, app or client sites with toSend. WordPress sites
        connect through FluentSMTP, any app can use SMTP, and your own code can call the API or
        one of the SDKs. Start with the quickstart, or jump to the page you need.

*Breadcrumbs: Docs*

---

*Official URL: https://tosend.com/docs/*

Docs

# Documentation

How to send email from your website, app or client sites with toSend. WordPress sites
connect through FluentSMTP, any app can use SMTP, and your own code can call the API or
one of the SDKs. Start with the quickstart, or jump to the page you need.

[Quickstart →](/docs/guide/domains/) [WordPress setup](/docs/guide/wordpress/) [API reference](/docs/api/introduction/)

## User guide

 12 pages

* [Domains Add a sending domain and publish the DKIM, SPF and MX records that verify it.](/docs/guide/domains/)
* [DMARC What DMARC does, and the record that stops others sending as your domain.](/docs/guide/dmarc/)
* [API keys Create, restrict and revoke the keys your code sends with.](/docs/guide/api-keys/)
* [Send with SMTP Connection details for apps and tools that only speak SMTP.](/docs/guide/smtp/)
* [AI apps (MCP) Connect Claude, ChatGPT or any MCP client to your account.](/docs/guide/mcp/)
* [Webhooks Get signed bounce and complaint events posted to your own endpoint.](/docs/guide/webhooks/)
* [Email logs Find any sent email and check its delivery status.](/docs/guide/logs/)
* [Suppressions How bounced and complained addresses are blocked from future sends.](/docs/guide/suppressions/)
* [Metrics Sends, bounce rate and account health, per domain and date range.](/docs/guide/metrics/)
* [Billing Pay-as-you-go credits, how they are counted, and what happens when they run out.](/docs/guide/billing/)
* [Data location & EU region Where your email data is stored, and how to send from the EU.](/docs/guide/data-location/)
* [WordPress Connect a WordPress site through the free FluentSMTP plugin.](/docs/guide/wordpress/)

## API reference

 5 pages

* [Introduction Base URL, authentication and error format for the REST API.](/docs/api/introduction/)
* [Send email POST /v2/emails to send one email to one or more recipients.](/docs/api/send-email/)
* [Batch emails Send up to 100 emails in a single request.](/docs/api/batch-emails/)
* [Account info GET /v2/info to check a key, your credit balance and your domains.](/docs/api/account-info/)
* [Admin API Manage domains, logs, keys and client teams with an admin key.](/docs/api/admin-api/)

## SDKs

 6 pages

* [Overview The official client libraries and what they all support.](/docs/sdks/)
* [Node.js npm install tosend. Requires Node.js 18 or later.](/docs/sdks/node/)
* [Python pip install tosend. Requires Python 3.8 or later.](/docs/sdks/python/)
* [Go github.com/tosend/tosend-go. Requires Go 1.21 or later.](/docs/sdks/go/)
* [Laravel tosend/tosend-laravel for Laravel 10 to 13.](/docs/sdks/laravel/)
* [PHP tosend/tosend-php for plain PHP 7.4 or later.](/docs/sdks/php/)


---


<a id="domains--verification"></a>

# Domains

*Breadcrumbs: Docs > / > User guide*

---

*Official URL: https://tosend.com/docs/guide/domains/*

To send emails with toSend, you need to verify ownership of your domain by adding DNS records.

## Adding a Domain

1. Go to **Domains** in your dashboard
2. Click **Add Domain**
3. Enter your domain name (e.g., `yourdomain.com`)

## DNS Records

After adding a domain, you’ll need to configure three DNS records with your DNS provider.

The names below are for a root domain such as `yourdomain.com`. For a subdomain such as `mail.yourdomain.com`, the subdomain is added to each name (`tosend._domainkey.mail`, `send.mail`). Your dashboard always shows the exact names for your domain.

### DKIM Record

DKIM (DomainKeys Identified Mail) verifies that emails are authorized by the domain owner.

| Type | Name | Value |
| --- | --- | --- |
| TXT | tosend._domainkey | Copy from your dashboard |

> [!WARNING] **Your DKIM value is unique to your team**
> The DKIM value is a long public key that belongs to your team alone, so it cannot be
> listed here. Open the domain in your dashboard and copy the value shown there.
> 
> A key copied from anywhere else (these docs, a blog post, another team or account) will not
> verify your domain.

### SPF Record

SPF (Sender Policy Framework) authorizes toSend to send emails on behalf of your domain.

| Type | Name | Value |
| --- | --- | --- |
| TXT | send | v=spf1 include:amazonses.com ~all |

### MX Record

The MX record enables bounce and complaint handling.

| Type | Name | Priority | Value |
| --- | --- | --- | --- |
| MX | send | 10 | feedback-smtp.us-east-1.amazonses.com |

If your team sends from the EU region, the value is `feedback-smtp.eu-central-1.amazonses.com` instead. Copy the exact value from your dashboard.

### DMARC Record (Recommended)

DMARC protects your domain from email spoofing and improves deliverability. Add this after DKIM and SPF are verified.

| Type | Name | Value |
| --- | --- | --- |
| TXT | _dmarc | v=DMARC1; p=none; |

> [!TIP] **Learn More**
> See our complete [DMARC Guide](/docs/guide/dmarc) for detailed setup instructions, policy explanations, and how to use Cloudflare’s DMARC Management feature.

## Verification Status

After adding DNS records, your domain will go through these statuses:

| Status | Description |
| --- | --- |
| Draft | Waiting for all three DNS records to appear. We check every 10 minutes and start verification automatically once they are all in place, or you can clickVerify DNS Records. |
| Pending | All records were found and verification is in progress. This usually completes within a few minutes. |
| Verified | Domain is ready to send emails. |

If verification does not complete, the domain goes back to **Draft** and we email you so you can check your records and try again.

> [!WARNING] **DNS Propagation**
> DNS changes can take up to 48 hours to propagate. If verification fails, double-check your records and try again.

## Sending DNS Instructions

You can email the DNS configuration instructions to your domain administrator while the domain is not yet verified:

1. Go to **Domains** → select your domain
2. Click **Forward Instructions**
3. Enter the recipient email address

This is limited to 3 emails per domain per day.

## Deleting a Domain

To remove a domain:

1. Go to **Domains** → select your domain
2. Open the menu next to the domain name and click **Delete Domain**
3. Confirm, then type the domain name to confirm the deletion

After deleting a verified domain, remove its toSend DNS records from your DNS provider.

> [!CAUTION] **Warning**
> Deleting a domain will immediately stop all email sending from that domain. API requests using this domain will fail.

## Domain Statistics

The **Domains** list shows for each domain:

* Emails sent in the last 30 days
* Verification status
* Date added


---


<a id="dmarc-configuration"></a>

# DMARC

*Breadcrumbs: Docs > / > User guide*

---

*Official URL: https://tosend.com/docs/guide/dmarc/*

DMARC protects your domain from email spoofing and helps your emails land in the inbox instead of spam.

## What is DMARC?

**DMARC** stands for “Domain-based Message Authentication, Reporting, and Conformance.”

In simple terms, DMARC tells email providers (like Gmail, Outlook, Yahoo) what to do when someone tries to send an email pretending to be from your domain.

Think of it like a security guard for your email domain:

* It checks if emails are really from you
* It tells email providers how to handle fake emails
* It sends you reports about who’s using your domain

## Why Do You Need DMARC?

Without DMARC, anyone can send emails that look like they’re from your domain. This leads to:

* **Phishing attacks** - Scammers can trick your customers by pretending to be you
* **Damaged reputation** - Fake emails hurt your brand trust
* **Poor deliverability** - Email providers are less likely to trust emails from domains without DMARC

With DMARC, you tell email providers: “Only trust emails from my domain if they pass authentication checks.”

## How DMARC Works

DMARC works together with two other email authentication methods:

| Method | What It Does |
| --- | --- |
| SPF | Checks if the email came from an authorized server |
| DKIM | Checks if the email was tampered with during delivery |
| DMARC | Tells providers what to do if SPF or DKIM fails |

> [!TIP] **Good News**
> If your domain is verified with toSend, you already pass SPF and DKIM checks. Adding DMARC is the final step to complete your email authentication.

## Setting Up DMARC

### Step 1: Make Sure SPF and DKIM Are Working

Before adding DMARC, verify that your domain is fully verified in your [toSend dashboard](https://dash.tosend.com). Both DKIM and SPF records should show as verified.

### Step 2: Add the DMARC Record

Add a TXT record to your DNS with these settings:

| Field | Value |
| --- | --- |
| Type | TXT |
| Name | _dmarc |
| Value | v=DMARC1; p=none; rua=mailto:dmarc@yourdomain.com |

Replace `yourdomain.com` with your actual domain name.

> [!NOTE] **What Each Part Means**
> * `v=DMARC1` - This tells email providers it’s a DMARC record
> * `p=none` - The policy (what to do with failed emails)
> * `rua=mailto:...` - Where to send reports about your email authentication

## DMARC Policies Explained

The `p=` part of your DMARC record is the **policy**. It tells email providers what to do when an email fails authentication.

### p=none (Monitor Mode)

```plaintext
v=DMARC1; p=none; rua=mailto:dmarc@yourdomain.com
```

**What it does:** Nothing! Emails are delivered normally, even if they fail checks.

**Best for:** Starting out. Use this to monitor your email sources without affecting delivery.

### p=quarantine (Spam Folder)

```plaintext
v=DMARC1; p=quarantine; rua=mailto:dmarc@yourdomain.com
```

**What it does:** Failed emails go to the spam folder.

**Best for:** After you’ve confirmed all your legitimate email sources pass authentication.

### p=reject (Block Completely)

```plaintext
v=DMARC1; p=reject; rua=mailto:dmarc@yourdomain.com
```

**What it does:** Failed emails are blocked entirely and never delivered.

**Best for:** Maximum protection after thorough testing.

## Recommended Setup Process

> [!WARNING] **Start Slow**
> Don’t jump straight to `p=reject`. You might accidentally block your own legitimate emails.

Follow these steps for a safe DMARC rollout:

### Week 1-2: Monitor

Start with `p=none` to see what’s happening:

```plaintext
v=DMARC1; p=none; rua=mailto:dmarc@yourdomain.com
```

Check the reports to see all services sending email from your domain.

### Week 3-4: Quarantine

Once you’re confident all legitimate sources pass:

```plaintext
v=DMARC1; p=quarantine; rua=mailto:dmarc@yourdomain.com
```

### Week 5+: Reject

After confirming no issues with quarantine:

```plaintext
v=DMARC1; p=reject; rua=mailto:dmarc@yourdomain.com
```

## Using Cloudflare for DMARC

If you use **Cloudflare** for your DNS, setting up DMARC is even easier with their built-in DMARC Management feature.

### Why Use Cloudflare DMARC Management?

* **One-click setup** - No need to manually write DMARC records
* **Visual reports** - See who’s sending email from your domain in a simple dashboard
* **Easy policy changes** - Switch between none, quarantine, and reject with a click
* **Free** - Available on all Cloudflare plans

### How to Set Up DMARC with Cloudflare

1. Log in to your [Cloudflare dashboard](https://dash.cloudflare.com)
2. Select your domain
3. Go to **Email** → **DMARC Management**
4. Click **Enable DMARC Management**

![Cloudflare DMARC Management](/images/cloudflate-dmarc.jpg)

Cloudflare will automatically:

* Create the DMARC DNS record for you
* Start collecting authentication reports
* Show you easy-to-read summaries

### Viewing Reports in Cloudflare

Once enabled, Cloudflare shows you:

* **Passing emails** - Emails that passed SPF and DKIM
* **Failing emails** - Emails that failed authentication
* **Email sources** - Which servers are sending email from your domain

This helps you identify:

* Legitimate services you forgot to authorize
* Attackers trying to spoof your domain
* Misconfigured email systems

> [!TIP] **Tip**
> Cloudflare’s DMARC reports are much easier to read than raw DMARC report emails, which are in XML format.

## Checking Your DMARC Record

After adding your DMARC record, verify it’s working:

### Online Tools

* [MXToolbox DMARC Lookup](https://mxtoolbox.com/dmarc.aspx) - Enter your domain to check
* [DMARC Analyzer](https://www.dmarcanalyzer.com/dmarc/dmarc-record-check/) - Detailed DMARC analysis

### Check Email Headers

When you receive an email, look at the headers for:

```plaintext
dmarc=pass
```

This confirms DMARC is working correctly.

## Common Questions

### Do I need DMARC?

While technically optional, DMARC is highly recommended. Major email providers like Gmail and Yahoo now require DMARC for bulk senders. Even if you’re not a bulk sender, DMARC improves your email deliverability and protects your domain.

### Will DMARC break my emails?

Not if you start with `p=none`. This policy only monitors - it doesn’t affect email delivery. Only move to stricter policies after confirming everything works.

### What if I use multiple email services?

That’s fine! DMARC works with any number of email services. Just make sure each service is properly configured with SPF and DKIM. toSend handles this automatically for emails sent through our API.

### How long does DMARC take to work?

The DNS record typically propagates within a few hours. However, you’ll want to monitor for at least 1-2 weeks before changing your policy to make sure you’ve identified all your email sources.

### What are DMARC reports?

DMARC reports are daily summaries sent to the email address in your `rua=` tag. They show which emails passed or failed authentication. These reports are in XML format, which is why tools like Cloudflare DMARC Management are helpful - they translate the data into readable charts.

## Summary

| Step | Action |
| --- | --- |
| 1 | Verify your domain in toSend (DKIM + SPF) |
| 2 | Add DMARC record withp=none |
| 3 | Monitor reports for 1-2 weeks |
| 4 | Upgrade top=quarantine |
| 5 | After testing, upgrade top=reject |

> [!TIP] **Cloudflare Users**
> Use Cloudflare’s DMARC Management for the easiest setup and best reporting experience.


---


<a id="api-keys"></a>

# API Keys

*Breadcrumbs: Docs > / > User guide*

---

*Official URL: https://tosend.com/docs/guide/api-keys/*

API keys authenticate your requests to the toSend API. Each key starts with `tsend_` followed by a unique identifier.

## Creating an API Key

1. Go to **API Keys** in your dashboard
2. Click **Create key**
3. Enter a descriptive name (e.g., “Production Server”, “Staging”)
4. Optionally, restrict the key to a specific domain
5. Click **Create**

> [!WARNING] **Copy Your Key**
> The full API key is only shown once. Copy and store it securely before closing the dialog.

## Domain-Scoped Keys

You can restrict an API key to send emails only from a specific domain:

* **All Domains**: Key can send from any verified domain in your account
* **Specific Domain**: Key can only send from the selected domain

Domain-scoped keys are useful for:

* Giving different applications access to different domains
* Limiting damage if a key is compromised
* Organizing keys by project or environment

## Using API Keys

Include your API key in the `Authorization` header:

```bash
curl -X POST https://api.tosend.com/v2/emails \
  -H "Authorization: Bearer tsend_your_api_key"
```

See the [API Reference](/docs/api/introduction) for complete documentation.

## Managing Keys

### View Keys

The API Keys page shows all your keys with:

* Key name
* Truncated key value (first 8 + last 4 characters)
* The domain it is restricted to, or **All domains**
* When it was created

### Delete a Key

To revoke an API key:

1. Find the key in your list
2. Open the **⋯** menu and choose **Revoke key**
3. Confirm

> [!CAUTION] **Takes Effect Within a Minute**
> Deleting a key revokes access within a minute. Any applications using this key will then receive authentication errors.

## Admin API keys

The **Admin API** card on the same page creates a different kind of key, starting with `tsend_admin_`. Admin keys let your own software manage the account (add domains, create client teams, read logs) and carry only the permissions you tick when creating them. Most accounts don’t need one. They are available on your main account only, and cannot be used over SMTP. See the [Admin API reference](/docs/api/admin-api).

## Best Practices

* **Use descriptive names**: Name keys by environment or application (e.g., “Production”, “Marketing App”)
* **Rotate keys periodically**: Delete old keys and create new ones regularly
* **Use domain scoping**: Restrict keys to specific domains when possible
* **Never commit keys**: Keep API keys out of version control
* **Use environment variables**: Store keys in environment variables, not in code


---


<a id="send-with-smtp"></a>

# Send with SMTP

*Breadcrumbs: Docs > / > User guide*

---

*Official URL: https://tosend.com/docs/guide/smtp/*

Need to send from an app or tool that only speaks SMTP? Point any SMTP client at toSend and your messages flow through the same pipeline: verified domains, suppression handling, logs and analytics all work exactly the same.

> [!TIP] **We recommend the API**
> For new integrations, use the [REST API](/docs/api/introduction/) instead. It’s faster, returns a message ID with structured responses and richer error handling, and supports [batch sending](/docs/api/batch-emails/). SMTP is here for compatibility, when you’re wiring up an existing app, a framework mailer, or a third-party tool that only supports SMTP.

## Connection details

| Setting | Value |
| --- | --- |
| Host | smtp.tosend.com |
| Port | 465(SSL/TLS) or587(STARTTLS) |
| Username | any value (e.g.tosend), it’s ignored |
| Password | your toSend API key |

You can also find these in your dashboard under **Settings → SMTP**.

> [!TIP] **Which port?**
> Use **465** if your client asks for “SSL/TLS”, or **587** if it asks for “STARTTLS/TLS”. Both are fully encrypted.
> 
> If your hosting provider or network blocks the standard ports, use the alternates: **`2465`** (SSL/TLS) or **`2587`** (STARTTLS).

## Requirements

* **An API key**: create one under **API Keys** in your dashboard. The key is used as the SMTP password; the username can be anything. Use a sending key (`tsend_...`); admin API keys (`tsend_admin_...`) are refused over SMTP.
* **A verified sending domain**: the `From` address must use a domain you’ve verified, otherwise the message is rejected.

> [!WARNING] **Keep your key secret**
> Your API key is a credential. Store it as a secret in your application’s environment and never commit it to source control.

## Quick test

Using [swaks](https://github.com/jetmore/swaks):

```bash
swaks --server smtp.tosend.com --port 465 --tlsc \
      --auth LOGIN --auth-user tosend --auth-password YOUR_API_KEY \
      --from you@your-verified-domain.com --to test@example.com \
      --header "Subject: toSend SMTP test" --body "It works!"
```

## Examples

### Nodemailer (Node.js)

```js
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: "smtp.tosend.com",
  port: 465,
  secure: true, // true for 465, false for 587
  auth: {
    user: "tosend",
    pass: process.env.TOSEND_API_KEY,
  },
});

await transporter.sendMail({
  from: "you@your-verified-domain.com",
  to: "dest@example.com",
  subject: "Hello from toSend",
  html: "<p>Sent over SMTP.</p>",
});
```

### PHP (PHPMailer)

```php
$mail = new PHPMailer\PHPMailer\PHPMailer(true);
$mail->isSMTP();
$mail->Host       = 'smtp.tosend.com';
$mail->SMTPAuth   = true;
$mail->Username   = 'tosend';
$mail->Password   = getenv('TOSEND_API_KEY');
$mail->SMTPSecure = PHPMailer\PHPMailer\PHPMailer::ENCRYPTION_SMTPS; // 465
$mail->Port       = 465;

$mail->setFrom('you@your-verified-domain.com');
$mail->addAddress('dest@example.com');
$mail->Subject = 'Hello from toSend';
$mail->Body    = 'Sent over SMTP.';
$mail->send();
```

### Python (smtplib)

```python
import os, smtplib
from email.message import EmailMessage

msg = EmailMessage()
msg["From"] = "you@your-verified-domain.com"
msg["To"] = "dest@example.com"
msg["Subject"] = "Hello from toSend"
msg.set_content("Sent over SMTP.")

with smtplib.SMTP_SSL("smtp.tosend.com", 465) as s:
    s.login("tosend", os.environ["TOSEND_API_KEY"])
    s.send_message(msg)
```

### Supabase

In your Supabase project, go to **Authentication → Emails → SMTP Settings**, enable **Custom SMTP**, and use:

* **Sender email**: an address on your verified domain
* **Host**: `smtp.tosend.com`
* **Port**: `587`
* **Username**: `tosend`
* **Password**: your toSend API key

Supabase routes its authentication emails (confirmations, password resets, magic links) through this connection.

## Troubleshooting

* **Authentication failed**: check that the password is a valid API key and the key hasn’t been revoked.
* **Message rejected / domain not allowed**: the `From` domain must be verified in toSend.
* **Connection times out**: some hosts block outbound ports 465/587. Try the alternate ports `2465` (SSL/TLS) or `2587` (STARTTLS), or contact support.

> [!NOTE] **Note**
> Every message sent over SMTP appears in your **Logs** with the same delivery, bounce, and complaint tracking as the API.


---


<a id="ai-apps--model-context-protocol-mcp"></a>

# Connect Claude, ChatGPT and other AI apps

> Let an AI assistant check your domains, logs and bounces, or manage your account, through the toSend MCP server.

*Breadcrumbs: Docs > / > User guide*

---

*Official URL: https://tosend.com/docs/guide/mcp/*

toSend runs an [MCP](https://modelcontextprotocol.io) server, so you can connect an AI assistant such as Claude or ChatGPT to your account and ask it things in plain language:

* “Is example.com verified? If not, which DNS records are missing?”
* “Did the password reset email to [jane@example.com](mailto:jane@example.com) go out?”
* “Which addresses bounced this week?”
* “Create a client team for Acme and give it a sending key.”

There is nothing to install. You add one URL to your AI app, approve the connection in your toSend dashboard, and choose what the app may do.

| Setting | Value |
| --- | --- |
| Server URL | https://mcp.tosend.com/mcp |
| Transport | Streamable HTTP |
| Authentication | OAuth (sign in with toSend) |

## How connecting works

1. You add the server URL in your AI app.
2. Your browser opens toSend. Sign in if you aren’t already.
3. The **Connect an AI app** page shows which app is asking. Pick the team and the permissions, then click **Approve**.
4. You’re sent back to the app, which can now use toSend.

Approving creates an [admin key](/docs/api/admin-api/) with exactly the permissions you chose. The app never sees the key itself: it stays encrypted on toSend’s side, and the app only holds a token for the connection.

## Claude (web and desktop)

1. In Claude, open **Settings → Connectors** and click **Add custom connector**.
2. Name it `toSend` and enter `https://mcp.tosend.com/mcp` as the URL. Leave the advanced settings empty.
3. Click **Connect** and approve on the toSend page that opens.
4. In a chat, open the tools menu and make sure toSend is switched on.

Connectors added on claude.ai also appear in the Claude desktop app. On Team and Enterprise plans, an organization owner adds the connector first, under **Organization settings → Connectors**.

## ChatGPT

1. In ChatGPT, open **Settings → Apps & Connectors**. Custom connectors may need **Developer mode**, under **Advanced settings**, depending on your plan.
2. Create a connector with `https://mcp.tosend.com/mcp` as the URL and **OAuth** as the authentication.
3. Approve on the toSend page that opens.

## Claude Code, Cursor and VS Code

**Claude Code:**

```bash
claude mcp add --transport http tosend https://mcp.tosend.com/mcp
```

Then run `/mcp` inside Claude Code and choose **Authenticate**.

**Cursor** (`~/.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "tosend": { "url": "https://mcp.tosend.com/mcp" }
  }
}
```

**VS Code** (`.vscode/mcp.json`):

```json
{
  "servers": {
    "tosend": { "type": "http", "url": "https://mcp.tosend.com/mcp" }
  }
}
```

Each of these opens the same toSend approval page the first time you use it.

## Choosing permissions

The approval page offers three presets. You can adjust any of them before approving.

| Preset | What the app can do |
| --- | --- |
| Manage my account(default) | Read and change domains, suppressions, webhooks, sending keys and client teams, and read email logs. It cannot send email. |
| Manage and send | All of the above, plus sending email and creating sending keys. |
| Read only | Look at everything, change nothing. |

The app only sees the tools its permissions allow, so a read-only connection is never offered a tool that changes anything. The same permissions apply to the team you pick and every client team under it.

> [!WARNING] **Sending is off by default**
> Only turn on **Send email** if you want the assistant to send real email. Each send uses credits and cannot be recalled. toSend is for transactional email, so don’t ask an assistant to send newsletters or bulk messages through it.

## What the assistant can do

| Area | Tools | Permission needed |
| --- | --- | --- |
| Account | get_account: status, credit balance, bounce and complaint rates | none |
| Domains | list_domains,get_domain(with DNS records) | Domains: read |
|  | add_domain,delete_domain | Domains: write |
| Email logs | list_emails,get_email(delivery details, never the body) | Email logs: read |
| Sending | send_email: one email to real recipients | Send email |
| Suppressions | list_suppressions | Suppressions: read |
|  | remove_suppression | Suppressions: write |
| Webhooks | list_webhooks | Webhooks: read |
|  | create_webhook,update_webhook,delete_webhook | Webhooks: write |
| Sending keys | list_sending_keys(masked) | Sending keys: read |
|  | create_sending_key | Sending keys: write + Send email |
|  | delete_sending_key | Sending keys: write |
| Client teams | list_teams | Teams: read |
|  | create_team,update_team(rename, suspend, reactivate) | Teams: write |

Every tool is a call to the [Admin API](/docs/api/admin-api/), so the same rules and [rate limits](/docs/api/admin-api/#rate-limits) apply. If you manage client teams, ask for a team by name and the assistant will act on that team.

## Disconnecting

Each connection appears on the **API Keys** page in your dashboard, under **Admin API**, named after the app and the date, for example `AI: Claude (2026-10-10)`. Delete that key to disconnect: the app’s next request fails, and it has to ask for approval again.

Removing the connector inside the AI app stops the app from using it, but the key stays on your account until you delete it.

> [!NOTE] **Note**
> Each connection counts toward the limit of 10 admin keys per team. Delete connections you no longer use.

## Using an admin key directly

If your MCP client can’t do OAuth, or you’re connecting your own agent, send an existing [admin key](/docs/api/admin-api/#creating-an-admin-key) as a bearer token instead:

```plaintext
Authorization: Bearer tsend_admin_...
```

For example, with `mcp-remote` in a client that only runs local servers:

```json
{
  "mcpServers": {
    "tosend": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "https://mcp.tosend.com/mcp", "--header", "Authorization:${TOSEND_AUTH}"],
      "env": { "TOSEND_AUTH": "Bearer tsend_admin_..." }
    }
  }
}
```

The tools offered follow that key’s permissions, exactly as with an OAuth connection.

## Troubleshooting

* **The approval page says it can’t connect**: the request expired or was already used. Start the connection again from your AI app.
* **The app says the connection stopped working**: the key was deleted on the **API Keys** page. Connect again from your AI app.
* **A tool you expected is missing**: the connection doesn’t have that permission. Disconnect, then connect again and choose a broader preset.
* **A tool returns an error**: the assistant shows the reason toSend returned. The rules are the same as in the dashboard, so for example a subdomain can only be added once the account has bought credits.


---


<a id="webhooks"></a>

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


---


<a id="email-logs"></a>

# Email Logs

*Breadcrumbs: Docs > / > User guide*

---

*Official URL: https://tosend.com/docs/guide/logs/*

The Logs page shows a complete history of all emails sent through your account.

## Viewing Logs

Go to **Logs** in your dashboard to see all sent emails with:

* Subject line
* Recipient email
* Sender email
* Status
* Date

Click on any log entry to view full details.

## Log Details

Each log entry contains:

| Field | Description |
| --- | --- |
| Subject | Email subject line |
| From | Sender name and email |
| To | Recipient(s) with names |
| Reply-To | Reply-to address if set |
| Status | Delivery status |
| Message ID | Unique identifier for tracking |
| Created | When the email was accepted |
| HTML Content | Full HTML body |
| Text Content | Plain text body |
| Custom Headers | Any custom headers included |
| Attachments | Whether the email had attachments |
| Error Message | Error details if delivery failed |

## Filtering Logs

### By Status

Filter logs by delivery status. toSend tracks each email through its full lifecycle:

| Status | Description |
| --- | --- |
| Pending | Accepted by the API and queued, not yet dispatched |
| Sent | Handed off for delivery |
| Bounced | Delivery failed (hard or soft bounce; see the error message) |
| Complaint | Recipient marked the email as spam |
| Suppressed | Not dispatched because every recipient is on your suppression list or has a domain with no mail server |
| Spam | Blocked because all recipients used disposable/temporary email addresses |
| Failed | The send was rejected at dispatch or could not be completed after retries |

### By Domain

Select a specific domain to view only emails sent from that domain.

### By Search

Search logs by:

* Subject line
* Sender email
* Recipient email

## Status Indicators

* **Pending**: In the send queue, not yet dispatched
* **Sent**: Handed off for delivery to the recipient server
* **Bounced**: Delivery failed (see error message for details)
* **Complaint**: Recipient reported the email as spam
* **Suppressed**: Every recipient is on your suppression list (or has a domain with no mail server); the email was not dispatched
* **Spam**: All recipients use disposable email addresses, so the email was not dispatched
* **Failed**: The send was rejected at dispatch or ran out of retries

## Retention

Email logs, including message content, are kept for 14 days and then deleted automatically. The Logs page shows the last 14 days.

## Troubleshooting

### Email shows as Bounced

Check the error message for details:

* **Mailbox Full**: Recipient’s mailbox is full
* **User Unknown**: Email address doesn’t exist
* **Domain Not Found**: Recipient domain doesn’t exist
* **Rejected**: Recipient server rejected the email

### Email shows as Complaint

The recipient marked your email as spam. This address has been added to your suppression list and will not receive emails from that sending domain for 180 days.

### Email shows as Spam

The recipient email was identified as a disposable or temporary email address. These are automatically blocked to protect your sender reputation.


---


<a id="suppressions"></a>

# Suppressions

*Breadcrumbs: Docs > / > User guide*

---

*Official URL: https://tosend.com/docs/guide/suppressions/*

The suppression list contains email addresses that should not receive emails. This includes bounced addresses and spam complaints.

## Why Suppressions Matter

Sending to suppressed addresses harms your sender reputation:

* **Bounces**: Continued attempts to invalid addresses signals spam behavior
* **Complaints**: Ignoring spam reports can get your domain blacklisted

toSend automatically manages your suppression list to protect your deliverability.

## Viewing Suppressions

Go to **Suppressions** in your dashboard to see all suppressed addresses with:

* Email address
* Type (Hard bounce, Soft bounce, Complaint or Invalid)
* Reason
* Last activity

## Suppression Types

### Bounced

Email addresses that bounced. A hard bounce (permanent failure) blocks sending to the address for 60 days. A full mailbox blocks it for 24 hours. Any other soft bounce (temporary failure) blocks it for 2 hours, and only once the address has soft-bounced twice within 2 hours, so a single temporary failure never stops your next email. Content-related bounces (`ContentRejected`, `MessageTooLarge`, `AttachmentRejected`) never block the address.

| Bounce Type | Description |
| --- | --- |
| General | Generic permanent failure |
| MailboxFull | Recipient’s mailbox is full |
| ContentRejected | Email content was rejected |
| Suppressed | Previously bounced address |

Temporary rejections caused by the receiving server blocking the sending IP on a public blocklist are not suppressed. The message is logged as bounced and the next send is attempted normally, since the address itself is fine.

### Complained

Email addresses where the recipient clicked “Report Spam” or “Mark as Junk” in their email client. Sending to that address from the same domain is blocked for 180 days.

### Validation Suppressed

Addresses that failed email validation checks before sending.

## Filtering Suppressions

### By Type

* **Bounced**: Show only bounced addresses
* **Complaint**: Show only spam complaints
* **Invalid address**: Show only addresses that failed validation

### By Domain

View suppressions for a specific sending domain.

### By Search

Search for a specific email address.

## Automatic Suppression

toSend automatically adds addresses to your suppression list when:

1. **Hard bounce**: Permanent delivery failure (invalid address, domain not found)
2. **Soft bounce**: Temporary delivery failure. A full mailbox is held for 24 hours; other temporary failures are held for 2 hours after a second one within 2 hours
3. **Spam complaint**: Recipient reports email as spam

## Sending to Suppressed Addresses

If you attempt to send to a suppressed address:

* The email will be blocked
* If every recipient is suppressed, it will appear in your logs with status “Suppressed”; otherwise only the suppressed recipients are skipped
* A `bounced` webhook event is sent for each skipped recipient
* No email will be sent to protect your reputation

## Best Practices

* **Monitor bounce rates**: High bounce rates (>4%) indicate list quality issues
* **Clean your lists**: Remove inactive subscribers regularly
* **Use double opt-in**: Confirm email addresses before adding to your list
* **Honor unsubscribes**: Remove unsubscribed users promptly


---


<a id="metrics"></a>

# Metrics & Analytics

*Breadcrumbs: Docs > / > User guide*

---

*Official URL: https://tosend.com/docs/guide/metrics/*

Track your email performance with metrics and analytics. Stats are aggregated every 15 minutes or so, so they can lag behind the **Logs** page.

## Dashboard Overview

The home dashboard shows key metrics for the last 30 days:

| Metric | Description |
| --- | --- |
| Emails | Total emails across all domains |
| Credits | Remaining email credits (for a child team, the shared pool of its parent team) |
| Sending Health | A score from 0 to 100, with your bounce rate and complaint rate |

## Health Status

Your sending health score starts at 100 and drops as your bounce rate (from 2%) or complaint rate (from 0.05%) rises.

| Score | Label |
| --- | --- |
| 90 to 100 | Excellent |
| 75 to 89 | Good |
| 60 to 74 | Fair |
| 40 to 59 | Needs attention |
| Below 40 | Critical |

Until a team has sent 50 emails in the last 30 days, the score shows **Gathering data**. The rate that is pulling your score down is highlighted.

> [!WARNING] **High Bounce Rate**
> A bounce rate over 5% can harm your sender reputation and may result in sending restrictions. Clean your email lists regularly.

## Metrics Page

Go to **Metrics** for detailed analytics:

### Date Range

Select a time period:

* Today
* Last 7 Days
* Last 30 Days

### Domain Filter

View metrics for a specific domain or all domains combined.

### Statistics

| Metric | Description |
| --- | --- |
| Emails | Emails attempted |
| Bounced | Bounce rate, with the number of bounces |
| Complaints | Complaint rate, with the number of spam reports |
| Suppressed | Blocked (suppression list) |

### Charts

The **Email Traffic** chart shows daily trends for:

* Sent
* Bounced
* Complained
* Suppressed

**Monthly Trends** shows sent, bounced and complained emails for the last 12 months.

### Top Domains by Volume

With **All Domains** selected, a table lists your 10 busiest domains with their sent, bounced and complaint counts and delivery rate.

## Recent Activity

The dashboard shows your 10 most recent emails with quick access to:

* Subject line
* Recipient
* Status
* Timestamp

## Domain Statistics

Each domain on the **Domains** page shows:

* Emails sent in the last 30 days
* Verification status
* Date added

## Improving Metrics

### Reduce Bounces

* Verify email addresses before adding to your list
* Use double opt-in for subscriptions
* Remove inactive subscribers
* Check for typos in email addresses

### Reduce Complaints

* Only send to people who opted in
* Include clear unsubscribe links
* Set proper expectations about email frequency
* Make your sender name recognizable

### Maintain Good Health

* Keep bounce rate under 3%
* Keep complaint rate under 0.1%
* Monitor metrics regularly
* Act quickly on warning signs


---


<a id="billing--credits"></a>

# Billing & Credits

*Breadcrumbs: Docs > / > User guide*

---

*Official URL: https://tosend.com/docs/guide/billing/*

toSend uses a simple pay-as-you-go pricing model. Purchase credits and use them to send emails.

## Pricing

| Credits | Price | Cost per Email |
| --- | --- | --- |
| 10,000 emails | $3 | $0.0003 |

* **No monthly fees**: Only pay for what you use
* **Credits never expire**: Use them whenever you need
* **Multiple domains**: Send from any verified domain

## Credit Balance

View your current credit balance on the dashboard or on the **Billing** page.

Each recipient (including CC and BCC recipients) uses one credit.

## Purchasing Credits

1. Go to **Billing** and click **Buy More Credits**
2. Pick an amount or enter your own (minimum $10)
3. Credits are calculated automatically
4. Complete payment with your card

### Payment Methods

toSend accepts all major credit and debit cards through Stripe:

* Visa
* Mastercard
* American Express
* And more

### Saved Payment Methods

A card you pay with is saved for faster future purchases, and the card you used last becomes your default.

On the **Billing** page, under **Payment Methods**, you can:

* Add new cards (with a purchase)
* Remove old cards

## Transaction History

View all past purchases in the **Purchase History** section:

* Date
* Credits received
* Amount paid
* Payment method
* Invoice link

## Credit Usage

Credits are deducted when emails are queued for sending:

* **To recipients**: 1 credit each
* **CC recipients**: 1 credit each
* **BCC recipients**: 1 credit each

Example: An email to 2 recipients with 1 CC uses 3 credits.

## Low Balance

When your credit balance is low:

1. We email you when your balance drops below your **Low Credit Alert** level on the **Billing** page (5,000 credits unless you change it; set it to 0 to turn alerts off)
2. Emails may be blocked if credits run out
3. Purchase more credits to continue sending

> [!TIP] **Buffer Credits**
> Keep a buffer of credits to avoid interruption. Send requests made after your credits run out are rejected.

## Insufficient Credits

If you attempt to send without enough credits:

* The API returns a `403` error
* Error message: “Insufficient credit balance”
* Purchase more credits to resume sending

## Receipts

Click the invoice icon on any purchase to view and print its invoice for accounting purposes.


---


<a id="data-location--eu-region"></a>

# Data location and the EU region

> Where toSend stores your email data, and how to send from the EU.

*Breadcrumbs: Docs > / > User guide*

---

*Official URL: https://tosend.com/docs/guide/data-location/*

## Where your data is stored

For every team, whichever sending region it uses, toSend stores this data in the European Union:

| Data | Where |
| --- | --- |
| Email logs (recipients, subjects, statuses) | EU |
| Email content (HTML, text, attachments) | EU, deleted after 14 days |
| Suppression list | EU |
| Webhook delivery logs and sending metrics | EU |
| Database backups | EU |
| Dashboard and account data | Germany (EU) |
| SMTP relay (forwards each message, stores nothing) | Germany (EU) |

Email logs and email content are kept for 14 days, then deleted.

A few things are not EU-only:

* **Request handling.** API requests are handled at the network location closest to your server, wherever that is.
* **A short-lived cache.** To keep sending fast, a cache of account settings, API key lookups and suppressed addresses is copied to locations worldwide. Suppressed addresses and API keys are cached only as one-way hashes, never in readable form.
* **Sending.** Teams on the **Global (USA)** region send from the United States. Teams on the **EU (Frankfurt)** region send from Germany.
* **Payments.** Card payments are handled by Stripe in the United States.

## Sending from the EU

Each team has a sending region, chosen when the team is created:

* **Global (USA)**, the default
* **EU (Frankfurt)**

A team on **EU (Frankfurt)** sends every email from Germany.

To create an EU team, open the team menu and choose **Create New Team**, or go to **Billing → Teams → Create Team**. Pick **EU (Frankfurt)** under **Email sending region**. You can also choose the region when you sign up.

> [!WARNING] **Caution**
> A team’s region can’t be changed after the team is created. To move sending to the EU, create a new EU team, add and verify your domain in it, create an API key there, and switch your app to that key.

EU teams show an EU flag next to their name in the team menu.

## Legal documents

The [subprocessors list](/legal/subprocessors) names every provider we use and where each one handles data. The [Data Processing Agreement](/legal/dpa) covers international transfers.


---


<a id="wordpress--fluentsmtp"></a>

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


---


<a id="migrate-from-fluentsmtp"></a>

# Switch a FluentSMTP site to toSend.

> Already sending with FluentSMTP through another provider? Add toSend on a spare address, test it, then move your main address over. Your old connection can stay on as the fallback, so nothing stops sending at any point.

*Official URL: https://tosend.com/migrate/fluentsmtp/*

Migration guide

# Switch a FluentSMTP site to toSend.

Already sending with FluentSMTP through another provider? Add toSend on a spare address, test it, then move your main address over. Your old connection can stay on as the fallback, so nothing stops sending at any point.

[Start with 10,000 free emails](https://dash.tosend.com/register) [WordPress setup guide](/docs/guide/wordpress/)

## Seven steps, no downtime

Budget about fifteen minutes per site, most of it waiting for DNS. Running many client sites? Create a team per client first, then repeat these steps with that team's key.

[toSend for agencies](/for/agencies)

1. 1

   ### Add and verify your domain in toSend

   In your toSend dashboard, add the domain your site sends from and publish the three DNS records it shows, or click once on Cloudflare. Our records use their own names (`tosend._domainkey` and `send`), so your current provider keeps working while you set up. We verify the domain automatically once the records are visible.
2. 2

   ### Create a sending key

   Under API Keys, create a key for this site. If the site only sends from one domain, limit the key to that domain.
3. 3

   ### Add toSend on a second address first

   In FluentSMTP, use **Add Connection** and choose toSend. For the From Email, use an address on your domain that no other connection uses, such as `test@yourdomain.com`, and paste your key. FluentSMTP keeps one connection per From address, so using your current address here would replace your existing connection.
4. 4

   ### Send a test through toSend

   Use **Send Test Email** with the toSend connection, then find the email in your toSend logs.
5. 5

   ### Keep the old provider as a fallback (optional)

   Edit your current connection and change its From Email to another address on your domain, such as `fallback@yourdomain.com`. It stays connected, just no longer owns your main address. Emails sent through the fallback go out from this address.
6. 6

   ### Move your main address to toSend

   Edit the toSend connection and set its From Email to the address your site sends from. Use **Set as Default** on it, and **Set as Fallback** on the old connection if you kept it. From now on, if a send through toSend fails, FluentSMTP retries it through the fallback.
7. 7

   ### Watch for a few days

   Check your toSend logs and daily summary for bounces. Cancel the old provider's plan once you no longer need the fallback.

## Switching questions

Which providers can I switch from this way?

Any connection FluentSMTP supports, including Amazon SES, Mailgun, SendGrid, Postmark, SparkPost, Brevo, Gmail, Outlook and plain SMTP. The steps are the same whichever one you use today.

 Will emails stop while I switch?

No. Your current connection keeps sending your main address until you move that address to toSend in the last step, and it can stay on as the fallback afterwards.

 Do I need to change anything in WooCommerce or my form plugins?

No. They hand their emails to WordPress, and FluentSMTP decides which connection sends them.

 My site sends from more than one address. What happens?

FluentSMTP picks the connection by the From address, and anything it doesn't recognise goes through the default connection. A toSend connection can hold several From addresses: add them as additional sender emails, each on a domain verified in toSend.

 What about the email log in FluentSMTP?

It keeps working. FluentSMTP logs what WordPress sent, and toSend's own logs show what happened to each email after that, such as bounces.

## Ready to send? Your first *10,000 are on us.*

Every feature included. No tiers. For one website, one app, or fifty client sites.

[Get Early Access →](https://dash.tosend.com/register) [Read the docs](/docs/)

No credit card10,000 emails freePay as you go


---


<a id="migrate-from-resend"></a>

# Move from Resend to toSend.

> Resend's API is the closest to ours. Most apps change the client, turn recipient strings into objects, and are done. The one thing to plan is DNS.

*Official URL: https://tosend.com/migrate/resend/*

Migration guide

# Move from Resend to toSend.

Resend's API is the closest to ours. Most apps change the client, turn recipient strings into objects, and are done. The one thing to plan is DNS.

[Start with 10,000 free emails](https://dash.tosend.com/register) [toSend vs Resend](/compare/resend-alternative)

## The plan

Run both providers side by side and move one app or site at a time. Nothing has to switch over in one go.

1. 1

   Create a toSend account and add your sending domain. Our DKIM record (`tosend._domainkey`) never clashes with Resend's. Both services also use records named `send`: if yours already hold the values we show, keep them. If not, move a subdomain or second domain first, or use Resend's custom return path so the two stop sharing the name. We verify the domain automatically once the records are visible.
2. 2

   Create a sending key. If an app only sends from one domain, limit its key to that domain.
3. 3

   In one app, swap the Resend call for toSend (below), or change its SMTP settings. Keep everything else on Resend.
4. 4

   If you handle bounces, point a toSend webhook at the same handler and map the event names from the table below.
5. 5

   Send a test, find it in your toSend logs, then move the next app. Keep Resend until the last one has moved.

## The same email, before and after

Resend (npm install resend)

```
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

await resend.emails.send({
  from: "Your App <hello@yourdomain.com>",
  to: ["user@example.com"],
  subject: "Your receipt",
  html: "<p>Thanks for your order.</p>",
});
```

toSend (npm install tosend)

```
import { ToSend } from "tosend";

const tosend = new ToSend(process.env.TOSEND_API_KEY);

await tosend.send({
  from: { email: "hello@yourdomain.com", name: "Your App" },
  to: [{ email: "user@example.com" }],
  subject: "Your receipt",
  html: "<p>Thanks for your order.</p>",
});
```

If you build emails with React Email, render them to HTML in your app and pass the HTML. Batches of up to 100 work the same way on both.

## Concepts

| Resend | toSend |
| --- | --- |
| Team | Team. Client teams share one credit balance and one invoice |
| Domain, with a sending region | Verified domain. The sending region belongs to the team |
| API key (full or sending access) | Sending key, or admin key with the scopes you choose |
| Tags | No equivalent. Store the message_id |

## Send API fields

Field names already match. The differences are in the shape of addresses.

| Resend | toSend |
| --- | --- |
| POST https://api.resend.com/emails | POST https://api.tosend.com/v2/emails |
| Authorization: Bearer re_... | Authorization: Bearer tsend_... |
| 200 with{"id"} | 200 with{"message_id": "..."} |
| from: string | from:{"email", "name"} |
| to: string or array of strings | to: array of{"email", "name"}, up to 50 |
| cc/bcc | cc/bcc: arrays liketo |
| reply_to | reply_to: object or"Name <email>"string |
| subject | subject |
| html/text | html/text(text is generated if you send only HTML) |
| headers: object | headers: object of string keys and values |
| attachments[]:{"filename", "content"} | attachments:{"name", "type", "content"}, base64, 10 MB total |
| tags[] | No equivalent. Store the returned message_id against your own record |
| template | No stored templates. Render the HTML in your app |
| POST /emails/batch, up to 100 | POST /v2/emails/batch, up to 100 emails |

## SMTP settings

| Resend | toSend |
| --- | --- |
| smtp.resend.com | smtp.tosend.com |
| 465, 2465, 587, 2587 | 465 or 2465 (TLS), 587 or 2587 (STARTTLS) |
| resend | Any value, it's ignored |
| Your Resend API key | Your toSend sending key |

## Webhook events

toSend sends two events, bounced and complaint, once each with no retry. Hard-bounced and complained addresses are suppressed automatically whether or not you listen.

| Resend | toSend |
| --- | --- |
| email.bounced | bounced, withis_hard_bouncetrue or false |
| email.complained | complaint |
| email.sent, delivered, opened, clicked | Not sent |

## Before you switch off Resend

* Stored templates: render them to HTML in your app before sending.
* Tags and metadata: store the returned `message_id` with your own record instead.
* Open and click tracking, and delivery events: toSend doesn't have them, so remove any code that waits for them.
* Suppression list: export it and filter those addresses out of your own lists. toSend can't import one, and starts suppressing new bounces and complaints from your first send.
* DNS: check the `send` records before moving your main domain, so there's only ever one SPF record and one MX at that name.

## Migration questions

Why might the send records clash?

Both services use a subdomain called send for bounce handling. A name can only carry one SPF record, so if Resend's values differ from ours, you need to pick one. If they match exactly, both work.

 Does toSend have React Email support?

Not built in. React Email renders to HTML, and toSend sends HTML, so render in your app and pass the result.

 Can I send from the EU like Resend's eu-west-1?

Yes. Create a team on the EU region and it sends from Frankfurt. Email logs and content are stored in the EU for every team.

Resend details from resend.com/docs, checked 28 September 2026.

Other guides:
[from Postmark](/migrate/postmark) · [from Mailgun](/migrate/mailgun) · [from SendGrid](/migrate/sendgrid) · [switch a FluentSMTP site](/migrate/fluentsmtp) · [all guides](/migrate)

## Ready to send? Your first *10,000 are on us.*

Every feature included. No tiers. For one website, one app, or fifty client sites.

[Get Early Access →](https://dash.tosend.com/register) [Read the docs](/docs/)

No credit card10,000 emails freePay as you go


---


<a id="migrate-from-postmark"></a>

# Move from Postmark to toSend.

> Postmark's API maps closely onto ours. Most apps need a new client, lower-case field names and an array for recipients. Everything else can stay where it is while you move.

*Official URL: https://tosend.com/migrate/postmark/*

Migration guide

# Move from Postmark to toSend.

Postmark's API maps closely onto ours. Most apps need a new client, lower-case field names and an array for recipients. Everything else can stay where it is while you move.

[Start with 10,000 free emails](https://dash.tosend.com/register) [toSend vs Postmark](/compare/postmark-alternative)

## The plan

Run both providers side by side and move one app or site at a time. Nothing has to switch over in one go.

1. 1

   Create a toSend account and add your sending domain. Postmark's DKIM and Return-Path records use different names from ours (`tosend._domainkey` and `send`), so both can live on the same domain. We verify the domain automatically once the records are visible.
2. 2

   Create a sending key. If an app only sends from one domain, limit its key to that domain.
3. 3

   In one app, swap the Postmark call for toSend (below), or change its SMTP settings. Keep everything else on Postmark.
4. 4

   If you handle bounces, point a toSend webhook at the same handler and map the event names from the table below.
5. 5

   Send a test, find it in your toSend logs, then move the next app. Keep Postmark until the last one has moved.

## The same email, before and after

Postmark (npm install postmark)

```
import { ServerClient } from "postmark";

const client = new ServerClient(process.env.POSTMARK_TOKEN);

await client.sendEmail({
  From: "Your App <hello@yourdomain.com>",
  To: "user@example.com",
  Subject: "Your receipt",
  HtmlBody: "<p>Thanks for your order.</p>",
});
```

toSend (npm install tosend)

```
import { ToSend } from "tosend";

const tosend = new ToSend(process.env.TOSEND_API_KEY);

await tosend.send({
  from: { email: "hello@yourdomain.com", name: "Your App" },
  to: [{ email: "user@example.com" }],
  subject: "Your receipt",
  html: "<p>Thanks for your order.</p>",
});
```

Recipients change from a comma-separated string to an array of objects, and `From` becomes an object with `email` and `name`.

## Concepts

| Postmark | toSend |
| --- | --- |
| Server (one per app or client) | Team (one per client), or one team with several domains |
| Message stream (transactional, broadcast) | No streams. Keep marketing on a separate domain or team if you want it apart |
| Sender signature or domain | Verified domain (unlimited) |
| Server API token | Sending key, optionally limited to one domain |
| Account API token | Admin key with the scopes you choose |

## Send API fields

Postmark uses PascalCase field names and strings for recipients. toSend uses snake\_case and objects.

| Postmark | toSend |
| --- | --- |
| POST https://api.postmarkapp.com/email | POST https://api.tosend.com/v2/emails |
| X-Postmark-Server-Tokenheader | Authorization: Bearer tsend_... |
| 200 withMessageID | 200 with{"message_id": "..."} |
| From: string | from:{"email", "name"} |
| To: comma-separated string | to: array of{"email", "name"}, up to 50 |
| Cc/Bcc | cc/bcc: arrays liketo |
| ReplyTo | reply_to: object or"Name <email>"string |
| Subject | subject |
| HtmlBody/TextBody | html/text(text is generated if you send only HTML) |
| Headers: array of{"Name", "Value"} | headers: object of string keys and values |
| Attachments:{"Name", "Content", "ContentType"} | attachments:{"name", "type", "content"}, base64, 10 MB total |
| Tag,Metadata | No equivalent. Store the returned message_id against your own record |
| TemplateId+TemplateModel | No stored templates. Render the HTML in your app |
| MessageStream | No equivalent |
| POST /email/batch, up to 500 | POST /v2/emails/batch, up to 100 emails |

## SMTP settings

| Postmark | toSend |
| --- | --- |
| smtp.postmarkapp.com | smtp.tosend.com |
| 25, 2525, 587 | 465 or 2465 (TLS), 587 or 2587 (STARTTLS) |
| Server token (or SMTP access key) | Any value, it's ignored |
| Server token (or SMTP secret key) | Your toSend sending key |

## Webhook events

toSend sends two events, bounced and complaint, once each with no retry. Hard-bounced and complained addresses are suppressed automatically whether or not you listen.

| Postmark | toSend |
| --- | --- |
| RecordType:Bounce(HardBounce,SoftBounce...) | bounced, withis_hard_bouncetrue or false |
| RecordType:SpamComplaint | complaint |
| Delivery, Open, Click, SubscriptionChange | Not sent |

## Before you switch off Postmark

* Stored templates: render them to HTML in your app before sending.
* Tags and metadata: store the returned `message_id` with your own record instead.
* Open and click tracking, and delivery events: toSend doesn't have them, so remove any code that waits for them.
* Suppression list: export it and filter those addresses out of your own lists. toSend can't import one, and starts suppressing new bounces and complaints from your first send.
* Message streams: if you send broadcasts through Postmark, decide whether they move too. Our [acceptable use policy](/legal/acceptable-use-policy) covers marketing email.

## Migration questions

How long does a Postmark migration take?

For one app, usually under an hour of work plus the wait for DNS. Swapping the client and field names is the main change.

 Can I keep Postmark for some apps?

Yes. The DNS records don't overlap, so both services can send from the same domain for as long as you need.

 What replaces Postmark's 45-day history?

toSend keeps 14 days of logs. If you need longer, store the message\_id and the details you care about in your own database when you send.

Postmark details from postmarkapp.com/developer, checked 28 September 2026.

Other guides:
[from Mailgun](/migrate/mailgun) · [from SendGrid](/migrate/sendgrid) · [from Resend](/migrate/resend) · [switch a FluentSMTP site](/migrate/fluentsmtp) · [all guides](/migrate)

## Ready to send? Your first *10,000 are on us.*

Every feature included. No tiers. For one website, one app, or fifty client sites.

[Get Early Access →](https://dash.tosend.com/register) [Read the docs](/docs/)

No credit card10,000 emails freePay as you go


---


<a id="migrate-from-mailgun"></a>

# Move from Mailgun to toSend.

> Mailgun takes form fields on a per-domain URL. toSend takes one JSON body on one URL, with the domain read from the From address. The rest maps across directly.

*Official URL: https://tosend.com/migrate/mailgun/*

Migration guide

# Move from Mailgun to toSend.

Mailgun takes form fields on a per-domain URL. toSend takes one JSON body on one URL, with the domain read from the From address. The rest maps across directly.

[Start with 10,000 free emails](https://dash.tosend.com/register) [toSend vs Mailgun](/compare/mailgun-alternative)

## The plan

Run both providers side by side and move one app or site at a time. Nothing has to switch over in one go.

1. 1

   Create a toSend account and add your sending domain. Mailgun's SPF, DKIM and tracking records use different names from ours (`tosend._domainkey` and `send`), so both can live on the same domain. We verify the domain automatically once the records are visible.
2. 2

   Create a sending key. If an app only sends from one domain, limit its key to that domain.
3. 3

   In one app, swap the Mailgun call for toSend (below), or change its SMTP settings. Keep everything else on Mailgun.
4. 4

   If you handle bounces, point a toSend webhook at the same handler and map the event names from the table below.
5. 5

   Send a test, find it in your toSend logs, then move the next app. Keep Mailgun until the last one has moved.

## The same email, before and after

Mailgun (npm install mailgun.js form-data)

```
import FormData from "form-data";
import Mailgun from "mailgun.js";

const mg = new Mailgun(FormData).client({
  username: "api",
  key: process.env.MAILGUN_API_KEY,
});

await mg.messages.create("yourdomain.com", {
  from: "Your App <hello@yourdomain.com>",
  to: ["user@example.com"],
  subject: "Your receipt",
  html: "<p>Thanks for your order.</p>",
});
```

toSend (npm install tosend)

```
import { ToSend } from "tosend";

const tosend = new ToSend(process.env.TOSEND_API_KEY);

await tosend.send({
  from: { email: "hello@yourdomain.com", name: "Your App" },
  to: [{ email: "user@example.com" }],
  subject: "Your receipt",
  html: "<p>Thanks for your order.</p>",
});
```

There's no domain argument: toSend reads the domain from the From address, and it must be verified in your account.

## Concepts

| Mailgun | toSend |
| --- | --- |
| Domain (sending URL includes it) | Verified domain, taken from the From address |
| Subaccount | Team (one per client), sharing one credit balance |
| API key, domain sending key | Sending key, optionally limited to one domain |
| US or EU region (api.eu.mailgun.net) | One API host. Data is stored in the EU, and a team can send from Frankfurt |

## Send API fields

Mailgun takes multipart form fields with prefixes (h:, o:, v:). toSend takes plain JSON.

| Mailgun | toSend |
| --- | --- |
| POST /v3/{domain}/messages, form data | POST https://api.tosend.com/v2/emails, JSON |
| Basic auth, userapi | Authorization: Bearer tsend_... |
| 200 with{"id", "message"} | 200 with{"message_id": "..."} |
| from: string | from:{"email", "name"} |
| to: string or list | to: array of{"email", "name"}, up to 50 |
| cc/bcc | cc/bcc: arrays liketo |
| h:Reply-To | reply_to: object or"Name <email>"string |
| subject | subject |
| html/text | html/text(text is generated if you send only HTML) |
| h:X-My-Headerfields | headers: object of string keys and values |
| attachmentfile parts | attachments:{"name", "type", "content"}, base64, 10 MB total |
| o:tag,v:name | No equivalent. Store the returned message_id against your own record |
| template,t:variables | No stored templates. Render the HTML in your app |
| recipient-variables, up to 1,000 recipients | POST /v2/emails/batch, up to 100 emails |

## SMTP settings

| Mailgun | toSend |
| --- | --- |
| smtp.mailgun.org | smtp.tosend.com |
| 25, 465, 587, 2525 | 465 or 2465 (TLS), 587 or 2587 (STARTTLS) |
| SMTP login from the domain's settings | Any value, it's ignored |
| SMTP password for that login | Your toSend sending key |

## Webhook events

toSend sends two events, bounced and complaint, once each with no retry. Hard-bounced and complained addresses are suppressed automatically whether or not you listen.

| Mailgun | toSend |
| --- | --- |
| permanent_fail/temporary_fail(eventfailed) | bounced, withis_hard_bouncetrue or false |
| complained | complaint |
| delivered, opened, clicked, unsubscribed | Not sent |

## Before you switch off Mailgun

* Stored templates: render them to HTML in your app before sending.
* Tags and metadata: store the returned `message_id` with your own record instead.
* Open and click tracking, and delivery events: toSend doesn't have them, so remove any code that waits for them.
* Suppression list: export it and filter those addresses out of your own lists. toSend can't import one, and starts suppressing new bounces and complaints from your first send.
* Inbound routes: toSend doesn't receive email, so keep your MX records and routes where they are.

## Migration questions

Do I have to remove Mailgun's DNS records?

No. Our records use their own names, so leave Mailgun's in place until you've moved every app, then remove them.

 I use Mailgun's EU region. Where does toSend keep my data?

Email logs, content and suppression lists are stored in the EU for every team. Create your team on the EU region to send from Frankfurt too.

 I send through Mailgun from WordPress.

If you use FluentSMTP, follow the FluentSMTP guide instead: add a toSend connection, test it, then move your main address over.

Mailgun details from documentation.mailgun.com, checked 28 September 2026.

Other guides:
[from Postmark](/migrate/postmark) · [from SendGrid](/migrate/sendgrid) · [from Resend](/migrate/resend) · [switch a FluentSMTP site](/migrate/fluentsmtp) · [all guides](/migrate)

## Ready to send? Your first *10,000 are on us.*

Every feature included. No tiers. For one website, one app, or fifty client sites.

[Get Early Access →](https://dash.tosend.com/register) [Read the docs](/docs/)

No credit card10,000 emails freePay as you go


---


<a id="migrate-from-sendgrid"></a>

# Move from SendGrid to toSend.

> SendGrid wraps recipients in personalizations and the body in a content array. toSend puts them at the top level. If you use SMTP, only the host and credentials change.

*Official URL: https://tosend.com/migrate/sendgrid/*

Migration guide

# Move from SendGrid to toSend.

SendGrid wraps recipients in personalizations and the body in a content array. toSend puts them at the top level. If you use SMTP, only the host and credentials change.

[Start with 10,000 free emails](https://dash.tosend.com/register) [toSend vs SendGrid](/compare/sendgrid-alternative)

## The plan

Run both providers side by side and move one app or site at a time. Nothing has to switch over in one go.

1. 1

   Create a toSend account and add your sending domain. SendGrid's authentication CNAMEs (`em1234`, `s1._domainkey`, `s2._domainkey`) use different names from ours (`tosend._domainkey` and `send`), so both can live on the same domain. We verify the domain automatically once the records are visible.
2. 2

   Create a sending key. If an app only sends from one domain, limit its key to that domain.
3. 3

   In one app, swap the SendGrid call for toSend (below), or change its SMTP settings. Keep everything else on SendGrid.
4. 4

   If you handle bounces, point a toSend webhook at the same handler and map the event names from the table below.
5. 5

   Send a test, find it in your toSend logs, then move the next app. Keep SendGrid until the last one has moved.

## The same email, before and after

SendGrid (npm install @sendgrid/mail)

```
import sgMail from "@sendgrid/mail";

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

await sgMail.send({
  from: { email: "hello@yourdomain.com", name: "Your App" },
  to: "user@example.com",
  subject: "Your receipt",
  html: "<p>Thanks for your order.</p>",
});
```

toSend (npm install tosend)

```
import { ToSend } from "tosend";

const tosend = new ToSend(process.env.TOSEND_API_KEY);

await tosend.send({
  from: { email: "hello@yourdomain.com", name: "Your App" },
  to: [{ email: "user@example.com" }],
  subject: "Your receipt",
  html: "<p>Thanks for your order.</p>",
});
```

The Node helper flattens SendGrid's personalizations for you. On the raw API, move `personalizations[0].to` up to `to` and `content` into `html` and `text`.

## Concepts

| SendGrid | toSend |
| --- | --- |
| Subuser | Team (one per client), sharing one credit balance |
| Sender authentication (domain) | Verified domain (unlimited) |
| API key with permissions | Sending key (send only), or admin key with scopes |
| Categories, custom args | No equivalent. Store the message_id |

## Send API fields

The biggest change is structural: SendGrid nests recipients and content, toSend doesn't.

| SendGrid | toSend |
| --- | --- |
| POST https://api.sendgrid.com/v3/mail/send | POST https://api.tosend.com/v2/emails |
| Authorization: Bearerkey | Authorization: Bearer tsend_... |
| 202, ID inX-Message-Idheader | 200 with{"message_id": "..."} |
| from:{"email", "name"} | from:{"email", "name"} |
| personalizations[].to[] | to: array of{"email", "name"}, up to 50 |
| personalizations[].cc / .bcc | cc/bcc: arrays liketo |
| reply_to | reply_to: object or"Name <email>"string |
| subject | subject |
| content[]:{"type", "value"} | html/text(text is generated if you send only HTML) |
| headers: object | headers: object of string keys and values |
| attachments[]:{"content", "filename", "type"} | attachments:{"name", "type", "content"}, base64, 10 MB total |
| categories,custom_args | No equivalent. Store the returned message_id against your own record |
| template_id(dynamic templates) | No stored templates. Render the HTML in your app |
| Many personalizations, up to 1,000 | POST /v2/emails/batch, up to 100 emails |

## SMTP settings

| SendGrid | toSend |
| --- | --- |
| smtp.sendgrid.net | smtp.tosend.com |
| 25, 587, 2525, 465 | 465 or 2465 (TLS), 587 or 2587 (STARTTLS) |
| Literallyapikey | Any value, it's ignored |
| Your SendGrid API key | Your toSend sending key |

## Webhook events

toSend sends two events, bounced and complaint, once each with no retry. Hard-bounced and complained addresses are suppressed automatically whether or not you listen.

| SendGrid | toSend |
| --- | --- |
| bounce(typebounceorblocked),dropped | bounced, withis_hard_bouncetrue or false |
| spamreport | complaint |
| processed, delivered, deferred, open, click, unsubscribe | Not sent |

## Before you switch off SendGrid

* Stored templates: render them to HTML in your app before sending.
* Tags and metadata: store the returned `message_id` with your own record instead.
* Open and click tracking, and delivery events: toSend doesn't have them, so remove any code that waits for them.
* Suppression list: export it and filter those addresses out of your own lists. toSend can't import one, and starts suppressing new bounces and complaints from your first send.
* The send response: SendGrid returns 202 with an empty body. toSend returns 200 with a `message_id` in the body, so update any code that reads the header.

## Migration questions

I only use SendGrid over SMTP. What changes?

The host becomes smtp.tosend.com, the username can be anything, and the password is your toSend sending key. The From address must be on a domain verified in toSend.

 Do my dynamic templates carry over?

No. toSend has no stored templates, so render the template in your app and send the resulting HTML.

 What about my SendGrid marketing campaigns?

toSend doesn't build campaigns. If you're on WordPress, FluentCRM from the same team can send newsletters through toSend.

SendGrid details from twilio.com/docs/sendgrid, checked 28 September 2026.

Other guides:
[from Postmark](/migrate/postmark) · [from Mailgun](/migrate/mailgun) · [from Resend](/migrate/resend) · [switch a FluentSMTP site](/migrate/fluentsmtp) · [all guides](/migrate)

## Ready to send? Your first *10,000 are on us.*

Every feature included. No tiers. For one website, one app, or fifty client sites.

[Get Early Access →](https://dash.tosend.com/register) [Read the docs](/docs/)

No credit card10,000 emails freePay as you go


---

