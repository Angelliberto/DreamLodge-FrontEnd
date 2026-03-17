import React from "react";
import {
  Control,
  Controller,
  FieldErrors,
  FieldValues,
  Path,
  RegisterOptions,
} from "react-hook-form";
import { Text, TextInputProps, View } from "react-native";
import { Input } from "./input";

type FormInputFieldProps<T extends FieldValues> = TextInputProps & {
  label: string;
  name: Path<T>;
  control: Control<T>;
  errors: FieldErrors<T>;
  rules?: RegisterOptions<T, Path<T>>;
  icon?: React.ReactNode;
  helperText?: string;
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
  ...props
}: FormInputFieldProps<T>) {
  const error = errors[name]?.message?.toString();

  return (
    <View>
      <Text className="text-slate-300 mb-1.5 text-sm font-medium">{label}</Text>

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
              className={`pl-10 ${error ? "border-red-500" : ""} ${className}`}
              {...props}
            />
          )}
        />

        {icon ? <View className="absolute left-3 top-3.5">{icon}</View> : null}
      </View>

      {error ? (
        <Text className="text-red-400 text-xs mt-1">{error}</Text>
      ) : helperText ? (
        <Text className="text-slate-500 text-xs mt-1">{helperText}</Text>
      ) : null}
    </View>
  );
}