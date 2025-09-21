import React, { useState, useEffect, useRef } from "react";
import { Edit, Trash2, Eye, Plus, FileText, Activity, Send, CircleArrowUp, MessageCircle, ClipboardList } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import PatientForm from "./PatientForm";
import PatientAppointmentHistory from "./PatientAppointmentHistory";
import PatientRecords from "./PatientRecords";
import ReferralDialog from "./patient/ReferralDialog";
import AttendanceDialog from "./patient/AttendanceDialog";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

const PatientsTable = () => {
  const { user } = useAuth(); // Adicionado para obter o usuário autenticado
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEditFormOpen, setIsEditFormOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState(null);
  
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
  const [isAttendanceOpen, setIsAttendanceOpen] = useState(false);
  const [isContinuityOpen, setIsContinuityOpen] = useState(false);
  const [isNameSearchActive, setIsNameSearchActive] = useState(false);
  const nameSearchInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isNameSearchActive && nameSearchInputRef.current) {
      nameSearchInputRef.current.focus();
      nameSearchInputRef.current.select();
    }
  }, [isNameSearchActive]);

  // Estados para o modal de atestado
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendanceStartTime, setAttendanceStartTime] = useState("08:00");
  const [attendanceEndTime, setAttendanceEndTime] = useState("09:00");
  const [attendancePeriod, setAttendancePeriod] = useState("specific");

  // Estados para o modal de pedido de continuidade
  const [continuityTitle, setContinuityTitle] = useState("RELATORIO PSICOLOGICO");
  const [continuityCid, setContinuityCid] = useState("F-41");
  const [continuityPlan, setContinuityPlan] = useState("PMDF");
  const [continuityLoading, setContinuityLoading] = useState(false);

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
        { id: 1, name: "João Silva", cpf: "123.456.789-00", phone: "61988888888", email: "joao@email.com", status: "Ativo" },
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

  const handlePatientUpdated = (updatedPatient) => {
    setPatients((prev) => 
      prev.map(patient => 
        patient.id === updatedPatient.id ? updatedPatient : patient
      )
    );
    setIsEditFormOpen(false);
    setEditingPatient(null);
  };

  const filteredPatients = patients.filter(
    (patient) =>
      (patient.name || patient.nome || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (patient.cpf || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (patient.phone || patient.telefone || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (patient.email || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (isAdmin && patient.psychologist_name ? patient.psychologist_name.toLowerCase().includes(searchTerm.toLowerCase()) : false)
  );

  // Ordena alfabeticamente pelo nome (considera name ou nome), case-insensitive e locale PT
  const sortedFilteredPatients = [...filteredPatients].sort((a, b) => {
    const nameA = (a.name || a.nome || "").toString();
    const nameB = (b.name || b.nome || "").toString();
    return nameA.localeCompare(nameB, "pt", { sensitivity: "base" });
  });

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
      onClick: (patient) => {
        setSelectedPatient(patient);
        setAttendanceDate(new Date().toISOString().split('T')[0]);
        setAttendanceStartTime("08:00");
        setAttendanceEndTime("09:00");
        setAttendancePeriod("specific");
        setIsAttendanceOpen(true);
      },
    },
    {
      id: "continuity",
      label: "Pedido de Continuidade",
      icon: ClipboardList,
      color: "text-orange-600 hover:text-orange-800",
      onClick: (patient) => {
        setSelectedPatient(patient);
        setIsContinuityOpen(true);
      },
      visible: canViewRecords, // Apenas admin e psicólogos podem gerar pedido de continuidade
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
      onClick: (patient) => {
        setEditingPatient(patient);
        setIsEditFormOpen(true);
      },
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

  const getAttendanceTimeText = () => {
    if (attendancePeriod === "specific") {
      return `das ${attendanceStartTime} às ${attendanceEndTime}`;
    } else if (attendancePeriod === "morning") {
      return "durante o período da manhã (08:00 às 12:00)";
    } else {
      return "durante o período da tarde (13:00 às 18:00)";
    }
  };

  // Função para abrir WhatsApp
  const openWhatsApp = (phone: string) => {
    // Remove todos os caracteres não numéricos
    const cleanPhone = phone.replace(/\D/g, '');
    // Abre o WhatsApp com o número formatado
    window.open(`https://wa.me/55${cleanPhone}`, '_blank');
  };

  // Função para processar e baixar arquivo
  const downloadFile = (blob: Blob, filename: string, mimeType: string) => {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    
    // Determinar extensão baseada no MIME type
    let extension = '';
    if (mimeType.includes('pdf')) {
      extension = '.pdf';
    } else if (mimeType.includes('jpeg') || mimeType.includes('jpg')) {
      extension = '.jpg';
    } else if (mimeType.includes('png')) {
      extension = '.png';
    }
    
    link.download = `${filename}${extension}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  // Função para enviar pedido de continuidade
  const handleContinuityRequest = async () => {
    if (!selectedPatient) return;

    try {
      setContinuityLoading(true);
      
      const patientName = selectedPatient.name || selectedPatient.nome;
      const dateStr = new Date().toISOString().split('T')[0];
      const requestBody = {
        nome: patientName,
        titulo: continuityTitle,
        cid: continuityCid,
        plano: continuityPlan
      };

      // 1. Primeira chamada - documento_pessoal
      const response1 = await fetch('https://webhook.essenciasaudeintegrada.com.br/webhook/documento_pessoal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      if (!response1.ok) {
        throw new Error('Erro ao gerar documento pessoal');
      }

      const arrayBuffer1 = await response1.arrayBuffer();
      const blob1 = new Blob([arrayBuffer1], { type: 'application/pdf' });
      const filename1 = `DOCUMENTO_PESSOAL_${patientName}_${dateStr}`;
      downloadFile(blob1, filename1, 'application/pdf');

      // 2. Segunda chamada - relatorio
      const response2 = await fetch('https://webhook.essenciasaudeintegrada.com.br/webhook/relatorio', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      if (!response2.ok) {
        throw new Error('Erro ao gerar relatório');
      }

      const arrayBuffer2 = await response2.arrayBuffer();
      const blob2 = new Blob([arrayBuffer2], { type: 'application/pdf' });
      const filename2 = `RELATORIO_${patientName}_${dateStr}`;
      downloadFile(blob2, filename2, 'application/pdf');

      toast.success('Documentos de pedido de continuidade gerados com sucesso!');
      setIsContinuityOpen(false);
      
    } catch (error) {
      console.error('Erro ao gerar pedido de continuidade:', error);
      toast.error('Erro ao gerar pedido de continuidade. Tente novamente.');
    } finally {
      setContinuityLoading(false);
    }
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
    <div className="w-full p-6">
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  {isNameSearchActive ? (
                    <input
                      ref={nameSearchInputRef}
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      onBlur={() => setIsNameSearchActive(false)}
                      placeholder="Pesquisar por nome..."
                      className="w-full rounded-md border border-gray-300 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsNameSearchActive(true)}
                      className="text-left w-full hover:text-gray-700"
                      title="Clique para pesquisar por nome"
                    >
                      Nome
                    </button>
                  )}
                </th>
                {/* <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">CPF</th> */}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Telefone</th>
                {/* <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th> */}
                {isAdmin && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Responsável</th>
                )}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ações</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredPatients.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 5 : 4} className="px-6 py-4 text-center text-gray-500">Nenhum paciente encontrado</td>
                </tr>
              ) : (
                sortedFilteredPatients.map((patient, index) => (
                  <tr key={patient.id || index} className={`hover:bg-gray-50 ${patient.status === "Inativo" ? "bg-gray-50" : ""}`}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{patient.name || patient.nome || "N/A"}</td>
                    {/* <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{patient.cpf || "N/A"}</td> */}
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{patient.phone || patient.telefone || "N/A"}</td>
                    {/* <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{patient.email || "N/A"}</td> */}
                                         {isAdmin && (
                       <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{patient.psychologist_name || "N/A"}</td>
                     )}
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

      <Dialog open={isEditFormOpen} onOpenChange={setIsEditFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Paciente</DialogTitle>
            <DialogDescription>Atualize os dados do paciente</DialogDescription>
          </DialogHeader>
          <PatientForm 
            patient={editingPatient} 
            isEdit={true}
            onSave={handlePatientUpdated} 
            onCancel={() => {
              setIsEditFormOpen(false);
              setEditingPatient(null);
            }} 
          />
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
                  <div className="flex items-center gap-2">
                    <p>{selectedPatient.phone || selectedPatient.telefone || "N/A"}</p>
                    {(selectedPatient.phone || selectedPatient.telefone) && (
                      <button
                        onClick={() => openWhatsApp(selectedPatient.phone || selectedPatient.telefone)}
                        className="text-green-600 hover:text-green-700 transition-colors"
                        title="Abrir WhatsApp"
                      >
                        <MessageCircle className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-500">E-mail</p>
                  <p>{selectedPatient.email || "N/A"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-500">Status</p>
                  {renderStatus(selectedPatient.status || "Ativo")}
                </div>
                {/* Campos do responsável - só mostram se tiverem valores */}
                {selectedPatient.nome_responsavel && selectedPatient.telefone_responsavel && (
                  <div className="space-y-1 md:col-span-2">
                    <p className="text-sm font-medium text-gray-500">Responsável</p>
                    <div className="space-y-1">
                      <p><span className="text-sm font-medium text-gray-500">Nome:</span> {selectedPatient.nome_responsavel}</p>
                      <div className="flex items-center gap-2">
                        <p><span className="text-sm font-medium text-gray-500">Telefone:</span> {selectedPatient.telefone_responsavel}</p>
                        <button
                          onClick={() => openWhatsApp(selectedPatient.telefone_responsavel)}
                          className="text-green-600 hover:text-green-700 transition-colors"
                          title="Abrir WhatsApp"
                        >
                          <MessageCircle className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
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

      <Dialog open={isAttendanceOpen} onOpenChange={setIsAttendanceOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Atestado de Comparecimento</DialogTitle>
            <DialogDescription>Gere um atestado de comparecimento para o paciente</DialogDescription>
          </DialogHeader>
          {selectedPatient && (
            <AttendanceDialog
              patient={selectedPatient}
              attendanceDate={attendanceDate}
              setAttendanceDate={setAttendanceDate}
              attendanceStartTime={attendanceStartTime}
              setAttendanceStartTime={setAttendanceStartTime}
              attendanceEndTime={attendanceEndTime}
              setAttendanceEndTime={setAttendanceEndTime}
              attendancePeriod={attendancePeriod}
              setAttendancePeriod={setAttendancePeriod}
              getAttendanceTimeText={getAttendanceTimeText}
              onClose={() => setIsAttendanceOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de Pedido de Continuidade */}
      <Dialog open={isContinuityOpen} onOpenChange={setIsContinuityOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Pedido de Continuidade</DialogTitle>
            <DialogDescription>
              Gere um pedido de continuidade para {selectedPatient?.name || selectedPatient?.nome || "o paciente"}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Título
              </label>
              <input
                type="text"
                value={continuityTitle}
                onChange={(e) => setContinuityTitle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="RELATORIO PSICOLOGICO"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                CID
              </label>
              <input
                type="text"
                value={continuityCid}
                onChange={(e) => setContinuityCid(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="F-41"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Plano
              </label>
              <input
                type="text"
                value={continuityPlan}
                onChange={(e) => setContinuityPlan(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="PMDF"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <button
                onClick={() => setIsContinuityOpen(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                disabled={continuityLoading}
              >
                Cancelar
              </button>
              <button
                onClick={handleContinuityRequest}
                disabled={continuityLoading}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {continuityLoading && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                )}
                {continuityLoading ? 'Gerando...' : 'Gerar Pedido'}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PatientsTable;