import React,{useEffect,useState} from "react";
import {Routes,Route,Navigate,useNavigate} from "react-router-dom";
import {LayoutDashboard,Users,FileText,Send,ShieldCheck,LogOut,Menu,Receipt,ClipboardList,History} from "lucide-react";
import {api} from "./services/api";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Customers from "./pages/Customers";
import CustomerForm from "./pages/CustomerForm";
import CustomerDetails from "./pages/CustomerDetails";
import Notifications from "./pages/Notifications";
import Settings from "./pages/Settings";
import Bills from "./pages/Bills";
import EngineerDashboard from "./pages/engineer/EngineerDashboard";
import EngineerCustomers from "./pages/engineer/EngineerCustomers";
import EngineerCustomerDetail from "./pages/engineer/EngineerCustomerDetail";
import ServiceReportForm from "./pages/engineer/ServiceReportForm";
import ServiceReportHistory from "./pages/engineer/ServiceReportHistory";

const adminNav=[
  ["/","Dashboard",LayoutDashboard],
  ["/customers","Customers",Users],
  ["/bills","Bills",Receipt],
  ["/notifications","Notifications",Send],
  ["/settings","Security",ShieldCheck],
];
const engineerNav=[
  ["/engineer","Dashboard",LayoutDashboard],
  ["/engineer/customers","Customers",Users],
  ["/engineer/report/new","New Report",ClipboardList],
  ["/engineer/reports","My Reports",History],
];

function Protected({children,role,allowed}){
  if(!localStorage.getItem("accessToken")) return <Navigate to="/login" replace/>;
  if(allowed&&!allowed.includes(role)) return <Navigate to="/login" replace/>;
  return children;
}

function Shell({children,user,nav}){
  const [open,setOpen]=useState(true), navg=useNavigate();
  const logout=()=>{localStorage.clear();navg("/login")};
  return <div className="app-shell">
    <aside className={open?"sidebar":"sidebar collapsed"}>
      <div className="brand"><img src="/apollo_elevators_icon.png" alt="Apollo" className="brand-mark" style={{objectFit:"contain"}}/>{open&&<div><b>APOLLO</b><span>{user?.role==="ENGINEER"?"Engineer":"Elevators"}</span></div>}</div>
      <nav>{nav.map(([to,label,Icon])=><a key={to} className={location.pathname===to?"active":""} href={to}><Icon size={19}/>{open&&label}</a>)}</nav>
      {open&&user&&<div style={{marginTop:"auto",padding:"12px 13px",fontSize:12,color:"#9ba8b9"}}>
        <div style={{fontWeight:600,color:"#fff"}}>{user.username}</div>
        <div style={{fontSize:10,marginTop:2,color:"#d9a441"}}>{user.role}</div>
      </div>}
      <button className="logout" onClick={logout} style={open&&user?{marginTop:0}:undefined}><LogOut size={18}/>{open&&"Sign out"}</button>
    </aside>
    <main className="main">
      <header>
        <button className="icon-btn" onClick={()=>setOpen(!open)}><Menu size={20}/></button>
        <div className="user">
          <div className="avatar">{(user?.username||"U")[0].toUpperCase()}</div>
          <div><b>{user?.username||"User"}</b><small>{user?.role||"—"}</small></div>
        </div>
      </header>
      {children}
    </main>
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
    <Route path="/login" element={<Login onLogin={u=>{setUser(u);localStorage.setItem("userRole",u.role);localStorage.setItem("username",u.username);}}/>}/>

    {/* ── Admin routes ── */}
    <Route path="/*" element={
      <Protected role={user?.role} allowed={["ADMIN"]}>
        <Shell user={user} nav={adminNav}>
          <Routes>
            <Route path="/" element={<Dashboard/>}/>
            <Route path="/customers" element={<Customers/>}/>
            <Route path="/customers/new" element={<CustomerForm/>}/>
            <Route path="/customers/:id" element={<CustomerDetails/>}/>
            <Route path="/customers/:id/edit" element={<CustomerForm/>}/>
            <Route path="/bills" element={<Bills/>}/>
            <Route path="/notifications" element={<Notifications/>}/>
            <Route path="/settings" element={<Settings/>}/>
            <Route path="*" element={<Navigate to="/" replace/>}/>
          </Routes>
        </Shell>
      </Protected>
    }/>

    {/* ── Engineer routes ── */}
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
