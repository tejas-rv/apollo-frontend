import React,{useEffect,useState} from "react";
import {Routes,Route,Navigate,NavLink,useNavigate,useLocation} from "react-router-dom";
import {LayoutDashboard,Users,FileText,Send,ShieldCheck,LogOut,Menu,Receipt,ClipboardList,History,MessageSquare,ChevronDown,KeyRound} from "lucide-react";
import {api} from "./services/api";
import Login from "./pages/Login";
import HomePage from "./pages/HomePage";
import ContactPage from "./pages/ContactPage";
import Dashboard from "./pages/Dashboard";
import Customers from "./pages/Customers";
import CustomerForm from "./pages/CustomerForm";
import CustomerDetails from "./pages/CustomerDetails";
import Notifications from "./pages/Notifications";
import Settings from "./pages/Settings";
import Bills from "./pages/Bills";
import Enquiries from "./pages/Enquiries";
import EngineerDashboard from "./pages/engineer/EngineerDashboard";
import EngineerCustomers from "./pages/engineer/EngineerCustomers";
import EngineerCustomerDetail from "./pages/engineer/EngineerCustomerDetail";
import ServiceReportForm from "./pages/engineer/ServiceReportForm";
import ServiceReportHistory from "./pages/engineer/ServiceReportHistory";

const adminNav=[
  ["/app","Dashboard",LayoutDashboard],
  ["/app/customers","Customers",Users],
  ["/app/bills","Bills",Receipt],
  ["/app/enquiries","Enquiries",MessageSquare],
  ["/app/notifications","Notifications",Send],
  ["/app/settings","Security",ShieldCheck],
];
const engineerNav=[
  ["/engineer","Dashboard",LayoutDashboard],
  ["/engineer/customers","Customers",Users],
  ["/engineer/report/new","New Report",ClipboardList],
  ["/engineer/reports","My Reports",History],
];

function Protected({children,role,allowed}){
  if(!localStorage.getItem("accessToken")) return <Navigate to="/login" replace state={{from:window.location.pathname}}/>;
  if(allowed&&!allowed.includes(role)) return <Navigate to="/login" replace state={{from:window.location.pathname}}/>;
  return children;
}

function ChangePasswordModal({onClose,onLogout}){
  const [form,setForm]=useState({currentPassword:"",newPassword:"",confirmPassword:""});
  const [error,setError]=useState(""),[saving,setSaving]=useState(false),[done,setDone]=useState(false);
  const set=field=>e=>setForm({...form,[field]:e.target.value});

  async function submit(e){
    e.preventDefault();
    setError("");
    if(!form.currentPassword||!form.newPassword||!form.confirmPassword){setError("All fields are required.");return;}
    if(form.newPassword.length<6){setError("New password must be at least 6 characters.");return;}
    if(form.newPassword!==form.confirmPassword){setError("New password and confirmation do not match.");return;}
    setSaving(true);
    try{
      await api.changePassword({currentPassword:form.currentPassword,newPassword:form.newPassword});
      setDone(true);
    }catch(x){setError(x.message)}
    finally{setSaving(false)}
  }

  if(done){
    return <div style={{position:"fixed",inset:0,background:"rgba(15,23,37,.4)",display:"grid",placeItems:"center",zIndex:60}} onClick={onClose}>
      <div className="panel" style={{width:"min(420px,calc(100% - 32px))",margin:0}} onClick={e=>e.stopPropagation()}>
        <div className="panel-head"><h2 style={{margin:0}}>Password updated</h2></div>
        <div className="alert success">Your password has been changed successfully.</div>
        <p className="muted">For security, your other active sessions have been signed out. Would you like to sign out of this session now, or continue and sign out later?</p>
        <div className="form-actions">
          <button className="secondary" onClick={onClose}>Continue for now</button>
          <button className="primary" onClick={onLogout}>Log out now</button>
        </div>
      </div>
    </div>;
  }

  return <div style={{position:"fixed",inset:0,background:"rgba(15,23,37,.4)",display:"grid",placeItems:"center",zIndex:60}} onClick={onClose}>
    <div className="panel" style={{width:"min(420px,calc(100% - 32px))",margin:0}} onClick={e=>e.stopPropagation()}>
      <div className="panel-head"><h2 style={{margin:0}}>Change password</h2><button className="icon-btn" onClick={onClose}>Close</button></div>
      {error&&<div className="alert error">{error}</div>}
      <form className="form" onSubmit={submit}>
        <label>Current password<input type="password" value={form.currentPassword} onChange={set("currentPassword")}/></label>
        <label>New password<input type="password" value={form.newPassword} onChange={set("newPassword")}/></label>
        <label>Confirm new password<input type="password" value={form.confirmPassword} onChange={set("confirmPassword")}/></label>
        <div className="form-actions">
          <button type="button" className="secondary" onClick={onClose}>Cancel</button>
          <button className="primary" disabled={saving}>{saving?"Saving…":"Update password"}</button>
        </div>
      </form>
    </div>
  </div>;
}

function Shell({children,user,nav}){
  const [open,setOpen]=useState(true), navg=useNavigate();
  const [signedOut,setSignedOut]=useState(false);
  const [menuOpen,setMenuOpen]=useState(false);
  const [pwOpen,setPwOpen]=useState(false);
  const location=useLocation();
  const logout=()=>{
    localStorage.clear();
    setSignedOut(true);
    navg("/", { replace: true });
  };
  return <div className="app-shell">
    <aside className={open?"sidebar":"sidebar collapsed"}>
      <div className="brand"><img src="/apollo_elevator_logo.png" alt="Apollo" className="brand-mark" style={{objectFit:"contain"}}/>{open&&<div><b>APOLLO</b><span>{user?.role==="ENGINEER"?"Engineer":"Elevator"}</span></div>}</div>
      <nav>{nav.map(([to,label,Icon])=><NavLink key={to} to={to} end={to==="/app"||to==="/engineer"} className={({isActive})=>isActive||location.pathname===to+"/"?"active":""}><Icon size={19}/>{open&&label}</NavLink>)}</nav>
    </aside>
    <main className="main">
      <header>
        <button className="icon-btn" onClick={()=>setOpen(!open)}><Menu size={20}/></button>
        <div className="user-menu" onClick={()=>setMenuOpen(!menuOpen)}>
          <div className="user">
            <div className="avatar">{(user?.username||"U")[0].toUpperCase()}</div>
            <div><b>{user?.username||"User"}</b><small>{user?.role||"—"}</small></div>
          </div>
          <ChevronDown size={16} className={menuOpen?"user-menu__chevron open":"user-menu__chevron"}/>
          {menuOpen&&<>
            <button type="button" className="user-menu__backdrop" aria-label="Close menu" onClick={e=>{e.stopPropagation();setMenuOpen(false)}}/>
            <div className="user-menu__dropdown" onClick={e=>e.stopPropagation()}>
              <button className="user-menu__item" onClick={()=>{setMenuOpen(false);setPwOpen(true)}}><KeyRound size={16}/> Change password</button>
              <button className="user-menu__item user-menu__item--danger" onClick={logout}><LogOut size={16}/> Sign out</button>
            </div>
          </>}
        </div>
      </header>
      {signedOut&&<div className="alert success" style={{margin:"18px 32px 0"}}>You have been successfully signed out.</div>}
      {children}
    </main>
    {pwOpen&&<ChangePasswordModal onClose={()=>setPwOpen(false)} onLogout={()=>{setPwOpen(false);logout();}}/>}
  </div>;
}

export default function App(){
  const [user,setUser]=useState(()=>{
    const r=localStorage.getItem("userRole"), u=localStorage.getItem("username");
    return r&&u?{role:r,username:u}:null;
  });
  useEffect(()=>{
    if(localStorage.getItem("accessToken")) api.me().then(u=>{setUser(u);localStorage.setItem("userRole",u.role);localStorage.setItem("username",u.username);}).catch(()=>{});
  },[]);

  const isEngineer=user?.role==="ENGINEER";

  return <Routes>
    <Route path="/" element={<HomePage/>}/>
    <Route path="/contact" element={<ContactPage/>}/>
    <Route path="/login" element={<Login onLogin={u=>{setUser(u);localStorage.setItem("userRole",u.role);localStorage.setItem("username",u.username);}}/>}/>
    <Route path="/app" element={<Protected role={user?.role} allowed={["ADMIN"]}><Shell user={user} nav={adminNav}><Dashboard/></Shell></Protected>}/>
    <Route path="/engineer" element={<Protected role={user?.role} allowed={["ENGINEER","ADMIN"]}><Shell user={user} nav={engineerNav}><EngineerDashboard/></Shell></Protected>}/>

    {/* â”€â”€ Admin routes â”€â”€ */}
    <Route path="/app/*" element={
      <Protected role={user?.role} allowed={["ADMIN"]}>
        <Shell user={user} nav={adminNav}>
          <Routes>
            <Route path="/" element={<Dashboard/>}/>
            <Route path="/customers" element={<Customers/>}/>
            <Route path="/customers/new" element={<CustomerForm/>}/>
            <Route path="/customers/:id" element={<CustomerDetails/>}/>
            <Route path="/customers/:id/edit" element={<CustomerForm/>}/>
            <Route path="/bills" element={<Bills/>}/>
            <Route path="/enquiries" element={<Enquiries/>}/>
            <Route path="/notifications" element={<Notifications/>}/>
            <Route path="/settings" element={<Settings/>}/>
            <Route path="*" element={<Navigate to="/app" replace/>}/>
          </Routes>
        </Shell>
      </Protected>
    }/>

    {/* â”€â”€ Engineer routes â”€â”€ */}
    <Route path="/engineer/*" element={
      <Protected role={user?.role} allowed={["ENGINEER","ADMIN"]}>
        <Shell user={user} nav={engineerNav}>
          <Routes>
            <Route path="/" element={<EngineerDashboard/>}/>
            <Route path="/customers" element={<EngineerCustomers/>}/>
            <Route path="/customers/:id" element={<EngineerCustomerDetail/>}/>
            <Route path="/report/new" element={<ServiceReportForm/>}/>
            <Route path="/reports" element={<ServiceReportHistory/>}/>
            <Route path="*" element={<Navigate to="/engineer" replace/>}/>
          </Routes>
        </Shell>
      </Protected>
    }/>
  </Routes>;
}
