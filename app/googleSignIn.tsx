import React, { useEffect } from "react";
import { Button, Alert, Linking } from "react-native";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";

export default function GoogleSignInButton() {
  const router = useRouter();

  useEffect(() => {
    const handleUrl = ({ url }: { url: string }) => {
      const token = new URL(url).searchParams.get("token");
      if (token) {
        SecureStore.setItemAsync("jwt", token);
        router.replace("/");
      }
    };

    Linking.addEventListener("url", handleUrl);
    return () => Linking.removeAllListeners("url");
  }, []);

  const handleGoogleLogin = async () => {
    try {
      const redirectUri = "dreamlodgefrontend://home";
      const authUrl = `http://192.168.1.77:3000/api/users/google?redirect_uri=${encodeURIComponent(
        redirectUri
      )}`;

      await Linking.openURL(authUrl);
    } catch (err: any) {
      console.error(err);
      Alert.alert("Login failed", err.message);
    }
  };

  return <Button title="Sign in with Google" onPress={handleGoogleLogin} />;
}
