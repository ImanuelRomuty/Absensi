import { useEffect, useState } from "react";
import {
  clearApiLog,
  subscribeApiLog,
  type ApiLogEntry,
} from "../lib/apiDebugLog";

function pretty(value: unknown): string {
  if (value === undefined) return "(none)";
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function LogCard({ entry }: { entry: ApiLogEntry }) {
  return (
    <article className={`api-log-card ${entry.ok ? "ok" : "fail"}`}>
      <header>
        <span className="api-log-method">{entry.method}</span>
        <span className={`api-log-status ${entry.ok ? "ok" : "fail"}`}>
          {entry.status ?? "ERR"}
        </span>
        <span className="muted">{entry.durationMs} ms</span>
        <span className="muted api-log-time">
          {new Date(entry.at).toLocaleTimeString("id-ID")}
        </span>
      </header>
      <p className="api-log-url">{entry.url}</p>
      <div className="api-log-grid">
        <div>
          <h4>Request payload</h4>
          <pre>{pretty(entry.requestBody)}</pre>
        </div>
        <div>
          <h4>Response body</h4>
          <pre>
            {entry.errorMessage && !entry.responseBody
              ? entry.errorMessage
              : pretty(entry.responseBody)}
          </pre>
        </div>
      </div>
    </article>
  );
}

export function ApiLogPanel({ title = "API log" }: { title?: string }) {
  const [entries, setEntries] = useState<ApiLogEntry[]>([]);

  useEffect(() => subscribeApiLog(setEntries), []);

  return (
    <section className="api-log-panel">
      <div className="api-log-panel__header">
        <div>
          <h2>{title}</h2>
          <p className="muted">
            Method, URL, payload, status, dan body response lengkap.
          </p>
        </div>
        <button type="button" className="ghost" onClick={clearApiLog}>
          Clear
        </button>
      </div>
      {entries.length === 0 ? (
        <p className="muted">Belum ada request. Simpan / muat lokasi untuk melihat log.</p>
      ) : (
        <div className="api-log-list">
          {entries.map((entry) => (
            <LogCard key={entry.id} entry={entry} />
          ))}
        </div>
      )}
    </section>
  );
}
