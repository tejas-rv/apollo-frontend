import React,{useEffect,useState} from "react";
import {Link} from "react-router-dom";
import {Download,ChevronLeft,ChevronRight,Eye} from "lucide-react";
import {api} from "../../services/api";

const STATUS_LABEL={DRAFT:"Draft",SUBMITTED:"Submitted",PDF_SENT:"PDF Sent"};
const STATUS_CLASS={DRAFT:"pending",SUBMITTED:"active",PDF_SENT:"active"};

export default function ServiceReportHistory(){
  const [reports,setReports]=useState([]);
  const [page,setPage]=useState(0);
  const [total,setTotal]=useState(0);
  const [loading,setLoading]=useState(false);
  const [err,setErr]=useState("");
  const [pdfLoading,setPdfLoading]=useState(null);
  const SIZE=20;

  useEffect(()=>{
    setLoading(true);
    api.engineerMyReports(page,SIZE)
      .then(d=>{setReports(d.content||[]);setTotal(d.totalElements||0);})
      .catch(e=>setErr(e.message))
      .finally(()=>setLoading(false));
  },[page]);

  async function downloadPdf(reportId){
    setPdfLoading(reportId);
    try{
      const blob=await api.engineerReportPdf(reportId);
      const url=URL.createObjectURL(blob);
      const a=document.createElement("a");
      a.href=url; a.download=`ServiceReport-${reportId}.pdf`; a.click();
      URL.revokeObjectURL(url);
    }catch(e){setErr(e.message);}
    finally{setPdfLoading(null);}
  }

  return <section className="page">
    <div className="page-head">
      <div><span className="eyebrow">HISTORY</span><h1>My Reports</h1><p className="muted">All service reports you have submitted.</p></div>
      <Link className="primary" to="/engineer/report/new">+ New Report</Link>
    </div>

    {err&&<div className="alert error">{err}</div>}

    <div className="panel" style={{padding:0,overflow:"hidden"}}>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Customer</th>
              <th>Visit Date</th>
              <th>Status</th>
              <th>Check Items</th>
              <th>Submitted</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading&&<tr><td colSpan="7" className="empty">Loading…</td></tr>}
            {!loading&&reports.length===0&&<tr><td colSpan="7" className="empty">No reports submitted yet.</td></tr>}
            {!loading&&reports.map(r=>{
              const yesNoTotal=r.checkItems?.filter(i=>i.answerType==="YES_NO").length||0;
              const yesCount  =r.checkItems?.filter(i=>i.answerType==="YES_NO"&&i.answerYn===true).length||0;
              const noCount   =r.checkItems?.filter(i=>i.answerType==="YES_NO"&&i.answerYn===false).length||0;
              return <tr key={r.id}>
                <td><b>#{r.id}</b></td>
                <td>
                  <b>{r.customerName}</b>
                  <small>AMC #{r.amcContractId}</small>
                </td>
                <td>{r.visitDate}</td>
                <td><span className={`status ${STATUS_CLASS[r.status]||"pending"}`}>{STATUS_LABEL[r.status]||r.status}</span></td>
                <td>
                  <span style={{color:"#217746",fontWeight:600}}>✔{yesCount}</span>
                  {" / "}
                  <span style={{color:"#a33838",fontWeight:600}}>✘{noCount}</span>
                  <span style={{color:"var(--muted)"}}> / {yesNoTotal} checks</span>
                </td>
                <td><small>{r.submittedAt?r.submittedAt.replace("T"," ").slice(0,16):"—"}</small></td>
                <td>
                  <div style={{display:"flex",gap:8}}>
                    <button className="secondary small" disabled={pdfLoading===r.id} onClick={()=>downloadPdf(r.id)}>
                      <Download size={13}/> {pdfLoading===r.id?"…":"PDF"}
                    </button>
                  </div>
                </td>
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
