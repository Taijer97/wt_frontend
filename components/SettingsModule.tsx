
import React, { useState, useEffect } from 'react';
import { DataService } from '../services/dataService';
import { BackendService } from '../services/backendService';
import { AppConfig, Supplier, Employee, PensionSystem, MarginType, Intermediary, UserRole, TaxRegime, CivilStatus, UserRoleConfig, AppModule, PermissionSet } from '../types';
import { 
  Save, Plus, Trash2, Users, Truck, Settings, DollarSign, 
  Percent, UserCheck, Phone, Mail, MapPin, Briefcase, 
  Pencil, X, Search, CheckCircle, AlertCircle, ListPlus, Tag, ShieldCheck, Landmark,
  LayoutGrid, Scale, CalendarClock, Building, Map, Key, ShieldAlert, Fingerprint, Lock, Eye, EyeOff, ChevronRight,
  ShieldQuestion, AlertTriangle, FileText, Calculator
} from 'lucide-react';
import { fetchRuc } from '../services/rucService';
import { fetchDni } from '../services/dniService';

// --- CUSTOM ALERT COMPONENT ---
const CustomAlert = ({ message, type, onClose }: { message: string, type: 'success' | 'error', onClose: () => void }) => {
    useEffect(() => {
        const timer = setTimeout(onClose, 3000);
        return () => clearTimeout(timer);
    }, [onClose]);

    return (
        <div className="fixed top-6 right-6 z-[200] animate-in slide-in-from-right-8 fade-in duration-300">
            <div className={`bg-[#202020] rounded-xl shadow-2xl flex items-center gap-3 p-4 pr-12 min-w-[280px] border border-white/10 relative overflow-hidden`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${type === 'success' ? 'bg-[#4ade80]' : 'bg-red-500'}`}>
                    {type === 'success' ? <CheckCircle className="w-4 h-4 text-[#202020]" /> : <X className="w-4 h-4 text-[#202020]" />}
                </div>
                <p className="text-white font-medium text-sm">{message}</p>
                <button onClick={onClose} className="absolute right-4 text-slate-400 hover:text-white transition-colors">
                    <X className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
};
// ------------------------------

export const SettingsModule: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'general' | 'catalogo' | 'proveedores' | 'intermediarios' | 'trabajadores' | 'roles'>('general');
    const [config, setConfig] = useState<AppConfig>(DataService.getConfig());
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [intermediaries, setIntermediaries] = useState<Intermediary[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);

    const [isProcessing, setIsProcessing] = useState(false);

    // Búsqueda
    const [searchQuery, setSearchQuery] = useState('');

    // Estados de Edición
    const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
    const [editingIntermediary, setEditingIntermediary] = useState<Intermediary | null>(null);
    const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

    // Visibilidad de Formulario Nuevo
    const [showAddForm, setShowAddForm] = useState(false);
    const [newCategory, setNewCategory] = useState('');

    // Gestión de Roles Dinámica
    const [selectedRoleIndex, setSelectedRoleIndex] = useState(0);
    const [showAddRoleModal, setShowAddRoleModal] = useState(false);
    const [newRoleData, setNewRoleData] = useState({ label: '', id: '' });
    
    // Alertas
    const [alertInfo, setAlertInfo] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

    // Provide the setter to children context or handlers
    const showAlert = (message: string, type: 'success' | 'error') => setAlertInfo({ message, type });

    useEffect(() => {
        refreshData();
    }, []);

    const refreshData = async () => {
        try {
            const roles = await BackendService.getRoles();
            const roleConfigs = roles.map((r: any) => {
                let parsedPerms = r.permissions;
                if (typeof parsedPerms === 'string') {
                    try { parsedPerms = JSON.parse(parsedPerms); } catch (e) { parsedPerms = {}; }
                }
                return {
                    id: r.id,
                    role: r.role || r.name,
                    label: r.label,
                    permissions: parsedPerms || {}
                };
            });
            
            const cfg = await BackendService.getConfig();
            
            // Migrate old productCategories to productCatalog if catalog is empty
            let mergedCatalog = cfg.productCatalog || [];
            if (mergedCatalog.length === 0 && cfg.productCategories && cfg.productCategories.length > 0) {
                mergedCatalog = cfg.productCategories.map((c: string) => ({ category: c, brand: 'SIN MARCA', model: 'GENERICO' }));
            }

            // Merge roles from DB into config state
            setConfig({
                ...cfg,
                productCategories: cfg.productCategories || [],
                productCatalog: mergedCatalog,
                roleConfigs: roleConfigs.length > 0 ? roleConfigs : DataService.getConfig().roleConfigs
            });
            
            // Fetch other data
            try {
                const sups = await BackendService.getSuppliers();
                setSuppliers(sups.map((s: any) => ({
                    id: String(s.id),
                    ruc: s.ruc,
                    razonSocial: s.name,
                    shortName: s.short_name || '',
                    contactName: s.contact || '',
                    phone: s.phone || '',
                    email: s.email || '',
                    address: s.address || '',
                    department: s.department || '',
                    province: s.province || '',
                    district: s.district || '',
                    category: s.category || 'MAYORISTA'
                })));
            } catch { setSuppliers(DataService.getSuppliers()); }
            
            try {
                const inters = await BackendService.getIntermediaries();
                setIntermediaries(inters);
            } catch { setIntermediaries(DataService.getIntermediaries()); }
            
            try {
                const emps = await BackendService.getEmployees();
                setEmployees(emps);
            } catch { setEmployees(DataService.getEmployees()); }
            
        } catch {
            const currentConfig = DataService.getConfig();
            setConfig(currentConfig);
        }
    };

    const handleSaveConfig = async () => {
        setIsProcessing(true);
        try {
            // Save general config
            const payload = {
                ...config,
                productCategories: Array.from(new Set(config.productCatalog?.map(c => c.category) || [])),
                productCatalog: config.productCatalog || [],
                // Don't send roleConfigs here as they are managed via separate endpoints
            };
            const saved = await BackendService.updateConfig(payload);
            DataService.saveConfig(saved);
            
            // Save active role permissions
            const currentRole = config.roleConfigs[selectedRoleIndex];
            if (currentRole && currentRole.id) {
                 await BackendService.updateRole(String(currentRole.id), {
                     name: currentRole.role,
                     label: currentRole.label,
                     permissions: currentRole.permissions
                 });
            }
            
            // Ya no usamos alert aquí, lo maneja el botón o un setAlertInfo global si es necesario
            refreshData();
            showAlert('Configuración Guardada', 'success');
        } catch {
            DataService.saveConfig(config);
            showAlert('Guardado local (offline)', 'success');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleAddCategory = () => {
        const trimName = newCategory.trim();
        if (!trimName) return;
        const currentCats = config.productCategories || [];
        if (currentCats.some(c => c.toLowerCase() === trimName.toLowerCase())) {
            showAlert('Esta categoría ya existe.', 'error');
            return;
        }
        const updatedCategories = [...currentCats, trimName];
        setConfig({ ...config, productCategories: updatedCategories });
        setNewCategory('');
    };

    const handleRemoveCategory = (cat: string) => {
        const currentCats = config.productCategories || [];
        const updatedCategories = currentCats.filter(c => c !== cat);
        setConfig({ ...config, productCategories: updatedCategories });
    };

    const handleRegimeChange = (target: 'ruc10' | 'ruc20', regime: TaxRegime) => {
        // Ajuste automático de tasa de renta según régimen (valores referenciales)
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

    // --- MANEJADORES DE ROLES DINÁMICOS ---

    const handleCreateRole = async () => {
        if (!newRoleData.label || !newRoleData.id) {
            showAlert('Nombre y código requeridos.', 'error');
            return;
        }
        const roleId = newRoleData.id.toUpperCase().trim();
        if (config.roleConfigs.some(r => r.id === roleId || r.role === roleId)) {
            showAlert('Este código de rol ya existe.', 'error');
            return;
        }
        
        setIsProcessing(true);
        try {
            await BackendService.createRole({
                name: roleId,
                label: newRoleData.label
            });
            setShowAddRoleModal(false);
            setNewRoleData({ label: '', id: '' });
            
            await refreshData();
            
            showAlert('Rol creado exitosamente.', 'success');
        } catch {
            showAlert('Error al crear el rol en el backend.', 'error');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDeleteRole = async (idx: number, e: React.MouseEvent) => {
        e.stopPropagation();
        const roleToDelete = config.roleConfigs[idx];
        if (roleToDelete.role === 'ADMIN') return showAlert('No se puede eliminar el rol ADMIN.', 'error');
        if (confirm(`¿Eliminar el rol "${roleToDelete.label}"?`)) {
            try {
                if (roleToDelete.id) {
                    await BackendService.deleteRole(String(roleToDelete.id));
                    await refreshData();
                    setSelectedRoleIndex(0);
                    showAlert('Rol eliminado.', 'success');
                }
            } catch {
                showAlert('Error al eliminar el rol.', 'error');
            }
        }
    };

    const handleTogglePermission = (module: AppModule, action: keyof PermissionSet) => {
        const updatedRoles = [...config.roleConfigs];
        if (!updatedRoles[selectedRoleIndex]) return;
        
        // Deep copy the specific role to trigger React state update correctly
        const role = JSON.parse(JSON.stringify(updatedRoles[selectedRoleIndex]));
        
        if (!role.permissions) {
            role.permissions = {} as Record<AppModule, PermissionSet>;
        }
        if (!role.permissions[module]) {
            role.permissions[module] = { create: false, read: false, update: false, delete: false };
        }
        
        role.permissions[module][action] = !role.permissions[module][action];
        updatedRoles[selectedRoleIndex] = role;
        
        setConfig({ ...config, roleConfigs: updatedRoles });
    };

    // --- MANEJADORES CRUD ESTÁNDAR ---
    const handleSaveSupplier = async (s: Supplier) => { 
        setIsProcessing(true);
        try {
            if (editingSupplier) {
                await BackendService.updateSupplier(s.id, {
                    name: s.razonSocial, short_name: s.shortName, contact: s.contactName, category: s.category,
                    department: s.department, province: s.province, district: s.district,
                    address: s.address, phone: s.phone
                });
            } else {
                await BackendService.createSupplier({
                    name: s.razonSocial, short_name: s.shortName, ruc: s.ruc, contact: s.contactName, 
                    category: s.category, department: s.department, province: s.province, district: s.district,
                    address: s.address, phone: s.phone
                } as any);
            }
            await refreshData(); setEditingSupplier(null); setShowAddForm(false);
            showAlert('Proveedor Guardado', 'success');
        } catch {
            showAlert('Error al guardar proveedor', 'error');
        } finally {
            setIsProcessing(false);
        }
    };
    const handleDeleteSupplier = async (id: string) => { 
        if (confirm('¿Eliminar proveedor?')) { 
            await BackendService.deleteSupplier(id); 
            await refreshData(); 
            showAlert('Proveedor Eliminado', 'success');
        }
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
            showAlert('Intermediario Guardado', 'success');
        } catch {
            showAlert('Error al guardar intermediario', 'error');
        } finally {
            setIsProcessing(false);
        }
    };
    const handleDeleteIntermediary = async (id: string) => { 
        if (confirm('¿Eliminar intermediario?')) { 
            await BackendService.deleteIntermediary(id); 
            await refreshData(); 
            showAlert('Intermediario Eliminado', 'success');
        }
    };
    const handleSaveEmployee = async (e: Employee) => { 
        setIsProcessing(true);
        try {
            if (editingEmployee) {
                const saved = await BackendService.updateEmployee(e.id, { 
                    fullName: e.fullName, phone: e.phone, email: e.email, address: e.address,
                    baseSalary: e.baseSalary, pensionSystem: e.pensionSystem, hasChildren: e.hasChildren, role: e.role
                });
            } else {
                const saved = await BackendService.createEmployee({ 
                    fullName: e.fullName, docNumber: e.docNumber, phone: e.phone, email: e.email, address: e.address,
                    baseSalary: e.baseSalary, pensionSystem: e.pensionSystem, hasChildren: e.hasChildren, role: e.role,
                    password: e.password || '123456'
                });
            }
            setEditingEmployee(null); setShowAddForm(false); await refreshData(); 
            showAlert('Colaborador Guardado', 'success');
        } catch {
            DataService.saveEmployee(e); 
            setEditingEmployee(null); setShowAddForm(false); 
            await refreshData();
            showAlert('Guardado local (offline)', 'success');
        } finally {
            setIsProcessing(false);
        }
    };
    const handleDeleteEmployee = async (id: string) => { 
        if (confirm('¿Eliminar trabajador?')) { 
            try {
                await BackendService.deleteEmployee(id); 
                await refreshData();
                showAlert('Colaborador Eliminado', 'success');
            } catch {
                DataService.deleteEmployee(id); 
                refreshData(); 
                showAlert('Colaborador Eliminado', 'success');
            }
        } 
    };

    const modulesList: { id: AppModule, label: string }[] = [
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

    return (
        <div className="space-y-6 animate-fade-in pb-10">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex space-x-1 bg-gray-200 p-1 rounded-xl shadow-inner overflow-x-auto w-full md:w-auto">
                    <button onClick={() => { setActiveTab('general'); setShowAddForm(false); }} className={`px-4 md:px-6 py-2.5 text-[10px] md:text-xs font-black uppercase tracking-widest rounded-lg transition-all ${activeTab === 'general' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-600 hover:text-slate-800'}`}>General</button>
                    <button onClick={() => { setActiveTab('catalogo'); setShowAddForm(false); }} className={`px-4 md:px-6 py-2.5 text-[10px] md:text-xs font-black uppercase tracking-widest rounded-lg transition-all ${activeTab === 'catalogo' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-600 hover:text-slate-800'}`}>Catálogo</button>
                    <button onClick={() => { setActiveTab('proveedores'); setShowAddForm(false); }} className={`px-4 md:px-6 py-2.5 text-[10px] md:text-xs font-black uppercase tracking-widest rounded-lg transition-all ${activeTab === 'proveedores' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-600 hover:text-slate-800'}`}>Proveedores</button>
                    <button onClick={() => { setActiveTab('intermediarios'); setShowAddForm(false); }} className={`px-4 md:px-6 py-2.5 text-[10px] md:text-xs font-black uppercase tracking-widest rounded-lg transition-all ${activeTab === 'intermediarios' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-600 hover:text-slate-800'}`}>Intermediarios</button>
                    <button onClick={() => { setActiveTab('trabajadores'); setShowAddForm(false); }} className={`px-4 md:px-6 py-2.5 text-[10px] md:text-xs font-black uppercase tracking-widest rounded-lg transition-all ${activeTab === 'trabajadores' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-600 hover:text-slate-800'}`}>Colaboradores</button>
                    <button onClick={() => { setActiveTab('roles'); setShowAddForm(false); }} className={`px-4 md:px-6 py-2.5 text-[10px] md:text-xs font-black uppercase tracking-widest rounded-lg transition-all ${activeTab === 'roles' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-600 hover:text-slate-800'}`}>Roles & Accesos</button>
                </div>
                {['proveedores', 'intermediarios', 'trabajadores'].includes(activeTab) && (
                    <button onClick={() => setShowAddForm(true)} className="bg-emerald-600 text-white px-6 py-3 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-emerald-700 transition-all shadow-xl active:scale-95"><Plus className="w-4 h-4 mr-2 inline" /> Nuevo</button>
                )}
            </div>

            <div className="bg-white rounded-[2.5rem] shadow-sm border-2 border-gray-100 overflow-hidden min-h-[600px]">
                {activeTab === 'general' && (
                    <div className="p-10 space-y-12">
                        {/* SECCIÓN 1: IDENTIDAD Y VARIABLES */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                            <div className="space-y-6">
                                <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-widest border-b-2 pb-2 flex items-center gap-2">
                                    <Building className="w-4 h-4 text-blue-600"/> Identidad Corporativa (RUC 20)
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div className="md:col-span-2">
                                        <label className="block text-[10px] font-black text-slate-700 uppercase mb-2">Razón Social</label>
                                        <input value={config.companyName} onChange={e => setConfig({...config, companyName: e.target.value.toUpperCase()})} className="w-full border-2 border-gray-100 rounded-xl p-3 bg-slate-50 text-slate-900 font-black focus:bg-white focus:border-blue-500 outline-none uppercase" />
                                    </div>
                                    <div><label className="block text-[10px] font-black text-slate-700 uppercase mb-2">Número de RUC</label><input value={config.companyRuc} onChange={e => setConfig({...config, companyRuc: e.target.value.toUpperCase()})} className="w-full border-2 border-gray-100 rounded-xl p-3 bg-slate-50 text-slate-900 font-black font-mono" /></div>
                                    <div><label className="block text-[10px] font-black text-slate-700 uppercase mb-2">Teléfono</label><input value={config.companyPhone} onChange={e => setConfig({...config, companyPhone: e.target.value.toUpperCase()})} className="w-full border-2 border-gray-100 rounded-xl p-3 bg-slate-50 text-slate-900 font-black" /></div>
                                </div>
                                <div className="space-y-5">
                                    <div><label className="block text-[10px] font-black text-slate-700 uppercase mb-2">Dirección Fiscal</label><input value={config.companyAddress} onChange={e => setConfig({...config, companyAddress: e.target.value.toUpperCase()})} className="w-full border-2 border-gray-100 rounded-xl p-3 bg-slate-50 text-slate-900 font-black" /></div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                        <div><label className="block text-[10px] font-black text-slate-700 uppercase mb-2">Departamento</label><input value={config.companyDepartment} onChange={e => setConfig({...config, companyDepartment: e.target.value.toUpperCase()})} className="w-full border-2 border-gray-100 rounded-xl p-3 bg-slate-50 text-slate-900 font-black" /></div>
                                        <div><label className="block text-[10px] font-black text-slate-700 uppercase mb-2">Provincia</label><input value={config.companyProvince} onChange={e => setConfig({...config, companyProvince: e.target.value.toUpperCase()})} className="w-full border-2 border-gray-100 rounded-xl p-3 bg-slate-50 text-slate-900 font-black" /></div>
                                        <div><label className="block text-[10px] font-black text-slate-700 uppercase mb-2">Distrito</label><input value={config.companyDistrict} onChange={e => setConfig({...config, companyDistrict: e.target.value.toUpperCase()})} className="w-full border-2 border-gray-100 rounded-xl p-3 bg-slate-50 text-slate-900 font-black" /></div>
                                    </div>
                                    <div><label className="block text-[10px] font-black text-slate-700 uppercase mb-2">Correo Corporativo</label><input type="email" value={config.companyEmail} onChange={e => setConfig({...config, companyEmail: e.target.value.toUpperCase()})} className="w-full border-2 border-gray-100 rounded-xl p-3 bg-slate-50 text-slate-900 font-black" /></div>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-widest border-b-2 pb-2 flex items-center gap-2">
                                    {/* Fix: Added missing Calculator icon import */}
                                    <Calculator className="w-4 h-4 text-emerald-600"/> Variables de Referencia
                                </h3>
                                <div className="grid grid-cols-2 gap-5">
                                    <div><label className="block text-[10px] font-black text-slate-700 uppercase mb-2">UIT Vigente (S/)</label><input type="number" value={config.uit} onChange={e => setConfig({...config, uit: Number(e.target.value)})} className="w-full border-2 border-gray-100 rounded-xl p-3 bg-slate-50 text-slate-900 font-black" /></div>
                                    <div><label className="block text-[10px] font-black text-slate-700 uppercase mb-2">RMV (Sueldo Mín.)</label><input type="number" value={config.rmv} onChange={e => setConfig({...config, rmv: Number(e.target.value)})} className="w-full border-2 border-gray-100 rounded-xl p-3 bg-slate-50 text-slate-900 font-black" /></div>
                                    <div className="col-span-2"><label className="block text-[10px] font-black text-slate-700 uppercase mb-2">Costo Notarial Promedio para Compras RUC 10 (S/)</label><input type="number" value={config.defaultNotaryCost} onChange={e => setConfig({...config, defaultNotaryCost: Number(e.target.value)})} className="w-full border-2 border-gray-100 rounded-xl p-3 bg-slate-50 text-slate-900 font-black" /></div>
                                </div>
                            </div>
                        </div>

                        {/* SECCIÓN 2: REGÍMENES Y MÁRGENES COMERCIALES */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                            <div className="space-y-6">
                                <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-widest border-b-2 pb-2 flex items-center gap-2">
                                    <Scale className="w-4 h-4 text-purple-600"/> Regímenes Tributarios
                                </h3>
                                <div className="grid grid-cols-1 gap-6">
                                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                        <label className="block text-[10px] font-black text-slate-500 uppercase mb-3 tracking-widest text-center">Régimen RUC 20 (Empresa)</label>
                                        <div className="flex gap-2">
                                            {Object.values(TaxRegime).map((reg) => (
                                                <button key={reg} onClick={() => handleRegimeChange('ruc20', reg)} className={`flex-1 py-3 px-2 rounded-xl text-[10px] font-black transition-all ${config.ruc20TaxRegime === reg ? 'bg-slate-900 text-white shadow-lg scale-105' : 'bg-white text-slate-400 border border-slate-200 hover:bg-slate-50'}`}>
                                                    {reg.replace('REGIMEN_', '')}
                                                </button>
                                            ))}
                                        </div>
                                        <p className="text-[9px] text-slate-400 font-bold mt-4 text-center uppercase tracking-tighter">Este cambio ajusta la lógica de declaración anual en el Dashboard.</p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div><label className="block text-[10px] font-black text-slate-700 uppercase mb-2 text-center">Día Declara RUC 10</label><input type="number" value={config.ruc10DeclarationDay} onChange={e => setConfig({...config, ruc10DeclarationDay: Number(e.target.value)})} className="w-full border-2 border-gray-100 rounded-xl p-3 bg-slate-50 text-center font-black" /></div>
                                        <div><label className="block text-[10px] font-black text-slate-700 uppercase mb-2 text-center">Día Declara RUC 20</label><input type="number" value={config.ruc20DeclarationDay} onChange={e => setConfig({...config, ruc20DeclarationDay: Number(e.target.value)})} className="w-full border-2 border-gray-100 rounded-xl p-3 bg-slate-50 text-center font-black" /></div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-widest border-b-2 pb-2 flex items-center gap-2">
                                    <Percent className="w-4 h-4 text-orange-600"/> Rentabilidad Comercial
                                </h3>
                                <div className="space-y-6">
                                    <div className="bg-orange-50 p-6 rounded-3xl border border-orange-100">
                                        <label className="block text-[10px] font-black text-orange-800 uppercase mb-3 tracking-widest">Margen de Transferencia (RUC 10 a RUC 20)</label>
                                        <div className="flex items-center gap-4">
                                            <input type="number" step="0.01" value={config.ruc10MarginType === 'PERCENT' ? config.ruc10Margin * 100 : config.ruc10Margin} onChange={e => setConfig({...config, ruc10Margin: config.ruc10MarginType === 'PERCENT' ? Number(e.target.value)/100 : Number(e.target.value)})} className="flex-1 border-2 border-white rounded-xl p-3 bg-white font-black text-slate-900" />
                                            <select value={config.ruc10MarginType} onChange={e => setConfig({...config, ruc10MarginType: e.target.value as MarginType})} className="bg-slate-900 text-white font-black px-4 py-3 rounded-xl text-xs uppercase">
                                                <option value="PERCENT">% Porcentaje</option>
                                                <option value="FIXED">S/ Monto Fijo</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="bg-blue-50 p-6 rounded-3xl border border-blue-100">
                                        <label className="block text-[10px] font-black text-blue-800 uppercase mb-3 tracking-widest">Margen de Venta Final (RUC 20 a Cliente)</label>
                                        <div className="flex items-center gap-4">
                                            <input type="number" step="0.01" value={config.ruc20SaleMarginType === 'PERCENT' ? config.ruc20SaleMargin * 100 : config.ruc20SaleMargin} onChange={e => setConfig({...config, ruc20SaleMargin: config.ruc20SaleMarginType === 'PERCENT' ? Number(e.target.value)/100 : Number(e.target.value)})} className="flex-1 border-2 border-white rounded-xl p-3 bg-white font-black text-slate-900" />
                                            <select value={config.ruc20SaleMarginType} onChange={e => setConfig({...config, ruc20SaleMarginType: e.target.value as MarginType})} className="bg-slate-900 text-white font-black px-4 py-3 rounded-xl text-xs uppercase">
                                                <option value="PERCENT">% Porcentaje</option>
                                                <option value="FIXED">S/ Monto Fijo</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* SECCIÓN 3: EXONERACIÓN */}
                        <div className="grid grid-cols-1 gap-12 pt-4">
                            <div className="space-y-6">
                                <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-widest border-b-2 pb-2 flex items-center gap-2">
                                    <ShieldCheck className="w-4 h-4 text-emerald-600"/> Configuración de IGV (SUNAT)
                                </h3>
                                <div className={`p-8 rounded-[2rem] border-2 transition-all ${config.isIgvExempt ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-100'}`}>
                                    <div className="flex items-center justify-between mb-6">
                                        <div>
                                            <p className="font-black text-slate-900 uppercase text-xs">Exoneración de IGV</p>
                                            <p className="text-[9px] text-slate-500 font-bold uppercase mt-1">Activar solo si su zona o tipo de bien no grava IGV.</p>
                                        </div>
                                        <button onClick={() => setConfig({...config, isIgvExempt: !config.isIgvExempt})} className={`w-14 h-8 rounded-full relative transition-all shadow-inner border-2 ${config.isIgvExempt ? 'bg-emerald-500 border-emerald-600' : 'bg-slate-300 border-slate-400'}`}>
                                            <div className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow-md transition-all ${config.isIgvExempt ? 'left-6.5 translate-x-6' : 'left-0.5'}`}></div>
                                        </button>
                                    </div>
                                    {config.isIgvExempt && (
                                        <div className="space-y-3 animate-in fade-in duration-300">
                                            <label className="block text-[10px] font-black text-emerald-800 uppercase mb-2">Motivo / Base Legal (Impreso en Factura)</label>
                                            <textarea value={config.igvExemptionReason} onChange={e => setConfig({...config, igvExemptionReason: e.target.value.toUpperCase()})} className="w-full border-2 border-emerald-200 rounded-xl p-4 bg-white text-[11px] font-black text-emerald-900 uppercase min-h-[80px]" placeholder="Ej: Operación Exonerada bajo la Ley N°..." />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end pt-8 border-t-2 border-slate-100">
                            <button 
                                onClick={handleSaveConfig} 
                                disabled={isProcessing}
                                className="bg-slate-900 text-white px-12 py-5 rounded-2xl font-black flex items-center justify-center gap-3 shadow-2xl hover:bg-emerald-600 transition-all active:scale-95 uppercase tracking-widest text-xs border-2 border-slate-800 disabled:opacity-70 disabled:cursor-not-allowed"
                            >
                                {isProcessing ? (
                                    <div className="w-6 h-6 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin"></div>
                                ) : (
                                    <Save className="w-6 h-6 text-emerald-400" /> 
                                )}
                                {isProcessing ? 'Guardando...' : 'Guardar Todos los Cambios'}
                            </button>
                        </div>
                    </div>
                )}

                {activeTab === 'catalogo' && (
                    <CatalogSettings config={config} setConfig={setConfig} handleSaveConfig={handleSaveConfig} />
                )}

                {activeTab === 'roles' && (
                    <div className="p-10 flex flex-col md:flex-row gap-12">
                        {/* Selector de Roles Dinámico */}
                        <div className="w-full md:w-72 space-y-4">
                            <div className="flex justify-between items-center border-b-2 pb-2 mb-6">
                                <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Roles Definidos</h3>
                                <button onClick={() => setShowAddRoleModal(true)} className="p-1.5 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 transition-all shadow-sm" title="Crear Nuevo Rol"><Plus className="w-4 h-4" /></button>
                            </div>
                            <div className="space-y-2 max-h-[450px] overflow-y-auto pr-2 custom-scrollbar">
                                {config.roleConfigs.map((r, idx) => (
                                    <button key={idx} onClick={() => setSelectedRoleIndex(idx)} className={`w-full text-left p-4 rounded-2xl border-2 transition-all flex items-center justify-between group ${selectedRoleIndex === idx ? 'bg-slate-900 border-slate-900 text-white shadow-xl' : 'bg-white border-gray-100 text-slate-600 hover:border-blue-400'}`}>
                                        <div className="flex items-center gap-3 overflow-hidden">
                                            <Fingerprint className={`w-5 h-5 flex-shrink-0 ${selectedRoleIndex === idx ? 'text-emerald-400' : 'text-slate-300'}`} />
                                            <div className="overflow-hidden">
                                                <p className="font-black uppercase text-[10px] tracking-tighter truncate">{r.label}</p>
                                                <p className={`text-[8px] font-bold uppercase tracking-widest ${selectedRoleIndex === idx ? 'text-slate-400' : 'text-slate-300'}`}>{r.role}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {r.role !== 'ADMIN' && (
                                                <Trash2 onClick={(e) => handleDeleteRole(idx, e)} className={`w-4 h-4 text-red-400 hover:text-red-600 transition-colors ${selectedRoleIndex === idx ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`} />
                                            )}
                                            <ChevronRight className={`w-3 h-3 ${selectedRoleIndex === idx ? 'translate-x-1 text-emerald-400' : 'opacity-40'}`} />
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Matriz de Permisos CRUD */}
                        <div className="flex-1">
                            <div className="flex justify-between items-end mb-8">
                                <div>
                                    <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Matriz de Permisos (CRUD)</h3>
                                    <p className="text-xs text-slate-500 font-bold uppercase">Configurando privilegios para: <span className="text-blue-600 font-black">{config.roleConfigs[selectedRoleIndex]?.label || config.roleConfigs[0]?.label || 'Sin roles'}</span></p>
                                </div>
                            </div>

                            <div className="bg-slate-50 rounded-[2rem] border-2 border-slate-100 shadow-inner overflow-hidden">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="bg-slate-900 text-white uppercase text-[9px] font-black tracking-widest">
                                            <th className="px-8 py-5">Módulo del Sistema</th>
                                            <th className="px-4 py-5 text-center">Leer (R)</th>
                                            <th className="px-4 py-5 text-center">Crear (C)</th>
                                            <th className="px-4 py-5 text-center">Editar (U)</th>
                                            <th className="px-4 py-5 text-center">Eliminar (D)</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200">
                                        {modulesList.map((m) => {
                                            const rolePermissions = config.roleConfigs[selectedRoleIndex]?.permissions || {};
                                            const perms = rolePermissions[m.id] || { read: false, create: false, update: false, delete: false };
                                            return (
                                                <tr key={m.id} className="hover:bg_white transition-colors group">
                                                    <td className="px-8 py-5">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-2 h-2 rounded-full bg-slate-300 group-hover:bg-blue-500 transition-colors"></div>
                                                            <span className="font-black text-slate-700 uppercase text-[11px] tracking-tight">{m.label}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-5 text-center"><PermissionToggle active={perms.read} onClick={() => handleTogglePermission(m.id, 'read')} color="bg-emerald-500" icon={<Eye className="w-3 h-3" />} /></td>
                                                    <td className="px-4 py-5 text-center"><PermissionToggle active={perms.create} onClick={() => handleTogglePermission(m.id, 'create')} color="bg-blue-500" icon={<Plus className="w-3 h-3" />} /></td>
                                                    <td className="px-4 py-5 text-center"><PermissionToggle active={perms.update} onClick={() => handleTogglePermission(m.id, 'update')} color="bg-purple-500" icon={<Pencil className="w-3 h-3" />} /></td>
                                                    <td className="px-4 py-5 text-center"><PermissionToggle active={perms.delete} onClick={() => handleTogglePermission(m.id, 'delete')} color="bg-red-500" icon={<Trash2 className="w-3 h-3" />} /></td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                            <div className="mt-10 flex justify-end"><button onClick={handleSaveConfig} className="bg-slate-900 text-white px-10 py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-2xl hover:bg-blue-700 transition-all flex items-center gap-3"><Lock className="w-4 h-4 text-emerald-400" /> Guardar Matriz de Roles</button></div>
                        </div>
                    </div>
                )}

                {/* TABLAS DE LISTADOS CRUD (PROVEEDORES, INTERMEDIARIOS, TRABAJADORES) */}
                {['proveedores', 'intermediarios', 'trabajadores'].includes(activeTab) && (
                    <div className="overflow-x-auto">
                        <div className="p-6 bg-slate-50 border-b border-gray-100 flex justify-between items-center">
                             <div className="relative max-w-md w-full">
                                <Search className="absolute left-3 top-3 text-slate-400 w-4 h-4" />
                                <input type="text" placeholder={`Filtrar en ${activeTab}...`} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value.toUpperCase())} className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-900 uppercase" />
                             </div>
                             <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total: {activeTab === 'proveedores' ? suppliers.length : activeTab === 'intermediarios' ? intermediaries.length : employees.length}</div>
                        </div>
                        <table className="w-full text-left">
                            <thead className="bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest">
                                <tr>
                                    <th className="px-8 py-5">Identificación</th>
                                    <th className="px-8 py-5">Contacto / Ubicación</th>
                                    <th className="px-8 py-5">Detalles</th>
                                    <th className="px-8 py-5 text-center">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {activeTab === 'proveedores' && suppliers.filter(s => (s.razonSocial || '').toLowerCase().includes(searchQuery.toLowerCase()) || (s.shortName || '').toLowerCase().includes(searchQuery.toLowerCase())).map(s => (
                                    <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-8 py-5">
                                            <div className="font-black text-slate-900 uppercase text-sm">{s.shortName || s.razonSocial}</div>
                                            <div className="text-[10px] font-mono text-blue-600 font-black">RUC: {s.ruc} {s.shortName && <span className="text-slate-400 ml-1">| {s.razonSocial}</span>}</div>
                                        </td>
                                        <td className="px-8 py-5">
                                            <div className="text-xs font-black text-slate-700 uppercase">{s.contactName || '-'}</div>
                                            <div className="flex flex-col gap-1 mt-1">
                                                <div className="text-[10px] text-slate-500 font-bold flex items-center gap-1 uppercase"><Phone className="w-3 h-3 text-slate-400"/> {s.phone || '-'}</div>
                                                {s.email && <div className="text-[10px] text-slate-500 font-bold flex items-center gap-1 lowercase"><Mail className="w-3 h-3 text-slate-400"/> {s.email}</div>}
                                            </div>
                                            <div className="mt-2 border-t border-slate-100 pt-2">
                                                <div className="text-[10px] text-slate-400 font-bold flex items-center gap-1 uppercase"><MapPin className="w-3 h-3 text-slate-300"/> {s.address || '-'}</div>
                                                {(s.department || s.province || s.district) && (
                                                    <div className="text-[9px] text-slate-400 pl-4 mt-0.5 uppercase">{s.district} - {s.province} - {s.department}</div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-8 py-5"><span className="text-[10px] font-black px-3 py-1 rounded-full bg-blue-100 text-blue-700 uppercase border border-blue-200">{s.category}</span></td>
                                        <td className="px-8 py-5"><div className="flex justify-center gap-3"><button onClick={() => setEditingSupplier(s)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl transition-all"><Pencil className="w-4 h-4"/></button><button onClick={() => handleDeleteSupplier(s.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-xl transition-all"><Trash2 className="w-4 h-4"/></button></div></td>
                                    </tr>
                                ))}
                                {activeTab === 'intermediarios' && intermediaries.filter(i => (i.fullName || '').toLowerCase().includes(searchQuery.toLowerCase())).map(i => (
                                    <tr key={i.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-8 py-5"><div className="font-black text-slate-900 uppercase text-sm">{i.fullName}</div><div className="text-[10px] font-mono text-emerald-600 font-black uppercase">DNI: {i.docNumber} {i.rucNumber ? `| RUC 10: ${i.rucNumber}` : ''}</div></td>
                                        <td className="px-8 py-5"><div className="flex items-center gap-1 text-xs font-black text-slate-700 uppercase"><Phone className="w-3 h-3 text-slate-400"/> {i.phone}</div><div className="flex items-center gap-1 text-[10px] text-slate-500 font-bold lowercase"><Mail className="w-3 h-3 text-slate-400"/> {i.email}</div></td>
                                        <td className="px-8 py-5"><div className="text-[10px] text-slate-400 font-black uppercase flex items-center gap-1 max-w-[200px] truncate"><MapPin className="w-3 h-3"/> {i.address}</div></td>
                                        <td className="px-8 py-5"><div className="flex justify-center gap-3"><button onClick={() => setEditingIntermediary(i)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl transition-all"><Pencil className="w-4 h-4"/></button><button onClick={() => handleDeleteIntermediary(i.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-xl transition-all"><Trash2 className="w-4 h-4"/></button></div></td>
                                    </tr>
                                ))}
                                {activeTab === 'trabajadores' && employees.filter(e => (e.fullName || '').toLowerCase().includes(searchQuery.toLowerCase())).map(e => (
                                    <tr key={e.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-8 py-5"><div className="font-black text-slate-900 uppercase text-sm">{e.fullName}</div><div className="text-[10px] font-black uppercase text-slate-500 tracking-tighter">DNI: {e.docNumber}</div></td>
                                        <td className="px-8 py-5"><div className="text-xs font-black text-slate-800 uppercase flex items-center gap-1"><Phone className="w-3 h-3 text-slate-400"/> {e.phone}</div><div className="text-[10px] text-slate-400 font-bold flex items-center gap-1 uppercase"><MapPin className="w-3 h-3 text-slate-300"/> {e.district || '-'}, {e.department || '-'}</div></td>
                                        <td className="px-8 py-5"><div className="text-sm font-black text-blue-600">S/ {e.baseSalary.toFixed(2)}</div><div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{e.role}</div></td>
                                        <td className="px-8 py-5"><div className="flex justify-center gap-3"><button onClick={() => setEditingEmployee(e)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl transition-all"><Pencil className="w-4 h-4"/></button><button onClick={() => handleDeleteEmployee(e.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-xl transition-all"><Trash2 className="w-4 h-4"/></button></div></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* MODAL PARA AÑADIR NUEVO ROL */}
            {showAddRoleModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-md animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="bg-slate-900 p-8 flex justify-between items-center text-white">
                            <h3 className="font-black flex items-center gap-4 uppercase tracking-widest text-[11px]"><ShieldQuestion className="w-6 h-6 text-emerald-400 p-1 bg-emerald-500/20 rounded-lg"/> Nuevo Rol</h3>
                            <button onClick={() => setShowAddRoleModal(false)} className="hover:bg-red-600 p-2 rounded-xl transition-all"><X className="w-6 h-6"/></button>
                        </div>
                        <div className="p-8 space-y-6">
                            <div><label className="block text-[10px] font-black text-slate-500 uppercase mb-2">Nombre Comercial</label><input autoFocus value={newRoleData.label} onChange={e => setNewRoleData({...newRoleData, label: e.target.value.toUpperCase()})} className="w-full border-2 border-slate-100 rounded-xl p-4 bg-slate-50 font-black text-slate-900 focus:bg-white focus:border-blue-500 outline-none uppercase text-sm" placeholder="Ej: Jefe de Ventas" /></div>
                            <div><label className="block text-[10px] font-black text-slate-500 uppercase mb-2">Código ID</label><input value={newRoleData.id} onChange={e => setNewRoleData({...newRoleData, id: e.target.value.toUpperCase().replace(/[^a-zA-Z]/g, '')})} className="w-full border-2 border-slate-100 rounded-xl p-4 bg-slate-50 font-black text-slate-900 focus:bg-white focus:border-emerald-500 outline-none uppercase font-mono text-sm" placeholder="EJ: JEFEVENTAS" /></div>
                            <div className="pt-4 flex gap-4"><button onClick={() => setShowAddRoleModal(false)} className="flex-1 px-6 py-4 border-2 border-slate-100 rounded-2xl font-black text-slate-400 uppercase text-[10px] hover:bg-slate-50 transition-all">Cancelar</button><button onClick={handleCreateRole} className="flex-[2] px-6 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] shadow-xl hover:bg-emerald-600 transition-all active:scale-95">Registrar</button></div>
                        </div>
                    </div>
                </div>
            )}

            {/* MODALES CRUD REGISTROS */}
            {(showAddForm || editingSupplier || editingIntermediary || editingEmployee) && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="bg-slate-900 p-8 flex justify-between items-center text-white">
                            <h3 className="font-black flex items-center gap-4 uppercase tracking-widest text-[10px]">
                                {showAddForm ? <Plus className="w-6 h-6 text-emerald-400 p-1 bg-emerald-500/20 rounded-lg"/> : <Pencil className="w-6 h-6 text-blue-400 p-1 bg-blue-500/20 rounded-lg"/>}
                                {showAddForm ? 'Nuevo Registro' : 'Editar'} : {activeTab.slice(0, -1)}
                            </h3>
                            <button onClick={() => { setShowAddForm(false); setEditingSupplier(null); setEditingIntermediary(null); setEditingEmployee(null); }} className="hover:bg-red-600 p-2 rounded-xl transition-all"><X className="w-6 h-6"/></button>
                        </div>
                        <div className="p-10 max-h-[75vh] overflow-y-auto custom-scrollbar">
                            {activeTab === 'proveedores' && <SupplierForm initialData={editingSupplier || undefined} onSubmit={handleSaveSupplier} onCancel={() => { setShowAddForm(false); setEditingSupplier(null); }} />}
                            {activeTab === 'intermediarios' && <IntermediaryForm initialData={editingIntermediary || undefined} onSubmit={handleSaveIntermediary} onCancel={() => { setShowAddForm(false); setEditingIntermediary(null); }} />}
                            {activeTab === 'trabajadores' && <EmployeeForm initialData={editingEmployee || undefined} onSubmit={handleSaveEmployee} onCancel={() => { setShowAddForm(false); setEditingEmployee(null); }} />}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// Componente Interno para Toggles de Permisos
const PermissionToggle: React.FC<{ active: boolean, onClick: () => void, color: string, icon: React.ReactNode }> = ({ active, onClick, color, icon }) => (
    <button 
        onClick={onClick}
        className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all shadow-sm active:scale-90 ${active ? `${color} text-white shadow-lg border-2 border-white ring-2 ring-slate-100` : 'bg-slate-50 text-slate-300 border-2 border-slate-200 hover:bg-slate-100 hover:text-slate-400 opacity-30 grayscale'}`}
    >
        {icon}
    </button>
);

const CatalogSettings: React.FC<{ config: AppConfig, setConfig: (c: AppConfig) => void, handleSaveConfig: () => void }> = ({ config, setConfig, handleSaveConfig }) => {
    const [newCat, setNewCat] = useState('');
    const [newBrand, setNewBrand] = useState('');
    const [newModel, setNewModel] = useState('');
    const [newCapacity, setNewCapacity] = useState('');
    const [selectedCat, setSelectedCat] = useState('');
    const [selectedBrand, setSelectedBrand] = useState('');
    const [selectedModel, setSelectedModel] = useState('');

    const catalog = config.productCatalog || [];
    
    // Derived lists
    const categories = Array.from(new Set(catalog.map(c => c.category))).sort();
    const brandsForCat = selectedCat ? Array.from(new Set(catalog.filter(c => c.category === selectedCat).map(c => c.brand))).sort() : [];
    const modelsForBrand = (selectedCat && selectedBrand) ? Array.from(new Set(catalog.filter(c => c.category === selectedCat && c.brand === selectedBrand).map(c => c.model))).sort() : [];
    const capacitiesForModel = (selectedCat && selectedBrand && selectedModel) ? catalog.filter(c => c.category === selectedCat && c.brand === selectedBrand && c.model === selectedModel && c.capacity).map(c => c.capacity as string).sort() : [];

    const handleAddCat = () => {
        const val = newCat.trim().toUpperCase();
        if (!val) return;
        if (!categories.includes(val)) {
            const newCatalog = [...catalog, { category: val, brand: 'SIN MARCA', model: 'GENERICO' }];
            const updatedConfig = { ...config, productCatalog: newCatalog, productCategories: Array.from(new Set(newCatalog.map(c => c.category))) };
            setConfig(updatedConfig);
            setSelectedCat(val);
        }
        setNewCat('');
    };

    const handleAddBrand = () => {
        const val = newBrand.trim().toUpperCase();
        if (!val || !selectedCat) return;
        if (!brandsForCat.includes(val)) {
            const newCatalog = [...catalog, { category: selectedCat, brand: val, model: 'GENERICO' }];
            const updatedConfig = { ...config, productCatalog: newCatalog, productCategories: Array.from(new Set(newCatalog.map(c => c.category))) };
            setConfig(updatedConfig);
            setSelectedBrand(val);
        }
        setNewBrand('');
    };

    const handleAddModel = () => {
        const val = newModel.trim().toUpperCase();
        if (!val || !selectedCat || !selectedBrand) return;
        if (!modelsForBrand.includes(val)) {
            const newCatalog = [...catalog, { category: selectedCat, brand: selectedBrand, model: val }];
            const updatedConfig = { ...config, productCatalog: newCatalog, productCategories: Array.from(new Set(newCatalog.map(c => c.category))) };
            setConfig(updatedConfig);
        }
        setNewModel('');
    };

    const handleAddCapacity = () => {
        const val = newCapacity.trim().toUpperCase();
        if (!val || !selectedCat || !selectedBrand || !selectedModel) return;
        if (!capacitiesForModel.includes(val)) {
            // Check if there's an entry without capacity, and update it, otherwise add new
            let newCatalog = [...catalog];
            const existingEntryIndex = newCatalog.findIndex(c => c.category === selectedCat && c.brand === selectedBrand && c.model === selectedModel && !c.capacity);
            if (existingEntryIndex >= 0) {
                newCatalog[existingEntryIndex] = { ...newCatalog[existingEntryIndex], capacity: val };
            } else {
                newCatalog = [...newCatalog, { category: selectedCat, brand: selectedBrand, model: selectedModel, capacity: val }];
            }
            
            const updatedConfig = { ...config, productCatalog: newCatalog, productCategories: Array.from(new Set(newCatalog.map(c => c.category))) };
            setConfig(updatedConfig);
        }
        setNewCapacity('');
    };

    const handleRemoveCat = (cat: string) => {
        if (!confirm('¿Eliminar producto y todas sus marcas/modelos?')) return;
        const newCatalog = catalog.filter(c => c.category !== cat);
        const updatedConfig = { ...config, productCatalog: newCatalog, productCategories: Array.from(new Set(newCatalog.map(c => c.category))) };
        setConfig(updatedConfig);
        if (selectedCat === cat) { setSelectedCat(''); setSelectedBrand(''); setSelectedModel(''); }
    };

    const handleRemoveBrand = (brand: string) => {
        if (!confirm('¿Eliminar marca y todos sus modelos?')) return;
        const newCatalog = catalog.filter(c => !(c.category === selectedCat && c.brand === brand));
        const updatedConfig = { ...config, productCatalog: newCatalog, productCategories: Array.from(new Set(newCatalog.map(c => c.category))) };
        setConfig(updatedConfig);
        if (selectedBrand === brand) { setSelectedBrand(''); setSelectedModel(''); }
    };

    const handleRemoveModel = (model: string) => {
        if (!confirm('¿Eliminar modelo y sus capacidades?')) return;
        const newCatalog = catalog.filter(c => !(c.category === selectedCat && c.brand === selectedBrand && c.model === model));
        const updatedConfig = { ...config, productCatalog: newCatalog, productCategories: Array.from(new Set(newCatalog.map(c => c.category))) };
        setConfig(updatedConfig);
        if (selectedModel === model) { setSelectedModel(''); }
    };

    const handleRemoveCapacity = (capacity: string) => {
        let newCatalog = catalog.filter(c => !(c.category === selectedCat && c.brand === selectedBrand && c.model === selectedModel && c.capacity === capacity));
        // If we removed the last capacity for this model, keep the model entry without capacity
        if (!newCatalog.some(c => c.category === selectedCat && c.brand === selectedBrand && c.model === selectedModel)) {
            newCatalog.push({ category: selectedCat, brand: selectedBrand, model: selectedModel });
        }
        const updatedConfig = { ...config, productCatalog: newCatalog, productCategories: Array.from(new Set(newCatalog.map(c => c.category))) };
        setConfig(updatedConfig);
    };

    const [alertInfo, setAlertInfo] = useState<{message: string, type: 'success' | 'error'} | null>(null);

    const handleSaveConfigAction = async () => {
        try {
            await handleSaveConfig();
            setAlertInfo({ message: 'Configuración de catálogo guardada con éxito', type: 'success' });
            setTimeout(() => setAlertInfo(null), 3000);
        } catch (e) {
            setAlertInfo({ message: 'Error al guardar la configuración', type: 'error' });
            setTimeout(() => setAlertInfo(null), 3000);
        }
    };

    return (
        <div className="p-10 space-y-8 relative">
            {/* Alert Notification */}
            {alertInfo && (
                <div className={`fixed top-6 right-6 z-[100] px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 transition-all animate-in fade-in slide-in-from-top-4 ${
                    alertInfo.type === 'success' ? 'bg-emerald-50 border-2 border-emerald-200 text-emerald-800' : 'bg-red-50 border-2 border-red-200 text-red-800'
                }`}>
                    <div className={`p-2 rounded-xl ${alertInfo.type === 'success' ? 'bg-emerald-100' : 'bg-red-100'}`}>
                        <Save className={`w-5 h-5 ${alertInfo.type === 'success' ? 'text-emerald-600' : 'text-red-600'}`} />
                    </div>
                    <div>
                        <h4 className="font-black text-sm uppercase tracking-wider">{alertInfo.type === 'success' ? '¡Éxito!' : 'Error'}</h4>
                        <p className="text-xs font-bold opacity-80">{alertInfo.message}</p>
                    </div>
                </div>
            )}
            
            <div className="flex justify-between items-end border-b-2 pb-4 border-slate-100">
                <div>
                    <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-3"><Tag className="w-6 h-6 text-emerald-600"/> Catálogo de Equipos</h3>
                    <p className="text-xs text-slate-500 font-bold uppercase mt-1">Gestione la relación entre Productos, Marcas, Modelos y Capacidades.</p>
                </div>
                <button onClick={() => { handleSaveConfigAction(); }} className="bg-slate-900 text-white px-6 py-3 rounded-xl font-black flex items-center justify-center gap-2 shadow-lg hover:bg-emerald-600 transition-all active:scale-95 uppercase tracking-widest text-[10px]">
                    <Save className="w-4 h-4 text-emerald-400" /> Guardar Cambios
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {/* PRODUCTOS */}
                <div className="bg-slate-50 rounded-3xl p-6 border-2 border-slate-100">
                    <h4 className="font-black text-slate-700 uppercase text-[10px] mb-4">1. Productos</h4>
                    <div className="flex gap-2 mb-4">
                        <input value={newCat} onChange={e => setNewCat(e.target.value.toUpperCase())} onKeyPress={e => e.key === 'Enter' && handleAddCat()} placeholder="EJ: LAPTOP..." className="flex-1 border-2 border-white rounded-xl p-2 text-[10px] font-black text-slate-900 focus:border-emerald-500 outline-none uppercase" />
                        <button onClick={handleAddCat} className="bg-slate-900 text-white p-2 rounded-xl hover:bg-emerald-600 transition-all"><Plus className="w-4 h-4"/></button>
                    </div>
                    <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar flex flex-wrap gap-2 items-start content-start">
                        {categories.map(c => (
                            <div key={c} onClick={() => { setSelectedCat(c); setSelectedBrand(''); setSelectedModel(''); }} className={`px-3 py-2 rounded-xl flex items-center gap-2 cursor-pointer border-2 transition-all ${selectedCat === c ? 'bg-emerald-100 border-emerald-400 text-emerald-900' : 'bg-white border-transparent hover:border-slate-200 text-slate-600'}`}>
                                <span className="font-black text-[9px] uppercase">{c}</span>
                                <button onClick={(e) => { e.stopPropagation(); handleRemoveCat(c); }} className="text-slate-300 hover:text-red-500"><X className="w-3 h-3"/></button>
                            </div>
                        ))}
                        {categories.length === 0 && <p className="text-[10px] w-full text-slate-400 font-bold text-center py-4">No hay productos</p>}
                    </div>
                </div>

                {/* MARCAS */}
                <div className="bg-slate-50 rounded-3xl p-6 border-2 border-slate-100 opacity-100 transition-opacity">
                    <h4 className="font-black text-slate-700 uppercase text-[10px] mb-4">2. Marcas {selectedCat && <span className="text-emerald-600">de {selectedCat}</span>}</h4>
                    <div className="flex gap-2 mb-4">
                        <input disabled={!selectedCat} value={newBrand} onChange={e => setNewBrand(e.target.value.toUpperCase())} onKeyPress={e => e.key === 'Enter' && handleAddBrand()} placeholder={selectedCat ? "EJ: HP, LENOVO..." : "Seleccione producto"} className="flex-1 border-2 border-white rounded-xl p-2 text-[10px] font-black text-slate-900 focus:border-blue-500 outline-none uppercase disabled:opacity-50" />
                        <button disabled={!selectedCat} onClick={handleAddBrand} className="bg-slate-900 text-white p-2 rounded-xl hover:bg-blue-600 transition-all disabled:opacity-50"><Plus className="w-4 h-4"/></button>
                    </div>
                    <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar flex flex-wrap gap-2 items-start content-start">
                        {!selectedCat ? <p className="text-[10px] w-full text-slate-400 font-bold text-center py-4">Seleccione un producto</p> :
                            brandsForCat.map(b => (
                                <div key={b} onClick={() => { setSelectedBrand(b); setSelectedModel(''); }} className={`px-3 py-2 rounded-xl flex items-center gap-2 cursor-pointer border-2 transition-all ${selectedBrand === b ? 'bg-blue-100 border-blue-400 text-blue-900' : 'bg-white border-transparent hover:border-slate-200 text-slate-600'}`}>
                                    <span className="font-black text-[9px] uppercase">{b}</span>
                                    {b !== 'SIN MARCA' && <button onClick={(e) => { e.stopPropagation(); handleRemoveBrand(b); }} className="text-slate-300 hover:text-red-500"><X className="w-3 h-3"/></button>}
                                </div>
                            ))
                        }
                    </div>
                </div>

                {/* MODELOS */}
                <div className="bg-slate-50 rounded-3xl p-6 border-2 border-slate-100 transition-opacity">
                    <h4 className="font-black text-slate-700 uppercase text-[10px] mb-4">3. Modelos {selectedBrand && selectedBrand !== 'SIN MARCA' && <span className="text-blue-600">de {selectedBrand}</span>}</h4>
                    <div className="flex gap-2 mb-4">
                        <input disabled={!selectedBrand} value={newModel} onChange={e => setNewModel(e.target.value.toUpperCase())} onKeyPress={e => e.key === 'Enter' && handleAddModel()} placeholder={selectedBrand ? "EJ: PAVILION 15..." : "Seleccione marca"} className="flex-1 border-2 border-white rounded-xl p-2 text-[10px] font-black text-slate-900 focus:border-purple-500 outline-none uppercase disabled:opacity-50" />
                        <button disabled={!selectedBrand} onClick={handleAddModel} className="bg-slate-900 text-white p-2 rounded-xl hover:bg-purple-600 transition-all disabled:opacity-50"><Plus className="w-4 h-4"/></button>
                    </div>
                    <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar flex flex-wrap gap-2 items-start content-start">
                        {!selectedBrand ? <p className="text-[10px] w-full text-slate-400 font-bold text-center py-4">Seleccione una marca</p> :
                            modelsForBrand.map(m => (
                                <div key={m} onClick={() => setSelectedModel(m)} className={`px-3 py-2 rounded-xl flex items-center gap-2 cursor-pointer border-2 transition-all ${selectedModel === m ? 'bg-purple-100 border-purple-400 text-purple-900' : 'bg-white border-transparent hover:border-slate-200 text-slate-600'}`}>
                                    <span className="font-black text-[9px] uppercase text-slate-700">{m}</span>
                                    {m !== 'GENERICO' && <button onClick={(e) => { e.stopPropagation(); handleRemoveModel(m); }} className="text-slate-300 hover:text-red-500"><X className="w-3 h-3"/></button>}
                                </div>
                            ))
                        }
                    </div>
                </div>

                {/* CAPACIDADES */}
                <div className="bg-slate-50 rounded-3xl p-6 border-2 border-slate-100 transition-opacity">
                    <h4 className="font-black text-slate-700 uppercase text-[10px] mb-4">4. Capacidad {selectedModel && selectedModel !== 'GENERICO' && <span className="text-purple-600">de {selectedModel}</span>}</h4>
                    <div className="flex gap-2 mb-4">
                        <input disabled={!selectedModel} value={newCapacity} onChange={e => setNewCapacity(e.target.value.toUpperCase())} onKeyPress={e => e.key === 'Enter' && handleAddCapacity()} placeholder={selectedModel ? "EJ: 256GB..." : "Seleccione modelo"} className="flex-1 border-2 border-white rounded-xl p-2 text-[10px] font-black text-slate-900 focus:border-orange-500 outline-none uppercase disabled:opacity-50" />
                        <button disabled={!selectedModel} onClick={handleAddCapacity} className="bg-slate-900 text-white p-2 rounded-xl hover:bg-orange-600 transition-all disabled:opacity-50"><Plus className="w-4 h-4"/></button>
                    </div>
                    <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar flex flex-wrap gap-2 items-start content-start">
                        {!selectedModel ? <p className="text-[10px] w-full text-slate-400 font-bold text-center py-4">Seleccione un modelo</p> :
                            capacitiesForModel.length === 0 ? <p className="text-[10px] w-full text-slate-400 font-bold text-center py-4">Sin capacidades registradas</p> :
                            capacitiesForModel.map((cap: string) => (
                                <div key={cap} className="bg-white border-2 border-slate-200 px-3 py-2 rounded-xl flex items-center gap-2 group hover:border-red-400 transition-all">
                                    <span className="font-black text-[9px] uppercase text-slate-700">{cap}</span>
                                    <button onClick={() => handleRemoveCapacity(cap)} className="text-slate-300 group-hover:text-red-500"><X className="w-3 h-3"/></button>
                                </div>
                            ))
                        }
                    </div>
                </div>
            </div>
        </div>
    );
};

const SupplierForm: React.FC<{ initialData?: Supplier, onSubmit: (s: Supplier) => void, onCancel: () => void, isProcessing?: boolean }> = ({ initialData, onSubmit, onCancel, isProcessing }) => {
    const [formData, setFormData] = useState<Supplier>(initialData || { 
        id: Date.now().toString(), ruc: '', razonSocial: '', category: 'MAYORISTA' as any, 
        contactName: '', phone: '', address: '', department: '', province: '', district: '', email: ''
    });
    const handleRucBlur = async () => {
        const r = (formData.ruc || '').trim();
        if (!r || r.length !== 11) return;
        try {
            const info = await fetchRuc(r);
            setFormData({
                ...formData,
                razonSocial: info.razonSocial || info.nombreComercial || formData.razonSocial,
                address: info.direccion || formData.address,
                department: info.departamento || formData.department,
                province: info.provincia || formData.province,
                district: info.distrito || formData.district,
            });
        } catch {
            // Error visual ya no interrumpe el flujo
        }
    };
    return (
        <form onSubmit={(e) => { e.preventDefault(); onSubmit(formData); }} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="md:col-span-2 space-y-4">
                    <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest border-b pb-1">Información Fiscal</h4>
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="block text-[10px] font-black text-slate-500 uppercase mb-2">RUC (11 Dígitos)</label><input value={formData.ruc} onChange={e => setFormData({...formData, ruc: e.target.value.toUpperCase()})} onBlur={handleRucBlur} className="w-full border-2 border-slate-100 rounded-xl p-3 bg-slate-50 font-black text-slate-900 focus:bg-white focus:border-blue-500 outline-none" placeholder="20XXXXXXXXX" required maxLength={11} disabled={isProcessing} /></div>
                        <div><label className="block text-[10px] font-black text-slate-500 uppercase mb-2">Etiqueta Corta</label><input value={formData.shortName || ''} onChange={e => setFormData({...formData, shortName: e.target.value.toUpperCase()})} className="w-full border-2 border-slate-100 rounded-xl p-3 bg-slate-50 font-black text-slate-900 uppercase" placeholder="EJ: IMPORTACIONES XYZ" disabled={isProcessing} /></div>
                        <div>
                            <label className="block text-[10px] font-black text-slate-500 uppercase mb-2">Categoría Fiscal</label>
                            <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value as any})} className="w-full border-2 border-slate-100 rounded-xl p-3 bg-slate-50 font-black text-slate-900 uppercase text-xs" disabled={isProcessing}>
                                <option value="MAYORISTA">Importador / Mayorista</option>
                                <option value="RETAIL">Retail / Tienda Local</option>
                                <option value="SERVICIOS">Servicios / Consultoría</option>
                            </select>
                        </div>
                        <div className="col-span-2"><label className="block text-[10px] font-black text-slate-500 uppercase mb-2">Razón Social Completa</label><input value={formData.razonSocial} onChange={e => setFormData({...formData, razonSocial: e.target.value.toUpperCase()})} className="w-full border-2 border-slate-100 rounded-xl p-3 bg-slate-50 font-black text-slate-900 uppercase" placeholder="EMPRESA S.A.C." required disabled={isProcessing} /></div>
                    </div>
                </div>
                <div className="md:col-span-2 space-y-4 mt-2">
                    <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest border-b pb-1">Ubicación y Contacto</h4>
                    <div className="grid grid-cols-3 gap-3">
                        <div><label className="block text-[10px] font-black text-slate-500 uppercase mb-2">Dpto.</label><input value={formData.department} onChange={e => setFormData({...formData, department: e.target.value.toUpperCase()})} className="w-full border-2 border-slate-100 rounded-xl p-3 bg-slate-50 font-black uppercase text-[10px]" disabled={isProcessing} /></div>
                        <div><label className="block text-[10px] font-black text-slate-500 uppercase mb-2">Prov.</label><input value={formData.province} onChange={e => setFormData({...formData, province: e.target.value.toUpperCase()})} className="w-full border-2 border-slate-100 rounded-xl p-3 bg-slate-50 font-black uppercase text-[10px]" disabled={isProcessing} /></div>
                        <div><label className="block text-[10px] font-black text-slate-500 uppercase mb-2">Dist.</label><input value={formData.district} onChange={e => setFormData({...formData, district: e.target.value.toUpperCase()})} className="w-full border-2 border-slate-100 rounded-xl p-3 bg-slate-50 font-black uppercase text-[10px]" disabled={isProcessing} /></div>
                    </div>
                    <div><label className="block text-[10px] font-black text-slate-500 uppercase mb-2">Dirección Fiscal Exacta</label><input value={formData.address} onChange={e => setFormData({...formData, address: e.target.value.toUpperCase()})} className="w-full border-2 border-gray-100 rounded-xl p-3 bg-slate-50 font-black text-xs" disabled={isProcessing} /></div>
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="block text-[10px] font-black text-slate-500 uppercase mb-2">Teléfono</label><input value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value.toUpperCase()})} className="w-full border-2 border-gray-100 rounded-xl p-3 bg-slate-50 font-black text-xs" disabled={isProcessing} /></div>
                        <div><label className="block text-[10px] font-black text-slate-500 uppercase mb-2">Correo</label><input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full border-2 border-gray-100 rounded-xl p-3 bg-slate-50 font-black text-xs" disabled={isProcessing} /></div>
                        <div className="col-span-2"><label className="block text-[10px] font-black text-slate-500 uppercase mb-2">Contacto</label><input value={formData.contactName} onChange={e => setFormData({...formData, contactName: e.target.value.toUpperCase()})} className="w-full border-2 border-gray-100 rounded-xl p-3 bg-slate-50 font-black text-xs uppercase" disabled={isProcessing} /></div>
                    </div>
                </div>
            </div>
            <div className="flex gap-4 pt-6">
                <button type="button" onClick={onCancel} disabled={isProcessing} className="flex-1 px-6 py-4 border-2 border-slate-100 rounded-2xl font-black text-slate-400 uppercase text-xs hover:bg-slate-50 transition-all disabled:opacity-50">Cancelar</button>
                <button type="submit" disabled={isProcessing} className="flex-[2] px-6 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs shadow-xl hover:bg-slate-800 transition-all active:scale-95 disabled:opacity-70 flex items-center justify-center gap-2">
                    {isProcessing ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : null}
                    {isProcessing ? 'Guardando...' : 'Guardar Proveedor'}
                </button>
            </div>
        </form>
    );
};

const IntermediaryForm: React.FC<{ initialData?: Intermediary, onSubmit: (i: Intermediary) => void, onCancel: () => void, isProcessing?: boolean }> = ({ initialData, onSubmit, onCancel, isProcessing }) => {
    const [formData, setFormData] = useState<Intermediary>(initialData || { id: Date.now().toString(), docNumber: '', fullName: '', rucNumber: '', phone: '', email: '', address: '' });
    const [loadingDni, setLoadingDni] = useState(false);
    const handleFetchDni = async (dniRaw?: string) => {
        const dni = (((dniRaw ?? formData.docNumber)) || '').trim();
        if (!dni || dni.length < 8) return;
        try {
            setLoadingDni(true);
            const info = await fetchDni(dni);
            setFormData(f => ({
                ...f,
                fullName: info.fullName || f.fullName,
                address: info.direccion || f.address
            }));
        } finally {
            setLoadingDni(false);
        }
    };
    return (
        <form onSubmit={(e) => { e.preventDefault(); onSubmit(formData); }} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase mb-2">DNI del Intermediario</label>
                    <div className="flex gap-2">
                        <input 
                            value={formData.docNumber} 
                            onChange={e => { 
                                const v = e.target.value.toUpperCase();
                                setFormData({...formData, docNumber: v});
                                if (v.trim().length === 8 && !loadingDni) handleFetchDni(v);
                            }} 
                            onBlur={() => handleFetchDni()} 
                            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleFetchDni(); } }} 
                            className="flex-1 border-2 border-slate-100 rounded-xl p-3 bg-slate-50 font-black text-slate-900 uppercase" 
                            placeholder="8 dígitos" 
                            required 
                            maxLength={8} 
                            disabled={isProcessing}
                        />
                        <button type="button" onClick={() => handleFetchDni()} disabled={isProcessing} className="px-3 rounded-xl border-2 border-slate-200 bg-white hover:bg-slate-50 active:scale-95 transition disabled:opacity-50">
                            <Search className={`w-4 h-4 ${loadingDni ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                </div>
                <div><label className="block text-[10px] font-black text-slate-500 uppercase mb-2">RUC 10 (Opcional)</label><input value={formData.rucNumber} onChange={e => setFormData({...formData, rucNumber: e.target.value.toUpperCase()})} className="w-full border-2 border-slate-100 rounded-xl p-3 bg-slate-50 font-black text-slate-900 uppercase" placeholder="10XXXXXXXXX" maxLength={11} disabled={isProcessing} /></div>
                <div className="md:col-span-2"><label className="block text-[10px] font-black text-slate-500 uppercase mb-2">Nombre y Apellidos</label><input value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value.toUpperCase()})} className="w-full border-2 border-slate-100 rounded-xl p-3 bg-slate-50 font-black text-slate-900 uppercase" required disabled={isProcessing} /></div>
                <div><label className="block text-[10px] font-black text-slate-500 uppercase mb-2">Teléfono</label><input value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value.toUpperCase()})} className="w-full border-2 border-slate-100 rounded-xl p-3 bg-slate-50 font-black uppercase" required disabled={isProcessing} /></div>
                <div><label className="block text-[10px] font-black text-slate-500 uppercase mb-2">Correo</label><input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value.toUpperCase()})} className="w-full border-2 border-slate-100 rounded-xl p-3 bg-slate-50 font-black uppercase" required disabled={isProcessing} /></div>
                <div className="md:col-span-2"><label className="block text-[10px] font-black text-slate-500 uppercase mb-2">Dirección Residencia</label><input value={formData.address} onChange={e => setFormData({...formData, address: e.target.value.toUpperCase()})} className="w-full border-2 border-slate-100 rounded-xl p-3 bg-slate-50 font-black uppercase" required disabled={isProcessing} /></div>
            </div>
            <div className="flex gap-4 pt-6">
                <button type="button" onClick={onCancel} disabled={isProcessing} className="flex-1 px-6 py-4 border-2 border-slate-100 rounded-2xl font-black text-slate-400 uppercase text-xs hover:bg-slate-50 transition-all disabled:opacity-50">Cancelar</button>
                <button type="submit" disabled={isProcessing} className="flex-[2] px-6 py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase text-xs shadow-xl hover:bg-emerald-700 transition-all active:scale-95 disabled:opacity-70 flex items-center justify-center gap-2">
                    {isProcessing ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : null}
                    {isProcessing ? 'Guardando...' : 'Guardar Intermediario'}
                </button>
            </div>
        </form>
    );
};

const EmployeeForm: React.FC<{ initialData?: Employee, onSubmit: (e: Employee) => void, onCancel: () => void, isProcessing?: boolean }> = ({ initialData, onSubmit, onCancel, isProcessing }) => {
    const config = DataService.getConfig();
    const [formData, setFormData] = useState<Employee>(initialData || { 
        id: Date.now().toString(), docNumber: '', fullName: '', phone: '', email: '', 
        address: '', department: '', province: '', district: '', civilStatus: CivilStatus.SOLTERO,
        baseSalary: 1025, pensionSystem: PensionSystem.ONP, hasChildren: false, 
        role: 'USER', jobTitle: 'COLABORADOR', entryDate: new Date().toISOString().split('T')[0],
        password: ''
    });
    const [loadingDni, setLoadingDni] = useState(false);
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [passwordData, setPasswordData] = useState({ oldPassword: '', newPassword: '' });
    const [isChangingPassword, setIsChangingPassword] = useState(false);
    const [passwordError, setPasswordError] = useState('');

    const handleFetchDni = async (dniRaw?: string) => {
        const dni = (((dniRaw ?? formData.docNumber)) || '').trim();
        if (!dni || dni.length < 8) return;
        try {
            setLoadingDni(true);
            const info = await fetchDni(dni);
            const civ = (info.estadoCivil || '').toUpperCase();
            const civMap: Record<string, CivilStatus> = {
                SOLTERO: CivilStatus.SOLTERO,
                CASADO: CivilStatus.CASADO,
                VIUDO: CivilStatus.VIUDO,
                DIVORCIADO: CivilStatus.DIVORCIADO
            };
            setFormData(f => ({
                ...f,
                fullName: info.fullName || f.fullName,
                address: info.direccion || f.address,
                civilStatus: civMap[civ] || f.civilStatus
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
            alert('Contraseña actualizada correctamente');
        } catch (err: any) {
            setPasswordError(err?.response?.data?.detail || 'Error al cambiar contraseña');
        } finally {
            setIsChangingPassword(false);
        }
    };

    return (
        <>
        <form onSubmit={(ev) => { ev.preventDefault(); onSubmit(formData); }} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="md:col-span-2 space-y-4">
                    <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest border-b pb-1">Datos de Cuenta y Perfil</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[10px] font-black text-slate-500 uppercase mb-2">DNI / Usuario</label>
                            <div className="flex gap-2">
                                <input 
                                    value={formData.docNumber} 
                                    onChange={e => { 
                                        const v = e.target.value.toUpperCase();
                                        setFormData({...formData, docNumber: v});
                                        if (v.trim().length === 8 && !loadingDni) handleFetchDni(v);
                                    }} 
                                    onBlur={() => handleFetchDni()}  
                                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleFetchDni(); } }} 
                                    className="flex-1 border-2 border-slate-100 rounded-xl p-3 bg-slate-50 font-black text-slate-900 uppercase" 
                                    required 
                                />
                                <button type="button" onClick={() => handleFetchDni()} className="px-3 rounded-xl border-2 border-slate-200 bg-white hover:bg-slate-50 active:scale-95 transition">
                                    <Search className={`w-4 h-4 ${loadingDni ? 'animate-spin' : ''}`} />
                                </button>
                            </div>
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-slate-500 uppercase mb-2">Rol del Sistema</label>
                            <select value={formData.role} onChange={e => setFormData({...formData, role: e.target.value as UserRole})} className="w-full border-2 border-slate-100 rounded-xl p-3 bg-slate-50 font-black text-slate-900 uppercase text-xs">
                                {config.roleConfigs.map(rc => (
                                    <option key={rc.role} value={rc.role}>{rc.label.toUpperCase()}</option>
                                ))}
                            </select>
                        </div>
                        <div className="md:col-span-2"><label className="block text-[10px] font-black text-slate-500 uppercase mb-2">Nombre Completo</label><input value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value.toUpperCase()})} className="w-full border-2 border-slate-100 rounded-xl p-3 bg-slate-50 font-black text-slate-900 uppercase" required /></div>
                        <div className="md:col-span-2">
                            <label className="block text-[10px] font-black text-slate-500 uppercase mb-2 flex items-center gap-2"> <Key className="w-3 h-3"/> Contraseña Acceso</label>
                            {initialData ? (
                                <button type="button" onClick={() => setShowPasswordModal(true)} className="w-full border-2 border-slate-200 text-slate-700 hover:bg-slate-100 rounded-xl p-3 bg-white font-black transition-colors flex justify-center items-center gap-2 text-xs">
                                    Cambiar Contraseña
                                </button>
                            ) : (
                                <input type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full border-2 border-slate-100 rounded-xl p-3 bg-slate-50 font-black text-slate-900" placeholder="••••••••" required />
                            )}
                        </div>
                        <div><label className="block text-[10px] font-black text-slate-500 uppercase mb-2">Teléfono</label><input value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value.toUpperCase()})} className="w-full border-2 border-slate-100 rounded-xl p-3 bg-slate-50 font-black uppercase" /></div>
                        <div><label className="block text-[10px] font-black text-slate-500 uppercase mb-2">Correo</label><input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value.toUpperCase()})} className="w-full border-2 border-slate-100 rounded-xl p-3 bg-slate-50 font-black uppercase" /></div>
                        <div className="md:col-span-2"><label className="block text-[10px] font-black text-slate-500 uppercase mb-2">Dirección</label><input value={formData.address} onChange={e => setFormData({...formData, address: e.target.value.toUpperCase()})} className="w-full border-2 border-slate-100 rounded-xl p-3 bg-slate-50 font-black uppercase" /></div>
                    </div>
                </div>
                <div className="md:col-span-2 space-y-4 mt-2">
                    <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest border-b pb-1">Información Laboral</h4>
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="block text-[10px] font-black text-slate-500 uppercase mb-2">Sueldo Básico (S/)</label><input type="number" value={formData.baseSalary} onChange={e => setFormData({...formData, baseSalary: Number(e.target.value)})} className="w-full border-2 border-slate-100 rounded-xl p-3 bg-slate-50 font-black text-blue-600 text-lg" required disabled={isProcessing} /></div>
                        <div><label className="block text-[10px] font-black text-slate-500 uppercase mb-2">Pensión</label><select value={formData.pensionSystem} onChange={e => setFormData({...formData, pensionSystem: e.target.value as any})} className="w-full border-2 border-slate-100 rounded-xl p-3 bg-slate-50 font-black uppercase text-xs" disabled={isProcessing}>{Object.values(PensionSystem).map(p => <option key={p} value={p}>{p}</option>)}</select></div>
                    </div>
                </div>
            </div>
            <div className="flex gap-4 pt-6">
                <button type="button" onClick={onCancel} disabled={isProcessing} className="flex-1 px-6 py-4 border-2 border-slate-100 rounded-2xl font-black text-slate-400 uppercase text-xs hover:bg-slate-50 transition-all disabled:opacity-50">Cancelar</button>
                <button type="submit" disabled={isProcessing} className="flex-[2] px-6 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs shadow-xl hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-70 flex items-center justify-center gap-2">
                    {isProcessing ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : null}
                    {isProcessing ? 'Guardando...' : 'Guardar Colaborador'}
                </button>
            </div>
        </form>

        {showPasswordModal && (
            <div className="fixed inset-0 z-[300] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl">
                    <h3 className="text-lg font-black text-slate-900 mb-4 uppercase tracking-widest text-center">Cambiar Contraseña</h3>
                    {passwordError && <p className="text-red-500 text-xs font-bold text-center mb-4">{passwordError}</p>}
                    <form onSubmit={handleChangePassword} className="space-y-4">
                        <div>
                            <label className="block text-[10px] font-black text-slate-500 uppercase mb-2">Contraseña Actual</label>
                            <input type="password" value={passwordData.oldPassword} onChange={e => setPasswordData({...passwordData, oldPassword: e.target.value})} className="w-full border-2 border-slate-100 rounded-xl p-3 bg-slate-50 font-black text-slate-900" placeholder="••••••••" required disabled={isChangingPassword} />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-slate-500 uppercase mb-2">Nueva Contraseña</label>
                            <input type="password" value={passwordData.newPassword} onChange={e => setPasswordData({...passwordData, newPassword: e.target.value})} className="w-full border-2 border-slate-100 rounded-xl p-3 bg-slate-50 font-black text-slate-900" placeholder="••••••••" required disabled={isChangingPassword} minLength={6} />
                        </div>
                        <div className="flex gap-3 pt-4">
                            <button type="button" onClick={() => setShowPasswordModal(false)} disabled={isChangingPassword} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-black uppercase text-[10px] hover:bg-slate-200 disabled:opacity-50">Cancelar</button>
                            <button type="submit" disabled={isChangingPassword} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-black uppercase text-[10px] shadow-lg hover:bg-blue-700 flex items-center justify-center gap-2 disabled:opacity-50">
                                {isChangingPassword ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : null}
                                Actualizar
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        )}
        </>
    );
};
