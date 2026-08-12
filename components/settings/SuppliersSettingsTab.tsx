import React, { useState } from 'react';
import { Supplier } from '../../types';
import { fetchRuc } from '../../services/rucService';
import { Phone, Mail, MapPin, Pencil, Trash2, Search, Plus } from 'lucide-react';
import { Button, Input, Modal, DataTable, Column } from '../ui';

interface SuppliersSettingsTabProps {
  suppliers: Supplier[];
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  onSaveSupplier: (s: Supplier) => Promise<void>;
  onDeleteSupplier: (id: string) => Promise<void>;
  showAddForm: boolean;
  setShowAddForm: (show: boolean) => void;
  editingSupplier: Supplier | null;
  setEditingSupplier: (s: Supplier | null) => void;
  isProcessing: boolean;
}

export const SuppliersSettingsTab: React.FC<SuppliersSettingsTabProps> = ({
  suppliers,
  searchQuery,
  setSearchQuery,
  onSaveSupplier,
  onDeleteSupplier,
  showAddForm,
  setShowAddForm,
  editingSupplier,
  setEditingSupplier,
  isProcessing,
}) => {
  const isFormOpen = showAddForm || !!editingSupplier;

  const columns: Column<Supplier>[] = [
    {
      key: 'identificacion',
      header: 'Identificación',
      render: (_, s) => (
        <div>
          <div className="font-black text-slate-900 uppercase text-sm">{s.shortName || s.razonSocial}</div>
          <div className="text-[10px] font-mono text-blue-600 font-black">
            RUC: {s.ruc} {s.shortName && <span className="text-slate-400 ml-1">| {s.razonSocial}</span>}
          </div>
        </div>
      ),
    },
    {
      key: 'contacto',
      header: 'Contacto / Ubicación',
      render: (_, s) => (
        <div>
          <div className="text-xs font-black text-slate-700 uppercase">{s.contactName || '—'}</div>
          <div className="flex flex-col gap-1 mt-1">
            <div className="text-[10px] text-slate-500 font-bold flex items-center gap-1 uppercase">
              <Phone className="w-3 h-3 text-slate-400" /> {s.phone || '—'}
            </div>
            {s.email && (
              <div className="text-[10px] text-slate-500 font-bold flex items-center gap-1 lowercase">
                <Mail className="w-3 h-3 text-slate-400" /> {s.email}
              </div>
            )}
          </div>
          <div className="mt-2 border-t border-slate-100 pt-1">
            <div className="text-[10px] text-slate-400 font-bold flex items-center gap-1 uppercase">
              <MapPin className="w-3 h-3 text-slate-300" /> {s.address || '—'}
            </div>
            {(s.department || s.province || s.district) && (
              <div className="text-[9px] text-slate-400 pl-4 mt-0.5 uppercase">
                {s.district} - {s.province} - {s.department}
              </div>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'categoria',
      header: 'Categoría',
      render: (_, s) => (
        <span className="text-[10px] font-black px-3 py-1 rounded-full bg-blue-100 text-blue-700 uppercase border border-blue-200">
          {s.category}
        </span>
      ),
    },
  ];

  return (
    <div className="p-6 md:p-8 space-y-6 animate-fade-in">
      <DataTable
        columns={columns}
        data={suppliers}
        searchable
        searchPlaceholder="Filtrar proveedores por RUC, Razón Social..."
        searchKeys={['ruc', 'razonSocial', 'shortName', 'contactName']}
        headerAction={
          <Button variant="primary" size="sm" onClick={() => setShowAddForm(true)} leftIcon={<Plus className="w-4 h-4" />}>
            Nuevo Proveedor
          </Button>
        }
        rowActions={(s) => (
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="xs" onClick={() => setEditingSupplier(s)}>
              <Pencil className="w-4 h-4 text-blue-600" />
            </Button>
            <Button variant="ghost" size="xs" onClick={() => onDeleteSupplier(s.id)}>
              <Trash2 className="w-4 h-4 text-red-600" />
            </Button>
          </div>
        )}
      />

      <Modal
        open={isFormOpen}
        onClose={() => { setShowAddForm(false); setEditingSupplier(null); }}
        title={editingSupplier ? 'Editar Proveedor' : 'Nuevo Proveedor'}
        subtitle="Complete los datos fiscales y de ubicación"
        size="lg"
      >
        <SupplierForm
          initialData={editingSupplier || undefined}
          onSubmit={onSaveSupplier}
          onCancel={() => { setShowAddForm(false); setEditingSupplier(null); }}
          isProcessing={isProcessing}
        />
      </Modal>
    </div>
  );
};

const SupplierForm: React.FC<{
  initialData?: Supplier;
  onSubmit: (s: Supplier) => void;
  onCancel: () => void;
  isProcessing?: boolean;
}> = ({ initialData, onSubmit, onCancel, isProcessing }) => {
  const [formData, setFormData] = useState<Supplier>(
    initialData || {
      id: Date.now().toString(),
      ruc: '',
      razonSocial: '',
      category: 'MAYORISTA' as any,
      contactName: '',
      phone: '',
      address: '',
      department: '',
      province: '',
      district: '',
      email: '',
    }
  );

  const handleRucBlur = async () => {
    const r = (formData.ruc || '').trim();
    if (!r || r.length !== 11) return;
    try {
      const info = await fetchRuc(r);
      setFormData({
        ...formData,
        razonSocial: info.razonSocial || info.nombreComercial || formData.razonSocial,
        address: info.direccion || formData.address,
        department: info.departamento || formData.department,
        province: info.provincia || formData.province,
        district: info.distrito || formData.district,
      });
    } catch {}
  };

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(formData); }} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2 space-y-4">
          <h4 className="text-xs font-black text-blue-600 uppercase tracking-widest border-b pb-1">
            Información Fiscal
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="RUC (11 Dígitos)"
              value={formData.ruc}
              onChange={(e) => setFormData({ ...formData, ruc: e.target.value.toUpperCase() })}
              onBlur={handleRucBlur}
              placeholder="20XXXXXXXXX"
              maxLength={11}
              required
              disabled={isProcessing}
            />
            <Input
              label="Etiqueta Corta"
              value={formData.shortName || ''}
              onChange={(e) => setFormData({ ...formData, shortName: e.target.value.toUpperCase() })}
              placeholder="EJ: IMPORTACIONES XYZ"
              disabled={isProcessing}
            />
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                Categoría Fiscal
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold bg-white text-slate-900 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                disabled={isProcessing}
              >
                <option value="MAYORISTA">Importador / Mayorista</option>
                <option value="RETAIL">Retail / Tienda Local</option>
                <option value="SERVICIOS">Servicios / Consultoría</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <Input
                label="Razón Social Completa"
                value={formData.razonSocial}
                onChange={(e) => setFormData({ ...formData, razonSocial: e.target.value.toUpperCase() })}
                placeholder="EMPRESA S.A.C."
                required
                disabled={isProcessing}
              />
            </div>
          </div>
        </div>

        <div className="md:col-span-2 space-y-4">
          <h4 className="text-xs font-black text-blue-600 uppercase tracking-widest border-b pb-1">
            Ubicación y Contacto
          </h4>
          <div className="grid grid-cols-3 gap-3">
            <Input
              label="Dpto."
              value={formData.department}
              onChange={(e) => setFormData({ ...formData, department: e.target.value.toUpperCase() })}
              disabled={isProcessing}
            />
            <Input
              label="Prov."
              value={formData.province}
              onChange={(e) => setFormData({ ...formData, province: e.target.value.toUpperCase() })}
              disabled={isProcessing}
            />
            <Input
              label="Dist."
              value={formData.district}
              onChange={(e) => setFormData({ ...formData, district: e.target.value.toUpperCase() })}
              disabled={isProcessing}
            />
          </div>
          <Input
            label="Dirección Fiscal Exacta"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value.toUpperCase() })}
            disabled={isProcessing}
          />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Input
              label="Teléfono"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value.toUpperCase() })}
              disabled={isProcessing}
            />
            <Input
              label="Correo"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              disabled={isProcessing}
            />
            <Input
              label="Contacto"
              value={formData.contactName}
              onChange={(e) => setFormData({ ...formData, contactName: e.target.value.toUpperCase() })}
              disabled={isProcessing}
            />
          </div>
        </div>
      </div>

      <div className="flex gap-3 justify-end pt-4 border-t">
        <Button variant="ghost" type="button" onClick={onCancel} disabled={isProcessing}>
          Cancelar
        </Button>
        <Button variant="primary" type="submit" isLoading={isProcessing}>
          Guardar Proveedor
        </Button>
      </div>
    </form>
  );
};
