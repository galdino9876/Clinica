"use client";

import React, { useState, useId } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Loader2, X } from "lucide-react";
import { InputDynamic } from "./inputDin";
import { Patient } from "@/types/appointment";

// Schema de validação
const patientSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  cpf: z.string().min(14, "CPF deve estar no formato 000.000.000-00"),
  phone: z
    .string()
    .min(11, "Telefone deve conter no minimo 11 digitos")
    .transform(v => v.replace(/\D/g, "")),
  email: z.string().email("E-mail inválido"),
  address: z.string().min(10, "Endereço deve ter pelo menos 10 caracteres"),
  birthdate: z.string().min(1, "Data de nascimento é obrigatória"),
  identity_document: z.string().optional(),
  insurance_document: z.string().optional(),
  value: z.coerce.number().min(0.01, { message: "O valor deve ser maior que 0!" }),
  nome_responsavel: z.string().optional(),
  telefone_responsavel: z.string().optional(),
});

type PatientFormData = z.infer<typeof patientSchema>;

interface PatientFormProps {
  onSave?: (patient: PatientFormData) => void;
  onCancel?: () => void;
  open?: boolean; // Para controlar a abertura via Dialog
  patient?: Patient; // Para edição - dados do paciente existente
  isEdit?: boolean; // Flag para indicar se é edição
}

const PatientForm = ({ onSave, onCancel, open = false, patient, isEdit = false }: PatientFormProps) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showComplementaryData, setShowComplementaryData] = useState(false);
  const valueId = useId();

  const formMethods = useForm<PatientFormData>({
    resolver: zodResolver(patientSchema),
    defaultValues: {
      name: patient?.name || "",
      cpf: patient?.cpf || "",
      phone: patient?.phone || "",
      email: patient?.email || "",
      address: patient?.address || "",
      birthdate: patient?.birthdate || "",
      identity_document: patient?.identityDocument || "",
      insurance_document: patient?.insuranceDocument || "",
      value: 200.0,
      nome_responsavel: "",
      telefone_responsavel: "",
    },
  });

  const {
    handleSubmit,
    setValue,
    control,
    watch,
    formState: { errors },
    reset,
  } = formMethods;

  // Funções para formatação de moeda BRL
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const parseCurrency = (value: string): number => {
    // Remove todos os caracteres não numéricos exceto vírgula e ponto
    const cleanValue = value.replace(/[^\d,.-]/g, "");
    // Substitui vírgula por ponto para conversão
    const numericValue = cleanValue.replace(",", ".");
    return parseFloat(numericValue) || 0;
  };

  const handleCurrencyChange = (value: string) => {
    const numericValue = parseCurrency(value);
    setValue("value", numericValue);
  };

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
      // Preparar dados para envio
      const requestData = {
        ...data,
        ...(isEdit && patient && { id: patient.id }), // Incluir ID se for edição
      };

      const url = isEdit 
        ? "https://webhook.essenciasaudeintegrada.com.br/webhook/patients_edit"
        : "https://webhook.essenciasaudeintegrada.com.br/webhook/create-patient";

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestData),
      });

      if (response.ok) {
        const result = await response.json();
        toast({
          title: "Sucesso",
          description: isEdit ? "Paciente atualizado com sucesso." : "Paciente cadastrado com sucesso.",
        });

        if (onSave) {
          onSave(result);
        }

        if (!isEdit) {
          reset();
          // Refresh da página para mostrar o novo paciente na lista
          window.location.reload();
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Erro no servidor");
      }
    } catch (error) {
      console.error("Erro ao salvar paciente:", error);
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : `Falha ao ${isEdit ? 'atualizar' : 'cadastrar'} paciente. Tente novamente.`,
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
          placeholder="61988888888"
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

        {/* Botão para mostrar dados complementares */}
        <div className="md:col-span-2 flex justify-center">
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowComplementaryData(!showComplementaryData)}
            disabled={isLoading}
            className="mt-2"
          >
            {showComplementaryData ? "Ocultar" : "Dados complementares"}
          </Button>
        </div>

        {/* Campos de dados complementares */}
        {showComplementaryData && (
          <>
            <InputDynamic
              name="nome_responsavel"
              label="Nome do Responsável"
              control={control}
              placeholder="Digite o nome do responsável"
              disabled={isLoading}
              errors={errors}
              className="md:col-span-2"
              onClear={() => setValue("nome_responsavel", "")}
            />

            <InputDynamic
              name="telefone_responsavel"
              label="Telefone do Responsável"
              control={control}
              placeholder="61988888888"
              type="tel"
              disabled={isLoading}
              errors={errors}
              maxLength={15}
              onClear={() => setValue("telefone_responsavel", "")}
            />
          </>
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
              {isEdit ? "Atualizando..." : "Salvando..."}
            </>
          ) : (
            isEdit ? "Atualizar" : "Cadastrar"
          )}
        </Button>
      </div>
    </form>
  );
};

export default PatientForm;
