import { RegisterRequest } from '@/types';
import { useRouter } from "expo-router";
import { Alert } from "react-native";
import { useAuth } from "../contexts/AuthContext";


export const useRegister = (reset: () => void) => {
    const router = useRouter();
    const {register} = useAuth();
    const onSubmit = async (data: RegisterRequest) => {
    try {
      await register({
        name: data.name.trim(),
        email: data.email.trim(),
        password: data.password.trim(),
        confirmPassword: data.confirmPassword.trim(),
        birthdate: data.birthdate.trim(),
      });

      router.replace({
      pathname: "/verify_code",
      params: { email: data.email },
      });
    } catch (error: any) {
      console.log(error)
      let errorMessage = "Error en el registro. Por favor intenta nuevamente.";

      if (error.response?.status === 400 || error.response?.status === 422) {
        const validationErrors = error.response?.data?.errors;

        if (Array.isArray(validationErrors) && validationErrors.length > 0) {
          const firstError = validationErrors[0];
          errorMessage =
            firstError.msg ||
            firstError.message ||
            "Datos inválidos. Por favor verifica tu información.";
        } else if (error.response?.data?.message) {
          errorMessage = error.response.data.message;
        } else {
          errorMessage = "Datos inválidos. Por favor verifica tu información.";
        }
      } else if (error.response?.status === 409) {
        errorMessage =
          "Este correo electrónico ya está registrado. Por favor inicia sesión o usa otro correo.";
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message && !error.message.includes("Network Error")) {
        errorMessage = error.message;
      }

      Alert.alert("Error en el registro", errorMessage);
    }
  };
    return { onSubmit };
};
