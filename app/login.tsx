import { useRouter } from "expo-router";
import { Chrome, Lock, Mail, Sparkles } from "lucide-react-native";
import React from "react";
import { Alert, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BackgroundLayout } from "../src/components/ui/BackgroundLayout";
import { Button } from "../src/components/ui/button";
import { Input } from "../src/components/ui/input";
import { useAuth } from '../src/contexts/AuthContext';

export default function LoginScreen() {
  const router = useRouter();
  const { login, googleSignIn } = useAuth(); 
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  // Estados de validación en tiempo real
  const [errors, setErrors] = React.useState({
    email: "",
    password: ""
  });
  const [touched, setTouched] = React.useState({
    email: false,
    password: false
  });

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
    return "";
  };

  // Validación en tiempo real
  const handleEmailChange = (value: string) => {
    setEmail(value);
    if (touched.email) {
      setErrors(prev => ({ ...prev, email: validateEmail(value) }));
    }
  };

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    if (touched.password) {
      setErrors(prev => ({ ...prev, password: validatePassword(value) }));
    }
  };

  const handleEmailBlur = () => {
    setTouched(prev => ({ ...prev, email: true }));
    setErrors(prev => ({ ...prev, email: validateEmail(email) }));
  };

  const handlePasswordBlur = () => {
    setTouched(prev => ({ ...prev, password: true }));
    setErrors(prev => ({ ...prev, password: validatePassword(password) }));
  };

  const handleLogin = async () => {
    // Marcar todos los campos como tocados
    setTouched({ email: true, password: true });
    
    // Validar todos los campos
    const emailError = validateEmail(email);
    const passwordError = validatePassword(password);
    
    setErrors({
      email: emailError,
      password: passwordError
    });

    // Si hay errores, no continuar
    if (emailError || passwordError) {
      return;
    }

    setLoading(true);
    try {
      await login({ email: email.trim(), password: password.trim() });
      // Redirigir a index.tsx que manejará la redirección automática
      // basándose en si el usuario tiene tests completados
      router.replace('/');
    } catch (error: any) {
      // Manejo de errores con mensajes claros para el usuario
      let errorMessage = "Error al iniciar sesión. Por favor intenta nuevamente.";
      
      if (error.response?.status === 401) {
        errorMessage = "Contraseña incorrecta o correo incorrecto. Por favor verifica tus credenciales.";
      } else if (error.response?.status === 404) {
        errorMessage = "No existe una cuenta con este correo electrónico. Por favor verifica o regístrate.";
      } else if (error.response?.status === 400 || error.response?.status === 422) {
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
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message && !error.message.includes('Network Error')) {
        errorMessage = error.message;
      }
      
      Alert.alert("Error de autenticación", errorMessage);
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

            <View className="bg-slate-900/70 border border-slate-700/50 p-6 rounded-3xl space-y-4 shadow-xl shadow-black/50">
          
          {/* Tabs Visuales */}
          <View className="flex-row mb-6 bg-black/20 p-1 rounded-xl border border-white/10">
            <View className="flex-1 bg-white/10 rounded-lg py-2.5 items-center">
              <Text className="text-white font-medium">Iniciar Sesión</Text>
            </View>
            <TouchableOpacity 
              className="flex-1 py-2.5 items-center" 
              onPress={() => router.push("./register")}
            >
              <Text className="text-slate-400 font-medium">Registrarse</Text>
            </TouchableOpacity>
          </View>

          {/* Formulario */}
          <View className="space-y-4">
            
            {/* Input Email con Icono */}
            <View>
              <Text className="text-slate-300 mb-1.5 text-sm font-medium">Email</Text>
              <View className="relative">
                <Input 
                  value={email} 
                  onChangeText={handleEmailChange}
                  onBlur={handleEmailBlur}
                  placeholder="tu@email.com" 
                  autoCapitalize="none"
                  keyboardType="email-address"
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

            {/* Input Contraseña con Icono */}
            <View>
              <Text className="text-slate-300 mb-1.5 text-sm font-medium">Contraseña</Text>
              <View className="relative">
                <Input 
                  value={password} 
                  onChangeText={handlePasswordChange}
                  onBlur={handlePasswordBlur}
                  placeholder="••••••••" 
                  secureTextEntry
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

            {/* Enlace de olvidé mi contraseña */}
            <TouchableOpacity 
              onPress={() => router.push('./forgot-password')}
              className="self-end mb-2"
            >
              <Text className="text-purple-400 text-sm font-medium">
                ¿Olvidaste tu contraseña?
              </Text>
            </TouchableOpacity>

            <Button 
              title="Iniciar Sesión" 
              onPress={handleLogin} 
              loading={loading}
              className="mt-2"
            />

            <View className="flex-row items-center my-4">
              <View className="flex-1 h-[1px] bg-white/10" />
              <Text className="text-slate-500 mx-4 text-xs">O CONTINÚA CON</Text>
              <View className="flex-1 h-[1px] bg-white/10" />
            </View>

            <Button 
              variant="outline" 
              title="Google" 
              icon={<Chrome size={20} color="white" />}
              onPress={async () => {
                try {
                  setLoading(true);
                  await googleSignIn();
                  // Esperar un momento para que se actualice hasTestResults
                  await new Promise(resolve => setTimeout(resolve, 800));
                  // Redirigir a index.tsx que manejará la redirección automática
                  router.replace('/');
                } catch (error: any) {
                  Alert.alert("Error", error.message || "Error al iniciar sesión con Google");
                } finally {
                  setLoading(false);
                }
              }}
            />
          </View>
        </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </BackgroundLayout>
  );
}