import React, { useState, useEffect } from 'react';
import { DataService } from '../services/dataService';
import { BackendService } from '../services/backendService';
import { AppConfig, Supplier, Employee, Intermediary, TaxRegime, AppModule, PermissionSet } from '../types';

import { GeneralSettingsTab } from './settings/GeneralSettingsTab';
import { CatalogSettingsTab } from './settings/CatalogSettingsTab';
import { SuppliersSettingsTab } from './settings/SuppliersSettingsTab';
import { IntermediariesSettingsTab } from './settings/IntermediariesSettingsTab';
import { EmployeesSettingsTab } from './settings/EmployeesSettingsTab';
import { RolesSettingsTab } from './settings/RolesSettingsTab';
import { useAlert, Tabs } from './ui';
import { ConfirmModal } from './ui/ConfirmModal';

export const SettingsModule: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'general' | 'catalogo' | 'proveedores' | 'intermediarios' | 'trabajadores' | 'roles'>('general');
  const [config, setConfig] = useState<AppConfig>(DataService.getConfig());
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [intermediaries, setIntermediaries] = useState<Intermediary[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);

  const [isProcessing, setIsProcessing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Editing state
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [editingIntermediary, setEditingIntermediary] = useState<Intermediary | null>(null);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  // Dynamic roles state
  const [selectedRoleIndex, setSelectedRoleIndex] = useState(0);
  const [showAddRoleModal, setShowAddRoleModal] = useState(false);
  const [newRoleData, setNewRoleData] = useState({ label: '', id: '' });

  const alert = useAlert();
  const [confirmDialog, setConfirmDialog] = useState<{ isOpen: boolean; title: string; message: string; variant: 'danger' | 'warning' | 'info'; onConfirm: () => void }>({ isOpen: false, title: '', message: '', variant: 'danger', onConfirm: () => {} });

  useEffect(() => {
    refreshData();
  }, []);

  const refreshData = async () => {
    try {
      const roles = await BackendService.getRoles();
      const roleConfigs = roles.map((r: any) => {
        let parsedPerms = r.permissions;
        if (typeof parsedPerms === 'string') {
          try { parsedPerms = JSON.parse(parsedPerms); } catch { parsedPerms = {}; }
        }
        return {
          id: r.id,
          role: r.role || r.name,
          label: r.label,
          permissions: parsedPerms || {},
        };
      });

      const cfg = await BackendService.getConfig();
      let mergedCatalog = cfg.productCatalog || [];
      if (mergedCatalog.length === 0 && cfg.productCategories && cfg.productCategories.length > 0) {
        mergedCatalog = cfg.productCategories.map((c: string) => ({ category: c, brand: 'SIN MARCA', model: 'GENERICO' }));
      }

      setConfig({
        ...cfg,
        productCategories: cfg.productCategories || [],
        productCatalog: mergedCatalog,
        roleConfigs: roleConfigs.length > 0 ? roleConfigs : DataService.getConfig().roleConfigs,
      });

      try {
        const sups = await BackendService.getSuppliers(true);
        setSuppliers(sups.map((s: any) => ({
          id: String(s.id),
          ruc: s.ruc,
          razonSocial: s.razonSocial || s.name,
          shortName: s.shortName || s.short_name || '',
          contactName: s.contactName || s.contact || '',
          phone: s.phone || '',
          email: s.email || '',
          address: s.address || '',
          department: s.department || '',
          province: s.province || '',
          district: s.district || '',
          category: s.category || 'MAYORISTA',
        })));
      } catch {
        setSuppliers(DataService.getSuppliers());
      }

      try {
        const inters = await BackendService.getIntermediaries();
        setIntermediaries(inters);
      } catch {
        setIntermediaries(DataService.getIntermediaries());
      }

      try {
        const emps = await BackendService.getEmployees();
        setEmployees(emps);
      } catch {
        setEmployees(DataService.getEmployees());
      }
    } catch {
      setConfig(DataService.getConfig());
    }
  };

  const handleSaveConfig = async () => {
    setIsProcessing(true);
    try {
      const payload = {
        ...config,
        productCategories: Array.from(new Set(config.productCatalog?.map((c) => c.category) || [])),
        productCatalog: config.productCatalog || [],
      };
      const saved = await BackendService.updateConfig(payload);
      DataService.saveConfig(saved);

      const currentRole = config.roleConfigs[selectedRoleIndex];
      if (currentRole && currentRole.id) {
        await BackendService.updateRole(String(currentRole.id), {
          name: currentRole.role,
          label: currentRole.label,
          permissions: currentRole.permissions,
        });
      }

      refreshData();
      alert.success('Configuración Guardada');
    } catch {
      DataService.saveConfig(config);
      alert.success('Guardado local (offline)');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRegimeChange = (target: 'ruc10' | 'ruc20', regime: TaxRegime) => {
    let newRentaRate = config.rentaRate;
    if (regime === TaxRegime.RER) newRentaRate = 0.015;
    if (regime === TaxRegime.RMT) newRentaRate = 0.010;
    if (regime === TaxRegime.RGT) newRentaRate = 0.015;

    if (target === 'ruc10') {
      setConfig({ ...config, ruc10TaxRegime: regime });
    } else {
      setConfig({ ...config, ruc20TaxRegime: regime, rentaRate: newRentaRate });
    }
  };

  const handleCreateRole = async () => {
    if (!newRoleData.label || !newRoleData.id) {
      alert.error('Nombre y código requeridos.');
      return;
    }
    const roleId = newRoleData.id.toUpperCase().trim();
    if (config.roleConfigs.some((r) => r.id === roleId || r.role === roleId)) {
      alert.error('Este código de rol ya existe.');
      return;
    }

    setIsProcessing(true);
    try {
      await BackendService.createRole({
        name: roleId,
        label: newRoleData.label,
      });
      setShowAddRoleModal(false);
      setNewRoleData({ label: '', id: '' });
      await refreshData();
      alert.success('Rol creado exitosamente.');
    } catch {
      alert.error('Error al crear el rol en el backend.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteRole = async (idx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const roleToDelete = config.roleConfigs[idx];
    if (roleToDelete.role === 'ADMIN') return alert.error('No se puede eliminar el rol ADMIN.');
    setConfirmDialog({
      isOpen: true,
      title: 'Eliminar Rol',
      message: `¿Eliminar el rol "${roleToDelete.label}"? Esta acción no se puede deshacer.`,
      variant: 'danger',
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        try {
          if (roleToDelete.id) {
            await BackendService.deleteRole(String(roleToDelete.id));
            await refreshData();
            setSelectedRoleIndex(0);
            alert.success('Rol eliminado.');
          }
        } catch {
          alert.error('Error al eliminar el rol.');
        }
      }
    });
  };

  const handleTogglePermission = (module: AppModule, action: keyof PermissionSet) => {
    const updatedRoles = [...config.roleConfigs];
    if (!updatedRoles[selectedRoleIndex]) return;

    const role = JSON.parse(JSON.stringify(updatedRoles[selectedRoleIndex]));
    if (!role.permissions) role.permissions = {} as Record<AppModule, PermissionSet>;
    if (!role.permissions[module]) role.permissions[module] = { create: false, read: false, update: false, delete: false };

    role.permissions[module][action] = !role.permissions[module][action];
    updatedRoles[selectedRoleIndex] = role;

    setConfig({ ...config, roleConfigs: updatedRoles });
  };

  const handleSaveSupplier = async (s: Supplier) => {
    setIsProcessing(true);
    try {
      if (editingSupplier) {
        await BackendService.updateSupplier(s.id, {
          name: s.razonSocial, short_name: s.shortName, contact: s.contactName, category: s.category,
          department: s.department, province: s.province, district: s.district,
          address: s.address, phone: s.phone,
        });
      } else {
        await BackendService.createSupplier({
          name: s.razonSocial, short_name: s.shortName, ruc: s.ruc, contact: s.contactName,
          category: s.category, department: s.department, province: s.province, district: s.district,
          address: s.address, phone: s.phone,
        } as any);
      }
      await refreshData(); setEditingSupplier(null); setShowAddForm(false);
      alert.success('Proveedor Guardado');
    } catch {
      alert.error('Error al guardar proveedor');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteSupplier = async (id: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Eliminar Proveedor',
      message: '¿Eliminar proveedor? Esta acción es irreversible.',
      variant: 'danger',
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        await BackendService.deleteSupplier(id);
        await refreshData();
        alert.success('Proveedor Eliminado');
      }
    });
  };

  const handleSaveIntermediary = async (i: Intermediary) => {
    setIsProcessing(true);
    try {
      if (editingIntermediary) {
        await BackendService.updateIntermediary(i.id, { name: i.fullName, ruc_number: i.rucNumber || undefined, phone: i.phone || undefined, email: i.email || undefined, address: i.address || undefined });
      } else {
        await BackendService.createIntermediary({ name: i.fullName, doc_number: i.docNumber, ruc_number: i.rucNumber || undefined, phone: i.phone || undefined, email: i.email || undefined, address: i.address || undefined });
      }
      await refreshData(); setEditingIntermediary(null); setShowAddForm(false);
      alert.success('Intermediario Guardado');
    } catch {
      alert.error('Error al guardar intermediario');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteIntermediary = async (id: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Eliminar Intermediario',
      message: '¿Eliminar intermediario? Esta acción es irreversible.',
      variant: 'danger',
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        await BackendService.deleteIntermediary(id);
        await refreshData();
        alert.success('Intermediario Eliminado');
      }
    });
  };

  const handleSaveEmployee = async (e: Employee) => {
    setIsProcessing(true);
    try {
      if (editingEmployee) {
        await BackendService.updateEmployee(e.id, {
          fullName: e.fullName, phone: e.phone, email: e.email, address: e.address,
          baseSalary: e.baseSalary, pensionSystem: e.pensionSystem, hasChildren: e.hasChildren, role: e.role,
        });
      } else {
        await BackendService.createEmployee({
          fullName: e.fullName, docNumber: e.docNumber, phone: e.phone, email: e.email, address: e.address,
          baseSalary: e.baseSalary, pensionSystem: e.pensionSystem, hasChildren: e.hasChildren, role: e.role,
          password: e.password || '123456',
        });
      }
      setEditingEmployee(null); setShowAddForm(false); await refreshData();
      alert.success('Colaborador Guardado');
    } catch {
      DataService.saveEmployee(e);
      setEditingEmployee(null); setShowAddForm(false);
      await refreshData();
      alert.success('Guardado local (offline)');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteEmployee = async (id: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Eliminar Colaborador',
      message: '¿Eliminar trabajador? Esta acción no se puede deshacer.',
      variant: 'danger',
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        try {
          await BackendService.deleteEmployee(id);
          await refreshData();
          alert.success('Colaborador Eliminado');
        } catch {
          DataService.deleteEmployee(id);
          refreshData();
          alert.success('Colaborador Eliminado');
        }
      }
    });
  };

  const modulesList: { id: AppModule; label: string }[] = [
    { id: 'dashboard', label: 'Tablero Principal' },
    { id: 'inventory', label: 'Inventario y Transferencias' },
    { id: 'sales', label: 'Ventas y Facturación' },
    { id: 'purchases_ruc10', label: 'Compras RUC 10 (Persona)' },
    { id: 'purchases_ruc20', label: 'Compras RUC 20 (Empresa)' },
    { id: 'expenses', label: 'Gastos Operativos' },
    { id: 'payroll', label: 'Planillas y RRHH' },
    { id: 'accounting', label: 'SIRE y Contabilidad' },
    { id: 'settings', label: 'Configuración de Sistema' },
  ];

  const tabItems = [
    { id: 'general', label: 'General' },
    { id: 'catalogo', label: 'Catálogo' },
    { id: 'proveedores', label: 'Proveedores' },
    { id: 'intermediarios', label: 'Intermediarios' },
    { id: 'trabajadores', label: 'Colaboradores' },
    { id: 'roles', label: 'Roles & Accesos' },
  ];

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <Tabs
          tabs={tabItems}
          activeTab={activeTab}
          onTabChange={(id) => { setActiveTab(id as any); setShowAddForm(false); }}
          variant="pills"
        />
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden min-h-[500px]">
        {activeTab === 'general' && (
          <GeneralSettingsTab
            config={config}
            setConfig={setConfig}
            onSave={handleSaveConfig}
            isProcessing={isProcessing}
            onRegimeChange={handleRegimeChange}
          />
        )}

        {activeTab === 'catalogo' && (
          <CatalogSettingsTab
            config={config}
            setConfig={setConfig}
            handleSaveConfig={handleSaveConfig}
          />
        )}

        {activeTab === 'proveedores' && (
          <SuppliersSettingsTab
            suppliers={suppliers}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            onSaveSupplier={handleSaveSupplier}
            onDeleteSupplier={handleDeleteSupplier}
            showAddForm={showAddForm}
            setShowAddForm={setShowAddForm}
            editingSupplier={editingSupplier}
            setEditingSupplier={setEditingSupplier}
            isProcessing={isProcessing}
          />
        )}

        {activeTab === 'intermediarios' && (
          <IntermediariesSettingsTab
            intermediaries={intermediaries}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            onSaveIntermediary={handleSaveIntermediary}
            onDeleteIntermediary={handleDeleteIntermediary}
            showAddForm={showAddForm}
            setShowAddForm={setShowAddForm}
            editingIntermediary={editingIntermediary}
            setEditingIntermediary={setEditingIntermediary}
            isProcessing={isProcessing}
          />
        )}

        {activeTab === 'trabajadores' && (
          <EmployeesSettingsTab
            employees={employees}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            onSaveEmployee={handleSaveEmployee}
            onDeleteEmployee={handleDeleteEmployee}
            showAddForm={showAddForm}
            setShowAddForm={setShowAddForm}
            editingEmployee={editingEmployee}
            setEditingEmployee={setEditingEmployee}
            isProcessing={isProcessing}
          />
        )}

        {activeTab === 'roles' && (
          <RolesSettingsTab
            config={config}
            selectedRoleIndex={selectedRoleIndex}
            setSelectedRoleIndex={setSelectedRoleIndex}
            showAddRoleModal={showAddRoleModal}
            setShowAddRoleModal={setShowAddRoleModal}
            newRoleData={newRoleData}
            setNewRoleData={setNewRoleData}
            handleCreateRole={handleCreateRole}
            handleDeleteRole={handleDeleteRole}
            handleTogglePermission={handleTogglePermission}
            handleSaveConfig={handleSaveConfig}
            modulesList={modulesList}
          />
        )}
      </div>

      {/* CONFIRM MODAL */}
      <ConfirmModal
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        variant={confirmDialog.variant}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
        confirmText="Sí, Eliminar"
        cancelText="Cancelar"
      />
    </div>
  );
};
