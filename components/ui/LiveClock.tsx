"use client";
import { useSyncExternalStore } from "react";

function subscribe(callback: () => void) {
  const id = setInterval(callback, 1000);
  return () => clearInterval(id);
}

function getSnapshot() {
  return Date.now();
}

function getServerSnapshot() {
  return 0;
}

export default function LiveClock() {
  const ms = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  if (!ms) return null;

  const now = new Date(ms);
  const time = now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const date = now.toLocaleDateString("id-ID", { weekday: "short", day: "2-digit", month: "short", year: "numeric" });

  return (
    <div className="live-clock" title="Waktu lokal perangkat Anda">
      <span className="live-clock-time">{time}</span>
      <span className="live-clock-date">{date}</span>
    </div>
  );
}
