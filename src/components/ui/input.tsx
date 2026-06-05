import React from "react";
import { TextInput, TextInputProps } from "react-native";
import { uiTokens } from "@/theme/tokens";

type InputProps = TextInputProps & {
  className?: string;
};

export function Input({ className = "", ...props }: InputProps) {
  const baseStyles =
    "flex h-12 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-base text-white";

  return (
    <TextInput
      placeholderTextColor={uiTokens.color.textMuted}
      className={`${baseStyles} ${className}`}
      {...props}
    />
  );
}