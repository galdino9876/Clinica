import React, { useState, useEffect } from "react";
import { Edit, Trash2, Eye, Plus, Clock, User, CreditCard } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import UserForm from "./UserForm";
import ScheduleForm from "./WorkingHoursForm"; // Ajuste o caminho

const UsersTable = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isUserFormOpen, setIsUserFormOpen] = useState(false);
  const [isScheduleFormOpen, setIsScheduleFormOpen] = useState(false);
  const [isPlansModalOpen, setIsPlansModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [plans, setPlans] = useState([]);
  const [plansLoading, setPlansLoading] = useState(false);
  const [plansError, setPlansError] = useState(null);
  const [plansSearchTerm, setPlansSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const plansPerPage = 10;
  const [isNewPlanModalOpen, setIsNewPlanModalOpen] = useState(false);
  const [newPlanData, setNewPlanData] = useState({ nome: "", valor: "" });
  const [isCreatingPlan, setIsCreatingPlan] = useState(false);
  const [isEditPlanModalOpen, setIsEditPlanModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [isEditingPlan, setIsEditingPlan] = useState(false);
  const [isDeletingPlan, setIsDeletingPlan] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [deleteConfirmation, setDeleteConfirmation] = useState({ show: false, planId: null, planName: "" });

  const actions = [
    {
      id: "edit",
      label: "Editar",
      icon: Edit,
      color: "text-blue-600 hover:text-blue-800",
      onClick: (user) => {
        console.log("Editando usuário:", user);
        setSelectedUser(user);
        setIsUserFormOpen(true);
      },
    },
    {
      id: "delete",
      label: "Excluir",
      icon: Trash2,
      color: "text-red-600 hover:text-red-800",
      onClick: (user) => {
        console.log("Excluindo usuário:", user);
        if (window.confirm(`Deseja realmente excluir o usuário ${user.nome || user.name}?`)) {
          fetch("https://webhook.essenciasaudeintegrada.com.br/webhook/delete-user", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: user.id }),
          })
            .then((response) => {
              if (!response.ok) throw new Error("Falha ao excluir usuário");
              return response.json();
            })
            .then(() => {
              console.log("Usuário excluído");
              window.location.reload();
            })
            .catch((error) => console.error("Erro ao excluir usuário:", error));
        }
      },
    },
    {
      id: "addSchedule",
      label: "Adicionar Horários",
      icon: Clock,
      color: "text-green-600 hover:text-green-800",
             onClick: (user) => {
         if ((user.funcao || user.role || "").toLowerCase().includes("psychologist")) {
           setSelectedUser(user);
           setIsScheduleFormOpen(true);
         } else {
           addNotification("Apenas psicólogos podem ter horários definidos.", "warning");
         }
       },
    },
    {
      id: "plans",
      label: "Planos",
      icon: CreditCard,
      color: "text-purple-600 hover:text-purple-800",
      onClick: (user) => {
        setSelectedUser(user);
        setPlansSearchTerm("");
        setCurrentPage(1);
        fetchPlans();
        setIsPlansModalOpen(true);
      },
    },
  ];

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch("https://webhook.essenciasaudeintegrada.com.br/webhook/users");
      if (!response.ok) throw new Error(`Erro na API: ${response.status}`);
      const data = await response.json();
      const usersData = Array.isArray(data) ? data : data.users || data.data || [];
      setUsers(usersData);
      setError(null);
    } catch (err) {
      console.error("Erro ao buscar usuários:", err);
      setError(err.message);
      setUsers([
        { id: 1, nome: "Dr. João Silva", role: "Psicólogo", email: "joao.silva@clinica.com", phone: "(11) 99999-9999" },
        { id: 2, nome: "Dra. Maria Santos", role: "Psicóloga", email: "maria.santos@clinica.com", phone: "(11) 88888-8888" },
        { id: 3, nome: "Ana Costa", role: "Recepcionista", email: "ana.costa@clinica.com", phone: "(11) 77777-7777" },
        { id: 4, nome: "Carlos Lima", role: "Administrador", email: "carlos.lima@clinica.com", phone: "(11) 66666-6666" },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const fetchPlans = async () => {
    try {
      setPlansLoading(true);
      console.log("Buscando planos...");
      
      const response = await fetch("https://webhook.essenciasaudeintegrada.com.br/webhook/recurrence_type");
      console.log("Response status:", response.status);
      
      if (!response.ok) throw new Error(`Erro na API: ${response.status}`);
      
      const data = await response.json();
      console.log("Dados recebidos da API:", data);
      
      // Tratar diferentes formatos de resposta
      let plansData = [];
      if (Array.isArray(data)) {
        plansData = data;
      } else if (data && typeof data === 'object') {
        // Se for um objeto único, converter para array
        if (data.id || data.ID) {
          plansData = [data];
        } else if (data.plans || data.data || data.result) {
          // Se os dados estiverem em uma propriedade específica
          plansData = Array.isArray(data.plans || data.data || data.result) 
            ? (data.plans || data.data || data.result) 
            : [];
        }
      }
      
      console.log("Planos processados:", plansData);
      setPlans(plansData);
      setPlansError(null);
    } catch (err) {
      console.error("Erro ao buscar planos:", err);
      setPlans([]);
      setPlansError(err.message);
    } finally {
      setPlansLoading(false);
    }
  };

  const createNewPlan = async () => {
    if (!newPlanData.nome.trim() || !newPlanData.valor.trim()) {
      addNotification("Por favor, preencha todos os campos", "error");
      return;
    }

    try {
      setIsCreatingPlan(true);
      const response = await fetch("https://webhook.essenciasaudeintegrada.com.br/webhook/recurrence_type", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          plano: newPlanData.nome,
          valor: parseFloat(newPlanData.valor)
        }),
      });

      if (!response.ok) throw new Error(`Erro na API: ${response.status}`);
      
      // Fechar modal e limpar dados
      setIsNewPlanModalOpen(false);
      setNewPlanData({ nome: "", valor: "" });
      
      // Recarregar planos
      await fetchPlans();
      
      addNotification("Plano criado com sucesso!", "success");
    } catch (err) {
      console.error("Erro ao criar plano:", err);
      addNotification(`Erro ao criar plano: ${err.message}`, "error");
    } finally {
      setIsCreatingPlan(false);
    }
  };

  const editPlan = async () => {
    console.log("Função editPlan chamada");
    console.log("Dados do plano sendo editado:", editingPlan);
    
    // Validação mais flexível
    if (!editingPlan) {
      addNotification("Dados do plano não encontrados", "error");
      return;
    }

    if (!editingPlan.nome || editingPlan.nome.toString().trim() === "") {
      addNotification("Por favor, preencha o nome do plano", "error");
      return;
    }

    if (!editingPlan.valor || editingPlan.valor.toString().trim() === "") {
      addNotification("Por favor, preencha o valor do plano", "error");
      return;
    }

    // Verificar se o valor é um número válido
    const valorNumerico = parseFloat(editingPlan.valor);
    if (isNaN(valorNumerico) || valorNumerico < 0) {
      addNotification("Por favor, insira um valor válido para o plano", "error");
      return;
    }

    try {
      setIsEditingPlan(true);
      
      const requestBody = {
        id: editingPlan.id,
        plano: editingPlan.nome,
        valor: parseFloat(editingPlan.valor)
      };
      
      console.log("Enviando requisição POST para editar plano:", requestBody);
      
      const response = await fetch("https://webhook.essenciasaudeintegrada.com.br/webhook/recurrence_type", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      console.log("Response status:", response.status);
      console.log("Response ok:", response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Erro na resposta:", errorText);
        throw new Error(`Erro na API: ${response.status} - ${errorText}`);
      }
      
      const responseData = await response.json();
      console.log("Resposta da API:", responseData);
      
      // Fechar modal e limpar dados
      setIsEditPlanModalOpen(false);
      setEditingPlan(null);
      
      // Recarregar planos
      await fetchPlans();
      
      addNotification("Plano atualizado com sucesso!", "success");
    } catch (err) {
      console.error("Erro ao atualizar plano:", err);
      addNotification(`Erro ao atualizar plano: ${err.message}`, "error");
    } finally {
      setIsEditingPlan(false);
    }
  };

  const deletePlan = async (planId) => {
    try {
      setIsDeletingPlan(true);
      const response = await fetch("https://webhook.essenciasaudeintegrada.com.br/webhook/recurrence_type", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: planId
        }),
      });

      if (!response.ok) throw new Error(`Erro na API: ${response.status}`);
      
      // Recarregar planos
      await fetchPlans();
      
      addNotification("Plano excluído com sucesso!", "success");
    } catch (err) {
      console.error("Erro ao excluir plano:", err);
      addNotification(`Erro ao excluir plano: ${err.message}`, "error");
    } finally {
      setIsDeletingPlan(false);
    }
  };

  const confirmDeletePlan = (planId, planName) => {
    setDeleteConfirmation({
      show: true,
      planId,
      planName
    });
  };

  const executeDeletePlan = async () => {
    if (deleteConfirmation.planId) {
      await deletePlan(deleteConfirmation.planId);
      setDeleteConfirmation({ show: false, planId: null, planName: "" });
    }
  };

  const openEditModal = (plan) => {
    console.log("Abrindo modal de edição para o plano:", plan);
    
    // Mapeamento mais robusto dos dados
    const planData = {
      id: plan.id || plan.ID || plan.Id || 0,
      nome: String(plan.plano || plan.Plano || plan.name || "").trim(),
      valor: String(plan.Valor || plan.valor || plan.price || "").trim()
    };
    
    console.log("Dados mapeados para edição:", planData);
    console.log("Tipo do nome:", typeof planData.nome, "Valor:", planData.nome);
    console.log("Tipo do valor:", typeof planData.valor, "Valor:", planData.valor);
    
    setEditingPlan(planData);
    setIsEditPlanModalOpen(true);
  };

  // Função para adicionar notificação
  const addNotification = (message, type = 'success') => {
    const id = Date.now();
    const notification = {
      id,
      message,
      type,
      timestamp: new Date()
    };
    
    setNotifications(prev => [...prev, notification]);
    
    // Auto-remover após 5 segundos
    setTimeout(() => {
      removeNotification(id);
    }, 5000);
  };

  // Função para remover notificação
  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  };

  // Filtrar planos baseado no termo de busca
  const filteredPlans = plans.filter(plan => {
    const planName = (plan.plano || plan.Plano || plan.name || "").toLowerCase();
    const searchTerm = plansSearchTerm.toLowerCase();
    return planName.includes(searchTerm);
  });

  // Calcular paginação
  const totalPages = Math.ceil(filteredPlans.length / plansPerPage);
  const startIndex = (currentPage - 1) * plansPerPage;
  const endIndex = startIndex + plansPerPage;
  const currentPlans = filteredPlans.slice(startIndex, endIndex);

  // Função para mudar de página
  const goToPage = (page) => {
    setCurrentPage(page);
  };

  // Função para ir para próxima página
  const nextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  // Função para ir para página anterior
  const prevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  // Resetar página quando mudar o termo de busca
  useEffect(() => {
    setCurrentPage(1);
  }, [plansSearchTerm]);

  useEffect(() => {
    fetchUsers();
  }, []);

  const renderFunction = (funcao) => {
    const functionColors = {
      "Psicólogo": "bg-blue-100 text-blue-800",
      "Psicóloga": "bg-blue-100 text-blue-800",
      "Recepcionista": "bg-green-100 text-green-800",
      "Administrador": "bg-purple-100 text-purple-800",
      "Admin": "bg-purple-100 text-purple-800",
    };
    return <span className={`px-2 py-1 rounded-full text-xs font-medium ${functionColors[funcao] || "bg-gray-100 text-gray-800"}`}>{funcao}</span>;
  };

  const handleUserSaved = (updatedUser) => {
    setUsers((prevUsers) =>
      prevUsers.map((user) => (user.id === updatedUser.id ? updatedUser : user))
    );
    setIsUserFormOpen(false);
    setSelectedUser(null);
  };

  const handleScheduleSaved = (schedules) => {
    setUsers((prevUsers) =>
      prevUsers.map((user) =>
        user.id === selectedUser.id ? { ...user, schedules } : user
      )
    );
    setIsScheduleFormOpen(false);
    setSelectedUser(null);
  };

  if (loading) return <div>Carregando...</div>;

  return (
    <div className="w-full max-w-7xl mx-auto p-6">
      <div className="bg-white shadow-lg rounded-lg overflow-hidden">
        <div className="bg-gray-50 px-6 py-4 border-b">
          <div className="flex justify-between">
            <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
              <User size={24} /> Usuários ({users.length})
            </h2>
            <button
              onClick={() => { setSelectedUser(null); setIsUserFormOpen(true); }}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center gap-2"
            >
              <Plus size={16} /> Novo Usuário
            </button>
          </div>
          {error && <div className="mt-2 text-red-600">{error}</div>}
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nome</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">E-mail</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Telefone</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Função</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ações</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-4 text-center">Nenhum usuário encontrado</td></tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">{user.nome || user.name}</td>
                    <td className="px-6 py-4">{user.email}</td>
                    <td className="px-6 py-4">{user.phone || user.telefone}</td>
                    <td className="px-6 py-4">{renderFunction(user.role || user.funcao)}</td>
                    <td className="px-6 py-4">
                      <div className="flex space-x-2">
                        {actions.map((action) => {
                          const IconComponent = action.icon;
                          return (
                            <button
                              key={action.id}
                              onClick={() => action.onClick(user)}
                              className={`${action.color} hover:scale-110 p-1 rounded`}
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
      </div>

      <Dialog open={isUserFormOpen} onOpenChange={setIsUserFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedUser ? "Editar Usuário" : "Novo Usuário"}</DialogTitle>
            <DialogDescription>{selectedUser ? "Atualize os dados" : "Preencha os dados"}</DialogDescription>
          </DialogHeader>
          <UserForm
            onSave={handleUserSaved}
            onCancel={() => { setIsUserFormOpen(false); setSelectedUser(null); }}
            user={selectedUser}
            isEdit={!!selectedUser}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={isScheduleFormOpen} onOpenChange={setIsScheduleFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Horários</DialogTitle>
            <DialogDescription>Defina os horários do psicólogo</DialogDescription>
          </DialogHeader>
          <ScheduleForm
            userId={selectedUser?.id || 0}
            onSave={handleScheduleSaved}
            onCancel={() => { setIsScheduleFormOpen(false); setSelectedUser(null); }}
            open={isScheduleFormOpen}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={isPlansModalOpen} onOpenChange={setIsPlansModalOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Planos Disponíveis</DialogTitle>
            <DialogDescription>
              Planos disponíveis para {selectedUser?.nome || selectedUser?.name}
            </DialogDescription>
            <div className="mt-2 flex gap-2">
              <button 
                onClick={() => setIsNewPlanModalOpen(true)}
                className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm hover:bg-blue-200 flex items-center gap-1"
              >
                <Plus size={14} /> Novo Plano
              </button>
            </div>
          </DialogHeader>
          
          <div className="mt-4">
            {/* Campo de busca discreto */}
            <div className="mb-4">
              <div className="relative max-w-xs">
                <input
                  type="text"
                  placeholder="🔍 Buscar planos..."
                  value={plansSearchTerm}
                  onChange={(e) => setPlansSearchTerm(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-full focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400 bg-gray-50"
                />
                {plansSearchTerm && (
                  <button
                    onClick={() => setPlansSearchTerm("")}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs"
                  >
                    ✕
                  </button>
                )}
              </div>
              {plansSearchTerm && (
                <div className="mt-1 text-xs text-gray-500">
                  {filteredPlans.length} plano(s) encontrado(s)
                </div>
              )}
            </div>

            {plansLoading ? (
              <div className="flex justify-center items-center py-8">
                <div className="text-gray-500">Carregando planos...</div>
              </div>
            ) : plansError ? (
              <div className="text-center py-8">
                <div className="text-red-600 mb-2">Erro ao carregar planos:</div>
                <div className="text-red-500 text-sm">{plansError}</div>
                <button 
                  onClick={fetchPlans}
                  className="mt-3 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Tentar Novamente
                </button>
              </div>
                         ) : filteredPlans.length === 0 ? (
               <div className="text-center py-8 text-gray-500">
                 {plansSearchTerm ? "Nenhum plano encontrado para esta busca" : "Nenhum plano encontrado"}
               </div>
             ) : (
               <div>
                 <div className="overflow-x-auto">
                   <table className="min-w-full divide-y divide-gray-200">
                     <thead className="bg-gray-50">
                       <tr>
                         <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                           ID
                         </th>
                         <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                           Plano
                         </th>
                         <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                           Valor
                         </th>
                         <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                           Ações
                         </th>
                       </tr>
                     </thead>
                     <tbody className="bg-white divide-y divide-gray-200">
                       {currentPlans.map((plan, index) => (
                         <tr key={plan.ID || plan.id || index} className="hover:bg-gray-50">
                           <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                             {plan.ID || plan.id || startIndex + index + 1}
                           </td>
                           <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                             {plan.plano || plan.Plano || plan.name || 'N/A'}
                           </td>
                           <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                             {plan.Valor || plan.valor || plan.price || 'N/A'}
                           </td>
                           <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                             <div className="flex space-x-2">
                               <button
                                 onClick={() => openEditModal(plan)}
                                 disabled={isEditingPlan}
                                 className="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-50 disabled:opacity-50"
                                 title="Editar Plano"
                               >
                                 <Edit size={14} />
                               </button>
                                                               <button
                                  onClick={() => confirmDeletePlan(plan.id || plan.ID, plan.plano || plan.Plano || plan.name || 'este plano')}
                                  disabled={isDeletingPlan}
                                  className="text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-50 disabled:opacity-50"
                                  title="Excluir Plano"
                                >
                                  <Trash2 size={14} />
                                </button>
                             </div>
                           </td>
                         </tr>
                       ))}
                     </tbody>
                   </table>
                 </div>

                 {/* Paginação */}
                 {totalPages > 1 && (
                   <div className="mt-6 flex items-center justify-between">
                     <div className="text-sm text-gray-700">
                       Mostrando {startIndex + 1} a {Math.min(endIndex, filteredPlans.length)} de {filteredPlans.length} planos
                     </div>
                     <div className="flex items-center space-x-2">
                       <button
                         onClick={prevPage}
                         disabled={currentPage === 1}
                         className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                       >
                         Anterior
                       </button>
                       
                       {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                         <button
                           key={page}
                           onClick={() => goToPage(page)}
                           className={`px-3 py-1 text-sm border rounded-md ${
                             currentPage === page
                               ? 'bg-blue-600 text-white border-blue-600'
                               : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                           }`}
                         >
                           {page}
                         </button>
                       ))}
                       
                       <button
                         onClick={nextPage}
                         disabled={currentPage === totalPages}
                         className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                       >
                         Próxima
                       </button>
                     </div>
                   </div>
                 )}
               </div>
             )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal para criar novo plano */}
      <Dialog open={isNewPlanModalOpen} onOpenChange={setIsNewPlanModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Novo Plano</DialogTitle>
            <DialogDescription>
              Crie um novo plano de atendimento
            </DialogDescription>
          </DialogHeader>
          
          <div className="mt-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nome do Plano
              </label>
              <input
                type="text"
                value={newPlanData.nome}
                onChange={(e) => setNewPlanData({ ...newPlanData, nome: e.target.value })}
                placeholder="Ex: Plano Básico"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Valor (R$)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={newPlanData.valor}
                onChange={(e) => setNewPlanData({ ...newPlanData, valor: e.target.value })}
                placeholder="0.00"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end space-x-3">
            <button
              onClick={() => {
                setIsNewPlanModalOpen(false);
                setNewPlanData({ nome: "", valor: "" });
              }}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
            >
              Cancelar
            </button>
            <button
              onClick={createNewPlan}
              disabled={isCreatingPlan}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCreatingPlan ? "Criando..." : "Criar Plano"}
            </button>
                     </div>
         </DialogContent>
       </Dialog>

       {/* Modal para editar plano */}
       <Dialog open={isEditPlanModalOpen} onOpenChange={setIsEditPlanModalOpen}>
         <DialogContent className="max-w-md">
           <DialogHeader>
             <DialogTitle>Editar Plano</DialogTitle>
             <DialogDescription>
               Atualize os dados do plano
             </DialogDescription>
           </DialogHeader>
           
           <div className="mt-4 space-y-4">
             <div>
               <label className="block text-sm font-medium text-gray-700 mb-1">
                 Nome do Plano
               </label>
               <input
                 type="text"
                 value={editingPlan?.nome || ""}
                 onChange={(e) => setEditingPlan({ ...editingPlan, nome: e.target.value })}
                 placeholder="Ex: Plano Básico"
                 className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
               />
             </div>
             
             <div>
               <label className="block text-sm font-medium text-gray-700 mb-1">
                 Valor (R$)
               </label>
               <input
                 type="number"
                 step="0.01"
                 min="0"
                 value={editingPlan?.valor || ""}
                 onChange={(e) => setEditingPlan({ ...editingPlan, valor: e.target.value })}
                 placeholder="0.00"
                 className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
               />
             </div>
           </div>

           <div className="mt-6 flex justify-end space-x-3">
             <button
               onClick={() => {
                 setIsEditPlanModalOpen(false);
                 setEditingPlan(null);
               }}
               className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
             >
               Cancelar
             </button>
             <button
               onClick={editPlan}
               disabled={isEditingPlan}
               className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
             >
               {isEditingPlan ? "Salvando..." : "Salvar Alterações"}
             </button>
                      </div>
         </DialogContent>
       </Dialog>

       {/* Modal de Confirmação de Exclusão */}
       <Dialog open={deleteConfirmation.show} onOpenChange={(open) => !open && setDeleteConfirmation({ show: false, planId: null, planName: "" })}>
         <DialogContent className="max-w-md">
           <DialogHeader>
             <DialogTitle className="text-red-600">Confirmar Exclusão</DialogTitle>
             <DialogDescription>
               Esta ação não pode ser desfeita.
             </DialogDescription>
           </DialogHeader>
           
           <div className="mt-4">
             <p className="text-gray-700">
               Tem certeza que deseja excluir o plano <span className="font-semibold">"{deleteConfirmation.planName}"</span>?
             </p>
           </div>

           <div className="mt-6 flex justify-end space-x-3">
             <button
               onClick={() => setDeleteConfirmation({ show: false, planId: null, planName: "" })}
               className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
             >
               Cancelar
             </button>
             <button
               onClick={executeDeletePlan}
               disabled={isDeletingPlan}
               className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
             >
               {isDeletingPlan ? "Excluindo..." : "Sim, Excluir"}
             </button>
           </div>
         </DialogContent>
       </Dialog>

       {/* Sistema de Notificações */}
       <div className="fixed bottom-4 right-4 z-[9999] space-y-2">
         {notifications.map((notification) => (
           <div
             key={notification.id}
             className={`max-w-sm w-full bg-white shadow-lg rounded-lg pointer-events-auto ring-1 ring-black ring-opacity-5 overflow-hidden transform transition-all duration-300 ease-in-out ${
               notification.type === 'success' 
                 ? 'ring-green-500 bg-green-50 border-l-4 border-l-green-500' 
                 : notification.type === 'error'
                 ? 'ring-red-500 bg-red-50 border-l-4 border-l-red-500'
                 : 'ring-yellow-500 bg-yellow-50 border-l-4 border-l-yellow-500'
             }`}
           >
             <div className="p-4">
               <div className="flex items-start">
                 <div className="flex-shrink-0">
                   {notification.type === 'success' && (
                     <svg className="h-6 w-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                     </svg>
                   )}
                   {notification.type === 'error' && (
                     <svg className="h-6 w-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                     </svg>
                   )}
                   {notification.type === 'warning' && (
                     <svg className="h-6 w-6 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                     </svg>
                   )}
                 </div>
                 <div className="ml-3 w-0 flex-1 pt-0.5">
                   <p className={`text-sm font-medium ${
                     notification.type === 'success' 
                       ? 'text-green-800' 
                       : notification.type === 'error'
                       ? 'text-red-800'
                       : 'text-yellow-800'
                   }`}>
                     {notification.message}
                   </p>
                 </div>
                 <div className="ml-4 flex flex-shrink-0">
                   <button
                     onClick={() => removeNotification(notification.id)}
                     className={`inline-flex rounded-md p-1.5 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                       notification.type === 'success' 
                         ? 'text-green-400 hover:text-green-500 focus:ring-green-500' 
                         : notification.type === 'error'
                         ? 'text-red-400 hover:text-red-500 focus:ring-green-500'
                         : 'text-yellow-400 hover:text-yellow-500 focus:ring-yellow-500'
                     }`}
                   >
                     <span className="sr-only">Fechar</span>
                     <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                       <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                     </svg>
                   </button>
                 </div>
               </div>
             </div>
           </div>
         ))}
       </div>
     </div>
   );
 };

export default UsersTable;
