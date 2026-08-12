import React, { useEffect, useState } from 'react';
import { FileText, StickyNote, Trash2 } from 'lucide-react';
import { CustomerRecord } from '../types';
import { BackendService } from '../services/backendService';
import { DataService } from '../services/dataService';
import { DataTable, Column, Button, Modal, Textarea, ConfirmDialog, useAlert, Badge } from './ui';

export const CustomersModule: React.FC = () => {
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingCustomer, setEditingCustomer] = useState<CustomerRecord | null>(null);
  const [deletingCustomer, setDeletingCustomer] = useState<CustomerRecord | null>(null);
  const [noteDraft, setNoteDraft] = useState('');
  const [saving, setSaving] = useState(false);

  const alert = useAlert();

  const canManage =
    DataService.checkPermission('dashboard', 'update') ||
    DataService.checkPermission('sales', 'update') ||
    DataService.checkPermission('purchases_ruc10', 'update');

  const loadCustomers = async (force = false) => {
    if (!force) setLoading(true);
    try {
      const items = await BackendService.getCustomers(force);
      setCustomers(items);
    } catch {
      setCustomers([]);
      alert.error('No se pudo cargar la lista de clientes');
    } finally {
      if (!force) setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  const openEditor = (customer: CustomerRecord) => {
    setEditingCustomer(customer);
    setNoteDraft(customer.note || '');
  };

  const closeEditor = () => {
    setEditingCustomer(null);
    setNoteDraft('');
  };

  const saveNote = async () => {
    if (!editingCustomer) return;
    setSaving(true);
    try {
      const updated = await BackendService.updateCustomer(editingCustomer.id, {
        note: noteDraft.trim(),
      });
      setCustomers((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      alert.success('Nota actualizada correctamente');
      closeEditor();
    } catch {
      alert.error('No se pudo guardar la nota');
    } finally {
      setSaving(false);
    }
  };

  const confirmClearNote = async () => {
    if (!deletingCustomer) return;
    setSaving(true);
    try {
      const updated = await BackendService.updateCustomer(deletingCustomer.id, {
        note: '',
      });
      setCustomers((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      alert.success('Nota eliminada');
      setDeletingCustomer(null);
    } catch {
      alert.error('No se pudo eliminar la nota');
    } finally {
      setSaving(false);
    }
  };

  const columns: Column<CustomerRecord>[] = [
    {
      key: 'docNumber',
      header: 'Documento',
      render: (_, c) => (
        <span className="font-mono font-bold text-xs text-slate-800">
          {c.docNumber || '—'}
        </span>
      ),
    },
    {
      key: 'fullName',
      header: 'Cliente / Razón Social',
      render: (_, c) => (
        <div>
          <div className="font-extrabold text-slate-900 uppercase text-xs">{c.fullName}</div>
          <div className="text-[10px] text-slate-400 font-bold">{c.phone || 'Sin teléfono'}</div>
        </div>
      ),
    },
    {
      key: 'address',
      header: 'Dirección',
      render: (_, c) => (
        <span className="text-xs text-slate-600 truncate max-w-[200px] block">
          {c.address || '—'}
        </span>
      ),
    },
    {
      key: 'note',
      header: 'Nota Alerta',
      render: (_, c) =>
        c.note ? (
          <Badge variant="warning" size="sm" dot>
            {c.note}
          </Badge>
        ) : (
          <span className="text-[10px] font-bold text-slate-300 uppercase">SIN NOTA</span>
        ),
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Clientes y Notas de Alerta</h2>
          <p className="text-xs text-slate-500 font-medium">Gestión de expedientes de clientes y notas informativas</p>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={customers}
        loading={loading}
        searchable
        searchPlaceholder="Buscar por DNI/RUC, Nombre, Teléfono o Nota..."
        searchKeys={['docNumber', 'fullName', 'phone', 'note']}
        rowActions={(customer) =>
          canManage ? (
            <div className="flex justify-end gap-1.5">
              <Button
                variant="outline"
                size="xs"
                onClick={() => openEditor(customer)}
                leftIcon={<StickyNote className="w-3.5 h-3.5" />}
              >
                {customer.note ? 'Editar Nota' : 'Añadir Nota'}
              </Button>
              {customer.note && (
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={() => setDeletingCustomer(customer)}
                  title="Eliminar Nota"
                >
                  <Trash2 className="w-3.5 h-3.5 text-red-600" />
                </Button>
              )}
            </div>
          ) : null
        }
      />

      {/* Editor de Nota Modal */}
      <Modal
        open={!!editingCustomer}
        onClose={closeEditor}
        title={`Nota para ${editingCustomer?.fullName}`}
        subtitle={`DNI/RUC: ${editingCustomer?.docNumber}`}
        icon={<FileText className="w-5 h-5 text-amber-500" />}
        size="md"
        footer={
          <div className="flex justify-end gap-2 w-full">
            <Button variant="ghost" onClick={closeEditor} disabled={saving}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={saveNote} isLoading={saving}>
              Guardar Nota
            </Button>
          </div>
        }
      >
        <div className="py-2">
          <Textarea
            label="Nota de Alerta (Visible al ingresar DNI)"
            placeholder="Ej: Cliente solicitó comprobante especial / Debe saldo anterior..."
            value={noteDraft}
            onChange={(e) => setNoteDraft(e.target.value)}
            rows={4}
          />
        </div>
      </Modal>

      {/* Confirmación Eliminar Nota */}
      <ConfirmDialog
        open={!!deletingCustomer}
        onClose={() => setDeletingCustomer(null)}
        onConfirm={confirmClearNote}
        variant="danger"
        title="¿Eliminar Nota de Alerta?"
        message={`Esta acción borrará la nota asociada a ${deletingCustomer?.fullName}.`}
        loading={saving}
      />
    </div>
  );
};
