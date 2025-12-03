"use client";

import React, { useState, useId, useEffect } from "react";
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
    .min(11, "Telefone deve ter 11 dígitos (DDD + 9 + número)")
    .max(11, "Telefone deve ter 11 dígitos (DDD + 9 + número)")
    .regex(/^\d{11}$/, "Telefone deve conter apenas números no formato DDD+9+número")
    .transform(v => v.replace(/\D/g, "")),
  email: z.string().email("E-mail inválido"),
  birthdate: z.string().min(1, "Data de nascimento é obrigatória"),
  value: z.coerce.number().min(0.01, { message: "O valor deve ser maior que 0!" }),
  nome_responsavel: z.string().optional(),
  telefone_responsavel: z.string()
    .optional()
    .refine((val) => {
      if (!val || val.trim() === '') return true; // Permite vazio ou nulo
      return val.length === 11 && /^\d{11}$/.test(val);
    }, "Telefone deve ter 11 dígitos (DDD + 9 + número) ou estar vazio"),
});

type PatientFormData = z.infer<typeof patientSchema>;

interface PatientFormProps {
  onSave?: (patient: Patient) => void;
  onCancel?: () => void;
  open?: boolean; // Para controlar a abertura via Dialog
  patient?: Patient; // Para edição - dados do paciente existente
  isEdit?: boolean; // Flag para indicar se é edição
}

const PatientForm = ({ onSave, onCancel, open = false, patient, isEdit = false }: PatientFormProps) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showComplementaryData, setShowComplementaryData] = useState(false);
  const [identityPdfFile, setIdentityPdfFile] = useState<File | null>(null);
  const [encaminhamentoPdfFile, setEncaminhamentoPdfFile] = useState<File | null>(null);
  const valueId = useId();

  const formMethods = useForm<PatientFormData>({
    resolver: zodResolver(patientSchema),
    defaultValues: {
      name: patient?.name || "",
      cpf: patient?.cpf || "",
      phone: patient?.phone || "",
      email: patient?.email || "",
      birthdate: patient?.birthdate || "",
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

  // Atualizar valores do formulário quando o paciente mudar (para edição)
  useEffect(() => {
    if (patient && isEdit) {
      console.log('Atualizando valores do formulário com paciente:', patient);
      setValue("name", patient.name || "");
      setValue("cpf", patient.cpf || "");
      setValue("phone", patient.phone || "");
      setValue("email", patient.email || "");
      setValue("birthdate", patient.birthdate || "");
      setValue("nome_responsavel", patient.nome_responsavel || "");
      setValue("telefone_responsavel", patient.telefone_responsavel || "");
      if (patient.value !== undefined) {
        setValue("value", patient.value);
      }
    }
  }, [patient, isEdit, setValue]);

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

  // Função para lidar com a seleção do arquivo PDF da identidade
  const handleIdentityPdfSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validar se é PDF
      if (file.type !== 'application/pdf') {
        toast({
          title: "Erro",
          description: "Por favor, selecione apenas arquivos PDF.",
          variant: "destructive"
        });
        return;
      }

      // Validar tamanho (10MB)
      const maxSize = 10 * 1024 * 1024; // 10MB em bytes
      if (file.size > maxSize) {
        toast({
          title: "Erro",
          description: "Arquivo muito grande. Tamanho máximo: 10MB",
          variant: "destructive"
        });
        return;
      }
      
      setIdentityPdfFile(file);
    }
  };

  // Função para lidar com a seleção do arquivo PDF de encaminhamento médico
  const handleEncaminhamentoPdfSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validar se é PDF
      if (file.type !== 'application/pdf') {
        toast({
          title: "Erro",
          description: "Por favor, selecione apenas arquivos PDF.",
          variant: "destructive"
        });
        return;
      }

      // Validar tamanho (10MB)
      const maxSize = 10 * 1024 * 1024; // 10MB em bytes
      if (file.size > maxSize) {
        toast({
          title: "Erro",
          description: "Arquivo muito grande. Tamanho máximo: 10MB",
          variant: "destructive"
        });
        return;
      }
      
      setEncaminhamentoPdfFile(file);
    }
  };

  // Máscaras para formatação
  const validateCPF = (cpf: string) => {
    // Regex para validar CPF no formato 000.000.000-00
    const cpfRegex = /^\d{3}\.\d{3}\.\d{3}-\d{2}$/;
    return cpfRegex.test(cpf);
  };

  const onSubmit = async (data: PatientFormData) => {
    console.log('=== onSubmit CHAMADO ===');
    console.log('Modo edição:', isEdit);
    console.log('Dados do formulário:', data);
    console.log('Paciente recebido:', patient);
    
    if (!validateCPF(data.cpf)) {
      toast({
        title: "Erro",
        description: "CPF inválido. Verifique os dados informados.",
        variant: "destructive",
      });
      return;
    }

    // Validar se há PDF quando necessário
    if (!isEdit && !identityPdfFile) {
      toast({
        title: "Erro",
        description: "Documento de identidade (PDF) é obrigatório para novos cadastros.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      // Determinar o ID válido do paciente para edição
      let patientId: string | number | undefined = undefined;
      if (isEdit && patient) {
        // Verificar diferentes campos possíveis de ID e formatos
        const possibleId = patient.id || (patient as any).patient_id || (patient as any).ID || (patient as any).Id;
        
        // Converter para string se for número
        if (possibleId !== undefined && possibleId !== null) {
          const idString = String(possibleId).trim();
          
          // Validar que o ID não seja "unknown" ou vazio
          if (idString !== "" && idString !== "unknown" && idString !== "null" && idString !== "undefined") {
            patientId = idString;
          }
        }
      }

      // Preparar dados para envio
      const requestData: any = {
        ...data,
      };

      // Incluir ID apenas se for edição e tiver ID válido
      if (isEdit) {
        if (!patientId) {
          console.error('Erro: Tentando editar paciente sem ID válido');
          console.error('Dados do paciente recebido:', patient);
          toast({
            title: "Erro",
            description: "ID do paciente não encontrado. Não é possível editar este paciente.",
            variant: "destructive",
          });
          setIsLoading(false);
          return;
        }
        requestData.id = patientId;
      }

      const url = isEdit 
        ? "https://webhook.essenciasaudeintegrada.com.br/webhook/patients_edit"
        : "https://webhook.essenciasaudeintegrada.com.br/webhook/create-patient";

      console.log('=== ENVIANDO DADOS PARA API ===');
      console.log('URL:', url);
      console.log('Modo edição:', isEdit);
      console.log('Dados do paciente:', requestData);
      console.log('Paciente original:', patient);
      console.log('ID do paciente determinado:', patientId);
      console.log('Arquivo PDF selecionado:', identityPdfFile);

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestData),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Resposta da API create-patient:', result);
        
        // Primeiro submit: Criar/atualizar paciente
        toast({
          title: "Sucesso",
          description: isEdit ? "Paciente atualizado com sucesso." : "Paciente cadastrado com sucesso.",
        });

        // Segundo submit: Enviar documento PDF (novos cadastros e edições com novo arquivo)
        if (identityPdfFile) {
          try {
            console.log('Enviando PDF para insert_documento_pessoal');
            
            const formData = new FormData();
            formData.append('documento', identityPdfFile);
            formData.append('nome', data.name);

            console.log('FormData preparado:', {
              documento: identityPdfFile.name,
              nome: data.name
            });

            const pdfResponse = await fetch('https://webhook.essenciasaudeintegrada.com.br/webhook/insert_documento_pessoal', {
              method: 'POST',
              body: formData
            });

            console.log('Resposta da API insert_documento_pessoal:', pdfResponse.status);

            if (pdfResponse.ok) {
              const pdfResult = await pdfResponse.json();
              console.log('Resultado do envio do PDF:', pdfResult);
              toast({
                title: "Sucesso",
                description: "Documento de identidade enviado com sucesso.",
              });
            } else {
              const errorText = await pdfResponse.text();
              console.error('Erro ao enviar documento pessoal:', pdfResponse.status, errorText);
              toast({
                title: "Aviso",
                description: isEdit 
                  ? "Paciente atualizado, mas houve erro ao enviar documento de identidade."
                  : "Paciente cadastrado, mas houve erro ao enviar documento de identidade.",
                variant: "destructive"
              });
            }
          } catch (pdfError) {
            console.error('Erro ao enviar documento pessoal:', pdfError);
            toast({
              title: "Aviso",
              description: isEdit
                ? "Paciente atualizado, mas houve erro ao enviar documento de identidade."
                : "Paciente cadastrado, mas houve erro ao enviar documento de identidade.",
              variant: "destructive"
            });
          }
        }

        // Terceiro submit: Enviar encaminhamento médico PDF (se fornecido)
        if (encaminhamentoPdfFile) {
          try {
            console.log('Enviando PDF de encaminhamento médico para insert_encaminhamento_medico');
            
            const formData = new FormData();
            formData.append('encaminhamento', encaminhamentoPdfFile);
            formData.append('nome', data.name);

            console.log('FormData preparado para encaminhamento:', {
              encaminhamento: encaminhamentoPdfFile.name,
              nome: data.name
            });

            const encaminhamentoResponse = await fetch('https://webhook.essenciasaudeintegrada.com.br/webhook/insert_encaminhamento_medico', {
              method: 'POST',
              body: formData
            });

            console.log('Resposta da API insert_encaminhamento_medico:', encaminhamentoResponse.status);

            if (encaminhamentoResponse.ok) {
              const encaminhamentoResult = await encaminhamentoResponse.json();
              console.log('Resultado do envio do encaminhamento:', encaminhamentoResult);
              toast({
                title: "Sucesso",
                description: "Encaminhamento médico enviado com sucesso.",
              });
            } else {
              const errorText = await encaminhamentoResponse.text();
              console.error('Erro ao enviar encaminhamento médico:', encaminhamentoResponse.status, errorText);
              toast({
                title: "Aviso",
                description: "Paciente cadastrado, mas houve erro ao enviar encaminhamento médico.",
                variant: "destructive"
              });
            }
          } catch (encaminhamentoError) {
            console.error('Erro ao enviar encaminhamento médico:', encaminhamentoError);
            toast({
              title: "Aviso",
              description: "Paciente cadastrado, mas houve erro ao enviar encaminhamento médico.",
              variant: "destructive"
            });
          }
        }

        if (onSave) {
          // Criar um objeto Patient com o ID retornado pela API
          const patientWithId: Patient = {
            id: result.id || result.patient_id || result.data?.id || "unknown",
            name: data.name,
            cpf: data.cpf,
            phone: data.phone,
            email: data.email,
            birthdate: data.birthdate,
            active: true,
            nome_responsavel: data.nome_responsavel,
            telefone_responsavel: data.telefone_responsavel,
          };
          onSave(patientWithId);
        }

        if (!isEdit) {
          reset();
          // Não fazer reload da página quando usado no contexto de agendamento
          // O formulário de agendamento irá atualizar a lista de pacientes automaticamente
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
          name="birthdate"
          label="Data de Nascimento"
          control={control}
          type="date"
          required
          disabled={isLoading}
          errors={errors}
          onClear={() => setValue("birthdate", "")}
        />

        {/* Campo de upload de PDF da identidade */}
        <div className="md:col-span-2">
          <label className="text-sm font-medium text-gray-700 mb-2 block">
            Documento de Identidade (PDF) *
          </label>
          <input
            type="file"
            accept=".pdf"
            onChange={handleIdentityPdfSelect}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            disabled={isLoading}
            required={!isEdit}
          />
          <p className="text-xs text-gray-500 mt-1">
            Apenas arquivos PDF são aceitos. Tamanho máximo: 10MB
          </p>
          {identityPdfFile && (
            <p className="text-sm text-green-600 mt-1">
              ✓ Arquivo selecionado: {identityPdfFile.name}
            </p>
          )}
        </div>

        {/* Campo de upload de PDF de encaminhamento médico */}
        <div className="md:col-span-2">
          <label className="text-sm font-medium text-gray-700 mb-2 block">
            Encaminhamento Médico (PDF)
          </label>
          <input
            type="file"
            accept=".pdf"
            onChange={handleEncaminhamentoPdfSelect}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            disabled={isLoading}
          />
          <p className="text-xs text-gray-500 mt-1">
            Tamanho máximo: 10MB (Opcional)
          </p>
          {encaminhamentoPdfFile && (
            <p className="text-sm text-green-600 mt-1">
              ✓ Arquivo selecionado: {encaminhamentoPdfFile.name}
            </p>
          )}
        </div>

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
