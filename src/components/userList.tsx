import React, { useState, useEffect } from 'react';
import { Edit, Trash2, Eye, Plus, Clock, User } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import UserForm from "./UserForm"; // Ajuste o caminho conforme necessário

const UsersTable = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  // Configuração dinâmica das ações
  const actions = [
    {
      id: 'edit',
      label: 'Editar',
      icon: Edit,
      color: 'text-blue-600 hover:text-blue-800',
      onClick: (user) => {
        console.log('Editando usuário:', user);
        alert(`Editar usuário: ${user.nome || user.name}`);
      }
    },
   {
  id: 'delete',
  label: 'Excluir',
  icon: Trash2,
  color: 'text-red-600 hover:text-red-800',
  onClick: (user) => {
    console.log('Excluindo usuário:', user);
    if (window.confirm(`Deseja realmente excluir o usuário ${user.nome || user.name}?`)) {
      fetch('https://webhook.essenciasaudeintegrada.com.br/webhook/delete-user', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: user.id || user.id }), // Usa o ID do usuário passado
      })
        .then(response => {
          if (!response.ok) {
            throw new Error('Falha ao excluir usuário');
          }
          return response.json();
        })
        .then(data => {
          console.log('Usuário excluído:', data);
          alert(`Usuário ${user.nome || user.name} excluído com sucesso!`);
          // Opcional: Atualize a lista de usuários removendo o item
          // setUsers(prevUsers => prevUsers.filter(u => u.id !== user.id));
        })
        .catch(error => {
          console.error('Erro ao excluir usuário:', error);
          alert(`Erro ao excluir usuário ${user.nome || user.name}: ${error.message}`);
        });
    }
  }
}
  ];

  // Função para buscar os dados da API
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch('https://webhook.essenciasaudeintegrada.com.br/webhook/users');

      if (!response.ok) {
        throw new Error(`Erro na API: ${response.status}`);
      }

      const data = await response.json();
      const usersData = Array.isArray(data) ? data : data.users || data.data || [];
      setUsers(usersData);
      setError(null);
    } catch (err) {
      console.error('Erro ao buscar usuários:', err);
      setError(err.message);
      setUsers([
        {
          id: 1,
          nome: 'Dr. João Silva',
          email: 'joao.silva@clinica.com',
          telefone: '(11) 99999-9999',
          funcao: 'Psicólogo',
          horarios: ['08:00-12:00', '14:00-18:00']
        },
        {
          id: 2,
          nome: 'Dra. Maria Santos',
          email: 'maria.santos@clinica.com',
          telefone: '(11) 88888-8888',
          funcao: 'Psicóloga',
          horarios: ['09:00-13:00', '15:00-19:00']
        },
        {
          id: 3,
          nome: 'Ana Costa',
          email: 'ana.costa@clinica.com',
          telefone: '(11) 77777-7777',
          funcao: 'Recepcionista',
          horarios: []
        },
        {
          id: 4,
          nome: 'Carlos Lima',
          email: 'carlos.lima@clinica.com',
          telefone: '(11) 66666-6666',
          funcao: 'Administrador',
          horarios: []
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Função para renderizar a função com cores
  const renderFunction = (funcao) => {
    const functionColors = {
      'Psicólogo': 'bg-blue-100 text-blue-800',
      'Psicóloga': 'bg-blue-100 text-blue-800',
      'Recepcionista': 'bg-green-100 text-green-800',
      'Administrador': 'bg-purple-100 text-purple-800',
      'Admin': 'bg-purple-100 text-purple-800',
      'Gerente': 'bg-orange-100 text-orange-800'
    };

    const colorClass = functionColors[funcao] || 'bg-gray-100 text-gray-800';

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colorClass}`}>
        {funcao}
      </span>
    );
  };

  // Função para renderizar horários
  const renderSchedules = (horarios, funcao) => {
    const isPsychologist = funcao && (funcao.toLowerCase().includes('psicólog') || funcao.toLowerCase().includes('psycholog'));

    if (!isPsychologist) {
      return <span className="text-gray-400 text-sm">-</span>;
    }

    if (!horarios || horarios.length === 0) {
      return <span className="text-red-500 text-sm">Não definido</span>;
    }

    return (
      <div className="space-y-1">
        {horarios.map((horario, index) => (
          <div key={index} className="flex items-center text-sm text-gray-700">
            <Clock size={12} className="mr-1" />
            {horario}
          </div>
        ))}
      </div>
    );
  };

  // Função para atualizar a lista após adicionar um usuário
  const handleUserAdded = (newUser) => {
    setUsers((prevUsers) => [...prevUsers, newUser]);
    setIsFormOpen(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Carregando usuários...</span>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto p-6">
      <div className="bg-white shadow-lg rounded-lg overflow-hidden">
        {/* Header */}
        <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
              <User size={24} />
              Usuários ({users.length})
            </h2>
            <button
              onClick={() => setIsFormOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center gap-2 transition-colors"
            >
              <Plus size={16} />
              Novo Usuário
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
                  E-mail
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Telefone
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Função
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Horários (Psicólogos)
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                    Nenhum usuário encontrado
                  </td>
                </tr>
              ) : (
                users.map((user, index) => (
                  <tr key={user.id || index} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {user.nome || user.name || 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {user.email || 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {user.telefone || user.phone || 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {renderFunction(user.funcao || user.role || user.function || 'N/A')}
                    </td>
                    <td className="px-6 py-4">
                      {renderSchedules(
                        user.horarios || user.schedules || user.schedule,
                        user.funcao || user.role || user.function
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        {actions.map((action) => {
                          const IconComponent = action.icon;
                          return (
                            <button
                              key={action.id}
                              onClick={() => action.onClick(user)}
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

        {/* Footer com estatísticas */}
        <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
          <div className="flex justify-between text-sm text-gray-700">
            <div>Total de usuários: {users.length}</div>
            <div>
              Psicólogos: {users.filter(u =>
                (u.funcao || u.role || u.function || '').toLowerCase().includes('psicólog')
              ).length}
            </div>
          </div>
        </div>
      </div>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Usuário</DialogTitle>
            <DialogDescription>Preencha os dados do novo usuário</DialogDescription>
          </DialogHeader>
          <UserForm onSave={handleUserAdded} onCancel={() => setIsFormOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UsersTable;
