import React,{useEffect,useMemo,useState} from "react";
import {AlertTriangle,CheckCircle2,MapPin,RefreshCw,Save,Upload,Users,Wrench} from "lucide-react";
import {api} from "../services/api";
import {isoToday} from "../utils/amc";

const TABS=[
  ["dashboard","Overview"],
  ["planner","Daily planner"],
  ["allocation","Allocate visits"],
  ["zones","Service zones"],
  ["pincodes","PIN-code master"],
  ["engineers","Engineers"],
];
const emptyZone={zoneId:"",zoneName:"",description:"",active:true};
const emptyPincode={pincode:"",locality:"",district:"",state:"Karnataka",postalDivision:"",zoneId:"",active:true,effectiveFrom:isoToday(),effectiveTo:"",source:"Supervisor entry",verificationStatus:"UNVERIFIED"};
const dateLabel=value=>value?new Date(`${value}T00:00:00`).toLocaleDateString("en-IN"):"—";

export default function Serviceability(){
  const [tab,setTab]=useState("dashboard");
  const [date,setDate]=useState(isoToday());
  const [dashboard,setDashboard]=useState(null);
  const [zones,setZones]=useState([]);
  const [engineers,setEngineers]=useState([]);
  const [zoneAssignments,setZoneAssignments]=useState([]);
  const [plan,setPlan]=useState(null);
  const [scheduled,setScheduled]=useState([]);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState("");
  const [notice,setNotice]=useState("");

  async function loadShared(){
    const [zoneRows,engineerRows,assignmentRows]=await Promise.all([
      api.serviceabilityZones(),api.serviceabilityEngineers(),api.serviceabilityEngineerZoneAssignments(),
    ]);
    setZones(zoneRows||[]);
    setEngineers(engineerRows||[]);
    setZoneAssignments(assignmentRows||[]);
  }
  async function load(){
    setLoading(true);setError("");
    try{
      await loadShared();
      if(tab==="dashboard")setDashboard(await api.serviceabilityDashboard());
      if(tab==="planner")setPlan(await api.serviceabilityPlan(date));
      if(tab==="allocation"){
        const page=await api.serviceVisits({status:"SCHEDULED",page:0,size:100});
        setScheduled((page?.content||[]).filter(visit=>!visit.assignedEngineerId));
      }
    }catch(e){setError(e.message||"Unable to load serviceability data.");}
    finally{setLoading(false);}
  }
  useEffect(()=>{load();},[tab,date]);

  async function mutate(action,message){
    setError("");setNotice("");
    try{await action();await load();setNotice(message);return true;}
    catch(e){setError(e.message||"The operation could not be completed.");return false;}
  }
  const currentLabel=TABS.find(item=>item[0]===tab)?.[1];
  return <section className="page serviceability-page">
    <div className="page-head">
      <div><span className="eyebrow">FIELD OPERATIONS</span><h1>Serviceability</h1>
        <p className="muted">Manage service zones, verified PIN-code coverage, engineer capacity and daily visit allocation.</p></div>
      <button className="secondary small" title="Reload serviceability data" onClick={load} disabled={loading}><RefreshCw size={14} className={loading?"spin":""}/> Refresh</button>
    </div>
    {error&&<div className="alert error">{error}</div>}
    {notice&&<div className="alert success"><CheckCircle2 size={15}/> {notice}</div>}
    <div className="tabs serviceability-tabs">{TABS.map(([key,label])=><button key={key} title={`Open ${label.toLowerCase()}`} className={tab===key?"selected":""} onClick={()=>{setNotice("");setTab(key);}}>{label}</button>)}</div>
    {loading&&!dashboard&&!plan&&!scheduled.length&&<div className="panel loading">Loading {currentLabel?.toLowerCase()}…</div>}
    {tab==="dashboard"&&<DashboardView data={dashboard} onPlanner={()=>setTab("planner")} onAllocate={()=>setTab("allocation")}/>}
    {tab==="zones"&&<ZonesView zones={zones} onSave={(body,id)=>mutate(()=>api.saveServiceabilityZone(id,body),id?"Zone updated.":"Zone created.")}/>}
    {tab==="pincodes"&&<PincodesView zones={zones} onSave={(body,id)=>mutate(()=>api.saveServiceabilityPincode(id,body),id?"PIN-code mapping updated.":"PIN-code mapping created.")} onImport={()=>{setNotice("");loadShared();}} onError={setError}/>}
    {tab==="engineers"&&<EngineersView engineers={engineers} zones={zones} assignments={zoneAssignments} onChanged={()=>mutate(loadShared,"Engineer settings saved.")}/>}
    {tab==="planner"&&<PlannerView date={date} setDate={setDate} plan={plan} engineers={engineers} zones={zones} onChanged={()=>mutate(async()=>{await loadShared();setPlan(await api.serviceabilityPlan(date));},"Daily plan updated.")}/>}
    {tab==="allocation"&&<AllocationView date={date} setDate={setDate} visits={scheduled} onChanged={()=>mutate(async()=>{const page=await api.serviceVisits({status:"SCHEDULED",page:0,size:100});setScheduled((page?.content||[]).filter(v=>!v.assignedEngineerId));},"Service allocation confirmed.")}/>}
  </section>;
}

function DashboardView({data,onPlanner,onAllocate}){
  if(!data)return <div className="panel empty">Serviceability dashboard is not available yet.</div>;
  const stats=[
    ["Scheduled",data.totalScheduled],["Overdue",data.overdue],["Due today",data.dueToday],
    ["Due within 3 days",data.dueWithinThreeDays],["Unassigned",data.unassigned],["Active engineers",data.activeEngineers],
  ];
  return <>
    <div className="stats serviceability-stats">{stats.map(([label,value])=><div className="stat" key={label}>
      <div className="stat-icon"><Wrench size={18}/></div><div><span>{label}</span><strong>{value??0}</strong></div>
    </div>)}</div>
    <div className="serviceability-actions">
      <button className="primary" title="View and manage visits on the daily engineer plan" onClick={onPlanner}><MapPin size={15}/> Open daily planner</button>
      <button className="secondary" title="Preview and confirm automatic visit assignments" onClick={onAllocate}><Users size={15}/> Review allocations</button>
    </div>
    <div className="serviceability-grid">
      <div className="panel"><div className="panel-head"><div><h2>Zone workload</h2><p className="muted">Scheduled through today, including overdue visits.</p></div></div>
        <DataTable empty="No zone workload is available.">
          <thead><tr><th>Zone</th><th>Total</th><th>Overdue</th><th>Unassigned</th></tr></thead>
          <tbody>{(data.zones||[]).map(zone=><tr key={zone.zoneId}><td><b>{zone.zoneName}</b><small>{zone.zoneId}</small></td><td>{zone.total}</td><td>{zone.overdue}</td><td>{zone.unassigned}</td></tr>)}</tbody>
        </DataTable>
      </div>
      <div className="panel"><div className="panel-head"><div><h2>Engineer workload</h2><p className="muted">Open visits due through today, including overdue services, against daily capacity.</p></div></div>
        <DataTable empty="No engineer workload is available.">
          <thead><tr><th>Engineer</th><th>Zone</th><th>Open visits / capacity</th><th>Overdue</th></tr></thead>
          <tbody>{(data.engineers||[]).map(engineer=><tr key={engineer.engineerId}><td><b>{engineer.engineerName}</b><small>{engineer.available?"Available":"Unavailable"}</small></td><td>{engineer.zoneId||"—"}</td><td>{engineer.scheduled} / {engineer.dailyCapacity}</td><td>{engineer.overdue}</td></tr>)}</tbody>
        </DataTable>
      </div>
    </div>
  </>;
}

function ZonesView({zones,onSave}){
  const [form,setForm]=useState(emptyZone);
  const [editing,setEditing]=useState(false);
  const [saving,setSaving]=useState(false);
  const set=(key,value)=>setForm(current=>({...current,[key]:value}));
  async function submit(event){
    event.preventDefault();setSaving(true);
    try{if(await onSave({...form,zoneId:form.zoneId.trim(),zoneName:form.zoneName.trim()},editing?form.zoneId:null)){setForm(emptyZone);setEditing(false);}}
    finally{setSaving(false);}
  }
  return <div className="serviceability-grid">
    <div className="panel"><div className="panel-head"><div><h2>{editing?"Edit service zone":"Create service zone"}</h2><p className="muted">Zone definitions are configurable and independent of postal divisions.</p></div></div>
      <form className="form" onSubmit={submit}>
        <div className="form-grid"><label>Zone ID *<input required maxLength={30} pattern="[A-Z0-9-]{2,30}" disabled={editing} value={form.zoneId} onChange={e=>set("zoneId",e.target.value.toUpperCase())}/></label>
          <label>Zone name *<input required maxLength={100} value={form.zoneName} onChange={e=>set("zoneName",e.target.value)}/></label></div>
        <label>Description<textarea rows={2} maxLength={500} value={form.description} onChange={e=>set("description",e.target.value)}/></label>
        <label className="serviceability-check"><input type="checkbox" checked={form.active} onChange={e=>set("active",e.target.checked)}/> Active</label>
        <div className="form-actions">{editing&&<button type="button" className="secondary" title="Discard zone changes" onClick={()=>{setForm(emptyZone);setEditing(false);}}>Cancel</button>}<button className="primary" title={editing?"Save changes to this service zone":"Create this service zone"} disabled={saving}>{saving?"Saving…":editing?"Save zone":"Create zone"}</button></div>
      </form>
    </div>
    <div className="panel"><div className="panel-head"><div><h2>Configured zones</h2><p className="muted">Visit counts include scheduled, not completed services due through today, including overdue visits.</p></div></div>
      <DataTable empty="No service zones configured.">
        <thead><tr><th>Zone</th><th>Engineers</th><th>Assigned / open visits</th><th>Status</th><th></th></tr></thead>
        <tbody>{zones.map(zone=><tr key={zone.zoneId}><td><b>{zone.zoneName}</b><small>{zone.zoneId}</small></td><td>{zone.primaryEngineerCount} primary · {zone.backupEngineerCount} backup</td><td title="Assigned visits / all scheduled, not completed visits due through today">{zone.assignedServices} assigned · {zone.pendingServices} open</td><td><span className={`status ${zone.active?"active":"cancelled"}`}>{zone.active?"ACTIVE":"INACTIVE"}</span></td><td><button className="secondary small" title={`Edit ${zone.zoneName}`} onClick={()=>{setForm({zoneId:zone.zoneId,zoneName:zone.zoneName,description:zone.description||"",active:zone.active});setEditing(true);}}>Edit</button></td></tr>)}</tbody>
      </DataTable>
    </div>
  </div>;
}

function PincodesView({zones,onSave,onImport,onError}){
  const [rows,setRows]=useState([]);
  const [page,setPage]=useState(0);
  const [filters,setFilters]=useState({pincode:"",locality:"",district:"",zoneId:"",verificationStatus:""});
  const [form,setForm]=useState(null);
  const [file,setFile]=useState(null);
  const [result,setResult]=useState(null);
  const [busy,setBusy]=useState(false);
  async function search(nextPage=0){
    setBusy(true);onError("");
    try{const response=await api.serviceabilityPincodes({...filters,page:nextPage,size:20,sort:"pincode"});setRows(response?.content||[]);setPage(nextPage);setResult(current=>({...current,pageInfo:response}));}
    catch(e){onError(e.message);}
    finally{setBusy(false);}
  }
  useEffect(()=>{search(0);},[]);
  async function submit(event){
    event.preventDefault();setBusy(true);
    try{if(await onSave({...form,effectiveTo:form.effectiveTo||null,zoneId:form.zoneId||null},form.id)){setForm(null);await search(page);}}
    catch(e){onError(e.message);}
    finally{setBusy(false);}
  }
  async function importFile(){
    if(!file)return;
    setBusy(true);onError("");setResult(null);
    try{setResult(await api.importServiceabilityPincodes(file));setFile(null);onImport();await search(0);}
    catch(e){onError(e.message);}
    finally{setBusy(false);}
  }
  return <>
    <div className="panel">
      <div className="panel-head"><div><h2>PIN-code serviceability master</h2><p className="muted">Imported postal information remains unverified until reviewed; no locality or postal division is inferred.</p></div><button className="primary small" title="Create a PIN-code to service-zone mapping" onClick={()=>setForm({...emptyPincode})}>Add mapping</button></div>
      <div className="serviceability-filters">
        <input aria-label="PIN code" placeholder="PIN code" maxLength={6} value={filters.pincode} onChange={e=>setFilters({...filters,pincode:e.target.value})}/>
        <input aria-label="Locality" placeholder="Locality" value={filters.locality} onChange={e=>setFilters({...filters,locality:e.target.value})}/>
        <input aria-label="District" placeholder="District" value={filters.district} onChange={e=>setFilters({...filters,district:e.target.value})}/>
        <select aria-label="Zone" value={filters.zoneId} onChange={e=>setFilters({...filters,zoneId:e.target.value})}><option value="">All zones</option>{zones.map(zone=><option key={zone.zoneId} value={zone.zoneId}>{zone.zoneName}</option>)}</select>
        <select aria-label="Verification" value={filters.verificationStatus} onChange={e=>setFilters({...filters,verificationStatus:e.target.value})}><option value="">All verification states</option>{["UNVERIFIED","VERIFIED","AMBIGUOUS","REJECTED"].map(value=><option key={value}>{value}</option>)}</select>
        <button className="secondary small" title="Search PIN-code mappings using the selected filters" onClick={()=>search(0)} disabled={busy}>Search</button>
      </div>
      <DataTable empty={busy?"Loading…":"No PIN-code mappings found."}>
        <thead><tr><th>PIN / locality</th><th>District / division</th><th>Apollo zone</th><th>Effective</th><th>Verification</th><th></th></tr></thead>
        <tbody>{rows.map(row=><tr key={row.id}><td><b>{row.pincode}</b><small>{row.locality}</small></td><td>{row.district||"—"}<small>{row.postalDivision||"Postal division unverified"}</small></td><td>{row.zoneName||"Unmapped"}</td><td>{dateLabel(row.effectiveFrom)}{row.effectiveTo?` – ${dateLabel(row.effectiveTo)}`:" onward"}</td><td><span className={`status ${row.verificationStatus==="VERIFIED"?"active":"pending"}`}>{row.verificationStatus}</span></td><td><button className="secondary small" title={`Edit PIN-code mapping for ${row.pincode}`} onClick={()=>setForm({...row})}>Edit</button></td></tr>)}</tbody>
      </DataTable>
      {result?.pageInfo?.totalPages>1&&<div className="pagination"><button title="Show the previous page of PIN-code mappings" disabled={page===0} onClick={()=>search(page-1)}>Previous</button><span>Page {page+1} of {result.pageInfo.totalPages}</span><button title="Show the next page of PIN-code mappings" disabled={page+1>=result.pageInfo.totalPages} onClick={()=>search(page+1)}>Next</button></div>}
    </div>
    <div className="panel"><div className="panel-head"><div><h2>Bulk import</h2><p className="muted">CSV or Excel columns: pincode, locality, source; optional district, state, postalDivision, zoneId.</p></div></div>
      <div className="serviceability-filters"><input type="file" accept=".csv,.xls,.xlsx" onChange={e=>setFile(e.target.files?.[0]||null)}/><button className="secondary" title="Import the selected CSV or Excel file as unverified PIN-code mappings" disabled={!file||busy} onClick={importFile}><Upload size={15}/> {busy?"Importing…":"Import as unverified"}</button></div>
      {result?.errors&&<div className="alert error">Imported {result.imported}; rejected {result.rejected}. {result.errors.map(e=>`Row ${e.row}: ${e.message}`).join(" · ")}</div>}
      {result&&!result.errors&&<div className="alert success">Imported {result.imported}; rejected {result.rejected}.</div>}
    </div>
    {form&&<div className="modal-backdrop" onClick={()=>setForm(null)}><div className="panel modal-card" onClick={e=>e.stopPropagation()}>
      <div className="panel-head"><div><h2>{form.id?"Edit":"Add"} PIN-code mapping</h2><p className="muted">Source is mandatory; supervisors must confirm postal and Apollo zone data.</p></div><button className="icon-btn" title="Close without saving" onClick={()=>setForm(null)}>Close</button></div>
      <form className="form" onSubmit={submit}>
        <div className="form-grid"><label>PIN code *<input required pattern="[0-9]{6}" maxLength={6} value={form.pincode} onChange={e=>setForm({...form,pincode:e.target.value})}/></label><label>Locality / post office *<input required maxLength={120} value={form.locality} onChange={e=>setForm({...form,locality:e.target.value})}/></label>
          <label>District<input maxLength={100} value={form.district||""} onChange={e=>setForm({...form,district:e.target.value})}/></label><label>State<input maxLength={100} value={form.state||""} onChange={e=>setForm({...form,state:e.target.value})}/></label>
          <label>India Post division<input maxLength={120} value={form.postalDivision||""} onChange={e=>setForm({...form,postalDivision:e.target.value})}/></label><label>Apollo zone<select value={form.zoneId||""} onChange={e=>setForm({...form,zoneId:e.target.value})}><option value="">Unmapped</option>{zones.map(zone=><option key={zone.zoneId} value={zone.zoneId}>{zone.zoneName}</option>)}</select></label>
          <label>Effective from<input type="date" required value={form.effectiveFrom||isoToday()} onChange={e=>setForm({...form,effectiveFrom:e.target.value})}/></label><label>Effective to<input type="date" value={form.effectiveTo||""} onChange={e=>setForm({...form,effectiveTo:e.target.value})}/></label>
          <label>Source *<input required maxLength={200} placeholder="India Post source/reference" value={form.source||""} onChange={e=>setForm({...form,source:e.target.value})}/></label><label>Verification<select value={form.verificationStatus||"UNVERIFIED"} onChange={e=>setForm({...form,verificationStatus:e.target.value})}>{["UNVERIFIED","VERIFIED","AMBIGUOUS","REJECTED"].map(value=><option key={value}>{value}</option>)}</select></label></div>
        <label className="serviceability-check"><input type="checkbox" checked={form.active!==false} onChange={e=>setForm({...form,active:e.target.checked})}/> Active mapping</label>
        <div className="form-actions"><button type="button" className="secondary" title="Discard PIN-code mapping changes" onClick={()=>setForm(null)}>Cancel</button><button className="primary" title="Save this PIN-code mapping" disabled={busy}>{busy?"Saving…":"Save mapping"}</button></div>
      </form>
    </div></div>}
  </>;
}

function EngineersView({engineers,zones,assignments,onChanged}){
  const emptyAssignment={engineerId:"",zoneId:"",assignmentType:"PRIMARY",effectiveFrom:isoToday(),effectiveTo:"",active:true};
  const [form,setForm]=useState(emptyAssignment);
  const [capacity,setCapacity]=useState(5);
  const [available,setAvailable]=useState(true);
  const [saving,setSaving]=useState(false);
  async function saveZone(event){
    event.preventDefault();if(!form.engineerId||!form.zoneId)return;
    setSaving(true);
    try{
      const body={...form,engineerId:Number(form.engineerId),effectiveTo:form.effectiveTo||null,dailyCapacity:Number(capacity),available};
      if(form.id)await api.updateEngineerZoneAssignment(form.id,body);
      else await api.createEngineerZoneAssignment(body);
      setForm(emptyAssignment);await onChanged();
    }
    finally{setSaving(false);}
  }
  async function updateEngineer(id,body){
    setSaving(true);
    try{await api.updateEngineerServiceability(id,body);await onChanged();}
    finally{setSaving(false);}
  }
  return <>
    <div className="panel"><div className="panel-head"><div><h2>Engineer zone assignments</h2><p className="muted">Each engineer can have one active primary zone; add backup zones for overflow.</p></div></div>
      <form className="serviceability-filters" onSubmit={saveZone}>
        <select required value={form.engineerId} onChange={e=>setForm({...form,engineerId:e.target.value})}><option value="">Select engineer</option>{engineers.map(engineer=><option key={engineer.engineerId} value={engineer.engineerId}>{engineer.engineerName}</option>)}</select>
        <select required value={form.zoneId} onChange={e=>setForm({...form,zoneId:e.target.value})}><option value="">Select zone</option>{zones.map(zone=><option key={zone.zoneId} value={zone.zoneId}>{zone.zoneName}</option>)}</select>
        <select value={form.assignmentType} onChange={e=>setForm({...form,assignmentType:e.target.value})}><option value="PRIMARY">Primary</option><option value="BACKUP">Backup</option></select>
        <input type="number" min="1" max="50" value={capacity} aria-label="Daily capacity" onChange={e=>setCapacity(e.target.value)}/>
        <label className="serviceability-check"><input type="checkbox" checked={available} onChange={e=>setAvailable(e.target.checked)}/> Available</label>
        <label className="serviceability-check"><input type="checkbox" checked={form.active} onChange={e=>setForm({...form,active:e.target.checked})}/> Assignment active</label>
        <button className="primary small" title={form.id?"Save changes to this engineer's zone assignment":"Assign this engineer to a service zone"} disabled={saving||!zones.length||!engineers.length}>{saving?"Saving…":form.id?"Update zone assignment":"Add zone assignment"}</button>
        {form.id&&<button type="button" className="secondary small" title="Cancel editing and clear the assignment form" onClick={()=>{setForm(emptyAssignment);setCapacity(5);setAvailable(true);}}>Cancel edit</button>}
      </form>
    </div>
    <div className="panel"><div className="panel-head"><div><h2>Primary and backup zones</h2><p className="muted">Deactivate an assignment to preserve its history while changing coverage.</p></div></div>
      <DataTable empty="No engineer zone assignments configured.">
        <thead><tr><th>Engineer</th><th>Zone</th><th>Type</th><th>Effective</th><th>Status</th><th></th></tr></thead>
        <tbody>{assignments.map(item=><tr key={item.id}><td><b>{item.engineerName}</b></td><td>{item.zoneName}<small>{item.zoneId}</small></td><td>{item.assignmentType}</td><td>{dateLabel(item.effectiveFrom)}{item.effectiveTo?` – ${dateLabel(item.effectiveTo)}`:" onward"}</td><td>{item.active?"ACTIVE":"INACTIVE"}</td><td><button className="secondary small" title={`Edit ${item.engineerName}'s ${item.assignmentType.toLowerCase()} zone assignment`} onClick={()=>{setForm({id:item.id,engineerId:String(item.engineerId),zoneId:item.zoneId,assignmentType:item.assignmentType,effectiveFrom:item.effectiveFrom,effectiveTo:item.effectiveTo||"",active:item.active});setCapacity(item.dailyCapacity);setAvailable(item.available);}}>Edit</button></td></tr>)}</tbody>
      </DataTable>
    </div>
    <div className="panel"><div className="panel-head"><div><h2>Engineer capacity and workload</h2><p className="muted">Inactive accounts are retained for historical assignments.</p></div></div>
      <DataTable empty="No engineer accounts found.">
        <thead><tr><th>Engineer</th><th>Primary zones</th><th>Backup zones</th><th>Today</th><th>Capacity</th><th>Availability</th></tr></thead>
        <tbody>{engineers.map(engineer=><tr key={engineer.engineerId}><td><b>{engineer.engineerName}</b><small>{engineer.employeeNumber||`Engineer #${engineer.engineerId}`}{!engineer.accountEnabled?" · inactive account":""}</small></td><td>{engineer.primaryZones.join(", ")||"—"}</td><td>{engineer.backupZones.join(", ")||"—"}</td><td>{engineer.assignedToday} assigned · {engineer.completedToday} completed · {engineer.overdue} overdue</td><td><input aria-label={`Capacity for ${engineer.engineerName}`} type="number" min="1" max="50" defaultValue={engineer.dailyCapacity} onBlur={e=>{const value=Number(e.target.value);if(value!==engineer.dailyCapacity&&value>=1&&value<=50)updateEngineer(engineer.engineerId,{dailyCapacity:value,available:engineer.available});}}/></td><td><select value={String(engineer.available)} onChange={e=>updateEngineer(engineer.engineerId,{dailyCapacity:engineer.dailyCapacity,available:e.target.value==="true"})}><option value="true">Available</option><option value="false">Unavailable</option></select></td></tr>)}</tbody>
      </DataTable>
    </div>
  </>;
}

function PlannerView({date,setDate,plan,engineers,zones,onChanged}){
  const [targets,setTargets]=useState({});
  const [zoneOverrides,setZoneOverrides]=useState({});
  const [busy,setBusy]=useState(false);
  const plannedCounts=useMemo(()=>new Map(
    (plan?.engineers||[]).map(engineer=>[String(engineer.engineerId),engineer.scheduledCount])
  ),[plan]);
  const allVisits=useMemo(()=>[
    ...(plan?.engineers||[]).flatMap(engineer=>engineer.visits||[]),
    ...(plan?.unassigned||[]),
  ],[plan]);
  async function reassign(visit){
    const engineerId=targets[visit.serviceVisitId];
    if(!engineerId)return;
    const body={engineerId:Number(engineerId),scheduledDate:date,zoneId:zoneOverrides[visit.serviceVisitId]||visit.zoneId||null,remarks:"Supervisor daily plan reassignment"};
    setBusy(true);
    try{
      if(visit.assignmentId)await api.reassignServiceAssignment(visit.assignmentId,body);
      else await api.reassignServiceVisit(visit.serviceVisitId,body);
      await onChanged();
    }catch(e){window.alert(e.message);}
    finally{setBusy(false);}
  }
  async function assign(visit){
    const engineerId=targets[visit.serviceVisitId];
    const zoneId=zoneOverrides[visit.serviceVisitId]||visit.zoneId;
    if(!engineerId){window.alert("Select an engineer first.");return;}
    if(!zoneId){window.alert("This PIN code has no resolved Apollo zone. Select a zone override.");return;}
    setBusy(true);
    try{await api.manualServiceAssignment({serviceVisitId:visit.serviceVisitId,engineerId:Number(engineerId),zoneId,scheduledDate:date,remarks:visit.zoneId===zoneId?"Daily plan supervisor assignment":"Supervisor confirmed a service-zone override"});await onChanged();}
    catch(e){window.alert(e.message);}
    finally{setBusy(false);}
  }
  async function reorder(visits,index,direction){
    const next=index+direction;
    if(next<0||next>=visits.length)return;
    const reordered=[...visits];[reordered[index],reordered[next]]=[reordered[next],reordered[index]];
    setBusy(true);
    try{for(let i=0;i<reordered.length;i++)if(reordered[i].assignmentId)await api.updateServiceVisitSequence(reordered[i].assignmentId,i+1);await onChanged();}
    catch(e){window.alert(e.message);}
    finally{setBusy(false);}
  }
  if(!plan)return <div className="panel empty">Daily plan is not available.</div>;
  return <>
    <div className="panel"><div className="panel-head"><div><h2>Daily service plan</h2><p className="muted">Overdue and due visits are shown. No road-distance optimisation is configured.</p></div>
      <label className="serviceability-date">Plan date<input type="date" value={date} onChange={e=>setDate(e.target.value)}/></label></div>
      <div className="mini-stats"><div><strong>{plan.totalAssigned}</strong><span>Scheduled</span></div><div><strong>{plan.unassigned.length}</strong><span>Unassigned</span></div><div><strong>{plan.overloadedEngineers}</strong><span>Over capacity</span></div></div>
    </div>
    {(plan.engineers||[]).map(engineer=><div className="panel" key={engineer.engineerId}>
      <div className="panel-head"><div><h2>{engineer.engineerName}</h2><p className="muted">{engineer.zoneName||"No primary zone"} · {engineer.scheduledCount}/{engineer.dailyCapacity} visits · {engineer.completedCount} completed{engineer.overloaded?" · OVER CAPACITY":""}</p></div><span className={`status ${engineer.overloaded?"cancelled":"active"}`}>{engineer.overloaded?"OVERLOADED":"ON PLAN"}</span></div>
      <VisitTable visits={engineer.visits} engineers={engineers} zones={zones} plannedCounts={plannedCounts} targets={targets} setTargets={setTargets} zoneOverrides={zoneOverrides} setZoneOverrides={setZoneOverrides}
        onAssign={reassign} onMove={(index,direction)=>reorder(engineer.visits,index,direction)} busy={busy} assigned/>
    </div>)}
    <div className="panel"><div className="panel-head"><div><h2>Unassigned visits</h2><p className="muted">Unverified or ambiguous geography is blocked until a supervisor confirms a zone.</p></div></div>
      <VisitTable visits={plan.unassigned} engineers={engineers} zones={zones} plannedCounts={plannedCounts} targets={targets} setTargets={setTargets} zoneOverrides={zoneOverrides} setZoneOverrides={setZoneOverrides} onAssign={assign} busy={busy}/>
    </div>
    {!allVisits.length&&<div className="panel empty">No scheduled service visits through this date.</div>}
  </>;
}

function VisitTable({visits=[],engineers,zones,plannedCounts,targets,setTargets,zoneOverrides,setZoneOverrides,onAssign,onMove,busy,assigned=false}){
  return <div className="table-wrap"><table><thead><tr><th>Due / priority</th><th>Customer / elevator</th><th>Location / zone</th><th>Engineer</th><th>Reason</th><th>Actions</th></tr></thead>
    <tbody>{!visits.length&&<tr><td className="empty" colSpan={6}>No visits in this group.</td></tr>}
      {visits.map((visit,index)=><tr key={visit.serviceVisitId}><td><b>{dateLabel(visit.dueDate)}</b><small><span className={`status ${visit.priority==="CRITICAL"?"cancelled":"pending"}`}>{visit.priority||"—"}</span></small></td>
        <td><b>{visit.customerName||"Customer"}</b><small>{visit.liftSerialNumber||"Elevator"} · Visit #{visit.serviceVisitId}</small></td>
        <td>{visit.city||"—"}<small>{visit.pincode||"No PIN"} · {visit.zoneName||"Zone unresolved"}</small></td>
        <td><select aria-label={`Engineer for visit ${visit.serviceVisitId}`} title="Choose an engineer. The count shows visits currently on this selected daily plan versus daily capacity." value={targets[visit.serviceVisitId]||visit.engineerId||""} onChange={e=>setTargets({...targets,[visit.serviceVisitId]:e.target.value})}><option value="">Choose engineer</option>{engineers.map(engineer=>{
          const planned=plannedCounts?.get(String(engineer.engineerId))??0;
          return <option key={engineer.engineerId} value={engineer.engineerId}>{engineer.engineerName} ({planned}/{engineer.dailyCapacity})</option>;
        })}</select>
          {!visit.zoneId&&<select aria-label={`Zone override for visit ${visit.serviceVisitId}`} title="Choose the Apollo service zone to use for this visit. This is a supervisor override." value={zoneOverrides[visit.serviceVisitId]||""} onChange={e=>setZoneOverrides({...zoneOverrides,[visit.serviceVisitId]:e.target.value})}><option value="">Choose zone override</option>{zones.map(zone=><option key={zone.zoneId} value={zone.zoneId}>{zone.zoneName}</option>)}</select>}</td>
        <td className="serviceability-reason">{visit.reason||"Verified service zone and active assignment."}</td>
        <td><div className="bill-row-actions">{assigned&&onMove&&<><span title="Move this visit earlier in the engineer's sequence"><button type="button" className="secondary small" aria-label="Move visit earlier" title="Move this visit earlier in the engineer's sequence" disabled={busy||index===0} onClick={()=>onMove(index,-1)}>↑</button></span><span title="Move this visit later in the engineer's sequence"><button type="button" className="secondary small" aria-label="Move visit later" title="Move this visit later in the engineer's sequence" disabled={busy||index===visits.length-1} onClick={()=>onMove(index,1)}>↓</button></span></>}
          <button type="button" className="secondary small" title={assigned?"Save the selected engineer for this visit":"Assign this visit to the selected engineer"} disabled={busy||!targets[visit.serviceVisitId]} onClick={()=>onAssign(visit)}>{assigned?"Reassign":"Assign"}</button></div></td>
      </tr>)}
    </tbody></table></div>;
}

function AllocationView({date,setDate,visits,onChanged}){
  const [selected,setSelected]=useState([]);
  const [preview,setPreview]=useState(null);
  const [busy,setBusy]=useState(false);
  const chosen=useMemo(()=>new Set(selected),[selected]);
  async function makePreview(){
    if(!selected.length)return;
    setBusy(true);
    try{setPreview(await api.previewServiceAllocation({serviceVisitIds:selected,plannedDate:date}));}
    catch(e){window.alert(e.message);}
    finally{setBusy(false);}
  }
  async function confirm(){
    const eligible=(preview?.decisions||[]).filter(decision=>decision.assignable).map(decision=>decision.serviceVisitId);
    if(!eligible.length)return;
    if(!window.confirm(`Confirm ${eligible.length} proposed service assignment${eligible.length===1?"":"s"}?`))return;
    setBusy(true);
    try{const result=await api.confirmServiceAllocation({serviceVisitIds:eligible,plannedDate:preview.plannedDate});setPreview(result);setSelected([]);await onChanged();}
    catch(e){window.alert(e.message);}
    finally{setBusy(false);}
  }
  return <>
    <div className="panel"><div className="panel-head"><div><h2>Review automatic allocation</h2><p className="muted">Select pending visits, review the proposed engineer and reason, then confirm. Preview never writes assignments.</p></div></div>
      <div className="serviceability-filters"><label className="serviceability-date">Plan date<input type="date" value={date} onChange={e=>{setDate(e.target.value);setPreview(null);}}/></label><button className="secondary" title="Preview recommended engineers for the selected visits without saving assignments" disabled={!selected.length||busy} onClick={makePreview}><Users size={15}/> {busy?"Preparing…":"Preview selected"}</button><button className="primary" title="Save all assignments marked eligible in the preview" disabled={!preview?.decisions?.some(d=>d.assignable)||busy} onClick={confirm}><CheckCircle2 size={15}/> Confirm eligible assignments</button></div>
      <DataTable empty="No unassigned scheduled visits found.">
        <thead><tr><th><input aria-label="Select all visits" type="checkbox" checked={visits.length>0&&selected.length===visits.length} onChange={e=>setSelected(e.target.checked?visits.map(v=>v.id):[])}/></th><th>Due date</th><th>Customer / lift</th><th>Location</th></tr></thead>
        <tbody>{visits.map(visit=><tr key={visit.id}><td><input type="checkbox" checked={chosen.has(visit.id)} onChange={e=>setSelected(current=>e.target.checked?[...current,visit.id]:current.filter(id=>id!==visit.id))}/></td><td>{dateLabel(visit.serviceDate)}</td><td><b>{visit.customerName}</b><small>{visit.liftSerialNumber||"Elevator"} · Visit #{visit.id}</small></td><td>{[visit.city,visit.pincode].filter(Boolean).join(" · ")||"Address mapping unavailable"}</td></tr>)}</tbody>
      </DataTable>
    </div>
    {preview&&<div className="panel"><div className="panel-head"><div><h2>{preview.confirmed?"Allocation result":"Proposed assignments"}</h2><p className="muted">{preview.assignedCount} assigned · {preview.blockedCount} blocked · Plan date {dateLabel(preview.plannedDate)}</p></div></div>
      <DataTable empty="No proposed assignments.">
        <thead><tr><th>Visit / due</th><th>Zone</th><th>Engineer</th><th>Priority</th><th>Decision</th></tr></thead>
        <tbody>{preview.decisions.map(decision=><tr key={`${decision.serviceVisitId}-${decision.assignmentId||"preview"}`}><td>#{decision.serviceVisitId}<small>{dateLabel(decision.dueDate)}</small></td><td>{decision.zoneName||decision.zoneId||"Unresolved"}</td><td>{decision.engineerName||"—"}</td><td><span className={`status ${decision.priority==="CRITICAL"?"cancelled":"pending"}`}>{decision.priority||"—"}</span></td><td>{decision.assignmentId?"Confirmed":decision.reason||"Blocked"}</td></tr>)}</tbody>
      </DataTable>
      {preview.decisions.some(d=>!d.assignable)&&<div className="alert"><AlertTriangle size={15}/> Blocked visits remain unassigned until mapping or engineer configuration is corrected.</div>}
    </div>}
  </>;
}

function DataTable({children,empty}){
  const body=React.Children.toArray(children).find(child=>child?.type==="tbody");
  const rows=body?.props?.children;
  const hasRows=Array.isArray(rows)?rows.length>0:!!rows;
  return <div className="table-wrap">{!hasRows&&<div className="empty">{empty}</div>}<table style={{display:hasRows?"table":"none"}}>{children}</table></div>;
}
