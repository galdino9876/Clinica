import React, { createContext, useState, useContext, ReactNode, useEffect } from "react";
import { User, UserRole, WorkingHours } from "../types/user";
import { useToast } from "@/components/ui/use-toast";

interface AuthContextType {
  user: User | null;
  users: User[];
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
  addUser: (userData: Omit<User, "id">) => Promise<User>;
  deleteUser: (id: string) => Promise<void>;
  getUserByEmail: (email: string) => Promise<User | undefined>;
  getPsychologists: () => User[];
  changePassword: (userId: number, newPassword: string) => Promise<boolean>;
  validateSession: () => Promise<boolean>;
  isValidating: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Função para gerar ID aleatório (caso necessário)
const generateId = (): string => Math.random().toString(36).substring(2, 11);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isValidating, setIsValidating] = useState(true); // Estado para controlar validação inicial
  const [users, setUsers] = useState<User[]>(() => {
    const savedUsers = localStorage.getItem("users");
    return savedUsers ? JSON.parse(savedUsers) : [];
  });
  const { toast } = useToast();

  // Flag para evitar validações simultâneas
  const [isValidatingSession, setIsValidatingSession] = useState(false);

  // Função para validar sessão verificando se sessao = 1 (bloqueado)
  const validateSession = async (): Promise<boolean> => {
    // Evitar validações simultâneas
    if (isValidatingSession) {
      return !!user;
    }

    try {
      setIsValidatingSession(true);
      const savedUser = localStorage.getItem("user");
      if (!savedUser) {
        setIsValidatingSession(false);
        return false;
      }

      const userData = JSON.parse(savedUser);
      const userEmail = userData.email;

      // PRIMEIRA VERIFICAÇÃO: Buscar usuário no servidor para verificar campo sessao
      const response = await fetch("https://webhook.essenciasaudeintegrada.com.br/webhook/users");
      
      // Se houver erro de CORS ou 500, manter o usuário logado (não deslogar por erro de API)
      if (!response.ok) {
        if (response.status === 500 || response.status === 0) {
          console.warn("Erro de CORS ou 500 ao validar sessão. Mantendo usuário logado.");
          // Manter o usuário logado se houver erro de API (não deslogar por problema técnico)
          setIsValidatingSession(false);
          return true;
        }
        console.error("Erro ao buscar usuários para validação:", response.status);
        setIsValidatingSession(false);
        return false;
      }

      const allUsers = await response.json();
      if (!Array.isArray(allUsers)) {
        setIsValidatingSession(false);
        return false;
      }

      // Procurar o usuário atual no servidor
      const currentUser = allUsers.find((u: any) => 
        u.email === userEmail || 
        u.email?.toLowerCase() === userEmail.toLowerCase() ||
        u.username === userEmail ||
        u.username?.toLowerCase() === userEmail.toLowerCase()
      );

      if (!currentUser) {
        // Usuário não existe mais ou foi removido
        setUser(null);
        localStorage.removeItem("user");
        setIsValidatingSession(false);
        return false;
      }

      // VERIFICAÇÃO CRÍTICA: Se sessao = 1, usuário está bloqueado
      if (currentUser.sessao === 1) {
        // Usuário bloqueado - fazer logout imediatamente
        setUser(null);
        localStorage.removeItem("user");
        toast({
          title: "Sessão Expirada",
          description: "Sua sessão expirou. Por favor, faça login novamente.",
          variant: "destructive",
        });
        setIsValidatingSession(false);
        return false;
      }

      // Atualizar dados do usuário com informações mais recentes do servidor
      setUser(currentUser);
      localStorage.setItem("user", JSON.stringify(currentUser));
      setIsValidatingSession(false);
      return true;
    } catch (error: any) {
      // Se for erro de CORS ou rede, manter usuário logado
      if (error?.message?.includes('CORS') || 
          error?.message?.includes('Failed to fetch') || 
          error?.message?.includes('500')) {
        console.warn("Erro de CORS ou rede ao validar sessão. Mantendo usuário logado.");
        setIsValidatingSession(false);
        return true; // Manter logado se houver erro técnico
      }
      console.error("Erro ao validar sessão:", error);
      setIsValidatingSession(false);
      return false;
    }
  };

  // Validar sessão na inicialização - PRIMEIRA COISA A FAZER
  useEffect(() => {
    const checkSession = async () => {
      setIsValidating(true);
      const savedUser = localStorage.getItem("user");
      
      if (savedUser) {
        // Se há usuário salvo, validar imediatamente antes de qualquer coisa
        const isValid = await validateSession();
        if (!isValid) {
          setUser(null);
          localStorage.removeItem("user");
        }
      }
      
      setIsValidating(false);
    };

    // Executar validação apenas uma vez na inicialização
    checkSession();
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const response = await fetch("https://webhook.essenciasaudeintegrada.com.br/webhook/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      // A resposta é um array com um objeto
      const result = await response.json();
      
      // Verificar se é um array e pegar o primeiro elemento
      let responseData: any = null;
      if (Array.isArray(result) && result.length > 0) {
        responseData = result[0];
      } else if (typeof result === 'object' && result !== null) {
        responseData = result;
      } else {
        toast({
          title: "Falha no login",
          description: "Resposta inválida do servidor.",
          variant: "destructive",
        });
        return false;
      }

      // Verificar se o login foi bem-sucedido
      // success: "true" ou "false" (string)
      // statusCode: "200" ou "400" (string)
      // message: "true" ou "false" (string)
      const success = responseData.success === "true" || responseData.success === true;
      const statusCode = responseData.statusCode;
      const message = responseData.message;

      // Login bem-sucedido se success === "true" ou statusCode === "200"
      const loginSuccess = success || statusCode === "200" || message === "true";

      if (!loginSuccess) {
        toast({
          title: "Falha no login",
          description: responseData.message || "Usuário ou senha inválidos",
          variant: "destructive",
        });
        return false;
      }

      // Buscar dados do usuário após login bem-sucedido
      // A resposta do login não retorna os dados do usuário, então precisamos buscar
      // IMPORTANTE: Se a API bloquear ou falhar, o login NÃO será permitido
      console.log("Login bem-sucedido, buscando dados do usuário com email:", email);
      
      // Buscar o usuário - se falhar, o login será bloqueado
      const fetchedUser = await getUserByEmail(email);

      // Se não encontrou o usuário ou houve erro de API, BLOQUEAR o login
      if (!fetchedUser) {
        console.error("Não foi possível carregar os dados do usuário. Login bloqueado.");
        toast({
          title: "Erro ao carregar dados",
          description: "Não foi possível carregar os dados do usuário. A API pode estar bloqueada ou com problemas. Tente novamente mais tarde.",
          variant: "destructive",
        });
        return false;
      }

      // VERIFICAR se sessao = 1 antes de permitir login
      if (fetchedUser.sessao === 1) {
        toast({
          title: "Acesso bloqueado",
          description: "Sua conta foi bloqueada. Entre em contato com o administrador.",
          variant: "destructive",
        });
        return false;
      }

      setUser(fetchedUser);
      localStorage.setItem("user", JSON.stringify(fetchedUser));
      toast({
        title: "Login realizado com sucesso",
        description: `Bem-vindo(a), ${fetchedUser.name || email.split("@")[0]}!`,
      });
      return true;
    } catch (error) {
      console.error("Erro no login:", error);
      toast({
        title: "Erro",
        description: "Falha na conexão com o servidor. Tente novamente.",
        variant: "destructive",
      });
      return false;
    }
  };

  const logout = (silent: boolean = false) => {
    setUser(null);
    localStorage.removeItem("user");
    if (!silent) {
      toast({
        title: "Desconectado",
        description: "Você foi desconectado com sucesso",
      });
    }
  };

  const addUser = async (userData: Omit<User, "id">): Promise<User> => {
    try {
      const response = await fetch("https://webhook.essenciasaudeintegrada.com.br/webhook/create-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userData),
      });
      if (!response.ok) throw new Error("Falha ao criar usuário");
      const newUser = await response.json();
      const updatedUsers = [...users, newUser];
      setUsers(updatedUsers);
      localStorage.setItem("users", JSON.stringify(updatedUsers));
      toast({
        title: "Usuário adicionado",
        description: `O usuário ${userData.name} foi adicionado.`,
      });
      return newUser;
    } catch (error) {
      console.error("Erro ao adicionar usuário:", error);
      toast({
        title: "Erro",
        description: "Falha ao criar usuário. Tente novamente.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const deleteUser = async (id: string): Promise<void> => {
    try {
      const response = await fetch(`https://webhook.essenciasaudeintegrada.com.br/webhook/delete-user`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!response.ok) throw new Error("Falha ao excluir usuário");
      const updatedUsers = users.filter(u => u.id);
      setUsers(updatedUsers);
      localStorage.setItem("users", JSON.stringify(updatedUsers));
      toast({
        title: "Usuário excluído",
        description: `O usuário foi removido.`,
      });
    } catch (error) {
      console.error("Erro ao excluir usuário:", error);
      toast({
        title: "Erro",
        description: "Falha ao excluir usuário. Tente novamente.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const getUserByEmail = async (email: string): Promise<User | undefined> => {
    try {
      // Usar a API correta que retorna todos os usuários
      const response = await fetch(`https://webhook.essenciasaudeintegrada.com.br/webhook/users`);
      
      // Se houver erro (CORS, 500, etc), retornar undefined para bloquear o login
      if (!response.ok) {
        console.error("Erro na resposta da API /webhook/users:", response.status, response.statusText);
        if (response.status === 500 || response.status === 0) {
          console.error("Erro de CORS ou erro 500. Login será bloqueado.");
        }
        return undefined; // Retornar undefined para bloquear o login
      }
      
      const data = await response.json();
      console.log("Resposta de /webhook/users:", data);
      console.log("Buscando usuário com email:", email);
      
      // Verificar se a resposta é um array de usuários
      if (!Array.isArray(data)) {
        console.error("Resposta não é um array:", typeof data, data);
        return undefined;
      }
      
      // Verificar se o array está vazio
      if (data.length === 0) {
        console.warn("Array de usuários está vazio. A API retornou vazio. Login será bloqueado.");
        return undefined;
      }
      
      // Procurar o usuário pelo email
      const user = data.find((u: any) => {
        const emailMatch = u.email === email || u.email?.toLowerCase() === email.toLowerCase();
        const usernameMatch = u.username === email || u.username?.toLowerCase() === email.toLowerCase();
        return emailMatch || usernameMatch;
      });
      
      if (!user) {
        console.warn("Usuário não encontrado na lista. Email buscado:", email);
        console.log("Usuários disponíveis:", data.map((u: any) => ({ email: u.email, username: u.username })));
      }
      
      return user;
    } catch (error: any) {
      // Qualquer erro (CORS, rede, etc) bloqueia o login
      if (error?.message?.includes('CORS') || 
          error?.message?.includes('Failed to fetch') || 
          error?.message?.includes('500')) {
        console.error("Erro de CORS ou rede ao buscar usuário. Login será bloqueado:", error);
      } else {
        console.error("Erro ao buscar usuário por email:", error);
      }
      return undefined; // Retornar undefined para bloquear o login
    }
  };

  const getPsychologists = () => {
    return users.filter(user => user.role === "psychologist");
  };

  const changePassword = async (userId: number, newPassword: string): Promise<boolean> => {
    try {
      // Validar sessão antes de permitir alteração de senha
      const isValid = await validateSession();
      if (!isValid) {
        return false;
      }

      const response = await fetch("https://webhook.essenciasaudeintegrada.com.br/webhook/update_password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: userId,
          password: newPassword,
        }),
      });

      if (response.ok) {
        toast({
          title: "Senha alterada",
          description: "Sua senha foi alterada com sucesso. Por favor, faça login novamente.",
        });
        
        // Fazer logout após mudança de senha para segurança
        setTimeout(() => {
          logout(true);
        }, 2000);
        
        return true;
      } else {
        const errorData = await response.json().catch(() => ({}));
        toast({
          title: "Erro ao alterar senha",
          description: errorData.message || "Falha ao alterar senha. Tente novamente.",
          variant: "destructive",
        });
        return false;
      }
    } catch (error) {
      console.error("Erro ao alterar senha:", error);
      toast({
        title: "Erro",
        description: "Falha na conexão com o servidor. Tente novamente.",
        variant: "destructive",
      });
      return false;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        users,
        login,
        logout,
        isAuthenticated: !!user && !isValidating,
        addUser,
        deleteUser,
        getUserByEmail,
        getPsychologists,
        changePassword,
        validateSession,
        isValidating,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
