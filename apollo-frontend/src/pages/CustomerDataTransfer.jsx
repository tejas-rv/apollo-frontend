import React,{useState} from "react";
import {Link} from "react-router-dom";
import {Upload,Download,Loader2,FileSpreadsheet,CloudUpload,CloudDownload} from "lucide-react";
import {api} from "../services/api";

const FILE_NAME="Apollo_Elevator_Customer_Data.xlsx";
const STATUS_CLASS={IMPORTED:"success",UPDATED:"success",SKIPPED:"pending",FAILED:"error"};

function YesNoToggle({label,value,onChange,disabled}){
  return <div className="field-label-row">
    <span>{label}</span>
    <div className="segmented" style={{width:"fit-content"}}>
      <button type="button" disabled={disabled} className={value?"selected":""} onClick={()=>onChange(true)}>Yes</button>
      <button type="button" disabled={disabled} className={!value?"selected":""} onClick={()=>onChange(false)}>No</button>
    </div>
  </div>;
}

export default function CustomerDataTransfer(){
  const [importFromDrive,setImportFromDrive]=useState(false);
  const [importMode,setImportMode]=useState("MERGE");
  const [exportToDrive,setExportToDrive]=useState(false);
  const [includeCompleted,setIncludeCompleted]=useState(true);
  const [file,setFile]=useState(null);
  const [fileKey,setFileKey]=useState(0);
  const [busy,setBusy]=useState("");
  const [error,setError]=useState("");
  const [notice,setNotice]=useState("");
  const [result,setResult]=useState(null);

  async function runImport(){
    if(!importFromDrive&&!file){setError(`Please choose the ${FILE_NAME} file to upload.`);return;}
    if(!importFromDrive&&!file.name.toLowerCase().endsWith(".xlsx")){setError("Only Excel .xlsx files are supported.");return;}
    if(importMode==="OVERRIDE"&&!window.confirm("Override import: a backup of the current data will be saved to Google Drive, then representatives and service visits of the customers in this file will be replaced by the file rows. Continue?"))return;
    setBusy("import");setError("");setNotice("");setResult(null);
    try{
      const r=await api.importCustomerData({fromGoogleDrive:importFromDrive,file,mode:importMode});
      setResult(r);
      setFile(null);setFileKey(k=>k+1);
    }catch(e){setError(e.message||"Import failed.");}
    finally{setBusy("");}
  }

  async function runExport(){
    setBusy("export");setError("");setNotice("");
    try{
      const r=await api.exportCustomerData(exportToDrive,includeCompleted);
      if(exportToDrive){
        setNotice(`Exported ${r.customerCount} customer(s) to Google Drive as ${r.driveFile?.name||r.fileName}.`);
      }else{
        const url=URL.createObjectURL(r);
        const a=document.createElement("a");
        a.href=url;a.download=FILE_NAME;a.click();
        setTimeout(()=>URL.revokeObjectURL(url),30_000);
        setNotice(`${FILE_NAME} downloaded.`);
      }
    }catch(e){setError(e.message||"Export failed.");}
    finally{setBusy("");}
  }

  return <section className="page">
    <div className="page-head">
      <div>
        <span className="eyebrow">ADMINISTRATION</span>
        <h1>Customer data import / export</h1>
        <p className="muted">Bulk import or export customers, representatives, lifts, AMC contracts and service history using <b>{FILE_NAME}</b>.</p>
      </div>
    </div>

    {error&&<div className="alert error">{error}</div>}
    {notice&&<div className="alert success">{notice}</div>}

    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(320px,1fr))",gap:16,marginBottom:20}}>
      <div className="panel">
        <div className="panel-head"><div><h2 style={{margin:0}}>Import</h2><span className="muted">New customers are added; existing customer codes are updated (lifts by liftId/serial, AMC by amcId/contract no., visits by visitId). Blank cells keep current values. Always edit a fresh export so visitIds are present.</span></div><Upload size={20}/></div>
        <YesNoToggle label="Use Google Drive?" value={importFromDrive} onChange={setImportFromDrive} disabled={!!busy}/>
        <div className="field-label-row">
          <span>Import mode</span>
          <div className="segmented" style={{width:"fit-content"}}>
            <button type="button" disabled={!!busy} className={importMode==="MERGE"?"selected":""} onClick={()=>setImportMode("MERGE")}>Merge</button>
            <button type="button" disabled={!!busy} className={importMode==="OVERRIDE"?"selected":""} onClick={()=>setImportMode("OVERRIDE")}>Override</button>
          </div>
        </div>
        {importMode==="MERGE"
          ? <p className="muted" style={{marginTop:4}}>Adds and updates rows only; nothing is deleted.</p>
          : <div className="alert error" style={{marginTop:4}}>
              Representatives and service visits of the customers in the file are replaced by the file rows (rows missing from the file are deleted). Customers, lifts and AMC contracts are never deleted; completed visits are kept if the file was exported without them. A backup of the current data is first saved to Google Drive as <b>&lt;FileName&gt;_&lt;yyyyMMdd_HHmmss&gt;_&lt;username&gt;.xlsx</b> (Google Drive must be enabled).
            </div>}
        {importFromDrive
          ? <p className="muted"><CloudDownload size={15}/> Reads <b>{FILE_NAME}</b> from the configured Google Drive folder.</p>
          : <label className="field-label-row" style={{marginTop:10}}>
              <span>Excel file (.xlsx)</span>
              <input key={fileKey} type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" disabled={!!busy} onChange={e=>setFile(e.target.files?.[0]||null)}/>
            </label>}
        <div className="form-actions" style={{marginTop:16}}>
          <button className="primary" onClick={runImport} disabled={!!busy}>
            {busy==="import"?<Loader2 size={17} className="spin"/>:<Upload size={17}/>} Import customers
          </button>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head"><div><h2 style={{margin:0}}>Export</h2><span className="muted">Exports all customers in the same format used for import.</span></div><Download size={20}/></div>
        <YesNoToggle label="Use Google Drive?" value={exportToDrive} onChange={setExportToDrive} disabled={!!busy}/>
        <YesNoToggle label="Include completed service visits?" value={includeCompleted} onChange={setIncludeCompleted} disabled={!!busy}/>
        <p className="muted" style={{marginTop:4}}>
          {includeCompleted
            ? "Service History lists scheduled, completed and cancelled visits; completed rows show the work done from the engineer's report."
            : "Service History lists only scheduled and cancelled visits. Re-importing this file does not delete completed visits."}
        </p>
        <p className="muted">
          {exportToDrive
            ? <><CloudUpload size={15}/> Saves <b>{FILE_NAME}</b> to the configured Google Drive folder (replaces the existing file).</>
            : <><FileSpreadsheet size={15}/> Downloads <b>{FILE_NAME}</b> to this computer.</>}
        </p>
        <div className="form-actions" style={{marginTop:16}}>
          <button className="primary" onClick={runExport} disabled={!!busy}>
            {busy==="export"?<Loader2 size={17} className="spin"/>:<Download size={17}/>} Export customers
          </button>
        </div>
      </div>
    </div>

    {result&&<div className="panel">
      <div className="panel-head"><div><h2 style={{margin:0}}>Import result</h2><span className="muted">{result.fileName} · {result.source==="GOOGLE_DRIVE"?"Google Drive":"Upload"} · {result.mode==="OVERRIDE"?"Override":"Merge"}</span></div></div>
      {result.backupFile&&<div className="alert success">Backup saved to Google Drive as <b>{result.backupFile.name}</b>.</div>}
      <div className="mini-stats" style={{paddingTop:0,marginBottom:16}}>
        <div><b>{result.totalCustomers}</b><small className="muted"> total</small></div>
        <div><b>{result.importedCount}</b><small className="muted"> imported</small></div>
        <div><b>{result.updatedCount}</b><small className="muted"> updated</small></div>
        <div><b>{result.skippedCount}</b><small className="muted"> unchanged</small></div>
        <div><b>{result.failedCount}</b><small className="muted"> failed</small></div>
      </div>

      {result.unlinkedRowErrors?.length>0&&<div className="alert error">
        <b>Rows not linked to any customer</b>
        <ul style={{margin:"6px 0 0",paddingLeft:18}}>{result.unlinkedRowErrors.map((m,i)=><li key={i}>{m}</li>)}</ul>
      </div>}

      <div className="table-wrap">
        <table>
          <thead><tr><th>File key</th><th>Customer code</th><th>Status</th><th>Lifts</th><th>AMC</th><th>Details</th></tr></thead>
          <tbody>
            {result.customers?.map(c=><tr key={c.customerKey}>
              <td>{c.customerKey}</td>
              <td>{c.customerId?<Link className="table-link" to={`/app/customers/${c.customerId}`}><b>{c.customerCode}</b></Link>:<b>{c.customerCode||"—"}</b>}</td>
              <td><span className={`status ${STATUS_CLASS[c.status]||""}`}>{c.status}</span></td>
              <td>{c.liftCount}</td>
              <td>{c.amcContractCount}</td>
              <td>{c.messages?.length
                ? <ul style={{margin:0,paddingLeft:16}}>{c.messages.map((m,i)=><li key={i}><small>{m}</small></li>)}</ul>
                : <small className="muted">—</small>}</td>
            </tr>)}
            {!result.customers?.length&&<tr><td colSpan="6" className="empty">No customer rows found in the file.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>}
  </section>;
}
