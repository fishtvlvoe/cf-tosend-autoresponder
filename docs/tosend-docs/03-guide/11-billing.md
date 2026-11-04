# Billing & Credits

*Breadcrumbs: Docs > / > User guide*

---

*Official URL: https://tosend.com/docs/guide/billing/*

toSend uses a simple pay-as-you-go pricing model. Purchase credits and use them to send emails.

## Pricing

| Credits | Price | Cost per Email |
| --- | --- | --- |
| 10,000 emails | $3 | $0.0003 |

* **No monthly fees**: Only pay for what you use
* **Credits never expire**: Use them whenever you need
* **Multiple domains**: Send from any verified domain

## Credit Balance

View your current credit balance on the dashboard or on the **Billing** page.

Each recipient (including CC and BCC recipients) uses one credit.

## Purchasing Credits

1. Go to **Billing** and click **Buy More Credits**
2. Pick an amount or enter your own (minimum $10)
3. Credits are calculated automatically
4. Complete payment with your card

### Payment Methods

toSend accepts all major credit and debit cards through Stripe:

* Visa
* Mastercard
* American Express
* And more

### Saved Payment Methods

A card you pay with is saved for faster future purchases, and the card you used last becomes your default.

On the **Billing** page, under **Payment Methods**, you can:

* Add new cards (with a purchase)
* Remove old cards

## Transaction History

View all past purchases in the **Purchase History** section:

* Date
* Credits received
* Amount paid
* Payment method
* Invoice link

## Credit Usage

Credits are deducted when emails are queued for sending:

* **To recipients**: 1 credit each
* **CC recipients**: 1 credit each
* **BCC recipients**: 1 credit each

Example: An email to 2 recipients with 1 CC uses 3 credits.

## Low Balance

When your credit balance is low:

1. We email you when your balance drops below your **Low Credit Alert** level on the **Billing** page (5,000 credits unless you change it; set it to 0 to turn alerts off)
2. Emails may be blocked if credits run out
3. Purchase more credits to continue sending

> [!TIP] **Buffer Credits**
> Keep a buffer of credits to avoid interruption. Send requests made after your credits run out are rejected.

## Insufficient Credits

If you attempt to send without enough credits:

* The API returns a `403` error
* Error message: “Insufficient credit balance”
* Purchase more credits to resume sending

## Receipts

Click the invoice icon on any purchase to view and print its invoice for accounting purposes.
