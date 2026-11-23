import { auth } from "@/lib/firebase/client";
import { withRequestKey } from "./idempotency";

export interface ApiResponse<T> {
  ok: boolean;
  data?: T;
  error?: string;
  status?: number;
}

const inFlight = new Map<string, Promise<ApiResponse<unknown>>>();

export function apiFetch<T = unknown>(url: string, init?: RequestInit): Promise<ApiResponse<T>> {
  const method = init?.method ?? "GET";
  const mutation = /^(POST|PUT|PATCH|DELETE)$/i.test(method);
  const supplied = new Headers(init?.headers);
  const currentUser = auth.currentUser;
  const fingerprint = mutation && (!init?.body || typeof init.body === "string") && !init?.signal
    ? JSON.stringify([currentUser?.uid, url, method.toUpperCase(), init?.body, supplied.get("Idempotency-Key")])
    : undefined;
  const running = fingerprint && inFlight.get(fingerprint);
  if (running) return running as Promise<ApiResponse<T>>;

  const request = (async () => {
    const headers = withRequestKey(supplied, method);
    if (!headers.has("Content-Type") && init?.body && !(init.body instanceof FormData)) {
      headers.set("Content-Type", "application/json");
    }
    if (currentUser) headers.set("Authorization", `Bearer ${await currentUser.getIdToken()}`);
    const response = await fetch(url, { ...init, headers });
    const json = await response.json().catch(() => null);
    if (!mutation && (!response.ok || !json?.ok)) {
      throw new Error(`HTTP ${response.status}: ${json?.error ?? "Request failed"}`);
    }
    return json && typeof json.ok === "boolean"
      ? { ...json, status: response.status, ok: response.ok && json.ok }
      : { ok: false, status: response.status, error: `HTTP ${response.status}` };
  })();
  const result = request.catch((error: unknown) => {
    if (!mutation) throw error;
    return { ok: false, error: "The connection was interrupted. Check the result before trying again." };
  }).finally(() => { if (fingerprint) inFlight.delete(fingerprint); });
  if (fingerprint) inFlight.set(fingerprint, result);
  return result;
}
