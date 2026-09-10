import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../services/api";

const lift0 = {
  liftType: "PASSENGER",
  driveType: "TRACTION",
  numberOfFloors: 1,
  capacityInKg: "",
  capacityInPersons: "",
  brand: "",
  liftModel: "",
  installationType: "",
  yearOfInstallation: "",
  serialNumber: "",
  doorType: "AUTO",
  machineType: "",
  machineName: "",
  kw: "",
  amps: "",
  speed: "",
  voltage: "",
  frequency: "",
  manufacturedBy: "",
  yearOfManufacture: "",
  noOfGrooves: "",
  frictionSheaveDiameter: "",
  noOfRopes: "",
  diaOfTheRopeMm: "",
  lengthOfTheRopeMm: "",
  roping: "",
  osgType: "",
  osgMake: "",
  osgRopeDia: "",
  ratedSpeed: "",
  trippingSpeed: "",
  isUpsPresent: false,
  upsType: "",
  kva: "",
  upsBatteryMake: "",
  upsBatteryVoltage: "",
  upsBatteryCount: "",
  amcDetails: [],
};
const amc0 = {
  contractNumber: "",
  contractType: "GOLD",
  status: "ACTIVE",
  startDate: "",
  endDate: "",
  amcAmount: "",
  paymentFrequency: "",
  nextPaymentDate: "",
  nextServiceDate: "",
  totalServices: "",
  completedServices: "",
};
const numericFields = [
  "numberOfFloors",
  "yearOfInstallation",
  "capacityInKg",
  "capacityInPersons",
  "kw",
  "amps",
  "speed",
  "voltage",
  "frequency",
  "yearOfManufacture",
  "noOfGrooves",
  "frictionSheaveDiameter",
  "noOfRopes",
  "diaOfTheRopeMm",
  "lengthOfTheRopeMm",
  "ratedSpeed",
  "trippingSpeed",
  "kva",
  "upsBatteryVoltage",
  "upsBatteryCount",
];
function Field({ label, name, value, onChange, type = "text", ...props }) {
  return (
    <label>
      {label}
      <input
        name={name}
        type={type}
        value={value ?? ""}
        onChange={onChange}
        {...props}
      />
    </label>
  );
}
function SelectField({ label, name, value, onChange, options }) {
  return (
    <label>
      {label}
      <select name={name} value={value ?? ""} onChange={onChange}>
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}

export default function CustomerForm() {
  const { id } = useParams();
  const edit = Boolean(id);
  const nav = useNavigate();
  const [form, setForm] = useState({
    customerName: "",
    customerCode: "",
    mobileNumber: "",
    email: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
    lifts: [],
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (edit)
      api
        .customer(id)
        .then((value) => setForm({ ...value, lifts: value.lifts || [] }))
        .catch((e) => setError(e.message));
  }, [edit, id]);
  const set = (event) =>
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  const setLift = (index, event) =>
    setForm((current) => ({
      ...current,
      lifts: current.lifts.map((lift, i) =>
        i === index
          ? {
              ...lift,
              [event.target.name]:
                event.target.type === "checkbox"
                  ? event.target.checked
                  : event.target.value,
            }
          : lift,
      ),
    }));
  const setAmc = (liftIndex, amcIndex, event) =>
    setForm((current) => ({
      ...current,
      lifts: current.lifts.map((lift, i) =>
        i !== liftIndex
          ? lift
          : {
              ...lift,
              amcDetails: (lift.amcDetails || []).map((amc, j) =>
                j === amcIndex
                  ? { ...amc, [event.target.name]: event.target.value }
                  : amc,
              ),
            },
      ),
    }));
  const addLift = () =>
    setForm((current) => ({
      ...current,
      lifts: [...current.lifts, { ...lift0 }],
    }));
  const removeLift = (index) =>
    setForm((current) => ({
      ...current,
      lifts: current.lifts.filter((_, i) => i !== index),
    }));
  const addAmc = (liftIndex) =>
    setForm((current) => ({
      ...current,
      lifts: current.lifts.map((lift, i) =>
        i === liftIndex
          ? { ...lift, amcDetails: [...(lift.amcDetails || []), { ...amc0 }] }
          : lift,
      ),
    }));
  const removeAmc = (liftIndex, amcIndex) =>
    setForm((current) => ({
      ...current,
      lifts: current.lifts.map((lift, i) =>
        i !== liftIndex
          ? lift
          : {
              ...lift,
              amcDetails: (lift.amcDetails || []).filter(
                (_, j) => j !== amcIndex,
              ),
            },
      ),
    }));
  const number = (value) =>
    value === "" || value == null ? null : Number(value);
  async function save(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const clean = {
        ...form,
        lifts: form.lifts.map((lift) => {
          const result = { ...lift };
          numericFields.forEach((field) => {
            result[field] = number(lift[field]);
          });
          result.amcDetails = (lift.amcDetails || []).map((amc) => ({
            ...amc,
            amcAmount: number(amc.amcAmount),
            totalServices: number(amc.totalServices),
            completedServices: number(amc.completedServices),
          }));
          return result;
        }),
      };
      const result = edit
        ? await api.updateCustomer(id, clean)
        : await api.createCustomer(clean);
      nav(`/app/customers/${result.id}`);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="page narrow">
      <div className="page-head">
        <div>
          <span className="eyebrow">{edit ? "EDIT" : "NEW"}</span>
          <h1>{edit ? "Edit customer" : "Add customer"}</h1>
        </div>
        <button className="secondary" onClick={() => nav(-1)}>
          Cancel
        </button>
      </div>
      {error && <div className="alert error">{error}</div>}
      <form onSubmit={save} className="form">
        <div className="panel">
          <h2>Customer details</h2>
          <div className="form-grid">
            <Field
              label="Customer name *"
              name="customerName"
              value={form.customerName}
              onChange={set}
              required
            />
            <Field
              label="Customer code"
              name="customerCode"
              value={form.customerCode}
              onChange={set}
            />
            <Field
              label="Mobile number *"
              name="mobileNumber"
              value={form.mobileNumber}
              onChange={set}
              required
            />
            <Field
              label="Email"
              name="email"
              value={form.email}
              onChange={set}
              type="email"
            />
            <Field label="City" name="city" value={form.city} onChange={set} />
            <Field
              label="State"
              name="state"
              value={form.state}
              onChange={set}
            />
            <Field
              label="Pincode"
              name="pincode"
              value={form.pincode}
              onChange={set}
            />
            <label>
              Address
              <textarea
                name="address"
                value={form.address || ""}
                onChange={set}
              />
            </label>
          </div>
        </div>
        <div className="panel">
          <div className="panel-head">
            <div>
              <h2>Lifts</h2>
              <span className="muted">{form.lifts.length} configured</span>
            </div>
            <button type="button" className="secondary" onClick={addLift}>
              + Add lift
            </button>
          </div>
          {form.lifts.map((lift, index) => (
            <div className="lift-card" key={index}>
              <div className="lift-head">
                <b>Lift {index + 1}</b>
                <button
                  type="button"
                  className="text-danger"
                  onClick={() => removeLift(index)}
                >
                  Remove
                </button>
              </div>
              <div className="form-grid">
                <SelectField
                  label="Lift type"
                  name="liftType"
                  value={lift.liftType}
                  onChange={(e) => setLift(index, e)}
                  options={[
                    "PASSENGER",
                    "GOODS",
                    "HOSPITAL",
                    "HOME",
                    "CAR",
                    "OTHER",
                  ]}
                />
                <SelectField
                  label="Drive type"
                  name="driveType"
                  value={lift.driveType}
                  onChange={(e) => setLift(index, e)}
                  options={["TRACTION", "MRL", "HYDRAULIC", "OTHER"]}
                />
                <SelectField
                  label="Door type"
                  name="doorType"
                  value={lift.doorType}
                  onChange={(e) => setLift(index, e)}
                  options={["AUTO", "MANUAL"]}
                />
                <Field
                  label="Floors *"
                  name="numberOfFloors"
                  value={lift.numberOfFloors}
                  onChange={(e) => setLift(index, e)}
                  type="number"
                  required
                />
                <Field
                  label="Capacity (kg)"
                  name="capacityInKg"
                  value={lift.capacityInKg}
                  onChange={(e) => setLift(index, e)}
                  type="number"
                />
                <Field
                  label="Capacity (persons)"
                  name="capacityInPersons"
                  value={lift.capacityInPersons}
                  onChange={(e) => setLift(index, e)}
                  type="number"
                />
                <Field
                  label="Brand"
                  name="brand"
                  value={lift.brand}
                  onChange={(e) => setLift(index, e)}
                />
                <Field
                  label="Lift model"
                  name="liftModel"
                  value={lift.liftModel}
                  onChange={(e) => setLift(index, e)}
                />
                <Field
                  label="Installation type"
                  name="installationType"
                  value={lift.installationType}
                  onChange={(e) => setLift(index, e)}
                />
                <Field
                  label="Installation year"
                  name="yearOfInstallation"
                  value={lift.yearOfInstallation}
                  onChange={(e) => setLift(index, e)}
                  type="number"
                />
                <Field
                  label="Serial number"
                  name="serialNumber"
                  value={lift.serialNumber}
                  onChange={(e) => setLift(index, e)}
                />
              </div>
              <details className="lift-more">
                <summary>Machine details</summary>
                <div className="form-grid">
                  <Field
                    label="Machine type"
                    name="machineType"
                    value={lift.machineType}
                    onChange={(e) => setLift(index, e)}
                  />
                  <Field
                    label="Machine name"
                    name="machineName"
                    value={lift.machineName}
                    onChange={(e) => setLift(index, e)}
                  />
                  <Field
                    label="Manufactured by"
                    name="manufacturedBy"
                    value={lift.manufacturedBy}
                    onChange={(e) => setLift(index, e)}
                  />
                  <Field
                    label="Year of manufacture"
                    name="yearOfManufacture"
                    value={lift.yearOfManufacture}
                    onChange={(e) => setLift(index, e)}
                    type="number"
                  />
                  <Field
                    label="kW"
                    name="kw"
                    value={lift.kw}
                    onChange={(e) => setLift(index, e)}
                    type="number"
                  />
                  <Field
                    label="Amps"
                    name="amps"
                    value={lift.amps}
                    onChange={(e) => setLift(index, e)}
                    type="number"
                  />
                  <Field
                    label="Speed"
                    name="speed"
                    value={lift.speed}
                    onChange={(e) => setLift(index, e)}
                    type="number"
                  />
                  <Field
                    label="Voltage"
                    name="voltage"
                    value={lift.voltage}
                    onChange={(e) => setLift(index, e)}
                    type="number"
                  />
                  <Field
                    label="Frequency"
                    name="frequency"
                    value={lift.frequency}
                    onChange={(e) => setLift(index, e)}
                    type="number"
                  />
                  <Field
                    label="No. of grooves"
                    name="noOfGrooves"
                    value={lift.noOfGrooves}
                    onChange={(e) => setLift(index, e)}
                    type="number"
                  />
                  <Field
                    label="Friction sheave dia"
                    name="frictionSheaveDiameter"
                    value={lift.frictionSheaveDiameter}
                    onChange={(e) => setLift(index, e)}
                    type="number"
                  />
                  <Field
                    label="No. of ropes"
                    name="noOfRopes"
                    value={lift.noOfRopes}
                    onChange={(e) => setLift(index, e)}
                    type="number"
                  />
                  <Field
                    label="Rope dia (mm)"
                    name="diaOfTheRopeMm"
                    value={lift.diaOfTheRopeMm}
                    onChange={(e) => setLift(index, e)}
                    type="number"
                  />
                  <Field
                    label="Rope length (mm)"
                    name="lengthOfTheRopeMm"
                    value={lift.lengthOfTheRopeMm}
                    onChange={(e) => setLift(index, e)}
                    type="number"
                  />
                  <Field
                    label="Roping"
                    name="roping"
                    value={lift.roping}
                    onChange={(e) => setLift(index, e)}
                  />
                </div>
              </details>
              <details className="lift-more">
                <summary>OSG &amp; UPS</summary>
                <div className="form-grid">
                  <Field
                    label="OSG type"
                    name="osgType"
                    value={lift.osgType}
                    onChange={(e) => setLift(index, e)}
                  />
                  <Field
                    label="OSG make"
                    name="osgMake"
                    value={lift.osgMake}
                    onChange={(e) => setLift(index, e)}
                  />
                  <Field
                    label="OSG rope dia"
                    name="osgRopeDia"
                    value={lift.osgRopeDia}
                    onChange={(e) => setLift(index, e)}
                  />
                  <Field
                    label="OSG rated speed"
                    name="ratedSpeed"
                    value={lift.ratedSpeed}
                    onChange={(e) => setLift(index, e)}
                    type="number"
                  />
                  <Field
                    label="OSG tripping speed"
                    name="trippingSpeed"
                    value={lift.trippingSpeed}
                    onChange={(e) => setLift(index, e)}
                    type="number"
                  />
                  <label>
                    UPS present
                    <select
                      name="isUpsPresent"
                      value={String(lift.isUpsPresent)}
                      onChange={(e) =>
                        setLift(index, {
                          target: {
                            name: "isUpsPresent",
                            type: "checkbox",
                            checked: e.target.value === "true",
                          },
                        })
                      }
                    >
                      <option value="false">No</option>
                      <option value="true">Yes</option>
                    </select>
                  </label>
                  <Field
                    label="UPS type"
                    name="upsType"
                    value={lift.upsType}
                    onChange={(e) => setLift(index, e)}
                  />
                  <Field
                    label="UPS kVA"
                    name="kva"
                    value={lift.kva}
                    onChange={(e) => setLift(index, e)}
                    type="number"
                  />
                  <Field
                    label="Battery make"
                    name="upsBatteryMake"
                    value={lift.upsBatteryMake}
                    onChange={(e) => setLift(index, e)}
                  />
                  <Field
                    label="Battery voltage"
                    name="upsBatteryVoltage"
                    value={lift.upsBatteryVoltage}
                    onChange={(e) => setLift(index, e)}
                    type="number"
                  />
                  <Field
                    label="No. of batteries"
                    name="upsBatteryCount"
                    value={lift.upsBatteryCount}
                    onChange={(e) => setLift(index, e)}
                    type="number"
                  />
                </div>
              </details>
              <div className="amc-form">
                <div className="panel-head">
                  <h3>AMC details</h3>
                  <button
                    type="button"
                    className="secondary small"
                    onClick={() => addAmc(index)}
                  >
                    + Add AMC
                  </button>
                </div>
                {(lift.amcDetails || []).map((amc, amcIndex) => (
                  <div className="amc-form__item" key={amcIndex}>
                    <div className="lift-head">
                      <b>AMC {amcIndex + 1}</b>
                      <button
                        type="button"
                        className="text-danger"
                        onClick={() => removeAmc(index, amcIndex)}
                      >
                        Remove
                      </button>
                    </div>
                    <div className="form-grid">
                      <Field
                        label="Contract number"
                        name="contractNumber"
                        value={amc.contractNumber}
                        onChange={(e) => setAmc(index, amcIndex, e)}
                      />
                      <SelectField
                        label="AMC type"
                        name="contractType"
                        value={amc.contractType}
                        onChange={(e) => setAmc(index, amcIndex, e)}
                        options={["GOLD", "SILVER", "PLATINUM"]}
                      />
                      <SelectField
                        label="Status"
                        name="status"
                        value={amc.status}
                        onChange={(e) => setAmc(index, amcIndex, e)}
                        options={["ACTIVE", "EXPIRED"]}
                      />
                      <Field
                        label="Start date"
                        name="startDate"
                        value={amc.startDate}
                        onChange={(e) => setAmc(index, amcIndex, e)}
                        type="date"
                      />
                      <Field
                        label="End date"
                        name="endDate"
                        value={amc.endDate}
                        onChange={(e) => setAmc(index, amcIndex, e)}
                        type="date"
                      />
                      <Field
                        label="AMC amount"
                        name="amcAmount"
                        value={amc.amcAmount}
                        onChange={(e) => setAmc(index, amcIndex, e)}
                        type="number"
                      />
                      <Field
                        label="Payment frequency"
                        name="paymentFrequency"
                        value={amc.paymentFrequency}
                        onChange={(e) => setAmc(index, amcIndex, e)}
                      />
                      <Field
                        label="Next payment"
                        name="nextPaymentDate"
                        value={amc.nextPaymentDate}
                        onChange={(e) => setAmc(index, amcIndex, e)}
                        type="date"
                      />
                      <Field
                        label="Next service"
                        name="nextServiceDate"
                        value={amc.nextServiceDate}
                        onChange={(e) => setAmc(index, amcIndex, e)}
                        type="date"
                      />
                      <Field
                        label="Total services"
                        name="totalServices"
                        value={amc.totalServices}
                        onChange={(e) => setAmc(index, amcIndex, e)}
                        type="number"
                      />
                      <Field
                        label="Completed services"
                        name="completedServices"
                        value={amc.completedServices}
                        onChange={(e) => setAmc(index, amcIndex, e)}
                        type="number"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {!form.lifts.length && (
            <div className="empty-box">No lifts added yet.</div>
          )}
        </div>
        <div className="form-actions">
          <button type="button" className="secondary" onClick={() => nav(-1)}>
            Cancel
          </button>
          <button className="primary" disabled={saving}>
            {saving ? "Saving…" : edit ? "Save changes" : "Create customer"}
          </button>
        </div>
      </form>
    </section>
  );
}
