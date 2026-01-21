import React from 'react';
import { TextInput, TextInputProps } from 'react-native';

export function Input({ className = "", ...props }: TextInputProps) {
  // Estilos base fijos
  const baseStyles = "flex h-12 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-base text-white";
  
  return (
    <TextInput
      placeholderTextColor="#94a3b8"
      // Concatenamos las clases manualmente
      className={`${baseStyles} ${className}`}
      {...props}
    />
  );
}