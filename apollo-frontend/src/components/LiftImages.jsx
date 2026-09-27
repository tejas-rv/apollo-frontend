import React, { useCallback, useEffect, useRef, useState } from "react";
import { Image as ImageIcon, Upload, Eye, Trash2 } from "lucide-react";
import { api } from "../services/api";

export default function LiftImages({ customerId, liftId }) {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [busyFileId, setBusyFileId] = useState(null);
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const files = await api.driveListLiftImages(customerId, liftId);
      setImages(files || []);
    } catch (e) {
      setError(e.message || "Failed to load lift photos.");
    } finally {
      setLoading(false);
    }
  }, [customerId, liftId]);

  useEffect(() => { load(); }, [load]);

  async function handleFileChosen(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      await api.driveUploadLiftImage(customerId, liftId, file);
      await load();
    } catch (err) {
      setError(err.message || "Failed to upload lift photo.");
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(file) {
    if (!window.confirm(`Delete "${file.name}"? This cannot be undone.`)) return;
    setBusyFileId(file.id);
    setError("");
    try {
      await api.driveDeleteFile(file.id);
      setImages((prev) => prev.filter((f) => f.id !== file.id));
    } catch (err) {
      setError(err.message || "Failed to delete photo.");
    } finally {
      setBusyFileId(null);
    }
  }

  async function handleView(file) {
    setBusyFileId(file.id);
    setError("");
    try {
      const blob = await api.driveDownloadFile(file.id);
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank", "noopener");
      setTimeout(() => URL.revokeObjectURL(url), 30_000);
    } catch (err) {
      setError(err.message || "Failed to open photo.");
    } finally {
      setBusyFileId(null);
    }
  }

  return (
    <div className="lift-images">
      <div className="lift-images-head">
        <span><ImageIcon size={14} style={{ verticalAlign: "-2px", marginRight: 6 }} /> Lift photos</span>
        <button
          className="secondary small"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          <Upload size={13} /> {uploading ? "Uploading…" : "Upload photo"}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={handleFileChosen}
        />
      </div>

      {error && <div className="alert error" style={{ marginTop: 8 }}>{error}</div>}
      {loading && <div className="loading" style={{ padding: 12 }}>Loading photos…</div>}

      {!loading && images.length === 0 && (
        <div className="empty-box" style={{ padding: 12 }}>No photos uploaded for this lift yet.</div>
      )}

      {!loading && images.length > 0 && (
        <div className="lift-image-grid">
          {images.map((f) => (
            <div className="lift-image-card" key={f.id}>
              <div className="lift-image-name" title={f.name}>{f.name}</div>
              <div className="lift-image-actions">
                <button
                  className="icon-btn" title="View"
                  disabled={busyFileId === f.id}
                  onClick={() => handleView(f)}
                ><Eye size={15} /></button>
                <button
                  className="danger-icon" title="Delete"
                  disabled={busyFileId === f.id}
                  onClick={() => handleDelete(f)}
                ><Trash2 size={15} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
