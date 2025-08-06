import React, { createContext, useState, useContext, ReactNode } from "react";
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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Função para gerar ID aleatório (caso necessário)
const generateId = (): string => Math.random().toString(36).substring(2, 11);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const savedUser = localStorage.getItem("user");
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [users, setUsers] = useState<User[]>(() => {
    const savedUsers = localStorage.getItem("users");
    return savedUsers ? JSON.parse(savedUsers) : [];
  });
  const { toast } = useToast();

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const response = await fetch("https://webhook.essenciasaudeintegrada.com.br/webhook/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (response.status === 200) {
        // Busca o usuário após login bem-sucedido usando o email
        const fetchedUser = await getUserByEmail(email);
        if (fetchedUser) {
          setUser(fetchedUser);
          localStorage.setItem("user", JSON.stringify(fetchedUser));
          toast({
            title: "Login realizado com sucesso",
            description: `Bem-vindo(a), ${fetchedUser.name || email.split("@")[0]}!`,
          });
          return true;
        } else {
          toast({
            title: "Erro",
            description: "Usuário não encontrado após login.",
            variant: "destructive",
          });
          return false;
        }
      } else {
        const errorData = await response.json();
        toast({
          title: "Falha no login",
          description: errorData.message || "Usuário ou senha inválidos",
          variant: "destructive",
        });
        return false;
      }
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

  const logout = () => {
    setUser(null);
    localStorage.removeItem("user");
    toast({
      title: "Desconectado",
      description: "Você foi desconectado com sucesso",
    });
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
      const response = await fetch(`https://webhook.essenciasaudeintegrada.com.br/webhook/d52c9494-5de9-4444-877e-9e8d01662962/usersEmail/${email}`);
      if (!response.ok) throw new Error("Usuário não encontrado");
      const data = await response.json();
      // Garante que retorna o objeto correto, mesmo que venha como array
      const user = Array.isArray(data) ? data[0] : data;
      return user;
    } catch (error) {
      console.error("Erro ao buscar usuário por email:", error);
      return undefined;
    }
  };

  const getPsychologists = () => {
    return users.filter(user => user.role === "psychologist");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        users,
        login,
        logout,
        isAuthenticated: !!user,
        addUser,
        deleteUser,
        getUserByEmail,
        getPsychologists,
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
