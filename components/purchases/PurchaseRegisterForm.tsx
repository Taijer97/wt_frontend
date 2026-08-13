import React, { useState, useEffect } from 'react';
import { HardwareOrigin, Intermediary, Supplier, CustomerRecord } from '../../types';
import { DataService } from '../../services/dataService';
import { BackendService } from '../../services/backendService';
import { fetchDni } from '../../services/dniService';
import { CustomerNoteModal } from '../CustomerNoteModal';
import { CheckCircle, AlertTriangle, ArrowRight, DollarSign } from 'lucide-react';
import { Button, Input, Modal } from '../ui';

interface PurchaseRegisterFormProps {
  onSuccess: () => void;
  intermediaries: Intermediary[];
  showAlert: (m: string, t: 'success' | 'error') => void;
}

export const PurchaseRegisterForm: React.FC<PurchaseRegisterFormProps> = ({
  onSuccess,
  intermediaries,
  showAlert,
}) => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [relationalCatalog, setRelationalCatalog] = useState<any[]>([]);

  useEffect(() => {
    BackendService.getSuppliers()
      .then((sups) => setSuppliers(sups))
      .catch(() => setSuppliers(DataService.getSuppliers()));

    BackendService.getCatalogProducts()
      .then((prods) => setRelationalCatalog(prods))
      .catch(() => {});
  }, []);

  const config = DataService.getConfig();
  const catalog = relationalCatalog.length > 0 ? relationalCatalog : config.productCatalog || [];
  const categories = Array.from(new Set(catalog.map((c: any) => c.category))).filter(Boolean).sort();
  const initialCat = categories[0] || config.productCategories[0] || 'Laptop';

  const [formData, setFormData] = useState({
    intermediarioId: '',
    dni: '',
    nombre: '',
    direccion: '',
    telefono: '',
    tipoBien: initialCat,
    marca: '',
    modelo: '',
    capacidad: '',
    serie: '',
    tipoId: 'SERIE',
    color: '',
    condicion: 'USADO' as any,
    origen: HardwareOrigin.DECLARACION_JURADA,
    precioPactado: '',
    supplierId: '',
    banco: 'BCP',
    cuentaBancaria: '',
    blockNumber: '1',
    opDate: new Date().toISOString().split('T')[0],
  });

  const [customerNote, setCustomerNote] = useState<CustomerRecord | null>(null);
  const [isDeletingCustomerNote, setIsDeletingCustomerNote] = useState(false);
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeSection, setActiveSection] = useState<'vendedor' | 'equipo' | 'acuerdo'>('vendedor');

  useEffect(() => {
    BackendService.getPurchaseBlocks({ type: 'RUC10' })
      .then((blocks) => {
        const currentMax = blocks.length > 0 ? Math.max(...blocks) : 0;
        if (formData.blockNumber === '1' && currentMax > 0) {
          setFormData((f) => ({ ...f, blockNumber: String(currentMax) }));
        }
      })
      .catch(() => {});
  }, []);

  const brandsForCat = Array.from(new Set(catalog.filter((c: any) => c.category === formData.tipoBien).map((c: any) => c.brand))).filter(Boolean).sort();
  const modelsForBrand = Array.from(
    new Set(
      catalog
        .filter((c: any) => c.category === formData.tipoBien && c.brand === formData.marca)
        .map((c: any) => c.model)
        .filter(Boolean)
    )
  ).sort();
  const capacitiesForModel = Array.from(
    new Set(
      catalog
        .filter((c: any) => c.category === formData.tipoBien && c.brand === formData.marca && c.model === formData.modelo && (c.specsCapacity || c.capacity))
        .map((c: any) => c.specsCapacity || c.capacity as string)
        .filter(Boolean)
    )
  ).sort();

  useEffect(() => {
    if (brandsForCat.length > 0 && !brandsForCat.includes(formData.marca)) {
      setFormData((f) => ({ ...f, marca: brandsForCat[0] }));
    }
  }, [formData.tipoBien, catalog]);

  useEffect(() => {
    if (modelsForBrand.length > 0 && !modelsForBrand.includes(formData.modelo)) {
      setFormData((f) => ({ ...f, modelo: modelsForBrand[0] }));
    }
  }, [formData.marca, formData.tipoBien, catalog]);

  useEffect(() => {
    if (capacitiesForModel.length > 0 && !capacitiesForModel.includes(formData.capacidad)) {
      setFormData((f) => ({ ...f, capacidad: capacitiesForModel[0] }));
    } else if (capacitiesForModel.length === 0 && formData.capacidad) {
      setFormData((f) => ({ ...f, capacidad: '' }));
    }
  }, [formData.modelo, formData.marca, formData.tipoBien, catalog]);

  const handleChange = (e: any) => {
    const t = e.target;
    const isSelect = String(t.tagName).toUpperCase() === 'SELECT';
    const passthrough = t.type === 'email' || t.type === 'number' || t.type === 'date' || isSelect;
    const v = passthrough ? t.value : String(t.value || '').toUpperCase();
    if (t.name === 'dni') setCustomerNote(null);
    setFormData({ ...formData, [t.name]: v });
  };

  const handleDniBlur = async () => {
    const dni = (formData.dni || '').trim();
    if (!dni || dni.length < 8) return;
    setCustomerNote(null);
    let sellerLoaded = false;
    try {
      const seller = await BackendService.getSeller(dni);
      if (seller) {
        setFormData((prev) => ({
          ...prev,
          nombre: seller.full_name || prev.nombre,
          direccion: prev.direccion,
          telefono: seller.phone || prev.telefono,
          banco: seller.bank_name || prev.banco,
          cuentaBancaria: seller.bank_account || prev.cuentaBancaria,
        }));
        if ((seller.note || '').trim()) {
          setCustomerNote({
            id: String(seller.id),
            docNumber: seller.doc_number || dni,
            fullName: seller.full_name || '',
            phone: seller.phone || '',
            address: seller.address || '',
            note: seller.note || '',
          });
        }
        showAlert('Datos cargados del historial', 'success');
        sellerLoaded = true;
      }
    } catch {}

    try {
      const info = await fetchDni(dni);
      setFormData((prev) => ({
        ...prev,
        direccion: info.direccion || prev.direccion,
        nombre: info.fullName || prev.nombre,
      }));
      if (sellerLoaded) {
        showAlert('Domicilio actualizado desde RENIEC', 'success');
      }
    } catch {}
  };

  const handleSaveCustomerNote = async (newNote: string) => {
    if (!customerNote?.id) return;
    try {
      await BackendService.updateCustomer(customerNote.id, { note: newNote });
      setCustomerNote(prev => (prev ? { ...prev, note: newNote } : null));
    } catch {
      showAlert('Error al actualizar nota del cliente', 'error');
    }
  };

  const handleDeleteCustomerNote = async () => {
    if (!customerNote?.id) return;
    setIsDeletingCustomerNote(true);
    try {
      await BackendService.updateCustomer(customerNote.id, { note: '' });
      setCustomerNote(null);
      showAlert('Nota del cliente eliminada', 'success');
    } catch {
      showAlert('No se pudo eliminar la nota del cliente', 'error');
    } finally {
      setIsDeletingCustomerNote(false);
    }
  };

  const processSubmit = async () => {
    if (!formData.intermediarioId) return showAlert('Seleccione el Propietario RUC 10', 'error');
    const totalBase = Number(formData.precioPactado);

    setIsProcessing(true);
    try {
      const modelWithCap = formData.capacidad ? `${formData.modelo} ${formData.capacidad}` : formData.modelo;
      await BackendService.createPurchase({
        type: 'RUC10',
        documentNumber: formData.serie,
        supplierId: formData.supplierId ? Number(formData.supplierId) : null,
        intermediaryId: Number(formData.intermediarioId) || null,
        date: formData.opDate,
        baseAmount: totalBase,
        igvAmount: 0,
        totalAmount: totalBase,
        pdfUrl: null,
        providerName: formData.nombre,
        productBrand: formData.marca,
        productModel: modelWithCap,
        productSerial: formData.serie,
        productIdType: formData.tipoId as any,
        productCondition: formData.condicion,
        sellerDocNumber: formData.dni,
        sellerFullName: formData.nombre,
        sellerAddress: formData.direccion,
        sellerCivilStatus: 'SOLTERO',
        sellerPhone: formData.telefono,
        bankName: formData.banco,
        bankAccount: formData.cuentaBancaria,
        blockNumber: Number(formData.blockNumber) || 1,
        items: [{ category: formData.tipoBien, brand: formData.marca, model: modelWithCap, serial: formData.serie, idType: formData.tipoId, cost: totalBase }] as any,
      } as any);

      setShowDuplicateWarning(false);
      onSuccess();
    } catch {
      showAlert('Error al registrar la compra', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.dni || !formData.nombre) {
      showAlert('Ingrese DNI y Nombre del Vendedor', 'error');
      return;
    }
    if (!formData.serie) {
      showAlert('Ingrese la Serie o IMEI del Equipo', 'error');
      return;
    }
    if (!formData.precioPactado || Number(formData.precioPactado) <= 0) {
      showAlert('Ingrese un Precio Pactado válido', 'error');
      return;
    }

    // Verificar si el número de serie ya fue registrado anteriormente
    if (formData.serie && formData.serie.trim()) {
      try {
        const existRes = await BackendService.getPurchasesPaged({ q: formData.serie.trim(), limit: 1, offset: 0 }, true);
        if (existRes && existRes.items && existRes.items.length > 0) {
          const match = existRes.items.find((p: any) =>
            (p.product_serial || '').toUpperCase() === formData.serie.trim().toUpperCase() ||
            (p.document_number || '').toUpperCase() === formData.serie.trim().toUpperCase() ||
            (p.items || []).some((it: any) => (it.serial || '').toUpperCase() === formData.serie.trim().toUpperCase())
          );
          if (match) {
            setShowDuplicateWarning(true);
            return;
          }
        }
      } catch {}
    }
    await processSubmit();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <CustomerNoteModal
        open={Boolean(customerNote?.note)}
        customerName={customerNote?.fullName}
        docNumber={customerNote?.docNumber}
        customerId={customerNote?.id}
        note={customerNote?.note || ''}
        deleting={isDeletingCustomerNote}
        onClose={() => setCustomerNote(null)}
        onDelete={handleDeleteCustomerNote}
        onSaveNote={handleSaveCustomerNote}
      />

      {/* Progress Selector */}
      <div className="flex justify-end mb-2">
        <div className="bg-slate-900 p-1.5 rounded-2xl flex gap-1 shadow-lg">
          {[
            { id: 'vendedor', label: '1. Vendedor', color: 'bg-emerald-500 text-slate-900' },
            { id: 'equipo', label: '2. Equipo', color: 'bg-blue-500 text-white' },
            { id: 'acuerdo', label: '3. Acuerdo', color: 'bg-purple-500 text-white' },
          ].map((sec) => (
            <button
              key={sec.id}
              type="button"
              onClick={() => setActiveSection(sec.id as any)}
              className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                activeSection === sec.id ? `${sec.color} shadow-sm` : 'text-slate-400 hover:text-white'
              }`}
            >
              {sec.label}
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* SECCIÓN 1: VENDEDOR */}
        <div
          className={`bg-white p-6 rounded-3xl border ${
            activeSection === 'vendedor' ? 'border-emerald-500 ring-2 ring-emerald-500/20' : 'border-slate-200 opacity-60'
          } shadow-xs space-y-4 transition-all`}
          onClick={() => setActiveSection('vendedor')}
        >
          <div className="flex justify-between items-center border-b pb-3">
            <h3 className="font-extrabold text-slate-900 uppercase text-xs tracking-wider">Vendedor (DNI)</h3>
            <div className="flex items-center gap-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Bloque N°</label>
              <input
                name="blockNumber"
                type="number"
                min="1"
                value={formData.blockNumber}
                onChange={handleChange}
                className="w-16 border border-slate-200 rounded-xl p-1.5 bg-slate-50 font-bold text-slate-900 text-center outline-none focus:border-emerald-500"
                disabled={activeSection !== 'vendedor'}
              />
            </div>
          </div>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Número DNI"
                name="dni"
                value={formData.dni}
                onChange={handleChange}
                onBlur={handleDniBlur}
                maxLength={8}
                required
                disabled={activeSection !== 'vendedor'}
              />
              <Input
                label="Número Celular"
                name="telefono"
                value={formData.telefono}
                onChange={handleChange}
                disabled={activeSection !== 'vendedor'}
              />
              <div className="col-span-2">
                <Input
                  label="Nombre Completo"
                  name="nombre"
                  value={formData.nombre}
                  onChange={handleChange}
                  required
                  disabled={activeSection !== 'vendedor'}
                />
              </div>
              <div className="col-span-2">
                <Input
                  label="Domicilio Actual"
                  name="direccion"
                  value={formData.direccion}
                  onChange={handleChange}
                  disabled={activeSection !== 'vendedor'}
                />
              </div>
            </div>
            {activeSection === 'vendedor' && (
              <Button
                type="button"
                variant="secondary"
                fullWidth
                onClick={(e) => { e.stopPropagation(); setActiveSection('equipo'); }}
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Siguiente
              </Button>
            )}
          </div>
        </div>

        {/* SECCIÓN 2: EQUIPO */}
        <div
          className={`bg-white p-6 rounded-3xl border ${
            activeSection === 'equipo' ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-slate-200 opacity-60'
          } shadow-xs space-y-4 transition-all`}
          onClick={() => setActiveSection('equipo')}
        >
          <h3 className="font-extrabold text-slate-900 uppercase text-xs tracking-wider border-b pb-3">Detalle del Equipo</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Producto</label>
              <select
                name="tipoBien"
                value={formData.tipoBien}
                onChange={handleChange}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold bg-white text-slate-900 uppercase"
                disabled={activeSection !== 'equipo'}
              >
                {(categories.length > 0 ? categories : config.productCategories).map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Marca</label>
              <select
                name="marca"
                value={formData.marca}
                onChange={handleChange}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold bg-white text-slate-900 uppercase"
                disabled={activeSection !== 'equipo'}
              >
                {brandsForCat.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Modelo</label>
              <select
                name="modelo"
                value={formData.modelo}
                onChange={handleChange}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold bg-white text-slate-900 uppercase"
                disabled={activeSection !== 'equipo'}
              >
                {modelsForBrand.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            {capacitiesForModel.length > 0 && (
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Capacidad</label>
                <select
                  name="capacidad"
                  value={formData.capacidad}
                  onChange={handleChange}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold bg-white text-slate-900 uppercase"
                  disabled={activeSection !== 'equipo'}
                >
                  {capacitiesForModel.map((cap) => (
                    <option key={cap} value={cap}>
                      {cap}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="bg-slate-900 p-4 rounded-2xl border border-slate-700 space-y-2">
              <div className="flex justify-between items-center">
                <label className="block text-[10px] font-black text-purple-400 uppercase tracking-wider">
                  {formData.tipoId === 'IMEI' ? 'Código IMEI' : 'Número de Serie (S/N)'}
                </label>
                <select
                  name="tipoId"
                  value={formData.tipoId}
                  onChange={handleChange}
                  className="bg-slate-800 text-purple-300 text-[10px] font-bold uppercase rounded px-2 py-1 outline-none"
                  disabled={activeSection !== 'equipo'}
                >
                  <option value="SERIE">Serie</option>
                  <option value="IMEI">IMEI</option>
                </select>
              </div>
              <input
                name="serie"
                value={formData.serie}
                onChange={handleChange}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 font-mono font-bold text-white outline-none focus:border-purple-500 uppercase text-xs"
                placeholder={formData.tipoId === 'IMEI' ? 'Ingrese IMEI...' : 'Ingrese S/N...'}
                disabled={activeSection !== 'equipo'}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Condición</label>
                <select
                  name="condicion"
                  value={formData.condicion}
                  onChange={handleChange}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold bg-white text-slate-900 uppercase"
                  disabled={activeSection !== 'equipo'}
                >
                  <option value="USADO">USADO</option>
                  <option value="REACONDICIONADO">REACONDICIONADO</option>
                  <option value="NUEVO">NUEVO</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Tienda Origen</label>
                <select
                  name="supplierId"
                  value={formData.supplierId}
                  onChange={handleChange}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold bg-white text-slate-900 uppercase"
                  disabled={activeSection !== 'equipo'}
                >
                  <option value="">-- NINGUNO --</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.shortName || s.razonSocial}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {activeSection === 'equipo' && (
              <Button
                type="button"
                variant="secondary"
                fullWidth
                onClick={(e) => { e.stopPropagation(); setActiveSection('acuerdo'); }}
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Siguiente
              </Button>
            )}
          </div>
        </div>

        {/* SECCIÓN 3: ACUERDO COMERCIAL */}
        <div
          className={`bg-white p-6 rounded-3xl border ${
            activeSection === 'acuerdo' ? 'border-purple-500 ring-2 ring-purple-500/20' : 'border-slate-200 opacity-60'
          } shadow-xs space-y-4 transition-all`}
          onClick={() => setActiveSection('acuerdo')}
        >
          <h3 className="font-extrabold text-slate-900 uppercase text-xs tracking-wider border-b pb-3 flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-emerald-600" /> Acuerdo Comercial
          </h3>
          <div className="space-y-4">
            <div className="bg-amber-50 p-3.5 rounded-2xl border border-amber-200">
              <label className="block text-[10px] font-black text-amber-800 uppercase mb-1.5">
                Intermediario / RUC 10
              </label>
              <select
                name="intermediarioId"
                value={formData.intermediarioId}
                onChange={handleChange}
                className="w-full border border-amber-300 rounded-xl p-2.5 font-bold bg-white text-slate-900 uppercase text-xs"
                disabled={activeSection !== 'acuerdo'}
              >
                <option value="">Seleccionar...</option>
                {intermediaries.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.fullName}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Banco</label>
                <select
                  name="banco"
                  value={formData.banco}
                  onChange={handleChange}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold bg-white text-slate-900 uppercase"
                  disabled={activeSection !== 'acuerdo'}
                >
                  <option value="YAPE">YAPE</option>
                  <option value="PLIN">PLIN</option>
                  <option value="BANCO DE LA NACION">BANCO DE LA NACIÓN</option>
                  <option value="CAJA HUANCAYO">CAJA HUANCAYO</option>
                </select>
              </div>

              <div className="col-span-2">
                <Input
                  label="Número de Cuenta"
                  name="cuentaBancaria"
                  value={formData.cuentaBancaria}
                  onChange={handleChange}
                  placeholder="Número de cuenta o CCI"
                  disabled={activeSection !== 'acuerdo'}
                />
              </div>

              <div className="col-span-2">
                <Input
                  label="Precio (S/)"
                  type="number"
                  name="precioPactado"
                  value={formData.precioPactado}
                  onChange={handleChange}
                  required
                  disabled={activeSection !== 'acuerdo'}
                />
              </div>

              <div className="col-span-2">
                <Input
                  label="Fecha de Operación"
                  type="date"
                  name="opDate"
                  value={formData.opDate}
                  onChange={handleChange}
                  disabled={activeSection !== 'acuerdo'}
                />
              </div>
            </div>

            {activeSection === 'acuerdo' && (
              <Button
                type="submit"
                variant="primary"
                fullWidth
                size="lg"
                isLoading={isProcessing}
                leftIcon={<CheckCircle className="w-5 h-5" />}
              >
                Registrar Compra
              </Button>
            )}
          </div>
        </div>
      </form>

      {/* Modal de Advertencia de Duplicado */}
      <Modal
        open={showDuplicateWarning}
        onClose={() => setShowDuplicateWarning(false)}
        title="¡Equipo Duplicado!"
        icon={<AlertTriangle className="w-6 h-6 text-amber-500" />}
        size="sm"
        footer={
          <div className="flex gap-2 justify-end w-full">
            <Button variant="ghost" onClick={() => setShowDuplicateWarning(false)}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={processSubmit} isLoading={isProcessing}>
              Guardar De Todos Modos
            </Button>
          </div>
        }
      >
        <p className="text-sm text-slate-600 font-medium">
          El Número de Serie/IMEI <strong className="font-mono text-purple-600 bg-purple-50 px-2 py-0.5 rounded">{formData.serie.toUpperCase()}</strong> ya se encuentra registrado en el sistema previamente.
        </p>
      </Modal>
    </div>
  );
};
