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

  const handleInputFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    // Permitir que o usuário clique e edite diretamente
    if (!disabled) {
      e.target.select();
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
          className={`flex items-center gap-2 w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 ${
            disabled ? 'bg-gray-50 cursor-not-allowed opacity-50' : 'hover:border-gray-400'
          }`}
        >
          <Clock className="h-4 w-4 text-gray-400" />
          <input
            ref={inputRef}
            type="time"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            onFocus={handleInputFocus}
            placeholder={placeholder}
            disabled={disabled}
            step="300"
            className="flex-1 bg-transparent border-none outline-none text-sm cursor-text"
            title="Digite o horário diretamente (formato: HH:MM)"
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
