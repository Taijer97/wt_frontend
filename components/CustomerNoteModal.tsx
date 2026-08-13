import React, { useState, useEffect } from 'react';
import { AlertTriangle, Trash2, X, CheckCircle, PlusCircle, Layers, Check } from 'lucide-react';
import { BackendService } from '../services/backendService';

export interface NoteItem {
  id: string;
  blockTag: string;
  content: string;
  rawLine: string;
}

export interface CustomerNoteModalProps {
  open: boolean;
  customerName?: string;
  docNumber?: string;
  customerId?: string;
  note: string;
  availableBlocks?: (number | string)[];
  initialShowAddForm?: boolean;
  deleting?: boolean;
  onClose: () => void;
  onDelete?: () => Promise<void> | void;
  onSaveNote?: (newNote: string) => Promise<void> | void;
}

const parseLines = (rawNote: string): NoteItem[] => {
  if (!rawNote || !rawNote.trim()) return [];
  const lines = rawNote.split('\n').map((l) => l.trim()).filter(Boolean);
  return lines.map((line, idx) => {
    const match = line.match(/^(\[Bloque\s+\d+\]|\[General\])\s*(.*)/i);
    if (match) {
      return {
        id: `${idx}-${match[1]}`,
        blockTag: match[1],
        content: match[2] || line,
        rawLine: line,
      };
    }
    return {
      id: `${idx}-general`,
      blockTag: '[General]',
      content: line,
      rawLine: line,
    };
  });
};

export const CustomerNoteModal: React.FC<CustomerNoteModalProps> = ({
  open,
  customerName,
  docNumber,
  customerId,
  note,
  availableBlocks,
  initialShowAddForm = false,
  deleting = false,
  onClose,
  onDelete,
  onSaveNote,
}) => {
  const [items, setItems] = useState<NoteItem[]>([]);
  const [customerBlocks, setCustomerBlocks] = useState<(number | string)[]>(availableBlocks || []);
  const [selectedBlock, setSelectedBlock] = useState('Bloque 1');
  const [newNoteText, setNewNoteText] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [showAddForm, setShowAddForm] = useState(initialShowAddForm);

  useEffect(() => {
    setItems(parseLines(note));
  }, [note, open]);

  useEffect(() => {
    if (availableBlocks && availableBlocks.length > 0) {
      setCustomerBlocks(availableBlocks);
    } else if (docNumber && docNumber.trim()) {
      BackendService.getSeller(docNumber.trim())
        .then((seller) => {
          if (seller?.blocks && Array.isArray(seller.blocks) && seller.blocks.length > 0) {
            setCustomerBlocks(seller.blocks);
          }
        })
        .catch(() => {});
    }
  }, [docNumber, availableBlocks, open]);

  const blockOptions = customerBlocks.length > 0
    ? customerBlocks.map((b) => `Bloque ${b}`)
    : ['Bloque 1', 'Bloque 2', 'Bloque 3', 'Bloque 4', 'Bloque 5', 'Bloque 6'];

  useEffect(() => {
    if (blockOptions.length > 0 && !blockOptions.includes(selectedBlock) && selectedBlock !== 'General') {
      setSelectedBlock(blockOptions[0]);
    }
  }, [customerBlocks]);

  if (!open) return null;

  const persistNoteChange = async (updatedItems: NoteItem[]) => {
    const newNoteStr = updatedItems.map((i) => i.rawLine).join('\n');
    if (onSaveNote) {
      await onSaveNote(newNoteStr);
    } else if (customerId) {
      await BackendService.updateCustomer(customerId, { note: newNoteStr });
    }
    setItems(updatedItems);
    if (updatedItems.length === 0) {
      onClose();
    }
  };

  const handleResolveItem = async (itemId: string) => {
    try {
      setProcessingId(itemId);
      const remaining = items.filter((i) => i.id !== itemId);
      await persistNoteChange(remaining);
    } catch (err) {
      console.error(err);
    } finally {
      setProcessingId(null);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteText.trim()) return;
    try {
      setIsAdding(true);
      const tagStr = selectedBlock === 'General' ? '[General]' : `[${selectedBlock}]`;
      const newRawLine = `${tagStr} ${newNoteText.trim()}`;
      const newItem: NoteItem = {
        id: `${Date.now()}-${tagStr}`,
        blockTag: tagStr,
        content: newNoteText.trim(),
        rawLine: newRawLine,
      };
      const updated = [...items, newItem];
      await persistNoteChange(updated);
      setNewNoteText('');
    } catch (err) {
      console.error(err);
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[320] bg-slate-900/65 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden border border-amber-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-5 bg-amber-50 border-b border-amber-200 flex items-start justify-between gap-4 shrink-0">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 shadow-xs">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-900">
                Notas de Alerta del Cliente
              </h3>
              <p className="text-xs text-slate-600 font-bold mt-1 uppercase">
                {(customerName || 'CLIENTE').trim()} {docNumber ? `| DNI/RUC ${docNumber}` : ''}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-500 hover:bg-white hover:text-slate-900 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Header de Notas y Botón para desplegar formulario */}
          <div className="flex items-center justify-between border-b pb-2">
            <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
              <span>Notas de Alerta Registradas</span>
              <span className="bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold">
                {items.length} {items.length === 1 ? 'Nota' : 'Notas'}
              </span>
            </h4>
            <button
              type="button"
              onClick={() => setShowAddForm(!showAddForm)}
              className="text-xs font-extrabold text-amber-700 hover:text-amber-800 flex items-center gap-1.5 bg-amber-50 hover:bg-amber-100 px-3 py-1.5 rounded-xl border border-amber-200 transition-all cursor-pointer shadow-xs"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              {showAddForm ? 'Ocultar Formulario' : 'Añadir Nueva Nota'}
            </button>
          </div>

          {/* Formulario de Añadir Nueva Nota de Alerta (Desplegable) */}
          {showAddForm && (
            <form onSubmit={handleAddNote} className="bg-amber-50/50 p-4 rounded-2xl border border-amber-200 space-y-3 animate-fade-in">
              <div className="flex items-center gap-2 text-xs font-black text-amber-900 uppercase tracking-wider">
                <PlusCircle className="w-4 h-4 text-amber-600" />
                Añadir Nueva Nota de Alerta
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="flex flex-col">
                  <label className="text-[10px] font-extrabold text-slate-500 uppercase mb-1 flex items-center gap-1">
                    <Layers className="w-3 h-3 text-amber-600" /> Referenciar Bloque
                  </label>
                  <select
                    value={selectedBlock}
                    onChange={(e) => setSelectedBlock(e.target.value)}
                    className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-amber-500 shadow-xs"
                  >
                    {blockOptions.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                    <option value="General">General (Sin Bloque)</option>
                  </select>
                  {customerBlocks.length > 0 ? (
                    <span className="text-[9px] text-slate-400 font-bold mt-1">
                      * Mostrando bloques registrados ({customerBlocks.join(', ')})
                    </span>
                  ) : null}
                </div>

                <div className="sm:col-span-2 flex flex-col justify-end">
                  <label className="text-[10px] font-extrabold text-slate-500 uppercase mb-1">
                    Detalle de la Alerta / Observación
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Ej. Falta voucher legible de depósito..."
                      value={newNoteText}
                      onChange={(e) => setNewNoteText(e.target.value)}
                      className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-amber-500 shadow-xs"
                    />
                    <button
                      type="submit"
                      disabled={isAdding || !newNoteText.trim()}
                      className="bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-extrabold text-xs uppercase px-4 py-2 rounded-xl transition-all shadow-xs whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      {isAdding ? 'Guardando...' : 'Añadir Nota'}
                    </button>
                  </div>
                </div>
              </div>
            </form>
          )}

          {/* Lista de Filas de Notas de Alerta */}
          <div className="space-y-2.5">
            {items.length === 0 ? (
              <div className="text-center py-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-60" />
                <p className="text-xs font-extrabold text-slate-600 uppercase">Sin Notas de Alerta Pendientes</p>
                <p className="text-[11px] text-slate-400 font-medium">El cliente no tiene observaciones ni sustentos pendientes.</p>
              </div>
            ) : (
              items.map((item) => {
                const isBlockTag = item.blockTag.startsWith('[Bloque');
                const isProcessing = processingId === item.id;
                return (
                  <div
                    key={item.id}
                    className="bg-white p-4 rounded-2xl border border-slate-200 hover:border-amber-300 shadow-xs flex items-center justify-between gap-4 transition-all group"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <span
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wide shrink-0 border ${
                          isBlockTag
                            ? 'bg-amber-100 text-amber-800 border-amber-300'
                            : 'bg-blue-50 text-blue-700 border-blue-200'
                        }`}
                      >
                        {item.blockTag.replace(/^\[|\]$/g, '')}
                      </span>
                      <p className="text-xs font-bold text-slate-800 leading-snug break-words">
                        {item.content}
                      </p>
                    </div>

                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={() => handleResolveItem(item.id)}
                      className="inline-flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white border border-emerald-200 px-3.5 py-1.5 rounded-xl text-xs font-black uppercase transition-all shrink-0 shadow-xs cursor-pointer group-hover:scale-105"
                      title="Marcar esta nota como Realizada / Solucionada"
                    >
                      <Check className="w-3.5 h-3.5" />
                      {isProcessing ? 'Guardando...' : 'Realizado'}
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
          {onDelete ? (
            <button
              onClick={onDelete}
              disabled={deleting}
              className="text-xs text-red-600 hover:text-red-800 font-extrabold uppercase flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              {deleting ? 'Eliminando...' : 'Eliminar todas las notas'}
            </button>
          ) : (
            <div />
          )}

          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-black uppercase text-xs transition-colors shadow-xs cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
