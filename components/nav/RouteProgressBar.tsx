"use client";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

type Phase = "idle" | "loading" | "done";

export default function RouteProgressBar() {
  const pathname = usePathname();
  const prevPathname = useRef(pathname);
  const [phase, setPhase] = useState<Phase>("idle");
  const doneTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Exposed so nav elements can call it on click.
  useEffect(() => {
    (window as Window & { __startNavProgress?: () => void }).__startNavProgress = () => {
      if (doneTimer.current) clearTimeout(doneTimer.current);
      setPhase("loading");
    };
    return () => {
      delete (window as Window & { __startNavProgress?: () => void }).__startNavProgress;
    };
  }, []);

  // When pathname actually changes, complete the bar then hide it.
  useEffect(() => {
    if (prevPathname.current === pathname) return;
    prevPathname.current = pathname;

    setPhase("done");
    doneTimer.current = setTimeout(() => setPhase("idle"), 350);

    return () => {
      if (doneTimer.current) clearTimeout(doneTimer.current);
    };
  }, [pathname]);

  if (phase === "idle") return null;

  return (
    <div
      className={`nav-progress ${phase === "loading" ? "nav-progress--loading" : "nav-progress--done"}`}
    />
  );
}
