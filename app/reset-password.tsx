import { useRouter, useLocalSearchParams } from "expo-router";
import { ArrowLeft, Lock, Sparkles } from "lucide-react-native";
import React, { useEffect } from "react";
import { Alert, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BackgroundLayout } from "../src/components/ui/BackgroundLayout";
import { Button } from "../src/components/ui/button";
import { Input } from "../src/components/ui/input";
import { checkPasswordResetToken, resetPassword } from "../src/services/DL_api/api";

export default function ResetPasswordScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const token = params.token as string;
  
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [validatingToken, setValidatingToken] = React.useState(true);
  const [tokenValid, setTokenValid] = React.useState(false);

  // Estados de validación en tiempo real
  const [errors, setErrors] = React.useState({
    password: "",
    confirmPassword: ""
  });
  const [touched, setTouched] = React.useState({
    password: false,
    confirmPassword: false
  });

  useEffect(() => {
    validateToken();
  }, [token]);

  const validateToken = async () => {
    if (!token) {
      Alert.alert(
        "Token inválido",
        "No se proporcionó un token válido. Por favor solicita un nuevo enlace de restablecimiento.",
        [
          {
            text: "OK",
            onPress: () => router.replace('/forgot-password')
          }
        ]
      );
      setValidatingToken(false);
      return;
    }

    try {
      await checkPasswordResetToken(token);
      setTokenValid(true);
    } catch (error: any) {
      let errorMessage = "El token de restablecimiento es inválido o ha expirado.";
      
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      
      Alert.alert(
        "Token inválido",
        errorMessage + " Por favor solicita un nuevo enlace de restablecimiento.",
        [
          {
            text: "OK",
            onPress: () => router.replace('/forgot-password')
          }
        ]
      );
      setTokenValid(false);
    } finally {
      setValidatingToken(false);
    }
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

  const validateConfirmPassword = (confirmPassword: string, password: string): string => {
    if (!confirmPassword.trim()) {
      return "Por favor confirma tu contraseña";
    }
    if (confirmPassword !== password) {
      return "Las contraseñas no coinciden";
    }
    return "";
  };

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    if (touched.password) {
      setErrors(prev => ({ ...prev, password: validatePassword(value) }));
    }
    // Si confirmPassword ya fue tocado, validarlo también
    if (touched.confirmPassword) {
      setErrors(prev => ({ ...prev, confirmPassword: validateConfirmPassword(confirmPassword, value) }));
    }
  };

  const handleConfirmPasswordChange = (value: string) => {
    setConfirmPassword(value);
    if (touched.confirmPassword) {
      setErrors(prev => ({ ...prev, confirmPassword: validateConfirmPassword(value, password) }));
    }
  };

  const handlePasswordBlur = () => {
    setTouched(prev => ({ ...prev, password: true }));
    setErrors(prev => ({ ...prev, password: validatePassword(password) }));
  };

  const handleConfirmPasswordBlur = () => {
    setTouched(prev => ({ ...prev, confirmPassword: true }));
    setErrors(prev => ({ ...prev, confirmPassword: validateConfirmPassword(confirmPassword, password) }));
  };

  const handleResetPassword = async () => {
    // Marcar todos los campos como tocados
    setTouched({ password: true, confirmPassword: true });
    
    // Validar todos los campos
    const passwordError = validatePassword(password);
    const confirmPasswordError = validateConfirmPassword(confirmPassword, password);
    
    setErrors({
      password: passwordError,
      confirmPassword: confirmPasswordError
    });

    // Si hay errores, no continuar
    if (passwordError || confirmPasswordError) {
      return;
    }

    if (!token) {
      Alert.alert("Error", "Token no válido. Por favor solicita un nuevo enlace.");
      return;
    }

    setLoading(true);
    try {
      await resetPassword(token, password.trim());
      Alert.alert(
        "Contraseña restablecida",
        "Tu contraseña ha sido restablecida exitosamente. Ahora puedes iniciar sesión con tu nueva contraseña.",
        [
          {
            text: "OK",
            onPress: () => router.replace('/login')
          }
        ]
      );
    } catch (error: any) {
      // Manejo de errores con mensajes claros para el usuario
      let errorMessage = "Error al restablecer la contraseña. Por favor intenta nuevamente.";
      
      if (error.response?.status === 404) {
        errorMessage = "El token de restablecimiento es inválido o ha expirado. Por favor solicita un nuevo enlace.";
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message && !error.message.includes('Network Error')) {
        errorMessage = error.message;
      }
      
      Alert.alert("Error", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (validatingToken) {
    return (
      <BackgroundLayout>
        <SafeAreaView edges={['top', 'bottom']} className="flex-1">
          <View className="flex-1 justify-center items-center px-6">
            <Text className="text-white text-lg mb-4">Validando token...</Text>
          </View>
        </SafeAreaView>
      </BackgroundLayout>
    );
  }

  if (!tokenValid) {
    return null; // El Alert ya maneja la navegación
  }

  return (
    <BackgroundLayout>
      <SafeAreaView edges={['top', 'bottom']} className="flex-1">
        <ScrollView 
          contentContainerStyle={{ flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View className="flex-1 px-6 py-6 max-w-md mx-auto w-full">
            
            {/* Botón de regreso */}
            <TouchableOpacity 
              onPress={() => router.replace('/forgot-password')}
              className="mb-4 flex-row items-center"
            >
              <ArrowLeft size={20} color="#cbd5e1" />
              <Text className="text-slate-400 ml-2">Volver</Text>
            </TouchableOpacity>

            <View className="items-center mb-6">
              <View className="w-16 h-16 bg-white/10 rounded-2xl items-center justify-center mb-4 border border-white/20 shadow-md shadow-black/30">
                <Sparkles size={32} color="#d8b4fe" />
              </View>
              <Text className="text-4xl font-bold text-white text-center mb-2">
                Restablecer contraseña
              </Text>
              <Text className="text-slate-400 text-center text-base px-2">
                Ingresa tu nueva contraseña. Asegúrate de que tenga al menos 8 caracteres.
              </Text>
            </View>

            <View className="bg-slate-900/70 border border-slate-700/50 p-6 rounded-3xl space-y-4 shadow-xl shadow-black/50">
          
              {/* Input Nueva Contraseña con Icono */}
              <View>
                <Text className="text-slate-300 mb-1.5 text-sm font-medium">Nueva Contraseña</Text>
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

              {/* Input Confirmar Contraseña con Icono */}
              <View>
                <Text className="text-slate-300 mb-1.5 text-sm font-medium">Confirmar Contraseña</Text>
                <View className="relative">
                  <Input 
                    value={confirmPassword} 
                    onChangeText={handleConfirmPasswordChange}
                    onBlur={handleConfirmPasswordBlur}
                    placeholder="••••••••" 
                    secureTextEntry
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
                title="Restablecer contraseña" 
                onPress={handleResetPassword} 
                loading={loading}
                className="mt-2"
              />

              <TouchableOpacity 
                onPress={() => router.replace('/login')}
                className="mt-4"
              >
                <Text className="text-slate-400 text-center text-sm">
                  ¿Recordaste tu contraseña?{" "}
                  <Text className="text-purple-400 font-medium">Iniciar sesión</Text>
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </BackgroundLayout>
  );
}
