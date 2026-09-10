import { ClipboardEdit, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../services/api";

function formatDate(value) {
  return value ? new Date(value).toLocaleDateString() : "-";
}

export default function WorkOrders() {
  const navigate = useNavigate();
  const [data, setData] = useState({ content: [], totalElements: 0 });
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");

  const load = () =>
    api
      .adminEnquiries({ status: "WORK_ORDER", page: 0, size: 50 })
      .then(setData)
      .catch((e) => setError(e.message));

  useEffect(() => {
    load();
  }, []);

  const orders = (data.content || []).filter((item) => {
    const value =
      `${item.fullName || ""} ${item.phoneNumber || ""} ${item.inquiryType || ""}`.toLowerCase();
    return !query || value.includes(query.toLowerCase());
  });

  return (
    <section className="page">
      <div className="page-head">
        <div>
          <span className="eyebrow">MARKETING</span>
          <h1>Work Orders</h1>
          <p className="muted">
            {data.totalElements || orders.length} active work orders
          </p>
        </div>
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
            placeholder="Search by customer or phone..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>
      <div className="panel">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Enquiry</th>
                <th>Customer</th>
                <th>Phone</th>
                <th>Lift type</th>
                <th>Started</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id}>
                  <td>#{order.id}</td>
                  <td>
                    <b>{order.fullName}</b>
                  </td>
                  <td>{order.phoneNumber || "-"}</td>
                  <td>{order.requirementType || order.inquiryType || "-"}</td>
                  <td>{formatDate(order.updatedAt || order.createdAt)}</td>
                  <td>
                    <span className="status pending">Work order</span>
                  </td>
                  <td>
                    <button
                      className="primary"
                      onClick={() =>
                        navigate(`/app/workorders/${order.id}/customer`, {
                          state: { enquiry: order },
                        })
                      }
                    >
                      <ClipboardEdit size={15} /> Create customer
                    </button>
                  </td>
                </tr>
              ))}
              {!orders.length && (
                <tr>
                  <td colSpan="7" className="empty">
                    No active work orders.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
