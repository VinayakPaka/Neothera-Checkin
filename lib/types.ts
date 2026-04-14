export type AttachmentKind = "meal_photo" | "voice_note" | "skin_selfie";
export type EntryStatus = "confirmed" | "draft" | "missed";

export type AttachmentPayload = {
  kind: AttachmentKind;
  name: string;
  mimeType: string;
  dataUrl: string;
  caption?: string;
};

export type StructuredLog = {
  foodTags: string[];
  foodNotes: string;
  skincareSteps: string[];
  skinSymptoms: string[];
  lifestyleSignals: string[];
  adherenceStatus: "done" | "partial" | "missed";
  confidence: number;
  summary: string;
  followUpPrompt: string;
};

export type DailyEntry = {
  id: string;
  userId: string;
  entryDate: string;
  status: EntryStatus;
  rawText: string;
  transcript: string;
  structuredLog: StructuredLog;
  inputModes: Array<AttachmentKind | "quick_text" | "same_as_yesterday">;
  streakCount: number;
  createdAt: string;
  updatedAt: string;
  attachments: {
    kind: AttachmentKind;
    url?: string;
    storagePath?: string;
  }[];
};

export type ReminderPreference = {
  preferredTime: string;
  channel: "in_app" | "email";
  enabled: boolean;
};

export type Profile = {
  id: string;
  firstName: string;
  skinGoal: string;
};

export type DashboardData = {
  profile: Profile;
  reminderPreference: ReminderPreference;
  todayDate: string;
  history: DailyEntry[];
  todayEntry?: DailyEntry;
  lastEntry?: DailyEntry;
  logsThisWeek: number;
  totalLogs: number;
  daysUntilInsight: number;
};

export type ParseRequestPayload = {
  entryDate: string;
  rawText: string;
  attachments: AttachmentPayload[];
};

export type ParseResponsePayload = {
  structuredLog: StructuredLog;
  transcript: string;
};

export type SaveEntryPayload = {
  entryDate: string;
  rawText: string;
  transcript: string;
  structuredLog: StructuredLog;
  attachments: AttachmentPayload[];
  inputModes: DailyEntry["inputModes"];
};
