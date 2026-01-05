import { useState, useEffect } from "react";
import { NavLink } from "react-router-dom";
import { Calendar, Users, BarChart3, LogOut, User, Key, X, ClipboardList } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import ChangePasswordModal from "./ChangePasswordModal";
import { isPsychologist, isAdmin, isReceptionist } from "@/utils/roleUtils";

interface SidebarProps {
  onClose?: () => void;
}

const Sidebar = ({ onClose }: SidebarProps) => {
  const { user, logout } = useAuth();
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);



  const handleNavClick = () => {
    // Fechar sidebar no mobile quando um item for clicado
    if (onClose) {
      onClose();
    }
  };

  const getNavItems = () => {
    const baseItems = [
      { to: "/", label: "Agenda", icon: <Calendar className="mr-2 h-5 w-5" /> },
    ];

    // Verificar roles de forma mais robusta
    const userIsAdmin = isAdmin(user?.role);
    const userIsReceptionist = isReceptionist(user?.role);
    const userIsPsychologist = isPsychologist(user?.role);

    if (userIsAdmin || userIsReceptionist) {
      baseItems.push(
        { to: "/patients", label: "Pacientes", icon: <Users className="mr-2 h-5 w-5" /> },
        { to: "/users", label: "Usuários", icon: <User className="mr-2 h-5 w-5" /> }
      );
    }

    if (userIsPsychologist) {
      baseItems.push(
        { to: "/patients", label: "Meus Pacientes", icon: <Users className="mr-2 h-5 w-5" /> }
      );
    }

    // Adiciona a página de confirmações para usuários que não são psicólogos
    if (!userIsPsychologist) {
      baseItems.push(
        { to: "/confirmations", label: "Confirmações", icon: <User className="mr-2 h-5 w-5" /> }
      );
    }

    // Adiciona controle de guias para admin e recepcionistas
    if (userIsAdmin || userIsReceptionist) {
      baseItems.push(
        { to: "/guide-control", label: "Controle de Guias", icon: <ClipboardList className="mr-2 h-5 w-5" /> }
      );
    }

    // Adiciona Finanças apenas para admin e psicólogos
    if (userIsAdmin || userIsPsychologist) {
      baseItems.push(
        { to: "/finance", label: "Finanças", icon: <BarChart3 className="mr-2 h-5 w-5" /> }
      );
    }

    return baseItems;
  };

  return (
    <div className="min-h-screen w-64 flex-col bg-white border-r border-gray-200 shadow-lg md:shadow-none">
      <div className="flex flex-col justify-between h-full">
        <div>
          {/* Header com botão de fechar para mobile */}
          <div className="p-4 border-b border-gray-200 flex justify-between items-center">
            <div>
              <h1 className="text-xl font-bold text-clinic-700">Clínica</h1>
              <p className="text-sm text-gray-600">Essência Saúde Integrada</p>
            </div>
            {/* Botão de fechar apenas para mobile */}
            <button
              onClick={onClose}
              className="md:hidden p-1 hover:bg-gray-100 rounded-md transition-colors"
              aria-label="Fechar menu"
            >
              <X className="h-5 w-5 text-gray-600" />
            </button>
          </div>
          
          <div className="p-4">
            <div className="mb-2">
              <p className="text-sm text-gray-500">Logado como</p>
              {user ? (
                <>
                  <p className="font-medium">{user.name}</p>
                  <p className="text-xs text-gray-500 capitalize">{user.role}</p>
                </>
              ) : (
                <p className="font-medium">Carregando...</p>
              )}
            </div>
          </div>
          <nav className="mt-2 px-2">
            <ul className="space-y-1">
              {getNavItems().map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    onClick={handleNavClick}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center px-3 py-2 text-sm rounded-md",
                        isActive
                          ? "bg-clinic-50 text-clinic-700 font-medium"
                          : "text-gray-600 hover:bg-gray-100"
                      )
                    }
                  >
                    {item.icon}
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
        </div>
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={() => setIsPasswordModalOpen(true)}
            className="flex w-full items-center px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-md mb-2"
          >
            <Key className="mr-2 h-5 w-5" />
            Alterar Senha
          </button>
          <button
            onClick={logout}
            className="flex w-full items-center px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-md"
          >
            <LogOut className="mr-2 h-5 w-5" />
            Sair
          </button>
        </div>
      </div>

      <ChangePasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
      />
    </div>
  );
};

export default Sidebar;
