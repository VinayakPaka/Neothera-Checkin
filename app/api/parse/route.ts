import { NextResponse } from "next/server";
import { parseHabitEntry } from "@/lib/parser";
import { ParseRequestPayload } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as ParseRequestPayload;
    const parsed = await parseHabitEntry(payload);
    return NextResponse.json(parsed);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to parse check-in.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
