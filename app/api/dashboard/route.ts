import { NextResponse } from "next/server";
import { getAuthenticatedUserOrNull } from "@/lib/auth";
import { getDashboardSnapshot } from "@/lib/data-store";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getAuthenticatedUserOrNull({ allowDemoFallback: true });
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dashboard = await getDashboardSnapshot(user);
  return NextResponse.json(dashboard);
}
