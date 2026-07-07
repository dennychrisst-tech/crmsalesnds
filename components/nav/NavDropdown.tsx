"use client";
import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, type LucideIcon } from "lucide-react";
import { TABS } from "@/lib/nav";

interface Props {
  label: string;
  icon: LucideIcon;
  hrefs: string[];
  open: boolean;
  onToggle: () => void;
  onCloseRequest: () => void;
}

export default function NavDropdown({ label, icon: Icon, hrefs, open, onToggle, onCloseRequest }: Props) {
  const pathname = usePathname();
  const items = hrefs.map(href => TABS.find(t => t.href === href)).filter((t): t is typeof TABS[number] => !!t);
  const isActive = items.some(i => i.href === pathname);

  // Shared "which dropdown is open" state lives in the parent (see
  // openNavDropdown in CrmShell) so opening one closes the other — each
  // dropdown used to track its own open state locally, so clicking a second
  // one didn't close the first, letting both stay open and overlap.
  useEffect(() => {
    if (!open) return;
    window.addEventListener("click", onCloseRequest);
    return () => window.removeEventListener("click", onCloseRequest);
  }, [open, onCloseRequest]);

  return (
    <div className="nav-dropdown-wrap" onClick={e => e.stopPropagation()}>
      <button className={`nav-dropdown-trigger${isActive ? " active" : ""}`} onClick={onToggle}>
        <span className="tab-icon"><Icon size={15} /></span>{label}
        <ChevronDown size={13} style={{ transform: open ? "rotate(180deg)" : undefined, transition: "transform .15s" }} />
      </button>
      {open && (
        <div className="nav-dropdown-menu">
          {items.map(i => (
            <Link key={i.href} href={i.href} className={`nav-dropdown-item${pathname === i.href ? " active" : ""}`}
              onClick={onCloseRequest}>
              <span className="tab-icon"><i.icon size={14} /></span>{i.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
