"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Loader2, X } from "lucide-react";
import { InputDynamic } from "./inputDin";
import { SelectDynamic } from "./Selectsn";

// Schema de validação
const userSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório").max(100, "Nome deve ter no máximo 100 caracteres"),
  email: z.string().email("E-mail inválido").max(100, "E-mail deve ter no máximo 100 caracteres"),
  role: z.enum(["admin", "receptionist", "psychologist"], {
    required_error: "Função é obrigatória",
  }),
  phone: z.string().max(20, "Telefone deve ter no máximo 20 caracteres").optional(),
  username: z.string().max(30, "Usuário deve ter no máximo 30 caracteres").optional(),
  password: z.string().min(1, "Senha é obrigatória").max(255, "Senha deve ter no máximo 255 caracteres"),
});

type UserFormData = z.infer<typeof userSchema>;

interface UserFormProps {
  onSave?: (user: any) => void;
  onCancel?: () => void;
  open?: boolean;
}

const UserForm = ({ onSave, onCancel, open = false }: UserFormProps) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const formMethods = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      name: "",
      email: "",
      role: "psychologist",
      phone: "",
      username: "",
      password: "",
    },
  });

  const {
    handleSubmit,
    setValue,
    control,
    formState: { errors },
    reset,
  } = formMethods;

  const onSubmit = async (data: UserFormData) => {
    setIsLoading(true);

    try {
      const response = await fetch("https://webhook.essenciasaudeintegrada.com.br/webhook/create-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        const newUser = await response.json();
        toast({
          title: "Sucesso",
          description: "Usuário cadastrado com sucesso.",
        });

        if (onSave) {
          onSave(newUser);
        }

        reset();
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Erro ao criar usuário");
      }
    } catch (error) {
      console.error("Erro ao salvar usuário:", error);
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Falha ao cadastrar usuário. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InputDynamic
              name="name"
              label="Nome"
              control={control}
              placeholder="Digite o nome"
              required
              disabled={isLoading}
              errors={errors}
              className="md:col-span-2"
              onClear={() => setValue("name", "")}
            />

            <InputDynamic
              name="email"
              label="E-mail"
              control={control}
              placeholder="exemplo@email.com"
              type="email"
              required
              disabled={isLoading}
              errors={errors}
              className="md:col-span-2"
              onClear={() => setValue("email", "")}
            />

            <SelectDynamic
              name="role"
              control={control}
              label="Função"
              options={[
                { id: "admin", label: "Admin" },
                { id: "receptionist", label: "Recepcionista" },
                { id: "psychologist", label: "Psicólogo" },
              ]}
              placeholder="Selecione a função"
              required
              errors={errors}
              disabled={isLoading}
            />

            <InputDynamic
              name="phone"
              label="Telefone"
              control={control}
              placeholder="(11) 99999-9999"
              type="tel"
              disabled={isLoading}
              errors={errors}
              maxLength={20}
              onClear={() => setValue("phone", "")}
            />

            <InputDynamic
              name="username"
              label="Usuário"
              control={control}
              placeholder="Digite o usuário"
              disabled={isLoading}
              errors={errors}
              maxLength={30}
              onClear={() => setValue("username", "")}
            />

            <InputDynamic
              name="password"
              label="Senha"
              control={control}
              placeholder="Digite a senha"
              type="password"
              required
              disabled={isLoading}
              errors={errors}
              className="md:col-span-2"
              onClear={() => setValue("password", "")}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                "Cadastrar"
              )}
            </Button>
          </div>
        </form>

  );
};

export default UserForm;
