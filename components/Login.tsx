import React, { useState } from 'react';
import { BackendService } from '../services/backendService';
import { ArrowRight, UserCircle, ShieldCheck } from 'lucide-react';
import { BrandLogo } from './BrandLogo';
import { Employee } from '../types';
import { Button, Input } from './ui';

interface LoginProps {
  onLoginSuccess: (user: Employee) => void;
  onGoToRegister: () => void;
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess, onGoToRegister }) => {
  const [docNumber, setDocNumber] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const apiResult = await BackendService.login(docNumber, password);
      if (apiResult.success && apiResult.user) {
        onLoginSuccess(apiResult.user);
        return;
      }
      setError(apiResult.message || 'Error al iniciar sesión. Verifique sus credenciales.');
    } catch {
      setError('No se pudo conectar con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl flex overflow-hidden border border-slate-800/20 animate-scale-in">
        {/* Left Side: Brand Panel */}
        <div className="w-1/2 bg-gradient-to-br from-emerald-700 via-emerald-800 to-slate-950 hidden md:flex flex-col justify-between p-12 text-white relative overflow-hidden">
          <div className="absolute -right-16 -bottom-16 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-8">
              <div className="p-2.5 bg-white/10 rounded-2xl backdrop-blur-md border border-white/20">
                <BrandLogo className="w-8 h-8" alt="WasiTech" />
              </div>
              <div>
                <h1 className="text-2xl font-black tracking-tight text-white">WASITECH</h1>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-300">
                  ERP MYPE RUC 10/20
                </span>
              </div>
            </div>
            <p className="text-emerald-100/90 text-sm font-medium leading-relaxed mb-6">
              Plataforma empresarial de gestión integral. Controla inventario, compras, ventas y cumplimiento tributario SUNAT en tiempo real.
            </p>
            <div className="space-y-3 border-t border-white/10 pt-6">
              <div className="flex items-center gap-2 text-xs text-emerald-200">
                <ShieldCheck className="w-4 h-4 text-emerald-400" /> Facturación & SIRE Automatizado
              </div>
              <div className="flex items-center gap-2 text-xs text-emerald-200">
                <ShieldCheck className="w-4 h-4 text-emerald-400" /> Trazabilidad de Auditoría RUC 10/20
              </div>
            </div>
          </div>
          <div className="relative z-10 text-[11px] font-bold text-emerald-200/60 flex justify-between items-center">
            <span>&copy; {new Date().getFullYear()} WasiTech Systems</span>
            <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono text-[10px]">v2.0</span>
          </div>
        </div>

        {/* Right Side: Form */}
        <div className="w-full md:w-1/2 p-8 md:p-12 flex flex-col justify-center bg-white">
          <div className="mb-8 text-center md:text-left">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight mb-1">Bienvenido de nuevo</h2>
            <p className="text-xs text-slate-500 font-medium">Ingresa tus credenciales para acceder al sistema.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-xs font-bold animate-shake">
                {error}
              </div>
            )}

            <Input
              label="Usuario / DNI"
              placeholder="Ingrese su DNI"
              value={docNumber}
              onChange={(e) => setDocNumber(e.target.value.toUpperCase())}
              leftIcon={<UserCircle className="w-4 h-4" />}
              required
            />

            <Input
              label="Contraseña"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <Button
              type="submit"
              variant="primary"
              fullWidth
              size="lg"
              isLoading={loading}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Iniciar Sesión
            </Button>
          </form>

          <div className="mt-6 text-center text-xs text-slate-500 font-medium">
            ¿No tienes cuenta?{' '}
            <button onClick={onGoToRegister} className="text-emerald-600 font-bold hover:underline">
              Registrarse como colaborador
            </button>
          </div>

          <div className="mt-8 pt-4 border-t border-slate-100 text-[10px] text-slate-400 text-center font-medium">
            Acceso seguro encriptado
          </div>
        </div>
      </div>
    </div>
  );
};
