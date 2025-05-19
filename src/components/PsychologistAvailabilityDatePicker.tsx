
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
  const [availableDays, setAvailableDays] = useState<(0 | 1 | 2 | 3 | 4 | 5 | 6)[]>([]);

  // Log the initial date passed to the component for debugging
  useEffect(() => {
    console.log("DatePicker received date:", date);
  }, [date]); // Added date as dependency to respond to external date changes

  // Update selectedDate when the external date prop changes
  useEffect(() => {
    setSelectedDate(date);
  }, [date]);

  // Encontra o psicólogo selecionado quando o ID muda
  useEffect(() => {
    if (psychologistId) {
      const found = users.find((user) => user.id === psychologistId);
      setPsychologist(found || null);

      // Determine available days for this psychologist
      if (found && found.workingHours) {
        const days = found.workingHours.map(wh => wh.dayOfWeek);
        setAvailableDays(days);
      } else {
        setAvailableDays([]);
      }
    } else {
      setPsychologist(null);
      setAvailableDays([]);
    }
  }, [psychologistId, users]);

  // Quando a data é alterada, notifica o componente pai
  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      console.log("Date selected in DatePicker:", date);
      
      // Create a new Date object to avoid reference issues
      const newDate = new Date(date);
      setSelectedDate(newDate);
      onDateChange(newDate);
    }
  };

  // Função para determinar se um dia está disponível para o psicólogo
  const isPsychologistAvailable = (date: Date) => {
    if (!psychologist || !psychologist.workingHours || availableDays.length === 0) return true;
    const dayOfWeek = date.getDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6;
    return availableDays.includes(dayOfWeek);
  };

  // Componente de decoração para dias disponíveis
  const DayContent = (props: any) => {
    const isAvailable = isPsychologistAvailable(props.date);
    return (
      <div 
        className={cn(
          "w-full h-full flex items-center justify-center rounded-full",
          isAvailable && psychologistId ? "bg-emerald-100" : "",
          !isAvailable && psychologistId ? "bg-gray-100 text-gray-400" : ""
        )}
      >
        {props.date.getDate()}
      </div>
    );
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
            className="p-3 pointer-events-auto"
            components={{
              DayContent
            }}
            modifiers={{
              available: (date) => isPsychologistAvailable(date)
            }}
            modifiersStyles={{
              available: {
                backgroundColor: psychologistId ? "rgba(52, 211, 153, 0.15)" : "transparent",
              }
            }}
          />
          {psychologistId && (
            <div className="p-3 border-t">
              <div className="flex items-center text-sm">
                <div className="w-3 h-3 rounded-full bg-emerald-400 mr-2"></div>
                <span>Dias disponíveis do psicólogo</span>
              </div>
              {availableDays.length > 0 && (
                <div className="text-xs mt-1 text-gray-500">
                  Dias: {availableDays.map(day => {
                    const weekdays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
                    return weekdays[day];
                  }).join(", ")}
                </div>
              )}
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default PsychologistAvailabilityDatePicker;
