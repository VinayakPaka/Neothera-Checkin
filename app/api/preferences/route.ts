import { NextResponse } from "next/server";
import { getAuthenticatedUserOrNull } from "@/lib/auth";
import { updateReminder } from "@/lib/data-store";

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUserOrNull({ allowDemoFallback: true });
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = (await request.json()) as { preferredTime: string };
    const dashboard = await updateReminder(payload.preferredTime, user);
    return NextResponse.json(dashboard);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to save reminder preference.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
