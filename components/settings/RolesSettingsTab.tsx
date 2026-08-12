import React from 'react';
import { AppConfig, AppModule, PermissionSet } from '../../types';
import { Plus, Trash2, Fingerprint, ChevronRight, Lock, Eye, Pencil } from 'lucide-react';
import { Button, Modal, Input } from '../ui';

interface RolesSettingsTabProps {
  config: AppConfig;
  selectedRoleIndex: number;
  setSelectedRoleIndex: (idx: number) => void;
  showAddRoleModal: boolean;
  setShowAddRoleModal: (open: boolean) => void;
  newRoleData: { label: string; id: string };
  setNewRoleData: React.Dispatch<React.SetStateAction<{ label: string; id: string }>>;
  handleCreateRole: () => Promise<void> | void;
  handleDeleteRole: (idx: number, e: React.MouseEvent) => Promise<void> | void;
  handleTogglePermission: (module: AppModule, action: keyof PermissionSet) => void;
  handleSaveConfig: () => Promise<void> | void;
  modulesList: { id: AppModule; label: string }[];
}

export const RolesSettingsTab: React.FC<RolesSettingsTabProps> = ({
  config,
  selectedRoleIndex,
  setSelectedRoleIndex,
  showAddRoleModal,
  setShowAddRoleModal,
  newRoleData,
  setNewRoleData,
  handleCreateRole,
  handleDeleteRole,
  handleTogglePermission,
  handleSaveConfig,
  modulesList,
}) => {
  const selectedRole = config.roleConfigs[selectedRoleIndex] || config.roleConfigs[0];

  return (
    <div className="p-6 md:p-8 space-y-8 animate-fade-in">
      <div className="flex flex-col md:flex-row gap-8">
        {/* Selector de Roles Dinámico */}
        <div className="w-full md:w-72 space-y-4">
          <div className="flex justify-between items-center border-b pb-3">
            <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest">Roles Definidos</h3>
            <Button
              variant="outline"
              size="xs"
              onClick={() => setShowAddRoleModal(true)}
              leftIcon={<Plus className="w-3.5 h-3.5" />}
            >
              Nuevo
            </Button>
          </div>

          <div className="space-y-2 max-h-[450px] overflow-y-auto pr-1 custom-scrollbar">
            {config.roleConfigs.map((r, idx) => {
              const isSelected = selectedRoleIndex === idx;
              return (
                <div
                  key={r.id || idx}
                  onClick={() => setSelectedRoleIndex(idx)}
                  className={`w-full text-left p-3.5 rounded-2xl border cursor-pointer transition-all flex items-center justify-between group ${
                    isSelected
                      ? 'bg-slate-900 border-slate-900 text-white shadow-lg'
                      : 'bg-white border-slate-100 text-slate-700 hover:border-blue-400'
                  }`}
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <Fingerprint className={`w-5 h-5 shrink-0 ${isSelected ? 'text-emerald-400' : 'text-slate-300'}`} />
                    <div className="overflow-hidden">
                      <p className="font-extrabold uppercase text-xs truncate">{r.label}</p>
                      <p className={`text-[10px] font-bold uppercase tracking-wider ${isSelected ? 'text-slate-400' : 'text-slate-400'}`}>
                        {r.role}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {r.role !== 'ADMIN' && (
                      <button
                        type="button"
                        onClick={(e) => handleDeleteRole(idx, e)}
                        className={`p-1 text-red-400 hover:text-red-600 transition-colors ${
                          isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                        }`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                    <ChevronRight className={`w-4 h-4 ${isSelected ? 'text-emerald-400' : 'opacity-30'}`} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Matriz de Permisos CRUD */}
        <div className="flex-1 space-y-6">
          <div className="flex justify-between items-end border-b pb-4">
            <div>
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Matriz de Permisos (CRUD)</h3>
              <p className="text-xs text-slate-500 font-bold uppercase">
                Privilegios para: <span className="text-emerald-600 font-black">{selectedRole?.label || 'Sin Selección'}</span>
              </p>
            </div>
            <Button
              variant="secondary"
              onClick={handleSaveConfig}
              leftIcon={<Lock className="w-4 h-4 text-emerald-400" />}
            >
              Guardar Matriz
            </Button>
          </div>

          <div className="bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden shadow-inner">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-900 text-white uppercase text-[10px] font-black tracking-widest">
                  <th className="px-6 py-4">Módulo del Sistema</th>
                  <th className="px-4 py-4 text-center">Leer (R)</th>
                  <th className="px-4 py-4 text-center">Crear (C)</th>
                  <th className="px-4 py-4 text-center">Editar (U)</th>
                  <th className="px-4 py-4 text-center">Eliminar (D)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {modulesList.map((m) => {
                  const rolePermissions = selectedRole?.permissions || {};
                  const perms = rolePermissions[m.id] || { read: false, create: false, update: false, delete: false };

                  return (
                    <tr key={m.id} className="hover:bg-white transition-colors">
                      <td className="px-6 py-4 text-xs font-bold text-slate-700 uppercase">
                        {m.label}
                      </td>
                      <td className="px-4 py-4 text-center">
                        <PermissionToggle
                          active={perms.read}
                          onClick={() => handleTogglePermission(m.id, 'read')}
                          color="bg-emerald-500"
                          icon={<Eye className="w-3.5 h-3.5" />}
                        />
                      </td>
                      <td className="px-4 py-4 text-center">
                        <PermissionToggle
                          active={perms.create}
                          onClick={() => handleTogglePermission(m.id, 'create')}
                          color="bg-blue-500"
                          icon={<Plus className="w-3.5 h-3.5" />}
                        />
                      </td>
                      <td className="px-4 py-4 text-center">
                        <PermissionToggle
                          active={perms.update}
                          onClick={() => handleTogglePermission(m.id, 'update')}
                          color="bg-purple-500"
                          icon={<Pencil className="w-3.5 h-3.5" />}
                        />
                      </td>
                      <td className="px-4 py-4 text-center">
                        <PermissionToggle
                          active={perms.delete}
                          onClick={() => handleTogglePermission(m.id, 'delete')}
                          color="bg-red-500"
                          icon={<Trash2 className="w-3.5 h-3.5" />}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal para Añadir Nuevo Rol */}
      <Modal
        open={showAddRoleModal}
        onClose={() => setShowAddRoleModal(false)}
        title="Nuevo Rol"
        subtitle="Crea un rol para personalizar permisos"
        size="sm"
        footer={
          <div className="flex gap-2 justify-end w-full">
            <Button variant="ghost" onClick={() => setShowAddRoleModal(false)}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={handleCreateRole}>
              Registrar Rol
            </Button>
          </div>
        }
      >
        <div className="space-y-4 py-2">
          <Input
            label="Nombre Comercial"
            placeholder="Ej: Jefe de Ventas"
            value={newRoleData.label}
            onChange={(e) => setNewRoleData({ ...newRoleData, label: e.target.value.toUpperCase() })}
          />
          <Input
            label="Código ID"
            placeholder="EJ: JEFEVENTAS"
            value={newRoleData.id}
            onChange={(e) => setNewRoleData({ ...newRoleData, id: e.target.value.toUpperCase().replace(/[^a-zA-Z]/g, '') })}
          />
        </div>
      </Modal>
    </div>
  );
};

const PermissionToggle: React.FC<{
  active: boolean;
  onClick: () => void;
  color: string;
  icon: React.ReactNode;
}> = ({ active, onClick, color, icon }) => (
  <button
    type="button"
    onClick={onClick}
    className={`w-9 h-9 rounded-xl inline-flex items-center justify-center transition-all shadow-xs active:scale-90 ${
      active
        ? `${color} text-white shadow-md border-2 border-white ring-2 ring-slate-100`
        : 'bg-slate-100 text-slate-300 border border-slate-200 hover:bg-slate-200 hover:text-slate-400 opacity-40 grayscale'
    }`}
  >
    {icon}
  </button>
);
