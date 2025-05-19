
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Patient } from "@/types/appointment";

interface ReferralDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  patient: Patient | null;
  referralTo: string;
  setReferralTo: (referral: string) => void;
}

const ReferralDialog = ({
  isOpen,
  onOpenChange,
  patient,
  referralTo,
  setReferralTo
}: ReferralDialogProps) => {
  if (!patient) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Encaminhamento</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-500">Nome:</label>
              <p>{patient.name}</p>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-500">CPF:</label>
              <p>{patient.cpf}</p>
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
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            disabled={referralTo.trim() === ""}
            onClick={() => {
              // Aqui poderia salvar o encaminhamento no sistema ou gerar um PDF
              alert("Encaminhamento gerado com sucesso!");
              onOpenChange(false);
            }}
          >
            Gerar Encaminhamento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ReferralDialog;
