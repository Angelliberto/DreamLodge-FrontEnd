import React from 'react';
import { TouchableOpacity, Text, TouchableOpacityProps, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { cssInterop } from 'nativewind';

// Configuración mínima necesaria para que NativeWind entienda el gradiente
cssInterop(LinearGradient, {
  className: 'style',
});

interface ButtonProps extends TouchableOpacityProps {
  variant?: 'primary' | 'outline';
  title: string;
  loading?: boolean;
  icon?: React.ReactNode;
  className?: string;
}

export function Button({ variant = 'primary', title, className = "", loading, icon, ...props }: ButtonProps) {
  const baseStyle = "h-12 rounded-xl flex-row items-center justify-center px-6";
  
  if (variant === 'primary') {
    return (
      <TouchableOpacity activeOpacity={0.8} {...props} disabled={loading}>
        <LinearGradient
          colors={['#7c3aed', '#db2777']} // Purple to Pink
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          className={`${baseStyle} ${className}`}
          style={{ borderRadius: 12 }} 
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              {icon}
              <Text className="text-white font-bold text-base ml-2">{title}</Text>
            </>
          )}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  // Outline variant
  return (
    <TouchableOpacity 
      className={`${baseStyle} border border-white/10 bg-white/5 ${className}`}
      activeOpacity={0.7}
      {...props}
      disabled={loading}
    >
       {icon}
       <Text className="text-white font-medium text-base ml-2">{title}</Text>
    </TouchableOpacity>
  );
}