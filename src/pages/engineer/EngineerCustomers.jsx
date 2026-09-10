import React,{useEffect,useState} from "react";
import {Link} from "react-router-dom";
import {Search,ChevronLeft,ChevronRight} from "lucide-react";
import {api} from "../../services/api";

export default function EngineerCustomers(){
  const [customers,setCustomers]=useState([]);
  const [query,setQuery]=useState("");
  const [page,setPage]=useState(0);
  const [total,setTotal]=useState(0);
  const [loading,setLoading]=useState(false);
  const [err,setErr]=useState("");
  const SIZE=20;

  useEffect(()=>{
    setLoading(true);
    const t=setTimeout(()=>{
      api.engineerCustomers(query||null,page,SIZE)
        .then(d=>{setCustomers(d.content||[]);setTotal(d.totalElements||0);})
        .catch(e=>setErr(e.message))
        .finally(()=>setLoading(false));
    }, query?300:0);
    return()=>clearTimeout(t);
  },[query,page]);

  return <section className="page">
    <div className="page-head">
      <div><span className="eyebrow">CUSTOMERS</span><h1>Customers</h1><p className="muted">View-only access — no financial data shown.</p></div>
    </div>

    {err&&<div className="alert error">{err}</div>}

    <div className="toolbar">
      <div className="search">
        <Search size={16}/>
        <input placeholder="Search name, code, city…" value={query} onChange={e=>{setQuery(e.target.value);setPage(0);}}/>
      </div>
    </div>

    <div className="panel" style={{padding:0,overflow:"hidden"}}>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Customer</th><th>Code</th><th>Mobile</th><th>City</th><th>Lifts</th><th>Active AMCs</th><th></th></tr></thead>
          <tbody>
            {loading&&<tr><td colSpan="7" className="empty">Loading…</td></tr>}
            {!loading&&customers.length===0&&<tr><td colSpan="7" className="empty">No customers found.</td></tr>}
            {!loading&&customers.map(c=>{
              const activeAmcs=(c.lifts||[]).flatMap(l=>l.amcContracts||[]).filter(a=>a.status==="ACTIVE").length;
              return <tr key={c.id}>
                <td><b>{c.customerName}</b></td>
                <td><small>{c.customerCode||"—"}</small></td>
                <td>{c.mobileNumber}</td>
                <td>{c.city||"—"}</td>
                <td>{c.lifts?.length||0}</td>
                <td><span className={`status ${activeAmcs?"active":"pending"}`}>{activeAmcs}</span></td>
                <td><Link className="table-link" to={`/engineer/customers/${c.id}`}>View</Link></td>
              </tr>;
            })}
          </tbody>
        </table>
      </div>
    </div>

    <div className="pagination">
      <button disabled={page===0} onClick={()=>setPage(p=>p-1)}><ChevronLeft size={14}/></button>
      <span>Page {page+1} · {total} total</span>
      <button disabled={(page+1)*SIZE>=total} onClick={()=>setPage(p=>p+1)}><ChevronRight size={14}/></button>
    </div>
  </section>;
}
