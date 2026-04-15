import { NextResponse } from "next/server";
import { getAuthenticatedUserOrNull } from "@/lib/auth";
import { saveEntry } from "@/lib/data-store";
import { SaveEntryPayload } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUserOrNull({ allowDemoFallback: true });
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = (await request.json()) as SaveEntryPayload;
    const dashboard = await saveEntry(payload, user);
    return NextResponse.json(dashboard);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to save entry.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
