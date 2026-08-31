import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Download, Mail, ArrowLeft, Receipt } from "lucide-react";
import { api } from "../services/api";

const NA = "NA";
const val = (v) => (v === null || v === undefined || v === "" ? NA : v);

function Row({ label, value }) {
  return (
    <>
      <dt>{label}</dt>
      <dd>{val(value)}</dd>
    </>
  );
}

export default function CustomerDetails() {
  const { id } = useParams();
  const nav = useNavigate();
  const [c, setC] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.customer(id).then(setC).catch((e) => setError(e.message));
  }, [id]);

  async function pdf() {
    try {
      const b = await api.contractPdf(id);
      const u = URL.createObjectURL(b);
      const a = document.createElement("a");
      a.href = u;
      a.download = `${c.customerCode || "customer"}_apollo_amc.pdf`;
      a.click();
      URL.revokeObjectURL(u);
    } catch (e) {
      setError(e.message);
    }
  }

  if (error) return <section className="page"><div className="alert error">{error}</div></section>;
  if (!c) return <section className="page"><div className="loading">Loading…</div></section>;

  const lifts = c.lifts || [];
  const amcs = lifts.flatMap((l) => l.amcDetails || []);

  return (
    <section className="page">
      <div className="page-head">
        <div>
          <button className="back" onClick={() => nav("/customers")}>
            <ArrowLeft size={16} /> Customers
          </button>
          <span className="eyebrow">CUSTOMER</span>
          <h1>{c.customerName}</h1>
          <p className="muted">{val(c.customerCode)} · {val(c.mobileNumber)}</p>
        </div>
        <div className="head-actions">
          <Link className="secondary" to={`/customers/${id}/edit`}>Edit</Link>
          {amcs.length > 0 && (
            <button className="secondary" onClick={pdf}><Download size={17} /> AMC PDF</button>
          )}
          {amcs.length > 0 && (
            <Link className="primary" to={`/bills?customerId=${id}&customerName=${encodeURIComponent(c.customerName)}`}>
              <Receipt size={17} /> Generate Bill
            </Link>
          )}
        </div>
      </div>

      <div className="detail-grid">
        <div className="panel">
          <h2>Contact &amp; address</h2>
          <dl>
            <Row label="Mobile" value={c.mobileNumber} />
            <Row label="Email" value={c.email} />
            <Row label="Address" value={c.address} />
            <Row label="City" value={c.city} />
            <Row label="State" value={c.state} />
            <Row label="Pincode" value={c.pincode} />
          </dl>
        </div>
        <div className="panel">
          <h2>Overview</h2>
          <div className="mini-stats">
            <div><strong>{lifts.length}</strong><span>Lifts</span></div>
            <div><strong>{amcs.length}</strong><span>AMC contracts</span></div>
            <div><strong>{amcs.filter((a) => a.status === "ACTIVE").length}</strong><span>Active</span></div>
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <h2>Elevators &amp; AMC</h2>
          <Link className="secondary small" to="/notifications"><Mail size={15} /> Notifications</Link>
        </div>

        {lifts.map((l, i) => {
          const md = l.machineDetails || {};
          const osg = l.osg || {};
          const ups = l.ups || {};
          return (
            <div className="detail-lift" key={l.id || i}>
              <div className="lift-title">
                <div>
                  <b>Lift {i + 1} · {val(l.brand)}</b>
                  <span>{val(l.liftType)} · {val(l.driveType)} · {val(l.numberOfFloors)} floors</span>
                </div>
                <span className="badge">S/N {val(l.serialNumber)}</span>
              </div>

              <dl className="lift-specs">
                <Row label="Lift model" value={l.liftModel} />
                <Row label="Installation type" value={l.installationType} />
                <Row label="Year of installation" value={l.yearOfInstallation} />
                <Row label="Capacity (kg)" value={l.capacityInKg} />
                <Row label="Capacity (persons)" value={l.capacityInPersons} />
                <Row label="Door type" value={l.doorType} />
                <Row label="Machine type" value={l.machineType} />
                <Row label="Machine name" value={l.machineName} />
                <Row label="kW" value={l.kw} />
                <Row label="Amps" value={l.amps} />
                <Row label="Speed" value={l.speed} />
                <Row label="Voltage" value={l.voltage} />
                <Row label="Frequency" value={l.frequency} />
              </dl>

              <details className="lift-more">
                <summary>Machine details</summary>
                <dl className="lift-specs">
                  <Row label="Manufactured by" value={md.manufacturedBy} />
                  <Row label="Year of manufacture" value={md.yearOfManufacture} />
                  <Row label="Machine type" value={md.machineType} />
                  <Row label="No. of grooves" value={md.noOfGrooves} />
                  <Row label="Friction sheave dia" value={md.frictionSheaveDiameter} />
                  <Row label="No. of ropes" value={md.noOfRopes} />
                  <Row label="Rope dia (mm)" value={md.diaOfTheRopeMm} />
                  <Row label="Rope length (mm)" value={md.lengthOfTheRopeMm} />
                  <Row label="Deflector pulley" value={md.deflectorPulley} />
                  <Row label="Main motor" value={md.mainMotor} />
                  <Row label="Roping" value={md.roping} />
                </dl>
              </details>

              <details className="lift-more">
                <summary>OSG &amp; UPS</summary>
                <dl className="lift-specs">
                  <Row label="OSG make" value={osg.make} />
                  <Row label="OSG rope dia" value={osg.diaOfTheRope} />
                  <Row label="OSG rated speed" value={osg.ratedSpeed} />
                  <Row label="OSG tripping speed" value={osg.trippingSpeed} />
                  <Row label="UPS type" value={ups.upsType} />
                  <Row label="UPS kVA" value={ups.kva} />
                  <Row label="UPS battery" value={ups.battery} />
                </dl>
              </details>

              {(l.amcDetails || []).map((a) => (
                <div className="amc" key={a.id || a.contractNumber}>
                  <div>
                    <b>{val(a.contractNumber)}</b>
                    <span>{val(a.contractType)} · {val(a.startDate)} → {val(a.endDate)}</span>
                    <span>
                      Amount {val(a.amcAmount)} · {val(a.paymentFrequency)} · Next payment {val(a.nextPaymentDate)} · Next service {val(a.nextServiceDate)} · Services {val(a.completedServices)}/{val(a.totalServices)}
                    </span>
                  </div>
                  <span className={`status ${String(a.status).toLowerCase()}`}>{val(a.status)}</span>
                </div>
              ))}
              {(!l.amcDetails || l.amcDetails.length === 0) && (
                <div className="empty-box">No AMC contracts for this lift.</div>
              )}
            </div>
          );
        })}
        {!lifts.length && <div className="empty-box">No lift details recorded.</div>}
      </div>
    </section>
  );
}
