import { type FormEvent, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { ApiClientError } from "../lib/api";
import { canAccessAdmin, useAuth } from "../auth/AuthContext";

export function LoginPage() {
  const { login, isAuthenticated, user, isLoading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("hr@masarif.local");
  const [password, setPassword] = useState("Password123!");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!isLoading && isAuthenticated && canAccessAdmin(user?.role)) {
    return <Navigate to="/" replace />;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      navigate("/", { replace: true });
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.message);
      } else {
        setError("Gagal login. Periksa API URL dan koneksi.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-shell">
      <form className="auth-card" onSubmit={onSubmit}>
        <p className="eyebrow">masArif Admin</p>
        <h1>Masuk</h1>
        <p className="muted">Pantau karyawan dan lokasi geofence lewat API cloud.</p>
        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
            required
          />
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </label>
        {error ? <p className="error">{error}</p> : null}
        <button type="submit" disabled={submitting}>
          {submitting ? "Masuk..." : "Masuk"}
        </button>
        <p className="hint">Contoh HR: hr@masarif.local / Password123!</p>
      </form>
    </div>
  );
}
