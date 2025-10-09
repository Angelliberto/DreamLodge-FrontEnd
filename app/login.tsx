import React from "react";
import { View, StyleSheet, Alert } from "react-native";
import LoginForm from "./src/components/LoginForm/LoginForm"
import { login } from "./src/services/api";
import { AuthResponse ,LoginRequest,ApiError,ApiErrorResponse} from "./src/types";
import * as SecureStore from "expo-secure-store";



const LoginScreen: React.FC = () => {
  const handleLogin = async (email: string, password: string) => {
    const data: LoginRequest = { email, password };
    try {
      const response: AuthResponse = await login(data);
      Alert.alert("Login Success", `Welcome, ${response.user.name}!`);
        await SecureStore.setItemAsync("userToken", response.token);
      console.log("Logged in user:", response.user);
    } catch (error:any) {
      const apiError: ApiErrorResponse | undefined = error.response?.data
        if (apiError?.errors && Array.isArray(apiError.errors)) {
            const messages = apiError.errors.map((e: ApiError) => `${e.path ?? "General"}: ${e.msg}`).join("\n");
            window.alert(`Registration Errors:\n${messages}`);
            } else {
            window.alert(`Registration Error: ${error.message || "Something went wrong"}`);
            }
            console.error("Registration error:", error.response?.data || error.message);
      
      Alert.alert("Login Failed", "Invalid credentials or server error.");
    }
  };

  return (
    <View style={styles.screen}>
      <LoginForm onSubmit={handleLogin} />
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: "#f3f4f6",
  },
});

export default LoginScreen;