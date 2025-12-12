import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { Sparkles, User, Mail, Lock, Calendar } from "lucide-react-native";
import React from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { BackgroundLayout } from "../src/components/ui/BackgroundLayout";
import { Button } from "../src/components/ui/button";
import { Input } from "../src/components/ui/input";
import { useAuth } from '../src/contexts/AuthContext';

export default function RegisterScreen() {
  const router = useRouter();
  const { register } = useAuth();
  const [form, setForm] = React.useState({
    name: "", email: "", password: "", confirmPassword: "", birthdate: ""
  });
  const [loading, setLoading] = React.useState(false);

  const handleChange = (key: string, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const handleRegister = async () => {
    if (form.password !== form.confirmPassword) {
        alert("Las contraseñas no coinciden");
        return;
    }
    setLoading(true);
    try {
      await register(form);
      router.replace("./FeedScreen");
    } catch (error: any) {
      alert("Error en registro: " + (error.response?.data?.message || error.message || "Intenta de nuevo"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <BackgroundLayout>
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}>
        
        <View className="items-center mb-8 mt-10">
          <View className="w-14 h-14 bg-white/10 rounded-xl items-center justify-center mb-4 border border-white/20 shadow-md shadow-black/30">
            <Sparkles size={28} color="#d8b4fe" />
          </View>
          <Text className="text-3xl font-bold text-white">Crea tu Dream Lodge</Text>
        </View>

        <View className="bg-slate-900/70 border border-slate-700/50 p-6 rounded-3xl shadow-xl shadow-black/50">
          
          {/* Tabs Visuales Inversas */}
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
            
            {/* Input Nombre */}
            <View>
              <Text className="text-slate-300 mb-1.5 text-sm font-medium">Nombre</Text>
              <View className="relative">
                <Input 
                  placeholder="Nombre completo" 
                  value={form.name}
                  onChangeText={(t) => handleChange('name', t)}
                  className="pl-10"
                />
                <View className="absolute left-3 top-3.5">
                  <User size={18} color="#64748b" />
                </View>
              </View>
            </View>
            
            {/* Input Email */}
            <View>
              <Text className="text-slate-300 mb-1.5 text-sm font-medium">Email</Text>
              <View className="relative">
                <Input 
                  placeholder="tu@email.com" 
                  value={form.email}
                  keyboardType="email-address"
                  onChangeText={(t) => handleChange('email', t)}
                  autoCapitalize="none"
                  className="pl-10"
                />
                <View className="absolute left-3 top-3.5">
                  <Mail size={18} color="#64748b" />
                </View>
              </View>
            </View>
            
            {/* Input Fecha de Nacimiento */}
            <View>
              <Text className="text-slate-300 mb-1.5 text-sm font-medium">Fecha de Nacimiento</Text>
              <View className="relative">
                <Input 
                  placeholder="YYYY-MM-DD" 
                  value={form.birthdate}
                  onChangeText={(t) => handleChange('birthdate', t)}
                  className="pl-10"
                />
                <View className="absolute left-3 top-3.5">
                  <Calendar size={18} color="#64748b" />
                </View>
              </View>
            </View>

            {/* Input Contraseña */}
            <View>
              <Text className="text-slate-300 mb-1.5 text-sm font-medium">Contraseña</Text>
              <View className="relative">
                <Input 
                  placeholder="••••••••" 
                  secureTextEntry
                  value={form.password}
                  onChangeText={(t) => handleChange('password', t)}
                  className="pl-10"
                />
                <View className="absolute left-3 top-3.5">
                  <Lock size={18} color="#64748b" />
                </View>
              </View>
            </View>

            {/* Input Confirmar Contraseña */}
            <View>
              <Text className="text-slate-300 mb-1.5 text-sm font-medium">Confirmar Contraseña</Text>
              <View className="relative">
                <Input 
                  placeholder="••••••••" 
                  secureTextEntry
                  value={form.confirmPassword}
                  onChangeText={(t) => handleChange('confirmPassword', t)}
                  className="pl-10"
                />
                <View className="absolute left-3 top-3.5">
                  <Lock size={18} color="#64748b" />
                </View>
              </View>
            </View>

            <Button 
              title="Crear Cuenta" 
              onPress={handleRegister} 
              loading={loading}
              className="mt-4"
            />
          </View>
        </View>
      </ScrollView>
    </BackgroundLayout>
  );
}