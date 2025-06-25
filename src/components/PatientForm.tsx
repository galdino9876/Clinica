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


// Schema de validação
const patientSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  cpf: z.string().min(14, "CPF deve estar no formato 000.000.000-00"),
  phone: z.string().min(14, "Telefone deve estar no formato (00) 00000-0000"),
  email: z.string().email("E-mail inválido"),
  address: z.string().min(10, "Endereço deve ter pelo menos 10 caracteres"),
  birthdate: z.string().min(1, "Data de nascimento é obrigatória"),
  identity_document: z.string().optional(),
  insurance_document: z.string().optional(),
});

type PatientFormData = z.infer<typeof patientSchema>;

interface PatientFormProps {
  onSave?: (patient: any) => void;
  onCancel?: () => void;
  open?: boolean; // Para controlar a abertura via Dialog
}

const PatientForm = ({ onSave, onCancel, open = false }: PatientFormProps) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const formMethods = useForm<PatientFormData>({
    resolver: zodResolver(patientSchema),
    defaultValues: {
      name: "",
      cpf: "",
      phone: "",
      email: "",
      address: "",
      birthdate: "",
      identity_document: "",
      insurance_document: "",
    },
  });

  const {
    handleSubmit,
    setValue,
    control,
    formState: { errors },
    reset,
  } = formMethods;

  // Máscaras para formatação
  const validateCPF = (cpf: string) => {
    // Regex para validar CPF no formato 000.000.000-00
    const cpfRegex = /^\d{3}\.\d{3}\.\d{3}-\d{2}$/;
    return cpfRegex.test(cpf);
  };

  const onSubmit = async (data: PatientFormData) => {
    if (!validateCPF(data.cpf)) {
      toast({
        title: "Erro",
        description: "CPF inválido. Verifique os dados informados.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("https://webhook.essenciasaudeintegrada.com.br/webhook/create-patient", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        const newPatient = await response.json();
        toast({
          title: "Sucesso",
          description: "Paciente cadastrado com sucesso.",
        });

        if (onSave) {
          onSave(newPatient);
        }

        reset();
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Erro no servidor");
      }
    } catch (error) {
      console.error("Erro ao salvar paciente:", error);
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Falha ao cadastrar paciente. Tente novamente.",
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
              label="Nome Completo"
              control={control}
              placeholder="Digite o nome completo"
              required
              disabled={isLoading}
              errors={errors}
              className="md:col-span-2"
              onClear={() => setValue("name", "")}
            />

            <InputDynamic
              name="cpf"
              label="CPF"
              control={control}
              placeholder="000.000.000-00"
              required
              disabled={isLoading}
              errors={errors}
              maxLength={14}
            type="cpf"
              onClear={() => setValue("cpf", "")}
            />

            <InputDynamic
              name="phone"
              label="Telefone"
              control={control}
              placeholder="(11) 99999-9999"
              type="tel"
              required
              disabled={isLoading}
              errors={errors}
              maxLength={15}
              onClear={() => setValue("phone", "")}
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

            <InputDynamic
              name="address"
              label="Endereço"
              control={control}
              placeholder="Rua, número, bairro - Cidade/UF"
              required
              disabled={isLoading}
              errors={errors}
              className="md:col-span-2"
              onClear={() => setValue("address", "")}
            />

            <InputDynamic
              name="birthdate"
              label="Data de Nascimento"
              control={control}
              type="date"
              required
              disabled={isLoading}
              errors={errors}
              onClear={() => setValue("birthdate", "")}
            />

            <InputDynamic
              name="identity_document"
              label="Documento de Identidade"
              control={control}
              placeholder="RG, CNH, etc."
              disabled={isLoading}
              errors={errors}
              onClear={() => setValue("identity_document", "")}
            />

            <InputDynamic
              name="insurance_document"
              label="Carteirinha do Convênio"
              control={control}
              placeholder="Número da carteirinha"
              disabled={isLoading}
              errors={errors}
              className="md:col-span-2"
              onClear={() => setValue("insurance_document", "")}
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

export default PatientForm;
