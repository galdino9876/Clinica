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
            onChange={onChange}
            onBlur={onBlur}
            placeholder={placeholder || "Digite..."}
            disabled={disabled}
            maxLength={maxLength}
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
