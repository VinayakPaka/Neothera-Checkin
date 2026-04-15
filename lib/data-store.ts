import { randomUUID } from "crypto";
import type { AuthenticatedUser } from "@/lib/auth";
import { demoEntries, demoProfile, demoReminderPreference } from "@/lib/demo-data";
import { AttachmentPayload, DashboardData, DailyEntry, ReminderPreference, SaveEntryPayload } from "@/lib/types";
import { isSupabaseConfigured, supabaseAdmin } from "@/lib/supabase";

const demoUserId = process.env.NEOTHERA_DEMO_USER_ID ?? "00000000-0000-0000-0000-000000000001";

let inMemoryEntries = [...demoEntries];
let inMemoryReminder = { ...demoReminderPreference };

function toDateOnly(input: string) {
  return input.slice(0, 10);
}

function countWeeklyLogs(entries: DailyEntry[], todayDate: string) {
  const today = new Date(todayDate);
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - 6);
  return entries.filter((entry) => {
    const value = new Date(entry.entryDate);
    return value >= weekStart && value <= today && entry.status === "confirmed";
  }).length;
}

function calculateStreak(entries: DailyEntry[], fromDate: string) {
  const confirmedDates = new Set(entries.filter((entry) => entry.status === "confirmed").map((entry) => entry.entryDate));
  const cursor = new Date(fromDate);
  let streak = 0;

  while (confirmedDates.has(toDateOnly(cursor.toISOString()))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

function buildDashboard(entries: DailyEntry[], reminderPreference: ReminderPreference, profile = demoProfile): DashboardData {
  const todayDate = new Date().toISOString().slice(0, 10);
  const history = [...entries].sort((a, b) => (a.entryDate < b.entryDate ? 1 : -1));
  const confirmedCount = history.filter((entry) => entry.status === "confirmed").length;

  return {
    profile,
    reminderPreference,
    todayDate,
    history,
    todayEntry: history.find((entry) => entry.entryDate === todayDate),
    lastEntry: history[0],
    logsThisWeek: countWeeklyLogs(history, todayDate),
    totalLogs: confirmedCount,
    daysUntilInsight: Math.max(0, 5 - confirmedCount)
  };
}

async function ensureUserScaffold(user: AuthenticatedUser) {
  if (!supabaseAdmin) {
    return;
  }

  await supabaseAdmin.from("profiles").upsert(
    {
      id: user.id,
      email: user.email ?? null,
      first_name: user.fullName ?? demoProfile.firstName,
      skin_goal: demoProfile.skinGoal
    },
    {
      onConflict: "id"
    }
  );

  await supabaseAdmin.from("reminder_preferences").upsert(
    {
      user_id: user.id,
      preferred_time: demoReminderPreference.preferredTime,
      channel: "in_app",
      enabled: true
    },
    {
      onConflict: "user_id",
      ignoreDuplicates: true
    }
  );
}

function decodeDataUrl(dataUrl: string) {
  const [metadata, base64Content = ""] = dataUrl.split(",");
  const mimeType = metadata.match(/data:(.*?);base64/)?.[1] ?? "application/octet-stream";
  return {
    buffer: Buffer.from(base64Content, "base64"),
    mimeType
  };
}

async function uploadAttachments(entryId: string, attachments: AttachmentPayload[]) {
  if (!supabaseAdmin || !process.env.SUPABASE_MEDIA_BUCKET || !attachments.length) {
    return [];
  }

  const bucket = process.env.SUPABASE_MEDIA_BUCKET;
  const uploads: { kind: AttachmentPayload["kind"]; storage_path: string; public_url: string }[] = [];

  for (const attachment of attachments) {
    const { buffer, mimeType } = decodeDataUrl(attachment.dataUrl);
    const extension = attachment.name.includes(".") ? attachment.name.split(".").pop() : mimeType.split("/").pop() ?? "bin";
    const storagePath = `${entryId}/${attachment.kind}-${Date.now()}.${extension}`;
    const upload = await supabaseAdmin.storage.from(bucket).upload(storagePath, buffer, {
      contentType: mimeType,
      upsert: true
    });

    if (upload.error) {
      continue;
    }

    const publicUrl = supabaseAdmin.storage.from(bucket).getPublicUrl(storagePath).data.publicUrl;
    uploads.push({
      kind: attachment.kind,
      storage_path: storagePath,
      public_url: publicUrl
    });
  }

  return uploads;
}

export async function getDashboardSnapshot(user?: AuthenticatedUser): Promise<DashboardData> {
  if (!isSupabaseConfigured || !supabaseAdmin || !user?.id) {
    return buildDashboard(inMemoryEntries, inMemoryReminder, demoProfile);
  }

  await ensureUserScaffold(user);

  const [{ data: profile }, { data: reminder }, { data: entries }] = await Promise.all([
    supabaseAdmin.from("profiles").select("id, first_name, skin_goal").eq("id", user.id).single(),
    supabaseAdmin.from("reminder_preferences").select("preferred_time, channel, enabled").eq("user_id", user.id).single(),
    supabaseAdmin
      .from("daily_entries")
      .select(
        "id, user_id, entry_date, status, raw_text, transcript, structured_log, input_modes, streak_count, created_at, updated_at, entry_attachments(kind, public_url, storage_path)"
      )
      .eq("user_id", user.id)
      .order("entry_date", { ascending: false })
  ]);

  const mappedEntries: DailyEntry[] = (entries ?? []).map((entry) => ({
    id: entry.id,
    userId: entry.user_id,
    entryDate: entry.entry_date,
    status: entry.status,
    rawText: entry.raw_text ?? "",
    transcript: entry.transcript ?? "",
    structuredLog: entry.structured_log,
    inputModes: entry.input_modes ?? [],
    streakCount: entry.streak_count ?? 0,
    createdAt: entry.created_at,
    updatedAt: entry.updated_at,
    attachments: (entry.entry_attachments ?? []).map((attachment: { kind: string; public_url?: string; storage_path?: string }) => ({
      kind: attachment.kind as DailyEntry["attachments"][number]["kind"],
      url: attachment.public_url,
      storagePath: attachment.storage_path
    }))
  }));

  return buildDashboard(
    mappedEntries,
    {
      preferredTime: reminder?.preferred_time ?? demoReminderPreference.preferredTime,
      channel: reminder?.channel ?? "in_app",
      enabled: reminder?.enabled ?? true
    },
    {
      id: profile?.id ?? user.id,
      firstName: profile?.first_name ?? user.fullName ?? demoProfile.firstName,
      skinGoal: profile?.skin_goal ?? demoProfile.skinGoal
    }
  );
}

export async function saveEntry(payload: SaveEntryPayload, user?: AuthenticatedUser): Promise<DashboardData> {
  if (!isSupabaseConfigured || !supabaseAdmin || !user?.id) {
    const existingIndex = inMemoryEntries.findIndex((entry) => entry.entryDate === payload.entryDate);
    const draftEntry: DailyEntry = {
      id: existingIndex > -1 ? inMemoryEntries[existingIndex].id : randomUUID(),
      userId: demoUserId,
      entryDate: payload.entryDate,
      status: "confirmed",
      rawText: payload.rawText,
      transcript: payload.transcript,
      structuredLog: payload.structuredLog,
      inputModes: payload.inputModes,
      streakCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      attachments: payload.attachments.map((attachment) => ({
        kind: attachment.kind
      }))
    };

    if (existingIndex > -1) {
      inMemoryEntries[existingIndex] = draftEntry;
    } else {
      inMemoryEntries = [draftEntry, ...inMemoryEntries];
    }

    const streakCount = calculateStreak(inMemoryEntries, payload.entryDate);
    inMemoryEntries = inMemoryEntries.map((entry) =>
      entry.entryDate === payload.entryDate
        ? {
            ...entry,
            streakCount
          }
        : entry
    );

    return buildDashboard(inMemoryEntries, inMemoryReminder);
  }

  await ensureUserScaffold(user);

  const existingEntryLookup = await supabaseAdmin
    .from("daily_entries")
    .select("id")
    .eq("user_id", user.id)
    .eq("entry_date", payload.entryDate)
    .maybeSingle();

  const entryId = existingEntryLookup.data?.id ?? randomUUID();
  const uploads = await uploadAttachments(entryId, payload.attachments);
  // Ensure JSON-serializable payload for Postgres jsonb (strips undefined, non-JSON values).
  const structuredLogJson = JSON.parse(JSON.stringify(payload.structuredLog)) as SaveEntryPayload["structuredLog"];
  const { error } = await supabaseAdmin.from("daily_entries").upsert(
    {
      id: entryId,
      user_id: user.id,
      entry_date: payload.entryDate,
      status: "confirmed",
      raw_text: payload.rawText,
      transcript: payload.transcript,
      structured_log: structuredLogJson,
      input_modes: payload.inputModes,
      streak_count: 0
    },
    {
      onConflict: "user_id,entry_date"
    }
  );

  if (error) {
    throw new Error(error.message);
  }

  if (uploads.length) {
    await supabaseAdmin.from("entry_attachments").delete().eq("entry_id", entryId);
    await supabaseAdmin.from("entry_attachments").insert(
      uploads.map((upload) => ({
        entry_id: entryId,
        kind: upload.kind,
        storage_path: upload.storage_path,
        public_url: upload.public_url
      }))
    );
  }

  const dashboard = await getDashboardSnapshot(user);
  const streak = calculateStreak(dashboard.history, payload.entryDate);
  await supabaseAdmin.from("daily_entries").update({ streak_count: streak }).eq("user_id", user.id).eq("entry_date", payload.entryDate);
  return getDashboardSnapshot(user);
}

export async function updateReminder(preferredTime: string, user?: AuthenticatedUser): Promise<DashboardData> {
  if (!isSupabaseConfigured || !supabaseAdmin || !user?.id) {
    inMemoryReminder = {
      ...inMemoryReminder,
      preferredTime
    };
    return buildDashboard(inMemoryEntries, inMemoryReminder, demoProfile);
  }

  await ensureUserScaffold(user);

  await supabaseAdmin.from("reminder_preferences").upsert(
    {
      user_id: user.id,
      preferred_time: preferredTime,
      channel: "in_app",
      enabled: true
    },
    {
      onConflict: "user_id"
    }
  );

  return getDashboardSnapshot(user);
}
