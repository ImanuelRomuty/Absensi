import { useQuery } from "@tanstack/react-query";
import { Navigate, NavLink, Outlet } from "react-router-dom";
import { canAccessAdmin, useAuth } from "../auth/AuthContext";
import { getApiBaseUrl } from "../lib/api";
import { employeesApi, locationsApi } from "../lib/services";

export function AppLayout() {
  const { user, isLoading, isAuthenticated, logout } = useAuth();

  if (isLoading) {
    return <div className="centered">Memuat sesi...</div>;
  }

  if (!isAuthenticated || !canAccessAdmin(user?.role)) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <strong>masArif</strong>
          <span>Admin HR</span>
        </div>
        <nav>
          <NavLink to="/" end>
            Ringkasan
          </NavLink>
          <NavLink to="/attendance">Absensi</NavLink>
          <NavLink to="/approvals">Approval</NavLink>
          <NavLink to="/employees">Karyawan</NavLink>
          <NavLink to="/locations">Lokasi</NavLink>
        </nav>
        <div className="sidebar-footer">
          <p>{user?.email}</p>
          <p className="muted">{user?.role}</p>
          <button type="button" className="ghost" onClick={() => void logout()}>
            Keluar
          </button>
        </div>
      </aside>
      <main className="main">
        <p className="api-badge">API: {getApiBaseUrl()}</p>
        <Outlet />
      </main>
    </div>
  );
}

export function DashboardPage() {
  const { user } = useAuth();
  return (
    <section>
      <h1>Ringkasan</h1>
      <p className="muted">Selamat datang, {user?.employee?.name ?? user?.email}.</p>
      <div className="cards">
        <article>
          <h2>Peran</h2>
          <p>{user?.role}</p>
        </article>
        <article>
          <h2>Kode karyawan</h2>
          <p>{user?.employee?.employeeCode ?? "—"}</p>
        </article>
        <article>
          <h2>Departemen</h2>
          <p>{user?.employee?.department ?? "—"}</p>
        </article>
      </div>
    </section>
  );
}

export function EmployeesPage() {
  const query = useQuery({
    queryKey: ["employees"],
    queryFn: () => employeesApi.list(),
  });

  if (query.isLoading) return <p>Memuat karyawan...</p>;
  if (query.isError) {
    return <p className="error">{(query.error as Error).message}</p>;
  }

  const rows = query.data?.data ?? [];
  return (
    <section>
      <h1>Karyawan</h1>
      <p className="muted">{query.data?.meta?.total ?? rows.length} data</p>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Kode</th>
              <th>Nama</th>
              <th>Departemen</th>
              <th>Status</th>
              <th>Login</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>{row.employeeCode}</td>
                <td>{row.name}</td>
                <td>{row.department ?? "—"}</td>
                <td>{row.isActive ? "Aktif" : "Nonaktif"}</td>
                <td>{row.user?.email ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function LocationsPage() {
  const query = useQuery({
    queryKey: ["locations"],
    queryFn: () => locationsApi.list(),
  });

  if (query.isLoading) return <p>Memuat lokasi...</p>;
  if (query.isError) {
    return <p className="error">{(query.error as Error).message}</p>;
  }

  const rows = query.data?.data ?? [];
  return (
    <section>
      <h1>Lokasi / Geofence</h1>
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
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>{row.name}</td>
                <td>{row.latitude}</td>
                <td>{row.longitude}</td>
                <td>{row.radiusMeters}</td>
                <td>{row.isActive ? "Aktif" : "Nonaktif"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
