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
