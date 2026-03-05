import { beforeEach, describe, expect, it, vi } from "vitest";
import { sendWhatsAppTextMessage } from "@/lib/whatsapp-client";

describe("whatsapp client", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.unstubAllGlobals();
    process.env = {
      ...originalEnv,
      WHATSAPP_ACCESS_TOKEN: "wa-token",
      WHATSAPP_PHONE_NUMBER_ID: "123456"
    };
  });

  it("sends provider request with correct payload", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ messages: [{ id: "wamid.1" }] })
    });

    vi.stubGlobal("fetch", fetchMock);

    const result = await sendWhatsAppTextMessage("+919876543210", "Hello");
    expect(result.messageId).toBe("wamid.1");

    const [url, options] = fetchMock.mock.calls[0];
    expect(String(url)).toContain("/123456/messages");
    expect(options.method).toBe("POST");
    expect(options.headers.Authorization).toBe("Bearer wa-token");

    const payload = JSON.parse(String(options.body));
    expect(payload.messaging_product).toBe("whatsapp");
    expect(payload.to).toBe("+919876543210");
    expect(payload.text.body).toBe("Hello");
  });

  it("maps provider errors to readable error messages", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({
          error: {
            message: "Invalid OAuth access token",
            code: 190
          }
        })
      })
    );

    await expect(sendWhatsAppTextMessage("+919876543210", "Hello")).rejects.toThrow(
      /token/i
    );
  });
});
