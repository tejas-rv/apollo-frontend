import {
  ArrowRight,
  Calendar,
  CheckCircle,
  ClipboardList,
  TrendingUp,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../services/api";

export default function EngineerDashboard() {
  const [dash, setDash] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    api
      .engineerDashboard()
      .then(setDash)
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading)
    return (
      <section className="page">
        <div className="loading">Loading…</div>
      </section>
    );
  if (err)
    return (
      <section className="page">
        <div className="alert error">{err}</div>
      </section>
    );

  const recent = dash?.recentReports || [];

  return (
    <section className="page">
      <div className="page-head">
        <div>
          <span className="eyebrow">ENGINEER PORTAL</span>
          <h1>My Dashboard</h1>
          <p className="muted">
            Your service assignments and upcoming visits at a glance.
          </p>
        </div>
        <Link className="primary" to="/app/engineer/report/new">
          <ClipboardList size={16} /> New Report
        </Link>
      </div>

      {/* KPIs */}
      <div
        className="kpi-grid"
        style={{ gridTemplateColumns: "repeat(3,1fr)" }}
      >
        <KpiCard
          icon={Calendar}
          label="Services Today"
          value={dash.servicesToday}
          color="blue"
        />
        <KpiCard
          icon={TrendingUp}
          label="Services This Month"
          value={dash.servicesThisMonth}
          color="green"
        />
        <KpiCard
          icon={CheckCircle}
          label="Total Submitted"
          value={dash.totalSubmitted}
          color="green"
        />
      </div>

      <div className="due-row">
        <div className="panel" style={{ flex: 1 }}>
          <div className="panel-head">
            <h2>Recent Reports</h2>
            <Link
              to="/app/engineer/reports"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                color: "var(--blue)",
                textDecoration: "none",
                fontSize: 12,
              }}
            >
              All <ArrowRight size={14} />
            </Link>
          </div>
          {recent.length === 0 ? (
            <div className="empty">No reports submitted yet.</div>
          ) : (
            recent.map((r) => (
              <div
                key={r.id}
                style={{
                  padding: "11px 0",
                  borderBottom: "1px solid var(--line)",
                }}
              >
                <div
                  style={{ display: "flex", justifyContent: "space-between" }}
                >
                  <b style={{ fontSize: 13 }}>{r.customerName}</b>
                  <span
                    className={`status ${r.status === "PDF_SENT" || r.status === "SUBMITTED" ? "active" : "pending"}`}
                  >
                    {r.status}
                  </span>
                </div>
                <small style={{ color: "var(--muted)" }}>
                  {r.visitDate} · Report #{r.id}
                </small>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
}

function KpiCard({ icon: Icon, label, value, color }) {
  const c = {
    blue: ["#edf3fb", "#1e5aa8"],
    green: ["#eaf7ef", "#217746"],
    amber: ["#fff5dd", "#986e18"],
  }[color] || ["#edf3fb", "#1e5aa8"];
  return (
    <div className="kpi-card">
      <div className="kpi-icon" style={{ background: c[0], color: c[1] }}>
        <Icon size={20} />
      </div>
      <div>
        <div className="kpi-value">{value ?? 0}</div>
        <div className="kpi-label">{label}</div>
      </div>
    </div>
  );
}
