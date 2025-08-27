import React from "react";
import { useForm } from "react-hook-form";
import { ComboboxDynamic } from "./ComboboxDynamic";

// Exemplo de uso do ComboboxDynamic
export const ComboboxDynamicExample = () => {
  const { control, watch } = useForm({
    defaultValues: {
      patient: "",
      psychologist: "",
      paymentMethod: "",
    },
  });

  const selectedPatient = watch("patient");
  const selectedPsychologist = watch("psychologist");
  const selectedPaymentMethod = watch("paymentMethod");

  // Dados de exemplo
  const patients = [
    { id: "1", label: "João Silva" },
    { id: "2", label: "Maria Santos" },
    { id: "3", label: "Pedro Oliveira" },
    { id: "4", label: "Ana Costa" },
    { id: "5", label: "Carlos Ferreira" },
  ];

  const psychologists = [
    { id: "1", label: "Dr. Roberto Almeida" },
    { id: "2", label: "Dra. Fernanda Lima" },
    { id: "3", label: "Dr. Marcelo Santos" },
    { id: "4", label: "Dra. Juliana Costa" },
  ];

  const paymentMethods = [
    { id: "private", label: "Particular" },
    { id: "insurance_unimed", label: "Unimed" },
    { id: "insurance_amil", label: "Amil" },
    { id: "insurance_sulamerica", label: "SulAmérica" },
    { id: "insurance_porto_seguro", label: "Porto Seguro" },
  ];

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">
        Exemplo de ComboboxDynamic
      </h2>
      
      <p className="text-gray-600">
        Este componente permite digitar para filtrar as opções. Por exemplo:
        <br />
        • Digite "jo" para encontrar "João Silva"
        <br />
        • Digite "pol" para encontrar "Porto Seguro"
        <br />
        • Digite "uni" para encontrar "Unimed"
      </p>

      <div className="space-y-4">
        {/* Campo de Paciente */}
        <ComboboxDynamic
          name="patient"
          control={control}
          label="Paciente"
          options={patients}
          placeholder="Selecione o paciente"
          required
          searchPlaceholder="Digite o nome do paciente..."
          emptyMessage="Nenhum paciente encontrado."
          onClear={() => console.log("Paciente limpo")}
        />

        {/* Campo de Psicólogo */}
        <ComboboxDynamic
          name="psychologist"
          control={control}
          label="Psicólogo"
          options={psychologists}
          placeholder="Selecione o psicólogo"
          required
          searchPlaceholder="Digite o nome do psicólogo..."
          emptyMessage="Nenhum psicólogo encontrado."
          onClear={() => console.log("Psicólogo limpo")}
        />

        {/* Campo de Método de Pagamento */}
        <ComboboxDynamic
          name="paymentMethod"
          control={control}
          label="Método de Pagamento"
          options={paymentMethods}
          placeholder="Selecione o método de pagamento"
          required
          searchPlaceholder="Digite para buscar..."
          emptyMessage="Nenhum método encontrado."
          onClear={() => console.log("Método de pagamento limpo")}
        />
      </div>

      {/* Exibição dos valores selecionados */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-semibold text-gray-900 mb-2">Valores Selecionados:</h3>
        <div className="space-y-1 text-sm text-gray-600">
          <div>Paciente: {selectedPatient || "Nenhum selecionado"}</div>
          <div>Psicólogo: {selectedPsychologist || "Nenhum selecionado"}</div>
          <div>Método de Pagamento: {selectedPaymentMethod || "Nenhum selecionado"}</div>
        </div>
      </div>

      {/* Instruções de uso */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h3 className="font-semibold text-blue-900 mb-2">Como usar:</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Clique no campo para abrir as opções</li>
          <li>• Digite para filtrar as opções em tempo real</li>
          <li>• Use as setas do teclado para navegar</li>
          <li>• Pressione Enter para selecionar</li>
          <li>• Pressione Escape para fechar</li>
          <li>• Use o botão "Limpar" para resetar o valor</li>
        </ul>
      </div>
    </div>
  );
};
