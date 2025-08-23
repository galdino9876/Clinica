import React, { useState, useEffect } from "react";
import { Edit, Trash2, Eye, Plus, FileText, Activity, Send, CircleArrowUp } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import PatientForm from "./PatientForm";
import PatientAppointmentHistory from "./PatientAppointmentHistory";
import PatientRecords from "./PatientRecords";
import ReferralDialog from "./patient/ReferralDialog";
import { useAuth } from "@/context/AuthContext";

const PatientsTable = () => {
  const { user } = useAuth(); // Adicionado para obter o usuário autenticado
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  
  // User roles and permissions - baseado no papel real do usuário
  const isAdmin = user?.role === "admin";
  const isReceptionist = user?.role === "receptionist";
  const isPsychologist = user?.role === "psychologist";
  const canManagePatients = isAdmin || isReceptionist; // Apenas admin e recepcionistas podem gerenciar
  const canViewRecords = isAdmin || isPsychologist; // Apenas admin e psicólogos podem ver prontuários
  
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isRecordsOpen, setIsRecordsOpen] = useState(false);
  const [isReferralOpen, setIsReferralOpen] = useState(false);

  const fetchPatients = async () => {
    try {
      setLoading(true);
      const response = await fetch(`https://webhook.essenciasaudeintegrada.com.br/webhook/patients?id=${user.id}&role=${user.role}`);
      if (!response.ok) throw new Error("Erro ao carregar pacientes");
      const data = await response.json();
      setPatients(Array.isArray(data) ? data : data.patients || data.data || []);
      setError(null);
    } catch (err) {
      setError("Erro ao carregar pacientes. Usando dados de exemplo.");
      setPatients([
        { id: 1, name: "João Silva", cpf: "123.456.789-00", phone: "(11) 99999-9999", email: "joao@email.com", status: "Ativo" },
        { id: 2, name: "Maria Santos", cpf: "987.654.321-00", phone: "(11) 88888-8888", email: "maria@email.com", status: "Inativo" },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  const renderStatus = (status) => {
    const statusColors = {
      Ativo: "bg-green-100 text-green-800",
      Inativo: "bg-red-100 text-red-800",
      Pendente: "bg-yellow-100 text-yellow-800",
      Bloqueado: "bg-gray-100 text-gray-800",
    };
    return <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[status] || "bg-gray-100 text-gray-800"}`}>{status}</span>;
  };

  const handlePatientAdded = (newPatient) => {
    setPatients((prev) => [...prev, newPatient]);
    setIsFormOpen(false);
  };

  const filteredPatients = patients.filter(
    (patient) =>
      (patient.name || patient.nome || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (patient.cpf || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (patient.phone || patient.telefone || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (patient.email || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

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
      onClick: (patient) => {
        setSelectedPatient(patient);
        setIsRecordsOpen(true);
      },
      visible: canViewRecords, // Se for recepcionista, visible = false; se não, visible = true
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
      onClick: (patient) => alert(`Atestado para: ${patient.name || patient.nome}`),
    },
    {
      id: "reactivate",
      label: "Reativar",
      icon: Activity,
      color: "text-green-600 hover:text-green-800",
      onClick: (patient) => alert(`Reativar paciente: ${patient.name || patient.nome}`),
      visible: canManagePatients, // Apenas admin e recepcionistas podem reativar
    },
    {
      id: "edit",
      label: "Editar",
      icon: Edit,
      color: "text-blue-600 hover:text-blue-800",
      onClick: (patient) => alert(`Editar paciente: ${patient.name || patient.nome}`),
      visible: canManagePatients, // Apenas admin e recepcionistas podem editar
    },
    {
      id: "delete",
      label: "Excluir",
      icon: Trash2,
      color: "text-red-600 hover:text-red-800",
      onClick: async (patient) => {
        if (patient.id && window.confirm(`Deseja excluir o paciente ${patient.name || patient.nome}?`)) {
          try {
            const response = await fetch(
              `https://webhook.essenciasaudeintegrada.com.br/webhook/delete-patient`,
              {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: patient.id }),
              }
            );
            if (!response.ok) throw new Error("Falha ao excluir paciente");
            await response.json();
            alert(`Paciente ${patient.name || patient.nome} excluído!`);
            fetchPatients();
          } catch (error) {
            setError("Erro ao excluir paciente.");
          }
        }
      },
      visible: canManagePatients,
    },
  ];

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
        <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-800">Pacientes ({filteredPatients.length})</h2>
            {canManagePatients && (
              <button
                onClick={() => setIsFormOpen(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center gap-2"
              >
                <Plus size={16} />
                Novo Paciente
              </button>
            )}
          </div>
          {error && <div className="mt-2 text-sm text-red-600 bg-red-50 p-2 rounded">{error}</div>}
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nome</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">CPF</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Telefone</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ações</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredPatients.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500">Nenhum paciente encontrado</td>
                </tr>
              ) : (
                filteredPatients.map((patient, index) => (
                  <tr key={patient.id || index} className={`hover:bg-gray-50 ${patient.status === "Inativo" ? "bg-gray-50" : ""}`}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{patient.name || patient.nome || "N/A"}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{patient.cpf || "N/A"}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{patient.phone || patient.telefone || "N/A"}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{patient.email || "N/A"}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{renderStatus(patient.status || "Ativo")}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        {actions
                          .filter((action) => action.visible === undefined || action.visible)
                          .map((action) => (
                            <button
                              key={action.id}
                              onClick={() => action.onClick(patient)}
                              className={`${action.color} hover:scale-110 p-1 rounded`}
                              title={action.label}
                            >
                              <action.icon size={16} />
                            </button>
                          ))}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

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

      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes do Paciente - {selectedPatient?.name || selectedPatient?.nome || "Carregando..."}</DialogTitle>
          </DialogHeader>
          {selectedPatient && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-500">Nome</p>
                  <p>{selectedPatient.name || selectedPatient.nome || "N/A"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-500">CPF</p>
                  <p>{selectedPatient.cpf || "N/A"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-500">Telefone</p>
                  <p>{selectedPatient.phone || selectedPatient.telefone || "N/A"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-500">E-mail</p>
                  <p>{selectedPatient.email || "N/A"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-500">Status</p>
                  {renderStatus(selectedPatient.status || "Ativo")}
                </div>
              </div>
              <h3 className="text-lg font-semibold">Histórico de Consultas</h3>
              <PatientAppointmentHistory patient={selectedPatient} />
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isRecordsOpen} onOpenChange={setIsRecordsOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Prontuários - {selectedPatient?.name || selectedPatient?.nome || "Carregando..."}</DialogTitle>
            <DialogDescription>Visualize os prontuários do paciente</DialogDescription>
          </DialogHeader>
          {selectedPatient && <PatientRecords patient={selectedPatient} onClose={() => setIsRecordsOpen(false)} />}
        </DialogContent>
      </Dialog>

      <Dialog open={isReferralOpen} onOpenChange={setIsReferralOpen}>
        <DialogContent>
          <ReferralDialog patient={selectedPatient} onClose={() => setIsReferralOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PatientsTable;