
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Patient } from "@/types/appointment";
import PatientRecords from "../PatientRecords";
import PatientAppointmentHistory from "../PatientAppointmentHistory";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface PatientDetailsDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  patient: Patient | null;
  isReceptionist: boolean;
}

const PatientDetailsDialog = ({
  isOpen,
  onOpenChange,
  patient,
  isReceptionist
}: PatientDetailsDialogProps) => {
  if (!patient) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Detalhes do Paciente - {patient.name}
          </DialogTitle>
        </DialogHeader>
        {isReceptionist ? (
          <PatientAppointmentHistory patient={patient} />
        ) : (
          <Tabs defaultValue="records" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="records">Prontuário</TabsTrigger>
              <TabsTrigger value="appointments">Histórico de Consultas</TabsTrigger>
            </TabsList>
            <TabsContent value="records" className="pt-4">
              <PatientRecords
                patient={patient}
                onClose={() => onOpenChange(false)}
              />
            </TabsContent>
            <TabsContent value="appointments" className="pt-4">
              <PatientAppointmentHistory patient={patient} />
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default PatientDetailsDialog;
