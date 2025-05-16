
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Appointment } from "@/types/appointment";
import { useAppointments } from "@/context/AppointmentContext";
import { useAuth } from "@/context/AuthContext";
import { format } from "date-fns";
import { Textarea } from "@/components/ui/textarea";
import { ptBR } from "date-fns/locale";
import { Card, CardContent } from "@/components/ui/card";

interface AppointmentDetailsProps {
  appointment: Appointment;
  onClose: () => void;
}

const AppointmentDetails = ({ appointment, onClose }: AppointmentDetailsProps) => {
  const { user } = useAuth();
  const { deleteAppointment, patientRecords, addPatientRecord } = useAppointments();
  const [notes, setNotes] = useState("");
  const isUserPsychologist = user?.role === "psychologist";
  const canManageAppointment = user?.role === "admin" || user?.role === "receptionist";
  
  const records = patientRecords.filter(record => record.patientId === appointment.patient.id);

  const handleDelete = () => {
    if (window.confirm("Tem certeza que deseja excluir este agendamento?")) {
      deleteAppointment(appointment.id);
      onClose();
    }
  };

  const handleSaveRecord = () => {
    if (!notes.trim()) return;
    
    addPatientRecord({
      patientId: appointment.patient.id,
      appointmentId: appointment.id,
      date: new Date().toISOString().split('T')[0],
      notes,
      createdBy: user?.id || "",
    });
    
    setNotes("");
  };

  const formatDate = (dateStr: string) => {
    return format(new Date(dateStr), "dd/MM/yyyy", { locale: ptBR });
  };

  return (
    <div className="space-y-4">
      <Tabs defaultValue="details">
        <TabsList>
          <TabsTrigger value="details">Detalhes da Consulta</TabsTrigger>
          {isUserPsychologist && <TabsTrigger value="record">Prontuário</TabsTrigger>}
        </TabsList>
        
        <TabsContent value="details" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-500">Paciente</p>
              <p>{appointment.patient.name}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-500">Data</p>
              <p>{formatDate(appointment.date)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-500">Horário</p>
              <p>{appointment.startTime} - {appointment.endTime}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-500">Psicólogo</p>
              <p>Dr. {appointment.psychologistName}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-500">Consultório</p>
              <p>{appointment.roomName}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-500">Pagamento</p>
              <p>
                {appointment.paymentMethod === "private" ? "Particular" : `Convênio: ${appointment.insuranceType}`}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-500">Valor</p>
              <p>R$ {appointment.value.toFixed(2)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-500">Status</p>
              <p className="capitalize">{appointment.status}</p>
            </div>
          </div>

          <div className="pt-4 border-t">
            <h3 className="text-lg font-semibold mb-2">Dados do Paciente</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-sm font-medium text-gray-500">Nome</p>
                <p>{appointment.patient.name}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-gray-500">CPF</p>
                <p>{appointment.patient.cpf}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-gray-500">Telefone</p>
                <p>{appointment.patient.phone}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-gray-500">E-mail</p>
                <p>{appointment.patient.email}</p>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-2">
            {canManageAppointment && (
              <Button variant="destructive" onClick={handleDelete}>
                Excluir
              </Button>
            )}
            <Button variant="outline" onClick={onClose}>
              Fechar
            </Button>
          </div>
        </TabsContent>
        
        {isUserPsychologist && (
          <TabsContent value="record" className="space-y-4">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Histórico do Paciente</h3>
              {records.length === 0 ? (
                <p className="text-gray-500">Nenhum registro encontrado.</p>
              ) : (
                <div className="space-y-3">
                  {records.map((record) => (
                    <Card key={record.id}>
                      <CardContent className="p-4">
                        <div className="flex justify-between mb-2">
                          <p className="text-sm font-medium">
                            {formatDate(record.date)}
                          </p>
                        </div>
                        <p className="text-sm whitespace-pre-wrap">{record.notes}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-3 pt-4 border-t">
              <h3 className="text-lg font-semibold">Adicionar Registro</h3>
              <Textarea
                placeholder="Digite suas anotações sobre o atendimento..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={6}
              />
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setNotes("")}>
                  Limpar
                </Button>
                <Button onClick={handleSaveRecord}>
                  Salvar Registro
                </Button>
              </div>
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};

export default AppointmentDetails;
