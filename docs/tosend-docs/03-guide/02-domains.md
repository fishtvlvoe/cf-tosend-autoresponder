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
