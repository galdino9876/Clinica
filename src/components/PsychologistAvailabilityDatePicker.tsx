import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAuth } from "@/context/AuthContext";
import { User } from "@/types/user";

interface PsychologistAvailabilityDatePickerProps {
  date: Date;
  onDateChange: (date: Date) => void;
  psychologistId: string;
  className?: string;
}

const PsychologistAvailabilityDatePicker = ({
  date,
  onDateChange,
  psychologistId,
  className,
}: PsychologistAvailabilityDatePickerProps) => {
  const [selectedDate, setSelectedDate] = useState<Date>(date);
  const { users } = useAuth();
  const [psychologist, setPsychologist] = useState<User | null>(null);

  // Encontra o psicólogo selecionado quando o ID muda
  useEffect(() => {
    if (psychologistId) {
      const found = users.find((user) => user.id === psychologistId);
      setPsychologist(found || null);
    } else {
      setPsychologist(null);
    }
  }, [psychologistId, users]);

  // Quando a data é alterada, notifica o componente pai
  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
      onDateChange(date);
    }
  };

  // Função para determinar se um dia está disponível para o psicólogo
  const isPsychologistAvailable = (date: Date) => {
    if (!psychologist || !psychologist.workingHours) return false;
    
    const dayOfWeek = date.getDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6;
    
    // Verifica se o psicólogo trabalha neste dia da semana
    return psychologist.workingHours.some(wh => wh.dayOfWeek === dayOfWeek);
  };

  // Função para adicionar classes específicas a diferentes dias no calendário
  const modifiersStyles = {
    available: {
      backgroundColor: "rgba(52, 211, 153, 0.15)",
    },
  };

  // Personaliza o estilo dos dias no calendário
  const getDayClassName = (date: Date) => {
    if (isPsychologistAvailable(date)) {
      return "bg-emerald-100 hover:bg-emerald-200";
    }
    return "";  // Return empty string instead of undefined
  };

  return (
    <div className={className}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-full justify-start text-left font-normal",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {selectedDate ? format(selectedDate, "dd/MM/yyyy") : "Selecione uma data"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleDateSelect}
            modifiersStyles={modifiersStyles}
            modifiers={{
              available: (date) => isPsychologistAvailable(date)
            }}
            className={cn("p-3 pointer-events-auto")}
            classNames={{
              day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
              day: (date) => cn(getDayClassName(date))
            }}
          />
          <div className="p-3 border-t">
            <div className="flex items-center text-sm">
              <div className="w-3 h-3 rounded-full bg-emerald-400 mr-2"></div>
              <span>Dias disponíveis do psicólogo</span>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default PsychologistAvailabilityDatePicker;
