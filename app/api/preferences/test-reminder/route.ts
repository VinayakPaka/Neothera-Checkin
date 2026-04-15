import { NextResponse } from "next/server";
import { getAuthenticatedUserOrNull } from "@/lib/auth";
import { sendPushToUser } from "@/lib/push-notifications";

export async function POST() {
  try {
    const user = await getAuthenticatedUserOrNull();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await sendPushToUser(user.id, {
      title: "Neothera check-in reminder",
      body: "Take 30 seconds to log food, skincare, and skin changes for today.",
      url: "/app"
    });

    if (result.sent === 0) {
      return NextResponse.json(
        { error: "No active push subscription found. Enable browser notifications first." },
        { status: 400 }
      );
    }

    return NextResponse.json({ ok: true, sent: result.sent });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to send reminder.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
