import { DashboardData, DailyEntry, Profile, ReminderPreference, StructuredLog } from "@/lib/types";

const today = new Date();
const formatDate = (offset = 0) => {
  const value = new Date(today);
  value.setDate(value.getDate() + offset);
  return value.toISOString().slice(0, 10);
};

const demoUserId = process.env.NEOTHERA_DEMO_USER_ID ?? "00000000-0000-0000-0000-000000000001";

export const defaultStructuredLog: StructuredLog = {
  foodTags: ["low dairy"],
  foodNotes: "A steady day with one home-cooked dinner.",
  skincareSteps: ["cleanser", "serum", "sunscreen"],
  skinSymptoms: ["mild redness", "one active spot"],
  lifestyleSignals: ["7.5h sleep", "moderate stress"],
  adherenceStatus: "done",
  confidence: 0.88,
  summary: "Mostly stable day with a mild flare and consistent routine.",
  followUpPrompt: "If this was different from yesterday, tell us what changed most."
};

export const demoProfile: Profile = {
  id: demoUserId,
  firstName: "Vinayak",
  skinGoal: "Calm acne without overthinking every meal"
};

export const demoReminderPreference: ReminderPreference = {
  preferredTime: "20:30",
  channel: "in_app",
  enabled: true
};

export const demoEntries: DailyEntry[] = [
  {
    id: "entry-3",
    userId: demoUserId,
    entryDate: formatDate(-1),
    status: "confirmed",
    rawText: "Had paneer tikka, used cleanser and sunscreen, noticed two fresh pimples.",
    transcript: "",
    structuredLog: {
      foodTags: ["dairy", "spicy food"],
      foodNotes: "Paneer tikka at dinner and one sweet chai.",
      skincareSteps: ["cleanser", "niacinamide serum", "sunscreen"],
      skinSymptoms: ["two new pimples", "slight oiliness"],
      lifestyleSignals: ["6.5h sleep", "high stress"],
      adherenceStatus: "done",
      confidence: 0.91,
      summary: "Dinner skewed dairy-heavy and skin showed two fresh breakouts today.",
      followUpPrompt: "Were the new pimples on the same area as your previous flare?"
    },
    inputModes: ["quick_text"],
    streakCount: 3,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    attachments: []
  },
  {
    id: "entry-2",
    userId: demoUserId,
    entryDate: formatDate(-2),
    status: "confirmed",
    rawText: "Voice note about normal meals, late sleep, used face wash and moisturizer.",
    transcript: "Normal meals, slept late, used face wash and moisturizer, no new pimples.",
    structuredLog: {
      foodTags: ["balanced meals"],
      foodNotes: "Routine day with no obvious trigger foods.",
      skincareSteps: ["cleanser", "moisturizer"],
      skinSymptoms: ["mild redness"],
      lifestyleSignals: ["5.5h sleep", "moderate stress"],
      adherenceStatus: "done",
      confidence: 0.87,
      summary: "Routine food day, but sleep dipped and redness lingered.",
      followUpPrompt: "Would you like tomorrow's check-in prefilled from this routine?"
    },
    inputModes: ["voice_note"],
    streakCount: 2,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    attachments: [
      {
        kind: "voice_note"
      }
    ]
  },
  {
    id: "entry-1",
    userId: demoUserId,
    entryDate: formatDate(-3),
    status: "confirmed",
    rawText: "Uploaded a lunch photo and wrote that skin felt calmer.",
    transcript: "",
    structuredLog: {
      foodTags: ["high protein lunch"],
      foodNotes: "Mostly home food with no dairy noted.",
      skincareSteps: ["cleanser", "sunscreen"],
      skinSymptoms: ["calmer texture", "less redness"],
      lifestyleSignals: ["8h sleep", "low stress"],
      adherenceStatus: "done",
      confidence: 0.89,
      summary: "A steadier day with lower stress and calmer skin texture.",
      followUpPrompt: "This looks like a good baseline day to reuse when your routine repeats."
    },
    inputModes: ["meal_photo"],
    streakCount: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    attachments: [
      {
        kind: "meal_photo"
      }
    ]
  }
];

export const demoDashboard = (): DashboardData => ({
  profile: demoProfile,
  reminderPreference: demoReminderPreference,
  todayDate: formatDate(0),
  history: [...demoEntries].sort((a, b) => (a.entryDate < b.entryDate ? 1 : -1)),
  lastEntry: demoEntries[0],
  logsThisWeek: 3,
  totalLogs: demoEntries.length,
  daysUntilInsight: 2
});
