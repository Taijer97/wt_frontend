
import React, { useState, useEffect } from 'react';
import { DataService } from '../services/dataService';
import { BackendService } from '../services/backendService';
import { Employee, PensionSystem } from '../types';
import { Users, FileText, Printer, X, TrendingDown, Landmark, UserCheck, PieChart as PieIcon, Info, Briefcase, Building2, Download } from 'lucide-react';

const numberToWords = (num: number): string => {
    const whole = Math.floor(num);
    const cents = Math.round((num - whole) * 100);
    return `SON: ${whole} CON ${cents.toString().padStart(2, '0')}/100 SOLES`;
};

interface PayrollDetail {
    income: {
        basic: number;
        familyAssignment: number;
        overtime: number;
        bonus: number;
        total: number;
    };
    deduction: {
        pensionFund: number;
        pensionInsurance: number;
        pensionCommission: number;
        absences: number;
        total: number;
    };
    contribution: {
        essalud: number;
        total: number;
    };
    netPay: number;
    totalEmployerCost: number;
}

export const PayrollModule: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedPayslip, setSelectedPayslip] = useState<{emp: Employee, detail: PayrollDetail} | null>(null);
  const config = DataService.getConfig();

  useEffect(() => {
    const load = async () => {
      try {
        const emps = await BackendService.getEmployees();
        setEmployees(emps);
      } catch {
        setEmployees(DataService.getEmployees());
      }
    };
    load();
  }, []);

  const calculatePayroll = (emp: Employee): PayrollDetail => {
    const basic = emp.baseSalary;
    const familyAssignment = emp.hasChildren ? config.rmv * 0.10 : 0; 
    const totalIncome = basic + familyAssignment;

    let pensionFund = 0;
    let pensionInsurance = 0;
    let pensionCommission = 0;
    
    if (emp.pensionSystem === PensionSystem.ONP) {
        pensionFund = totalIncome * 0.13;
    } else {
        pensionFund = totalIncome * 0.10;
        pensionInsurance = totalIncome * 0.0170;
        pensionCommission = totalIncome * 0.0155;
    }
    
    const totalDeduction = pensionFund + pensionInsurance + pensionCommission;
    const essalud = totalIncome * 0.09;

    return {
        income: { basic, familyAssignment, overtime: 0, bonus: 0, total: totalIncome },
        deduction: { pensionFund, pensionInsurance, pensionCommission, absences: 0, total: totalDeduction },
        contribution: { essalud, total: essalud },
        netPay: totalIncome - totalDeduction,
        totalEmployerCost: totalIncome + essalud
    };
  };

  const totals = employees.reduce((acc, emp) => {
    const det = calculatePayroll(emp);
    return {
        bruto: acc.bruto + det.income.total,
        neto: acc.neto + det.netPay,
        essalud: acc.essalud + det.contribution.essalud,
        costoTotal: acc.costoTotal + det.totalEmployerCost
    };
  }, { bruto: 0, neto: 0, essalud: 0, costoTotal: 0 });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 print:hidden">
        <div>
          <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Planilla de Sueldos</h2>
          <p className="text-sm text-slate-500 font-bold uppercase">Gestión de capital humano y beneficios sociales</p>
        </div>
        <div className="bg-blue-50 px-4 py-2 rounded-xl border border-blue-100 flex items-center gap-2">
            <Info className="w-4 h-4 text-blue-600" />
            <p className="text-[10px] text-blue-800 font-black uppercase tracking-tighter">Cálculo basado en RMV: S/ {config.rmv}</p>
        </div>
        <button 
          onClick={async () => {
            try { setEmployees(await BackendService.getEmployees()); } 
            catch { setEmployees(DataService.getEmployees()); }
          }} 
          className="px-4 py-2 rounded-xl border-2 border-slate-200 text-[10px] font-black uppercase bg-white hover:bg-slate-50"
        >
          Refrescar colaboradores
        </button>
      </div>

      {/* PANEL DE RESUMEN */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 print:hidden">
          <div className="bg-slate-900 text-white p-6 rounded-3xl shadow-xl border border-slate-800">
              <div className="flex justify-between items-start mb-2">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Carga Total Empresa</p>
                  <TrendingDown className="w-5 h-5 text-red-400" />
              </div>
              <h3 className="text-2xl font-black">S/ {totals.costoTotal.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</h3>
          </div>

          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-200">
              <div className="flex justify-between items-start mb-2">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Neto a Transferir</p>
                  <UserCheck className="w-5 h-5 text-emerald-500" />
              </div>
              <h3 className="text-2xl font-black text-slate-900">S/ {totals.neto.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</h3>
          </div>

          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-200">
              <div className="flex justify-between items-start mb-2">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">EsSalud (9%)</p>
                  <Landmark className="w-5 h-5 text-blue-500" />
              </div>
              <h3 className="text-2xl font-black text-slate-900">S/ {totals.essalud.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</h3>
          </div>

          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-200">
              <div className="flex justify-between items-start mb-2">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Retenciones</p>
                  <PieIcon className="w-5 h-5 text-orange-500" />
              </div>
              <h3 className="text-2xl font-black text-slate-900">S/ {(totals.bruto - totals.neto).toLocaleString('es-PE', { minimumFractionDigits: 2 })}</h3>
          </div>
      </div>

      {/* LISTADO DE TRABAJADORES */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 print:hidden">
        {employees.length === 0 ? (
            <div className="col-span-full p-20 bg-white rounded-3xl border-2 border-dashed border-gray-200 text-center flex flex-col items-center">
                <Users className="w-16 h-16 text-gray-200 mb-4" />
                <p className="text-slate-400 font-black uppercase tracking-widest text-sm">No hay colaboradores activos en planilla.</p>
            </div>
        ) : (
            employees.map(emp => {
                const detail = calculatePayroll(emp);
                return (
                    <div key={emp.id} className="bg-white rounded-3xl shadow-sm border border-gray-200 p-8 hover:shadow-xl hover:border-blue-400 transition-all group relative overflow-hidden">
                        <div className="flex items-start justify-between mb-6">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 rounded-2xl bg-slate-900 flex items-center justify-center text-white font-black text-xl shadow-lg">
                                    {emp.fullName.charAt(0)}
                                </div>
                                <div>
                                    <h3 className="font-black text-slate-900 uppercase text-sm leading-tight">{emp.fullName}</h3>
                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">{emp.jobTitle || 'OPERATIVO'}</p>
                                </div>
                            </div>
                            <span className={`text-[9px] px-3 py-1 rounded-full font-black uppercase tracking-widest border-2 ${emp.pensionSystem === 'ONP' ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-orange-50 text-orange-700 border-orange-100'}`}>
                                {emp.pensionSystem}
                            </span>
                        </div>
                        
                        <div className="space-y-4 bg-slate-50 p-5 rounded-2xl border border-slate-100 mb-8 shadow-inner">
                            <div className="flex justify-between text-xs font-bold">
                                <span className="text-slate-500 uppercase tracking-tighter">Sueldo Bruto</span>
                                <span className="text-slate-900 font-black">S/ {detail.income.total.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-xs font-bold">
                                <span className="text-slate-500 uppercase tracking-tighter">Retención</span>
                                <span className="text-red-600 font-black">- S/ {detail.deduction.total.toFixed(2)}</span>
                            </div>
                            <div className="pt-3 border-t border-slate-200 flex justify-between items-center">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Neto Percibido</span>
                                <span className="text-2xl font-black text-emerald-700 tracking-tighter">S/ {detail.netPay.toFixed(2)}</span>
                            </div>
                        </div>

                        <button 
                            onClick={() => setSelectedPayslip({emp, detail})}
                            className="w-full bg-slate-900 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-blue-700 transition-all active:scale-95 shadow-lg uppercase tracking-widest text-[10px]"
                        >
                            <FileText className="w-4 h-4" /> Visualizar Boleta
                        </button>
                    </div>
                );
            })
        )}
      </div>

      {/* --- MODAL BOLETA DE PAGO CORREGIDO --- */}
      {selectedPayslip && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/90 p-4 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setSelectedPayslip(null)}>
              <div 
                className="bg-white w-full max-w-4xl max-h-[95vh] shadow-[0_35px_60px_-15px_rgba(0,0,0,0.5)] rounded-[2rem] overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col relative"
                onClick={(e) => e.stopPropagation()}
              >
                  {/* Toolbar - FIJO EN LA PARTE SUPERIOR */}
                  <div className="sticky top-0 z-20 bg-slate-900 text-white p-6 flex justify-between items-center print:hidden border-b border-slate-800 shadow-xl">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-emerald-500 rounded-2xl text-slate-900">
                            <Briefcase className="w-5 h-5"/>
                        </div>
                        <div>
                            <h3 className="font-black uppercase tracking-widest text-[10px]">Visor de Boleta</h3>
                            <p className="text-xs text-emerald-400 font-black uppercase truncate max-w-[150px] md:max-w-none">{selectedPayslip.emp.fullName}</p>
                        </div>
                      </div>
                      <div className="flex gap-2 md:gap-4">
                          <button 
                            onClick={handlePrint} 
                            className="bg_white text-slate-900 hover:bg-emerald-400 hover:text-slate-900 px-4 md:px-8 py-3 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 md:gap-3 transition-all active:scale-95"
                          >
                              <Printer className="w-4 h-4"/> <span className="hidden md:inline">Imprimir Boleta</span>
                          </button>
                          <button
                            onClick={async () => {
                              try {
                                const mod: any = await import('html2pdf.js');
                                const html2pdf = mod?.default || (window as any).html2pdf;
                                const node = document.getElementById('payslip-area');
                                if (!node) return;
                                await html2pdf().set({
                                  margin: 0,
                                  filename: `boleta_${selectedPayslip!.emp.fullName.replace(/\s+/g, '_')}.pdf`,
                                  image: { type: 'jpeg', quality: 0.98 },
                                  html2canvas: { scale: 2, useCORS: true },
                                  jsPDF: { unit: 'pt', format: 'a4', orientation: 'portrait' }
                                }).from(node).save();
                              } catch {
                                alert('No se pudo generar PDF automático. Use Imprimir → Guardar como PDF.');
                              }
                            }}
                            className="bg-white text-slate-900 hover:bg-blue-400 hover:text-slate-900 px-4 md:px-8 py-3 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 md:gap-3 transition-all active:scale-95"
                          >
                            <Download className="w-4 h-4"/> <span className="hidden md:inline">Guardar como PDF</span>
                          </button>
                          <button 
                            onClick={() => setSelectedPayslip(null)} 
                            className="bg-slate-800 hover:bg-red-600 text-white p-3 rounded-xl transition-all shadow-xl"
                          >
                              <X className="w-6 h-6"/>
                          </button>
                      </div>
                  </div>

                  {/* Documento - AREA CON SCROLL INDEPENDIENTE */}
                  <div className="flex-1 overflow-y-auto p-4 md:p-12 bg-gray-50 print:p-0 print:bg-white print:overflow-visible custom-scrollbar">
                      <div id="payslip-area" className="max-w-[21cm] mx-auto bg-white p-6 md:p-12 shadow-2xl rounded-3xl border border-gray-100 print:shadow-none print:border-none print:p-0">
                          
                          {/* Cabecera Boleta */}
                          <div className="flex flex-col md:flex-row justify-between items-start mb-8 md:mb-12 border-b-4 border-slate-900 pb-8 gap-6">
                              <div className="space-y-2">
                                  <div className="flex items-center gap-3 mb-2">
                                      <Building2 className="w-8 h-8 text-slate-900" />
                                      <h1 className="text-xl md:text-3xl font-black uppercase tracking-tighter text-slate-900 leading-none">{config.companyName}</h1>
                                  </div>
                                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">RUC: {config.companyRuc}</p>
                                  <div className="mt-4 bg-slate-900 text-white px-4 py-1.5 rounded-lg w-fit text-[9px] font-black uppercase tracking-widest">Boleta de Pago de Remuneraciones</div>
                              </div>
                              <div className="text-right border-4 border-slate-900 p-4 md:p-6 rounded-3xl bg-slate-50 w-full md:w-auto">
                                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Periodo Laboral</p>
                                  <p className="text-xl md:text-3xl font-black text-slate-900 uppercase tracking-tight">{new Date().toLocaleString('es-PE', { month: 'long' })} {new Date().getFullYear()}</p>
                              </div>
                          </div>

                          {/* Datos Trabajador */}
                          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8 mb-8 md:mb-12 bg-slate-50 p-6 md:p-8 rounded-3xl border border-slate-200">
                              <div><p className="text-[8px] font-black text-slate-400 uppercase mb-1 tracking-widest">Trabajador</p><p className="font-black text-slate-900 uppercase text-[10px]">{selectedPayslip.emp.fullName}</p></div>
                              <div><p className="text-[8px] font-black text-slate-400 uppercase mb-1 tracking-widest">Doc. ID</p><p className="font-black text-slate-900 text-[10px]">DNI {selectedPayslip.emp.docNumber}</p></div>
                              <div><p className="text-[8px] font-black text-slate-400 uppercase mb-1 tracking-widest">Cargo</p><p className="font-black text-slate-900 uppercase text-[10px]">{selectedPayslip.emp.jobTitle || 'COLABORADOR'}</p></div>
                              <div><p className="text-[8px] font-black text-slate-400 uppercase mb-1 tracking-widest">Pensión</p><p className="font-black text-slate-900 text-[10px] uppercase">{selectedPayslip.emp.pensionSystem}</p></div>
                          </div>

                          {/* Cuerpo Tabla */}
                          <div className="grid grid-cols-1 md:grid-cols-3 border-4 border-slate-900 rounded-[1.5rem] md:rounded-[2rem] overflow-hidden mb-8 md:mb-12 shadow-xl">
                              <div className="hidden md:block p-4 bg-slate-900 text-white font-black text-center text-[10px] uppercase tracking-widest border-r border-slate-800">Ingresos</div>
                              <div className="hidden md:block p-4 bg-slate-900 text-white font-black text-center text-[10px] uppercase tracking-widest border-r border-slate-800">Deducciones</div>
                              <div className="hidden md:block p-4 bg-slate-900 text-white font-black text-center text-[10px] uppercase tracking-widest">Aportes</div>

                              {/* Columna Ingresos */}
                              <div className="p-6 md:p-8 border-r border-slate-200 min-h-[150px] space-y-4 bg-white">
                                  <p className="md:hidden text-[9px] font-black text-slate-400 uppercase mb-2">Ingresos</p>
                                  <div className="flex justify-between text-xs font-bold">
                                      <span className="text-slate-600 uppercase">Sueldo Básico</span>
                                      <span className="font-mono font-black text-slate-900">S/ {selectedPayslip.detail.income.basic.toFixed(2)}</span>
                                  </div>
                                  {selectedPayslip.detail.income.familyAssignment > 0 && (
                                      <div className="flex justify-between text-xs font-bold">
                                          <span className="text-slate-600 uppercase">Asig. Familiar</span>
                                          <span className="font-mono font-black text-slate-900">S/ {selectedPayslip.detail.income.familyAssignment.toFixed(2)}</span>
                                      </div>
                                  )}
                              </div>

                              {/* Columna Descuentos */}
                              <div className="p-6 md:p-8 border-r border-slate-200 min-h-[150px] space-y-4 bg-slate-50/50">
                                  <p className="md:hidden text-[9px] font-black text-slate-400 uppercase mb-2">Deducciones</p>
                                  <div className="flex justify-between text-xs font-bold">
                                      <span className="text-slate-600 uppercase">Aporte Obligatorio</span>
                                      <span className="font-mono font-black text-red-600">S/ {selectedPayslip.detail.deduction.pensionFund.toFixed(2)}</span>
                                  </div>
                                  {selectedPayslip.detail.deduction.pensionInsurance > 0 && (
                                      <div className="flex justify-between text-xs font-bold">
                                          <span className="text-slate-600 uppercase">Seguro / Comis.</span>
                                          <span className="font-mono font-black text-red-600">S/ {(selectedPayslip.detail.deduction.pensionInsurance + selectedPayslip.detail.deduction.pensionCommission).toFixed(2)}</span>
                                      </div>
                                  )}
                              </div>

                              {/* Columna Aportes Empleador */}
                              <div className="p-6 md:p-8 min-h-[150px] space-y-4 bg-white">
                                  <p className="md:hidden text-[9px] font-black text-slate-400 uppercase mb-2">Aportes Patronales</p>
                                  <div className="flex justify-between text-xs font-bold">
                                      <span className="text-slate-600 uppercase">EsSalud (9%)</span>
                                      <span className="font-mono font-black text-blue-700">S/ {selectedPayslip.detail.contribution.essalud.toFixed(2)}</span>
                                  </div>
                              </div>

                              {/* Totales Fila */}
                              <div className="p-4 bg-slate-100 font-black flex justify-between border-t-4 border-r border-slate-900 text-xs">
                                  <span className="uppercase text-[9px] text-slate-500">Total Ingresos</span>
                                  <span className="text-slate-900">S/ {selectedPayslip.detail.income.total.toFixed(2)}</span>
                              </div>
                              <div className="p-4 bg-slate-100 font-black flex justify-between border-t-4 border-r border-slate-900 text-xs">
                                  <span className="uppercase text-[9px] text-slate-500">Total Dsctos.</span>
                                  <span className="text-red-700">S/ {selectedPayslip.detail.deduction.total.toFixed(2)}</span>
                              </div>
                              <div className="p-4 bg-slate-100 font-black flex justify-between border-t-4 border-slate-900 text-xs">
                                  <span className="uppercase text-[9px] text-slate-500">Total Aportes</span>
                                  <span className="text-blue-900">S/ {selectedPayslip.detail.contribution.total.toFixed(2)}</span>
                              </div>
                          </div>

                          {/* Neto a Pagar */}
                          <div className="bg-slate-900 text-white p-6 md:p-10 rounded-3xl flex flex-col md:flex-row justify-between items-center shadow-2xl mb-12 md:mb-24">
                              <div className="text-center md:text-left mb-4 md:mb-0">
                                  <p className="text-[8px] md:text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1">{numberToWords(selectedPayslip.detail.netPay)}</p>
                                  <h4 className="text-[10px] md:text-xs font-bold uppercase text-slate-400">Neto a Percibir en Cuenta</h4>
                              </div>
                              <div className="text-right">
                                  <p className="text-3xl md:text-5xl font-black text-white tracking-tighter">S/ {selectedPayslip.detail.netPay.toFixed(2)}</p>
                              </div>
                          </div>

                          {/* Firmas */}
                          <div className="grid grid-cols-2 gap-10 md:gap-32 pt-16">
                              <div className="text-center">
                                  <div className="border-t-2 border-slate-900 w-full pt-4 font-black uppercase text-[8px] md:text-xs text-slate-900">Empresa</div>
                                  <p className="text-[8px] text-slate-400 font-bold uppercase mt-1">Sello Empleador</p>
                              </div>
                              <div className="text-center">
                                  <div className="border-t-2 border-slate-900 w-full pt-4 font-black uppercase text-[8px] md:text-xs text-slate-900">{selectedPayslip.emp.fullName}</div>
                                  <p className="text-[8px] text-slate-400 font-bold uppercase mt-1">Firma Trabajador</p>
                              </div>
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
