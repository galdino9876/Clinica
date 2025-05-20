
import { useState } from "react";
import { useAppointments } from "@/context/AppointmentContext";
import { useAuth } from "@/context/AuthContext";
import { Patient } from "@/types/appointment";

export const usePatientManagement = () => {
  const { patients, deactivatePatient, reactivatePatient, appointments, addPatient, updatePatient } = useAppointments();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  
  // Modals state
  const [isAddPatientOpen, setIsAddPatientOpen] = useState(false);
  const [isEditPatientOpen, setIsEditPatientOpen] = useState(false);
  const [isViewDetailsOpen, setIsViewDetailsOpen] = useState(false);
  const [isDeactivatePatientOpen, setIsDeactivatePatientOpen] = useState(false);
  const [isReferralOpen, setIsReferralOpen] = useState(false);
  const [isAttendanceOpen, setIsAttendanceOpen] = useState(false);
  
  // Form state
  const [deactivationReason, setDeactivationReason] = useState("");
  const [referralTo, setReferralTo] = useState("");
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendanceStartTime, setAttendanceStartTime] = useState("08:00");
  const [attendanceEndTime, setAttendanceEndTime] = useState("09:00");
  const [attendancePeriod, setAttendancePeriod] = useState("specific"); // 'specific', 'morning', 'afternoon'

  // User roles and permissions
  const isAdmin = user?.role === "admin";
  const isReceptionist = user?.role === "receptionist";
  const isPsychologist = user?.role === "psychologist";
  const canManagePatients = isAdmin || isReceptionist;
  const canViewRecords = isAdmin || isPsychologist;

  // Filter patients
  let filteredPatients = patients;

  // Para psicólogos, filtrar pacientes relacionados aos seus agendamentos
  if (isPsychologist && user) {
    const psychologistAppointments = appointments.filter(app => app.psychologistId === user.id);
    const patientIds = new Set(psychologistAppointments.map(app => app.patient.id));
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

  // Calculate pending appointments count for the selected patient
  const pendingAppointmentsCount = selectedPatient 
    ? appointments.filter(app => 
        app.patient.id === selectedPatient.id && 
        ['scheduled', 'pending'].includes(app.status) && 
        new Date(app.date) >= new Date()
      ).length 
    : 0;

  // Handlers
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

  return {
    // Data
    filteredPatients,
    selectedPatient,
    searchTerm,
    setSearchTerm,
    
    // Roles and permissions
    isAdmin,
    isReceptionist,
    isPsychologist,
    canManagePatients,
    canViewRecords,
    
    // Modal states
    isAddPatientOpen,
    setIsAddPatientOpen,
    isEditPatientOpen,
    setIsEditPatientOpen,
    isViewDetailsOpen,
    setIsViewDetailsOpen,
    isDeactivatePatientOpen,
    setIsDeactivatePatientOpen,
    isReferralOpen, 
    setIsReferralOpen,
    isAttendanceOpen,
    setIsAttendanceOpen,
    
    // Form state
    deactivationReason,
    setDeactivationReason,
    referralTo,
    setReferralTo,
    attendanceDate,
    setAttendanceDate,
    attendanceStartTime,
    setAttendanceStartTime,
    attendanceEndTime, 
    setAttendanceEndTime,
    attendancePeriod,
    setAttendancePeriod,
    
    // Add pendingAppointmentsCount to the returned object
    pendingAppointmentsCount,
    
    // Actions
    handleAddPatient,
    handleEditPatient,
    handleViewDetails,
    handleDeactivatePatient,
    confirmDeactivation,
    handleReactivatePatient,
    handleReferralOpen,
    handleAttendanceOpen,
    handleSavePatient,
    getAttendanceTimeText,
    addPatient,
    updatePatient
  };
};
