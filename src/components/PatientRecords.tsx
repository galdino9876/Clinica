
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Patient, PatientRecord } from "@/types/appointment";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card, CardContent } from "@/components/ui/card";
import { Trash } from "lucide-react";

interface PatientRecordsProps {
  patient: Patient;
  onClose: () => void;
}

const PatientRecords = ({ patient, onClose }: PatientRecordsProps) => {
  const [notes, setNotes] = useState("");
  const [records, setRecords] = useState<PatientRecord[]>([]);
  const [showAll, setShowAll] = useState(true); // Alterado para true: exibe todos por padrão
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [psychologists, setPsychologists] = useState<{ [key: number]: string }>({}); // Mapeamento ID -> Nome

  // Substitua com autenticação real (número inteiro)
  const userId = 1;

  // Função para buscar nome do psicólogo
  const fetchPsychologistName = async (psychologistId: number) => {
    try {
      const response = await fetch(
        `https://webhook.essenciasaudeintegrada.com.br/webhook/d52c9494-5de9-4444-877e-9e8d01662962/users/${psychologistId}`
      );
      if (!response.ok) throw new Error("Erro ao buscar psicólogo");
      const data = await response.json();
      return data.name || "Desconhecido";
    } catch {
      return "Desconhecido";
    }
  };

  // Carrega nomes dos psicólogos para os registros
  const loadPsychologistNames = async (records: PatientRecord[]) => {
    const uniqueIds = [...new Set(records.map((r) => r.created_by))];
    const names: { [key: number]: string } = {};
    for (const id of uniqueIds) {
      if (!psychologists[id]) {
        names[id] = await fetchPsychologistName(id);
      }
    }
    setPsychologists((prev) => ({ ...prev, ...names }));
  };

  const fetchRecords = async (patientId: number) => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(
        `https://webhook.essenciasaudeintegrada.com.br/webhook/d52c9494-5de9-4444-877e-9e8d01662962/patient_records/${patientId}`
      );
      if (!response.ok) throw new Error("Erro ao carregar prontuários");
      const data = await response.json();
      const recordsData = Array.isArray(data) ? data : data.records || [];
      setRecords(recordsData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      await loadPsychologistNames(recordsData);
    } catch (err: any) {
      setError("Erro ao carregar prontuários.");
      setRecords([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (patient?.id && Number.isInteger(patient.id)) {
      fetchRecords(patient.id);
    } else {
      setError("Paciente inválido.");
      setLoading(false);
    }
  }, [patient]);

  const handleSaveRecord = async () => {
    if (!notes.trim()) {
      setError("As anotações são obrigatórias.");
      return;
    }
    if (!Number.isInteger(patient.id)) {
      setError("ID do paciente inválido.");
      return;
    }
    if (!Number.isInteger(userId)) {
      setError("ID do usuário inválido.");
      return;
    }

    const newRecord = {
      patient_id: patient.id,
      appointment_id: null,
      date: new Date().toISOString().split("T")[0],
      notes: notes.trim(),
      created_by: userId,
    };

    try {
      setLoading(true);
      setError(null);
      const response = await fetch(
        "https://webhook.essenciasaudeintegrada.com.br/webhook/create-patients-records",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newRecord),
        }
      );
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Falha ao salvar prontuário");
      }
      const savedRecord = await response.json();
      const normalizedRecord: PatientRecord = {
        id: savedRecord.id || "",
        patient_id: savedRecord.patient_id || savedRecord.patientId || patient.id,
        appointment_id: savedRecord.appointment_id || savedRecord.appointmentId || null,
        date: savedRecord.date || newRecord.date,
        notes: savedRecord.notes || newRecord.notes,
        created_by: Number(savedRecord.created_by || savedRecord.createdBy || userId),
      };
      setRecords([normalizedRecord, ...records].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      setNotes("");
      const psychologistName = await fetchPsychologistName(userId);
      setPsychologists((prev) => ({ ...prev, [userId]: psychologistName }));
    } catch (err: any) {
      setError(err.message || "Erro ao salvar prontuário. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRecord = async (recordId: string) => {
    if (!window.confirm("Tem certeza que deseja excluir este prontuário?")) return;
    try {
      setLoading(true);
      const response = await fetch(
        `https://webhook.essenciasaudeintegrada.com.br/webhook/patient-records/${recordId}`,
        { method: "DELETE" }
      );
      if (!response.ok) throw new Error("Falha ao excluir prontuário");
      setRecords(records.filter((r) => r.id !== recordId));
    } catch (err: any) {
      setError("Erro ao excluir prontuário.");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), "dd/MM/yyyy", { locale: ptBR });
    } catch {
      return "Data inválida";
    }
  };

  if (error || !patient) {
    return (
      <div className="p-4">
        <p className="text-red-600">{error || "Paciente não encontrado."}</p>
        <Button variant="outline" onClick={onClose} className="mt-4">
          Fechar
        </Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Carregando prontuários...</span>
      </div>
    );
  }

  // Exibe todos os registros por padrão, ou apenas o último se showAll for false
  const displayedRecords = showAll ? records : records.slice(0, 1);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div className="space-y-1">
          <p className="text-sm font-medium text-gray-500">Nome</p>
          <p>{patient.name || patient.name || "N/A"}</p>
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium text-gray-500">CPF</p>
          <p>{patient.cpf || "N/A"}</p>
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium text-gray-500">Telefone</p>
          <p>{patient.phone || patient.phone || "N/A"}</p>
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium text-gray-500">E-mail</p>
          <p>{patient.email || "N/A"}</p>
        </div>
      </div>
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Histórico de Prontuários</h3>
        {records.length > 1 && (
          <Button
            variant="outline"
            onClick={() => setShowAll(!showAll)}
            className="text-sm px-4 py-1"
          >
            {showAll ? "Ver Apenas o Último" : "Ver Todos os Prontuários"}
          </Button>
        )}
      </div>
      {records.length === 0 ? (
        <p className="text-gray-500 text-sm">Nenhum prontuário encontrado para este paciente.</p>
      ) : (
        <div className="space-y-3">
          {displayedRecords.map((record) => (
            <Card
              key={record.id || Math.random().toString()}
              className="border border-gray-200 rounded-lg shadow-sm"
            >
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="text-sm font-medium text-gray-700">
                      {formatDate(record.date)}
                    </p>
                    <p className="text-xs text-gray-500">
                      Criado por: {psychologists[record.created_by] || "Carregando..."}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteRecord(record.id)}
                    className="text-red-500 hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-sm text-gray-600 whitespace-pre-wrap">{record.notes}</p>
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
          className="w-full border-gray-300 focus:ring-blue-500"
        />
        <div className="flex justify-end space-x-2">
          <Button
            variant="outline"
            onClick={onClose}
            className="text-sm px-4 py-1 border-gray-300"
          >
            Fechar
          </Button>
          <Button
            onClick={handleSaveRecord}
            disabled={loading}
            className="text-sm px-4 py-1 bg-blue-600 hover:bg-blue-700 text-white"
          >
            {loading ? "Salvando..." : "Salvar Registro"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PatientRecords;
