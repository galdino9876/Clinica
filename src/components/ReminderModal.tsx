import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { Send, X, GripVertical } from "lucide-react";
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
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && appointments.length > 0) {
      initializeTemplates();
    }
  }, [isOpen, appointments]);

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
      // Fazer requests individuais para cada paciente
      const promises = messageTemplates.map(async (template) => {
        const appointment = appointments.find(app => `template-${app.id}` === template.id);
        if (!appointment) return;

        const payload = {
          id: appointment.id, // id do appointment (ex: 107)
          patient_id: appointment.patient_id, // id do paciente (ex: 106)
          patient_name: appointment.patient_name,
          psychologist_id: appointment.psychologist_id, // id do psicólogo (ex: 21)
          psychologist_name: appointment.psychologist_name,
          start_time: appointment.start_time,
          end_time: appointment.end_time,
          date: appointment.date, // data do appointment (dia seguinte)
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
          throw new Error(`Erro ao enviar lembrete para ${appointment.patient_name}: ${response.status}`);
        }

        return { success: true, patient: appointment.patient_name };
      });

      const results = await Promise.all(promises);
      const successCount = results.filter(r => r?.success).length;
      
      toast({
        title: "Lembretes enviados!",
        description: `${successCount} de ${messageTemplates.length} pacientes receberam o lembrete.`,
        variant: "default",
      });
      onClose();
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
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-blue-50 to-indigo-50">
        <DialogHeader className="pb-6">
          <DialogTitle className="flex items-center gap-3 text-2xl font-bold text-gray-800">
            <div className="p-2 bg-blue-600 rounded-lg">
              <Send className="h-6 w-6 text-white" />
            </div>
            Enviar Lembretes Personalizados
          </DialogTitle>
          <p className="text-gray-600 mt-2">
            Personalize as mensagens para cada paciente e visualize o resultado final
          </p>
        </DialogHeader>

        <div className="space-y-8">
          {messageTemplates.map((template, index) => {
            const appointment = appointments[index];
            return (
              <div key={template.id} className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                {/* Header do Card */}
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/20 rounded-lg">
                      <Send className="h-4 w-4 text-white" />
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant="secondary" 
                        className="bg-white/20 text-white border-white/30 cursor-pointer hover:bg-white/30 transition-colors"
                        onClick={() => insertValue(template.id, appointment.patient_name)}
                        title="Clique para inserir o nome do paciente"
                      >
                        {appointment.patient_name}
                      </Badge>
                      <Badge 
                        variant="secondary" 
                        className="bg-white/20 text-white border-white/30 cursor-pointer hover:bg-white/30 transition-colors"
                        onClick={() => insertValue(template.id, appointment.psychologist_name)}
                        title="Clique para inserir o nome do psicólogo"
                      >
                        {appointment.psychologist_name}
                      </Badge>
                      <Badge 
                        variant="secondary" 
                        className="bg-white/20 text-white border-white/30 cursor-pointer hover:bg-white/30 transition-colors"
                        onClick={() => insertValue(template.id, appointment.start_time)}
                        title="Clique para inserir o horário"
                      >
                        {appointment.start_time}
                      </Badge>
                      <Badge 
                        variant="secondary" 
                        className="bg-white/20 text-white border-white/30 cursor-pointer hover:bg-white/30 transition-colors"
                        onClick={() => insertValue(template.id, formatDateWithWeekday(appointment.date))}
                        title="Clique para inserir a data"
                      >
                        {formatDateWithWeekday(appointment.date)}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="p-6 space-y-4">

                  {/* Mensagem Personalizada */}
                  <div>
                    <label className="text-sm font-semibold text-gray-700 mb-2 block">
                      Mensagem Personalizada
                    </label>
                    <div className="border-2 border-gray-300 rounded-lg p-3 bg-white min-h-[120px]">
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
                        className="w-full text-sm focus:outline-none whitespace-pre-wrap"
                        style={{ minHeight: '120px' }}
                      >
                        {renderFormattedText(template, index).map((part, partIndex) => (
                          <span
                            key={partIndex}
                            className={part.isHighlight ? "bg-purple-100 text-purple-800 px-1 rounded" : ""}
                          >
                            {part.text}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>


                </div>
              </div>
            );
          })}
        </div>

        <DialogFooter className="pt-6 border-t border-gray-200 bg-white/50 backdrop-blur-sm">
          <div className="flex gap-3 w-full">
            <Button 
              variant="outline" 
              onClick={onClose} 
              disabled={sending}
              className="flex-1 h-12 border-2 border-gray-300 hover:border-gray-400"
            >
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
            <Button 
              onClick={handleSend} 
              disabled={sending}
              className="flex-1 h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
            >
              {sending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Enviar Lembretes
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
