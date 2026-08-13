import React, { useState, useEffect } from 'react';
import { PurchaseEntry } from '../../types';
import { Search, Eye, Edit3, Trash2, ChevronLeft, ChevronRight, Undo2 } from 'lucide-react';
import { Button, DataTable, Column, Badge } from '../ui';
import { ConfirmDialog } from '../ui/ConfirmDialog';

interface HistoryPurchasesTableProps {
  fetchPage: (args: {
    q?: string;
    blockNumber?: number;
    opDate?: string;
    limit: number;
    offset: number;
    force?: boolean;
  }) => Promise<{ items: PurchaseEntry[]; total: number }>;
  getBlocks: (opDate?: string, force?: boolean) => Promise<number[]>;
  refreshKey: number;
  onViewSupport: (item: PurchaseEntry) => void;
  onEdit: (item: PurchaseEntry) => void;
  onDelete: (id: string) => void;
  canRead: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}

export const HistoryPurchasesTable: React.FC<HistoryPurchasesTableProps> = ({
  fetchPage,
  getBlocks,
  refreshKey,
  onViewSupport,
  onEdit,
  onDelete,
  canRead,
  canUpdate,
  canDelete,
}) => {
  const [items, setItems] = useState<PurchaseEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState<10 | 50 | 100>(10);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [availableBlocks, setAvailableBlocks] = useState<string[]>([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterBlock, setFilterBlock] = useState('');
  const [filterDate, setFilterDate] = useState('');

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getBlocks(filterDate || undefined)
      .then((blocks) => {
        if (cancelled) return;
        setAvailableBlocks(blocks.map((b) => String(b)));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [getBlocks, refreshKey, filterDate]);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    fetchPage({
      q: searchQuery || undefined,
      blockNumber: filterBlock ? Number(filterBlock) : undefined,
      opDate: filterDate || undefined,
      limit: pageSize,
      offset: (page - 1) * pageSize,
    })
      .then(({ items, total }) => {
        if (cancelled) return;
        setItems(items);
        setTotal(total);
      })
      .finally(() => {
        if (cancelled) return;
        setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [fetchPage, refreshKey, searchQuery, filterBlock, filterDate, pageSize, page]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const columns: Column<PurchaseEntry>[] = [
    {
      key: 'bloque',
      header: 'Bloque',
      render: (_, p) => (
        <Badge variant="neutral" size="sm">
          B{p.blockNumber || 1}
        </Badge>
      ),
    },
    {
      key: 'fecha',
      header: 'Fecha',
      render: (_, p) => (
        <span className="font-bold text-slate-600 text-xs">
          {p.date ? new Date(p.date).toLocaleDateString() : '—'}
        </span>
      ),
    },
    {
      key: 'proveedor_rel',
      header: 'Proveedor Rel.',
      render: (_, p) =>
        p.supplierShortName || p.supplierName ? (
          <Badge variant="info" size="sm">
            {p.supplierShortName || p.supplierName}
          </Badge>
        ) : (
          <span className="text-[10px] font-bold text-slate-300 uppercase">NINGUNO</span>
        ),
    },
    {
      key: 'equipo',
      header: 'Equipo / Serie',
      render: (_, p) => (
        <div>
          <div className="font-black text-slate-900 uppercase text-xs">
            {p.items && p.items.length > 0
              ? `${p.items[0].category || ''} ${p.items[0].brand} ${p.items[0].model}${p.items.length > 1 ? ` (+${p.items.length - 1})` : ''}`
              : `${p.productType ? p.productType + ' ' : ''}${p.productBrand} ${p.productModel}`}
          </div>
          <div className="font-mono text-[10px] font-bold text-slate-400 uppercase">
            S/N: {p.items && p.items.length > 0 ? p.items[0].serial : p.productSerial}
          </div>
        </div>
      ),
    },
    {
      key: 'vendedor',
      header: 'Vendedor',
      render: (_, p) => (
        <div>
          <div className="font-black text-slate-700 uppercase text-xs">{p.providerName}</div>
          <div className="text-[10px] font-bold text-slate-400">{p.providerDni}</div>
        </div>
      ),
    },
    {
      key: 'inversion',
      header: 'Inversión',
      align: 'right',
      render: (_, p) => (
        <span className="font-black text-slate-900 text-sm">
          S/ {((p.priceAgreed || 0) + (p.costNotary || 0)).toFixed(2)}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Bar de Filtros y Control de Paginación Servidor */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap gap-3 items-center justify-between">
        <div className="flex-1 min-w-[220px] flex items-center bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 focus-within:border-emerald-500 transition-colors">
          <Search className="w-4 h-4 text-slate-400 mr-2" />
          <input
            type="text"
            placeholder="Buscar por DNI, Vendedor, Serie..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            className="bg-transparent border-none outline-none w-full text-xs font-bold text-slate-700 placeholder:text-slate-400"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-col">
            <label className="text-[9px] font-black text-slate-400 uppercase mb-0.5">Bloque</label>
            <select
              value={filterBlock}
              onChange={(e) => {
                setFilterBlock(e.target.value);
                setPage(1);
              }}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1 font-bold text-slate-700 text-xs outline-none"
            >
              <option value="">Todos los Bloques</option>
              {availableBlocks.map((b) => (
                <option key={b} value={b}>
                  Bloque {b}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col">
            <label className="text-[9px] font-black text-slate-400 uppercase mb-0.5">Fecha</label>
            <input
              type="date"
              value={filterDate}
              onChange={(e) => {
                setFilterDate(e.target.value);
                setPage(1);
              }}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1 font-bold text-slate-700 text-xs outline-none"
            />
          </div>

          <div className="flex flex-col">
            <label className="text-[9px] font-black text-slate-400 uppercase mb-0.5">Mostrar</label>
            <select
              value={pageSize}
              onChange={(e) => {
                setPage(1);
                setPageSize(Number(e.target.value) as any);
              }}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1 font-bold text-slate-700 text-xs outline-none"
            >
              <option value={10}>10</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>

          {/* Botones de Paginación Servidor */}
          <div className="flex flex-col justify-end">
            <label className="text-[9px] font-black text-slate-400 uppercase mb-0.5 opacity-0">Paginación</label>
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl p-1">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1 || isLoading}
                className="p-1 rounded-lg text-slate-600 hover:bg-slate-200 disabled:opacity-30 transition-colors"
                title="Página anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-2 text-xs font-black text-slate-700 whitespace-nowrap">
                Pág. {page} de {totalPages} <span className="text-slate-400 font-normal">({total})</span>
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages || isLoading}
                className="p-1 rounded-lg text-slate-600 hover:bg-slate-200 disabled:opacity-30 transition-colors"
                title="Página siguiente"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={items}
        loading={isLoading}
        emptyMessage="Bandeja de historial vacía"
        showPagination={false}
        rowActions={(item) => (
          <div className="flex justify-end gap-1.5">
            {canRead && (
              <Button variant="ghost" size="xs" onClick={() => onViewSupport(item)} title="Ver Expediente Auditoría">
                <Eye className="w-4 h-4 text-blue-600" />
              </Button>
            )}
            {canUpdate && (
              <Button variant="ghost" size="xs" onClick={() => onEdit(item)} title="Editar Información">
                <Edit3 className="w-4 h-4 text-slate-600" />
              </Button>
            )}
            {canDelete && (
              <Button
                variant="ghost"
                size="xs"
                onClick={() => {
                  setConfirmId(item.id);
                  setConfirmOpen(true);
                }}
                title="Devolver a Pendientes"
              >
                <Undo2 className="w-4 h-4 text-amber-600" />
              </Button>
            )}
          </div>
        )}
      />

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => { setConfirmOpen(false); setConfirmId(null); }}
        onConfirm={() => {
          if (confirmId) onDelete(confirmId);
          setConfirmOpen(false);
          setConfirmId(null);
        }}
        title="¿Devolver a Pendientes?"
        message="Este expediente será removido del Historial y volverá a la pestaña de Pendientes para ser sustentado nuevamente."
        confirmText="Sí, devolver"
        cancelText="Cancelar"
        variant="warning"
      />
    </div>
  );
};
