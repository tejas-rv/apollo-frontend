import React,{useEffect,useState} from "react";
import {useNavigate,useParams} from "react-router-dom";
import {api} from "../services/api";
import {AMC_FREQUENCIES,AMC_TIERS,autofillAmc,normalizeFrequency,planPrice,withStartDate} from "../utils/amc";
import {
  HINTS,HTML_PATTERNS,collectErrors,normalizeMobile,normalizePincode,
  validateAddress,validateAmount,validateDateRange,validateEmail,validateMobile,validateName,validateNotFuture,validatePincode,validateRequired,
} from "../utils/validation";

const amc0={contractNumber:"",status:"PENDING",startDate:"",endDate:"",contractType:"SILVER",amcAmount:"",paymentFrequency:"YEARLY",nextPaymentDate:"",nextServiceDate:"",totalServices:0,completedServices:0,serviceHistory:[]};
const lift0={liftType:"PASSENGER",driveType:"TRACTION",numberOfFloors:1,capacityInKg:"",capacityInPersons:"",brand:"",liftModel:"",installationType:"",yearOfInstallation:"",serialNumber:"",doorType:"AUTO",machineType:"",machineName:"",kw:"",amps:"",speed:"",voltage:"",frequency:"",osgType:"",ratedSpeed:"",trippingSpeed:"",isUpsPresent:false,upsType:"",kva:"",amcDetails:[]};
const history0={serviceDate:"",assignedEngineerId:"",engineerName:"",workDone:"",status:"SCHEDULED"};
const engineerLabel=e=>{
  const name=e.fullName||e.username;
  return e.employeeNumber?`${name} (${e.employeeNumber})`:name;
};

function Field({label,name,value,onChange,type="text",error,hint,...props}){
  return <label>{label}<input name={name} type={type} value={value??""} onChange={onChange} aria-invalid={!!error} {...props}/>
    {error?<small className="field-error">{error}</small>:hint?<small className="field-hint">{hint}</small>:null}
  </label>;
}
function numberOrNull(value){return value===""||value==null?null:Number(value);}
function dateOrNull(value){return value||null;}
const CURRENT_YEAR=new Date().getFullYear();

function validateCustomer(form){
  const errors=collectErrors({
    customerName:validateName(form.customerName,{required:true,label:"Customer name",max:100,strict:false}),
    mobileNumber:validateMobile(form.mobileNumber,{required:true}),
    email:validateEmail(form.email),
    city:validateName(form.city,{label:"City"}),
    state:validateName(form.state,{label:"State"}),
    pincode:validatePincode(form.pincode),
    address:validateAddress(form.address),
  });
  form.lifts.forEach((lift,li)=>{
    const L=`Lift ${li+1}`;
    if(lift.yearOfInstallation!==""&&lift.yearOfInstallation!=null){
      const y=Number(lift.yearOfInstallation);
      if(!Number.isInteger(y)||y<1900||y>CURRENT_YEAR)errors[`lift.${li}.yearOfInstallation`]=`Year must be between 1900 and ${CURRENT_YEAR}`;
    }
    (lift.amcDetails||[]).forEach((amc,ai)=>{
      const k=`lift.${li}.amc.${ai}`;
      const amount=validateAmount(amc.amcAmount,{label:`${L} AMC amount`});
      if(amount)errors[`${k}.amcAmount`]=amount;
      const range=validateDateRange(amc.startDate,amc.endDate);
      if(range)errors[`${k}.endDate`]=range;
      if(["ACTIVE","EXPIRED"].includes(amc.status)&&!amc.startDate)errors[`${k}.startDate`]=`Start date is required for ${amc.status.toLowerCase()} contracts`;
      (amc.serviceHistory||[]).forEach((h,hi)=>{
        if(h.status==="COMPLETED"){
          const f=validateNotFuture(h.serviceDate,"Completed visit date");
          if(f)errors[`${k}.history.${hi}.serviceDate`]=f;
        }
        const w=validateRequired(h.workDone?.trim(),"Work done");
        if(w)errors[`${k}.history.${hi}.workDone`]=w;
      });
    });
  });
  return errors;
}

export default function CustomerForm(){
  const {id}=useParams(),edit=!!id,nav=useNavigate();
  const [form,setForm]=useState({customerName:"",customerCode:"",mobileNumber:"",email:"",address:"",city:"",state:"",pincode:"",lifts:[]});
  const [error,setError]=useState(""),[saving,setSaving]=useState(false);
  const [errors,setErrors]=useState({});
  const [engineers,setEngineers]=useState([]);
  const [plans,setPlans]=useState([]);

  useEffect(()=>{api.amcPlans().then(setPlans).catch(()=>setPlans([]));},[]);
  useEffect(()=>{
    if(!plans.length)return;
    setForm(current=>({...current,lifts:current.lifts.map(lift=>({...lift,amcDetails:(lift.amcDetails||[]).map(amc=>
      amc.amcAmount===""&&amc.contractType&&planPrice(plans,amc.contractType)!=null?{...amc,amcAmount:String(planPrice(plans,amc.contractType))}:amc)}))}));
  },[plans]);

  useEffect(()=>{
    api.listUsers("ENGINEER")
      .then(list=>setEngineers((list||[]).slice().sort((a,b)=>engineerLabel(a).localeCompare(engineerLabel(b)))))
      .catch(()=>setEngineers([]));
  },[]);

  useEffect(()=>{
    if(!edit)return;
    api.customer(id).then(customer=>setForm({
      ...customer,
      lifts:(customer.lifts||[]).map(lift=>({
        ...lift0,...lift,
        amcDetails:(lift.amcDetails||[]).map(amc=>({
          ...amc0,...amc,
          serviceHistory:(amc.serviceHistory||[]).map(entry=>({...history0,...entry,assignedEngineerId:entry.assignedEngineerId??""}))
        }))
      }))
    })).catch(e=>setError(e.message));
  },[edit,id]);

  const set=e=>setForm(current=>({...current,[e.target.name]:e.target.value}));
  const addLift=()=>setForm(current=>({...current,lifts:[...current.lifts,{...lift0}]}));
  const removeLift=index=>setForm(current=>({...current,lifts:current.lifts.filter((_,i)=>i!==index)}));
  const setLift=(index,e)=>setForm(current=>({...current,lifts:current.lifts.map((lift,i)=>i===index
    ?{...lift,[e.target.name]:e.target.type==="checkbox"?e.target.checked:e.target.value}
    :lift)}));
  const addAmc=index=>setForm(current=>({...current,lifts:current.lifts.map((lift,i)=>i===index
    ?{...lift,amcDetails:[...(lift.amcDetails||[]),autofillAmc({...amc0},amc0.contractType,plans)]}
    :lift)}));
  const updateAmc=(liftIndex,amcIndex,fn)=>setForm(current=>({...current,lifts:current.lifts.map((lift,i)=>i===liftIndex
    ?{...lift,amcDetails:lift.amcDetails.map((amc,j)=>j===amcIndex?fn(amc):amc)}
    :lift)}));
  const setAmcType=(liftIndex,amcIndex,e)=>updateAmc(liftIndex,amcIndex,amc=>autofillAmc(amc,e.target.value,plans));
  const setAmcStart=(liftIndex,amcIndex,e)=>updateAmc(liftIndex,amcIndex,amc=>withStartDate(amc,e.target.value));
  const removeAmc=(liftIndex,amcIndex)=>setForm(current=>({...current,lifts:current.lifts.map((lift,i)=>i===liftIndex
    ?{...lift,amcDetails:lift.amcDetails.filter((_,j)=>j!==amcIndex)}
    :lift)}));
  const setAmc=(liftIndex,amcIndex,e)=>setForm(current=>({...current,lifts:current.lifts.map((lift,i)=>i===liftIndex
    ?{...lift,amcDetails:lift.amcDetails.map((amc,j)=>j===amcIndex?{...amc,[e.target.name]:e.target.value}:amc)}
    :lift)}));
  const addHistory=(liftIndex,amcIndex)=>setForm(current=>({...current,lifts:current.lifts.map((lift,i)=>i===liftIndex
    ?{...lift,amcDetails:lift.amcDetails.map((amc,j)=>j===amcIndex?{...amc,serviceHistory:[...(amc.serviceHistory||[]),{...history0}]}:amc)}
    :lift)}));
  const removeHistory=(liftIndex,amcIndex,historyIndex)=>setForm(current=>({...current,lifts:current.lifts.map((lift,i)=>i===liftIndex
    ?{...lift,amcDetails:lift.amcDetails.map((amc,j)=>j===amcIndex?{...amc,serviceHistory:amc.serviceHistory.filter((_,k)=>k!==historyIndex)}:amc)}
    :lift)}));
  const rescheduleHistory=(liftIndex,amcIndex,historyIndex)=>setForm(current=>({...current,lifts:current.lifts.map((lift,i)=>i===liftIndex
    ?{...lift,amcDetails:lift.amcDetails.map((amc,j)=>{
      if(j!==amcIndex)return amc;
      const cancelled=amc.serviceHistory[historyIndex];
      const replacement={...history0,assignedEngineerId:cancelled.assignedEngineerId??"",engineerName:cancelled.engineerName||"",
        workDone:`Rescheduled visit (originally ${cancelled.serviceDate||"undated"})`};
      return {...amc,serviceHistory:[...amc.serviceHistory,replacement]};
    })}
    :lift)}));
  const setHistory=(liftIndex,amcIndex,historyIndex,e)=>setForm(current=>({...current,lifts:current.lifts.map((lift,i)=>i===liftIndex
    ?{...lift,amcDetails:lift.amcDetails.map((amc,j)=>j===amcIndex?{...amc,serviceHistory:amc.serviceHistory.map((entry,k)=>k===historyIndex?{...entry,[e.target.name]:e.target.value}:entry)}:amc)}
    :lift)}));
  const setHistoryEngineer=(liftIndex,amcIndex,historyIndex,value)=>{
    const engineer=engineers.find(e=>String(e.id)===value);
    setHistory(liftIndex,amcIndex,historyIndex,{target:{name:"assignedEngineerId",value:engineer?engineer.id:""}});
    if(engineer)setHistory(liftIndex,amcIndex,historyIndex,{target:{name:"engineerName",value:engineer.fullName||engineer.username}});
  };

  async function save(e){
    e.preventDefault();
    const found=validateCustomer(form);
    setErrors(found);
    if(Object.keys(found).length){
      setError(`Please fix ${Object.keys(found).length} highlighted field(s): ${Object.values(found)[0]}`);
      window.scrollTo({top:0,behavior:"smooth"});
      return;
    }
    setSaving(true);setError("");
    try{
      const clean={
        ...form,
        customerName:form.customerName.trim(),
        mobileNumber:normalizeMobile(form.mobileNumber),
        email:form.email?.trim()||null,
        city:form.city?.trim()||null,
        state:form.state?.trim()||null,
        pincode:normalizePincode(form.pincode)||null,
        address:form.address?.trim()||null,
        lifts:form.lifts.map(lift=>({
          ...lift,
          numberOfFloors:numberOrNull(lift.numberOfFloors),
          yearOfInstallation:numberOrNull(lift.yearOfInstallation),
          capacityInKg:numberOrNull(lift.capacityInKg),
          capacityInPersons:numberOrNull(lift.capacityInPersons),
          kw:numberOrNull(lift.kw),amps:numberOrNull(lift.amps),speed:numberOrNull(lift.speed),
          voltage:numberOrNull(lift.voltage),frequency:numberOrNull(lift.frequency),
          ratedSpeed:numberOrNull(lift.ratedSpeed),trippingSpeed:numberOrNull(lift.trippingSpeed),kva:numberOrNull(lift.kva),
          amcDetails:(lift.amcDetails||[]).map(amc=>({
            ...amc,
            startDate:dateOrNull(amc.startDate),endDate:dateOrNull(amc.endDate),
            nextPaymentDate:dateOrNull(amc.nextPaymentDate),nextServiceDate:dateOrNull(amc.nextServiceDate),
            amcAmount:numberOrNull(amc.amcAmount),
            serviceHistory:(amc.serviceHistory||[]).map(entry=>({...entry,serviceDate:dateOrNull(entry.serviceDate),assignedEngineerId:numberOrNull(entry.assignedEngineerId),engineerName:entry.engineerName?.trim()||null})),
            totalServices:(amc.serviceHistory||[]).length,
            completedServices:(amc.serviceHistory||[]).filter(entry=>entry.status==="COMPLETED").length
          }))
        }))
      };
      const result=edit?await api.updateCustomer(id,clean):await api.createCustomer(clean);
      nav(`/app/customers/${result.id}`);
    }catch(x){setError(x.message)}
    finally{setSaving(false)}
  }

  return <section className="page narrow">
    <div className="page-head"><div><span className="eyebrow">{edit?"EDIT":"NEW"}</span><h1>{edit?"Edit customer":"Add customer"}</h1></div><button className="secondary" onClick={()=>nav(-1)}>Cancel</button></div>
    {error&&<div className="alert error">{error}</div>}
    <form onSubmit={save} className="form">
      <div className="panel"><h2>Customer details</h2><div className="form-grid">
        <Field label="Customer name *" name="customerName" value={form.customerName} onChange={set} required maxLength={100} error={errors.customerName}/>
        <Field label="Customer code" name="customerCode" value={form.customerCode} readOnly disabled placeholder="Auto-generated after save" hint="Format: APL-ELV-<name initials>-<customer id>"/>
        <Field label="Mobile number *" name="mobileNumber" value={form.mobileNumber} onChange={set} required type="tel" inputMode="numeric" maxLength={13} placeholder="98765 43210" hint={HINTS.mobile} error={errors.mobileNumber}/>
        <Field label="Email" name="email" value={form.email} onChange={set} type="email" maxLength={150} pattern={HTML_PATTERNS.email} placeholder={HINTS.email} error={errors.email}/>
        <Field label="City" name="city" value={form.city} onChange={set} maxLength={100} error={errors.city}/>
        <Field label="State" name="state" value={form.state} onChange={set} maxLength={100} error={errors.state}/>
        <Field label="Pincode" name="pincode" value={form.pincode} onChange={set} inputMode="numeric" maxLength={6} pattern={HTML_PATTERNS.pincode} hint={HINTS.pincode} error={errors.pincode}/>
        <label>Address<textarea name="address" value={form.address||""} onChange={set} maxLength={500} aria-invalid={!!errors.address}/>{errors.address&&<small className="field-error">{errors.address}</small>}</label>
      </div></div>
      <div className="panel">
        <div className="panel-head"><div><h2>Lifts</h2><span className="muted">{form.lifts.length} configured</span></div><button type="button" className="secondary" onClick={addLift}>+ Add lift</button></div>
        {form.lifts.map((lift,liftIndex)=><div className="lift-card" key={lift.id||liftIndex}>
          <div className="lift-head"><b>Lift {liftIndex+1}</b><button type="button" className="text-danger" onClick={()=>removeLift(liftIndex)}>Remove</button></div>
          <div className="form-grid">
            {["liftType","driveType","doorType"].map(name=><label key={name}>{name.replace(/([A-Z])/g," $1")}<select name={name} value={lift[name]||""} onChange={e=>setLift(liftIndex,e)}>{(name==="liftType"?["PASSENGER","GOODS","HOSPITAL","HOME","CAR","OTHER"]:name==="driveType"?["TRACTION","MRL","HYDRAULIC","OTHER"]:["AUTO","MANUAL"]).map(value=><option key={value}>{value}</option>)}</select></label>)}
            <Field label="Floors *" name="numberOfFloors" value={lift.numberOfFloors} onChange={e=>setLift(liftIndex,e)} type="number" min="1" required/>
            <Field label={`Capacity (kg)${["GOODS","HOSPITAL","CAR"].includes(lift.liftType)?" *":""}`} name="capacityInKg" value={lift.capacityInKg} onChange={e=>setLift(liftIndex,e)} type="number" min="1" required={["GOODS","HOSPITAL","CAR"].includes(lift.liftType)}/>
            <Field label={`Capacity (persons)${lift.liftType==="PASSENGER"?" *":""}`} name="capacityInPersons" value={lift.capacityInPersons} onChange={e=>setLift(liftIndex,e)} type="number" min="1" required={lift.liftType==="PASSENGER"}/>
            <Field label="Brand" name="brand" value={lift.brand} onChange={e=>setLift(liftIndex,e)}/>
            <Field label="Lift model" name="liftModel" value={lift.liftModel} onChange={e=>setLift(liftIndex,e)}/>
            <Field label="Installation type" name="installationType" value={lift.installationType} onChange={e=>setLift(liftIndex,e)}/>
            <Field label="Installation year" name="yearOfInstallation" value={lift.yearOfInstallation} onChange={e=>setLift(liftIndex,e)} type="number" min="1900" max={CURRENT_YEAR} error={errors[`lift.${liftIndex}.yearOfInstallation`]}/>
            <Field label="Serial number" name="serialNumber" value={lift.serialNumber} onChange={e=>setLift(liftIndex,e)}/>
          </div>
          <div className="panel-head" style={{marginTop:20,marginBottom:8}}><div><h3 className="section-sub" style={{margin:0,padding:0,border:0}}>AMC contracts ({lift.amcDetails?.length||0})</h3></div><button type="button" className="secondary small" onClick={()=>addAmc(liftIndex)}>+ Add contract</button></div>
          {(lift.amcDetails||[]).map((amc,amcIndex)=><div className="lift-card" key={amc.id||amcIndex}>
            <div className="lift-head"><b>Contract {amcIndex+1}</b><button type="button" className="text-danger" onClick={()=>removeAmc(liftIndex,amcIndex)}>Remove</button></div>
            <div className="form-grid">
              <Field label="Contract number" name="contractNumber" value={amc.contractNumber} onChange={e=>setAmc(liftIndex,amcIndex,e)}/>
              <label>Status<select name="status" value={amc.status||"PENDING"} onChange={e=>setAmc(liftIndex,amcIndex,e)}>{["PENDING","ACTIVE","EXPIRED","CANCELLED"].map(v=><option key={v}>{v}</option>)}</select></label>
              <label>Contract type<select name="contractType" value={amc.contractType||"SILVER"} onChange={e=>setAmcType(liftIndex,amcIndex,e)}>{AMC_TIERS.map(v=>{const p=planPrice(plans,v);return <option key={v} value={v}>{v}{p!=null?` · ₹${Number(p).toLocaleString("en-IN")}/yr`:""}</option>;})}</select></label>
              <Field label="AMC amount" name="amcAmount" value={amc.amcAmount} onChange={e=>setAmc(liftIndex,amcIndex,e)} type="number" min="0" step="0.01" error={errors[`lift.${liftIndex}.amc.${amcIndex}.amcAmount`]}/>
              <label>Payment frequency<select name="paymentFrequency" value={normalizeFrequency(amc.paymentFrequency)||"YEARLY"} onChange={e=>setAmc(liftIndex,amcIndex,e)}>{AMC_FREQUENCIES.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label>
              <Field label="Start date" name="startDate" value={amc.startDate} onChange={e=>setAmcStart(liftIndex,amcIndex,e)} type="date" error={errors[`lift.${liftIndex}.amc.${amcIndex}.startDate`]}/>
              <Field label="End date" name="endDate" value={amc.endDate} onChange={e=>setAmc(liftIndex,amcIndex,e)} type="date" min={amc.startDate||undefined} error={errors[`lift.${liftIndex}.amc.${amcIndex}.endDate`]}/>
              <Field label="Next payment date" name="nextPaymentDate" value={amc.nextPaymentDate} onChange={e=>setAmc(liftIndex,amcIndex,e)} type="date"/>
              <Field label="Next service date" name="nextServiceDate" value={amc.nextServiceDate} onChange={e=>setAmc(liftIndex,amcIndex,e)} type="date"/>
            </div>
            <div className="panel-head" style={{marginTop:18,marginBottom:8}}><b>Service history ({amc.serviceHistory?.length||0})</b><button type="button" className="secondary small" onClick={()=>addHistory(liftIndex,amcIndex)}>+ Add visit</button></div>
            {(amc.serviceHistory||[]).map((entry,historyIndex)=><div className="form-grid history-entry" key={entry.id||historyIndex}>
              <Field label="Service date *" name="serviceDate" value={entry.serviceDate} onChange={e=>setHistory(liftIndex,amcIndex,historyIndex,e)} type="date" required error={errors[`lift.${liftIndex}.amc.${amcIndex}.history.${historyIndex}.serviceDate`]}/>
              <label>Engineer *<select value={entry.assignedEngineerId===""||entry.assignedEngineerId==null?"":String(entry.assignedEngineerId)} onChange={e=>setHistoryEngineer(liftIndex,amcIndex,historyIndex,e.target.value)} required={!entry.engineerName}>
                <option value="">{entry.engineerName?`Unlinked: ${entry.engineerName}`:"Select engineer"}</option>
                {engineers.filter(e=>e.enabled||String(e.id)===String(entry.assignedEngineerId)).map(e=><option key={e.id} value={e.id}>{engineerLabel(e)}{e.enabled?"":" — disabled"}</option>)}
              </select>{!entry.assignedEngineerId&&entry.engineerName&&<small className="muted">Not linked to an engineer account — pick one so it appears on their dashboard.</small>}</label>
              <Field label="Work done *" name="workDone" value={entry.workDone}               onChange={e=>setHistory(liftIndex,amcIndex,historyIndex,e)} required maxLength={500} error={errors[`lift.${liftIndex}.amc.${amcIndex}.history.${historyIndex}.workDone`]}/>
              <label>Status<select name="status" value={entry.status||"SCHEDULED"} onChange={e=>setHistory(liftIndex,amcIndex,historyIndex,e)}>{["SCHEDULED","COMPLETED","CANCELLED"].map(v=><option key={v}>{v}</option>)}</select></label>
              {entry.status==="CANCELLED"&&<button type="button" className="secondary small" title="Keeps this cancelled visit and adds a new scheduled visit below" onClick={()=>rescheduleHistory(liftIndex,amcIndex,historyIndex)}>Reschedule</button>}
              <button type="button" className="text-danger" onClick={()=>removeHistory(liftIndex,amcIndex,historyIndex)}>Remove visit</button>
            </div>)}
          </div>)}
          {!lift.amcDetails?.length&&<div className="empty-box">No AMC contracts recorded for this lift.</div>}
        </div>)}
        {!form.lifts.length&&<div className="empty-box">No lifts added yet.</div>}
      </div>
      <div className="form-actions"><button type="button" className="secondary" onClick={()=>nav(-1)}>Cancel</button><button className="primary" disabled={saving}>{saving?"Saving…":edit?"Save changes":"Create customer"}</button></div>
    </form>
  </section>;
}
