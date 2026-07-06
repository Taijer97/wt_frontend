import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle, FileText, Search, StickyNote, Trash2, UserRound, X } from 'lucide-react';
import { CustomerRecord } from '../types';
import { BackendService } from '../services/backendService';
import { DataService } from '../services/dataService';

const CustomAlert = ({ message, type, onClose }: { message: string, type: 'success' | 'error', onClose: () => void }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed top-6 right-6 z-[200] animate-in slide-in-from-right-8 fade-in duration-300">
      <div className="bg-[#202020] rounded-xl shadow-2xl flex items-center gap-3 p-4 pr-12 min-w-[280px] border border-white/10 relative overflow-hidden">
        <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${type === 'success' ? 'bg-[#4ade80]' : 'bg-red-500'}`}>
          {type === 'success' ? <CheckCircle className="w-4 h-4 text-[#202020]" /> : <X className="w-4 h-4 text-[#202020]" />}
        </div>
        <p className="text-white font-medium text-sm">{message}</p>
        <button onClick={onClose} className="absolute right-4 text-slate-400 hover:text-white transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export const CustomersModule: React.FC = () => {
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [alertInfo, setAlertInfo] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [editingCustomer, setEditingCustomer] = useState<CustomerRecord | null>(null);
  const [noteDraft, setNoteDraft] = useState('');
  const [saving, setSaving] = useState(false);

  const canManage =
    DataService.checkPermission('dashboard', 'update') ||
    DataService.checkPermission('sales', 'update') ||
    DataService.checkPermission('purchases_ruc10', 'update');

  const showAlert = (message: string, type: 'success' | 'error') => setAlertInfo({ message, type });

  const loadCustomers = async (force = false) => {
    if (!force) setLoading(true);
    try {
      const items = await BackendService.getCustomers(force);
      setCustomers(items);
    } catch {
      setCustomers([]);
      showAlert('No se pudo cargar la lista de clientes', 'error');
    } finally {
      if (!force) setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  const filteredCustomers = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter(c =>
      (c.docNumber || '').toLowerCase().includes(q) ||
      (c.fullName || '').toLowerCase().includes(q) ||
      (c.phone || '').toLowerCase().includes(q) ||
      (c.note || '').toLowerCase().includes(q)
    );
  }, [customers, query]);

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
      setCustomers(prev => prev.map(c => (c.id === updated.id ? updated : c)));
      showAlert('Nota actualizada', 'success');
      closeEditor();
    } catch {
      showAlert('No se pudo guardar la nota', 'error');
    } finally {
      setSaving(false);
    }
  };

  const clearNote = async (customer: CustomerRecord) => {
    if (!confirm(`¿Eliminar la nota pendiente de ${customer.fullName}?`)) return;
    try {
      const updated = await BackendService.updateCustomer(customer.id, { note: '' });
      setCustomers(prev => prev.map(c => (c.id === updated.id ? updated : c)));
      if (editingCustomer?.id === customer.id) closeEditor();
      showAlert('Nota eliminada', 'success');
    } catch {
      showAlert('No se pudo eliminar la nota', 'error');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {alertInfo && <CustomAlert message={alertInfo.message} type={alertInfo.type} onClose={() => setAlertInfo(null)} />}

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
        <div className="flex flex-col lg:flex-row gap-4 lg:items-center lg:justify-between">
          <div>
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-900">Clientes y notas</h3>
            <p className="text-sm text-slate-500 mt-1">
              Lista única de clientes persona natural. La nota reaparece cuando vuelves a registrar el DNI.
            </p>
          </div>
          <div className="relative w-full lg:w-96">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por DNI, nombre, celular o nota"
              className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50 pl-10 pr-4 py-3 text-sm font-semibold text-slate-900 focus:border-blue-500 outline-none"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="text-xs font-black uppercase tracking-widest text-slate-500">
            Total clientes: {filteredCustomers.length}
          </div>
        </div>

        {loading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div key={idx} className="h-14 rounded-2xl bg-slate-100 animate-pulse" />
            ))}
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="p-12 text-center">
            <UserRound className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-600 font-bold">No hay clientes para mostrar.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[11px] tracking-widest">
                <tr>
                  <th className="px-6 py-4 text-left">DNI</th>
                  <th className="px-6 py-4 text-left">Nombre</th>
                  <th className="px-6 py-4 text-left">Celular</th>
                  <th className="px-6 py-4 text-left">Nota</th>
                  <th className="px-6 py-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map((customer) => (
                  <tr key={customer.id} className="border-t border-slate-100 hover:bg-slate-50/70">
                    <td className="px-6 py-4 font-black text-slate-900">{customer.docNumber}</td>
                    <td className="px-6 py-4 font-semibold text-slate-800 uppercase">{customer.fullName}</td>
                    <td className="px-6 py-4 font-semibold text-slate-600">{customer.phone || '-'}</td>
                    <td className="px-6 py-4">
                      {customer.note ? (
                        <div className="max-w-xl rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-slate-700 whitespace-pre-wrap">
                          {customer.note}
                        </div>
                      ) : (
                        <span className="text-slate-400 font-semibold">Sin nota</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => openEditor(customer)}
                          disabled={!canManage}
                          className="px-3 py-2 rounded-xl bg-slate-900 text-white text-[11px] font-black uppercase tracking-wider hover:bg-blue-700 transition-colors disabled:opacity-50"
                        >
                          {customer.note ? 'Editar nota' : 'Agregar nota'}
                        </button>
                        {customer.note && (
                          <button
                            onClick={() => clearNote(customer)}
                            disabled={!canManage}
                            className="px-3 py-2 rounded-xl border border-red-200 text-red-700 text-[11px] font-black uppercase tracking-wider hover:bg-red-50 transition-colors disabled:opacity-50"
                          >
                            Eliminar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editingCustomer && (
        <div className="fixed inset-0 z-[310] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-sm font-black uppercase tracking-widest text-slate-900">Nota del cliente</h3>
                <p className="text-xs text-slate-500 font-bold uppercase mt-1">
                  {editingCustomer.fullName} | DNI {editingCustomer.docNumber}
                </p>
              </div>
              <button onClick={closeEditor} className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="rounded-2xl bg-slate-50 border border-slate-200 px-4 py-3 flex items-start gap-3">
                <StickyNote className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                <p className="text-sm text-slate-600">
                  Esta nota aparecerá automáticamente cuando el cliente vuelva a ingresar su DNI en Compras Personas o en Nueva Venta con boleta.
                </p>
              </div>
              <textarea
                value={noteDraft}
                onChange={(e) => setNoteDraft(e.target.value)}
                rows={6}
                placeholder="Ejemplo: Falta actualizar firma en el bloque 15, impresora Epson S/N 465F6WER4G."
                className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 focus:border-blue-500 outline-none resize-none"
              />
              <div className="flex flex-col sm:flex-row justify-end gap-3">
                {editingCustomer.note && (
                  <button
                    onClick={() => clearNote(editingCustomer)}
                    disabled={saving}
                    className="px-4 py-3 rounded-2xl border border-red-200 text-red-700 font-black uppercase text-xs hover:bg-red-50 transition-colors flex items-center justify-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Eliminar nota
                  </button>
                )}
                <button
                  onClick={closeEditor}
                  className="px-4 py-3 rounded-2xl border border-slate-200 text-slate-700 font-black uppercase text-xs hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={saveNote}
                  disabled={saving}
                  className="px-4 py-3 rounded-2xl bg-blue-600 text-white font-black uppercase text-xs hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  <FileText className="w-4 h-4" />
                  {saving ? 'Guardando...' : 'Guardar nota'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
