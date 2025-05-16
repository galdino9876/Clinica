
import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { WorkingHours } from "@/types/user";
import { Plus, Trash2 } from "lucide-react";

interface WorkingHoursSelectorProps {
  workingHours: WorkingHours[];
  onChange: (workingHours: WorkingHours[]) => void;
}

const daysOfWeek = [
  { value: 0, label: "Domingo" },
  { value: 1, label: "Segunda" },
  { value: 2, label: "Terça" },
  { value: 3, label: "Quarta" },
  { value: 4, label: "Quinta" },
  { value: 5, label: "Sexta" },
  { value: 6, label: "Sábado" },
];

const WorkingHoursSelector = ({ workingHours, onChange }: WorkingHoursSelectorProps) => {
  const handleAddWorkingHour = () => {
    onChange([
      ...workingHours,
      { dayOfWeek: 1, startTime: "09:00", endTime: "18:00" },
    ]);
  };

  const handleDayChange = (index: number, day: 0 | 1 | 2 | 3 | 4 | 5 | 6) => {
    const updatedHours = [...workingHours];
    updatedHours[index] = { ...updatedHours[index], dayOfWeek: day };
    onChange(updatedHours);
  };

  const handleStartTimeChange = (index: number, time: string) => {
    const updatedHours = [...workingHours];
    updatedHours[index] = { ...updatedHours[index], startTime: time };
    onChange(updatedHours);
  };

  const handleEndTimeChange = (index: number, time: string) => {
    const updatedHours = [...workingHours];
    updatedHours[index] = { ...updatedHours[index], endTime: time };
    onChange(updatedHours);
  };

  const handleRemoveWorkingHour = (index: number) => {
    const updatedHours = workingHours.filter((_, i) => i !== index);
    onChange(updatedHours);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <Label>Horários Disponíveis</Label>
        <Button 
          type="button" 
          variant="outline" 
          size="sm" 
          onClick={handleAddWorkingHour}
        >
          <Plus className="h-4 w-4 mr-1" /> Adicionar Horário
        </Button>
      </div>

      {workingHours.length === 0 && (
        <div className="text-sm text-muted-foreground">
          Nenhum horário configurado. Clique em "Adicionar Horário" para configurar a disponibilidade.
        </div>
      )}

      {workingHours.map((workingHour, index) => (
        <div key={index} className="flex flex-wrap gap-4 p-3 border rounded-md bg-muted/20">
          <div className="w-full md:w-auto">
            <Label className="mb-1 block">Dia da semana</Label>
            <div className="flex flex-wrap gap-2">
              {daysOfWeek.map((day) => (
                <div key={day.value} className="flex items-center">
                  <Checkbox
                    id={`day-${index}-${day.value}`}
                    checked={workingHour.dayOfWeek === day.value}
                    onCheckedChange={() => 
                      handleDayChange(index, day.value as 0 | 1 | 2 | 3 | 4 | 5 | 6)
                    }
                  />
                  <label 
                    htmlFor={`day-${index}-${day.value}`}
                    className="ml-2 text-sm font-medium"
                  >
                    {day.label}
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-end gap-2">
            <div>
              <Label htmlFor={`start-time-${index}`} className="mb-1 block">Início</Label>
              <Input
                id={`start-time-${index}`}
                type="time"
                value={workingHour.startTime}
                onChange={(e) => handleStartTimeChange(index, e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor={`end-time-${index}`} className="mb-1 block">Fim</Label>
              <Input
                id={`end-time-${index}`}
                type="time"
                value={workingHour.endTime}
                onChange={(e) => handleEndTimeChange(index, e.target.value)}
              />
            </div>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => handleRemoveWorkingHour(index)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default WorkingHoursSelector;
