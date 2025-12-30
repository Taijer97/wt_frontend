import React, { useState, useEffect } from 'react';
import { DataService } from '../services/dataService';
import { Product, Transaction, ReceiptType, TransactionItem, DocumentType } from '../types';
import { Plus, Trash2, Save, FileText } from 'lucide-react';

interface TransactionModuleProps {
  type: 'sale' | 'purchase';
}

export const TransactionModule: React.FC<TransactionModuleProps> = ({ type }) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [showForm, setShowForm] = useState(false);

  // Form State
  const [docType, setDocType] = useState<ReceiptType>(type === 'sale' ? ReceiptType.BOLETA : ReceiptType.FACTURA);
  const [docNumber, setDocNumber] = useState('');
  const [entityName, setEntityName] = useState('');
  const [entityDoc, setEntityDoc] = useState('');
  const [items, setItems] = useState<TransactionItem[]>([]);
  
  // Item Form State
  const [selectedProductId, setSelectedProductId] = useState('');
  const [qty, setQty] = useState(1);

  const config = DataService.getConfig();

  useEffect(() => {
    loadData();
  }, [type]);

  const loadData = () => {
    setTransactions(DataService.getTransactions(type));
    setProducts(DataService.getProducts());
  };

  const handleAddItem = () => {
    const product = products.find(p => p.id === selectedProductId);
    if (!product) return;

    // Logic: In Sales, price is what we sell at. In Purchases, we input cost.
    // For simplicity, we use the product's defined unitPrice as base.
    const price = product.unitPrice || 0;
    const unitPriceBase = type === 'sale' 
      ? price 
      : (price * 0.7); // Mock purchase cost lower than sale price

    const newItem: TransactionItem = {
      productId: product.id,
      productName: product.name || product.brand || 'Producto Sin Nombre',
      quantity: qty,
      unitPriceBase: unitPriceBase,
      totalBase: unitPriceBase * qty
    };

    setItems([...items, newItem]);
    setSelectedProductId('');
    setQty(1);
  };

  const handleRemoveItem = (idx: number) => {
    const newItems = [...items];
    newItems.splice(idx, 1);
    setItems(newItems);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const totalBase = items.reduce((acc, i) => acc + i.totalBase, 0);
    const igvAmount = totalBase * config.igvRate;
    const totalAmount = totalBase + igvAmount;

    const newTrans: Transaction = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      documentType: docType,
      documentNumber: docNumber || `E001-${Math.floor(Math.random() * 10000)}`,
      entityName: entityName,
      entityDocNumber: entityDoc,
      items: items,
      baseAmount: totalBase,
      igvAmount: igvAmount,
      totalAmount: totalAmount
    };

    DataService.addTransaction(type, newTrans);
    loadData();
    setShowForm(false);
    resetForm();
  };

  const resetForm = () => {
    setEntityName('');
    setEntityDoc('');
    setItems([]);
    setDocNumber('');
  };

  const totals = items.reduce((acc, item) => ({
    base: acc.base + item.totalBase,
  }), { base: 0 });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">
            {type === 'sale' ? 'Registro de Ventas' : 'Registro de Compras'}
          </h2>
          <p className="text-sm text-gray-500">
            {type === 'sale' ? 'Emisión de comprobantes y control de ingresos.' : 'Control de inventario y crédito fiscal.'}
          </p>
        </div>
        <button 
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium transition-colors"
        >
          <Plus className="w-5 h-5" />
          {type === 'sale' ? 'Nueva Venta' : 'Nueva Compra'}
        </button>
      </div>

      {showForm && (
        <div className="bg-white p-6 rounded-xl shadow-lg border border-blue-100 animate-fade-in">
          <h3 className="text-lg font-semibold mb-4 border-b pb-2">
            {type === 'sale' ? 'Emitir Comprobante' : 'Registrar Factura de Proveedor'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
               <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo Documento</label>
                <select 
                  className="w-full border-gray-300 rounded-md shadow-sm p-2 border focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
                  value={docType}
                  onChange={(e) => setDocType(e.target.value as ReceiptType)}
                >
                  <option value={ReceiptType.BOLETA}>Boleta de Venta</option>
                  <option value={ReceiptType.FACTURA}>Factura Electrónica</option>
                </select>
               </div>
               <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                   {type === 'sale' ? 'Cliente (Razón Social/Nombre)' : 'Proveedor'}
                </label>
                <input 
                  required
                  type="text" 
                  className="w-full border-gray-300 rounded-md shadow-sm p-2 border bg-white text-gray-900"
                  value={entityName}
                  onChange={e => setEntityName(e.target.value)}
                />
               </div>
               <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">RUC / DNI</label>
                <input 
                  required
                  type="text" 
                  className="w-full border-gray-300 rounded-md shadow-sm p-2 border bg-white text-gray-900"
                  value={entityDoc}
                  onChange={e => setEntityDoc(e.target.value)}
                />
               </div>
            </div>

            {/* Item Entry */}
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <div className="flex flex-col md:flex-row gap-4 items-end">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Producto</label>
                  <select 
                    className="w-full border-gray-300 rounded-md shadow-sm p-2 border bg-white text-gray-900"
                    value={selectedProductId}
                    onChange={e => setSelectedProductId(e.target.value)}
                  >
                    <option value="">Seleccionar Producto...</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.name || p.brand || p.id} (Stock: {p.stock || 0})</option>
                    ))}
                  </select>
                </div>
                <div className="w-24">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cant.</label>
                  <input 
                    type="number" 
                    min="1"
                    className="w-full border-gray-300 rounded-md shadow-sm p-2 border bg-white text-gray-900"
                    value={qty}
                    onChange={e => setQty(Number(e.target.value))}
                  />
                </div>
                <button 
                  type="button"
                  onClick={handleAddItem}
                  className="bg-slate-700 text-white px-4 py-2 rounded-md hover:bg-slate-800"
                >
                  Agregar
                </button>
              </div>
            </div>

            {/* Items Table */}
            {items.length > 0 && (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Producto</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Cant.</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">P. Base</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Acción</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {items.map((item, idx) => (
                    <tr key={idx}>
                      <td className="px-3 py-2 text-sm text-gray-900">{item.productName}</td>
                      <td className="px-3 py-2 text-sm text-gray-900 text-right">{item.quantity}</td>
                      <td className="px-3 py-2 text-sm text-gray-900 text-right">{item.unitPriceBase.toFixed(2)}</td>
                      <td className="px-3 py-2 text-sm text-gray-900 text-right">{item.totalBase.toFixed(2)}</td>
                      <td className="px-3 py-2 text-right">
                        <button type="button" onClick={() => handleRemoveItem(idx)} className="text-red-600 hover:text-red-900">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* Totals & Submit */}
            <div className="flex justify-between items-center pt-4 border-t border-gray-200">
              <div className="text-right w-full">
                <p className="text-sm text-gray-600">Base Imponible: S/ {totals.base.toFixed(2)}</p>
                <p className="text-sm text-gray-600">IGV (18%): S/ {(totals.base * config.igvRate).toFixed(2)}</p>
                <p className="text-xl font-bold text-gray-900 mt-1">Total: S/ {(totals.base * (1 + config.igvRate)).toFixed(2)}</p>
              </div>
            </div>
            
            <div className="flex justify-end gap-3">
              <button 
                type="button" 
                onClick={() => setShowForm(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button 
                type="submit" 
                disabled={items.length === 0}
                className="px-4 py-2 bg-blue-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                Guardar {type === 'sale' ? 'Venta' : 'Compra'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* History Table */}
      <div className="bg-white shadow-sm rounded-xl overflow-hidden border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Documento</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {type === 'sale' ? 'Cliente' : 'Proveedor'}
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Base</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">IGV</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {transactions.length === 0 ? (
              <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-500 text-sm">No hay registros aún.</td></tr>
            ) : (
              transactions.map(t => (
                <tr key={t.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(t.date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${t.documentType === ReceiptType.FACTURA ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`}>
                      {t.documentType === ReceiptType.FACTURA ? 'FAC' : 'BOL'}
                    </span>
                    <span className="ml-2 text-gray-600">{t.documentNumber}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{t.entityName}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">S/ {t.baseAmount.toFixed(2)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">S/ {t.igvAmount.toFixed(2)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 text-right">S/ {t.totalAmount.toFixed(2)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
