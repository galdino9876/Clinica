
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Patient } from "@/types/appointment";

interface AttendanceDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  patient: Patient | null;
  attendanceDate: string;
  setAttendanceDate: (date: string) => void;
  attendanceStartTime: string;
  setAttendanceStartTime: (time: string) => void;
  attendanceEndTime: string;
  setAttendanceEndTime: (time: string) => void;
  attendancePeriod: string;
  setAttendancePeriod: (period: string) => void;
  getAttendanceTimeText: () => string;
}

const AttendanceDialog = ({
  isOpen,
  onOpenChange,
  patient,
  attendanceDate,
  setAttendanceDate,
  attendanceStartTime,
  setAttendanceStartTime,
  attendanceEndTime,
  setAttendanceEndTime,
  attendancePeriod,
  setAttendancePeriod,
  getAttendanceTimeText
}: AttendanceDialogProps) => {
  if (!patient) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Atestado de Comparecimento</DialogTitle>
        </DialogHeader>
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

          <div className="p-4 bg-gray-50 rounded-lg text-sm">
            <p>Certificamos que <strong>{patient.name}</strong>, CPF: <strong>{patient.cpf}</strong>, compareceu
            à Clínica Psicológica no dia <strong>{new Date(attendanceDate).toLocaleDateString('pt-BR')}</strong> {getAttendanceTimeText()}
            para atendimento psicológico.</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={() => {
              // Aqui poderia gerar o atestado em PDF
              alert("Atestado gerado com sucesso!");
              onOpenChange(false);
            }}
          >
            Gerar Atestado
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AttendanceDialog;
