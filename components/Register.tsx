
import React, { useState } from 'react';
import { BackendService } from '../services/backendService';
import { ArrowLeft, UserPlus, CheckCircle, Phone, Mail, MapPin } from 'lucide-react';
import { PensionSystem } from '../types';

interface RegisterProps {
  onBack: () => void;
}

export const Register: React.FC<RegisterProps> = ({ onBack }) => {
  const [formData, setFormData] = useState({
    fullName: '',
    docNumber: '',
    phone: '',
    email: '',
    address: '',
    password: '',
    confirmPassword: ''
  });
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }
    if (formData.docNumber.length < 8) {
      setError('El DNI debe tener al menos 8 caracteres');
      return;
    }
    if (!formData.phone || !formData.email) {
      setError('Celular y correo son obligatorios');
      return;
    }

    try {
      await BackendService.createEmployee({
        fullName: formData.fullName,
        docNumber: formData.docNumber,
        phone: formData.phone,
        email: formData.email,
        address: formData.address,
        password: formData.password,
        role: 'USER',
        baseSalary: 0,
        pensionSystem: PensionSystem.ONP,
        hasChildren: false
      });
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Error al registrar el usuario');
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-xl shadow-xl max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">¡Registro Exitoso!</h2>
          <p className="text-gray-500 mb-6">Tu cuenta ha sido creada. Por defecto tienes rol de <strong>USUARIO</strong>. Contacta al administrador si necesitas mayores privilegios.</p>
          <button onClick={onBack} className="w-full bg-slate-900 text-white py-3 rounded-lg font-bold hover:bg-slate-800">
            Volver al Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-xl shadow-xl max-w-lg w-full">
        <button onClick={onBack} className="text-gray-400 hover:text-gray-600 mb-6 flex items-center gap-2 text-sm font-medium transition-colors">
          <ArrowLeft className="w-4 h-4" /> Volver
        </button>

        <h2 className="text-2xl font-bold text-gray-800 mb-2 flex items-center gap-2">
          <UserPlus className="w-6 h-6 text-emerald-600" />
          Crear Cuenta
        </h2>
        <p className="text-gray-500 mb-6 text-sm">Registro para nuevos colaboradores de WASITECH.</p>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nombre Completo</label>
                <input required type="text" className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-emerald-500 bg-white text-gray-900" value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} />
            </div>
            <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">DNI (Usuario)</label>
                <input required type="text" className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-emerald-500 bg-white text-gray-900" value={formData.docNumber} onChange={e => setFormData({...formData, docNumber: e.target.value})} />
            </div>
            <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Celular</label>
                <div className="relative">
                    <Phone className="absolute left-3 top-2.5 w-4 h-4 text-gray-400"/>
                    <input required type="text" className="w-full border border-gray-300 rounded-lg p-2 pl-9 focus:ring-2 focus:ring-emerald-500 bg-white text-gray-900" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                </div>
            </div>
            <div className="md:col-span-2">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Correo Electrónico</label>
                <div className="relative">
                    <Mail className="absolute left-3 top-2.5 w-4 h-4 text-gray-400"/>
                    <input required type="email" className="w-full border border-gray-300 rounded-lg p-2 pl-9 focus:ring-2 focus:ring-emerald-500 bg-white text-gray-900" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                </div>
            </div>
            <div className="md:col-span-2">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Dirección Actual</label>
                <div className="relative">
                    <MapPin className="absolute left-3 top-2.5 w-4 h-4 text-gray-400"/>
                    <input required type="text" className="w-full border border-gray-300 rounded-lg p-2 pl-9 focus:ring-2 focus:ring-emerald-500 bg-white text-gray-900" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
                </div>
            </div>
            <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Contraseña</label>
                <input required type="password" placeholder="••••••••" className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-emerald-500 bg-white text-gray-900" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
            </div>
            <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Confirmar</label>
                <input required type="password" placeholder="••••••••" className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-emerald-500 bg-white text-gray-900" value={formData.confirmPassword} onChange={e => setFormData({...formData, confirmPassword: e.target.value})} />
            </div>
          </div>

          <button type="submit" className="w-full bg-emerald-600 text-white py-3 rounded-lg font-bold hover:bg-emerald-700 mt-4 shadow-md transition-colors">
            Registrarse
          </button>
        </form>
      </div>
    </div>
  );
};
