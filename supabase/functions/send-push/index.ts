import { createClient } from "npm:@supabase/supabase-js@2";
import { GoogleAuth } from "npm:google-auth-library@9.15.1";

type NotificationRow = {
  id: string;
  user_id?: string | null;
  title?: string | null;
  body?: string | null;
  kind?: string | null;
  link?: string | null;
  actor_id?: string | null;
  metadata?: Record<string, unknown> | null;
  is_broadcast?: boolean | null;
  audience?: string | null;
};

type WebhookPayload = {
  type?: string;
  table?: string;
  record?: NotificationRow;
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const FIREBASE_PROJECT_ID = Deno.env.get("FIREBASE_PROJECT_ID") || "student-1fcba";
const FIREBASE_SERVICE_ACCOUNT_JSON = Deno.env.get("FIREBASE_SERVICE_ACCOUNT_JSON") || "";
const STUDENT_WEB_URL = Deno.env.get("STUDENT_WEB_URL") || "https://student-b1v.pages.dev/";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

function text(value: unknown, max = 900): string {
  return String(value ?? "").slice(0, max);
}

function appUrl(notificationId: string): string {
  const target = new URL("./index.html", STUDENT_WEB_URL);
  if (notificationId) target.searchParams.set("student_notification", notificationId);
  return target.href;
}

async function getAccessToken(): Promise<string> {
  if (!FIREBASE_SERVICE_ACCOUNT_JSON) throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON_MISSING");
  const credentials = JSON.parse(FIREBASE_SERVICE_ACCOUNT_JSON);
  const auth = new GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/firebase.messaging"]
  });
  const client = await auth.getClient();
  const result = await client.getAccessToken();
  const token = typeof result === "string" ? result : result?.token;
  if (!token) throw new Error("FIREBASE_ACCESS_TOKEN_FAILED");
  return token;
}

async function recipientUserIds(notification: NotificationRow): Promise<string[] | null> {
  // Do not create an external push back to the actor for their own action.
  if (notification.user_id && notification.actor_id && notification.user_id === notification.actor_id) return [];
  if (notification.user_id) return [notification.user_id];
  if (notification.is_broadcast !== true) return [];

  const audience = String(notification.audience || "all").toLowerCase();
  const kind = String(notification.kind || "").toLowerCase();
  const adminOnlyKinds = ["admin_", "verification_request", "verified_support", "recharge_request", "teacher_request", "store_order_admin"];
  const adminOnly = audience === "admin" || adminOnlyKinds.some((prefix) => kind.startsWith(prefix));
  if (adminOnly) {
    const { data, error } = await supabase
      .from("profiles")
      .select("id")
      .eq("role", "admin");
    if (error) throw error;
    return (data || []).map((row: { id: string }) => row.id);
  }

  // null means all active push tokens (broadcast to everyone).
  return null;
}

async function loadTokens(
  userIds: string[] | null,
  actorId?: string | null
): Promise<Array<{ id: string; fcm_token: string; user_id?: string | null; platform?: string | null }>> {
  if (Array.isArray(userIds) && !userIds.length) return [];
  const all: Array<{ id: string; fcm_token: string; user_id?: string | null; platform?: string | null }> = [];
  const pageSize = 500;
  for (let from = 0; from < 50000; from += pageSize) {
    let query = supabase
      .from("device_push_tokens")
      .select("id,fcm_token,user_id,platform")
      .eq("is_active", true)
      .range(from, from + pageSize - 1);
    if (Array.isArray(userIds)) query = query.in("user_id", userIds);
    if (actorId) query = query.neq("user_id", actorId);
    const { data, error } = await query;
    if (error) throw error;
    const rows = data || [];
    all.push(...rows);
    if (rows.length < pageSize) break;
  }
  return all;
}

const unreadCountCache = new Map<string, number>();

async function unreadCountForUser(userId?: string | null): Promise<number> {
  if (!userId) return 1;
  if (unreadCountCache.has(userId)) return unreadCountCache.get(userId)!;

  const { count: directCount, error: directError } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("is_read", false);
  if (directError) throw directError;

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", userId).maybeSingle();
  const role = String(profile?.role || "").toLowerCase();
  let broadcastQuery = supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .is("user_id", null)
    .eq("is_broadcast", true)
    .eq("is_read", false);
  broadcastQuery = role === "admin"
    ? broadcastQuery.in("audience", ["all", "admin"])
    : broadcastQuery.in("audience", ["all"]);
  const { count: broadcastCount, error: broadcastError } = await broadcastQuery;
  if (broadcastError) throw broadcastError;
  const total = Math.max(1, Number(directCount || 0) + Number(broadcastCount || 0));
  unreadCountCache.set(userId, total);
  return total;
}

async function sendOne(
  accessToken: string,
  tokenRow: { id: string; fcm_token: string; user_id?: string | null; platform?: string | null },
  notification: NotificationRow
) {
  const title = text(notification.title || "Student", 120);
  const body = text(notification.body || "لديك إشعار جديد", 600);
  const notificationId = text(notification.id, 100);
  const targetUrl = appUrl(notificationId);
  const iconUrl = new URL("./icon-192.png", STUDENT_WEB_URL).href;
  const unreadCount = await unreadCountForUser(tokenRow.user_id);

  const response = await fetch(
    `https://fcm.googleapis.com/v1/projects/${encodeURIComponent(FIREBASE_PROJECT_ID)}/messages:send`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message: {
          ...(tokenRow.fcm_token.length <= 64
            ? { fid: tokenRow.fcm_token }
            : { token: tokenRow.fcm_token }),

          // Notification payload makes Chrome/Android display the alert even
          // when Student has no open tab.
          ...(String(tokenRow.platform || "").toLowerCase() === "android-fcm" && notification.kind === "app_update"
            ? {} // Data-only high-priority Android update: run StudentUpdateChecks.
            : { notification: { title, body } }),

          // Native Android delivery is explicitly high-priority so a real FCM
          // registration can wake/display Student while the app is backgrounded.
          ...(String(tokenRow.platform || "").toLowerCase() === "android-fcm"
            ? {
                android: {
                  priority: "high",
                  ttl: "86400s",
                  ...(notification.kind === "app_update" ? {} : {
                    notification: {
                      channel_id: "student_main",
                      sound: "default",
                      tag: notificationId ? `student-${notificationId}` : "student-notification",
                      notification_count: unreadCount
                    }
                  })
                }
              }
            : {}),

          // Keep Student metadata for foreground handling and future routing.
          data: {
            title,
            body,
            notification_id: notificationId,
            kind: text(notification.kind, 80),
            link: text(notification.link, 500),
            actor_id: text(notification.actor_id, 100),
            metadata: text(JSON.stringify(notification.metadata || {}), 1800),
            unread_count: String(unreadCount)
          },

          webpush: {
            headers: {
              Urgency: "high",
              TTL: "86400"
            },
            notification: {
              icon: iconUrl,
              badge: iconUrl,
              tag: notificationId ? `student-${notificationId}` : "student-notification",
              renotify: true
            },
            fcm_options: {
              link: targetUrl
            }
          }
        }
      })
    }
  );

  if (response.ok) return { ok: true };

  const errorBody = await response.text();
  if (/UNREGISTERED|registration-token-not-registered|NOT_FOUND/i.test(errorBody)) {
    await supabase
      .from("device_push_tokens")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq("id", tokenRow.id);
  }
  return { ok: false, status: response.status, error: errorBody.slice(0, 800) };
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

  try {
    const payload = (await req.json()) as WebhookPayload;
    if (payload.type && payload.type !== "INSERT") {
      return Response.json({ ok: true, skipped: "not_insert" });
    }
    if (payload.table && payload.table !== "notifications") {
      return Response.json({ ok: true, skipped: "wrong_table" });
    }

    const notification = payload.record;
    if (!notification?.id) {
      return Response.json({ ok: false, error: "notification_record_missing" }, { status: 400 });
    }

    const users = await recipientUserIds(notification);
    let tokens = await loadTokens(users, notification.actor_id);

    // Respect the user's daily-learning reminder preference.
    if (String(notification.kind || "").toLowerCase() === "daily_learning" && tokens.length) {
      const userIds = [...new Set(tokens.map((t) => t.user_id).filter(Boolean))] as string[];
      if (userIds.length) {
        const { data: disabledRows, error: prefError } = await supabase
          .from("student_notification_preferences")
          .select("user_id")
          .in("user_id", userIds)
          .eq("daily_learning_reminder", false);
        if (!prefError) {
          const disabled = new Set((disabledRows || []).map((r: { user_id: string }) => r.user_id));
          tokens = tokens.filter((t) => !t.user_id || !disabled.has(t.user_id));
        }
      }
    }

    if (!tokens.length) return Response.json({ ok: true, sent: 0 });

    const accessToken = await getAccessToken();
    let sent = 0;
    let failed = 0;

    for (let i = 0; i < tokens.length; i += 25) {
      const batch = tokens.slice(i, i + 25);
      const results = await Promise.all(batch.map((row) => sendOne(accessToken, row, notification)));
      for (const result of results) result.ok ? sent++ : failed++;
      if (i > 0 && i % 500 === 0) await new Promise((resolve) => setTimeout(resolve, 250));
    }

    try { await supabase.from("student_push_delivery_log").insert({ notification_id: notification.id, sent_count: sent, failed_count: failed }); } catch (_) {}
    return Response.json({ ok: true, sent, failed });
  } catch (error) {
    console.error("send-push error", error);
    return Response.json({ ok: false, error: String(error?.message || error) }, { status: 500 });
  }
});
