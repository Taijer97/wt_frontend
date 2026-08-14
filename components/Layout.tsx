import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  ArrowRightLeft, 
  Store, 
  FileText, 
  Settings,
  Truck,
  History,
  LogOut,
  Users,
  WalletCards,
  Menu,
  X,
  ChevronRight,
  ShieldCheck,
  Building2,
  BarChart3
} from 'lucide-react';
import { BrandLogo } from './BrandLogo';
import { Employee, UserRole, AppModule } from '../types';
import { DataService } from '../services/dataService';
import { ProfileModal } from './ProfileModal';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
  currentUser: Employee;
  onLogout: () => void;
  onUserUpdate?: (updated: Employee) => void;
}

interface NavGroup {
  section: string;
  items: {
    id: string;
    label: string;
    icon: any;
    roles: UserRole[];
    moduleId: AppModule;
    badge?: string;
  }[];
}

export const Layout: React.FC<LayoutProps> = ({ children, activeTab, onTabChange, currentUser, onLogout, onUserUpdate }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  // Grouped Navigation Items
  const navGroups: NavGroup[] = [
    {
      section: 'Principal',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['ADMIN', 'CAJA', 'RRHH', 'USER'], moduleId: 'dashboard' },
        { id: 'tablero-estadistico', label: 'Tablero Estadístico', icon: BarChart3, roles: ['ADMIN', 'CAJA', 'RRHH', 'USER'], moduleId: 'tablero_estadistico' },
        { id: 'clientes', label: 'Clientes y Notas', icon: Users, roles: ['ADMIN', 'CAJA', 'RRHH', 'USER'], moduleId: 'clientes' },
      ]
    },
    {
      section: 'Ventas & Compras',
      items: [
        { id: 'ventas', label: 'Nueva Venta', icon: Store, roles: ['ADMIN', 'CAJA'], moduleId: 'sales' },
        { id: 'historial-ventas', label: 'Historial Ventas', icon: History, roles: ['ADMIN', 'CAJA'], moduleId: 'sales_history' },
        { id: 'compras', label: 'Compras Personas (RUC 10)', icon: ShoppingCart, roles: ['ADMIN', 'USER'], moduleId: 'purchases_ruc10' },
        { id: 'compras-mayoristas', label: 'Compras Mayoristas (RUC 20)', icon: Truck, roles: ['ADMIN', 'CAJA'], moduleId: 'purchases_ruc20' },
      ]
    },
    {
      section: 'Operaciones',
      items: [
        { id: 'inventario', label: 'Inventario & Transf.', icon: ArrowRightLeft, roles: ['ADMIN', 'USER', 'CAJA'], moduleId: 'inventory' },
        { id: 'gastos', label: 'Gastos & Costos', icon: WalletCards, roles: ['ADMIN', 'CAJA'], moduleId: 'expenses' },
      ]
    },
    {
      section: 'Administración',
      items: [
        { id: 'planilla', label: 'Planilla & RRHH', icon: Users, roles: ['ADMIN', 'RRHH'], moduleId: 'payroll' },
      ]
    },
    {
      section: 'Sistema & Reportes',
      items: [
        { id: 'facturacion-control', label: 'Control Facturación', icon: FileText, roles: ['ADMIN', 'CAJA'], moduleId: 'accounting' },
        { id: 'contabilidad', label: 'Contabilidad SIRE', icon: FileText, roles: ['ADMIN'], moduleId: 'accounting_sire' },
        { id: 'actualizaciones', label: 'Auditoría de Datos', icon: ShieldCheck, roles: ['ADMIN'], moduleId: 'audit' },
        { id: 'configuracion', label: 'Configuración', icon: Settings, roles: ['ADMIN', 'RRHH'], moduleId: 'settings' },
      ]
    }
  ];

  const config = DataService.getConfig();
  const roleConfig = config.roleConfigs?.find(r => r.role === currentUser.role);

  // Filter items based on permissions
  const filterItem = (item: any) => {
    if (currentUser.role === 'ADMIN') return true;
    if (roleConfig && roleConfig.permissions && roleConfig.permissions[item.moduleId]) {
      return Boolean(roleConfig.permissions[item.moduleId].read);
    }
    return item.roles.includes(currentUser.role);
  };

  const filteredGroups = navGroups.map(group => ({
    ...group,
    items: group.items.filter(filterItem)
  })).filter(group => group.items.length > 0);

  // Get active item & section for breadcrumbs
  let currentGroupTitle = '';
  let currentItemLabel = '';
  for (const group of navGroups) {
    const found = group.items.find(i => i.id === activeTab);
    if (found) {
      currentGroupTitle = group.section;
      currentItemLabel = found.label;
      break;
    }
  }

  const getRoleBadgeColor = (role: UserRole) => {
    switch(role) {
      case 'ADMIN': return 'bg-emerald-500 text-white';
      case 'CAJA': return 'bg-purple-500 text-white';
      case 'RRHH': return 'bg-blue-500 text-white';
      default: return 'bg-slate-500 text-white';
    }
  };

  return (
    <div className="h-screen bg-slate-100 text-slate-800 font-sans flex overflow-hidden">
      {/* Mobile Backdrop Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-40 md:hidden animate-fade-in" 
          onClick={() => setSidebarOpen(false)} 
        />
      )}

      {/* Sidebar */}
      <aside 
        className={`fixed inset-y-0 left-0 w-64 bg-slate-950 text-white flex flex-col shadow-2xl z-50 transition-transform duration-300 ease-in-out md:static md:translate-x-0 print:hidden ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Logo Header */}
        <div className="p-5 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
              <BrandLogo className="w-6 h-6" alt="WasiTech" />
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight text-white flex items-center gap-1.5">
                WASITECH
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30">v2.0</span>
              </h1>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Gestión MYPE RUC 10/20</p>
            </div>
          </div>
          <button 
            className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Sections */}
        <nav className="flex-1 px-3 py-4 space-y-6 overflow-y-auto custom-scrollbar">
          {filteredGroups.map((group, groupIdx) => (
            <div key={groupIdx} className="space-y-1">
              <p className="px-3 text-[10px] font-black uppercase text-slate-500 tracking-wider">
                {group.section}
              </p>
              {group.items.map((item) => {
                const isActive = activeTab === item.id;
                const IconComponent = item.icon;

                return (
                  <button
                    key={item.id}
                    onClick={() => { onTabChange(item.id); setSidebarOpen(false); }}
                    className={`group relative flex items-center w-full px-3 py-2.5 text-xs font-bold rounded-xl transition-all duration-200 ${
                      isActive
                        ? 'bg-gradient-to-r from-emerald-600 to-emerald-500 text-white shadow-lg shadow-emerald-900/30 translate-x-1'
                        : 'text-slate-400 hover:bg-slate-900 hover:text-slate-100 hover:translate-x-1'
                    }`}
                  >
                    <IconComponent className={`w-4 h-4 mr-3 transition-colors ${
                      isActive ? 'text-white' : 'text-slate-500 group-hover:text-emerald-400'
                    }`} />
                    <span className="truncate">{item.label}</span>

                    {isActive && (
                      <span className="absolute right-2 w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Profile Button Footer */}
        <div className="p-3 border-t border-slate-800/80">
          <button
            onClick={() => setProfileOpen(true)}
            className="w-full flex items-center gap-3 p-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 transition-all duration-200 group active:scale-95"
          >
            {/* Avatar */}
            <div className="w-9 h-9 rounded-xl overflow-hidden shrink-0 shadow-inner ring-2 ring-slate-700 group-hover:ring-emerald-500/50 transition-all">
              {currentUser.photoUrl ? (
                <img
                  src={currentUser.photoUrl}
                  alt={currentUser.fullName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className={`w-full h-full flex items-center justify-center text-xs font-black text-white ${getRoleBadgeColor(currentUser.role)}`}>
                  {currentUser.fullName ? currentUser.fullName.charAt(0).toUpperCase() : 'U'}
                </div>
              )}
            </div>
            <div className="overflow-hidden flex-1 text-left">
              <p className="text-xs font-bold text-slate-200 truncate group-hover:text-white transition-colors">{currentUser.fullName}</p>
              <span className="inline-block text-[9px] font-black text-emerald-400 uppercase tracking-wider">{currentUser.role}</span>
            </div>
            {/* Chevron hint */}
            <ChevronRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-400 shrink-0 transition-colors" />
          </button>
          <button
            onClick={onLogout}
            className="mt-2 w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-red-950/60 text-slate-400 hover:text-red-400 py-2 rounded-xl text-xs font-bold border border-slate-800 hover:border-red-900/50 transition-all duration-200 active:scale-95"
          >
            <LogOut className="w-3.5 h-3.5" /> Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto flex flex-col min-w-0">
        {/* Header Bar */}
        <header className="bg-white shadow-xs sticky top-0 z-20 border-b border-slate-200 print:hidden">
          <div className="px-6 py-3.5 flex justify-between items-center gap-4">
            {/* Left: Mobile Menu Toggle & Breadcrumbs */}
            <div className="flex items-center gap-3">
              <button 
                className="md:hidden p-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 active:scale-95 transition-all" 
                onClick={() => setSidebarOpen(true)}
                aria-label="Abrir menú"
              >
                <Menu className="w-5 h-5" />
              </button>
              
              {/* Breadcrumb Navigation */}
              <div className="flex items-center gap-2 text-xs">
                <span className="font-bold text-slate-400 flex items-center gap-1 hidden sm:flex">
                  <Building2 className="w-3.5 h-3.5" />
                  {currentGroupTitle || 'WasiTech'}
                </span>
                {currentGroupTitle && <ChevronRight className="w-3 h-3 text-slate-300 hidden sm:block" />}
                <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
                  {currentItemLabel || activeTab}
                </h2>
              </div>
            </div>

            {/* Right: Regimes Status Badges */}
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-700 rounded-full border border-blue-100 text-[11px] font-bold">
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                <span className="hidden xs:inline">Persona</span> RUC 10
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1 bg-purple-50 text-purple-700 rounded-full border border-purple-100 text-[11px] font-bold">
                <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></span>
                <span className="hidden xs:inline">Empresa</span> RUC 20
              </div>
            </div>
          </div>
        </header>

        {/* Content Container */}
        <div className="p-6 md:p-8 max-w-7xl mx-auto w-full flex-1 print:p-0">
          {children}
        </div>
      </main>

      {/* Profile Modal */}
      <ProfileModal
        isOpen={profileOpen}
        onClose={() => setProfileOpen(false)}
        currentUser={currentUser}
        onUserUpdate={(updated) => {
          onUserUpdate?.(updated);
          setProfileOpen(false);
        }}
      />
    </div>
  );
};
