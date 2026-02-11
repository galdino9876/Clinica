
import { ReactNode, useState } from "react";
import Sidebar from "./Sidebar";
import { useAuth } from "@/context/AuthContext";
import { Navigate } from "react-router-dom";
import { Menu, X } from "lucide-react";

interface LayoutProps {
  children: ReactNode;
  requireAuth?: boolean;
}

const Layout = ({ children, requireAuth = true }: LayoutProps) => {
  const { isAuthenticated } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  if (requireAuth && !isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const closeSidebar = () => {
    setIsSidebarOpen(false);
  };

  return (
    <div 
      className={`flex min-h-screen ${requireAuth ? 'bg-gray-50' : ''}`} 
      style={!requireAuth ? { backgroundColor: 'rgb(185, 159, 126)', margin: 0, padding: 0 } : { backgroundColor: '#f9fafb' }}
    >
      {/* Botão Hambúrguer para Mobile */}
      {isAuthenticated && (
        <button
          onClick={toggleSidebar}
          className="md:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-lg border border-gray-200 hover:bg-gray-50 transition-colors"
          aria-label="Abrir menu de navegação"
        >
          {isSidebarOpen ? (
            <X className="h-6 w-6 text-gray-700" />
          ) : (
            <Menu className="h-6 w-6 text-gray-700" />
          )}
        </button>
      )}

      {/* Sidebar */}
      {isAuthenticated && (
        <div className={`${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 fixed md:relative inset-y-0 left-0 z-40 transition-transform duration-300 ease-in-out w-64`}>
          <Sidebar onClose={closeSidebar} />
        </div>
      )}

      {/* Overlay para fechar sidebar no mobile */}
      {isSidebarOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={closeSidebar}
        />
      )}

      {/* Conteúdo principal */}
      <main className={`flex-1 ${requireAuth ? 'p-4 md:p-6 md:ml-0 transition-all duration-300 pt-20 md:pt-6' : 'p-0 m-0'}`}>
        {children}
      </main>
    </div>
  );
};

export default Layout;
