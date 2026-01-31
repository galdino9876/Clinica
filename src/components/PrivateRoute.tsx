
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useEffect, useState, useRef } from "react";

interface PrivateRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

const PrivateRoute = ({ children, allowedRoles = [] }: PrivateRouteProps) => {
  const { user, isAuthenticated, isValidating, validateSession } = useAuth();
  const location = useLocation();
  const [isChecking, setIsChecking] = useState(false);
  const lastLocationRef = useRef<string>("");
  const hasValidatedInitialRef = useRef<boolean>(false);

  useEffect(() => {
    // Validar sessão apenas quando:
    // 1. Inicialização termina (primeira vez após isValidating = false)
    // 2. Mudança de rota (location.pathname muda)
    const checkAuth = async () => {
      // Aguardar validação inicial terminar
      if (isValidating) {
        return;
      }

      // Na primeira vez após validação inicial, não validar novamente
      // (já foi validado no AuthContext)
      if (!hasValidatedInitialRef.current) {
        hasValidatedInitialRef.current = true;
        lastLocationRef.current = location.pathname;
        setIsChecking(false);
        return;
      }

      // Verificar se a rota mudou
      const routeChanged = lastLocationRef.current !== location.pathname;
      
      if (routeChanged) {
        lastLocationRef.current = location.pathname;
        
        // Validar sessão apenas quando troca de página
        setIsChecking(true);
        await validateSession();
        setIsChecking(false);
      }
    };

    checkAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, isValidating]);

  // Mostrar loading enquanto valida na inicialização
  if (isValidating) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Verificando autenticação...</p>
        </div>
      </div>
    );
  }

  // Mostrar loading apenas quando está validando mudança de rota
  if (isChecking && !isValidating) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Verificando autenticação...</p>
        </div>
      </div>
    );
  }

  // Check if the user is authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Check if the user has one of the required roles (if specified)
  if (allowedRoles.length > 0 && user && !allowedRoles.includes(user.role)) {
    return <Navigate to="/404" replace />;
  }

  return <>{children}</>;
};

export default PrivateRoute;
