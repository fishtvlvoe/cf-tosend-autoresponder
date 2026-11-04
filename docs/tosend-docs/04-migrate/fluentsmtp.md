# Switch a FluentSMTP site to toSend.

> Already sending with FluentSMTP through another provider? Add toSend on a spare address, test it, then move your main address over. Your old connection can stay on as the fallback, so nothing stops sending at any point.

*Official URL: https://tosend.com/migrate/fluentsmtp/*

Migration guide

# Switch a FluentSMTP site to toSend.

Already sending with FluentSMTP through another provider? Add toSend on a spare address, test it, then move your main address over. Your old connection can stay on as the fallback, so nothing stops sending at any point.

[Start with 10,000 free emails](https://dash.tosend.com/register) [WordPress setup guide](/docs/guide/wordpress/)

## Seven steps, no downtime

Budget about fifteen minutes per site, most of it waiting for DNS. Running many client sites? Create a team per client first, then repeat these steps with that team's key.

[toSend for agencies](/for/agencies)

1. 1

   ### Add and verify your domain in toSend

   In your toSend dashboard, add the domain your site sends from and publish the three DNS records it shows, or click once on Cloudflare. Our records use their own names (`tosend._domainkey` and `send`), so your current provider keeps working while you set up. We verify the domain automatically once the records are visible.
2. 2

   ### Create a sending key

   Under API Keys, create a key for this site. If the site only sends from one domain, limit the key to that domain.
3. 3

   ### Add toSend on a second address first

   In FluentSMTP, use **Add Connection** and choose toSend. For the From Email, use an address on your domain that no other connection uses, such as `test@yourdomain.com`, and paste your key. FluentSMTP keeps one connection per From address, so using your current address here would replace your existing connection.
4. 4

   ### Send a test through toSend

   Use **Send Test Email** with the toSend connection, then find the email in your toSend logs.
5. 5

   ### Keep the old provider as a fallback (optional)

   Edit your current connection and change its From Email to another address on your domain, such as `fallback@yourdomain.com`. It stays connected, just no longer owns your main address. Emails sent through the fallback go out from this address.
6. 6

   ### Move your main address to toSend

   Edit the toSend connection and set its From Email to the address your site sends from. Use **Set as Default** on it, and **Set as Fallback** on the old connection if you kept it. From now on, if a send through toSend fails, FluentSMTP retries it through the fallback.
7. 7

   ### Watch for a few days

   Check your toSend logs and daily summary for bounces. Cancel the old provider's plan once you no longer need the fallback.

## Switching questions

Which providers can I switch from this way?

Any connection FluentSMTP supports, including Amazon SES, Mailgun, SendGrid, Postmark, SparkPost, Brevo, Gmail, Outlook and plain SMTP. The steps are the same whichever one you use today.

 Will emails stop while I switch?

No. Your current connection keeps sending your main address until you move that address to toSend in the last step, and it can stay on as the fallback afterwards.

 Do I need to change anything in WooCommerce or my form plugins?

No. They hand their emails to WordPress, and FluentSMTP decides which connection sends them.

 My site sends from more than one address. What happens?

FluentSMTP picks the connection by the From address, and anything it doesn't recognise goes through the default connection. A toSend connection can hold several From addresses: add them as additional sender emails, each on a domain verified in toSend.

 What about the email log in FluentSMTP?

It keeps working. FluentSMTP logs what WordPress sent, and toSend's own logs show what happened to each email after that, such as bounces.

## Ready to send? Your first *10,000 are on us.*

Every feature included. No tiers. For one website, one app, or fifty client sites.

[Get Early Access →](https://dash.tosend.com/register) [Read the docs](/docs/)

No credit card10,000 emails freePay as you go
