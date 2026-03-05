# WhatsApp Setup Guide (Meta Cloud API)

This guide explains what you should do, in order, to enable WhatsApp Q&A in this app.

## Quick Checklist (Do This First)

1. Create/configure a Meta app with WhatsApp product.
2. Collect `APP_SECRET`, `ACCESS_TOKEN`, and `PHONE_NUMBER_ID`.
3. Add WhatsApp env vars locally and in Vercel.
4. Set webhook URL to `/api/whatsapp/webhook` and verify token.
5. Run `npm run db:push` (adds dedupe table).
6. Enable `WHATSAPP_ENABLED="true"`.
7. Test from an allowlisted phone number.

## 1. Prerequisites

- Deployed app URL (or a tunnel URL for local testing)
- Meta developer account
- WhatsApp Business App in Meta
- Access to project env vars (local `.env` + Vercel project settings)

## 2. Create/Configure Meta WhatsApp App

1. Go to Meta Developers and open your app.
2. Add the **WhatsApp** product.
3. In WhatsApp API setup, note:
   - `Phone Number ID`
   - temporary access token (later replace with long-lived token/system user token)
4. In app settings, note your **App Secret**.

## 3. Configure Environment Variables

Add these locally in `.env`:

```env
WHATSAPP_ENABLED="true"
WHATSAPP_VERIFY_TOKEN="your-verify-token"
WHATSAPP_APP_SECRET="your-meta-app-secret"
WHATSAPP_ACCESS_TOKEN="your-whatsapp-access-token"
WHATSAPP_PHONE_NUMBER_ID="your-phone-number-id"
WHATSAPP_ALLOWED_NUMBERS="+919876543210,+919812345678"
```

Also add the same values in Vercel project env vars for production:

1. Open Vercel project.
2. Go to `Settings -> Environment Variables`.
3. Add each `WHATSAPP_*` variable to `Preview` and `Production` as needed.
4. Redeploy after saving env vars.

Notes:
- `WHATSAPP_ALLOWED_NUMBERS` must be comma-separated E.164 numbers.
- Keep `WHATSAPP_ENABLED=false` until webhook setup is complete.
- Rotate tokens if they were ever shared.

## 4. Set Up Webhook in Meta

Use webhook URL:

`https://<your-domain>/api/whatsapp/webhook`

Verification token must exactly match `WHATSAPP_VERIFY_TOKEN`.

Subscribe to message-related webhook events (messages/inbound notifications).

## 5. Sync Database Schema (Required)

This feature adds an idempotency table (`WhatsappInboundMessage`).

Run:

```bash
npm run db:push
```

If needed, also run:

```bash
npx prisma generate
```

## 6. Start and Verify

Run app:

```bash
npm run dev
```

Webhook verification test:

```bash
curl "http://localhost:3000/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=<your-verify-token>&hub.challenge=test123"
```

Expected response body:

```text
test123
```

If this works, webhook verification is correctly wired.

## 7. Test Message Flow

1. Send a WhatsApp message from an allowlisted number.
2. App flow:
   - verifies webhook signature
   - checks allowlist
   - applies per-number rate limit
   - dedupes repeated provider message IDs
   - calls assistant (`sanitizeAssistantQuery` -> `answerDashboardQuestion`)
   - sends response back via Meta messages API

## 8. Common Issues

- `401` from webhook route: bad or missing `WHATSAPP_APP_SECRET`/signature mismatch
- Webhook verification fails: `WHATSAPP_VERIFY_TOKEN` mismatch
- No outbound reply: invalid `WHATSAPP_ACCESS_TOKEN` or `WHATSAPP_PHONE_NUMBER_ID`
- Message ignored: sender not in `WHATSAPP_ALLOWED_NUMBERS`
- DB error on dedupe: run `npm run db:push`

## 9. Operational Checklist (Production)

- Use long-lived/system user access token
- Restrict allowlist to staff/admin numbers only
- Keep logs on for webhook failures
- Monitor provider 401/429/5xx errors
- Rotate tokens periodically

## 10. Daily Usage Notes

- Only numbers listed in `WHATSAPP_ALLOWED_NUMBERS` can query data.
- Incoming question path is:
  - WhatsApp message -> webhook -> assistant tools/LLM -> WhatsApp reply
- If no reply appears, check app logs first for provider/API errors.
