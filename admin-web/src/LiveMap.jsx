// admin-web/src/LiveMap.jsx

import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import { API_BASE_URL } from "./constants";

const defaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

export default function LiveMap({ token }) {
  const [locations, setLocations] = useState([]);

  const fetchLocations = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/location/all`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        setLocations(data);
      } else {
        console.error("Unexpected location response:", data);
        setLocations([]);
      }
    } catch (err) {
      console.error("Error fetching locations:", err);
      setLocations([]);
    }
  };

  useEffect(() => {
    if (!token) return;
    fetchLocations();
    const interval = setInterval(fetchLocations, 15000);
    return () => clearInterval(interval);
  }, [token]);

  const center = [20.5937, 78.9629];

  return (
    <div style={{ height: "100%", width: "100%" }}>
      <MapContainer center={center} zoom={5} style={{ height: "100%", width: "100%" }}>
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {locations.map((loc) => (
          <Marker
            key={loc.userId}
            position={[loc.lat, loc.lng]}
            icon={defaultIcon}
          >
            <Popup>
              <div>
                <strong>{loc.user?.name || "User " + loc.userId}</strong>
                <br />
                {loc.user?.email}
                <br />
                Updated: {new Date(loc.updatedAt).toLocaleString()}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
