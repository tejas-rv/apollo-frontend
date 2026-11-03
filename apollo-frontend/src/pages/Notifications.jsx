import React,{useState} from "react";
import {Mail,MessageCircle} from "lucide-react";
import {api} from "../services/api";
import {HINTS,HTML_PATTERNS,normalizeMobile,validateEmail,validateMobile} from "../utils/validation";

export default function Notifications(){
  const [tab,setTab]=useState("email"),[mode,setMode]=useState("plain"),[form,setForm]=useState({});
  const [message,setMessage]=useState(""),[error,setError]=useState(""),[loading,setLoading]=useState(false);
  const set=e=>setForm(current=>({...current,[e.target.name]:e.target.value}));
  const recipientError=tab==="email"?(form.email?validateEmail(form.email):""):(form.phoneNumber?validateMobile(form.phoneNumber,{label:"Phone number"}):"");

  async function send(e){
    e.preventDefault();setMessage("");
    const invalid=tab==="email"
      ?validateEmail(form.email,{required:true,label:"Recipient email"})
      :validateMobile(form.phoneNumber,{required:true,label:"Phone number"});
    if(invalid){setError(invalid);return}
    if(mode==="contract"&&!(Number(form.customerId)>0)){setError("Customer ID must be a positive number");return}
    setLoading(true);setError("");
    try{
      const sendFn=tab==="email"?(mode==="contract"?api.contractEmail:api.email):(mode==="contract"?api.contractWhatsapp:api.whatsapp);
      const payload=tab==="email"
        ?{...form,email:form.email.trim()}
        :{...form,phoneNumber:`+91${normalizeMobile(form.phoneNumber)}`};
      const response=await sendFn(payload);
      setMessage(`Notification sent successfully${response?.id?` (#${response.id})`:""}`);
      setForm({});
    }catch(x){setError(x.message)}
    finally{setLoading(false)}
  }

  return <section className="page narrow">
    <div className="page-head"><div><span className="eyebrow">COMMUNICATIONS</span><h1>Notifications</h1><p className="muted">Send messages or AMC contract documents.</p></div></div>
    <div className="tabs">
      <button className={tab==="email"?"selected":""} onClick={()=>setTab("email")}><Mail size={17}/> Email</button>
      <button className={tab==="whatsapp"?"selected":""} onClick={()=>setTab("whatsapp")}><MessageCircle size={17}/> WhatsApp</button>
    </div>
    <div className="segmented"><button className={mode==="plain"?"selected":""} onClick={()=>setMode("plain")}>Plain message</button><button className={mode==="contract"?"selected":""} onClick={()=>setMode("contract")}>AMC contract</button></div>
    {message&&<div className="alert success">{message}</div>}{error&&<div className="alert error">{error}</div>}
    <form className="panel form" onSubmit={send}>
      {mode==="contract"&&<Field label="Customer ID *" name="customerId" value={form.customerId} onChange={set} type="number" min="1" step="1" required/>}
      {tab==="email"
        ? <Field label="Recipient email *" name="email" value={form.email} onChange={set} type="email" maxLength={150} pattern={HTML_PATTERNS.email} placeholder={HINTS.email} required error={recipientError}/>
        : <Field label="Mobile number * (India, +91 added automatically)" name="phoneNumber" value={form.phoneNumber} onChange={set} type="tel" inputMode="numeric" maxLength={13} placeholder="98765 43210" required error={recipientError} hint={HINTS.mobile}/>}
      {mode==="plain"
        ? tab==="email"
          ? <><Field label="Subject *" name="subject" value={form.subject} onChange={set} required/><label>Body *<textarea name="body" rows="8" required value={form.body||""} onChange={set}/></label></>
          : <label>Message *<textarea name="message" rows="8" required value={form.message||""} onChange={set}/></label>
        : <><Field label={tab==="email"?"Subject":"Caption"} name={tab==="email"?"subject":"caption"} value={form[tab==="email"?"subject":"caption"]} onChange={set}/><label>{tab==="email"?"Body":"Reference key"}{tab==="email"?<textarea name="body" rows="6" value={form.body||""} onChange={set}/>:<input name="referenceKey" value={form.referenceKey||""} onChange={set}/>}</label></>}
      <button className="primary wide" disabled={loading}>{loading?"Sending…":`Send ${tab}`}</button>
    </form>
  </section>;
}

function Field({label,name,value,onChange,type="text",placeholder,error,hint,...props}){
  return <label>{label}<input name={name} type={type} value={value||""} onChange={onChange} placeholder={placeholder} aria-invalid={!!error} {...props}/>
    {error?<small className="field-error">{error}</small>:hint?<small className="field-hint">{hint}</small>:null}
  </label>;
}
