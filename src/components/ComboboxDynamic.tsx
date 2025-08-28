"use client";

import React, { useState, useEffect, forwardRef, ForwardedRef } from "react";
import { Control, useController, FieldErrors } from "react-hook-form";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import "./ComboboxDynamic.css";

interface Option {
  id: string | number;
  label: string;
}

interface ComboboxDynamicProps {
  name: string;
  label?: string;
  control: Control<any>;
  options?: Option[];
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  errors?: FieldErrors;
  onClear?: () => void;
  onChange?: (value: string) => void;
  onFocus?: () => void;
  searchPlaceholder?: string;
  emptyMessage?: string;
}

export const ComboboxDynamic = forwardRef<HTMLButtonElement, ComboboxDynamicProps>(
  (
    {
      name,
      label,
      control,
      options = [],
      placeholder = "Selecione...",
      required = false,
      disabled = false,
      errors,
      onClear,
      onChange: customOnChange,
      onFocus: customOnFocus,
      searchPlaceholder = "Buscar...",
      emptyMessage = "Nenhuma opção encontrada.",
    },
    ref: ForwardedRef<HTMLButtonElement>
  ) => {
    const {
      field: { value, onChange, ...inputProps },
      fieldState: { error },
    } = useController({ name, control, rules: { required } });

    const [open, setOpen] = useState(false);
    const [searchValue, setSearchValue] = useState("");

    // Encontrar a opção selecionada
    const selectedOption = options.find(opt => opt.id === value);

    const handleSelect = (optionId: string | number) => {
      onChange(optionId);
      setOpen(false);
      setSearchValue("");
      
      if (customOnChange) {
        customOnChange(String(optionId));
      }
    };

    const handleFocus = () => {
      if (customOnFocus) {
        customOnFocus();
      }
    };

    // Filtrar opções baseado no texto digitado
    const filteredOptions = options.filter((option) =>
      option.label.toLowerCase().includes(searchValue.toLowerCase())
    );

    // Resetar o valor de busca quando o popover fechar
    useEffect(() => {
      if (!open) {
        setSearchValue("");
      }
    }, [open]);

    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-semibold mb-1" htmlFor={name}>
            {label}
            {required && <span className="text-red-500">*</span>}
          </label>
        )}
        
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              ref={ref}
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className={cn(
                "w-full justify-between",
                error ? "border-red-500" : "border-gray-300",
                disabled && "opacity-50 cursor-not-allowed"
              )}
              disabled={disabled}
              onClick={handleFocus}
            >
              {selectedOption ? selectedOption.label : placeholder}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          
          <PopoverContent className="w-full p-0" align="start">
            <div className="bg-white rounded-md border shadow-lg">
              <div className="flex items-center border-b px-3 py-2">
                <input
                  type="text"
                  placeholder={searchPlaceholder}
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  className="flex h-9 w-full rounded-md bg-transparent py-2 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
              <div 
                className="combobox-scroll-container"
                onWheel={(e) => {
                  e.preventDefault();
                  const container = e.currentTarget;
                  container.scrollTop += e.deltaY;
                }}
                tabIndex={0}
              >
                {filteredOptions.length === 0 ? (
                  <div className="py-6 text-center text-sm text-gray-500">
                    {emptyMessage}
                  </div>
                ) : (
                  <div className="p-1">
                    {filteredOptions.map((option) => (
                      <div
                        key={option.id}
                        onClick={() => handleSelect(option.id)}
                        className="combobox-item relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none"
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            value === option.id ? "opacity-100" : "opacity-0"
                          )}
                        />
                        {option.label}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* Exibição de erros */}
        {(error || (errors && errors[name])) && (
          <span className="flex items-center gap-1 text-red-600 text-xs mt-1">
            {error?.message || (typeof errors?.[name]?.message === "string" ? errors?.[name]?.message : "")}
          </span>
        )}
      </div>
    );
  }
);

ComboboxDynamic.displayName = "ComboboxDynamic";
