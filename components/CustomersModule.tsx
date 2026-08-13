import React, { useEffect, useState } from 'react';
import { CustomerRecord } from '../types';
import { BackendService } from '../services/backendService';
import { DataService } from '../services/dataService';
import { DataTable, Column, Button, useAlert, Badge } from './ui';
import { CustomerNoteModal } from './CustomerNoteModal';
import { StickyNote } from 'lucide-react';

export const CustomersModule: React.FC = () => {
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingCustomer, setEditingCustomer] = useState<CustomerRecord | null>(null);

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
  };

  const closeEditor = () => {
    setEditingCustomer(null);
  };

  const handleUpdateCustomerNote = async (newNoteStr: string) => {
    if (!editingCustomer) return;
    try {
      const updated = await BackendService.updateCustomer(editingCustomer.id, {
        note: newNoteStr,
      });
      setCustomers((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      setEditingCustomer(updated);
      alert.success('Notas de alerta actualizadas');
    } catch {
      alert.error('No se pudo guardar la nota de alerta');
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
      header: 'Notas de Alerta Pendientes',
      render: (_, c) =>
        c.note ? (
          <div className="flex flex-col gap-1 max-w-[280px]">
            {c.note.split('\n').filter(Boolean).map((line, idx) => {
              const match = line.match(/^(\[Bloque\s+\d+\]|\[General\])\s*(.*)/i);
              return (
                <div key={idx} className="flex items-center gap-1.5 text-[11px]">
                  <Badge variant={match && match[1].startsWith('[Bloque') ? 'warning' : 'info'} size="sm">
                    {match ? match[1].replace(/^\[|\]$/g, '') : 'General'}
                  </Badge>
                  <span className="truncate font-medium text-slate-700">{match ? match[2] : line}</span>
                </div>
              );
            })}
          </div>
        ) : (
          <span className="text-[10px] font-bold text-slate-300 uppercase">SIN NOTAS</span>
        ),
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Clientes y Notas de Alerta</h2>
          <p className="text-xs text-slate-500 font-medium">Gestión de expedientes de clientes y notas informativas desglosadas por bloques</p>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={customers}
        loading={loading}
        searchable
        searchPlaceholder="Buscar por DNI/RUC, Nombre, Teléfono o Nota..."
        searchKeys={['docNumber', 'fullName', 'phone', 'note']}
        pageSize={10}
        showPagination={true}
        rowActions={(customer) =>
          canManage ? (
            <div className="flex justify-end gap-1.5">
              <Button
                variant="outline"
                size="xs"
                onClick={() => openEditor(customer)}
                leftIcon={<StickyNote className="w-3.5 h-3.5" />}
              >
                {customer.note ? 'Gestionar Notas' : 'Añadir Nota'}
              </Button>
            </div>
          ) : null
        }
      />

      {/* Modal Interactivo de Notas por Bloque */}
      {editingCustomer && (
        <CustomerNoteModal
          open={!!editingCustomer}
          customerName={editingCustomer.fullName}
          docNumber={editingCustomer.docNumber}
          customerId={editingCustomer.id}
          note={editingCustomer.note || ''}
          initialShowAddForm={true}
          onClose={closeEditor}
          onSaveNote={handleUpdateCustomerNote}
          onDelete={async () => {
            await handleUpdateCustomerNote('');
            closeEditor();
          }}
        />
      )}
    </div>
  );
};
