import { NextResponse } from "next/server";
import { updateReminder } from "@/lib/data-store";

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as { preferredTime: string };
    const dashboard = await updateReminder(payload.preferredTime);
    return NextResponse.json(dashboard);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to save reminder preference.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
