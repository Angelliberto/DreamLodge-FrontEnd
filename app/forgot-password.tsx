import { useRouter } from "expo-router";
import { ArrowLeft, Mail, Sparkles } from "lucide-react-native";
import React from "react";
import { Alert, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BackgroundLayout } from "../src/components/ui/BackgroundLayout";
import { Button } from "../src/components/ui/button";
import { Input } from "../src/components/ui/input";
import { sendPasswordResetEmail } from '@/api/client';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [emailSent, setEmailSent] = React.useState(false);

  // Estados de validación en tiempo real
  const [errors, setErrors] = React.useState({
    email: ""
  });
  const [touched, setTouched] = React.useState({
    email: false
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

  const handleEmailChange = (value: string) => {
    setEmail(value);
    if (touched.email) {
      setErrors(prev => ({ ...prev, email: validateEmail(value) }));
    }
  };

  const handleEmailBlur = () => {
    setTouched(prev => ({ ...prev, email: true }));
    setErrors(prev => ({ ...prev, email: validateEmail(email) }));
  };

  const handleSendResetEmail = async () => {
    // Marcar el campo como tocado
    setTouched({ email: true });
    
    // Validar el campo
    const emailError = validateEmail(email);
    setErrors({ email: emailError });

    // Si hay errores, no continuar
    if (emailError) {
      return;
    }

    setLoading(true);
    try {
      await sendPasswordResetEmail(email.trim());
      setEmailSent(true);
      Alert.alert(
        "Correo enviado",
        "Si el email existe en nuestra base de datos, recibirás un correo con instrucciones para restablecer tu contraseña. Por favor revisa tu bandeja de entrada y spam.",
        [
          {
            text: "OK",
            onPress: () => router.back()
          }
        ]
      );
    } catch (error: any) {
      // Manejo de errores con mensajes claros para el usuario
      let errorMessage = "Error al enviar el correo. Por favor intenta nuevamente.";
      
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message && !error.message.includes('Network Error')) {
        errorMessage = error.message;
      }
      
      Alert.alert("Error", errorMessage);
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
            
            {/* Botón de regreso */}
            <TouchableOpacity 
              onPress={() => router.back()}
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
                Olvidé mi contraseña
              </Text>
              <Text className="text-slate-400 text-center text-base px-2">
                Ingresa tu correo electrónico y te enviaremos un enlace para restablecer tu contraseña.
              </Text>
            </View>

            <View className="bg-slate-900/70 border border-slate-700/50 p-6 rounded-3xl space-y-4 shadow-xl shadow-black/50">
          
              {!emailSent ? (
                <>
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

                  <Button 
                    title="Enviar correo de recuperación" 
                    onPress={handleSendResetEmail} 
                    loading={loading}
                    className="mt-2"
                  />
                </>
              ) : (
                <View className="items-center py-4">
                  <Text className="text-green-400 text-center mb-4">
                    ✓ Correo enviado exitosamente
                  </Text>
                  <Text className="text-slate-300 text-center text-sm">
                    Revisa tu bandeja de entrada y spam para encontrar el enlace de restablecimiento.
                  </Text>
                </View>
              )}

              <TouchableOpacity 
                onPress={() => router.back()}
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
