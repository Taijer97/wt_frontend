
import React from 'react';
import { DataService } from '../services/dataService';
import { Calculator, Download, FileCheck } from 'lucide-react';

export const TaxReportModule: React.FC = () => {
  const currentMonth = new Date().toISOString().slice(0, 7);
  const data = DataService.calculateTaxPeriod(currentMonth);
  const config = DataService.getConfig();

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Liquidación de Impuestos</h2>
          <p className="text-sm text-gray-500">Régimen MYPE Tributario (RMT) - Periodo: {currentMonth}</p>
        </div>
        <button className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium">
          <Download className="w-4 h-4" />
          Exportar PLE (TXT)
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Cálculo de IGV */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-slate-50 p-4 border-b border-gray-200 flex justify-between items-center">
            <h3 className="font-semibold text-gray-800 flex items-center gap-2">
              <Calculator className="w-5 h-5 text-blue-600" />
              Cálculo de IGV (18%)
            </h3>
            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded font-medium">Mensual</span>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg border border-green-100">
              <div>
                <p className="text-sm font-medium text-gray-700">Débito Fiscal (Ventas)</p>
                <p className="text-xs text-gray-500">IGV cobrado a clientes</p>
              </div>
              <span className="font-bold text-lg text-green-700">+ S/ {data.debitoFiscal.toFixed(2)}</span>
            </div>
            
            <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg border border-red-100">
              <div>
                <p className="text-sm font-medium text-gray-700">Crédito Fiscal (Compras)</p>
                <p className="text-xs text-gray-500">IGV pagado a proveedores</p>
              </div>
              <span className="font-bold text-lg text-red-700">- S/ {data.creditoFiscal.toFixed(2)}</span>
            </div>

            <div className="my-2 border-t border-dashed border-gray-300"></div>

            <div className="flex justify-between items-center">
              <span className="text-gray-900 font-semibold">IGV Resultante</span>
              <span className="text-2xl font-bold text-gray-900">S/ {data.igvPorPagar.toFixed(2)}</span>
            </div>
            <p className="text-xs text-gray-500 text-right">Monto a consignar en Formulario 621</p>
          </div>
        </div>

        {/* Cálculo de Renta */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-slate-50 p-4 border-b border-gray-200 flex justify-between items-center">
             <h3 className="font-semibold text-gray-800 flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-purple-600" />
              Impuesto a la Renta (RMT)
            </h3>
             <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded font-medium">Pago a Cuenta</span>
          </div>
          <div className="p-6 space-y-4">
            <div className="space-y-2">
               <div className="flex justify-between">
                <span className="text-sm text-gray-600">Ingresos Netos del Mes</span>
                <span className="font-medium">S/ {data.totalVentasBase.toFixed(2)}</span>
               </div>
               <div className="flex justify-between">
                <span className="text-sm text-gray-600">Tasa (RMT &lt; 300 UIT)</span>
                <span className="font-medium">{(config.rentaRate * 100).toFixed(2)} %</span>
               </div>
            </div>
            
            <div className="my-2 border-t border-dashed border-gray-300"></div>

            <div className="flex justify-between items-center">
              <span className="text-gray-900 font-semibold">Renta Mensual</span>
              <span className="text-2xl font-bold text-purple-700">S/ {data.rentaMensual.toFixed(2)}</span>
            </div>
             <p className="text-xs text-gray-500 mt-2 bg-yellow-50 p-2 rounded border border-yellow-100">
              Nota: Este es un pago a cuenta. La regularización se realiza en la Declaración Jurada Anual.
            </p>
          </div>
        </div>
      </div>

      {/* Gran Total */}
      <div className="bg-slate-900 rounded-xl p-8 text-white shadow-xl flex flex-col md:flex-row justify-between items-center">
        <div>
          <h3 className="text-2xl font-bold">Total a Pagar a SUNAT</h3>
          <p className="text-slate-400 mt-1">Suma de IGV y Pago a Cuenta Renta</p>
        </div>
        <div className="mt-4 md:mt-0 text-center md:text-right">
          <span className="text-4xl font-extrabold tracking-tight">S/ {data.totalSunat.toFixed(2)}</span>
          <p className="text-sm text-slate-400 mt-1">Vencimiento s/ cronograma</p>
        </div>
      </div>
    </div>
  );
};
