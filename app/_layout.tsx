import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import "../global.css";

// 💡 SOLUCIÓN CLAVE: Importación del CSS global para que NativeWind lo procese.


import { AuthProvider } from "../src/contexts/AuthContext";

const Layout: React.FC = () => {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerShown: false,
            // Fondo oscuro por defecto para evitar pantallazos blancos
            contentStyle: { backgroundColor: '#020617' } 
          }}
        />
      </AuthProvider>
    </SafeAreaProvider>
  );
};

export default Layout;