import { requireAuthenticatedUser } from "@/lib/auth";
import { TrackerApp } from "@/components/tracker-app";
import { getDashboardSnapshot } from "@/lib/data-store";

export const dynamic = "force-dynamic";

export default async function AppPage() {
  const user = await requireAuthenticatedUser();
  const dashboard = await getDashboardSnapshot(user);
  return <TrackerApp initialData={dashboard} />;
}
