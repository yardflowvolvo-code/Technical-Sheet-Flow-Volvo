import webpush from "web-push";

const VAPID_PUBLIC = process.env["VAPID_PUBLIC_KEY"];
const VAPID_PRIVATE = process.env["VAPID_PRIVATE_KEY"];
const VAPID_MAILTO = process.env["VAPID_MAILTO"] ?? "mailto:admin@yardflow.local";

let initialized = false;

export function initVapid() {
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
    const keys = webpush.generateVAPIDKeys();
    process.env["VAPID_PUBLIC_KEY"] = keys.publicKey;
    process.env["VAPID_PRIVATE_KEY"] = keys.privateKey;
    webpush.setVapidDetails(VAPID_MAILTO, keys.publicKey, keys.privateKey);
  } else {
    webpush.setVapidDetails(VAPID_MAILTO, VAPID_PUBLIC, VAPID_PRIVATE);
  }
  initialized = true;
}

export function getVapidPublicKey(): string {
  return process.env["VAPID_PUBLIC_KEY"] ?? "";
}

export function sendPushNotification(
  subscription: { endpoint: string; keys: { auth: string; p256dh: string } },
  payload: object
): Promise<webpush.SendResult> {
  if (!initialized) initVapid();
  return webpush.sendNotification(
    {
      endpoint: subscription.endpoint,
      keys: subscription.keys,
    },
    JSON.stringify(payload)
  );
}
