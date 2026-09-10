import { Mail, MessageCircle } from "lucide-react";
import { useEffect, useState } from "react";
import CustomerSummary from "../components/CustomerSummary";
import { api } from "../services/api";
export default function Notifications() {
  const [tab, setTab] = useState("email"),
    [mode, setMode] = useState("plain"),
    [form, setForm] = useState({}),
    [message, setMessage] = useState(""),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(false);
  const [customer, setCustomer] = useState(null);
  const [customerQuery, setCustomerQuery] = useState("");
  const [customerResults, setCustomerResults] = useState([]);
  const [customerSearching, setCustomerSearching] = useState(false);
  const set = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  useEffect(() => {
    if (!customerQuery.trim()) {
      setCustomerResults([]);
      return;
    }
    const timer = setTimeout(() => {
      setCustomerSearching(true);
      api
        .searchCustomers(customerQuery, 0, 10)
        .then((value) => setCustomerResults(value.content || []))
        .catch(() => setCustomerResults([]))
        .finally(() => setCustomerSearching(false));
    }, 250);
    return () => clearTimeout(timer);
  }, [customerQuery]);

  async function selectCustomer(value) {
    setCustomerResults([]);
    setCustomerQuery(value.customerName || "");
    try {
      const fullCustomer = await api.customer(value.id);
      setCustomer(fullCustomer);
      setForm((current) => ({
        ...current,
        customerId: fullCustomer.id,
        email: fullCustomer.email || current.email || "",
        phoneNumber: fullCustomer.mobileNumber || current.phoneNumber || "",
      }));
    } catch {
      setCustomer(value);
      setForm((current) => ({ ...current, customerId: value.id }));
    }
  }
  async function send(e) {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");
    try {
      const fn =
        tab === "email"
          ? mode === "contract"
            ? api.contractEmail
            : api.email
          : mode === "contract"
            ? api.contractWhatsapp
            : api.whatsapp;
      const r = await fn(form);
      setMessage(`Notification sent successfully${r?.id ? ` (#${r.id})` : ""}`);
      setForm({});
      setCustomer(null);
      setCustomerQuery("");
    } catch (x) {
      setError(x.message);
    } finally {
      setLoading(false);
    }
  }
  return (
    <section className="page narrow">
      <div className="page-head">
        <div>
          <span className="eyebrow">COMMUNICATIONS</span>
          <h1>Notifications</h1>
          <p className="muted">
            Send email or WhatsApp messages from the admin account.
          </p>
        </div>
      </div>
      <div className={`tabs notification-tabs notification-tabs--${tab}`}>
        <button
          className={tab === "email" ? "selected" : ""}
          onClick={() => setTab("email")}
        >
          <Mail size={17} /> Email
        </button>
        <button
          className={tab === "whatsapp" ? "selected" : ""}
          onClick={() => setTab("whatsapp")}
        >
          <MessageCircle size={17} /> WhatsApp
        </button>
      </div>
      <div className="segmented">
        <button
          className={mode === "plain" ? "selected" : ""}
          onClick={() => setMode("plain")}
        >
          Plain message
        </button>
        <button
          className={mode === "contract" ? "selected" : ""}
          onClick={() => setMode("contract")}
        >
          AMC contract
        </button>
      </div>
      {message && <div className="alert success">{message}</div>}
      {error && <div className="alert error">{error}</div>}
      <form
        className={`panel form notification-form notification-form--${tab}`}
        onSubmit={send}
      >
        <label className="customer-search-field">
          Customer name
          <input
            value={customerQuery}
            onChange={(event) => {
              setCustomerQuery(event.target.value);
              setCustomer(null);
              setForm((current) => ({ ...current, customerId: "" }));
            }}
            placeholder="Search customer by name, code or phone..."
          />
          {customerSearching && (
            <span className="field-hint">Searching...</span>
          )}
          {!customerSearching && customerResults.length > 0 && (
            <div className="customer-search-dropdown">
              {customerResults.map((value) => (
                <button
                  type="button"
                  key={value.id}
                  onClick={() => selectCustomer(value)}
                >
                  <strong>{value.customerName}</strong>
                  <span>
                    {value.customerCode || "No code"} ·{" "}
                    {value.mobileNumber || "No phone"}
                  </span>
                </button>
              ))}
            </div>
          )}
        </label>
        {customer && <CustomerSummary customer={customer} compact />}
        {tab === "email" ? (
          <Field
            label="Recipient email *"
            name="email"
            value={form.email}
            onChange={set}
            type="email"
          />
        ) : (
          <Field
            label="Phone number *"
            name="phoneNumber"
            value={form.phoneNumber}
            onChange={set}
            placeholder="+919876543210"
          />
        )}
        {mode === "plain" ? (
          tab === "email" ? (
            <>
              <Field
                label="Subject *"
                name="subject"
                value={form.subject}
                onChange={set}
              />
              <label>
                Body *
                <textarea
                  name="body"
                  rows="8"
                  value={form.body || ""}
                  onChange={set}
                />
              </label>
            </>
          ) : (
            <label>
              Message *
              <textarea
                name="message"
                rows="8"
                value={form.message || ""}
                onChange={set}
              />
            </label>
          )
        ) : (
          <>
            <Field
              label={tab === "email" ? "Subject" : "Caption"}
              name={tab === "email" ? "subject" : "caption"}
              value={form[tab === "email" ? "subject" : "caption"]}
              onChange={set}
            />
            <label>
              {tab === "email" ? "Body" : "Reference key"}
              {tab === "email" ? (
                <textarea
                  name="body"
                  rows="6"
                  value={form.body || ""}
                  onChange={set}
                />
              ) : (
                <input
                  name="referenceKey"
                  value={form.referenceKey || ""}
                  onChange={set}
                />
              )}
            </label>
          </>
        )}
        <button
          className={`notification-button notification-button--${tab} wide`}
          disabled={loading}
        >
          {loading ? (
            "Sending…"
          ) : (
            <>
              {tab === "email" ? (
                <Mail size={15} />
              ) : (
                <MessageCircle size={15} />
              )}{" "}
              Send {tab}
            </>
          )}
        </button>
      </form>
    </section>
  );
}
function Field({ label, name, value, onChange, type = "text", placeholder }) {
  return (
    <label>
      {label}
      <input
        name={name}
        type={type}
        value={value || ""}
        onChange={onChange}
        placeholder={placeholder}
      />
    </label>
  );
}
