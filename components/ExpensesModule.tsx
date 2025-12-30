
import React, { useState, useEffect } from 'react';
import { DataService } from '../services/dataService';
import { BackendService } from '../services/backendService';
import { ExpenseEntry, ExpenseCategory, ExpenseStatus, PaymentMethod, ReceiptType } from '../types';
import { Plus, Receipt, AlertCircle, CheckCircle, CreditCard, Filter, Trash2, Upload, FileText, X, DollarSign, Calendar, Users, Info, Paperclip, Save, Pencil, ArrowRight, Eye, Download } from 'lucide-react';

export const ExpensesModule: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'register' | 'pending' | 'history'>('register');
  const [expenses, setExpenses] = useState<ExpenseEntry[]>([]);
  const [sustentoFile, setSustentoFile] = useState<string | null>(null);
  const [sustentoObj, setSustentoObj] = useState<File | null>(null);
  const [sustentandoItem, setSustentandoItem] = useState<ExpenseEntry | null>(null);
  const [viewingExpense, setViewingExpense] = useState<ExpenseEntry | null>(null);
  const [stats, setStats] = useState({ total: 0, payroll: 0 });

  const [formData, setFormData] = useState<Partial<ExpenseEntry>>({
    date: new Date().toISOString().split('T')[0], 
    category: ExpenseCategory.SERVICIOS,
    paymentMethod: PaymentMethod.TRANSFERENCIA, 
    status: ExpenseStatus.PENDING_DOCS,
    amount: 0, 
    description: '', 
    beneficiary: ''
  });

  const canDelete = DataService.checkPermission('expenses', 'delete');

  useEffect(() => { loadExpenses(); }, [activeTab]);

  const loadExpenses = async () => {
    const list = await BackendService.getExpenses();
    const employees = DataService.getEmployees();
    const config = DataService.getConfig();
    const payroll = employees.reduce((acc, emp) => acc + ((emp.baseSalary + (emp.hasChildren ? config.rmv * 0.10 : 0)) * 1.09), 0);
    setExpenses(list);
    setStats({ total: list.reduce((a, b) => a + b.amount, 0) + payroll, payroll });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(formData.amount);
    const description = `${formData.beneficiary || ''} ${formData.description || ''}`.trim();
    await BackendService.createExpense({
      description,
      amount,
      date: formData.date!,
      status: 'PENDING',
    });
    await loadExpenses();
    setFormData({
        date: new Date().toISOString().split('T')[0], category: ExpenseCategory.SERVICIOS,
        paymentMethod: PaymentMethod.TRANSFERENCIA, status: ExpenseStatus.PENDING_DOCS,
        amount: 0, description: '', beneficiary: ''
    });
    alert('Gasto registrado. Por favor, cargue el sustento en la pestaña de Pendientes.');
    setActiveTab('pending');
  };

  const handleFinalizeSustento = async () => {
      if (!sustentandoItem || !sustentoFile) return;
      try {
        let url = sustentandoItem.documentUrl;
        if (sustentoObj) {
          const res = await BackendService.uploadExpenseFile(sustentandoItem.id, sustentoObj);
          url = res.url;
        }
        await BackendService.updateExpense(sustentandoItem.id, { status: 'COMPLETED', pdf_url: url || sustentoFile });
      } catch {
        await BackendService.updateExpense(sustentandoItem.id, { status: 'COMPLETED', pdf_url: sustentoFile });
      }
      alert('Gasto sustentado correctamente para auditoría.');
      setSustentandoItem(null); setSustentoFile(null); setSustentoObj(null); await loadExpenses();
      setActiveTab('history');
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if(confirm('¿Seguro que desea eliminar este registro?')) {
      await BackendService.deleteExpense(id);
      await loadExpenses();
    }
  };

  const pendingExpenses = expenses.filter(e => e.status === ExpenseStatus.PENDING_DOCS);
  const historyExpenses = expenses.filter(e => e.status === ExpenseStatus.COMPLETED);

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-xl w-full md:w-fit shadow-inner">
        <button onClick={() => setActiveTab('register')} className={`px-6 py-2.5 text-[11px] font-black uppercase tracking-widest rounded-lg transition-all ${activeTab === 'register' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-500 hover:text-slate-800'}`}>Registro</button>
        <button onClick={() => setActiveTab('pending')} className={`px-6 py-2.5 text-[11px] font-black uppercase tracking-widest rounded-lg transition-all ${activeTab === 'pending' ? 'bg-orange-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-800'}`}>Pendientes ({pendingExpenses.length})</button>
        <button onClick={() => setActiveTab('history')} className={`px-6 py-2.5 text-[11px] font-black uppercase tracking-widest rounded-lg transition-all ${activeTab === 'history' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-800'}`}>Historial Sustentado</button>
      </div>

      {activeTab === 'register' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-8 flex items-center gap-3"><Receipt className="w-5 h-5 text-blue-600" /> Registro de Gasto Operativo</h3>
                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Fecha</label><input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full border-2 border-slate-50 rounded-xl p-3 text-sm font-black bg-slate-50 uppercase" required /></div>
                        <div><label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Categoría</label><select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value as any})} className="w-full border-2 border-slate-50 rounded-xl p-3 text-sm font-black bg-slate-50 uppercase">{Object.values(ExpenseCategory).map(cat => (<option key={cat} value={cat}>{cat.replace('_', ' ')}</option>))}</select></div>
                    </div>
                    <div><label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Descripción del Gasto</label><input value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full border-2 border-slate-50 rounded-xl p-3 text-sm font-black bg-slate-50 uppercase" placeholder="Ej: Pago de Internet" required /></div>
                    <div><label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Proveedor / Beneficiario</label><input value={formData.beneficiary} onChange={e => setFormData({...formData, beneficiary: e.target.value})} className="w-full border-2 border-slate-50 rounded-xl p-3 text-sm font-black bg-slate-50 uppercase" placeholder="Ej: Movistar" required /></div>
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Monto (S/)</label><input type="number" step="0.01" value={formData.amount} onChange={e => setFormData({...formData, amount: Number(e.target.value)})} className="w-full border-2 border-slate-50 rounded-xl p-3 text-sm font-black bg-white text-blue-600 shadow-sm" required /></div>
                        <div><label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Medio Pago</label><select value={formData.paymentMethod} onChange={e => setFormData({...formData, paymentMethod: e.target.value as any})} className="w-full border-2 border-slate-50 rounded-xl p-3 text-sm font-black bg-slate-50 uppercase"><option value={PaymentMethod.TRANSFERENCIA}>Transferencia</option><option value={PaymentMethod.CONTADO}>Efectivo</option></select></div>
                    </div>
                    <div className="pt-4"><button type="submit" className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black uppercase text-[10px] shadow-xl hover:bg-blue-600 transition-all active:scale-95">Registrar y Pendiente Sustento</button></div>
                </form>
            </div>
            <div className="space-y-6">
                <div className="bg-slate-900 p-10 rounded-[3rem] text-white shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-10"><DollarSign className="w-32 h-32"/></div>
                    <h4 className="text-[10px] font-black uppercase text-emerald-400 tracking-widest mb-6 flex items-center gap-2"><Info className="w-4 h-4"/> Flujo de Auditoría</h4>
                    <p className="text-xs font-bold text-slate-300 uppercase leading-relaxed mb-6">Para garantizar la deducibilidad del gasto, el sistema requiere una sustentación documental digital.</p>
                    <div className="space-y-4">
                         <div className="flex items-center gap-3 bg-white/5 p-4 rounded-2xl border border-white/10"><CheckCircle className="text-emerald-400 w-5 h-5"/><span className="text-[10px] font-black uppercase">Fase 1: Registro Contable</span></div>
                         <div className="flex items-center gap-3 bg-orange-500/20 p-4 rounded-2xl border border-orange-500/30 text-orange-200"><AlertCircle className="w-5 h-5"/><span className="text-[10px] font-black uppercase">Fase 2: Carga de Comprobante</span></div>
                         <div className="flex items-center gap-3 bg-white/5 p-4 rounded-2xl border border-white/10 opacity-50"><FileText className="w-5 h-5"/><span className="text-[10px] font-black uppercase">Fase 3: Validación Auditoría</span></div>
                    </div>
                </div>
            </div>
        </div>
      )}

      {activeTab === 'pending' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            <div className="space-y-4">
                {pendingExpenses.length === 0 ? (
                    <div className="p-20 text-center text-slate-300 font-black uppercase italic border-4 border-dashed rounded-[3rem] bg-white">Sin gastos por sustentar.</div>
                ) : (
                    pendingExpenses.map(e => (
                        <div key={e.id} onClick={() => setSustentandoItem(e)} className={`p-8 rounded-3xl border-2 transition-all cursor-pointer flex justify-between items-center ${sustentandoItem?.id === e.id ? 'bg-orange-50 border-orange-500 shadow-xl' : 'bg-white border-slate-100 hover:border-orange-200 shadow-sm'}`}>
                            <div><div className="flex items-center gap-2 mb-1"><span className="text-[8px] font-black px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full uppercase">{e.category}</span><span className="text-[10px] font-black text-slate-400">{new Date(e.date).toLocaleDateString()}</span></div><h4 className="font-black text-slate-900 uppercase text-xs">{e.description}</h4><p className="text-lg font-black text-slate-800 mt-2">S/ {e.amount.toFixed(2)}</p></div>
                            <ArrowRight className={`w-6 h-6 ${sustentandoItem?.id === e.id ? 'text-orange-500' : 'text-slate-200'}`} />
                        </div>
                    ))
                )}
            </div>
            {sustentandoItem && (
                <div className="bg-white p-10 rounded-[3rem] border-2 border-orange-200 shadow-2xl animate-in slide-in-from-right-4 duration-300">
                    <h3 className="font-black uppercase text-sm mb-8 flex justify-between items-center text-slate-900 tracking-tighter">Sustentar Gasto <button onClick={() => setSustentandoItem(null)} className="p-2 hover:bg-slate-100 rounded-xl"><X className="w-5 h-5"/></button></h3>
                    <div className="space-y-8">
                        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 shadow-inner"><p className="text-[10px] font-black text-slate-400 uppercase mb-1">Monto a Sustentar</p><p className="text-3xl font-black text-slate-900 tracking-tighter">S/ {sustentandoItem.amount.toFixed(2)}</p><p className="text-[10px] font-bold text-slate-500 uppercase mt-2 tracking-widest">{sustentandoItem.beneficiary}</p></div>
                        <div className="space-y-4">
                            <label className="block text-[10px] font-black text-slate-500 uppercase ml-2">Subir Comprobante (PDF o Imagen)</label>
                            <label className={`flex flex-col items-center justify-center p-12 border-4 border-dashed rounded-[2rem] cursor-pointer transition-all ${sustentoFile ? 'bg-emerald-50 border-emerald-500' : 'bg-slate-50 border-slate-200 hover:border-blue-400 shadow-sm'}`}>
                                {sustentoFile ? <span className="text-sm font-black text-emerald-900 uppercase font-mono truncate max-w-xs">{sustentoFile}</span> : <Upload className="w-12 h-12 text-slate-300" />}
                                <input 
                                  type="file" 
                                  className="hidden" 
                                  accept=".pdf,image/*" 
                                  onChange={(e) => {
                                    const f = e.target.files?.[0] || null;
                                    setSustentoFile(f ? f.name : null);
                                    setSustentoObj(f);
                                  }} 
                                />
                            </label>
                        </div>
                        <div className="flex gap-4 pt-4">
                            <button onClick={(e) => handleDelete(sustentandoItem.id, e as any)} className="px-6 bg-red-50 text-red-600 rounded-2xl font-black uppercase text-[10px] hover:bg-red-100 transition-all"><Trash2 className="w-5 h-5"/></button>
                            <button onClick={handleFinalizeSustento} disabled={!sustentoFile} className="flex-1 bg-slate-900 text-white py-6 rounded-2xl font-black uppercase text-xs shadow-xl hover:bg-emerald-600 disabled:opacity-50 transition-all flex items-center justify-center gap-3 active:scale-95"><CheckCircle className="w-5 h-5"/> Consolidar Sustento</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
      )}

      {activeTab === 'history' && (
        <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase font-black tracking-widest border-b"><tr><th className="px-8 py-5">Fecha / Cat.</th><th className="px-8 py-5">Descripción</th><th className="px-8 py-5 text-right">Monto</th><th className="px-8 py-5 text-center">Acciones Auditoría</th></tr></thead>
                <tbody className="divide-y divide-gray-50">
                    {historyExpenses.length === 0 ? (<tr><td colSpan={4} className="p-20 text-center text-slate-300 font-black uppercase italic tracking-widest">No hay historial sustentado.</td></tr>) : historyExpenses.map(expense => (
                        <tr key={expense.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-8 py-5"><div className="text-slate-900 font-black">{new Date(expense.date).toLocaleDateString()}</div><div className="text-[9px] text-emerald-600 font-black bg-emerald-50 w-fit px-3 py-0.5 rounded-full mt-1 uppercase border border-emerald-100">{expense.category.replace('_', ' ')}</div></td>
                            <td className="px-8 py-5"><div className="text-slate-800 font-black uppercase text-xs">{expense.description}</div><div className="text-[10px] text-slate-400 font-bold uppercase">{expense.beneficiary}</div></td>
                            <td className="px-8 py-5 text-right"><div className="text-lg font-black text-slate-900">S/ {expense.amount.toFixed(2)}</div></td>
                            <td className="px-8 py-5 text-center">
                                <div className="flex justify-center gap-2">
                                    <button onClick={() => setViewingExpense(expense)} className="p-2.5 bg-slate-100 text-slate-500 hover:bg-blue-600 hover:text-white rounded-xl transition-all shadow-sm" title="Ver Expediente Digital"><Eye className="w-4 h-4"/></button>
                                    {canDelete && <button onClick={(e) => handleDelete(expense.id, e as any)} className="p-2.5 bg-red-50 text-red-400 hover:bg-red-600 hover:text-white rounded-xl transition-all shadow-sm"><Trash2 className="w-4 h-4"/></button>}
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
      )}

      {/* MODAL VISOR DE SUSTENTO */}
      {viewingExpense && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/90 p-4 backdrop-blur-md" onClick={() => setViewingExpense(null)}>
              <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
                  <div className="bg-slate-900 p-6 flex justify-between items-center text-white">
                      <div className="flex items-center gap-4">
                          <div className="p-3 bg-emerald-500 rounded-2xl text-slate-900 shadow-lg"><FileText className="w-6 h-6"/></div>
                          <div><p className="text-[10px] font-black uppercase text-emerald-400 tracking-widest">Sustento Digital de Gasto</p><h3 className="font-black uppercase text-sm truncate max-w-[300px]">{viewingExpense.description}</h3></div>
                      </div>
                      <button onClick={() => setViewingExpense(null)} className="hover:bg-red-600 p-2 rounded-xl transition-all"><X className="w-6 h-6"/></button>
                  </div>
                  <div className="p-10 space-y-8">
                      <div className="grid grid-cols-2 gap-8">
                          <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                               <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Monto Validado</p>
                               <p className="text-2xl font-black text-slate-900">S/ {viewingExpense.amount.toFixed(2)}</p>
                          </div>
                          <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                               <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Fecha Emisión</p>
                               <p className="text-2xl font-black text-slate-900">{new Date(viewingExpense.date).toLocaleDateString()}</p>
                          </div>
                      </div>
                      <div className="bg-white rounded-2xl border-4 border-dashed border-slate-200 p-12 flex flex-col items-center justify-center text-center space-y-4">
                           <FileText className="w-16 h-16 text-slate-200" />
                           <div>
                               <p className="font-black text-slate-900 uppercase text-xs tracking-widest">{viewingExpense.documentUrl || 'comprobante.pdf'}</p>
                               <p className="text-[9px] text-slate-400 font-bold uppercase mt-1 italic">Archivo consolidado en el sistema</p>
                           </div>
                           <a href={BackendService.resolveUrl(`/expenses/${viewingExpense.id}/download`)} className="bg-slate-900 text-white px-8 py-3 rounded-xl font-black uppercase text-[10px] flex items-center gap-2 hover:bg-blue-600 transition-all shadow-lg active:scale-95"><Download className="w-4 h-4"/> Descargar Documento</a>
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
