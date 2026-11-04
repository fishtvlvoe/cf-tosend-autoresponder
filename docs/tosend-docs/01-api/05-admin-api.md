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
