// mobile/screens/AttendanceScreen.js

import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  Button,
  StyleSheet,
  Alert,
  Image,
  ActivityIndicator,
} from "react-native";
import { Camera, CameraType } from "expo-camera";
import * as Location from "expo-location";
import { API_BASE_URL } from "../constants";

export default function AttendanceScreen({ route }) {
  const { token, user } = route.params;

  const [hasCameraPermission, setHasCameraPermission] = useState(null);
  const [hasLocationPermission, setHasLocationPermission] = useState(null);
  const [photoUri, setPhotoUri] = useState(null);
  const [coords, setCoords] = useState(null);
  const [marking, setMarking] = useState(false);

  const cameraRef = useRef(null);

  // Request permissions once when screen loads
  useEffect(() => {
    (async () => {
      const camStatus = await Camera.requestCameraPermissionsAsync();
      setHasCameraPermission(camStatus.status === "granted");

      const locStatus = await Location.requestForegroundPermissionsAsync();
      setHasLocationPermission(locStatus.status === "granted");
    })();
  }, []);

  const captureAndMarkAttendance = async () => {
    try {
      if (!hasCameraPermission || !hasLocationPermission) {
        Alert.alert(
          "Permissions needed",
          "Camera and Location permissions are required."
        );
        return;
      }

      if (!cameraRef.current) {
        Alert.alert("Camera not ready yet");
        return;
      }

      setMarking(true);

      // 1) Take photo
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.5,
      });
      setPhotoUri(photo.uri);

      // 2) Get location
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      setCoords(location.coords);

      // 3) Send attendance to backend (without actual image upload yet)
      const response = await fetch(`${API_BASE_URL}/attendance/mark`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          timestamp: new Date().toISOString(),
          lat: location.coords.latitude,
          lng: location.coords.longitude,
          deviceId: "expo-phone",
          photoUrl: "photo-captured-locally", // placeholder for now
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.log("Attendance error:", data);
        Alert.alert("Error", data.error || "Failed to mark attendance");
        return;
      }

      Alert.alert("Success", "Attendance marked successfully!");
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Something went wrong while marking attendance.");
    } finally {
      setMarking(false);
    }
  };

  if (hasCameraPermission === null || hasLocationPermission === null) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
        <Text>Requesting permissions...</Text>
      </View>
    );
  }

  if (!hasCameraPermission || !hasLocationPermission) {
    return (
      <View style={styles.center}>
        <Text style={{ textAlign: "center", padding: 16 }}>
          Camera and Location permissions are required to use this app. Please
          enable them in your device settings.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Welcome, {user?.name}</Text>

      <View style={styles.cameraWrapper}>
        <Camera
          style={styles.camera}
          type={CameraType.front}
          ref={cameraRef}
        />
      </View>

      <View style={styles.infoContainer}>
        <Button
          title={marking ? "Marking..." : "Mark Attendance"}
          onPress={captureAndMarkAttendance}
          disabled={marking}
        />

        {photoUri && (
          <Image source={{ uri: photoUri }} style={styles.previewImage} />
        )}

        {coords && (
          <Text style={styles.coordsText}>
            Last location: {coords.latitude.toFixed(5)},{" "}
            {coords.longitude.toFixed(5)}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f4f7fb" },
  header: {
    fontSize: 18,
    fontWeight: "600",
    padding: 12,
    textAlign: "center",
  },
  cameraWrapper: {
    flex: 3,
    marginHorizontal: 12,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#000",
  },
  camera: {
    flex: 1,
  },
  infoContainer: {
    flex: 2,
    padding: 16,
  },
  previewImage: {
    width: 100,
    height: 100,
    marginTop: 12,
    borderRadius: 8,
    alignSelf: "center",
  },
  coordsText: {
    marginTop: 12,
    textAlign: "center",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
});
