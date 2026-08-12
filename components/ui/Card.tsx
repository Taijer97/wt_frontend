import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

/* ─── Card ──────────────────────────────────────────────── */

export interface CardProps {
  children: React.ReactNode;
  variant?: 'default' | 'elevated' | 'glass' | 'dark';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  onClick?: () => void;
  className?: string;
}

const cardVariants = {
  default: 'bg-white border border-slate-100 shadow-sm rounded-2xl',
  elevated: 'bg-white border border-slate-100 shadow-lg rounded-2xl hover:shadow-xl transition-shadow',
  glass: 'glass rounded-2xl',
  dark: 'bg-slate-900 text-white border border-slate-800 rounded-2xl',
};

const paddings = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
};

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  padding = 'md',
  onClick,
  className = '',
}) => {
  const clickableClasses = onClick
    ? 'cursor-pointer hover:scale-[1.01] hover:shadow-lg transition-all duration-200'
    : '';

  return (
    <div
      className={`${cardVariants[variant]} ${paddings[padding]} ${clickableClasses} ${className}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {children}
    </div>
  );
};

/* ─── CardHeader ────────────────────────────────────────── */

export interface CardHeaderProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export const CardHeader: React.FC<CardHeaderProps> = ({
  title,
  subtitle,
  icon,
  action,
  className = '',
}) => {
  return (
    <div className={`flex items-start justify-between ${className}`}>
      <div className="flex items-center gap-3">
        {icon && (
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
            {icon}
          </div>
        )}
        <div>
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">{title}</h3>
          {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {action && <div>{action}</div>}
    </div>
  );
};

/* ─── KPICard ───────────────────────────────────────────── */

export interface KPICardProps {
  title: string;
  value: string | number;
  prefix?: string;
  suffix?: string;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: { value: number; label?: string };
  variant?: 'light' | 'dark';
  className?: string;
}

export const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  prefix,
  suffix,
  subtitle,
  icon,
  trend,
  variant = 'light',
  className = '',
}) => {
  const isDark = variant === 'dark';

  const formattedValue =
    typeof value === 'number'
      ? value.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : value;

  return (
    <div
      className={`${
        isDark
          ? 'bg-slate-900 text-white border border-slate-800 shadow-xl'
          : 'bg-white border border-slate-100 shadow-sm'
      } rounded-2xl p-6 group hover:shadow-xl hover:-translate-y-1 transition-all duration-300 ${className}`}
    >
      <div className="flex items-start justify-between mb-4">
        <div
          className={`flex h-11 w-11 items-center justify-center rounded-2xl ${
            isDark ? 'bg-slate-800 text-emerald-400' : 'bg-slate-50 text-slate-700'
          }`}
        >
          {icon}
        </div>
        <span
          className={`text-[9px] font-black uppercase tracking-[0.2em] ${
            isDark ? 'text-slate-400' : 'text-slate-500'
          }`}
        >
          {title}
        </span>
      </div>

      <h3
        className={`text-2xl font-black tracking-tight ${
          isDark ? 'text-white' : 'text-slate-900'
        }`}
      >
        {prefix && <span className="text-base font-bold opacity-60 mr-1">{prefix}</span>}
        {formattedValue}
        {suffix && <span className="text-base font-bold opacity-60 ml-1">{suffix}</span>}
      </h3>

      <div className="flex items-center justify-between mt-2">
        {subtitle && (
          <p
            className={`text-[10px] font-bold uppercase tracking-wider ${
              isDark ? 'text-slate-500' : 'text-slate-400'
            }`}
          >
            {subtitle}
          </p>
        )}
        {trend && (
          <span
            className={`inline-flex items-center gap-1 text-[10px] font-black ${
              trend.value >= 0 ? 'text-emerald-600' : 'text-red-500'
            }`}
          >
            {trend.value >= 0 ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )}
            {trend.value >= 0 ? '+' : ''}
            {trend.value}%{trend.label && ` ${trend.label}`}
          </span>
        )}
      </div>
    </div>
  );
};
