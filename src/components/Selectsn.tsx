"use client";

import React, { useEffect, useRef, useState, forwardRef, ForwardedRef } from "react";
import { Control, useController, FieldErrors } from "react-hook-form";

import { twMerge } from "tailwind-merge";
import { BiErrorCircle, BiX } from "react-icons/bi";

interface Option {
  id: string | number;
  label: string;
}

interface SelectDynamicProps {
  name: string;
  label?: string;
  control: Control<any>;
  options?: Option[];
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  errors?: FieldErrors;
  searchable?: boolean;
  onClear?: () => void;
  onChange?: (value: string) => void;
  onFocus?: () => void;
}

export const SelectDynamic = forwardRef<HTMLSelectElement, SelectDynamicProps>(
  (
    {
      name,
      label,
      control,
      options = [],
      placeholder,
      required = false,
      disabled = false,
      errors,
      searchable = false,
      onClear,
      onChange: customOnChange,
      onFocus: customOnFocus,
    },
    ref: ForwardedRef<HTMLSelectElement>
  ) => {
    const {
      field: { value, onChange, ...inputProps },
      fieldState: { error },
    } = useController({ name, control, rules: { required } });

    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      onChange(e);
      if (customOnChange) {
        customOnChange(e.target.value);
      }
    };

    const handleFocus = (e: React.FocusEvent<HTMLSelectElement>) => {
      if (customOnFocus) {
        customOnFocus();
      }
    };

    const [searchTerm, setSearchTerm] = useState("");
    const searchInputRef = useRef<HTMLInputElement>(null);

    const filteredOptions = options.filter((opt) =>
      !searchable || !searchTerm
        ? true
        : opt.label.toLowerCase().includes(searchTerm.toLowerCase())
    );

    useEffect(() => {
      if (searchable && searchInputRef.current) {
        searchInputRef.current.focus();
      }
    }, [searchable]);

    return (
      <div>
        {label && (
          <label className="block text-sm font-semibold mb-1" htmlFor={name}>
            {label}
            {required && <span className="text-red-500">*</span>}
          </label>
        )}
        <div className={twMerge("relative", error && "bg-red-100 rounded-md")}>
          {searchable && (
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="mb-2 w-full border px-2 py-1 rounded text-sm"
            />
          )}
          <select
            {...inputProps}
            ref={ref}
            id={name}
            value={value ?? ""}
            onChange={handleChange}
            onFocus={handleFocus}
            disabled={disabled}
            className={twMerge(
              "w-full border rounded px-3 py-2",
              error ? "border-red-500" : "border-gray-300"
            )}
          >
            <option value="">{placeholder || "Selecione..."}</option>
            {filteredOptions.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ))}
          </select>
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

SelectDynamic.displayName = "SelectDynamic";
