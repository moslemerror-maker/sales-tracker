// admin-web/src/App.jsx

import React, { useState, useEffect } from "react";
import LiveMap from "./LiveMap";
import AttendanceReport from "./AttendanceReport";
import VisitReport from "./VisitReport";
import DealersPage from "./DealersPage";
import AdminLogin from "./AdminLogin";
import ClaimsPage from "./ClaimsPage";

function App() {
  const [view, setView] = useState("map"); // 'map' | 'attendance' | 'visits' | 'dealers'
  const [token, setToken] = useState(null);
  const [adminUser, setAdminUser] = useState(null);

  // Load saved token on refresh
  useEffect(() => {
    const stored = localStorage.getItem("admin-auth");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setToken(parsed.token);
        setAdminUser(parsed.user);
      } catch {
        // ignore
      }
    }
  }, []);

  const handleLogin = (jwt, user) => {
    setToken(jwt);
    setAdminUser(user);
    localStorage.setItem("admin-auth", JSON.stringify({ token: jwt, user }));
  };

  const handleLogout = () => {
    setToken(null);
    setAdminUser(null);
    localStorage.removeItem("admin-auth");
  };

  // If not logged in or not admin, show login
  if (!token || !adminUser || adminUser.role !== "admin") {
    return <AdminLogin onLogin={handleLogin} />;
  }

  return (
    <div
      style={{
        height: "100vh",
        width: "100vw",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <header
        style={{
          padding: "8px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "1px solid #ddd",
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: "18px" }}>Sales Tracker Admin</h1>
          <div style={{ fontSize: "12px", color: "#555" }}>
            Logged in as {adminUser.name} ({adminUser.email})
          </div>
        </div>

        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <button
            onClick={() => setView("map")}
            style={buttonStyle(view === "map")}
          >
            Live Map
          </button>
          <button
            onClick={() => setView("attendance")}
            style={buttonStyle(view === "attendance")}
          >
            Attendance Report
          </button>
          <button
            onClick={() => setView("visits")}
            style={buttonStyle(view === "visits")}
          >
            Visit Report
          </button>
          <button
            onClick={() => setView("dealers")}
            style={buttonStyle(view === "dealers")}
          >
            Dealers
          </button>
          <button
            onClick={() => setView("claims")}
            style={buttonStyle(view === "claims")}
          >
            Claims
          </button>

          <button
            onClick={handleLogout}
            style={{
              padding: "6px 12px",
              backgroundColor: "#dc3545",
              color: "#fff",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            Logout
          </button>
        </div>
      </header>

      <main style={{ flex: 1 }}>
        {view === "map" && <LiveMap token={token} />}
        {view === "attendance" && <AttendanceReport token={token} />}
        {view === "visits" && <VisitReport token={token} />}
        {view === "dealers" && <DealersPage token={token} />}
        {view === "claims" && <ClaimsPage token={token} />}
      </main>
    </div>
  );
}

const buttonStyle = (active) => ({
  padding: "6px 12px",
  backgroundColor: active ? "#007bff" : "#eee",
  color: active ? "#fff" : "#000",
  border: "none",
  borderRadius: "4px",
  cursor: "pointer",
});

export default App;
