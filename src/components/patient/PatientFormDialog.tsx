
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import PatientForm from "../PatientForm";
import { Patient } from "@/types/appointment";

interface PatientFormDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  patient: Patient | null;
  onSave: () => void;
}

const PatientFormDialog = ({
  isOpen,
  onOpenChange,
  patient,
  onSave
}: PatientFormDialogProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{patient ? "Editar Paciente" : "Novo Paciente"}</DialogTitle>
        </DialogHeader>
        <PatientForm
          patient={patient || undefined}
          onSave={onSave}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
};

export default PatientFormDialog;
