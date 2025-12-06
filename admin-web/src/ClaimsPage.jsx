// admin-web/src/ClaimsPage.jsx

import React, { useEffect, useState } from "react";
import { API_BASE_URL } from "./constants";

function formatYMD(date) {
  return date.toISOString().slice(0, 10);
}

export default function ClaimsPage({ token }) {
  const today = new Date();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(today.getDate() - 30);

  const [from, setFrom] = useState(formatYMD(thirtyDaysAgo));
  const [to, setTo] = useState(formatYMD(today));
  const [statusFilter, setStatusFilter] = useState("ALL"); // ALL | PENDING | APPROVED | REJECTED
  const [userIdFilter, setUserIdFilter] = useState("");

  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);

  const loadClaims = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (from) params.append("from", from);
      if (to) params.append("to", to);
      if (userIdFilter) params.append("userId", userIdFilter);
      if (statusFilter !== "ALL") params.append("status", statusFilter);

      const res = await fetch(`${API_BASE_URL}/claims?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();
      if (Array.isArray(data)) {
        setClaims(data);
      } else {
        console.error("Unexpected claims response:", data);
        setClaims([]);
      }
    } catch (err) {
      console.error("Error fetching claims:", err);
      setClaims([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClaims();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const updateStatus = async (id, newStatus) => {
    if (
      !window.confirm(
        `Change status of claim #${id} to ${newStatus}?`
      )
    ) {
      return;
    }
    try {
      setUpdatingId(id);

      const res = await fetch(`${API_BASE_URL}/claims/${id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await res.json();

      if (!res.ok) {
        console.error("Status update error:", data);
        alert(data.error || "Failed to update claim status");
        return;
      }

      // Re-load list
      await loadClaims();
    } catch (err) {
      console.error("Update claim status error:", err);
      alert("Error updating claim status");
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredClaims = claims; // all filtering done on server

  return (
    <div style={{ padding: "16px" }}>
      <h2>TA/DA Claims</h2>

      {/* Filters */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "12px",
          marginBottom: "12px",
          alignItems: "flex-end",
        }}
      >
        <div>
          <label style={labelStyle}>From</label>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </div>
        <div>
          <label style={labelStyle}>To</label>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </div>

        <div>
          <label style={labelStyle}>Status</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="ALL">All</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>

        <div>
          <label style={labelStyle}>User ID (optional)</label>
          <input
            type="number"
            value={userIdFilter}
            onChange={(e) => setUserIdFilter(e.target.value)}
            style={{ width: "90px" }}
          />
        </div>

        <button onClick={loadClaims} disabled={loading}>
          {loading ? "Loading..." : "Load"}
        </button>
      </div>

      {/* Table */}
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
              <th style={thStyle}>Employee</th>
              <th style={thStyle}>Date</th>
              <th style={thStyle}>Amount</th>
              <th style={thStyle}>Details</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>Approved By</th>
              <th style={thStyle}>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredClaims.map((c) => (
              <tr key={c.id}>
                <td style={tdStyle}>{c.id}</td>
                <td style={tdStyle}>
                  {c.user ? (
                    <>
                      {c.user.name}
                      <br />
                      <small>{c.user.email}</small>
                    </>
                  ) : (
                    "-"
                  )}
                </td>
                <td style={tdStyle}>
                  {new Date(c.date).toLocaleDateString()}
                </td>
                <td style={tdStyle}>Rs {c.amount}</td>
                <td style={tdStyle}>
                  <div>
                    <strong>{c.type || "TA/DA"}</strong>
                    {c.distanceKm != null && (
                      <>
                        {" "}
                        • <span>{c.distanceKm} km</span>
                      </>
                    )}
                  </div>
                  {c.description && (
                    <div>
                      <small>{c.description}</small>
                    </div>
                  )}
                </td>
                <td style={tdStyle}>
                  <span
                    style={{
                      padding: "3px 8px",
                      borderRadius: "999px",
                      backgroundColor:
                        c.status === "APPROVED"
                          ? "#d1fae5"
                          : c.status === "REJECTED"
                          ? "#fee2e2"
                          : "#fef9c3",
                      color:
                        c.status === "APPROVED"
                          ? "#065f46"
                          : c.status === "REJECTED"
                          ? "#991b1b"
                          : "#92400e",
                      fontWeight: 600,
                      fontSize: "12px",
                    }}
                  >
                    {c.status}
                  </span>
                </td>
                <td style={tdStyle}>
                  {c.approvedByUser ? (
                    <>
                      {c.approvedByUser.name}
                      <br />
                      <small>
                        {c.approvedByUser.email}
                        {c.approvedAt &&
                          " • " +
                            new Date(c.approvedAt).toLocaleDateString()}
                      </small>
                    </>
                  ) : (
                    "-"
                  )}
                </td>
                <td style={tdStyle}>
                  <div style={{ display: "flex", gap: "4px" }}>
                    <button
                      disabled={updatingId === c.id}
                      onClick={() => updateStatus(c.id, "PENDING")}
                    >
                      Pending
                    </button>
                    <button
                      disabled={updatingId === c.id}
                      style={{
                        backgroundColor: "#16a34a",
                        color: "#fff",
                        border: "none",
                        padding: "4px 8px",
                        borderRadius: "4px",
                      }}
                      onClick={() => updateStatus(c.id, "APPROVED")}
                    >
                      Approve
                    </button>
                    <button
                      disabled={updatingId === c.id}
                      style={{
                        backgroundColor: "#dc2626",
                        color: "#fff",
                        border: "none",
                        padding: "4px 8px",
                        borderRadius: "4px",
                      }}
                      onClick={() => updateStatus(c.id, "REJECTED")}
                    >
                      Reject
                    </button>
                  </div>
                </td>
              </tr>
            ))}

            {!filteredClaims.length && !loading && (
              <tr>
                <td style={tdStyle} colSpan={8}>
                  No claims found for this filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const labelStyle = {
  display: "block",
  fontSize: "12px",
  color: "#555",
  marginBottom: "3px",
};

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
