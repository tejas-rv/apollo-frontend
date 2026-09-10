import { ArrowLeft, ClipboardList } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../../services/api";

const NA = "—";
const val = (v) => (v === null || v === undefined || v === "" ? NA : v);
function Row({ label, value }) {
  return (
    <>
      <dt>{label}</dt>
      <dd>{val(value)}</dd>
    </>
  );
}
const fmtMotor = (l) => {
  if (
    !l.mainMotorKw &&
    !l.mainMotorAmps &&
    !l.mainMotorSpeed &&
    !l.mainMotorVoltage &&
    !l.mainMotorFrequency &&
    !l.mainMotorNoOfPoles
  )
    return null;
  return [
    l.mainMotorKw,
    l.mainMotorAmps,
    l.mainMotorSpeed,
    l.mainMotorVoltage,
    l.mainMotorFrequency,
    l.mainMotorNoOfPoles && `${l.mainMotorNoOfPoles} poles`,
  ]
    .filter(Boolean)
    .join(" · ");
};
const fmtPulley = (l) =>
  !l.isDeflectorPulley
    ? null
    : `Dia ${val(l.deflectorPulleyDiameter)} · Grooves ${val(l.deflectorPulleyNoOfGrooves)}`;
const fmtBattery = (l) => {
  if (!l.batteryMake && !l.batteryVoltage && !l.batteryNoOfBatteries)
    return null;
  return [
    l.batteryMake,
    l.batteryVoltage,
    l.batteryNoOfBatteries && `${l.batteryNoOfBatteries} batteries`,
  ]
    .filter(Boolean)
    .join(" · ");
};

export default function EngineerCustomerDetail() {
  const { id } = useParams(),
    nav = useNavigate();
  const [c, setC] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    api
      .engineerCustomer(id)
      .then(setC)
      .catch((e) => setErr(e.message));
  }, [id]);

  if (err)
    return (
      <section className="page">
        <div className="alert error">{err}</div>
      </section>
    );
  if (!c)
    return (
      <section className="page">
        <div className="loading">Loading…</div>
      </section>
    );

  return (
    <section className="page">
      <div className="page-head">
        <div>
          <button
            className="back"
            onClick={() => nav("/app/engineer/customers")}
          >
            <ArrowLeft size={16} /> Customers
          </button>
          <span className="eyebrow">CUSTOMER</span>
          <h1>{c.customerName}</h1>
          <p className="muted">
            {c.customerCode || "No code"} · {c.mobileNumber}
          </p>
        </div>
        <div className="head-actions">
          <Link
            className="primary"
            to={`/app/engineer/report/new?customerId=${id}&customerName=${encodeURIComponent(c.customerName)}`}
          >
            <ClipboardList size={16} /> New Service Report
          </Link>
        </div>
      </div>

      <div className="detail-grid">
        <div className="panel">
          <h2>Contact &amp; Address</h2>
          <dl>
            <dt>Mobile</dt>
            <dd>{c.mobileNumber || "—"}</dd>
            <dt>Address</dt>
            <dd>{c.address || "—"}</dd>
            <dt>City</dt>
            <dd>{c.city || "—"}</dd>
            <dt>State</dt>
            <dd>{c.state || "—"}</dd>
          </dl>
        </div>
        <div className="panel">
          <h2>Overview</h2>
          <div className="mini-stats">
            <div>
              <strong>{c.lifts?.length || 0}</strong>
              <span>Lifts</span>
            </div>
            <div>
              <strong>{c.city || NA}</strong>
              <span>City</span>
            </div>
            <div>
              <strong>{c.lifts?.length || 0}</strong>
              <span>Lift units</span>
            </div>
          </div>
        </div>
      </div>

      <div className="panel">
        <h2>Lift specifications</h2>
        {(c.lifts || []).map((l, i) => (
          <div className="detail-lift" key={l.id || i}>
            <div className="lift-title">
              <div>
                <b>
                  Lift {i + 1} · {l.brand || "Unknown brand"}
                </b>
                <span>
                  {l.liftType || "—"} · {l.driveType || "—"} ·{" "}
                  {l.numberOfFloors || "—"} floors · S/N:{" "}
                  {l.serialNumber || "—"}
                </span>
              </div>
              <span className="badge">{l.serialNumber || "No serial"}</span>
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
                <Row label="Manufactured by" value={l.manufacturedBy} />
                <Row label="Year of manufacture" value={l.yearOfManufacture} />
                <Row label="No. of grooves" value={l.noOfGrooves} />
                <Row
                  label="Friction sheave dia"
                  value={l.frictionSheaveDiameter}
                />
                <Row label="No. of ropes" value={l.noOfRopes} />
                <Row label="Rope dia (mm)" value={l.diaOfTheRopeMm} />
                <Row label="Rope length (mm)" value={l.lengthOfTheRopeMm} />
                {l.isDeflectorPulley && (
                  <Row label="Deflector pulley" value={fmtPulley(l)} />
                )}
                <Row label="Main motor" value={fmtMotor(l)} />
                <Row label="Roping" value={l.roping} />
              </dl>
            </details>

            <details className="lift-more">
              <summary>OSG &amp; UPS</summary>
              <dl className="lift-specs">
                <Row label="OSG type" value={l.osgType} />
                <Row label="OSG rated speed" value={l.ratedSpeed} />
                <Row label="OSG tripping speed" value={l.trippingSpeed} />
                <Row
                  label="UPS present"
                  value={l.isUpsPresent ? "Yes" : "No"}
                />
                <Row label="UPS type" value={l.upsType} />
                <Row label="UPS kVA" value={l.kva} />
                <Row label="UPS battery" value={fmtBattery(l)} />
              </dl>
            </details>
          </div>
        ))}
        {(!c.lifts || c.lifts.length === 0) && (
          <div className="empty-box">No lift details recorded.</div>
        )}
      </div>
    </section>
  );
}
