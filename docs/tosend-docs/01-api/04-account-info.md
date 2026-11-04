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
