import { supabase } from "./supabaseClient";

// Push notifications: lets calls, DMs and friend requests reach people even
// when Suffrova is closed. The service worker (/sw.js) shows them.

export const pushSupported = () =>
  typeof window !== "undefined" &&
  "serviceWorker" in navigator &&
  "PushManager" in window &&
  "Notification" in window;

// iPhones only allow web push for sites added to the Home Screen.
export const isIosBrowserTab = () =>
  typeof navigator !== "undefined" &&
  /iphone|ipad|ipod/i.test(navigator.userAgent) &&
  !window.matchMedia?.("(display-mode: standalone)").matches &&
  !navigator.standalone;

export function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;

  navigator.serviceWorker.register("/sw.js").catch((error) => {
    console.error("Service worker failed:", error);
  });
}

const toBytes = (base64) => {
  const pad = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (char) => char.charCodeAt(0));
};

async function saveSubscription() {
  const registration = await navigator.serviceWorker.ready;

  let subscription = await registration.pushManager.getSubscription();

  if (!subscription) {
    const { data } = await supabase.functions.invoke("push", { body: { action: "public_key" } });
    if (!data?.publicKey) throw new Error("Couldn't set up notifications. Try again.");

    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: toBytes(data.publicKey),
    });
  }

  const json = subscription.toJSON();
  const { error } = await supabase.rpc("save_push_subscription", {
    p_endpoint: json.endpoint,
    p_p256dh: json.keys.p256dh,
    p_auth: json.keys.auth,
  });

  if (error) throw error;
}

// Must run from a tap (browsers only ask for permission after a user action).
export async function enablePush() {
  if (!pushSupported()) throw new Error("This browser can't do notifications.");

  const permission = await Notification.requestPermission();
  if (permission !== "granted") throw new Error("Notifications are blocked. Allow them in your browser settings.");

  await saveSubscription();
}

// On each visit, re-save the subscription if notifications are already allowed
// (covers new devices, reinstalls and browsers that rotate subscriptions).
export async function refreshPush() {
  if (!pushSupported() || Notification.permission !== "granted") return;

  try {
    await saveSubscription();
  } catch (error) {
    console.error("Push refresh failed:", error);
  }
}

export const pushEnabled = () => pushSupported() && Notification.permission === "granted";
