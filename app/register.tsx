import React from "react"; 
import { Alert, StyleSheet, View } from "react-native";
import RegisterForm from "./src/components/RegisterForm/RegisterForm";
import { register } from "./src/services/api";
import { RegisterRequest, AuthResponse, ApiError, ApiErrorResponse } from "./src/types";
import * as SecureStore from "expo-secure-store";

const RegisterScreen: React.FC = () => {
  const handleRegister = async (
    email: string,
    password: string,
    name: string,
    birthdate: string,
    confirmPassword: string
  ) => {
    const registerRequest: RegisterRequest = { email, password, name, birthdate, confirmPassword };

    try {
      // Use AuthResponse here
      const response: AuthResponse = await register(registerRequest);

      Alert.alert("Registration Success", `Welcome, ${response.user.name}!`);
      await SecureStore.setItemAsync("userToken", response.token);
      console.log("Registered user:", response.user);
      console.log("JWT token:", response.token);
    } catch (error: any) {
      const apiError: ApiErrorResponse | undefined = error.response?.data;

      if (apiError?.errors && Array.isArray(apiError.errors)) {
        const messages = apiError.errors
          .map((e: ApiError) => `${e.path ?? "General"}: ${e.msg}`)
          .join("\n");
        Alert.alert("Registration Errors", messages);
      } else {
        Alert.alert("Registration Error", error.message || "Something went wrong");
      }

      console.error("Registration error:", error.response?.data || error.message);
    }
  };

  return (
    <View style={styles.screen}>
      <RegisterForm onSubmit={handleRegister} />
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {                                                                
    flex: 1,
    justifyContent: "center",
    backgroundColor: "#f3f4f6",
    padding: 16,
  },
});

export default RegisterScreen;
