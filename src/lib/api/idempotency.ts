export function withRequestKey(headers: Headers, method: string) {
  if (/^(POST|PUT|PATCH|DELETE)$/i.test(method) && !headers.has("Idempotency-Key")) {
    headers.set("Idempotency-Key", requestUuid());
  }
  return headers;
}

export async function checkoutAttempt(payload: string) {
  if (!crypto.subtle) {
    const key = temporaryAttempts.get(payload) ?? requestUuid();
    temporaryAttempts.set(payload, key);
    return { key, clear: () => { temporaryAttempts.delete(payload); } };
  }
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(payload));
  const fingerprint = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
  const slot = `ttm-checkout:${fingerprint}`;
  let key = requestUuid();
  try {
    const saved = sessionStorage.getItem(slot);
    if (saved) key = saved;
    else sessionStorage.setItem(slot, key);
  } catch {}
  return { key, clear: () => { try { sessionStorage.removeItem(slot); } catch {} } };
}
const temporaryAttempts = new Map<string, string>();

function requestUuid() {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 15) | 64;
  bytes[8] = (bytes[8] & 63) | 128;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
