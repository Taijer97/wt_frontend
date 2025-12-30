
import React, { useState, useEffect } from 'react';
import { DataService } from '../services/dataService';
import { BackendService } from '../services/backendService';
import { AppConfig, Supplier, Employee, PensionSystem, MarginType, Intermediary, UserRole, TaxRegime, CivilStatus, RoleConfig, AppModule, PermissionSet } from '../types';
import { 
  Save, Plus, Trash2, Users, Truck, Settings, DollarSign, 
  Percent, UserCheck, Phone, Mail, MapPin, Briefcase, 
  Pencil, X, Search, CheckCircle, AlertCircle, ListPlus, Tag, ShieldCheck, Landmark,
  LayoutGrid, Scale, CalendarClock, Building, Map, Key, ShieldAlert, Fingerprint, Lock, Eye, EyeOff, ChevronRight,
  ShieldQuestion, AlertTriangle, FileText, Calculator
} from 'lucide-react';
import { fetchRuc } from '../services/rucService';

export const SettingsModule: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'general' | 'proveedores' | 'intermediarios' | 'trabajadores' | 'roles'>('general');
    const [config, setConfig] = useState<AppConfig>(DataService.getConfig());
    
    // Listas
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [intermediaries, setIntermediaries] = useState<Intermediary[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);

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

    useEffect(() => {
        refreshData();
    }, []);

    const refreshData = async () => {
        try {
            const roles = await BackendService.getRoles();
            const roleConfigs = roles.map((r: any) => ({
                id: r.id,
                role: r.name,
                label: r.label,
                permissions: r.permissions
            }));
            
            const cfg = await BackendService.getConfig();
            // Merge roles from DB into config state
            setConfig({
                ...cfg,
                productCategories: cfg.productCategories || [],
                roleConfigs: roleConfigs.length > 0 ? roleConfigs : DataService.getConfig().roleConfigs
            });
            
            // Fetch other data
            try {
                const sups = await BackendService.getSuppliers();
                setSuppliers(sups.map((s: any) => ({
                    id: String(s.id),
                    ruc: s.ruc,
                    razonSocial: s.name,
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
                setIntermediaries(inters.map((i: any) => ({
                    id: String(i.id),
                    fullName: i.name,
                    docNumber: i.doc_number,
                    rucNumber: i.ruc_number || '',
                    phone: i.phone || '',
                    email: i.email || '',
                    address: i.address || ''
                })));
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
        try {
            // Save general config
            const payload = {
                ...config,
                productCategories: config.productCategories || [],
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
            
            alert('Configuración guardada en la base de datos.');
            refreshData();
        } catch {
            DataService.saveConfig(config);
            alert('Guardado local (offline).');
        }
    };

    const handleAddCategory = () => {
        const trimName = newCategory.trim();
        if (!trimName) return;
        const currentCats = config.productCategories || [];
        if (currentCats.some(c => c.toLowerCase() === trimName.toLowerCase())) {
            alert('Esta categoría ya existe.');
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
            alert('Por favor, asigne un nombre y un código al rol.');
            return;
        }
        const roleId = newRoleData.id.toUpperCase().trim();
        if (config.roleConfigs.some(r => r.role === roleId)) {
            alert('Este código de rol ya existe.');
            return;
        }
        const readOnly = (): PermissionSet => ({ create: false, read: true, update: false, delete: false });
        
        try {
            await BackendService.createRole({
                name: roleId,
                label: newRoleData.label,
                permissions: {
                    dashboard: readOnly(), inventory: readOnly(), sales: readOnly(),
                    purchases_ruc10: readOnly(), purchases_ruc20: readOnly(), expenses: readOnly(),
                    payroll: readOnly(), accounting: readOnly(), settings: readOnly(),
                }
            });
            setShowAddRoleModal(false);
            setNewRoleData({ label: '', id: '' });
            await refreshData();
            alert('Rol creado exitosamente.');
        } catch {
            alert('Error al crear el rol en el backend.');
        }
    };

    const handleDeleteRole = async (idx: number, e: React.MouseEvent) => {
        e.stopPropagation();
        const roleToDelete = config.roleConfigs[idx];
        if (roleToDelete.role === 'ADMIN') return alert('No se puede eliminar el rol ADMIN.');
        if (confirm(`¿Eliminar el rol "${roleToDelete.label}"?`)) {
            try {
                if (roleToDelete.id) {
                    await BackendService.deleteRole(String(roleToDelete.id));
                    await refreshData();
                    setSelectedRoleIndex(0);
                }
            } catch {
                alert('Error al eliminar el rol.');
            }
        }
    };

    const handleTogglePermission = (module: AppModule, action: keyof PermissionSet) => {
        const updatedRoles = [...config.roleConfigs];
        const role = updatedRoles[selectedRoleIndex];
        role.permissions[module][action] = !role.permissions[module][action];
        setConfig({ ...config, roleConfigs: updatedRoles });
    };

    // --- MANEJADORES CRUD ESTÁNDAR ---
    const handleSaveSupplier = async (s: Supplier) => { 
        if (editingSupplier) {
            await BackendService.updateSupplier(s.id, {
                name: s.razonSocial, contact: s.contactName, category: s.category,
                department: s.department, province: s.province, district: s.district,
                address: s.address, phone: s.phone
            });
        } else {
            await BackendService.createSupplier({
                name: s.razonSocial, ruc: s.ruc, contact: s.contactName, 
                category: s.category, department: s.department, province: s.province, district: s.district,
                address: s.address, phone: s.phone
            } as any);
        }
        await refreshData(); setEditingSupplier(null); setShowAddForm(false);
    };
    const handleDeleteSupplier = async (id: string) => { 
        if (confirm('¿Eliminar proveedor?')) { await BackendService.deleteSupplier(id); await refreshData(); }
    };
    const handleSaveIntermediary = async (i: Intermediary) => { 
        if (editingIntermediary) {
            await BackendService.updateIntermediary(i.id, { name: i.fullName, ruc_number: i.rucNumber || undefined, phone: i.phone || undefined, email: i.email || undefined, address: i.address || undefined });
        } else {
            await BackendService.createIntermediary({ name: i.fullName, doc_number: i.docNumber, ruc_number: i.rucNumber || undefined, phone: i.phone || undefined, email: i.email || undefined, address: i.address || undefined });
        }
        await refreshData(); setEditingIntermediary(null); setShowAddForm(false);
    };
    const handleDeleteIntermediary = async (id: string) => { 
        if (confirm('¿Eliminar intermediario?')) { await BackendService.deleteIntermediary(id); await refreshData(); }
    };
    const handleSaveEmployee = async (e: Employee) => { 
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
            alert('Colaborador guardado en el backend');
        } catch {
            DataService.saveEmployee(e); 
            setEditingEmployee(null); setShowAddForm(false); 
            await refreshData();
            alert('Guardado local (offline)');
        }
    };
    const handleDeleteEmployee = async (id: string) => { 
        if (confirm('¿Eliminar trabajador?')) { 
            try {
                await BackendService.deleteEmployee(id); 
                await refreshData();
            } catch {
                DataService.deleteEmployee(id); 
                refreshData(); 
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
                                        <input value={config.companyName} onChange={e => setConfig({...config, companyName: e.target.value})} className="w-full border-2 border-gray-100 rounded-xl p-3 bg-slate-50 text-slate-900 font-black focus:bg-white focus:border-blue-500 outline-none uppercase" />
                                    </div>
                                    <div><label className="block text-[10px] font-black text-slate-700 uppercase mb-2">Número de RUC</label><input value={config.companyRuc} onChange={e => setConfig({...config, companyRuc: e.target.value})} className="w-full border-2 border-gray-100 rounded-xl p-3 bg-slate-50 text-slate-900 font-black font-mono" /></div>
                                    <div><label className="block text-[10px] font-black text-slate-700 uppercase mb-2">Teléfono</label><input value={config.companyPhone} onChange={e => setConfig({...config, companyPhone: e.target.value})} className="w-full border-2 border-gray-100 rounded-xl p-3 bg-slate-50 text-slate-900 font-black" /></div>
                                </div>
                                <div className="space-y-5">
                                    <div><label className="block text-[10px] font-black text-slate-700 uppercase mb-2">Dirección Fiscal</label><input value={config.companyAddress} onChange={e => setConfig({...config, companyAddress: e.target.value})} className="w-full border-2 border-gray-100 rounded-xl p-3 bg-slate-50 text-slate-900 font-black" /></div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                        <div><label className="block text-[10px] font-black text-slate-700 uppercase mb-2">Departamento</label><input value={config.companyDepartment} onChange={e => setConfig({...config, companyDepartment: e.target.value})} className="w-full border-2 border-gray-100 rounded-xl p-3 bg-slate-50 text-slate-900 font-black" /></div>
                                        <div><label className="block text-[10px] font-black text-slate-700 uppercase mb-2">Provincia</label><input value={config.companyProvince} onChange={e => setConfig({...config, companyProvince: e.target.value})} className="w-full border-2 border-gray-100 rounded-xl p-3 bg-slate-50 text-slate-900 font-black" /></div>
                                        <div><label className="block text-[10px] font-black text-slate-700 uppercase mb-2">Distrito</label><input value={config.companyDistrict} onChange={e => setConfig({...config, companyDistrict: e.target.value})} className="w-full border-2 border-gray-100 rounded-xl p-3 bg-slate-50 text-slate-900 font-black" /></div>
                                    </div>
                                    <div><label className="block text-[10px] font-black text-slate-700 uppercase mb-2">Correo Corporativo</label><input type="email" value={config.companyEmail} onChange={e => setConfig({...config, companyEmail: e.target.value})} className="w-full border-2 border-gray-100 rounded-xl p-3 bg-slate-50 text-slate-900 font-black" /></div>
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

                        {/* SECCIÓN 3: EXONERACIÓN Y CATEGORÍAS */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 pt-4">
                            <div className="space-y-6">
                                <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-widest border-b-2 pb-2 flex items-center gap-2">
                                    <Tag className="w-4 h-4 text-emerald-600"/> Categorías de Inventario
                                </h3>
                                <div className="space-y-4">
                                    <div className="flex gap-2">
                                        <input value={newCategory} onChange={e => setNewCategory(e.target.value)} placeholder="Nueva categoría..." className="flex-1 border-2 border-gray-100 rounded-xl p-3 bg-slate-50 font-bold" onKeyPress={e => e.key === 'Enter' && handleAddCategory()} />
                                        <button onClick={handleAddCategory} className="bg-slate-900 text-white px-6 rounded-xl hover:bg-blue-600 transition-all active:scale-95 shadow-lg"><Plus className="w-5 h-5"/></button>
                                    </div>
                                    <div className="flex flex-wrap gap-2 p-6 bg-slate-50 rounded-3xl border border-slate-100 shadow-inner max-h-[150px] overflow-y-auto custom-scrollbar">
                                        {config.productCategories.map((cat, idx) => (
                                            <div key={idx} className="bg-white border-2 border-slate-200 px-4 py-1.5 rounded-full flex items-center gap-3 group hover:border-red-400 transition-all">
                                                <span className="text-[10px] font-black text-slate-700 uppercase">{cat}</span>
                                                <button onClick={() => handleRemoveCategory(cat)} className="text-slate-300 group-hover:text-red-500 transition-colors"><X className="w-3 h-3"/></button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

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
                                            <textarea value={config.igvExemptionReason} onChange={e => setConfig({...config, igvExemptionReason: e.target.value})} className="w-full border-2 border-emerald-200 rounded-xl p-4 bg-white text-[11px] font-black text-emerald-900 uppercase min-h-[80px]" placeholder="Ej: Operación Exonerada bajo la Ley N°..." />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end pt-8 border-t-2 border-slate-100">
                            <button onClick={handleSaveConfig} className="bg-slate-900 text-white px-12 py-5 rounded-2xl font-black flex items-center justify-center gap-3 shadow-2xl hover:bg-emerald-600 transition-all active:scale-95 uppercase tracking-widest text-xs border-2 border-slate-800">
                                <Save className="w-6 h-6 text-emerald-400" /> Guardar Todos los Cambios
                            </button>
                        </div>
                    </div>
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
                                            const perms = config.roleConfigs[selectedRoleIndex]?.permissions[m.id] || { create: false, read: false, update: false, delete: false };
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
                                <input type="text" placeholder={`Filtrar en ${activeTab}...`} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-900" />
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
                                {activeTab === 'proveedores' && suppliers.filter(s => s.razonSocial.toLowerCase().includes(searchQuery.toLowerCase())).map(s => (
                                    <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-8 py-5"><div className="font-black text-slate-900 uppercase text-sm">{s.razonSocial}</div><div className="text-[10px] font-mono text-blue-600 font-black">RUC: {s.ruc}</div></td>
                                        <td className="px-8 py-5">
                                            <div className="text-xs font-black text-slate-700 uppercase">{s.contactName || '-'}</div>
                                            <div className="text-[10px] text-slate-500 font-bold flex items-center gap-1 uppercase"><Phone className="w-3 h-3 text-slate-400"/> {s.phone || '-'}</div>
                                            <div className="text-[10px] text-slate-400 font-bold flex items-center gap-1 uppercase"><MapPin className="w-3 h-3 text-slate-300"/> {s.address || `${s.district || '-'}, ${s.province || '-'}, ${s.department || '-'}`}</div>
                                        </td>
                                        <td className="px-8 py-5"><span className="text-[10px] font-black px-3 py-1 rounded-full bg-blue-100 text-blue-700 uppercase border border-blue-200">{s.category}</span></td>
                                        <td className="px-8 py-5"><div className="flex justify-center gap-3"><button onClick={() => setEditingSupplier(s)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl transition-all"><Pencil className="w-4 h-4"/></button><button onClick={() => handleDeleteSupplier(s.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-xl transition-all"><Trash2 className="w-4 h-4"/></button></div></td>
                                    </tr>
                                ))}
                                {activeTab === 'intermediarios' && intermediaries.filter(i => i.fullName.toLowerCase().includes(searchQuery.toLowerCase())).map(i => (
                                    <tr key={i.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-8 py-5"><div className="font-black text-slate-900 uppercase text-sm">{i.fullName}</div><div className="text-[10px] font-mono text-emerald-600 font-black uppercase">DNI: {i.docNumber} {i.rucNumber ? `| RUC 10: ${i.rucNumber}` : ''}</div></td>
                                        <td className="px-8 py-5"><div className="flex items-center gap-1 text-xs font-black text-slate-700 uppercase"><Phone className="w-3 h-3 text-slate-400"/> {i.phone}</div><div className="flex items-center gap-1 text-[10px] text-slate-500 font-bold lowercase"><Mail className="w-3 h-3 text-slate-400"/> {i.email}</div></td>
                                        <td className="px-8 py-5"><div className="text-[10px] text-slate-400 font-black uppercase flex items-center gap-1 max-w-[200px] truncate"><MapPin className="w-3 h-3"/> {i.address}</div></td>
                                        <td className="px-8 py-5"><div className="flex justify-center gap-3"><button onClick={() => setEditingIntermediary(i)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl transition-all"><Pencil className="w-4 h-4"/></button><button onClick={() => handleDeleteIntermediary(i.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-xl transition-all"><Trash2 className="w-4 h-4"/></button></div></td>
                                    </tr>
                                ))}
                                {activeTab === 'trabajadores' && employees.filter(e => e.fullName.toLowerCase().includes(searchQuery.toLowerCase())).map(e => (
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
                            <div><label className="block text-[10px] font-black text-slate-500 uppercase mb-2">Nombre Comercial</label><input autoFocus value={newRoleData.label} onChange={e => setNewRoleData({...newRoleData, label: e.target.value})} className="w-full border-2 border-slate-100 rounded-xl p-4 bg-slate-50 font-black text-slate-900 focus:bg-white focus:border-blue-500 outline-none uppercase text-sm" placeholder="Ej: Jefe de Ventas" /></div>
                            <div><label className="block text-[10px] font-black text-slate-500 uppercase mb-2">Código ID</label><input value={newRoleData.id} onChange={e => setNewRoleData({...newRoleData, id: e.target.value.replace(/[^a-zA-Z]/g, '')})} className="w-full border-2 border-slate-100 rounded-xl p-4 bg-slate-50 font-black text-slate-900 focus:bg-white focus:border-emerald-500 outline-none uppercase font-mono text-sm" placeholder="EJ: JEFEVENTAS" /></div>
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
        className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all shadow-sm active:scale-90 ${active ? `${color} text-white shadow-lg` : 'bg-slate-200 text-slate-400 grayscale'}`}
    >
        {icon}
    </button>
);

const SupplierForm: React.FC<{ initialData?: Supplier, onSubmit: (s: Supplier) => void, onCancel: () => void }> = ({ initialData, onSubmit, onCancel }) => {
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
        } catch {}
    };
    return (
        <form onSubmit={(e) => { e.preventDefault(); onSubmit(formData); }} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="md:col-span-2 space-y-4">
                    <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest border-b pb-1">Información Fiscal</h4>
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="block text-[10px] font-black text-slate-500 uppercase mb-2">RUC (11 Dígitos)</label><input value={formData.ruc} onChange={e => setFormData({...formData, ruc: e.target.value})} onBlur={handleRucBlur} className="w-full border-2 border-slate-100 rounded-xl p-3 bg-slate-50 font-black text-slate-900 focus:bg-white focus:border-blue-500 outline-none" placeholder="20XXXXXXXXX" required maxLength={11} /></div>
                        <div>
                            <label className="block text-[10px] font-black text-slate-500 uppercase mb-2">Categoría Fiscal</label>
                            <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value as any})} className="w-full border-2 border-slate-100 rounded-xl p-3 bg-slate-50 font-black text-slate-900 uppercase text-xs">
                                <option value="MAYORISTA">Importador / Mayorista</option>
                                <option value="RETAIL">Retail / Tienda Local</option>
                                <option value="SERVICIOS">Servicios / Consultoría</option>
                            </select>
                        </div>
                        <div className="col-span-2"><label className="block text-[10px] font-black text-slate-500 uppercase mb-2">Razón Social Completa</label><input value={formData.razonSocial} onChange={e => setFormData({...formData, razonSocial: e.target.value})} className="w-full border-2 border-slate-100 rounded-xl p-3 bg-slate-50 font-black text-slate-900 uppercase" placeholder="EMPRESA S.A.C." required /></div>
                    </div>
                </div>
                <div className="md:col-span-2 space-y-4 mt-2">
                    <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest border-b pb-1">Ubicación y Contacto</h4>
                    <div className="grid grid-cols-3 gap-3">
                        <div><label className="block text-[10px] font-black text-slate-500 uppercase mb-2">Dpto.</label><input value={formData.department} onChange={e => setFormData({...formData, department: e.target.value})} className="w-full border-2 border-slate-100 rounded-xl p-3 bg-slate-50 font-black uppercase text-[10px]" /></div>
                        <div><label className="block text-[10px] font-black text-slate-500 uppercase mb-2">Prov.</label><input value={formData.province} onChange={e => setFormData({...formData, province: e.target.value})} className="w-full border-2 border-slate-100 rounded-xl p-3 bg-slate-50 font-black uppercase text-[10px]" /></div>
                        <div><label className="block text-[10px] font-black text-slate-500 uppercase mb-2">Dist.</label><input value={formData.district} onChange={e => setFormData({...formData, district: e.target.value})} className="w-full border-2 border-slate-100 rounded-xl p-3 bg-slate-50 font-black uppercase text-[10px]" /></div>
                    </div>
                    <div><label className="block text-[10px] font-black text-slate-500 uppercase mb-2">Dirección Fiscal Exacta</label><input value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="w-full border-2 border-gray-100 rounded-xl p-3 bg-slate-50 font-black text-xs" /></div>
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="block text-[10px] font-black text-slate-500 uppercase mb-2">Teléfono</label><input value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full border-2 border-gray-100 rounded-xl p-3 bg-slate-50 font-black text-xs" /></div>
                        <div><label className="block text-[10px] font-black text-slate-500 uppercase mb-2">Contacto</label><input value={formData.contactName} onChange={e => setFormData({...formData, contactName: e.target.value})} className="w-full border-2 border-gray-100 rounded-xl p-3 bg-slate-50 font-black text-xs uppercase" /></div>
                    </div>
                </div>
            </div>
            <div className="flex gap-4 pt-6"><button type="button" onClick={onCancel} className="flex-1 px-6 py-4 border-2 border-slate-100 rounded-2xl font-black text-slate-400 uppercase text-xs hover:bg-slate-50 transition-all">Cancelar</button><button type="submit" className="flex-[2] px-6 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs shadow-xl hover:bg-slate-800 transition-all active:scale-95">Guardar Proveedor</button></div>
        </form>
    );
};

const IntermediaryForm: React.FC<{ initialData?: Intermediary, onSubmit: (i: Intermediary) => void, onCancel: () => void }> = ({ initialData, onSubmit, onCancel }) => {
    const [formData, setFormData] = useState<Intermediary>(initialData || { id: Date.now().toString(), docNumber: '', fullName: '', rucNumber: '', phone: '', email: '', address: '' });
    const handleDniBlur = async () => {
        const dni = (formData.docNumber || '').trim();
        if (!dni || dni.length < 8) return;
        try {
            const info = await fetchDni(dni);
            setFormData({
                ...formData,
                fullName: info.fullName || formData.fullName,
                address: info.direccion || formData.address
            });
        } catch {}
    };
    return (
        <form onSubmit={(e) => { e.preventDefault(); onSubmit(formData); }} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div><label className="block text-[10px] font-black text-slate-500 uppercase mb-2">DNI del Intermediario</label><input value={formData.docNumber} onChange={e => setFormData({...formData, docNumber: e.target.value})} onBlur={handleDniBlur} className="w-full border-2 border-slate-100 rounded-xl p-3 bg-slate-50 font-black text-slate-900" placeholder="8 dígitos" required maxLength={8} /></div>
                <div><label className="block text-[10px] font-black text-slate-500 uppercase mb-2">RUC 10 (Opcional)</label><input value={formData.rucNumber} onChange={e => setFormData({...formData, rucNumber: e.target.value})} className="w-full border-2 border-slate-100 rounded-xl p-3 bg-slate-50 font-black text-slate-900" placeholder="10XXXXXXXXX" maxLength={11} /></div>
                <div className="md:col-span-2"><label className="block text-[10px] font-black text-slate-500 uppercase mb-2">Nombre y Apellidos</label><input value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} className="w-full border-2 border-slate-100 rounded-xl p-3 bg-slate-50 font-black text-slate-900 uppercase" required /></div>
                <div><label className="block text-[10px] font-black text-slate-500 uppercase mb-2">Teléfono</label><input value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full border-2 border-slate-100 rounded-xl p-3 bg-slate-50 font-black" required /></div>
                <div><label className="block text-[10px] font-black text-slate-500 uppercase mb-2">Correo</label><input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full border-2 border-slate-100 rounded-xl p-3 bg-slate-50 font-black" required /></div>
                <div className="md:col-span-2"><label className="block text-[10px] font-black text-slate-500 uppercase mb-2">Dirección Residencia</label><input value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="w-full border-2 border-slate-100 rounded-xl p-3 bg-slate-50 font-black" required /></div>
            </div>
            <div className="flex gap-4 pt-6"><button type="button" onClick={onCancel} className="flex-1 px-6 py-4 border-2 border-slate-100 rounded-2xl font-black text-slate-400 uppercase text-xs hover:bg-slate-50 transition-all">Cancelar</button><button type="submit" className="flex-[2] px-6 py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase text-xs shadow-xl hover:bg-emerald-700 transition-all active:scale-95">Guardar Intermediario</button></div>
        </form>
    );
};

const EmployeeForm: React.FC<{ initialData?: Employee, onSubmit: (e: Employee) => void, onCancel: () => void }> = ({ initialData, onSubmit, onCancel }) => {
    const config = DataService.getConfig();
    const [formData, setFormData] = useState<Employee>(initialData || { 
        id: Date.now().toString(), docNumber: '', fullName: '', phone: '', email: '', 
        address: '', department: '', province: '', district: '', civilStatus: CivilStatus.SOLTERO,
        baseSalary: 1025, pensionSystem: PensionSystem.ONP, hasChildren: false, 
        role: 'USER', jobTitle: 'COLABORADOR', entryDate: new Date().toISOString().split('T')[0],
        password: ''
    });
    const handleDniBlur = async () => {
        const dni = (formData.docNumber || '').trim();
        if (!dni || dni.length < 8) return;
        try {
            const info = await fetchDni(dni);
            const civ = (info.estadoCivil || '').toUpperCase();
            const civMap: Record<string, CivilStatus> = {
                SOLTERO: CivilStatus.SOLTERO,
                CASADO: CivilStatus.CASADO,
                VIUDO: CivilStatus.VIUDO,
                DIVORCIADO: CivilStatus.DIVORCIADO
            };
            setFormData({
                ...formData,
                fullName: info.fullName || formData.fullName,
                address: info.direccion || formData.address,
                civilStatus: civMap[civ] || formData.civilStatus
            });
        } catch {}
    };
    return (
        <form onSubmit={(ev) => { ev.preventDefault(); onSubmit(formData); }} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="md:col-span-2 space-y-4">
                    <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest border-b pb-1">Datos de Cuenta y Perfil</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div><label className="block text-[10px] font-black text-slate-500 uppercase mb-2">DNI / Usuario</label><input value={formData.docNumber} onChange={e => setFormData({...formData, docNumber: e.target.value})} onBlur={handleDniBlur} className="w-full border-2 border-slate-100 rounded-xl p-3 bg-slate-50 font-black text-slate-900" required /></div>
                        <div>
                            <label className="block text-[10px] font-black text-slate-500 uppercase mb-2">Rol del Sistema</label>
                            <select value={formData.role} onChange={e => setFormData({...formData, role: e.target.value as UserRole})} className="w-full border-2 border-slate-100 rounded-xl p-3 bg-slate-50 font-black text-slate-900 uppercase text-xs">
                                {config.roleConfigs.map(rc => (
                                    <option key={rc.role} value={rc.role}>{rc.label.toUpperCase()}</option>
                                ))}
                            </select>
                        </div>
                        <div className="md:col-span-2"><label className="block text-[10px] font-black text-slate-500 uppercase mb-2">Nombre Completo</label><input value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} className="w-full border-2 border-slate-100 rounded-xl p-3 bg-slate-50 font-black text-slate-900 uppercase" required /></div>
                        <div className="md:col-span-2"><label className="block text-[10px] font-black text-slate-500 uppercase mb-2 flex items-center gap-2"> <Key className="w-3 h-3"/> Contraseña Acceso</label><input type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full border-2 border-slate-100 rounded-xl p-3 bg-slate-50 font-black text-slate-900" placeholder="••••••••" required={!initialData} /></div>
                        <div><label className="block text-[10px] font-black text-slate-500 uppercase mb-2">Teléfono</label><input value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full border-2 border-slate-100 rounded-xl p-3 bg-slate-50 font-black" /></div>
                        <div><label className="block text-[10px] font-black text-slate-500 uppercase mb-2">Correo</label><input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full border-2 border-slate-100 rounded-xl p-3 bg-slate-50 font-black" /></div>
                        <div className="md:col-span-2"><label className="block text-[10px] font-black text-slate-500 uppercase mb-2">Dirección</label><input value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="w-full border-2 border-slate-100 rounded-xl p-3 bg-slate-50 font-black" /></div>
                    </div>
                </div>
                <div className="md:col-span-2 space-y-4 mt-2">
                    <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest border-b pb-1">Información Laboral</h4>
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="block text-[10px] font-black text-slate-500 uppercase mb-2">Sueldo Básico (S/)</label><input type="number" value={formData.baseSalary} onChange={e => setFormData({...formData, baseSalary: Number(e.target.value)})} className="w-full border-2 border-slate-100 rounded-xl p-3 bg-slate-50 font-black text-blue-600 text-lg" required /></div>
                        <div><label className="block text-[10px] font-black text-slate-500 uppercase mb-2">Pensión</label><select value={formData.pensionSystem} onChange={e => setFormData({...formData, pensionSystem: e.target.value as any})} className="w-full border-2 border-slate-100 rounded-xl p-3 bg-slate-50 font-black uppercase text-xs">{Object.values(PensionSystem).map(p => <option key={p} value={p}>{p}</option>)}</select></div>
                    </div>
                </div>
            </div>
            <div className="flex gap-4 pt-6"><button type="button" onClick={onCancel} className="flex-1 px-6 py-4 border-2 border-slate-100 rounded-2xl font-black text-slate-400 uppercase text-xs hover:bg-slate-50 transition-all">Cancelar</button><button type="submit" className="flex-[2] px-6 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs shadow-xl hover:bg-blue-700 transition-all active:scale-95">Guardar Colaborador</button></div>
        </form>
    );
};
