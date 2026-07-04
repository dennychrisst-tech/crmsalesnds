"use client";
import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

const DISMISS_KEY = "crm_install_dismissed";

// Chrome/Edge fire this instead of navigating immediately — capturing it lets
// us show our own "Instal Aplikasi" button and trigger the native prompt on
// demand, rather than relying on the browser's own (unpredictable) install UI.
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS Safari's own (non-standard) flag — not covered by the media query above.
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [dismissed, setDismissed] = useState(true);

  // Register the service worker unconditionally so the browser can recognize
  // this as an installable PWA even before the user opts into push notifications
  // (usePushSubscription registers the same URl again on subscribe — idempotent).
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  useEffect(() => {
    setDismissed(window.localStorage.getItem(DISMISS_KEY) === "1");
    setIsIOS(/iphone|ipad|ipod/i.test(navigator.userAgent));

    function onBeforeInstall(e: Event) {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    }
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstall);
  }, []);

  function dismiss() {
    setDismissed(true);
    try { window.localStorage.setItem(DISMISS_KEY, "1"); } catch {}
  }

  async function install() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  }

  if (dismissed || isStandalone()) return null;
  // Android/desktop Chrome/Edge: only show once the browser has actually
  // offered install. iOS Safari never fires beforeinstallprompt at all, so
  // show the manual "Add to Home Screen" instructions instead.
  if (!deferredPrompt && !isIOS) return null;

  return (
    <div className="install-banner">
      <Download size={16} className="install-banner-icon" />
      <div className="install-banner-text">
        {isIOS ? (
          <>Instal CRM ini ke HP: tombol <b>Share</b> di Safari → <b>Tambah ke Layar Utama</b></>
        ) : (
          <>Instal CRM ini sebagai aplikasi di HP/laptop Anda untuk akses lebih cepat.</>
        )}
      </div>
      {!isIOS && <button className="btn btn-sm install-banner-btn" onClick={install}>Instal</button>}
      <button className="install-banner-close" onClick={dismiss} aria-label="Tutup"><X size={14} /></button>
    </div>
  );
}
