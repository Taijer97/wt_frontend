import React from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';

interface CustomerNoteModalProps {
  open: boolean;
  customerName?: string;
  docNumber?: string;
  note: string;
  deleting?: boolean;
  onClose: () => void;
  onDelete: () => Promise<void> | void;
}

export const CustomerNoteModal: React.FC<CustomerNoteModalProps> = ({
  open,
  customerName,
  docNumber,
  note,
  deleting = false,
  onClose,
  onDelete,
}) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[320] bg-slate-900/65 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden border border-amber-200">
        <div className="px-6 py-5 bg-amber-50 border-b border-amber-200 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-900">Nota pendiente del cliente</h3>
              <p className="text-xs text-slate-600 font-bold mt-1 uppercase">
                {(customerName || 'CLIENTE').trim()} {docNumber ? `| DNI ${docNumber}` : ''}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-slate-500 hover:bg-white hover:text-slate-900 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6">
          <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 whitespace-pre-wrap text-sm font-semibold text-slate-800">
            {note}
          </div>

          <div className="mt-6 flex flex-col sm:flex-row gap-3 sm:justify-end">
            <button
              onClick={onClose}
              className="px-4 py-3 rounded-2xl border border-slate-200 text-slate-700 font-black uppercase text-xs hover:bg-slate-50 transition-colors"
            >
              Cerrar
            </button>
            <button
              onClick={onDelete}
              disabled={deleting}
              className="px-4 py-3 rounded-2xl bg-red-600 text-white font-black uppercase text-xs hover:bg-red-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
            >
              <Trash2 className="w-4 h-4" />
              {deleting ? 'Eliminando...' : 'Eliminar nota'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
