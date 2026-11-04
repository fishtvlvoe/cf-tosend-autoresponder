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
