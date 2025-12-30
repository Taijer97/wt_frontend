import React, { useState } from 'react';
import { BackendService } from '../services/backendService';
import { ArrowRight, UserCircle, Lock, AlertCircle } from 'lucide-react';
import { BrandLogo } from './BrandLogo';
import { Employee } from '../types';

interface LoginProps {
  onLoginSuccess: (user: Employee) => void;
  onGoToRegister: () => void;
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess, onGoToRegister }) => {
  const [docNumber, setDocNumber] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const apiResult = await BackendService.login(docNumber, password);
    if (apiResult.success && apiResult.user) { onLoginSuccess(apiResult.user); return; }
    setError(apiResult.message || 'Error desconocido');
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl flex overflow-hidden">
        {/* Left Side: Brand */}
        <div className="w-1/2 bg-gradient-to-br from-emerald-600 to-slate-900 hidden md:flex flex-col justify-between p-12 text-white relative">
          <div className="absolute inset-0 bg-black opacity-10 pattern-grid-lg"></div>
          <div className="relative z-10">
             <div className="flex items-center gap-3 mb-6">
                <BrandLogo className="w-10 h-10" alt="WasiTech" />
                <h1 className="text-3xl font-bold tracking-tight">WASITECH</h1>
             </div>
             <p className="text-emerald-100 text-lg leading-relaxed">
               Gestión integral para empresas RMT. Control de inventario, ventas y cumplimiento tributario SUNAT en una sola plataforma.
             </p>
          </div>
          <div className="relative z-10 text-xs text-emerald-200/60">
            &copy; 2025 WasiTech Systems
          </div>
        </div>

        {/* Right Side: Form */}
        <div className="w-full md:w-1/2 p-8 md:p-12 flex flex-col justify-center">
          <div className="mb-8 text-center md:text-left">
            <h2 className="text-3xl font-bold text-gray-800 mb-2">Bienvenido</h2>
            <p className="text-gray-500">Ingresa tus credenciales para acceder al sistema.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4" /> {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Usuario / DNI</label>
              <div className="relative">
                <UserCircle className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" />
                <input 
                  type="text" 
                  required
                  value={docNumber}
                  onChange={e => setDocNumber(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all bg-white text-gray-900"
                  placeholder="Ingrese su DNI"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
              <div className="relative">
                <Lock className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" />
                <input 
                  type="password" 
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all bg-white text-gray-900"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button type="submit" className="w-full bg-slate-900 text-white py-3 rounded-lg font-bold hover:bg-slate-800 transition-all shadow-lg flex items-center justify-center gap-2 group">
              Iniciar Sesión
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </form>

          <div className="mt-8 text-center text-sm text-gray-500">
            ¿No tienes cuenta?{' '}
            <button onClick={onGoToRegister} className="text-emerald-600 font-bold hover:underline">
              Registrarse como empleado
            </button>
          </div>
          
          <div className="mt-8 pt-4 border-t border-gray-100 text-xs text-gray-400 text-center">
            <p>Acceso gestionado por el servidor</p>
            <p className="font-mono mt-1">Conéctate con tus credenciales</p>
          </div>
        </div>
      </div>
    </div>
  );
};
