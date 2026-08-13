import React, { useState } from 'react';
import { Employee, PensionSystem, UserRole, CivilStatus } from '../../types';
import { DataService } from '../../services/dataService';
import { BackendService } from '../../services/backendService';
import { fetchDni } from '../../services/dniService';
import { Phone, MapPin, Pencil, Trash2, Search, Plus, Key, UserCheck, Clock, CheckCircle2, ShieldAlert } from 'lucide-react';
import { Button, Input, Modal, DataTable, Column, Badge } from '../ui';
import { useAlert } from '../ui/Alert';

interface EmployeesSettingsTabProps {
  employees: Employee[];
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  onSaveEmployee: (e: Employee) => Promise<void>;
  onDeleteEmployee: (id: string) => Promise<void>;
  showAddForm: boolean;
  setShowAddForm: (show: boolean) => void;
  editingEmployee: Employee | null;
  setEditingEmployee: (e: Employee | null) => void;
  isProcessing: boolean;
}

export const EmployeesSettingsTab: React.FC<EmployeesSettingsTabProps> = ({
  employees,
  searchQuery,
  setSearchQuery,
  onSaveEmployee,
  onDeleteEmployee,
  showAddForm,
  setShowAddForm,
  editingEmployee,
  setEditingEmployee,
  isProcessing,
}) => {
  const toast = useAlert();
  const config = DataService.getConfig();
  const isFormOpen = showAddForm || !!editingEmployee;

  const [approvingEmployee, setApprovingEmployee] = useState<Employee | null>(null);
  const [selectedRole, setSelectedRole] = useState<UserRole>('VENDEDOR');

  const pendingEmployees = employees.filter(e => e.isApproved === false);

  const handleConfirmApproval = async () => {
    if (!approvingEmployee) return;
    try {
      await onSaveEmployee({
        ...approvingEmployee,
        isApproved: true,
        role: selectedRole
      });
      toast.success(`Acceso aprobado con éxito para ${approvingEmployee.fullName} (Rol: ${selectedRole})`);
      setApprovingEmployee(null);
    } catch (err: any) {
      toast.error('Error al aprobar empleado: ' + (err.message || 'Error desconocido'));
    }
  };

  const columns: Column<Employee>[] = [
    {
      key: 'identificacion',
      header: 'Identificación',
      render: (_, e) => (
        <div>
          <div className="font-black text-slate-900 uppercase text-sm">{e.fullName}</div>
          <div className="text-[10px] font-black uppercase text-slate-500 tracking-tight">DNI: {e.docNumber}</div>
        </div>
      ),
    },
    {
      key: 'contacto',
      header: 'Contacto',
      render: (_, e) => (
        <div>
          <div className="text-xs font-bold text-slate-800 uppercase flex items-center gap-1">
            <Phone className="w-3 h-3 text-slate-400" /> {e.phone || '—'}
          </div>
          <div className="text-[10px] text-slate-400 font-bold flex items-center gap-1 uppercase mt-0.5">
            <MapPin className="w-3 h-3 text-slate-300" /> {e.email || '—'}
          </div>
        </div>
      ),
    },
    {
      key: 'sueldo_rol',
      header: 'Sueldo & Rol',
      render: (_, e) => (
        <div>
          <div className="text-sm font-black text-blue-600">S/ {(e.baseSalary || 0).toFixed(2)}</div>
          <Badge variant="neutral" size="sm">
            {e.role}
          </Badge>
        </div>
      ),
    },
    {
      key: 'estado_acceso',
      header: 'Estado Acceso',
      render: (_, e) => (
        <div>
          {e.isApproved !== false ? (
            <Badge variant="success" size="sm" className="flex items-center gap-1 w-fit">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" /> APROBADO
            </Badge>
          ) : (
            <Badge variant="warning" size="sm" className="flex items-center gap-1 animate-pulse w-fit">
              <Clock className="w-3 h-3 text-amber-600" /> PENDIENTE APROBACIÓN
            </Badge>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="p-6 md:p-8 space-y-6 animate-fade-in">
      {/* Pending Approvals Alert Banner */}
      {pendingEmployees.length > 0 && (
        <div className="bg-amber-50 border-2 border-amber-200 p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500 text-white rounded-xl">
              <Clock className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h4 className="font-black text-slate-900 text-sm uppercase tracking-tight">
                {pendingEmployees.length} Solicitud(es) de Registro Pendiente(s)
              </h4>
              <p className="text-xs text-slate-600 font-medium">
                Nuevos colaboradores se han registrado en la plataforma y requieren aprobación explícita de un Administrador para ingresar.
              </p>
            </div>
          </div>
        </div>
      )}

      <DataTable
        columns={columns}
        data={employees}
        searchable
        searchPlaceholder="Buscar colaboradores por nombre, DNI..."
        searchKeys={['fullName', 'docNumber', 'phone', 'role']}
        headerAction={
          <Button variant="primary" size="sm" onClick={() => setShowAddForm(true)} leftIcon={<Plus className="w-4 h-4" />}>
            Nuevo Colaborador
          </Button>
        }
        rowActions={(e) => (
          <div className="flex items-center justify-end gap-2">
            {e.isApproved === false && (
              <Button
                variant="primary"
                size="xs"
                onClick={() => { setSelectedRole('VENDEDOR'); setApprovingEmployee(e); }}
                leftIcon={<UserCheck className="w-3.5 h-3.5" />}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-black"
              >
                Aprobar Acceso
              </Button>
            )}
            <Button variant="ghost" size="xs" onClick={() => setEditingEmployee(e)}>
              <Pencil className="w-4 h-4 text-blue-600" />
            </Button>
            <Button variant="ghost" size="xs" onClick={() => onDeleteEmployee(e.id)}>
              <Trash2 className="w-4 h-4 text-red-600" />
            </Button>
          </div>
        )}
      />

      {/* Approval & Role Assignment Modal */}
      <Modal
        open={!!approvingEmployee}
        onClose={() => setApprovingEmployee(null)}
        title="Aprobar Acceso & Asignar Rol"
        subtitle={`Otorga acceso oficial al colaborador ${approvingEmployee?.fullName || ''}`}
        size="md"
        footer={
          <div className="flex justify-end gap-3 w-full">
            <Button variant="ghost" onClick={() => setApprovingEmployee(null)}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={handleConfirmApproval} leftIcon={<UserCheck className="w-4 h-4" />}>
              Aprobar & Guardar Rol
            </Button>
          </div>
        }
      >
        <div className="space-y-4 py-2 text-xs">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
            <p className="font-extrabold text-slate-900 text-sm">{approvingEmployee?.fullName}</p>
            <p className="text-slate-500 font-bold">DNI: {approvingEmployee?.docNumber} • Email: {approvingEmployee?.email || 'N/A'}</p>
          </div>

          <div>
            <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-2">
              Seleccionar Rol Oficial para el Sistema
            </label>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value as UserRole)}
              className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm font-bold bg-white text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 uppercase"
            >
              {config.roleConfigs.map((rc) => (
                <option key={rc.role} value={rc.role}>
                  {rc.label.toUpperCase()} ({rc.role})
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-500 font-medium mt-2">
              Al aprobar, el colaborador podrá iniciar sesión en la plataforma con el DNI y contraseña registrados, sujetándose a la matriz de permisos de este rol.
            </p>
          </div>
        </div>
      </Modal>

      <Modal
        open={isFormOpen}
        onClose={() => { setShowAddForm(false); setEditingEmployee(null); }}
        title={editingEmployee ? 'Editar Colaborador' : 'Nuevo Colaborador'}
        subtitle="Complete los datos personales, laborales y rol de acceso"
        size="lg"
      >
        <EmployeeForm
          initialData={editingEmployee || undefined}
          onSubmit={onSaveEmployee}
          onCancel={() => { setShowAddForm(false); setEditingEmployee(null); }}
          isProcessing={isProcessing}
        />
      </Modal>
    </div>
  );
};

const EmployeeForm: React.FC<{
  initialData?: Employee;
  onSubmit: (e: Employee) => void;
  onCancel: () => void;
  isProcessing?: boolean;
}> = ({ initialData, onSubmit, onCancel, isProcessing }) => {
  const toast = useAlert();
  const config = DataService.getConfig();
  const [formData, setFormData] = useState<Employee>(
    initialData || {
      id: Date.now().toString(),
      docNumber: '',
      fullName: '',
      phone: '',
      email: '',
      address: '',
      department: '',
      province: '',
      district: '',
      civilStatus: CivilStatus.SOLTERO,
      baseSalary: 1025,
      pensionSystem: PensionSystem.ONP,
      hasChildren: false,
      role: 'USER',
      jobTitle: 'COLABORADOR',
      entryDate: new Date().toISOString().split('T')[0],
      password: '',
    }
  );
  const [loadingDni, setLoadingDni] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordData, setPasswordData] = useState({ oldPassword: '', newPassword: '' });
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  const handleFetchDni = async (dniRaw?: string) => {
    const dni = ((dniRaw ?? formData.docNumber) || '').trim();
    if (!dni || dni.length < 8) return;
    try {
      setLoadingDni(true);
      const info = await fetchDni(dni);
      const civ = (info.estadoCivil || '').toUpperCase();
      const civMap: Record<string, CivilStatus> = {
        SOLTERO: CivilStatus.SOLTERO,
        CASADO: CivilStatus.CASADO,
        VIUDO: CivilStatus.VIUDO,
        DIVORCIADO: CivilStatus.DIVORCIADO,
      };
      setFormData((f) => ({
        ...f,
        fullName: info.fullName || f.fullName,
        address: info.direccion || f.address,
        civilStatus: civMap[civ] || f.civilStatus,
      }));
    } finally {
      setLoadingDni(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    if (!passwordData.oldPassword || !passwordData.newPassword) {
      setPasswordError('Llene todos los campos');
      return;
    }
    setIsChangingPassword(true);
    try {
      await BackendService.changeEmployeePassword(formData.id, passwordData.oldPassword, passwordData.newPassword);
      setShowPasswordModal(false);
      setPasswordData({ oldPassword: '', newPassword: '' });
      toast.success('Contraseña actualizada correctamente');
    } catch (err: any) {
      setPasswordError(err?.response?.data?.detail || 'Error al cambiar contraseña');
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <>
      <form onSubmit={(ev) => { ev.preventDefault(); onSubmit(formData); }} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2 space-y-4">
            <h4 className="text-xs font-black text-blue-600 uppercase tracking-widest border-b pb-1">
              Datos de Cuenta y Perfil
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                  DNI / Usuario
                </label>
                <div className="flex gap-2">
                  <Input
                    value={formData.docNumber}
                    onChange={(e) => {
                      const v = e.target.value.toUpperCase();
                      setFormData({ ...formData, docNumber: v });
                      if (v.trim().length === 8 && !loadingDni) handleFetchDni(v);
                    }}
                    onBlur={() => handleFetchDni()}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleFetchDni(); } }}
                    required
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="md"
                    onClick={() => handleFetchDni()}
                    disabled={loadingDni}
                    isLoading={loadingDni}
                  >
                    <Search className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                  Rol del Sistema
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold bg-white text-slate-900 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 uppercase"
                >
                  {config.roleConfigs.map((rc) => (
                    <option key={rc.role} value={rc.role}>
                      {rc.label.toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                  Estado de Acceso
                </label>
                <select
                  value={formData.isApproved !== false ? 'approved' : 'pending'}
                  onChange={(e) => setFormData({ ...formData, isApproved: e.target.value === 'approved' })}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold bg-white text-slate-900 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 uppercase"
                >
                  <option value="approved">APROBADO (Permitir Ingreso)</option>
                  <option value="pending">PENDIENTE (Bloquear Ingreso)</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <Input
                  label="Nombre Completo"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value.toUpperCase() })}
                  required
                />
              </div>

              <div className="md:col-span-2">
                {initialData ? (
                  <Button
                    type="button"
                    variant="outline"
                    fullWidth
                    onClick={() => setShowPasswordModal(true)}
                    leftIcon={<Key className="w-4 h-4" />}
                  >
                    Cambiar Contraseña
                  </Button>
                ) : (
                  <Input
                    label="Contraseña Acceso"
                    type="password"
                    value={formData.password || ''}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="••••••••"
                    required
                  />
                )}
              </div>

              <Input
                label="Teléfono"
                value={formData.phone || ''}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value.toUpperCase() })}
              />
              <Input
                label="Correo"
                type="email"
                value={formData.email || ''}
                onChange={(e) => setFormData({ ...formData, email: e.target.value.toUpperCase() })}
              />
              <div className="md:col-span-2">
                <Input
                  label="Dirección"
                  value={formData.address || ''}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value.toUpperCase() })}
                />
              </div>
            </div>
          </div>

          <div className="md:col-span-2 space-y-4">
            <h4 className="text-xs font-black text-blue-600 uppercase tracking-widest border-b pb-1">
              Información Laboral
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Sueldo Básico (S/)"
                type="number"
                value={formData.baseSalary || 0}
                onChange={(e) => setFormData({ ...formData, baseSalary: Number(e.target.value) })}
                required
                disabled={isProcessing}
              />
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                  Pensión
                </label>
                <select
                  value={formData.pensionSystem}
                  onChange={(e) => setFormData({ ...formData, pensionSystem: e.target.value as any })}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold bg-white text-slate-900 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 uppercase"
                  disabled={isProcessing}
                >
                  {Object.values(PensionSystem).map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-3 justify-end pt-4 border-t">
          <Button variant="ghost" type="button" onClick={onCancel} disabled={isProcessing}>
            Cancelar
          </Button>
          <Button variant="primary" type="submit" isLoading={isProcessing}>
            Guardar Colaborador
          </Button>
        </div>
      </form>

      <Modal
        open={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        title="Cambiar Contraseña"
        size="sm"
      >
        <form onSubmit={handleChangePassword} className="space-y-4 py-2">
          {passwordError && <p className="text-red-500 text-xs font-bold">{passwordError}</p>}
          <Input
            label="Contraseña Actual"
            type="password"
            value={passwordData.oldPassword}
            onChange={(e) => setPasswordData({ ...passwordData, oldPassword: e.target.value })}
            required
            disabled={isChangingPassword}
          />
          <Input
            label="Nueva Contraseña"
            type="password"
            value={passwordData.newPassword}
            onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
            required
            minLength={6}
            disabled={isChangingPassword}
          />
          <div className="flex gap-3 pt-2 justify-end">
            <Button variant="ghost" type="button" onClick={() => setShowPasswordModal(false)}>
              Cancelar
            </Button>
            <Button variant="primary" type="submit" isLoading={isChangingPassword}>
              Actualizar
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
};
