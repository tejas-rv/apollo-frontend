import React,{useEffect,useMemo,useState} from "react";
import {Link,useSearchParams} from "react-router-dom";
import {AlertTriangle,Briefcase,CalendarClock,CheckCircle2,HardHat,KeyRound,Pencil,Plus,Power,Search,ShieldCheck,Trash2,UserRound,Users as UsersIcon,X} from "lucide-react";
import {api} from "../services/api";
import {HINTS,HTML_PATTERNS,collectErrors,normalizeMobile,validateAddress,validateEmail,validateMobile,validateName,validateNotFuture,validateRequired} from "../utils/validation";

const USER_TYPES={
  ADMIN:{label:"Admin",icon:ShieldCheck,desc:"Full access to the admin portal.",designations:["Administrator","System Administrator","Operations Admin"]},
  OFFICE:{label:"Office",icon:Briefcase,desc:"CEO, CXOs and office bearers. Same access as Admin.",designations:["CEO","CTO","CFO","COO","Director","General Manager","Office Manager","Accounts","HR","Sales Executive"]},
  ENGINEER:{label:"Engineer",icon:HardHat,desc:"Engineer portal: assigned customers and service reports.",designations:["Service Engineer","Senior Service Engineer","Installation Engineer","Technician","Senior Technician","Site Supervisor","Service Manager"]},
};
const TYPE_KEYS=Object.keys(USER_TYPES);
const securityRole=t=>t==="ENGINEER"?"ENGINEER":"ADMIN";

const emptyProfile={employeeNumber:"",fullName:"",phone:"",email:"",address:"",designation:"",dateOfJoining:"",specialization:"",emergencyContactName:"",emergencyContactPhone:"",notes:""};
const emptyReset={newPassword:"",confirm:""};

const fmtDate=d=>d?new Date(`${String(d).slice(0,10)}T00:00:00`).toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"}):"—";
const fmtDateTime=d=>d?new Date(d).toLocaleString("en-IN",{day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"}):"—";
const today=()=>new Date().toISOString().slice(0,10);
const currentUsername=()=>localStorage.getItem("username")||"";

function toProfileForm(p){
  if(!p)return emptyProfile;
  return Object.fromEntries(Object.keys(emptyProfile).map(k=>[k,p[k]??""]));
}
function toProfilePayload(form){
  return Object.fromEntries(Object.entries(form).map(([k,v])=>{
    let t=typeof v==="string"?v.trim():v;
    if(k==="phone"||k==="emergencyContactPhone")t=normalizeMobile(t);
    if(k==="email"&&t)t=t.toLowerCase();
    return [k,t===""?null:t];
  }));
}
function validateProfile(p){
  return collectErrors({
    employeeNumber:validateRequired(p.employeeNumber,"Employee number")||(/^[A-Za-z0-9/_-]+$/.test(p.employeeNumber.trim())?"":"Employee number: letters, digits, '/', '_' and '-' only"),
    fullName:validateName(p.fullName,{required:true,label:"Full name"}),
    phone:validateMobile(p.phone,{label:"Phone"}),
    email:validateEmail(p.email),
    dateOfJoining:validateNotFuture(p.dateOfJoining,"Date of joining"),
    emergencyContactName:validateName(p.emergencyContactName,{label:"Emergency contact name"}),
    emergencyContactPhone:validateMobile(p.emergencyContactPhone,{label:"Emergency contact phone"})
      ||(p.emergencyContactPhone&&p.phone&&normalizeMobile(p.emergencyContactPhone)===normalizeMobile(p.phone)?"Emergency contact phone must differ from the user's phone":""),
    address:validateAddress(p.address),
  });
}
const Err=({msg,hint})=>msg?<small className="field-error">{msg}</small>:hint?<small className="field-hint">{hint}</small>:null;
const TypeBadge=({type})=><span className={`badge type-badge type-${(type||"").toLowerCase()}`}>{USER_TYPES[type]?.label||type||"—"}</span>;

export default function Users(){
  const [params,setParams]=useSearchParams();
  const typeParam=params.get("type");
  const typeFilter=TYPE_KEYS.includes(typeParam)?typeParam:"ALL";
  const [users,setUsers]=useState([]),[loading,setLoading]=useState(true),[error,setError]=useState(""),[notice,setNotice]=useState("");
  const [query,setQuery]=useState(""),[statusFilter,setStatusFilter]=useState("all");
  const [creating,setCreating]=useState(false);
  const [detailId,setDetailId]=useState(null);
  const [resetTarget,setResetTarget]=useState(null);
  const me=currentUsername();

  async function load(){
    setLoading(true);setError("");
    try{setUsers(await api.listUsers()||[])}
    catch(x){setError(x.message)}
    finally{setLoading(false)}
  }
  useEffect(()=>{load()},[]);

  const totals=useMemo(()=>users.reduce((t,u)=>({
    active:t.active+(u.enabled?1:0),
    admins:t.admins+(u.userType==="ADMIN"?1:0),
    office:t.office+(u.userType==="OFFICE"?1:0),
    engineers:t.engineers+(u.userType==="ENGINEER"?1:0),
    upcoming:t.upcoming+u.upcomingServices,overdue:t.overdue+u.overdueServices,
  }),{active:0,admins:0,office:0,engineers:0,upcoming:0,overdue:0}),[users]);

  const q=query.trim().toLowerCase();
  const visible=users.filter(u=>{
    if(typeFilter!=="ALL"&&u.userType!==typeFilter)return false;
    if(statusFilter==="active"&&!u.enabled)return false;
    if(statusFilter==="inactive"&&u.enabled)return false;
    if(!q)return true;
    return [u.fullName,u.username,u.employeeNumber,u.phone,u.email,u.designation].some(v=>v&&v.toLowerCase().includes(q));
  });
  const showWorkload=typeFilter==="ALL"||typeFilter==="ENGINEER";
  const cols=showWorkload?9:8;

  function setType(t){const next=new URLSearchParams(params);t==="ALL"?next.delete("type"):next.set("type",t);setParams(next,{replace:true})}
  function flash(msg){setNotice(msg);setError("")}

  return <section className="page">
    <div className="page-head">
      <div><span className="eyebrow">ADMINISTRATION</span><h1>Users</h1><p className="muted">Manage admin, office and engineer accounts. Select a user to view or edit details.</p></div>
      <button className="primary" onClick={()=>setCreating(true)}><Plus size={18}/> Create user</button>
    </div>
    {error&&<div className="alert error">{error}</div>}
    {notice&&<div className="alert success">{notice}</div>}

    <div className="stats four">
      <Stat icon={<UsersIcon size={20}/>} label="Users" value={users.length} sub={`${totals.active} active`}/>
      <Stat icon={<ShieldCheck size={20}/>} label="Admin & office" value={totals.admins+totals.office} sub={`${totals.admins} admin · ${totals.office} office`}/>
      <Stat icon={<HardHat size={20}/>} label="Engineers" value={totals.engineers} sub={`${totals.upcoming} upcoming services`}/>
      <Stat icon={<AlertTriangle size={20}/>} label="Overdue services" value={totals.overdue} tone={totals.overdue?"warn":""}/>
    </div>

    <div className="segmented type-tabs">
      {[["ALL","All users"],...TYPE_KEYS.map(k=>[k,USER_TYPES[k].label])].map(([k,l])=><button key={k} className={typeFilter===k?"selected":""} onClick={()=>setType(k)}>{l}</button>)}
    </div>
    <div className="toolbar engineers-toolbar">
      <div className="search"><Search size={18}/><input placeholder="Search by name, employee no., username, phone or email…" value={query} onChange={e=>setQuery(e.target.value)}/></div>
      <div className="segmented">
        {[["all","All"],["active","Active"],["inactive","Inactive"]].map(([k,l])=><button key={k} className={statusFilter===k?"selected":""} onClick={()=>setStatusFilter(k)}>{l}</button>)}
      </div>
    </div>

    <div className="panel"><div className="table-wrap"><table>
      <thead><tr><th>Emp. No.</th><th>User</th><th>Type</th><th>Contact</th><th>Designation</th>{showWorkload&&<th>Services</th>}<th>Status</th><th></th></tr></thead>
      <tbody>
        {loading&&<tr><td colSpan={cols} className="loading">Loading users…</td></tr>}
        {!loading&&visible.map(u=><tr key={u.id} className="clickable-row" onClick={()=>setDetailId(u.id)}>
          <td>{u.employeeNumber||<span className="muted">—</span>}</td>
          <td><b><UserRound size={15} style={{verticalAlign:"-2px",marginRight:6}}/>{u.fullName||u.username}{u.username===me&&<span className="badge" style={{marginLeft:6}}>You</span>}</b><small>@{u.username}{!u.fullName&&" · profile incomplete"}</small></td>
          <td><TypeBadge type={u.userType}/></td>
          <td>{u.phone||"—"}<small>{u.email||""}</small></td>
          <td>{u.designation||"—"}</td>
          {showWorkload&&<td>{u.userType==="ENGINEER"?<><b>{u.upcomingServices} upcoming</b><small className={u.overdueServices?"text-danger":""}>{u.overdueServices?`${u.overdueServices} overdue · `:""}{u.completedServices} completed</small></>:<span className="muted">—</span>}</td>}
          <td><span className={`status ${u.enabled?"active":"cancelled"}`}>{u.enabled?"Active":"Inactive"}</span></td>
          <td><div className="actions"><button className="secondary small" onClick={ev=>{ev.stopPropagation();setResetTarget(u)}}><KeyRound size={14}/> Reset password</button></div></td>
        </tr>)}
        {!loading&&!visible.length&&<tr><td colSpan={cols} className="empty">{users.length?"No users match your filters.":"No users yet. Use \"Create user\" to add one."}</td></tr>}
      </tbody>
    </table></div></div>

    {creating&&<CreateUserModal initialType={typeFilter==="ALL"?"ENGINEER":typeFilter} onClose={()=>setCreating(false)} onCreated={async u=>{
      setCreating(false);flash(`${USER_TYPES[u.userType]?.label||"User"} "${u.profile?.fullName||u.username}" created with username "${u.username}".`);await load();setDetailId(u.id);
    }}/>}

    {detailId!=null&&<UserDetailModal id={detailId} me={me} onClose={()=>setDetailId(null)}
      onResetPassword={u=>setResetTarget(u)}
      onChanged={async msg=>{flash(msg);await load()}}
      onDeleted={async msg=>{setDetailId(null);flash(msg);await load()}}/>}

    {resetTarget&&<ResetPasswordModal user={resetTarget} onClose={()=>setResetTarget(null)} onDone={msg=>{setResetTarget(null);flash(msg)}}/>}
  </section>;
}

function Stat({icon,label,value,sub,tone}){
  return <div className={`stat ${tone||""}`}><div className="stat-icon">{icon}</div><div><span>{label}</span><strong>{value}</strong>{sub&&<span>{sub}</span>}</div></div>;
}

function Modal({title,subtitle,onClose,busy,wide,children,as="div",onSubmit}){
  const Tag=as;
  return <div className="modal-backdrop" onClick={()=>!busy&&onClose()}>
    <Tag className={`panel modal-card ${wide?"modal-wide":""} ${as==="form"?"form":""}`} onClick={e=>e.stopPropagation()} onSubmit={onSubmit}>
      <div className="panel-head"><div><h2>{title}</h2>{subtitle&&<p className="muted">{subtitle}</p>}</div><button type="button" className="secondary small" onClick={onClose} disabled={busy} aria-label="Close"><X size={16}/></button></div>
      {children}
    </Tag>
  </div>;
}

function TypePicker({value,onChange,disabled}){
  return <div className="type-picker" role="radiogroup" aria-label="User type">
    {TYPE_KEYS.map(k=>{const T=USER_TYPES[k],Icon=T.icon;return <button type="button" key={k} role="radio" aria-checked={value===k} disabled={disabled}
      className={value===k?"selected":""} onClick={()=>onChange(k)}>
      <Icon size={18}/><b>{T.label}</b><small>{T.desc}</small>
    </button>})}
  </div>;
}

function ProfileFields({value,onChange,errors={},userType}){
  const set=k=>e=>onChange({...value,[k]:e.target.value});
  const inv=k=>({"aria-invalid":!!errors[k]});
  const listId=`designations-${userType||"any"}`;
  return <>
    <div className="form-grid">
      <label>Employee number *<input required maxLength="30" pattern="[A-Za-z0-9\/_\-]+" title="Letters, digits, '/', '_' and '-' only" placeholder="e.g. APL-012" value={value.employeeNumber} onChange={set("employeeNumber")} {...inv("employeeNumber")}/><Err msg={errors.employeeNumber}/></label>
      <label>Full name *<input required maxLength="100" value={value.fullName} onChange={set("fullName")} {...inv("fullName")}/><Err msg={errors.fullName}/></label>
      <label>Phone<input type="tel" inputMode="numeric" maxLength="13" placeholder="98765 43210" value={value.phone} onChange={set("phone")} {...inv("phone")}/><Err msg={errors.phone} hint={HINTS.mobile}/></label>
      <label>Email<input type="email" maxLength="150" pattern={HTML_PATTERNS.email} placeholder={HINTS.email} value={value.email} onChange={set("email")} {...inv("email")}/><Err msg={errors.email}/></label>
      <label>Designation<input list={listId} maxLength="100" value={value.designation} onChange={set("designation")}/>
        <datalist id={listId}>{(USER_TYPES[userType]?.designations||[]).map(d=><option key={d} value={d}/>)}</datalist></label>
      <label>Date of joining<input type="date" max={today()} value={value.dateOfJoining} onChange={set("dateOfJoining")} {...inv("dateOfJoining")}/><Err msg={errors.dateOfJoining}/></label>
      {userType==="ENGINEER"?<label>Specialization<input maxLength="200" placeholder="e.g. Traction lifts, MRL, Escalators" value={value.specialization} onChange={set("specialization")}/></label>
        :<label>Department / responsibility<input maxLength="200" placeholder="e.g. Finance, Operations, Sales" value={value.specialization} onChange={set("specialization")}/></label>}
      <span/>
      <label>Emergency contact name<input maxLength="100" value={value.emergencyContactName} onChange={set("emergencyContactName")} {...inv("emergencyContactName")}/><Err msg={errors.emergencyContactName}/></label>
      <label>Emergency contact phone<input type="tel" inputMode="numeric" maxLength="13" placeholder="98765 43210" value={value.emergencyContactPhone} onChange={set("emergencyContactPhone")} {...inv("emergencyContactPhone")}/><Err msg={errors.emergencyContactPhone} hint={HINTS.mobile}/></label>
    </div>
    <label>Address<textarea rows="2" maxLength="500" value={value.address} onChange={set("address")} {...inv("address")}/><Err msg={errors.address}/></label>
    <label>Notes<textarea rows="2" maxLength="1000" value={value.notes} onChange={set("notes")}/></label>
  </>;
}

function CreateUserModal({initialType,onClose,onCreated}){
  const [form,setForm]=useState({username:"",password:"",confirm:"",userType:initialType,profile:emptyProfile});
  const [err,setErr]=useState(""),[saving,setSaving]=useState(false),[tried,setTried]=useState(false);
  const profileErrors=tried?validateProfile(form.profile):{};
  const typeLabel=USER_TYPES[form.userType].label;
  async function submit(e){
    e.preventDefault();
    setTried(true);
    if(!/^[A-Za-z0-9._@-]{3,100}$/.test(form.username.trim())){setErr("Username must be 3–100 characters: letters, digits, '.', '_', '@' or '-'.");return}
    if(form.password.length<8||form.password.length>72){setErr("Password must be 8–72 characters.");return}
    if(form.password!==form.confirm){setErr("Passwords do not match.");return}
    const pe=validateProfile(form.profile);
    if(Object.keys(pe).length){setErr(`Please fix the highlighted fields: ${Object.values(pe)[0]}`);return}
    setSaving(true);setErr("");
    try{
      const u=await api.createUser({username:form.username.trim(),password:form.password,userType:form.userType,profile:toProfilePayload(form.profile)});
      await onCreated(u);
    }catch(x){setErr(x.message)}
    finally{setSaving(false)}
  }
  return <Modal as="form" wide title="Create user" subtitle="Creates a login account and profile. Share the password securely." onClose={onClose} busy={saving} onSubmit={submit}>
    {err&&<div className="alert error">{err}</div>}
    <h3 className="section-sub">User type</h3>
    <TypePicker value={form.userType} onChange={userType=>setForm(f=>({...f,userType}))} disabled={saving}/>
    <h3 className="section-sub">Login account</h3>
    <div className="form-grid">
      <label>Username *<input autoFocus autoComplete="off" required maxLength="100" value={form.username} onChange={e=>setForm(f=>({...f,username:e.target.value}))}/></label>
      <span/>
      <label>Password *<input type="password" autoComplete="new-password" required minLength="8" maxLength="72" value={form.password} onChange={e=>setForm(f=>({...f,password:e.target.value}))}/></label>
      <label>Confirm password *<input type="password" autoComplete="new-password" required minLength="8" maxLength="72" value={form.confirm} onChange={e=>setForm(f=>({...f,confirm:e.target.value}))}/></label>
    </div>
    <p className="muted" style={{margin:0}}>Password must be 8–72 characters. {typeLabel} users sign in to the {securityRole(form.userType)==="ADMIN"?"admin":"engineer"} portal.</p>
    <h3 className="section-sub">{typeLabel} details</h3>
    <ProfileFields userType={form.userType} value={form.profile} errors={profileErrors} onChange={profile=>setForm(f=>({...f,profile}))}/>
    <div className="form-actions"><button type="button" className="secondary" onClick={onClose} disabled={saving}>Cancel</button><button className="primary" disabled={saving}>{saving?"Creating…":`Create ${typeLabel.toLowerCase()}`}</button></div>
  </Modal>;
}

function UserDetailModal({id,me,onClose,onResetPassword,onChanged,onDeleted}){
  const [user,setUser]=useState(null),[err,setErr]=useState(""),[tab,setTab]=useState("upcoming");
  const [editing,setEditing]=useState(false),[form,setForm]=useState(emptyProfile),[editType,setEditType]=useState("ENGINEER");
  const [busy,setBusy]=useState(false),[tried,setTried]=useState(false);

  useEffect(()=>{
    let alive=true;
    setUser(null);setErr("");
    api.user(id).then(d=>{if(alive){setUser(d);setTab(d.overdueServices?.length?"overdue":"upcoming")}}).catch(x=>alive&&setErr(x.message));
    return ()=>{alive=false};
  },[id]);

  const name=user?.profile?.fullName||user?.username;
  const isSelf=user&&user.username===me;
  const isEngineer=user?.userType==="ENGINEER";

  async function save(e){
    e.preventDefault();
    setTried(true);
    const pe=validateProfile(form);
    if(Object.keys(pe).length){setErr(`Please fix the highlighted fields: ${Object.values(pe)[0]}`);return}
    if(editType!==user.userType&&securityRole(editType)!==user.role
      &&!window.confirm(`Change ${name} from ${USER_TYPES[user.userType].label} to ${USER_TYPES[editType].label}? Their access changes and they will be signed out.`))return;
    setBusy(true);setErr("");
    try{
      const d=await api.updateUser(id,{userType:editType,profile:toProfilePayload(form)});
      setUser(d);setEditing(false);setTried(false);
      await onChanged(`Updated "${d.profile?.fullName||d.username}".`);
    }
    catch(x){setErr(x.message)}
    finally{setBusy(false)}
  }
  async function toggleStatus(){
    const enable=!user.enabled;
    if(!enable&&!window.confirm(`Deactivate ${name}? They will not be able to sign in, and their saved sessions will be revoked.`))return;
    setBusy(true);setErr("");
    try{const d=await api.updateUserStatus(id,enable);setUser(d);await onChanged(`${name} ${enable?"activated":"deactivated"}.`)}
    catch(x){setErr(x.message)}
    finally{setBusy(false)}
  }
  async function remove(){
    if(!window.confirm(`Permanently delete ${name} (@${user.username})? This cannot be undone.\n\nUsers with service reports cannot be deleted; deactivate them instead.`))return;
    setBusy(true);setErr("");
    try{await api.deleteUser(id);await onDeleted(`Deleted "${name}".`)}
    catch(x){setErr(x.message);setBusy(false)}
  }

  if(editing)return <Modal as="form" wide title={`Edit ${name}`} subtitle={`@${user.username}`} onClose={()=>setEditing(false)} busy={busy} onSubmit={save}>
    {err&&<div className="alert error">{err}</div>}
    <h3 className="section-sub">User type</h3>
    <TypePicker value={editType} onChange={setEditType} disabled={busy||isSelf}/>
    {isSelf&&<p className="muted" style={{margin:0}}>You cannot change your own user type.</p>}
    {!isSelf&&editType!==user.userType&&securityRole(editType)!==user.role&&<div className="alert error" style={{marginBottom:0}}>Changing to {USER_TYPES[editType].label} changes portal access and signs the user out.</div>}
    <h3 className="section-sub">Profile</h3>
    <ProfileFields userType={editType} value={form} onChange={setForm} errors={tried?validateProfile(form):{}}/>
    <div className="form-actions"><button type="button" className="secondary" onClick={()=>setEditing(false)} disabled={busy}>Cancel</button><button className="primary" disabled={busy}>{busy?"Saving…":"Save changes"}</button></div>
  </Modal>;

  return <Modal wide title={name||"User"} subtitle={user&&<>@{user.username}{user.profile?.employeeNumber&&<> · {user.profile.employeeNumber}</>} · <TypeBadge type={user.userType}/> <span className={`status ${user.enabled?"active":"cancelled"}`}>{user.enabled?"Active":"Inactive"}</span>{isSelf&&<> · <b>This is you</b></>}</>} onClose={onClose} busy={busy}>
    {err&&<div className="alert error">{err}</div>}
    {!user&&!err&&<div className="loading">Loading user…</div>}
    {user&&<>
      <div className="head-actions engineer-actions">
        <button className="secondary small" onClick={()=>{setForm(toProfileForm(user.profile));setEditType(user.userType);setErr("");setTried(false);setEditing(true)}}><Pencil size={14}/> {user.profile?"Edit":"Add profile"}</button>
        <button className="secondary small" onClick={()=>onResetPassword(user)}><KeyRound size={14}/> Reset password</button>
        {!isSelf&&<button className={`secondary small ${user.enabled?"text-danger":""}`} onClick={toggleStatus} disabled={busy}><Power size={14}/> {user.enabled?"Deactivate":"Activate"}</button>}
        {!isSelf&&<button className="secondary small text-danger" onClick={remove} disabled={busy}><Trash2 size={14}/> Delete</button>}
      </div>

      {!user.profile&&<div className="alert error">This user has no profile yet. Add employee number, name and contact details.</div>}

      {isEngineer&&user.stats&&<div className="mini-stats" style={{paddingTop:4,marginBottom:12}}>
        <div><strong>{user.stats.upcomingServices}</strong><span>Upcoming services</span></div>
        <div><strong className={user.stats.overdueServices?"text-danger":""}>{user.stats.overdueServices}</strong><span>Overdue</span></div>
        <div><strong>{user.stats.completedServices}</strong><span>Completed (all time)</span></div>
        <div><strong>{user.stats.completedThisMonth}</strong><span>Completed this month</span></div>
        <div><strong style={{fontSize:16,lineHeight:"31px"}}>{fmtDate(user.stats.lastServiceDate)}</strong><span>Last service</span></div>
      </div>}

      {user.profile&&<dl className="profile-dl">
        <dt>Employee no.</dt><dd>{user.profile.employeeNumber||"—"}</dd>
        <dt>Designation</dt><dd>{user.profile.designation||"—"}</dd>
        <dt>Phone</dt><dd>{user.profile.phone?<a className="table-link" href={`tel:${user.profile.phone}`}>{user.profile.phone}</a>:"—"}</dd>
        <dt>Email</dt><dd>{user.profile.email?<a className="table-link" href={`mailto:${user.profile.email}`}>{user.profile.email}</a>:"—"}</dd>
        <dt>Date of joining</dt><dd>{fmtDate(user.profile.dateOfJoining)}</dd>
        <dt>{isEngineer?"Specialization":"Department"}</dt><dd>{user.profile.specialization||"—"}</dd>
        <dt>Emergency contact</dt><dd>{[user.profile.emergencyContactName,user.profile.emergencyContactPhone].filter(Boolean).join(" · ")||"—"}</dd>
        <dt>Portal access</dt><dd>{user.role==="ADMIN"?"Admin portal":"Engineer portal"}</dd>
        <dt>Address</dt><dd className="pre">{user.profile.address||"—"}</dd>
        {user.profile.notes&&<><dt>Notes</dt><dd className="pre">{user.profile.notes}</dd></>}
      </dl>}

      {isEngineer&&<>
        <div className="tabs" style={{marginTop:16}}>
          <button className={tab==="upcoming"?"selected":""} onClick={()=>setTab("upcoming")}><CalendarClock size={15}/> Upcoming ({user.upcomingServices.length})</button>
          <button className={tab==="overdue"?"selected":""} onClick={()=>setTab("overdue")}><AlertTriangle size={15}/> Overdue ({user.overdueServices.length})</button>
          <button className={tab==="completed"?"selected":""} onClick={()=>setTab("completed")}><CheckCircle2 size={15}/> Recent completed</button>
        </div>
        {tab!=="completed"&&<VisitTable visits={tab==="upcoming"?user.upcomingServices:user.overdueServices} overdue={tab==="overdue"}/>}
        {tab==="completed"&&<div className="table-wrap"><table>
          <thead><tr><th>Visit date</th><th>Customer</th><th>Report</th><th>Submitted</th></tr></thead>
          <tbody>
            {user.recentServices.map(r=><tr key={r.reportId}>
              <td>{fmtDate(r.visitDate)}</td>
              <td>{r.customerId?<Link className="table-link" to={`/app/customers/${r.customerId}`}>{r.customerName||`Customer #${r.customerId}`}</Link>:(r.customerName||"—")}</td>
              <td>#{r.reportId} <span className="badge">{r.status==="PDF_SENT"?"PDF sent":"Submitted"}</span></td>
              <td>{fmtDateTime(r.submittedAt)}</td>
            </tr>)}
            {!user.recentServices.length&&<tr><td colSpan="4" className="empty">No completed service reports yet.</td></tr>}
          </tbody>
        </table></div>}
        <p className="muted" style={{marginBottom:0}}>Scheduled AMC visits are matched by the engineer name recorded on the visit (full name or username). Completed services are the engineer's submitted service reports.</p>
      </>}
    </>}
  </Modal>;
}

function VisitTable({visits,overdue}){
  return <div className="table-wrap"><table>
    <thead><tr><th>Service date</th><th>Customer</th><th>Contract</th><th>Work planned</th></tr></thead>
    <tbody>
      {visits.map(v=><tr key={v.id}>
        <td><b className={overdue?"text-danger":""}>{fmtDate(v.serviceDate)}</b></td>
        <td>{v.customerId?<Link className="table-link" to={`/app/customers/${v.customerId}`}>{v.customerName||`Customer #${v.customerId}`}</Link>:"—"}<small>{v.city||""}</small></td>
        <td>{v.contractNumber||"—"}</td>
        <td>{v.workDone||<span className="muted">—</span>}</td>
      </tr>)}
      {!visits.length&&<tr><td colSpan="4" className="empty">{overdue?"No overdue services.":"No upcoming services scheduled."}</td></tr>}
    </tbody>
  </table></div>;
}

function ResetPasswordModal({user,onClose,onDone}){
  const [form,setForm]=useState(emptyReset),[err,setErr]=useState(""),[saving,setSaving]=useState(false);
  const label=user.fullName||user.profile?.fullName||user.username;
  async function submit(e){
    e.preventDefault();
    if(form.newPassword!==form.confirm){setErr("Passwords do not match.");return}
    setSaving(true);setErr("");
    try{await api.resetPassword({username:user.username,newPassword:form.newPassword});onDone(`Password reset for "${label}". Their active sessions were signed out.`)}
    catch(x){setErr(x.message)}
    finally{setSaving(false)}
  }
  return <Modal as="form" title="Reset password" subtitle={<>Set a new password for <b>{label}</b> (@{user.username}). Their active sessions will be signed out.</>} onClose={onClose} busy={saving} onSubmit={submit}>
    {err&&<div className="alert error">{err}</div>}
    <label>New password *<input autoFocus type="password" autoComplete="new-password" required minLength="8" maxLength="72" value={form.newPassword} onChange={e=>setForm(f=>({...f,newPassword:e.target.value}))}/></label>
    <label>Confirm new password *<input type="password" autoComplete="new-password" required minLength="8" maxLength="72" value={form.confirm} onChange={e=>setForm(f=>({...f,confirm:e.target.value}))}/></label>
    <div className="form-actions"><button type="button" className="secondary" onClick={onClose} disabled={saving}>Cancel</button><button className="primary" disabled={saving}>{saving?"Resetting…":"Reset password"}</button></div>
  </Modal>;
}
