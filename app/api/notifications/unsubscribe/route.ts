import { NextResponse } from "next/server";
import { getAuthenticatedUserOrNull } from "@/lib/auth";
import { removePushSubscription } from "@/lib/push-notifications";

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUserOrNull();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as { endpoint?: string };
    if (!body.endpoint) {
      return NextResponse.json({ error: "Missing endpoint." }, { status: 400 });
    }

    await removePushSubscription(body.endpoint);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to remove push subscription.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
