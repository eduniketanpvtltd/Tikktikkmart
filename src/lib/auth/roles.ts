export type Role = "customer" | "rider" | "store_manager" | "admin" | "super_admin";
export interface AppUser {
  id: string; firebase_uid: string; email: string; name: string | null;
  role: Role; is_blocked: boolean;
}
export const superAdminEmails = () =>
  (process.env.SUPER_ADMIN_EMAILS ?? "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
