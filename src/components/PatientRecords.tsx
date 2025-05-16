
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Patient, PatientRecord } from "@/types/appointment";
import { useAppointments } from "@/context/AppointmentContext";
import { useAuth } from "@/context/AuthContext";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card, CardContent } from "@/components/ui/card";
import { Pencil } from "lucide-react";

interface PatientRecordsProps {
  patient: Patient;
  onClose: () => void;
}

const PatientRecords = ({ patient, onClose }: PatientRecordsProps) => {
  const { patientRecords, addPatientRecord, updatePatientRecord } = useAppointments();
  const { user } = useAuth();
  const [notes, setNotes] = useState("");
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [editingNotes, setEditingNotes] = useState("");
  
  const isAdmin = user?.role === "admin";

  const records = patientRecords.filter(
    (record) => record.patientId === patient.id
  ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const handleSaveRecord = () => {
    if (!notes.trim()) return;

    addPatientRecord({
      patientId: patient.id,
      appointmentId: "", // No specific appointment
      date: new Date().toISOString().split("T")[0],
      notes,
      createdBy: user?.id || "",
    });

    setNotes("");
  };
  
  const handleEditRecord = (record: PatientRecord) => {
    setEditingRecordId(record.id);
    setEditingNotes(record.notes);
  };
  
  const handleSaveEdit = (record: PatientRecord) => {
    if (!editingNotes.trim()) return;
    
    updatePatientRecord({
      ...record,
      notes: editingNotes
    });
    
    setEditingRecordId(null);
    setEditingNotes("");
  };
  
  const handleCancelEdit = () => {
    setEditingRecordId(null);
    setEditingNotes("");
  };

  const formatDate = (dateStr: string) => {
    return format(new Date(dateStr), "dd/MM/yyyy", { locale: ptBR });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div className="space-y-1">
          <p className="text-sm font-medium text-gray-500">Nome</p>
          <p>{patient.name}</p>
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium text-gray-500">CPF</p>
          <p>{patient.cpf}</p>
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium text-gray-500">Telefone</p>
          <p>{patient.phone}</p>
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium text-gray-500">E-mail</p>
          <p>{patient.email}</p>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Histórico de Prontuários</h3>
        {records.length === 0 ? (
          <p className="text-gray-500">Nenhum registro encontrado.</p>
        ) : (
          <div className="space-y-3">
            {records.map((record) => (
              <Card key={record.id}>
                <CardContent className="p-4">
                  <div className="flex justify-between mb-2">
                    <p className="text-sm font-medium">{formatDate(record.date)}</p>
                    {isAdmin && (
                      <Button variant="ghost" size="sm" onClick={() => handleEditRecord(record)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  
                  {editingRecordId === record.id ? (
                    <div className="space-y-3">
                      <Textarea
                        value={editingNotes}
                        onChange={(e) => setEditingNotes(e.target.value)}
                        rows={6}
                      />
                      <div className="flex justify-end space-x-2">
                        <Button variant="outline" onClick={handleCancelEdit}>
                          Cancelar
                        </Button>
                        <Button onClick={() => handleSaveEdit(record)}>
                          Salvar Alterações
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm whitespace-pre-wrap">{record.notes}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-3 pt-4 border-t">
        <h3 className="text-lg font-semibold">Adicionar Registro</h3>
        <Textarea
          placeholder="Digite suas anotações sobre o paciente..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={6}
        />
        <div className="flex justify-end space-x-2">
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
          <Button onClick={handleSaveRecord}>
            Salvar Registro
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PatientRecords;
