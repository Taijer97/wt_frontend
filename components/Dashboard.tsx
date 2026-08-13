import React, { useState, useEffect } from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import { 
  Store, 
  ShoppingCart, 
  ArrowRightLeft, 
  BarChart3, 
  Users, 
  Settings, 
  TrendingUp, 
  Package, 
  ShieldCheck, 
  ArrowUpRight, 
  Clock, 
  Sparkles, 
  ChevronRight, 
  Activity, 
  FileText,
  Building2,
  WalletCards,
  CheckCircle2,
  AlertCircle,
  Calendar
} from 'lucide-react';
import { Employee, TaxRegime, UserRole, AppModule } from '../types';
import { DataService } from '../services/dataService';
import { BackendService } from '../services/backendService';
import { Button, Badge, useAlert } from './ui';

interface WelcomeDashboardProps {
  currentUser?: Employee;
  onNavigate?: (tab: string) => void;
}

export const Dashboard: React.FC<WelcomeDashboardProps> = ({ currentUser, onNavigate }) => {
  const config = DataService.getConfig();

  const [todaySales, setTodaySales] = useState({ total: 0, count: 0 });
  const [monthPurchases, setMonthPurchases] = useState({ total: 0, count: 0 });
  const [criticalStockCount, setCriticalStockCount] = useState(0);
  const [criticalProducts, setCriticalProducts] = useState<any[]>([]);
  const [recentSales, setRecentSales] = useState<any[]>([]);
  const [weeklyTrendData, setWeeklyTrendData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadDashboardSummary();
  }, []);

  const loadDashboardSummary = async () => {
    setLoading(true);
    try {
      const sales = await BackendService.getTransactions('sale');
      const purchases = await BackendService.getTransactions('purchase');
      let products: any[] = [];
      try { products = await BackendService.getProducts(); } catch {}

      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();

      // Today's Sales
      const salesToday = sales.filter((t: any) => {
        const d = (t.date || t.created_at || '').split('T')[0];
        return d === todayStr;
      });
      const todayTotal = salesToday.reduce((acc: number, t: any) => acc + Number(t.totalAmount || t.total_amount || 0), 0);

      setTodaySales({ total: todayTotal, count: salesToday.length });

      // Month Purchases
      const purchasesMonth = purchases.filter((t: any) => {
        const d = new Date(t.date || t.created_at);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      });
      const monthPurchasesTotal = purchasesMonth.reduce((acc: number, t: any) => acc + Number(t.totalAmount || t.total_amount || 0), 0);

      setMonthPurchases({ total: monthPurchasesTotal, count: purchasesMonth.length });

      // Low Stock Products
      const lowStock = products.filter((p: any) => (p.stock || 0) <= (p.minStockAlert || 5));
      setCriticalStockCount(lowStock.length);
      setCriticalProducts(lowStock.slice(0, 5));

      // Recent 5 Sales
      const sortedSales = [...sales].sort((a: any, b: any) => {
        return new Date(b.date || b.created_at).getTime() - new Date(a.date || a.created_at).getTime();
      });
      setRecentSales(sortedSales.slice(0, 5));

      // Last 7 days trend
      const last7Days = [];
      for (let i = 6; i >= 0; i--) {
        const dateObj = new Date();
        dateObj.setDate(dateObj.getDate() - i);
        const dayStr = dateObj.toISOString().split('T')[0];
        const dayLabel = dateObj.toLocaleDateString('es-PE', { weekday: 'short', day: 'numeric' });

        const daySales = sales.filter((t: any) => (t.date || t.created_at || '').split('T')[0] === dayStr);
        const dayTotal = daySales.reduce((acc: number, t: any) => acc + Number(t.totalAmount || t.total_amount || 0), 0);

        last7Days.push({
          name: dayLabel,
          ventas: Math.round(dayTotal),
        });
      }
      setWeeklyTrendData(last7Days);

    } catch (err) {
      console.error('Error loading welcome dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Buenos días';
    if (hour < 19) return 'Buenas tardes';
    return 'Buenas noches';
  };

  const userName = currentUser?.fullName ? currentUser.fullName.split(' ')[0] : 'Usuario';

  const formatPEN = (val: number) => {
    return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(val);
  };

  const alert = useAlert();

  const roleConfig = config.roleConfigs?.find(r => r.role === currentUser?.role);

  const hasAccess = (moduleId: AppModule, defaultRoles: UserRole[] = ['ADMIN']) => {
    if (!currentUser) return true;
    if (currentUser.role === 'ADMIN') return true;
    if (roleConfig && roleConfig.permissions && roleConfig.permissions[moduleId]) {
      return Boolean(roleConfig.permissions[moduleId].read);
    }
    return defaultRoles.includes(currentUser.role);
  };

  const handleSafeNavigate = (tab: string, moduleId: AppModule, defaultRoles: UserRole[] = ['ADMIN']) => {
    if (hasAccess(moduleId, defaultRoles)) {
      onNavigate?.(tab);
    } else {
      alert.error('No tienes permisos suficientes para acceder a este módulo.');
    }
  };

  const getSunatCountdown = (dayLimit: number = 15) => {
    const today = new Date();
    const currentDay = today.getDate();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    let targetDate = new Date(currentYear, currentMonth, dayLimit);
    if (currentDay > dayLimit) {
      targetDate = new Date(currentYear, currentMonth + 1, dayLimit);
    }

    const diffTime = targetDate.getTime() - today.getTime();
    const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return {
      daysLeft: Math.max(0, daysLeft),
      dayLimit,
      targetDateStr: targetDate.toLocaleDateString('es-PE', { day: 'numeric', month: 'long' }),
      isToday: currentDay === dayLimit,
      isClose: daysLeft <= 5 && currentDay !== dayLimit,
    };
  };

  const sunatRuc10 = getSunatCountdown(config.ruc10DeclarationDay || 15);
  const sunatRuc20 = getSunatCountdown(config.ruc20DeclarationDay || 18);

  const allLaunchers = [
    {
      id: 'ventas',
      label: 'Nueva Venta',
      subtitle: 'Caja / POS Vendedor',
      icon: Store,
      moduleId: 'sales' as AppModule,
      defaultRoles: ['ADMIN', 'CAJA'] as UserRole[],
      bgClass: 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-900/20 hover:shadow-xl hover:scale-105',
      iconBg: 'bg-white/20 text-white',
      chevronClass: 'text-white/70',
      titleClass: 'text-white',
      subtitleClass: 'text-white/80'
    },
    {
      id: 'compras',
      label: 'Compras RUC 10',
      subtitle: 'Registro & Expediente',
      icon: ShoppingCart,
      moduleId: 'purchases_ruc10' as AppModule,
      defaultRoles: ['ADMIN', 'USER'] as UserRole[],
      bgClass: 'bg-white border border-slate-200 text-slate-800 shadow-xs hover:shadow-md hover:border-blue-300 hover:scale-105',
      iconBg: 'bg-blue-50 text-blue-600',
      chevronClass: 'text-slate-400',
      titleClass: 'text-slate-900',
      subtitleClass: 'text-slate-400'
    },
    {
      id: 'inventario',
      label: 'Inventario & Stock',
      subtitle: 'Transf. RUC 10 → 20',
      icon: ArrowRightLeft,
      moduleId: 'inventory' as AppModule,
      defaultRoles: ['ADMIN', 'USER', 'CAJA'] as UserRole[],
      bgClass: 'bg-white border border-slate-200 text-slate-800 shadow-xs hover:shadow-md hover:border-purple-300 hover:scale-105',
      iconBg: 'bg-purple-50 text-purple-600',
      chevronClass: 'text-slate-400',
      titleClass: 'text-slate-900',
      subtitleClass: 'text-slate-400'
    },
    {
      id: 'tablero-estadistico',
      label: 'Tablero Estadístico',
      subtitle: 'Liquidación SUNAT & UIT',
      icon: BarChart3,
      moduleId: 'tablero_estadistico' as AppModule,
      defaultRoles: ['ADMIN', 'CAJA', 'RRHH', 'USER'] as UserRole[],
      bgClass: 'bg-white border border-slate-200 text-slate-800 shadow-xs hover:shadow-md hover:border-amber-300 hover:scale-105',
      iconBg: 'bg-amber-50 text-amber-600',
      chevronClass: 'text-slate-400',
      titleClass: 'text-slate-900',
      subtitleClass: 'text-slate-400'
    },
    {
      id: 'clientes',
      label: 'Clientes & Notas',
      subtitle: 'Alertas por Bloque',
      icon: Users,
      moduleId: 'clientes' as AppModule,
      defaultRoles: ['ADMIN', 'CAJA', 'RRHH', 'USER'] as UserRole[],
      bgClass: 'bg-white border border-slate-200 text-slate-800 shadow-xs hover:shadow-md hover:border-teal-300 hover:scale-105',
      iconBg: 'bg-teal-50 text-teal-600',
      chevronClass: 'text-slate-400',
      titleClass: 'text-slate-900',
      subtitleClass: 'text-slate-400'
    },
    {
      id: 'configuracion',
      label: 'Configuración',
      subtitle: 'Roles & Accesos',
      icon: Settings,
      moduleId: 'settings' as AppModule,
      defaultRoles: ['ADMIN', 'RRHH'] as UserRole[],
      bgClass: 'bg-slate-900 text-white shadow-xs hover:shadow-md hover:scale-105 border border-slate-800',
      iconBg: 'bg-slate-800 text-slate-300',
      chevronClass: 'text-slate-500',
      titleClass: 'text-white',
      subtitleClass: 'text-slate-400'
    }
  ];

  const visibleLaunchers = allLaunchers.filter(item => hasAccess(item.moduleId, item.defaultRoles));

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* ── Enterprise Hero Welcome Banner ────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-emerald-950 text-white rounded-3xl p-6 md:p-8 shadow-2xl border border-slate-800 relative overflow-hidden">
        {/* Glowing Orbs */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-full text-xs font-black uppercase tracking-wider border border-emerald-500/30 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                Centro de Mando WasiTech
              </span>
              <Badge variant="outline" size="sm" className="border-slate-700 text-slate-300">
                {config.companyName || 'WASITECH ERP'}
              </Badge>
            </div>
            <h1 className="text-2xl md:text-4xl font-black tracking-tight text-white">
              ¡{getGreeting()}, <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-200">{userName}</span>! 👋
            </h1>
            <p className="text-xs md:text-sm text-slate-300 font-medium max-w-xl">
              Bienvenido al portal empresarial. Revisa el estado operativo en tiempo real y ejecuta acciones clave con un solo clic.
            </p>
          </div>

          {/* User Quick Badge & Clock */}
          <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800 backdrop-blur-md space-y-2 text-right self-stretch md:self-auto shrink-0">
            <div className="flex items-center justify-end gap-2 text-xs font-bold text-slate-300">
              <Clock className="w-3.5 h-3.5 text-emerald-400" />
              <span>{new Date().toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
            </div>
            <div className="flex items-center justify-end gap-2">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Rol Registrado:</span>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-black border border-emerald-500/30">
                {currentUser?.role || 'ADMIN'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Quick Launcher Grid (Filtered by Matriz de Permisos CRUD) ────────────────────────────────────────── */}
      {visibleLaunchers.length > 0 && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-base font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
              <Activity className="w-5 h-5 text-emerald-600" />
              Acceso Rápido & Módulos
            </h2>
            <span className="text-xs text-slate-500 font-medium">Módulos permitidos según tu rol y matriz de permisos</span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {visibleLaunchers.map((launcher) => {
              const IconComp = launcher.icon;
              return (
                <button
                  key={launcher.id}
                  onClick={() => handleSafeNavigate(launcher.id, launcher.moduleId, launcher.defaultRoles)}
                  className={`p-4 rounded-2xl transition-all text-left group flex flex-col justify-between h-32 ${launcher.bgClass}`}
                >
                  <div className="flex justify-between items-start">
                    <div className={`p-2 rounded-xl ${launcher.iconBg}`}>
                      <IconComp className="w-5 h-5" />
                    </div>
                    <ChevronRight className={`w-4 h-4 group-hover:translate-x-1 transition-transform ${launcher.chevronClass}`} />
                  </div>
                  <div>
                    <p className={`text-sm font-black tracking-tight ${launcher.titleClass}`}>{launcher.label}</p>
                    <p className={`text-[10px] font-bold ${launcher.subtitleClass}`}>{launcher.subtitle}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── 4 Vital Indicators Widgets ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Widget 1: Ventas del Día */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Ventas de Hoy</span>
            <p className="text-2xl font-black text-slate-900 tracking-tight">{formatPEN(todaySales.total)}</p>
            <p className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> {todaySales.count} transacción(es) hoy
            </p>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        {/* Widget 2: Compras del Mes */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Compras del Mes</span>
            <p className="text-2xl font-black text-slate-900 tracking-tight">{formatPEN(monthPurchases.total)}</p>
            <p className="text-[11px] font-bold text-blue-600 flex items-center gap-1">
              <FileText className="w-3.5 h-3.5" /> {monthPurchases.count} compra(s) registradas
            </p>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
            <ShoppingCart className="w-6 h-6" />
          </div>
        </div>

        {/* Widget 3: Stock Crítico */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Alerta de Stock Crítico</span>
            <p className="text-2xl font-black text-slate-900 tracking-tight">{criticalStockCount} <span className="text-xs font-bold text-slate-400">productos</span></p>
            <p className={`text-[11px] font-bold flex items-center gap-1 ${criticalStockCount > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
              <AlertCircle className="w-3.5 h-3.5" /> {criticalStockCount > 0 ? 'Requiere reabastecimiento' : 'Stock saludable'}
            </p>
          </div>
          <div className={`p-3 rounded-2xl ${criticalStockCount > 0 ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'}`}>
            <Package className="w-6 h-6" />
          </div>
        </div>

        {/* Widget 4: Facturación SUNAT status */}
        <div className="bg-slate-950 text-white rounded-3xl p-6 border border-slate-800 shadow-xl flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-black text-emerald-400 uppercase tracking-wider">Régimen Fiscal</span>
            <p className="text-lg font-black text-white">{config.ruc20TaxRegime || 'RMT'}</p>
            <p className="text-[11px] font-bold text-slate-400">Tasa Renta: <span className="text-emerald-400 font-extrabold">{(config.rentaRate * 100).toFixed(1)}%</span></p>
          </div>
          <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-2xl border border-emerald-500/30">
            <ShieldCheck className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* ── Recordatorio Días Límite de Declaración SUNAT ────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-950 to-indigo-950 text-white rounded-3xl p-6 border border-slate-800 shadow-2xl relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <span className="p-2.5 bg-indigo-500/20 text-indigo-400 rounded-2xl border border-indigo-500/30">
                <Calendar className="w-6 h-6 animate-pulse" />
              </span>
              <div>
                <h3 className="font-black text-white text-base uppercase tracking-tight flex items-center gap-2">
                  Recordatorio Días Límite de Declaración SUNAT
                </h3>
                <p className="text-xs text-slate-400 font-medium">
                  Cronograma mensual estimado de vencimiento para la presentación de IGV y Renta
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={() => handleSafeNavigate('tablero_estadistico', 'tablero_estadistico', ['ADMIN'])}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black transition-all flex items-center gap-2 shadow-lg shadow-indigo-900/40 shrink-0 border border-indigo-400/30 cursor-pointer"
          >
            <span>Ver Tablero Estadístico SUNAT</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6 pt-6 border-t border-slate-800/80 relative z-10">
          {/* Card RUC 10 */}
          <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800/90 flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Badge variant="info" size="sm" className="font-black">RUC 10</Badge>
                <span className="text-xs font-bold text-slate-200">Persona Natural con Negocio</span>
              </div>
              <p className="text-xs text-slate-400">
                Día límite fijado: <strong className="text-white font-black">Día {sunatRuc10.dayLimit} de cada mes</strong> ({sunatRuc10.targetDateStr})
              </p>
            </div>
            <div className="text-right">
              {sunatRuc10.isToday ? (
                <span className="px-3 py-1.5 bg-red-500/20 text-red-400 border border-red-500/40 rounded-full text-xs font-black animate-bounce inline-block">
                  ¡VENCE HOY!
                </span>
              ) : sunatRuc10.isClose ? (
                <span className="px-3 py-1.5 bg-amber-500/20 text-amber-400 border border-amber-500/40 rounded-full text-xs font-black animate-pulse inline-block">
                  {sunatRuc10.daysLeft} día(s) restantes
                </span>
              ) : (
                <span className="px-3 py-1.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 rounded-full text-xs font-black inline-block">
                  {sunatRuc10.daysLeft} día(s) restantes
                </span>
              )}
            </div>
          </div>

          {/* Card RUC 20 */}
          <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800/90 flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Badge variant="warning" size="sm" className="font-black">RUC 20</Badge>
                <span className="text-xs font-bold text-slate-200">Empresa ({config.ruc20TaxRegime || 'RMT'})</span>
              </div>
              <p className="text-xs text-slate-400">
                Día límite fijado: <strong className="text-white font-black">Día {sunatRuc20.dayLimit} de cada mes</strong> ({sunatRuc20.targetDateStr})
              </p>
            </div>
            <div className="text-right">
              {sunatRuc20.isToday ? (
                <span className="px-3 py-1.5 bg-red-500/20 text-red-400 border border-red-500/40 rounded-full text-xs font-black animate-bounce inline-block">
                  ¡VENCE HOY!
                </span>
              ) : sunatRuc20.isClose ? (
                <span className="px-3 py-1.5 bg-amber-500/20 text-amber-400 border border-amber-500/40 rounded-full text-xs font-black animate-pulse inline-block">
                  {sunatRuc20.daysLeft} día(s) restantes
                </span>
              ) : (
                <span className="px-3 py-1.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 rounded-full text-xs font-black inline-block">
                  {sunatRuc20.daysLeft} día(s) restantes
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Main Section: 7-Day Chart + Recent Activity Feed ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: 7-Day Sales Trend & Recent Sales */}
        <div className="lg:col-span-2 space-y-6">
          {/* Chart Card */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
              <div>
                <h3 className="font-black text-slate-900 text-sm uppercase tracking-wider flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-emerald-600" />
                  Tendencia de Ventas (Últimos 7 Días)
                </h3>
                <p className="text-xs text-slate-500 font-medium">Facturación diaria consolidada en soles</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSafeNavigate('tablero-estadistico', 'tablero_estadistico', ['ADMIN', 'CAJA', 'RRHH', 'USER'])}
                rightIcon={<ArrowUpRight className="w-3.5 h-3.5" />}
              >
                Ver Todo en Tablero Estadístico
              </Button>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={weeklyTrendData}>
                  <defs>
                    <linearGradient id="colorSalesWeekly" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b', fontWeight: 700 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b', fontWeight: 700 }} />
                  <Tooltip
                    contentStyle={{ borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }}
                    formatter={(val: any) => [`S/ ${Number(val).toLocaleString()}`, 'Ventas']}
                  />
                  <Area type="monotone" dataKey="ventas" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorSalesWeekly)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Recent Transactions Stream */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
              <h3 className="font-black text-slate-900 text-sm uppercase tracking-wider flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                Últimas Ventas Registradas
              </h3>
              <button
                onClick={() => handleSafeNavigate('historial-ventas', 'sales_history', ['ADMIN', 'CAJA'])}
                className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                Ver Historial <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {recentSales.length === 0 ? (
              <p className="text-xs text-slate-400 font-medium text-center py-6">No hay transacciones registradas aún</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {recentSales.map((sale: any) => (
                  <div key={sale.id} className="py-3 flex justify-between items-center text-xs">
                    <div className="space-y-0.5">
                      <p className="font-extrabold text-slate-900">{sale.entityName || sale.entity_name || 'Cliente Varios'}</p>
                      <p className="text-[10px] text-slate-400 font-bold">
                        Doc: {sale.documentType || 'BV'} {sale.documentNumber || sale.document_number || '001'} • {(sale.date || sale.created_at || '').split('T')[0]}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-slate-900">{formatPEN(Number(sale.totalAmount || sale.total_amount || 0))}</p>
                      <span className="inline-block px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[9px] font-black uppercase">
                        {sale.sunatStatus || 'ACEPTADO'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Col: Low Stock Panel & Fiscal Summary */}
        <div className="space-y-6">
          {/* Low Stock Panel */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
              <h3 className="font-black text-slate-900 text-sm uppercase tracking-wider flex items-center gap-2">
                <Package className="w-5 h-5 text-amber-600" />
                Stock en Alerta
              </h3>
              <Badge variant={criticalProducts.length > 0 ? 'warning' : 'success'} size="sm">
                {criticalProducts.length} Ítems
              </Badge>
            </div>

            {criticalProducts.length === 0 ? (
              <p className="text-xs text-emerald-700 font-bold bg-emerald-50 p-4 rounded-2xl text-center">
                ✓ Todo el inventario tiene stock suficiente
              </p>
            ) : (
              <div className="space-y-3 text-xs">
                {criticalProducts.map((prod: any) => (
                  <div key={prod.id} className="p-3 bg-amber-50/60 rounded-2xl border border-amber-100 flex justify-between items-center">
                    <div>
                      <p className="font-extrabold text-slate-900">{prod.name}</p>
                      <p className="text-[10px] font-bold text-slate-500">{prod.category || 'General'}</p>
                    </div>
                    <div className="text-right">
                      <span className="px-2.5 py-1 rounded-xl bg-amber-500 text-white font-black text-xs">
                        Stock: {prod.stock || 0}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <Button
              variant="outline"
              fullWidth
              size="sm"
              onClick={() => handleSafeNavigate('inventario', 'inventory', ['ADMIN', 'USER', 'CAJA'])}
            >
              Ir a Gestión de Inventario
            </Button>
          </div>

          {/* Corporate Summary Card */}
          <div className="bg-slate-950 text-white rounded-3xl p-6 border border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-emerald-400" />
              <h3 className="font-black text-sm uppercase tracking-wider text-white">Ficha de la Empresa</h3>
            </div>

            <div className="space-y-2 text-xs border-t border-slate-800 pt-3">
              <div className="flex justify-between">
                <span className="text-slate-400">Razón Social:</span>
                <span className="font-bold text-slate-200">{config.companyName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">RUC:</span>
                <span className="font-bold text-slate-200">{config.companyRuc}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Régimen SUNAT:</span>
                <span className="font-bold text-emerald-400">{config.ruc20TaxRegime}</span>
              </div>
            </div>

            <Button
              variant="primary"
              fullWidth
              onClick={() => handleSafeNavigate('tablero-estadistico', 'tablero_estadistico', ['ADMIN', 'CAJA', 'RRHH', 'USER'])}
              leftIcon={<BarChart3 className="w-4 h-4" />}
            >
              Abrir Tablero Estadístico
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
