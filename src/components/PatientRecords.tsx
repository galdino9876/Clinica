
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Patient, PatientRecord } from "@/types/appointment";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card, CardContent } from "@/components/ui/card";
import { Trash } from "lucide-react";
import { useAuth } from "@/context/AuthContext";


interface PatientRecordsProps {
  patient: Patient;
  onClose: () => void;
}

const PatientRecords = ({ patient, onClose }: PatientRecordsProps) => {
  const [notes, setNotes] = useState("");
  const [records, setRecords] = useState<PatientRecord[]>([]);
  const [showAll, setShowAll] = useState(true); // Exibe todos por padrão
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [psychologists, setPsychologists] = useState<{ [key: number]: string }>({}); // Mapeamento ID -> Nome
  const [usersCache, setUsersCache] = useState<any[]>([]); // Cache da lista de usuários

  const { user } = useAuth();

  // Função para buscar nome do psicólogo
  const fetchPsychologistName = async (psychologistId: number) => {
    try {
      // Validação para garantir que o ID existe
      if (!psychologistId || !Number.isInteger(psychologistId)) {
        console.warn("ID do psicólogo inválido:", psychologistId);
        return "Desconhecido";
      }

      console.log("Buscando psicólogo com ID:", psychologistId);
      
      let users: any[] = [];
      
      // Se já temos o cache de usuários, usar ele
      if (usersCache.length > 0) {
        users = usersCache;
        console.log("Usando cache de usuários");
      } else {
        // Buscar todos os usuários de uma vez
        const response = await fetch(
          "https://webhook.essenciasaudeintegrada.com.br/webhook/users"
        );
        
        if (!response.ok) {
          console.error("Erro na resposta da API:", response.status, response.statusText);
          throw new Error("Erro ao buscar usuários");
        }
        
        const usersData = await response.json();
        users = Array.isArray(usersData) ? usersData : usersData.users || usersData.data || [];
        
        // Salvar no cache
        setUsersCache(users);
        console.log("Lista de usuários carregada e cacheada:", users.length);
      }
      
      // Encontrar o usuário específico por ID
      const user = users.find((u: any) => {
        // Converter ambos para string para comparação mais robusta
        const userId = String(u.id);
        const targetId = String(psychologistId);
        return userId === targetId;
      });
      
      if (user) {
        console.log("Usuário encontrado:", user);
        return user.name || user.nome || "Desconhecido";
      } else {
        console.warn("Usuário não encontrado com ID:", psychologistId);
        console.log("Usuários disponíveis:", users.map(u => ({ id: u.id, name: u.name || u.nome })));
        return "Desconhecido";
      }
    } catch (error) {
      console.error("Erro ao buscar psicólogo:", error);
      return "Desconhecido";
    }
  };

  // Carrega nomes dos psicólogos para os registros
  const loadPsychologistNames = async (records: PatientRecord[]) => {
    const uniqueIds = [...new Set(records.map((r) => r.created_by))];
    const names: { [key: number]: string } = {};
    
    console.log("IDs únicos de psicólogos encontrados:", uniqueIds);
    console.log("Registros recebidos:", records);
    
    for (const id of uniqueIds) {
      // Valida se o ID é válido antes de fazer a requisição
      if (id && Number.isInteger(id)) {
        console.log("Carregando nome para psicólogo ID:", id);
        const name = await fetchPsychologistName(id);
        names[id] = name;
        console.log(`Nome carregado para ID ${id}:`, name);
      } else if (!id || !Number.isInteger(id)) {
        console.warn("ID inválido encontrado:", id);
        names[id] = "ID Inválido";
      }
    }
    
    console.log("Nomes carregados:", names);
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
      
      // Normalizar os dados dos prontuários
      const normalizedRecords = recordsData.map((record: any) => ({
        id: Number(record.id) || 0,
        patient_id: record.patient_id || record.patientId || patientId,
        appointment_id: record.appointment_id || record.appointmentId || null,
        date: record.date || new Date().toISOString().split('T')[0],
        notes: record.notes || '',
        created_by: Number(record.created_by || record.createdBy) || 0
      }));
      
      console.log("Prontuários normalizados:", normalizedRecords);
      setRecords(normalizedRecords.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      await loadPsychologistNames(normalizedRecords);
    } catch (err: any) {
      setError("Erro ao carregar prontuários.");
      setRecords([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Verifica se o usuário está autenticado
    if (!user || !user.id) {
      console.error("Usuário não autenticado ou sem ID:", user);
      setError("Usuário não autenticado. Faça login novamente.");
      setLoading(false);
      return;
    }

    console.log("Usuário autenticado:", user);
    
    if (patient?.id && Number.isInteger(patient.id)) {
      fetchRecords(patient.id);
    } else {
      setError("Paciente inválido.");
      setLoading(false);
    }
  }, [patient, user]);

  // Monitorar mudanças no estado dos psicólogos para debug
  useEffect(() => {
    console.log("Estado dos psicólogos atualizado:", psychologists);
  }, [psychologists]);

  const handleSaveRecord = async () => {
    if (!notes.trim()) {
      setError("As anotações são obrigatórias.");
      return;
    }
    if (!Number.isInteger(patient.id)) {
      setError("ID do paciente inválido.");
      return;
    }
    if (!user || !Number.isInteger(user.id)) {
      setError("Usuário não autenticado ou ID inválido. Faça login novamente.");
      return;
    }

    const newRecord = {
      patient_id: patient.id,
      appointment_id: null,
      date: new Date().toISOString().split("T")[0],
      notes: notes.trim(),
      created_by: user.id,
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
        id: Number(savedRecord.id) || 0,
        patient_id: savedRecord.patient_id || savedRecord.patientId || patient.id,
        appointment_id: savedRecord.appointment_id || savedRecord.appointmentId || null,
        date: savedRecord.date || newRecord.date,
        notes: savedRecord.notes || newRecord.notes,
        created_by: Number(savedRecord.created_by || savedRecord.createdBy || user.id),
      };
      setRecords([normalizedRecord, ...records].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      setNotes("");
      const psychologistName = await fetchPsychologistName(user.id);
      setPsychologists((prev) => ({ ...prev, [user.id]: psychologistName }));
    } catch (err: any) {
      setError(err.message || "Erro ao salvar prontuário. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRecord = async (recordId: number) => {
    if (!window.confirm("Tem certeza que deseja excluir este prontuário?")) return;
    
    try {
      setLoading(true);
      const response = await fetch(
        "https://webhook.essenciasaudeintegrada.com.br/webhook/patient-records",
        { 
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ id: recordId })
        }
      );
      
      if (!response.ok) throw new Error("Falha ao excluir prontuário");
      
      // Remove o registro da lista local
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
                      {!psychologists[record.created_by] && (
                        <span className="text-red-500 ml-1">
                          (ID: {record.created_by})
                        </span>
                      )}
                    </p>
                  </div>
                  {user?.role !== 'psychologist' && (
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