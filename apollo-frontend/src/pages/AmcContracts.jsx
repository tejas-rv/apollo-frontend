import React,{useEffect,useState} from "react";
import {Link,useSearchParams} from "react-router-dom";
import {Search,Plus,Receipt,CheckCircle2,Pencil,FileText} from "lucide-react";
import {api} from "../services/api";
import {AMC_FREQUENCIES,AMC_TIERS,amcDatesFrom,isoToday,planPrice} from "../utils/amc";

const money=n=>"₹"+(Number(n)||0).toLocaleString("en-IN",{minimumFractionDigits:2,maximumFractionDigits:2});
const dmy=iso=>iso?iso.split("-").reverse().join("/"):"—";
const FREQ_LABEL=Object.fromEntries(AMC_FREQUENCIES);
const statusClass={ACTIVE:"paid",PENDING:"sent",EXPIRED:"cancelled",CANCELLED:"cancelled"};
const billLink=(customer,contractId)=>`/app/bills?customerId=${customer.id}&customerName=${encodeURIComponent(customer.customerName)}&amcContractId=${contractId}`;

export default function AmcContracts(){
  const [searchParams]=useSearchParams();
  const [query,setQuery]=useState("");
  const [customers,setCustomers]=useState([]);
  const [searching,setSearching]=useState(false);
  const [customer,setCustomer]=useState(null);
  const [plans,setPlans]=useState([]);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState("");
  const [created,setCreated]=useState(null);
  const [pdfLoading,setPdfLoading]=useState(null);

  async function viewPdf(contractId){
    setError("");setPdfLoading(contractId);
    try{
      const url=URL.createObjectURL(await api.amcContractPdf(customer.id,contractId));
      window.open(url,"_blank","noopener");
      setTimeout(()=>URL.revokeObjectURL(url),60_000);
    }catch(e){setError(e.message);}
    finally{setPdfLoading(null);}
  }

  useEffect(()=>{api.amcPlans().then(setPlans).catch(()=>setPlans([]));},[]);

  useEffect(()=>{
    const id=searchParams.get("customerId");
    if(id)selectCustomer({id:Number(id),customerName:searchParams.get("customerName")||""});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);

  useEffect(()=>{
    if(!query.trim()){setCustomers([]);return;}
    const t=setTimeout(()=>{
      setSearching(true);
      api.searchCustomers(query,0,10)
        .then(d=>setCustomers(d.content||[]))
        .catch(e=>setError(e.message))
        .finally(()=>setSearching(false));
    },300);
    return()=>clearTimeout(t);
  },[query]);

  async function selectCustomer(c){
    setError("");setCreated(null);setLoading(true);
    try{setCustomer(await api.customer(c.id));}
    catch(e){setError(e.message);}
    finally{setLoading(false);}
  }

  async function onCreated(result){
    setCreated(result);
    try{setCustomer(await api.customer(customer.id));}catch(e){setError(e.message);}
  }

  const lifts=customer?.lifts||[];

  return <section className="page">
    <div className="page-head">
      <div><span className="eyebrow">CONTRACTS</span><h1>AMC contracts</h1>
        <p className="muted">Add an AMC contract to a lift without an ACTIVE AMC. Choosing a plan fills in the amount and dates automatically.</p></div>
    </div>
    {error&&<div className="alert error">{error}</div>}

    <div className="panel">
      <h2 style={{marginBottom:16}}>Select customer</h2>
      <div className="search">
        <Search size={16}/>
        <input placeholder="Type name, code, mobile…" value={query} onChange={e=>setQuery(e.target.value)} autoFocus/>
      </div>
      {searching&&<div className="muted" style={{padding:"8px 0"}}>Searching…</div>}
      {!searching&&query.trim()&&!customers.length&&<div className="muted" style={{padding:"8px 0"}}>No customers found.</div>}
      {customers.length>0&&<div className="customer-pick-list">
        {customers.map(c=><div key={c.id} className="customer-pick-row">
          <div><b>{c.customerName}</b><span className="muted"> · {c.customerCode||"no code"}{c.mobileNumber?` · ${c.mobileNumber}`:""}</span></div>
          <button className="primary" disabled={loading} onClick={()=>{setQuery("");selectCustomer(c);}}>{loading?"Loading…":"Select"}</button>
        </div>)}
      </div>}
    </div>

    {customer&&<div className="panel">
      <div className="panel-head">
        <div><h2>{customer.customerName}</h2><p className="muted">{customer.customerCode||"no code"} · {lifts.length} lift(s)</p></div>
        <Link className="secondary small" to={`/app/customers/${customer.id}/edit`}><Pencil size={14}/> Edit customer</Link>
      </div>

      {created&&<div className="alert success">
        <CheckCircle2 size={16}/> Contract <b>{created.contractNumber}</b> created ({created.contractType}, {money(created.amcAmount)}/year).{" "}
        <Link to={billLink(customer,created.amcContractId)}>Create its bill →</Link>
      </div>}

      {!lifts.length&&<p className="muted">This customer has no lifts yet. <Link to={`/app/customers/${customer.id}/edit`}>Add a lift</Link> first, then come back to add its AMC.</p>}

      {lifts.map(lift=>{
        const contracts=lift.amcDetails||[];
        const active=contracts.find(a=>a.status==="ACTIVE");
        return <div className="lift-card" key={lift.id}>
          <div className="lift-head">
            <b>Lift {lift.serialNumber||`#${lift.id}`}</b>
            <span className="muted">{[lift.liftType,lift.brand,lift.numberOfFloors?`${lift.numberOfFloors} floors`:null].filter(Boolean).join(" · ")}</span>
          </div>
          {contracts.length>0&&<div className="amc-options" style={{marginBottom:12}}>
            {contracts.map(a=><div key={a.id} className="amc-option">
              <div>
                <b>{a.contractNumber||`Contract #${a.id}`}</b>
                <small>{a.contractType||"no plan"} · {a.amcAmount!=null?`${money(a.amcAmount)}/year`:"no amount"} · {FREQ_LABEL[a.paymentFrequency]||a.paymentFrequency||"—"}</small>
                <small>{dmy(a.startDate)} – {dmy(a.endDate)} · next payment {dmy(a.nextPaymentDate)} · next service {dmy(a.nextServiceDate)}</small>
              </div>
              <span className={`status ${statusClass[a.status]||"generated"}`}>{a.status||"—"}</span>
              <button type="button" className="secondary small" disabled={pdfLoading===a.id} onClick={()=>viewPdf(a.id)}><FileText size={14}/> {pdfLoading===a.id?"Opening…":"Contract PDF"}</button>
              {a.status==="ACTIVE"&&a.startDate&&<Link className="secondary small" to={billLink(customer,a.id)}><Receipt size={14}/> Bill</Link>}
            </div>)}
          </div>}
          {active
            ?<p className="muted">This lift has an ACTIVE AMC. To change it, edit the customer record.</p>
            :<NewContractForm key={`${lift.id}-${contracts.length}`} customerId={customer.id} lift={lift} plans={plans} onCreated={onCreated} onError={setError}/>}
        </div>;
      })}
    </div>}
  </section>;
}

function NewContractForm({customerId,lift,plans,onCreated,onError}){
  const [contractType,setContractType]=useState("SILVER");
  const [paymentFrequency,setPaymentFrequency]=useState("YEARLY");
  const [startDate,setStartDate]=useState(isoToday());
  const [contractNumber,setContractNumber]=useState("");
  const [saving,setSaving]=useState(false);

  const price=planPrice(plans,contractType);
  const dates=amcDatesFrom(startDate);
  const status=startDate>isoToday()?"PENDING":"ACTIVE";

  async function create(){
    if(!startDate){onError("Choose the AMC start date.");return;}
    if(contractNumber.trim().length>50){onError("Contract number must be at most 50 characters.");return;}
    onError("");setSaving(true);
    try{
      const result=await api.createAmcContract(customerId,{liftId:lift.id,contractType,paymentFrequency,startDate,
        contractNumber:contractNumber.trim()||null});
      onCreated(result);
    }catch(e){onError(e.message);}
    finally{setSaving(false);}
  }

  return <div className="form" style={{gap:0}}>
    <h3 className="section-sub" style={{marginTop:4}}>New AMC contract</h3>
    <div className="segmented" style={{maxWidth:560}}>
      {AMC_TIERS.map(t=><button type="button" key={t} className={contractType===t?"selected":""} onClick={()=>setContractType(t)}>
        {t} <small className="muted">{planPrice(plans,t)!=null?money(planPrice(plans,t)).replace(".00",""):""}</small>
      </button>)}
    </div>
    <h3 className="section-sub">Payment frequency</h3>
    <div className="segmented" style={{maxWidth:560}}>
      {AMC_FREQUENCIES.map(([f,l])=><button type="button" key={f} className={paymentFrequency===f?"selected":""} onClick={()=>setPaymentFrequency(f)}>{l}</button>)}
    </div>
    <div className="form-grid" style={{marginTop:14}}>
      <label>Start date<input type="date" value={startDate} onChange={e=>setStartDate(e.target.value)}/></label>
      <label>Contract number<input value={contractNumber} maxLength={50} placeholder="Auto-generated if blank" onChange={e=>setContractNumber(e.target.value)}/></label>
    </div>
    <div className="bill-summary" style={{marginTop:12}}>
      <div className="summary-row"><span>AMC amount (per year, before GST)</span><strong>{price!=null?money(price):"Plan price not set"}</strong></div>
      <div className="summary-row"><span>Period</span><strong>{dmy(startDate)} – {dmy(dates.endDate)}</strong></div>
      <div className="summary-row"><span>Next payment · Next service</span><strong>{dmy(dates.nextPaymentDate)} · {dmy(dates.nextServiceDate)}</strong></div>
      <div className="summary-row"><span>Status</span><strong>{status}</strong></div>
    </div>
    <div style={{display:"flex",justifyContent:"flex-end",marginTop:12}}>
      <button className="primary" disabled={saving||price==null} onClick={create}><Plus size={15}/>{saving?"Creating…":"Create AMC contract"}</button>
    </div>
  </div>;
}
