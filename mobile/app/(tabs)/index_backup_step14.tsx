// mobile/app/(tabs)/index.tsx
// Login + Attendance + Live Tracking + Dealer Visits

import React, { useRef, useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Button,
  Image,
  Alert,
  ActivityIndicator,
  TextInput,
  ScrollView,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as Location from "expo-location";
import { Picker } from "@react-native-picker/picker";

// ⚠️ Replace with your PC LAN IP
const API_BASE_URL = "http://192.168.1.100:4000"; // change this to your IP

export default function AttendanceScreen() {
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [locationPermission, requestLocationPermission] =
    Location.useForegroundPermissions();

  const [facing, setFacing] = useState<"front" | "back">("front");
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [coords, setCoords] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  const cameraRef = useRef<any>(null);

  // --- AUTH STATE ---
  const [email, setEmail] = useState("sales1@example.com"); // default for testing
  const [password, setPassword] = useState("mypassword");
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [authBusy, setAuthBusy] = useState(false);

  // --- DEALERS & VISITS STATE ---
  const [dealers, setDealers] = useState<any[]>([]);
  const [loadingDealers, setLoadingDealers] = useState(false);
  const [selectedDealerId, setSelectedDealerId] = useState<string>("");

  const [addingDealer, setAddingDealer] = useState(false);
  const [newDealerName, setNewDealerName] = useState("");
  const [newDealerType, setNewDealerType] = useState<"dealer" | "sub-dealer">(
    "dealer"
  );
  const [newDealerCity, setNewDealerCity] = useState("");

  const [visitBusy, setVisitBusy] = useState(false);
  const [activeVisit, setActiveVisit] = useState<any | null>(null);

  // Request permissions on mount
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

  // Live location ping every 30s while logged-in & permissions granted
  useEffect(() => {
    if (!locationPermission?.granted || !token) {
      return;
    }

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

  // ------------ HELPERS -------------
  const loadDealers = async () => {
    if (!token) return;
    try {
      setLoadingDealers(true);
      const res = await fetch(`${API_BASE_URL}/dealers`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (!res.ok) {
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

  // ------------- LOGIN -------------
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

      // load dealers after login
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
  };

  // ------------- CAMERA / ATTENDANCE -------------
  const handleFlip = () => {
    setFacing((prev) => (prev === "front" ? "back" : "front"));
  };

  const handleCapture = async () => {
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

      // 1) Take picture
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.5,
      });
      setPhotoUri(photo.uri);

      // 2) Get location
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      setCoords(loc.coords);

      // 3) Send attendance to backend
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
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        console.log("Attendance error:", data);
        Alert.alert("Error", data.error || "Failed to mark attendance");
        return;
      }

      Alert.alert("Attendance sent!", `Record id: ${data.id}`);
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Could not capture photo / location.");
    } finally {
      setBusy(false);
    }
  };

  // ------------- ADD DEALER -------------
  const handleAddDealer = async () => {
    if (!token) {
      Alert.alert("Please login first");
      return;
    }

    if (!newDealerName || !newDealerType) {
      Alert.alert("Error", "Please enter dealer name and type");
      return;
    }

    try {
      setAddingDealer(true);
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
      // reload dealers
      await loadDealers();
      setSelectedDealerId(String(data.id));
    } catch (err) {
      console.error("Add dealer error:", err);
      Alert.alert("Error", "Could not add dealer");
    } finally {
      setAddingDealer(false);
    }
  };

  // ------------- VISITS (CHECK-IN / OUT) -------------
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
      Alert.alert(
        "Visit started",
        `Checked in at ${data.dealer.name}`
      );
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
      Alert.alert(
        "Visit ended",
        `Checked out from ${data.dealer.name}`
      );
    } catch (err) {
      console.error("Check-out error:", err);
      Alert.alert("Error", "Could not end visit");
    } finally {
      setVisitBusy(false);
    }
  };

  // ------------- PERMISSIONS ERRORS -------------
  if (!cameraPermission || !locationPermission) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
        <Text>Checking permissions...</Text>
      </View>
    );
  }

  if (!cameraPermission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.message}>
          We need your permission to use the camera
        </Text>
        <Button title="Grant camera permission" onPress={requestCameraPermission} />
      </View>
    );
  }

  if (!locationPermission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.message}>
          We need your permission to use your location
        </Text>
        <Button
          title="Grant location permission"
          onPress={requestLocationPermission}
        />
      </View>
    );
  }

  // ------------- RENDER -------------
  // If not logged in -> show login form instead of camera
  if (!token) {
    return (
      <ScrollView contentContainerStyle={styles.center}>
        <Text style={styles.header}>Sales App Login</Text>

        <View style={{ width: "80%", maxWidth: 400 }}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          <View style={{ marginTop: 16 }}>
            <Button
              title={authBusy ? "Logging in..." : "Login"}
              onPress={handleLogin}
              disabled={authBusy}
            />
          </View>
        </View>
      </ScrollView>
    );
  }

  // Logged in -> show camera + attendance + visits
  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#f4f7fb" }}>
      <View style={styles.topBar}>
        <Text style={styles.header}>
          Hi, {user?.name || "Employee"} (ID: {user?.id})
        </Text>
        <Button title="Logout" onPress={handleLogout} />
      </View>

      {/* ATTENDANCE SECTION */}
      <Text style={styles.sectionTitle}>Attendance</Text>
      <View style={styles.cameraWrapper}>
        <CameraView ref={cameraRef} style={styles.camera} facing={facing} />
      </View>

      <View style={styles.buttonsRow}>
        <Button title="Flip Camera" onPress={handleFlip} />
        <View style={{ width: 12 }} />
        <Button
          title={busy ? "Capturing..." : "Capture & Send Attendance"}
          onPress={handleCapture}
          disabled={busy}
        />
      </View>

      {photoUri && (
        <Image source={{ uri: photoUri }} style={styles.previewImage} />
      )}

      {coords && (
        <Text style={styles.coordsText}>
          Last attendance GPS: {coords.latitude.toFixed(5)},{" "}
          {coords.longitude.toFixed(5)}
        </Text>
      )}

      {/* DEALER & VISITS SECTION */}
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>Dealer Visits</Text>

        <View
          style={{
            backgroundColor: "#fff",
            borderRadius: 12,
            padding: 12,
            marginBottom: 12,
          }}
        >
          <Text style={styles.label}>Select Dealer</Text>
          <View
            style={{
              borderWidth: 1,
              borderColor: "#ccc",
              borderRadius: 8,
              overflow: "hidden",
              marginBottom: 8,
            }}
          >
            <Picker
              selectedValue={selectedDealerId}
              onValueChange={(value) => setSelectedDealerId(String(value))}
            >
              <Picker.Item label="-- Select dealer --" value="" />
              {dealers.map((d) => (
                <Picker.Item
                  key={d.id}
                  label={`${d.name} (${d.city || d.type})`}
                  value={String(d.id)}
                />
              ))}
            </Picker>
          </View>

          <View style={{ flexDirection: "row", gap: 8 }}>
            <Button
              title={loadingDealers ? "Refreshing..." : "Refresh Dealers"}
              onPress={loadDealers}
              disabled={loadingDealers}
            />
          </View>
        </View>

        {/* Add Dealer */}
        <View
          style={{
            backgroundColor: "#fff",
            borderRadius: 12,
            padding: 12,
            marginBottom: 12,
          }}
        >
          <Text style={styles.label}>Add New Dealer / Sub-dealer</Text>

          <TextInput
            style={styles.input}
            placeholder="Dealer name"
            value={newDealerName}
            onChangeText={setNewDealerName}
          />

          <TextInput
            style={styles.input}
            placeholder="City (optional)"
            value={newDealerCity}
            onChangeText={setNewDealerCity}
          />

          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              marginBottom: 8,
            }}
          >
            <Button
              title={
                newDealerType === "dealer"
                  ? "Type: Dealer"
                  : "Type: Sub-dealer"
              }
              onPress={() =>
                setNewDealerType((prev) =>
                  prev === "dealer" ? "sub-dealer" : "dealer"
                )
              }
            />
          </View>

          <Button
            title={addingDealer ? "Adding..." : "Add Dealer"}
            onPress={handleAddDealer}
            disabled={addingDealer}
          />
        </View>

        {/* Visit controls */}
        <View
          style={{
            backgroundColor: "#fff",
            borderRadius: 12,
            padding: 12,
            marginBottom: 16,
          }}
        >
          {activeVisit ? (
            <>
              <Text style={{ marginBottom: 8 }}>
                Active visit at:{" "}
                <Text style={{ fontWeight: "600" }}>
                  {activeVisit.dealer?.name}
                </Text>
              </Text>
              <Text style={{ marginBottom: 8 }}>
                Check-in:{" "}
                {new Date(activeVisit.checkInAt).toLocaleString()}
              </Text>
              <Button
                title={visitBusy ? "Ending visit..." : "End Visit (Check-out)"}
                onPress={handleCheckOutVisit}
                disabled={visitBusy}
              />
            </>
          ) : (
            <>
              <Text style={{ marginBottom: 8 }}>
                No active visit. Select a dealer and start a visit.
              </Text>
              <Button
                title={visitBusy ? "Starting..." : "Start Visit (Check-in)"}
                onPress={handleCheckInVisit}
                disabled={visitBusy || !selectedDealerId}
              />
            </>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f4f7fb", paddingTop: 40 },
  topBar: {
    paddingHorizontal: 12,
    paddingTop: 40,
    paddingBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  header: {
    fontSize: 18,
    fontWeight: "600",
    padding: 4,
  },
  cameraWrapper: {
    height: 260,
    marginHorizontal: 12,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#000",
  },
  camera: {
    flex: 1,
  },
  buttonsRow: {
    flexDirection: "row",
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  previewImage: {
    width: 120,
    height: 120,
    borderRadius: 8,
    alignSelf: "center",
    marginTop: 8,
  },
  coordsText: {
    marginTop: 8,
    textAlign: "center",
    marginBottom: 8,
  },
  center: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#f4f7fb",
  },
  message: {
    textAlign: "center",
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  label: {
    fontSize: 14,
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 8,
    backgroundColor: "#fff",
  },
  sectionContainer: {
    paddingHorizontal: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    paddingHorizontal: 12,
    paddingTop: 16,
    paddingBottom: 8,
  },
});
