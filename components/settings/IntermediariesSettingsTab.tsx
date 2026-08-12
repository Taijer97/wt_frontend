import React, { useState } from 'react';
import { Intermediary } from '../../types';
import { fetchDni } from '../../services/dniService';
import { Phone, Mail, MapPin, Pencil, Trash2, Search, Plus } from 'lucide-react';
import { Button, Input, Modal, DataTable, Column } from '../ui';

interface IntermediariesSettingsTabProps {
  intermediaries: Intermediary[];
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  onSaveIntermediary: (i: Intermediary) => Promise<void>;
  onDeleteIntermediary: (id: string) => Promise<void>;
  showAddForm: boolean;
  setShowAddForm: (show: boolean) => void;
  editingIntermediary: Intermediary | null;
  setEditingIntermediary: (i: Intermediary | null) => void;
  isProcessing: boolean;
}

export const IntermediariesSettingsTab: React.FC<IntermediariesSettingsTabProps> = ({
  intermediaries,
  searchQuery,
  setSearchQuery,
  onSaveIntermediary,
  onDeleteIntermediary,
  showAddForm,
  setShowAddForm,
  editingIntermediary,
  setEditingIntermediary,
  isProcessing,
}) => {
  const isFormOpen = showAddForm || !!editingIntermediary;

  const columns: Column<Intermediary>[] = [
    {
      key: 'identificacion',
      header: 'Identificación',
      render: (_, i) => (
        <div>
          <div className="font-black text-slate-900 uppercase text-sm">{i.fullName}</div>
          <div className="text-[10px] font-mono text-emerald-600 font-black uppercase">
            DNI: {i.docNumber} {i.rucNumber ? `| RUC 10: ${i.rucNumber}` : ''}
          </div>
        </div>
      ),
    },
    {
      key: 'contacto',
      header: 'Contacto',
      render: (_, i) => (
        <div>
          <div className="flex items-center gap-1 text-xs font-bold text-slate-700 uppercase">
            <Phone className="w-3 h-3 text-slate-400" /> {i.phone || '—'}
          </div>
          {i.email && (
            <div className="flex items-center gap-1 text-[10px] text-slate-500 font-medium lowercase mt-0.5">
              <Mail className="w-3 h-3 text-slate-400" /> {i.email}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'direccion',
      header: 'Dirección',
      render: (_, i) => (
        <div className="text-[10px] text-slate-500 font-bold uppercase flex items-center gap-1 max-w-[220px] truncate">
          <MapPin className="w-3 h-3 text-slate-400 shrink-0" /> {i.address || '—'}
        </div>
      ),
    },
  ];

  return (
    <div className="p-6 md:p-8 space-y-6 animate-fade-in">
      <DataTable
        columns={columns}
        data={intermediaries}
        searchable
        searchPlaceholder="Buscar intermediarios por nombre, DNI..."
        searchKeys={['fullName', 'docNumber', 'phone', 'address']}
        headerAction={
          <Button variant="primary" size="sm" onClick={() => setShowAddForm(true)} leftIcon={<Plus className="w-4 h-4" />}>
            Nuevo Intermediario
          </Button>
        }
        rowActions={(i) => (
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="xs" onClick={() => setEditingIntermediary(i)}>
              <Pencil className="w-4 h-4 text-blue-600" />
            </Button>
            <Button variant="ghost" size="xs" onClick={() => onDeleteIntermediary(i.id)}>
              <Trash2 className="w-4 h-4 text-red-600" />
            </Button>
          </div>
        )}
      />

      <Modal
        open={isFormOpen}
        onClose={() => { setShowAddForm(false); setEditingIntermediary(null); }}
        title={editingIntermediary ? 'Editar Intermediario' : 'Nuevo Intermediario'}
        subtitle="Consulte datos por DNI o ingrese la información"
        size="md"
      >
        <IntermediaryForm
          initialData={editingIntermediary || undefined}
          onSubmit={onSaveIntermediary}
          onCancel={() => { setShowAddForm(false); setEditingIntermediary(null); }}
          isProcessing={isProcessing}
        />
      </Modal>
    </div>
  );
};

const IntermediaryForm: React.FC<{
  initialData?: Intermediary;
  onSubmit: (i: Intermediary) => void;
  onCancel: () => void;
  isProcessing?: boolean;
}> = ({ initialData, onSubmit, onCancel, isProcessing }) => {
  const [formData, setFormData] = useState<Intermediary>(
    initialData || { id: Date.now().toString(), docNumber: '', fullName: '', rucNumber: '', phone: '', email: '', address: '' }
  );
  const [loadingDni, setLoadingDni] = useState(false);

  const handleFetchDni = async (dniRaw?: string) => {
    const dni = ((dniRaw ?? formData.docNumber) || '').trim();
    if (!dni || dni.length < 8) return;
    try {
      setLoadingDni(true);
      const info = await fetchDni(dni);
      setFormData((f) => ({
        ...f,
        fullName: info.fullName || f.fullName,
        address: info.direccion || f.address,
      }));
    } finally {
      setLoadingDni(false);
    }
  };

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(formData); }} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
            DNI del Intermediario
          </label>
          <div className="flex gap-2">
            <Input
              value={formData.docNumber}
              onChange={(e) => {
                const v = e.target.value.toUpperCase();
                setFormData({ ...formData, docNumber: v });
                if (v.trim().length === 8 && !loadingDni) handleFetchDni(v);
              }}
              onBlur={() => handleFetchDni()}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleFetchDni(); } }}
              placeholder="8 dígitos"
              required
              maxLength={8}
              disabled={isProcessing}
            />
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={() => handleFetchDni()}
              disabled={isProcessing || loadingDni}
              isLoading={loadingDni}
            >
              <Search className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <Input
          label="RUC 10 (Opcional)"
          value={formData.rucNumber || ''}
          onChange={(e) => setFormData({ ...formData, rucNumber: e.target.value.toUpperCase() })}
          placeholder="10XXXXXXXXX"
          maxLength={11}
          disabled={isProcessing}
        />

        <div className="md:col-span-2">
          <Input
            label="Nombre y Apellidos"
            value={formData.fullName}
            onChange={(e) => setFormData({ ...formData, fullName: e.target.value.toUpperCase() })}
            required
            disabled={isProcessing}
          />
        </div>

        <Input
          label="Teléfono"
          value={formData.phone || ''}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value.toUpperCase() })}
          required
          disabled={isProcessing}
        />

        <Input
          label="Correo"
          type="email"
          value={formData.email || ''}
          onChange={(e) => setFormData({ ...formData, email: e.target.value.toUpperCase() })}
          required
          disabled={isProcessing}
        />

        <div className="md:col-span-2">
          <Input
            label="Dirección Residencia"
            value={formData.address || ''}
            onChange={(e) => setFormData({ ...formData, address: e.target.value.toUpperCase() })}
            required
            disabled={isProcessing}
          />
        </div>
      </div>

      <div className="flex gap-3 justify-end pt-4 border-t">
        <Button variant="ghost" type="button" onClick={onCancel} disabled={isProcessing}>
          Cancelar
        </Button>
        <Button variant="primary" type="submit" isLoading={isProcessing}>
          Guardar Intermediario
        </Button>
      </div>
    </form>
  );
};
