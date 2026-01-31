import React from "react";
import { Button } from "@/components/ui/button";
import { Plus, Search, FileText, Pencil, Trash, Send, CircleArrowUp, FilePlus, Calendar } from "lucide-react";
import { Patient } from "@/types/appointment";
import { Input } from "@/components/ui/input";

interface PatientTableProps {
  patients: Patient[];
  isAdmin: boolean;
  canManagePatients: boolean;
  canViewRecords: boolean;
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  isPsychologist: boolean;
  onAddPatient: () => void;
  onViewDetails: (patient: Patient) => void;
  onEditPatient: (patient: Patient) => void;
  onDeactivatePatient: (patient: Patient) => void;
  onReactivatePatient: (patient: Patient) => void;
  onReferralOpen: (patient: Patient) => void;
  onAttendanceOpen: (patient: Patient) => void;
}

const PatientTable = ({
  patients,
  isAdmin,
  canManagePatients,
  canViewRecords,
  searchTerm,
  setSearchTerm,
  isPsychologist,
  onAddPatient,
  onViewDetails,
  onEditPatient,
  onDeactivatePatient,
  onReactivatePatient,
  onReferralOpen,
  onAttendanceOpen,
}: PatientTableProps) => {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Pacientes</h1>
        {canManagePatients && (
          <Button onClick={onAddPatient}>
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

      {isPsychologist && patients.length === 0 && (
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
                {/* 
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  CPF
                </th>
                */}
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Telefone
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                {isAdmin && (
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Responsável
                  </th>
                )}
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
              {patients.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 7 : 5} className="px-4 py-4 text-center text-gray-500">
                    Nenhum paciente encontrado.
                  </td>
                </tr>
              ) : (
                patients.map((patient) => (
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
                         {patient.psychologist_name || "N/A"}
                       </td>
                     )}
                    {isAdmin && (
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded-full ${patient.active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                          {patient.active ? "Ativo" : "Inativo"}
                        </span>
                      </td>
                    )}
                    <td className="px-4 py-4 whitespace-nowrap text-right">
                      <div className="flex justify-end space-x-2">
                        {/* View details button - always visible */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onViewDetails(patient)}
                          title="Ver Detalhes"
                        >
                          <Calendar className="h-4 w-4" />
                        </Button>

                        {/* Documentos para recepcionistas e psicólogos */}
                        {(canViewRecords || isAdmin || isPsychologist) && (
                          <>
                            {/* Prontuário - apenas psicólogos e admin */}
                            {canViewRecords && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onViewDetails(patient)}
                                title="Prontuários"
                              >
                                <FileText className="h-4 w-4" />
                              </Button>
                            )}
                          </>
                        )}

                        {/* Encaminhamento e Atestado - para recepcionistas e quem pode ver prontuários */}
                        {/* {(canViewRecords || isAdmin || isPsychologist || canManagePatients) && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onReferralOpen(patient)}
                              title="Encaminhamento"
                            >
                              <Send className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onAttendanceOpen(patient)}
                              title="Atestado de Comparecimento"
                            >
                              <CircleArrowUp className="h-4 w-4" />
                            </Button>
                          </>
                        )} */}

                        {/* Gerenciamento de pacientes - apenas para quem pode gerenciar (admin e recepcionistas) */}
                        {canManagePatients && (
                          <>
                            {/* Botão Editar - apenas para pacientes ativos */}
                            {patient.active && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onEditPatient(patient)}
                                title="Editar"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            )}
                            
                            {/* Botão inteligente: Ativar (verde) se active = 0, Desativar (vermelho) se active = 1 */}
                            {(() => {
                              const isActive = patient.active === 1 || patient.active === true;
                              return (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    if (isActive) {
                                      onDeactivatePatient(patient);
                                    } else {
                                      onReactivatePatient(patient);
                                    }
                                  }}
                                  title={isActive ? "Desativar Paciente" : "Ativar Paciente"}
                                  className={
                                    isActive
                                      ? "text-red-600 hover:text-red-800 hover:bg-red-50"
                                      : "text-green-600 hover:text-green-800 hover:bg-green-50"
                                  }
                                >
                                  {isActive ? (
                                    <Trash className="h-4 w-4" />
                                  ) : (
                                    <FilePlus className="h-4 w-4" />
                                  )}
                                </Button>
                              );
                            })()}
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
    </div>
  );
};

export default PatientTable;
