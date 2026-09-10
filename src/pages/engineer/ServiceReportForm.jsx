import { ArrowLeft, Download, Search, Send } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import CustomerSummary from "../../components/CustomerSummary";
import { api } from "../../services/api";

export default function ServiceReportForm() {
  const [searchParams] = useSearchParams();
  const nav = useNavigate();

  const preCustomerId = searchParams.get("customerId");
  const preCustomerName = searchParams.get("customerName");

  const [step, setStep] = useState("setup"); // setup | checklist | done
  const [query, setQuery] = useState("");
  const [customers, setCustomers] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(
    preCustomerId ? { id: preCustomerId, customerName: preCustomerName } : null,
  );
  const [customerRecord, setCustomerRecord] = useState(null);
  const [visitDate, setVisitDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [overallNotes, setOverallNotes] = useState("");
  const [checklist, setChecklist] = useState([]);
  const [loadingChecklist, setLoadingChecklist] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!selectedCustomer?.id) {
      setCustomerRecord(null);
      return;
    }
    api
      .engineerCustomer(selectedCustomer.id)
      .then(setCustomerRecord)
      .catch(() => setCustomerRecord(null));
  }, [selectedCustomer?.id]);

  /* search customers */
  useEffect(() => {
    if (!query.trim()) {
      if (!preCustomerId) setCustomers([]);
      return;
    }
    const t = setTimeout(() => {
      setSearching(true);
      api
        .engineerCustomers(query, 0, 10)
        .then((d) => setCustomers(d.content || []))
        .catch(() => {})
        .finally(() => setSearching(false));
    }, 300);
    return () => clearTimeout(t);
  }, [query, preCustomerId]);

  /* load default checklist */
  async function loadChecklist() {
    setLoadingChecklist(true);
    try {
      const items = await api.engineerChecklistTemplate();
      setChecklist(
        items.map((i) => ({
          ...i,
          answerYn: null,
          answerText: "",
          answerChoice: null,
        })),
      );
      setStep("checklist");
    } catch (e) {
      setError(e.message);
    } finally {
      setLoadingChecklist(false);
    }
  }

  function proceedToChecklist() {
    if (!selectedCustomer) return setError("Please select a customer.");
    setError("");
    loadChecklist();
  }

  const setAnswer = useCallback((idx, field, val) => {
    setChecklist((prev) => {
      const c = [...prev];
      c[idx] = { ...c[idx], [field]: val };
      return c;
    });
  }, []);

  const chooseAnswer = useCallback((idx, choice) => {
    setChecklist((prev) => {
      const next = [...prev];
      next[idx] = {
        ...next[idx],
        answerChoice: choice,
        answerYn: choice === "YES" ? true : choice === "NO" ? false : null,
        answerText:
          choice === "NA"
            ? "N/A"
            : choice === "YES"
              ? ""
              : next[idx].answerText === "N/A"
                ? ""
                : next[idx].answerText,
      };
      return next;
    });
  }, []);

  async function submitReport() {
    setError("");
    setSubmitting(true);
    try {
      const payload = {
        customerId: Number(selectedCustomer.id),
        visitDate,
        overallNotes,
        checkItems: checklist.map((i) => ({
          itemOrder: i.itemOrder,
          question: i.question,
          answerType: i.answerType,
          answerYn:
            i.answerType === "YES_NO" || i.answerType === "YES_NO_NA"
              ? i.answerYn
              : null,
          answerText: i.answerText || null,
        })),
      };
      const res = await api.engineerSubmitReport(payload);
      setSubmitted(res);
      setStep("done");
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function downloadPdf() {
    if (!submitted) return;
    try {
      const blob = await api.engineerReportPdf(submitted.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ServiceReport-${submitted.id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e.message);
    }
  }

  const yesNoItems = checklist.filter(
    (i) => i.answerType === "YES_NO" || i.answerType === "YES_NO_NA",
  );
  const yesNoCount = yesNoItems.filter((i) => i.answerChoice !== null).length;
  const descCount = checklist.filter(
    (i) => i.answerType === "DESCRIPTIVE" && i.answerText,
  ).length;
  const totalYesNo = yesNoItems.length;
  const totalDesc = checklist.filter(
    (i) => i.answerType === "DESCRIPTIVE",
  ).length;

  return (
    <section className="page narrow">
      <div className="page-head">
        <div>
          <button className="back" onClick={() => nav(-1)}>
            <ArrowLeft size={16} /> Back
          </button>
          <span className="eyebrow">SERVICE REPORT</span>
          <h1>New Service Report</h1>
        </div>
      </div>

      {/* Step indicator */}
      <div className="bill-steps">
        <Step
          n={1}
          label="Setup"
          active={step === "setup"}
          done={step !== "setup"}
        />
        <div className="bill-step-line" />
        <Step
          n={2}
          label="Checklist"
          active={step === "checklist"}
          done={step === "done"}
        />
        <div className="bill-step-line" />
        <Step n={3} label="Done" active={step === "done"} done={false} />
      </div>

      {error && <div className="alert error">{error}</div>}

      {/* ── STEP 1: Setup ── */}
      {step === "setup" && (
        <div className="panel">
          <h2 style={{ marginBottom: 18 }}>1 · Select customer</h2>

          {/* Customer pick */}
          {!preCustomerId && (
            <>
              <label className="field-label-row">
                Search customer
                <div className="search" style={{ marginTop: 6 }}>
                  <Search size={16} />
                  <input
                    placeholder="Name, code, mobile…"
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
              {customers.length > 0 && !selectedCustomer && (
                <div className="customer-pick-list">
                  {customers.map((c) => (
                    <div key={c.id} className="customer-pick-row">
                      <div>
                        <b>{c.customerName}</b>
                        <span className="muted">
                          {" "}
                          · {c.customerCode} · {c.mobileNumber}
                        </span>
                      </div>
                      <button
                        className="primary"
                        onClick={() => {
                          setSelectedCustomer(c);
                          setCustomers([]);
                        }}
                      >
                        Select
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {selectedCustomer && (
            <div
              className="alert success"
              style={{
                marginTop: 10,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <CustomerSummary
                customer={customerRecord || selectedCustomer}
                compact
              />
              {!preCustomerId && (
                <button
                  className="secondary small"
                  onClick={() => setSelectedCustomer(null)}
                >
                  Change
                </button>
              )}
            </div>
          )}

          {/* Visit date */}
          <div style={{ marginTop: 18 }}>
            <label className="field-label-row">
              Visit Date
              <input
                type="date"
                className="bill-input"
                style={{ maxWidth: 240 }}
                value={visitDate}
                onChange={(e) => setVisitDate(e.target.value)}
              />
            </label>
          </div>

          <div className="form-actions" style={{ marginTop: 24 }}>
            <button
              className="primary"
              disabled={!selectedCustomer || loadingChecklist}
              onClick={proceedToChecklist}
            >
              {loadingChecklist
                ? "Loading checklist…"
                : "Continue to Checklist →"}
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 2: Checklist ── */}
      {step === "checklist" && (
        <>
          <div className="panel">
            <div className="panel-head">
              <div>
                <h2>2 · Service Checklist</h2>
                <p className="muted">
                  {selectedCustomer?.customerName} · {visitDate}
                </p>
              </div>
              <div style={{ fontSize: 12, color: "var(--muted)" }}>
                ✅ {yesNoCount}/{totalYesNo} checks · 📝 {descCount}/{totalDesc}{" "}
                descriptive
              </div>
            </div>

            {/* YES/NO section */}
            <h3 className="section-sub">Yes / No / N/A Checks</h3>
            <div style={{ display: "grid", gap: 10, marginBottom: 20 }}>
              {checklist
                .filter(
                  (i) =>
                    i.answerType === "YES_NO" || i.answerType === "YES_NO_NA",
                )
                .map((item, _) => {
                  const idx = checklist.indexOf(item);
                  return (
                    <div
                      key={idx}
                      style={{
                        border: "1px solid var(--line)",
                        borderRadius: 9,
                        padding: "12px 14px",
                        background: "#fafbfc",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                          gap: 12,
                          marginBottom: 6,
                        }}
                      >
                        <div style={{ fontSize: 13, fontWeight: 500, flex: 1 }}>
                          <span
                            style={{
                              color: "var(--muted)",
                              marginRight: 6,
                              fontSize: 11,
                            }}
                          >
                            {item.itemOrder}.
                          </span>
                          {item.question}
                        </div>
                        <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                          <button
                            onClick={() => chooseAnswer(idx, "YES")}
                            style={{
                              padding: "6px 14px",
                              borderRadius: 7,
                              border: "1px solid",
                              fontSize: 12,
                              fontWeight: 700,
                              cursor: "pointer",
                              background:
                                item.answerChoice === "YES"
                                  ? "#e8f6ee"
                                  : "#f5f5f5",
                              borderColor:
                                item.answerChoice === "YES"
                                  ? "#217746"
                                  : "#ccc",
                              color:
                                item.answerChoice === "YES"
                                  ? "#217746"
                                  : "#555",
                            }}
                          >
                            ✔ YES
                          </button>
                          <button
                            onClick={() => chooseAnswer(idx, "NO")}
                            style={{
                              padding: "6px 14px",
                              borderRadius: 7,
                              border: "1px solid",
                              fontSize: 12,
                              fontWeight: 700,
                              cursor: "pointer",
                              background:
                                item.answerChoice === "NO"
                                  ? "#faecec"
                                  : "#f5f5f5",
                              borderColor:
                                item.answerChoice === "NO" ? "#a33838" : "#ccc",
                              color:
                                item.answerChoice === "NO" ? "#a33838" : "#555",
                            }}
                          >
                            ✘ NO
                          </button>
                          <button
                            onClick={() => chooseAnswer(idx, "NA")}
                            style={{
                              padding: "6px 14px",
                              borderRadius: 7,
                              border: "1px solid",
                              fontSize: 12,
                              fontWeight: 700,
                              cursor: "pointer",
                              background:
                                item.answerChoice === "NA"
                                  ? "#e8eef6"
                                  : "#f5f5f5",
                              borderColor:
                                item.answerChoice === "NA" ? "#55708f" : "#ccc",
                              color:
                                item.answerChoice === "NA" ? "#344f70" : "#555",
                            }}
                          >
                            N/A
                          </button>
                        </div>
                      </div>
                      {item.answerChoice === "NO" && (
                        <textarea
                          className="inline-input"
                          rows={2}
                          placeholder="Notes on the issue found (optional)…"
                          value={item.answerText}
                          onChange={(e) =>
                            setAnswer(idx, "answerText", e.target.value)
                          }
                        />
                      )}
                    </div>
                  );
                })}
            </div>

            {/* Descriptive section */}
            <h3 className="section-sub">Detailed Questions</h3>
            <div style={{ display: "grid", gap: 12, marginBottom: 20 }}>
              {checklist
                .filter((i) => i.answerType === "DESCRIPTIVE")
                .map((item, _) => {
                  const idx = checklist.indexOf(item);
                  return (
                    <div
                      key={idx}
                      style={{
                        border: "1px solid var(--line)",
                        borderRadius: 9,
                        padding: "12px 14px",
                        background: "#fafbfc",
                      }}
                    >
                      <label
                        style={{
                          fontSize: 13,
                          fontWeight: 500,
                          display: "block",
                          marginBottom: 7,
                        }}
                      >
                        <span
                          style={{
                            color: "var(--muted)",
                            marginRight: 6,
                            fontSize: 11,
                          }}
                        >
                          {item.itemOrder}.
                        </span>
                        {item.question}
                      </label>
                      <textarea
                        className="inline-input"
                        rows={3}
                        placeholder="Enter your response…"
                        value={item.answerText}
                        onChange={(e) =>
                          setAnswer(idx, "answerText", e.target.value)
                        }
                      />
                    </div>
                  );
                })}
            </div>

            {/* Overall notes */}
            <h3 className="section-sub">Overall Notes &amp; Observations</h3>
            <textarea
              className="bill-input"
              rows={4}
              placeholder="Any additional observations, customer feedback, or follow-up actions required…"
              value={overallNotes}
              onChange={(e) => setOverallNotes(e.target.value)}
            />
          </div>

          <div className="form-actions">
            <button className="secondary" onClick={() => setStep("setup")}>
              ← Back
            </button>
            <button
              className="primary"
              disabled={submitting}
              onClick={submitReport}
            >
              <Send size={15} />
              {submitting ? "Submitting…" : "Submit Report (PDF → Admin)"}
            </button>
          </div>
        </>
      )}

      {/* ── STEP 3: Done ── */}
      {step === "done" && submitted && (
        <div className="panel" style={{ textAlign: "center", padding: 48 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
          <h2>Report submitted!</h2>
          <p className="muted" style={{ margin: "8px 0 6px" }}>
            Report #{submitted.id} · {submitted.visitDate}
          </p>
          <p className="muted" style={{ marginBottom: 28 }}>
            {submitted.status === "PDF_SENT"
              ? "📧 PDF has been sent to admin email automatically."
              : "Report saved. PDF email to admin may still be in progress."}
          </p>
          <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
            <button
              className="secondary"
              onClick={() => nav("/app/engineer/reports")}
            >
              View My Reports
            </button>
            <button className="primary" onClick={downloadPdf}>
              <Download size={15} /> Download PDF
            </button>
            <button
              className="secondary"
              onClick={() => {
                setStep("setup");
                setSubmitted(null);
                setChecklist([]);
                if (!preCustomerId) {
                  setSelectedCustomer(null);
                }
              }}
            >
              New Report
            </button>
          </div>
        </div>
      )}
    </section>
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
