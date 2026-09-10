import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { api } from "../services/api";
import PublicNav from "../components/PublicNav";
import AppLogo from "../components/AppLogo";
import "../components/AppLogo.css";
import "./ContactPage.css";

const PRODUCTS = [
  "Home Lift",
  "Passenger Elevator",
  "Capsule Lift",
  "Glass Door Lift",
  "MRL Elevator",
  "Hospital / Freight Lift",
  "AMC / Service on an existing lift",
];

const initialForm = {
  name: "",
  phone: "",
  email: "",
  city: "",
  interest: "",
  message: "",
  updatesOptIn: false,
  policyAccepted: false,
};

export default function ContactPage() {
  const location = useLocation();
  const inquiryType = location.state?.inquiryType === "QUOTE" ? "QUOTE" : "CONTACT";
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);

  const update = (field) => (e) => {
    const value = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [field]: value }));
  };

  const validate = () => {
    const next = {};
    if (!form.name.trim()) next.name = "Enter your name.";
    if (!form.phone.trim()) next.phone = "Enter a phone number we can reach you on.";
    else if (form.phone.replace(/\D/g, "").length < 10) next.phone = "Enter a valid 10-digit phone number.";
    if (!form.city.trim()) next.city = "Enter your city.";
    if (!form.policyAccepted) next.policyAccepted = "Please accept the privacy policy.";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    setToast(null);
    api.submitEnquiry({
      inquiryType,
      fullName: form.name.trim(),
      phoneNumber: form.phone.trim(),
      email: form.email.trim(),
      city: form.city.trim(),
      requirementType: form.interest,
      message: form.message.trim(),
      consentAccepted: form.policyAccepted,
      sourcePage: "contact",
    })
      .then(() => {
        setSubmitted(true);
        setToast({ type: "success", text: "Enquiry submitted successfully." });
      })
      .catch((err) => {
        setToast({ type: "error", text: err.message || "We could not send your enquiry right now." });
      })
      .finally(() => {
        setSubmitting(false);
      });
  };

  if (submitted) {
    return (
      <div className="cp-page">
        <PublicNav />
        <div className="cp-confirm">
          <AppLogo size={48} />
          <h1>Thanks, {form.name.split(" ")[0]}.</h1>
          <p>We’ve got your enquiry and someone from Apollo Elevator will call you on {form.phone} within a business day.</p>
          <Link to="/" className="cp-confirm__home">Back to home</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="cp-page">
      <PublicNav />
      {toast && <div className={`cp-toast cp-toast--${toast.type}`}>{toast.text}</div>}
      <div className="cp-grid">
        <form className="cp-form" onSubmit={handleSubmit} noValidate>
          <h1>Get a quote for your lift.</h1>
          <p className="cp-form__intro">Tell us a little about your home or building and what you're looking for. We’ll call you back within one business day.</p>

          <div className="cp-form__row">
            <div className="cp-field">
              <label htmlFor="name">Name <span className="cp-required">*</span></label>
              <span className="cp-helper">Enter your full name as you want us to address you.</span>
              <input id="name" type="text" value={form.name} onChange={update("name")} placeholder="Your full name" />
              {errors.name && <span className="cp-error">{errors.name}</span>}
            </div>
            <div className="cp-field">
              <label htmlFor="phone">Phone number <span className="cp-required">*</span></label>
              <span className="cp-helper">We’ll call or WhatsApp you on this number.</span>
              <input id="phone" type="tel" value={form.phone} onChange={update("phone")} placeholder="10-digit mobile number" />
              {errors.phone && <span className="cp-error">{errors.phone}</span>}
            </div>
          </div>

          <div className="cp-form__row">
            <div className="cp-field">
              <label htmlFor="email">Email</label>
              <span className="cp-helper">Optional — useful if you want a written quote.</span>
              <input id="email" type="email" value={form.email} onChange={update("email")} placeholder="you@example.com" />
            </div>
            <div className="cp-field">
              <label htmlFor="city">City <span className="cp-required">*</span></label>
              <span className="cp-helper">Tell us where the lift will be installed or serviced.</span>
              <input id="city" type="text" value={form.city} onChange={update("city")} placeholder="Where the lift will be installed" />
              {errors.city && <span className="cp-error">{errors.city}</span>}
            </div>
          </div>

          <div className="cp-field">
            <label htmlFor="interest">What are you looking for?</label>
            <span className="cp-helper">Choose the closest option — we’ll refine it with you.</span>
            <div className="cp-select">
              <select id="interest" value={form.interest} onChange={update("interest")}>
                <option value="">Select an option</option>
                {PRODUCTS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>

          <div className="cp-field">
            <label htmlFor="message">Tell us more</label>
            <span className="cp-helper">Share floor count, lift type, budget, or timeline.</span>
            <textarea id="message" rows={5} value={form.message} onChange={update("message")} placeholder="Number of floors, timeline, budget — anything that helps us prepare a quote." />
          </div>

          <label className="cp-checkbox">
            <input type="checkbox" checked={form.updatesOptIn} onChange={update("updatesOptIn")} />
            <span>Yes, I'd like to receive occasional updates and offers from Apollo Elevator. I can unsubscribe at any time.</span>
          </label>

          <label className="cp-checkbox">
            <input type="checkbox" checked={form.policyAccepted} onChange={update("policyAccepted")} />
            <span>I have read and accept the terms of the <a href="/privacy-policy" className="cp-link">Privacy Policy</a> <span className="cp-required">*</span></span>
          </label>
          {errors.policyAccepted && <span className="cp-error">{errors.policyAccepted}</span>}

          <button type="submit" className="cp-submit" disabled={submitting}>
            {submitting ? "Sending..." : "Request a callback"}
          </button>
        </form>

        <div className="cp-intro">
          <div className="cp-intro__photo">
            <img src="/liftImages/passenger-elevator.jpg" alt="Apollo Elevator passenger lift" loading="lazy" />
          </div>
          <AppLogo size={44} />
          <h2 className="cp-intro__heading">Contact details</h2>
          <div className="cp-mapCard">
            <div className="cp-mapCard__header">
              <div>
                <h2>Our location</h2>
                <p>No. 14, Karihobana Halli, T.G. Palya, Bangalore – 560 058</p>
              </div>
              <a
                className="cp-directions"
                href="https://www.google.com/maps/dir/?api=1&destination=13.012631,77.497210"
                target="_blank"
                rel="noreferrer"
              >
                Get Directions
              </a>
            </div>
            <div className="cp-mapFrame" aria-label="Apollo Elevator location map">
              <iframe
                title="Apollo Elevator location"
                src="https://www.google.com/maps?q=13.012631,77.497210&z=16&output=embed"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                allowFullScreen
              />
              <a
                className="cp-mapPin"
                href="https://www.google.com/maps/search/?api=1&query=13.012631,77.497210"
                target="_blank"
                rel="noreferrer"
              >
                <span className="cp-mapPin__dot" />
                Apollo Elevator
              </a>
            </div>
          </div>
          <div className="cp-direct">
            <div className="cp-direct__row">
              <span className="cp-direct__label">Call us</span>
              <a href="tel:+918971974009">8971974009</a>
            </div>
            <div className="cp-direct__row">
              <span className="cp-direct__label">Email</span>
              <a href="mailto:apolloelevators1@gmail.com">apolloelevators1@gmail.com</a>
            </div>
            <div className="cp-direct__row">
              <span className="cp-direct__label">Visit</span>
              <span>No. 14, Karihobana Halli, T.G. Palya, Bangalore – 560 058</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
