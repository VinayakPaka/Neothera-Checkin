import { NextResponse } from "next/server";
import { sendCheckinReminderEmail } from "@/lib/reminders";
import { sendPushToUser } from "@/lib/push-notifications";
import { supabaseAdmin } from "@/lib/supabase";

type ReminderRow = {
  user_id: string;
  preferred_time: string;
  enabled: boolean;
  last_sent_on: string | null;
  profiles: Array<{
    first_name: string | null;
    email: string | null;
  }> | null;
};

function isAuthorized(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const reminderSecret = process.env.REMINDER_CRON_SECRET;

  const authHeader = request.headers.get("authorization");
  if (reminderSecret && authHeader === `Bearer ${reminderSecret}`) return true;
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) return true;

  return false;
}

function getUtcNowParts() {
  const timeZone = process.env.REMINDER_TIMEZONE || "Asia/Kolkata";
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  })
    .formatToParts(now)
    .reduce<Record<string, string>>((acc, part) => {
      if (part.type !== "literal") {
        acc[part.type] = part.value;
      }
      return acc;
    }, {});

  return {
    todayDate: `${parts.year}-${parts.month}-${parts.day}`,
    currentTime: `${parts.hour}:${parts.minute}`,
    timeZone
  };
}

export async function POST(request: Request) {
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json({ error: "Unauthorized cron access." }, { status: 401 });
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: "Supabase is not configured." }, { status: 500 });
    }

    const { todayDate, currentTime, timeZone } = getUtcNowParts();
    const { data, error } = await supabaseAdmin
      .from("reminder_preferences")
      .select("user_id, preferred_time, enabled, last_sent_on, profiles(first_name, email)")
      .eq("enabled", true)
      .eq("preferred_time", currentTime);

    if (error) {
      throw new Error(error.message);
    }

    const dueRows = (data ?? []).filter((row) => (row as ReminderRow).last_sent_on !== todayDate) as ReminderRow[];

    let sentEmailCount = 0;
    let sentPushCount = 0;
    for (const row of dueRows) {
      const profile = row.profiles?.[0];
      let sentForUser = false;

      const pushResult = await sendPushToUser(row.user_id, {
        title: "Neothera check-in reminder",
        body: "It is check-in time. Log your day in under 30 seconds.",
        url: "/app"
      });
      if (pushResult.sent > 0) {
        sentForUser = true;
        sentPushCount += pushResult.sent;
      }

      if (profile?.email) {
        try {
          await sendCheckinReminderEmail({
            to: profile.email,
            firstName: profile.first_name ?? undefined,
            preferredTime: row.preferred_time
          });
          sentForUser = true;
          sentEmailCount += 1;
        } catch {
          // Keep cron resilient: push may still succeed even if email fails.
        }
      }

      if (sentForUser) {
        await supabaseAdmin.from("reminder_preferences").update({ last_sent_on: todayDate }).eq("user_id", row.user_id);
      }
    }

    return NextResponse.json({
      ok: true,
      scanned: data?.length ?? 0,
      sentEmail: sentEmailCount,
      sentPush: sentPushCount,
      time: currentTime,
      date: todayDate,
      timeZone
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Reminder cron failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
