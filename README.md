# SDD-Hackathon-Hostel-Management

## Neon DB Setup

1. Create a Neon project and database (default `neondb` is fine).
2. Copy both connection strings from Neon dashboard:
   - Pooled connection string (`...-pooler...`) for `DATABASE_URL`
   - Direct connection string (non-pooler host) for `DIRECT_URL`
3. Create `.env` in project root:

```env
DATABASE_URL="postgresql://<user>:<password>@<neon-pooler-host>/neondb?sslmode=require&pgbouncer=true"
DIRECT_URL="postgresql://<user>:<password>@<neon-direct-host>/neondb?sslmode=require"
PRISMA_CONNECTION_LIMIT="5"
PRISMA_POOL_TIMEOUT="10"
AUTH_ENABLED="false"
NEXTAUTH_SECRET="replace-with-a-long-random-secret"
ADMIN_USERNAME="admin"
ADMIN_PASSWORD="admin"
AUTH_RATE_LIMIT_WINDOW_MS="900000"
AUTH_RATE_LIMIT_MAX_ATTEMPTS="10"
```

To require login locally, set `AUTH_ENABLED="true"` and keep:
- `ADMIN_USERNAME="admin"`
- `ADMIN_PASSWORD="admin"`

Then restart `npm run dev`.

4. Run setup:

```bash
npm run db:setup
```

This will run:
- `prisma db push`
- `node prisma/seed.js`

## Slack + AI Integration (Slash Command + @Bot)

Supported Slack queries:

- `/hostel vacancy in first floor`
- `@HostelBot vacancy in floor 2 block A`

### 1. Create a Slack app and get credentials

In <https://api.slack.com/apps>:

1. Click **Create New App**.
2. Go to **Basic Information**:
   - Copy **Signing Secret** -> `SLACK_SIGNING_SECRET`
3. Go to **OAuth & Permissions**:
   - Add bot scopes: `chat:write`, `app_mentions:read`
   - Install app to workspace
   - Copy **Bot User OAuth Token** (`xoxb-...`) -> `SLACK_BOT_TOKEN`

Note: Slack does not use a single universal "API key" for this setup. You need at least `SLACK_SIGNING_SECRET` and `SLACK_BOT_TOKEN`.

### 2. Environment variables

Add these in `.env`:

```env
SLACK_ENABLED="false"
SLACK_SIGNING_SECRET="your-slack-signing-secret"
SLACK_BOT_TOKEN="xoxb-your-bot-token"
GEMINI_API_KEY="optional-gemini-api-key"
GEMINI_MODEL="gemini-2.5-flash"
```

- Keep `SLACK_ENABLED="false"` until you are ready to go live with Slack.
- When ready, change to `SLACK_ENABLED="true"` and restart the app.
- If `GEMINI_API_KEY` is missing, the app still works with deterministic (non-AI) responses.

### 3. Configure Slack endpoints

1. **Slash Commands** -> create command (example: `/hostel`)
   - Request URL: `https://<your-domain>/api/slack/command`
2. **Event Subscriptions** -> enable events
   - Request URL: `https://<your-domain>/api/slack/events`
   - Subscribe to bot event: `app_mention`
3. Reinstall the app to workspace after changes.
4. Ensure `SLACK_ENABLED="true"` in `.env`, then restart the Next.js server.

### 4. Use in Slack

```text
/hostel vacancy in first floor
```

```text
@HostelBot what's vacancy in first floor?
```

## WhatsApp + AI Integration (Inbound Webhook)

Phase 1 supports inbound Q&A only (no campaign/broadcast flow).

Full setup guide:
- [docs/whatsapp-setup.md](docs/whatsapp-setup.md)

### Environment variables

```env
WHATSAPP_ENABLED="false"
WHATSAPP_VERIFY_TOKEN="your-webhook-verify-token"
WHATSAPP_APP_SECRET="your-meta-app-secret"
WHATSAPP_ACCESS_TOKEN="your-system-user-access-token"
WHATSAPP_PHONE_NUMBER_ID="your-whatsapp-phone-number-id"
WHATSAPP_ALLOWED_NUMBERS="+919876543210,+919812345678"
```

- Keep `WHATSAPP_ENABLED="false"` until webhook setup is complete.
- `WHATSAPP_ALLOWED_NUMBERS` must be comma-separated E.164 numbers.

### Meta webhook setup

1. Configure callback URL:
   - `https://<your-domain>/api/whatsapp/webhook`
2. Set verify token to match `WHATSAPP_VERIFY_TOKEN`.
3. Subscribe to message events for your WhatsApp Business Account.
4. Enable `WHATSAPP_ENABLED="true"` and restart app.

### Local verification curl

```bash
curl "http://localhost:3000/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=<verify-token>&hub.challenge=test123"
```

Expected response body:

```text
test123
```

## In-App AI Assistant (Dashboard)

The dashboard now includes an AI assistant panel at `/dashboard` for:

- Room search (e.g. AC + budget filters)
- Vacancy checks (floor/block)
- Finance snapshot (invoiced, collected, dues)
- Streaming responses (ChatGPT-style token-by-token output)
- Markdown rendering in responses (safe/sanitized)

It uses deterministic data logic by default and optionally rewrites responses with Gemini when configured:

```env
GEMINI_API_KEY="optional-gemini-api-key"
GEMINI_MODEL="gemini-2.5-flash"
AI_QUERY_MAX_LENGTH="500"
MCP_ENABLED="false"
MCP_INTERNAL_TOKEN=""
MCP_MAX_ROWS="100"
```

Security hardening included:
- assistant query length limit (`AI_QUERY_MAX_LENGTH`)
- prompt-injection pattern rejection at API boundary
- no full DB dump context (schema + read-only SQL pipeline)
- auth attempt limiting on NextAuth signin/callback routes

## MCP Server (Read-only)

The app exposes a read-only MCP endpoint at `/api/mcp` using Streamable HTTP transport.

### Environment variables

```env
MCP_ENABLED="false"
MCP_INTERNAL_TOKEN=""
MCP_MAX_ROWS="100"
```

- Keep `MCP_ENABLED="false"` until you are ready to integrate.
- Send `x-mcp-token: <MCP_INTERNAL_TOKEN>` on every MCP request.
- `MCP_MAX_ROWS` limits row-heavy responses.

### Phase-1 tools

- `hostel.get_summary`
- `rooms.search`
- `vacancy.by_location`
- `revenue.summary`
- `tenants.list`
- `schema.describe`

All tools are read-only and sensitive personal fields are masked by default.

### Example request

```bash
curl -X POST "http://localhost:3000/api/mcp" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "x-mcp-token: <your-mcp-token>" \
  -H "mcp-protocol-version: 2025-03-26" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'
```

### Local smoke check

```bash
MCP_INTERNAL_TOKEN="<your-mcp-token>" npm run test:mcp-smoke
```

## New API Modules (Current)

- `GET/POST /api/fees`
- `POST /api/fees/[feeId]/payments`
- `GET/POST /api/complaints`
- `PATCH /api/complaints/[complaintId]`
- `GET/POST /api/notices`
- `PATCH /api/notices/[noticeId]`
- `GET /api/reports/fees` (CSV export)
- `POST /api/residents/transfer`

## Verification Commands

```bash
npm run lint
npm run test
npm run test:api
npm run build
```
