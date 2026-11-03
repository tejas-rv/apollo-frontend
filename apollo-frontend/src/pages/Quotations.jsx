import React,{useEffect,useState} from "react";
import {Link} from "react-router-dom";
import {ArrowRight,Check,Plus,Search} from "lucide-react";
import {api} from "../services/api";
import {validateAmount} from "../utils/validation";

const STATUSES=["DRAFT","SENT","ACCEPTED","REJECTED","EXPIRED"];
const emptyPage={content:[],totalPages:0,totalElements:0};

function nextStatuses(status){
  if(status==="DRAFT")return ["SENT","REJECTED"];
  if(status==="SENT")return ["ACCEPTED","REJECTED","EXPIRED"];
  return [];
}

export default function Quotations(){
  const [tab,setTab]=useState("pending"),[query,setQuery]=useState(""),[status,setStatus]=useState("");
  const [pending,setPending]=useState(emptyPage),[data,setData]=useState(emptyPage),[page,setPage]=useState(0);
  const [selected,setSelected]=useState(null),[amount,setAmount]=useState(""),[notes,setNotes]=useState("");
  const [loading,setLoading]=useState(false),[saving,setSaving]=useState(false),[error,setError]=useState(""),[message,setMessage]=useState("");

  async function load(){
    setLoading(true);setError("");
    try{
      if(tab==="pending")setPending(await api.pendingQuotations({query,page,size:10}));
      else setData(await api.quotations({query,status,page,size:10}));
    }catch(e){setError(e.message)}
    finally{setLoading(false)}
  }
  useEffect(()=>{const timer=setTimeout(load,250);return()=>clearTimeout(timer)},[tab,query,status,page]);

  function chooseTab(next){setTab(next);setPage(0);setMessage("");setError("")}
  async function create(e){
    e.preventDefault();if(!selected)return;
    const invalid=validateAmount(amount,{required:true,label:"Quotation amount",allowZero:false,max:100000000});
    if(invalid){setError(invalid);return}
    setSaving(true);setError("");setMessage("");
    try{
      const created=await api.createQuotation({enquiryId:selected.id,amount:Number(amount),notes:notes.trim()||null});
      setMessage(`Quotation ${created.quotationNumber} created as a draft.`);
      setSelected(null);setAmount("");setNotes("");setPage(0);load();
    }catch(x){setError(x.message)}
    finally{setSaving(false)}
  }
  async function updateStatus(item,next){
    setError("");setMessage("");
    try{await api.updateQuotationStatus(item.id,next);setMessage(`Quotation ${item.quotationNumber} updated to ${next}.`);load()}
    catch(e){setError(e.message)}
  }
  async function convertToWorkOrder(item){
    setError("");setMessage("");
    try{
      const result=await api.convertEnquiryToWorkOrder(item.enquiryId);
      setMessage(`Work order created for enquiry #${result.enquiryId}.`);
      load();
    }catch(e){setError(e.message)}
  }

  const current=tab==="pending"?pending:data;
  return <section className="page">
    <div className="page-head"><div><span className="eyebrow">SALES</span><h1>Quotations</h1><p className="muted">Prepare offers for enquiries and track customer decisions.</p></div><Link className="secondary" to="/app/work-orders">View work orders <ArrowRight size={16}/></Link></div>
    {error&&<div className="alert error">{error}</div>}{message&&<div className="alert success">{message}</div>}
    <div className="tabs">
      <button className={tab==="pending"?"selected":""} onClick={()=>chooseTab("pending")}>Ready for quotation</button>
      <button className={tab==="all"?"selected":""} onClick={()=>chooseTab("all")}>All quotations</button>
    </div>
    <div className="toolbar" style={{display:"flex",gap:12,alignItems:"center",flexWrap:"wrap"}}>
      <div className="search" style={{flex:"1 1 260px"}}><Search size={18}/><input aria-label="Search quotations" placeholder="Search name, phone or requirement…" value={query} onChange={e=>{setQuery(e.target.value);setPage(0)}}/></div>
      {tab==="all"&&<select className="bill-select" style={{maxWidth:180}} value={status} onChange={e=>{setStatus(e.target.value);setPage(0)}}><option value="">All quotation statuses</option>{STATUSES.map(s=><option key={s}>{s}</option>)}</select>}
    </div>
    {tab==="pending"?<div className="panel">
      <div className="table-wrap"><table><thead><tr><th>Enquiry</th><th>Contact</th><th>Requirement</th><th>Enquiry status</th><th></th></tr></thead><tbody>
        {pending.content?.map(item=><tr key={item.id}><td><b>#{item.id} · {item.fullName}</b></td><td>{item.phoneNumber}</td><td>{item.requirementType||"—"}</td><td><span className="status pending">{item.status?.replace("_"," ")}</span></td><td><button className="primary small" onClick={()=>{setSelected(item);setAmount("");setNotes("")}}><Plus size={15}/>Create quotation</button></td></tr>)}
        {!loading&&!pending.content?.length&&<tr><td colSpan="5" className="empty">No enquiries are waiting for a quotation.</td></tr>}
      </tbody></table></div><Pagination page={page} data={pending} setPage={setPage} loading={loading}/>
    </div>:<div className="panel">
      <div className="table-wrap"><table><thead><tr><th>Quotation</th><th>Customer</th><th>Requirement</th><th>Amount</th><th>Status</th><th>Created</th><th>Actions</th></tr></thead><tbody>
        {data.content?.map(item=><tr key={item.id}><td><b>{item.quotationNumber}</b><small>Enquiry #{item.enquiryId}</small></td><td>{item.customerName}<small>{item.phoneNumber}</small></td><td>{item.requirementType||"—"}</td><td>₹{Number(item.amount||0).toLocaleString("en-IN")}</td><td><span className={`status ${item.status==="ACCEPTED"?"active":item.status==="REJECTED"||item.status==="EXPIRED"?"expired":"pending"}`}>{item.status}</span></td><td>{item.createdAt?new Date(item.createdAt).toLocaleDateString():"—"}</td><td><div className="actions">{nextStatuses(item.status).map(next=><button key={next} className="secondary small" onClick={()=>updateStatus(item,next)}>{next}</button>)}{item.status==="ACCEPTED"&&item.enquiryStatus==="IN_PROGRESS"&&<button className="primary small" onClick={()=>convertToWorkOrder(item)}><Check size={14}/>Create work order</button>}</div></td></tr>)}
        {!loading&&!data.content?.length&&<tr><td colSpan="7" className="empty">No quotations match these filters.</td></tr>}
      </tbody></table></div><Pagination page={page} data={data} setPage={setPage} loading={loading}/>
    </div>}
    {selected&&<div className="modal-backdrop" onClick={()=>setSelected(null)}><div className="panel modal-card" onClick={e=>e.stopPropagation()}>
      <div className="panel-head"><div><h2>Create quotation</h2><p className="muted">Enquiry #{selected.id} · {selected.fullName}</p></div><button className="icon-btn" onClick={()=>setSelected(null)}>Close</button></div>
      {error&&<div className="alert error">{error}</div>}
      <form className="form" onSubmit={create}><label>Quotation amount (₹) *<input type="number" min="0.01" max="100000000" step="0.01" required value={amount} onChange={e=>setAmount(e.target.value)}/></label><label>Notes<textarea rows="4" maxLength="2000" value={notes} onChange={e=>setNotes(e.target.value)}/></label><div className="form-actions"><button type="button" className="secondary" onClick={()=>setSelected(null)}>Cancel</button><button className="primary" disabled={saving}>{saving?"Creating…":"Create draft"}</button></div></form>
    </div></div>}
  </section>;
}

function Pagination({page,data,setPage,loading}){
  return <div className="pagination"><button disabled={page===0||loading} onClick={()=>setPage(page-1)}>Previous</button><span>Page {page+1} of {Math.max(data.totalPages||1,1)}</span><button disabled={loading||page+1>=(data.totalPages||0)} onClick={()=>setPage(page+1)}>Next</button></div>;
}
