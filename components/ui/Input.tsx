import React, { forwardRef, useState, InputHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { Eye, EyeOff, Search } from 'lucide-react';

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  inputSize?: 'sm' | 'md' | 'lg';
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className = '',
      label,
      error,
      hint,
      leftIcon,
      rightIcon,
      type = 'text',
      inputSize = 'md',
      ...props
    },
    ref
  ) => {
    const [showPassword, setShowPassword] = useState(false);

    const isPassword = type === 'password';
    const isSearch = type === 'search';
    const effectiveType = isPassword ? (showPassword ? 'text' : 'password') : type;

    const effectiveLeftIcon = leftIcon || (isSearch ? <Search className="h-4 w-4" /> : null);
    const hasLeft = !!effectiveLeftIcon;
    const hasRight = !!rightIcon || isPassword;

    const sizeStyles = {
      sm: 'py-1.5 text-xs',
      md: 'py-2.5 text-sm',
      lg: 'py-3 text-base',
    };

    const inputClasses = [
      'w-full border rounded-xl bg-white text-slate-900 placeholder:text-slate-400',
      'transition-all duration-200 focus:outline-none',
      error
        ? 'border-red-300 focus:ring-2 focus:ring-red-500/20 focus:border-red-500'
        : 'border-slate-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500',
      hasLeft ? 'pl-10' : 'pl-4',
      hasRight ? 'pr-10' : 'pr-4',
      sizeStyles[inputSize],
      className,
    ].join(' ');

    return (
      <div className="w-full">
        {label && (
          <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
            {label}
          </label>
        )}
        <div className="relative">
          {effectiveLeftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
              {effectiveLeftIcon}
            </div>
          )}
          <input ref={ref} type={effectiveType} className={inputClasses} {...props} />
          {isPassword && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          )}
          {!isPassword && rightIcon && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
              {rightIcon}
            </div>
          )}
        </div>
        {error && <p className="text-xs text-red-500 mt-1 font-medium">{error}</p>}
        {!error && hint && <p className="text-xs text-slate-400 mt-1">{hint}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';

/* ─── Textarea ──────────────────────────────────────────── */

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className = '', label, error, hint, ...props }, ref) => {
    const textareaClasses = [
      'w-full border rounded-xl bg-white text-slate-900 placeholder:text-slate-400',
      'transition-all duration-200 focus:outline-none px-4 py-2.5 text-sm',
      'resize-none min-h-[100px]',
      error
        ? 'border-red-300 focus:ring-2 focus:ring-red-500/20 focus:border-red-500'
        : 'border-slate-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500',
      className,
    ].join(' ');

    return (
      <div className="w-full">
        {label && (
          <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
            {label}
          </label>
        )}
        <textarea ref={ref} className={textareaClasses} {...props} />
        {error && <p className="text-xs text-red-500 mt-1 font-medium">{error}</p>}
        {!error && hint && <p className="text-xs text-slate-400 mt-1">{hint}</p>}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
