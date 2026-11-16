import { ok, withAuth } from "@/lib/auth/withAuth";
export const POST = withAuth(null, async (_req, { user }) => ok(user));
