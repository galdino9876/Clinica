import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileCheck, FileText, UserCheck, Receipt } from 'lucide-react';

interface CompletedGuide {
  id: number;
  id_patient: number;
  numero_prestador: string;
  existe_pdf_assinado: number;
  existe_guia_autorizada: number;
  existe_guia_assinada: number;
  existe_guia_assinada_psicologo: number;
  date_1: string | null;
  date_2: string | null;
  date_3: string | null;
  date_4: string | null;
  date_5: string | null;
  name: string;
  faturado: number;
  date_faturado: string | null;
  appointment_type: string;
}

interface GuideStatsChartProps {
  completedGuides: CompletedGuide[];
}

const GuideStatsChart: React.FC<GuideStatsChartProps> = ({ completedGuides }) => {
  // Filtrar apenas registros com numero_prestador (guias válidas)
  const validGuides = completedGuides.filter(g => g.numero_prestador !== null);
  
  // Criar um Set para contar guias únicas baseadas no numero_prestador
  const uniqueGuides = new Set(validGuides.map(g => g.numero_prestador));
  
  // Calcular estatísticas baseadas em guias únicas
  const stats = {
    autorizadas: Array.from(uniqueGuides).filter(numeroPrestador => 
      validGuides.some(g => g.numero_prestador === numeroPrestador && g.existe_guia_autorizada === 1)
    ).length,
    assinadas: Array.from(uniqueGuides).filter(numeroPrestador => 
      validGuides.some(g => g.numero_prestador === numeroPrestador && g.existe_guia_assinada === 1)
    ).length,
    assinadas_psicologo: Array.from(uniqueGuides).filter(numeroPrestador => 
      validGuides.some(g => g.numero_prestador === numeroPrestador && g.existe_guia_assinada_psicologo === 1)
    ).length,
    faturadas: Array.from(uniqueGuides).filter(numeroPrestador => 
      validGuides.some(g => g.numero_prestador === numeroPrestador && g.faturado === 1)
    ).length,
    total: uniqueGuides.size // Contar guias únicas pelo numero_prestador
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
      {/* Guias Autorizadas */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-blue-800 flex items-center gap-2">
            <FileCheck className="h-4 w-4" />
            Guias Autorizadas
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="text-2xl font-bold text-blue-900">{stats.autorizadas}</div>
          <p className="text-xs text-blue-600">
            {stats.total > 0 ? `${Math.round((stats.autorizadas / stats.total) * 100)}% do total` : '0% do total'}
          </p>
        </CardContent>
      </Card>

      {/* Guias Assinadas */}
      <Card className="bg-green-50 border-green-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-green-800 flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Guias Assinadas
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="text-2xl font-bold text-green-900">{stats.assinadas}</div>
          <p className="text-xs text-green-600">
            {stats.total > 0 ? `${Math.round((stats.assinadas / stats.total) * 100)}% do total` : '0% do total'}
          </p>
        </CardContent>
      </Card>

      {/* Guias Assinadas pelo Psicólogo */}
      <Card className="bg-purple-50 border-purple-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-purple-800 flex items-center gap-2">
            <UserCheck className="h-4 w-4" />
            Assinadas pelo Psicólogo
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="text-2xl font-bold text-purple-900">{stats.assinadas_psicologo}</div>
          <p className="text-xs text-purple-600">
            {stats.total > 0 ? `${Math.round((stats.assinadas_psicologo / stats.total) * 100)}% do total` : '0% do total'}
          </p>
        </CardContent>
      </Card>

      {/* Guias Faturadas */}
      <Card className="bg-orange-50 border-orange-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-orange-800 flex items-center gap-2">
            <Receipt className="h-4 w-4" />
            Guias Faturadas
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="text-2xl font-bold text-orange-900">{stats.faturadas}</div>
          <p className="text-xs text-orange-600">
            {stats.total > 0 ? `${Math.round((stats.faturadas / stats.total) * 100)}% do total` : '0% do total'}
          </p>
        </CardContent>
      </Card>

      {/* Total de Guias */}
      <Card className="bg-gray-50 border-gray-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-800 flex items-center gap-2">
            <FileCheck className="h-4 w-4" />
            Total de Guias
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
          <p className="text-xs text-gray-600">
            Guias no período
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default GuideStatsChart;
