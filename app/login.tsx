import { LoginRequest } from "@/types";
import { useRouter } from "expo-router";
import { Chrome, Lock, Mail, Sparkles } from "lucide-react-native";
import { Alert, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useForm } from "react-hook-form";
import { useLogin } from "@/hooks/useLogin";
import { useAuth } from "../src/contexts/AuthContext";
import { BackgroundLayout } from "../src/components/ui/BackgroundLayout";
import { Button } from "../src/components/ui/button";
import { FormInputField } from "../src/components/ui/FormInputField";

export default function LoginScreen() {
  const router = useRouter();
  const { googleSignIn } = useAuth();

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<LoginRequest>({
    mode: "onBlur",
    reValidateMode: "onChange",
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const { onSubmit } = useLogin(reset);

  return (
    <BackgroundLayout>
      <SafeAreaView edges={["top", "bottom"]} className="flex-1">
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View className="flex-1 px-6 py-6 max-w-md mx-auto w-full">

            {/* Header */}
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

              {/* Tabs */}
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

              {/* Form */}
              <View className="space-y-4">

                <FormInputField<LoginRequest>
                  label="Email"
                  name="email"
                  control={control}
                  errors={errors}
                  placeholder="tu@email.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="email"
                  textContentType="emailAddress"
                  rules={{
                    required: "El email es requerido",
                    pattern: {
                      value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                      message: "Por favor ingresa un email válido",
                    },
                  }}
                  icon={
                    <Mail size={18} color={errors.email ? "#ef4444" : "#64748b"} />
                  }
                />

                <FormInputField<LoginRequest>
                  label="Contraseña"
                  name="password"
                  control={control}
                  errors={errors}
                  placeholder="••••••••"
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="current-password"
                  textContentType="password"
                  rules={{
                    required: "La contraseña es requerida",
                    minLength: {
                      value: 8,
                      message: "La contraseña debe tener al menos 8 caracteres",
                    },
                  }}
                  icon={
                    <Lock size={18} color={errors.password ? "#ef4444" : "#64748b"} />
                  }
                />

                {/* Forgot password */}
                <TouchableOpacity
                  onPress={() => router.push("./forgot-password")}
                  className="self-end py-4"
                >
                  <Text className="text-purple-400 text-sm font-medium">
                    ¿Olvidaste tu contraseña?
                  </Text>
                </TouchableOpacity>

                <Button
                  title="Iniciar Sesión"
                  onPress={handleSubmit(onSubmit)}
                  loading={isSubmitting}
                  className="mt-2"
                />

                {/* Divider */}
                <View className="flex-row items-center my-4">
                  <View className="flex-1 h-[1px] bg-white/10" />
                  <Text className="text-slate-500 mx-4 text-xs">O CONTINÚA CON</Text>
                  <View className="flex-1 h-[1px] bg-white/10" />
                </View>

                {/* Google */}
                <Button
                  variant="outline"
                  title="Google"
                  icon={<Chrome size={20} color="white" />}
                  onPress={async () => {
                    try {
                      await googleSignIn();
                      await new Promise(resolve => setTimeout(resolve, 800));
                      router.replace("/");
                    } catch (error: any) {
                      Alert.alert("Error", error.message || "Error al iniciar sesión con Google");
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