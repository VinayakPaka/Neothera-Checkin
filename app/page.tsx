import { TrackerApp } from "@/components/tracker-app";
import { getDashboardSnapshot } from "@/lib/data-store";

export const dynamic = "force-dynamic";

export default async function Page() {
  const dashboard = await getDashboardSnapshot();
  return <TrackerApp initialData={dashboard} />;
}
