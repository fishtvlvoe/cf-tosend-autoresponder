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
