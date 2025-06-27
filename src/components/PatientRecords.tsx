
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Patient, PatientRecord } from "@/types/appointment";
import { useAppointments } from "@/context/AppointmentContext";
import { useAuth } from "@/context/AuthContext";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Trash, FileText } from "lucide-react";
import { Input } from "@/components/ui/input";

interface PatientRecordsProps {
  patient: Patient;
  onClose: () => void;
}

const PatientRecords = ({ patient, onClose }: PatientRecordsProps) => {
  const { patientRecords, addPatientRecord, deletePatientRecord } = useAppointments();
  const { user, getPsychologists } = useAuth();
  const [notes, setNotes] = useState("");
  const [isGeneratePdfOpen, setIsGeneratePdfOpen] = useState(false);
  const [customNotes, setCustomNotes] = useState("");
  const [includeAllRecords, setIncludeAllRecords] = useState(true);

  const isAdmin = user?.role === "admin";
  const isPsychologist = user?.role === "psychologist";
  // Admin ou Psicólogo podem gerenciar prontuários
  const canManageRecords = isAdmin || isPsychologist;

  const records = patientRecords.filter(
    (record) => record.patientId === patient.id
  ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const handleSaveRecord = () => {
    if (!notes.trim()) return;

    addPatientRecord({
      patientId: patient.id,
      appointmentId: 0, // Sem agendamento específico
      date: new Date().toISOString().split("T")[0],
      notes,
      createdBy: user?.id || "",
    });

    setNotes("");
  };

  const handleDeleteRecord = (recordId: string) => {
    if (window.confirm("Tem certeza que deseja excluir este prontuário?")) {
      deletePatientRecord(recordId);
    }
  };

  const formatDate = (dateStr: string) => {
    return format(new Date(dateStr), "dd/MM/yyyy", { locale: ptBR });
  };

  const getRecordCreator = (creatorId: string) => {
    const psychologists = getPsychologists();
    const creator = psychologists.find(p => p.id === creatorId);
    return creator ? creator.name : "Profissional não identificado";
  };

  const handleGeneratePdf = () => {
    setIsGeneratePdfOpen(true);
    setCustomNotes("");
    setIncludeAllRecords(true);
  };

  const createPdf = () => {
    // Aqui iria o código para gerar o PDF
    let pdfContent = `RELATÓRIO DE PACIENTE\n\n`;
    pdfContent += `Clínica Psicológica\n`;
    pdfContent += `Psicólogo: ${user?.name}\n`;
    pdfContent += `Data: ${format(new Date(), "dd/MM/yyyy", { locale: ptBR })}\n\n`;
    pdfContent += `PACIENTE: ${patient.name}\n`;
    pdfContent += `CPF: ${patient.cpf}\n\n`;

    if (includeAllRecords) {
      pdfContent += `HISTÓRICO DE ATENDIMENTOS:\n\n`;
      records.forEach(record => {
        pdfContent += `Data: ${formatDate(record.date)}\n`;
        pdfContent += `Psicólogo: ${getRecordCreator(record.createdBy)}\n`;
        pdfContent += `Anotações: ${record.notes}\n\n`;
      });
    }

    if (customNotes) {
      pdfContent += `OBSERVAÇÕES ADICIONAIS:\n\n`;
      pdfContent += customNotes;
    }

    console.log("Conteúdo do PDF:", pdfContent);
    alert("PDF gerado com sucesso!");
    setIsGeneratePdfOpen(false);
  };

  const patientStatus = !patient.active ? (
    <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
      <div className="flex">
        <div className="ml-3">
          <p className="text-sm text-red-700">
            <strong>Paciente Inativo</strong> - {patient.deactivationReason}
          </p>
          <p className="text-xs text-red-500 mt-1">
            Desativado em: {patient.deactivationDate ? formatDate(patient.deactivationDate) : "Data não registrada"}
          </p>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <div className="space-y-4">
      {patientStatus}

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

      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Histórico de Prontuários</h3>
        {canManageRecords && records.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleGeneratePdf}
          >
            <FileText className="h-4 w-4 mr-2" />
            Gerar Relatório
          </Button>
        )}
      </div>

      {records.length === 0 ? (
        <p className="text-gray-500">Nenhum registro encontrado.</p>
      ) : (
        <div className="space-y-3">
          {records.map((record) => (
            <Card key={record.id}>
              <CardContent className="p-4">
                <div className="flex justify-between mb-2">
                  <div>
                    <p className="text-sm font-medium">{formatDate(record.date)}</p>
                    <p className="text-xs text-gray-500">Psicólogo: {getRecordCreator(record.createdBy)}</p>
                  </div>
                  {canManageRecords && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteRecord(record.id)}
                      className="text-red-500 hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <p className="text-sm whitespace-pre-wrap">{record.notes}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

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

      {/* PDF Generation Dialog */}
      <Dialog open={isGeneratePdfOpen} onOpenChange={setIsGeneratePdfOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Gerar Relatório do Paciente</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center">
                <Input
                  type="checkbox"
                  id="includeRecords"
                  className="w-4 h-4 mr-2"
                  checked={includeAllRecords}
                  onChange={(e) => setIncludeAllRecords(e.target.checked)}
                />
                <label htmlFor="includeRecords">
                  Incluir todos os registros existentes
                </label>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                Observações adicionais ou relatório personalizado:
              </label>
              <Textarea
                placeholder="Digite suas observações adicionais ou elabore um relatório personalizado..."
                value={customNotes}
                onChange={(e) => setCustomNotes(e.target.value)}
                rows={8}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsGeneratePdfOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={createPdf}>
              Gerar PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PatientRecords;
