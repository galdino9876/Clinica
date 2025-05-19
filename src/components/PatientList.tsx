import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAppointments } from "@/context/AppointmentContext";
import { useAuth } from "@/context/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Plus, Search, FileText, Pencil, Trash, Send, CircleArrowUp, FilePlus, Calendar } from "lucide-react";
import PatientForm from "./PatientForm";
import { Patient } from "@/types/appointment";
import { Input } from "@/components/ui/input";
import PatientRecords from "./PatientRecords";
import PatientAppointmentHistory from "./PatientAppointmentHistory";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const PatientList = () => {
  const { patients, deactivatePatient, reactivatePatient, appointments } = useAppointments();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddPatientOpen, setIsAddPatientOpen] = useState(false);
  const [isEditPatientOpen, setIsEditPatientOpen] = useState(false);
  const [isViewDetailsOpen, setIsViewDetailsOpen] = useState(false);
  const [isDeactivatePatientOpen, setIsDeactivatePatientOpen] = useState(false);
  const [isReferralOpen, setIsReferralOpen] = useState(false);
  const [isAttendanceOpen, setIsAttendanceOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [deactivationReason, setDeactivationReason] = useState("");
  const [referralTo, setReferralTo] = useState("");
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendanceStartTime, setAttendanceStartTime] = useState("08:00");
  const [attendanceEndTime, setAttendanceEndTime] = useState("09:00");
  const [attendancePeriod, setAttendancePeriod] = useState("specific"); // 'specific', 'morning', 'afternoon'

  const isAdmin = user?.role === "admin";
  const isReceptionist = user?.role === "receptionist";
  const isPsychologist = user?.role === "psychologist";
  const canManagePatients = isAdmin || isReceptionist;
  const canViewRecords = isAdmin || isPsychologist;

  // Para psicólogos, filtrar pacientes relacionados aos seus agendamentos
  let filteredPatients = patients;

  // Se for psicólogo, filtrar apenas pacientes vinculados a seus agendamentos
  if (isPsychologist && user) {
    // Primeiro, pegamos todos os IDs de pacientes vinculados ao psicólogo
    const psychologistAppointments = appointments.filter(app => app.psychologistId === user.id);
    const patientIds = new Set(psychologistAppointments.map(app => app.patient.id));
    
    // Filtramos apenas os pacientes cujos IDs estão no conjunto
    filteredPatients = patients.filter(patient => patientIds.has(patient.id));
  }
  
  // Para admin, mostrar todos os pacientes incluindo inativos
  // Para recepcionista e psicólogo, mostrar apenas pacientes ativos
  if (!isAdmin) {
    filteredPatients = filteredPatients.filter(patient => patient.active);
  }
  
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

  const handleViewDetails = (patient: Patient) => {
    setSelectedPatient(patient);
    setIsViewDetailsOpen(true);
  };

  const handleDeactivatePatient = (patient: Patient) => {
    setSelectedPatient(patient);
    setDeactivationReason("");
    setIsDeactivatePatientOpen(true);
  };

  const confirmDeactivation = () => {
    if (selectedPatient && deactivationReason) {
      deactivatePatient(selectedPatient.id, deactivationReason);
      setIsDeactivatePatientOpen(false);
    }
  };

  const handleReactivatePatient = (patient: Patient) => {
    if (window.confirm(`Deseja reativar o paciente ${patient.name}?`)) {
      reactivatePatient(patient.id);
    }
  };

  const handleReferralOpen = (patient: Patient) => {
    setSelectedPatient(patient);
    setReferralTo("");
    setIsReferralOpen(true);
  };

  const handleAttendanceOpen = (patient: Patient) => {
    setSelectedPatient(patient);
    setAttendanceDate(new Date().toISOString().split('T')[0]);
    setAttendanceStartTime("08:00");
    setAttendanceEndTime("09:00");
    setAttendancePeriod("specific");
    setIsAttendanceOpen(true);
  };

  const handleSavePatient = () => {
    setIsAddPatientOpen(false);
    setIsEditPatientOpen(false);
  };

  const getAttendanceTimeText = () => {
    if (attendancePeriod === "specific") {
      return `das ${attendanceStartTime} às ${attendanceEndTime}`;
    } else if (attendancePeriod === "morning") {
      return "durante o período da manhã (08:00 às 12:00)";
    } else {
      return "durante o período da tarde (13:00 às 18:00)";
    }
  };

  const handleAttendanceButtonClick = (patient: Patient) => {
    setSelectedPatient(patient);
    setIsAttendanceOpen(true);
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

      {isPsychologist && filteredPatients.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-md p-4 mt-4">
          <p>Você ainda não possui pacientes vinculados. Os pacientes serão exibidos aqui quando forem agendados para consulta com você.</p>
        </div>
      )}

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
                {isAdmin && (
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                )}
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredPatients.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 6 : 5} className="px-4 py-4 text-center text-gray-500">
                    Nenhum paciente encontrado.
                  </td>
                </tr>
              ) : (
                filteredPatients.map((patient) => (
                  <tr key={patient.id} className={`hover:bg-gray-50 ${!patient.active ? "bg-gray-50" : ""}`}>
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
                    {isAdmin && (
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded-full ${patient.active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                          {patient.active ? "Ativo" : "Inativo"}
                        </span>
                      </td>
                    )}
                    <td className="px-4 py-4 whitespace-nowrap text-right">
                      <div className="flex justify-end space-x-2">
                        {/* View details button (new) */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewDetails(patient)}
                          title="Ver Detalhes"
                        >
                          <Calendar className="h-4 w-4" />
                        </Button>
                        
                        {canViewRecords && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewDetails(patient)}
                              title="Prontuários"
                            >
                              <FileText className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleReferralOpen(patient)}
                              title="Encaminhamento"
                            >
                              <Send className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleAttendanceButtonClick(patient)}
                              title="Atestado de Comparecimento"
                            >
                              <CircleArrowUp className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        {canManagePatients && patient.active && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditPatient(patient)}
                              title="Editar"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeactivatePatient(patient)}
                              title="Desativar Paciente"
                            >
                              <Trash className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        {isAdmin && !patient.active && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleReactivatePatient(patient)}
                            title="Reativar Paciente"
                            className="text-green-600 hover:text-green-800 hover:bg-green-50"
                          >
                            <FilePlus className="h-4 w-4" />
                          </Button>
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

      {/* Patient Details Dialog */}
      <Dialog open={isViewDetailsOpen} onOpenChange={setIsViewDetailsOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Detalhes do Paciente - {selectedPatient?.name}
            </DialogTitle>
          </DialogHeader>
          {selectedPatient && (
            <Tabs defaultValue="records" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="records">Prontuário</TabsTrigger>
                <TabsTrigger value="appointments">Histórico de Consultas</TabsTrigger>
              </TabsList>
              <TabsContent value="records" className="pt-4">
                <PatientRecords
                  patient={selectedPatient}
                  onClose={() => setIsViewDetailsOpen(false)}
                />
              </TabsContent>
              <TabsContent value="appointments" className="pt-4">
                <PatientAppointmentHistory patient={selectedPatient} />
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      {/* Deactivate Patient Dialog */}
      <Dialog open={isDeactivatePatientOpen} onOpenChange={setIsDeactivatePatientOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Desativar Paciente</DialogTitle>
            <DialogDescription>
              O paciente será marcado como inativo e não será mais exibido para psicólogos e recepcionistas, 
              mas permanecerá no sistema e poderá ser reativado pelo administrador.
            </DialogDescription>
          </DialogHeader>
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
            <Button variant="outline" onClick={() => setIsDeactivatePatientOpen(false)}>
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              onClick={confirmDeactivation}
              disabled={deactivationReason.trim() === ""}
            >
              Confirmar Desativação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Referral Dialog */}
      <Dialog open={isReferralOpen} onOpenChange={setIsReferralOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Encaminhamento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedPatient && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-500">Nome:</label>
                    <p>{selectedPatient.name}</p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-500">CPF:</label>
                    <p>{selectedPatient.cpf}</p>
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
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsReferralOpen(false)}>
              Cancelar
            </Button>
            <Button 
              disabled={referralTo.trim() === ""}
              onClick={() => {
                // Aqui poderia salvar o encaminhamento no sistema ou gerar um PDF
                alert("Encaminhamento gerado com sucesso!");
                setIsReferralOpen(false);
              }}
            >
              Gerar Encaminhamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Attendance Certificate Dialog */}
      <Dialog open={isAttendanceOpen} onOpenChange={setIsAttendanceOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Atestado de Comparecimento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedPatient && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-500">Nome:</label>
                    <p>{selectedPatient.name}</p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-500">CPF:</label>
                    <p>{selectedPatient.cpf}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="attendanceDate" className="block text-sm font-medium">
                    Data:
                  </label>
                  <Input
                    id="attendanceDate"
                    type="date"
                    value={attendanceDate}
                    onChange={(e) => setAttendanceDate(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium">Período:</label>
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center">
                      <input
                        type="radio"
                        id="specific"
                        name="period"
                        value="specific"
                        checked={attendancePeriod === "specific"}
                        onChange={() => setAttendancePeriod("specific")}
                        className="mr-2"
                      />
                      <label htmlFor="specific">Horário específico</label>
                    </div>
                    <div className="flex items-center">
                      <input
                        type="radio"
                        id="morning"
                        name="period"
                        value="morning"
                        checked={attendancePeriod === "morning"}
                        onChange={() => setAttendancePeriod("morning")}
                        className="mr-2"
                      />
                      <label htmlFor="morning">Período da manhã</label>
                    </div>
                    <div className="flex items-center">
                      <input
                        type="radio"
                        id="afternoon"
                        name="period"
                        value="afternoon"
                        checked={attendancePeriod === "afternoon"}
                        onChange={() => setAttendancePeriod("afternoon")}
                        className="mr-2"
                      />
                      <label htmlFor="afternoon">Período da tarde</label>
                    </div>
                  </div>
                </div>

                {attendancePeriod === "specific" && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label htmlFor="startTime" className="block text-sm font-medium">
                        Horário de início:
                      </label>
                      <Input
                        id="startTime"
                        type="time"
                        value={attendanceStartTime}
                        onChange={(e) => setAttendanceStartTime(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="endTime" className="block text-sm font-medium">
                        Horário de término:
                      </label>
                      <Input
                        id="endTime"
                        type="time"
                        value={attendanceEndTime}
                        onChange={(e) => setAttendanceEndTime(e.target.value)}
                      />
                    </div>
                  </div>
                )}

                <div className="p-4 bg-gray-50 rounded-lg text-sm">
                  <p>Certificamos que <strong>{selectedPatient.name}</strong>, CPF: <strong>{selectedPatient.cpf}</strong>, compareceu
                  à Clínica Psicológica no dia <strong>{new Date(attendanceDate).toLocaleDateString('pt-BR')}</strong> {getAttendanceTimeText()}
                  para atendimento psicológico.</p>
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAttendanceOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={() => {
                // Aqui poderia gerar o atestado em PDF
                alert("Atestado gerado com sucesso!");
                setIsAttendanceOpen(false);
              }}
            >
              Gerar Atestado
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PatientList;
