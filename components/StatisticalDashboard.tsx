import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area 
} from 'recharts';
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
  ShieldAlert,
  Calendar,
  BarChart3,
  Building2,
  Printer
} from 'lucide-react';
import { DataService } from '../services/dataService';
import { BackendService } from '../services/backendService';
import { TaxRegime } from '../types';
import { Button, Badge, Modal, useAlert } from './ui';

export const StatisticalDashboard: React.FC = () => {
  const config = DataService.getConfig();
  const isRER = config.ruc20TaxRegime === TaxRegime.RER;
  const alert = useAlert();

  const currentYearNow = new Date().getFullYear();
  const currentMonthNow = new Date().getMonth();

  const [selectedYear, setSelectedYear] = useState<number>(currentYearNow);
  const [selectedMonth, setSelectedMonth] = useState<number | 'ALL'>(currentMonthNow);
  const [activeView, setActiveView] = useState<'monthly' | 'annual'>('monthly');
  const [chartType, setChartType] = useState<'sales_vs_purchases' | 'sales_vs_profit'>('sales_vs_purchases');
  const [showProformaModal, setShowProformaModal] = useState(false);
  const [loading, setLoading] = useState(false);

  const [stats, setStats] = useState({
    salesMonthBase: 0,
    salesMonthGross: 0,
    purchasesMonthBase: 0,
    igvVentas: 0,
    igvCompras: 0,
    igvToPay: 0,
    igvCreditBalance: 0,
    rentaToPay: 0,
    totalSunat: 0,
    payrollCostMonth: 0,
    totalExpensesOps: 0,
    costOfGoodsSold: 0,
    netProfitMonth: 0,
    netMarginPercent: 0,

    annualSales: 0,
    annualPurchases: 0,
    annualExpensesReal: 0,
    annualNetProfit: 0,
    projectedAnnualTax: 0,
    taxTier1: 0,
    taxTier2: 0,
    accumulatedRentaPaid: 0,
    netTaxToPayOrRefund: 0,

    uitValue: 5350,
    uit15Limit: 80250,
    uit1700Limit: 9095000,
    uitUsed: 0,
    uitLimitPercent: 0,
    marginRemaining: 0,
  });

  const [monthlyChartData, setMonthlyChartData] = useState<any[]>([]);

  const monthsList = [
    { id: 0, label: 'Enero' },
    { id: 1, label: 'Febrero' },
    { id: 2, label: 'Marzo' },
    { id: 3, label: 'Abril' },
    { id: 4, label: 'Mayo' },
    { id: 5, label: 'Junio' },
    { id: 6, label: 'Julio' },
    { id: 7, label: 'Agosto' },
    { id: 8, label: 'Setiembre' },
    { id: 9, label: 'Octubre' },
    { id: 10, label: 'Noviembre' },
    { id: 11, label: 'Diciembre' },
  ];

  const yearsList = [currentYearNow, currentYearNow - 1, currentYearNow - 2];

  useEffect(() => {
    if (isRER && activeView === 'annual') {
      setActiveView('monthly');
    }
    calculateRealData();
  }, [selectedYear, selectedMonth, activeView, config.ruc20TaxRegime]);

  const calculateRealData = async () => {
    setLoading(true);
    try {
      const transactionsSale = await BackendService.getTransactions('sale');
      const transactionsPurchase = await BackendService.getTransactions('purchase');
      let inventory = DataService.getProducts();
      let employees = DataService.getEmployees();
      let expenses: any[] = [];

      try { inventory = await BackendService.getProducts(); } catch {}
      try { employees = await BackendService.getEmployees(); } catch {}
      try { expenses = await BackendService.getExpenses(); } catch {}

      const uitValue = config.uit || 5350;
      const currentYear = selectedYear;

      const salesThisPeriod = transactionsSale.filter((t: any) => {
        const d = new Date(t.date || t.created_at);
        if (d.getFullYear() !== currentYear) return false;
        if (selectedMonth !== 'ALL' && d.getMonth() !== selectedMonth) return false;
        return true;
      });

      const purchasesThisPeriod = transactionsPurchase.filter((t: any) => {
        const d = new Date(t.date || t.created_at);
        if (d.getFullYear() !== currentYear) return false;
        if (selectedMonth !== 'ALL' && d.getMonth() !== selectedMonth) return false;
        return true;
      });

      const expensesThisPeriod = expenses.filter((e: any) => {
        const d = new Date(e.date || e.created_at);
        if (d.getFullYear() !== currentYear) return false;
        if (selectedMonth !== 'ALL' && d.getMonth() !== selectedMonth) return false;
        return true;
      });

      let salesMonthBase = 0;
      let salesMonthGross = 0;
      let igvVentas = 0;
      salesThisPeriod.forEach((t: any) => {
        const total = Number(t.totalAmount || t.total_amount || 0);
        const base = Number(t.baseAmount || t.base_amount || (total / 1.18));
        salesMonthGross += total;
        salesMonthBase += base;
        igvVentas += (total - base);
      });

      let purchasesMonthBase = 0;
      let igvCompras = 0;
      purchasesThisPeriod.forEach((t: any) => {
        const total = Number(t.totalAmount || t.total_amount || 0);
        const base = Number(t.baseAmount || t.base_amount || (total / 1.18));
        purchasesMonthBase += base;
        igvCompras += (total - base);
      });

      let payrollCostMonth = 0;
      employees.forEach((e: any) => {
        payrollCostMonth += Number(e.baseSalary || 0);
      });
      if (selectedMonth === 'ALL') {
        payrollCostMonth = payrollCostMonth * 12;
      }

      let totalExpensesOps = 0;
      expensesThisPeriod.forEach((e: any) => {
        totalExpensesOps += Number(e.amount || 0);
      });

      const costOfGoodsSold = salesMonthBase * 0.7;
      const igvToPay = Math.max(0, igvVentas - igvCompras);
      const igvCreditBalance = Math.max(0, igvCompras - igvVentas);
      const rentaRate = config.rentaRate || 0.01;
      const rentaToPay = salesMonthBase * rentaRate;
      const totalSunat = igvToPay + rentaToPay;

      const netProfitMonth = salesMonthBase - costOfGoodsSold - payrollCostMonth - totalExpensesOps - rentaToPay;
      const netMarginPercent = salesMonthBase > 0 ? (netProfitMonth / salesMonthBase) * 100 : 0;

      const salesThisYear = transactionsSale.filter((t: any) => {
        const d = new Date(t.date || t.created_at);
        return d.getFullYear() === currentYear;
      });

      const purchasesThisYear = transactionsPurchase.filter((t: any) => {
        const d = new Date(t.date || t.created_at);
        return d.getFullYear() === currentYear;
      });

      const expensesThisYear = expenses.filter((e: any) => {
        const d = new Date(e.date || e.created_at);
        return d.getFullYear() === currentYear;
      });

      let annualSales = 0;
      salesThisYear.forEach((t: any) => {
        const total = Number(t.totalAmount || t.total_amount || 0);
        annualSales += Number(t.baseAmount || t.base_amount || (total / 1.18));
      });

      let annualPurchases = 0;
      purchasesThisYear.forEach((t: any) => {
        const total = Number(t.totalAmount || t.total_amount || 0);
        annualPurchases += Number(t.baseAmount || t.base_amount || (total / 1.18));
      });

      let annualOpsExpenses = 0;
      expensesThisYear.forEach((e: any) => {
        annualOpsExpenses += Number(e.amount || 0);
      });

      let annualPayroll = 0;
      employees.forEach((e: any) => annualPayroll += Number(e.baseSalary || 0));
      annualPayroll = annualPayroll * 12;

      const annualExpensesReal = annualPayroll + annualOpsExpenses;
      const annualNetProfit = Math.max(0, annualSales - (annualSales * 0.7) - annualExpensesReal);

      const uit15Limit = uitValue * 15;
      const uit1700Limit = uitValue * 1700;
      let projectedAnnualTax = 0;
      let taxTier1 = 0;
      let taxTier2 = 0;

      if (annualNetProfit > 0) {
        if (annualNetProfit <= uit15Limit) {
          taxTier1 = annualNetProfit * 0.10;
          projectedAnnualTax = taxTier1;
        } else {
          taxTier1 = uit15Limit * 0.10;
          taxTier2 = (annualNetProfit - uit15Limit) * 0.295;
          projectedAnnualTax = taxTier1 + taxTier2;
        }
      }

      const accumulatedRentaPaid = annualSales * rentaRate;
      const netTaxToPayOrRefund = projectedAnnualTax - accumulatedRentaPaid;

      const uitUsed = annualSales / uitValue;
      const uitLimitPercent = (annualSales / uit1700Limit) * 100;
      const marginRemaining = Math.max(0, uit1700Limit - annualSales);

      setStats({
        salesMonthBase,
        salesMonthGross,
        purchasesMonthBase,
        igvVentas,
        igvCompras,
        igvToPay,
        igvCreditBalance,
        rentaToPay,
        totalSunat,
        payrollCostMonth,
        totalExpensesOps,
        costOfGoodsSold,
        netProfitMonth,
        netMarginPercent,

        annualSales,
        annualPurchases,
        annualExpensesReal,
        annualNetProfit,
        projectedAnnualTax,
        taxTier1,
        taxTier2,
        accumulatedRentaPaid,
        netTaxToPayOrRefund,

        uitValue,
        uit15Limit,
        uit1700Limit,
        uitUsed,
        uitLimitPercent,
        marginRemaining,
      });

      const monthShortNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Set', 'Oct', 'Nov', 'Dic'];
      const monthlyData = monthShortNames.map((mName, mIdx) => {
        const monthSales = transactionsSale.filter((t: any) => {
          const d = new Date(t.date || t.created_at);
          return d.getFullYear() === currentYear && d.getMonth() === mIdx;
        });
        const monthPurchases = transactionsPurchase.filter((t: any) => {
          const d = new Date(t.date || t.created_at);
          return d.getFullYear() === currentYear && d.getMonth() === mIdx;
        });
        const monthExpenses = expenses.filter((e: any) => {
          const d = new Date(e.date || e.created_at);
          return d.getFullYear() === currentYear && d.getMonth() === mIdx;
        });

        let mSalesBase = 0;
        monthSales.forEach((t: any) => {
          const total = Number(t.totalAmount || t.total_amount || 0);
          mSalesBase += Number(t.baseAmount || t.base_amount || (total / 1.18));
        });

        let mPurchasesBase = 0;
        monthPurchases.forEach((t: any) => {
          const total = Number(t.totalAmount || t.total_amount || 0);
          mPurchasesBase += Number(t.baseAmount || t.base_amount || (total / 1.18));
        });

        let mExp = 0;
        monthExpenses.forEach((e: any) => mExp += Number(e.amount || 0));

        const mPayroll = employees.reduce((acc: number, emp: any) => acc + Number(emp.baseSalary || 0), 0);
        const mCOGS = mSalesBase * 0.7;
        const mRenta = mSalesBase * rentaRate;
        const mUtilidad = mSalesBase - mCOGS - mPayroll - mExp - mRenta;

        return {
          name: mName,
          ventas: Math.round(mSalesBase),
          compras: Math.round(mPurchasesBase),
          utilidad: Math.round(mUtilidad),
        };
      });

      setMonthlyChartData(monthlyData);
    } catch (err) {
      console.error('Error calculating dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatPEN = (val: number) => {
    return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(val);
  };

  const getTaxRegimeBadge = () => {
    switch (config.ruc20TaxRegime) {
      case TaxRegime.RER:
        return <Badge variant="info" size="md">Régimen Especial (RER) - 1.5%</Badge>;
      case TaxRegime.RMT:
        return <Badge variant="success" size="md">Régimen MYPE Tributario (RMT) - 1.0%</Badge>;
      case TaxRegime.RGT:
        return <Badge variant="danger" size="md">Régimen General (RGT) - 1.5%</Badge>;
      default:
        return <Badge variant="neutral" size="md">Régimen MYPE (RMT)</Badge>;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* ── Header Banner ────────────────────────────────────────── */}
      <div className="bg-slate-950 text-white rounded-3xl p-6 md:p-8 shadow-2xl border border-slate-800 relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-full text-xs font-black uppercase tracking-wider border border-emerald-500/30 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Métricas SUNAT
              </span>
              {getTaxRegimeBadge()}
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white flex items-center gap-2">
              Tablero Estadístico Financiero
            </h1>
            <p className="text-xs text-slate-400 font-medium max-w-xl">
              Análisis cuantitativo de rentabilidad real, tributación SUNAT (IGV + Renta) y proyección MYPE de 1,700 UIT.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 bg-slate-900/90 p-3 rounded-2xl border border-slate-800 backdrop-blur-md">
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-950 rounded-xl border border-slate-800 text-xs font-bold">
              <Calendar className="w-3.5 h-3.5 text-emerald-400" />
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="bg-transparent text-slate-200 focus:outline-none cursor-pointer font-bold"
              >
                {yearsList.map((y) => (
                  <option key={y} value={y} className="bg-slate-900 text-white">
                    {y}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-950 rounded-xl border border-slate-800 text-xs font-bold">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
                className="bg-transparent text-slate-200 focus:outline-none cursor-pointer font-bold"
              >
                <option value="ALL" className="bg-slate-900 text-white">Todo el Año {selectedYear}</option>
                {monthsList.map((m) => (
                  <option key={m.id} value={m.id} className="bg-slate-900 text-white">
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => { calculateRealData(); alert.success('Datos actualizados'); }}
              disabled={loading}
              leftIcon={<RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${loading ? 'animate-spin' : ''}`} />}
              className="bg-slate-950 border-slate-800 hover:bg-slate-900 text-slate-200 text-xs font-bold"
            >
              Refrescar
            </Button>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 bg-slate-900 p-1.5 rounded-2xl border border-slate-800">
            <button
              onClick={() => setActiveView('monthly')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
                activeView === 'monthly'
                  ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Visión del Período ({selectedMonth === 'ALL' ? 'Anual' : monthsList.find(m => m.id === selectedMonth)?.label})
            </button>
            {!isRER && (
              <button
                onClick={() => setActiveView('annual')}
                className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
                  activeView === 'annual'
                    ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Proyección MYPE 1,700 UIT & DJ Anual
              </button>
            )}
          </div>

          <div className="text-xs font-bold text-slate-400 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-emerald-400" />
            <span>{config.companyName || 'Empresa Wasitech'}</span>
            <span className="opacity-40">•</span>
            <span>RUC: {config.companyRuc || '20XXXXXXXXX'}</span>
          </div>
        </div>
      </div>

      {isRER && (
        <div className="bg-blue-50/90 border border-blue-200 p-4 rounded-2xl flex items-center gap-3 text-blue-900 text-xs font-medium shadow-xs">
          <Info className="w-5 h-5 flex-shrink-0 text-blue-600" />
          <p>
            Régimen <strong className="font-black uppercase">RER (Especial)</strong> activo. Los pagos de tasa 1.5% a la Renta son cancelatorios mensuales y no se presenta declaración jurada anual.
          </p>
        </div>
      )}

      {activeView === 'monthly' ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-all space-y-3 relative overflow-hidden group">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Ventas Netas (Base)</span>
                <div className="p-2.5 bg-blue-50 text-blue-600 rounded-2xl group-hover:scale-110 transition-transform">
                  <TrendingUp className="w-5 h-5" />
                </div>
              </div>
              <div>
                <p className="text-2xl font-black text-slate-900 tracking-tight">{formatPEN(stats.salesMonthBase)}</p>
                <p className="text-[11px] font-bold text-slate-400 mt-1">Bruto incl. IGV: <span className="text-slate-700 font-extrabold">{formatPEN(stats.salesMonthGross)}</span></p>
              </div>
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                <span className="text-slate-500 font-bold">IGV Generado</span>
                <span className="font-black text-blue-700">S/ {stats.igvVentas.toFixed(2)}</span>
              </div>
            </div>

            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-all space-y-3 relative overflow-hidden group">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Utilidad Neta Real</span>
                <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-2xl group-hover:scale-110 transition-transform">
                  <PiggyBank className="w-5 h-5" />
                </div>
              </div>
              <div>
                <p className={`text-2xl font-black tracking-tight ${stats.netProfitMonth >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                  {formatPEN(stats.netProfitMonth)}
                </p>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${stats.netMarginPercent >= 15 ? 'bg-emerald-100 text-emerald-800' : stats.netMarginPercent >= 0 ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'}`}>
                    Margen: {stats.netMarginPercent.toFixed(1)}%
                  </span>
                </div>
              </div>
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                <span className="text-slate-500 font-bold">Post Impuestos & COGS</span>
                <span className="font-black text-slate-700">Libre de Gastos</span>
              </div>
            </div>

            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-all space-y-3 relative overflow-hidden group">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Planilla & Gastos Ops</span>
                <div className="p-2.5 bg-amber-50 text-amber-600 rounded-2xl group-hover:scale-110 transition-transform">
                  <Users className="w-5 h-5" />
                </div>
              </div>
              <div>
                <p className="text-2xl font-black text-slate-900 tracking-tight">{formatPEN(stats.payrollCostMonth + stats.totalExpensesOps)}</p>
                <p className="text-[11px] font-bold text-slate-400 mt-1">Planilla: <span className="text-slate-700 font-extrabold">{formatPEN(stats.payrollCostMonth)}</span></p>
              </div>
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                <span className="text-slate-500 font-bold">Gastos Directos Ops</span>
                <span className="font-black text-amber-700">{formatPEN(stats.totalExpensesOps)}</span>
              </div>
            </div>

            <div className="bg-slate-950 text-white rounded-3xl p-6 border border-slate-800 shadow-xl space-y-3 relative overflow-hidden group">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black text-emerald-400 uppercase tracking-wider">Pago Estimado SUNAT</span>
                <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-2xl border border-emerald-500/30 group-hover:scale-110 transition-transform">
                  <Calculator className="w-5 h-5" />
                </div>
              </div>
              <div>
                <p className="text-2xl font-black text-emerald-400 tracking-tight">{formatPEN(stats.totalSunat)}</p>
                <p className="text-[11px] font-bold text-slate-400 mt-1">IGV: <span className="text-white font-extrabold">{formatPEN(stats.igvToPay)}</span> + Renta: <span className="text-white font-extrabold">{formatPEN(stats.rentaToPay)}</span></p>
              </div>
              <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px]">
                <span className="text-slate-400 font-bold">Tasa Renta Aplicada</span>
                <span className="font-black text-emerald-400">{(config.rentaRate * 100).toFixed(1)}%</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between space-y-6">
              <div>
                <h3 className="font-black text-slate-900 text-sm uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-4">
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                  Liquidación Tributaria SUNAT
                </h3>

                <div className="space-y-4 mt-5 text-xs">
                  <div className="flex justify-between items-center p-3 bg-slate-50 rounded-2xl border border-slate-100">
                    <div>
                      <p className="font-black text-slate-800 uppercase text-[10px]">IGV Ventas (Débito)</p>
                      <p className="text-slate-400 text-[10px] font-medium">18% sobre base imponible sales</p>
                    </div>
                    <span className="font-black text-slate-900 text-sm">{formatPEN(stats.igvVentas)}</span>
                  </div>

                  <div className="flex justify-between items-center p-3 bg-slate-50 rounded-2xl border border-slate-100">
                    <div>
                      <p className="font-black text-slate-800 uppercase text-[10px]">IGV Compras (Crédito)</p>
                      <p className="text-slate-400 text-[10px] font-medium">Sustentado en compras/gastos</p>
                    </div>
                    <span className="font-black text-emerald-600 text-sm">- {formatPEN(stats.igvCompras)}</span>
                  </div>

                  <div className={`p-4 rounded-2xl border flex justify-between items-center ${stats.igvToPay > 0 ? 'bg-amber-50/70 border-amber-200' : 'bg-emerald-50/70 border-emerald-200'}`}>
                    <div>
                      <p className="text-[10px] font-black uppercase text-slate-700">
                        {stats.igvToPay > 0 ? 'IGV a Pagar SUNAT' : 'Saldo a Favor Crédito IGV'}
                      </p>
                      <p className="text-[10px] font-medium text-slate-500">Resultado liquidación IGV</p>
                    </div>
                    <span className={`font-black text-base ${stats.igvToPay > 0 ? 'text-amber-900' : 'text-emerald-900'}`}>
                      {stats.igvToPay > 0 ? formatPEN(stats.igvToPay) : formatPEN(stats.igvCreditBalance)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center p-3 bg-slate-50 rounded-2xl border border-slate-100">
                    <div>
                      <p className="font-black text-slate-800 uppercase text-[10px]">Pago a Cuenta Renta ({(config.rentaRate * 100).toFixed(1)}%)</p>
                      <p className="text-slate-400 text-[10px] font-medium">Calculado sobre ingresos netos</p>
                    </div>
                    <span className="font-black text-slate-900 text-sm">{formatPEN(stats.rentaToPay)}</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between bg-slate-900 text-white p-4 rounded-2xl">
                <div>
                  <p className="text-[10px] font-black text-emerald-400 uppercase tracking-wider">Total Obligación SUNAT</p>
                  <p className="text-xs text-slate-400 font-medium">IGV a Pagar + Pago Renta</p>
                </div>
                <p className="text-xl font-black text-emerald-400">{formatPEN(stats.totalSunat)}</p>
              </div>
            </div>

            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm lg:col-span-2 flex flex-col justify-between">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                  <h3 className="font-black text-slate-900 text-sm uppercase tracking-wider flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-blue-600" />
                    Evolución Mensual del Ejercicio {selectedYear}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">Comparativo mensual histórico de transacciones en el sistema</p>
                </div>

                <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-bold">
                  <button
                    onClick={() => setChartType('sales_vs_purchases')}
                    className={`px-3 py-1.5 rounded-lg transition-all ${
                      chartType === 'sales_vs_purchases'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Ventas vs Compras
                  </button>
                  <button
                    onClick={() => setChartType('sales_vs_profit')}
                    className={`px-3 py-1.5 rounded-lg transition-all ${
                      chartType === 'sales_vs_profit'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Ventas vs Utilidad
                  </button>
                </div>
              </div>

              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  {chartType === 'sales_vs_purchases' ? (
                    <AreaChart data={monthlyChartData}>
                      <defs>
                        <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorPurchases" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b', fontWeight: 700 }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b', fontWeight: 700 }} />
                      <Tooltip
                        contentStyle={{ borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }}
                        formatter={(value: any) => [`S/ ${Number(value).toLocaleString()}`, '']}
                      />
                      <Area type="monotone" dataKey="ventas" name="Ventas Base" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
                      <Area type="monotone" dataKey="compras" name="Compras Base" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorPurchases)" />
                    </AreaChart>
                  ) : (
                    <BarChart data={monthlyChartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b', fontWeight: 700 }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b', fontWeight: 700 }} />
                      <Tooltip
                        cursor={{ fill: '#f8fafc' }}
                        contentStyle={{ borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }}
                        formatter={(value: any) => [`S/ ${Number(value).toLocaleString()}`, '']}
                      />
                      <Bar dataKey="ventas" name="Ventas" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={20} />
                      <Bar dataKey="utilidad" name="Utilidad Neta" fill="#10b981" radius={[6, 6, 0, 0]} barSize={20} />
                    </BarChart>
                  )}
                </ResponsiveContainer>
              </div>

              <div className="flex items-center justify-center gap-6 border-t border-slate-100 pt-4 text-xs font-bold">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-emerald-500" />
                  <span className="text-slate-600">Ventas Base</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-blue-500" />
                  <span className="text-slate-600">{chartType === 'sales_vs_purchases' ? 'Compras Base' : 'Utilidad Real'}</span>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm lg:col-span-2 space-y-6">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-black text-slate-900 text-lg uppercase tracking-tight">
                    Control de Límite MYPE {selectedYear} ({config.ruc20TaxRegime})
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">Tope legal anualizado de 1,700 UIT (UIT {selectedYear}: S/ {stats.uitValue.toLocaleString()})</p>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-black text-slate-900">{stats.uitLimitPercent.toFixed(2)}%</p>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Del Límite Utilizado</span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between text-xs font-bold uppercase">
                  <span className="text-slate-600">Ventas Base Acumuladas Año</span>
                  <span className="text-slate-900 font-black">{formatPEN(stats.annualSales)}</span>
                </div>

                <div className="w-full bg-slate-100 h-5 rounded-full overflow-hidden p-1 border border-slate-200">
                  <div
                    className={`h-full rounded-full transition-all duration-1000 shadow-xs ${
                      stats.uitLimitPercent > 90
                        ? 'bg-red-500'
                        : stats.uitLimitPercent > 75
                        ? 'bg-amber-500'
                        : 'bg-gradient-to-r from-emerald-500 to-teal-400'
                    }`}
                    style={{ width: `${Math.min(stats.uitLimitPercent, 100)}%` }}
                  />
                </div>

                <div className="flex justify-between text-[11px] font-bold text-slate-400 uppercase pt-1">
                  <span>0 UIT</span>
                  <span className="text-slate-800 font-black">
                    Tope 1,700 UIT: {formatPEN(stats.uit1700Limit)}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Equivalencia en UITs</p>
                  <p className="text-xl font-black text-slate-900">
                    {stats.uitUsed.toFixed(2)} <span className="text-xs font-bold text-slate-500">UIT consumidas</span>
                  </p>
                </div>
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200">
                  <p className="text-[10px] font-black text-emerald-800 uppercase tracking-wider mb-1">Margen Disponible MYPE</p>
                  <p className="text-xl font-black text-emerald-900">
                    {formatPEN(stats.marginRemaining)}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-slate-950 text-white rounded-3xl p-6 border border-slate-800 shadow-2xl flex flex-col justify-between relative overflow-hidden">
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <Target className="w-8 h-8 text-emerald-400" />
                  <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-full text-[10px] font-black uppercase tracking-wider border border-emerald-500/30">
                    Progresivo RMT
                  </span>
                </div>
                <div>
                  <h3 className="text-lg font-black text-white uppercase tracking-tight">Cierre Impuesto a la Renta Anual</h3>
                  <p className="text-[10px] text-slate-400 font-medium uppercase mt-1">
                    Escala RMT: 10% hasta 15 UIT (S/ {stats.uit15Limit.toLocaleString()}), 29.5% por el exceso.
                  </p>
                </div>

                <div className="space-y-3 text-xs border-t border-slate-800 pt-4">
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-bold">Utilidad Neta Proyectada</span>
                    <span className="font-black text-white">{formatPEN(stats.annualNetProfit)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-bold">Tramo 1 (10% hasta 15 UIT)</span>
                    <span className="font-black text-emerald-400">{formatPEN(stats.taxTier1)}</span>
                  </div>
                  {stats.taxTier2 > 0 && (
                    <div className="flex justify-between">
                      <span className="text-slate-400 font-bold">Tramo 2 (29.5% Exceso)</span>
                      <span className="font-black text-amber-400">{formatPEN(stats.taxTier2)}</span>
                    </div>
                  )}
                  <div className="pt-2 border-t border-slate-800 flex justify-between items-baseline">
                    <span className="text-slate-300 font-black uppercase text-[10px]">Impuesto Total Determinado</span>
                    <span className="text-2xl font-black text-emerald-400">{formatPEN(stats.projectedAnnualTax)}</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-800">
                <Button
                  variant="primary"
                  fullWidth
                  onClick={() => setShowProformaModal(true)}
                  leftIcon={<FileText className="w-4 h-4" />}
                >
                  Simular Proforma DJ Anual
                </Button>
              </div>
            </div>
          </div>
        </>
      )}

      {!isRER && stats.uitLimitPercent > 80 && (
        <div className="bg-red-50 border-2 border-red-200 p-5 rounded-3xl flex items-center gap-4 text-red-900 shadow-md">
          <ShieldAlert className="w-10 h-10 flex-shrink-0 text-red-600 animate-pulse" />
          <div className="space-y-1">
            <h4 className="font-black text-sm uppercase tracking-tight">Advertencia de Límite Tributario MYPE</h4>
            <p className="text-xs font-medium opacity-90">
              Has alcanzado el <strong className="font-black">{stats.uitLimitPercent.toFixed(1)}%</strong> del tope MYPE de 1,700 UIT (S/ {stats.uit1700Limit.toLocaleString()}). Al superar esta cifra, el sistema requerirá migrar automáticamente al Régimen General (RGT).
            </p>
          </div>
        </div>
      )}

      <Modal
        open={showProformaModal}
        onClose={() => setShowProformaModal(false)}
        title={`Simulación Proforma DJ Anual ${selectedYear}`}
        subtitle="Reporte borrador no oficial para liquidación de Impuesto a la Renta de Tercera Categoría"
        size="lg"
        footer={
          <div className="flex justify-between items-center w-full">
            <Button variant="ghost" onClick={() => window.print()} leftIcon={<Printer className="w-4 h-4" />}>
              Imprimir Borrador
            </Button>
            <Button variant="primary" onClick={() => setShowProformaModal(false)}>
              Cerrar
            </Button>
          </div>
        }
      >
        <div className="space-y-6 py-2 text-xs">
          <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-200">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase">Contribuyente</p>
              <p className="font-extrabold text-slate-900 text-sm">{config.companyName}</p>
              <p className="text-slate-500 font-bold">RUC: {config.companyRuc}</p>
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase">Ejercicio / Régimen</p>
              <p className="font-extrabold text-slate-900 text-sm">Año Gravable {selectedYear}</p>
              <p className="text-emerald-700 font-bold uppercase">{config.ruc20TaxRegime}</p>
            </div>
          </div>

          <div className="border border-slate-200 rounded-2xl overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-slate-900 text-white uppercase text-[10px] font-black tracking-wider">
                <tr>
                  <th className="p-3.5">Concepto Tributario</th>
                  <th className="p-3.5 text-right">Base Imponible / Monto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-medium">
                <tr>
                  <td className="p-3 text-slate-700">Ingresos Netos Anuales (Ventas Base)</td>
                  <td className="p-3 text-right font-black text-slate-900">{formatPEN(stats.annualSales)}</td>
                </tr>
                <tr>
                  <td className="p-3 text-slate-700">(-) Costo de Ventas Estimado (70%)</td>
                  <td className="p-3 text-right font-bold text-red-600">- {formatPEN(stats.annualSales * 0.7)}</td>
                </tr>
                <tr>
                  <td className="p-3 text-slate-700">(-) Gastos Operativos & Planilla Anualizados</td>
                  <td className="p-3 text-right font-bold text-red-600">- {formatPEN(stats.annualExpensesReal)}</td>
                </tr>
                <tr className="bg-emerald-50/60 font-black">
                  <td className="p-3 text-emerald-900 uppercase">Renta Neta Imponible Estimada</td>
                  <td className="p-3 text-right text-emerald-900 text-sm">{formatPEN(stats.annualNetProfit)}</td>
                </tr>
                <tr>
                  <td className="p-3 text-slate-700">Impuesto Tramo 1 (10% hasta 15 UIT: S/ {stats.uit15Limit.toLocaleString()})</td>
                  <td className="p-3 text-right font-bold text-slate-800">{formatPEN(stats.taxTier1)}</td>
                </tr>
                {stats.taxTier2 > 0 && (
                  <tr>
                    <td className="p-3 text-slate-700">Impuesto Tramo 2 (29.5% Exceso de 15 UIT)</td>
                    <td className="p-3 text-right font-bold text-slate-800">{formatPEN(stats.taxTier2)}</td>
                  </tr>
                )}
                <tr className="bg-slate-100 font-black">
                  <td className="p-3 text-slate-900 uppercase">Impuesto a la Renta Determinado</td>
                  <td className="p-3 text-right text-slate-900 text-sm">{formatPEN(stats.projectedAnnualTax)}</td>
                </tr>
                <tr>
                  <td className="p-3 text-slate-700">(-) Pagos a Cuenta Efectuados en el Ejercicio</td>
                  <td className="p-3 text-right font-bold text-emerald-700">- {formatPEN(stats.accumulatedRentaPaid)}</td>
                </tr>
                <tr className="bg-slate-950 text-white font-black">
                  <td className="p-3.5 uppercase text-emerald-400">
                    {stats.netTaxToPayOrRefund >= 0 ? 'Saldo a Regularizar a SUNAT' : 'Saldo a Favor del Contribuyente'}
                  </td>
                  <td className="p-3.5 text-right text-emerald-400 text-base">
                    {formatPEN(Math.abs(stats.netTaxToPayOrRefund))}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default StatisticalDashboard;
