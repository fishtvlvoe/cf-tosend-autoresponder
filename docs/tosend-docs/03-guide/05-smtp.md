# Send with SMTP

*Breadcrumbs: Docs > / > User guide*

---

*Official URL: https://tosend.com/docs/guide/smtp/*

Need to send from an app or tool that only speaks SMTP? Point any SMTP client at toSend and your messages flow through the same pipeline: verified domains, suppression handling, logs and analytics all work exactly the same.

> [!TIP] **We recommend the API**
> For new integrations, use the [REST API](/docs/api/introduction/) instead. It’s faster, returns a message ID with structured responses and richer error handling, and supports [batch sending](/docs/api/batch-emails/). SMTP is here for compatibility, when you’re wiring up an existing app, a framework mailer, or a third-party tool that only supports SMTP.

## Connection details

| Setting | Value |
| --- | --- |
| Host | smtp.tosend.com |
| Port | 465(SSL/TLS) or587(STARTTLS) |
| Username | any value (e.g.tosend), it’s ignored |
| Password | your toSend API key |

You can also find these in your dashboard under **Settings → SMTP**.

> [!TIP] **Which port?**
> Use **465** if your client asks for “SSL/TLS”, or **587** if it asks for “STARTTLS/TLS”. Both are fully encrypted.
> 
> If your hosting provider or network blocks the standard ports, use the alternates: **`2465`** (SSL/TLS) or **`2587`** (STARTTLS).

## Requirements

* **An API key**: create one under **API Keys** in your dashboard. The key is used as the SMTP password; the username can be anything. Use a sending key (`tsend_...`); admin API keys (`tsend_admin_...`) are refused over SMTP.
* **A verified sending domain**: the `From` address must use a domain you’ve verified, otherwise the message is rejected.

> [!WARNING] **Keep your key secret**
> Your API key is a credential. Store it as a secret in your application’s environment and never commit it to source control.

## Quick test

Using [swaks](https://github.com/jetmore/swaks):

```bash
swaks --server smtp.tosend.com --port 465 --tlsc \
      --auth LOGIN --auth-user tosend --auth-password YOUR_API_KEY \
      --from you@your-verified-domain.com --to test@example.com \
      --header "Subject: toSend SMTP test" --body "It works!"
```

## Examples

### Nodemailer (Node.js)

```js
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: "smtp.tosend.com",
  port: 465,
  secure: true, // true for 465, false for 587
  auth: {
    user: "tosend",
    pass: process.env.TOSEND_API_KEY,
  },
});

await transporter.sendMail({
  from: "you@your-verified-domain.com",
  to: "dest@example.com",
  subject: "Hello from toSend",
  html: "<p>Sent over SMTP.</p>",
});
```

### PHP (PHPMailer)

```php
$mail = new PHPMailer\PHPMailer\PHPMailer(true);
$mail->isSMTP();
$mail->Host       = 'smtp.tosend.com';
$mail->SMTPAuth   = true;
$mail->Username   = 'tosend';
$mail->Password   = getenv('TOSEND_API_KEY');
$mail->SMTPSecure = PHPMailer\PHPMailer\PHPMailer::ENCRYPTION_SMTPS; // 465
$mail->Port       = 465;

$mail->setFrom('you@your-verified-domain.com');
$mail->addAddress('dest@example.com');
$mail->Subject = 'Hello from toSend';
$mail->Body    = 'Sent over SMTP.';
$mail->send();
```

### Python (smtplib)

```python
import os, smtplib
from email.message import EmailMessage

msg = EmailMessage()
msg["From"] = "you@your-verified-domain.com"
msg["To"] = "dest@example.com"
msg["Subject"] = "Hello from toSend"
msg.set_content("Sent over SMTP.")

with smtplib.SMTP_SSL("smtp.tosend.com", 465) as s:
    s.login("tosend", os.environ["TOSEND_API_KEY"])
    s.send_message(msg)
```

### Supabase

In your Supabase project, go to **Authentication → Emails → SMTP Settings**, enable **Custom SMTP**, and use:

* **Sender email**: an address on your verified domain
* **Host**: `smtp.tosend.com`
* **Port**: `587`
* **Username**: `tosend`
* **Password**: your toSend API key

Supabase routes its authentication emails (confirmations, password resets, magic links) through this connection.

## Troubleshooting

* **Authentication failed**: check that the password is a valid API key and the key hasn’t been revoked.
* **Message rejected / domain not allowed**: the `From` domain must be verified in toSend.
* **Connection times out**: some hosts block outbound ports 465/587. Try the alternate ports `2465` (SSL/TLS) or `2587` (STARTTLS), or contact support.

> [!NOTE] **Note**
> Every message sent over SMTP appears in your **Logs** with the same delivery, bounce, and complaint tracking as the API.
