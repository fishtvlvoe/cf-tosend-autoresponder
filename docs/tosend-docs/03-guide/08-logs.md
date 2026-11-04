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
