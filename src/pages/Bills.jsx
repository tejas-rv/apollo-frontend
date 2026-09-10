import { Download, Eye, Mail, MessageCircle, Search, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import CustomerSummary from "../components/CustomerSummary";
import { api } from "../services/api";

function numericValue(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function normalizedBill(billRequest) {
  if (!billRequest) return billRequest;
  return {
    ...billRequest,
    bill: {
      ...billRequest.bill,
      gstPercentage: numericValue(billRequest.bill?.gstPercentage),
      sgstPercentage: numericValue(billRequest.bill?.sgstPercentage),
      cgstPercentage: numericValue(billRequest.bill?.cgstPercentage),
    },
    lineItems: (billRequest.lineItems || []).map((item) => ({
      ...item,
      quantity: numericValue(item.quantity, 1),
      rate: numericValue(item.rate),
      amount: numericValue(item.amount),
    })),
  };
}

export default function Bills() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState("search"); // search | preview | done
  const [query, setQuery] = useState("");
  const [customers, setCustomers] = useState([]);
  const [searching, setSearching] = useState(false);
  const [gstEnabled, setGstEnabled] = useState(false);
  const [gstPercentage, setGstPercentage] = useState(18);
  const [preview, setPreview] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [pdfBlob, setPdfBlob] = useState(null); // generated PDF blob
  const [pdfUrl, setPdfUrl] = useState(null); // object URL for preview iframe
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [editedBill, setEditedBill] = useState(null);
  // notification send state
  const [sendEmail, setSendEmail] = useState("");
  const [sendPhone, setSendPhone] = useState("");
  const [sending, setSending] = useState("");
  const [sendResult, setSendResult] = useState("");
  const docType = "GST_BILL";

  useEffect(() => {
    if (!location.state?.resetBills) return;
    if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    setStep("search");
    setPreview(null);
    setEditedBill(null);
    setPdfBlob(null);
    setPdfUrl(null);
    setShowPdfModal(false);
    setError("");
    setSuccessMsg("");
    setSendResult("");
    setGstEnabled(false);
    setGstPercentage(18);
  }, [location.state?.resetBills]);

  const presetCustomerId = searchParams.get("customerId");
  const presetCustomerName = searchParams.get("customerName");
  useEffect(() => {
    if (presetCustomerId) {
      setCustomers([
        {
          id: presetCustomerId,
          customerName: presetCustomerName || "Customer",
        },
      ]);
      api
        .customer(presetCustomerId)
        .then((customer) => setCustomers([customer]))
        .catch(() => {});
    } else if (presetCustomerName) {
      setQuery(presetCustomerName);
    }
  }, [presetCustomerId, presetCustomerName]);

  /* cleanup object URL on unmount */
  useEffect(
    () => () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    },
    [pdfUrl],
  );

  /* ── search customers ── */
  useEffect(() => {
    if (!query.trim()) {
      if (!presetCustomerId) setCustomers([]);
      return;
    }
    const t = setTimeout(() => {
      setSearching(true);
      api
        .searchCustomers(query, 0, 10)
        .then((d) => setCustomers(d.content || []))
        .catch((e) => setError(e.message))
        .finally(() => setSearching(false));
    }, 300);
    return () => clearTimeout(t);
  }, [query, presetCustomerId]);

  /* ── fetch preview ── */
  async function fetchPreview(customerId) {
    setError("");
    setSuccessMsg("");
    setPreview(null);
    setEditedBill(null);
    setPdfBlob(null);
    setPdfUrl(null);
    setLoadingPreview(true);
    try {
      const [res, customer] = await Promise.all([
        api.billPreview(customerId, docType),
        api.customer(customerId),
      ]);
      const appliedGst = gstEnabled ? gstPercentage : 0;
      const halfGst = appliedGst / 2;
      res.billRequest.bill.gstPercentage = appliedGst;
      res.billRequest.bill.sgstPercentage = halfGst;
      res.billRequest.bill.cgstPercentage = halfGst;
      res.billRequest.billTo = {
        ...res.billRequest.billTo,
        name: res.billRequest.billTo?.name || customer.customerName,
        email: res.billRequest.billTo?.email || customer.email,
        phone: res.billRequest.billTo?.phone || customer.mobileNumber,
        address: res.billRequest.billTo?.address || customer.address,
        state: res.billRequest.billTo?.state || customer.state,
      };
      setPreview(res);
      setEditedBill(
        normalizedBill(JSON.parse(JSON.stringify(res.billRequest))),
      );
      // pre-fill send fields from customer data
      setSendEmail(res.billRequest?.billTo?.email || "");
      setSendPhone(res.billRequest?.billTo?.phone || "");
      setStep("preview");
    } catch (e) {
      setError(e.message);
    } finally {
      setLoadingPreview(false);
    }
  }

  /* ── generate PDF (returns blob) ── */
  async function doGenerate() {
    setError("");
    setGenerating(true);
    try {
      const blob = await api.generateBillPdf(
        docType,
        normalizedBill(editedBill),
      );
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
      const url = URL.createObjectURL(blob);
      setPdfBlob(blob);
      setPdfUrl(url);
      return { blob, url };
    } catch (e) {
      setError(e.message);
      return null;
    } finally {
      setGenerating(false);
    }
  }

  /* ── preview PDF in modal ── */
  async function previewPdf() {
    const result = pdfUrl ? { url: pdfUrl } : await doGenerate();
    if (result) setShowPdfModal(true);
  }

  /* ── download PDF ── */
  async function downloadPdf() {
    let url = pdfUrl;
    if (!url) {
      const r = await doGenerate();
      if (!r) return;
      url = r.url;
    }
    const a = document.createElement("a");
    a.href = url;
    a.download = `apollo_bill_${editedBill?.bill?.invoiceNumber || "bill"}.pdf`;
    a.click();
    setSuccessMsg("PDF downloaded!");
    setStep("done");
  }

  /* ── send via email ── */
  async function doSendEmail() {
    if (!sendEmail.trim()) {
      setError("Enter recipient email");
      return;
    }
    setSending("email");
    setSendResult("");
    setError("");
    try {
      await api.sendBillEmail(docType, sendEmail, normalizedBill(editedBill));
      setSendResult("✅ Email sent to " + sendEmail);
    } catch (e) {
      setError(e.message);
    } finally {
      setSending("");
    }
  }

  /* ── send via whatsapp ── */
  async function doSendWhatsapp() {
    if (!sendPhone.trim()) {
      setError("Enter recipient phone number");
      return;
    }
    setSending("whatsapp");
    setSendResult("");
    setError("");
    try {
      await api.sendBillWhatsapp(
        docType,
        sendPhone,
        normalizedBill(editedBill),
      );
      setSendResult("✅ WhatsApp message sent to " + sendPhone);
    } catch (e) {
      setError(e.message);
    } finally {
      setSending("");
    }
  }

  /* ── field helpers ── */
  const setBillField = useCallback(
    (key, val) =>
      setEditedBill((prev) => ({
        ...prev,
        bill: { ...prev.bill, [key]: val },
      })),
    [],
  );
  const setBillToField = useCallback(
    (key, val) =>
      setEditedBill((prev) => ({
        ...prev,
        billTo: { ...prev.billTo, [key]: val },
      })),
    [],
  );
  const setLineItem = useCallback(
    (idx, key, val) =>
      setEditedBill((prev) => {
        const items = [...prev.lineItems];
        items[idx] = { ...items[idx], [key]: val };
        return { ...prev, lineItems: items };
      }),
    [],
  );

  return (
    <section className="page narrow">
      <div className="page-head">
        <div>
          <span className="eyebrow">BILLING</span>
          <h1>Generate Bill</h1>
          <p className="muted">
            Fetch AMC data, review, edit, preview and download PDF.
          </p>
        </div>
      </div>

      {error && <div className="alert error">{error}</div>}
      {successMsg && <div className="alert success">{successMsg}</div>}

      {/* ── Step indicator ── */}
      <div className="bill-steps">
        <Step
          n={1}
          label="Select customer"
          active={step === "search"}
          done={step !== "search"}
        />
        <div className="bill-step-line" />
        <Step
          n={2}
          label="Review bill"
          active={step === "preview"}
          done={step === "done"}
        />
        <div className="bill-step-line" />
        <Step
          n={3}
          label="Preview &amp; Send"
          active={step === "done"}
          done={false}
        />
      </div>

      {/* ════ STEP 1 ════ */}
      {step === "search" && (
        <div className="panel">
          <h2 style={{ marginBottom: 16 }}>
            1 · Choose customer &amp; tax option
          </h2>
          <div className="bill-tax-choice">
            <label className="bill-checkbox">
              <input
                type="checkbox"
                checked={gstEnabled}
                onChange={(e) => setGstEnabled(e.target.checked)}
              />
              <span>Include GST in this bill</span>
            </label>
            {gstEnabled && (
              <label className="field-label-row bill-gst-rate">
                GST percentage
                <div className="bill-rate-input">
                  <input
                    className="bill-input"
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={gstPercentage}
                    onChange={(e) => setGstPercentage(Number(e.target.value))}
                  />
                  <span>%</span>
                </div>
              </label>
            )}
          </div>
          <p className="muted" style={{ margin: "8px 0 18px" }}>
            {gstEnabled
              ? "GST will be applied to the bill at the percentage entered above."
              : "GST is set to 0% for this bill."}
          </p>

          {!presetCustomerId && (
            <>
              <label className="field-label-row">
                Search customer
                <div className="search" style={{ marginTop: 6 }}>
                  <Search size={16} />
                  <input
                    placeholder="Type name, code, mobile…"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </div>
              </label>
              {searching && (
                <div className="muted" style={{ padding: "8px 0" }}>
                  Searching…
                </div>
              )}
            </>
          )}

          {customers.length > 0 && (
            <div className="customer-pick-list">
              {customers.map((c) => (
                <div key={c.id} className="customer-pick-row">
                  <CustomerSummary customer={c} compact />
                  <button
                    className="primary"
                    disabled={loadingPreview}
                    onClick={() => fetchPreview(c.id)}
                  >
                    <Eye size={15} />
                    {loadingPreview ? "Loading…" : "Preview bill"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ════ STEP 2: review + edit ════ */}
      {step === "preview" && editedBill && (
        <>
          <div className="panel">
            <div className="panel-head">
              <h2>2 · Review &amp; edit bill details</h2>
              <button
                className="secondary"
                onClick={() => {
                  setStep("search");
                  setPreview(null);
                }}
              >
                ← Back
              </button>
            </div>
            <p className="muted" style={{ marginBottom: 16 }}>
              Pre-filled from AMC record. Edit anything before generating the
              PDF.
            </p>

            <h3 className="section-sub">Bill details · Apollo Elevator</h3>
            <div className="form-grid">
              <BillField
                label="Invoice No."
                value={editedBill.bill.invoiceNumber}
                onChange={(v) => setBillField("invoiceNumber", v)}
              />
              <BillField
                label="Invoice Date"
                value={editedBill.bill.invoiceDate}
                onChange={(v) => setBillField("invoiceDate", v)}
              />
              <BillField
                label="Mobile"
                value={editedBill.bill.mobile}
                onChange={(v) => setBillField("mobile", v)}
              />
              <BillField
                label="State"
                value={editedBill.bill.state}
                onChange={(v) => setBillField("state", v)}
              />
              <BillField
                label="Pincode"
                value={editedBill.bill.pincode}
                onChange={(v) => setBillField("pincode", v)}
              />
              {docType === "GST_BILL" && (
                <>
                  <BillField
                    label="PAN No."
                    value={editedBill.bill.panNumber}
                    onChange={(v) => setBillField("panNumber", v)}
                  />
                  <BillField
                    label="GSTIN"
                    value={editedBill.bill.gstin}
                    onChange={(v) => setBillField("gstin", v)}
                  />
                  <BillField
                    label="SGST %"
                    type="number"
                    value={editedBill.bill.sgstPercentage}
                    onChange={(v) =>
                      setBillField("sgstPercentage", parseFloat(v))
                    }
                  />
                  <BillField
                    label="CGST %"
                    type="number"
                    value={editedBill.bill.cgstPercentage}
                    onChange={(v) =>
                      setBillField("cgstPercentage", parseFloat(v))
                    }
                  />
                </>
              )}
            </div>

            <h3 className="section-sub" style={{ marginTop: 22 }}>
              Bill to party
            </h3>
            <div className="form-grid">
              <BillField
                label="Name"
                value={editedBill.billTo.name}
                onChange={(v) => setBillToField("name", v)}
              />
              <BillField
                label="GSTIN"
                value={editedBill.billTo.gstin}
                onChange={(v) => setBillToField("gstin", v)}
              />
              <BillField
                label="State"
                value={editedBill.billTo.state}
                onChange={(v) => setBillToField("state", v)}
              />
              <BillField
                label="PO Number"
                value={editedBill.billTo.poNumber}
                onChange={(v) => setBillToField("poNumber", v)}
              />
              <BillField
                label="Job Number"
                value={editedBill.billTo.jobNumber}
                onChange={(v) => setBillToField("jobNumber", v)}
              />
              <BillField
                label="Project Name"
                value={editedBill.billTo.projectName}
                onChange={(v) => setBillToField("projectName", v)}
              />
              <div style={{ gridColumn: "1/-1" }}>
                <BillField
                  label="Address"
                  value={editedBill.billTo.address}
                  onChange={(v) => setBillToField("address", v)}
                />
              </div>
            </div>

            <h3 className="section-sub" style={{ marginTop: 22 }}>
              Line items
            </h3>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Sl.</th>
                    <th>Description</th>
                    {docType === "GST_BILL" && <th>HSN</th>}
                    <th>Qty</th>
                    <th>Rate (₹)</th>
                    <th>Amount (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {(editedBill.lineItems || []).map((item, i) => (
                    <tr key={i}>
                      <td>{item.slNo}</td>
                      <td style={{ minWidth: 240 }}>
                        <textarea
                          rows={2}
                          className="inline-input"
                          value={item.description || ""}
                          onChange={(e) =>
                            setLineItem(i, "description", e.target.value)
                          }
                        />
                      </td>
                      {docType === "GST_BILL" && (
                        <td>
                          <input
                            className="inline-input"
                            style={{ width: 70 }}
                            value={item.hsnCode || ""}
                            onChange={(e) =>
                              setLineItem(i, "hsnCode", e.target.value)
                            }
                          />
                        </td>
                      )}
                      <td>
                        <input
                          className="inline-input"
                          style={{ width: 70 }}
                          type="number"
                          min="0"
                          step="any"
                          value={item.quantity ?? 1}
                          onChange={(e) =>
                            setLineItem(
                              i,
                              "quantity",
                              numericValue(e.target.value),
                            )
                          }
                        />
                      </td>
                      <td>
                        <input
                          className="inline-input"
                          style={{ width: 90 }}
                          type="number"
                          value={item.rate || ""}
                          onChange={(e) =>
                            setLineItem(i, "rate", parseFloat(e.target.value))
                          }
                        />
                      </td>
                      <td>
                        <input
                          className="inline-input"
                          style={{ width: 90 }}
                          type="number"
                          value={item.amount || ""}
                          onChange={(e) =>
                            setLineItem(i, "amount", parseFloat(e.target.value))
                          }
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <BillSummary editedBill={editedBill} docType={docType} />
          </div>

          <div className="form-actions" style={{ gap: 10 }}>
            <button
              className="secondary"
              onClick={() => {
                setStep("search");
                setPreview(null);
              }}
            >
              ← Back
            </button>
            <button
              className="secondary"
              disabled={generating}
              onClick={previewPdf}
            >
              <Eye size={15} />
              {generating ? "Generating…" : "Preview PDF"}
            </button>
            <button
              className="primary"
              disabled={generating}
              onClick={downloadPdf}
            >
              <Download size={15} />
              {generating ? "Generating…" : "Download PDF"}
            </button>
            <button
              className="primary"
              disabled={generating}
              onClick={() => setStep("done")}
            >
              Continue to send
            </button>
          </div>
        </>
      )}

      {/* ════ STEP 3: done — preview + notify ════ */}
      {step === "done" && (
        <div className="panel">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              marginBottom: 24,
            }}
          >
            <div style={{ fontSize: 36 }}>✅</div>
            <div>
              <h2 style={{ marginBottom: 4 }}>Bill PDF ready!</h2>
              <p className="muted" style={{ margin: 0 }}>
                Preview the bill or send it via email / WhatsApp.
              </p>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
              marginBottom: 28,
            }}
          >
            <button className="secondary" onClick={previewPdf}>
              <Eye size={16} /> Preview PDF
            </button>
          </div>

          {sendResult && (
            <div className="alert success" style={{ marginBottom: 16 }}>
              {sendResult}
            </div>
          )}

          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}
          >
            {/* Email */}
            <div className="notification-card notification-card--email">
              <h3
                style={{
                  fontSize: 14,
                  marginBottom: 12,
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                }}
              >
                <span className="notification-icon notification-icon--email">
                  <Mail size={16} />
                </span>{" "}
                Send via Email
              </h3>
              <label className="field-label-row">
                Recipient email
                <input
                  className="bill-input"
                  type="email"
                  placeholder="customer@example.com"
                  value={sendEmail}
                  onChange={(e) => setSendEmail(e.target.value)}
                />
              </label>
              <button
                className="notification-button notification-button--email"
                disabled={!!sending}
                onClick={doSendEmail}
              >
                <Mail size={14} />
                {sending === "email" ? "Sending…" : "Send email"}
              </button>
            </div>
            {/* WhatsApp */}
            <div className="notification-card notification-card--whatsapp">
              <h3
                style={{
                  fontSize: 14,
                  marginBottom: 12,
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                }}
              >
                <span className="notification-icon notification-icon--whatsapp">
                  <MessageCircle size={16} />
                </span>{" "}
                Send via WhatsApp
              </h3>
              <label className="field-label-row">
                Phone number (with country code)
                <input
                  className="bill-input"
                  type="tel"
                  placeholder="+91 98765 43210"
                  value={sendPhone}
                  onChange={(e) => setSendPhone(e.target.value)}
                />
              </label>
              <button
                className="notification-button notification-button--whatsapp"
                disabled={!!sending}
                onClick={doSendWhatsapp}
              >
                <MessageCircle size={14} />
                {sending === "whatsapp" ? "Sending…" : "Send WhatsApp"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════ PDF Preview Modal ════ */}
      {showPdfModal && pdfUrl && (
        <PdfModal
          url={pdfUrl}
          onClose={() => setShowPdfModal(false)}
          onDownload={downloadPdf}
        />
      )}
    </section>
  );
}

function PdfModal({ url, onClose, onDownload }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,.6)",
        zIndex: 1000,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          background: "#1a2535",
          padding: "12px 18px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span style={{ color: "white", fontWeight: 600, fontSize: 14 }}>
          PDF Preview
        </span>
        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={onDownload}
            style={{
              background: "#1e5aa8",
              border: 0,
              color: "white",
              padding: "8px 14px",
              borderRadius: 7,
              cursor: "pointer",
              display: "flex",
              gap: 6,
              alignItems: "center",
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            <Download size={14} /> Download
          </button>
          <button
            onClick={onClose}
            style={{
              background: "#e05151",
              border: 0,
              color: "white",
              padding: "8px 10px",
              borderRadius: 7,
              cursor: "pointer",
            }}
          >
            <X size={16} />
          </button>
        </div>
      </div>
      <iframe
        src={url}
        style={{ flex: 1, border: 0, width: "100%" }}
        title="Bill PDF preview"
      />
    </div>
  );
}

function BillSummary({ editedBill, docType }) {
  const total = (editedBill.lineItems || []).reduce(
    (s, i) => s + (parseFloat(i.amount) || 0),
    0,
  );
  const sgstPercentage = editedBill.bill.sgstPercentage ?? 0;
  const cgstPercentage = editedBill.bill.cgstPercentage ?? 0;
  const sgst =
    docType === "GST_BILL"
      ? Math.round(((total * sgstPercentage) / 100) * 100) / 100
      : 0;
  const cgst =
    docType === "GST_BILL"
      ? Math.round(((total * cgstPercentage) / 100) * 100) / 100
      : 0;
  const grand = total + sgst + cgst;
  return (
    <div className="bill-summary">
      <div className="summary-row">
        <span>Total before tax</span>
        <strong>
          ₹{total.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
        </strong>
      </div>
      {docType === "GST_BILL" && (
        <>
          <div className="summary-row">
            <span>SGST ({sgstPercentage}%)</span>
            <strong>₹{sgst.toFixed(2)}</strong>
          </div>
          <div className="summary-row">
            <span>CGST ({cgstPercentage}%)</span>
            <strong>₹{cgst.toFixed(2)}</strong>
          </div>
        </>
      )}
      <div className="summary-row total">
        <span>Grand total</span>
        <strong>
          ₹{grand.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
        </strong>
      </div>
    </div>
  );
}

function Step({ n, label, active, done }) {
  return (
    <div
      className={`bill-step${active ? " bill-step-active" : ""}${done ? " bill-step-done" : ""}`}
    >
      <div className="bill-step-n">{done ? "✓" : n}</div>
      <span>{label}</span>
    </div>
  );
}

function BillField({ label, value, onChange, type = "text" }) {
  return (
    <label className="form" style={{ display: "grid", gap: 5 }}>
      <span style={{ fontSize: 11, fontWeight: 600, color: "#4d5868" }}>
        {label}
      </span>
      <input
        type={type}
        className="bill-input"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
