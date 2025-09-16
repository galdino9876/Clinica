"use client";

import React, { useEffect, useRef, forwardRef, ForwardedRef } from "react";
import { Control, useController, FieldErrors } from "react-hook-form";

import { twMerge } from "tailwind-merge";
import { BiErrorCircle, BiX } from "react-icons/bi";

interface InputDynamicProps {
  name: string;
  label?: string;
  control: Control<any>;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  errors?: FieldErrors;
  type?: string;
  onClear?: () => void;
  className?: string; // Adicionando className como opcional
  maxLength?: number; // Adicionando maxLength como opcional
}

export const InputDynamic = forwardRef<HTMLInputElement, InputDynamicProps>(
  (
    {
      name,
      label,
      control,
      placeholder,
      required = false,
      disabled = false,
      errors,
      type = "text",
      onClear,
      className,
      maxLength,
    },
    ref: ForwardedRef<HTMLInputElement>
  ) => {
    const {
      field: { value, onChange, onBlur, ...inputProps },
      fieldState: { error },
    } = useController({ name, control, rules: { required } });

    const inputRef = useRef<HTMLInputElement>(null);

    // Função para formatar telefone no formato DDD+9+número
    const formatPhone = (value: string) => {
      // Remove todos os caracteres não numéricos
      const numbers = value.replace(/\D/g, '');
      
      // Limita a 11 dígitos (DDD + 9 + 8 dígitos)
      const limitedNumbers = numbers.slice(0, 11);
      
      return limitedNumbers;
    };

    // Função para lidar com mudanças no input
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (type === 'tel') {
        const formattedValue = formatPhone(e.target.value);
        onChange(formattedValue);
      } else {
        onChange(e.target.value);
      }
    };

    useEffect(() => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }, [disabled]);

    return (
      <div>
        {label && (
          <label className="block text-sm font-semibold mb-1" htmlFor={name}>
            {label}
            {required && <span className="text-red-500">*</span>}
          </label>
        )}
        <div className={twMerge("relative", error && "bg-red-100 rounded-md", className)}>
          <input
            {...inputProps}
            ref={ref || inputRef}
            id={name}
            type={type}
            value={value ?? ""}
            onChange={handleChange}
            onBlur={onBlur}
            placeholder={placeholder || "Digite..."}
            disabled={disabled}
            maxLength={type === 'tel' ? 11 : maxLength}
            className={twMerge(
              "w-full border rounded px-3 py-2 text-sm",
              error ? "border-red-500" : "border-gray-300"
            )}
          />
          {value && onClear && (
            <button
              type="button"
              className="absolute right-2 top-2 text-red-500"
              onClick={onClear}
              tabIndex={-1}
            >
              <BiX />
            </button>
          )}
        </div>
        {(error || (errors && errors[name])) && (
          <span className="flex items-center gap-1 text-red-600 text-xs mt-1">
            <BiErrorCircle size={16} />
            {error?.message || (typeof errors?.[name]?.message === "string" ? errors?.[name]?.message : "")}
          </span>
        )}
      </div>
    );
  }
);

InputDynamic.displayName = "InputDynamic";
