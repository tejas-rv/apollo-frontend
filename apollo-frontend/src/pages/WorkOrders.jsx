import React,{useEffect,useState} from "react";
import {Link} from "react-router-dom";
import {Search} from "lucide-react";
import {api} from "../services/api";
import {HINTS,HTML_PATTERNS,collectErrors,normalizeMobile,normalizePincode,validateAddress,validateEmail,validateMobile,validateName,validatePincode} from "../utils/validation";

const STATUSES=["ACTIVE","APPROVED","COMPLETED","CANCELLED"];
const EMPTY={content:[],totalPages:0,totalElements:0};

export default function WorkOrders(){
  const [query,setQuery]=useState(""),[status,setStatus]=useState(""),[page,setPage]=useState(0);
  const [data,setData]=useState(EMPTY),[selected,setSelected]=useState(null),[form,setForm]=useState(null);
  const [loading,setLoading]=useState(false),[saving,setSaving]=useState(false),[error,setError]=useState(""),[message,setMessage]=useState("");
  const [fieldErrors,setFieldErrors]=useState({});

  async function load(){
    setLoading(true);setError("");
    try{setData(await api.workOrders({query,status,page,size:10}))}
    catch(e){setError(e.message)}
    finally{setLoading(false)}
  }
  useEffect(()=>{const timer=setTimeout(load,250);return()=>clearTimeout(timer)},[query,status,page]);

  async function openConversion(order){
    setError("");setMessage("");
    try{
      const inquiry=await api.adminEnquiry(order.enquiryId);
      setSelected({order,inquiry});
      setFieldErrors({});
      setForm({
        customerName:inquiry.fullName||"",
        mobileNumber:normalizeMobile(inquiry.phoneNumber),
        email:inquiry.email||"",
        city:inquiry.city||"",
        state:"",
        address:"",
        pincode:"",
        liftType:"PASSENGER",
        driveType:"TRACTION",
        numberOfFloors:1,
        capacityInPersons:6,
        capacityInKg:""
      });
    }catch(e){setError(e.message)}
  }
  function setField(name,value){setForm(current=>({...current,[name]:value}))}
  async function convert(e){
    e.preventDefault();if(!selected||!form)return;
    const errs=collectErrors({
      customerName:validateName(form.customerName,{required:true,label:"Customer name",strict:false}),
      mobileNumber:validateMobile(form.mobileNumber,{required:true}),
      email:validateEmail(form.email),
      city:validateName(form.city,{label:"City"}),
      state:validateName(form.state,{label:"State"}),
      pincode:validatePincode(form.pincode),
      address:validateAddress(form.address),
    });
    setFieldErrors(errs);
    if(Object.keys(errs).length){setError(`Please fix the highlighted fields: ${Object.values(errs)[0]}`);return}
    setSaving(true);setError("");
    const lift={
      liftType:form.liftType,
      driveType:form.driveType,
      numberOfFloors:Number(form.numberOfFloors),
      capacityInPersons:form.liftType==="PASSENGER"?Number(form.capacityInPersons)||null:null,
      capacityInKg:["GOODS","HOSPITAL","CAR"].includes(form.liftType)?Number(form.capacityInKg)||null:null
    };
    try{
      const result=await api.convertEnquiryToCustomer(selected.inquiry.id,{
        customerName:form.customerName.trim(),
        mobileNumber:normalizeMobile(form.mobileNumber),
        email:form.email.trim()||null,
        city:form.city.trim()||null,
        state:form.state.trim()||null,
        address:form.address.trim()||null,
        pincode:normalizePincode(form.pincode)||null,
        lifts:[lift]
      });
      setSelected(null);setMessage(`Customer created from enquiry #${result.enquiryId}.`);
      load();
    }catch(x){setError(x.message)}
    finally{setSaving(false)}
  }

  return <section className="page">
    <div className="page-head"><div><span className="eyebrow">OPERATIONS</span><h1>Work orders</h1><p className="muted">{data.totalElements||0} work orders · accepted quotations can be converted from <Link to="/app/quotations">Quotations</Link>.</p></div></div>
    {error&&<div className="alert error">{error}</div>}{message&&<div className="alert success">{message}</div>}
    <div className="toolbar" style={{display:"flex",gap:12,alignItems:"center",flexWrap:"wrap"}}>
      <div className="search" style={{flex:"1 1 260px"}}><Search size={18}/><input aria-label="Search work orders" placeholder="Search work orders…" value={query} onChange={e=>{setQuery(e.target.value);setPage(0)}}/></div>
      <select className="bill-select" style={{maxWidth:180}} value={status} onChange={e=>{setStatus(e.target.value);setPage(0)}}><option value="">All statuses</option>{STATUSES.map(s=><option key={s}>{s}</option>)}</select>
    </div>
    <div className="panel"><div className="table-wrap"><table><thead><tr><th>Work order</th><th>Enquiry</th><th>Quotation</th><th>Status</th><th>Created</th><th></th></tr></thead><tbody>
      {data.content?.map(order=><tr key={order.id}><td><b>{order.workOrderNumber}</b><small>#{order.id}</small></td><td>#{order.enquiryId}</td><td>#{order.quotationId}</td><td><span className={`status ${order.status==="COMPLETED"?"active":order.status==="CANCELLED"?"expired":"pending"}`}>{order.status}</span></td><td>{order.createdAt?new Date(order.createdAt).toLocaleDateString():"—"}</td><td>{["ACTIVE","APPROVED"].includes(order.status)&&<button className="primary small" onClick={()=>openConversion(order)}>Convert to customer</button>}</td></tr>)}
      {!loading&&!data.content?.length&&<tr><td colSpan="6" className="empty">No work orders match these filters.</td></tr>}
    </tbody></table></div><div className="pagination"><button disabled={page===0||loading} onClick={()=>setPage(page-1)}>Previous</button><span>Page {page+1} of {Math.max(data.totalPages||1,1)}</span><button disabled={loading||page+1>=(data.totalPages||0)} onClick={()=>setPage(page+1)}>Next</button></div></div>
    {selected&&form&&<div className="modal-backdrop" onClick={()=>setSelected(null)}><div className="panel modal-card" onClick={e=>e.stopPropagation()}>
      <div className="panel-head"><div><h2>Convert to customer</h2><p className="muted">Work order {selected.order.workOrderNumber} · enquiry #{selected.inquiry.id}</p></div><button className="icon-btn" onClick={()=>setSelected(null)}>Close</button></div>
      {error&&<div className="alert error">{error}</div>}
      <form className="form" onSubmit={convert}>
        <div className="form-grid">
          <label>Customer name *<input required maxLength="100" value={form.customerName} aria-invalid={!!fieldErrors.customerName} onChange={e=>setField("customerName",e.target.value)}/><FieldMsg msg={fieldErrors.customerName}/></label>
          <label>Mobile number *<input required type="tel" inputMode="numeric" maxLength="13" placeholder="98765 43210" value={form.mobileNumber} aria-invalid={!!fieldErrors.mobileNumber} onChange={e=>setField("mobileNumber",e.target.value)}/><FieldMsg msg={fieldErrors.mobileNumber} hint={HINTS.mobile}/></label>
          <label>Email<input type="email" maxLength="150" pattern={HTML_PATTERNS.email} value={form.email} aria-invalid={!!fieldErrors.email} onChange={e=>setField("email",e.target.value)}/><FieldMsg msg={fieldErrors.email}/></label>
          <label>City<input maxLength="100" value={form.city} aria-invalid={!!fieldErrors.city} onChange={e=>setField("city",e.target.value)}/><FieldMsg msg={fieldErrors.city}/></label>
          <label>State<input maxLength="100" value={form.state} aria-invalid={!!fieldErrors.state} onChange={e=>setField("state",e.target.value)}/><FieldMsg msg={fieldErrors.state}/></label>
          <label>Pincode<input inputMode="numeric" maxLength="6" pattern={HTML_PATTERNS.pincode} value={form.pincode} aria-invalid={!!fieldErrors.pincode} onChange={e=>setField("pincode",e.target.value.replace(/\D/g,""))}/><FieldMsg msg={fieldErrors.pincode} hint={HINTS.pincode}/></label>
          <label style={{gridColumn:"1/-1"}}>Address<textarea rows="2" maxLength="500" value={form.address} aria-invalid={!!fieldErrors.address} onChange={e=>setField("address",e.target.value)}/><FieldMsg msg={fieldErrors.address}/></label>
        </div>
        <h3 className="section-sub">Initial lift details</h3>
        <div className="form-grid">
          <label>Lift type<select value={form.liftType} onChange={e=>setField("liftType",e.target.value)}>{["PASSENGER","GOODS","HOSPITAL","HOME","CAR","OTHER"].map(v=><option key={v}>{v}</option>)}</select></label>
          <label>Drive type<select value={form.driveType} onChange={e=>setField("driveType",e.target.value)}>{["TRACTION","MRL","HYDRAULIC","OTHER"].map(v=><option key={v}>{v}</option>)}</select></label>
          <label>Floors *<input type="number" min="1" max="200" required value={form.numberOfFloors} onChange={e=>setField("numberOfFloors",e.target.value)}/></label>
          {form.liftType==="PASSENGER"&&<label>Capacity (persons) *<input type="number" min="1" max="100" required value={form.capacityInPersons} onChange={e=>setField("capacityInPersons",e.target.value)}/></label>}
          {["GOODS","HOSPITAL","CAR"].includes(form.liftType)&&<label>Capacity (kg) *<input type="number" min="1" max="20000" required value={form.capacityInKg} onChange={e=>setField("capacityInKg",e.target.value)}/></label>}
        </div>
        <div className="form-actions"><button type="button" className="secondary" onClick={()=>setSelected(null)}>Cancel</button><button className="primary" disabled={saving}>{saving?"Converting…":"Create customer"}</button></div>
      </form>
    </div></div>}
  </section>;
}

function FieldMsg({msg,hint}){
  return msg?<small className="field-error">{msg}</small>:hint?<small className="field-hint">{hint}</small>:null;
}
