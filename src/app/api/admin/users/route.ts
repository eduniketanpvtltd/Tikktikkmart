import { z } from "zod";
import { db } from "@/lib/supabase/server";
import { fail, ok, withAuth, writeAuditLog } from "@/lib/auth/withAuth";

export const GET = withAuth(["admin"], async () => {
  const [{ data: users }, { data: logs }] = await Promise.all([
    db.from("users").select("id, email, name, phone, role, is_blocked, created_at").order("created_at", { ascending: false }).limit(100),
    db.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(50),
  ]);
  return ok({ users: users ?? [], auditLogs: logs ?? [] });
});

const patchSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(["customer", "rider", "store_manager", "admin", "super_admin"]).optional(),
  is_blocked: z.boolean().optional(),
});

export const PATCH = withAuth(["super_admin"], async (req, { user }) => {
  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return fail("Invalid user update");

  const { userId, ...updates } = parsed.data;
  const { data, error } = await db.from("users").update(updates).eq("id", userId).select().single();
  if (error) return fail(error.message, 400);

  await writeAuditLog({ actorId: user.id, action: "update_user", entity: "user", entityId: userId, after: updates });
  return ok(data);
});

