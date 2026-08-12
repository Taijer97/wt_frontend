import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { CheckCircle, X, AlertTriangle, Info, XCircle } from 'lucide-react';

export type AlertType = 'success' | 'error' | 'warning' | 'info';

export interface AlertItem {
  id: string;
  type: AlertType;
  message: string;
  duration?: number;
}

export interface AlertContextType {
  showAlert: (type: AlertType, message: string, duration?: number) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  warning: (message: string) => void;
  info: (message: string) => void;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

const typeConfig = {
  success: { icon: CheckCircle, bg: 'bg-emerald-100', color: 'text-emerald-600', bar: 'bg-emerald-500' },
  error: { icon: XCircle, bg: 'bg-red-100', color: 'text-red-600', bar: 'bg-red-500' },
  warning: { icon: AlertTriangle, bg: 'bg-amber-100', color: 'text-amber-600', bar: 'bg-amber-500' },
  info: { icon: Info, bg: 'bg-blue-100', color: 'text-blue-600', bar: 'bg-blue-500' },
};

export const AlertToast: React.FC<AlertItem & { onClose?: (id: string) => void }> = ({ id, type, message, duration = 4000, onClose }) => {
  const { icon: Icon, bg, color, bar } = typeConfig[type];

  return (
    <div className="animate-slide-in-right relative flex min-w-[320px] max-w-[420px] items-start gap-3 overflow-hidden rounded-xl border border-slate-100 bg-white p-4 shadow-xl">
      <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${bg} ${color} shrink-0`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1 pt-1">
        <p className="text-sm font-semibold text-slate-800">{message}</p>
      </div>
      {onClose && (
        <button
          onClick={() => onClose(id)}
          className="shrink-0 rounded p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
        >
          <X className="h-4 w-4" />
        </button>
      )}
      
      <div 
        className={`absolute bottom-0 left-0 h-[2px] ${bar} animate-shrink`} 
        style={{ animationDuration: `${duration}ms`, animationTimingFunction: 'linear', animationFillMode: 'forwards' }}
      />
      <style>{`
        @keyframes shrink {
          from { width: 100%; }
          to { width: 0%; }
        }
        .animate-shrink {
          animation-name: shrink;
        }
        .animate-slide-in-right {
          animation: slideInRight 0.3s ease-out forwards;
        }
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export const AlertProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);

  const showAlert = useCallback((type: AlertType, message: string, duration = 4000) => {
    const id = `${Date.now()}-${Math.random()}`;
    setAlerts((prev) => [...prev, { id, type, message, duration }]);

    setTimeout(() => {
      setAlerts((prev) => prev.filter((alert) => alert.id !== id));
    }, duration);
  }, []);

  const success = useCallback((message: string) => showAlert('success', message), [showAlert]);
  const error = useCallback((message: string) => showAlert('error', message), [showAlert]);
  const warning = useCallback((message: string) => showAlert('warning', message), [showAlert]);
  const info = useCallback((message: string) => showAlert('info', message), [showAlert]);

  const removeAlert = useCallback((id: string) => {
    setAlerts((prev) => prev.filter((alert) => alert.id !== id));
  }, []);

  return (
    <AlertContext.Provider value={{ showAlert, success, error, warning, info }}>
      {children}
      <div className="fixed right-4 top-4 z-[999] flex flex-col gap-2 pointer-events-none">
        {alerts.map((alert) => (
          <div key={alert.id} className="pointer-events-auto">
            <AlertToast {...alert} onClose={removeAlert} />
          </div>
        ))}
      </div>
    </AlertContext.Provider>
  );
};

export const useAlert = () => {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error('useAlert must be used within an AlertProvider');
  }
  return context;
};
