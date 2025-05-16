
import React, { createContext, useState, useContext, ReactNode } from "react";
import { User, UserRole, WorkingHours } from "../types/user";
import { useToast } from "@/components/ui/use-toast";

interface AuthContextType {
  user: User | null;
  users: User[];
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
  addUser: (userData: Omit<User, "id">) => User;
  updateUser: (user: User) => void;
  deleteUser: (id: string) => void;
  getUserById: (id: string) => User | undefined;
  getPsychologists: () => User[];
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Mock users for demonstration
const initialUsers: User[] = [
  { id: "1", name: "Admin User", email: "admin@example.com", role: "admin" },
  { id: "2", name: "Receptionist User", email: "receptionist@example.com", role: "receptionist" },
  { 
    id: "3", 
    name: "Dr. John Smith", 
    email: "john@example.com", 
    role: "psychologist",
    phone: "(11) 99999-8888",
    workingHours: [
      { dayOfWeek: 1, startTime: "09:00", endTime: "18:00" },
      { dayOfWeek: 3, startTime: "09:00", endTime: "18:00" }
    ]
  },
  { 
    id: "4", 
    name: "Dr. Sarah Johnson", 
    email: "sarah@example.com", 
    role: "psychologist",
    phone: "(11) 99888-7777",
    workingHours: [
      { dayOfWeek: 2, startTime: "13:00", endTime: "19:00" },
      { dayOfWeek: 4, startTime: "13:00", endTime: "19:00" }
    ]
  },
];

// Function to generate random ID
const generateId = (): string => Math.random().toString(36).substring(2, 11);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const savedUser = localStorage.getItem("user");
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [users, setUsers] = useState<User[]>(initialUsers);
  const { toast } = useToast();

  const login = async (email: string, password: string): Promise<boolean> => {
    // In a real app, this would be an API call
    const foundUser = users.find(u => u.email === email);
    
    if (foundUser && password === "password") { // Simple mock password
      setUser(foundUser);
      localStorage.setItem("user", JSON.stringify(foundUser));
      toast({
        title: "Login successful",
        description: `Welcome, ${foundUser.name}!`,
      });
      return true;
    } else {
      toast({
        title: "Login failed",
        description: "Invalid email or password",
        variant: "destructive",
      });
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("user");
    toast({
      title: "Logged out",
      description: "You have been logged out successfully",
    });
  };

  const addUser = (userData: Omit<User, "id">): User => {
    const newUser: User = {
      id: generateId(),
      ...userData
    };
    setUsers(prev => [...prev, newUser]);
    toast({
      title: "User added",
      description: `User ${userData.name} has been added.`
    });
    return newUser;
  };

  const updateUser = (user: User) => {
    setUsers(prev => 
      prev.map(u => u.id === user.id ? user : u)
    );
    toast({
      title: "User updated",
      description: `User ${user.name} has been updated.`
    });
  };

  const deleteUser = (id: string) => {
    const userToDelete = users.find(u => u.id === id);
    
    setUsers(prev => prev.filter(u => u.id !== id));
    if (userToDelete) {
      toast({
        title: "User deleted",
        description: `User ${userToDelete.name} has been removed.`
      });
    }
  };

  const getUserById = (id: string) => {
    return users.find(user => user.id === id);
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
        updateUser,
        deleteUser,
        getUserById,
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
