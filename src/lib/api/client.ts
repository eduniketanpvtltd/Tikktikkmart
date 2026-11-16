import { auth } from "@/lib/firebase/client";

export interface ApiResponse<T> {
  ok: boolean;
  data?: T;
  error?: string;
}

export async function apiFetch<T = unknown>(url: string, init?: RequestInit): Promise<ApiResponse<T>> {
  const headers = new Headers(init?.headers);
  if (!headers.has("Content-Type") && init?.body && !(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const currentUser = auth.currentUser;
  if (currentUser) {
    try {
      const token = await currentUser.getIdToken();
      headers.set("Authorization", `Bearer ${token}`);
    } catch {
      // Ignore token fetch errors on public endpoints
    }
  }

  const res = await fetch(url, { ...init, headers });
  const json = await res.json().catch(() => ({ ok: false, error: `HTTP ${res.status}` }));
  return json as ApiResponse<T>;
}

