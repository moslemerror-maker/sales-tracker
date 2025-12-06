// admin-web/src/AttendanceReport.jsx

import React, { useEffect, useState } from "react";
import { API_BASE_URL } from "./constants";

export default function AttendanceReport({ token }) {
  const [users, setUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [records, setRecords] = useState([]);

  useEffect(() => {
    if (!token) return;

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

    fetchUsers();

    const today = new Date().toISOString().slice(0, 10);
    setFromDate(today);
    setToDate(today);
  }, [token]);

  const fetchAttendance = async () => {
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
      if (selectedUserId) {
        params.append("userId", selectedUserId);
      }

      const res = await fetch(
        `${API_BASE_URL}/reports/attendance?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const data = await res.json();
      if (Array.isArray(data)) {
        setRecords(data);
      } else {
        console.error("Unexpected attendance response:", data);
        setRecords([]);
      }
    } catch (err) {
      console.error("Error fetching attendance:", err);
      setRecords([]);
    } finally {
      setLoading(false);
    }
  };

  const downloadCsv = () => {
    if (!records.length) {
      alert("No records to export");
      return;
    }

    const header = [
      "ID",
      "Employee Name",
      "Email",
      "Mode",
      "Timestamp",
      "Lat",
      "Lng",
      "DeviceId",
      "PhotoUrl",
    ];


    const rows = records.map((r) => [
      r.id,
      r.user?.name || "",
      r.user?.email || "",
      r.mode || "",
      new Date(r.timestamp).toISOString(),
      r.lat ?? "",
      r.lng ?? "",
      r.deviceId ?? "",
      r.photoUrl ?? "",
    ]);


    const csvContent =
      [header, ...rows].map((row) => row.join(",")).join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "attendance-report.csv";
    a.click();

    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ padding: "16px" }}>
      <h2>Attendance Report</h2>

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

        <button onClick={fetchAttendance} disabled={loading}>
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
              <th style={thStyle}>ID</th>
              <th style={thStyle}>Employee</th>
              <th style={thStyle}>Mode</th>
              <th style={thStyle}>Timestamp</th>
              <th style={thStyle}>Lat</th>
              <th style={thStyle}>Lng</th>
              <th style={thStyle}>Device</th>
            </tr>
          </thead>
          <tbody>
              {records.map((r) => (
                <tr key={r.id}>
                  <td style={tdStyle}>{r.id}</td>
                  <td style={tdStyle}>
                    {r.user?.name}
                    <br />
                    <small>{r.user?.email}</small>
                  </td>
                  <td style={tdStyle}>
                    {r.mode || "-"}
                  </td>
                  <td style={tdStyle}>
                    {new Date(r.timestamp).toLocaleString()}
                  </td>
                  <td style={tdStyle}>{r.lat}</td>
                  <td style={tdStyle}>{r.lng}</td>
                  <td style={tdStyle}>{r.deviceId}</td>
                </tr>
              ))}
              {!records.length && (
                <tr>
                  <td style={tdStyle} colSpan={7}>
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
