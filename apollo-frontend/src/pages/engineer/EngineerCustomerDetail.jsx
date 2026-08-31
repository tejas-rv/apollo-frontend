import React,{useEffect,useState} from "react";
import {Link,useNavigate,useParams} from "react-router-dom";
import {ArrowLeft,ClipboardList} from "lucide-react";
import {api} from "../../services/api";

export default function EngineerCustomerDetail(){
  const {id}=useParams(), nav=useNavigate();
  const [c,setC]=useState(null);
  const [err,setErr]=useState("");

  useEffect(()=>{
    api.engineerCustomer(id).then(setC).catch(e=>setErr(e.message));
  },[id]);

  if(err) return <section className="page"><div className="alert error">{err}</div></section>;
  if(!c)  return <section className="page"><div className="loading">Loading…</div></section>;

  const allAmcs=(c.lifts||[]).flatMap(l=>(l.amcContracts||[]).map(a=>({...a,liftBrand:l.brand,serialNumber:l.serialNumber,liftId:l.id})));

  return <section className="page">
    <div className="page-head">
      <div>
        <button className="back" onClick={()=>nav("/engineer/customers")}><ArrowLeft size={16}/> Customers</button>
        <span className="eyebrow">CUSTOMER</span>
        <h1>{c.customerName}</h1>
        <p className="muted">{c.customerCode||"No code"} · {c.mobileNumber}</p>
      </div>
      <div className="head-actions">
        {allAmcs.length>0&&<Link className="primary" to={`/engineer/report/new?customerId=${id}&customerName=${encodeURIComponent(c.customerName)}`}>
          <ClipboardList size={16}/> New Service Report
        </Link>}
      </div>
    </div>

    <div className="detail-grid">
      <div className="panel">
        <h2>Contact &amp; Address</h2>
        <dl>
          <dt>Mobile</dt><dd>{c.mobileNumber||"—"}</dd>
          <dt>Address</dt><dd>{c.address||"—"}</dd>
          <dt>City</dt><dd>{c.city||"—"}</dd>
          <dt>State</dt><dd>{c.state||"—"}</dd>
        </dl>
      </div>
      <div className="panel">
        <h2>Overview</h2>
        <div className="mini-stats">
          <div><strong>{c.lifts?.length||0}</strong><span>Lifts</span></div>
          <div><strong>{allAmcs.length}</strong><span>AMC Contracts</span></div>
          <div><strong>{allAmcs.filter(a=>a.status==="ACTIVE").length}</strong><span>Active</span></div>
        </div>
      </div>
    </div>

    <div className="panel">
      <h2>Lifts &amp; AMC Contracts</h2>
      {(c.lifts||[]).map((l,i)=><div className="detail-lift" key={l.id||i}>
        <div className="lift-title">
          <div>
            <b>Lift {i+1} · {l.brand||"Unknown brand"}</b>
            <span>{l.liftType||"—"} · {l.driveType||"—"} · {l.numberOfFloors||"—"} floors · S/N: {l.serialNumber||"—"}</span>
          </div>
          <span className="badge">{l.serialNumber||"No serial"}</span>
        </div>
        {(l.amcContracts||[]).map(a=><div className="amc" key={a.id||a.contractNumber}>
          <div>
            <b>{a.contractNumber||"AMC Contract"}</b>
            <span>{a.contractType||"—"} · {a.startDate||"—"} → {a.endDate||"—"} · Next service: {a.nextServiceDate||"—"}</span>
          </div>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            <span className={`status ${String(a.status).toLowerCase()}`}>{a.status}</span>
            <Link className="secondary small" to={`/engineer/report/new?customerId=${id}&amcContractId=${a.id}&customerName=${encodeURIComponent(c.customerName)}`}>
              <ClipboardList size={13}/> Report
            </Link>
          </div>
        </div>)}
        {(!l.amcContracts||l.amcContracts.length===0)&&<div className="empty-box">No AMC contracts for this lift.</div>}
      </div>)}
      {(!c.lifts||c.lifts.length===0)&&<div className="empty-box">No lift details recorded.</div>}
    </div>
  </section>;
}
