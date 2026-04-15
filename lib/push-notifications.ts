import webpush, { PushSubscription } from "web-push";
import { supabaseAdmin } from "@/lib/supabase";

type StoredPushSubscription = {
  user_id: string;
  endpoint: string;
  subscription: PushSubscription;
};

let vapidConfigured = false;

function ensureVapidConfigured() {
  if (vapidConfigured) {
    return;
  }

  const subject = process.env.VAPID_SUBJECT;
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;

  if (!subject || !publicKey || !privateKey) {
    throw new Error("Push notifications are not configured. Missing VAPID_SUBJECT, VAPID_PUBLIC_KEY, or VAPID_PRIVATE_KEY.");
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);
  vapidConfigured = true;
}

export function getVapidPublicKey() {
  return process.env.VAPID_PUBLIC_KEY ?? "";
}

export async function savePushSubscription(userId: string, subscription: PushSubscription) {
  if (!supabaseAdmin) {
    throw new Error("Supabase is not configured.");
  }

  const { error } = await supabaseAdmin.from("push_subscriptions").upsert(
    {
      user_id: userId,
      endpoint: subscription.endpoint,
      subscription
    },
    { onConflict: "endpoint" }
  );

  if (error) {
    throw new Error(error.message);
  }
}

export async function removePushSubscription(endpoint: string) {
  if (!supabaseAdmin) {
    throw new Error("Supabase is not configured.");
  }

  const { error } = await supabaseAdmin.from("push_subscriptions").delete().eq("endpoint", endpoint);
  if (error) {
    throw new Error(error.message);
  }
}

export async function getUserPushSubscriptions(userId: string) {
  if (!supabaseAdmin) {
    return [];
  }

  const { data, error } = await supabaseAdmin.from("push_subscriptions").select("user_id, endpoint, subscription").eq("user_id", userId);
  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as StoredPushSubscription[];
}

async function sendPushToSubscription(subscription: PushSubscription, payload: { title: string; body: string; url: string }) {
  ensureVapidConfigured();
  await webpush.sendNotification(subscription, JSON.stringify(payload));
}

export async function sendPushToUser(
  userId: string,
  payload: { title: string; body: string; url: string }
): Promise<{ sent: number; removed: number }> {
  const subscriptions = await getUserPushSubscriptions(userId);

  let sent = 0;
  let removed = 0;
  for (const row of subscriptions) {
    try {
      await sendPushToSubscription(row.subscription, payload);
      sent += 1;
    } catch (error) {
      const statusCode = typeof error === "object" && error && "statusCode" in error ? Number((error as { statusCode?: number }).statusCode) : 0;
      if (statusCode === 404 || statusCode === 410) {
        await removePushSubscription(row.endpoint);
        removed += 1;
      } else {
        throw error;
      }
    }
  }

  return { sent, removed };
}
