import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Link } from "expo-router";
import GoogleSignInButton from "./googleSignIn";

const HomeScreen: React.FC = () => (
  <View style={styles.container}>
    <Text style={styles.title}>Welcome to Dream Lodge</Text>
    <Text style={styles.subtitle}>Your emotional art journey starts here.</Text>
    <Text style={styles.subtitle}>Welcome! Please log in or register.</Text>
    <Link href="./login">
      <Text style={styles.link}>Login</Text>
    </Link>
    <Link href="./register">
      <Text style={styles.link}>Register</Text>
    </Link>
    <GoogleSignInButton></GoogleSignInButton>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f3f4f6",
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 18,
    color: "#555",
    marginBottom: 12,
  },
  link: {
    fontSize: 18,
    color: "#007AFF",
    marginTop: 8,
    textDecorationLine: "underline",
  },
});

export default HomeScreen;