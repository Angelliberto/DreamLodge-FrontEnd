import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React from "react";
import "../global.css";

// 💡 SOLUCIÓN CLAVE: Importación del CSS global para que NativeWind lo procese.


import { AuthProvider } from "./src/contexts/AuthContext";

const Layout: React.FC = () => {
  return (
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
  );
};

export default Layout;