import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator, Button } from "react-native";
import * as SecureStore from "expo-secure-store";
import { AuthResponse, User } from "../../types/index"; // import your types
import { useRouter } from "expo-router";

const UserProfile: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const loadUser = async () => {
      try {
        // Get JWT token
        const token = await SecureStore.getItemAsync("userToken");
        if (!token) {
          router.replace("/login"); // if not logged in, redirect to login
          return;
        }

        // Optionally, fetch latest user info from backend
        // For demo, assume user info is stored locally in SecureStore
        const storedUserJson = await SecureStore.getItemAsync("userProfile");
        if (storedUserJson) {
          setUser(JSON.parse(storedUserJson));
        }

      } catch (err) {
        console.error("Error loading user:", err);
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, []);

  const handleLogout = async () => {
    await SecureStore.deleteItemAsync("userToken");
    await SecureStore.deleteItemAsync("userProfile");
    router.replace("/login");
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.center}>
        <Text>No user data found.</Text>
        <Button title="Go to Login" onPress={() => router.replace("/login")} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome, {user.name}!</Text>
      <Text>Email: {user.email}</Text>
      <Text>Birthdate: {new Date(user.birthdate).toLocaleDateString()}</Text>
      <Text>Two-Factor Auth Enabled: {user.two_fa_enabled ? "Yes" : "No"}</Text>

      <Button title="Logout" onPress={handleLogout} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
    backgroundColor: "#f3f4f6",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 16,
  },
});

export default UserProfile;
