
import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAppointments } from "@/context/AppointmentContext";
import { Patient } from "@/types/appointment";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";

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
  const [showInsuranceUpload, setShowInsuranceUpload] = useState(false);
  const [identityDocument, setIdentityDocument] = useState<string | null>(patient?.identityDocument as string || null);
  const [insuranceDocument, setInsuranceDocument] = useState<string | null>(patient?.insuranceDocument as string || null);
  
  const idDocInputRef = useRef<HTMLInputElement>(null);
  const insuranceDocInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const patientData: Omit<Patient, "id"> = {
      name,
      cpf,
      phone,
      email,
      address,
      birthdate,
      active: true,
      ...(identityDocument && { identityDocument }),
      ...(insuranceDocument && { insuranceDocument }),
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
  
  const handleIdentityDocumentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Convert file to base64 string for demo purposes (in a real app, you'd upload to a server)
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setIdentityDocument(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };
  
  const handleInsuranceDocumentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Convert file to base64 string for demo purposes
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setInsuranceDocument(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };
  
  const handleInsuranceToggle = (value: string) => {
    setShowInsuranceUpload(value === "yes");
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
      
      {/* Document Upload Section */}
      <div className="space-y-4 mt-6 p-4 border border-gray-200 rounded-md">
        <h3 className="font-medium">Documentos</h3>
        
        {/* Identity Document */}
        <div className="space-y-2">
          <Label htmlFor="identityDocument">Documento de Identidade</Label>
          <div 
            className="border-2 border-dashed rounded-md p-4 text-center cursor-pointer hover:bg-gray-50"
            onClick={() => idDocInputRef.current?.click()}
          >
            <input
              ref={idDocInputRef}
              id="identityDocument"
              type="file"
              accept="image/*,.pdf"
              className="hidden"
              onChange={handleIdentityDocumentChange}
            />
            {identityDocument ? (
              <div className="flex items-center justify-center">
                <div className="bg-green-100 text-green-800 px-2 py-1 rounded-md text-sm">
                  Documento carregado ✓
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-red-500 ml-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIdentityDocument(null);
                  }}
                >
                  Remover
                </Button>
              </div>
            ) : (
              <div>
                <p className="text-sm text-gray-500">Clique para selecionar ou arraste o arquivo</p>
                <p className="text-xs text-gray-400 mt-1">Formatos aceitos: JPG, PNG, PDF</p>
              </div>
            )}
          </div>
        </div>
        
        {/* Insurance Option */}
        <div className="space-y-2">
          <Label htmlFor="hasInsurance">Paciente utiliza plano de saúde?</Label>
          <Select defaultValue={showInsuranceUpload ? "yes" : "no"} onValueChange={handleInsuranceToggle}>
            <SelectTrigger id="hasInsurance">
              <SelectValue placeholder="Selecione uma opção" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="yes">Sim</SelectItem>
              <SelectItem value="no">Não</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {/* Insurance Document Upload (conditional) */}
        {showInsuranceUpload && (
          <div className="space-y-2">
            <Label htmlFor="insuranceDocument">Documento do Plano de Saúde</Label>
            <div 
              className="border-2 border-dashed rounded-md p-4 text-center cursor-pointer hover:bg-gray-50"
              onClick={() => insuranceDocInputRef.current?.click()}
            >
              <input
                ref={insuranceDocInputRef}
                id="insuranceDocument"
                type="file"
                accept="image/*,.pdf"
                className="hidden"
                onChange={handleInsuranceDocumentChange}
              />
              {insuranceDocument ? (
                <div className="flex items-center justify-center">
                  <div className="bg-green-100 text-green-800 px-2 py-1 rounded-md text-sm">
                    Documento carregado ✓
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-red-500 ml-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      setInsuranceDocument(null);
                    }}
                  >
                    Remover
                  </Button>
                </div>
              ) : (
                <div>
                  <p className="text-sm text-gray-500">Clique para selecionar ou arraste o arquivo</p>
                  <p className="text-xs text-gray-400 mt-1">Formatos aceitos: JPG, PNG, PDF</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2 mt-4">
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
