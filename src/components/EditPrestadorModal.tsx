import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar as CalendarIcon, Edit } from "lucide-react";
import { cn } from "@/lib/utils";

// Função para normalizar datas e evitar problemas de fuso horário
const normalizeDate = (dateStr: string): Date => {
  // Se a data já está no formato YYYY-MM-DD, usar diretamente
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return new Date(dateStr + 'T00:00:00');
  }
  
  // Para outros formatos, tentar parsear normalmente
  const date = new Date(dateStr);
  
  // Verificar se a data é válida
  if (isNaN(date.getTime())) {
    console.warn('Data inválida:', dateStr);
    return new Date();
  }
  
  return date;
};

interface PrestadorData {
  numero_prestador: number;
  datas: string[];
  existe_guia_autorizada: number;
  existe_guia_assinada: number;
  existe_guia_assinada_psicologo: number;
  date_faturado: string | null;
  faturado: number;
  data_validade?: string | null;
  data_vencimento?: string | null;
}

interface EditPrestadorModalProps {
  isOpen: boolean;
  onClose: () => void;
  prestador: PrestadorData | null;
  onSuccess: () => void;
}

const EditPrestadorModal: React.FC<EditPrestadorModalProps> = ({
  isOpen,
  onClose,
  prestador,
  onSuccess
}) => {
  const [numeroPrestador, setNumeroPrestador] = useState<string>('');
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [dataValidade, setDataValidade] = useState<Date | undefined>(undefined);
  const [dataVencimento, setDataVencimento] = useState<Date | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [validadeCalendarOpen, setValidadeCalendarOpen] = useState(false);
  const [vencimentoCalendarOpen, setVencimentoCalendarOpen] = useState(false);

  // Inicializar dados quando o modal abrir
  useEffect(() => {
    if (prestador && isOpen) {
      setNumeroPrestador(prestador.numero_prestador.toString());
      
      // Debug: verificar formato das datas
      console.log('Datas recebidas da API:', prestador.datas);
      
      // Converter datas string para Date objects usando normalização
      const dates = prestador.datas.map(dateStr => {
        console.log('Convertendo data:', dateStr, 'para Date:', normalizeDate(dateStr));
        return normalizeDate(dateStr);
      });
      setSelectedDates(dates);

      // Inicializar datas de validade e vencimento se existirem
      if (prestador.data_validade) {
        setDataValidade(normalizeDate(prestador.data_validade));
      } else {
        setDataValidade(undefined);
      }

      if (prestador.data_vencimento) {
        setDataVencimento(normalizeDate(prestador.data_vencimento));
      } else {
        setDataVencimento(undefined);
      }
    }
  }, [prestador, isOpen]);

  const handleDateSelect = (dates: Date[] | undefined) => {
    if (dates) {
      setSelectedDates(dates);
    }
  };

  const handleSubmit = async () => {
    if (!prestador) return;

    try {
      setLoading(true);
      setError(null);

      // Converter datas para formato string e organizar em data_1, data_2, etc.
      const datasFormatted = selectedDates.map(date => format(date, 'yyyy-MM-dd'));
      
      // Criar objeto com data_1, data_2, data_3, data_4, data_5
      const datasObject: { [key: string]: string | null } = {};
      for (let i = 1; i <= 5; i++) {
        datasObject[`data_${i}`] = datasFormatted[i - 1] || null;
      }

      const payload = {
        numero_prestador_new: numeroPrestador,
        numero_prestador_now: prestador.numero_prestador.toString(),
        ...datasObject,
        data_validade: dataValidade ? format(dataValidade, "yyyy-MM-dd") : "",
        data_vencimento: dataVencimento ? format(dataVencimento, "yyyy-MM-dd") : ""
      };

      const response = await fetch('https://webhook.essenciasaudeintegrada.com.br/webhook/edit_prestador', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Erro ao atualizar prestador: ${response.status}`);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setError(null);
    setCalendarOpen(false);
    setValidadeCalendarOpen(false);
    setVencimentoCalendarOpen(false);
    onClose();
  };

  // Detectar mudança no número de prestador
  useEffect(() => {
    if (prestador && numeroPrestador !== prestador.numero_prestador.toString() && numeroPrestador !== '') {
      console.log('Número de prestador alterado:', numeroPrestador);
    }
  }, [numeroPrestador, prestador]);

  if (!prestador) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="h-5 w-5" />
            Editar Prestador - {prestador.numero_prestador}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Input do número de prestador */}
          <div className="space-y-2">
            <Label htmlFor="numeroPrestador">Número do Prestador</Label>
            <Input
              id="numeroPrestador"
              type="text"
              value={numeroPrestador}
              onChange={(e) => setNumeroPrestador(e.target.value)}
              disabled={loading}
              placeholder="Digite o número de prestador"
            />
          </div>

          {/* Data de Validade */}
          <div className="space-y-2">
            <Label>Data de Validade</Label>
            <Popover open={validadeCalendarOpen} onOpenChange={setValidadeCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !dataValidade && "text-muted-foreground"
                  )}
                  disabled={loading}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dataValidade ? format(dataValidade, "dd/MM/yyyy", { locale: ptBR }) : "Selecione a data de validade"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dataValidade}
                  onSelect={(date) => {
                    setDataValidade(date);
                    setValidadeCalendarOpen(false);
                  }}
                  locale={ptBR}
                  className="rounded-md"
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Data de Vencimento */}
          <div className="space-y-2">
            <Label>Data de Vencimento</Label>
            <Popover open={vencimentoCalendarOpen} onOpenChange={setVencimentoCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !dataVencimento && "text-muted-foreground"
                  )}
                  disabled={loading}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dataVencimento ? format(dataVencimento, "dd/MM/yyyy", { locale: ptBR }) : "Selecione a data de vencimento"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dataVencimento}
                  onSelect={(date) => {
                    setDataVencimento(date);
                    setVencimentoCalendarOpen(false);
                  }}
                  locale={ptBR}
                  className="rounded-md"
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Seletor de datas */}
          <div className="space-y-2">
            <Label>Selecione as datas:</Label>
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !selectedDates.length && "text-muted-foreground"
                  )}
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
                  onSelect={handleDateSelect}
                  locale={ptBR}
                  className="rounded-md"
                />
              </PopoverContent>
            </Popover>
            
            {/* Mostrar datas selecionadas */}
            {selectedDates.length > 0 && (
              <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                <div className="text-sm font-medium text-gray-700 mb-2">
                  Datas selecionadas: {selectedDates.map((date, index) => (
                    <span key={index} className="text-xs text-green-600 font-semibold">
                      {format(date, "dd/MM")}
                      {index < selectedDates.length - 1 && " "}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Mensagem de erro */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="text-red-800 text-sm">{error}</div>
            </div>
          )}

          {/* Botões de ação */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleClose} disabled={loading}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EditPrestadorModal;
