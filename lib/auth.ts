import { redirect } from "next/navigation";
import { demoProfile } from "@/lib/demo-data";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export type AuthenticatedUser = {
  id: string;
  email?: string;
  fullName?: string;
};

const demoUserId = process.env.NEOTHERA_DEMO_USER_ID ?? "00000000-0000-0000-0000-000000000001";

function getFirstName(fullName?: string, email?: string) {
  if (fullName?.trim()) {
    return fullName.trim().split(" ")[0];
  }

  if (email?.includes("@")) {
    return email.split("@")[0];
  }

  return "there";
}

export async function getAuthenticatedUserOrNull(options?: { allowDemoFallback?: boolean }): Promise<AuthenticatedUser | null> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return options?.allowDemoFallback
      ? {
          id: demoUserId,
          fullName: demoProfile.firstName
        }
      : null;
  }

  // Prefer getUser(): validates the session with Auth and works reliably in Route Handlers.
  // getClaims() can fail JWT verification (e.g. JWKS/crypto edge cases) even when the session is valid.
  const {
    data: { user },
    error
  } = await supabase.auth.getUser();

  if (user?.id) {
    const metadata =
      user.user_metadata && typeof user.user_metadata === "object"
        ? (user.user_metadata as Record<string, unknown>)
        : undefined;
    const fullNameMeta = typeof metadata?.full_name === "string" ? metadata.full_name : undefined;

    return {
      id: user.id,
      email: user.email ?? undefined,
      fullName: getFirstName(fullNameMeta, user.email ?? undefined)
    };
  }

  if (error && process.env.NODE_ENV === "development") {
    console.warn("[auth] getUser failed:", error.message);
  }

  return null;
}

export async function requireAuthenticatedUser(): Promise<AuthenticatedUser> {
  const user = await getAuthenticatedUserOrNull({ allowDemoFallback: true });
  if (!user) {
    redirect("/auth?mode=login");
  }

  return user;
}
