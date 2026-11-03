import React,{useCallback,useEffect,useMemo,useState} from "react";
import {Link,useSearchParams} from "react-router-dom";
import {Download,Eye,Search,FileText,Mail,MessageCircle,Send,Plus,Trash2,Pencil,RefreshCw,Lock,CheckCircle2,Undo2,XCircle,Save,Repeat} from "lucide-react";
import {api} from "../services/api";
import {
  HINTS,PATTERNS,collectErrors,normalizeMobile,upper,
  validateAddress,validateAmount,validateEmail,validateGstin,validateMobile,validateName,validatePan,validateRequired,
} from "../utils/validation";
import {AMC_FREQUENCIES as FREQUENCIES,AMC_TIERS as TIERS,isoToday} from "../utils/amc";

const round2=n=>Math.round((Number(n)||0)*100+Number.EPSILON*100)/100;
const money=n=>"₹"+(Number(n)||0).toLocaleString("en-IN",{minimumFractionDigits:2,maximumFractionDigits:2});
const rateLabel=n=>`${Number((Number(n)||0).toFixed(3))}%`;
const FREQ_LABEL=Object.fromEntries(FREQUENCIES);
const TYPE_LABEL={AMC:"AMC",AMC_INSTALMENT:"AMC instalment",MAINTENANCE:"Maintenance"};
/** yyyy-MM-dd -> dd/MM/yyyy */
const dmy=iso=>iso?iso.split("-").reverse().join("/"):"";
const isAmc=t=>t==="AMC"||t==="AMC_INSTALMENT";

/** "01 No" -> {qty:"01", unit:"No"}; mirrors backend leadingNumericToken. */
function splitQuantity(q){
  const s=String(q??"").trim();
  const i=s.indexOf(" ");
  return i>0?{qty:s.slice(0,i),unit:s.slice(i+1).trim()}:{qty:s,unit:""};
}
const lineAmount=item=>{
  const q=Number(item.qty),r=Number(item.rate);
  return Number.isFinite(q)&&Number.isFinite(r)&&item.qty!==""&&item.rate!==""?round2(q*r):0;
};

/** Same rounding as DocumentService.computeBillTotals. */
export function computeTotals(items,gstPercentage){
  const taxable=round2(items.reduce((s,i)=>s+lineAmount(i),0));
  const gst=round2(taxable*(Number(gstPercentage)||0)/100);
  const sgst=round2(gst/2);
  const cgst=round2(gst-sgst);
  return {taxable,sgst,cgst,total:round2(taxable+sgst+cgst),halfRate:(Number(gstPercentage)||0)/2};
}

function toForm(billRequest){
  return {
    bill:{...billRequest.bill,gstPercentage:billRequest.bill?.gstPercentage??18},
    billTo:{...billRequest.billTo},
    items:(billRequest.lineItems||[]).map(li=>({...splitQuantity(li.quantity),description:li.description||"",hsnCode:li.hsnCode||"",rate:li.rate??""})),
  };
}

function toRequest(form){
  const b=form.bill;
  return {
    entity:"APOLLO_ELEVATOR",
    bill:{
      invoiceNumber:b.invoiceNumber?.trim(),invoiceDate:b.invoiceDate?.trim(),state:b.state?.trim()||null,
      pincode:b.pincode?.trim()||null,mobile:normalizeMobile(b.mobile)||null,
      panNumber:upper(b.panNumber)||null,gstin:upper(b.gstin)||null,
      gstPercentage:Number(b.gstPercentage),
    },
    billTo:{...form.billTo,name:form.billTo.name?.trim(),gstin:upper(form.billTo.gstin)||null,address:form.billTo.address?.trim()||null},
    lineItems:form.items.map((it,i)=>({
      slNo:i+1,description:it.description.trim(),hsnCode:it.hsnCode.trim()||null,
      quantity:[it.qty.trim(),it.unit.trim()].filter(Boolean).join(" "),
      rate:Number(it.rate),amount:lineAmount(it),
    })),
  };
}

function validateForm(form){
  const b=form.bill,t=form.billTo;
  const errors=collectErrors({
    invoiceNumber:validateRequired(b.invoiceNumber,"Invoice number"),
    invoiceDate:validateRequired(b.invoiceDate,"Invoice date")||(PATTERNS.invoiceDate.test(b.invoiceDate.trim())?"":"Invoice date must be dd/MM/yyyy"),
    mobile:validateMobile(b.mobile,{label:"Mobile"}),
    pincode:b.pincode&&!/^[1-9]\d{2} ?\d{3}$/.test(b.pincode.trim())?`Pincode must be a valid ${HINTS.pincode}`:"",
    state:validateName(b.state,{label:"State"}),
    panNumber:validatePan(b.panNumber),
    gstin:validateGstin(b.gstin),
    gstPercentage:validateAmount(b.gstPercentage,{required:true,label:"GST %",max:100}),
    "billTo.name":validateRequired(t.name,"Customer name"),
    "billTo.gstin":validateGstin(t.gstin,{label:"Customer GSTIN"}),
    "billTo.state":validateName(t.state,{label:"State"}),
    "billTo.address":validateAddress(t.address),
  });
  if(!form.items.length)errors.items="Add at least one line item";
  form.items.forEach((it,i)=>{
    const n=`Line ${i+1}`;
    const msg=validateRequired(it.description,`${n} description`)
      ||(it.hsnCode&&!PATTERNS.hsn.test(it.hsnCode.trim())?`${n} HSN/SAC must be 4–8 digits`:"")
      ||validateAmount(it.qty,{required:true,label:`${n} quantity`,allowZero:false})
      ||validateAmount(it.rate,{required:true,label:`${n} rate`});
    if(msg)errors[`item.${i}`]=msg;
  });
  return errors;
}

function openBlob(blob){
  const url=URL.createObjectURL(blob);
  window.open(url,"_blank","noopener");
  setTimeout(()=>URL.revokeObjectURL(url),60_000);
}

export default function Bills(){
  const [searchParams]=useSearchParams();
  const [tab,setTab]=useState("new");
  const [nextInstalment,setNextInstalment]=useState(()=>{
    const customerId=Number(searchParams.get("customerId"));
    const contractId=Number(searchParams.get("amcContractId"));
    return customerId?{customerId,customerName:searchParams.get("customerName")||"",amcContractId:contractId||null,key:"url"}:null;
  }); // {customerId, customerName, amcContractId}
  const [plans,setPlans]=useState([]);
  const loadPlans=useCallback(()=>api.amcPlans().then(setPlans).catch(()=>{}),[]);
  useEffect(()=>{loadPlans();},[loadPlans]);

  function billNextInstalment(bill){
    setNextInstalment({customerId:bill.customerId,customerName:bill.customerName,amcContractId:bill.amcContractId,key:Date.now()});
    setTab("new");
  }

  return <section className="page">
    <div className="page-head">
      <div><span className="eyebrow">BILLING</span><h1>GST Bills</h1>
        <p className="muted">Generate AMC or maintenance bills, track payments and manage AMC plan prices.</p></div>
    </div>
    <div className="tabs" style={{maxWidth:560}}>
      <button className={tab==="new"?"selected":""} onClick={()=>setTab("new")}><Plus size={15}/> New bill</button>
      <button className={tab==="saved"?"selected":""} onClick={()=>setTab("saved")}><FileText size={15}/> Saved bills</button>
      <button className={tab==="plans"?"selected":""} onClick={()=>setTab("plans")}><Repeat size={15}/> AMC plans</button>
    </div>
    {tab==="new"&&<NewBill key={nextInstalment?.key||"new"} plans={plans} preset={nextInstalment}/>}
    {tab==="saved"&&<SavedBills onBillNext={billNextInstalment}/>}
    {tab==="plans"&&<AmcPlans plans={plans} onSaved={loadPlans}/>}
  </section>;
}

/* ───────────────────────────── New bill ───────────────────────────── */

function NewBill({plans,preset}){
  const [searchParams]=useSearchParams();
  const [step,setStep]=useState("search"); // search | setup | edit | send
  const [query,setQuery]=useState("");
  const [customers,setCustomers]=useState([]);
  const [searching,setSearching]=useState(false);
  const [customer,setCustomer]=useState(null);
  const [contracts,setContracts]=useState([]);
  const [setup,setSetup]=useState({billType:"AMC",amcContractId:null,contractType:null,paymentFrequency:null});
  const [draft,setDraft]=useState(null);
  const [drafting,setDrafting]=useState(false);
  const [form,setForm]=useState(null);
  const [extras,setExtras]=useState(false);
  const [errors,setErrors]=useState({});
  const [loading,setLoading]=useState(false);
  const [saving,setSaving]=useState(false);
  const [saved,setSaved]=useState(null); // {bill, url}
  const [error,setError]=useState("");
  const [sendEmail,setSendEmail]=useState("");
  const [sendPhone,setSendPhone]=useState("");
  const [sending,setSending]=useState("");
  const [sendResult,setSendResult]=useState("");

  const presetCustomerId=preset?.customerId||searchParams.get("customerId");
  const presetCustomerName=preset?.customerName||searchParams.get("customerName");
  useEffect(()=>{
    if(presetCustomerId&&presetCustomerName)setCustomers([{id:presetCustomerId,customerName:presetCustomerName}]);
  },[presetCustomerId,presetCustomerName]);
  useEffect(()=>{
    if(preset?.customerId)selectCustomer({id:preset.customerId,customerName:preset.customerName},preset.amcContractId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);

  useEffect(()=>()=>{if(saved?.url)URL.revokeObjectURL(saved.url);},[saved]);

  useEffect(()=>{
    if(!query.trim()){if(!presetCustomerId)setCustomers([]);return;}
    const t=setTimeout(()=>{
      setSearching(true);
      api.searchCustomers(query,0,10)
        .then(d=>setCustomers(d.content||[]))
        .catch(e=>setError(e.message))
        .finally(()=>setSearching(false));
    },300);
    return()=>clearTimeout(t);
  },[query,presetCustomerId]);

  const totals=useMemo(()=>form?computeTotals(form.items,form.bill.gstPercentage):null,[form]);
  const amcBill=setup.billType==="AMC";
  const priceOf=t=>plans.find(p=>p.contractType===t)?.amount;

  async function selectCustomer(c,preferredContractId){
    setError("");setSaved(null);setErrors({});setSendResult("");setDraft(null);
    setLoading(true);
    try{
      const list=await api.customerAmcBilling(c.id);
      let full=c;
      try{full={...c,...await api.customer(c.id)};}catch{}
      setCustomer(full);
      setContracts(list);
      setSendEmail(full.email||"");
      setSendPhone(full.mobileNumber||"");
      const billable=list.filter(x=>!x.fullyBilled&&x.startDate);
      const chosen=list.find(x=>x.amcContractId===preferredContractId&&!x.fullyBilled)||billable[0];
      const next=chosen
        ?{billType:"AMC",amcContractId:chosen.amcContractId,contractType:null,paymentFrequency:null}
        :{billType:"MAINTENANCE",amcContractId:null,contractType:null,paymentFrequency:null};
      setSetup(next);
      setStep("setup");
      await loadDraft(full,next);
    }catch(e){setError(e.message);}
    finally{setLoading(false);}
  }

  async function loadDraft(c,s){
    setDrafting(true);setError("");
    try{
      if(s.billType==="AMC"&&!s.amcContractId){setDraft(null);return;}
      const d=await api.billDraft({customerId:c.id,billType:s.billType,amcContractId:s.amcContractId,
        contractType:s.contractType,paymentFrequency:s.paymentFrequency});
      setDraft(d);
    }catch(e){setDraft(null);setError(e.message);}
    finally{setDrafting(false);}
  }

  function changeSetup(patch){
    const next={...setup,...patch};
    if("amcContractId" in patch||"billType" in patch){next.contractType=null;next.paymentFrequency=null;}
    setSetup(next);
    loadDraft(customer,next);
  }

  function continueToEdit(){
    if(!draft)return;
    setForm(toForm(draft.billRequest));
    setExtras(false);setErrors({});setError("");
    setStep("edit");
  }

  const update=useCallback(fn=>setForm(prev=>fn(prev)),[]);
  const setBill=(k,v)=>update(p=>({...p,bill:{...p.bill,[k]:v}}));
  const setBillTo=(k,v)=>update(p=>({...p,billTo:{...p.billTo,[k]:v}}));
  const setItem=(i,k,v)=>update(p=>({...p,items:p.items.map((it,idx)=>idx===i?{...it,[k]:v}:it)}));
  const blankItem=p=>({description:"",hsnCode:p.items[0]?.hsnCode||"",qty:"1",unit:"No",rate:""});
  const addItem=()=>update(p=>({...p,items:[...p.items,blankItem(p)]}));
  const removeItem=i=>update(p=>({...p,items:p.items.filter((_,idx)=>idx!==i)}));
  function toggleExtras(on){
    if(!on&&form.items.length>1&&!window.confirm("Remove the additional service lines?"))return;
    setExtras(on);
    update(p=>on?{...p,items:p.items.length>1?p.items:[...p.items,blankItem(p)]}:{...p,items:p.items.slice(0,1)});
  }

  async function saveBill(){
    const errs=validateForm(form);
    setErrors(errs);
    if(Object.keys(errs).length){setError("Please fix the highlighted fields before saving the bill.");return;}
    setError("");setSaving(true);
    try{
      const bill=await api.createBill({
        customerId:customer.id,billType:amcBill?"AMC":"MAINTENANCE",
        amcContractId:amcBill?draft.amcContractId:null,
        contractType:amcBill?draft.contractType:null,
        paymentFrequency:amcBill?draft.paymentFrequency:null,
        billRequest:toRequest(form),
      });
      const blob=await api.savedBillPdf(bill.id);
      setSaved({bill,url:URL.createObjectURL(blob)});
      setSendResult("");
      setStep("send");
    }catch(e){setError(e.message);}
    finally{setSaving(false);}
  }

  function downloadPdf(){
    const a=document.createElement("a");
    a.href=saved.url;
    a.download=`apollo_bill_${saved.bill.invoiceNumber.replace(/[^\w-]+/g,"_")}.pdf`;
    a.click();
  }

  async function doSendEmail(){
    const msg=validateEmail(sendEmail,{required:true,label:"Recipient email"});
    if(msg){setError(msg);return;}
    setSending("email");setSendResult("");setError("");
    try{
      const r=await api.sendSavedBillEmail(saved.bill.id,sendEmail.trim());
      if(r?.status&&r.status!=="SENT")throw new Error(r.failureReason||`Email ${r.status.toLowerCase()}`);
      setSendResult(`Email sent to ${sendEmail.trim()}`);
    }catch(e){setError(e.message);}
    finally{setSending("");}
  }

  async function doSendWhatsapp(){
    const msg=validateMobile(sendPhone,{required:true,label:"WhatsApp number"});
    if(msg){setError(msg);return;}
    const phone=normalizeMobile(sendPhone);
    setSending("whatsapp");setSendResult("");setError("");
    try{
      const r=await api.sendSavedBillWhatsapp(saved.bill.id,phone);
      if(r?.status&&r.status!=="SENT")throw new Error(r.failureReason||`WhatsApp ${r.status.toLowerCase()}`);
      setSendResult(`WhatsApp message sent to +91 ${phone}`);
    }catch(e){setError(e.message);}
    finally{setSending("");}
  }

  function startOver(){
    setStep("search");setForm(null);setSaved(null);setCustomer(null);setDraft(null);setErrors({});setSendResult("");setError("");
  }

  const err=k=>errors[k];
  const lockedLine=i=>amcBill&&i===0;
  const stepIndex={search:0,setup:1,edit:2,send:3}[step];

  return <div className={step==="send"?"":"bill-narrow"}>
    {step!=="search"&&<div style={{display:"flex",justifyContent:"flex-end",marginBottom:12}}>
      <button className="secondary small" onClick={startOver}><FileText size={14}/> Start a new bill</button>
    </div>}
    {error&&<div className="alert error">{error}</div>}

    <div className="bill-steps">
      {["Select customer","Bill type","Review & edit","Saved · send"].map((label,i)=><React.Fragment key={label}>
        {i>0&&<div className="bill-step-line"/>}
        <Step n={i+1} label={label} active={stepIndex===i} done={stepIndex>i}/>
      </React.Fragment>)}
    </div>

    {step==="search"&&<div className="panel">
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
          <button className="primary" disabled={loading} onClick={()=>selectCustomer(c)}>
            <Pencil size={15}/>{loading?"Loading…":"Prepare bill"}
          </button>
        </div>)}
      </div>}
    </div>}

    {step==="setup"&&customer&&<>
      <div className="panel">
        <h2>What is this bill for?</h2>
        <p className="muted">Customer: <b>{customer.customerName}</b></p>
        <div className="segmented" style={{maxWidth:420}}>
          <button className={amcBill?"selected":""} onClick={()=>!amcBill&&changeSetup({billType:"AMC",amcContractId:contracts.find(c=>!c.fullyBilled&&c.startDate)?.amcContractId??null})}>AMC</button>
          <button className={!amcBill?"selected":""} onClick={()=>amcBill&&changeSetup({billType:"MAINTENANCE",amcContractId:null})}>Maintenance / other</button>
        </div>

        {amcBill&&<>
          <h3 className="section-sub" style={{marginTop:18}}>AMC contract</h3>
          {!contracts.some(c=>c.status==="ACTIVE")&&<div className="alert" style={{background:"#f4f8fd",color:"#344154"}}>
            {contracts.length?"This customer has no ACTIVE AMC contract.":"This customer has no AMC contracts."}{" "}
            <Link to={`/app/amc?customerId=${customer.id}&customerName=${encodeURIComponent(customer.customerName)}`}>Create an AMC contract →</Link>
            {" "}or create a maintenance bill.
          </div>}
          <div className="amc-options">
            {contracts.map(c=>{
              const disabled=c.fullyBilled||!c.startDate;
              return <label key={c.amcContractId} className={`amc-option${setup.amcContractId===c.amcContractId?" selected":""}${disabled?" disabled":""}`}>
                <input type="radio" name="amc" disabled={disabled} checked={setup.amcContractId===c.amcContractId}
                  onChange={()=>changeSetup({amcContractId:c.amcContractId})}/>
                <div>
                  <b>{c.contractNumber||`Contract #${c.amcContractId}`}</b>
                  <small>Lift {c.liftSerialNumber||"—"} · {c.contractType||"no plan"} · {c.startDate?`${dmy(c.startDate)} – ${dmy(c.endDate)}`:"no start date"}</small>
                  <small>{!c.startDate?"Set a start date on the contract to bill it"
                    :c.fullyBilled?`All ${c.totalInstalments} instalment(s) billed for this AMC year`
                    :`Billed ${c.billedInstalments} of ${c.totalInstalments} · next: instalment ${c.nextInstalmentNo}`}</small>
                </div>
                <span className={`status ${c.fullyBilled?"paid":c.billedInstalments?"sent":"generated"}`}>{c.fullyBilled?"Fully billed":c.billedInstalments?"In progress":"Not billed"}</span>
              </label>;
            })}
          </div>

          {setup.amcContractId&&<>
            <h3 className="section-sub" style={{marginTop:18}}>
              Plan {draft?.planLocked&&<span className="muted" style={{fontWeight:400}}><Lock size={12}/> locked by instalment 1 of this AMC year</span>}
            </h3>
            <div className="segmented" style={{maxWidth:560}}>
              {TIERS.map(t=><button key={t} disabled={drafting||draft?.planLocked} className={draft?.contractType===t?"selected":""}
                onClick={()=>changeSetup({contractType:t,paymentFrequency:draft?.paymentFrequency})}>
                {t} <small className="muted">{priceOf(t)!=null?money(priceOf(t)).replace(".00",""):""}</small>
              </button>)}
            </div>
            <h3 className="section-sub">Payment frequency</h3>
            <div className="segmented" style={{maxWidth:560}}>
              {FREQUENCIES.map(([f,l])=><button key={f} disabled={drafting||draft?.planLocked} className={draft?.paymentFrequency===f?"selected":""}
                onClick={()=>changeSetup({paymentFrequency:f,contractType:draft?.contractType})}>{l}</button>)}
            </div>
            <p className="muted">Plan prices are per lift per year, before GST. Edit them in the <b>AMC plans</b> tab.</p>
          </>}
        </>}

        {!amcBill&&<p className="muted" style={{marginTop:14}}>You will enter the description, HSN/SAC, quantity and rate of each service on the next step.</p>}
      </div>

      {amcBill&&draft&&<div className="panel">
        <h2>Instalment</h2>
        <div className="bill-summary">
          <div className="summary-row"><span>AMC year</span><strong>{dmy(draft.amcPeriodStart)} – {dmy(draft.amcPeriodEnd)}</strong></div>
          <div className="summary-row"><span>Plan</span><strong>{draft.contractType} · {money(draft.planAmount)} / year</strong></div>
          <div className="summary-row"><span>Instalment</span><strong>{draft.instalmentNo} of {draft.totalInstalments} ({FREQ_LABEL[draft.paymentFrequency]})</strong></div>
          <div className="summary-row"><span>Period</span><strong>{dmy(draft.periodStart)} – {dmy(draft.periodEnd)}</strong></div>
          <div className="summary-row total"><span>Instalment amount (before GST)</span><strong>{money(draft.instalmentAmount)}</strong></div>
        </div>
      </div>}

      <div className="form-actions">
        <button className="secondary" onClick={startOver}>← Change customer</button>
        <button className="primary" disabled={drafting||!draft} onClick={continueToEdit}>{drafting?"Loading…":"Continue →"}</button>
      </div>
    </>}

    {step==="edit"&&form&&<>
      <div className="panel">
        <div className="panel-head">
          <div><h2>Invoice details</h2><p className="muted" style={{margin:0}}>
            {amcBill?`AMC bill · ${draft.contractType} · instalment ${draft.instalmentNo} of ${draft.totalInstalments}`:"Maintenance bill"} for <b>{customer?.customerName}</b>.</p></div>
        </div>
        <div className="form-grid bill-grid-3">
          <BillField label="Invoice No. *" value={form.bill.invoiceNumber} error={err("invoiceNumber")} onChange={v=>setBill("invoiceNumber",v)}/>
          <BillField label="Invoice date * (dd/MM/yyyy)" value={form.bill.invoiceDate} error={err("invoiceDate")} placeholder="dd/MM/yyyy" onChange={v=>setBill("invoiceDate",v)}/>
          <BillField label="GST % *" type="number" min="0" max="100" step="0.01" value={form.bill.gstPercentage} error={err("gstPercentage")} onChange={v=>setBill("gstPercentage",v)}
            hint={`Split equally: SGST ${rateLabel(totals.halfRate)} + CGST ${rateLabel(totals.halfRate)}`}/>
          <BillField label="Our mobile" type="tel" inputMode="numeric" maxLength={13} value={form.bill.mobile} error={err("mobile")} hint={HINTS.mobile} onChange={v=>setBill("mobile",v)}/>
          <BillField label="Our state" value={form.bill.state} error={err("state")} onChange={v=>setBill("state",v)}/>
          <BillField label="Our pincode" inputMode="numeric" maxLength={7} value={form.bill.pincode} error={err("pincode")} onChange={v=>setBill("pincode",v)}/>
          <BillField label="Our PAN" value={form.bill.panNumber} error={err("panNumber")} maxLength={10} upper onChange={v=>setBill("panNumber",v)}/>
          <BillField label="Our GSTIN" value={form.bill.gstin} error={err("gstin")} maxLength={15} upper onChange={v=>setBill("gstin",v)}/>
        </div>

        <h3 className="section-sub" style={{marginTop:22}}>Bill to</h3>
        <div className="form-grid bill-grid-3">
          <BillField label="Customer name *" value={form.billTo.name} error={err("billTo.name")} onChange={v=>setBillTo("name",v)}/>
          <BillField label="Customer GSTIN" value={form.billTo.gstin} error={err("billTo.gstin")} maxLength={15} upper onChange={v=>setBillTo("gstin",v)}/>
          <BillField label="State" value={form.billTo.state} error={err("billTo.state")} onChange={v=>setBillTo("state",v)}/>
          <BillField label="PO number" value={form.billTo.poNumber} maxLength={50} onChange={v=>setBillTo("poNumber",v)}/>
          <BillField label="Job number" value={form.billTo.jobNumber} maxLength={50} onChange={v=>setBillTo("jobNumber",v)}/>
          <BillField label="Project name" value={form.billTo.projectName} maxLength={150} onChange={v=>setBillTo("projectName",v)}/>
          <div style={{gridColumn:"1/-1"}}><BillField label="Address" textarea value={form.billTo.address} error={err("billTo.address")} maxLength={500} onChange={v=>setBillTo("address",v)}/></div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <h2>Line items</h2>
          {(!amcBill||extras)&&<button className="secondary small" onClick={addItem} disabled={form.items.length>=50}><Plus size={14}/> Add item</button>}
        </div>
        {amcBill&&<div style={{display:"flex",alignItems:"center",gap:14,marginBottom:12,flexWrap:"wrap"}}>
          <span className="muted"><b>Add extra services on top of the AMC?</b></span>
          <div className="segmented" style={{margin:0,minWidth:160}}>
            <button className={!extras?"selected":""} onClick={()=>extras&&toggleExtras(false)}>No</button>
            <button className={extras?"selected":""} onClick={()=>!extras&&toggleExtras(true)}>Yes</button>
          </div>
        </div>}
        {err("items")&&<div className="field-error">{err("items")}</div>}
        <div className="table-wrap">
          <table className="bill-items">
            <thead><tr><th>Sl.</th><th>Description *</th><th>HSN/SAC</th><th>Qty *</th><th>Unit</th><th>Rate (₹) *</th><th className="num">Amount (₹)</th><th/></tr></thead>
            <tbody>{form.items.map((it,i)=>{
              const locked=lockedLine(i);
              return <React.Fragment key={i}>
                <tr className={err(`item.${i}`)?"row-invalid":""}>
                  <td>{i+1}</td>
                  <td style={{minWidth:220}}><textarea rows={2} className="inline-input" maxLength={500} value={it.description} onChange={e=>setItem(i,"description",e.target.value)}/></td>
                  <td><input className="inline-input" style={{width:80}} inputMode="numeric" maxLength={8} value={it.hsnCode} onChange={e=>setItem(i,"hsnCode",e.target.value.replace(/\D/g,""))}/></td>
                  <td><input className="inline-input" style={{width:70}} type="number" min="0" step="any" value={it.qty} readOnly={locked} disabled={locked} onChange={e=>setItem(i,"qty",e.target.value)}/></td>
                  <td><input className="inline-input" style={{width:60}} maxLength={10} value={it.unit} readOnly={locked} disabled={locked} onChange={e=>setItem(i,"unit",e.target.value.replace(/\s/g,""))}/></td>
                  <td><input className="inline-input" style={{width:110}} type="number" min="0" step="0.01" value={it.rate} readOnly={locked} disabled={locked} onChange={e=>setItem(i,"rate",e.target.value)}/></td>
                  <td className="num"><b>{money(lineAmount(it))}</b></td>
                  <td>{locked
                    ?<span title="AMC amount is fixed by the plan"><Lock size={14} color="#8a94a1"/></span>
                    :<button className="danger-icon" title="Remove item" disabled={form.items.length<=1} onClick={()=>removeItem(i)}><Trash2 size={15}/></button>}</td>
                </tr>
                {err(`item.${i}`)&&<tr><td colSpan={8} className="field-error" style={{paddingTop:0}}>{err(`item.${i}`)}</td></tr>}
              </React.Fragment>;
            })}</tbody>
          </table>
        </div>
        <p className="muted" style={{marginTop:8}}>
          {amcBill?"Line 1 is the AMC instalment; its quantity and rate come from the plan. ":""}Amount = Qty × Rate, calculated automatically.
        </p>
        <BillSummary totals={totals}/>
      </div>

      <div className="form-actions">
        <button className="secondary" onClick={()=>setStep("setup")}>← Back</button>
        <button className="primary" disabled={saving} onClick={saveBill}>
          <Save size={15}/>{saving?"Saving bill…":"Save & generate bill"}
        </button>
      </div>
    </>}

    {step==="send"&&saved&&<div className="bill-send-layout">
      <div className="panel bill-pdf-panel">
        <div className="panel-head">
          <h2>Invoice {saved.bill.invoiceNumber}</h2>
          <div className="head-actions">
            <button className="secondary small" onClick={downloadPdf}><Download size={14}/> Download</button>
          </div>
        </div>
        <iframe src={saved.url} className="bill-pdf-frame" title="Bill PDF preview"/>
      </div>

      <div className="bill-send-side">
        <div className="alert success">Bill saved. It now appears in <b>Saved bills</b> and on the dashboard. Mark it paid once the money is received.</div>
        <div className="panel">
          <h2>{TYPE_LABEL[saved.bill.billType]}{saved.bill.instalmentNo?` · instalment ${saved.bill.instalmentNo} of ${saved.bill.totalInstalments}`:""}</h2>
          <div className="bill-summary">
            <div className="summary-row"><span>Total before tax</span><strong>{money(saved.bill.taxableAmount)}</strong></div>
            <div className="summary-row"><span>GST</span><strong>{money(saved.bill.gstAmount)}</strong></div>
            <div className="summary-row total"><span>Grand total</span><strong>{money(saved.bill.totalAmount)}</strong></div>
          </div>
        </div>

        {sendResult&&<div className="alert success">{sendResult}</div>}

        <div className="panel">
          <h3 className="send-title"><Mail size={16} color="var(--blue)"/> Send via email</h3>
          <BillField label="Recipient email" type="email" value={sendEmail} placeholder="customer@example.com" maxLength={150}
            error={sendEmail&&validateEmail(sendEmail)} onChange={setSendEmail}/>
          <button className="primary wide" style={{marginTop:12}} disabled={!!sending} onClick={doSendEmail}>
            <Send size={14}/>{sending==="email"?"Sending…":"Send email"}
          </button>
        </div>

        <div className="panel">
          <h3 className="send-title"><MessageCircle size={16} color="#25d366"/> Send via WhatsApp</h3>
          <BillField label="Mobile number" type="tel" inputMode="numeric" value={sendPhone} placeholder="98765 43210" maxLength={13} hint={HINTS.mobile}
            error={sendPhone&&validateMobile(sendPhone)} onChange={setSendPhone}/>
          <button className="primary wide" style={{marginTop:12,background:"#25d366"}} disabled={!!sending} onClick={doSendWhatsapp}>
            <Send size={14}/>{sending==="whatsapp"?"Sending…":"Send WhatsApp"}
          </button>
        </div>

        <button className="secondary wide" onClick={startOver}><RefreshCw size={14}/> Bill another customer</button>
      </div>
    </div>}
  </div>;
}

/* ───────────────────────────── Saved bills ───────────────────────────── */

function SavedBills({onBillNext}){
  const [filters,setFilters]=useState({status:"",billType:"",q:""});
  const [page,setPage]=useState(0);
  const [data,setData]=useState(null);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState("");
  const [notice,setNotice]=useState("");
  const [busy,setBusy]=useState(null);
  const [paidModal,setPaidModal]=useState(null); // {bill, paidDate, paymentReference}
  const [sendModal,setSendModal]=useState(null); // {bill, email, phone, sending}

  const load=useCallback(()=>{
    setLoading(true);setError("");
    api.bills({...filters,page,size:15})
      .then(setData)
      .catch(e=>setError(e.message))
      .finally(()=>setLoading(false));
  },[filters,page]);
  useEffect(()=>{const t=setTimeout(load,filters.q?300:0);return()=>clearTimeout(t);},[load,filters.q]);

  const setFilter=(k,v)=>{setFilters(f=>({...f,[k]:v}));setPage(0);};

  async function act(bill,fn,message){
    setBusy(bill.id);setError("");setNotice("");
    try{await fn();setNotice(message);load();}
    catch(e){setError(e.message);}
    finally{setBusy(null);}
  }

  async function openPdf(bill){
    setBusy(bill.id);setError("");
    try{openBlob(await api.savedBillPdf(bill.id));}
    catch(e){setError(e.message);}
    finally{setBusy(null);}
  }

  async function openSend(bill){
    let email="",phone="";
    try{const c=await api.customer(bill.customerId);email=c.email||"";phone=c.mobileNumber||"";}catch{}
    setSendModal({bill,email,phone,sending:""});
  }

  async function send(channel){
    const m=sendModal;
    const msg=channel==="email"?validateEmail(m.email,{required:true,label:"Recipient email"}):validateMobile(m.phone,{required:true,label:"WhatsApp number"});
    if(msg){setError(msg);return;}
    setSendModal({...m,sending:channel});setError("");
    try{
      const r=channel==="email"
        ?await api.sendSavedBillEmail(m.bill.id,m.email.trim())
        :await api.sendSavedBillWhatsapp(m.bill.id,normalizeMobile(m.phone));
      if(r?.status&&r.status!=="SENT")throw new Error(r.failureReason||`Sending ${r.status.toLowerCase()}`);
      setNotice(`Invoice ${m.bill.invoiceNumber} sent via ${channel==="email"?"email":"WhatsApp"}.`);
      setSendModal(null);load();
    }catch(e){setError(e.message);setSendModal(s=>s&&{...s,sending:""});}
  }

  async function savePaid(){
    const m=paidModal;
    if(!m.paidDate){setError("Paid date is required");return;}
    await act(m.bill,()=>api.markBillPaid(m.bill.id,m.paidDate,m.paymentReference?.trim()||null),`Invoice ${m.bill.invoiceNumber} marked as paid.`);
    setPaidModal(null);
  }

  const bills=data?.content||[];
  return <>
    {error&&<div className="alert error">{error}</div>}
    {notice&&<div className="alert success">{notice}</div>}
    <div className="panel">
      <div className="bill-filters">
        <div className="search" style={{flex:2}}>
          <Search size={16}/>
          <input placeholder="Invoice no. or customer name…" value={filters.q} onChange={e=>setFilter("q",e.target.value)}/>
        </div>
        <select className="bill-input" value={filters.status} onChange={e=>setFilter("status",e.target.value)}>
          <option value="">All statuses</option>
          {["GENERATED","SENT","PAID","CANCELLED"].map(s=><option key={s} value={s}>{s[0]+s.slice(1).toLowerCase()}</option>)}
        </select>
        <select className="bill-input" value={filters.billType} onChange={e=>setFilter("billType",e.target.value)}>
          <option value="">All types</option>
          {Object.entries(TYPE_LABEL).map(([k,v])=><option key={k} value={k}>{v}</option>)}
        </select>
        <button className="secondary small" onClick={load}><RefreshCw size={14}/></button>
      </div>

      <div className="table-wrap">
        <table>
          <thead><tr><th>Invoice</th><th>Customer</th><th>Type</th><th>Period</th><th className="num">Total</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {loading&&!bills.length&&<tr><td colSpan={7} className="loading">Loading…</td></tr>}
            {!loading&&!bills.length&&<tr><td colSpan={7} className="empty">No bills found.</td></tr>}
            {bills.map(b=>{
              const canBillNext=isAmc(b.billType)&&b.status!=="CANCELLED"&&b.instalmentNo<b.totalInstalments;
              return <tr key={b.id}>
                <td><b>{b.invoiceNumber}</b><small>{dmy(b.invoiceDate)}</small></td>
                <td><b>{b.customerName}</b><small>by {b.createdBy||"—"}</small></td>
                <td><b>{TYPE_LABEL[b.billType]}</b>{isAmc(b.billType)&&<small>{b.contractType} · {b.instalmentNo}/{b.totalInstalments} {FREQ_LABEL[b.paymentFrequency]}</small>}</td>
                <td>{b.periodStart?<small>{dmy(b.periodStart)} – {dmy(b.periodEnd)}</small>:<small>—</small>}</td>
                <td className="num"><b>{money(b.totalAmount)}</b><small>{money(b.taxableAmount)} + GST</small></td>
                <td><span className={`status ${b.status.toLowerCase()}`}>{b.status}</span>
                  {b.status==="PAID"&&<small>{dmy(b.paidDate)}{b.paymentReference?` · ${b.paymentReference}`:""}</small>}</td>
                <td>
                  <div className="bill-row-actions">
                    <button className="secondary small" title="View PDF" disabled={busy===b.id} onClick={()=>openPdf(b)}><Eye size={14}/></button>
                    {b.status!=="CANCELLED"&&<button className="secondary small" title="Send" onClick={()=>openSend(b)}><Send size={14}/></button>}
                    {(b.status==="GENERATED"||b.status==="SENT")&&<button className="secondary small" title="Mark paid" onClick={()=>setPaidModal({bill:b,paidDate:isoToday(),paymentReference:""})}><CheckCircle2 size={14}/> Paid</button>}
                    {b.status==="PAID"&&<button className="secondary small" title="Undo paid" disabled={busy===b.id}
                      onClick={()=>window.confirm(`Mark invoice ${b.invoiceNumber} as unpaid?`)&&act(b,()=>api.markBillUnpaid(b.id),`Invoice ${b.invoiceNumber} marked unpaid.`)}><Undo2 size={14}/></button>}
                    {canBillNext&&<button className="secondary small" title="Bill next instalment" onClick={()=>onBillNext(b)}><Repeat size={14}/> Next</button>}
                    {(b.status==="GENERATED"||b.status==="SENT")&&<button className="danger-icon" title="Cancel bill" disabled={busy===b.id}
                      onClick={()=>window.confirm(`Cancel invoice ${b.invoiceNumber}? ${isAmc(b.billType)?"The AMC instalment becomes billable again.":""}`)&&act(b,()=>api.cancelBill(b.id),`Invoice ${b.invoiceNumber} cancelled.`)}><XCircle size={16}/></button>}
                  </div>
                </td>
              </tr>;
            })}
          </tbody>
        </table>
      </div>
      {data&&data.totalPages>1&&<div className="pagination">
        <button disabled={page===0} onClick={()=>setPage(p=>p-1)}>Previous</button>
        <span>Page {page+1} of {data.totalPages} · {data.totalElements} bills</span>
        <button disabled={page+1>=data.totalPages} onClick={()=>setPage(p=>p+1)}>Next</button>
      </div>}
    </div>

    {paidModal&&<div className="modal-backdrop" onClick={()=>setPaidModal(null)}>
      <div className="panel modal-card" onClick={e=>e.stopPropagation()}>
        <div className="panel-head"><div><h2>Mark invoice {paidModal.bill.invoiceNumber} as paid</h2>
          <p className="muted">{money(paidModal.bill.totalAmount)} from {paidModal.bill.customerName}</p></div></div>
        <div className="form-grid">
          <BillField label="Paid on *" type="date" max={isoToday()} value={paidModal.paidDate} onChange={v=>setPaidModal(m=>({...m,paidDate:v}))}/>
          <BillField label="Payment reference" placeholder="UTR / cheque no." maxLength={100} value={paidModal.paymentReference} onChange={v=>setPaidModal(m=>({...m,paymentReference:v}))}/>
        </div>
        <div className="form-actions" style={{marginTop:16}}>
          <button className="secondary" onClick={()=>setPaidModal(null)}>Cancel</button>
          <button className="primary" disabled={busy===paidModal.bill.id} onClick={savePaid}><CheckCircle2 size={15}/> Mark paid</button>
        </div>
      </div>
    </div>}

    {sendModal&&<div className="modal-backdrop" onClick={()=>!sendModal.sending&&setSendModal(null)}>
      <div className="panel modal-card" onClick={e=>e.stopPropagation()}>
        <div className="panel-head"><div><h2>Send invoice {sendModal.bill.invoiceNumber}</h2>
          <p className="muted">{sendModal.bill.customerName} · {money(sendModal.bill.totalAmount)}</p></div></div>
        <BillField label="Recipient email" type="email" value={sendModal.email} maxLength={150}
          error={sendModal.email&&validateEmail(sendModal.email)} onChange={v=>setSendModal(m=>({...m,email:v}))}/>
        <button className="primary wide" style={{margin:"10px 0 18px"}} disabled={!!sendModal.sending} onClick={()=>send("email")}>
          <Mail size={14}/>{sendModal.sending==="email"?"Sending…":"Send email"}
        </button>
        <BillField label="WhatsApp number" type="tel" inputMode="numeric" value={sendModal.phone} maxLength={13} hint={HINTS.mobile}
          error={sendModal.phone&&validateMobile(sendModal.phone)} onChange={v=>setSendModal(m=>({...m,phone:v}))}/>
        <button className="primary wide" style={{marginTop:10,background:"#25d366"}} disabled={!!sendModal.sending} onClick={()=>send("whatsapp")}>
          <MessageCircle size={14}/>{sendModal.sending==="whatsapp"?"Sending…":"Send WhatsApp"}
        </button>
        <div className="form-actions" style={{marginTop:16}}>
          <button className="secondary" disabled={!!sendModal.sending} onClick={()=>setSendModal(null)}>Close</button>
        </div>
      </div>
    </div>}
  </>;
}

/* ───────────────────────────── AMC plans ───────────────────────────── */

function AmcPlans({plans,onSaved}){
  const [values,setValues]=useState({});
  const [saving,setSaving]=useState("");
  const [error,setError]=useState("");
  const [notice,setNotice]=useState("");
  useEffect(()=>{setValues(Object.fromEntries(plans.map(p=>[p.contractType,String(p.amount)])));},[plans]);

  async function save(type){
    const msg=validateAmount(values[type],{required:true,label:`${type} amount`});
    if(msg){setError(msg);return;}
    setSaving(type);setError("");setNotice("");
    try{await api.updateAmcPlan(type,Number(values[type]));setNotice(`${type} plan updated.`);await onSaved();}
    catch(e){setError(e.message);}
    finally{setSaving("");}
  }

  return <div className="bill-narrow">
    {error&&<div className="alert error">{error}</div>}
    {notice&&<div className="alert success">{notice}</div>}
    <div className="panel">
      <h2>AMC plan prices</h2>
      <p className="muted">Fixed price per lift per year, before GST. Instalments split this amount equally (the last instalment absorbs any rounding).
        Changes apply to new AMC years only; AMC years that are already billed keep their original price.</p>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Plan</th><th>Amount per year (₹)</th><th>Last updated</th><th/></tr></thead>
          <tbody>{TIERS.map(t=>{
            const p=plans.find(x=>x.contractType===t);
            const changed=p&&String(p.amount)!==values[t];
            return <tr key={t}>
              <td><b>{t}</b></td>
              <td><input className="bill-input" style={{maxWidth:180}} type="number" min="0" step="0.01" value={values[t]??""}
                onChange={e=>setValues(v=>({...v,[t]:e.target.value}))}/></td>
              <td><small>{p?.updatedAt?`${new Date(p.updatedAt).toLocaleString("en-IN")}${p.updatedBy?` · ${p.updatedBy}`:""}`:"—"}</small></td>
              <td><button className="primary small" disabled={!changed||saving===t} onClick={()=>save(t)}><Save size={14}/>{saving===t?"Saving…":"Save"}</button></td>
            </tr>;
          })}</tbody>
        </table>
      </div>
    </div>
  </div>;
}

/* ───────────────────────────── Shared ───────────────────────────── */

function BillSummary({totals}){
  return <div className="bill-summary">
    <div className="summary-row"><span>Total before tax</span><strong>{money(totals.taxable)}</strong></div>
    <div className="summary-row"><span>SGST ({rateLabel(totals.halfRate)})</span><strong>{money(totals.sgst)}</strong></div>
    <div className="summary-row"><span>CGST ({rateLabel(totals.halfRate)})</span><strong>{money(totals.cgst)}</strong></div>
    <div className="summary-row total"><span>Grand total</span><strong>{money(totals.total)}</strong></div>
  </div>;
}

function Step({n,label,active,done}){
  return <div className={`bill-step${active?" bill-step-active":""}${done?" bill-step-done":""}`}>
    <div className="bill-step-n">{done?"✓":n}</div>
    <span>{label}</span>
  </div>;
}

function BillField({label,value,onChange,error,hint,textarea,upper:toUpper,...rest}){
  const handle=e=>onChange(toUpper?e.target.value.toUpperCase():e.target.value);
  return <label className="bill-field">
    <span>{label}</span>
    {textarea
      ?<textarea rows={2} className={`bill-input${error?" invalid":""}`} value={value??""} onChange={handle} aria-invalid={!!error} {...rest}/>
      :<input className={`bill-input${error?" invalid":""}`} value={value??""} onChange={handle} aria-invalid={!!error} {...rest}/>}
    {error?<small className="field-error">{error}</small>:hint?<small className="field-hint">{hint}</small>:null}
  </label>;
}
