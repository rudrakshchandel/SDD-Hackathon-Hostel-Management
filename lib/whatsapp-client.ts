type WhatsAppApiErrorPayload = {
  error?: {
    message?: string;
    code?: number;
    error_subcode?: number;
    type?: string;
  };
};

type WhatsAppSendResponsePayload = {
  messages?: Array<{
    id?: string;
  }>;
};

function getWhatsAppConfig() {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN || "";
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || "";
  const apiVersion = process.env.WHATSAPP_API_VERSION || "v22.0";

  if (!accessToken) {
    throw new Error("WHATSAPP_ACCESS_TOKEN is not configured");
  }

  if (!phoneNumberId) {
    throw new Error("WHATSAPP_PHONE_NUMBER_ID is not configured");
  }

  return {
    accessToken,
    phoneNumberId,
    apiVersion
  };
}

function mapWhatsAppError(status: number, payload: WhatsAppApiErrorPayload) {
  const code = payload.error?.code;
  const message = payload.error?.message || "Unknown WhatsApp API error";

  if (status === 401 || code === 190) {
    return "WhatsApp access token is invalid or expired.";
  }

  if (status === 429) {
    return "WhatsApp API rate limited this request. Try again shortly.";
  }

  if (status >= 500) {
    return "WhatsApp provider is temporarily unavailable.";
  }

  if (status === 400 && /recipient|number|to/i.test(message)) {
    return "WhatsApp rejected the recipient phone number format.";
  }

  return `WhatsApp send failed (${status}): ${message}`;
}

export async function sendWhatsAppTextMessage(to: string, text: string) {
  const { accessToken, phoneNumberId, apiVersion } = getWhatsAppConfig();
  const endpoint = `https://graph.facebook.com/${apiVersion}/${encodeURIComponent(phoneNumberId)}/messages`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "text",
      text: {
        preview_url: false,
        body: text
      }
    })
  });

  const payload = (await response.json()) as WhatsAppApiErrorPayload & WhatsAppSendResponsePayload;

  if (!response.ok) {
    throw new Error(mapWhatsAppError(response.status, payload));
  }

  return {
    messageId: payload.messages?.[0]?.id || null
  };
}
