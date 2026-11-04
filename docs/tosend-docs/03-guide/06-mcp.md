# Connect Claude, ChatGPT and other AI apps

> Let an AI assistant check your domains, logs and bounces, or manage your account, through the toSend MCP server.

*Breadcrumbs: Docs > / > User guide*

---

*Official URL: https://tosend.com/docs/guide/mcp/*

toSend runs an [MCP](https://modelcontextprotocol.io) server, so you can connect an AI assistant such as Claude or ChatGPT to your account and ask it things in plain language:

* “Is example.com verified? If not, which DNS records are missing?”
* “Did the password reset email to [jane@example.com](mailto:jane@example.com) go out?”
* “Which addresses bounced this week?”
* “Create a client team for Acme and give it a sending key.”

There is nothing to install. You add one URL to your AI app, approve the connection in your toSend dashboard, and choose what the app may do.

| Setting | Value |
| --- | --- |
| Server URL | https://mcp.tosend.com/mcp |
| Transport | Streamable HTTP |
| Authentication | OAuth (sign in with toSend) |

## How connecting works

1. You add the server URL in your AI app.
2. Your browser opens toSend. Sign in if you aren’t already.
3. The **Connect an AI app** page shows which app is asking. Pick the team and the permissions, then click **Approve**.
4. You’re sent back to the app, which can now use toSend.

Approving creates an [admin key](/docs/api/admin-api/) with exactly the permissions you chose. The app never sees the key itself: it stays encrypted on toSend’s side, and the app only holds a token for the connection.

## Claude (web and desktop)

1. In Claude, open **Settings → Connectors** and click **Add custom connector**.
2. Name it `toSend` and enter `https://mcp.tosend.com/mcp` as the URL. Leave the advanced settings empty.
3. Click **Connect** and approve on the toSend page that opens.
4. In a chat, open the tools menu and make sure toSend is switched on.

Connectors added on claude.ai also appear in the Claude desktop app. On Team and Enterprise plans, an organization owner adds the connector first, under **Organization settings → Connectors**.

## ChatGPT

1. In ChatGPT, open **Settings → Apps & Connectors**. Custom connectors may need **Developer mode**, under **Advanced settings**, depending on your plan.
2. Create a connector with `https://mcp.tosend.com/mcp` as the URL and **OAuth** as the authentication.
3. Approve on the toSend page that opens.

## Claude Code, Cursor and VS Code

**Claude Code:**

```bash
claude mcp add --transport http tosend https://mcp.tosend.com/mcp
```

Then run `/mcp` inside Claude Code and choose **Authenticate**.

**Cursor** (`~/.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "tosend": { "url": "https://mcp.tosend.com/mcp" }
  }
}
```

**VS Code** (`.vscode/mcp.json`):

```json
{
  "servers": {
    "tosend": { "type": "http", "url": "https://mcp.tosend.com/mcp" }
  }
}
```

Each of these opens the same toSend approval page the first time you use it.

## Choosing permissions

The approval page offers three presets. You can adjust any of them before approving.

| Preset | What the app can do |
| --- | --- |
| Manage my account(default) | Read and change domains, suppressions, webhooks, sending keys and client teams, and read email logs. It cannot send email. |
| Manage and send | All of the above, plus sending email and creating sending keys. |
| Read only | Look at everything, change nothing. |

The app only sees the tools its permissions allow, so a read-only connection is never offered a tool that changes anything. The same permissions apply to the team you pick and every client team under it.

> [!WARNING] **Sending is off by default**
> Only turn on **Send email** if you want the assistant to send real email. Each send uses credits and cannot be recalled. toSend is for transactional email, so don’t ask an assistant to send newsletters or bulk messages through it.

## What the assistant can do

| Area | Tools | Permission needed |
| --- | --- | --- |
| Account | get_account: status, credit balance, bounce and complaint rates | none |
| Domains | list_domains,get_domain(with DNS records) | Domains: read |
|  | add_domain,delete_domain | Domains: write |
| Email logs | list_emails,get_email(delivery details, never the body) | Email logs: read |
| Sending | send_email: one email to real recipients | Send email |
| Suppressions | list_suppressions | Suppressions: read |
|  | remove_suppression | Suppressions: write |
| Webhooks | list_webhooks | Webhooks: read |
|  | create_webhook,update_webhook,delete_webhook | Webhooks: write |
| Sending keys | list_sending_keys(masked) | Sending keys: read |
|  | create_sending_key | Sending keys: write + Send email |
|  | delete_sending_key | Sending keys: write |
| Client teams | list_teams | Teams: read |
|  | create_team,update_team(rename, suspend, reactivate) | Teams: write |

Every tool is a call to the [Admin API](/docs/api/admin-api/), so the same rules and [rate limits](/docs/api/admin-api/#rate-limits) apply. If you manage client teams, ask for a team by name and the assistant will act on that team.

## Disconnecting

Each connection appears on the **API Keys** page in your dashboard, under **Admin API**, named after the app and the date, for example `AI: Claude (2026-10-10)`. Delete that key to disconnect: the app’s next request fails, and it has to ask for approval again.

Removing the connector inside the AI app stops the app from using it, but the key stays on your account until you delete it.

> [!NOTE] **Note**
> Each connection counts toward the limit of 10 admin keys per team. Delete connections you no longer use.

## Using an admin key directly

If your MCP client can’t do OAuth, or you’re connecting your own agent, send an existing [admin key](/docs/api/admin-api/#creating-an-admin-key) as a bearer token instead:

```plaintext
Authorization: Bearer tsend_admin_...
```

For example, with `mcp-remote` in a client that only runs local servers:

```json
{
  "mcpServers": {
    "tosend": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "https://mcp.tosend.com/mcp", "--header", "Authorization:${TOSEND_AUTH}"],
      "env": { "TOSEND_AUTH": "Bearer tsend_admin_..." }
    }
  }
}
```

The tools offered follow that key’s permissions, exactly as with an OAuth connection.

## Troubleshooting

* **The approval page says it can’t connect**: the request expired or was already used. Start the connection again from your AI app.
* **The app says the connection stopped working**: the key was deleted on the **API Keys** page. Connect again from your AI app.
* **A tool you expected is missing**: the connection doesn’t have that permission. Disconnect, then connect again and choose a broader preset.
* **A tool returns an error**: the assistant shows the reason toSend returned. The rules are the same as in the dashboard, so for example a subdomain can only be added once the account has bought credits.
