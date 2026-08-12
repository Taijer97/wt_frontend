import React from 'react';
import { InboxIcon } from 'lucide-react';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title?: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title = 'Sin resultados',
  description = 'No se encontraron registros para mostrar.',
  action,
  className = '',
}) => {
  return (
    <div className={`animate-fade-in flex flex-col items-center justify-center py-16 px-4 ${className}`}>
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 mb-4">
        {icon || <InboxIcon className="h-8 w-8" />}
      </div>
      <h3 className="text-lg font-bold text-slate-900 mb-1">{title}</h3>
      <p className="text-sm text-slate-500 text-center max-w-sm mb-6">{description}</p>
      {action && <div>{action}</div>}
    </div>
  );
};
