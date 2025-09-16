"use client";

import React, { useState, useEffect } from "react";
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
  phone: z.string()
    .min(11, "Telefone deve ter 11 dígitos (DDD + 9 + número)")
    .max(11, "Telefone deve ter 11 dígitos (DDD + 9 + número)")
    .regex(/^\d{11}$/, "Telefone deve conter apenas números no formato DDD+9+número")
    .optional(),
  username: z.string().max(30, "Usuário deve ter no máximo 30 caracteres").optional(),
  password: z.string().max(255, "Senha deve ter no máximo 255 caracteres").optional(), // Opcional em edição
  crp: z.string().max(20, "CRP deve ter no máximo 20 caracteres").optional(), // Opcional para psicólogos
});

type UserFormData = z.infer<typeof userSchema>;

interface UserFormProps {
  onSave?: (user: any) => void;
  onCancel?: () => void;
  open?: boolean;
  user?: UserFormData & { id: number }; // Inclui o ID para edição
  isEdit?: boolean; // Indica se é modo de edição
}

const UserForm = ({ onSave, onCancel, open = false, user, isEdit = false }: UserFormProps) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const formMethods = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      name: user?.name || "",
      email: user?.email || "",
      role: user?.role || "psychologist",
      phone: user?.phone || "",
      username: user?.username || "",
      password: user?.password || "", // Opcional, pode ser deixado em branco
      crp: user?.crp || "", // Preenche o CRP ao editar
    },
  });

  const {
    handleSubmit,
    setValue,
    control,
    formState: { errors },
    reset,
    watch, // Adicionado para acessar o valor do campo CRP
  } = formMethods;

  // Pré-preenche os dados do usuário ao entrar em modo de edição
  useEffect(() => {
    if (user && isEdit) {
      reset({
        name: user.name || "",
        email: user.email || "",
        role: user.role || "psychologist",
        phone: user.phone || "",
        username: user.username || "",
        password: "", // Senha em branco por padrão em edição
        crp: user.crp || "", // Preenche o CRP ao editar
      });
    } else {
      reset({
        name: "",
        email: "",
        role: "psychologist",
        phone: "",
        username: "",
        password: "",
        crp: "",
      });
    }
  }, [user, isEdit, reset]);

  const onSubmit = async (data: UserFormData) => {
    setIsLoading(true);

    try {
      const url = isEdit
        ? `https://webhook.essenciasaudeintegrada.com.br/webhook/54590e1f-58e5-4d5a-896f-97ce434591d2/update-user/${user?.id}`
        : "https://webhook.essenciasaudeintegrada.com.br/webhook/create-user";
      const method = isEdit ? "POST" : "POST";

      // Log para debug - verificar se CRP está sendo enviado
      console.log("Dados do formulário (data):", data);
      console.log("Dados a serem enviados:", isEdit ? { id: user?.id, ...data } : data);
      console.log("Campo CRP específico:", data.crp);
      console.log("Tipo do campo CRP:", typeof data.crp);

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(isEdit ? { id: user?.id, ...data } : data),
      });

      if (response.ok) {
        const result = await response.json();
        toast({
          title: "Sucesso",
          description: isEdit ? "Usuário atualizado com sucesso." : "Usuário cadastrado com sucesso.",
        });

        if (onSave) {
          onSave(result.data || result);
        }

        reset({
          name: "",
          email: "",
          role: "psychologist",
          phone: "",
          username: "",
          password: "",
          crp: "",
        });
        window.location.reload();
      } else {
        const errorData = await response.json().catch(() => ({}));
        if (errorData.message && errorData.message.includes("User já existe")) {
          toast({
            title: "Erro",
            description: "Este usuário já existe. Por favor, utilize outro e-mail ou usuário.",
            variant: "destructive",
          });
        } else {
          throw new Error(errorData.message || `Erro ${response.status}: Requisição falhou`);
        }
      }
    } catch (error) {
      console.error("Erro ao salvar usuário:", error);
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Falha ao salvar usuário. Tente novamente.",
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
          placeholder="61988888888"
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
          placeholder={isEdit ? "Deixe em branco para manter a atual" : "Digite a senha"}
          type="password"
          required={!isEdit} // Obrigatório apenas em criação
          disabled={isLoading}
          errors={errors}
          className="md:col-span-2"
          onClear={() => setValue("password", "")}
        />
        
        {/* Campo CRP - apenas para psicólogos */}
        {watch("role") === "psychologist" && (
          <InputDynamic
            name="crp"
            label="CRP"
            control={control}
            placeholder="Digite o CRP"
            disabled={isLoading}
            errors={errors}
            maxLength={20}
            onClear={() => setValue("crp", "")}
          />
        )}
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              {isEdit ? "Atualizando..." : "Cadastrando..."}
            </>
          ) : isEdit ? "Atualizar" : "Cadastrar"}
        </Button>
      </div>
    </form>
  );
};

export default UserForm;
