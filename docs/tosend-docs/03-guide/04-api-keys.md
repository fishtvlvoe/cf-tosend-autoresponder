# API Keys

*Breadcrumbs: Docs > / > User guide*

---

*Official URL: https://tosend.com/docs/guide/api-keys/*

API keys authenticate your requests to the toSend API. Each key starts with `tsend_` followed by a unique identifier.

## Creating an API Key

1. Go to **API Keys** in your dashboard
2. Click **Create key**
3. Enter a descriptive name (e.g., “Production Server”, “Staging”)
4. Optionally, restrict the key to a specific domain
5. Click **Create**

> [!WARNING] **Copy Your Key**
> The full API key is only shown once. Copy and store it securely before closing the dialog.

## Domain-Scoped Keys

You can restrict an API key to send emails only from a specific domain:

* **All Domains**: Key can send from any verified domain in your account
* **Specific Domain**: Key can only send from the selected domain

Domain-scoped keys are useful for:

* Giving different applications access to different domains
* Limiting damage if a key is compromised
* Organizing keys by project or environment

## Using API Keys

Include your API key in the `Authorization` header:

```bash
curl -X POST https://api.tosend.com/v2/emails \
  -H "Authorization: Bearer tsend_your_api_key"
```

See the [API Reference](/docs/api/introduction) for complete documentation.

## Managing Keys

### View Keys

The API Keys page shows all your keys with:

* Key name
* Truncated key value (first 8 + last 4 characters)
* The domain it is restricted to, or **All domains**
* When it was created

### Delete a Key

To revoke an API key:

1. Find the key in your list
2. Open the **⋯** menu and choose **Revoke key**
3. Confirm

> [!CAUTION] **Takes Effect Within a Minute**
> Deleting a key revokes access within a minute. Any applications using this key will then receive authentication errors.

## Admin API keys

The **Admin API** card on the same page creates a different kind of key, starting with `tsend_admin_`. Admin keys let your own software manage the account (add domains, create client teams, read logs) and carry only the permissions you tick when creating them. Most accounts don’t need one. They are available on your main account only, and cannot be used over SMTP. See the [Admin API reference](/docs/api/admin-api).

## Best Practices

* **Use descriptive names**: Name keys by environment or application (e.g., “Production”, “Marketing App”)
* **Rotate keys periodically**: Delete old keys and create new ones regularly
* **Use domain scoping**: Restrict keys to specific domains when possible
* **Never commit keys**: Keep API keys out of version control
* **Use environment variables**: Store keys in environment variables, not in code
