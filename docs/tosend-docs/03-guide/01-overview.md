# Documentation

> How to send email from your website, app or client sites with toSend. WordPress sites
        connect through FluentSMTP, any app can use SMTP, and your own code can call the API or
        one of the SDKs. Start with the quickstart, or jump to the page you need.

*Breadcrumbs: Docs*

---

*Official URL: https://tosend.com/docs/*

Docs

# Documentation

How to send email from your website, app or client sites with toSend. WordPress sites
connect through FluentSMTP, any app can use SMTP, and your own code can call the API or
one of the SDKs. Start with the quickstart, or jump to the page you need.

[Quickstart →](/docs/guide/domains/) [WordPress setup](/docs/guide/wordpress/) [API reference](/docs/api/introduction/)

## User guide

 12 pages

* [Domains Add a sending domain and publish the DKIM, SPF and MX records that verify it.](/docs/guide/domains/)
* [DMARC What DMARC does, and the record that stops others sending as your domain.](/docs/guide/dmarc/)
* [API keys Create, restrict and revoke the keys your code sends with.](/docs/guide/api-keys/)
* [Send with SMTP Connection details for apps and tools that only speak SMTP.](/docs/guide/smtp/)
* [AI apps (MCP) Connect Claude, ChatGPT or any MCP client to your account.](/docs/guide/mcp/)
* [Webhooks Get signed bounce and complaint events posted to your own endpoint.](/docs/guide/webhooks/)
* [Email logs Find any sent email and check its delivery status.](/docs/guide/logs/)
* [Suppressions How bounced and complained addresses are blocked from future sends.](/docs/guide/suppressions/)
* [Metrics Sends, bounce rate and account health, per domain and date range.](/docs/guide/metrics/)
* [Billing Pay-as-you-go credits, how they are counted, and what happens when they run out.](/docs/guide/billing/)
* [Data location & EU region Where your email data is stored, and how to send from the EU.](/docs/guide/data-location/)
* [WordPress Connect a WordPress site through the free FluentSMTP plugin.](/docs/guide/wordpress/)

## API reference

 5 pages

* [Introduction Base URL, authentication and error format for the REST API.](/docs/api/introduction/)
* [Send email POST /v2/emails to send one email to one or more recipients.](/docs/api/send-email/)
* [Batch emails Send up to 100 emails in a single request.](/docs/api/batch-emails/)
* [Account info GET /v2/info to check a key, your credit balance and your domains.](/docs/api/account-info/)
* [Admin API Manage domains, logs, keys and client teams with an admin key.](/docs/api/admin-api/)

## SDKs

 6 pages

* [Overview The official client libraries and what they all support.](/docs/sdks/)
* [Node.js npm install tosend. Requires Node.js 18 or later.](/docs/sdks/node/)
* [Python pip install tosend. Requires Python 3.8 or later.](/docs/sdks/python/)
* [Go github.com/tosend/tosend-go. Requires Go 1.21 or later.](/docs/sdks/go/)
* [Laravel tosend/tosend-laravel for Laravel 10 to 13.](/docs/sdks/laravel/)
* [PHP tosend/tosend-php for plain PHP 7.4 or later.](/docs/sdks/php/)
