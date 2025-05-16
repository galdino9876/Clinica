
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAppointments } from "@/context/AppointmentContext";
import { Patient } from "@/types/appointment";

interface PatientFormProps {
  patient?: Patient;
  onSave: (patient: Patient) => void;
  onCancel: () => void;
}

const PatientForm = ({ patient, onSave, onCancel }: PatientFormProps) => {
  const { addPatient, updatePatient } = useAppointments();
  const [name, setName] = useState(patient?.name || "");
  const [cpf, setCpf] = useState(patient?.cpf || "");
  const [phone, setPhone] = useState(patient?.phone || "");
  const [email, setEmail] = useState(patient?.email || "");
  const [address, setAddress] = useState(patient?.address || "");
  const [birthdate, setBirthdate] = useState(patient?.birthdate || "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const patientData: Omit<Patient, "id"> = {
      name,
      cpf,
      phone,
      email,
      address,
      birthdate,
      active: true // Add the missing 'active' property
    };

    if (patient) {
      // For existing patients, preserve their active status
      const updatedPatient = { 
        ...patientData, 
        id: patient.id,
        active: patient.active !== undefined ? patient.active : true,
        deactivationReason: patient.deactivationReason,
        deactivationDate: patient.deactivationDate
      };
      updatePatient(updatedPatient);
      onSave(updatedPatient);
    } else {
      // For new patients, set active to true by default
      const newPatient = addPatient(patientData);
      
      if (newPatient) {
        onSave(newPatient);
      } else {
        console.error("Warning: addPatient did not return a patient object");
        onSave({ ...patientData, id: Math.random().toString(36).substring(2, 11) });
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Nome Completo</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cpf">CPF</Label>
          <Input
            id="cpf"
            value={cpf}
            onChange={(e) => setCpf(e.target.value)}
            placeholder="000.000.000-00"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Telefone</Label>
          <Input
            id="phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="(00) 00000-0000"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">E-mail</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="address">Endereço</Label>
          <Input
            id="address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="birthdate">Data de Nascimento</Label>
          <Input
            id="birthdate"
            type="date"
            value={birthdate}
            onChange={(e) => setBirthdate(e.target.value)}
          />
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit">
          {patient ? "Atualizar" : "Cadastrar"} Paciente
        </Button>
      </div>
    </form>
  );
};

export default PatientForm;
