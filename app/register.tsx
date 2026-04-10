import { useRegister } from "@/hooks/useRegister";
import { RegisterRequest } from "@/types";
import { useRouter } from "expo-router";
import { Calendar, Lock, Mail, Sparkles, User, } from "lucide-react-native";
import React from "react";
import { useForm } from "react-hook-form";
import { KeyboardAvoidingView, Platform, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BackgroundLayout } from "../src/components/ui/BackgroundLayout";
import { Button } from "../src/components/ui/button";
import { FormInputField } from "../src/components/ui/FormInputField";

export default function RegisterScreen() {
  const router = useRouter();
  
  const {
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<RegisterRequest>({
    mode: "onBlur",
    reValidateMode: "onChange",
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
      birthdate: "",
    },
  });
  
  const { onSubmit } = useRegister(reset);
  const password = watch("password");

  const formatDateInput = (value: string): string => {
    const numbers = value.replace(/\D/g, "").slice(0, 8);

    if (numbers.length <= 4) return numbers;
    if (numbers.length <= 6) return `${numbers.slice(0, 4)}-${numbers.slice(4)}`;
    return `${numbers.slice(0, 4)}-${numbers.slice(4, 6)}-${numbers.slice(6, 8)}`;
  };

  const validateBirthdate = (birthdate: string) => {
    if (!birthdate.trim()) {
      return "La fecha de nacimiento es requerida";
    }

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(birthdate)) {
      return "Formato inválido. Usa YYYY-MM-DD";
    }

    const [year, month, day] = birthdate.split("-").map(Number);
    const date = new Date(year, month - 1, day);

    if (
      date.getFullYear() !== year ||
      date.getMonth() !== month - 1 ||
      date.getDate() !== day
    ) {
      return "Fecha inválida";
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (date >= today) {
      return "La fecha no puede ser en el futuro";
    }

    if (year < 1900) {
      return "La fecha debe ser posterior a 1900";
    }

    let age = today.getFullYear() - year;
    const monthDiff = today.getMonth() - (month - 1);
    const dayDiff = today.getDate() - day;

    if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
      age--;
    }

    if (age < 13) {
      return "Debes tener al menos 13 años";
    }

    return true;
  };

  const handleBirthdateChange = (value: string) => {
    const formatted = formatDateInput(value);
    setValue("birthdate", formatted, {
      shouldValidate: true,
      shouldDirty: true,
      shouldTouch: true,
    });
  };

  

  return (
    <BackgroundLayout>
      <SafeAreaView edges={["top", "bottom"]} className="flex-1">
        <KeyboardAvoidingView 
    style={{ flex: 1 }} 
    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
  >
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
                <FormInputField<RegisterRequest>
                  label="Nombre"
                  name="name"
                  control={control}
                  errors={errors}
                  placeholder="Nombre completo"
                  autoCapitalize="words"
                  autoCorrect={false}
                  autoComplete="name"
                  textContentType="name"
                  rules={{
                    required: "El nombre es requerido",
                    validate: (value) =>
                      value.trim().length >= 2 ||
                      "El nombre debe tener al menos 2 caracteres",
                  }}
                  icon={
                    <User
                      size={18}
                      color={errors.name ? "#ef4444" : "#64748b"}
                    />
                  }
                />

                <FormInputField<RegisterRequest>
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
                    <Mail
                      size={18}
                      color={errors.email ? "#ef4444" : "#64748b"}
                    />
                  }
                />

                <FormInputField<RegisterRequest>
                  label="Fecha de Nacimiento"
                  name="birthdate"
                  control={control}
                  errors={errors}
                  placeholder="YYYY-MM-DD (ej: 2000-01-15)"
                  keyboardType="numeric"
                  maxLength={10}
                  autoCorrect={false}
                  helperText={!errors.birthdate ? "Formato: AAAA-MM-DD" : undefined}
                  onChangeText={handleBirthdateChange}
                  rules={{
                    validate: validateBirthdate,
                  }}
                  icon={
                    <Calendar
                      size={18}
                      color={errors.birthdate ? "#ef4444" : "#64748b"}
                    />
                  }
                />

                <FormInputField<RegisterRequest>
                  label="Contraseña"
                  name="password"
                  control={control}
                  errors={errors}
                  placeholder="••••••••"
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="new-password"
                  textContentType="newPassword"
                  rules={{
                    required: "La contraseña es requerida",
                    minLength: {
                      value: 8,
                      message: "La contraseña debe tener al menos 8 caracteres",
                    },
                    maxLength: {
                      value: 50,
                      message: "La contraseña no puede tener más de 50 caracteres",
                    },
                  }}
                  icon={
                    <Lock
                      size={18}
                      color={errors.password ? "#ef4444" : "#64748b"}
                    />
                  }
                />

                <FormInputField<RegisterRequest>
                  label="Confirmar Contraseña"
                  name="confirmPassword"
                  control={control}
                  errors={errors}
                  placeholder="••••••••"
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="new-password"
                  textContentType="newPassword"
                  rules={{
                    required: "Por favor confirma tu contraseña",
                    validate: (value) =>
                      value === password || "Las contraseñas no coinciden",
                  }}
                  icon={
                    <Lock
                      size={18}
                      color={errors.confirmPassword ? "#ef4444" : "#64748b"}
                    />
                  }
                />

                <Button title="Crear Cuenta" onPress={handleSubmit(onSubmit)} loading={isSubmitting} className="mt-4"
                />
              </View>
            </View>
          </View>
        </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </BackgroundLayout>
  );
}