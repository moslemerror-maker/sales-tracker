// mobile/app/(tabs)/index.tsx
// Login + Attendance (Time In/Out) + Visits + PJP + TA/DA + Add Dealer
// Tabs at top, camera only shown when user chooses Time In/Out.

import React, { useRef, useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  Alert,
  ActivityIndicator,
  TextInput,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as Location from "expo-location";
import { Picker } from "@react-native-picker/picker";

// ⚠️ Replace this with your PC LAN IP
const API_BASE_URL = "http://192.168.1.100:4000"; // CHANGE THIS

type AttendanceMode = "IN" | "OUT";

export default function MainScreen() {
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [locationPermission, requestLocationPermission] =
    Location.useForegroundPermissions();

  const [facing, setFacing] = useState<"front" | "back">("front");
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [coords, setCoords] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  const cameraRef = useRef<any>(null);

  // AUTH
  const [email, setEmail] = useState("sales1@example.com");
  const [password, setPassword] = useState("mypassword");
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [authBusy, setAuthBusy] = useState(false);

  // TABS: attendance | visits | pjp | tada | addDealer
  const [activeTab, setActiveTab] = useState<
    "attendance" | "visits" | "pjp" | "tada" | "addDealer"
  >("attendance");

  // Attendance mode: null until user clicks Time In or Time Out
  const [attendanceMode, setAttendanceMode] = useState<AttendanceMode | null>(
    null
  );

  // Dealers & visits
  const [dealers, setDealers] = useState<any[]>([]);
  const [loadingDealers, setLoadingDealers] = useState(false);
  const [selectedDealerId, setSelectedDealerId] = useState<string>("");

  const [addingDealer, setAddingDealer] = useState(false);
  const [newDealerName, setNewDealerName] = useState("");
  const [newDealerType, setNewDealerType] = useState<"dealer" | "sub-dealer">(
    "dealer"
  );
  const [newDealerCity, setNewDealerCity] = useState("");
  const [newDealerContactName, setNewDealerContactName] = useState("");
  const [newDealerMobile, setNewDealerMobile] = useState("");

  const [visitBusy, setVisitBusy] = useState(false);
  const [activeVisit, setActiveVisit] = useState<any | null>(null);

  // Permissions on mount
  useEffect(() => {
    (async () => {
      if (!cameraPermission?.granted) {
        await requestCameraPermission();
      }
      if (!locationPermission?.granted) {
        await requestLocationPermission();
      }
    })();
  }, [cameraPermission, locationPermission]);

  // Live tracking every 30 seconds while logged in
  useEffect(() => {
    if (!locationPermission?.granted || !token) return;

    const intervalId = setInterval(async () => {
      try {
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        await fetch(`${API_BASE_URL}/location/live`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            lat: loc.coords.latitude,
            lng: loc.coords.longitude,
          }),
        });

        console.log(
          "Live location sent:",
          loc.coords.latitude,
          loc.coords.longitude
        );
      } catch (err) {
        console.log("Live location error:", err);
      }
    }, 30 * 1000);

    return () => clearInterval(intervalId);
  }, [locationPermission, token]);

  // ---- Helpers ----
  const loadDealers = async () => {
    if (!token) return;
    try {
      setLoadingDealers(true);
      const res = await fetch(`${API_BASE_URL}/dealers`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok || !Array.isArray(data)) {
        console.log("Dealers error:", data);
        Alert.alert("Error", data.error || "Failed to load dealers");
        return;
      }
      setDealers(data);
      if (data.length && !selectedDealerId) {
        setSelectedDealerId(String(data[0].id));
      }
    } catch (err) {
      console.error("Load dealers error:", err);
      Alert.alert("Error", "Could not load dealers");
    } finally {
      setLoadingDealers(false);
    }
  };

  // ---- Login ----
  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please enter email and password");
      return;
    }

    try {
      setAuthBusy(true);
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        console.log("Login error:", data);
        Alert.alert("Login failed", data.error || "Invalid credentials");
        return;
      }

      setToken(data.token);
      setUser(data.user);
      Alert.alert("Login successful", `Welcome ${data.user.name}`);

      await loadDealers();
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Could not connect to server");
    } finally {
      setAuthBusy(false);
    }
  };

  const handleLogout = () => {
    setToken(null);
    setUser(null);
    setPhotoUri(null);
    setCoords(null);
    setDealers([]);
    setSelectedDealerId("");
    setActiveVisit(null);
    setAttendanceMode(null);
  };

  // ---- Attendance ----
  const handleFlip = () => {
    setFacing((prev) => (prev === "front" ? "back" : "front"));
  };

  const handleCapture = async (mode: AttendanceMode) => {
    if (!token) {
      Alert.alert("Please login first");
      return;
    }

    if (!cameraRef.current) {
      Alert.alert("Camera not ready yet");
      return;
    }

    try {
      setBusy(true);

      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.5,
      });
      setPhotoUri(photo.uri);

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      setCoords(loc.coords);

      const res = await fetch(`${API_BASE_URL}/attendance/mark`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          timestamp: new Date().toISOString(),
          lat: loc.coords.latitude,
          lng: loc.coords.longitude,
          deviceId: "expo-phone",
          photoUrl: "captured-locally",
          // Extra flag for later reporting (backend ignores unknown fields, safe)
          mode,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        console.log("Attendance error:", data);
        Alert.alert("Error", data.error || "Failed to mark attendance");
        return;
      }

      Alert.alert(
        "Attendance sent!",
        mode === "IN" ? "Time In recorded." : "Time Out recorded."
      );
      // After success, hide camera and reset mode
      setAttendanceMode(null);
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Could not capture photo / location.");
    } finally {
      setBusy(false);
    }
  };

  // ---- Add Dealer ----
  const handleAddDealer = async () => {
    if (!token) {
      Alert.alert("Please login first");
      return;
    }
    if (!newDealerName) {
      Alert.alert("Error", "Please enter dealer name");
      return;
    }

    try {
      setAddingDealer(true);

      // We can tag location later in DB with lat/lng columns.
      let loc: Location.LocationObject | null = null;
      try {
        loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        console.log("Dealer tag location:", loc.coords);
      } catch (e) {
        console.log("Location for dealer failed, continuing without:", e);
      }

      const res = await fetch(`${API_BASE_URL}/dealers`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: newDealerName,
          type: newDealerType,
          city: newDealerCity || null,          
          contactName: newDealerContactName || null,
          contactMobile: newDealerMobile || null,
          lat: loc?.coords.latitude,
          lng: loc?.coords.longitude,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        console.log("Add dealer error:", data);
        Alert.alert("Error", data.error || "Failed to add dealer");
        return;
      }

      Alert.alert("Success", "Dealer added (pending approval).");
      setNewDealerName("");
      setNewDealerCity("");
      setNewDealerContactName("");
      setNewDealerMobile("");

      await loadDealers();
      setSelectedDealerId(String(data.id));
    } catch (err) {
      console.error("Add dealer error:", err);
      Alert.alert("Error", "Could not add dealer");
    } finally {
      setAddingDealer(false);
    }
  };

  // ---- Visits ----
  const handleCheckInVisit = async () => {
    if (!token) {
      Alert.alert("Please login first");
      return;
    }
    if (!selectedDealerId) {
      Alert.alert("Please select a dealer");
      return;
    }

    try {
      setVisitBusy(true);

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const res = await fetch(`${API_BASE_URL}/visits/check-in`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          dealerId: Number(selectedDealerId),
          lat: loc.coords.latitude,
          lng: loc.coords.longitude,
          notes: "Checked-in from mobile app",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        console.log("Check-in error:", data);
        Alert.alert("Error", data.error || "Failed to check in");
        return;
      }

      setActiveVisit(data);
      Alert.alert("Visit started", `Checked in at ${data.dealer.name}`);
    } catch (err) {
      console.error("Check-in error:", err);
      Alert.alert("Error", "Could not start visit");
    } finally {
      setVisitBusy(false);
    }
  };

  const handleCheckOutVisit = async () => {
    if (!token) {
      Alert.alert("Please login first");
      return;
    }
    if (!activeVisit) {
      Alert.alert("No active visit", "Start a visit first");
      return;
    }

    try {
      setVisitBusy(true);

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const res = await fetch(
        `${API_BASE_URL}/visits/${activeVisit.id}/check-out`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            lat: loc.coords.latitude,
            lng: loc.coords.longitude,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        console.log("Check-out error:", data);
        Alert.alert("Error", data.error || "Failed to check out");
        return;
      }

      setActiveVisit(null);
      Alert.alert("Visit ended", `Checked out from ${data.dealer.name}`);
    } catch (err) {
      console.error("Check-out error:", err);
      Alert.alert("Error", "Could not end visit");
    } finally {
      setVisitBusy(false);
    }
  };

  // ---- Permission waiting screens ----
  if (!cameraPermission || !locationPermission) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
        <Text style={styles.centerText}>Checking permissions...</Text>
      </View>
    );
  }

  if (!cameraPermission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.centerText}>
          We need your permission to use the camera.
        </Text>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={requestCameraPermission}
        >
          <Text style={styles.primaryButtonText}>Grant camera permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!locationPermission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.centerText}>
          We need your permission to use your location.
        </Text>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={requestLocationPermission}
        >
          <Text style={styles.primaryButtonText}>
            Grant location permission
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ---- LOGIN SCREEN ----
  if (!token) {
    return (
      <View style={styles.loginContainer}>
        <View style={styles.loginCard}>
          <Text style={styles.appTitle}>Sales Tracker</Text>
          <Text style={styles.appSubtitle}>
            Login to mark attendance and manage dealer visits
          </Text>

          <Text style={styles.fieldLabel}>Email</Text>
          <TextInput
            style={styles.input}
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />

          <Text style={styles.fieldLabel}>Password</Text>
          <TextInput
            style={styles.input}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          <TouchableOpacity
            style={[styles.primaryButton, { marginTop: 16 }]}
            onPress={handleLogin}
            disabled={authBusy}
          >
            <Text style={styles.primaryButtonText}>
              {authBusy ? "Logging in..." : "Login"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ---- MAIN SCREEN ----
  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={styles.headerContainer}>
        <View>
          <Text style={styles.headerTitle}>Hi, {user?.name}</Text>
          <Text style={styles.headerSubtitle}>Employee ID: {user?.id}</Text>
        </View>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        {renderTabButton("Attendance", "attendance", activeTab, setActiveTab)}
        {renderTabButton("Visits", "visits", activeTab, setActiveTab)}
        {renderTabButton("PJP", "pjp", activeTab, setActiveTab)}
        {renderTabButton("TA/DA", "tada", activeTab, setActiveTab)}
        {renderTabButton("Add Dealer", "addDealer", activeTab, setActiveTab)}
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: 24 }}
      >
        {/* Attendance tab */}
        {activeTab === "attendance" && (
          <View className="attendance-card" style={styles.card}>
            <Text style={styles.cardTitle}>Attendance</Text>
            <Text style={styles.cardSubtitle}>
              Tap Time In / Time Out, then capture selfie with GPS.
            </Text>

            {/* Time In / Time Out buttons */}
            <View style={styles.horizontalButtons}>
              <TouchableOpacity
                style={[
                  styles.secondaryButton,
                  attendanceMode === "IN" && styles.tabActive,
                  { flex: 1 },
                ]}
                onPress={() => setAttendanceMode("IN")}
              >
                <Text
                  style={[
                    styles.secondaryButtonText,
                    attendanceMode === "IN" && styles.tabActiveText,
                  ]}
                >
                  Time In
                </Text>
              </TouchableOpacity>
              <View style={{ width: 12 }} />
              <TouchableOpacity
                style={[
                  styles.secondaryButton,
                  attendanceMode === "OUT" && styles.tabActive,
                  { flex: 1 },
                ]}
                onPress={() => setAttendanceMode("OUT")}
              >
                <Text
                  style={[
                    styles.secondaryButtonText,
                    attendanceMode === "OUT" && styles.tabActiveText,
                  ]}
                >
                  Time Out
                </Text>
              </TouchableOpacity>
            </View>

            {/* Camera only when mode selected */}
            {attendanceMode && (
              <>
                <View style={[styles.cameraWrapper, { marginTop: 12 }]}>
                  <CameraView
                    ref={cameraRef}
                    style={styles.camera}
                    facing={facing}
                  />
                </View>

                <View style={styles.horizontalButtons}>
                  <TouchableOpacity
                    style={[styles.secondaryButton, { flex: 1 }]}
                    onPress={handleFlip}
                  >
                    <Text style={styles.secondaryButtonText}>Flip Camera</Text>
                  </TouchableOpacity>
                  <View style={{ width: 12 }} />
                  <TouchableOpacity
                    style={[styles.primaryButton, { flex: 1 }]}
                    onPress={() =>
                      attendanceMode && handleCapture(attendanceMode)
                    }
                    disabled={busy}
                  >
                    <Text style={styles.primaryButtonText}>
                      {busy
                        ? "Capturing..."
                        : attendanceMode === "IN"
                        ? "Capture & Mark Time In"
                        : "Capture & Mark Time Out"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            {photoUri && (
              <Image source={{ uri: photoUri }} style={styles.previewImage} />
            )}

            {coords && (
              <Text style={styles.smallInfoText}>
                Last GPS: {coords.latitude.toFixed(5)},{" "}
                {coords.longitude.toFixed(5)}
              </Text>
            )}
          </View>
        )}

        {/* Visits tab */}
        {activeTab === "visits" && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Dealer Visits</Text>
            <Text style={styles.cardSubtitle}>
              Select a dealer and start a visit when you arrive.
            </Text>

            <Text style={styles.fieldLabel}>Select Dealer</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={selectedDealerId}
                onValueChange={(value) => setSelectedDealerId(String(value))}
              >
                <Picker.Item label="-- Select dealer --" value="" />
                {dealers.map((d) => (
                  <Picker.Item
                    key={d.id}
                    label={`${d.name}${d.city ? " (" + d.city + ")" : ""}`}
                    value={String(d.id)}
                  />
                ))}
              </Picker>
            </View>

            <View style={styles.horizontalButtons}>
              <TouchableOpacity
                style={[styles.secondaryButton, { flex: 1 }]}
                onPress={loadDealers}
                disabled={loadingDealers}
              >
                <Text style={styles.secondaryButtonText}>
                  {loadingDealers ? "Refreshing..." : "Refresh List"}
                </Text>
              </TouchableOpacity>

              <View style={{ width: 12 }} />

              {activeVisit ? (
                <TouchableOpacity
                  style={[styles.dangerButton, { flex: 1 }]}
                  onPress={handleCheckOutVisit}
                  disabled={visitBusy}
                >
                  <Text style={styles.dangerButtonText}>
                    {visitBusy ? "Ending..." : "End Visit"}
                  </Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[
                    styles.primaryButton,
                    { flex: 1, opacity: selectedDealerId ? 1 : 0.6 },
                  ]}
                  onPress={handleCheckInVisit}
                  disabled={visitBusy || !selectedDealerId}
                >
                  <Text style={styles.primaryButtonText}>
                    {visitBusy ? "Starting..." : "Start Visit"}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {activeVisit && (
              <View style={styles.activeVisitBox}>
                <Text style={styles.activeVisitTitle}>
                  Active visit: {activeVisit.dealer?.name}
                </Text>
                <Text style={styles.smallInfoText}>
                  Check-in:{" "}
                  {new Date(activeVisit.checkInAt).toLocaleString()}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* PJP tab (coming later) */}
        {activeTab === "pjp" && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>PJP (Planned Journey Plan)</Text>
            <Text style={styles.cardSubtitle}>
              This section will show planned routes and schedules. We will
              design this in a separate step.
            </Text>
          </View>
        )}

        {/* TA/DA tab (coming later) */}
        {activeTab === "tada" && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>TA/DA Claim</Text>
            <Text style={styles.cardSubtitle}>
              Here you will be able to submit travel and daily allowance
              claims. We will build this in a later step.
            </Text>
          </View>
        )}

        {/* Add Dealer tab */}
        {activeTab === "addDealer" && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Add Dealer / Sub-dealer</Text>
            <Text style={styles.cardSubtitle}>
              Add new outlets from the field. Admin can verify and approve.
            </Text>

            <Text style={styles.fieldLabel}>Dealer Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., ABC Traders"
              value={newDealerName}
              onChangeText={setNewDealerName}
            />

            <Text style={styles.fieldLabel}>Concerned Person Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Contact person"
              value={newDealerContactName}
              onChangeText={setNewDealerContactName}
            />

            <Text style={styles.fieldLabel}>Mobile Number</Text>
            <TextInput
              style={styles.input}
              keyboardType="phone-pad"
              placeholder="10 digit mobile"
              value={newDealerMobile}
              onChangeText={setNewDealerMobile}
            />

            <Text style={styles.fieldLabel}>City (optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Chennai"
              value={newDealerCity}
              onChangeText={setNewDealerCity}
            />

            <View style={styles.horizontalButtons}>
              <TouchableOpacity
                style={[styles.secondaryButton, { flex: 1 }]}
                onPress={() =>
                  setNewDealerType((prev) =>
                    prev === "dealer" ? "sub-dealer" : "dealer"
                  )
                }
              >
                <Text style={styles.secondaryButtonText}>
                  Type: {newDealerType === "dealer" ? "Dealer" : "Sub-dealer"}
                </Text>
              </TouchableOpacity>

              <View style={{ width: 12 }} />

              <TouchableOpacity
                style={[styles.primaryButton, { flex: 1 }]}
                onPress={handleAddDealer}
                disabled={addingDealer}
              >
                <Text style={styles.primaryButtonText}>
                  {addingDealer ? "Adding..." : "Add Dealer"}
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.smallInfoText}>
              Location is fetched from your phone when adding dealer (we’ll
              store exact coordinates in DB in a later step).
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

// Tab button helper
function renderTabButton(
  label: string,
  value: "attendance" | "visits" | "pjp" | "tada" | "addDealer",
  activeTab: string,
  setActiveTab: (v: any) => void
) {
  const active = activeTab === value;
  return (
    <TouchableOpacity
      key={value}
      onPress={() => setActiveTab(value)}
      style={[styles.tabButton, active && styles.tabActive]}
    >
      <Text style={[styles.tabButtonText, active && styles.tabActiveText]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

// Styles
const styles = StyleSheet.create({
  // Login
  loginContainer: {
    flex: 1,
    backgroundColor: "#0f172a",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  loginCard: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: "#0b1120",
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#1f2937",
  },
  appTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#e5e7eb",
    marginBottom: 4,
  },
  appSubtitle: {
    fontSize: 13,
    color: "#9ca3af",
    marginBottom: 20,
  },

  // General
  screen: {
    flex: 1,
    backgroundColor: "#0f172a",
  },
  headerContainer: {
    paddingTop: 50,
    paddingHorizontal: 16,
    paddingBottom: 8,
    backgroundColor: "#0f172a",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  headerTitle: {
    color: "#e5e7eb",
    fontSize: 20,
    fontWeight: "700",
  },
  headerSubtitle: {
    color: "#9ca3af",
    fontSize: 12,
  },
  logoutButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#4b5563",
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  logoutButtonText: {
    color: "#e5e7eb",
    fontSize: 12,
    fontWeight: "500",
  },

  tabBar: {
    flexDirection: "row",
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: "#020617",
    justifyContent: "space-around",
  },
  tabButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: "#111827",
  },
  tabButtonText: {
    fontSize: 11,
    color: "#9ca3af",
  },
  tabActive: {
    backgroundColor: "#2563eb",
  },
  tabActiveText: {
    color: "#ffffff",
    fontWeight: "600",
  },

  scroll: {
    flex: 1,
    backgroundColor: "#f1f5f9",
  },

  card: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
    color: "#0f172a",
  },
  cardSubtitle: {
    fontSize: 12,
    color: "#6b7280",
    marginBottom: 10,
  },

  cameraWrapper: {
    height: 230,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "#000",
    marginBottom: 12,
  },
  camera: { flex: 1 },

  primaryButton: {
    backgroundColor: "#2563eb",
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: {
    color: "#ffffff",
    fontWeight: "600",
    fontSize: 14,
  },
  secondaryButton: {
    backgroundColor: "#e5e7eb",
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButtonText: {
    color: "#111827",
    fontWeight: "500",
    fontSize: 13,
  },
  dangerButton: {
    backgroundColor: "#dc2626",
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  dangerButtonText: {
    color: "#ffffff",
    fontWeight: "600",
    fontSize: 14,
  },
  horizontalButtons: {
    flexDirection: "row",
    marginTop: 8,
    marginBottom: 4,
  },

  fieldLabel: {
    fontSize: 13,
    color: "#4b5563",
    marginBottom: 4,
    marginTop: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: "#f9fafb",
    fontSize: 14,
    marginBottom: 4,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 999,
    overflow: "hidden",
    marginBottom: 8,
    backgroundColor: "#f9fafb",
  },

  previewImage: {
    width: 90,
    height: 90,
    borderRadius: 12,
    alignSelf: "center",
    marginTop: 8,
  },
  smallInfoText: {
    fontSize: 11,
    color: "#6b7280",
    marginTop: 4,
  },
  activeVisitBox: {
    marginTop: 8,
    padding: 10,
    borderRadius: 12,
    backgroundColor: "#eff6ff",
  },
  activeVisitTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1d4ed8",
    marginBottom: 2,
  },

  center: {
    flex: 1,
    backgroundColor: "#0f172a",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  centerText: {
    color: "#e5e7eb",
    textAlign: "center",
    marginTop: 8,
  },
});
