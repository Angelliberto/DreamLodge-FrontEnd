import React from "react";
import { Alert, ScrollView, Text, TextInput, TouchableOpacity, View, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft, MailCheck, RefreshCw } from "lucide-react-native";

import { BackgroundLayout } from "../src/components/ui/BackgroundLayout";
import { Button } from "../src/components/ui/button";
import { verifyEmailCode, resendVerificationCode } from "../src/api/client";

export default function EmailValidationScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string }>();

  const email = typeof params.email === "string" ? params.email : "";

  const [code, setCode] = React.useState<string[]>(Array(6).fill(""));
  const [loading, setLoading] = React.useState(false);
  const [resendLoading, setResendLoading] = React.useState(false);

  const inputRefs = React.useRef<(TextInput | null)[]>([]);

  const handleInputChange = (index: number, value: string) => {
    if (!/^\d?$/.test(value)) return;

    const updatedCode = [...code];
    updatedCode[index] = value;
    setCode(updatedCode);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (index: number, key: string) => {
    if (key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleSubmit = async () => {
    const fullCode = code.join("");

    if (!email) {
      Alert.alert("Error", "No se encontró el email del usuario.");
      return;
    }

    if (fullCode.length !== 6) {
      Alert.alert("Código incompleto", "Por favor introduce los 6 dígitos.");
      return;
    }

    setLoading(true);
    try {
      const response = await verifyEmailCode(email, fullCode);

      Alert.alert(
        "Correo verificado",
        response.message || "Tu correo ha sido verificado correctamente.",
        [
          {
            text: "Continuar",
            onPress: () => router.replace("/login")
          }
        ]
      );
    } catch (error: any) {
      let errorMessage = "Error al verificar el código.";

      if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error?.message) {
        errorMessage = error.message;
      }

      Alert.alert("Error", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (!email) {
      Alert.alert("Error", "No se encontró el email del usuario.");
      return;
    }

    setResendLoading(true);
    try {
      const response = await resendVerificationCode(email);
      Alert.alert(
        "Código reenviado",
        response.message || "Te hemos enviado un nuevo código de verificación."
      );
    } catch (error: any) {
      let errorMessage = "No se pudo reenviar el código.";

      if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error?.message) {
        errorMessage = error.message;
      }

      Alert.alert("Error", errorMessage);
    } finally {
      setResendLoading(false);
    }
  };

  const isCodeComplete = code.every((digit) => digit !== "");

  return (
    <BackgroundLayout>
      <SafeAreaView edges={["top", "bottom"]} className="flex-1">
        <KeyboardAvoidingView
          className="flex-1"
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView
            contentContainerStyle={{ flexGrow: 1 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View className="flex-1 px-6 py-6 max-w-md mx-auto w-full">
              <TouchableOpacity
                onPress={() => router.back()}
                className="mb-4 flex-row items-center"
              >
                <ArrowLeft size={20} color="#cbd5e1" />
                <Text className="text-slate-400 ml-2">Volver</Text>
              </TouchableOpacity>

              <View className="items-center mb-6">
                <View className="w-16 h-16 bg-white/10 rounded-2xl items-center justify-center mb-4 border border-white/20 shadow-md shadow-black/30">
                  <MailCheck size={32} color="#d8b4fe" />
                </View>

                <Text className="text-4xl font-bold text-white text-center mb-2">
                  Verifica tu correo
                </Text>

                <Text className="text-slate-400 text-center text-base px-2">
                  Introduce el código de 6 dígitos que enviamos a:
                </Text>

                <Text className="text-purple-400 text-center text-base font-semibold mt-2">
                  {email || "correo no disponible"}
                </Text>
              </View>

              <View className="bg-slate-900/70 border border-slate-700/50 p-6 rounded-3xl shadow-xl shadow-black/50">
                <View className="flex-row justify-between mb-6">
                  {code.map((digit, index) => (
                    <TextInput
                      key={index}
                      ref={(el) => {
                        inputRefs.current[index] = el;
                      }}
                      value={digit}
                      onChangeText={(text) => handleInputChange(index, text)}
                      onKeyPress={({ nativeEvent }) =>
                        handleKeyPress(index, nativeEvent.key)
                      }
                      keyboardType="number-pad"
                      maxLength={1}
                      autoFocus={index === 0}
                      className="w-12 h-14 text-xl text-white text-center rounded-2xl border border-slate-600 bg-slate-800"
                    />
                  ))}
                </View>

                <Button
                  title="Verificar correo"
                  onPress={handleSubmit}
                  loading={loading}
                  disabled={!isCodeComplete || loading}
                />

                <TouchableOpacity
                  onPress={handleResendCode}
                  disabled={resendLoading}
                  className="mt-4 flex-row items-center justify-center"
                >
                  <RefreshCw size={16} color="#c084fc" />
                  <Text className="text-purple-400 ml-2 text-sm font-medium">
                    {resendLoading ? "Reenviando..." : "Reenviar código"}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => router.replace("/login")}
                  className="mt-5"
                >
                  <Text className="text-slate-400 text-center text-sm">
                    ¿Ya verificaste tu cuenta?{" "}
                    <Text className="text-purple-400 font-medium">
                      Iniciar sesión
                    </Text>
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </BackgroundLayout>
  );
}