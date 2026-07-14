import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import type { FormEvent } from "react";
import { ApiClientError } from "../lib/api";
import { employeesApi, locationsApi } from "../lib/services";
import type { Employee } from "../types/api";

export function EmployeesPage() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<Employee | null>(null);
  const [selectedLocationIds, setSelectedLocationIds] = useState<string[]>([]);
  const [formError, setFormError] = useState<string | null>(null);

  const employeesQuery = useQuery({
    queryKey: ["employees"],
    queryFn: () => employeesApi.list(),
  });

  const locationsQuery = useQuery({
    queryKey: ["locations"],
    queryFn: () => locationsApi.list(1, 100),
  });

  const saveMutation = useMutation({
    mutationFn: () => {
      if (!editing) throw new Error("Tidak ada karyawan dipilih");
      return employeesApi.update(editing.id, {
        locationIds: selectedLocationIds,
      });
    },
    onSuccess: async () => {
      setFormError(null);
      setEditing(null);
      await queryClient.invalidateQueries({ queryKey: ["employees"] });
    },
    onError: (err) => {
      setFormError(
        err instanceof ApiClientError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Gagal menyimpan lokasi karyawan",
      );
    },
  });

  function openEdit(emp: Employee) {
    setEditing(emp);
    setSelectedLocationIds(emp.locations.map((l) => l.id));
    setFormError(null);
  }

  function toggleLocation(id: string) {
    setSelectedLocationIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    saveMutation.mutate();
  }

  if (employeesQuery.isLoading) return <p>Memuat karyawan...</p>;
  if (employeesQuery.isError) {
    return <p className="error">{(employeesQuery.error as Error).message}</p>;
  }

  const rows = employeesQuery.data?.data ?? [];
  const locations = (locationsQuery.data?.data ?? []).filter((l) => l.isActive);

  return (
    <section>
      <h1>Karyawan</h1>
      <p className="muted">
        {employeesQuery.data?.meta?.total ?? rows.length} karyawan — atur lokasi
        geofence absensi per orang.
      </p>

      {editing && (
        <form className="employee-editor" onSubmit={onSubmit}>
          <div className="page-header">
            <div>
              <h2>
                Edit lokasi: {editing.name} ({editing.employeeCode})
              </h2>
              <p className="muted">
                Centang kantor yang boleh dipakai untuk clock-in/out.
              </p>
            </div>
          </div>

          {locationsQuery.isLoading ? (
            <p>Memuat lokasi...</p>
          ) : locations.length === 0 ? (
            <p className="muted">
              Belum ada lokasi aktif. Buat dulu di menu Lokasi.
            </p>
          ) : (
            <div className="location-checklist">
              {locations.map((loc) => (
                <label key={loc.id} className="location-checklist__item">
                  <input
                    type="checkbox"
                    checked={selectedLocationIds.includes(loc.id)}
                    onChange={() => toggleLocation(loc.id)}
                  />
                  <span>
                    <strong>{loc.name}</strong>
                    <span className="muted">
                      {" "}
                      · radius {loc.radiusMeters} m · {loc.latitude},{" "}
                      {loc.longitude}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          )}

          {formError && <p className="error">{formError}</p>}
          <div className="row-actions">
            <button type="submit" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "Menyimpan…" : "Simpan lokasi"}
            </button>
            <button
              type="button"
              className="ghost"
              onClick={() => setEditing(null)}
              disabled={saveMutation.isPending}
            >
              Batal
            </button>
          </div>
        </form>
      )}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Kode</th>
              <th>Nama</th>
              <th>Departemen</th>
              <th>Email</th>
              <th>Peran</th>
              <th>Lokasi</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={8}>Belum ada karyawan.</td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id}>
                  <td>{row.employeeCode}</td>
                  <td>{row.name}</td>
                  <td>{row.department ?? "—"}</td>
                  <td>{row.user?.email ?? "—"}</td>
                  <td>{row.user?.role ?? "—"}</td>
                  <td>
                    {row.locations.length === 0
                      ? "—"
                      : row.locations.map((l) => l.name).join(", ")}
                  </td>
                  <td>{row.isActive ? "Aktif" : "Nonaktif"}</td>
                  <td>
                    <button
                      type="button"
                      className="ghost"
                      onClick={() => openEdit(row)}
                    >
                      Edit lokasi
                    </button>
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
