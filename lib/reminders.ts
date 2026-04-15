const resendApiKey = process.env.RESEND_API_KEY;
const reminderFromEmail = process.env.REMINDER_FROM_EMAIL;
const appBaseUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_BASE_URL ?? "http://localhost:3000";

export const isReminderEmailConfigured = Boolean(resendApiKey && reminderFromEmail);

export async function sendCheckinReminderEmail(params: { to: string; firstName?: string; preferredTime?: string }) {
  if (!resendApiKey || !reminderFromEmail) {
    throw new Error("Reminder email is not configured. Missing RESEND_API_KEY or REMINDER_FROM_EMAIL.");
  }

  const name = params.firstName?.trim() || "there";
  const timeHint = params.preferredTime ? ` around ${params.preferredTime}` : "";

  const subject = "Neothera check-in reminder";
  const text = `Hey ${name}, this is your Neothera reminder${timeHint}. Log your day in under 30 seconds: ${appBaseUrl}/app`;
  const html = `<p>Hey ${name},</p>
<p>This is your Neothera reminder${timeHint}.</p>
<p><a href="${appBaseUrl}/app">Log your day in under 30 seconds</a>.</p>`;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: reminderFromEmail,
      to: [params.to],
      subject,
      text,
      html
    })
  });

  const result = (await response.json()) as { id?: string; message?: string; name?: string };
  if (!response.ok) {
    const details = [result.name, result.message].filter(Boolean).join(": ");
    throw new Error(`Reminder send failed${details ? ` - ${details}` : ""}`);
  }

  return {
    id: result.id ?? null
  };
}
