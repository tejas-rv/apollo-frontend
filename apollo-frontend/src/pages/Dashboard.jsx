import React,{useEffect,useMemo,useState} from "react";
import {Users,Building2,CalendarClock,AlertCircle,TrendingUp,Clock,CheckCircle,XCircle,ArrowRight,IndianRupee,MessageSquare} from "lucide-react";
import {Link} from "react-router-dom";
import {BarChart,Bar,XAxis,YAxis,CartesianGrid,Tooltip,ResponsiveContainer,PieChart,Pie,Cell,Legend} from "recharts";
import {api} from "../services/api";

/* ── helpers ── */
const MONTHS=["Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec","Jan","Feb","Mar"];
const FY_START_MONTH=3; // April = index 3

function fyLabel(year){return `FY${String(year).slice(2)}-${String(year+1).slice(2)}`}
function currentFY(){
  const now=new Date();
  return now.getMonth()>=FY_START_MONTH ? now.getFullYear() : now.getFullYear()-1;
}
function fyRange(fy){
  return {start:new Date(fy,FY_START_MONTH,1), end:new Date(fy+1,FY_START_MONTH,1)};
}
function parseDate(s){return s?new Date(s):null}
function inFY(date,fy){
  if(!date)return false;
  const {start,end}=fyRange(fy);
  return date>=start && date<end;
}
function inMonth(date,year,month){
  if(!date)return false;
  return date.getFullYear()===year && date.getMonth()===month;
}
function fmt(n){n=Number(n)||0;return n>=1e5?`₹${(n/1e5).toFixed(1)}L`:`₹${Math.round(n).toLocaleString("en-IN")}`}
const pad=n=>String(n).padStart(2,"0");
const isoDate=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
function fyOfMonth(year,month){return month>=FY_START_MONTH?year:year-1}

/* ── main ── */
export default function Dashboard(){
  const [allCustomers,setAllCustomers]=useState([]);
  const [loading,setLoading]=useState(true);
  const [err,setErr]=useState("");
  const [filterMode,setFilterMode]=useState("fy"); // "fy" | "month"
  const [selectedFY,setSelectedFY]=useState(currentFY());
  const [selYear,setSelYear]=useState(new Date().getFullYear());
  const [selMonth,setSelMonth]=useState(new Date().getMonth());

  const [recentEnquiries,setRecentEnquiries]=useState([]);
  const [newEnquiryCount,setNewEnquiryCount]=useState(0);
  const [billing,setBilling]=useState(null);      // summary for the selected period
  const [billingFY,setBillingFY]=useState(null);  // summary for the whole FY (chart)

  // fetch all customers (up to 500)
  useEffect(()=>{
    setLoading(true);
    api.customers(0,500).then(d=>{
      setAllCustomers(d.content||[]);
      setLoading(false);
    }).catch(e=>{setErr(e.message);setLoading(false)});
  },[]);

  // fetch recent enquiries for the dashboard widget
  useEffect(()=>{
    api.adminEnquiries({page:0,size:6}).then(d=>setRecentEnquiries(d.content||[])).catch(()=>{});
    api.adminEnquiries({status:"NEW",page:0,size:1}).then(d=>setNewEnquiryCount(d.totalElements||0)).catch(()=>{});
  },[]);

  const chartFY=filterMode==="fy"?selectedFY:fyOfMonth(selYear,selMonth);

  // saved bills: what was billed, what is in the bank, what is still expected
  useEffect(()=>{
    const from=filterMode==="fy"?new Date(selectedFY,FY_START_MONTH,1):new Date(selYear,selMonth,1);
    const to=filterMode==="fy"?new Date(selectedFY+1,FY_START_MONTH,0):new Date(selYear,selMonth+1,0);
    api.billSummary(isoDate(from),isoDate(to)).then(setBilling).catch(()=>setBilling(null));
  },[filterMode,selectedFY,selYear,selMonth]);
  useEffect(()=>{
    api.billSummary(isoDate(new Date(chartFY,FY_START_MONTH,1)),isoDate(new Date(chartFY+1,FY_START_MONTH,0)))
      .then(setBillingFY).catch(()=>setBillingFY(null));
  },[chartFY]);

  const allAmcs=useMemo(()=>
    allCustomers.flatMap(c=>
      (c.lifts||[]).flatMap(l=>
        (l.amcDetails||[]).map(a=>({...a,customerName:c.customerName,customerId:c.id,customerCode:c.customerCode}))
      )
    ),[allCustomers]);

  /* ── filtered AMCs ── */
  const filteredAmcs=useMemo(()=>{
    if(filterMode==="fy"){
      return allAmcs.filter(a=>{
        const sd=parseDate(a.startDate), ed=parseDate(a.endDate);
        return inFY(sd,selectedFY)||inFY(ed,selectedFY);
      });
    } else {
      return allAmcs.filter(a=>{
        const sd=parseDate(a.startDate), ed=parseDate(a.endDate);
        return inMonth(sd,selYear,selMonth)||inMonth(ed,selYear,selMonth);
      });
    }
  },[allAmcs,filterMode,selectedFY,selYear,selMonth]);

  /* ── KPIs ── */
  const kpis=useMemo(()=>{
    const active=filteredAmcs.filter(a=>a.status==="ACTIVE");
    const income=active.reduce((s,a)=>s+(parseFloat(a.amcAmount)||0),0);
    const today=new Date();
    const due30=allAmcs.filter(a=>{
      const nd=parseDate(a.nextPaymentDate);
      if(!nd)return false;
      const diff=(nd-today)/(1000*60*60*24);
      return diff>=0&&diff<=30;
    });
    const svcDue30=allAmcs.filter(a=>{
      const nd=parseDate(a.nextServiceDate);
      if(!nd)return false;
      const diff=(nd-today)/(1000*60*60*24);
      return diff>=0&&diff<=30;
    });
    const expired=allAmcs.filter(a=>a.status==="EXPIRED").length;
    return {income,active:active.length,due30:due30.length,svcDue30:svcDue30.length,expired,total:allAmcs.length};
  },[filteredAmcs,allAmcs]);

  /* ── Monthly billed vs paid bar chart (for FY, from saved bills) ── */
  const monthlyData=useMemo(()=>{
    const byMonth=Object.fromEntries((billingFY?.monthly||[]).map(p=>[p.month,p]));
    return MONTHS.map((m,i)=>{
      const calMonth=(FY_START_MONTH+i)%12;
      const calYear=calMonth<FY_START_MONTH?chartFY+1:chartFY;
      const p=byMonth[`${calYear}-${pad(calMonth+1)}`];
      return {month:m,billed:Number(p?.billed)||0,paid:Number(p?.paid)||0};
    });
  },[billingFY,chartFY]);

  /* ── Status breakdown pie ── */
  const statusData=useMemo(()=>{
    const map={};
    filteredAmcs.forEach(a=>{const k=a.status||"UNKNOWN";map[k]=(map[k]||0)+1});
    return Object.entries(map).map(([name,value])=>({name,value}));
  },[filteredAmcs]);

  const PIE_COLORS={"ACTIVE":"#1e5aa8","EXPIRED":"#e05151","PENDING":"#d9a441","CANCELLED":"#8a94a1"};

  /* ── AMC due soon list ── */
  const amcDueList=useMemo(()=>{
    const today=new Date();
    return allAmcs
      .filter(a=>{const nd=parseDate(a.nextPaymentDate);if(!nd)return false;const d=(nd-today)/(86400000);return d>=0&&d<=30;})
      .sort((a,b)=>new Date(a.nextPaymentDate)-new Date(b.nextPaymentDate))
      .slice(0,8);
  },[allAmcs]);

  /* ── Service due soon list ── */
  const svcDueList=useMemo(()=>{
    const today=new Date();
    return allAmcs
      .filter(a=>{const nd=parseDate(a.nextServiceDate);if(!nd)return false;const d=(nd-today)/(86400000);return d>=0&&d<=30;})
      .sort((a,b)=>new Date(a.nextServiceDate)-new Date(b.nextServiceDate))
      .slice(0,8);
  },[allAmcs]);

  /* ── Available FYs ── */
  const fyYears=useMemo(()=>{
    const fy=currentFY();
    return [fy-2,fy-1,fy,fy+1];
  },[]);

  if(loading)return <section className="page"><div className="loading">Loading dashboard…</div></section>;

  return <section className="page">
    {/* ── Header ── */}
    <div className="page-head">
      <div>
        <span className="eyebrow">OVERVIEW</span>
        <h1>Dashboard</h1>
        <p className="muted">Apollo Elevator · service operations at a glance</p>
      </div>
      <Link className="primary" to="/app/customers/new">+ Add customer</Link>
    </div>

    {err&&<div className="alert error">{err}</div>}

    {/* ── Filter bar ── */}
    <div className="dash-filter">
      <div className="segmented" style={{marginBottom:0,width:"auto"}}>
        <button className={filterMode==="fy"?"selected":""} onClick={()=>setFilterMode("fy")}>By Financial Year</button>
        <button className={filterMode==="month"?"selected":""} onClick={()=>setFilterMode("month")}>By Month</button>
      </div>
      {filterMode==="fy"
        ? <div className="segmented" style={{marginBottom:0,width:"auto"}}>
            {fyYears.map(y=><button key={y} className={selectedFY===y?"selected":""} onClick={()=>setSelectedFY(y)}>{fyLabel(y)}</button>)}
          </div>
        : <div className="dash-month-pick">
            <select value={selYear} onChange={e=>setSelYear(Number(e.target.value))}>
              {[currentFY(),currentFY()+1].flatMap(fy=>[fy,fy+1]).filter((v,i,a)=>a.indexOf(v)===i).map(y=><option key={y}>{y}</option>)}
            </select>
            <select value={selMonth} onChange={e=>setSelMonth(Number(e.target.value))}>
              {Array.from({length:12},(_,i)=><option key={i} value={i}>{new Date(2000,i).toLocaleString("en-IN",{month:"long"})}</option>)}
            </select>
          </div>
      }
    </div>

    {/* ── KPI cards ── */}
    <div className="kpi-grid">
      <KpiCard icon={IndianRupee} label="In bank (paid)" value={fmt(billing?.paid)} sub={`${billing?.paidCount||0} paid bill(s) · incl. GST`} color="green"/>
      <KpiCard icon={TrendingUp} label="Billed" value={fmt(billing?.billed)} sub={`${billing?.billCount||0} bill(s) raised · incl. GST`} color="blue"/>
      <KpiCard icon={Clock} label="Outstanding" value={fmt(billing?.outstanding)} sub="Billed, not yet paid" color="amber"/>
      <KpiCard icon={CalendarClock} label="Projected income" value={fmt(billing?.projected)} sub={`Outstanding + ${fmt(billing?.projectedInstalments)} unbilled instalments`} color="blue"/>
      <KpiCard icon={Building2} label="AMC contract value" value={fmt(kpis.income)} sub={`Active AMCs · ${filterMode==="fy"?fyLabel(selectedFY):"selected month"}`} color="blue"/>
      <KpiCard icon={CheckCircle} label="Active AMCs" value={kpis.active} sub="in selected period" color="green"/>
      <KpiCard icon={AlertCircle} label="Payments due (30d)" value={kpis.due30} sub="Next payment approaching" color="amber"/>
      <KpiCard icon={Clock} label="Services due (30d)" value={kpis.svcDue30} sub="Next service approaching" color="amber"/>
      <KpiCard icon={XCircle} label="Expired AMCs" value={kpis.expired} sub="All time" color="red"/>
      <KpiCard icon={Users} label="Total customers" value={allCustomers.length} sub="All records" color="blue"/>
      <KpiCard icon={MessageSquare} label="New enquiries" value={newEnquiryCount} sub="Awaiting response" color="amber"/>
    </div>

    {/* ── Charts row ── */}
    <div className="charts-row">
      <div className="panel" style={{flex:2}}>
        <div className="panel-head"><h2>Billed vs received ({fyLabel(chartFY)})</h2><Link to="/app/bills">Bills <ArrowRight size={14}/></Link></div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={monthlyData} margin={{top:5,right:10,left:0,bottom:0}}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
            <XAxis dataKey="month" tick={{fontSize:11}}/>
            <YAxis tickFormatter={v=>v>=1000?`${(v/1000).toFixed(0)}k`:v} tick={{fontSize:11}} width={48}/>
            <Tooltip formatter={(v,name)=>[`₹${Number(v).toLocaleString("en-IN")}`,name]}/>
            <Legend wrapperStyle={{fontSize:12}}/>
            <Bar dataKey="billed" name="Billed" fill="#1e5aa8" radius={[4,4,0,0]}/>
            <Bar dataKey="paid" name="Paid (in bank)" fill="#2e9a5c" radius={[4,4,0,0]}/>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="panel" style={{flex:1}}>
        <div className="panel-head"><h2>AMC Status</h2></div>
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie data={statusData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value" label={({name,percent})=>`${name} ${(percent*100).toFixed(0)}%`} labelLine={false}>
              {statusData.map((entry,i)=><Cell key={i} fill={PIE_COLORS[entry.name]||"#ccc"}/>)}
            </Pie>
            <Tooltip/>
          </PieChart>
        </ResponsiveContainer>
        <div className="pie-legend">
          {statusData.map(s=><span key={s.name} className="pie-dot" style={{"--c":PIE_COLORS[s.name]||"#ccc"}}>{s.name} ({s.value})</span>)}
        </div>
      </div>
    </div>

    {/* ── Due tables row ── */}
    <div className="due-row">
      <div className="panel" style={{flex:1}}>
        <div className="panel-head"><h2>💳 AMC Payments due (next 30 days)</h2></div>
        <DueTable rows={amcDueList} dateKey="nextPaymentDate" emptyMsg="No payments due in next 30 days"
          action={a=>a.id&&<Link className="table-link" to={`/app/bills?customerId=${a.customerId}&customerName=${encodeURIComponent(a.customerName)}&amcContractId=${a.id}`}>Bill</Link>}/>
      </div>
      <div className="panel" style={{flex:1}}>
        <div className="panel-head"><h2>🔧 Services due (next 30 days)</h2></div>
        <DueTable rows={svcDueList} dateKey="nextServiceDate" emptyMsg="No services due in next 30 days"/>
      </div>
    </div>

    {/* ── Recent enquiries ── */}
    <div className="panel">
      <div className="panel-head">
        <div><h2>Recent enquiries</h2><span className="muted">Contact & quote requests from the website</span></div>
        <Link to="/app/enquiries" style={{display:"flex",alignItems:"center",gap:5,color:"var(--blue)",textDecoration:"none",fontSize:13}}>View all <ArrowRight size={16}/></Link>
      </div>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Name</th><th>Phone</th><th>Type</th><th>Status</th><th>Created</th><th></th></tr></thead>
          <tbody>
            {recentEnquiries.map(i=>
              <tr key={i.id}>
                <td><b>{i.fullName}</b><small>{i.email||"—"}</small></td>
                <td>{i.phoneNumber}</td>
                <td>{i.inquiryType}</td>
                <td><span className={`status ${i.status==="NEW"?"pending":i.status==="CLOSED"?"active":""}`}>{i.status?.replace("_"," ")}</span></td>
                <td>{i.createdAt?new Date(i.createdAt).toLocaleDateString():"—"}</td>
                <td><Link className="table-link" to="/app/enquiries">Respond</Link></td>
              </tr>
            )}
            {!recentEnquiries.length&&<tr><td colSpan="6" className="empty">No enquiries yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>

    {/* ── Recent customers ── */}
    <div className="panel">
      <div className="panel-head">
        <div><h2>Recent customers</h2><span className="muted">Latest records</span></div>
        <Link to="/app/customers" style={{display:"flex",alignItems:"center",gap:5,color:"var(--blue)",textDecoration:"none",fontSize:13}}>View all <ArrowRight size={16}/></Link>
      </div>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Customer</th><th>Mobile</th><th>City</th><th>Lifts</th><th>Active AMCs</th><th></th></tr></thead>
          <tbody>
            {allCustomers.slice(0,6).map(c=>{
              const activeAmc=(c.lifts||[]).flatMap(l=>l.amcDetails||[]).filter(a=>a.status==="ACTIVE").length;
              return <tr key={c.id}>
                <td><b>{c.customerName}</b><small>{c.customerCode||"—"}</small></td>
                <td>{c.mobileNumber}</td>
                <td>{c.city||"—"}</td>
                <td>{c.lifts?.length||0}</td>
                <td><span className={`status ${activeAmc?"active":"pending"}`}>{activeAmc}</span></td>
                <td><Link className="table-link" to={`/app/customers/${c.id}`}>Open</Link></td>
              </tr>;
            })}
            {!allCustomers.length&&<tr><td colSpan="6" className="empty">No customers found.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  </section>;
}

function KpiCard({icon:Icon,label,value,sub,color}){
  const colors={blue:["#edf3fb","#1e5aa8"],green:["#eaf7ef","#217746"],amber:["#fff5dd","#986e18"],red:["#faecec","#a33838"]};
  const [bg,fg]=colors[color]||colors.blue;
  return <div className="kpi-card">
    <div className="kpi-icon" style={{background:bg,color:fg}}><Icon size={20}/></div>
    <div>
      <div className="kpi-value">{value}</div>
      <div className="kpi-label">{label}</div>
      <div className="kpi-sub">{sub}</div>
    </div>
  </div>;
}

function DueTable({rows,dateKey,emptyMsg,action}){
  if(!rows.length)return <div className="empty">{emptyMsg}</div>;
  const today=new Date();
  return <div className="table-wrap">
    <table>
      <thead><tr><th>Customer</th><th>Contract</th><th>Date</th><th>Days</th>{action&&<th></th>}</tr></thead>
      <tbody>{rows.map((a,i)=>{
        const d=parseDate(a[dateKey]);
        const days=d?Math.round((d-today)/86400000):null;
        return <tr key={i}>
          <td><Link className="table-link" to={`/app/customers/${a.customerId}`}><b>{a.customerName}</b></Link></td>
          <td><small>{a.contractNumber||"—"}</small></td>
          <td>{d?d.toLocaleDateString("en-IN"):"—"}</td>
          <td><span className={`status ${days<=7?"expired":days<=14?"pending":"active"}`}>{days!=null?`${days}d`:"—"}</span></td>
          {action&&<td>{action(a)}</td>}
        </tr>;
      })}</tbody>
    </table>
  </div>;
}
