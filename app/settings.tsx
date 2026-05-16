import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'expo-router';
import { KeyRound, LogOut, Trash2 } from 'lucide-react-native';
import React from 'react';
import {
  Alert,
  ScrollView,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BottomNavigation } from '../src/components/BottomNavigation';
import { NavigationBar } from '../src/components/NavigationBar';
import { BackgroundLayout } from '../src/components/ui/BackgroundLayout';
export default function SettingsScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
const { deleteAccount } = useAuth();
  const handleChangePassword = () => {
    router.push('/forgot-password');
  };

  const handleLogout =  () => {
    Alert.alert(
      'Cerrar sesión',
      '¿Seguro que quieres cerrar sesión?',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Cerrar sesión',
          style: 'destructive',
          onPress: async () => {
            console.log('Cerrar sesión');
            await logout();
            if (router.canGoBack()) {
            router.dismissAll();
          }
            router.replace('/login');

          },
        },
      ]
    );
  };

  const handleDeleteAccount = () => {
  Alert.alert(
    'Eliminar cuenta',
    'Esta acción eliminará tu cuenta y no se podrá deshacer.',
    [
      {
        text: 'Cancelar',
        style: 'cancel',
      },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteAccount();

            if (router.canGoBack()) {
              router.dismissAll();
            }

            router.replace('/register');
          } catch (error: any) {
            let errorMessage = 'No se pudo eliminar la cuenta. Inténtalo de nuevo.';
            console.log(error)
            if (error.response?.status === 401) {
              errorMessage = 'Tu sesión expiró. Inicia sesión de nuevo.';
            } else if (error.response?.status === 404) {
              errorMessage = 'No se encontró la cuenta.';
            } else if (error.response?.data?.message) {
              errorMessage = error.response.data.message;
            } else if (error.message && !error.message.includes('Network Error')) {
              errorMessage = error.message;
            }

            Alert.alert('Error', errorMessage);
          }
        },
      },
    ]
  );
};

  return (
    <BackgroundLayout>
      <SafeAreaView className="flex-1">
        <StatusBar barStyle="light-content" />
        <NavigationBar variant="simple" />

        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 100 }}
        >
          <View className="px-4 pt-4">
            <Text className="text-2xl font-bold text-white">
              Configuración
            </Text>

            <Text className="mt-1 text-sm text-slate-400">
              Gestiona tu cuenta y preferencias.
            </Text>
          </View>

          <View className="px-4 pt-6">
            <Text className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">
              Cuenta
            </Text>

            <View className="overflow-hidden rounded-2xl border border-slate-700/60 bg-slate-900/75">
              <SettingsRow
                icon={KeyRound}
                title="Cambiar contraseña"
                subtitle="Actualiza la contraseña de acceso"
                onPress={handleChangePassword}
              />

              <View className="h-px bg-slate-700/60" />

              <SettingsRow
                icon={LogOut}
                title="Cerrar sesión"
                subtitle="Salir de tu cuenta en este dispositivo"
                onPress={handleLogout}
              />
            </View>
          </View>

          <View className="px-4 pt-6">
            <Text className="mb-3 text-xs font-bold uppercase tracking-wider text-red-300/80">
              Zona peligrosa
            </Text>

            <View className="overflow-hidden rounded-2xl border border-red-500/30 bg-red-950/20">
              <SettingsRow
                icon={Trash2}
                title="Eliminar cuenta"
                subtitle="Borra tu cuenta y tus datos asociados"
                danger
                onPress={handleDeleteAccount}
              />
            </View>
          </View>
        </ScrollView>

        <BottomNavigation />
      </SafeAreaView>
    </BackgroundLayout>
  );
}

type SettingsRowProps = {
  icon: React.ComponentType<{ size?: number; color?: string }>;
  title: string;
  subtitle?: string;
  danger?: boolean;
  onPress: () => void;
};

function SettingsRow({
  icon: Icon,
  title,
  subtitle,
  danger = false,
  onPress,
}: SettingsRowProps) {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      className="flex-row items-center px-4 py-4"
    >
      <View
        className={`mr-3 h-10 w-10 items-center justify-center rounded-xl ${
          danger ? 'bg-red-500/15' : 'bg-purple-600/15'
        }`}
      >
        <Icon size={20} color={danger ? '#f87171' : '#c084fc'} />
      </View>

      <View className="flex-1">
        <Text
          className={`text-sm font-bold ${
            danger ? 'text-red-300' : 'text-white'
          }`}
        >
          {title}
        </Text>

        {subtitle ? (
          <Text className="mt-0.5 text-xs text-slate-400">
            {subtitle}
          </Text>
        ) : null}
      </View>

      <Text className="text-xl text-slate-500">
        ›
      </Text>
    </TouchableOpacity>
  );
}