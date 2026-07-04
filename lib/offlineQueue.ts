// Small localStorage-backed queue for Visit/Task saves made while offline —
// records are small JSON, so this avoids pulling in an IndexedDB dependency
// for what's essentially a short array. Same storage mechanism already used
// for reminder snooze state (see RemindersBell.tsx).
const QUEUE_KEY = "crm_offline_queue";

export interface QueuedMutation {
  queueId: string;
  table: "visits" | "tasks";
  record: Record<string, unknown>;
  timestamp: number;
}

export function getQueue(): QueuedMutation[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveQueue(queue: QueuedMutation[]) {
  try { window.localStorage.setItem(QUEUE_KEY, JSON.stringify(queue)); } catch {}
}

export function enqueue(table: QueuedMutation["table"], record: Record<string, unknown>) {
  const queue = getQueue();
  queue.push({ queueId: `${table}-${record.id}-${Date.now()}`, table, record, timestamp: Date.now() });
  saveQueue(queue);
}

export function removeFromQueue(queueId: string) {
  saveQueue(getQueue().filter(q => q.queueId !== queueId));
}
