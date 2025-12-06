// admin-web/src/DealersPage.jsx

import React, { useEffect, useState } from "react";
import { API_BASE_URL } from "./constants";

export default function DealersPage({ token }) {
  const [dealers, setDealers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterApproved, setFilterApproved] = useState("all"); // all | approved | pending
  const [approvingId, setApprovingId] = useState(null);

  const loadDealers = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/reports/dealers`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        setDealers(data);
      } else {
        console.error("Unexpected dealers response:", data);
        setDealers([]);
      }
    } catch (err) {
      console.error("Error fetching dealers:", err);
      setDealers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDealers();
  }, [token]);

  const handleApprove = async (id) => {
    if (!window.confirm("Approve this dealer?")) return;
    try {
      setApprovingId(id);
      const res = await fetch(`${API_BASE_URL}/dealers/${id}/approve`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (!res.ok) {
        console.error("Approve error:", data);
        alert(data.error || "Failed to approve dealer");
        return;
      }
      // Refresh list
      await loadDealers();
    } catch (err) {
      console.error("Approve dealer error:", err);
      alert("Error approving dealer");
    } finally {
      setApprovingId(null);
    }
  };

  const filteredDealers = dealers.filter((d) => {
    if (filterApproved === "approved") return d.approved === true;
    if (filterApproved === "pending") return d.approved === false;
    return true;
  });

  return (
    <div style={{ padding: "16px" }}>
      <h2>Dealers</h2>
      <div
        style={{
          display: "flex",
          gap: "12px",
          alignItems: "center",
          marginBottom: "12px",
          flexWrap: "wrap",
        }}
      >
        <button onClick={loadDealers} disabled={loading}>
          {loading ? "Refreshing..." : "Refresh"}
        </button>

        <div>
          <label>Filter:&nbsp;</label>
          <select
            value={filterApproved}
            onChange={(e) => setFilterApproved(e.target.value)}
          >
            <option value="all">All</option>
            <option value="approved">Approved</option>
            <option value="pending">Pending</option>
          </select>
        </div>
      </div>

      <div style={{ maxHeight: "75vh", overflow: "auto" }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: "14px",
          }}
        >
          <thead>
            <tr>
              <th style={thStyle}>ID</th>
              <th style={thStyle}>Dealer</th>
              <th style={thStyle}>Contact</th>
              <th style={thStyle}>Location</th>
              <th style={thStyle}>Created By</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredDealers.map((d) => (
              <tr key={d.id}>
                <td style={tdStyle}>{d.id}</td>
                <td style={tdStyle}>
                  <strong>{d.name}</strong>
                  <br />
                  <small>
                    {d.type} {d.city ? `• ${d.city}` : ""}
                  </small>
                </td>
                <td style={tdStyle}>
                  {d.contactName || "-"}
                  <br />
                  <small>{d.contactMobile || ""}</small>
                </td>
                <td style={tdStyle}>
                  {d.lat && d.lng
                    ? `${d.lat.toFixed(4)}, ${d.lng.toFixed(4)}`
                    : "-"}
                </td>
                <td style={tdStyle}>
                  {d.createdByUser ? (
                    <>
                      {d.createdByUser.name}
                      <br />
                      <small>{d.createdByUser.email}</small>
                    </>
                  ) : (
                    "-"
                  )}
                </td>
                <td style={tdStyle}>
                  {d.approved ? (
                    <span style={{ color: "green", fontWeight: 600 }}>
                      Approved
                    </span>
                  ) : (
                    <span style={{ color: "#b45309", fontWeight: 600 }}>
                      Pending
                    </span>
                  )}
                </td>
                <td style={tdStyle}>
                  {!d.approved && (
                    <button
                      onClick={() => handleApprove(d.id)}
                      disabled={approvingId === d.id}
                      style={{
                        padding: "4px 8px",
                        borderRadius: "4px",
                        border: "none",
                        backgroundColor: "#16a34a",
                        color: "#fff",
                        cursor: "pointer",
                      }}
                    >
                      {approvingId === d.id ? "Approving..." : "Approve"}
                    </button>
                  )}
                </td>
              </tr>
            ))}

            {!filteredDealers.length && (
              <tr>
                <td style={tdStyle} colSpan={7}>
                  No dealers found for this filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const thStyle = {
  borderBottom: "1px solid #ccc",
  padding: "8px",
  textAlign: "left",
  backgroundColor: "#f5f5f5",
};

const tdStyle = {
  borderBottom: "1px solid #eee",
  padding: "8px",
};
