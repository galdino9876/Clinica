
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { User, UserRole, WorkingHours } from "@/types/user";
import WorkingHoursSelector from "./WorkingHoursSelector";
import { useAuth } from "@/context/AuthContext";

interface UserFormProps {
  user?: User;
  onSave: (user: User) => void;
  onCancel: () => void;
}

const UserForm = ({ user, onSave, onCancel }: UserFormProps) => {
  const { addUser, updateUser } = useAuth();
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [role, setRole] = useState<UserRole>(user?.role || "psychologist");
  const [workingHours, setWorkingHours] = useState<WorkingHours[]>(
    user?.workingHours || []
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const userData: Omit<User, "id"> = {
      name,
      email,
      role,
      phone,
      ...(role === "psychologist" && { workingHours }),
    };

    if (user) {
      const updatedUser = { ...userData, id: user.id };
      updateUser(updatedUser);
      onSave(updatedUser);
    } else {
      const newUser = addUser(userData);
      onSave(newUser);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Nome Completo</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">E-mail</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Telefone</Label>
          <Input
            id="phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="(00) 00000-0000"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="role">Função</Label>
          <Select
            value={role}
            onValueChange={(value: UserRole) => setRole(value)}
          >
            <SelectTrigger id="role">
              <SelectValue placeholder="Selecione a função" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="admin">Administrador</SelectItem>
              <SelectItem value="receptionist">Recepcionista</SelectItem>
              <SelectItem value="psychologist">Psicólogo</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {role === "psychologist" && (
        <WorkingHoursSelector
          workingHours={workingHours}
          onChange={setWorkingHours}
        />
      )}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit">
          {user ? "Atualizar" : "Cadastrar"} Usuário
        </Button>
      </div>
    </form>
  );
};

export default UserForm;
