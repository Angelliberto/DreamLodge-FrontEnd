import React from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

const Layout: React.FC = () => (
  <>
    <StatusBar style="auto" />
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    />
  </>
);

export default Layout;