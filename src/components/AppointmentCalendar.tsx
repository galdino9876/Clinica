import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar, Clock, User, MapPin, CreditCard, X, Loader2 } from 'lucide-react';
import { useAuth } from "../context/AuthContext"; // Adicionado para autenticação real

const AppointmentCalendar = () => {
  const { user } = useAuth(); // Obtém o usuário autenticado do contexto
  const [currentDate, setCurrentDate] = useState(new Date());
  const [appointments, setAppointments] = useState([]);
  const [workingHours, setWorkingHours] = useState([]);
  const [patients, setPatients] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDateDetails, setSelectedDateDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Buscar dados das APIs
  const fetchData = async () => {
    try {
      setLoading(true);

      // Buscar agendamentos
      let appointmentsResponse;
      if (user && user.role === 'psychologist') {
        // Endpoint específico para o psicólogo logado
        appointmentsResponse = await fetch(`https://webhook.essenciasaudeintegrada.com.br/webhook/d52c9494-5de9-4444-877e-9e8d01662962/appointmens/${user.id}`);
      } else {
        // Endpoint genérico para admin ou sem autenticação
        appointmentsResponse = await fetch('https://webhook.essenciasaudeintegrada.com.br/webhook/appointmens');
      }
      if (appointmentsResponse.ok) {
        const appointmentsData = await appointmentsResponse.json();
        const rawAppointments = Array.isArray(appointmentsData) ? appointmentsData : appointmentsData.data || [];
        setAppointments(rawAppointments);
      } else {
        throw new Error(`Erro ao buscar agendamentos: ${appointmentsResponse.status}`);
      }

      // Buscar horários de trabalho
      let workingHoursResponse;
      if (user && user.role === 'psychologist') {
        // Buscar horários específicos do psicólogo logado
        workingHoursResponse = await fetch(`https://webhook.essenciasaudeintegrada.com.br/webhook/d52c9494-5de9-4444-877e-9e8d01662962/working_hours/${user.id}`);
      } else {
        // Buscar horários de todos os psicólogos
        workingHoursResponse = await fetch('https://webhook.essenciasaudeintegrada.com.br/webhook/working_hours');
      }
      
      if (workingHoursResponse.ok) {
        const workingHoursData = await workingHoursResponse.json();
        setWorkingHours(Array.isArray(workingHoursData) ? workingHoursData : workingHoursData.data || []);
      } else {
        throw new Error(`Erro ao buscar horários de trabalho: ${workingHoursResponse.status}`);
      }

      // Buscar pacientes
      const patientsResponse = await fetch('https://webhook.essenciasaudeintegrada.com.br/webhook/patients');
      if (patientsResponse.ok) {
        const patientsData = await patientsResponse.json();
        setPatients(Array.isArray(patientsData) ? patientsData : patientsData.data || []);
      } else {
        throw new Error(`Erro ao buscar pacientes: ${patientsResponse.status}`);
      }

      // Buscar usuários (psicólogos)
      const usersResponse = await fetch('https://webhook.essenciasaudeintegrada.com.br/webhook/users');
      if (usersResponse.ok) {
        const usersData = await usersResponse.json();
        setUsers(Array.isArray(usersData) ? usersData : usersData.data || []);
      } else {
        throw new Error(`Erro ao buscar usuários: ${usersResponse.status}`);
      }

      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Função para buscar detalhes detalhados de uma data específica
  const fetchDateDetails = async (dateString) => {
    try {
      setLoadingDetails(true);
      
      // Fazer fetch para a API de detalhes baseado no role do usuário
      let response;
      if (user && user.role === 'psychologist') {
        // Endpoint específico para o psicólogo logado
        response = await fetch(`https://webhook.essenciasaudeintegrada.com.br/webhook/d52c9494-5de9-4444-877e-9e8d01662962/appointmens/${user.id}`);
      } else {
        // Endpoint genérico para admin ou sem autenticação
        response = await fetch('https://webhook.essenciasaudeintegrada.com.br/webhook/appointmens');
      }
      
              if (response.ok) {
          const data = await response.json();
          const appointmentsForDate = Array.isArray(data) ? data : data.data || [];
          
          // Normalizar os dados para lidar com diferentes estruturas de API
          const normalizedAppointments = appointmentsForDate.map(apt => ({
            ...apt,
            // Para admin: status contém o horário de término, para psicólogo: end_time separado
            end_time: apt.end_time || apt.status,
            // Garantir que o status seja o campo correto
            status: apt.status && apt.status.includes(':') ? 'pending' : apt.status
          }));
          
          // Filtrar agendamentos para a data específica
          const filteredAppointments = normalizedAppointments.filter(apt => {
            // Verificar diferentes formatos de data possíveis
            return apt.date === dateString || 
                   apt.appointment_date === dateString || 
                   apt.scheduled_date === dateString;
          });
          
          setSelectedDateDetails({
            date: dateString,
            appointments: filteredAppointments
          });
        } else {
        throw new Error(`Erro ao buscar detalhes: ${response.status}`);
      }
    } catch (err) {
      console.error('Erro ao buscar detalhes da data:', err);
      setError(err.message);
    } finally {
      setLoadingDetails(false);
    }
  };

  // Funções para buscar nomes por ID
  const getPatientName = (patientId) => {
    const patient = patients.find(p => p.id === patientId);
    return patient ? (patient.nome || patient.name || `Paciente ${patientId}`) : `Paciente ${patientId}`;
  };

  const getPsychologistName = (psychologistId) => {
    const psychologist = users.find(u => u.id === psychologistId);
    return psychologist ? (psychologist.nome || psychologist.name || `Psicólogo ${psychologistId}`) : `Psicólogo ${psychologistId}`;
  };

     useEffect(() => {
     fetchData();
   }, [user]); // Reexecuta fetchData se o usuário mudar

   // Debug: log dos dados quando mudam
   useEffect(() => {
     console.log('appointments:', appointments);
     console.log('workingHours:', workingHours);
     console.log('patients:', patients);
     console.log('users:', users);
   }, [appointments, workingHours, patients, users]);

  // Funções auxiliares para o calendário
  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

                                   const formatDate = (date) => {
       // Usar uma abordagem mais robusta para evitar problemas de timezone
       const year = date.getFullYear();
       const month = String(date.getMonth() + 1).padStart(2, '0');
       const day = String(date.getDate()).padStart(2, '0');
       const formatted = `${year}-${month}-${day}`;
       
       console.log('formatDate - input date:', date);
       console.log('formatDate - year:', year, 'month:', month, 'day:', day);
       console.log('formatDate - formatted result:', formatted);
       return formatted;
     };

  const navigateMonth = (direction) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(currentDate.getMonth() + direction);
    setCurrentDate(newDate);
  };

        // Determinar o status do dia
   const getDayStatus = (day) => {
     const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
     const dateString = formatDate(date);
     const dayOfWeek = date.getDay();

     // Usar os agendamentos já filtrados pelo endpoint
     const dayAppointments = appointments.filter(apt => apt.date === dateString);

     const dayWorkingHours = workingHours.filter(wh => wh.day_of_week === dayOfWeek);

     if (dayAppointments.length === 0 && dayWorkingHours.length === 0) {
       return { status: 'none', color: '' };
     }

     const confirmedAppointments = dayAppointments.filter(apt =>
       apt.status === 'scheduled' || apt.status === 'completed'
     );
     const pendingAppointments = dayAppointments.filter(apt =>
       apt.status === 'cancelled'
     );

     let totalSlots = 0;
     dayWorkingHours.forEach(wh => {
       const startHour = parseInt(wh.start_time.split(':')[0]);
       const endHour = parseInt(wh.end_time.split(':')[0]);
       totalSlots += endHour - startHour;
     });
     const occupiedSlots = dayAppointments.length;

     if (occupiedSlots >= totalSlots && totalSlots > 0) {
       return { status: 'full', color: 'bg-red-500 text-white' };
     } else if (confirmedAppointments.length > 0) {
       return { status: 'confirmed', color: 'bg-green-500 text-white' };
     } else if (pendingAppointments.length > 0) {
       return { status: 'pending', color: 'bg-orange-500 text-white' };
     } else if (dayWorkingHours.length > 0) {
       return { status: 'available', color: 'bg-blue-500 text-white' };
     }

     return { status: 'none', color: '' };
   };

                                   // Obter detalhes do dia selecionado
     const getDayDetails = (day) => {
       // Criar a data correta baseada no dia clicado
       const selectedDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
       const dateString = formatDate(selectedDate);
       const dayOfWeek = selectedDate.getDay();

       console.log('getDayDetails - day clicked:', day);
       console.log('getDayDetails - selectedDate:', selectedDate);
       console.log('getDayDetails - dateString:', dateString);
       console.log('getDayDetails - dayOfWeek:', dayOfWeek);

       // Usar os agendamentos já filtrados pelo endpoint
       // Verificar diferentes possíveis campos de data
       const dayAppointments = appointments.filter(apt => {
         console.log('Comparing apt.date:', apt.date, 'with dateString:', dateString);
         console.log('apt object:', apt);
         return apt.date === dateString || apt.appointment_date === dateString || apt.scheduled_date === dateString;
       });

       const dayWorkingHours = workingHours.filter(wh => wh.day_of_week === dayOfWeek);

       console.log('getDayDetails - dayAppointments:', dayAppointments);
       console.log('getDayDetails - dayWorkingHours:', dayWorkingHours);

       return {
         date: dateString,
         appointments: dayAppointments,
         workingHours: dayWorkingHours
       };
     };

                                                                       const handleDayClick = async (day) => {
        console.log('handleDayClick - day clicked:', day);
        console.log('handleDayClick - currentDate:', currentDate);
        console.log('handleDayClick - currentDate.getMonth():', currentDate.getMonth());
        console.log('handleDayClick - currentDate.getFullYear():', currentDate.getFullYear());
        
        // Criar a data correta para verificação
        const clickedDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
        console.log('handleDayClick - clickedDate:', clickedDate);
        console.log('handleDayClick - clickedDate.toISOString():', clickedDate.toISOString());
        
        setSelectedDate(day);
        setShowModal(true);
        
        // Buscar detalhes detalhados da data
        const dateString = formatDate(clickedDate);
        await fetchDateDetails(dateString);
      };

   const handleAppointmentClick = (appointment) => {
     // Aqui você pode implementar a lógica para mostrar detalhes do agendamento
     // Por exemplo, abrir outro modal ou navegar para uma página de detalhes
     console.log('Detalhes do agendamento:', appointment);
     alert(`Detalhes do agendamento:\nPaciente: ${getPatientName(appointment.patient_id)}\nHorário: ${appointment.start_time} - ${appointment.end_time}\nStatus: ${appointment.status}`);
   };

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);
    const days = [];

    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="p-2"></div>);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dayStatus = getDayStatus(day);
      
                                         // Verificar se há agendamentos para este dia
        const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
        const dateString = formatDate(date);
        const dayAppointments = appointments.filter(apt => apt.date === dateString);
        const hasAppointments = dayAppointments.length > 0;
      
      days.push(
        <div
          key={day}
          onClick={() => handleDayClick(day)}
          className={`p-2 text-center cursor-pointer hover:bg-gray-100 rounded transition-colors ${dayStatus.color} relative`}
        >
          <div className="relative">
            {day}
            {hasAppointments && (
              <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-yellow-400 rounded-full"></div>
            )}
          </div>
        </div>
      );
    }

    return days;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Carregando calendário...</span>
      </div>
    );
  }

  const dayDetails = selectedDate ? getDayDetails(selectedDate) : null;

  return (
    <div className="w-full max-w-6xl mx-auto p-6">
      <div className="bg-white shadow-lg rounded-lg overflow-hidden">
        {/* Header */}
        <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
              <Calendar size={24} />
              Calendário de Agendamentos
            </h2>
            <button
              onClick={fetchData}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors"
            >
              Atualizar
            </button>
          </div>
          {error && (
            <div className="mt-2 text-sm text-red-600 bg-red-50 p-2 rounded">
              Erro ao carregar dados da API: {error}
            </div>
          )}
        </div>

        {/* Legenda */}
        <div className="px-6 py-4 bg-gray-50 border-b">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Legenda:</h3>
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-500 rounded"></div>
              <span>Confirmadas</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-orange-500 rounded"></div>
              <span>Pendentes</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-500 rounded"></div>
              <span>Disponibilidade</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-500 rounded"></div>
              <span>Totalmente agendado</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
              <span>Com agendamento</span>
            </div>
          </div>
        </div>

        {/* Navegação do calendário */}
        <div className="px-6 py-4 flex justify-between items-center border-b">
          <button
            onClick={() => navigateMonth(-1)}
            className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors"
          >
            <ChevronLeft size={20} />
            Anterior
          </button>

          <h3 className="text-lg font-semibold">
            {currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
          </h3>

          <button
            onClick={() => navigateMonth(1)}
            className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors"
          >
            Próximo
            <ChevronRight size={20} />
          </button>
        </div>

        {/* Calendário */}
        <div className="p-6">
          <div className="grid grid-cols-7 gap-1 mb-4">
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
              <div key={day} className="p-2 text-center font-medium text-gray-600">
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {renderCalendar()}
          </div>
        </div>
      </div>

             {/* Modal de detalhes do dia - Design moderno com dados detalhados */}
       {showModal && dayDetails && (
         <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
           <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
             {/* Header do Modal */}
             <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6">
               <div className="flex justify-between items-center">
                 <div>
                                                                               <h3 className="text-2xl font-bold capitalize">
                       {(() => {
                         // Criar a data e adicionar um dia para compensar o timezone
                         const modalDate = new Date(dayDetails.date);
                         modalDate.setDate(modalDate.getDate() + 1);
                         
                         console.log('Modal - dayDetails.date:', dayDetails.date);
                         console.log('Modal - modalDate (original):', new Date(dayDetails.date));
                         console.log('Modal - modalDate (com +1 dia):', modalDate);
                         
                         const formattedDate = modalDate.toLocaleDateString('pt-BR', {
                           weekday: 'long',
                           year: 'numeric',
                           month: 'long',
                           day: 'numeric'
                         });
                         
                         console.log('Modal - formattedDate:', formattedDate);
                         return formattedDate;
                       })()}
                     </h3>
                   <p className="text-blue-100 mt-1">Detalhes dos agendamentos para esta data</p>
                 </div>
                 <button
                   onClick={() => setShowModal(false)}
                   className="text-white hover:text-blue-200 transition-colors p-2 rounded-full hover:bg-white hover:bg-opacity-20"
                 >
                   <X size={24} />
                 </button>
               </div>
             </div>

                                                       {/* Conteúdo do Modal */}
               <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
                 
                 {/* Loading dos detalhes */}
                 {loadingDetails && (
                   <div className="flex justify-center items-center py-12">
                     <Loader2 className="animate-spin h-8 w-8 text-blue-600 mr-3" />
                     <span className="text-lg text-gray-600">Carregando detalhes...</span>
                   </div>
                 )}

                                  {/* Lista de Horários com Agendamentos Integrados */}
                 {!loadingDetails && dayDetails && (
                   <div className="mb-6">
                     <h4 className="text-lg font-semibold text-gray-800 mb-4">Agendamentos</h4>
                     
                     {(() => {
                       // Gerar todos os horários disponíveis baseado nos working hours
                       const allTimeSlots = [];
                       
                       dayDetails.workingHours.forEach(wh => {
                         const startHour = parseInt(wh.start_time.split(':')[0]);
                         const endHour = parseInt(wh.end_time.split(':')[0]);
                         
                         for (let hour = startHour; hour < endHour; hour++) {
                           const timeSlot = `${hour.toString().padStart(2, '0')}:00`;
                           
                           // Verificar se há agendamentos para este horário usando os dados detalhados
                           const appointmentsForSlot = selectedDateDetails?.appointments?.filter(apt => {
                             const aptStartHour = parseInt(apt.start_time.split(':')[0]);
                             return aptStartHour === hour;
                           }) || [];
                           
                           allTimeSlots.push({
                             time: timeSlot,
                             appointments: appointmentsForSlot,
                             hasAppointments: appointmentsForSlot.length > 0
                           });
                         }
                       });
                       
                       // Ordenar por horário
                       allTimeSlots.sort((a, b) => a.time.localeCompare(b.time));
                       
                       return (
                         <div className="space-y-4">
                           {allTimeSlots.map((slot, index) => (
                             <div key={index} className="border border-gray-200 rounded-lg overflow-hidden">
                               {/* Horário */}
                               <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                                 <div className="text-lg font-semibold text-gray-800">
                                   {slot.time}
                                 </div>
                               </div>
                               
                               {/* Conteúdo do Horário */}
                               <div className="p-4">
                                 {slot.hasAppointments ? (
                                   // Mostrar pacientes agendados com dados detalhados
                                   <div className="space-y-3">
                                     {slot.appointments.map((apt, aptIndex) => (
                                       <div
                                         key={aptIndex}
                                         className="bg-white border border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition-colors"
                                       >
                                         <div className="flex items-start justify-between">
                                           <div className="flex-1">
                                             {/* Nome do paciente com bolinha de status */}
                                             <div className="flex items-center gap-3 mb-3">
                                               <div className={`w-3 h-3 rounded-full ${
                                                 apt.status === 'pending' ? 'bg-yellow-500' :
                                                 apt.status === 'confirmed' ? 'bg-green-500' :
                                                 apt.status === 'cancelled' ? 'bg-red-500' :
                                                 apt.status === 'completed' ? 'bg-blue-500' :
                                                 'bg-gray-500'
                                               }`}></div>
                                               <h5 className="text-lg font-semibold text-gray-900">
                                                 {getPatientName(apt.patient_id)}
                                               </h5>
                                             </div>
                                             
                                             {/* Grid com informações detalhadas - Layout moderno */}
                                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                               <div className="space-y-3">
                                                 <div className="flex items-center gap-3">
                                                   <User className="w-5 h-5 text-blue-600" />
                                                   <div>
                                                     <span className="text-xs text-gray-500 uppercase tracking-wide">Psicólogo Responsável</span>
                                                     <p className="font-medium text-gray-900">{getPsychologistName(apt.psychologist_id)}</p>
                                                   </div>
                                                 </div>
                                                 <div className="flex items-center gap-3">
                                                   <MapPin className="w-5 h-5 text-purple-600" />
                                                   <div>
                                                     <span className="text-xs text-gray-500 uppercase tracking-wide">Sala</span>
                                                     <p className="font-medium text-gray-900">Sala {apt.room_id || 'N/A'}</p>
                                                   </div>
                                                 </div>
                                               </div>
                                               <div className="space-y-3">
                                                 <div className="flex items-center gap-3">
                                                   <Clock className="w-5 h-5 text-green-600" />
                                                   <div>
                                                     <span className="text-xs text-gray-500 uppercase tracking-wide">Início</span>
                                                     <p className="font-medium text-gray-900">
                                                       {apt.start_time ? apt.start_time : 'N/A'}
                                                     </p>
                                                   </div>
                                                 </div>
                                                 <div className="flex items-center gap-3">
                                                   <Clock className="w-5 h-5 text-red-600" />
                                                   <div>
                                                     <span className="text-xs text-gray-500 uppercase tracking-wide">Término</span>
                                                     <p className="font-medium text-gray-900">
                                                       {apt.end_time ? apt.end_time : 'N/A'}
                                                     </p>
                                                   </div>
                                                 </div>
                                               </div>
                                             </div>
                                             
                                             {/* Status e Valor - Layout moderno */}
                                             <div className="mt-4 pt-4 border-t border-gray-200">
                                               <div className="flex items-center justify-between">
                                                 <div className="flex items-center gap-3">
                                                   <div className={`w-3 h-3 rounded-full ${
                                                     apt.status === 'pending' ? 'bg-yellow-500' :
                                                     apt.status === 'confirmed' ? 'bg-green-500' :
                                                     apt.status === 'cancelled' ? 'bg-red-500' :
                                                     apt.status === 'completed' ? 'bg-blue-500' :
                                                     'bg-gray-500'
                                                   }`}></div>
                                                   <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                                     apt.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                                     apt.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                                                     apt.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                                                     apt.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                                                     'bg-gray-100 text-gray-800'
                                                   }`}>
                                                     {apt.status === 'pending' ? 'Pendente' :
                                                      apt.status === 'confirmed' ? 'Confirmado' :
                                                      apt.status === 'cancelled' ? 'Cancelado' :
                                                      apt.status === 'completed' ? 'Concluído' :
                                                      apt.status}
                                                   </span>
                                                 </div>
                                                 <div className="text-right">
                                                   <span className="text-xs text-gray-500 uppercase tracking-wide">Valor</span>
                                                   <p className="text-lg font-bold text-green-600">R$ {parseFloat(apt.value || 0).toFixed(2)}</p>
                                                 </div>
                                               </div>
                                             </div>
                                           </div>
                                         </div>
                                       </div>
                                     ))}
                                   </div>
                                 ) : (
                                   // Mostrar "Livre"
                                   <div className="flex items-center gap-3">
                                     <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                                     <div className="text-lg font-medium text-green-700">
                                       Livre
                                     </div>
                                   </div>
                                 )}
                               </div>
                             </div>
                           ))}
                         </div>
                       );
                     })()}
                   </div>
                 )}

                 {/* Mensagem quando não há horários disponíveis */}
                 {!loadingDetails && dayDetails.workingHours.length === 0 && (
                   <div className="text-center text-gray-500 py-12">
                     <Calendar size={64} className="mx-auto mb-4 opacity-50" />
                     <p className="text-lg font-medium">Nenhum psicólogo disponível nesta data</p>
                     <p className="text-sm text-gray-400">Selecione outra data para ver os horários disponíveis</p>
                   </div>
                 )}
               </div>
           </div>
         </div>
       )}
    </div>
  );
};

export default AppointmentCalendar;
