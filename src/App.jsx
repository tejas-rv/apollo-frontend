import React,{useEffect,useState} from "react";
import {Routes,Route,Navigate,useNavigate} from "react-router-dom";
import {LayoutDashboard,Users,FileText,Send,ShieldCheck,LogOut,Menu} from "lucide-react";
import {api} from "./services/api";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Customers from "./pages/Customers";
import CustomerForm from "./pages/CustomerForm";
import CustomerDetails from "./pages/CustomerDetails";
import Notifications from "./pages/Notifications";
import Settings from "./pages/Settings";

const nav=[["/","Dashboard",LayoutDashboard],["/customers","Customers",Users],["/notifications","Notifications",Send],["/settings","Security",ShieldCheck]];

function Protected({children}) {
  return localStorage.getItem("accessToken") ? children : <Navigate to="/login" replace/>;
}
function Shell({children,user}) {
  const [open,setOpen]=useState(true), navg=useNavigate();
  const logout=()=>{localStorage.clear();navg("/login")};
  return <div className="app-shell">
    <aside className={open?"sidebar":"sidebar collapsed"}>
      <div className="brand"><div className="brand-mark">A</div>{open&&<div><b>APOLLO</b><span>Elevators</span></div>}</div>
      <nav>{nav.map(([to,label,Icon])=><a key={to} className={location.pathname===to?"active":""} href={to}><Icon size={19}/>{open&&label}</a>)}</nav>
      <button className="logout" onClick={logout}><LogOut size={18}/>{open&&"Sign out"}</button>
    </aside>
    <main className="main"><header><button className="icon-btn" onClick={()=>setOpen(!open)}><Menu size={20}/></button><div className="user"><div className="avatar">{(user?.username||"A")[0].toUpperCase()}</div><div><b>{user?.username||"Admin"}</b><small>{user?.role||"ADMIN"}</small></div></div></header>{children}</main>
  </div>
}
export default function App(){
 const [user,setUser]=useState(null);
 useEffect(()=>{if(localStorage.getItem("accessToken")) api.me().then(setUser).catch(()=>{});},[]);
 return <Routes>
  <Route path="/login" element={<Login onLogin={setUser}/>}/>
  <Route path="*" element={<Protected><Shell user={user}><Routes>
   <Route path="/" element={<Dashboard/>}/><Route path="/customers" element={<Customers/>}/>
   <Route path="/customers/new" element={<CustomerForm/>}/><Route path="/customers/:id" element={<CustomerDetails/>}/>
   <Route path="/customers/:id/edit" element={<CustomerForm/>}/><Route path="/notifications" element={<Notifications/>}/>
   <Route path="/settings" element={<Settings/>}/><Route path="*" element={<Navigate to="/" replace/>}/>
  </Routes></Shell></Protected>}/>
 </Routes>
}