import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { 
  TrendingUp, 
  Calculator, 
  RefreshCw, 
  ShieldCheck, 
  Users, 
  PiggyBank, 
  ArrowUpRight, 
  Target, 
  FileText, 
  Info, 
  ShieldAlert
} from 'lucide-react';
import { DataService } from '../services/dataService';
import { BackendService } from '../services/backendService';
import { ProductStatus, TaxRegime } from '../types';
import { KPICard as UIKPICard, Card, Button, Tabs, Badge, useAlert } from './ui';

export const Dashboard: React.FC = () => {
  const config = DataService.getConfig();
  const isRER = config.ruc20TaxRegime === TaxRegime.RER;
  const alert = useAlert();

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
    annualSales: 0,
    annualExpenses: 0,
    annualNetProfit: 0,
    projectedAnnualTax: 0,
    uitUsed: 0,
    uitLimitPercent: 0,
    uit15Limit: 0,
  });

  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
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

    const salesThisMonth = transactionsSale.filter((t: any) => {
      const d = new Date(t.date || t.created_at);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    const purchasesThisMonth = transactionsPurchase.filter((t: any) => {
      const d = new Date(t.date || t.created_at);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    const expensesThisMonth = expenses.filter((e: any) => {
      const d = new Date(e.date || e.created_at);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    let salesMonthBase = 0;
    let igvVentas = 0;
    salesThisMonth.forEach((t: any) => {
      const total = Number(t.totalAmount || t.total_amount || 0);
      const base = total / 1.18;
      salesMonthBase += base;
      igvVentas += total - base;
    });

    let purchasesMonthBase = 0;
    let igvCompras = 0;
    purchasesThisMonth.forEach((t: any) => {
      const total = Number(t.totalAmount || t.total_amount || 0);
      const base = total / 1.18;
      purchasesMonthBase += base;
      igvCompras += total - base;
    });

    let payrollCostMonth = 0;
    employees.forEach((e: any) => {
      payrollCostMonth += Number(e.baseSalary || 0);
    });

    let totalExpensesOps = 0;
    expensesThisMonth.forEach((e: any) => {
      totalExpensesOps += Number(e.amount || 0);
    });

    const costOfGoodsSold = salesMonthBase * 0.7;
    const igvToPay = Math.max(0, igvVentas - igvCompras);
    const rentaRate = config.rentaRate || 0.01;
    const rentaToPay = salesMonthBase * rentaRate;
    const totalSunat = igvToPay + rentaToPay;
    const netProfitMonth = salesMonthBase - costOfGoodsSold - payrollCostMonth - totalExpensesOps - rentaToPay;

    const salesThisYear = transactionsSale.filter((t: any) => {
      const d = new Date(t.date || t.created_at);
      return d.getFullYear() === currentYear;
    });

    let annualSales = 0;
    salesThisYear.forEach((t: any) => {
      const total = Number(t.totalAmount || t.total_amount || 0);
      annualSales += total / 1.18;
    });

    const annualExpenses = (payrollCostMonth + totalExpensesOps) * 12;
    const annualNetProfit = Math.max(0, annualSales - annualSales * 0.7 - annualExpenses);

    const uitValue = config.uit || 5150;
    const uit15Limit = uitValue * 15;
    let projectedAnnualTax = 0;

    if (annualNetProfit > 0) {
      if (annualNetProfit <= uit15Limit) {
        projectedAnnualTax = annualNetProfit * 0.1;
      } else {
        projectedAnnualTax = uit15Limit * 0.1 + (annualNetProfit - uit15Limit) * 0.295;
      }
    }

    const uit1700Limit = uitValue * 1700;
    const uitUsed = annualSales / uitValue;
    const uitLimitPercent = (annualSales / uit1700Limit) * 100;

    setStats({
      igvVentas,
      igvCompras,
      igvToPay,
      rentaToPay,
      salesMonthBase,
      netProfitMonth,
      totalSunat,
      payrollCostMonth,
      totalExpensesOps,
      costOfGoodsSold,
      annualSales,
      annualExpenses,
      annualNetProfit,
      projectedAnnualTax,
      uitUsed,
      uitLimitPercent,
      uit15Limit,
    });

    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Set', 'Oct', 'Nov', 'Dic'];
    const mockData = months.map((m, idx) => {
      const isCurrentOrPast = idx <= currentMonth;
      const v = isCurrentOrPast ? Math.floor(salesMonthBase * (0.8 + idx * 0.05)) : 0;
      const u = isCurrentOrPast ? Math.floor(v * 0.25) : 0;
      return { name: m, ventas: v, utilidad: u };
    });

    setChartData(mockData);
  };

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      {/* Dynamic View Toggle Tabs */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Tablero Consolidado</h2>
          <p className="text-xs text-slate-500 font-medium">Indicadores financieros, tributación SUNAT y proyección de renta</p>
        </div>

        <div className="flex items-center gap-3">
          <Tabs
            tabs={[
              { id: 'monthly', label: 'Mensual' },
              ...(!isRER ? [{ id: 'annual', label: 'Anualizado (RMT)' }] : []),
            ]}
            activeTab={activeView}
            onTabChange={(id) => setActiveView(id as any)}
            variant="pills"
          />

          <Button
            variant="outline"
            size="sm"
            onClick={() => { calculateRealData(); alert.success('Datos actualizados'); }}
            leftIcon={<RefreshCw className="w-4 h-4" />}
          >
            Actualizar
          </Button>
        </div>
      </div>

      {activeView === 'monthly' ? (
        <>
          {isRER && (
            <div className="bg-blue-50 border border-blue-200 p-4 rounded-2xl flex items-center gap-3 text-blue-800 text-xs font-medium">
              <Info className="w-5 h-5 flex-shrink-0 text-blue-600" />
              <p>
                Régimen <strong className="font-extrabold uppercase">RER (Especial)</strong> activo. Los pagos de renta son cancelatorios y no requiere DJ anual.
              </p>
            </div>
          )}

          {/* 4 KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <UIKPICard
              title="Ventas Netas"
              value={stats.salesMonthBase}
              prefix="S/"
              subtitle="Sin impuestos"
              icon={<TrendingUp className="w-5 h-5 text-blue-600" />}
            />
            <UIKPICard
              title="Utilidad Real"
              value={stats.netProfitMonth}
              prefix="S/"
              subtitle="Libre de gastos"
              icon={<PiggyBank className="w-5 h-5 text-emerald-600" />}
            />
            <UIKPICard
              title="Planilla + RRHH"
              value={stats.payrollCostMonth}
              prefix="S/"
              subtitle="Costo operativo"
              icon={<Users className="w-5 h-5 text-amber-600" />}
            />
            <UIKPICard
              title="Pago SUNAT"
              value={stats.totalSunat}
              prefix="S/"
              subtitle="IGV + Renta"
              icon={<Calculator className="w-5 h-5 text-emerald-400" />}
              variant="dark"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card padding="md" className="flex flex-col">
              <h3 className="font-extrabold text-slate-900 mb-6 flex items-center gap-2 border-b pb-4 uppercase text-xs tracking-wider">
                <ShieldCheck className="w-5 h-5 text-blue-700" />
                Liquidación del Mes
              </h3>
              <div className="space-y-4 flex-1 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-600 font-bold">IGV Ventas (Débito)</span>
                  <span className="font-black text-slate-800">S/ {stats.igvVentas.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600 font-bold">IGV Compras (Crédito)</span>
                  <span className="font-black text-emerald-700">- S/ {stats.igvCompras.toFixed(2)}</span>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex justify-between items-center">
                  <span className="text-xs font-black text-slate-600 uppercase">IGV a Pagar</span>
                  <span className="font-black text-lg text-slate-900">S/ {stats.igvToPay.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center pt-2">
                  <div className="flex flex-col">
                    <span className="text-slate-600 font-bold">
                      Pago Renta ({(config.rentaRate * 100).toFixed(1)}%)
                    </span>
                    {isRER && (
                      <span className="text-[9px] font-black text-blue-600 uppercase tracking-tight">
                        PAGO CANCELATORIO RER
                      </span>
                    )}
                  </div>
                  <span className="font-black text-slate-800">S/ {stats.rentaToPay.toFixed(2)}</span>
                </div>
              </div>
              <div className="mt-6 pt-4 border-t flex justify-between items-end">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Total Tributos</p>
                  <p className="text-2xl font-black text-slate-900">S/ {stats.totalSunat.toFixed(2)}</p>
                </div>
              </div>
            </Card>

            <Card padding="md" className="lg:col-span-2">
              <h3 className="font-extrabold text-slate-900 mb-6 flex items-center gap-2 uppercase text-xs tracking-wider">
                <ArrowUpRight className="text-blue-700" />
                Crecimiento de Ingresos
              </h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData.filter((d) => d.ventas > 0 || d.name === 'Ene')}>
                    <defs>
                      <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b', fontWeight: 700 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b', fontWeight: 700 }} />
                    <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }} />
                    <Area type="monotone" dataKey="ventas" name="Ventas" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>
        </>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card padding="md" className="lg:col-span-2">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="font-black text-slate-900 text-lg uppercase tracking-tight">
                    Estado de Límites {config.ruc20TaxRegime === TaxRegime.RMT ? 'RMT' : 'RGT'}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">Límite anual proyectado: 1,700 UIT</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-black text-slate-900">{stats.uitLimitPercent.toFixed(2)}%</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Utilizado</p>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <div className="flex justify-between text-xs font-bold mb-2 uppercase">
                    <span className="text-slate-600">Ventas Acumuladas {new Date().getFullYear()}</span>
                    <span className="text-slate-900 font-black">S/ {stats.annualSales.toLocaleString()}</span>
                  </div>
                  <div className="w-full bg-slate-100 h-4 rounded-full overflow-hidden p-0.5 border border-slate-200">
                    <div
                      className={`h-full rounded-full transition-all duration-1000 ${
                        stats.uitLimitPercent > 90 ? 'bg-red-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min(stats.uitLimitPercent, 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] font-bold mt-2 text-slate-400 uppercase">
                    <span>0 UIT</span>
                    <span className="text-slate-700 font-black">
                      Tope MYPE: S/ {(config.uit * 1700).toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                    <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Equivalencia en UITs</p>
                    <p className="text-lg font-black text-slate-900">
                      {stats.uitUsed.toFixed(2)} <span className="text-xs font-bold opacity-50">UIT</span>
                    </p>
                  </div>
                  <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200">
                    <p className="text-[10px] font-bold text-emerald-800 uppercase mb-1">Margen Disponible</p>
                    <p className="text-lg font-black text-emerald-900">
                      S/ {(config.uit * 1700 - stats.annualSales).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            </Card>

            <Card variant="dark" padding="md" className="flex flex-col relative overflow-hidden">
              <div className="flex justify-between items-start mb-6">
                <Target className="w-7 h-7 text-emerald-400" />
                <Badge variant="success" size="sm">
                  Est. Anual {new Date().getFullYear()}
                </Badge>
              </div>
              <h3 className="text-base font-black mb-1 uppercase tracking-tight text-white">Cierre Anual Renta</h3>
              <p className="text-[10px] text-slate-400 mb-6 font-medium uppercase">
                Escala Progresiva RMT: 10% hasta 15 UIT, 29.5% exceso.
              </p>

              <div className="space-y-4 flex-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400 font-bold uppercase text-[10px]">Utilidad Proyectada</span>
                  <span className="font-black text-white">S/ {stats.annualNetProfit.toLocaleString()}</span>
                </div>
                <div className="border-t border-slate-800 pt-3">
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Impuesto Estimado a Regularizar</p>
                  <p className="text-3xl font-black text-emerald-400 tracking-tight">
                    S/ {stats.projectedAnnualTax.toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="mt-6">
                <Button variant="primary" fullWidth leftIcon={<FileText className="w-4 h-4" />}>
                  Generar Proforma DJ
                </Button>
              </div>
            </Card>
          </div>

          <Card padding="md">
            <h3 className="font-extrabold text-slate-900 mb-6 uppercase tracking-wider text-xs">
              Análisis de Ingresos Anualizado
            </h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b', fontWeight: 700 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b', fontWeight: 700 }} />
                  <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }} />
                  <Bar dataKey="ventas" name="Ventas" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={26} />
                  <Bar dataKey="utilidad" name="Utilidad" fill="#10b981" radius={[4, 4, 0, 0]} barSize={26} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </>
      )}

      {/* Warning Toast for RMT Tax Limit */}
      {!isRER && stats.uitLimitPercent > 80 && (
        <div className="bg-red-50 border border-red-200 p-5 rounded-2xl flex items-center gap-4 text-red-900 animate-pulse">
          <ShieldAlert className="w-10 h-10 flex-shrink-0 text-red-600" />
          <div>
            <h4 className="font-black text-sm uppercase tracking-tight">Advertencia de Límite de Régimen</h4>
            <p className="text-xs font-medium opacity-90 mt-0.5">
              Has alcanzado el {stats.uitLimitPercent.toFixed(1)}% del tope MYPE (1700 UIT). Si superas este monto, deberás migrar al Régimen General (RGT).
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
