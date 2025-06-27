import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar, Clock, User, MapPin, CreditCard, X } from 'lucide-react';

const AppointmentCalendar = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [appointments, setAppointments] = useState([]);
  const [workingHours, setWorkingHours] = useState([]);
  const [patients, setPatients] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [loggedUser, setLoggedUser] = useState(null); // Simula o usuário logado

  // Simulação de usuário logado (substitua por autenticação real)
  useEffect(() => {
    // Exemplo: Simula um psicólogo logado (ID: 1, role: psychologist)
    const simulateLoggedUser = {
      id: 1, // ID do psicólogo logado
      role: 'psychologist', // Ou 'admin'
      nome: 'Dr. João Silva',
    };
    setLoggedUser(simulateLoggedUser);
    // Na prática, use um contexto ou API de autenticação aqui
  }, []);

  // Buscar dados das APIs
  const fetchData = async () => {
    try {
      setLoading(true);

      // Buscar agendamentos
      const appointmentsResponse = await fetch('https://webhook.essenciasaudeintegrada.com.br/webhook/appointmens');
      if (appointmentsResponse.ok) {
        const appointmentsData = await appointmentsResponse.json();
        const rawAppointments = Array.isArray(appointmentsData) ? appointmentsData : appointmentsData.data || [];

        // Filtrar agendamentos com base no usuário logado
        const filteredAppointments = loggedUser
          ? loggedUser.role === 'psychologist'
            ? rawAppointments.filter(apt => apt.psychologist_id === loggedUser.id)
            : rawAppointments // Admin vê todos
          : rawAppointments;

        setAppointments(filteredAppointments);
      } else {
        throw new Error(`Erro ao buscar agendamentos: ${appointmentsResponse.status}`);
      }

      // Buscar horários de trabalho
      const workingHoursResponse = await fetch('https://webhook.essenciasaudeintegrada.com.br/webhook/working_hours');
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
  }, [loggedUser]); // Reexecuta fetchData se o usuário logado mudar

  // Funções auxiliares para o calendário
  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const formatDate = (date) => {
    return date.toISOString().split('T')[0];
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

    // Filtrar agendamentos do dia com base no usuário logado
    const dayAppointments = loggedUser
      ? loggedUser.role === 'psychologist'
        ? appointments.filter(apt => apt.date === dateString && apt.psychologist_id === loggedUser.id)
        : appointments.filter(apt => apt.date === dateString) // Admin vê todos
      : appointments.filter(apt => apt.date === dateString);

    const dayWorkingHours = workingHours.filter(wh => wh.day_of_week === dayOfWeek);

    if (dayAppointments.length === 0 && dayWorkingHours.length === 0) {
      return { status: 'none', color: '' };
    }

    const confirmedAppointments = dayAppointments.filter(apt =>
      apt.status === 'Confirmada' || apt.status === 'confirmada' || apt.status === 'confirmed'
    );
    const pendingAppointments = dayAppointments.filter(apt =>
      apt.status === 'Pendente' || apt.status === 'pendente' || apt.status === 'pending'
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
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    const dateString = formatDate(date);
    const dayOfWeek = date.getDay();

    // Filtrar agendamentos do dia com base no usuário logado
    const dayAppointments = loggedUser
      ? loggedUser.role === 'psychologist'
        ? appointments.filter(apt => apt.date === dateString && apt.psychologist_id === loggedUser.id)
        : appointments.filter(apt => apt.date === dateString) // Admin vê todos
      : appointments.filter(apt => apt.date === dateString);

    const dayWorkingHours = workingHours.filter(wh => wh.day_of_week === dayOfWeek);

    const availableSlots = [];
    dayWorkingHours.forEach(wh => {
      const startHour = parseInt(wh.start_time.split(':')[0]);
      const endHour = parseInt(wh.end_time.split(':')[0]);

      for (let hour = startHour; hour < endHour; hour++) {
        const timeSlot = `${hour.toString().padStart(2, '0')}:00`;
        const isOccupied = dayAppointments.some(apt => apt.start_time === timeSlot);

        if (!isOccupied) {
          availableSlots.push(timeSlot);
        }
      }
    });

    return {
      date: dateString,
      appointments: dayAppointments,
      availableSlots,
      workingHours: dayWorkingHours
    };
  };

  const handleDayClick = (day) => {
    setSelectedDate(day);
    setShowModal(true);
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
      days.push(
        <div
          key={day}
          onClick={() => handleDayClick(day)}
          className={`p-2 text-center cursor-pointer hover:bg-gray-100 rounded transition-colors ${dayStatus.color}`}
        >
          {day}
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

      {/* Modal de detalhes do dia */}
      {showModal && dayDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b">
              <h3 className="text-lg font-semibold">
                {new Date(dayDetails.date).toLocaleDateString('pt-BR', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6">
              {/* Agendamentos */}
              {dayDetails.appointments.length > 0 && (
                <div className="mb-6">
                  <h4 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
                    <Clock size={16} />
                    Agendamentos ({dayDetails.appointments.length})
                  </h4>
                  <div className="space-y-3">
                    {dayDetails.appointments.map((apt, index) => (
                      <div key={index} className="bg-gray-50 p-3 rounded-lg">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-medium">{apt.start_time} - {apt.end_time}</div>
                            <div className="text-sm text-gray-600">
                              <strong>Paciente:</strong> {getPatientName(apt.patient_id)}
                            </div>
                            <div className="text-sm text-gray-600">
                              <strong>Psicólogo:</strong> {getPsychologistName(apt.psychologist_id)}
                            </div>
                            <div className="text-sm text-gray-600">
                              <strong>Valor:</strong> R$ {apt.value} | <strong>Pagamento:</strong> {apt.payment_method}
                            </div>
                            {apt.insurance_type && (
                              <div className="text-sm text-gray-600">
                                <strong>Convênio:</strong> {apt.insurance_type}
                              </div>
                            )}
                          </div>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            apt.status === 'Confirmada' ? 'bg-green-100 text-green-800' :
                            apt.status === 'Pendente' ? 'bg-orange-100 text-orange-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {apt.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Horários disponíveis */}
              {dayDetails.availableSlots.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
                    <User size={16} />
                    Horários Disponíveis ({dayDetails.availableSlots.length})
                  </h4>
                  <div className="grid grid-cols-4 gap-2">
                    {dayDetails.availableSlots.map((slot, index) => (
                      <div key={index} className="bg-blue-50 text-blue-800 p-2 rounded text-center text-sm">
                        {slot}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {dayDetails.appointments.length === 0 && dayDetails.availableSlots.length === 0 && (
                <div className="text-center text-gray-500 py-8">
                  <Calendar size={48} className="mx-auto mb-2 opacity-50" />
                  <p>Nenhum agendamento ou disponibilidade para este dia</p>
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
