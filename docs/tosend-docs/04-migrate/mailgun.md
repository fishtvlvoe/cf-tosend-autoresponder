# Move from Mailgun to toSend.

> Mailgun takes form fields on a per-domain URL. toSend takes one JSON body on one URL, with the domain read from the From address. The rest maps across directly.

*Official URL: https://tosend.com/migrate/mailgun/*

Migration guide

# Move from Mailgun to toSend.

Mailgun takes form fields on a per-domain URL. toSend takes one JSON body on one URL, with the domain read from the From address. The rest maps across directly.

[Start with 10,000 free emails](https://dash.tosend.com/register) [toSend vs Mailgun](/compare/mailgun-alternative)

## The plan

Run both providers side by side and move one app or site at a time. Nothing has to switch over in one go.

1. 1

   Create a toSend account and add your sending domain. Mailgun's SPF, DKIM and tracking records use different names from ours (`tosend._domainkey` and `send`), so both can live on the same domain. We verify the domain automatically once the records are visible.
2. 2

   Create a sending key. If an app only sends from one domain, limit its key to that domain.
3. 3

   In one app, swap the Mailgun call for toSend (below), or change its SMTP settings. Keep everything else on Mailgun.
4. 4

   If you handle bounces, point a toSend webhook at the same handler and map the event names from the table below.
5. 5

   Send a test, find it in your toSend logs, then move the next app. Keep Mailgun until the last one has moved.

## The same email, before and after

Mailgun (npm install mailgun.js form-data)

```
import FormData from "form-data";
import Mailgun from "mailgun.js";

const mg = new Mailgun(FormData).client({
  username: "api",
  key: process.env.MAILGUN_API_KEY,
});

await mg.messages.create("yourdomain.com", {
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

There's no domain argument: toSend reads the domain from the From address, and it must be verified in your account.

## Concepts

| Mailgun | toSend |
| --- | --- |
| Domain (sending URL includes it) | Verified domain, taken from the From address |
| Subaccount | Team (one per client), sharing one credit balance |
| API key, domain sending key | Sending key, optionally limited to one domain |
| US or EU region (api.eu.mailgun.net) | One API host. Data is stored in the EU, and a team can send from Frankfurt |

## Send API fields

Mailgun takes multipart form fields with prefixes (h:, o:, v:). toSend takes plain JSON.

| Mailgun | toSend |
| --- | --- |
| POST /v3/{domain}/messages, form data | POST https://api.tosend.com/v2/emails, JSON |
| Basic auth, userapi | Authorization: Bearer tsend_... |
| 200 with{"id", "message"} | 200 with{"message_id": "..."} |
| from: string | from:{"email", "name"} |
| to: string or list | to: array of{"email", "name"}, up to 50 |
| cc/bcc | cc/bcc: arrays liketo |
| h:Reply-To | reply_to: object or"Name <email>"string |
| subject | subject |
| html/text | html/text(text is generated if you send only HTML) |
| h:X-My-Headerfields | headers: object of string keys and values |
| attachmentfile parts | attachments:{"name", "type", "content"}, base64, 10 MB total |
| o:tag,v:name | No equivalent. Store the returned message_id against your own record |
| template,t:variables | No stored templates. Render the HTML in your app |
| recipient-variables, up to 1,000 recipients | POST /v2/emails/batch, up to 100 emails |

## SMTP settings

| Mailgun | toSend |
| --- | --- |
| smtp.mailgun.org | smtp.tosend.com |
| 25, 465, 587, 2525 | 465 or 2465 (TLS), 587 or 2587 (STARTTLS) |
| SMTP login from the domain's settings | Any value, it's ignored |
| SMTP password for that login | Your toSend sending key |

## Webhook events

toSend sends two events, bounced and complaint, once each with no retry. Hard-bounced and complained addresses are suppressed automatically whether or not you listen.

| Mailgun | toSend |
| --- | --- |
| permanent_fail/temporary_fail(eventfailed) | bounced, withis_hard_bouncetrue or false |
| complained | complaint |
| delivered, opened, clicked, unsubscribed | Not sent |

## Before you switch off Mailgun

* Stored templates: render them to HTML in your app before sending.
* Tags and metadata: store the returned `message_id` with your own record instead.
* Open and click tracking, and delivery events: toSend doesn't have them, so remove any code that waits for them.
* Suppression list: export it and filter those addresses out of your own lists. toSend can't import one, and starts suppressing new bounces and complaints from your first send.
* Inbound routes: toSend doesn't receive email, so keep your MX records and routes where they are.

## Migration questions

Do I have to remove Mailgun's DNS records?

No. Our records use their own names, so leave Mailgun's in place until you've moved every app, then remove them.

 I use Mailgun's EU region. Where does toSend keep my data?

Email logs, content and suppression lists are stored in the EU for every team. Create your team on the EU region to send from Frankfurt too.

 I send through Mailgun from WordPress.

If you use FluentSMTP, follow the FluentSMTP guide instead: add a toSend connection, test it, then move your main address over.

Mailgun details from documentation.mailgun.com, checked 28 September 2026.

Other guides:
[from Postmark](/migrate/postmark) · [from SendGrid](/migrate/sendgrid) · [from Resend](/migrate/resend) · [switch a FluentSMTP site](/migrate/fluentsmtp) · [all guides](/migrate)

## Ready to send? Your first *10,000 are on us.*

Every feature included. No tiers. For one website, one app, or fifty client sites.

[Get Early Access →](https://dash.tosend.com/register) [Read the docs](/docs/)

No credit card10,000 emails freePay as you go
