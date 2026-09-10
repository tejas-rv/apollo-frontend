import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { api } from "../services/api";

const emptyLift = {
  liftType: "PASSENGER",
  driveType: "TRACTION",
  numberOfFloors: 1,
  capacityInKg: "",
  capacityInPersons: "",
  capacityInTonnes: "",
  brand: "",
  liftModel: "",
  installationType: "",
  yearOfInstallation: "",
  serialNumber: "",
  doorType: "AUTO",
};
const PERSON_CAPACITIES = Array.from({ length: 25 }, (_, index) => index + 2);
const FREIGHT_CAPACITIES = Array.from(
  { length: 20 },
  (_, index) => (index + 1) / 2,
);
const isFreightLift = (liftType) => liftType === "GOODS";

function Field({
  label,
  name,
  value,
  onChange,
  type = "text",
  required = false,
}) {
  return (
    <label>
      {label}
      {required && " *"}
      <input
        name={name}
        type={type}
        required={required}
        value={value ?? ""}
        onChange={onChange}
      />
    </label>
  );
}

function initialCustomer(enquiry) {
  const liftType = String(
    enquiry?.requirementType || "PASSENGER",
  ).toUpperCase();
  const liftTypeMap = {
    "HOME LIFT": "HOME",
    "PASSENGER ELEVATOR": "PASSENGER",
    "MRL ELEVATOR": "PASSENGER",
    "HOSPITAL / FREIGHT LIFT": "HOSPITAL",
  };
  return {
    customerName: enquiry?.fullName || "",
    customerCode: "",
    mobileNumber: enquiry?.phoneNumber || "",
    email: enquiry?.email || "",
    address: enquiry?.address || "",
    city: enquiry?.city || "",
    state: enquiry?.state || "",
    pincode: enquiry?.pincode || "",
    lifts: [{ ...emptyLift, liftType: liftTypeMap[liftType] || liftType }],
  };
}

export default function CustomerConversion() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [enquiry, setEnquiry] = useState(location.state?.enquiry || null);
  const [form, setForm] = useState(() =>
    initialCustomer(location.state?.enquiry),
  );
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (enquiry) return;
    api
      .adminEnquiry(id)
      .then((value) => {
        setEnquiry(value);
        setForm(initialCustomer(value));
      })
      .catch((e) => setError(e.message));
  }, [id, enquiry]);

  const set = (event) =>
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  const setLift = (index, event) =>
    setForm((current) => ({
      ...current,
      lifts: current.lifts.map((lift, liftIndex) =>
        liftIndex === index
          ? event.target.name === "liftType"
            ? {
                ...lift,
                liftType: event.target.value,
                capacityInPersons: "",
                capacityInKg: "",
                capacityInTonnes: "",
              }
            : { ...lift, [event.target.name]: event.target.value }
          : lift,
      ),
    }));
  const addLift = () =>
    setForm((current) => ({
      ...current,
      lifts: [...current.lifts, { ...emptyLift }],
    }));
  const removeLift = (index) =>
    setForm((current) => ({
      ...current,
      lifts: current.lifts.filter((_, liftIndex) => liftIndex !== index),
    }));

  async function save(event) {
    event.preventDefault();
    setError("");
    setSaving(true);
    try {
      const body = {
        ...form,
        lifts: form.lifts.map((lift) => ({
          ...lift,
          capacityInTonnes: undefined,
          numberOfFloors:
            lift.numberOfFloors === "" ? null : Number(lift.numberOfFloors),
          capacityInKg: isFreightLift(lift.liftType)
            ? lift.capacityInTonnes === ""
              ? null
              : Number(lift.capacityInTonnes) * 1000
            : lift.capacityInKg === ""
              ? null
              : Number(lift.capacityInKg),
          capacityInPersons: isFreightLift(lift.liftType)
            ? lift.capacityInTonnes === ""
              ? null
              : Math.floor((Number(lift.capacityInTonnes) * 1000) / 68)
            : lift.capacityInPersons === ""
              ? null
              : Number(lift.capacityInPersons),
          yearOfInstallation:
            lift.yearOfInstallation === ""
              ? null
              : Number(lift.yearOfInstallation),
        })),
      };
      const result = await api.convertEnquiryToCustomer(id, body);
      navigate(
        result?.customerId
          ? `/app/customers/${result.customerId}`
          : "/app/customers",
      );
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
          <span className="eyebrow">WORK ORDER / CUSTOMER</span>
          <h1>Create customer</h1>
          <p className="muted">
            Review the enquiry details and complete the customer information
            before conversion.
          </p>
        </div>
        <button className="secondary" onClick={() => navigate(-1)}>
          Back
        </button>
      </div>
      {error && <div className="alert error">{error}</div>}
      {enquiry && (
        <div className="alert success">
          Enquiry #{enquiry.id} is prefilled. Complete the required customer and
          lift details.
        </div>
      )}
      <form className="form" onSubmit={save}>
        <div className="panel">
          <h2>Customer details</h2>
          <div className="form-grid">
            <Field
              label="Customer name"
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
              label="Mobile number"
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
              <textarea name="address" value={form.address} onChange={set} />
            </label>
          </div>
        </div>
        <div className="panel">
          <div className="panel-head">
            <div>
              <h2>Lift details</h2>
              <span className="muted">
                Add the lift information required for the customer record.
              </span>
            </div>
            <button type="button" className="secondary" onClick={addLift}>
              + Add lift
            </button>
          </div>
          {form.lifts.map((lift, index) => (
            <div className="lift-card" key={index}>
              <div className="lift-head">
                <b>Lift {index + 1}</b>
                {form.lifts.length > 1 && (
                  <button
                    type="button"
                    className="text-danger"
                    onClick={() => removeLift(index)}
                  >
                    Remove
                  </button>
                )}
              </div>
              <div className="form-grid">
                <label>
                  Lift type
                  <select
                    name="liftType"
                    value={lift.liftType}
                    onChange={(event) => setLift(index, event)}
                  >
                    {[
                      "PASSENGER",
                      "GOODS",
                      "HOSPITAL",
                      "HOME",
                      "CAR",
                      "OTHER",
                    ].map((value) => (
                      <option key={value}>{value}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Drive type
                  <select
                    name="driveType"
                    value={lift.driveType}
                    onChange={(event) => setLift(index, event)}
                  >
                    {["TRACTION", "MRL", "HYDRAULIC", "OTHER"].map((value) => (
                      <option key={value}>{value}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Door type
                  <select
                    name="doorType"
                    value={lift.doorType}
                    onChange={(event) => setLift(index, event)}
                  >
                    {["AUTO", "MANUAL"].map((value) => (
                      <option key={value}>{value}</option>
                    ))}
                  </select>
                </label>
                <Field
                  label="Floors"
                  name="numberOfFloors"
                  value={lift.numberOfFloors}
                  onChange={(event) => setLift(index, event)}
                  type="number"
                  required
                />
                {isFreightLift(lift.liftType) ? (
                  <label>
                    Capacity (tonnes)
                    <select
                      name="capacityInTonnes"
                      value={lift.capacityInTonnes}
                      onChange={(event) => setLift(index, event)}
                    >
                      <option value="">Select tonnes</option>
                      {FREIGHT_CAPACITIES.map((value) => (
                        <option key={value} value={value}>
                          {value} tonnes
                        </option>
                      ))}
                    </select>
                    {lift.capacityInTonnes && (
                      <span className="field-hint">
                        {Math.floor(
                          (Number(lift.capacityInTonnes) * 1000) / 68,
                        )}{" "}
                        person-equivalent capacity
                      </span>
                    )}
                  </label>
                ) : (
                  <label>
                    Capacity (persons)
                    <select
                      name="capacityInPersons"
                      value={lift.capacityInPersons}
                      onChange={(event) => setLift(index, event)}
                    >
                      <option value="">Select persons</option>
                      {PERSON_CAPACITIES.map((value) => (
                        <option key={value} value={value}>
                          {value} persons
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                <Field
                  label="Brand"
                  name="brand"
                  value={lift.brand}
                  onChange={(event) => setLift(index, event)}
                />
                <Field
                  label="Lift model"
                  name="liftModel"
                  value={lift.liftModel}
                  onChange={(event) => setLift(index, event)}
                />
                <Field
                  label="Installation type"
                  name="installationType"
                  value={lift.installationType}
                  onChange={(event) => setLift(index, event)}
                />
                <Field
                  label="Installation year"
                  name="yearOfInstallation"
                  value={lift.yearOfInstallation}
                  onChange={(event) => setLift(index, event)}
                  type="number"
                />
                <Field
                  label="Serial number"
                  name="serialNumber"
                  value={lift.serialNumber}
                  onChange={(event) => setLift(index, event)}
                />
              </div>
            </div>
          ))}
        </div>
        <div className="form-actions">
          <button
            type="button"
            className="secondary"
            onClick={() => navigate(-1)}
          >
            Cancel
          </button>
          <button className="primary" disabled={saving}>
            {saving ? "Creating customer..." : "Create customer and complete"}
          </button>
        </div>
      </form>
    </section>
  );
}
