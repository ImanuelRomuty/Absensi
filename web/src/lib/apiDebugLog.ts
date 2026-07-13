export type ApiLogEntry = {
  id: string;
  at: string;
  method: string;
  url: string;
  requestBody: unknown;
  status: number | null;
  ok: boolean;
  responseBody: unknown;
  errorMessage?: string;
  durationMs: number;
};

type Listener = (entries: ApiLogEntry[]) => void;

const MAX_ENTRIES = 40;
const listeners = new Set<Listener>();
let entries: ApiLogEntry[] = [];

function emit() {
  const snapshot = entries.slice();
  for (const listener of listeners) {
    listener(snapshot);
  }
}

export function subscribeApiLog(listener: Listener): () => void {
  listeners.add(listener);
  listener(entries.slice());
  return () => {
    listeners.delete(listener);
  };
}

export function getApiLog(): ApiLogEntry[] {
  return entries.slice();
}

export function clearApiLog() {
  entries = [];
  emit();
}

export function pushApiLog(entry: Omit<ApiLogEntry, "id" | "at">) {
  const full: ApiLogEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    at: new Date().toISOString(),
    ...entry,
  };
  entries = [full, ...entries].slice(0, MAX_ENTRIES);
  emit();
}
