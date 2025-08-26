
import React, { useState, useEffect } from "react";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Calendar as CalendarIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface PsychologistAvailabilityDatePickerProps {
  date: Date;
  onDateChange: (date: Date) => void;
  selectedDates: Date[];
  onDatesChange: (dates: Date[]) => void;
  psychologistId?: string;
  disabled?: boolean;
}

interface WorkingHour {
  day_of_week: number;
  start_time: string;
  end_time: string;
}

const PsychologistAvailabilityDatePicker = ({
  date,
  onDateChange,
  selectedDates,
  onDatesChange,
  psychologistId,
  disabled = false
}: PsychologistAvailabilityDatePickerProps) => {
  const [open, setOpen] = useState(false);
  const [workingHours, setWorkingHours] = useState<WorkingHour[]>([]);
  const [isLoadingHours, setIsLoadingHours] = useState(false);
  const [hasLoadedHours, setHasLoadedHours] = useState(false);
  const [currentPsychologistId, setCurrentPsychologistId] = useState<string | undefined>(undefined);

  // Monitorar mudanças no psychologistId e limpar dados anteriores
  useEffect(() => {
    if (psychologistId !== currentPsychologistId) {
      // Psicólogo mudou, limpar dados anteriores
      setWorkingHours([]);
      setHasLoadedHours(false);
      setIsLoadingHours(false);
      setCurrentPsychologistId(psychologistId);
      
      // Não definir data automaticamente - deixar o usuário escolher
      // if (psychologistId) {
      //   onDateChange(new Date()); // Reset para data atual
      // }
    }
  }, [psychologistId, currentPsychologistId]);

  // Função para buscar horários de trabalho do psicólogo
  const fetchWorkingHours = async () => {
    if (!psychologistId) {
      setWorkingHours([]);
      return;
    }

    setIsLoadingHours(true);
    try {
      // Usar o mesmo webhook do calendário principal
      const response = await fetch(`https://webhook.essenciasaudeintegrada.com.br/webhook/d52c9494-5de9-4444-877e-9e8d01662962/working_hours/${psychologistId}`);
      
      if (response.ok) {
        const data = await response.json();
        const fetchedWorkingHours = Array.isArray(data) ? data : data.data || [];
        setWorkingHours(fetchedWorkingHours);
        setHasLoadedHours(true);
        
        // Não definir data automaticamente - deixar o usuário escolher
        // if (!date) {
        //   const today = new Date();
        //   for (let i = 0; i < 30; i++) {
        //     const checkDate = new Date(today);
        //     checkDate.setDate(today.getDate() + i);
        //     
        //     const dayOfWeek = checkDate.getDay();
        //     const isWorkingDay = fetchedWorkingHours.some(
        //       (wh) => wh.day_of_week === dayOfWeek
        //     );
        //     
        //     if (isWorkingDay) {
        //       onDateChange(checkDate);
        //       break;
        //     }
        //   }
        // }
      } else {
        console.error('Erro ao buscar horários de trabalho:', response.status);
        setWorkingHours([]);
      }
    } catch (error) {
      console.error('Erro ao buscar horários de trabalho:', error);
      setWorkingHours([]);
    } finally {
      setIsLoadingHours(false);
    }
  };

  // Função para abrir o calendário e buscar dados se necessário
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen && psychologistId && !hasLoadedHours) {
      // Primeira vez abrindo com este psicólogo, buscar dados
      fetchWorkingHours();
    }
    setOpen(newOpen);
  };

  // Função para determinar quais dias devem ser desabilitados
  const disabledDays = (date: Date) => {
    // Se não há psicólogo selecionado ou dados não carregados, desabilita todos os dias
    if (!psychologistId || !hasLoadedHours || workingHours.length === 0) return true;

    const dayOfWeek = date.getDay();
    const isWorkingDay = workingHours.some(
      (wh) => wh.day_of_week === dayOfWeek
    );

    // Se NÃO for dia de trabalho, desabilita
    return !isWorkingDay;
  };

  // Verificar se o mini calendário deve estar habilitado
  const isCalendarEnabled = psychologistId && hasLoadedHours && workingHours.length > 0;

  // Função para selecionar data
  const handleDateSelect = (selectedDate: Date | undefined) => {
    if (selectedDate) {
      // Verificar se a data já está selecionada
      const isAlreadySelected = selectedDates.some(
        date => date.toDateString() === selectedDate.toDateString()
      );
      
      if (isAlreadySelected) {
        // Se já está selecionada, remover
        const newDates = selectedDates.filter(
          date => date.toDateString() !== selectedDate.toDateString()
        );
        onDatesChange(newDates);
        
        // Se era a data principal, limpar
        if (date && date.toDateString() === selectedDate.toDateString()) {
          onDateChange(new Date());
        }
      } else {
        // Se não está selecionada, adicionar
        const newDates = [...selectedDates, selectedDate].sort(
          (a, b) => a.getTime() - b.getTime()
        );
        onDatesChange(newDates);
        
        // Definir como data principal se for a primeira
        if (selectedDates.length === 0) {
          onDateChange(selectedDate);
        }
      }
      
      // Não fechar o calendário automaticamente para permitir seleção múltipla
      // setOpen(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal",
            !date && "text-muted-foreground",
            (!psychologistId || disabled) && "opacity-50 cursor-not-allowed"
          )}
          disabled={!psychologistId || disabled}
          onClick={() => {
            if (!psychologistId) {
              alert("Selecione um psicólogo primeiro para ver as datas disponíveis");
            }
          }}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {!psychologistId ? (
            <span>Selecione um psicólogo primeiro</span>
          ) : isLoadingHours ? (
            <span>Carregando disponibilidade...</span>
          ) : !hasLoadedHours ? (
            <span>Clique para ver datas disponíveis</span>
          ) : workingHours.length === 0 ? (
            <span>Psicólogo sem horários configurados</span>
          ) : selectedDates.length > 0 ? (
            <span>{selectedDates.length} data(s) selecionada(s)</span>
          ) : (
            <span>Selecione a data</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        {isLoadingHours ? (
          <div className="p-6 text-center">
            <div className="text-sm text-gray-600">Carregando disponibilidade...</div>
          </div>
        ) : hasLoadedHours && workingHours.length > 0 ? (
          <>
            <div className="p-3 border-b">
              <div className="text-sm font-medium text-gray-700 mb-2">Legenda:</div>
              <div className="flex items-center gap-2 text-xs">
                <div className="w-3 h-3 bg-green-100 border border-green-300 rounded"></div>
                <span>Dias disponíveis</span>
              </div>
            </div>
            <Calendar
              mode="multiple"
              selected={selectedDates}
              onSelect={(dates) => {
                if (dates) {
                  onDatesChange(dates);
                }
              }}
              disabled={disabledDays}
              initialFocus
              locale={ptBR}
              className="pointer-events-auto psychologist-mini-calendar"
            />
            
            {/* Mostrar datas selecionadas */}
            {selectedDates.length > 0 && (
              <div className="p-3 border-t">
                <div className="text-sm font-medium text-gray-700 mb-2">
                  Datas selecionadas: {selectedDates.length}
                </div>
                <div className="space-y-1">
                  {selectedDates.map((selectedDate, index) => (
                    <div key={index} className="text-xs text-gray-600">
                      {format(selectedDate, "dd/MM/yyyy (EEEE)", { locale: ptBR })}
                    </div>
                  ))}
                </div>
                <Button 
                  onClick={() => setOpen(false)} 
                  className="w-full mt-3"
                  size="sm"
                >
                  Confirmar seleção
                </Button>
              </div>
            )}
          </>
        ) : hasLoadedHours && workingHours.length === 0 ? (
          <div className="p-6 text-center">
            <div className="text-sm text-gray-600">Este psicólogo não possui horários configurados</div>
          </div>
        ) : null}
      </PopoverContent>
    </Popover>
  );
};

export default PsychologistAvailabilityDatePicker;
