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
