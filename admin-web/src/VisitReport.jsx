// admin-web/src/VisitReport.jsx

import React, { useEffect, useState } from "react";
import { API_BASE_URL } from "./constants";

export default function VisitReport({ token }) {
  const [users, setUsers] = useState([]);
  const [dealers, setDealers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedDealerId, setSelectedDealerId] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [visits, setVisits] = useState([]);

  useEffect(() => {
    if (!token) return;

    const today = new Date().toISOString().slice(0, 10);
    setFromDate(today);
    setToDate(today);

    const fetchUsers = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/reports/users`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await res.json();
        if (Array.isArray(data)) {
          setUsers(data);
        } else {
          console.error("Unexpected users response:", data);
        }
      } catch (err) {
        console.error("Error fetching users:", err);
      }
    };

    const fetchDealers = async () => {
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
        }
      } catch (err) {
        console.error("Error fetching dealers:", err);
      }
    };

    fetchUsers();
    fetchDealers();
  }, [token]);

  const fetchVisits = async () => {
    if (!fromDate || !toDate) {
      alert("Please select both From and To dates");
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams({
        from: fromDate,
        to: toDate,
      });

      if (selectedUserId) params.append("userId", selectedUserId);
      if (selectedDealerId) params.append("dealerId", selectedDealerId);

      const res = await fetch(
        `${API_BASE_URL}/reports/visits?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const data = await res.json();
      if (Array.isArray(data)) {
        setVisits(data);
      } else {
        console.error("Unexpected visits response:", data);
        setVisits([]);
      }
    } catch (err) {
      console.error("Error fetching visits:", err);
      setVisits([]);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (checkInAt, checkOutAt) => {
    if (!checkOutAt) return "In progress";

    const start = new Date(checkInAt).getTime();
    const end = new Date(checkOutAt).getTime();
    const diffMs = end - start;

    const minutes = Math.floor(diffMs / 60000);
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    if (hours > 0) {
      return `${hours}h ${remainingMinutes}m`;
    }
    return `${minutes}m`;
  };

  const downloadCsv = () => {
    if (!visits.length) {
      alert("No records to export");
      return;
    }

    const header = [
      "Visit ID",
      "Employee Name",
      "Employee Email",
      "Dealer Name",
      "Dealer City",
      "Dealer Type",
      "Check-in",
      "Check-out",
      "Duration",
      "Notes",
    ];

    const rows = visits.map((v) => [
      v.id,
      v.user?.name || "",
      v.user?.email || "",
      v.dealer?.name || "",
      v.dealer?.city || "",
      v.dealer?.type || "",
      new Date(v.checkInAt).toISOString(),
      v.checkOutAt ? new Date(v.checkOutAt).toISOString() : "",
      formatDuration(v.checkInAt, v.checkOutAt),
      v.notes || "",
    ]);

    const csvContent =
      [header, ...rows].map((row) => row.join(",")).join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "visit-report.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ padding: "16px" }}>
      <h2>Dealer Visit Report</h2>

      <div
        style={{
          display: "flex",
          gap: "12px",
          flexWrap: "wrap",
          marginBottom: "16px",
        }}
      >
        <div>
          <label>From:&nbsp;</label>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
          />
        </div>

        <div>
          <label>To:&nbsp;</label>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
          />
        </div>

        <div>
          <label>Employee:&nbsp;</label>
          <select
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
          >
            <option value="">All</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} ({u.email})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label>Dealer:&nbsp;</label>
          <select
            value={selectedDealerId}
            onChange={(e) => setSelectedDealerId(e.target.value)}
          >
            <option value="">All</option>
            {dealers.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} {d.city ? `(${d.city})` : ""} [{d.type}]
              </option>
            ))}
          </select>
        </div>

        <button onClick={fetchVisits} disabled={loading}>
          {loading ? "Loading..." : "Load"}
        </button>

        <button onClick={downloadCsv}>Export CSV</button>
      </div>

      <div style={{ maxHeight: "70vh", overflow: "auto" }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: "14px",
          }}
        >
          <thead>
            <tr>
              <th style={thStyle}>Visit ID</th>
              <th style={thStyle}>Employee</th>
              <th style={thStyle}>Dealer</th>
              <th style={thStyle}>Check-in</th>
              <th style={thStyle}>Check-out</th>
              <th style={thStyle}>Duration</th>
            </tr>
          </thead>
          <tbody>
            {visits.map((v) => (
              <tr key={v.id}>
                <td style={tdStyle}>{v.id}</td>
                <td style={tdStyle}>
                  {v.user?.name}
                  <br />
                  <small>{v.user?.email}</small>
                </td>
                <td style={tdStyle}>
                  {v.dealer?.name}
                  <br />
                  <small>
                    {v.dealer?.city} | {v.dealer?.type}
                  </small>
                </td>
                <td style={tdStyle}>
                  {new Date(v.checkInAt).toLocaleString()}
                </td>
                <td style={tdStyle}>
                  {v.checkOutAt
                    ? new Date(v.checkOutAt).toLocaleString()
                    : "In progress"}
                </td>
                <td style={tdStyle}>
                  {formatDuration(v.checkInAt, v.checkOutAt)}
                </td>
              </tr>
            ))}
            {!visits.length && (
              <tr>
                <td style={tdStyle} colSpan={6}>
                  No records. Adjust filters and click Load.
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
