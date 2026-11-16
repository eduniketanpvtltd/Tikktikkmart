import { db } from "@/lib/supabase/server";
import { fail, ok } from "@/lib/auth/withAuth";

export async function GET() {
  const { data, error } = await db
    .from("categories")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  if (error) return fail(error.message, 500);
  return ok(data ?? []);
}

