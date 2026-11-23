import { createHash } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/supabase/server";

const reply = (error: string, status: number) => NextResponse.json({ ok: false, error }, { status });
const uuid = /^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/i;

export async function replayMutation(req: NextRequest, userId: string, run: () => Promise<NextResponse>) {
  const key = req.headers.get("Idempotency-Key");
  if (!key || !/^(POST|PATCH|PUT|DELETE)$/.test(req.method) || ["/api/auth/session", "/api/checkout", "/api/payments/verify", "/api/rider/location"].includes(req.nextUrl.pathname)) return run();
  if (!uuid.test(key)) return reply("Invalid idempotency key", 400);

  const fingerprint = createHash("sha256").update(
    JSON.stringify([req.method, req.nextUrl.pathname, req.nextUrl.search, await req.clone().text()]),
  ).digest("hex");
  const table = db.from("api_mutation_requests");
  const { error } = await table.insert({ user_id: userId, request_key: key, fingerprint });
  if (!error) {
    let response: NextResponse;
    try { response = await run(); }
    catch { response = reply("The request could not be completed.", 500); }
    const body = await response.clone().json().catch(() => null);
    const { error: savedError } = await table.update({ status_code: response.status, response_body: body })
      .eq("user_id", userId).eq("request_key", key);
    if (savedError) console.error("Could not save mutation replay result", savedError.code);
    return response;
  }
  // Existing installations continue using their endpoint-specific protections until the table is migrated.
  if (error.code === "PGRST205" || error.code === "42P01") return run();
  if (error.code !== "23505") return reply("Request could not be checked for duplicates", 503);
  const { data } = await table.select("fingerprint, status_code, response_body")
    .eq("user_id", userId).eq("request_key", key).maybeSingle();
  if (!data || data.status_code == null) return reply("This request is already being processed", 409);
  if (data.fingerprint !== fingerprint) return reply("This key was already used for another request", 409);
  return NextResponse.json(data.response_body, { status: data.status_code, headers: { "Idempotency-Replayed": "true" } });
}
