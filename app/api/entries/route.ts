import { NextResponse } from "next/server";
import { saveEntry } from "@/lib/data-store";
import { SaveEntryPayload } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as SaveEntryPayload;
    const dashboard = await saveEntry(payload);
    return NextResponse.json(dashboard);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to save entry.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
