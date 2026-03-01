export async function api<T>(
  url: string,
  method = "GET",
  body?: unknown
): Promise<T> {
  const response = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json"
    },
    body: body ? JSON.stringify(body) : undefined
  });

  const contentType = response.headers.get("content-type") || "";
  const raw = await response.text();
  const isJson = contentType.includes("application/json");
  let payload: { data?: T; error?: string } | null = null;

  if (isJson && raw) {
    try {
      payload = JSON.parse(raw) as { data?: T; error?: string };
    } catch {
      payload = null;
    }
  }

  if (!response.ok) {
    throw new Error(
      payload?.error ||
        (isJson
          ? "Request failed"
          : `Request failed with non-JSON response (${response.status}). Make sure the correct Next.js server is running and backend setup is complete.`)
    );
  }

  if (!payload || !("data" in payload)) {
    throw new Error(
      "Server returned an unexpected response. Ensure API routes are available and return JSON."
    );
  }

  return payload.data as T;
}
