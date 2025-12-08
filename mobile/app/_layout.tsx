// mobile/app/_layout.tsx

import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* Main tabbed app */}
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />

      {/* Optional modal screen */}
      <Stack.Screen
        name="modal"
        options={{
          presentation: "modal",
          headerShown: false
        }}
      />
    </Stack>
  );
}
