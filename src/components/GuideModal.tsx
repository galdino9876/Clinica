import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { Calendar as CalendarIcon, X, Save } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface GuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient: {
    patient_id: number;
    paciente_nome: string;
    datas?: Array<{
      data: string;
      agendamento: string;
      guia: string;
      numero_prestador: number | string | null;
    }>;
  };
  onSuccess: () => void;
}

const GuideModal: React.FC<GuideModalProps> = ({
  isOpen,
  onClose,
  patient,
  onSuccess
}) => {
  const [numeroPrestador, setNumeroPrestador] = useState<string>("");
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filtrar datas que precisam de guias - usar as datas exatas da API
  const datesNeedingGuides = (patient.datas || [])
    .filter(data => data.agendamento === "ok" && data.guia === "falta")
    .map(data => {
      // Converter DD/MM/YYYY para Date
      const [day, month, year] = data.data.split('/');
      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    })
    .sort((a, b) => a.getTime() - b.getTime());

  // Selecionar automaticamente as datas que precisam de guias
  useEffect(() => {
    if (isOpen && datesNeedingGuides.length > 0) {
      setSelectedDates(datesNeedingGuides);
    }
  }, [isOpen, datesNeedingGuides]);

  const handleDateSelect = (dates: Date[] | undefined) => {
    if (!dates) return;
    setSelectedDates(dates);
  };

  const isDateSelected = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return selectedDates.some(d => format(d, 'yyyy-MM-dd') === dateStr);
  };

  const isDateNeedingGuide = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return datesNeedingGuides.some(d => format(d, 'yyyy-MM-dd') === dateStr);
  };

  const handleSubmit = async () => {
    if (!numeroPrestador.trim()) {
      setError("Número de prestador é obrigatório");
      return;
    }

    if (selectedDates.length === 0) {
      setError("Selecione pelo menos uma data");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Preparar dados da guia
      const guiaData: any = {
        numero_prestador: Number(numeroPrestador),
        id_patient: patient.patient_id,
        date_1: "",
        date_2: "",
        date_3: "",
        date_4: "",
        date_5: ""
      };

      // Preencher as datas selecionadas
      selectedDates.slice(0, 5).forEach((date, index) => {
        const dateKey = `date_${index + 1}` as keyof typeof guiaData;
        guiaData[dateKey] = format(date, "yyyy-MM-dd");
      });

      // Enviar para a API de guias
      const response = await fetch("https://webhook.essenciasaudeintegrada.com.br/webhook/insert_date_guias", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(guiaData),
      });

      if (!response.ok) {
        throw new Error(`Erro ao criar guias: ${response.status}`);
      }

      const result = await response.json();
      console.log('Guias criadas com sucesso:', result);
      
      onSuccess();
      onClose();
      
    } catch (error) {
      console.error('Erro ao criar guias:', error);
      setError(error instanceof Error ? error.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setNumeroPrestador("");
    setSelectedDates([]);
    setError(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            Gerenciar Guias - {patient.paciente_nome}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Input do número de prestador */}
          <div className="space-y-2">
            <Label htmlFor="numeroPrestador">Número do Prestador</Label>
            <Input
              id="numeroPrestador"
              type="text"
              placeholder="Ex: 32113578"
              value={numeroPrestador}
              onChange={(e) => setNumeroPrestador(e.target.value)}
              disabled={loading}
            />
          </div>

          {/* Minicalendário */}
          <div className="space-y-2">
            <Label>Selecione as datas para criar guias:</Label>
            <div className="border rounded-lg p-4">
              <Calendar
                mode="multiple"
                selected={selectedDates}
                onSelect={handleDateSelect}
                locale={ptBR}
                className="rounded-md"
                modifiers={{
                  needsGuide: datesNeedingGuides,
                }}
                modifiersStyles={{
                  needsGuide: {
                    backgroundColor: '#fef3c7',
                    border: '1px solid #f59e0b',
                    color: '#92400e'
                  }
                }}
              />
            </div>
            <p className="text-sm text-gray-600">
              <span className="inline-block w-3 h-3 bg-amber-200 border border-amber-400 rounded mr-2"></span>
              Datas que precisam de guias
            </p>
          </div>

          {/* Mensagem de erro */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
              {error}
            </div>
          )}

          {/* Botões de ação */}
          <div className="flex justify-end pt-4">
            <div className="flex gap-2">
              <Button
                onClick={handleClose}
                variant="outline"
                disabled={loading}
              >
                <X className="h-4 w-4 mr-2" />
                Cancelar
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={loading || !numeroPrestador.trim() || selectedDates.length === 0}
                className="flex items-center gap-2"
              >
                <Save className="h-4 w-4" />
                {loading ? "Salvando..." : "Criar Guias"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GuideModal;
