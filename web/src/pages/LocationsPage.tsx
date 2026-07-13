import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { LocationMap } from "../components/LocationMap";
import { ApiClientError } from "../lib/api";
import { locationsApi } from "../lib/services";
import type { Location } from "../types/api";

const DEFAULT_LAT = -6.2088;
const DEFAULT_LNG = 106.8456;
const DEFAULT_RADIUS = 150;

type FormState = {
  name: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  isActive: boolean;
};

const emptyForm = (): FormState => ({
  name: "",
  latitude: DEFAULT_LAT,
  longitude: DEFAULT_LNG,
  radiusMeters: DEFAULT_RADIUS,
  isActive: true,
});

function formFromLocation(loc: Location): FormState {
  return {
    name: loc.name,
    latitude: loc.latitude,
    longitude: loc.longitude,
    radiusMeters: loc.radiusMeters,
    isActive: loc.isActive,
  };
}

/** `null` = closed, `"new"` = create, otherwise location id being edited */
type EditorMode = null | "new" | string;

export function LocationsPage() {
  const queryClient = useQueryClient();
  const [editor, setEditor] = useState<EditorMode>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ["locations"],
    queryFn: () => locationsApi.list(),
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name.trim(),
        latitude: form.latitude,
        longitude: form.longitude,
        radiusMeters: form.radiusMeters,
      };
      if (editor === "new") {
        return locationsApi.create(payload);
      }
      if (typeof editor === "string") {
        return locationsApi.update(editor, {
          ...payload,
          isActive: form.isActive,
        });
      }
      throw new Error("Tidak ada editor aktif");
    },
    onSuccess: async () => {
      setFormError(null);
      setEditor(null);
      await queryClient.invalidateQueries({ queryKey: ["locations"] });
    },
    onError: (err) => {
      setFormError(
        err instanceof ApiClientError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Gagal menyimpan lokasi",
      );
    },
  });

  const rows = query.data?.data ?? [];
  const editingLabel = useMemo(() => {
    if (editor === "new") return "Tambah lokasi";
    if (typeof editor === "string") {
      const row = rows.find((r) => r.id === editor);
      return row ? `Edit: ${row.name}` : "Edit lokasi";
    }
    return null;
  }, [editor, rows]);

  function openCreate() {
    setForm(emptyForm());
    setFormError(null);
    setEditor("new");
  }

  function openEdit(loc: Location) {
    setForm(formFromLocation(loc));
    setFormError(null);
    setEditor(loc.id);
  }

  function closeEditor() {
    setEditor(null);
    setFormError(null);
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      setFormError("Nama lokasi wajib diisi");
      return;
    }
    if (
      Number.isNaN(form.latitude) ||
      Number.isNaN(form.longitude) ||
      form.latitude < -90 ||
      form.latitude > 90 ||
      form.longitude < -180 ||
      form.longitude > 180
    ) {
      setFormError("Latitude / longitude tidak valid");
      return;
    }
    if (
      !Number.isInteger(form.radiusMeters) ||
      form.radiusMeters < 1 ||
      form.radiusMeters > 50_000
    ) {
      setFormError("Radius harus bilangan bulat 1–50000 meter");
      return;
    }
    saveMutation.mutate();
  }

  if (query.isLoading) return <p>Memuat lokasi...</p>;
  if (query.isError) {
    return <p className="error">{(query.error as Error).message}</p>;
  }

  return (
    <section>
      <div className="page-header">
        <div>
          <h1>Lokasi / Geofence</h1>
          <p className="muted">
            Atur titik kantor di peta dan radius absen (meter).
          </p>
        </div>
        <button type="button" onClick={openCreate}>
          Tambah lokasi
        </button>
      </div>

      {editor != null && (
        <form className="location-editor" onSubmit={onSubmit}>
          <div className="location-editor__form">
            <h2>{editingLabel}</h2>
            <label>
              Nama kantor
              <input
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
                placeholder="Contoh: Kantor Pusat Jakarta"
                required
              />
            </label>
            <label>
              Radius absen (meter): {form.radiusMeters} m
              <input
                type="range"
                min={20}
                max={2000}
                step={10}
                value={Math.min(form.radiusMeters, 2000)}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    radiusMeters: Number(e.target.value),
                  }))
                }
              />
            </label>
            <label>
              Radius (input tepat)
              <input
                type="number"
                min={1}
                max={50000}
                value={form.radiusMeters}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    radiusMeters: Number(e.target.value),
                  }))
                }
              />
            </label>
            <div className="location-editor__coords">
              <label>
                Latitude
                <input
                  type="number"
                  step="any"
                  value={form.latitude}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      latitude: Number(e.target.value),
                    }))
                  }
                />
              </label>
              <label>
                Longitude
                <input
                  type="number"
                  step="any"
                  value={form.longitude}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      longitude: Number(e.target.value),
                    }))
                  }
                />
              </label>
            </div>
            {editor !== "new" && (
              <label className="location-editor__checkbox">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, isActive: e.target.checked }))
                  }
                />
                Lokasi aktif
              </label>
            )}
            {formError && <p className="error">{formError}</p>}
            <div className="row-actions">
              <button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? "Menyimpan…" : "Simpan"}
              </button>
              <button
                type="button"
                className="ghost"
                onClick={closeEditor}
                disabled={saveMutation.isPending}
              >
                Batal
              </button>
            </div>
          </div>
          <LocationMap
            key={editor}
            latitude={form.latitude}
            longitude={form.longitude}
            radiusMeters={form.radiusMeters}
            onChange={({ lat, lng }) =>
              setForm((f) => ({
                ...f,
                latitude: Number(lat.toFixed(6)),
                longitude: Number(lng.toFixed(6)),
              }))
            }
          />
        </form>
      )}

      <p className="muted">{query.data?.meta?.total ?? rows.length} lokasi</p>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Nama</th>
              <th>Lat</th>
              <th>Lng</th>
              <th>Radius (m)</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6}>Belum ada lokasi. Tambah kantor terlebih dahulu.</td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id}>
                  <td>{row.name}</td>
                  <td>{row.latitude}</td>
                  <td>{row.longitude}</td>
                  <td>{row.radiusMeters}</td>
                  <td>{row.isActive ? "Aktif" : "Nonaktif"}</td>
                  <td>
                    <button
                      type="button"
                      className="ghost"
                      onClick={() => openEdit(row)}
                    >
                      Edit
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
