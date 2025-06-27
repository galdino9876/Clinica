import React, { useState, useEffect } from "react";
import { Edit, Trash2, Eye, Plus, FileText, FilePlus, Activity, Send, CircleArrowUp } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PatientForm from "./PatientForm"; // Ajuste o caminho conforme necessário
import PatientAppointmentHistory from "./PatientAppointmentHistory";
import PatientRecords from "./PatientRecords";
import ReferralDialog from "./patient/ReferralDialog";

const PatientsTable = () => {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isAdmin] = useState(false); // Simulação, substitua por lógica real
  const [canManagePatients] = useState(true); // Simulação, substitua por lógica real
  const [canViewRecords] = useState(false); // Simulação, substitua por lógica real
  const [isPsychologist] = useState(false); // Simulação, substitua por lógica real
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPatient, setSelectedPatient] = useState(null); // Para os Dialogs
  const [isDetailsOpen, setIsDetailsOpen] = useState(false); // Dialog de Detalhes
  const [isRecordsOpen, setIsRecordsOpen] = useState(false); // Dialog de Prontuários
  const [isReferralOpen, setIsReferralOpen] = useState(false); // Dialog de Encaminhamento
  const [isReceptionist] = useState(false); // Simulação, substitua por lógica real

  // Configuração dinâmica das ações
  const actions = [
    {
      id: "viewDetails",
      label: "Ver Detalhes",
      icon: Eye,
      color: "text-gray-600 hover:text-gray-800",
      onClick: (patient) => {
        setSelectedPatient(patient);
        setIsDetailsOpen(true);
      },
      visible: true,
    },
    {
      id: "viewRecords",
      label: "Prontuários",
      icon: FileText,
      color: "text-purple-600 hover:text-purple-800",
      onClick: async (patient) => {
        const details = await fetchPatientDetails(patient.id);
        if (details) {
          setSelectedPatient(details);
          setIsRecordsOpen(true);
        }
      },
      visible: true,
    },
    {
      id: "referral",
      label: "Encaminhamento",
      icon: Send,
      color: "text-yellow-600 hover:text-yellow-800",
      onClick: (patient) => {
        setSelectedPatient(patient);
        setIsReferralOpen(true);
      },
      visible: canViewRecords || isAdmin || isPsychologist || canManagePatients,
    },
    {
      id: "attendance",
      label: "Atestado",
      icon: CircleArrowUp,
      color: "text-indigo-600 hover:text-indigo-800",
      onClick: (patient) => {
        console.log("Abrindo atestado para:", patient);
        alert(`Atestado para: ${patient.nome || patient.name}`);
      },
    },
    {
      id: "reactivate",
      label: "Reativar",
      icon: Activity,
      color: "text-green-600 hover:text-green-800",
      onClick: (patient) => {
        console.log("Reativando paciente:", patient);
        alert(`Reativar paciente: ${patient.nome || patient.name}`);
      },
    },
    {
      id: "edit",
      label: "Editar",
      icon: Edit,
      color: "text-blue-600 hover:text-blue-800",
      onClick: (patient) => {
        console.log("Editando paciente:", patient);
        alert(`Editar paciente: ${patient.nome || patient.name}`);
      },
    },
    {
      id: "delete",
      label: "Excluir",
      icon: Trash2,
      color: "text-red-600 hover:text-red-800",
      onClick: (patient) => {
        console.log("Tentando excluir paciente - Clique detectado:", patient);
        if (patient && patient.id && window.confirm(`Deseja realmente excluir o paciente ${patient.nome || patient.name}?`)) {
          fetch(`https://webhook.essenciasaudeintegrada.com.br/webhook/delete-patient`, {
            method: "DELETE",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ id: patient.id }),
          })
            .then((response) => {
              if (!response.ok) {
                throw new Error(`Falha ao excluir paciente: ${response.status} - ${response.statusText}`);
              }
              return response.json();
            })
            .then((data) => {
              console.log("Resposta da API:", data);
              alert(`Paciente ${patient.nome || patient.name} excluído com sucesso!`);
              // Re-carrega a lista de pacientes para refletir a exclusão
              fetchPatients();
            })
            .catch((error) => {
              console.error("Erro ao excluir paciente:", error);
              alert(`Erro ao excluir paciente ${patient.nome || patient.name}: ${error.message}`);
            });
        } else {
          console.log("Exclusão cancelada ou ID inválido:", patient);
        }
      },
      visible: canManagePatients,
    },
  ];

  // Função para buscar os dados da API
  const fetchPatients = async () => {
    try {
      setLoading(true);
      const response = await fetch("https://webhook.essenciasaudeintegrada.com.br/webhook/patients");

      if (!response.ok) {
        throw new Error(`Erro na API: ${response.status}`);
      }

      const data = await response.json();
      const patientsData = Array.isArray(data) ? data : data.patients || data.data || [];
      setPatients(patientsData);
      setError(null);
    } catch (err) {
      console.error("Erro ao buscar pacientes:", err);
      setError(err.message);
      setPatients([
        {
          id: 1,
          nome: "João Silva",
          cpf: "123.456.789-00",
          telefone: "(11) 99999-9999",
          email: "joao@email.com",
          status: "Ativo",
        },
        {
          id: 2,
          nome: "Maria Santos",
          cpf: "987.654.321-00",
          telefone: "(11) 88888-8888",
          email: "maria@email.com",
          status: "Inativo",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Função para buscar detalhes do paciente da API
  const fetchPatientDetails = async (patientId: number) => {
    try {
      const response = await fetch(`https://webhook.essenciasaudeintegrada.com.br/webhook/patients/${patientId}`);
      if (!response.ok) {
        throw new Error(`Erro ao buscar detalhes do paciente: ${response.status}`);
      }
      const data = await response.json();
      return data; // Espera-se um objeto Patient detalhado
    } catch (err) {
      console.error("Erro ao buscar detalhes do paciente:", err);
      setError(err.message);
      return null;
    }
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  // Função para renderizar o status com cores
  const renderStatus = (status) => {
    const statusColors = {
      Ativo: "bg-green-100 text-green-800",
      Inativo: "bg-red-100 text-red-800",
      Pendente: "bg-yellow-100 text-yellow-800",
      Bloqueado: "bg-gray-100 text-gray-800",
    };
    const colorClass = statusColors[status] || "bg-gray-100 text-gray-800";
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colorClass}`}>{status}</span>
    );
  };

  // Função para atualizar a lista após adicionar um paciente
  const handlePatientAdded = (newPatient) => {
    setPatients((prevPatients) => [...prevPatients, newPatient]);
    setIsFormOpen(false);
  };

  // Filtrar pacientes com base no termo de busca
  const filteredPatients = patients.filter((patient) =>
    (patient.nome || patient.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (patient.cpf || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (patient.telefone || patient.phone || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (patient.email || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Carregando pacientes...</span>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto p-6">
      <div className="bg-white shadow-lg rounded-lg overflow-hidden">
        {/* Header */}
        <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-800">Pacientes ({filteredPatients.length})</h2>
            <div className="flex space-x-2">
              {canManagePatients && (
                <button
                  onClick={() => setIsFormOpen(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center gap-2 transition-colors"
                >
                  <Plus size={16} />
                  Novo Paciente
                </button>
              )}
            </div>
          </div>
          {error && (
            <div className="mt-2 text-sm text-red-600 bg-red-50 p-2 rounded">
              Erro ao carregar dados da API: {error}. Exibindo dados de exemplo.
            </div>
          )}
          {isPsychologist && filteredPatients.length === 0 && (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-md p-4 mt-4">
              <p>Você ainda não possui pacientes vinculados. Os pacientes serão exibidos aqui quando forem agendados para consulta com você.</p>
            </div>
          )}
        </div>

        {/* Tabela */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nome
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  CPF
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Telefone
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredPatients.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                    Nenhum paciente encontrado
                  </td>
                </tr>
              ) : (
                filteredPatients.map((patient, index) => (
                  <tr key={patient.id || index} className={`hover:bg-gray-50 transition-colors ${patient.status === "Inativo" ? "bg-gray-50" : ""}`}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {patient.nome || patient.name || "N/A"}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{patient.cpf || "N/A"}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {patient.telefone || patient.phone || "N/A"}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{patient.email || "N/A"}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">{renderStatus(patient.status || "Ativo")}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        {actions
                          .filter((action) => action.visible === undefined || action.visible)
                          .map((action) => {
                            const IconComponent = action.icon;
                            return (
                              <button
                                key={action.id}
                                onClick={() => action.onClick(patient)}
                                className={`${action.color} hover:scale-110 transition-all duration-200 p-1 rounded`}
                                title={action.label}
                                disabled={!action.visible}
                              >
                                <IconComponent size={16} />
                              </button>
                            );
                          })}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
          <div className="text-sm text-gray-700">Total de pacientes: {filteredPatients.length}</div>
        </div>
      </div>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Paciente</DialogTitle>
            <DialogDescription>Preencha os dados do novo paciente</DialogDescription>
          </DialogHeader>
          <PatientForm onSave={handlePatientAdded} onCancel={() => setIsFormOpen(false)} />
        </DialogContent>
      </Dialog>

      {/* Dialog de Detalhes do Paciente */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Detalhes do Paciente - {selectedPatient?.name || selectedPatient?.nome || "Carregando..."}
            </DialogTitle>
          </DialogHeader>
          {isReceptionist ? (
            <PatientAppointmentHistory patient={selectedPatient} />
          ) : (
            <Tabs defaultValue="records" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="records">Prontuário</TabsTrigger>
                <TabsTrigger value="appointments">Histórico de Consultas</TabsTrigger>
              </TabsList>
              <TabsContent value="records" className="pt-4">
                <PatientRecords
                  patient={selectedPatient}
                  onClose={() => setIsDetailsOpen(false)}
                />
              </TabsContent>
              <TabsContent value="appointments" className="pt-4">
                <PatientAppointmentHistory patient={selectedPatient} />
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog de Prontuários */}
      <Dialog open={isRecordsOpen} onOpenChange={setIsRecordsOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Prontuários - {selectedPatient?.name || selectedPatient?.nome || "Carregando..."}
            </DialogTitle>
            <DialogDescription>Visualize os prontuários do paciente</DialogDescription>
          </DialogHeader>
          {selectedPatient && (
            <PatientRecords
              patient={selectedPatient}
              onClose={() => setIsRecordsOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog de Encaminhamento */}
      <Dialog open={isReferralOpen} onOpenChange={setIsReferralOpen}>
        <DialogContent>
          <ReferralDialog
            patient={selectedPatient}
            onClose={() => setIsReferralOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PatientsTable;
