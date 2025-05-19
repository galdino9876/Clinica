import { useState } from "react";
import { NavLink } from "react-router-dom";
import { Calendar, Users, BarChart3, LogOut, User, Key } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import ChangePasswordModal from "./ChangePasswordModal";

const Sidebar = () => {
  const { user, logout } = useAuth();
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  const getNavItems = () => {
    const baseItems = [
      { to: "/", label: "Agenda", icon: <Calendar className="mr-2 h-5 w-5" /> },
    ];

    if (user?.role === "admin" || user?.role === "receptionist") {
      baseItems.push(
        { to: "/patients", label: "Pacientes", icon: <Users className="mr-2 h-5 w-5" /> },
        { to: "/users", label: "Usuários", icon: <User className="mr-2 h-5 w-5" /> }
      );
    }

    if (user?.role === "psychologist") {
      baseItems.push(
        { to: "/patients", label: "Meus Pacientes", icon: <Users className="mr-2 h-5 w-5" /> }
      );
    }

    // Adiciona a página de confirmações apenas para admin (não para psicólogos)
    if (user?.role === "admin") {
      baseItems.push(
        { to: "/confirmations", label: "Confirmações", icon: <User className="mr-2 h-5 w-5" /> }
      );
    }

    baseItems.push(
      { to: "/finance", label: "Finanças", icon: <BarChart3 className="mr-2 h-5 w-5" /> }
    );

    return baseItems;
  };

  
  return (
    <div className="hidden md:flex min-h-screen w-64 flex-col bg-white border-r border-gray-200">
      <div className="flex flex-col justify-between h-full">
        <div>
          <div className="p-4 border-b border-gray-200">
            <h1 className="text-xl font-bold text-clinic-700">Clínica Psicológica</h1>
          </div>
          <div className="p-4">
            <div className="mb-2">
              <p className="text-sm text-gray-500">Logado como</p>
              <p className="font-medium">{user?.name}</p>
              <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
            </div>
          </div>
          <nav className="mt-2 px-2">
            <ul className="space-y-1">
              {getNavItems().map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
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
