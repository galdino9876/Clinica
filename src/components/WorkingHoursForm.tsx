import React, { useState, useEffect } from "react";
import { Clock, Save, X, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast"; // Ajuste o caminho conforme necessário

const WorkingHoursForm = ({ userId, onSave, onCancel, open }) => {
  const { toast } = useToast(); // Hook para exibir toasts
  const [formData, setFormData] = useState({
    user_id: userId || 0,
    day_of_week: 0, // Definido como 0 (Domingo) como valor inicial válido
    start_time: "",
    end_time: "",
    appointment_type: "presential" // Novo campo: tipo de atendimento
  });
  const [workingHours, setWorkingHours] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const daysOfWeek = [
    { value: 1, label: "Segunda-feira" },
    { value: 2, label: "Terça-feira" },
    { value: 3, label: "Quarta-feira" },
    { value: 4, label: "Quinta-feira" },
    { value: 5, label: "Sexta-feira" },
    { value: 6, label: "Sábado" }
  ];

  const fetchWorkingHours = async () => {
    if (!userId) return;

    try {
      const response = await fetch(`https://webhook.essenciasaudeintegrada.com.br/webhook/d52c9494-5de9-4444-877e-9e8d01662962/working_hours/${userId}`);
      if (!response.ok) throw new Error("Falha ao buscar horários");

      const data = await response.json();
      setWorkingHours(Array.isArray(data) ? data : data.working_hours || []);
    } catch (err) {
      console.error("Erro ao buscar horários:", err);
      setWorkingHours([]);
    }
  };

  useEffect(() => {
    if (open && userId) {
      fetchWorkingHours();
    }
  }, [open, userId]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === "day_of_week" ? parseInt(value) : value
    }));
  };

  const validateForm = () => {
    if (formData.day_of_week === undefined || formData.day_of_week === null) {
      setError("Selecione o dia da semana");
      return false;
    }
    if (!formData.start_time) {
      setError("Informe o horário de início");
      return false;
    }
    if (!formData.end_time) {
      setError("Informe o horário de término");
      return false;
    }
    if (formData.start_time >= formData.end_time) {
      setError("O horário de início deve ser menor que o horário de término");
      return false;
    }
    if (!formData.appointment_type) {
      setError("Selecione o tipo de atendimento");
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    setError("");

    if (!validateForm()) return;

    setLoading(true);

    try {
      const payload = {
        ...formData,
        user_id: userId || formData.user_id,
        start_time: formData.start_time + ":00",
        end_time: formData.end_time + ":00"
      };

      const response = await fetch("https://webhook.essenciasaudeintegrada.com.br/webhook/create-working-hours", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Erro ${response.status}: Falha ao criar o horário`);
      }

      const result = await response.json();
      console.log("Carga horária criada com sucesso:", result);

      toast({
        title: "Sucesso",
        description: "Novo horário de trabalho criado com sucesso!",
      });

      if (onSave) {
        onSave(result);
      }

      // Reset form e atualiza a lista de horários
      setFormData({
        user_id: userId || 0,
        day_of_week: 0,
        start_time: "",
        end_time: "",
        appointment_type: "presential"
      });
      await fetchWorkingHours();
    } catch (err) {
      console.error("Erro ao criar carga horária:", err);
      setError(err.message || "Erro interno do servidor");
      toast({
        title: "Erro",
        description: err.message || "Falha ao criar novo horário de trabalho. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      user_id: userId || 0,
      day_of_week: 0,
      start_time: "",
      end_time: "",
      appointment_type: "presential"
    });
    setError("");
    if (onCancel) {
      onCancel();
    }
  };

  const handleDelete = async (id) => {
    if (!id) return;

    try {
      setLoading(true);
      const response = await fetch("https://webhook.essenciasaudeintegrada.com.br/webhook/delete-hours", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Erro ${response.status}: Falha ao excluir o horário`);
      }

      toast({
        title: "Sucesso",
        description: "Horário de trabalho excluído com sucesso!",
      });

      await fetchWorkingHours();
    } catch (err) {
      console.error("Erro ao excluir horário:", err);
      setError(err.message || "Erro interno do servidor");
      toast({
        title: "Erro",
        description: err.message || "Falha ao excluir horário de trabalho. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
            {error}
          </div>
        )}

        <div className="space-y-2">
          <label htmlFor="day_of_week" className="block text-sm font-medium text-gray-700">
            Dia da Semana *
          </label>
          <select
            id="day_of_week"
            name="day_of_week"
            value={formData.day_of_week}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          >
            <option value="">Selecione o dia</option>
            {daysOfWeek.map((day) => (
              <option key={day.value} value={day.value}>
                {day.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label htmlFor="appointment_type" className="block text-sm font-medium text-gray-700">
            Tipo de Atendimento *
          </label>
          <select
            id="appointment_type"
            name="appointment_type"
            value={formData.appointment_type}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          >
            <option value="presential">Presencial</option>
            <option value="online">Online</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label htmlFor="start_time" className="block text-sm font-medium text-gray-700">
              Horário de Início *
            </label>
            <input
              type="time"
              id="start_time"
              name="start_time"
              value={formData.start_time}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="end_time" className="block text-sm font-medium text-gray-700">
              Horário de Término *
            </label>
            <input
              type="time"
              id="end_time"
              name="end_time"
              value={formData.end_time}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>
        </div>

        <div className="bg-gray-50 p-4 rounded-md">
          <div className="flex items-start space-x-2">
            <Clock size={16} className="text-blue-500 mt-0.5" />
            <div className="text-sm text-gray-600">
              <p className="font-medium">Resumo:</p>
              <p>
                {daysOfWeek.find(d => d.value === formData.day_of_week)?.label || "Dia não selecionado"}
              </p>
              <p>
                {formData.start_time && formData.end_time ?
                  `${formData.start_time} às ${formData.end_time}` :
                  "Horários não definidos"
                }
              </p>
              <p>
                Tipo: {formData.appointment_type === "presential" ? "Presencial" : "Online"}
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <button
            type="button"
            onClick={handleCancel}
            className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md flex items-center space-x-2 transition-colors"
          >
            <X size={16} />
            <span>Cancelar</span>
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-md flex items-center space-x-2 transition-colors"
          >
            <Save size={16} />
            <span>{loading ? "Salvando..." : "Salvar"}</span>
          </button>
        </div>

        {/* Lista de Horários Cadastrados */}
        {workingHours.length > 0 && (
          <div className="mt-6 border-t pt-4">
            <h4 className="text-md font-medium text-gray-800 mb-3">Horários Cadastrados:</h4>
            <div className="space-y-2">
              {workingHours.map((hour) => (
                <div key={hour.id} className="bg-gray-50 p-3 rounded-md flex justify-between items-center">
                  <div>
                    <span className="font-medium">{daysOfWeek.find(d => d.value === hour.day_of_week)?.label}</span>
                    <span className="text-gray-600 ml-2">
                      {hour.start_time?.substring(0, 5)} às {hour.end_time?.substring(0, 5)}
                    </span>
                    <span className="text-gray-500 ml-2">
                      ({hour.appointment_type === "presential" ? "Presencial" : "Online"})
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDelete(hour.id)}
                    className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded-md flex items-center space-x-1 transition-colors"
                    disabled={loading}
                  >
                    <Trash2 size={16} />
                    <span>Excluir</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WorkingHoursForm;
