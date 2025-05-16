
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAppointments } from "@/context/AppointmentContext";
import { useAuth } from "@/context/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Search, FileText, Pencil, Trash } from "lucide-react";
import PatientForm from "./PatientForm";
import { Patient } from "@/types/appointment";
import { Input } from "@/components/ui/input";
import PatientRecords from "./PatientRecords";

const PatientList = () => {
  const { patients, deletePatient } = useAppointments();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddPatientOpen, setIsAddPatientOpen] = useState(false);
  const [isEditPatientOpen, setIsEditPatientOpen] = useState(false);
  const [isViewRecordsOpen, setIsViewRecordsOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  const isAdmin = user?.role === "admin";
  const isReceptionist = user?.role === "receptionist";
  const isPsychologist = user?.role === "psychologist";
  const canManagePatients = isAdmin || isReceptionist;
  const canViewRecords = isAdmin || isPsychologist; // Admin agora também pode visualizar prontuários

  // Para psicólogos, filtrar pacientes relacionados aos seus agendamentos
  let filteredPatients = patients;
  
  // Aplicar filtro de pesquisa
  filteredPatients = filteredPatients.filter(
    (patient) =>
      patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patient.cpf.includes(searchTerm) ||
      patient.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patient.phone.includes(searchTerm)
  );

  const handleAddPatient = () => {
    setSelectedPatient(null);
    setIsAddPatientOpen(true);
  };

  const handleEditPatient = (patient: Patient) => {
    setSelectedPatient(patient);
    setIsEditPatientOpen(true);
  };

  const handleViewRecords = (patient: Patient) => {
    setSelectedPatient(patient);
    setIsViewRecordsOpen(true);
  };

  const handleDeletePatient = (id: string) => {
    if (window.confirm("Tem certeza que deseja excluir este paciente?")) {
      deletePatient(id);
    }
  };

  const handleSavePatient = () => {
    setIsAddPatientOpen(false);
    setIsEditPatientOpen(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Pacientes</h1>
        {canManagePatients && (
          <Button onClick={handleAddPatient}>
            <Plus className="h-4 w-4 mr-1" /> Novo Paciente
          </Button>
        )}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
          placeholder="Pesquisar pacientes..."
          className="pl-9"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nome
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  CPF
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Telefone
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredPatients.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-4 text-center text-gray-500">
                    Nenhum paciente encontrado.
                  </td>
                </tr>
              ) : (
                filteredPatients.map((patient) => (
                  <tr key={patient.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4 whitespace-nowrap">
                      {patient.name}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      {patient.cpf}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      {patient.phone}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      {patient.email}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-right">
                      <div className="flex justify-end space-x-2">
                        {canViewRecords && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewRecords(patient)}
                          >
                            <FileText className="h-4 w-4" />
                          </Button>
                        )}
                        {canManagePatients && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditPatient(patient)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeletePatient(patient.id)}
                            >
                              <Trash className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Patient Dialog */}
      <Dialog open={isAddPatientOpen} onOpenChange={setIsAddPatientOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Paciente</DialogTitle>
          </DialogHeader>
          <PatientForm
            onSave={handleSavePatient}
            onCancel={() => setIsAddPatientOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Patient Dialog */}
      <Dialog open={isEditPatientOpen} onOpenChange={setIsEditPatientOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Paciente</DialogTitle>
          </DialogHeader>
          {selectedPatient && (
            <PatientForm
              patient={selectedPatient}
              onSave={handleSavePatient}
              onCancel={() => setIsEditPatientOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* View Patient Records Dialog */}
      <Dialog open={isViewRecordsOpen} onOpenChange={setIsViewRecordsOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              Prontuário - {selectedPatient?.name}
            </DialogTitle>
          </DialogHeader>
          {selectedPatient && (
            <PatientRecords
              patient={selectedPatient}
              onClose={() => setIsViewRecordsOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PatientList;
