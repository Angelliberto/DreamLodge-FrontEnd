import React from "react";
import {
  Control,
  Controller,
  FieldErrors,
  FieldValues,
  Path,
  RegisterOptions,
} from "react-hook-form";
import { Text, TextInputProps, TouchableOpacity, View } from "react-native";
import { Eye, EyeOff } from "lucide-react-native";
import { Input } from "./input";

type FormInputFieldProps<T extends FieldValues> = TextInputProps & {
  label: string;
  name: Path<T>;
  control: Control<T>;
  errors: FieldErrors<T>;
  rules?: RegisterOptions<T, Path<T>>;
  icon?: React.ReactNode;
  helperText?: string;
  showPasswordToggle?: boolean;
};

export function FormInputField<T extends FieldValues>({
  label,
  name,
  control,
  errors,
  rules,
  icon,
  helperText,
  className = "",
  secureTextEntry = false,
  showPasswordToggle = false,
  ...props
}: FormInputFieldProps<T>) {
  const error = errors[name]?.message?.toString();
  const [isPasswordVisible, setIsPasswordVisible] = React.useState(false);

  const inputSecureTextEntry = showPasswordToggle
    ? !isPasswordVisible
    : secureTextEntry;

  return (
    <View>
      <Text className="text-slate-300 py-2 text-sm font-medium">{label}</Text>

      <View className="relative">
        <Controller
          control={control}
          name={name}
          rules={rules}
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              value={value ?? ""}
              onChangeText={onChange}
              onBlur={onBlur}
              secureTextEntry={inputSecureTextEntry}
              className={`pl-10 ${showPasswordToggle ? "pr-10" : ""} ${
                error ? "border-red-500" : ""
              } ${className}`}
              {...props}
            />
          )}
        />

        {icon ? <View className="absolute left-3 top-3.5">{icon}</View> : null}

        {showPasswordToggle ? (
          <TouchableOpacity
            onPress={() => setIsPasswordVisible((prev) => !prev)}
            className="absolute right-3 top-3.5"
            activeOpacity={0.7}
          >
            {isPasswordVisible ? (
              <EyeOff size={18} color="#64748b" />
            ) : (
              <Eye size={18} color="#64748b" />
            )}
          </TouchableOpacity>
        ) : null}
      </View>

      {error ? (
        <Text className="text-red-400 text-xs mt-1">{error}</Text>
      ) : helperText ? (
        <Text className="text-slate-500 text-xs mt-1">{helperText}</Text>
      ) : null}
    </View>
  );
}