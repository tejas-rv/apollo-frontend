import React,{useEffect,useMemo,useState} from "react";
import {Link} from "react-router-dom";
import {ClipboardList,CheckCircle,Calendar,TrendingUp,ArrowRight} from "lucide-react";
import {api} from "../../services/api";

export default function EngineerDashboard(){
  const [dash,setDash]=useState(null);
  const [loading,setLoading]=useState(true);
  const [err,setErr]=useState("");

  useEffect(()=>{
    api.engineerDashboard()
      .then(setDash)
      .catch(e=>setErr(e.message))
      .finally(()=>setLoading(false));
  },[]);

  if(loading) return <section className="page"><div className="loading">Loading…</div></section>;
  if(err)     return <section className="page"><div className="alert error">{err}</div></section>;

  const upcoming = dash?.upcomingServices || [];
  const recent   = dash?.recentReports   || [];

  return <section className="page">
    <div className="page-head">
      <div><span className="eyebrow">ENGINEER PORTAL</span><h1>My Dashboard</h1><p className="muted">Your service assignments and upcoming visits at a glance.</p></div>
      <Link className="primary" to="/engineer/report/new"><ClipboardList size={16}/> New Report</Link>
    </div>

    {/* KPIs */}
    <div className="kpi-grid" style={{gridTemplateColumns:"repeat(3,1fr)"}}>
      <KpiCard icon={Calendar}     label="Services Today"       value={dash.servicesToday}    color="blue"/>
      <KpiCard icon={TrendingUp}   label="Services This Month"  value={dash.servicesThisMonth} color="green"/>
      <KpiCard icon={CheckCircle}  label="Total Submitted"      value={dash.totalSubmitted}    color="green"/>
    </div>

    <div className="due-row">
      {/* Upcoming services */}
      <div className="panel" style={{flex:2}}>
        <div className="panel-head">
          <div><h2>Upcoming Services (next 30 days)</h2><span className="muted">{upcoming.length} scheduled</span></div>
        </div>
        {upcoming.length===0
          ? <div className="empty">No upcoming services in the next 30 days.</div>
          : <div className="table-wrap"><table>
              <thead><tr><th>Customer</th><th>Contract</th><th>Lift</th><th>Next Service</th><th></th></tr></thead>
              <tbody>{upcoming.slice(0,10).map((s,i)=>{
                const days=Math.round((new Date(s.nextServiceDate)-new Date())/(1000*60*60*24));
                return <tr key={i}>
                  <td><b>{s.customerName}</b></td>
                  <td><small>{s.contractNumber||"—"}</small></td>
                  <td><small>{s.liftBrand||"—"} · {s.serialNumber||"—"}</small></td>
                  <td>
                    <span>{s.nextServiceDate}</span>
                    <span className={`status ${days<=3?"expired":days<=7?"pending":"active"}`} style={{marginLeft:8}}>{days}d</span>
                  </td>
                  <td>
                    <Link className="table-link" to={`/engineer/report/new?customerId=${s.customerId}&amcContractId=${s.amcContractId}&customerName=${encodeURIComponent(s.customerName)}`}>
                      Start Report
                    </Link>
                  </td>
                </tr>;
              })}</tbody>
            </table></div>
        }
      </div>

      {/* Recent reports */}
      <div className="panel" style={{flex:1}}>
        <div className="panel-head">
          <h2>Recent Reports</h2>
          <Link to="/engineer/reports" style={{display:"flex",alignItems:"center",gap:4,color:"var(--blue)",textDecoration:"none",fontSize:12}}>All <ArrowRight size={14}/></Link>
        </div>
        {recent.length===0
          ? <div className="empty">No reports submitted yet.</div>
          : recent.map(r=><div key={r.id} style={{padding:"11px 0",borderBottom:"1px solid var(--line)"}}>
              <div style={{display:"flex",justifyContent:"space-between"}}>
                <b style={{fontSize:13}}>{r.customerName}</b>
                <span className={`status ${r.status==="PDF_SENT"||r.status==="SUBMITTED"?"active":"pending"}`}>{r.status}</span>
              </div>
              <small style={{color:"var(--muted)"}}>{r.visitDate} · Report #{r.id}</small>
            </div>)
        }
      </div>
    </div>
  </section>;
}

function KpiCard({icon:Icon,label,value,color}){
  const c={blue:["#edf3fb","#1e5aa8"],green:["#eaf7ef","#217746"],amber:["#fff5dd","#986e18"]}[color]||["#edf3fb","#1e5aa8"];
  return <div className="kpi-card">
    <div className="kpi-icon" style={{background:c[0],color:c[1]}}><Icon size={20}/></div>
    <div><div className="kpi-value">{value??0}</div><div className="kpi-label">{label}</div></div>
  </div>;
}
