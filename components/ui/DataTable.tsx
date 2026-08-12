import React, { useState, useMemo } from 'react';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { Skeleton } from './Skeleton';
import { EmptyState } from './EmptyState';

/* ─── Types ─────────────────────────────────────────────── */

export interface Column<T> {
  key: string;
  header: string;
  accessor?: (row: T) => any;
  render?: (value: any, row: T) => React.ReactNode;
  sortable?: boolean;
  width?: string;
  align?: 'left' | 'center' | 'right';
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  emptyMessage?: string;
  emptyIcon?: React.ReactNode;
  searchable?: boolean;
  searchPlaceholder?: string;
  searchKeys?: string[];
  pageSize?: number;
  showPagination?: boolean;
  onRowClick?: (row: T) => void;
  rowActions?: (row: T) => React.ReactNode;
  headerAction?: React.ReactNode;
  stickyHeader?: boolean;
  compact?: boolean;
  className?: string;
}

type SortDir = 'asc' | 'desc' | null;

/* ─── Component ─────────────────────────────────────────── */

export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  loading = false,
  emptyMessage = 'No se encontraron registros',
  emptyIcon,
  searchable = false,
  searchPlaceholder = 'Buscar...',
  searchKeys,
  pageSize = 10,
  showPagination,
  onRowClick,
  rowActions,
  headerAction,
  stickyHeader = false,
  compact = false,
  className = '',
}: DataTableProps<T>) {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);
  const [page, setPage] = useState(1);

  // Get raw value from a row given a column
  const getValue = (row: T, col: Column<T>) => {
    if (col.accessor) return col.accessor(row);
    return (row as any)[col.key];
  };

  // Search filter
  const filteredData = useMemo(() => {
    if (!search.trim()) return data;
    const term = search.toLowerCase();
    const keys = searchKeys || columns.map((c) => c.key);
    return data.filter((row) =>
      keys.some((key) => {
        const col = columns.find((c) => c.key === key);
        const val = col ? getValue(row, col) : (row as any)[key];
        return val != null && String(val).toLowerCase().includes(term);
      })
    );
  }, [data, search, searchKeys, columns]);

  // Sort
  const sortedData = useMemo(() => {
    if (!sortKey || !sortDir) return filteredData;
    const col = columns.find((c) => c.key === sortKey);
    if (!col) return filteredData;
    return [...filteredData].sort((a, b) => {
      const aVal = getValue(a, col);
      const bVal = getValue(b, col);
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      const cmp = typeof aVal === 'number' && typeof bVal === 'number'
        ? aVal - bVal
        : String(aVal).localeCompare(String(bVal));
      return sortDir === 'desc' ? -cmp : cmp;
    });
  }, [filteredData, sortKey, sortDir, columns]);

  // Pagination
  const shouldPaginate = showPagination !== undefined ? showPagination : sortedData.length > pageSize;
  const totalPages = Math.max(1, Math.ceil(sortedData.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pagedData = shouldPaginate
    ? sortedData.slice((safePage - 1) * pageSize, safePage * pageSize)
    : sortedData;

  // Sort click handler
  const handleSort = (key: string) => {
    if (sortKey === key) {
      if (sortDir === 'asc') setSortDir('desc');
      else if (sortDir === 'desc') { setSortKey(null); setSortDir(null); }
      else setSortDir('asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
    setPage(1);
  };

  const alignClass = (align?: string) => {
    if (align === 'center') return 'text-center';
    if (align === 'right') return 'text-right';
    return 'text-left';
  };

  const cellPadding = compact ? 'px-3 py-2' : 'px-4 py-3.5';
  const headerPadding = compact ? 'px-3 py-2' : 'px-4 py-3';

  /* ─── Render ─────────────────────────────────── */

  return (
    <div className={`overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm ${className}`}>
      {/* Header bar */}
      {(searchable || headerAction) && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
          {searchable && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder={searchPlaceholder}
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="w-64 rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-4 text-sm text-slate-700 placeholder:text-slate-400 transition-all focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
          )}
          {headerAction && <div className="flex items-center gap-2">{headerAction}</div>}
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className={`bg-slate-50 border-b border-slate-200 ${stickyHeader ? 'sticky top-0 z-10' : ''}`}>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`${headerPadding} ${alignClass(col.align)} text-[10px] font-black uppercase tracking-wider text-slate-500 whitespace-nowrap select-none ${
                    col.sortable ? 'cursor-pointer hover:text-slate-700 transition-colors' : ''
                  }`}
                  style={col.width ? { width: col.width } : undefined}
                  onClick={col.sortable ? () => handleSort(col.key) : undefined}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.header}
                    {col.sortable && (
                      <span className="inline-flex text-slate-400">
                        {sortKey === col.key && sortDir === 'asc' && <ArrowUp className="h-3 w-3 text-emerald-600" />}
                        {sortKey === col.key && sortDir === 'desc' && <ArrowDown className="h-3 w-3 text-emerald-600" />}
                        {(sortKey !== col.key || !sortDir) && <ArrowUpDown className="h-3 w-3" />}
                      </span>
                    )}
                  </span>
                </th>
              ))}
              {rowActions && (
                <th className={`${headerPadding} text-right text-[10px] font-black uppercase tracking-wider text-slate-500`}>
                  Acciones
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {loading &&
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={`skeleton-${i}`} className="border-b border-slate-50">
                  {columns.map((col) => (
                    <td key={col.key} className={cellPadding}>
                      <Skeleton variant="text" width={i % 2 === 0 ? 'w-3/4' : 'w-1/2'} />
                    </td>
                  ))}
                  {rowActions && (
                    <td className={cellPadding}>
                      <Skeleton variant="text" width="w-16" />
                    </td>
                  )}
                </tr>
              ))}

            {!loading && pagedData.length === 0 && (
              <tr>
                <td colSpan={columns.length + (rowActions ? 1 : 0)}>
                  <EmptyState
                    icon={emptyIcon}
                    title={emptyMessage}
                    description="Intenta ajustar los filtros o criterios de búsqueda."
                  />
                </td>
              </tr>
            )}

            {!loading &&
              pagedData.map((row, rowIdx) => (
                <tr
                  key={rowIdx}
                  className={`border-b border-slate-50 last:border-0 transition-colors ${
                    onRowClick ? 'cursor-pointer hover:bg-emerald-50/50' : 'hover:bg-slate-50/50'
                  }`}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                >
                  {columns.map((col) => {
                    const val = getValue(row, col);
                    return (
                      <td
                        key={col.key}
                        className={`${cellPadding} ${alignClass(col.align)} text-sm text-slate-700`}
                      >
                        {col.render ? col.render(val, row) : (val ?? '—')}
                      </td>
                    );
                  })}
                  {rowActions && (
                    <td className={`${cellPadding} text-right`} onClick={(e) => e.stopPropagation()}>
                      {rowActions(row)}
                    </td>
                  )}
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {shouldPaginate && !loading && (
        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-4 py-3">
          <span className="text-xs font-medium text-slate-500">
            {sortedData.length === 0
              ? '0 registros'
              : `${(safePage - 1) * pageSize + 1}–${Math.min(safePage * pageSize, sortedData.length)} de ${sortedData.length}`}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(1)}
              disabled={safePage <= 1}
              className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-200 disabled:opacity-30"
            >
              <ChevronsLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => setPage(Math.max(1, safePage - 1))}
              disabled={safePage <= 1}
              className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-200 disabled:opacity-30"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="px-3 text-xs font-bold text-slate-700">
              {safePage} / {totalPages}
            </span>
            <button
              onClick={() => setPage(Math.min(totalPages, safePage + 1))}
              disabled={safePage >= totalPages}
              className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-200 disabled:opacity-30"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <button
              onClick={() => setPage(totalPages)}
              disabled={safePage >= totalPages}
              className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-200 disabled:opacity-30"
            >
              <ChevronsRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
