import { randomUUID } from "crypto";
import { demoDashboard, demoEntries, demoProfile, demoReminderPreference } from "@/lib/demo-data";
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

function buildDashboard(entries: DailyEntry[], reminderPreference: ReminderPreference): DashboardData {
  const todayDate = new Date().toISOString().slice(0, 10);
  const history = [...entries].sort((a, b) => (a.entryDate < b.entryDate ? 1 : -1));
  const confirmedCount = history.filter((entry) => entry.status === "confirmed").length;

  return {
    profile: demoProfile,
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

export async function getDashboardSnapshot(): Promise<DashboardData> {
  if (!isSupabaseConfigured || !supabaseAdmin) {
    return buildDashboard(inMemoryEntries, inMemoryReminder);
  }

  const [{ data: profile }, { data: reminder }, { data: entries }] = await Promise.all([
    supabaseAdmin.from("profiles").select("id, first_name, skin_goal").eq("id", demoUserId).single(),
    supabaseAdmin.from("reminder_preferences").select("preferred_time, channel, enabled").eq("user_id", demoUserId).single(),
    supabaseAdmin
      .from("daily_entries")
      .select(
        "id, user_id, entry_date, status, raw_text, transcript, structured_log, input_modes, streak_count, created_at, updated_at, entry_attachments(kind, public_url, storage_path)"
      )
      .eq("user_id", demoUserId)
      .order("entry_date", { ascending: false })
  ]);

  if (!entries) {
    return demoDashboard();
  }

  const mappedEntries: DailyEntry[] = entries.map((entry) => ({
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

  return {
    profile: {
      id: profile?.id ?? demoProfile.id,
      firstName: profile?.first_name ?? demoProfile.firstName,
      skinGoal: profile?.skin_goal ?? demoProfile.skinGoal
    },
    reminderPreference: {
      preferredTime: reminder?.preferred_time ?? demoReminderPreference.preferredTime,
      channel: reminder?.channel ?? "in_app",
      enabled: reminder?.enabled ?? true
    },
    todayDate: new Date().toISOString().slice(0, 10),
    history: mappedEntries,
    todayEntry: mappedEntries.find((entry) => entry.entryDate === new Date().toISOString().slice(0, 10)),
    lastEntry: mappedEntries[0],
    logsThisWeek: countWeeklyLogs(mappedEntries, new Date().toISOString().slice(0, 10)),
    totalLogs: mappedEntries.length,
    daysUntilInsight: Math.max(0, 5 - mappedEntries.length)
  };
}

export async function saveEntry(payload: SaveEntryPayload): Promise<DashboardData> {
  if (!isSupabaseConfigured || !supabaseAdmin) {
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

  const existingEntryLookup = await supabaseAdmin
    .from("daily_entries")
    .select("id")
    .eq("user_id", demoUserId)
    .eq("entry_date", payload.entryDate)
    .maybeSingle();

  const entryId = existingEntryLookup.data?.id ?? randomUUID();
  const uploads = await uploadAttachments(entryId, payload.attachments);
  const { error } = await supabaseAdmin.from("daily_entries").upsert(
    {
      id: entryId,
      user_id: demoUserId,
      entry_date: payload.entryDate,
      status: "confirmed",
      raw_text: payload.rawText,
      transcript: payload.transcript,
      structured_log: payload.structuredLog,
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

  const dashboard = await getDashboardSnapshot();
  const streak = calculateStreak(dashboard.history, payload.entryDate);
  await supabaseAdmin.from("daily_entries").update({ streak_count: streak }).eq("user_id", demoUserId).eq("entry_date", payload.entryDate);
  return getDashboardSnapshot();
}

export async function updateReminder(preferredTime: string): Promise<DashboardData> {
  if (!isSupabaseConfigured || !supabaseAdmin) {
    inMemoryReminder = {
      ...inMemoryReminder,
      preferredTime
    };
    return buildDashboard(inMemoryEntries, inMemoryReminder);
  }

  await supabaseAdmin.from("reminder_preferences").upsert(
    {
      user_id: demoUserId,
      preferred_time: preferredTime,
      channel: "in_app",
      enabled: true
    },
    {
      onConflict: "user_id"
    }
  );

  return getDashboardSnapshot();
}
