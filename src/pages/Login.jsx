import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import AppLogo from "../components/AppLogo";
import "../components/AppLogo.css";
import { api } from "../services/api";
function normalizeRole(value) {
  return String(value || "")
    .replace(/^ROLE_/i, "")
    .toUpperCase();
}
function authUser(response, username) {
  const source =
    response.user || response.data?.user || response.data || response;
  const role = normalizeRole(
    response.role ||
      source.role ||
      source.userRole ||
      source.authority ||
      source.authorities?.[0],
  );
  return {
    ...source,
    role,
    username: response.username || source.username || username,
    accessToken:
      response.accessToken || response.token || response.data?.accessToken,
    refreshToken: response.refreshToken || response.data?.refreshToken,
  };
}
export default function Login({ onLogin }) {
  const [username, setUsername] = useState(""),
    [password, setPassword] = useState(""),
    [showPassword, setShowPassword] = useState(false),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(false),
    nav = useNavigate(),
    loc = useLocation();
  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await api.login({ username, password });
      const r = authUser(response, username);
      if (!r.accessToken)
        throw new Error("Login succeeded but no access token was returned.");
      localStorage.setItem("accessToken", r.accessToken);
      if (r.refreshToken) localStorage.setItem("refreshToken", r.refreshToken);
      localStorage.setItem("userRole", r.role);
      localStorage.setItem("username", r.username);
      if (onLogin) onLogin(r);
      const requested = loc.state && loc.state.from;
      const next =
        requested &&
        ((r.role === "ENGINEER" && requested.startsWith("/app/engineer")) ||
          (r.role === "ADMIN" && requested.startsWith("/app")))
          ? requested
          : r.role === "ENGINEER"
            ? "/app/engineer"
            : "/app";
      nav(next, { replace: true });
    } catch (x) {
      setError(x.message);
    } finally {
      setLoading(false);
    }
  }
  return (
    <div className="login-page">
      <div className="login-card">
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginBottom: 20,
          }}
        >
          <AppLogo size={64} />
        </div>
        <h1>Welcome back</h1>
        <p className="muted">
          Sign in to the Apollo Elevator management system.
        </p>
        {error && <div className="alert error">{error}</div>}
        <form onSubmit={submit}>
          <label>
            Username
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoComplete="username"
            />
          </label>
          <label>
            Password
            <div className="password-field">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword((value) => !value)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </label>
          <button className="primary wide" disabled={loading}>
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
