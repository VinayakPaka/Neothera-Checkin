import { NextResponse } from "next/server";
import { getDashboardSnapshot } from "@/lib/data-store";

export const dynamic = "force-dynamic";

export async function GET() {
  const dashboard = await getDashboardSnapshot();
  return NextResponse.json(dashboard);
}
