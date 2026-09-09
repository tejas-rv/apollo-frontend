import React,{useEffect,useState} from "react";
import {Routes,Route,Navigate,NavLink,useNavigate,useLocation} from "react-router-dom";
import {LayoutDashboard,Users,FileText,Send,ShieldCheck,LogOut,Menu,Receipt,ClipboardList,History} from "lucide-react";
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
  if(!localStorage.getItem("accessToken")) return <Navigate to="/login" replace state={{from:window.location.pathname}}/>;
  if(allowed&&!allowed.includes(role)) return <Navigate to="/login" replace state={{from:window.location.pathname}}/>;
  return children;
}

function Shell({children,user,nav}){
  const [open,setOpen]=useState(true), navg=useNavigate();
  const [signedOut,setSignedOut]=useState(false);
  const location=useLocation();
  const logout=()=>{
    localStorage.clear();
    setSignedOut(true);
    navg("/", { replace: true });
  };
  return <div className="app-shell">
    <aside className={open?"sidebar":"sidebar collapsed"}>
      <div className="brand"><img src="/apollo_elevator_icon.png" alt="Apollo" className="brand-mark" style={{objectFit:"contain"}}/>{open&&<div><b>APOLLO</b><span>{user?.role==="ENGINEER"?"Engineer":"Elevator"}</span></div>}</div>
      <nav>{nav.map(([to,label,Icon])=><NavLink key={to} to={to} end={to==="/"} className={({isActive})=>isActive||location.pathname===to+"/"?"active":""}><Icon size={19}/>{open&&label}</NavLink>)}</nav>
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
      {signedOut&&<div className="alert success" style={{margin:"18px 32px 0"}}>You have been successfully signed out.</div>}
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
    <Route path="/" element={<HomePage/>}/>
    <Route path="/contact" element={<ContactPage/>}/>
    <Route path="/login" element={<Login onLogin={u=>{setUser(u);localStorage.setItem("userRole",u.role);localStorage.setItem("username",u.username);}}/>}/>
    <Route path="/app" element={<Protected role={user?.role} allowed={["ADMIN"]}><Shell user={user} nav={adminNav}><Dashboard/></Shell></Protected>}/>
    <Route path="/engineer" element={<Protected role={user?.role} allowed={["ENGINEER","ADMIN"]}><Shell user={user} nav={engineerNav}><EngineerDashboard/></Shell></Protected>}/>

    {/* ── Admin routes ── */}
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
            <Route path="/notifications" element={<Notifications/>}/>
            <Route path="/settings" element={<Settings/>}/>
            <Route path="*" element={<Navigate to="/app" replace/>}/>
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
