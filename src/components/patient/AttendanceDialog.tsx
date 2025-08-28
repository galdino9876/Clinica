import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Patient } from "@/types/appointment";
import { useToast } from "@/components/ui/use-toast";
import { useState } from "react";

interface AttendanceDialogProps {
  patient: Patient | null; // Dados do paciente passados como prop
  attendanceDate: string;
  setAttendanceDate: (date: string) => void;
  attendanceStartTime: string;
  setAttendanceStartTime: (time: string) => void;
  attendanceEndTime: string;
  setAttendanceEndTime: (time: string) => void;
  attendancePeriod: string;
  setAttendancePeriod: (period: string) => void;
  getAttendanceTimeText: () => string;
  onClose: () => void; // Função para fechar o componente
}

const AttendanceDialog = ({
  patient,
  attendanceDate,
  setAttendanceDate,
  attendanceStartTime,
  setAttendanceStartTime,
  attendanceEndTime,
  setAttendanceEndTime,
  attendancePeriod,
  setAttendancePeriod,
  getAttendanceTimeText,
  onClose,
}: AttendanceDialogProps) => {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);

  if (!patient) return null;

  const getPeriodTimes = () => {
    if (attendancePeriod === "morning") {
      return { start: "08:00", end: "12:00" };
    } else if (attendancePeriod === "afternoon") {
      return { start: "13:00", end: "18:00" };
    } else {
      return { start: attendanceStartTime, end: attendanceEndTime };
    }
  };

  const handleGenerateCertificate = async () => {
    // Validação básica
    if (attendancePeriod === "specific") {
      if (!attendanceStartTime || !attendanceEndTime) {
        toast({
          title: "Erro",
          description: "Por favor, preencha os horários de início e fim.",
          variant: "destructive",
        });
        return;
      }
      if (attendanceStartTime >= attendanceEndTime) {
        toast({
          title: "Erro",
          description: "O horário de início deve ser anterior ao horário de fim.",
          variant: "destructive",
        });
        return;
      }
    }

    setIsGenerating(true);

    // Toast de loading
    toast({
      title: "Gerando Atestado",
      description: "Aguarde enquanto processamos sua solicitação...",
    });

    try {
      const periodTimes = getPeriodTimes();
      
      const requestBody = {
        nome_paciente: patient.name,
        cpf: patient.cpf,
        nome_psicologo: patient.psychologist_name || "Não atribuído",
        crp_psicologo: patient.psychologist_crp || "Não informado", // CRP do psicólogo
        data_atendimento: attendanceDate,
        horario_inicio: periodTimes.start,
        horario_fim: periodTimes.end,
        periodo: attendancePeriod
      };

      const response = await fetch('https://webhook.essenciasaudeintegrada.com.br/webhook/atestado', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`Erro na API: ${response.status}`);
      }

      // Download automático da imagem
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `atestado_${patient.name}_${attendanceDate}.jpg`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      // Toast de sucesso
      toast({
        title: "Sucesso!",
        description: "Atestado gerado e baixado automaticamente.",
        variant: "default",
      });

      onClose();
    } catch (error) {
      console.error('Erro ao gerar atestado:', error);
      toast({
        title: "Erro",
        description: "Falha ao gerar o atestado. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-500">Nome:</label>
            <p>{patient.name}</p>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-500">CPF:</label>
            <p>{patient.cpf}</p>
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="attendanceDate" className="block text-sm font-medium">
            Data:
          </label>
          <Input
            id="attendanceDate"
            type="date"
            value={attendanceDate}
            onChange={(e) => setAttendanceDate(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium">Período:</label>
          <div className="flex items-center space-x-4">
            <div className="flex items-center">
              <input
                type="radio"
                id="specific"
                name="period"
                value="specific"
                checked={attendancePeriod === "specific"}
                onChange={() => setAttendancePeriod("specific")}
                className="mr-2"
              />
              <label htmlFor="specific">Horário específico</label>
            </div>
            <div className="flex items-center">
              <input
                type="radio"
                id="morning"
                name="period"
                value="morning"
                checked={attendancePeriod === "morning"}
                onChange={() => setAttendancePeriod("morning")}
                className="mr-2"
              />
              <label htmlFor="morning">Período da manhã</label>
            </div>
            <div className="flex items-center">
              <input
                type="radio"
                id="afternoon"
                name="period"
                value="afternoon"
                checked={attendancePeriod === "afternoon"}
                onChange={() => setAttendancePeriod("afternoon")}
                className="mr-2"
              />
              <label htmlFor="afternoon">Período da tarde</label>
            </div>
          </div>
        </div>

        {attendancePeriod === "specific" && (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="startTime" className="block text-sm font-medium">
                Horário de início:
              </label>
              <Input
                id="startTime"
                type="time"
                value={attendanceStartTime}
                onChange={(e) => setAttendanceStartTime(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="endTime" className="block text-sm font-medium">
                Horário de término:
              </label>
              <Input
                id="endTime"
                type="time"
                value={attendanceEndTime}
                onChange={(e) => setAttendanceEndTime(e.target.value)}
              />
            </div>
          </div>
        )}
      </div>
      
      <div className="mt-4 flex justify-end space-x-2">
        <Button variant="outline" onClick={onClose} disabled={isGenerating}>
          Cancelar
        </Button>
        <Button
          onClick={handleGenerateCertificate}
          disabled={isGenerating}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
        >
          {isGenerating ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Gerando...
            </>
          ) : (
            "Gerar Atestado"
          )}
        </Button>
      </div>
    </>
  );
};

export default AttendanceDialog;
