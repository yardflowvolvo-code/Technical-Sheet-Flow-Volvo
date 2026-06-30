export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null;
  try {
    const reg = await navigator.serviceWorker.register(
      import.meta.env.BASE_URL + "sw.js",
      { scope: import.meta.env.BASE_URL }
    );
    return reg;
  } catch (err) {
    console.error("SW registration failed:", err);
    return null;
  }
}

export async function subscribePush(reg: ServiceWorkerRegistration, vapidPublicKey: string) {
  const existing = await reg.pushManager.getSubscription();
  if (existing) return existing;

  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
  });
  return sub;
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function watchGeolocation(
  onPosition: (lat: number, lng: number) => void,
  intervalMs = 20000
): () => void {
  let timerId: ReturnType<typeof setInterval> | null = null;

  function send() {
    navigator.geolocation.getCurrentPosition(
      (pos) => onPosition(pos.coords.latitude, pos.coords.longitude),
      (err) => console.warn("Geolocation error:", err),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  send();
  timerId = setInterval(send, intervalMs);
  return () => {
    if (timerId !== null) clearInterval(timerId);
  };
}
