import React, { useRef, useState } from 'react';
import {
  X, Camera, User, Phone, Mail, Shield,
  Lock, Check, AlertCircle, Eye, EyeOff, Loader2
} from 'lucide-react';
import { Employee } from '../types';
import { BackendService } from '../services/backendService';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: Employee;
  onUserUpdate: (updated: Employee) => void;
}


export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen, onClose, currentUser, onUserUpdate
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const [changingPwd, setChangingPwd] = useState(false);
  const [oldPwd, setOldPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdMsg, setPwdMsg] = useState<{ ok: boolean; text: string } | null>(null);

  if (!isOpen) return null;

  // Si hay preview local usa eso; si hay photoUrl del servidor es ruta relativa (/files/...)
  const avatarUrl = photoPreview || currentUser.photoUrl || null;

  const getRoleGradient = (role: string) => {
    switch (role) {
      case 'ADMIN':    return 'from-emerald-500 via-emerald-600 to-teal-700';
      case 'CAJA':     return 'from-purple-500 via-purple-600 to-violet-700';
      case 'RRHH':     return 'from-blue-500 via-blue-600 to-indigo-700';
      case 'VENDEDOR': return 'from-orange-400 via-orange-500 to-amber-600';
      default:         return 'from-slate-500 via-slate-600 to-slate-700';
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'ADMIN':    return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'CAJA':     return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'RRHH':     return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'VENDEDOR': return 'bg-orange-100 text-orange-700 border-orange-200';
      default:         return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setPhotoPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
    setUploadingPhoto(true);
    try {
      const result = await BackendService.uploadEmployeePhoto(Number(currentUser.id), file);
      onUserUpdate({ ...currentUser, photoUrl: result.photo_url });
    } catch {
      setPhotoPreview(null);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleChangePassword = async () => {
    if (!oldPwd || newPwd.length < 6) {
      setPwdMsg({ ok: false, text: 'La nueva contraseña debe tener al menos 6 caracteres.' });
      return;
    }
    setPwdLoading(true);
    setPwdMsg(null);
    try {
      const res = await BackendService.changeEmployeePassword(currentUser.id, oldPwd, newPwd);
      setPwdMsg({ ok: true, text: res.message || 'Contraseña actualizada.' });
      setOldPwd(''); setNewPwd(''); setChangingPwd(false);
    } catch (err: any) {
      setPwdMsg({ ok: false, text: err?.response?.data?.detail || 'Error al cambiar contraseña.' });
    } finally {
      setPwdLoading(false);
    }
  };

  const initials = currentUser.fullName.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" onClick={onClose} />

      <div
        className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden"
        style={{ animation: 'slideUp 0.25s ease-out' }}
      >
        {/* Banner gradient */}
        <div className={`bg-gradient-to-br ${getRoleGradient(currentUser.role)} h-32 relative`}>
          {/* Close */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-xl bg-white/20 hover:bg-white/35 text-white transition-all"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Decorative circles */}
          <div className="absolute -top-6 -left-6 w-24 h-24 rounded-full bg-white/10" />
          <div className="absolute -bottom-3 -right-4 w-20 h-20 rounded-full bg-white/10" />

          {/* Avatar */}
          <div className="absolute -bottom-12 left-1/2 -translate-x-1/2">
            <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
              <div className="w-24 h-24 rounded-2xl border-4 border-white shadow-xl overflow-hidden">
                {avatarUrl ? (
                  <img src={avatarUrl} alt={currentUser.fullName} className="w-full h-full object-cover" />
                ) : (
                  <div className={`w-full h-full bg-gradient-to-br ${getRoleGradient(currentUser.role)} flex items-center justify-center`}>
                    <span className="text-2xl font-black text-white">{initials}</span>
                  </div>
                )}
                {uploadingPhoto && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <Loader2 className="w-6 h-6 text-white animate-spin" />
                  </div>
                )}
                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Camera className="w-6 h-6 text-white" />
                </div>
              </div>
              {/* Camera badge */}
              <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-slate-900 rounded-xl border-2 border-white flex items-center justify-center shadow">
                <Camera className="w-3 h-3 text-white" />
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handlePhotoChange}
              />
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="pt-16 pb-6 px-5 space-y-4">
          {/* Name & Role */}
          <div className="text-center space-y-1.5">
            <h2 className="text-lg font-black text-slate-900 leading-tight">{currentUser.fullName}</h2>
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${getRoleBadge(currentUser.role)}`}>
              <Shield className="w-3 h-3" />
              {currentUser.role}
            </span>
          </div>

          {/* Info rows */}
          <div className="space-y-2">
            <InfoRow icon={<User className="w-3.5 h-3.5 text-slate-500" />} label="DNI / Documento" value={currentUser.docNumber} bg="bg-slate-100" />
            {currentUser.phone && <InfoRow icon={<Phone className="w-3.5 h-3.5 text-blue-500" />} label="Teléfono" value={currentUser.phone} bg="bg-blue-50" />}
            {currentUser.email && <InfoRow icon={<Mail className="w-3.5 h-3.5 text-purple-500" />} label="Correo Electrónico" value={currentUser.email} bg="bg-purple-50" />}
          </div>

          {/* Change password */}
          <div className="border-t border-slate-100 pt-3">
            {!changingPwd ? (
              <button
                onClick={() => { setChangingPwd(true); setPwdMsg(null); }}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-2xl border border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50 text-xs font-bold transition-all active:scale-95"
              >
                <Lock className="w-3.5 h-3.5" />
                Cambiar Contraseña
              </button>
            ) : (
              <div className="space-y-2.5">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Cambiar Contraseña</p>
                <PwdInput label="Contraseña actual" value={oldPwd} onChange={setOldPwd} show={showOld} onToggle={() => setShowOld(!showOld)} />
                <PwdInput label="Nueva contraseña" value={newPwd} onChange={setNewPwd} show={showNew} onToggle={() => setShowNew(!showNew)} />
                {pwdMsg && (
                  <div className={`flex items-start gap-2 text-xs font-bold px-3 py-2 rounded-xl ${pwdMsg.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
                    {pwdMsg.ok ? <Check className="w-3.5 h-3.5 mt-px shrink-0" /> : <AlertCircle className="w-3.5 h-3.5 mt-px shrink-0" />}
                    {pwdMsg.text}
                  </div>
                )}
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => { setChangingPwd(false); setPwdMsg(null); setOldPwd(''); setNewPwd(''); }}
                    className="flex-1 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-500 hover:bg-slate-50"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleChangePassword}
                    disabled={pwdLoading}
                    className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-60 transition-all"
                  >
                    {pwdLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    Guardar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0)     scale(1); }
        }
      `}</style>
    </div>
  );
};

const InfoRow: React.FC<{ icon: React.ReactNode; label: string; value: string; bg: string }> = ({ icon, label, value, bg }) => (
  <div className={`flex items-center gap-3 px-3.5 py-2.5 ${bg} rounded-2xl`}>
    <div className="w-7 h-7 bg-white/70 rounded-xl flex items-center justify-center shrink-0 shadow-sm">
      {icon}
    </div>
    <div className="min-w-0">
      <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">{label}</p>
      <p className="text-sm font-bold text-slate-800 truncate">{value}</p>
    </div>
  </div>
);

const PwdInput: React.FC<{ label: string; value: string; onChange: (v: string) => void; show: boolean; onToggle: () => void }> = ({ label, value, onChange, show, onToggle }) => (
  <div className="relative">
    <input
      type={show ? 'text' : 'password'}
      placeholder={label}
      value={value}
      onChange={e => onChange(e.target.value)}
      className="w-full px-4 py-2.5 pr-10 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-slate-50 font-medium"
    />
    <button type="button" onClick={onToggle} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
      {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
    </button>
  </div>
);

export default ProfileModal;
