import { Navigate, NavLink, Outlet } from "react-router-dom";
import { canAccessAdmin, useAuth } from "../auth/AuthContext";
import { getApiBaseUrl } from "../lib/api";

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
          <NavLink to="/leave">Cuti</NavLink>
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
