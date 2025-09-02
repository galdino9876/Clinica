
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import PatientForm from "../PatientForm";
import { Patient } from "@/types/appointment";
import { useEffect } from "react";

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
  // Effect to ensure dialog properly resets when opened/closed
  useEffect(() => {
    // Reset any form state if needed when dialog opens/closes
    console.log("Patient form dialog state changed:", isOpen);
  }, [isOpen]);

  // Handle patient save with proper dialog closure
  const handleSave = () => {
    onSave();
    // Ensure dialog closes after save
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{patient ? "Editar Paciente" : "Novo Paciente"}</DialogTitle>
        </DialogHeader>
        <PatientForm
          patient={patient || undefined}
          isEdit={!!patient}
          onSave={handleSave}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
};

export default PatientFormDialog;
