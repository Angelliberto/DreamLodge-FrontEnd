import React, { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, Alert } from 'react-native';
import { X, Mail, Lock, User, Chrome, ArrowRight, Shield } from 'lucide-react-native';
import { useRouter } from 'expo-router';

// Importamos los componentes simplificados (sin cn/clsx)
import { Input } from './ui/input';
import { Button } from './ui/button';

// Usamos el hook del contexto para manejar la sesión globalmente
import { useAuth } from '../contexts/AuthContext';

interface AuthModalProps {
  visible: boolean;
  onClose: () => void;
  defaultTab?: 'login' | 'register';
}

export function AuthModal({ visible, onClose, defaultTab = 'login' }: AuthModalProps) {
  // 👇 USAMOS EL CONTEXTO AQUÍ
  const { login, register } = useAuth(); 
  
  const [activeTab, setActiveTab] = useState<'login' | 'register'>(defaultTab);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Estados del formulario
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [birthdate, setBirthdate] = useState('');
  const [enable2FA, setEnable2FA] = useState(false);

  // Sincronizar tab inicial
  React.useEffect(() => {
    setActiveTab(defaultTab);
  }, [visible, defaultTab]);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      if (activeTab === 'login') {
        // El contexto se encarga de la API y de guardar el token
        await login({ email, password });
      } else {
        // Validaciones básicas antes de enviar
        if (password !== confirmPassword) {
            throw new Error("Las contraseñas no coinciden");
        }
        await register({ 
            email, 
            password, 
            name, 
            birthdate: "2000-01-01", // Puedes agregar un input de fecha si lo necesitas
            confirmPassword 
        });
      }

      // Si no hay error, cerramos y redirigimos
      onClose();
      router.replace("/FeedScreen"); 

    } catch (error: any) {
      // Manejo de errores seguro
      const msg = error.response?.data?.message || error.message || "Error de conexión";
      Alert.alert("Error", msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/80 justify-end sm:justify-center">
        <KeyboardAvoidingView 
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="flex-1 justify-center p-4"
        >
            <View className="bg-[#0f172a] border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
                
                {/* Header */}
                <View className="flex-row justify-between items-center p-6 border-b border-white/5">
                    <View>
                        <Text className="text-xl font-bold text-white">Acceder a Dream Lodge</Text>
                        <Text className="text-slate-400 text-xs mt-1">Tu viaje artístico emocional</Text>
                    </View>
                    <TouchableOpacity onPress={onClose} className="bg-white/5 p-2 rounded-full">
                        <X size={20} color="#94a3b8" />
                    </TouchableOpacity>
                </View>

                {/* Body */}
                <ScrollView contentContainerStyle={{ padding: 24 }}>
                    {/* Tabs */}
                    <View className="flex-row bg-slate-900/50 p-1 rounded-xl mb-6 border border-white/5">
                        <TouchableOpacity 
                            className={`flex-1 py-2.5 items-center rounded-lg ${activeTab === 'login' ? 'bg-white/10' : ''}`}
                            onPress={() => setActiveTab('login')}
                        >
                            <Text className={`font-medium ${activeTab === 'login' ? 'text-white' : 'text-slate-400'}`}>
                                Iniciar Sesión
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                            className={`flex-1 py-2.5 items-center rounded-lg ${activeTab === 'register' ? 'bg-white/10' : ''}`}
                            onPress={() => setActiveTab('register')}
                        >
                            <Text className={`font-medium ${activeTab === 'register' ? 'text-white' : 'text-slate-400'}`}>
                                Registrarse
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* Botón Google (Placeholder) */}
                    <Button 
                        variant="outline" 
                        title={activeTab === 'login' ? "Continuar con Google" : "Registrarse con Google"}
                        icon={<Chrome size={18} color="white" />}
                        className="mb-6"
                    />

                    <View className="flex-row items-center mb-6">
                        <View className="flex-1 h-[1px] bg-white/10" />
                        <Text className="text-slate-500 mx-3 text-xs">O CONTINÚA CON EMAIL</Text>
                        <View className="flex-1 h-[1px] bg-white/10" />
                    </View>

                    {/* Inputs */}
                    <View className="space-y-4">
                        {activeTab === 'register' && (
                            <View>
                                <Text className="text-slate-300 mb-1.5 text-sm font-medium">Nombre</Text>
                                <View className="relative">
                                    <Input 
                                        value={name} 
                                        onChangeText={setName} 
                                        placeholder="Tu nombre" 
                                        className="pl-10"
                                    />
                                    <View className="absolute left-3 top-3.5">
                                        <User size={18} color="#64748b" />
                                    </View>
                                </View>
                            </View>
                        )}

                        <View>
                            <Text className="text-slate-300 mb-1.5 text-sm font-medium">Email</Text>
                            <View className="relative">
                                <Input 
                                    value={email} 
                                    onChangeText={setEmail} 
                                    placeholder="tu@email.com" 
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    className="pl-10"
                                />
                                <View className="absolute left-3 top-3.5">
                                    <Mail size={18} color="#64748b" />
                                </View>
                            </View>
                        </View>

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

                        {activeTab === 'register' && (
                            <View>
                                <Text className="text-slate-300 mb-1.5 text-sm font-medium">Confirmar Contraseña</Text>
                                <View className="relative">
                                    <Input 
                                        value={confirmPassword} 
                                        onChangeText={setConfirmPassword} 
                                        placeholder="••••••••" 
                                        secureTextEntry
                                        className="pl-10"
                                    />
                                    <View className="absolute left-3 top-3.5">
                                        <Lock size={18} color="#64748b" />
                                    </View>
                                </View>
                            </View>
                        )}

                        {/* 2FA Checkbox Visual */}
                        {activeTab === 'register' && (
                             <TouchableOpacity 
                                className="flex-row items-center p-3 border border-white/10 rounded-lg bg-white/5 mt-2"
                                onPress={() => setEnable2FA(!enable2FA)}
                             >
                                <View className={`w-5 h-5 rounded border items-center justify-center mr-3 ${enable2FA ? 'bg-green-600 border-green-600' : 'border-slate-500'}`}>
                                    {enable2FA && <ArrowRight size={12} color="white" />} 
                                </View>
                                <View className="flex-1">
                                    <View className="flex-row items-center gap-2">
                                        <Shield size={14} color="#22c55e" />
                                        <Text className="text-white text-sm">Habilitar 2FA</Text>
                                    </View>
                                    <Text className="text-slate-500 text-xs">Mayor seguridad para tu cuenta</Text>
                                </View>
                             </TouchableOpacity>
                        )}

                        <Button 
                            title={activeTab === 'login' ? "Iniciar Sesión" : "Crear Cuenta"} 
                            onPress={handleSubmit}
                            loading={loading}
                            className="mt-4"
                        />
                    </View>
                </ScrollView>
            </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}