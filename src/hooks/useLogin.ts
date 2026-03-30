import { LoginRequest } from '@/types';
import { useRouter } from "expo-router";
import { Alert } from "react-native";
import { useAuth } from "../contexts/AuthContext";


export const useLogin = (reset: () => void) => {
    const router = useRouter();
    const { login } = useAuth();
    const onSubmit = async (data: LoginRequest) => {
        try {
            await login({
                email: data.email.trim(),
                password: data.password.trim()
            });

            router.replace("/test-selection");
        } catch (error: any) {
            let errorMessage = "Error en el inicio de sesión. Por favor intenta nuevamente.";

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
            } else if (error.response?.status === 401) {
                errorMessage = "Contraseña incorrecta o correo incorrecto.";
            } else if (error.response?.status === 404) {
                errorMessage = "No existe una cuenta con este correo"
            } else if (error.response?.data?.message) {
                errorMessage = error.response.data.message;
            } else if (error.message && !error.message.includes("Network Error")) {
                errorMessage = error.message;
            }

            Alert.alert("Error en el login", errorMessage);
        }
    };
    return { onSubmit };
};