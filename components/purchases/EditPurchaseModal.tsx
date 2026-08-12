import React, { useState, useEffect } from 'react';
import { PurchaseEntry, Intermediary, Supplier } from '../../types';
import { DataService } from '../../services/dataService';
import { BackendService } from '../../services/backendService';
import { Edit3, X, Save } from 'lucide-react';
import { Button, Input, Modal } from '../ui';

interface EditPurchaseModalProps {
  purchase: PurchaseEntry;
  intermediaries: Intermediary[];
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
}

export const EditPurchaseModal: React.FC<EditPurchaseModalProps> = ({
  purchase,
  intermediaries,
  onClose,
  onSave,
}) => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [relationalCatalog, setRelationalCatalog] = useState<any[]>([]);
  const config = DataService.getConfig();
  const catalog = relationalCatalog.length > 0 ? relationalCatalog : config.productCatalog || [];
  const categoryOptions = Array.from(new Set(catalog.map((c: any) => c.category))).filter(Boolean);

  const toDateInputValue = (value?: any) => {
    const fallback = new Date().toISOString().split('T')[0];
    if (!value) return fallback;
    if (value instanceof Date) {
      const t = value.getTime();
      return Number.isNaN(t) ? fallback : value.toISOString().split('T')[0];
    }
    const raw = String(value).trim();
    if (!raw) return fallback;
    if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) return fallback;
    return parsed.toISOString().split('T')[0];
  };

  useEffect(() => {
    BackendService.getSuppliers()
      .then((sups) => setSuppliers(sups))
      .catch(() => setSuppliers(DataService.getSuppliers()));

    BackendService.getCatalogProducts()
      .then((prods) => setRelationalCatalog(prods))
      .catch(() => {});
  }, []);

  const [formData, setFormData] = useState({
    providerName: purchase.providerName || '',
    sellerDocNumber: purchase.providerDni || '',
    sellerPhone: purchase.providerPhone || '',
    sellerAddress: purchase.providerAddress || '',
    bankName: purchase.bankOrigin || '',
    bankAccount: purchase.bankAccount || '',
    baseAmount: purchase.priceAgreed || 0,
    intermediaryId: purchase.intermediaryId || '',
    supplierId: purchase.supplierId || '',
    productType: purchase.productType || categoryOptions[0] || config.productCategories[0] || 'Laptop',
    productBrand: purchase.productBrand || '',
    productModel: purchase.productModel || '',
    productSerial: purchase.productSerial || '',
    productIdType: purchase.productIdType || 'SERIE',
    productCondition: purchase.productCondition || 'USADO',
    date: toDateInputValue(purchase.date),
    blockNumber: purchase.blockNumber || 1,
  });

  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    const currentSerial = String(formData.productSerial || '').trim().toUpperCase();
    const currentSupplierId = String(formData.supplierId || '').trim();

    if (currentSerial) {
      try {
        const page = await BackendService.getPurchasesPaged({ type: 'RUC10', q: currentSerial, limit: 50, offset: 0 }, true);
        const matches = ((page?.items || []) as any[]).filter(
          (p: any) => String(p?.id) !== String(purchase.id) && String(p?.product_serial || '').trim().toUpperCase() === currentSerial
        );
        if (matches.length > 0) {
          const sameOriginStore = matches.some((p: any) => String(p?.supplier_id || '').trim() === currentSupplierId);
          if (sameOriginStore) {
            setFormError('Serie repetida en la misma tienda de origen. Cambie Proveedor Rel. o la serie para continuar.');
            return;
          }
          const continueSave = window.confirm('La serie ya existe en otra tienda de origen. ¿Desea guardar de todos modos?');
          if (!continueSave) return;
        }
      } catch {}
    }

    setIsSaving(true);
    await onSave({
      ...formData,
      totalAmount: Number(formData.baseAmount || 0),
      items: [
        {
          category: formData.productType || '',
          brand: formData.productBrand || '',
          model: formData.productModel || '',
          serial: formData.productSerial || '',
          cost: Number(formData.baseAmount || 0),
          supplierId: formData.supplierId || null,
        },
      ],
    });
    setIsSaving(false);
  };

  return (
    <Modal
      open={true}
      onClose={onClose}
      title={`Editar Registro #${purchase.id}`}
      icon={<Edit3 className="w-5 h-5 text-blue-500" />}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {formError && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-bold text-red-700">
            {formError}
          </div>
        )}

        <div className="space-y-4">
          <h4 className="text-xs font-black text-slate-500 uppercase tracking-wider border-b pb-1">
            Datos del Vendedor
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Nombre / Razón Social"
              value={formData.providerName}
              onChange={(e) => setFormData({ ...formData, providerName: e.target.value.toUpperCase() })}
              required
            />
            <Input
              label="DNI"
              value={formData.sellerDocNumber}
              onChange={(e) => setFormData({ ...formData, sellerDocNumber: e.target.value })}
              required
            />
            <Input
              label="Teléfono"
              value={formData.sellerPhone}
              onChange={(e) => setFormData({ ...formData, sellerPhone: e.target.value })}
            />
            <Input
              label="Dirección"
              value={formData.sellerAddress}
              onChange={(e) => setFormData({ ...formData, sellerAddress: e.target.value.toUpperCase() })}
            />
          </div>
        </div>

        <div className="space-y-4">
          <h4 className="text-xs font-black text-slate-500 uppercase tracking-wider border-b pb-1">
            Proveedor y Detalle del Equipo
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                Proveedor Rel.
              </label>
              <select
                value={formData.supplierId}
                onChange={(e) => setFormData({ ...formData, supplierId: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold bg-white text-slate-900 uppercase"
              >
                <option value="">Seleccionar...</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.shortName || s.razonSocial}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                Tipo de Bien
              </label>
              <select
                value={formData.productType}
                onChange={(e) => setFormData({ ...formData, productType: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold bg-white text-slate-900 uppercase"
              >
                {[...new Set([formData.productType, ...categoryOptions, ...(config.productCategories || [])].filter(Boolean))].map(
                  (category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  )
                )}
              </select>
            </div>

            <Input
              label="Marca"
              value={formData.productBrand}
              onChange={(e) => setFormData({ ...formData, productBrand: e.target.value.toUpperCase() })}
              required
            />
            <Input
              label="Modelo"
              value={formData.productModel}
              onChange={(e) => setFormData({ ...formData, productModel: e.target.value.toUpperCase() })}
              required
            />
            <Input
              label="Serie"
              value={formData.productSerial}
              onChange={(e) => setFormData({ ...formData, productSerial: e.target.value.toUpperCase() })}
              required
            />

            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                Tipo de ID
              </label>
              <select
                value={formData.productIdType}
                onChange={(e) => setFormData({ ...formData, productIdType: e.target.value as any })}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold bg-white text-slate-900 uppercase"
              >
                <option value="SERIE">SERIE</option>
                <option value="IMEI">IMEI</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                Condición
              </label>
              <select
                value={formData.productCondition}
                onChange={(e) => setFormData({ ...formData, productCondition: e.target.value as any })}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold bg-white text-slate-900 uppercase"
              >
                <option value="USADO">USADO</option>
                <option value="REACONDICIONADO">REACONDICIONADO</option>
                <option value="NUEVO">NUEVO</option>
              </select>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h4 className="text-xs font-black text-slate-500 uppercase tracking-wider border-b pb-1">
            Acuerdo Comercial
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Fecha"
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              required
            />
            <Input
              label="Bloque / Lote"
              type="number"
              min={1}
              value={formData.blockNumber}
              onChange={(e) => setFormData({ ...formData, blockNumber: Number(e.target.value) })}
              required
            />

            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                Intermediario
              </label>
              <select
                value={formData.intermediaryId}
                onChange={(e) => setFormData({ ...formData, intermediaryId: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold bg-white text-slate-900 uppercase"
              >
                <option value="">Seleccionar...</option>
                {intermediaries.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.fullName}
                  </option>
                ))}
              </select>
            </div>

            <Input
              label="Costo Base (S/)"
              type="number"
              value={formData.baseAmount}
              onChange={(e) => setFormData({ ...formData, baseAmount: Number(e.target.value) })}
              required
            />

            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                Banco
              </label>
              <select
                value={formData.bankName}
                onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold bg-white text-slate-900 uppercase"
              >
                <option value="">Seleccionar</option>
                <option value="YAPE">YAPE</option>
                <option value="PLIN">PLIN</option>
                <option value="BANCO DE LA NACION">BANCO DE LA NACIÓN</option>
                <option value="CAJA HUANCAYO">CAJA HUANCAYO</option>
              </select>
            </div>

            <Input
              label="Número de Cuenta"
              value={formData.bankAccount}
              onChange={(e) => setFormData({ ...formData, bankAccount: e.target.value })}
            />
          </div>
        </div>

        <div className="flex gap-3 justify-end pt-4 border-t">
          <Button variant="ghost" type="button" onClick={onClose} disabled={isSaving}>
            Cancelar
          </Button>
          <Button variant="primary" type="submit" isLoading={isSaving} leftIcon={<Save className="w-4 h-4" />}>
            Guardar Cambios
          </Button>
        </div>
      </form>
    </Modal>
  );
};
