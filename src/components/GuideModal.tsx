import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Calendar as CalendarIcon, X, Save } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

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
  const [calendarOpen, setCalendarOpen] = useState(false);

  // Filtrar datas que precisam de guias - usar as datas exatas da API
  const datesNeedingGuides = (patient.datas || [])
    .filter(data => data.agendamento === "ok" && data.guia === "falta")
    .map(data => {
      // Converter DD/MM/YYYY para Date
      const [day, month, year] = data.data.split('/');
      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    })
    .sort((a, b) => a.getTime() - b.getTime());

  // Inicializar com datas que precisam de guia selecionadas
  useEffect(() => {
    if (isOpen) {
      console.log('=== INICIALIZAÇÃO DO MODAL ===');
      console.log('patient.datas:', patient.datas);
      console.log('datesNeedingGuides:', datesNeedingGuides);
      
      if (datesNeedingGuides.length > 0) {
        console.log('Inicializando com datas que precisam de guia');
        setSelectedDates(datesNeedingGuides);
      } else {
        console.log('Nenhuma data precisa de guia, iniciando vazio');
        setSelectedDates([]);
      }
    }
  }, [isOpen]);




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
    setCalendarOpen(false);
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

          {/* Seletor de datas */}
          <div className="space-y-4">
            <Label>Selecione as datas para criar guias:</Label>
            
            {/* Mini Calendário */}
            <div className="space-y-2">
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDates.length > 0 ? (
                      `${selectedDates.length} data(s) selecionada(s)`
                    ) : (
                      "Selecione as datas"
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="multiple"
                    selected={selectedDates}
                    onSelect={(dates) => {
                      if (dates) {
                        console.log('🖱️ CLIQUE NO MINI CALENDÁRIO');
                        console.log('dates recebidas:', dates.map(d => format(d, 'dd/MM/yyyy')));
                        setSelectedDates(dates);
                      }
                    }}
                    locale={ptBR}
                    className="rounded-md"
                    modifiers={{
                      needsGuideAndSelected: datesNeedingGuides.filter(date => 
                        selectedDates.some(selected => 
                          format(selected, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
                        )
                      ),
                    }}
                    modifiersStyles={{
                      needsGuideAndSelected: {
                        backgroundColor: '#fef3c7',
                        border: '2px solid #f59e0b',
                        color: '#92400e',
                        fontWeight: 'bold'
                      }
                    }}
                  />
                </PopoverContent>
              </Popover>
              
              {/* Informação sobre as datas sugeridas */}
              {datesNeedingGuides.length > 0 && (
                <div className="text-xs text-gray-600 p-2 bg-amber-50 border border-amber-200 rounded-lg">
                  💡 <strong>Dica:</strong> As datas destacadas em amarelo no calendário são sugestões que precisam de guia. 
                  Clique nelas para selecionar/deselecionar.
                </div>
              )}
            </div>
            
            {/* Mostrar datas selecionadas */}
            {selectedDates.length > 0 && (
              <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                <div className="text-sm font-medium text-gray-700 mb-2">
                  {selectedDates.length} data(s) selecionada(s)
                </div>
                <div className="text-sm text-gray-600">
                  Datas selecionadas: {selectedDates.map((date, index) => {
                    const isNeedingGuide = datesNeedingGuides.some(d => 
                      format(d, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
                    );
                    return (
                      <span key={index} className={`font-semibold ${
                        isNeedingGuide ? 'text-amber-600' : 'text-green-600'
                      }`}>
                        {format(date, "dd/MM")}
                        {isNeedingGuide && " (precisa guia)"}
                        {index < selectedDates.length - 1 && " "}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
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
