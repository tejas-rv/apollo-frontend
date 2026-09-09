import React,{useEffect,useState} from "react"; import {Search,Eye,Pencil,Check,X} from "lucide-react"; import {api} from "../services/api";

const STATUSES=["NEW","IN_PROGRESS","CONTACTED","CLOSED"];

export default function Enquiries(){
  const [q,setQ]=useState(""),[status,setStatus]=useState(""),[from,setFrom]=useState(""),[to,setTo]=useState("");
  const [data,setData]=useState({content:[],totalPages:0,totalElements:0}),[page,setPage]=useState(0),[error,setError]=useState("");
  const [selected,setSelected]=useState(null),[savingStatus,setSavingStatus]=useState(false);
  const [editingId,setEditingId]=useState(null),[editValue,setEditValue]=useState(""),[rowSaving,setRowSaving]=useState(null);

  const load=()=>api.adminEnquiries({name:q,phone:q,status,from,to,page,size:10}).then(setData).catch(e=>setError(e.message));
  useEffect(()=>{load()},[page,status,from,to]);
  useEffect(()=>{const t=setTimeout(()=>{setPage(0);load()},300);return()=>clearTimeout(t)},[q]);

  async function openDetail(id){
    try{const detail=await api.adminEnquiry(id);setSelected(detail);}catch(e){setError(e.message);}
  }

  async function changeStatus(newStatus){
    if(!selected)return;
    setSavingStatus(true);
    try{
      const updated=await api.updateEnquiryStatus(selected.id,newStatus);
      setSelected(updated);
      load();
    }catch(e){setError(e.message);}
    finally{setSavingStatus(false);}
  }

  function startEdit(i){setEditingId(i.id);setEditValue(i.status);}
  function cancelEdit(){setEditingId(null);}

  async function saveRowStatus(id){
    setRowSaving(id);
    try{
      await api.updateEnquiryStatus(id,editValue);
      setEditingId(null);
      load();
    }catch(e){setError(e.message);}
    finally{setRowSaving(null);}
  }

  return <section className="page">
    <div className="page-head">
      <div><span className="eyebrow">MANAGEMENT</span><h1>Enquiries</h1><p className="muted">{data.totalElements||0} inquiry records</p></div>
    </div>
    {error&&<div className="alert error">{error}</div>}
    <div className="toolbar" style={{display:"flex",gap:12,flexWrap:"wrap",alignItems:"center"}}>
      <div className="search" style={{flex:"1 1 260px"}}><Search size={18}/><input placeholder="Search by name or phone…" value={q} onChange={e=>setQ(e.target.value)}/></div>
      <select className="bill-select" style={{maxWidth:180}} value={status} onChange={e=>{setStatus(e.target.value);setPage(0)}}>
        <option value="">All statuses</option>
        {STATUSES.map(s=><option key={s} value={s}>{s.replace("_"," ")}</option>)}
      </select>
      <input className="bill-input" style={{maxWidth:160}} type="date" value={from} onChange={e=>{setFrom(e.target.value);setPage(0)}}/>
      <input className="bill-input" style={{maxWidth:160}} type="date" value={to} onChange={e=>{setTo(e.target.value);setPage(0)}}/>
    </div>
    <div className="panel">
      <div className="table-wrap">
        <table>
          <thead><tr><th>Inquiry ID</th><th>Name</th><th>Phone</th><th>Email</th><th>Type</th><th>Status</th><th>Created</th><th></th></tr></thead>
          <tbody>
            {data.content?.map(i=>
              <tr key={i.id}>
                <td>#{i.id}</td>
                <td><b>{i.fullName}</b></td>
                <td>{i.phoneNumber}</td>
                <td>{i.email||"—"}</td>
                <td>{i.inquiryType}</td>
                <td>
                  {editingId===i.id
                    ? <div style={{display:"flex",gap:6,alignItems:"center"}}>
                        <select
                          className="bill-select"
                          style={{maxWidth:150,padding:"6px 8px",fontSize:12}}
                          value={editValue}
                          disabled={rowSaving===i.id}
                          onChange={e=>setEditValue(e.target.value)}
                          autoFocus
                        >
                          {STATUSES.map(s=><option key={s} value={s}>{s.replace("_"," ")}</option>)}
                        </select>
                        <button className="icon-btn" title="Save" disabled={rowSaving===i.id} onClick={()=>saveRowStatus(i.id)}><Check size={16}/></button>
                        <button className="icon-btn" title="Cancel" disabled={rowSaving===i.id} onClick={cancelEdit}><X size={16}/></button>
                      </div>
                    : <div style={{display:"flex",gap:8,alignItems:"center"}}>
                        <span className={`status ${i.status==="NEW"?"pending":i.status==="CLOSED"?"active":""}`}>{i.status?.replace("_"," ")}</span>
                        <button className="icon-btn" title="Edit status" onClick={()=>startEdit(i)}><Pencil size={14}/></button>
                      </div>
                  }
                </td>
                <td>{i.createdAt?new Date(i.createdAt).toLocaleDateString():"—"}</td>
                <td><div className="actions"><button className="danger-icon" style={{color:"var(--blue)"}} onClick={()=>openDetail(i.id)} title="View"><Eye size={16}/></button></div></td>
              </tr>
            )}
            {!data.content?.length&&<tr><td colSpan="8" className="empty">{q||status||from||to?"No inquiries match your filters.":"No enquiries yet."}</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="pagination">
        <button disabled={page===0} onClick={()=>setPage(page-1)}>Previous</button>
        <span>Page {page+1} of {Math.max(data.totalPages||1,1)}</span>
        <button disabled={page+1>=data.totalPages} onClick={()=>setPage(page+1)}>Next</button>
      </div>
    </div>

    {selected&&<div style={{position:"fixed",inset:0,background:"rgba(15,23,37,.4)",display:"grid",placeItems:"center",zIndex:50}} onClick={()=>setSelected(null)}>
      <div className="panel" style={{width:"min(520px,calc(100% - 32px))",margin:0}} onClick={e=>e.stopPropagation()}>
        <div className="panel-head"><h2 style={{margin:0}}>Inquiry #{selected.id}</h2><button className="icon-btn" onClick={()=>setSelected(null)}>Close</button></div>
        <dl className="detail-grid" style={{gridTemplateColumns:"110px 1fr",display:"grid",rowGap:10}}>
          <dt>Name</dt><dd>{selected.fullName}</dd>
          <dt>Phone</dt><dd>{selected.phoneNumber}</dd>
          <dt>Email</dt><dd>{selected.email||"—"}</dd>
          <dt>City</dt><dd>{selected.city||"—"}</dd>
          <dt>Type</dt><dd>{selected.inquiryType}</dd>
          <dt>Requirement</dt><dd>{selected.requirementType||"—"}</dd>
          <dt>Message</dt><dd>{selected.message||"—"}</dd>
          <dt>Source</dt><dd>{selected.sourcePage||"—"}</dd>
          <dt>Created</dt><dd>{selected.createdAt?new Date(selected.createdAt).toLocaleString():"—"}</dd>
          <dt>Last updated</dt><dd>{selected.updatedAt?new Date(selected.updatedAt).toLocaleString():"—"}</dd>
          <dt>Updated by</dt><dd>{selected.modifiedBy||"—"}</dd>
        </dl>
        <label style={{display:"grid",gap:7,marginTop:18,fontSize:12,fontWeight:600,color:"#4d5868"}}>
          Status
          <select className="bill-select" value={selected.status} disabled={savingStatus} onChange={e=>changeStatus(e.target.value)}>
            {STATUSES.map(s=><option key={s} value={s}>{s.replace("_"," ")}</option>)}
          </select>
        </label>
      </div>
    </div>}
  </section>;
}
