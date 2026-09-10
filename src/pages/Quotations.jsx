import { Check, FilePlus2, Search, X } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "../services/api";

const QUOTATION_STATUSES = ["DRAFT", "SENT", "ACCEPTED", "REJECTED", "EXPIRED"];
const STATUS_LABELS = {
  DRAFT: "Draft",
  SENT: "Sent",
  ACCEPTED: "Accepted",
  REJECTED: "Rejected",
  EXPIRED: "Expired",
  NOT_CREATED: "Quotation needed",
};
const NEXT_STATUSES = {
  DRAFT: ["SENT", "REJECTED"],
  SENT: ["ACCEPTED", "REJECTED", "EXPIRED"],
  ACCEPTED: [],
  REJECTED: [],
  EXPIRED: [],
};

function formatDate(value) {
  return value ? new Date(value).toLocaleDateString() : "-";
}

export default function Quotations() {
  const [data, setData] = useState({ content: [], totalElements: 0 });
  const [status, setStatus] = useState("");
  const [query, setQuery] = useState("");
  const [form, setForm] = useState({ enquiryId: "", amount: "", notes: "" });
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = () =>
    Promise.all([
      api.quotations({ status, query }),
      api.adminEnquiries({ status: "IN_PROGRESS", page: 0, size: 50 }),
    ])
      .then(([quotationData, enquiryData]) => {
        const quotationEnquiryIds = new Set(
          (quotationData.content || []).map((item) => item.enquiryId),
        );
        const pendingEnquiries = (enquiryData.content || [])
          .filter((item) => !status && !quotationEnquiryIds.has(item.id))
          .map((item) => ({
            id: `enquiry-${item.id}`,
            enquiryId: item.id,
            customerName: item.fullName,
            phoneNumber: item.phoneNumber,
            requirementType: item.requirementType || item.inquiryType,
            createdAt: item.updatedAt || item.createdAt,
            status: "NOT_CREATED",
          }));
        setData({
          ...quotationData,
          content: [...pendingEnquiries, ...(quotationData.content || [])],
        });
      })
      .catch((e) => setError(e.message));
  useEffect(() => {
    load();
  }, [status]);

  function openForm(enquiryId = "") {
    setForm({
      enquiryId: enquiryId ? String(enquiryId) : "",
      amount: "",
      notes: "",
    });
    setShowForm(true);
  }

  async function createQuotation(event) {
    event.preventDefault();
    setError("");
    setSaving(true);
    try {
      await api.createQuotation({
        enquiryId: Number(form.enquiryId),
        amount: Number(form.amount),
        notes: form.notes.trim(),
      });
      setForm({ enquiryId: "", amount: "", notes: "" });
      setShowForm(false);
      load();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function updateStatus(quotation, nextStatus) {
    try {
      await api.updateQuotationStatus(quotation.id, nextStatus);
      load();
    } catch (e) {
      setError(e.message);
    }
  }

  async function moveToWorkOrder(quotation) {
    try {
      await api.convertEnquiryToWorkOrder(quotation.enquiryId);
      load();
    } catch (e) {
      setError(e.message);
    }
  }

  const filtered = (data.content || []).filter((item) => {
    if (["WORK_ORDER", "COMPLETED", "CLOSED"].includes(item.enquiryStatus))
      return false;
    const value =
      `${item.quotationNumber || ""} ${item.customerName || ""} ${item.phoneNumber || ""}`.toLowerCase();
    return !query || value.includes(query.toLowerCase());
  });

  return (
    <section className="page">
      <div className="page-head">
        <div>
          <span className="eyebrow">MARKETING</span>
          <h1>Quotations</h1>
          <p className="muted">
            {data.totalElements ?? filtered.length} quotation records
          </p>
        </div>
        <button className="primary" onClick={() => openForm()}>
          <FilePlus2 size={16} /> New quotation
        </button>
      </div>
      {error && <div className="alert error">{error}</div>}
      <div
        className="toolbar"
        style={{
          display: "flex",
          gap: 12,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <div className="search" style={{ flex: "1 1 260px" }}>
          <Search size={18} />
          <input
            placeholder="Search quotation or customer..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <select
          className="bill-select"
          style={{ maxWidth: 180 }}
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">All statuses</option>
          {QUOTATION_STATUSES.map((item) => (
            <option key={item} value={item}>
              {STATUS_LABELS[item]}
            </option>
          ))}
        </select>
      </div>
      <div className="panel">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Quotation</th>
                <th>Customer</th>
                <th>Phone</th>
                <th>Amount</th>
                <th>Created</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((quotation) => (
                <tr key={quotation.id}>
                  <td>
                    <b>{quotation.quotationNumber || `#${quotation.id}`}</b>
                  </td>
                  <td>
                    {quotation.customerName || quotation.enquiryName || "-"}
                  </td>
                  <td>{quotation.phoneNumber || "-"}</td>
                  <td>
                    {quotation.amount == null
                      ? "-"
                      : `Rs. ${Number(quotation.amount).toLocaleString("en-IN")}`}
                  </td>
                  <td>{formatDate(quotation.createdAt)}</td>
                  <td>
                    <span
                      className={`status ${quotation.status === "ACCEPTED" ? "active" : quotation.status === "REJECTED" ? "" : "pending"}`}
                    >
                      {STATUS_LABELS[quotation.status] || quotation.status}
                    </span>
                  </td>
                  <td>
                    <div className="actions">
                      {QUOTATION_STATUSES.filter(
                        (nextStatus) => nextStatus !== quotation.status,
                      ).map((nextStatus) => (
                        <button
                          key={nextStatus}
                          className="secondary"
                          disabled={
                            !NEXT_STATUSES[quotation.status]?.includes(
                              nextStatus,
                            )
                          }
                          onClick={() => updateStatus(quotation, nextStatus)}
                        >
                          {nextStatus === "ACCEPTED" ? (
                            <Check size={14} />
                          ) : nextStatus === "REJECTED" ? (
                            <X size={14} />
                          ) : (
                            STATUS_LABELS[nextStatus]
                          )}
                        </button>
                      ))}
                      {quotation.status === "NOT_CREATED" && (
                        <button
                          className="primary"
                          onClick={() => openForm(quotation.enquiryId)}
                        >
                          Create quotation
                        </button>
                      )}
                      {quotation.status === "ACCEPTED" && (
                        <button
                          className="primary"
                          onClick={() => moveToWorkOrder(quotation)}
                        >
                          Work order
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {!filtered.length && (
                <tr>
                  <td colSpan="7" className="empty">
                    No quotations found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15,23,37,.4)",
            display: "grid",
            placeItems: "center",
            zIndex: 50,
          }}
          onClick={() => setShowForm(false)}
        >
          <div
            className="panel"
            style={{ width: "min(520px,calc(100% - 32px))", margin: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="panel-head">
              <h2 style={{ margin: 0 }}>New quotation</h2>
              <button className="icon-btn" onClick={() => setShowForm(false)}>
                Close
              </button>
            </div>
            <form className="form" onSubmit={createQuotation}>
              <label>
                Enquiry ID
                <input
                  type="number"
                  min="1"
                  required
                  value={form.enquiryId}
                  onChange={(e) =>
                    setForm({ ...form, enquiryId: e.target.value })
                  }
                />
              </label>
              <label>
                Amount
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                />
              </label>
              <label>
                Notes
                <textarea
                  rows="4"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              </label>
              <div className="form-actions">
                <button
                  type="button"
                  className="secondary"
                  onClick={() => setShowForm(false)}
                >
                  Cancel
                </button>
                <button className="primary" disabled={saving}>
                  {saving ? "Saving..." : "Create quotation"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
