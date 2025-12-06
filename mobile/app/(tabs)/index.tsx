// mobile/app/(tabs)/index.tsx
// Login + Attendance (Time In/Out) + Visits + PJP + TA/DA + Add Dealer

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

// ⚠️ Replace with your PC LAN IP
const API_BASE_URL = "http://172.20.10.2:4000"; // CHANGE THIS

type AttendanceMode = "IN" | "OUT";

// date helpers
const formatYMD = (d: Date) => d.toISOString().slice(0, 10);
const formatNiceDate = (d: Date) =>
  d.toLocaleDateString(undefined, {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });

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

  // PJP state
  const [pjpDate, setPjpDate] = useState<Date>(new Date());
  const [pjpItems, setPjpItems] = useState<
    { dealerId: string; dealerName: string; city: string; sequence: number }[]
  >([]);
  const [pjpSelectedDealerId, setPjpSelectedDealerId] = useState<string>("");
  const [pjpLoading, setPjpLoading] = useState(false);
  const [pjpSaving, setPjpSaving] = useState(false);

    // TA/DA claims
  const [claimDate, setClaimDate] = useState<Date>(new Date());
  const [claimAmount, setClaimAmount] = useState("");
  const [claimType, setClaimType] = useState<"Travel" | "DA" | "Other">(
    "Travel"
  );
  const [claimDesc, setClaimDesc] = useState("");
  const [claimDistance, setClaimDistance] = useState("");
  const [claimSaving, setClaimSaving] = useState(false);
  const [claims, setClaims] = useState<any[]>([]);
  const [claimsLoading, setClaimsLoading] = useState(false);


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
    const loadMyClaims = async () => {
    if (!token) return;
    try {
      setClaimsLoading(true);

      const today = new Date();
      const from = new Date(today);
      from.setDate(today.getDate() - 30); // last 30 days

      const fromYMD = formatYMD(from);
      const toYMD = formatYMD(today);

      const res = await fetch(
        `${API_BASE_URL}/claims/my?from=${fromYMD}&to=${toYMD}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
    const handleSubmitClaim = async () => {
    if (!token) {
      Alert.alert("Please login first");
      return;
    }

    if (!claimAmount) {
      Alert.alert("Missing amount", "Please enter claim amount.");
      return;
    }

    const amountNum = Number(claimAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      Alert.alert("Invalid amount", "Amount must be a positive number.");
      return;
    }

    try {
      setClaimSaving(true);

      const body: any = {
        date: formatYMD(claimDate),
        amount: amountNum,
        type: claimType,
        description: claimDesc || null,
      };

      if (claimDistance) {
        const distNum = Number(claimDistance);
        if (!isNaN(distNum) && distNum >= 0) {
          body.distanceKm = distNum;
        }
      }

      const res = await fetch(`${API_BASE_URL}/claims`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        console.log("Submit claim error:", data);
        Alert.alert("Error", data.error || "Failed to submit claim");
        return;
      }

      Alert.alert("Claim submitted", "Your TA/DA claim has been recorded.");

      // Reset form
      setClaimAmount("");
      setClaimDesc("");
      setClaimDistance("");
      setClaimType("Travel");

      // Refresh list
      await loadMyClaims();
    } catch (err) {
      console.error("Submit claim error:", err);
      Alert.alert("Error", "Could not submit claim");
    } finally {
      setClaimSaving(false);
    }
  };

      const data = await res.json();

      if (!res.ok) {
        console.log("Load claims error:", data);
        Alert.alert("Error", data.error || "Failed to load claims");
        return;
      }

      if (Array.isArray(data)) {
        setClaims(data);
      } else {
        setClaims([]);
      }
    } catch (err) {
      console.error("Load claims error:", err);
      Alert.alert("Error", "Could not load claims");
    } finally {
      setClaimsLoading(false);
    }
  };

  
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
      if (data.length && !pjpSelectedDealerId) {
        setPjpSelectedDealerId(String(data[0].id));
      }
    } catch (err) {
      console.error("Load dealers error:", err);
      Alert.alert("Error", "Could not load dealers");
    } finally {
      setLoadingDealers(false);
    }
  };

  const loadPjpForDate = async (date: Date) => {
    if (!token) return;
    try {
      setPjpLoading(true);
      const ymd = formatYMD(date);
      const res = await fetch(
        `${API_BASE_URL}/pjp/my?from=${ymd}&to=${ymd}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const data = await res.json();
      if (!res.ok) {
        console.log("PJP load error:", data);
        Alert.alert("Error", data.error || "Failed to load PJP");
        return;
      }
      if (Array.isArray(data) && data.length > 0) {
        const plan = data[0];
        const items =
          plan.items?.map((it: any) => ({
            dealerId: String(it.dealerId),
            dealerName: it.dealer?.name || "",
            city: it.dealer?.city || "",
            sequence: it.sequence,
          })) || [];
        items.sort((a: any, b: any) => a.sequence - b.sequence);
        setPjpItems(items);
      } else {
        setPjpItems([]);
      }
    } catch (err) {
      console.error("PJP load error:", err);
      Alert.alert("Error", "Could not load PJP");
    } finally {
      setPjpLoading(false);
    }
  };

  // Auto-load PJP whenever user opens PJP tab or changes date
  useEffect(() => {
    if (token && activeTab === "pjp") {
      loadPjpForDate(pjpDate);
    }
  }, [token, activeTab, pjpDate]);
    useEffect(() => {
    if (token && activeTab === "tada") {
      loadMyClaims();
    }
  }, [token, activeTab]);
    useEffect(() => {
    if (token && activeTab === "tada") {
      loadMyClaims();
    }
  }, [token, activeTab]);



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
    setPjpItems([]);
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
          lat: loc?.coords.latitude ?? null,
          lng: loc?.coords.longitude ?? null,
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
      setPjpSelectedDealerId(String(data.id));
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

  // ---- PJP handlers ----
  const changePjpDate = (days: number) => {
    setPjpDate((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() + days);
      return d;
    });
  };
  const changeClaimDate = (days: number) => {
    setClaimDate((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() + days);
      return d;
    });
  };


  const handleSubmitClaim = async () => {
    if (!token) {
      Alert.alert("Please login first");
      return;
    }

    if (!claimAmount) {
      Alert.alert("Missing amount", "Please enter claim amount.");
      return;
    }

    const amountNum = Number(claimAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      Alert.alert("Invalid amount", "Amount must be a positive number.");
      return;
    }

    try {
      setClaimSaving(true);

      const body: any = {
        date: formatYMD(claimDate),
        amount: amountNum,
        type: claimType,
        description: claimDesc || null,
      };

      if (claimDistance) {
        const distNum = Number(claimDistance);
        if (!isNaN(distNum) && distNum >= 0) {
          body.distanceKm = distNum;
        }
      }

      const res = await fetch(`${API_BASE_URL}/claims`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        console.log("Submit claim error:", data);
        Alert.alert("Error", data.error || "Failed to submit claim");
        return;
      }

      Alert.alert("Claim submitted", "Your TA/DA claim has been recorded.");

      // Reset form
      setClaimAmount("");
      setClaimDesc("");
      setClaimDistance("");
      setClaimType("Travel");

      // Refresh list
      await loadMyClaims();
    } catch (err) {
      console.error("Submit claim error:", err);
      Alert.alert("Error", "Could not submit claim");
    } finally {
      setClaimSaving(false);
    }
  };


  const handlePjpAddItem = () => {
    if (!pjpSelectedDealerId) {
      Alert.alert("Select dealer", "Please select a dealer to add.");
      return;
    }

    const dealer = dealers.find((d) => String(d.id) === pjpSelectedDealerId);
    if (!dealer) {
      Alert.alert("Dealer not found", "Please refresh dealers list.");
      return;
    }

    const already = pjpItems.find(
      (it) => it.dealerId === String(dealer.id)
    );
    if (already) {
      Alert.alert("Already in route", "This dealer is already in the PJP.");
      return;
    }

    const nextSeq =
      pjpItems.length > 0
        ? Math.max(...pjpItems.map((it) => it.sequence)) + 1
        : 1;

    setPjpItems((prev) => [
      ...prev,
      {
        dealerId: String(dealer.id),
        dealerName: dealer.name,
        city: dealer.city || "",
        sequence: nextSeq,
      },
    ]);
  };

  const handlePjpRemoveItem = (dealerId: string) => {
    setPjpItems((prev) => prev.filter((it) => it.dealerId !== dealerId));
  };

  const handlePjpSave = async () => {
    if (!token) {
      Alert.alert("Please login first");
      return;
    }
    if (pjpItems.length === 0) {
      Alert.alert("No dealers", "Add at least one dealer to the route.");
      return;
    }

    try {
      setPjpSaving(true);

      const itemsPayload = pjpItems
        .sort((a, b) => a.sequence - b.sequence)
        .map((it, index) => ({
          dealerId: Number(it.dealerId),
          sequence: index + 1,
        }));

      const res = await fetch(`${API_BASE_URL}/pjp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          date: formatYMD(pjpDate),
          notes: null,
          items: itemsPayload,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        console.log("PJP save error:", data);
        Alert.alert("Error", data.error || "Failed to save PJP");
        return;
      }

      Alert.alert("PJP saved", "Your plan has been saved for this date.");
      // reload to ensure sequences are clean
      await loadPjpForDate(pjpDate);
    } catch (err) {
      console.error("PJP save error:", err);
      Alert.alert("Error", "Could not save PJP");
    } finally {
      setPjpSaving(false);
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
          <View style={styles.card}>
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

        {/* PJP tab */}
        {activeTab === "pjp" && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>PJP (Planned Journey Plan)</Text>
            <Text style={styles.cardSubtitle}>
              Build your route for a day. Admin can view this plan.
            </Text>

            {/* Date selector */}
            <View style={styles.pjpDateRow}>
              <TouchableOpacity
                style={styles.pjpArrowButton}
                onPress={() => changePjpDate(-1)}
              >
                <Text style={styles.pjpArrowText}>◀</Text>
              </TouchableOpacity>

              <View style={{ flex: 1, alignItems: "center" }}>
                <Text style={styles.pjpDateLabel}>
                  {formatNiceDate(pjpDate)}
                </Text>
                <Text style={styles.smallInfoText}>
                  Plan date • {formatYMD(pjpDate)}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.pjpArrowButton}
                onPress={() => changePjpDate(1)}
              >
                <Text style={styles.pjpArrowText}>▶</Text>
              </TouchableOpacity>
            </View>

            {pjpLoading && (
              <Text style={styles.smallInfoText}>
                Loading PJP for this date...
              </Text>
            )}

            {/* Dealer picker for adding stops */}
            <Text style={[styles.fieldLabel, { marginTop: 8 }]}>
              Add dealer to route
            </Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={pjpSelectedDealerId}
                onValueChange={(value) =>
                  setPjpSelectedDealerId(String(value))
                }
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

            <TouchableOpacity
              style={[styles.secondaryButton, { marginBottom: 8 }]}
              onPress={handlePjpAddItem}
            >
              <Text style={styles.secondaryButtonText}>Add to route</Text>
            </TouchableOpacity>

            {/* PJP list */}
            {pjpItems.length === 0 ? (
              <Text style={styles.smallInfoText}>
                No dealers in route for this date. Add some above.
              </Text>
            ) : (
              <View style={{ marginTop: 8 }}>
                {pjpItems
                  .sort((a, b) => a.sequence - b.sequence)
                  .map((it) => (
                    <View key={it.dealerId} style={styles.pjpItemRow}>
                      <View style={styles.pjpSeqCircle}>
                        <Text style={styles.pjpSeqText}>{it.sequence}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.pjpItemTitle}>
                          {it.dealerName}
                        </Text>
                        {!!it.city && (
                          <Text style={styles.pjpItemSubtitle}>
                            {it.city}
                          </Text>
                        )}
                      </View>
                      <TouchableOpacity
                        onPress={() => handlePjpRemoveItem(it.dealerId)}
                      >
                        <Text style={styles.removeLink}>Remove</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
              </View>
            )}

            {/* Save PJP button */}
            <TouchableOpacity
              style={[styles.primaryButton, { marginTop: 12 }]}
              onPress={handlePjpSave}
              disabled={pjpSaving}
            >
              <Text style={styles.primaryButtonText}>
                {pjpSaving
                  ? "Saving..."
                  : `Save PJP for ${formatYMD(pjpDate)}`}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* TA/DA tab */}
        {activeTab === "tada" && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>TA/DA Claim</Text>
            <Text style={styles.cardSubtitle}>
              Submit your travel / daily allowance claims and see recent ones.
            </Text>

            {/* Date selector */}
            <View style={styles.pjpDateRow}>
              <TouchableOpacity
                style={styles.pjpArrowButton}
                onPress={() => changeClaimDate(-1)}
              >
                <Text style={styles.pjpArrowText}>◀</Text>
              </TouchableOpacity>

              <View style={{ flex: 1, alignItems: "center" }}>
                <Text style={styles.pjpDateLabel}>
                  {formatNiceDate(claimDate)}
                </Text>
                <Text style={styles.smallInfoText}>
                  Claim date • {formatYMD(claimDate)}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.pjpArrowButton}
                onPress={() => changeClaimDate(1)}
              >
                <Text style={styles.pjpArrowText}>▶</Text>
              </TouchableOpacity>
            </View>

            {/* Type selector */}
            <Text style={[styles.fieldLabel, { marginTop: 8 }]}>Type</Text>
            <View style={styles.horizontalButtons}>
              <TouchableOpacity
                style={[
                  styles.secondaryButton,
                  claimType === "Travel" && styles.tabActive,
                  { flex: 1 },
                ]}
                onPress={() => setClaimType("Travel")}
              >
                <Text
                  style={[
                    styles.secondaryButtonText,
                    claimType === "Travel" && styles.tabActiveText,
                  ]}
                >
                  Travel
                </Text>
              </TouchableOpacity>
              <View style={{ width: 8 }} />
              <TouchableOpacity
                style={[
                  styles.secondaryButton,
                  claimType === "DA" && styles.tabActive,
                  { flex: 1 },
                ]}
                onPress={() => setClaimType("DA")}
              >
                <Text
                  style={[
                    styles.secondaryButtonText,
                    claimType === "DA" && styles.tabActiveText,
                  ]}
                >
                  DA
                </Text>
              </TouchableOpacity>
              <View style={{ width: 8 }} />
              <TouchableOpacity
                style={[
                  styles.secondaryButton,
                  claimType === "Other" && styles.tabActive,
                  { flex: 1 },
                ]}
                onPress={() => setClaimType("Other")}
              >
                <Text
                  style={[
                    styles.secondaryButtonText,
                    claimType === "Other" && styles.tabActiveText,
                  ]}
                >
                  Other
                </Text>
              </TouchableOpacity>
            </View>

            {/* Amount & Distance */}
            <Text style={styles.fieldLabel}>Amount</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              placeholder="Amount in Rs"
              value={claimAmount}
              onChangeText={setClaimAmount}
            />

            <Text style={styles.fieldLabel}>Distance (km) – optional</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              placeholder="e.g., 120"
              value={claimDistance}
              onChangeText={setClaimDistance}
            />

            {/* Description */}
            <Text style={styles.fieldLabel}>Description / Remarks</Text>
            <TextInput
              style={[styles.input, { borderRadius: 14, height: 80 }]}
              placeholder="Short note about this claim"
              value={claimDesc}
              onChangeText={setClaimDesc}
              multiline
            />

            <TouchableOpacity
              style={[styles.primaryButton, { marginTop: 8 }]}
              onPress={handleSubmitClaim}
              disabled={claimSaving}
            >
              <Text style={styles.primaryButtonText}>
                {claimSaving ? "Submitting..." : "Submit Claim"}
              </Text>
            </TouchableOpacity>

            {/* Recent claims list */}
            <Text style={[styles.fieldLabel, { marginTop: 12 }]}>
              Recent claims (last 30 days)
            </Text>
            {claimsLoading && (
              <Text style={styles.smallInfoText}>Loading claims...</Text>
            )}

            {!claimsLoading && claims.length === 0 && (
              <Text style={styles.smallInfoText}>
                No claims found. Submitted claims will appear here.
              </Text>
            )}

            {!claimsLoading &&
              claims.length > 0 && (
                <View style={{ marginTop: 4 }}>
                  {claims.map((c) => (
                    <View key={c.id} style={styles.claimRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.claimTitle}>
                          {formatYMD(new Date(c.date))} • Rs {c.amount}
                        </Text>
                        <Text style={styles.claimSubtitle}>
                          {c.type || "TA/DA"}{" "}
                          {c.distanceKm ? `• ${c.distanceKm} km` : ""}{" "}
                          {c.description ? `• ${c.description}` : ""}
                        </Text>
                      </View>
                      <View style={styles.claimStatusPill}>
                        <Text style={styles.claimStatusText}>
                          {c.status}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}
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
              store exact coordinates in DB).
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

  // PJP styles
  pjpDateRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  pjpArrowButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#d1d5db",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f9fafb",
  },
  pjpArrowText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  pjpDateLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },
  pjpItemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
  },
  pjpSeqCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#e0e7ff",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  pjpSeqText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1d4ed8",
  },
  pjpItemTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#111827",
  },
  pjpItemSubtitle: {
    fontSize: 11,
    color: "#6b7280",
  },
  removeLink: {
    fontSize: 12,
    color: "#b91c1c",
    fontWeight: "500",
    paddingHorizontal: 6,
  },
    claimRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  claimTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#111827",
  },
  claimSubtitle: {
    fontSize: 11,
    color: "#6b7280",
    marginTop: 2,
  },
  claimStatusPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "#e5e7eb",
    marginLeft: 8,
  },
  claimStatusText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#111827",
  },

});
