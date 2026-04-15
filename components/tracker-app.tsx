"use client";

import Link from "next/link";
import { ChangeEvent, Dispatch, SetStateAction, useEffect, useMemo, useState, useTransition } from "react";
import { VoiceRecorder } from "@/components/voice-recorder";
import {
  AttachmentPayload,
  DailyEntry,
  DashboardData,
  ParseResponsePayload,
  SaveEntryPayload,
  StructuredLog
} from "@/lib/types";

type AppStep = "home" | "capture" | "summary" | "done" | "history";

type TrackerAppProps = {
  initialData: DashboardData;
};

const EMPTY_SUMMARY: StructuredLog = {
  foodTags: [],
  foodNotes: "",
  skincareSteps: [],
  skinSymptoms: [],
  lifestyleSignals: [],
  adherenceStatus: "done",
  confidence: 0.82,
  summary: "",
  followUpPrompt: ""
};

function formatDay(dateString: string) {
  return new Date(dateString).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short"
  });
}

function formatTime(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  const value = new Date();
  value.setHours(hours || 0, minutes || 0, 0, 0);
  return value.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit"
  });
}

async function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function cloneSummary(entry?: DailyEntry) {
  return entry
    ? JSON.parse(JSON.stringify(entry.structuredLog))
    : JSON.parse(JSON.stringify(EMPTY_SUMMARY));
}

function buildInsightMessage(daysUntilInsight: number) {
  if (daysUntilInsight <= 0) {
    return "You have enough consistency to start spotting triggers and calm-skin days.";
  }
  if (daysUntilInsight === 1) {
    return "One more consistent log unlocks your first pattern teaser.";
  }
  return `${daysUntilInsight} more consistent logs unlock your first pattern teaser.`;
}

function buildInsightTeaser(history: DailyEntry[], fallback: string) {
  const dairyFlareDays = history.filter((entry) => {
    const dairyLogged = entry.structuredLog.foodTags.some((item) => item.toLowerCase().includes("dairy"));
    const flareLogged = entry.structuredLog.skinSymptoms.some(
      (item) => item.toLowerCase().includes("pimple") || item.toLowerCase().includes("breakout")
    );
    return dairyLogged && flareLogged;
  }).length;

  if (dairyFlareDays >= 2) {
    return `Early signal: dairy appeared on ${dairyFlareDays} flare days. Keep logging to confirm whether this is a real trigger or just noise.`;
  }

  const calmDays = history.filter((entry) =>
    entry.structuredLog.skinSymptoms.some((item) => item.toLowerCase().includes("calm"))
  ).length;

  if (calmDays >= 2) {
    return `Early signal: you logged ${calmDays} calmer-skin days. Repeating those routines could become tomorrow's default suggestion.`;
  }

  return fallback;
}

function appendUniqueFiles(current: File[], nextFiles: File[]) {
  const seen = new Set(current.map((file) => `${file.name}-${file.size}-${file.lastModified}`));
  const additions = nextFiles.filter((file) => {
    const key = `${file.name}-${file.size}-${file.lastModified}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });

  return [...current, ...additions];
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

export function TrackerApp({ initialData }: TrackerAppProps) {
  const [dashboard, setDashboard] = useState(initialData);
  const [step, setStep] = useState<AppStep>("home");
  const [note, setNote] = useState("");
  const [mealCaption, setMealCaption] = useState("");
  const [selfieCaption, setSelfieCaption] = useState("");
  const [mealPhotos, setMealPhotos] = useState<File[]>([]);
  const [skinSelfies, setSkinSelfies] = useState<File[]>([]);
  const [voiceNote, setVoiceNote] = useState<File | null>(null);
  const [transcript, setTranscript] = useState("");
  const [summary, setSummary] = useState<StructuredLog | null>(null);
  const [inputModes, setInputModes] = useState<DailyEntry["inputModes"]>([]);
  const [busyAction, setBusyAction] = useState<"parse" | "save" | "reminder" | "test-reminder" | "push" | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reminderTime, setReminderTime] = useState(initialData.reminderPreference.preferredTime);
  const [lastSavedEntry, setLastSavedEntry] = useState<DailyEntry | undefined>(initialData.todayEntry);
  const [isPending, startTransition] = useTransition();
  const [pushSupported, setPushSupported] = useState(false);
  const [pushPermission, setPushPermission] = useState<NotificationPermission>("default");
  const [pushSubscribed, setPushSubscribed] = useState(false);

  const fallbackYesterdayEntry = dashboard.history.find((entry) => entry.entryDate !== dashboard.todayDate);
  const mealPhotoPreviews = useMemo(
    () =>
      mealPhotos.map((photo) => ({
        key: `${photo.name}-${photo.lastModified}`,
        name: photo.name,
        url: URL.createObjectURL(photo)
      })),
    [mealPhotos]
  );
  const skinSelfiePreviews = useMemo(
    () =>
      skinSelfies.map((photo) => ({
        key: `${photo.name}-${photo.lastModified}`,
        name: photo.name,
        url: URL.createObjectURL(photo)
      })),
    [skinSelfies]
  );

  useEffect(() => {
    setReminderTime(dashboard.reminderPreference.preferredTime);
  }, [dashboard.reminderPreference.preferredTime]);

  useEffect(() => {
    async function initPushState() {
      if (typeof window === "undefined") {
        return;
      }

      const supportsPush = "serviceWorker" in navigator && "PushManager" in window;
      setPushSupported(supportsPush);
      setPushPermission(Notification.permission);

      if (!supportsPush) {
        return;
      }

      try {
        const registration = await navigator.serviceWorker.register("/sw.js");
        const existingSubscription = await registration.pushManager.getSubscription();
        setPushSubscribed(Boolean(existingSubscription));
      } catch {
        setPushSubscribed(false);
      }
    }

    void initPushState();
  }, []);

  useEffect(() => {
    return () => {
      mealPhotoPreviews.forEach((preview) => URL.revokeObjectURL(preview.url));
    };
  }, [mealPhotoPreviews]);

  useEffect(() => {
    return () => {
      skinSelfiePreviews.forEach((preview) => URL.revokeObjectURL(preview.url));
    };
  }, [skinSelfiePreviews]);

  async function buildAttachments(): Promise<AttachmentPayload[]> {
    const attachments: AttachmentPayload[] = [];

    for (const mealPhoto of mealPhotos) {
      attachments.push({
        kind: "meal_photo",
        name: mealPhoto.name,
        mimeType: mealPhoto.type || "image/jpeg",
        dataUrl: await fileToDataUrl(mealPhoto),
        caption: mealCaption
      });
    }

    if (voiceNote) {
      attachments.push({
        kind: "voice_note",
        name: voiceNote.name,
        mimeType: voiceNote.type || "audio/webm",
        dataUrl: await fileToDataUrl(voiceNote)
      });
    }

    for (const skinSelfie of skinSelfies) {
      attachments.push({
        kind: "skin_selfie",
        name: skinSelfie.name,
        mimeType: skinSelfie.type || "image/jpeg",
        dataUrl: await fileToDataUrl(skinSelfie),
        caption: selfieCaption
      });
    }

    return attachments;
  }

  function resetDraft() {
    setMealPhotos([]);
    setSkinSelfies([]);
    setNote("");
    setMealCaption("");
    setSelfieCaption("");
    setMealPhotos([]);
    setSkinSelfies([]);
    setVoiceNote(null);
    setTranscript("");
    setSummary(null);
    setInputModes([]);
  }

  function goToLogin() {
    if (typeof window !== "undefined") {
      window.location.href = "/auth?mode=login";
    }
  }

  async function refreshDashboard() {
    const response = await fetch("/api/dashboard");
    if (response.status === 401) {
      goToLogin();
      throw new Error("Session expired.");
    }

    const nextDashboard = (await response.json()) as DashboardData;
    startTransition(() => {
      setDashboard(nextDashboard);
    });
    return nextDashboard;
  }

  async function handleParse() {
    if (!note.trim() && mealPhotos.length === 0 && !voiceNote && skinSelfies.length === 0) {
      setError("Add a quick note, voice memo, meal photo, or selfie before parsing.");
      return;
    }

    try {
      setError(null);
      setBanner(null);
      setBusyAction("parse");
      const attachments = await buildAttachments();
      const nextInputModes: DailyEntry["inputModes"] = [
        ...(note.trim() ? (["quick_text"] as const) : []),
        ...attachments.map((item) => item.kind)
      ];

      const response = await fetch("/api/parse", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          entryDate: dashboard.todayDate,
          rawText: note,
          attachments
        })
      });

      if (response.status === 401) {
        goToLogin();
        return;
      }

      const data = (await response.json()) as ParseResponsePayload & { error?: string };
      if (!response.ok || data.error) {
        throw new Error(data.error || "Parsing failed.");
      }

      setTranscript(data.transcript);
      setInputModes(nextInputModes);
      startTransition(() => {
        setSummary(data.structuredLog);
        setStep("summary");
      });
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Parsing failed.");
    } finally {
      setBusyAction(null);
    }
  }

  async function handleSave() {
    if (!summary) {
      setError("Parse the entry before saving.");
      return;
    }

    try {
      setError(null);
      setBusyAction("save");
      const attachments = await buildAttachments();
      const payload: SaveEntryPayload = {
        entryDate: dashboard.todayDate,
        rawText: note,
        transcript,
        structuredLog: summary,
        attachments,
        inputModes: inputModes.length ? inputModes : ["same_as_yesterday"]
      };

      const response = await fetch("/api/entries", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      if (response.status === 401) {
        goToLogin();
        return;
      }

      const data = (await response.json()) as DashboardData & { error?: string };
      if (!response.ok || data.error) {
        throw new Error(data.error || "Saving failed.");
      }

      const todayEntry = data.history.find((entry) => entry.entryDate === data.todayDate);
      startTransition(() => {
        setDashboard(data);
        setLastSavedEntry(todayEntry);
        setStep("done");
        setBanner("Today is logged. Tomorrow's check-in will now feel lighter.");
      });
      resetDraft();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to save your check-in.");
    } finally {
      setBusyAction(null);
    }
  }

  async function handleReminderSave() {
    try {
      setError(null);
      setBusyAction("reminder");
      const response = await fetch("/api/preferences", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          preferredTime: reminderTime
        })
      });

      if (response.status === 401) {
        goToLogin();
        return;
      }

      const data = (await response.json()) as DashboardData & { error?: string };
      if (!response.ok || data.error) {
        throw new Error(data.error || "Could not update reminder.");
      }

      startTransition(() => {
        setDashboard(data);
        setBanner(`Reminder moved to ${formatTime(reminderTime)}.`);
      });
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Could not update reminder.");
    } finally {
      setBusyAction(null);
    }
  }

  async function handleSendTestReminder() {
    try {
      setError(null);
      setBusyAction("test-reminder");
      const response = await fetch("/api/preferences/test-reminder", {
        method: "POST"
      });

      const data = (await response.json()) as { error?: string };
      if (!response.ok || data.error) {
        throw new Error(data.error || "Could not send test reminder.");
      }

      setBanner("Test notification sent.");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Could not send test reminder.");
    } finally {
      setBusyAction(null);
    }
  }

  async function handleEnablePushNotifications() {
    if (!pushSupported) {
      setError("Push notifications are not supported in this browser.");
      return;
    }

    try {
      setError(null);
      setBusyAction("push");

      const permission = await Notification.requestPermission();
      setPushPermission(permission);
      if (permission !== "granted") {
        throw new Error("Notification permission was not granted.");
      }

      const vapidResponse = await fetch("/api/notifications/vapid-public-key");
      const vapidData = (await vapidResponse.json()) as { publicKey?: string; error?: string };
      if (!vapidResponse.ok || !vapidData.publicKey) {
        throw new Error(vapidData.error || "Missing VAPID public key.");
      }

      const registration = await navigator.serviceWorker.register("/sw.js");
      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidData.publicKey)
        });
      }

      const subscribeResponse = await fetch("/api/notifications/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(subscription)
      });
      const subscribeData = (await subscribeResponse.json()) as { error?: string };
      if (!subscribeResponse.ok || subscribeData.error) {
        throw new Error(subscribeData.error || "Unable to enable push reminders.");
      }

      setPushSubscribed(true);
      setBanner("Browser reminders enabled.");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to enable push reminders.");
    } finally {
      setBusyAction(null);
    }
  }

  async function handleDisablePushNotifications() {
    try {
      setError(null);
      setBusyAction("push");

      const registration = await navigator.serviceWorker.register("/sw.js");
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await fetch("/api/notifications/unsubscribe", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ endpoint: subscription.endpoint })
        });
        await subscription.unsubscribe();
      }

      setPushSubscribed(false);
      setBanner("Browser reminders disabled.");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to disable push reminders.");
    } finally {
      setBusyAction(null);
    }
  }

  function handleReuseYesterday() {
    if (!fallbackYesterdayEntry) {
      return;
    }

    setNote(fallbackYesterdayEntry.rawText);
    setTranscript(fallbackYesterdayEntry.transcript);
    setInputModes(["same_as_yesterday"]);
    startTransition(() => {
      setSummary(cloneSummary(fallbackYesterdayEntry));
      setStep("summary");
      setBanner("Yesterday's routine is prefilled. Adjust anything that changed.");
    });
  }

  function updateSummaryArray(
    field: keyof Pick<StructuredLog, "foodTags" | "skincareSteps" | "skinSymptoms" | "lifestyleSignals">,
    value: string
  ) {
    if (!summary) {
      return;
    }
    setSummary({
      ...summary,
      [field]: value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
    } as StructuredLog);
  }

  function updateSummaryField(
    field: keyof Omit<StructuredLog, "foodTags" | "skincareSteps" | "skinSymptoms" | "lifestyleSignals">,
    value: string | number
  ) {
    if (!summary) {
      return;
    }
    setSummary({
      ...summary,
      [field]: value
    } as StructuredLog);
  }

  function onFileListChange(event: ChangeEvent<HTMLInputElement>, setter: Dispatch<SetStateAction<File[]>>) {
    const selectedFiles = Array.from(event.target.files ?? []);
    if (!selectedFiles.length) {
      return;
    }

    setter((current) => appendUniqueFiles(current, selectedFiles));
    // Clear input so selecting the same file again still triggers onChange.
    event.currentTarget.value = "";
  }

  const completionEntry = lastSavedEntry ?? dashboard.todayEntry;
  const progressValue = Math.min(100, Math.round((dashboard.logsThisWeek / 7) * 100));
  const insightMessage = buildInsightMessage(dashboard.daysUntilInsight);
  const insightTeaser = buildInsightTeaser(dashboard.history, insightMessage);
  const busy = Boolean(busyAction || isPending);

  return (
    <main className="app-shell">
      <div className="ambient ambient-left" />
      <div className="ambient ambient-right" />
      <section className="hero-panel">
        <div className="hero-badge">Neothera daily check-in</div>
        <h1>Logging your day should feel lighter than skipping it.</h1>
        <p className="hero-copy">
          Capture a meal photo, speak a short voice note, type a quick update, or drop in a skin selfie. The app turns
          it into a structured acne log you can confirm in one tap.
        </p>

        <div className="hero-grid">
          <article className="metric-card">
            <span className="metric-label">Weekly consistency</span>
            <strong>{dashboard.logsThisWeek}/7 days</strong>
            <p>{dashboard.logsThisWeek >= 4 ? "Consistency is compounding." : "A few fast logs will build momentum."}</p>
          </article>
          <article className="metric-card">
            <span className="metric-label">Pattern engine</span>
            <strong>{dashboard.daysUntilInsight === 0 ? "Ready" : `${dashboard.daysUntilInsight} days left`}</strong>
            <p>{insightMessage}</p>
          </article>
        </div>

        <article className="brand-note">
          <span className="brand-note-label">Why this helps adherence</span>
          <p>
            Repetition becomes a one-tap flow. Natural input becomes structured data. Progress becomes visible enough to
            make tomorrow easier.
          </p>
        </article>
      </section>

      <section className="workspace-panel">
        <header className="workspace-header">
          <div>
            <p className="eyebrow">Today</p>
            <h2>{dashboard.todayEntry ? "Your day is already captured" : "Log today in under 30 seconds"}</h2>
          </div>
          <div className="workspace-header-actions">
            <nav className="step-switcher">
              <button className={step === "home" ? "step-chip active" : "step-chip"} type="button" onClick={() => setStep("home")}>
                Home
              </button>
              <button
                className={step === "capture" ? "step-chip active" : "step-chip"}
                type="button"
                onClick={() => setStep("capture")}
              >
                Capture
              </button>
              <button
                className={step === "history" ? "step-chip active" : "step-chip"}
                type="button"
                onClick={() => setStep("history")}
              >
                History
              </button>
            </nav>
            <form action="/auth/signout" method="post">
              <button className="ghost-button" type="submit">
                Sign out
              </button>
            </form>
            <Link className="secondary-button" href="/profile">
              Profile
            </Link>
          </div>
        </header>

        {banner ? <div className="banner success">{banner}</div> : null}
        {error ? <div className="banner error">{error}</div> : null}

        {step === "home" ? (
          <div className="panel-stack">
            <article className="feature-card large">
              <div className="card-heading">
                <div>
                  <p className="eyebrow">Reminder</p>
                  <h3>Tonight at {formatTime(dashboard.reminderPreference.preferredTime)}</h3>
                </div>
                <span className="status-pill">{dashboard.todayEntry ? "Logged" : "Pending"}</span>
              </div>
              <p className="support-copy">
                Your reminder is intentionally light. The goal is one fast capture, one AI pass, and one confirm tap.
              </p>
              <div className="action-row">
                <button className="primary-button" type="button" onClick={() => setStep("capture")}>
                  Start today&apos;s check-in
                </button>
                <button className="secondary-button" type="button" onClick={handleReuseYesterday} disabled={!fallbackYesterdayEntry}>
                  Same as yesterday
                </button>
              </div>
            </article>

            <div className="split-grid">
              <article className="feature-card">
                <div className="card-heading">
                  <div>
                    <p className="eyebrow">Progress</p>
                    <h3>Consistency meter</h3>
                  </div>
                  <span className="progress-value">{progressValue}%</span>
                </div>
                <div className="progress-track">
                  <div className="progress-fill" style={{ width: `${progressValue}%` }} />
                </div>
                <p className="support-copy">{insightMessage}</p>
              </article>

              <article className="feature-card">
                <div className="card-heading">
                  <div>
                    <p className="eyebrow">Reminder preference</p>
                    <h3>Adjust your check-in time</h3>
                  </div>
                </div>
                <div className="reminder-editor">
                  <input className="time-input" type="time" value={reminderTime} onChange={(event) => setReminderTime(event.target.value)} />
                  <button className="secondary-button" type="button" onClick={handleReminderSave} disabled={busyAction === "reminder"}>
                    {busyAction === "reminder" ? "Saving..." : "Save reminder"}
                  </button>
                  {pushSupported ? (
                    pushSubscribed ? (
                      <button className="ghost-button" type="button" onClick={handleDisablePushNotifications} disabled={busyAction === "push"}>
                        {busyAction === "push" ? "Updating..." : "Disable browser reminders"}
                      </button>
                    ) : (
                      <button className="ghost-button" type="button" onClick={handleEnablePushNotifications} disabled={busyAction === "push"}>
                        {busyAction === "push" ? "Enabling..." : "Enable browser reminders"}
                      </button>
                    )
                  ) : null}
                  <button
                    className="ghost-button"
                    type="button"
                    onClick={handleSendTestReminder}
                    disabled={busyAction === "test-reminder"}
                  >
                    {busyAction === "test-reminder" ? "Sending..." : "Send test notification"}
                  </button>
                </div>
                {pushSupported ? (
                  <p className="support-copy">
                    Browser reminders are {pushSubscribed ? "enabled" : "disabled"} (permission: {pushPermission}).
                  </p>
                ) : (
                  <p className="support-copy">This browser does not support push notifications.</p>
                )}
              </article>
            </div>

            {fallbackYesterdayEntry ? (
              <article className="feature-card">
                <div className="card-heading">
                  <div>
                    <p className="eyebrow">Yesterday&apos;s baseline</p>
                    <h3>{fallbackYesterdayEntry.structuredLog.summary}</h3>
                  </div>
                  <span className="date-label">{formatDay(fallbackYesterdayEntry.entryDate)}</span>
                </div>
                <div className="tag-row">
                  {fallbackYesterdayEntry.structuredLog.foodTags.map((item) => (
                    <span className="tag" key={item}>
                      {item}
                    </span>
                  ))}
                  {fallbackYesterdayEntry.structuredLog.skincareSteps.map((item) => (
                    <span className="tag soft" key={item}>
                      {item}
                    </span>
                  ))}
                </div>
              </article>
            ) : null}
          </div>
        ) : null}

        {step === "capture" ? (
          <div className="panel-stack">
            <article className="feature-card large">
              <div className="card-heading">
                <div>
                  <p className="eyebrow">Multimodal input</p>
                  <h3>Log however your day is easiest to remember</h3>
                </div>
              </div>
              <div className="capture-grid">
                <label className="capture-card">
                  <span className="capture-title">Quick chat</span>
                  <span className="capture-helper">Type what you ate, used, and noticed.</span>
                  <textarea
                    className="text-area"
                    rows={5}
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    placeholder="Had paneer wrap, used cleanser and sunscreen, got 2 new pimples..."
                  />
                </label>

                <label className="capture-card">
                  <span className="capture-title">Meal photo</span>
                  <span className="capture-helper">Upload one or more meal photos and optionally add context.</span>
                  <input
                    className="file-input"
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(event) => onFileListChange(event, setMealPhotos)}
                  />
                  <input
                    className="text-input"
                    value={mealCaption}
                    onChange={(event) => setMealCaption(event.target.value)}
                    placeholder="Optional caption: dinner had paneer and fries"
                  />
                  {mealPhotos.length ? (
                    <>
                      <span className="file-pill">{mealPhotos.length} photo(s) selected</span>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                        {mealPhotoPreviews.map((photo) => (
                          <img
                            key={photo.key}
                            src={photo.url}
                            alt={photo.name}
                            style={{ width: 72, height: 72, objectFit: "cover", borderRadius: 10, border: "1px solid rgba(34,34,34,0.08)" }}
                          />
                        ))}
                      </div>
                    </>
                  ) : null}
                </label>

                <div className="capture-card">
                  <VoiceRecorder value={voiceNote} onChange={setVoiceNote} disabled={busy} />
                </div>

                <label className="capture-card">
                  <span className="capture-title">Optional skin selfie</span>
                  <span className="capture-helper">Useful when the skin changed more than the routine did.</span>
                  <input
                    className="file-input"
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(event) => onFileListChange(event, setSkinSelfies)}
                  />
                  <input
                    className="text-input"
                    value={selfieCaption}
                    onChange={(event) => setSelfieCaption(event.target.value)}
                    placeholder="Optional caption: jawline redness looked calmer"
                  />
                  {skinSelfies.length ? (
                    <>
                      <span className="file-pill">{skinSelfies.length} selfie(s) selected</span>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                        {skinSelfiePreviews.map((photo) => (
                          <img
                            key={photo.key}
                            src={photo.url}
                            alt={photo.name}
                            style={{ width: 72, height: 72, objectFit: "cover", borderRadius: 10, border: "1px solid rgba(34,34,34,0.08)" }}
                          />
                        ))}
                      </div>
                    </>
                  ) : null}
                </label>
              </div>
              <div className="action-row">
                <button className="primary-button" type="button" onClick={handleParse} disabled={busyAction === "parse"}>
                  {busyAction === "parse" ? "Parsing with AI..." : "Convert into today's log"}
                </button>
                <button className="ghost-button" type="button" onClick={handleReuseYesterday} disabled={!fallbackYesterdayEntry || busy}>
                  Reuse yesterday instead
                </button>
              </div>
            </article>
          </div>
        ) : null}

        {step === "summary" && summary ? (
          <div className="panel-stack">
            <article className="feature-card large">
              <div className="card-heading">
                <div>
                  <p className="eyebrow">AI summary</p>
                  <h3>Review once, then confirm in one tap</h3>
                </div>
                <span className="status-pill subtle">{Math.round(summary.confidence * 100)}% confidence</span>
              </div>
              <div className="editor-grid">
                <label className="editor-field">
                  <span>Food tags</span>
                  <input
                    className="text-input"
                    value={summary.foodTags.join(", ")}
                    onChange={(event) => updateSummaryArray("foodTags", event.target.value)}
                    placeholder="dairy, spicy food, sugar"
                  />
                </label>
                <label className="editor-field">
                  <span>Skincare steps</span>
                  <input
                    className="text-input"
                    value={summary.skincareSteps.join(", ")}
                    onChange={(event) => updateSummaryArray("skincareSteps", event.target.value)}
                    placeholder="cleanser, serum, sunscreen"
                  />
                </label>
                <label className="editor-field">
                  <span>Skin symptoms</span>
                  <input
                    className="text-input"
                    value={summary.skinSymptoms.join(", ")}
                    onChange={(event) => updateSummaryArray("skinSymptoms", event.target.value)}
                    placeholder="new pimples, redness, oiliness"
                  />
                </label>
                <label className="editor-field">
                  <span>Lifestyle signals</span>
                  <input
                    className="text-input"
                    value={summary.lifestyleSignals.join(", ")}
                    onChange={(event) => updateSummaryArray("lifestyleSignals", event.target.value)}
                    placeholder="7h sleep, high stress"
                  />
                </label>
                <label className="editor-field editor-field-wide">
                  <span>Food notes</span>
                  <textarea
                    className="text-area"
                    rows={3}
                    value={summary.foodNotes}
                    onChange={(event) => updateSummaryField("foodNotes", event.target.value)}
                  />
                </label>
                <label className="editor-field">
                  <span>Adherence</span>
                  <select
                    className="select-input"
                    value={summary.adherenceStatus}
                    onChange={(event) => updateSummaryField("adherenceStatus", event.target.value)}
                  >
                    <option value="done">Done</option>
                    <option value="partial">Partial</option>
                    <option value="missed">Missed</option>
                  </select>
                </label>
                <label className="editor-field editor-field-wide">
                  <span>AI summary</span>
                  <textarea
                    className="text-area"
                    rows={3}
                    value={summary.summary}
                    onChange={(event) => updateSummaryField("summary", event.target.value)}
                  />
                </label>
                <label className="editor-field editor-field-wide">
                  <span>Follow-up prompt</span>
                  <textarea
                    className="text-area"
                    rows={2}
                    value={summary.followUpPrompt}
                    onChange={(event) => updateSummaryField("followUpPrompt", event.target.value)}
                  />
                </label>
              </div>
              {transcript ? (
                <article className="transcript-card">
                  <p className="eyebrow">Voice transcript</p>
                  <p>{transcript}</p>
                </article>
              ) : null}
              <div className="action-row">
                <button className="primary-button" type="button" onClick={handleSave} disabled={busyAction === "save"}>
                  {busyAction === "save" ? "Saving today's check-in..." : "Confirm and log today"}
                </button>
                <button className="secondary-button" type="button" onClick={() => setStep("capture")}>
                  Back to capture
                </button>
              </div>
            </article>
          </div>
        ) : null}

        {step === "done" && completionEntry ? (
          <div className="panel-stack">
            <article className="feature-card celebration">
              <div className="card-heading">
                <div>
                  <p className="eyebrow">Today logged</p>
                  <h3>One less thing to remember tomorrow</h3>
                </div>
                <span className="status-pill">Streak {completionEntry.streakCount}</span>
              </div>
              <p className="support-copy">{completionEntry.structuredLog.summary}</p>
              <div className="tag-row">
                {completionEntry.structuredLog.foodTags.map((item) => (
                  <span className="tag" key={item}>
                    {item}
                  </span>
                ))}
                {completionEntry.structuredLog.skinSymptoms.map((item) => (
                  <span className="tag soft" key={item}>
                    {item}
                  </span>
                ))}
              </div>
              <div className="action-row">
                <button className="primary-button" type="button" onClick={() => setStep("history")}>
                  View saved history
                </button>
                <button
                  className="secondary-button"
                  type="button"
                  onClick={async () => {
                    await refreshDashboard();
                    setStep("capture");
                  }}
                >
                  Log another version
                </button>
              </div>
            </article>
          </div>
        ) : null}

        {step === "history" ? (
          <div className="panel-stack">
            <article className="feature-card large">
              <div className="card-heading">
                <div>
                  <p className="eyebrow">Saved history</p>
                  <h3>Your recent check-ins</h3>
                </div>
                <span className="status-pill subtle">{dashboard.totalLogs} logged days</span>
              </div>
              <div className="history-list">
                {dashboard.history.map((entry) => (
                  <article className="history-item" key={entry.id}>
                    <div className="history-head">
                      <div>
                        <strong>{formatDay(entry.entryDate)}</strong>
                        <p>{entry.structuredLog.summary}</p>
                      </div>
                      <span className="history-streak">Streak {entry.streakCount}</span>
                    </div>
                    <div className="tag-row">
                      {entry.structuredLog.foodTags.map((item) => (
                        <span className="tag" key={`${entry.id}-${item}`}>
                          {item}
                        </span>
                      ))}
                      {entry.structuredLog.skincareSteps.map((item) => (
                        <span className="tag soft" key={`${entry.id}-${item}`}>
                          {item}
                        </span>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            </article>

            <article className="feature-card">
              <div className="card-heading">
                <div>
                  <p className="eyebrow">What comes next</p>
                  <h3>Pattern teaser</h3>
                </div>
              </div>
              <p className="support-copy">
                The adherence problem gets easier when users can feel the value of their logs. This card hints at future
                trigger detection without turning the assignment into a full analytics product.
              </p>
              <div className="insight-box">{insightTeaser}</div>
            </article>
          </div>
        ) : null}
      </section>
    </main>
  );
}
