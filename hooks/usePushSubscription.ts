"use client";
import { useCallback, useEffect, useState } from "react";
import { toast } from "@/components/ui/Toast";

// Local flag purely to avoid re-prompting for permission on every load — the
// actual source of truth is the browser's PushManager subscription, which we
// don't re-check on mount to keep this cheap; toggle() always talks to the
// real subscription when the user interacts with it.
const SUBSCRIBED_KEY = "crm_push_subscribed";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

export function usePushSubscription() {
  const [supported, setSupported] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setSupported(typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window);
    setSubscribed(window.localStorage.getItem(SUBSCRIBED_KEY) === "1");
  }, []);

  const subscribe = useCallback(async () => {
    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidKey) {
      toast("Push notification belum dikonfigurasi", { type: "error" });
      return;
    }
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        toast("Izin notifikasi ditolak", { type: "error" });
        return;
      }
      const reg = await navigator.serviceWorker.register("/sw.js");
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey) as BufferSource,
      });
      const json = sub.toJSON();
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: json.endpoint, p256dh: json.keys?.p256dh, auth: json.keys?.auth }),
      });
      if (!res.ok) throw new Error("Gagal mendaftarkan notifikasi");
      window.localStorage.setItem(SUBSCRIBED_KEY, "1");
      setSubscribed(true);
      toast("Notifikasi HP aktif");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Gagal mengaktifkan notifikasi", { type: "error" });
    } finally {
      setBusy(false);
    }
  }, []);

  const unsubscribe = useCallback(async () => {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration("/sw.js");
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      window.localStorage.removeItem(SUBSCRIBED_KEY);
      setSubscribed(false);
      toast("Notifikasi HP dimatikan");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Gagal mematikan notifikasi", { type: "error" });
    } finally {
      setBusy(false);
    }
  }, []);

  const toggle = useCallback(() => {
    if (subscribed) unsubscribe(); else subscribe();
  }, [subscribed, subscribe, unsubscribe]);

  return { supported, subscribed, busy, toggle };
}
