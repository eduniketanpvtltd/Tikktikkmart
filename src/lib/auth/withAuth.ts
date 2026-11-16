import { NextRequest, NextResponse } from "next/server";
import { verifyIdToken } from "@/lib/firebase/admin";
import { db } from "@/lib/supabase/server";
import { AppUser, Role, superAdminEmails } from "./roles";

export const ok = (data: unknown, status = 200) => NextResponse.json({ ok: true, data }, { status });
export const fail = (error: string, status = 400) => NextResponse.json({ ok: false, error }, { status });

export type AuthContext = { user: AppUser; params: Record<string, string> };
type Handler = (req: NextRequest, ctx: AuthContext) => Promise<NextResponse>;

async function resolveUserFromToken(token: string): Promise<AppUser | { error: string; status: number }> {
  let decoded;
  try {
    decoded = await verifyIdToken(token);
  } catch {
    return { error: "invalid token", status: 401 };
  }

  if (!decoded.email || !decoded.emailVerified) {
    return { error: "email not verified", status: 401 };
  }
  const email = decoded.email.toLowerCase();

  let { data: user } = await db.from("users").select("*").eq("firebase_uid", decoded.uid).maybeSingle();
  if (!user) {
    const role: Role = superAdminEmails().includes(email) ? "super_admin" : "customer";
    const ins = await db
      .from("users")
      .insert({
        firebase_uid: decoded.uid,
        email,
        name: decoded.name ?? null,
        photo_url: decoded.picture ?? null,
        role,
      })
      .select()
      .single();
    if (ins.error) return { error: ins.error.message, status: 500 };
    user = ins.data;
  }
  if (user.is_blocked) return { error: "account blocked", status: 403 };
  return user as AppUser;
}

/** Verifies Firebase ID token, loads/creates the users row, enforces role. */
export function withAuth(roles: Role[] | null, handler: Handler) {
  return async (req: NextRequest, route: { params: Promise<Record<string, string>> }) => {
    const token = req.headers.get("authorization")?.replace(/^Bearer /, "");
    if (!token) return fail("unauthenticated", 401);

    const resolved = await resolveUserFromToken(token);
    if ("error" in resolved) return fail(resolved.error, resolved.status);

    if (roles && !roles.includes(resolved.role) && resolved.role !== "super_admin") {
      return fail("forbidden", 403);
    }
    return handler(req, { user: resolved, params: await route.params });
  };
}

/** Checks if a store_manager belongs to the target store (admins bypass). */
export async function assertStoreAccess(user: AppUser, storeId: string): Promise<boolean> {
  if (user.role === "admin" || user.role === "super_admin") return true;
  const { data } = await db
    .from("store_staff")
    .select("store_id")
    .eq("store_id", storeId)
    .eq("user_id", user.id)
    .maybeSingle();
  return Boolean(data);
}

/** Writes an entry to audit_logs for admin/system mutations. */
export async function writeAuditLog(params: {
  actorId: string;
  action: string;
  entity: string;
  entityId: string;
  before?: unknown;
  after?: unknown;
}) {
  await db.from("audit_logs").insert({
    actor_id: params.actorId,
    action: params.action,
    entity: params.entity,
    entity_id: params.entityId,
    before: params.before ?? null,
    after: params.after ?? null,
  });
}
