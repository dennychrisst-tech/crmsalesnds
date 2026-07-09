"use client";
import { ReactNode, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { MoreHorizontal, Sun, Moon } from "lucide-react";
import { useCRMData } from "@/contexts/CRMDataContext";
import { useTheme } from "@/hooks/useTheme";
import { TABS, PRIMARY_HREFS, MORE_TABS, MORE_GROUPS, DESKTOP_PRIMARY_HREFS, DESKTOP_DROPDOWN_GROUPS } from "@/lib/nav";
import GlobalSearch from "@/components/GlobalSearch";
import RemindersBell from "@/components/RemindersBell";
import LogbookBell from "@/components/LogbookBell";
import InstallPrompt from "@/components/InstallPrompt";
import ToastHost from "@/components/ui/Toast";
import Logo from "@/components/ui/Logo";
import NavDropdown from "./NavDropdown";
import RouteProgressBar from "./RouteProgressBar";

function startNavProgress() {
  (window as Window & { __startNavProgress?: () => void }).__startNavProgress?.();
}

// Everything CRMApp.tsx used to render around the active view — header
// (logo/search/reminders/theme/logout), desktop tab row + dropdowns, mobile
// bottom-nav + "Lainnya" sheet, the PWA install prompt, and the loading
// skeleton gate. Lives here (instead of directly in app/(crm)/layout.tsx) so
// it can call useCRMData() as a child of CRMDataProvider.
export default function CrmShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { data, loading, currentProfile, pendingSyncCount, isAdmin } = useCRMData();
  const { theme, toggle: toggleTheme } = useTheme();
  const [moreOpen, setMoreOpen] = useState(false);
  const [openNavDropdown, setOpenNavDropdown] = useState<string | null>(null);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
  }

  return (
    <div className="app">
      <RouteProgressBar />
      <ToastHost />
      <header className="top">
        <div className="header-brand">
          <Logo height={44} />
          <div className="header-crm-tag">Sales CRM</div>
        </div>
        <div className="header-search-row">
          {!loading && (
            <GlobalSearch
              data={data}
              onNavigate={href => router.push(href)}
              onOpenClient={id => router.push(`/clients?openClientId=${id}`)}
              onOpenDeal={id => router.push(`/pipeline?openDealId=${id}`)}
              onOpenTask={id => router.push(`/tasks?openTaskId=${id}`)}
            />
          )}
          {!loading && (
            <RemindersBell
              data={data} currentUserName={currentProfile?.name ?? ""} isAdmin={isAdmin}
              onNavigate={href => router.push(href)}
              onOpenTask={id => router.push(`/tasks?openTaskId=${id}`)}
            />
          )}
          {pendingSyncCount > 0 && (
            <span className="pending-sync-badge" title="Menunggu koneksi untuk disinkronkan">
              {pendingSyncCount} tersimpan offline
            </span>
          )}
          <LogbookBell />
          <button onClick={toggleTheme} className="btn-theme-toggle" title={theme === "dark" ? "Mode Terang" : "Mode Gelap"} aria-label="Ganti tema">
            {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
          </button>
        </div>
        {currentProfile && ["super_admin", "admin"].includes(currentProfile.role) && (
          <a href="/admin/users" className="btn-admin">Admin</a>
        )}
        <button onClick={handleLogout} className="btn-logout">Log Out</button>
      </header>

      <InstallPrompt />

      <nav className="tabs">
        {TABS.filter(t => DESKTOP_PRIMARY_HREFS.includes(t.href)).map(t => (
          <Link key={t.href} href={t.href} prefetch={false} className={pathname === t.href ? "active" : ""} onClick={startNavProgress}>
            <span className="tab-icon"><t.icon size={15} /></span>{t.label}
          </Link>
        ))}
        {DESKTOP_DROPDOWN_GROUPS.map(g => (
          <NavDropdown key={g.label} label={g.label} icon={g.icon} hrefs={g.hrefs}
            open={openNavDropdown === g.label}
            onToggle={() => setOpenNavDropdown(o => o === g.label ? null : g.label)}
            onCloseRequest={() => setOpenNavDropdown(null)} />
        ))}
      </nav>

      {/* Bottom nav — mobile only (see globals.css). Desktop keeps the tab row above. */}
      <nav className="bottom-nav">
        {TABS.filter(t => PRIMARY_HREFS.includes(t.href)).map(t => (
          <Link key={t.href} href={t.href} prefetch={false} className={pathname === t.href && !moreOpen ? "active" : ""} onClick={() => { setMoreOpen(false); startNavProgress(); }}>
            <span className="bottom-nav-icon"><t.icon size={20} /></span>
            <span className="bottom-nav-label">{t.label}</span>
          </Link>
        ))}
        <button className={moreOpen || MORE_TABS.some(t => t.href === pathname) ? "active" : ""} onClick={() => setMoreOpen(o => !o)}>
          <span className="bottom-nav-icon"><MoreHorizontal size={20} /></span>
          <span className="bottom-nav-label">Lainnya</span>
        </button>
      </nav>

      {moreOpen && (
        <div className="more-sheet-backdrop" onClick={() => setMoreOpen(false)}>
          <div className="more-sheet" onClick={e => e.stopPropagation()}>
            <div className="more-sheet-handle" />
            {(() => {
              const grouped = new Set(MORE_GROUPS.flatMap(g => g.hrefs));
              const ungrouped = MORE_TABS.filter(t => !grouped.has(t.href));
              const sections = [...MORE_GROUPS, ...(ungrouped.length ? [{ label: "Lainnya", hrefs: ungrouped.map(t => t.href) }] : [])];
              return sections.map(group => {
                const items = group.hrefs.map(href => MORE_TABS.find(t => t.href === href)).filter((t): t is typeof MORE_TABS[number] => !!t);
                if (items.length === 0) return null;
                return (
                  <div key={group.label} className="more-sheet-group">
                    <div className="more-sheet-group-label">{group.label}</div>
                    {items.map(t => (
                      <Link key={t.href} href={t.href} prefetch={false} className={`more-sheet-item${pathname === t.href ? " active" : ""}`}
                        onClick={() => { setMoreOpen(false); startNavProgress(); }}>
                        <span className="bottom-nav-icon"><t.icon size={18} /></span>{t.label}
                      </Link>
                    ))}
                  </div>
                );
              });
            })()}
          </div>
        </div>
      )}

      {loading ? (
        /* Skeleton mirrors the Dashboard layout (default view) while data loads */
        <div aria-label="Memuat data…" aria-busy="true">
          <div className="skeleton sk-bar" />
          <div className="kpis">
            {Array.from({ length: 8 }).map((_, i) => <div key={i} className="skeleton sk-kpi" />)}
          </div>
          <div className="skeleton sk-panel" />
          <div className="grid2">
            <div className="skeleton sk-panel" />
            <div className="skeleton sk-panel" />
          </div>
        </div>
      ) : children}
    </div>
  );
}
