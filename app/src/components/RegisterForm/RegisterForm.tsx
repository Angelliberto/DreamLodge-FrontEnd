import React, { useState } from "react";
import { View, Text, TextInput, Button, StyleSheet } from "react-native";

export interface RegisterFormProps {
  onSubmit: (
    email: string,
    password: string,
    name: string,
    birthdate: string,
    confirmPassword: string
  ) => void;
}

const RegisterForm: React.FC<RegisterFormProps> = ({ onSubmit }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [birthdate, setBirthdate] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
    name?: string;
    birthdate?: string;
    confirmPassword?: string;
  }>({});

  // ---------- VALIDATION FUNCTIONS ----------
  const validateEmail = (value: string) => {
    if (!value) return "Email is required";
    const regex = /\S+@\S+\.\S+/;
    if (!regex.test(value)) return "Enter a valid email";
    return "";
  };

  const validatePassword = (value: string) => {
    if (!value) return "Password is required";
    if (value.length < 6) return "Password must be at least 6 characters";
    return "";
  };

  const validateConfirmPassword = (value: string) => {
    if (!value) return "Please confirm your password";
    if (value !== password) return "Passwords do not match";
    return "";
  };

  const validateName = (value: string) => {
    if (!value) return "Name is required";
    if (value.length < 2) return "Name must be at least 2 characters";
    return "";
  };

  const validateBirthdate = (value: string) => {
    if (!value) return "Birthdate is required";
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(value)) return "Use format YYYY-MM-DD";
    const date = new Date(value);
    if (isNaN(date.getTime())) return "Invalid date";
    return "";
  };

  // ---------- REAL-TIME HANDLERS ----------
  const handleEmailChange = (value: string) => {
    setEmail(value);
    setErrors((prev) => ({ ...prev, email: validateEmail(value) }));
  };

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    setErrors((prev) => ({ ...prev, password: validatePassword(value) }));
    // also re-check confirm password if filled
    if (confirmPassword) {
      setErrors((prev) => ({
        ...prev,
        confirmPassword: validateConfirmPassword(confirmPassword),
      }));
    }
  };

  const handleConfirmPasswordChange = (value: string) => {
    setConfirmPassword(value);
    setErrors((prev) => ({ ...prev, confirmPassword: validateConfirmPassword(value) }));
  };

  const handleNameChange = (value: string) => {
    setName(value);
    setErrors((prev) => ({ ...prev, name: validateName(value) }));
  };

  const handleBirthdateChange = (value: string) => {
    setBirthdate(value);
    setErrors((prev) => ({ ...prev, birthdate: validateBirthdate(value) }));
  };

  // ---------- SUBMIT ----------
  const handleSubmit = () => {
    const newErrors = {
      email: validateEmail(email),
      password: validatePassword(password),
      confirmPassword: validateConfirmPassword(confirmPassword),
      name: validateName(name),
      birthdate: validateBirthdate(birthdate),
    };

    setErrors(newErrors);

    const hasError = Object.values(newErrors).some((err) => err !== "");
    if (hasError) return;

    onSubmit(email, password, name, birthdate, confirmPassword);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Register</Text>

      <TextInput
        style={[styles.input, errors.name ? styles.inputError : null]}
        placeholder="Name"
        value={name}
        onChangeText={handleNameChange}
        autoCapitalize="words"
        autoCorrect={false}
      />
      {errors.name ? <Text style={styles.error}>{errors.name}</Text> : null}

      <TextInput
        style={[styles.input, errors.birthdate ? styles.inputError : null]}
        placeholder="Birthdate (YYYY-MM-DD)"
        value={birthdate}
        onChangeText={handleBirthdateChange}
        autoCapitalize="none"
        autoCorrect={false}
      />
      {errors.birthdate ? <Text style={styles.error}>{errors.birthdate}</Text> : null}

      <TextInput
        style={[styles.input, errors.email ? styles.inputError : null]}
        placeholder="Email"
        value={email}
        onChangeText={handleEmailChange}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        textContentType="emailAddress"
      />
      {errors.email ? <Text style={styles.error}>{errors.email}</Text> : null}

      <TextInput
        style={[styles.input, errors.password ? styles.inputError : null]}
        placeholder="Password"
        value={password}
        onChangeText={handlePasswordChange}
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        textContentType="password"
      />
      {errors.password ? <Text style={styles.error}>{errors.password}</Text> : null}

      <TextInput
        style={[styles.input, errors.confirmPassword ? styles.inputError : null]}
        placeholder="Confirm Password"
        value={confirmPassword}
        onChangeText={handleConfirmPasswordChange}
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        textContentType="password"
      />
      {errors.confirmPassword ? (
        <Text style={styles.error}>{errors.confirmPassword}</Text>
      ) : null}

      <Button title="Register" onPress={handleSubmit} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "90%",
    maxWidth: 400,
    alignSelf: "center",
    padding: 24,
    backgroundColor: "#fff",
    borderRadius: 12,
    elevation: 2,
    marginTop: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 16,
    textAlign: "center",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    fontSize: 16,
  },
  inputError: {
    borderColor: "red",
  },
  error: {
    color: "red",
    fontSize: 14,
    marginBottom: 8,
  },
});

export default RegisterForm;
