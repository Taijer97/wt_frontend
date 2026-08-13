import React, { useState } from 'react';
import { AppConfig, TaxRegime } from '../../types';
import { Building, Calculator, Scale, CalendarClock, FolderArchive, Download } from 'lucide-react';
import { Input, Button, Card, useAlert } from '../ui';
import { BackendService } from '../../services/backendService';

interface GeneralSettingsTabProps {
  config: AppConfig;
  setConfig: React.Dispatch<React.SetStateAction<AppConfig>>;
  onSave: () => Promise<void>;
  isProcessing: boolean;
  onRegimeChange: (target: 'ruc10' | 'ruc20', regime: TaxRegime) => void;
}

export const GeneralSettingsTab: React.FC<GeneralSettingsTabProps> = ({
  config,
  setConfig,
  onSave,
  isProcessing,
  onRegimeChange,
}) => {
  const alert = useAlert();
  const [isDownloadingBackup, setIsDownloadingBackup] = useState(false);

  const handleDownloadBackup = async () => {
    try {
      setIsDownloadingBackup(true);
      await BackendService.downloadUploadsBackup();
      alert.success('Copia de respaldo (.ZIP) generada y descargada correctamente');
    } catch (err: any) {
      alert.error(err?.message || 'Error al generar copia de respaldo de archivos');
    } finally {
      setIsDownloadingBackup(false);
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-8 animate-fade-in">
      {/* SECCIÓN 1: IDENTIDAD Y VARIABLES */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-4">
          <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest border-b pb-2 flex items-center gap-2">
            <Building className="w-4 h-4 text-blue-600"/> Identidad Corporativa (RUC 20)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Input 
                label="Razón Social" 
                value={config.companyName || ''} 
                onChange={e => setConfig({...config, companyName: e.target.value.toUpperCase()})} 
              />
            </div>
            <Input 
              label="Número de RUC" 
              value={config.companyRuc || ''} 
              onChange={e => setConfig({...config, companyRuc: e.target.value.toUpperCase()})} 
            />
            <Input 
              label="Teléfono" 
              value={config.companyPhone || ''} 
              onChange={e => setConfig({...config, companyPhone: e.target.value.toUpperCase()})} 
            />
          </div>
          <div className="space-y-4">
            <Input 
              label="Dirección Fiscal" 
              value={config.companyAddress || ''} 
              onChange={e => setConfig({...config, companyAddress: e.target.value.toUpperCase()})} 
            />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input 
                label="Departamento" 
                value={config.companyDepartment || ''} 
                onChange={e => setConfig({...config, companyDepartment: e.target.value.toUpperCase()})} 
              />
              <Input 
                label="Provincia" 
                value={config.companyProvince || ''} 
                onChange={e => setConfig({...config, companyProvince: e.target.value.toUpperCase()})} 
              />
              <Input 
                label="Distrito" 
                value={config.companyDistrict || ''} 
                onChange={e => setConfig({...config, companyDistrict: e.target.value.toUpperCase()})} 
              />
            </div>
            <Input 
              label="Correo Corporativo" 
              type="email"
              value={config.companyEmail || ''} 
              onChange={e => setConfig({...config, companyEmail: e.target.value.toUpperCase()})} 
            />
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest border-b pb-2 flex items-center gap-2">
            <Calculator className="w-4 h-4 text-emerald-600"/> Variables de Referencia
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <Input 
              label="UIT Vigente (S/)" 
              type="number"
              value={config.uit || 0} 
              onChange={e => setConfig({...config, uit: Number(e.target.value)})} 
            />
            <Input 
              label="RMV (Sueldo Mín.)" 
              type="number"
              value={config.rmv || 0} 
              onChange={e => setConfig({...config, rmv: Number(e.target.value)})} 
            />
            <div className="col-span-2">
              <Input 
                label="Costo Notarial Promedio RUC 10 (S/)" 
                type="number"
                value={config.defaultNotaryCost || 0} 
                onChange={e => setConfig({...config, defaultNotaryCost: Number(e.target.value)})} 
              />
            </div>
          </div>
        </div>
      </div>

      {/* SECCIÓN 2: REGÍMENES TRIBUTARIOS Y DÍAS DE DECLARACIÓN */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-4">
          <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest border-b pb-2 flex items-center gap-2">
            <Scale className="w-4 h-4 text-purple-600"/> Regímenes Tributarios
          </h3>
          <div className="grid grid-cols-1 gap-4">
            <Card padding="sm" className="bg-slate-50 border border-slate-200">
              <label className="block text-[10px] font-black text-slate-600 uppercase mb-2">Régimen RUC 10 (Persona Natural)</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: TaxRegime.RER, label: 'RER (Especial)' },
                  { id: TaxRegime.RMT, label: 'RMT (MYPE)' },
                  { id: TaxRegime.RGT, label: 'RGT (General)' }
                ].map(r => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => onRegimeChange('ruc10', r.id)}
                    className={`py-2 px-3 text-xs font-bold rounded-xl transition-all ${
                      config.ruc10TaxRegime === r.id
                        ? 'bg-slate-900 text-white shadow-sm'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </Card>

            <Card padding="sm" className="bg-slate-50 border border-slate-200">
              <label className="block text-[10px] font-black text-slate-600 uppercase mb-2">Régimen RUC 20 (Persona Jurídica)</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: TaxRegime.RER, label: 'RER (Especial)' },
                  { id: TaxRegime.RMT, label: 'RMT (MYPE)' },
                  { id: TaxRegime.RGT, label: 'RGT (General)' }
                ].map(r => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => onRegimeChange('ruc20', r.id)}
                    className={`py-2 px-3 text-xs font-bold rounded-xl transition-all ${
                      config.ruc20TaxRegime === r.id
                        ? 'bg-slate-900 text-white shadow-sm'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </Card>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest border-b pb-2 flex items-center gap-2">
            <CalendarClock className="w-4 h-4 text-orange-600"/> Días Límite de Declaración SUNAT
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <Input 
              label="Día Declaración RUC 10" 
              type="number"
              min={1} max={31}
              value={config.ruc10DeclarationDay || 1} 
              onChange={e => setConfig({...config, ruc10DeclarationDay: Number(e.target.value)})} 
            />
            <Input 
              label="Día Declaración RUC 20" 
              type="number"
              min={1} max={31}
              value={config.ruc20DeclarationDay || 20} 
              onChange={e => setConfig({...config, ruc20DeclarationDay: Number(e.target.value)})} 
            />
          </div>
        </div>
      </div>

      {/* SECCIÓN 3: RESPALDO DE ARCHIVOS UPLOADS */}
      <Card padding="md" className="bg-blue-50/60 border-2 border-blue-200 rounded-3xl">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-1">
            <h3 className="text-sm font-black text-blue-900 uppercase flex items-center gap-2 tracking-wide">
              <FolderArchive className="w-5 h-5 text-blue-600" />
              Respaldo General de Archivos Adjuntos (Uploads)
            </h3>
            <p className="text-xs text-blue-700 font-bold">
              Exporta y descarga una copia de seguridad en formato comprimido (.ZIP) con todos los vouchers, contratos, comprobantes y sustentaciones almacenadas en la carpeta <code className="bg-blue-100 px-1.5 py-0.5 rounded font-mono text-[11px] text-blue-950">uploads/</code>.
            </p>
          </div>
          <Button
            variant="primary"
            size="md"
            onClick={handleDownloadBackup}
            isLoading={isDownloadingBackup}
            leftIcon={<Download className="w-4 h-4 text-white" />}
            className="bg-blue-700 hover:bg-blue-800 text-white font-extrabold uppercase text-xs shadow-md shadow-blue-200 shrink-0 cursor-pointer"
          >
            {isDownloadingBackup ? 'Generando ZIP...' : 'Exportar Copia de Respaldo (.ZIP)'}
          </Button>
        </div>
      </Card>

      <div className="pt-4 border-t flex justify-end">
        <Button 
          variant="primary" 
          size="lg" 
          onClick={onSave} 
          isLoading={isProcessing}
        >
          Guardar Configuración General
        </Button>
      </div>
    </div>
  );
};
