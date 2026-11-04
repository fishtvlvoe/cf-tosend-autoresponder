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
