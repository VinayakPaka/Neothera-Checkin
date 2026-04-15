import { NextResponse } from "next/server";
import { getAuthenticatedUserOrNull } from "@/lib/auth";
import { savePushSubscription } from "@/lib/push-notifications";

type IncomingSubscription = {
  endpoint: string;
  expirationTime: number | null;
  keys: {
    p256dh: string;
    auth: string;
  };
};

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUserOrNull();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as IncomingSubscription;
    if (!body?.endpoint || !body.keys?.auth || !body.keys?.p256dh) {
      return NextResponse.json({ error: "Invalid push subscription payload." }, { status: 400 });
    }

    await savePushSubscription(user.id, body);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to save push subscription.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
