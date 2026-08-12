import React from 'react';
import { CheckCircle, XCircle, AlertTriangle, Clock, Info, MinusCircle } from 'lucide-react';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'success' | 'error' | 'danger' | 'warning' | 'info' | 'neutral' | 'primary';
  size?: 'sm' | 'md';
  dot?: boolean;
  icon?: boolean;
  className?: string;
}

const variantStyles = {
  success: 'bg-emerald-100 text-emerald-800 border border-emerald-300',
  error: 'bg-red-100 text-red-800 border border-red-300',
  danger: 'bg-rose-100 text-rose-800 border border-rose-300',
  warning: 'bg-amber-100 text-amber-800 border border-amber-300',
  info: 'bg-blue-100 text-blue-800 border border-blue-300',
  neutral: 'bg-slate-100 text-slate-600 border border-slate-200',
  primary: 'bg-emerald-100 text-emerald-800 border border-emerald-300',
};

const dotColors = {
  success: 'bg-emerald-500',
  error: 'bg-red-500',
  danger: 'bg-rose-500',
  warning: 'bg-amber-500',
  info: 'bg-blue-500',
  neutral: 'bg-slate-400',
  primary: 'bg-emerald-500',
};

const variantIcons = {
  success: CheckCircle,
  error: XCircle,
  danger: MinusCircle,
  warning: AlertTriangle,
  info: Info,
  neutral: Clock,
  primary: CheckCircle,
};

const iconColors = {
  success: 'text-emerald-600',
  error: 'text-red-600',
  danger: 'text-rose-600',
  warning: 'text-amber-600',
  info: 'text-blue-600',
  neutral: 'text-slate-500',
  primary: 'text-emerald-600',
};

const sizeStyles = {
  sm: 'text-[10px] px-2.5 py-1 gap-1',
  md: 'text-xs px-3 py-1.5 gap-1.5',
};

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  size = 'md',
  dot = false,
  icon = false,
  className = '',
}) => {
  const IconComponent = variantIcons[variant];
  const iconSize = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4';
  
  return (
    <span
      className={`inline-flex items-center rounded-full font-black uppercase tracking-wider ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
    >
      {icon && (
        <IconComponent className={`${iconSize} ${iconColors[variant]}`} />
      )}
      {dot && !icon && (
        <span className={`h-1.5 w-1.5 rounded-full ${dotColors[variant]} animate-pulse`} />
      )}
      {children}
    </span>
  );
};
