import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Patient } from "@/types/appointment";

interface ReferralDialogProps {
  patient: Patient | null; // Dados do paciente passados como prop
  onClose: () => void; // Função para fechar o componente
}

const ReferralDialog = ({ patient, onClose }: ReferralDialogProps) => {
  const [referralTo, setReferralTo] = useState("");

  if (!patient) return null;

  return (
    <>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-500">Nome:</label>
            <p>{patient.name }</p>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-500">CPF:</label>
            <p>{patient.cpf || "N/A"}</p>
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="referralTo" className="block text-sm font-medium">
            Encaminhar para:
          </label>
          <Textarea
            id="referralTo"
            value={referralTo}
            onChange={(e) => setReferralTo(e.target.value)}
            placeholder="Ex: Psiquiatra, Fonoaudiólogo, Nutricionista..."
            rows={3}
          />
        </div>
      </div>
      <div className="mt-4 flex justify-end space-x-2">
        <Button variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button
          disabled={referralTo.trim() === ""}
          onClick={() => {
            // Aqui poderia salvar o encaminhamento no sistema ou gerar um PDF
            alert("Encaminhamento gerado com sucesso!");
            onClose();
          }}
        >
          Gerar Encaminhamento
        </Button>
      </div>
    </>
  );
};

export default ReferralDialog;
