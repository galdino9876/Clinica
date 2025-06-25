import React, { useState, useEffect } from "react";
import { Edit, Trash2, Eye, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import PatientForm from "./PatientForm"; // Ajuste o caminho conforme necessário

const PatientsTable = () => {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  // Configuração dinâmica das ações
  const actions = [
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
  id: 'delete',
  label: 'Excluir',
  icon: Trash2,
  color: 'text-red-600 hover:text-red-800',
  onClick: (patient) => {
    console.log('Excluindo usuário:', patient);
    if (window.confirm(`Deseja realmente excluir o usuário ${patient.nome || patient.name}?`)) {
      fetch('https://webhook.essenciasaudeintegrada.com.br/webhook/delete-patient', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: patient.id || patient.id }), // Usa o ID do usuário passado
      })
        .then(response => {
          if (!response.ok) {
            throw new Error('Falha ao excluir usuário');
          }
          return response.json();
        })
        .then(data => {
          console.log('Usuário excluído:', data);
          alert(`Usuário ${patient.nome || patient.name} excluído com sucesso!`);
          // Opcional: Atualize a lista de usuários removendo o item
          // setUsers(prevUsers => prevUsers.filter(u => u.id !== user.id));
        })
        .catch(error => {
          console.error('Erro ao excluir usuário:', error);
          alert(`Erro ao excluir usuário ${patient.nome || patient.name}: ${error.message}`);
        });
    }
  }
}
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
            <h2 className="text-xl font-semibold text-gray-800">Pacientes ({patients.length})</h2>
            <button
              onClick={() => setIsFormOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center gap-2 transition-colors"
            >
              <Plus size={16} />
              Novo Paciente
            </button>
          </div>
          {error && (
            <div className="mt-2 text-sm text-red-600 bg-red-50 p-2 rounded">
              Erro ao carregar dados da API: {error}. Exibindo dados de exemplo.
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
              {patients.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                    Nenhum paciente encontrado
                  </td>
                </tr>
              ) : (
                patients.map((patient, index) => (
                  <tr key={patient.id || index} className="hover:bg-gray-50 transition-colors">
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
                        {actions.map((action) => {
                          const IconComponent = action.icon;
                          return (
                            <button
                              key={action.id}
                              onClick={() => action.onClick(patient)}
                              className={`${action.color} hover:scale-110 transition-all duration-200 p-1 rounded`}
                              title={action.label}
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
          <div className="text-sm text-gray-700">Total de pacientes: {patients.length}</div>
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
    </div>
  );
};

export default PatientsTable;
