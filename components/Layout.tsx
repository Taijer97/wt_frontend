
import React from 'react';
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
  WalletCards
} from 'lucide-react';
import { BrandLogo } from './BrandLogo';
import { Employee, UserRole, AppModule } from '../types';
import { DataService } from '../services/dataService';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
  currentUser: Employee;
  onLogout: () => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, activeTab, onTabChange, currentUser, onLogout }) => {
  
  // Define menu items access based on Role
  const allNavItems: { id: string; label: string; icon: any; roles: UserRole[]; moduleId: AppModule }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['ADMIN', 'CAJA', 'RRHH', 'USER'], moduleId: 'dashboard' },
    { id: 'compras', label: 'Compras Personas (RUC 10)', icon: ShoppingCart, roles: ['ADMIN', 'USER'], moduleId: 'purchases_ruc10' },
    { id: 'compras-mayoristas', label: 'Compras Mayoristas (RUC 20)', icon: Truck, roles: ['ADMIN', 'CAJA'], moduleId: 'purchases_ruc20' },
    { id: 'inventario', label: 'Inventario & Transf.', icon: ArrowRightLeft, roles: ['ADMIN', 'USER', 'CAJA'], moduleId: 'inventory' },
    { id: 'gastos', label: 'Gastos & Costos', icon: WalletCards, roles: ['ADMIN', 'CAJA'], moduleId: 'expenses' },
    { id: 'ventas', label: 'Nueva Venta', icon: Store, roles: ['ADMIN', 'CAJA'], moduleId: 'sales' },
    { id: 'historial-ventas', label: 'Historial Ventas', icon: History, roles: ['ADMIN', 'CAJA'], moduleId: 'sales' },
    { id: 'planilla', label: 'Planilla & RRHH', icon: Users, roles: ['ADMIN', 'RRHH'], moduleId: 'payroll' },
    { id: 'contabilidad', label: 'Contabilidad SIRE', icon: FileText, roles: ['ADMIN'], moduleId: 'accounting' },
    { id: 'configuracion', label: 'Configuración', icon: Settings, roles: ['ADMIN', 'RRHH'], moduleId: 'settings' },
  ];

  const config = DataService.getConfig();
  const roleConfig = config.roleConfigs.find(r => r.role === currentUser.role);

  const filteredItems = allNavItems.filter(item => {
    // 1. Si existe configuración dinámica para este rol, usarla
    if (roleConfig && roleConfig.permissions && roleConfig.permissions[item.moduleId]) {
      return roleConfig.permissions[item.moduleId].read;
    }
    // 2. Fallback: usar roles hardcodeados (retrocompatibilidad)
    return item.roles.includes(currentUser.role);
  });

  const getRoleBadgeColor = (role: UserRole) => {
    switch(role) {
        case 'ADMIN': return 'bg-emerald-500';
        case 'CAJA': return 'bg-purple-500';
        case 'RRHH': return 'bg-blue-500';
        default: return 'bg-slate-500';
    }
  };

  return (
    <div className="flex h-screen bg-gray-100 text-slate-800 font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col shadow-2xl transition-all duration-300">
        <div className="p-6 border-b border-slate-700">
          <h1 className="text-xl font-bold tracking-tight text-emerald-400 flex items-center gap-2">
            <BrandLogo className="w-6 h-6" alt="WasiTech" />
            WASITECH
          </h1>
          <p className="text-xs text-slate-400 mt-1 pl-8">Gestión Integral RUC 10/20</p>
        </div>
        
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {filteredItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`flex items-center w-full px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 group ${
                activeTab === item.id
                  ? 'bg-emerald-600 text-white shadow-lg translate-x-1'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white hover:translate-x-1'
              }`}
            >
              <item.icon className={`w-5 h-5 mr-3 ${activeTab === item.id ? 'text-white' : 'text-slate-400 group-hover:text-white'}`} />
              {item.label}
            </button>
          ))}
        </nav>
        
        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center gap-3 mb-3">
             <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border border-white/20 shadow-inner ${getRoleBadgeColor(currentUser.role)}`}>
               {currentUser.fullName.charAt(0)}
             </div>
             <div className="overflow-hidden">
                <p className="text-sm font-medium text-slate-200 truncate">{currentUser.fullName}</p>
                <p className="text-[10px] text-emerald-400 font-bold tracking-wider">{currentUser.role}</p>
             </div>
          </div>
          <button 
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-red-900/50 text-slate-300 hover:text-red-200 py-2 rounded text-xs transition-colors"
          >
              <LogOut className="w-3 h-3" /> Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto flex flex-col">
        <header className="bg-white shadow-sm sticky top-0 z-20 border-b border-gray-200 print:hidden">
          <div className="px-8 py-4 flex justify-between items-center">
            <h2 className="text-xl font-semibold text-slate-800 tracking-tight">
              {filteredItems.find(i => i.id === activeTab)?.label}
            </h2>
            <div className="flex items-center gap-4">
              <span className="text-xs font-medium px-3 py-1 bg-blue-50 text-blue-700 rounded-full border border-blue-100 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                RUC 10 Activo
              </span>
               <span className="text-xs font-medium px-3 py-1 bg-purple-50 text-purple-700 rounded-full border border-purple-100 flex items-center gap-1">
                 <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                RUC 20 Activo
              </span>
            </div>
          </div>
        </header>
        <div className="p-8 max-w-7xl mx-auto w-full flex-1 print:p-0">
          {children}
        </div>
      </main>
    </div>
  );
};
