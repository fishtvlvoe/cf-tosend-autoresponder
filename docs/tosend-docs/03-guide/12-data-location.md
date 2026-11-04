# Data location and the EU region

> Where toSend stores your email data, and how to send from the EU.

*Breadcrumbs: Docs > / > User guide*

---

*Official URL: https://tosend.com/docs/guide/data-location/*

## Where your data is stored

For every team, whichever sending region it uses, toSend stores this data in the European Union:

| Data | Where |
| --- | --- |
| Email logs (recipients, subjects, statuses) | EU |
| Email content (HTML, text, attachments) | EU, deleted after 14 days |
| Suppression list | EU |
| Webhook delivery logs and sending metrics | EU |
| Database backups | EU |
| Dashboard and account data | Germany (EU) |
| SMTP relay (forwards each message, stores nothing) | Germany (EU) |

Email logs and email content are kept for 14 days, then deleted.

A few things are not EU-only:

* **Request handling.** API requests are handled at the network location closest to your server, wherever that is.
* **A short-lived cache.** To keep sending fast, a cache of account settings, API key lookups and suppressed addresses is copied to locations worldwide. Suppressed addresses and API keys are cached only as one-way hashes, never in readable form.
* **Sending.** Teams on the **Global (USA)** region send from the United States. Teams on the **EU (Frankfurt)** region send from Germany.
* **Payments.** Card payments are handled by Stripe in the United States.

## Sending from the EU

Each team has a sending region, chosen when the team is created:

* **Global (USA)**, the default
* **EU (Frankfurt)**

A team on **EU (Frankfurt)** sends every email from Germany.

To create an EU team, open the team menu and choose **Create New Team**, or go to **Billing → Teams → Create Team**. Pick **EU (Frankfurt)** under **Email sending region**. You can also choose the region when you sign up.

> [!WARNING] **Caution**
> A team’s region can’t be changed after the team is created. To move sending to the EU, create a new EU team, add and verify your domain in it, create an API key there, and switch your app to that key.

EU teams show an EU flag next to their name in the team menu.

## Legal documents

The [subprocessors list](/legal/subprocessors) names every provider we use and where each one handles data. The [Data Processing Agreement](/legal/dpa) covers international transfers.
