import React, { useCallback, useEffect, useState } from "react";
import { Cloud, Eye, Download, Trash2, RefreshCw, FileText } from "lucide-react";
import { api } from "../services/api";

const CATEGORIES = [
  { key: "AMC_CONTRACT", label: "Contract" },
  { key: "BILL", label: "Bills" },
  { key: "WORK_ORDER", label: "Work Orders" },
  { key: "QUOTATION", label: "Quotations" },
  { key: "SERVICE_HISTORY", label: "Service History" },
];

function fmtDate(iso) {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }); }
  catch { return iso; }
}

function fmtSize(bytes) {
  if (bytes === null || bytes === undefined) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function CustomerDriveDocuments({ customerId }) {
  const [filesByCategory, setFilesByCategory] = useState({});
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [busyFileId, setBusyFileId] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadFiles = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const results = await Promise.all(
        CATEGORIES.map((c) => api.driveListFiles(customerId, c.key).catch(() => []))
      );
      const next = {};
      CATEGORIES.forEach((c, i) => { next[c.key] = results[i] || []; });
      setFilesByCategory(next);
    } catch (e) {
      setError(e.message || "Failed to load Google Drive documents.");
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => { loadFiles(); }, [loadFiles]);

  async function handleSync() {
    setSyncing(true);
    setError("");
    setNotice("");
    try {
      const res = await api.driveGenerateCustomerDocuments(customerId);
      const parts = [];
      parts.push(res.contract ? "Contract uploaded" : "No AMC contract to generate");
      parts.push(res.bill ? "Bill uploaded" : "No bill to generate");
      parts.push(res.workOrder ? "Work order uploaded" : "Work order not generated");
      parts.push(res.quotation ? "Quotation uploaded" : "Quotation not generated");
      parts.push(`${res.serviceHistory?.length || 0} service history file(s) uploaded`);
      setNotice(parts.join(" · "));
      await loadFiles();
    } catch (e) {
      setError(e.message || "Failed to sync documents to Google Drive.");
    } finally {
      setSyncing(false);
    }
  }

  async function openBlob(file, download) {
    setBusyFileId(file.id);
    setError("");
    try {
      const blob = await api.driveDownloadFile(file.id);
      const url = URL.createObjectURL(blob);
      if (download) {
        const a = document.createElement("a");
        a.href = url;
        a.download = file.name;
        a.click();
      } else {
        window.open(url, "_blank", "noopener");
      }
      setTimeout(() => URL.revokeObjectURL(url), 30_000);
    } catch (e) {
      setError(e.message || "Failed to fetch file from Google Drive.");
    } finally {
      setBusyFileId(null);
    }
  }

  async function handleDelete(file) {
    if (!window.confirm(`Delete "${file.name}" from Google Drive? This cannot be undone.`)) return;
    setBusyFileId(file.id);
    setError("");
    try {
      await api.driveDeleteFile(file.id);
      setFilesByCategory((prev) => {
        const next = { ...prev };
        Object.keys(next).forEach((k) => { next[k] = next[k].filter((f) => f.id !== file.id); });
        return next;
      });
    } catch (e) {
      setError(e.message || "Failed to delete file from Google Drive.");
    } finally {
      setBusyFileId(null);
    }
  }

  return (
    <div className="panel">
      <div className="panel-head">
        <h2><Cloud size={17} style={{ verticalAlign: "-3px", marginRight: 6 }} /> Google Drive Documents</h2>
        <button className="secondary small" onClick={handleSync} disabled={syncing}>
          <RefreshCw size={14} className={syncing ? "spin" : undefined} /> {syncing ? "Syncing…" : "Sync to Drive"}
        </button>
      </div>

      {error && <div className="alert error">{error}</div>}
      {notice && <div className="alert success">{notice}</div>}
      {loading && <div className="loading">Loading documents…</div>}

      {!loading && CATEGORIES.map((c) => {
        const files = filesByCategory[c.key] || [];
        return (
          <div key={c.key} style={{ marginTop: 18 }}>
            <h2 style={{ fontSize: 13, color: "#586577", marginBottom: 8 }}>{c.label}</h2>
            {files.length === 0 && <div className="empty-box">No files uploaded yet.</div>}
            {files.length > 0 && (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr><th>Name</th><th>Size</th><th>Modified</th><th>Actions</th></tr>
                  </thead>
                  <tbody>
                    {files.map((f) => (
                      <tr key={f.id}>
                        <td><FileText size={14} style={{ verticalAlign: "-2px", marginRight: 6, color: "#7a8492" }} />{f.name}</td>
                        <td>{fmtSize(f.size)}</td>
                        <td>{fmtDate(f.modifiedTime)}</td>
                        <td className="actions">
                          <button
                            className="icon-btn" title="View"
                            disabled={busyFileId === f.id}
                            onClick={() => openBlob(f, false)}
                          ><Eye size={16} /></button>
                          <button
                            className="icon-btn" title="Download"
                            disabled={busyFileId === f.id}
                            onClick={() => openBlob(f, true)}
                          ><Download size={16} /></button>
                          <button
                            className="danger-icon" title="Delete"
                            disabled={busyFileId === f.id}
                            onClick={() => handleDelete(f)}
                          ><Trash2 size={16} /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
