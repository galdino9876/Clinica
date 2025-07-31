import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Patient, PatientRecord } from "@/types/appointment";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Trash } from "lucide-react";

interface PatientRecordsProps {
  patient: Patient;
  onClose: () => void;
}

const PatientRecords = ({ patient, onClose }: PatientRecordsProps) => {
  const [notes, setNotes] = useState("");
  const [records, setRecords] = useState<PatientRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Simulação de autenticação (substitua com o ID real do usuário logado)
  const userId = "1"; // Placeholder, ajuste com localStorage.getItem("user")?.id

  useEffect(() => {
    const fetchRecords = async () => {
      try {
        setLoading(true);
        const response = await fetch(`https://webhook.essenciasaudeintegrada.com.br/webhook/patient-records?patientId=${patient.id}`);
        if (!response.ok) throw new Error(`Erro na API: ${response.status}`);
        const data = await response.json();
        const recordsData = Array.isArray(data) ? data : data.records || [];
        setRecords(recordsData);
      } catch (err) {
        console.error("Erro ao buscar prontuários:", err);
        setRecords([]); // Fallback para caso de erro
      } finally {
        setLoading(false);
      }
    };
    fetchRecords();
  }, [patient.id]);

  const handleSaveRecord = async () => {
    if (!notes.trim()) return;

    const newRecord: PatientRecord = {
      patientId: patient.id,
      appointmentId: null, // Opcional, conforme a tabela
      date: new Date().toISOString().split("T")[0],
      notes,
      createdBy: userId,
      id: ""
    };

    try {
      const response = await fetch("https://webhook.essenciasaudeintegrada.com.br/webhook/patient-records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newRecord),
      });
      if (!response.ok) throw new Error("Falha ao salvar prontuário");
      const savedRecord = await response.json();
      setRecords([savedRecord, ...records]);
      setNotes("");
    } catch (err) {
      console.error("Erro ao salvar prontuário:", err);
      alert("Erro ao salvar o prontuário. Tente novamente.");
    }
  };

  const handleDeleteRecord = async (recordId: string) => {
    if (window.confirm("Tem certeza que deseja excluir este prontuário?")) {
      try {
        const response = await fetch(`https://webhook.essenciasaudeintegrada.com.br/webhook/patient-records/${recordId}`, {
          method: "DELETE",
        });
        if (!response.ok) throw new Error("Falha ao excluir prontuário");
        setRecords(records.filter((r) => r.id !== recordId));
      } catch (err) {
        console.error("Erro ao excluir prontuário:", err);
        alert("Erro ao excluir o prontuário. Tente novamente.");
      }
    }
  };

  const formatDate = (dateStr: string) => {
    return format(new Date(dateStr), "dd/MM/yyyy", { locale: ptBR });
  };

  const patientStatus = !patient.active ? (
    <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
      <div className="flex">
        <div className="ml-3">
          <p className="text-sm text-red-700"><strong>Paciente Inativo</strong> - {patient.deactivationReason}</p>
          <p className="text-xs text-red-500 mt-1">Desativado em: {patient.deactivationDate ? formatDate(patient.deactivationDate) : "Data não registrada"}</p>
        </div>
      </div>
    </div>
  ) : null;

  if (loading) return <div className="flex justify-center items-center h-64">Carregando prontuários...</div>;

  return (
    <div className="space-y-4">
      {patientStatus}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div className="space-y-1"><p className="text-sm font-medium text-gray-500">Nome</p><p>{patient.name}</p></div>
        <div className="space-y-1"><p className="text-sm font-medium text-gray-500">CPF</p><p>{patient.cpf}</p></div>
        <div className="space-y-1"><p className="text-sm font-medium text-gray-500">Telefone</p><p>{patient.phone}</p></div>
        <div className="space-y-1"><p className="text-sm font-medium text-gray-500">E-mail</p><p>{patient.email}</p></div>
      </div>
      <h3 className="text-lg font-semibold">Histórico de Prontuários</h3>
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
                    <p className="text-xs text-gray-500">Criado por: Profissional</p> {/* Ajuste com API para nome do criador */}
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => handleDeleteRecord(record.id)} className="text-red-500 hover:bg-red-50 hover:text-red-600">
                    <Trash className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-sm whitespace-pre-wrap">{record.notes}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      <div className="space-y-3 pt-4 border-t">
        <h3 className="text-lg font-semibold">Adicionar Registro</h3>
        <Textarea placeholder="Digite suas anotações sobre o paciente..." value={notes} onChange={(e) => setNotes(e.target.value)} rows={6} />
        <div className="flex justify-end space-x-2">
          <Button variant="outline" onClick={onClose}>Fechar</Button>
          <Button onClick={handleSaveRecord}>Salvar Registro</Button>
        </div>
      </div>
    </div>
  );
};

export default PatientRecords;
