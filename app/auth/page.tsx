import { AuthExperience } from "@/components/auth-experience";
import { getAuthenticatedUserOrNull } from "@/lib/auth";
import { redirect } from "next/navigation";

type AuthPageProps = {
  searchParams?: Promise<{
    mode?: string;
  }>;
};

export default async function AuthPage({ searchParams }: AuthPageProps) {
  const user = await getAuthenticatedUserOrNull();
  if (user) {
    redirect("/app");
  }

  const resolvedSearchParams = await searchParams;
  const initialMode = resolvedSearchParams?.mode === "login" ? "login" : "signup";

  return <AuthExperience initialMode={initialMode} />;
}
