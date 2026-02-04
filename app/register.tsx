import { useRouter } from "expo-router";
import { Calendar, Lock, Mail, Sparkles, User } from "lucide-react-native";
import React from "react";
import { Alert, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BackgroundLayout } from "../src/components/ui/BackgroundLayout";
import { Button } from "../src/components/ui/button";
import { Input } from "../src/components/ui/input";
import { useAuth } from '../src/contexts/AuthContext';

export default function RegisterScreen() {
  const router = useRouter();
  const { register } = useAuth();
  const [form, setForm] = React.useState({
    name: "", email: "", password: "", confirmPassword: "", birthdate: ""
  });
  const [loading, setLoading] = React.useState(false);

  // Estados de validación en tiempo real
  const [errors, setErrors] = React.useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    birthdate: ""
  });
  const [touched, setTouched] = React.useState({
    name: false,
    email: false,
    password: false,
    confirmPassword: false,
    birthdate: false
  });

  const handleChange = (key: string, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }));
    
    // Validación en tiempo real cuando el campo ha sido tocado
    if (touched[key as keyof typeof touched]) {
      validateField(key, value);
    }
  };

  const validateName = (name: string): string => {
    if (!name.trim()) {
      return "El nombre es requerido";
    }
    if (name.trim().length < 2) {
      return "El nombre debe tener al menos 2 caracteres";
    }
    return "";
  };

  const validateEmail = (email: string): string => {
    if (!email.trim()) {
      return "El email es requerido";
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return "Por favor ingresa un email válido";
    }
    return "";
  };

  const validatePassword = (password: string): string => {
    if (!password.trim()) {
      return "La contraseña es requerida";
    }
    if (password.length < 8) {
      return "La contraseña debe tener al menos 8 caracteres";
    }
    if (password.length > 50) {
      return "La contraseña no puede tener más de 50 caracteres";
    }
    return "";
  };

  const validateConfirmPassword = (confirmPassword: string, password: string): string => {
    if (!confirmPassword.trim()) {
      return "Por favor confirma tu contraseña";
    }
    if (confirmPassword !== password) {
      return "Las contraseñas no coinciden";
    }
    return "";
  };

  const formatDateInput = (value: string): string => {
    // Remover caracteres no numéricos
    const numbers = value.replace(/\D/g, '');
    
    // Formatear como YYYY-MM-DD
    if (numbers.length <= 4) {
      return numbers;
    } else if (numbers.length <= 6) {
      return `${numbers.slice(0, 4)}-${numbers.slice(4)}`;
    } else {
      return `${numbers.slice(0, 4)}-${numbers.slice(4, 6)}-${numbers.slice(6, 8)}`;
    }
  };

  const validateBirthdate = (birthdate: string): string => {
    if (!birthdate.trim()) {
      return "La fecha de nacimiento es requerida";
    }
    
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(birthdate)) {
      return "Formato inválido. Usa YYYY-MM-DD";
    }
    
    const date = new Date(birthdate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Verificar que la fecha sea válida
    if (isNaN(date.getTime())) {
      return "Fecha inválida";
    }
    
    // Verificar que no sea en el futuro
    if (date >= today) {
      return "La fecha no puede ser en el futuro";
    }
    
    // Verificar que sea razonable (mayor a 1900)
    if (date.getFullYear() < 1900) {
      return "La fecha debe ser posterior a 1900";
    }
    
    // Verificar edad mínima (13 años)
    const age = today.getFullYear() - date.getFullYear();
    const monthDiff = today.getMonth() - date.getMonth();
    const dayDiff = today.getDate() - date.getDate();
    const actualAge = monthDiff < 0 || (monthDiff === 0 && dayDiff < 0) ? age - 1 : age;
    
    if (actualAge < 13) {
      return "Debes tener al menos 13 años";
    }
    
    return "";
  };

  const validateField = (key: string, value: string) => {
    let error = "";
    
    switch (key) {
      case "name":
        error = validateName(value);
        break;
      case "email":
        error = validateEmail(value);
        break;
      case "password":
        error = validatePassword(value);
        // Si cambia la contraseña, validar también confirmPassword
        if (touched.confirmPassword) {
          setErrors(prev => ({
            ...prev,
            confirmPassword: validateConfirmPassword(form.confirmPassword, value)
          }));
        }
        break;
      case "confirmPassword":
        error = validateConfirmPassword(value, form.password);
        break;
      case "birthdate":
        error = validateBirthdate(value);
        break;
    }
    
    setErrors(prev => ({ ...prev, [key]: error }));
  };

  const handleBlur = (key: string) => {
    setTouched(prev => ({ ...prev, [key]: true }));
    validateField(key, form[key as keyof typeof form]);
  };

  const handleBirthdateChange = (value: string) => {
    const formatted = formatDateInput(value);
    handleChange('birthdate', formatted);
  };

  const handleRegister = async () => {
    // Marcar todos los campos como tocados
    setTouched({
      name: true,
      email: true,
      password: true,
      confirmPassword: true,
      birthdate: true
    });
    
    // Validar todos los campos
    const nameError = validateName(form.name);
    const emailError = validateEmail(form.email);
    const passwordError = validatePassword(form.password);
    const confirmPasswordError = validateConfirmPassword(form.confirmPassword, form.password);
    const birthdateError = validateBirthdate(form.birthdate);
    
    setErrors({
      name: nameError,
      email: emailError,
      password: passwordError,
      confirmPassword: confirmPasswordError,
      birthdate: birthdateError
    });

    // Si hay errores, no continuar
    if (nameError || emailError || passwordError || confirmPasswordError || birthdateError) {
      return;
    }

    setLoading(true);
    try {
      await register({ 
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password.trim(),
        birthdate: form.birthdate.trim(),
        confirmPassword: form.confirmPassword.trim()
      });
      // Usuario nuevo siempre va al test - redirigir directamente sin Alert
      // No resetear loading aquí porque estamos navegando a otra pantalla
      router.replace('/test-selection');
    } catch (error: any) {
      // Manejo de errores con mensajes claros para el usuario
      let errorMessage = "Error en el registro. Por favor intenta nuevamente.";
      
      if (error.response?.status === 400 || error.response?.status === 422) {
        // Manejar errores de validación del backend
        const validationErrors = error.response?.data?.errors;
        if (Array.isArray(validationErrors) && validationErrors.length > 0) {
          const firstError = validationErrors[0];
          errorMessage = firstError.msg || firstError.message || "Datos inválidos. Por favor verifica tu información.";
        } else if (error.response?.data?.message) {
          errorMessage = error.response.data.message;
        } else {
          errorMessage = "Datos inválidos. Por favor verifica tu información.";
        }
      } else if (error.response?.status === 409) {
        errorMessage = "Este correo electrónico ya está registrado. Por favor inicia sesión o usa otro correo.";
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message && !error.message.includes('Network Error')) {
        errorMessage = error.message;
      }
      
      Alert.alert("Error en el registro", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <BackgroundLayout>
      <SafeAreaView edges={['top', 'bottom']} className="flex-1">
        <ScrollView 
          contentContainerStyle={{ flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View className="flex-1 px-6 py-6 max-w-md mx-auto w-full">
            
            <View className="items-center mb-6">
              <View className="w-16 h-16 bg-white/10 rounded-2xl items-center justify-center mb-4 border border-white/20 shadow-md shadow-black/30">
                <Sparkles size={32} color="#d8b4fe" />
              </View>
              <Text className="text-4xl font-bold text-white text-center mb-2">
                Dream Lodge
              </Text>
              <Text className="text-slate-400 text-center text-base px-2">
                Tu viaje artístico emocional comienza aquí.
              </Text>
            </View>

            <View className="bg-slate-900/70 border border-slate-700/50 p-6 rounded-3xl shadow-xl shadow-black/50">
          
          {/* Tabs Visuales Inversas */}
          <View className="flex-row mb-6 bg-black/20 p-1 rounded-xl border border-white/10">
            <TouchableOpacity 
              className="flex-1 py-2.5 items-center" 
              onPress={() => router.push("./login")}
            >
              <Text className="text-slate-400 font-medium">Iniciar Sesión</Text>
            </TouchableOpacity>
            <View className="flex-1 bg-white/10 rounded-lg py-2.5 items-center">
              <Text className="text-white font-medium">Registrarse</Text>
            </View>
          </View>

          <View className="space-y-4">
            
            {/* Input Nombre */}
            <View>
              <Text className="text-slate-300 mb-1.5 text-sm font-medium">Nombre</Text>
              <View className="relative">
                <Input 
                  placeholder="Nombre completo" 
                  value={form.name}
                  onChangeText={(t) => handleChange('name', t)}
                  onBlur={() => handleBlur('name')}
                  className={`pl-10 ${errors.name ? "border-red-500" : ""}`}
                />
                <View className="absolute left-3 top-3.5">
                  <User size={18} color={errors.name ? "#ef4444" : "#64748b"} />
                </View>
              </View>
              {errors.name ? (
                <Text className="text-red-400 text-xs mt-1">{errors.name}</Text>
              ) : null}
            </View>
            
            {/* Input Email */}
            <View>
              <Text className="text-slate-300 mb-1.5 text-sm font-medium">Email</Text>
              <View className="relative">
                <Input 
                  placeholder="tu@email.com" 
                  value={form.email}
                  keyboardType="email-address"
                  onChangeText={(t) => handleChange('email', t)}
                  onBlur={() => handleBlur('email')}
                  autoCapitalize="none"
                  className={`pl-10 ${errors.email ? "border-red-500" : ""}`}
                />
                <View className="absolute left-3 top-3.5">
                  <Mail size={18} color={errors.email ? "#ef4444" : "#64748b"} />
                </View>
              </View>
              {errors.email ? (
                <Text className="text-red-400 text-xs mt-1">{errors.email}</Text>
              ) : null}
            </View>
            
            {/* Input Fecha de Nacimiento */}
            <View>
              <Text className="text-slate-300 mb-1.5 text-sm font-medium">Fecha de Nacimiento</Text>
              <View className="relative">
                <Input 
                  placeholder="YYYY-MM-DD (ej: 2000-01-15)" 
                  value={form.birthdate}
                  onChangeText={handleBirthdateChange}
                  onBlur={() => handleBlur('birthdate')}
                  keyboardType="numeric"
                  maxLength={10}
                  className={`pl-10 ${errors.birthdate ? "border-red-500" : ""}`}
                />
                <View className="absolute left-3 top-3.5">
                  <Calendar size={18} color={errors.birthdate ? "#ef4444" : "#64748b"} />
                </View>
              </View>
              {errors.birthdate ? (
                <Text className="text-red-400 text-xs mt-1">{errors.birthdate}</Text>
              ) : (
                <Text className="text-slate-500 text-xs mt-1">Formato: AAAA-MM-DD</Text>
              )}
            </View>

            {/* Input Contraseña */}
            <View>
              <Text className="text-slate-300 mb-1.5 text-sm font-medium">Contraseña</Text>
              <View className="relative">
                <Input 
                  placeholder="••••••••" 
                  secureTextEntry
                  value={form.password}
                  onChangeText={(t) => handleChange('password', t)}
                  onBlur={() => handleBlur('password')}
                  className={`pl-10 ${errors.password ? "border-red-500" : ""}`}
                />
                <View className="absolute left-3 top-3.5">
                  <Lock size={18} color={errors.password ? "#ef4444" : "#64748b"} />
                </View>
              </View>
              {errors.password ? (
                <Text className="text-red-400 text-xs mt-1">{errors.password}</Text>
              ) : null}
            </View>

            {/* Input Confirmar Contraseña */}
            <View>
              <Text className="text-slate-300 mb-1.5 text-sm font-medium">Confirmar Contraseña</Text>
              <View className="relative">
                <Input 
                  placeholder="••••••••" 
                  secureTextEntry
                  value={form.confirmPassword}
                  onChangeText={(t) => handleChange('confirmPassword', t)}
                  onBlur={() => handleBlur('confirmPassword')}
                  className={`pl-10 ${errors.confirmPassword ? "border-red-500" : ""}`}
                />
                <View className="absolute left-3 top-3.5">
                  <Lock size={18} color={errors.confirmPassword ? "#ef4444" : "#64748b"} />
                </View>
              </View>
              {errors.confirmPassword ? (
                <Text className="text-red-400 text-xs mt-1">{errors.confirmPassword}</Text>
              ) : null}
            </View>

            <Button 
              title="Crear Cuenta" 
              onPress={handleRegister} 
              loading={loading}
              className="mt-4"
            />
          </View>
        </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </BackgroundLayout>
  );
}