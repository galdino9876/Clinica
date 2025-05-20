
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Patient } from "@/types/appointment";
import { AlertTriangle } from "lucide-react";

interface DeactivatePatientDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  patient: Patient | null;
  deactivationReason: string;
  setDeactivationReason: (reason: string) => void;
  onConfirm: () => void;
}

const DeactivatePatientDialog = ({
  isOpen,
  onOpenChange,
  patient,
  deactivationReason,
  setDeactivationReason,
  onConfirm
}: DeactivatePatientDialogProps) => {
  if (!patient) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Desativar Paciente</DialogTitle>
          <DialogDescription>
            O paciente será marcado como inativo e não será mais exibido para psicólogos e recepcionistas, 
            mas permanecerá no sistema e poderá ser reativado pelo administrador.
          </DialogDescription>
        </DialogHeader>
        
        <Alert variant="warning" className="bg-amber-50 border-amber-300">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          <AlertDescription className="text-sm">
            Ao desativar o paciente, todos os seus <strong>agendamentos futuros</strong> serão automaticamente <strong>cancelados</strong>.
          </AlertDescription>
        </Alert>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="reason" className="block text-sm font-medium">
              Motivo da desistência:
            </label>
            <Textarea
              id="reason"
              value={deactivationReason}
              onChange={(e) => setDeactivationReason(e.target.value)}
              placeholder="Descreva o motivo da desistência do paciente..."
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            variant="destructive" 
            onClick={onConfirm}
            disabled={deactivationReason.trim() === ""}
          >
            Confirmar Desativação
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DeactivatePatientDialog;
