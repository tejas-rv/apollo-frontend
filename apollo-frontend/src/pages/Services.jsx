import React,{useEffect,useState} from "react";
import {Link} from "react-router-dom";
import {Search,RefreshCw,CalendarClock,History,AlertTriangle,CalendarCheck,CheckCircle2,XCircle,Repeat} from "lucide-react";
import {api} from "../services/api";
import {isoToday} from "../utils/amc";

const dmy=iso=>iso?iso.split("-").reverse().join("/"):"—";
const dmyTime=ts=>{if(!ts)return "—";const [d,t]=ts.split("T");return `${dmy(d)} ${(t||"").slice(0,5)}`;};
const RAISED_LABEL={CUSTOMER:"Customer",ADMIN:"Admin"};
const TABS=[
  ["all","All",null,{}],
  ["scheduled","Scheduled","scheduled",{status:"SCHEDULED"}],
  ["overdue","Overdue","overdue",{overdueOnly:true}],
  ["completed","Completed","completed",{status:"COMPLETED"}],
  ["cancelled","Cancelled","cancelled",{status:"CANCELLED"}],
  ["rescheduled","Rescheduled","rescheduled",{rescheduledOnly:true}],
];
const isOverdue=v=>v.status==="SCHEDULED"&&v.serviceDate&&v.serviceDate<isoToday();

export default function Services(){
  const [tab,setTab]=useState("all");
  const [query,setQuery]=useState("");
  const [debounced,setDebounced]=useState("");
  const [from,setFrom]=useState("");
  const [to,setTo]=useState("");
  const [page,setPage]=useState(0);
  const [data,setData]=useState(null);
  const [summary,setSummary]=useState(null);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState("");
  const [notice,setNotice]=useState("");
  const [engineers,setEngineers]=useState([]);
  const [rescheduleVisit,setRescheduleVisit]=useState(null);
  const [historyVisit,setHistoryVisit]=useState(null);

  useEffect(()=>{const t=setTimeout(()=>setDebounced(query.trim()),300);return()=>clearTimeout(t);},[query]);
  useEffect(()=>{setPage(0);},[tab,debounced,from,to]);
  useEffect(()=>{
    api.listUsers("ENGINEER").then(list=>setEngineers((list||[]).filter(u=>u.enabled!==false))).catch(()=>setEngineers([]));
  },[]);

  async function load(){
    setLoading(true);setError("");
    try{
      const filter=TABS.find(t=>t[0]===tab)[3];
      const [list,counts]=await Promise.all([
        api.serviceVisits({...filter,query:debounced,from,to,page,size:20}),
        api.serviceVisitSummary(),
      ]);
      setData(list);setSummary(counts);
    }catch(e){setError(e.message);}
    finally{setLoading(false);}
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(()=>{load();},[tab,debounced,from,to,page]);

  function onRescheduled(row,wasFollowUp){
    setRescheduleVisit(null);
    setNotice(wasFollowUp
      ?`Re-service visit #${row.id} scheduled on ${dmy(row.serviceDate)}${row.engineerName?` for ${row.engineerName}`:""}.`
      :`Visit #${row.id} moved to ${dmy(row.serviceDate)}${row.engineerName?` (${row.engineerName})`:""}.`);
    load();
  }

  const visits=data?.content||[];
  return <section className="page">
    <div className="page-head">
      <div><span className="eyebrow">SERVICES</span><h1>Service visits</h1>
        <p className="muted">AMC service visits across all customers. If a service was not done properly (issue raised by the customer or an admin), reschedule it here.</p></div>
    </div>
    {error&&<div className="alert error">{error}</div>}
    {notice&&<div className="alert success"><CheckCircle2 size={14}/> {notice}</div>}

    <div className="stats four" style={{gridTemplateColumns:"repeat(5,1fr)"}}>
      <Stat icon={<CalendarClock size={18}/>} label="Scheduled" value={summary?.scheduled}/>
      <Stat icon={<AlertTriangle size={18}/>} label="Overdue" value={summary?.overdue}/>
      <Stat icon={<CalendarCheck size={18}/>} label="Completed" value={summary?.completed}/>
      <Stat icon={<XCircle size={18}/>} label="Cancelled" value={summary?.cancelled}/>
      <Stat icon={<Repeat size={18}/>} label="Rescheduled" value={summary?.rescheduled}/>
    </div>

    <div className="tabs">
      {TABS.map(([key,label,countKey])=><button key={key} className={tab===key?"selected":""} onClick={()=>setTab(key)}>
        {label}{countKey&&summary?` (${summary[countKey]??0})`:""}
      </button>)}
    </div>

    <div className="panel">
      <div className="bill-filters">
        <div className="search" style={{flex:2,minWidth:240}}>
          <Search size={16}/>
          <input placeholder="Customer, code, contract no., lift serial, engineer…" value={query} onChange={e=>setQuery(e.target.value)}/>
        </div>
        <label className="muted" style={{display:"flex",alignItems:"center",gap:6}}>From
          <input className="bill-input" type="date" value={from} max={to||undefined} onChange={e=>setFrom(e.target.value)}/></label>
        <label className="muted" style={{display:"flex",alignItems:"center",gap:6}}>To
          <input className="bill-input" type="date" value={to} min={from||undefined} onChange={e=>setTo(e.target.value)}/></label>
        {(from||to||query)&&<button className="secondary small" onClick={()=>{setFrom("");setTo("");setQuery("");}}>Clear</button>}
        <button className="secondary small" title="Refresh" onClick={load}><RefreshCw size={14}/></button>
      </div>

      <div className="table-wrap">
        <table>
          <thead><tr><th>Visit date</th><th>Customer</th><th>Contract / lift</th><th>Engineer</th><th>Work</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {loading&&!visits.length&&<tr><td colSpan={7} className="loading">Loading…</td></tr>}
            {!loading&&!visits.length&&<tr><td colSpan={7} className="empty">No service visits found.</td></tr>}
            {visits.map(v=>{
              const overdue=isOverdue(v);
              const canReschedule=v.contractStatus!=="CANCELLED";
              return <tr key={v.id}>
                <td><b>{dmy(v.serviceDate)}</b><small>Visit #{v.id}</small></td>
                <td><Link className="table-link" to={`/app/customers/${v.customerId}`}><b>{v.customerName}</b></Link>
                  <small>{[v.customerCode,v.city].filter(Boolean).join(" · ")||"—"}</small></td>
                <td><b>{v.contractNumber||`Contract #${v.amcContractId}`}</b>
                  <small>Lift {v.liftSerialNumber||`#${v.liftId}`}{v.liftBrand?` · ${v.liftBrand}`:""}{v.contractStatus?` · AMC ${v.contractStatus}`:""}</small></td>
                <td>{v.engineerName||<span className="muted">Unassigned</span>}</td>
                <td style={{maxWidth:280}}>
                  <span>{v.workDone||<span className="muted">—</span>}</span>
                  {v.rescheduledFromVisitId&&<small>Re-service of visit #{v.rescheduledFromVisitId}</small>}
                  {v.followUpVisitId&&<small>Follow-up: visit #{v.followUpVisitId}</small>}
                  {v.lastReason&&<small title={v.lastReason}>Issue ({RAISED_LABEL[v.lastRaisedBy]||v.lastRaisedBy}): {v.lastReason}</small>}
                </td>
                <td>
                  <span className={`status ${overdue?"cancelled":v.status.toLowerCase()}`}>{overdue?"OVERDUE":v.status}</span>
                  {v.rescheduleCount>0&&<small>Rescheduled {v.rescheduleCount}×</small>}
                </td>
                <td>
                  <div className="bill-row-actions">
                    {canReschedule&&<button className="secondary small" title="Reschedule" onClick={()=>{setNotice("");setRescheduleVisit(v);}}><CalendarClock size={14}/> Reschedule</button>}
                    {(v.rescheduleCount>0||v.rescheduledFromVisitId)&&<button className="secondary small" title="Reschedule history" onClick={()=>setHistoryVisit(v)}><History size={14}/></button>}
                  </div>
                </td>
              </tr>;
            })}
          </tbody>
        </table>
      </div>
      {data&&data.totalPages>1&&<div className="pagination">
        <button disabled={page===0} onClick={()=>setPage(p=>p-1)}>Previous</button>
        <span>Page {page+1} of {data.totalPages} · {data.totalElements} visits</span>
        <button disabled={page+1>=data.totalPages} onClick={()=>setPage(p=>p+1)}>Next</button>
      </div>}
    </div>

    {rescheduleVisit&&<RescheduleModal visit={rescheduleVisit} engineers={engineers}
      onClose={()=>setRescheduleVisit(null)} onDone={onRescheduled}/>}
    {historyVisit&&<HistoryModal visit={historyVisit} onClose={()=>setHistoryVisit(null)}/>}
  </section>;
}

function Stat({icon,label,value}){
  return <div className="stat"><div className="stat-icon">{icon}</div><div><span>{label}</span><strong>{value??"—"}</strong></div></div>;
}

function RescheduleModal({visit,engineers,onClose,onDone}){
  const followUp=visit.status!=="SCHEDULED";
  const [form,setForm]=useState({
    raisedBy:"CUSTOMER",reason:"",
    newDate:followUp||!visit.serviceDate||visit.serviceDate<isoToday()?isoToday():visit.serviceDate,
    assignedEngineerId:visit.assignedEngineerId?String(visit.assignedEngineerId):"",
    workDone:"",
  });
  const [error,setError]=useState("");
  const [saving,setSaving]=useState(false);
  const set=(k,v)=>setForm(f=>({...f,[k]:v}));
  const knownEngineer=!form.assignedEngineerId||engineers.some(e=>String(e.id)===form.assignedEngineerId);

  async function submit(e){
    e.preventDefault();
    if(!form.reason.trim()){setError("Describe the issue / reason for rescheduling.");return;}
    if(!form.newDate){setError("Choose the new service date.");return;}
    if(form.newDate<isoToday()){setError("The new date cannot be in the past.");return;}
    setError("");setSaving(true);
    try{
      const row=await api.rescheduleVisit(visit.id,{
        newDate:form.newDate,raisedBy:form.raisedBy,reason:form.reason.trim(),
        assignedEngineerId:form.assignedEngineerId?Number(form.assignedEngineerId):null,
        workDone:followUp&&form.workDone.trim()?form.workDone.trim():null,
      });
      onDone(row,followUp);
    }catch(err){setError(err.message);}
    finally{setSaving(false);}
  }

  return <div className="modal-backdrop" onClick={()=>!saving&&onClose()}>
    <div className="panel modal-card" onClick={e=>e.stopPropagation()}>
      <div className="panel-head"><div>
        <h2>Reschedule visit #{visit.id}</h2>
        <p className="muted">{visit.customerName} · {visit.contractNumber||`Contract #${visit.amcContractId}`} · {visit.status} on {dmy(visit.serviceDate)}</p>
      </div></div>
      <div className="alert" style={{background:"#f4f8fd",color:"#344154"}}>
        {followUp
          ?<>This visit is <b>{visit.status}</b>. A new <b>re-service visit</b> will be scheduled on the chosen date; the original visit is kept for the record.</>
          :<>This visit is still <b>SCHEDULED</b>. It will be moved to the new date (and engineer, if changed).</>}
      </div>
      {error&&<div className="alert error">{error}</div>}
      <form className="form" onSubmit={submit}>
        <div>
          <span className="muted" style={{fontWeight:600,fontSize:12}}>Issue raised by *</span>
          <div className="segmented" style={{marginTop:7,marginBottom:0}}>
            {Object.entries(RAISED_LABEL).map(([k,l])=><button type="button" key={k} className={form.raisedBy===k?"selected":""} onClick={()=>set("raisedBy",k)}>{l}</button>)}
          </div>
        </div>
        <label>Issue / reason *<textarea rows={3} maxLength={500} placeholder="e.g. Lift still making noise after service" value={form.reason} onChange={e=>set("reason",e.target.value)}/></label>
        <div className="form-grid">
          <label>New service date *<input type="date" min={isoToday()} value={form.newDate} onChange={e=>set("newDate",e.target.value)}/></label>
          <label>Engineer
            <select value={form.assignedEngineerId} onChange={e=>set("assignedEngineerId",e.target.value)}>
              <option value="">{visit.engineerName?`Keep current (${visit.engineerName})`:"Unassigned"}</option>
              {!knownEngineer&&<option value={form.assignedEngineerId}>{visit.engineerName||`Engineer #${form.assignedEngineerId}`}</option>}
              {engineers.map(e=><option key={e.id} value={String(e.id)}>{e.fullName||e.username}</option>)}
            </select>
          </label>
        </div>
        {followUp&&<label>Work to be done<input maxLength={500} placeholder={`Re-service: ${form.reason.trim()||"reason"}`} value={form.workDone} onChange={e=>set("workDone",e.target.value)}/></label>}
        <div className="form-actions">
          <button type="button" className="secondary" disabled={saving} onClick={onClose}>Cancel</button>
          <button className="primary" disabled={saving}><CalendarClock size={15}/> {saving?"Saving…":followUp?"Schedule re-service":"Reschedule visit"}</button>
        </div>
      </form>
    </div>
  </div>;
}

function HistoryModal({visit,onClose}){
  const [items,setItems]=useState(null);
  const [error,setError]=useState("");
  useEffect(()=>{api.serviceVisitHistory(visit.id).then(setItems).catch(e=>setError(e.message));},[visit.id]);

  return <div className="modal-backdrop" onClick={onClose}>
    <div className="panel modal-card modal-wide" onClick={e=>e.stopPropagation()}>
      <div className="panel-head"><div>
        <h2>Reschedule history · visit #{visit.id}</h2>
        <p className="muted">{visit.customerName} · {visit.contractNumber||`Contract #${visit.amcContractId}`}</p>
      </div><button className="icon-btn" onClick={onClose}>Close</button></div>
      {error&&<div className="alert error">{error}</div>}
      {!items&&!error&&<div className="loading">Loading…</div>}
      {items&&!items.length&&<div className="empty">No reschedules recorded.</div>}
      {items&&items.length>0&&<div className="table-wrap"><table>
        <thead><tr><th>When</th><th>Raised by</th><th>Reason</th><th>Change</th><th>Engineer</th><th>By</th></tr></thead>
        <tbody>{items.map(h=><tr key={h.id}>
          <td>{dmyTime(h.createdAt)}</td>
          <td>{RAISED_LABEL[h.raisedBy]||h.raisedBy}</td>
          <td style={{maxWidth:260}}>{h.reason}</td>
          <td><b>{dmy(h.previousDate)} → {dmy(h.newDate)}</b>
            <small>{h.followUpCreated?`Re-service visit #${h.newServiceVisitId} (was ${h.previousStatus})`:"Moved"}</small></td>
          <td>{h.previousEngineerName===h.newEngineerName?(h.newEngineerName||"—"):`${h.previousEngineerName||"—"} → ${h.newEngineerName||"—"}`}</td>
          <td>{h.rescheduledBy||"—"}</td>
        </tr>)}</tbody>
      </table></div>}
    </div>
  </div>;
}
