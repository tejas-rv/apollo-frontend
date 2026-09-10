export default function CustomerSummary({ customer, compact = false }) {
  if (!customer) return null;
  return (
    <div
      className={`customer-summary${compact ? " customer-summary--compact" : ""}`}
    >
      <div className="customer-summary__identity">
        <strong>
          {customer.customerName || customer.fullName || "Customer"}
        </strong>
        <span>{customer.customerCode || "No code"}</span>
      </div>
      <div className="customer-summary__details">
        <span>
          {customer.mobileNumber || customer.phoneNumber || "No phone"}
        </span>
        {customer.email && <span>{customer.email}</span>}
        {customer.city && <span>{customer.city}</span>}
        {!compact && customer.address && <span>{customer.address}</span>}
      </div>
      {!compact && customer.lifts?.length > 0 && (
        <div className="customer-summary__lifts">
          <b>
            {customer.lifts.length} lift{customer.lifts.length === 1 ? "" : "s"}
          </b>
          <span>
            {customer.lifts
              .map((lift) => lift.liftType)
              .filter(Boolean)
              .join(" · ")}
          </span>
        </div>
      )}
    </div>
  );
}
