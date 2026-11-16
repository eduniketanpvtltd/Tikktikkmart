import { createClient, SupabaseClient } from "@supabase/supabase-js";

let realtimeClient: SupabaseClient | null = null;

/**
 * Returns a browser Supabase client authenticated with a minted short-lived JWT
 * from `/api/realtime/token` so Realtime subscriptions respect RLS.
 */
export async function getRealtimeClient(idToken?: string): Promise<SupabaseClient> {
  if (!realtimeClient) {
    realtimeClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        realtime: { params: { eventsPerSecond: 10 } },
      }
    );
  }
  if (idToken) {
    try {
      const res = await fetch("/api/realtime/token", {
        method: "POST",
        headers: { Authorization: `Bearer ${idToken}` },
      });
      const json = await res.json();
      if (json?.ok && json.data?.token) {
        realtimeClient.realtime.setAuth(json.data.token);
      }
    } catch {
      // Fall back to anon realtime broadcast channels if token minting fails
    }
  }
  return realtimeClient;
}

