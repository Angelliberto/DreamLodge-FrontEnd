import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { Chrome, Lock, Mail, Sparkles } from "lucide-react-native";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { BackgroundLayout } from "../src/components/ui/BackgroundLayout";
import { Button } from "../src/components/ui/button";
import { Input } from "../src/components/ui/input";
import { useAuth } from '../src/contexts/AuthContext';

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth(); 
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  const handleLogin = async () => {
    setLoading(true);
    try {
      await login({ email, password });
      router.replace("./FeedScreen"); 
    } catch (error) {
      alert("Error al iniciar sesión");
    } finally {
      setLoading(false);
    }
  };

  return (
    <BackgroundLayout>
      <View className="flex-1 justify-center px-6">
        
        <View className="items-center mb-10">
          <View className="w-16 h-16 bg-white/10 rounded-2xl items-center justify-center mb-4 border border-white/20 shadow-md shadow-black/30">
            <Sparkles size={32} color="#d8b4fe" />
          </View>
          <Text className="text-4xl font-bold text-white text-center mb-2">
            Dream Lodge
          </Text>
          <Text className="text-slate-400 text-center text-base">
            Tu viaje artístico emocional comienza aquí.
          </Text>
        </View>

        <View className="bg-slate-900/70 border border-slate-700/50 p-6 rounded-3xl space-y-4 shadow-xl shadow-black/50">
          
          {/* Tabs Visuales */}
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

          {/* Formulario */}
          <View className="space-y-4">
            
            {/* Input Email con Icono */}
            <View>
              <Text className="text-slate-300 mb-1.5 text-sm font-medium">Email</Text>
              <View className="relative">
                <Input 
                  value={email} 
                  onChangeText={setEmail} 
                  placeholder="tu@email.com" 
                  autoCapitalize="none"
                  className="pl-10"
                />
                <View className="absolute left-3 top-3.5">
                  <Mail size={18} color="#64748b" />
                </View>
              </View>
            </View>

            {/* Input Contraseña con Icono */}
            <View>
              <Text className="text-slate-300 mb-1.5 text-sm font-medium">Contraseña</Text>
              <View className="relative">
                <Input 
                  value={password} 
                  onChangeText={setPassword} 
                  placeholder="••••••••" 
                  secureTextEntry
                  className="pl-10"
                />
                <View className="absolute left-3 top-3.5">
                  <Lock size={18} color="#64748b" />
                </View>
              </View>
            </View>

            <Button 
              title="Iniciar Sesión" 
              onPress={handleLogin} 
              loading={loading}
              className="mt-2"
            />

            <View className="flex-row items-center my-4">
              <View className="flex-1 h-[1px] bg-white/10" />
              <Text className="text-slate-500 mx-4 text-xs">O CONTINÚA CON</Text>
              <View className="flex-1 h-[1px] bg-white/10" />
            </View>

            <Button 
              variant="outline" 
              title="Google" 
              icon={<Chrome size={20} color="white" />}
              onPress={() => {/* Lógica Google */}}
            />
          </View>
        </View>
      </View>
    </BackgroundLayout>
  );
}