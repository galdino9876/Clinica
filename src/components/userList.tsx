import React, { useState, useEffect } from "react";
import { Edit, Trash2, Eye, Plus, Clock, User } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import UserForm from "./UserForm";
import ScheduleForm from "./ScheduleForm"; // Ajuste o caminho

const UsersTable = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isUserFormOpen, setIsUserFormOpen] = useState(false);
  const [isScheduleFormOpen, setIsScheduleFormOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

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
          alert("Apenas psicólogos podem ter horários definidos.");
        }
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
    </div>
  );
};

export default UsersTable;
