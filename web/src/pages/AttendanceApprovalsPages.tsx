import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { approvalsApi, attendanceApi } from "../lib/services";
import { ApiClientError } from "../lib/api";

function startOfDayIso(dateStr: string) {
  return new Date(`${dateStr}T00:00:00.000+07:00`).toISOString();
}

function endOfDayIso(dateStr: string) {
  return new Date(`${dateStr}T23:59:59.999+07:00`).toISOString();
}

function todayJakarta() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function AttendancePage() {
  const [date, setDate] = useState(todayJakarta);
  const range = useMemo(
    () => ({ from: startOfDayIso(date), to: endOfDayIso(date) }),
    [date],
  );

  const query = useQuery({
    queryKey: ["attendance", range.from, range.to],
    queryFn: () => attendanceApi.list({ ...range, limit: 100 }),
  });

  if (query.isLoading) return <p>Memuat absensi...</p>;
  if (query.isError) {
    return <p className="error">{(query.error as Error).message}</p>;
  }

  const rows = query.data?.data ?? [];

  return (
    <section>
      <h1>Absensi</h1>
      <p className="muted">Monitor kehadiran (GPS + geofence).</p>
      <label className="inline-filter">
        Tanggal
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </label>
      <p className="muted">{query.data?.meta?.total ?? rows.length} record</p>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Waktu</th>
              <th>Karyawan</th>
              <th>Tipe</th>
              <th>Lokasi</th>
              <th>Flag</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5}>Belum ada data absensi untuk tanggal ini.</td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id}>
                  <td>{new Date(row.recordedAt).toLocaleString("id-ID")}</td>
                  <td>
                    {row.employee
                      ? `${row.employee.name} (${row.employee.employeeCode})`
                      : row.employeeId}
                  </td>
                  <td>{row.type === "CLOCK_IN" ? "Masuk" : "Keluar"}</td>
                  <td>{row.location?.name ?? "—"}</td>
                  <td>
                    {row.isLate ? "Terlambat " : ""}
                    {row.isEarly ? "Pulang cepat" : ""}
                    {!row.isLate && !row.isEarly ? "—" : ""}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function ApprovalsPage() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<"PENDING" | "ALL">("PENDING");
  const [error, setError] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ["approvals", filter],
    queryFn: () =>
      approvalsApi.list(filter === "PENDING" ? "PENDING" : undefined),
  });

  const decide = useMutation({
    mutationFn: (args: {
      id: string;
      decision: "APPROVED" | "REJECTED";
    }) => approvalsApi.decide(args.id, args.decision),
    onSuccess: async () => {
      setError(null);
      await queryClient.invalidateQueries({ queryKey: ["approvals"] });
      await queryClient.invalidateQueries({ queryKey: ["attendance"] });
    },
    onError: (err) => {
      setError(err instanceof ApiClientError ? err.message : "Gagal memproses");
    },
  });

  if (query.isLoading) return <p>Memuat approval...</p>;
  if (query.isError) {
    return <p className="error">{(query.error as Error).message}</p>;
  }

  const rows = query.data?.data ?? [];

  return (
    <section>
      <h1>Approval</h1>
      <p className="muted">Antrian koreksi absensi.</p>
      <div className="inline-filter">
        <button
          type="button"
          className={filter === "PENDING" ? undefined : "ghost"}
          onClick={() => setFilter("PENDING")}
        >
          Pending
        </button>
        <button
          type="button"
          className={filter === "ALL" ? undefined : "ghost"}
          onClick={() => setFilter("ALL")}
        >
          Semua
        </button>
      </div>
      {error ? <p className="error">{error}</p> : null}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Dibuat</th>
              <th>Pemohon</th>
              <th>Catatan</th>
              <th>Status</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5}>Tidak ada approval.</td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id}>
                  <td>{new Date(row.createdAt).toLocaleString("id-ID")}</td>
                  <td>
                    {row.requester?.employee?.name ??
                      row.requester?.email ??
                      row.requesterId}
                  </td>
                  <td>{row.note ?? "—"}</td>
                  <td>{row.status}</td>
                  <td>
                    {row.status === "PENDING" ? (
                      <div className="row-actions">
                        <button
                          type="button"
                          disabled={decide.isPending}
                          onClick={() =>
                            decide.mutate({ id: row.id, decision: "APPROVED" })
                          }
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          className="ghost"
                          disabled={decide.isPending}
                          onClick={() =>
                            decide.mutate({ id: row.id, decision: "REJECTED" })
                          }
                        >
                          Reject
                        </button>
                      </div>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
