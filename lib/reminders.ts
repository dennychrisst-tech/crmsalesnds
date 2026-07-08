import { Visit, Task } from "@/types";

export type ReminderSeverity = "overdue" | "today";
export type ReminderSource = "visits" | "tasks";

// Narrowed to just what the predicate rules read, so the cron route (which
// queries Prisma directly, not the app's Visit/Task shape) can pass plain
// objects without satisfying the full client-side interfaces.
// `status` widened to plain string (rather than Visit/Task's status union) —
// Prisma returns the raw DB column type here, and the checks below only ever
// compare it against string literals.
export type VisitReminderInput = Pick<Visit, "id" | "date" | "pic" | "rescheduled_to_id"> & { status: string };
// due_date widened to string | null — the Task interface claims non-null,
// but the DB column (and Prisma's return type) is actually nullable.
export type TaskReminderInput = Pick<Task, "id" | "assigned_to"> & { status: string; due_date: string | null };

// Viewer-agnostic reminder facts — no display strings and no "is this mine"
// filtering here, since both concerns depend on who's asking (the logged-in
// viewer client-side, or the push-notification target server-side).
export interface RawReminder {
  id: string;
  source: ReminderSource;
  recordId: string;
  severity: ReminderSeverity;
  // Free-text owner name — visits.pic or tasks.assigned_to, not a user_id FK.
  owner: string;
}

// "YYYY-MM-DD" + n days, staying in plain date-string math (no timezone
// object needed since `today` is already a local-date string by the time it
// reaches this function).
function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

// Shared by RemindersBell (client, per-viewer) and the reminders cron route
// (server, per-recipient) so the actual due-date/status rules only live in
// one place.
export function computeReminders(visits: VisitReminderInput[], tasks: TaskReminderInput[], today: string): RawReminder[] {
  const reminders: RawReminder[] = [];
  const tomorrow = addDays(today, 1);

  visits.forEach(v => {
    if (v.status === "Planned" && v.date && v.date < today) {
      reminders.push({ id: `v-overdue-${v.id}`, source: "visits", recordId: v.id, severity: "overdue", owner: v.pic });
    } else if (v.status === "Planned" && v.date === today) {
      reminders.push({ id: `v-today-${v.id}`, source: "visits", recordId: v.id, severity: "today", owner: v.pic });
    } else if (v.status === "Reschedule" && !v.rescheduled_to_id) {
      // Once the follow-up visit is booked (rescheduled_to_id set), this visit
      // is just historical record-keeping — nagging about it forever would be
      // wrong since there's nothing left to schedule.
      reminders.push({ id: `v-resched-${v.id}`, source: "visits", recordId: v.id, severity: "overdue", owner: v.pic });
    } else if (v.status === "Tentative" && v.date) {
      // Tentative means the client/date is set but the appointment with the
      // PIC isn't confirmed — the real risk is showing up to nobody. Two
      // separate nudges: confirm with the PIC the day before (so there's
      // still time to lock it in or reschedule), and if it still wasn't
      // resolved by the day itself, flag that the actual outcome (met or
      // not) needs to be recorded.
      if (v.date === tomorrow) {
        reminders.push({ id: `v-tentative-confirm-${v.id}`, source: "visits", recordId: v.id, severity: "today", owner: v.pic });
      } else if (v.date <= today) {
        reminders.push({ id: `v-tentative-${v.id}`, source: "visits", recordId: v.id, severity: "overdue", owner: v.pic });
      }
    }
  });

  tasks.forEach(t => {
    if (t.status !== "Open") return;
    if (t.due_date && t.due_date < today) {
      reminders.push({ id: `t-overdue-${t.id}`, source: "tasks", recordId: t.id, severity: "overdue", owner: t.assigned_to });
    } else if (t.due_date === today) {
      reminders.push({ id: `t-today-${t.id}`, source: "tasks", recordId: t.id, severity: "today", owner: t.assigned_to });
    }
  });

  return reminders;
}

// Server-side "today" needs to be pinned to the business's local timezone
// regardless of the host's system timezone (Vercel functions run in UTC).
export function todayStrInJakarta(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(new Date());
  const get = (t: string) => parts.find(p => p.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}
