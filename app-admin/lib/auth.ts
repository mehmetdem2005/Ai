import { createClient } from "@/utils/supabase/server";

export type AuthedUser = {
  id: string;
  email: string | undefined;
  role: string;
};

export async function getCurrentUser(): Promise<AuthedUser | null> {
  const sb = await createClient();
  const { data, error } = await sb.auth.getUser();
  if (error || !data.user) return null;
  const role =
    (data.user.app_metadata && (data.user.app_metadata as Record<string, unknown>).role) ||
    "user";
  return {
    id: data.user.id,
    email: data.user.email,
    role: String(role),
  };
}

export async function isAdmin(): Promise<boolean> {
  const u = await getCurrentUser();
  return u !== null && u.role === "admin";
}
