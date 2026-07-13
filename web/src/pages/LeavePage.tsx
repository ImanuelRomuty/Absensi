import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { leaveApi } from "../lib/services";

function formatDateOnly(value: string) {
  return value.slice(0, 10);
}

export function LeavePage() {
  const [filter, setFilter] = useState<"PENDING" | "ALL">("PENDING");

  const query = useQuery({
    queryKey: ["leave", filter],
    queryFn: () =>
      leaveApi.list({
        status: filter === "PENDING" ? "PENDING" : undefined,
        limit: 100,
      }),
  });

  if (query.isLoading) return <p>Memuat cuti...</p>;
  if (query.isError) {
    return <p className="error">{(query.error as Error).message}</p>;
  }

  const rows = query.data?.data ?? [];

  return (
    <section>
      <h1>Cuti</h1>
      <p className="muted">
        Monitor pengajuan cuti. Approve/reject dari halaman Approval (tipe LEAVE).
      </p>
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
      <p className="muted">{query.data?.meta?.total ?? rows.length} permintaan</p>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Karyawan</th>
              <th>Jenis</th>
              <th>Mulai</th>
              <th>Selesai</th>
              <th>Hari</th>
              <th>Alasan</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7}>Belum ada pengajuan cuti.</td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id}>
                  <td>
                    {row.employee
                      ? `${row.employee.name} (${row.employee.employeeCode})`
                      : row.employeeId}
                  </td>
                  <td>{row.leaveType?.name ?? row.leaveTypeId}</td>
                  <td>{formatDateOnly(row.startDate)}</td>
                  <td>{formatDateOnly(row.endDate)}</td>
                  <td>{row.days}</td>
                  <td>{row.reason ?? "—"}</td>
                  <td>{row.status}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
