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
