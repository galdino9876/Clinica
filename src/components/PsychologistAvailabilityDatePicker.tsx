
import React, { useState, useEffect } from "react";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Calendar as CalendarIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAuth } from "@/context/AuthContext";

interface PsychologistAvailabilityDatePickerProps {
  date: Date;
  onDateChange: (date: Date) => void;
  psychologistId?: string;
  disabled?: boolean; // Add disabled prop
  onPsychologistChange?: (psychologistId: string) => void; // Add new prop to listen to psychologist changes
}

const PsychologistAvailabilityDatePicker = ({
  date,
  onDateChange,
  psychologistId,
  disabled = false, // Default to false (not disabled)
  onPsychologistChange
}: PsychologistAvailabilityDatePickerProps) => {
  const [open, setOpen] = useState(false);
  const { users } = useAuth();
  const [nextAvailableDate, setNextAvailableDate] = useState<Date | null>(null);

  // Listen to psychologist changes and find the next available date
  useEffect(() => {
    if (psychologistId && !disabled && onPsychologistChange) {
      // If we have a psychologist and date is not locked, find next available date
      const psychologist = users.find((u) => u.id === psychologistId);
      if (psychologist && psychologist.workingHours) {
        // Find the next available date based on working hours
        const today = new Date();
        for (let i = 0; i < 30; i++) { // Check for the next 30 days
          const checkDate = new Date(today);
          checkDate.setDate(today.getDate() + i);
          
          const dayOfWeek = checkDate.getDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6;
          const isWorkingDay = psychologist.workingHours.some(
            (wh) => wh.dayOfWeek === dayOfWeek
          );
          
          if (isWorkingDay) {
            setNextAvailableDate(checkDate);
            // Set the next available date automatically
            onDateChange(checkDate);
            break;
          }
        }
      }
    }
  }, [psychologistId, disabled, onPsychologistChange, users, onDateChange]);

  // Function to determine which days should be disabled based on psychologist availability
  const disabledDays = (date: Date) => {
    // If no psychologist is selected, don't disable any days
    if (!psychologistId) return false;

    const psychologist = users.find((u) => u.id === psychologistId);
    if (!psychologist || !psychologist.workingHours) return false;

    const dayOfWeek = date.getDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6;
    const isWorkingDay = psychologist.workingHours.some(
      (wh) => wh.dayOfWeek === dayOfWeek
    );

    // If it's a working day, don't disable it
    return !isWorkingDay;
  };

  return (
    <Popover open={open && !disabled} onOpenChange={disabled ? undefined : setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal",
            !date && "text-muted-foreground",
            disabled && "opacity-70 cursor-not-allowed"
          )}
          disabled={disabled}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, "PPP", { locale: ptBR }) : <span>Selecione a data</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={(date) => {
            if (date) {
              onDateChange(date);
              setOpen(false);
            }
          }}
          disabled={disabledDays}
          initialFocus
          locale={ptBR}
          className="pointer-events-auto"
        />
      </PopoverContent>
    </Popover>
  );
};

export default PsychologistAvailabilityDatePicker;
