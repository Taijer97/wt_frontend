
import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, AreaChart, Area } from 'recharts';
import { 
  TrendingUp, 
  DollarSign, 
  Calculator, 
  RefreshCw, 
  ShieldCheck, 
  Calendar,
  Scale,
  Users,
  PiggyBank,
  AlertTriangle,
  ArrowUpRight,
  Target,
  FileText,
  Bell,
  CalendarClock,
  Clock,
  CheckCircle,
  Info,
  ShieldAlert
} from 'lucide-react';
import { DataService } from '../services/dataService';
import { BackendService } from '../services/backendService';
import { ProductStatus, TaxRegime } from '../types';

export const Dashboard: React.FC = () => {
  const config = DataService.getConfig();
  const isRER = config.ruc20TaxRegime === TaxRegime.RER;

  const [activeView, setActiveView] = useState<'monthly' | 'annual'>('monthly');
  const [stats, setStats] = useState({
    igvVentas: 0,
    igvCompras: 0,
    igvToPay: 0,
    rentaToPay: 0,
    salesMonthBase: 0,
    netProfitMonth: 0,
    totalSunat: 0,
    payrollCostMonth: 0,
    totalExpensesOps: 0,
    costOfGoodsSold: 0,
    // Annual stats
    annualSales: 0,
    annualExpenses: 0,
    annualNetProfit: 0,
    projectedAnnualTax: 0,
    uitUsed: 0,
    uitLimitPercent: 0,
    uit15Limit: 0
  });

  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    // Si el régimen es RER, forzamos la vista mensual ya que no existe anual
    if (isRER && activeView === 'annual') {
        setActiveView('monthly');
    }
    calculateRealData();
  }, [activeView, config.ruc20TaxRegime]);

  const calculateRealData = async () => {
    const transactionsSale = await BackendService.getTransactions('sale'); 
    const transactionsPurchase = await BackendService.getTransactions('purchase'); 
    let inventory = DataService.getProducts();
    let employees = DataService.getEmployees();
    const expenses = await BackendService.getExpenses();
    try {
      inventory = await BackendService.getProducts();
    } catch {}
    try {
      employees = await BackendService.getEmployees();
    } catch {}

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const monthStr = `${currentYear}-${(currentMonth + 1).toString().padStart(2, '0')}`;
    const yearStr = currentYear.toString();

    const monthlyPayrollCost = employees.reduce((acc, emp) => {
        const bruto = emp.baseSalary + (emp.hasChildren ? config.rmv * 0.10 : 0);
        return acc + (bruto * 1.09);
    }, 0);

    const salesThisMonth = transactionsSale.filter(t => t.date.startsWith(monthStr));
    const purchasesThisMonth = transactionsPurchase.filter(t => t.date.startsWith(monthStr));
    const expensesThisMonth = expenses.filter(e => e.date.startsWith(monthStr));

    const totalVentasBase = salesThisMonth.reduce((acc, t) => acc + t.baseAmount, 0);
    const totalVentasIGV = salesThisMonth.reduce((acc, t) => acc + t.igvAmount, 0);
    const totalComprasIGV = purchasesThisMonth.reduce((acc, t) => acc + t.igvAmount, 0);
    const totalExpensesOps = expensesThisMonth.reduce((acc, e) => acc + e.amount, 0);

    const igvToPay = Math.max(0, totalVentasIGV - totalComprasIGV);
    const rentaToPay = totalVentasBase * config.rentaRate;

    const soldItems = inventory.filter(p => p.status === ProductStatus.SOLD && p.transferDate?.startsWith(monthStr));
    const costOfGoodsSold = soldItems.reduce((acc, p) => acc + (p.transferBase || p.purchasePrice || 0), 0);
    const netProfitMonth = totalVentasBase - costOfGoodsSold - totalExpensesOps - monthlyPayrollCost - rentaToPay;

    // --- Annual Calculations (Only relevant for RMT/RGT) ---
    const salesThisYear = transactionsSale.filter(t => t.date.startsWith(yearStr));
    const annualSales = salesThisYear.reduce((acc, t) => acc + t.baseAmount, 0);
    const annualNetProfit = annualSales * 0.20; 
    
    const uit15LimitValue = config.uit * 15;
    let projectedAnnualTax = 0;
    if (annualNetProfit <= uit15LimitValue) {
        projectedAnnualTax = annualNetProfit * 0.10;
    } else {
        projectedAnnualTax = (uit15LimitValue * 0.10) + ((annualNetProfit - uit15LimitValue) * 0.295);
    }

    const uitLimitTotal = config.uit * 1700;
    const uitLimitPercent = (annualSales / uitLimitTotal) * 100;

    setStats({
        igvVentas: totalVentasIGV,
        igvCompras: totalComprasIGV,
        igvToPay,
        rentaToPay,
        salesMonthBase: totalVentasBase,
        netProfitMonth,
        totalSunat: igvToPay + rentaToPay,
        payrollCostMonth: monthlyPayrollCost,
        totalExpensesOps,
        costOfGoodsSold,
        annualSales,
        annualExpenses: annualSales * 0.7,
        annualNetProfit,
        projectedAnnualTax,
        uitUsed: annualSales / config.uit,
        uitLimitPercent,
        uit15Limit: uit15LimitValue
    });

    const monthsNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const monthlyData = [];
    for (let i = 0; i < 12; i++) {
        const mKey = `${currentYear}-${(i + 1).toString().padStart(2, '0')}`;
        const mSales = transactionsSale.filter(t => t.date.startsWith(mKey)).reduce((acc, t) => acc + t.baseAmount, 0);
        monthlyData.push({ 
          name: monthsNames[i], 
          ventas: mSales, 
          utilidad: mSales * 0.18 
        });
    }
    setChartData(monthlyData);
  };

  const getDeclarationAlert = (day: number, label: string) => {
    const today = new Date();
    const currentDay = today.getDate();
    const diff = day - currentDay;
    
    let colorClass = "bg-emerald-50 text-emerald-800 border-emerald-200";
    let icon = <CheckCircle className="w-5 h-5 text-emerald-600" />;
    let message = `Vence en ${diff} días`;

    if (diff < 0) {
        message = "Próxima declaración el mes entrante";
        colorClass = "bg-slate-50 text-slate-600 border-slate-200 opacity-60";
        icon = <Clock className="w-5 h-5" />;
    } else if (diff <= 2) {
        colorClass = "bg-red-50 text-red-800 border-red-200 animate-pulse";
        icon = <AlertTriangle className="w-5 h-5 text-red-600" />;
        message = diff === 0 ? "¡VENCE HOY!" : diff === 1 ? "¡VENCE MAÑANA!" : `Vence en ${diff} días`;
    } else if (diff <= 5) {
        colorClass = "bg-orange-50 text-orange-800 border-orange-200";
        icon = <Bell className="w-5 h-5 text-orange-600" />;
        message = `Vence en ${diff} días (Atención)`;
    }

    return (
        <div className={`p-4 rounded-2xl border-2 flex items-center gap-4 transition-all ${colorClass}`}>
            <div className="p-2 bg-white rounded-xl shadow-sm">{icon}</div>
            <div className="flex-1">
                <p className="text-[10px] font-black uppercase tracking-widest opacity-70">{label}</p>
                <p className="text-sm font-black uppercase">{message}</p>
                <p className="text-[9px] font-bold">Día configurado: {day} de cada mes</p>
            </div>
        </div>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      {/* Alertas de Vencimiento Mensual */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {getDeclarationAlert(config.ruc10DeclarationDay, "Declaración RUC 10")}
        {getDeclarationAlert(config.ruc20DeclarationDay, "Declaración RUC 20")}
      </div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              {activeView === 'monthly' ? <Calendar className="text-blue-600" /> : <Scale className="text-emerald-600" />}
              {activeView === 'monthly' ? 'Dashboard Mensual' : 'Cierre Anual & Proyección'}
              <span className="ml-4 px-3 py-1 bg-slate-900 text-emerald-400 text-[10px] rounded-full font-black uppercase tracking-widest">
                  {config.ruc20TaxRegime.replace('REGIMEN_', '')}
              </span>
            </h2>
            <p className="text-sm text-slate-600 font-bold">Empresa: {config.companyName} | RUC: {config.companyRuc}</p>
          </div>
          <div className="flex bg-gray-200 p-1 rounded-xl">
              <button 
                onClick={() => setActiveView('monthly')} 
                className={`px-6 py-2.5 text-sm font-bold rounded-lg transition-all flex items-center gap-2 ${activeView === 'monthly' ? 'bg-white text-slate-900 shadow-md' : 'text-slate-600 hover:text-slate-800'}`}
              >
                Mensual
              </button>
              
              {/* SOLO MOSTRAR ANUAL SI NO ES RER */}
              {!isRER && (
                <button 
                    onClick={() => setActiveView('annual')} 
                    className={`px-6 py-2.5 text-sm font-bold rounded-lg transition-all flex items-center gap-2 ${activeView === 'annual' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-600 hover:text-slate-800'}`}
                >
                    Anual
                </button>
              )}
          </div>
      </div>

      {activeView === 'monthly' ? (
        <>
          {isRER && (
            <div className="bg-blue-50 border-2 border-blue-100 p-4 rounded-2xl flex items-center gap-3 text-blue-800">
                <Info className="w-5 h-5 flex-shrink-0" />
                <p className="text-xs font-bold uppercase">Usted se encuentra en el <span className="font-black">Régimen Especial (RER)</span>. Sus pagos mensuales de renta son cancelatorios y no está obligado a presentar DJ Anual.</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <KPICard title="Ventas Netas" value={stats.salesMonthBase} sub="Sin impuestos" icon={<TrendingUp />} color="blue" />
            <KPICard title="Utilidad Real" value={stats.netProfitMonth} sub="Libre de gastos" icon={<PiggyBank />} color="emerald" />
            <KPICard title="Planilla + RRHH" value={stats.payrollCostMonth} sub="Costo operativo" icon={<Users />} color="orange" />
            <KPICard title="Pago SUNAT" value={stats.totalSunat} sub="IGV + Renta" icon={<Calculator />} color="slate" isDark />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 flex flex-col">
                  <h3 className="font-bold text-slate-900 mb-6 flex items-center gap-2 border-b pb-4 uppercase text-xs tracking-widest">
                      <ShieldCheck className="w-5 h-5 text-blue-700" />
                      Liquidación del Mes
                  </h3>
                  <div className="space-y-4 flex-1">
                      <div className="flex justify-between items-center text-sm">
                          <span className="text-slate-600 font-bold">IGV Ventas (Débito)</span>
                          <span className="font-black text-slate-800">S/ {stats.igvVentas.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                          <span className="text-slate-600 font-bold">IGV Compras (Crédito)</span>
                          <span className="font-black text-emerald-700">- S/ {stats.igvCompras.toFixed(2)}</span>
                      </div>
                      <div className="bg-slate-100 p-4 rounded-2xl border border-slate-200 flex justify-between items-center">
                          <span className="text-xs font-black text-slate-600 uppercase">IGV a Pagar</span>
                          <span className="font-black text-xl text-slate-900">S/ {stats.igvToPay.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm pt-2">
                          <div className="flex flex-col">
                            <span className="text-slate-600 font-bold">Pago Renta ({ (config.rentaRate * 100).toFixed(1) }%)</span>
                            {isRER && <span className="text-[8px] font-black text-blue-600 uppercase tracking-tighter">PAGO CANCELATORIO RER</span>}
                          </div>
                          <span className="font-black text-slate-800">S/ {stats.rentaToPay.toFixed(2)}</span>
                      </div>
                  </div>
                  <div className="mt-8 pt-6 border-t flex justify-between items-end">
                      <div>
                          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Total Tributos</p>
                          <p className="text-3xl font-black text-slate-900">S/ {stats.totalSunat.toFixed(2)}</p>
                      </div>
                      <button onClick={calculateRealData} className="p-3 bg-gray-100 hover:bg-gray-200 rounded-xl text-slate-700 transition-all shadow-sm active:scale-90"><RefreshCw className="w-5 h-5" /></button>
                  </div>
              </div>

              <div className="lg:col-span-2 bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
                  <h3 className="font-bold text-slate-900 mb-6 flex items-center gap-2 uppercase text-xs tracking-widest">
                    <ArrowUpRight className="text-blue-700" />
                    Crecimiento de Ingresos
                  </h3>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData.filter(d => d.ventas > 0 || d.name === 'Ene')}>
                            <defs>
                                <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1}/>
                                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#475569', fontWeight: 800}} />
                            <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#475569', fontWeight: 800}} />
                            <Tooltip contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', fontWeight: 'bold'}} />
                            <Area type="monotone" dataKey="ventas" name="Ventas" stroke="#2563eb" strokeWidth={4} fillOpacity={1} fill="url(#colorSales)" />
                        </AreaChart>
                    </ResponsiveContainer>
                  </div>
              </div>
          </div>
        </>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
                  <div className="flex justify-between items-start mb-8">
                      <div>
                          <h3 className="font-black text-slate-900 text-xl uppercase tracking-tighter">Estado de Límites {config.ruc20TaxRegime === TaxRegime.RMT ? 'RMT' : 'RGT'}</h3>
                          <p className="text-sm text-slate-600 font-bold">Límite anual proyectado: 1,700 UIT</p>
                      </div>
                      <div className="text-right">
                          <p className="text-2xl font-black text-slate-900">{stats.uitLimitPercent.toFixed(2)}%</p>
                          <p className="text-[10px] font-black text-slate-500 uppercase">Utilizado</p>
                      </div>
                  </div>

                  <div className="space-y-8">
                      <div>
                          <div className="flex justify-between text-[10px] font-black mb-2 uppercase tracking-widest">
                              <span className="text-slate-600">Ventas Acumuladas {new Date().getFullYear()}</span>
                              <span className="text-slate-900">S/ {stats.annualSales.toLocaleString()}</span>
                          </div>
                          <div className="w-full bg-slate-200 h-6 rounded-full overflow-hidden p-1 border border-slate-300 shadow-inner">
                              <div 
                                className={`h-full rounded-full transition-all duration-1000 ${stats.uitLimitPercent > 90 ? 'bg-red-600' : 'bg-blue-700'}`} 
                                style={{ width: `${Math.min(stats.uitLimitPercent, 100)}%` }}
                              ></div>
                          </div>
                          <div className="flex justify-between text-[10px] font-black mt-2 text-slate-500 uppercase">
                              <span>0 UIT</span>
                              <span className="text-slate-900">Tope MYPE: S/ {(config.uit * 1700).toLocaleString()}</span>
                          </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200">
                              <p className="text-[9px] font-black text-slate-500 uppercase mb-1 tracking-widest">Equivalencia en UITs</p>
                              <p className="text-xl font-black text-slate-900">{stats.uitUsed.toFixed(2)} <span className="text-sm font-bold opacity-40">UIT</span></p>
                          </div>
                          <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200">
                              <p className="text-[9px] font-black text-emerald-800 uppercase mb-1 tracking-widest">Margen Disponible</p>
                              <p className="text-xl font-black text-emerald-900">S/ {(config.uit * 1700 - stats.annualSales).toLocaleString()}</p>
                          </div>
                      </div>
                  </div>
              </div>

              <div className="bg-slate-900 text-white p-8 rounded-[2.5rem] shadow-2xl flex flex-col relative overflow-hidden">
                  <div className="absolute -top-10 -right-10 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl"></div>
                  <div className="flex justify-between items-start mb-6 relative z-10">
                      <Target className="w-8 h-8 text-emerald-400" />
                      <span className="text-[9px] font-black bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full uppercase border border-emerald-500/10">Est. Anual {new Date().getFullYear()}</span>
                  </div>
                  <h3 className="text-lg font-black mb-2 uppercase tracking-tighter relative z-10">Cierre Anual Renta</h3>
                  <p className="text-[10px] text-slate-400 mb-8 leading-relaxed font-bold uppercase relative z-10">Escala Progresiva RMT: 10% hasta 15 UIT, 29.5% exceso.</p>
                  
                  <div className="space-y-4 flex-1 relative z-10">
                      <div className="flex justify-between text-sm">
                          <span className="text-slate-400 font-bold uppercase text-[10px]">Utilidad Proyectada</span>
                          <span className="font-black text-white">S/ {stats.annualNetProfit.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                          <span className="text-slate-400 font-bold uppercase text-[10px]">Base Imponible Anual</span>
                          <span className="font-black text-emerald-400 uppercase tracking-widest text-[10px]">GRAVADA</span>
                      </div>
                      <div className="border-t border-slate-800 my-4"></div>
                      <div>
                          <p className="text-[10px] font-black text-slate-500 uppercase mb-1 tracking-widest">Impuesto Estimado a Regularizar</p>
                          <p className="text-4xl font-black text-emerald-400 tracking-tighter">S/ {stats.projectedAnnualTax.toLocaleString()}</p>
                      </div>
                  </div>

                  <div className="mt-8 relative z-10">
                      <button className="w-full bg-emerald-500 text-slate-900 font-black py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-emerald-400 transition-all shadow-xl active:scale-95 text-xs uppercase tracking-widest">
                          <FileText className="w-5 h-5" />
                          Generar Proforma DJ
                      </button>
                  </div>
              </div>
          </div>

          <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
              <h3 className="font-black text-slate-900 mb-8 uppercase tracking-widest text-xs">Análisis de Ingresos Anualizado</h3>
              <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#1e293b', fontWeight: 800}} />
                          <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#1e293b', fontWeight: 800}} />
                          <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', fontWeight: 'black'}} />
                          <Bar dataKey="ventas" name="Ventas" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={30} />
                          <Bar dataKey="utilidad" name="Utilidad" fill="#10b981" radius={[4, 4, 0, 0]} barSize={30} />
                      </BarChart>
                  </ResponsiveContainer>
              </div>
          </div>
        </>
      )}

      {/* Alertas de Cambio de Régimen solo para RMT */}
      {!isRER && stats.uitLimitPercent > 80 && (
          <div className="bg-red-50 border-2 border-red-200 p-6 rounded-[2rem] flex items-center gap-6 text-red-900 animate-pulse">
              <ShieldAlert className="w-12 h-12 flex-shrink-0 text-red-600" />
              <div>
                  <h4 className="font-black text-lg uppercase tracking-tighter">Advertencia de Límite de Régimen</h4>
                  <p className="text-sm font-bold opacity-80">Has alcanzado el {stats.uitLimitPercent.toFixed(1)}% del tope MYPE (1700 UIT). Si superas este monto, deberás migrar automáticamente al Régimen General (RGT).</p>
              </div>
          </div>
      )}
    </div>
  );
};

interface KPICardProps {
    title: string;
    value: number;
    sub: string;
    icon: React.ReactNode;
    color: 'blue' | 'emerald' | 'orange' | 'slate';
    isDark?: boolean;
}

const KPICard: React.FC<KPICardProps> = ({ title, value, sub, icon, color, isDark }) => {
    const colors = {
        blue: isDark ? 'bg-slate-900 text-white' : 'bg-white text-blue-700',
        emerald: isDark ? 'bg-slate-900 text-white' : 'bg-white text-emerald-700',
        orange: isDark ? 'bg-slate-900 text-white' : 'bg-white text-orange-700',
        slate: isDark ? 'bg-slate-900 text-white shadow-xl' : 'bg-white text-slate-800'
    };

    return (
        <div className={`${colors[color]} p-8 rounded-3xl shadow-sm border border-gray-100 group hover:shadow-xl hover:-translate-y-1 transition-all duration-300`}>
            <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-2xl ${isDark ? 'bg-slate-800 text-emerald-400' : 'bg-slate-50 text-slate-900'}`}>
                    {React.isValidElement(icon) ? React.cloneElement(icon as React.ReactElement<any>, { className: 'w-5 h-5' }) : icon}
                </div>
                <span className={`text-[9px] font-black uppercase tracking-[0.2em] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{title}</span>
            </div>
            <h3 className={`text-2xl font-black tracking-tighter ${isDark ? 'text-white' : 'text-slate-900'}`}>
                S/ {value.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
            </h3>
            <p className={`text-[9px] mt-2 font-black uppercase tracking-widest ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                {sub}
            </p>
        </div>
    );
};
