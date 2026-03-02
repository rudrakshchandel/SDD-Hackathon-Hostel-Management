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
AUTH_ENABLED="false"
NEXTAUTH_SECRET="replace-with-a-long-random-secret"
```

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

## In-App AI Assistant (Dashboard)

The dashboard now includes an AI assistant panel at `/dashboard` for:

- Room search (e.g. AC + budget filters)
- Vacancy checks (floor/block)
- Finance snapshot (invoiced, collected, dues)
- Streaming responses (ChatGPT-style token-by-token output)

It uses deterministic data logic by default and optionally rewrites responses with Gemini when configured:

```env
GEMINI_API_KEY="optional-gemini-api-key"
GEMINI_MODEL="gemini-2.5-flash"
```
