import React, {useState} from "react";
import {useLocation, useNavigate} from "react-router-dom";
import {api,clearSession} from "../services/api";

export default function Login({onLogin}) {
  const [username, setUsername] = useState(
          ""), [password, setPassword] = useState(""), [error, setError] = useState(
          ""), [loading, setLoading] = useState(false), nav = useNavigate(),
      loc = useLocation();

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const r = await api.login({username, password});
      clearSession();
      localStorage.setItem("accessToken", r.accessToken);
      localStorage.setItem("refreshToken", r.refreshToken);
      localStorage.setItem("userRole", r.role);
      localStorage.setItem("username", r.username);
      if (onLogin) {
        onLogin(r);
      }
      const next = (loc.state && loc.state.from) || (r.role === "ENGINEER"
          ? "/engineer" : "/app");
      nav(next, {replace: true})
    } catch (x) {
      setError(x.message)
    } finally {
      setLoading(false)
    }
  }

  return <div className="login-page">
    <div className="login-card">
      <div className="login-brand">
        <strong>APOLLO</strong>
        <span>Elevator</span>
      </div>
      <h1>Welcome back</h1><p className="muted">Sign in to the Apollo Elevator
      management system.</p>{error && <div
        className="alert error">{error}</div>}
      <form onSubmit={submit}><label>Username<input value={username}
                                                    onChange={e => setUsername(
                                                        e.target.value)}
                                                    required/></label><label>Password<input
          type="password" value={password}
          onChange={e => setPassword(e.target.value)} required/></label>
        <button className="primary wide" disabled={loading}>{loading
            ? "Signing in…" : "Sign in"}</button>
      </form>
    </div>
  </div>
}