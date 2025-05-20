
import { usePatientManagement } from "@/hooks/usePatientManagement";
import PatientTable from "./patient/PatientTable";
import PatientFormDialog from "./patient/PatientFormDialog";
import PatientDetailsDialog from "./patient/PatientDetailsDialog";
import DeactivatePatientDialog from "./patient/DeactivatePatientDialog";
import ReferralDialog from "./patient/ReferralDialog";
import AttendanceDialog from "./patient/AttendanceDialog";

const PatientList = () => {
  const {
    // Data and state
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
    
    // Pending appointments
    pendingAppointmentsCount,
  } = usePatientManagement();

  return (
    <>
      <PatientTable 
        patients={filteredPatients}
        isAdmin={isAdmin}
        canManagePatients={canManagePatients}
        canViewRecords={canViewRecords}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        isPsychologist={isPsychologist}
        onAddPatient={handleAddPatient}
        onViewDetails={handleViewDetails}
        onEditPatient={handleEditPatient}
        onDeactivatePatient={handleDeactivatePatient}
        onReactivatePatient={handleReactivatePatient}
        onReferralOpen={handleReferralOpen}
        onAttendanceOpen={handleAttendanceOpen}
      />

      {/* Add/Edit Patient Dialog */}
      <PatientFormDialog 
        isOpen={isAddPatientOpen || isEditPatientOpen}
        onOpenChange={(open) => {
          if (isAddPatientOpen) setIsAddPatientOpen(open);
          if (isEditPatientOpen) setIsEditPatientOpen(open);
        }}
        patient={selectedPatient}
        onSave={handleSavePatient}
      />

      {/* Patient Details Dialog */}
      <PatientDetailsDialog 
        isOpen={isViewDetailsOpen}
        onOpenChange={setIsViewDetailsOpen}
        patient={selectedPatient}
        isReceptionist={isReceptionist}
      />

      {/* Deactivate Patient Dialog */}
      <DeactivatePatientDialog 
        isOpen={isDeactivatePatientOpen}
        onOpenChange={setIsDeactivatePatientOpen}
        patient={selectedPatient}
        deactivationReason={deactivationReason}
        setDeactivationReason={setDeactivationReason}
        onConfirm={confirmDeactivation}
        pendingAppointmentsCount={pendingAppointmentsCount || 0}
      />

      {/* Referral Dialog */}
      <ReferralDialog 
        isOpen={isReferralOpen}
        onOpenChange={setIsReferralOpen}
        patient={selectedPatient}
        referralTo={referralTo}
        setReferralTo={setReferralTo}
      />

      {/* Attendance Certificate Dialog */}
      <AttendanceDialog 
        isOpen={isAttendanceOpen}
        onOpenChange={setIsAttendanceOpen}
        patient={selectedPatient}
        attendanceDate={attendanceDate}
        setAttendanceDate={setAttendanceDate}
        attendanceStartTime={attendanceStartTime}
        setAttendanceStartTime={setAttendanceStartTime}
        attendanceEndTime={attendanceEndTime}
        setAttendanceEndTime={setAttendanceEndTime}
        attendancePeriod={attendancePeriod}
        setAttendancePeriod={setAttendancePeriod}
        getAttendanceTimeText={getAttendanceTimeText}
      />
    </>
  );
};

export default PatientList;
