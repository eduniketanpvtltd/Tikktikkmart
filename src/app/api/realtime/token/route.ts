import jwt from "jsonwebtoken";
import { ok, withAuth } from "@/lib/auth/withAuth";

// Short-lived Supabase JWT so RLS policies (auth.uid()) work for Realtime.
export const POST = withAuth(null, async (_req, { user }) => {
  const token = jwt.sign(
    { sub: user.id, role: "authenticated", aud: "authenticated" },
    process.env.SUPABASE_JWT_SECRET!, { expiresIn: "1h" });
  return ok({ token });
});
