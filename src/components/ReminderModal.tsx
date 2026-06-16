import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { Send, X, GripVertical, User, Clock, Calendar, MessageSquare, CheckSquare2, Loader2 } from "lucide-react";
import { formatDateForDisplay } from "@/utils/dateUtils";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Appointment {
  id: number;
  patient_id: number;
  patient_name: string;
  psychologist_id: number;
  psychologist_name: string;
  start_time: string;
  end_time: string;
  date: string;
  status: "pending" | "confirmed" | "completed" | "cancelled";
  appointment_type: "presential" | "online";
  room_id: number | null;
  value: string;
  insurance_type: string | null;
}

interface ReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointments: Appointment[];
  onSend: (messages: string[]) => void;
}

interface MessageTemplate {
  id: string;
  text: string;
  variables: Array<{
    id: string;
    type: 'patient' | 'psychologist' | 'date' | 'time' | 'status';
    position: number;
    appointmentId: number;
  }>;
}

const ReminderModal = ({ isOpen, onClose, appointments, onSend }: ReminderModalProps) => {
  const [messageTemplates, setMessageTemplates] = useState<MessageTemplate[]>([]);
  const [sending, setSending] = useState(false);
  const [cursorPositions, setCursorPositions] = useState<{ [templateId: string]: number }>({});
  const [selectedMessages, setSelectedMessages] = useState<{ [templateId: string]: boolean }>({});
  const { toast } = useToast();
  const wasOpenRef = useRef(false);

  useEffect(() => {
    if (isOpen && appointments.length > 0 && !wasOpenRef.current) {
      initializeTemplates();
    }
    wasOpenRef.current = isOpen;
  }, [isOpen]);

  const initializeTemplates = () => {
    const templates: MessageTemplate[] = appointments.map((appointment, index) => {
      const defaultText = `Olá, ${appointment.patient_name}!
Seu atendimento está agendado para ${formatDateWithWeekday(appointment.date)} às ${appointment.start_time}, com o(a) psicólogo(a) ${appointment.psychologist_name}.
Podemos confirmar?
Caso não haja retorno até o final do dia, o agendamento será cancelado automaticamente.`;
      
      return {
        id: `template-${appointment.id}`,
        text: defaultText,
        variables: []
      };
    });
    
    setMessageTemplates(templates);
    
    // Inicializar todos os checkboxes como selecionados por padrão
    const initialSelection: { [templateId: string]: boolean } = {};
    templates.forEach(template => {
      initialSelection[template.id] = true;
    });
    setSelectedMessages(initialSelection);
  };

  const getVariableValue = (type: string, appointmentId: number): string => {
    const appointment = appointments.find(app => app.id === appointmentId);
    if (!appointment) return '';

    switch (type.toLowerCase()) {
      case 'paciente':
      case 'patient':
        return appointment.patient_name;
      case 'psicólogo':
      case 'psychologist':
        return appointment.psychologist_name;
      case 'data':
      case 'date':
        return formatDateForDisplay(appointment.date);
      case 'horário':
      case 'time':
        return appointment.start_time;
      case 'status':
        return appointment.status === 'pending' ? 'Pendente' : 'Confirmado';
      default:
        return '';
    }
  };

  const getVariableDisplay = (type: string): string => {
    switch (type.toLowerCase()) {
      case 'paciente':
      case 'patient':
        return 'Paciente';
      case 'psicólogo':
      case 'psychologist':
        return 'Psicólogo';
      case 'data':
      case 'date':
        return 'Data';
      case 'horário':
      case 'time':
        return 'Horário';
      case 'status':
        return 'Status';
      default:
        return type;
    }
  };

  const updateTemplateText = (templateId: string, newText: string) => {
    setMessageTemplates(prev => 
      prev.map(template => 
        template.id === templateId 
          ? { ...template, text: newText }
          : template
      )
    );
  };

  const handleCursorPosition = (templateId: string, position: number) => {
    setCursorPositions(prev => ({
      ...prev,
      [templateId]: position
    }));
  };

  const formatDateWithWeekday = (dateString: string): string => {
    try {
      const date = parseISO(dateString);
      const weekday = format(date, 'EEEE', { locale: ptBR });
      const formattedDate = formatDateForDisplay(dateString);
      return `${formattedDate} - ${weekday}`;
    } catch (error) {
      console.error('Erro ao formatar data com dia da semana:', error);
      return formatDateForDisplay(dateString);
    }
  };

  const insertVariable = (templateId: string, variable: string) => {
    const template = messageTemplates.find(t => t.id === templateId);
    if (!template) return;

    const newText = template.text + ` (${variable})`;
    updateTemplateText(templateId, newText);
  };

  const insertValue = (templateId: string, value: string) => {
    const template = messageTemplates.find(t => t.id === templateId);
    if (!template) return;

    const cursorPosition = cursorPositions[templateId] || template.text.length;
    const newText = template.text.slice(0, cursorPosition) + value + template.text.slice(cursorPosition);
    
    updateTemplateText(templateId, newText);
    
    // Atualiza a posição do cursor após inserir
    setCursorPositions(prev => ({
      ...prev,
      [templateId]: cursorPosition + value.length
    }));
  };

  const handleCheckboxChange = (templateId: string, checked: boolean) => {
    setSelectedMessages(prev => ({
      ...prev,
      [templateId]: checked
    }));
  };

  const handleToggleSelectAll = () => {
    const allSelected = messageTemplates.every(template => selectedMessages[template.id]);
    const newSelection: { [templateId: string]: boolean } = {};
    messageTemplates.forEach(template => {
      newSelection[template.id] = !allSelected;
    });
    setSelectedMessages(newSelection);
  };

  const selectedCount = Object.values(selectedMessages).filter(Boolean).length;
  const allSelected = messageTemplates.length > 0 && selectedCount === messageTemplates.length;

  const renderFailedPatientsToast = (failures: Array<{ name: string }>) => (
    <div className="mt-1 flex flex-col gap-1.5">
      {failures.map((failure, index) => (
        <span key={`${failure.name}-${index}`} className="block text-sm font-semibold text-white">
          {failure.name}
        </span>
      ))}
    </div>
  );

  const renderFormattedText = (template: MessageTemplate, appointmentIndex: number) => {
    const appointment = appointments[appointmentIndex];
    if (!appointment) return template.text;

    const { text } = template;
    const parts = [];
    let lastIndex = 0;

    // Lista de valores para destacar
    const highlightValues = [
      appointment.patient_name,
      appointment.psychologist_name,
      appointment.start_time,
      formatDateWithWeekday(appointment.date)
    ];

    // Encontrar e destacar cada valor
    highlightValues.forEach(value => {
      const index = text.indexOf(value, lastIndex);
      if (index !== -1) {
        // Adicionar texto antes do valor
        if (index > lastIndex) {
          parts.push({
            text: text.slice(lastIndex, index),
            isHighlight: false
          });
        }
        
        // Adicionar valor destacado
        parts.push({
          text: value,
          isHighlight: true
        });
        
        lastIndex = index + value.length;
      }
    });

    // Adicionar texto restante
    if (lastIndex < text.length) {
      parts.push({
        text: text.slice(lastIndex),
        isHighlight: false
      });
    }

    return parts;
  };

  const renderMessageWithVariables = (template: MessageTemplate, appointmentIndex: number) => {
    const { text } = template;
    const appointment = appointments[appointmentIndex];
    
    if (!appointment) return <span className="text-gray-500">Carregando...</span>;

    // Regex para encontrar variáveis no formato (Tipo)
    const variableRegex = /\(([^)]+)\)/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = variableRegex.exec(text)) !== null) {
      // Adicionar texto antes da variável
      if (match.index > lastIndex) {
        parts.push(
          <span key={`text-${lastIndex}`} className="text-gray-700">
            {text.slice(lastIndex, match.index)}
          </span>
        );
      }

      // Adicionar a variável
      const variableType = match[1].toLowerCase();
      const value = getVariableValue(variableType, appointment.id);
      const display = getVariableDisplay(variableType);
      
      parts.push(
        <TooltipProvider key={match.index}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge 
                variant="outline" 
                className="mx-1 cursor-move bg-blue-100 hover:bg-blue-200 border-blue-300 text-blue-700"
                title={`${display}: ${value}`}
              >
                <GripVertical className="h-3 w-3 mr-1" />
                ({display})
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p className="font-medium">{display}: {value}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );

      lastIndex = match.index + match[0].length;
    }

    // Adicionar texto restante
    if (lastIndex < text.length) {
      parts.push(
        <span key={`text-${lastIndex}`} className="text-gray-700">
          {text.slice(lastIndex)}
        </span>
      );
    }

    return parts.length > 0 ? parts : <span className="text-gray-500">Nenhuma variável encontrada</span>;
  };

  const handleSend = async () => {
    setSending(true);

    try {
      const selectedTemplates = messageTemplates.filter(template => selectedMessages[template.id]);
      
      if (selectedTemplates.length === 0) {
        toast({
          title: "Nenhuma mensagem selecionada",
          description: "Selecione pelo menos uma mensagem para enviar.",
          variant: "destructive",
        });
        return;
      }

      const results = await Promise.allSettled(
        selectedTemplates.map(async (template) => {
          const appointment = appointments.find(app => `template-${app.id}` === template.id);
          if (!appointment) {
            throw new Error("Agendamento não encontrado");
          }

          const payload = {
            id: appointment.id,
            patient_id: appointment.patient_id,
            patient_name: appointment.patient_name,
            psychologist_id: appointment.psychologist_id,
            psychologist_name: appointment.psychologist_name,
            start_time: appointment.start_time,
            end_time: appointment.end_time,
            date: appointment.date,
            status: appointment.status,
            appointment_type: appointment.appointment_type,
            room_id: appointment.room_id,
            value: appointment.value,
            insurance_type: appointment.insurance_type,
            message: template.text
          };

          const response = await fetch('https://webhook.essenciasaudeintegrada.com.br/webhook/lembrete', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
          });

          if (!response.ok) {
            throw new Error(`Erro HTTP ${response.status}`);
          }

          return appointment.patient_name;
        })
      );

      const failures: Array<{ id: number; name: string; error: string }> = [];
      let successCount = 0;

      results.forEach((result, index) => {
        const appointment = appointments.find(
          app => `template-${app.id}` === selectedTemplates[index].id
        );
        const patientName = appointment?.patient_name ?? "Paciente desconhecido";
        const patientId = appointment?.id ?? -1;

        if (result.status === "fulfilled") {
          successCount++;
        } else {
          const errorMessage = result.reason instanceof Error
            ? result.reason.message
            : "Erro desconhecido";
          failures.push({ id: patientId, name: patientName, error: errorMessage });
        }
      });

      if (successCount === selectedTemplates.length) {
        toast({
          title: "Lembretes enviados!",
          description: `${successCount} paciente(s) receberam o lembrete com sucesso.`,
          variant: "default",
        });
        onClose();
      } else if (successCount > 0) {
        toast({
          title: "Envio parcial",
          description: (
            <div>
              <p className="mb-2 text-sm text-white/90">
                {successCount} paciente(s) receberam o lembrete.
              </p>
              <p className="mb-1 text-sm font-medium text-white">Falha no envio para:</p>
              {renderFailedPatientsToast(failures)}
            </div>
          ),
          variant: "destructive",
        });
      } else {
        toast({
          title: "Falha no envio",
          description: renderFailedPatientsToast(failures),
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Erro ao enviar lembretes:', error);
      toast({
        title: "Erro ao enviar lembretes",
        description: "Tente novamente em alguns instantes.",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="flex max-w-5xl max-h-[92vh] flex-col overflow-hidden p-0 gap-0 border-0 shadow-2xl bg-slate-50/95 backdrop-blur-xl sm:rounded-2xl">
        {/* Header */}
        <div className="relative overflow-hidden border-b border-slate-200/80 bg-white px-6 py-5 sm:px-8">
          <div className="absolute inset-0 bg-gradient-to-br from-violet-500/[0.04] via-transparent to-sky-500/[0.06]" />
          <DialogHeader className="relative space-y-3 pb-0">
            <DialogTitle className="flex items-center gap-3 text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 shadow-lg shadow-violet-500/25">
                <Send className="h-5 w-5 text-white" />
              </div>
              <div className="text-left">
                <span className="block">Enviar Lembretes Personalizados</span>
                <span className="mt-1 block text-sm font-normal text-slate-500">
                  Personalize as mensagens para cada paciente e visualize o resultado final
                </span>
              </div>
            </DialogTitle>
          </DialogHeader>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col gap-3 border-b border-slate-200/80 bg-white/80 px-6 py-4 backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
              <CheckSquare2 className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-800">
                {selectedCount} de {messageTemplates.length} selecionado(s)
              </p>
              <div className="mt-1.5 h-1.5 w-36 overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-500 transition-all duration-300"
                  style={{
                    width: messageTemplates.length
                      ? `${(selectedCount / messageTemplates.length) * 100}%`
                      : "0%",
                  }}
                />
              </div>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleToggleSelectAll}
            className="group h-9 rounded-full border-slate-200 bg-white px-4 text-slate-700 shadow-sm transition-all duration-200 hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700 hover:shadow-md"
          >
            <span className="group-hover:hidden">
              {allSelected ? "Desmarcar todos" : "Marcar todos"}
            </span>
            <span className="hidden group-hover:inline">
              {allSelected ? "Marcar todos" : "Desmarcar todos"}
            </span>
          </Button>
        </div>

        {/* Lista de pacientes */}
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5 sm:px-8">
          {messageTemplates.map((template, index) => {
            const appointment = appointments[index];
            const isSelected = selectedMessages[template.id] || false;

            return (
              <div
                key={template.id}
                className={`group/card overflow-hidden rounded-2xl border bg-white shadow-sm transition-all duration-200 hover:shadow-md ${
                  isSelected
                    ? "border-violet-200 ring-1 ring-violet-100"
                    : "border-slate-200/80 opacity-80 hover:opacity-100"
                }`}
              >
                {/* Header do Card */}
                <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-5 py-4">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-start gap-3">
                      <div className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors ${
                        isSelected
                          ? "bg-violet-100 text-violet-600"
                          : "bg-slate-100 text-slate-400"
                      }`}>
                        <User className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-base font-semibold text-slate-900">
                          {appointment.patient_name}
                        </p>
                        <p className="mt-0.5 text-sm text-slate-500">
                          {appointment.psychologist_name}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => insertValue(template.id, appointment.patient_name)}
                        title="Clique para inserir o nome do paciente"
                        className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm transition-all hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700"
                      >
                        <User className="h-3 w-3" />
                        Paciente
                      </button>
                      <button
                        type="button"
                        onClick={() => insertValue(template.id, appointment.psychologist_name)}
                        title="Clique para inserir o nome do psicólogo"
                        className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm transition-all hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700"
                      >
                        <User className="h-3 w-3" />
                        Psicólogo
                      </button>
                      <button
                        type="button"
                        onClick={() => insertValue(template.id, appointment.start_time)}
                        title="Clique para inserir o horário"
                        className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm transition-all hover:border-sky-200 hover:bg-sky-50 hover:text-sky-700"
                      >
                        <Clock className="h-3 w-3" />
                        {appointment.start_time}
                      </button>
                      <button
                        type="button"
                        onClick={() => insertValue(template.id, formatDateWithWeekday(appointment.date))}
                        title="Clique para inserir a data"
                        className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm transition-all hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
                      >
                        <Calendar className="h-3 w-3" />
                        Data
                      </button>
                    </div>

                    <label
                      htmlFor={`checkbox-${template.id}`}
                      className={`flex cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2 transition-all ${
                        isSelected
                          ? "border-violet-200 bg-violet-50 text-violet-700"
                          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                      }`}
                    >
                      <Checkbox
                        id={`checkbox-${template.id}`}
                        checked={isSelected}
                        onCheckedChange={(checked) => handleCheckboxChange(template.id, checked as boolean)}
                        className="border-slate-300 data-[state=checked]:border-violet-600 data-[state=checked]:bg-violet-600"
                      />
                      <span className="text-sm font-medium">Enviar</span>
                    </label>
                  </div>
                </div>

                <div className="p-5">
                  <div className="mb-3 flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-slate-400" />
                    <label className="text-sm font-medium text-slate-700">
                      Mensagem Personalizada
                    </label>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-1 transition-colors focus-within:border-violet-300 focus-within:bg-white focus-within:ring-2 focus-within:ring-violet-100">
                    <div
                      contentEditable
                      suppressContentEditableWarning={true}
                      onInput={(e) => {
                        const target = e.target as HTMLElement;
                        updateTemplateText(template.id, target.textContent || '');
                      }}
                      onSelect={(e) => {
                        const target = e.target as HTMLElement;
                        const selection = window.getSelection();
                        if (selection) {
                          handleCursorPosition(template.id, selection.anchorOffset || 0);
                        }
                      }}
                      onClick={(e) => {
                        const target = e.target as HTMLElement;
                        const selection = window.getSelection();
                        if (selection) {
                          handleCursorPosition(template.id, selection.anchorOffset || 0);
                        }
                      }}
                      className="min-h-[130px] w-full rounded-lg bg-white px-4 py-3 text-sm leading-relaxed text-slate-700 focus:outline-none whitespace-pre-wrap"
                    >
                      {renderFormattedText(template, index).map((part, partIndex) => (
                        <span
                          key={partIndex}
                          className={
                            part.isHighlight
                              ? "rounded-md bg-violet-100 px-1 py-0.5 font-medium text-violet-800"
                              : ""
                          }
                        >
                          {part.text}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <DialogFooter className="shrink-0 border-t border-slate-200/80 bg-white/90 px-6 py-4 backdrop-blur-sm sm:px-8">
          <div className="flex w-full gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={sending}
              className="h-11 flex-1 rounded-xl border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50"
            >
              <X className="mr-2 h-4 w-4" />
              Cancelar
            </Button>
            <Button
              onClick={handleSend}
              disabled={sending}
              className="h-11 flex-1 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-500/20 transition-all hover:from-violet-700 hover:to-indigo-700 hover:shadow-violet-500/30"
            >
              {sending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Enviar Lembretes ({selectedCount}/{messageTemplates.length})
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ReminderModal;
