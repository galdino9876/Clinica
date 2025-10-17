import React, { useRef } from 'react';
import { Clock } from 'lucide-react';

interface TimePickerProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  required?: boolean;
}

const TimePicker: React.FC<TimePickerProps> = ({
  value,
  onChange,
  label,
  placeholder = "Selecione o horário",
  disabled = false,
  error,
  required = false
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleContainerClick = () => {
    if (!disabled && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.click(); // Simular clique no input para abrir o picker
      // Tentar abrir o picker nativo do navegador (método moderno)
      if ('showPicker' in inputRef.current) {
        try {
          (inputRef.current as any).showPicker();
        } catch (error) {
          // Fallback: apenas focar no input
          console.log('showPicker não suportado neste navegador');
        }
      }
    }
  };

  const handleInputClick = (e: React.MouseEvent<HTMLInputElement>) => {
    // Prevenir que o clique no input feche o seletor
    e.stopPropagation();
    if (!disabled) {
      // Tentar abrir o picker diretamente
      if ('showPicker' in e.target) {
        try {
          (e.target as any).showPicker();
        } catch (error) {
          // Fallback: apenas focar no input
          console.log('showPicker não suportado neste navegador');
        }
      }
    }
  };
  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <div className="relative">
        <div 
          className={`flex items-center gap-2 w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 cursor-pointer ${
            disabled ? 'bg-gray-50 cursor-not-allowed opacity-50' : 'hover:border-gray-400'
          }`}
          onClick={handleContainerClick}
        >
          <Clock className="h-4 w-4 text-gray-400" />
          <input
            ref={inputRef}
            type="time"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            disabled={disabled}
            className="flex-1 bg-transparent border-none outline-none text-sm cursor-pointer"
            title="Selecione o horário"
            onClick={handleInputClick}
          />
        </div>
      </div>

      {error && (
        <p className="text-red-500 text-xs mt-1">{error}</p>
      )}
    </div>
  );
};

export default TimePicker;
