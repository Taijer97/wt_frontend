import React, { useState, useEffect, useMemo } from 'react';
import { AppConfig, CatalogProduct } from '../../types';
import { Plus, Trash2, Tag, ListPlus, Save, CheckCircle, X, Search, RefreshCw, Edit2, Barcode, Database, Check } from 'lucide-react';
import { Button, Input, Card } from '../ui';
import { BackendService } from '../../services/backendService';

interface CatalogSettingsTabProps {
  config: AppConfig;
  setConfig: (c: AppConfig) => void;
  handleSaveConfig: () => Promise<void> | void;
}

export const CatalogSettingsTab: React.FC<CatalogSettingsTabProps> = ({
  config,
  setConfig,
  handleSaveConfig,
}) => {
  const [newCat, setNewCat] = useState('');
  const [newBrand, setNewBrand] = useState('');
  const [newModel, setNewModel] = useState('');
  const [newCapacity, setNewCapacity] = useState('');
  const [selectedCat, setSelectedCat] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [alertInfo, setAlertInfo] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Relational catalog state (Source of Truth)
  const [catalogProducts, setCatalogProducts] = useState<CatalogProduct[]>([]);
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingItem, setEditingItem] = useState<CatalogProduct | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newItemData, setNewItemData] = useState<Partial<CatalogProduct>>({
    category: '',
    brand: '',
    model: '',
    specsCapacity: '',
    unitCode: 'NIU',
    taxAffectation: '10',
    suggestedPrice: 0,
  });
  const [isSyncing, setIsSyncing] = useState(false);

  const loadRelationalCatalog = async (forceRefresh = false) => {
    setIsLoadingCatalog(true);
    try {
      const items = await BackendService.getCatalogProducts(undefined, forceRefresh);
      setCatalogProducts(items);
    } catch (err) {
      console.error('Error loading relational catalog products', err);
    } finally {
      setIsLoadingCatalog(false);
    }
  };

  useEffect(() => {
    loadRelationalCatalog(false);
  }, []);

  const filteredRelationalProducts = useMemo(() => {
    if (!searchTerm.trim()) return catalogProducts;
    const term = searchTerm.toLowerCase();
    return catalogProducts.filter(
      (p) =>
        p.code?.toLowerCase().includes(term) ||
        p.brand?.toLowerCase().includes(term) ||
        p.model?.toLowerCase().includes(term) ||
        p.category?.toLowerCase().includes(term) ||
        p.sunatCode?.toLowerCase().includes(term) ||
        p.barcode?.toLowerCase().includes(term)
    );
  }, [catalogProducts, searchTerm]);

  // Derived lists directly from catalogProducts DB table
  const categories = useMemo(
    () => Array.from(new Set(catalogProducts.map((c) => c.category))).filter(Boolean).sort(),
    [catalogProducts]
  );

  const brandsForCat = useMemo(
    () =>
      selectedCat
        ? Array.from(new Set(catalogProducts.filter((c) => c.category === selectedCat).map((c) => c.brand))).filter(Boolean).sort()
        : [],
    [catalogProducts, selectedCat]
  );

  const modelsForBrand = useMemo(
    () =>
      selectedCat && selectedBrand
        ? Array.from(
            new Set(
              catalogProducts
                .filter((c) => c.category === selectedCat && c.brand === selectedBrand)
                .map((c) => c.model)
            )
          )
            .filter(Boolean)
            .sort()
        : [],
    [catalogProducts, selectedCat, selectedBrand]
  );

  const capacitiesForModel = useMemo(
    () =>
      selectedCat && selectedBrand && selectedModel
        ? Array.from(
            new Set(
              catalogProducts
                .filter(
                  (c) =>
                    c.category === selectedCat &&
                    c.brand === selectedBrand &&
                    c.model === selectedModel &&
                    (c.specsCapacity || (c as any).capacity)
                )
                .map((c) => c.specsCapacity || (c as any).capacity as string)
            )
          )
            .filter(Boolean)
            .sort()
        : [],
    [catalogProducts, selectedCat, selectedBrand, selectedModel]
  );

  const handleSyncLegacy = async () => {
    setIsSyncing(true);
    try {
      const res = await BackendService.syncLegacyCatalog();
      setAlertInfo({ message: res.message || 'Catálogo sincronizado en base de datos', type: 'success' });
      await loadRelationalCatalog(true);
    } catch (err: any) {
      setAlertInfo({ message: err?.response?.data?.detail || 'Error al sincronizar catálogo', type: 'error' });
    } finally {
      setIsSyncing(false);
      setTimeout(() => setAlertInfo(null), 3500);
    }
  };

  const handleAddCat = async () => {
    const val = newCat.trim().toUpperCase();
    if (!val) return;
    try {
      await BackendService.createCatalogProduct({
        category: val,
        brand: 'SIN MARCA',
        model: 'GENERICO',
        unit_code: 'NIU',
        tax_affectation: '10',
      });
      setAlertInfo({ message: `Categoría ${val} añadida a la tabla catalog_products`, type: 'success' });
      setNewCat('');
      setSelectedCat(val);
      await loadRelationalCatalog(true);
    } catch (err: any) {
      setAlertInfo({ message: err?.response?.data?.detail || 'Error al agregar categoría', type: 'error' });
    } finally {
      setTimeout(() => setAlertInfo(null), 3000);
    }
  };

  const handleAddBrand = async () => {
    const val = newBrand.trim().toUpperCase();
    if (!val || !selectedCat) return;
    try {
      await BackendService.createCatalogProduct({
        category: selectedCat,
        brand: val,
        model: 'GENERICO',
        unit_code: 'NIU',
        tax_affectation: '10',
      });
      setAlertInfo({ message: `Marca ${val} añadida para ${selectedCat}`, type: 'success' });
      setNewBrand('');
      setSelectedBrand(val);
      await loadRelationalCatalog(true);
    } catch (err: any) {
      setAlertInfo({ message: err?.response?.data?.detail || 'Error al agregar marca', type: 'error' });
    } finally {
      setTimeout(() => setAlertInfo(null), 3000);
    }
  };

  const handleAddModel = async () => {
    const val = newModel.trim().toUpperCase();
    if (!val || !selectedCat || !selectedBrand) return;
    try {
      await BackendService.createCatalogProduct({
        category: selectedCat,
        brand: selectedBrand,
        model: val,
        unit_code: 'NIU',
        tax_affectation: '10',
      });
      setAlertInfo({ message: `Modelo ${val} añadido para ${selectedBrand}`, type: 'success' });
      setNewModel('');
      setSelectedModel(val);
      await loadRelationalCatalog(true);
    } catch (err: any) {
      setAlertInfo({ message: err?.response?.data?.detail || 'Error al agregar modelo', type: 'error' });
    } finally {
      setTimeout(() => setAlertInfo(null), 3000);
    }
  };

  const handleAddCapacity = async () => {
    const val = newCapacity.trim().toUpperCase();
    if (!val || !selectedCat || !selectedBrand || !selectedModel) return;
    try {
      await BackendService.createCatalogProduct({
        category: selectedCat,
        brand: selectedBrand,
        model: selectedModel,
        specs_capacity: val,
        unit_code: 'NIU',
        tax_affectation: '10',
      });
      setAlertInfo({ message: `Capacidad ${val} añadida para ${selectedModel}`, type: 'success' });
      setNewCapacity('');
      await loadRelationalCatalog(true);
    } catch (err: any) {
      setAlertInfo({ message: err?.response?.data?.detail || 'Error al agregar capacidad', type: 'error' });
    } finally {
      setTimeout(() => setAlertInfo(null), 3000);
    }
  };

  const handleRemoveCat = async (cat: string) => {
    if (!window.confirm(`¿Eliminar todos los productos con la categoría ${cat} de catalog_products?`)) return;
    try {
      const itemsToDelete = catalogProducts.filter((c) => c.category === cat);
      for (const item of itemsToDelete) {
        await BackendService.deleteCatalogProduct(item.id);
      }
      setAlertInfo({ message: `Categoría ${cat} eliminada de la base de datos`, type: 'success' });
      if (selectedCat === cat) {
        setSelectedCat('');
        setSelectedBrand('');
        setSelectedModel('');
      }
      await loadRelationalCatalog(true);
    } catch (err: any) {
      setAlertInfo({ message: err?.response?.data?.detail || 'Error al eliminar categoría', type: 'error' });
    } finally {
      setTimeout(() => setAlertInfo(null), 3000);
    }
  };

  const handleRemoveBrand = async (brand: string) => {
    if (!window.confirm(`¿Eliminar la marca ${brand} en ${selectedCat}?`)) return;
    try {
      const itemsToDelete = catalogProducts.filter((c) => c.category === selectedCat && c.brand === brand);
      for (const item of itemsToDelete) {
        await BackendService.deleteCatalogProduct(item.id);
      }
      setAlertInfo({ message: `Marca ${brand} eliminada`, type: 'success' });
      if (selectedBrand === brand) {
        setSelectedBrand('');
        setSelectedModel('');
      }
      await loadRelationalCatalog(true);
    } catch (err: any) {
      setAlertInfo({ message: err?.response?.data?.detail || 'Error al eliminar marca', type: 'error' });
    } finally {
      setTimeout(() => setAlertInfo(null), 3000);
    }
  };

  const handleRemoveModel = async (model: string) => {
    if (!window.confirm(`¿Eliminar el modelo ${model}?`)) return;
    try {
      const itemsToDelete = catalogProducts.filter(
        (c) => c.category === selectedCat && c.brand === selectedBrand && c.model === model
      );
      for (const item of itemsToDelete) {
        await BackendService.deleteCatalogProduct(item.id);
      }
      setAlertInfo({ message: `Modelo ${model} eliminado`, type: 'success' });
      if (selectedModel === model) {
        setSelectedModel('');
      }
      await loadRelationalCatalog(true);
    } catch (err: any) {
      setAlertInfo({ message: err?.response?.data?.detail || 'Error al eliminar modelo', type: 'error' });
    } finally {
      setTimeout(() => setAlertInfo(null), 3000);
    }
  };

  const handleRemoveCapacity = async (capacity: string) => {
    try {
      const itemsToDelete = catalogProducts.filter(
        (c) =>
          c.category === selectedCat &&
          c.brand === selectedBrand &&
          c.model === selectedModel &&
          (c.specsCapacity === capacity || (c as any).capacity === capacity)
      );
      for (const item of itemsToDelete) {
        await BackendService.deleteCatalogProduct(item.id);
      }
      setAlertInfo({ message: `Capacidad ${capacity} eliminada`, type: 'success' });
      await loadRelationalCatalog(true);
    } catch (err: any) {
      setAlertInfo({ message: err?.response?.data?.detail || 'Error al eliminar capacidad', type: 'error' });
    } finally {
      setTimeout(() => setAlertInfo(null), 3000);
    }
  };

  const handleSaveAction = async () => {
    try {
      await handleSaveConfig();
      setAlertInfo({ message: 'Configuración general y catálogo relacional guardados con éxito', type: 'success' });
      setTimeout(() => setAlertInfo(null), 3000);
    } catch {
      setAlertInfo({ message: 'Error al guardar la configuración', type: 'error' });
      setTimeout(() => setAlertInfo(null), 3000);
    }
  };

  const handleCreateNewProduct = async () => {
    if (!newItemData.category || !newItemData.brand || !newItemData.model) {
      setAlertInfo({ message: 'Categoría, Marca y Modelo son obligatorios', type: 'error' });
      setTimeout(() => setAlertInfo(null), 3000);
      return;
    }

    try {
      await BackendService.createCatalogProduct({
        code: newItemData.code?.trim() || undefined,
        sunat_code: newItemData.sunatCode?.trim() || undefined,
        barcode: newItemData.barcode?.trim() || undefined,
        category: newItemData.category.trim().toUpperCase(),
        brand: newItemData.brand.trim().toUpperCase(),
        model: newItemData.model.trim().toUpperCase(),
        specs_capacity: newItemData.specsCapacity?.trim().toUpperCase() || undefined,
        unit_code: newItemData.unitCode || 'NIU',
        tax_affectation: newItemData.taxAffectation || '10',
        suggested_price: newItemData.suggestedPrice || 0,
      });
      setAlertInfo({ message: 'Producto registrado en catalog_products con éxito', type: 'success' });
      setIsCreatingNew(false);
      setNewItemData({
        category: '',
        brand: '',
        model: '',
        specsCapacity: '',
        unitCode: 'NIU',
        taxAffectation: '10',
        suggestedPrice: 0,
      });
      await loadRelationalCatalog(true);
    } catch (err: any) {
      setAlertInfo({ message: err?.response?.data?.detail || 'Error al crear producto en catálogo', type: 'error' });
    } finally {
      setTimeout(() => setAlertInfo(null), 3500);
    }
  };

  const handleSaveEditItem = async () => {
    if (!editingItem) return;
    try {
      await BackendService.updateCatalogProduct(editingItem.id, {
        code: editingItem.code,
        sunat_code: editingItem.sunatCode,
        barcode: editingItem.barcode,
        category: editingItem.category,
        brand: editingItem.brand,
        model: editingItem.model,
        specs_capacity: editingItem.specsCapacity,
        unit_code: editingItem.unitCode,
        tax_affectation: editingItem.taxAffectation,
        suggested_price: editingItem.suggestedPrice,
      });
      setAlertInfo({ message: `Producto ${editingItem.code} actualizado correctamente en catalog_products`, type: 'success' });
      setEditingItem(null);
      await loadRelationalCatalog(true);
    } catch (err: any) {
      setAlertInfo({ message: err?.response?.data?.detail || 'Error al actualizar el producto', type: 'error' });
    } finally {
      setTimeout(() => setAlertInfo(null), 3500);
    }
  };

  const handleDeleteRelationalProduct = async (id: number, code: string) => {
    if (!window.confirm(`¿Seguro que deseas eliminar el producto ${code} de catalog_products?`)) return;
    try {
      await BackendService.deleteCatalogProduct(id);
      setAlertInfo({ message: `Producto ${code} eliminado de catalog_products`, type: 'success' });
      await loadRelationalCatalog(true);
    } catch (err: any) {
      setAlertInfo({ message: err?.response?.data?.detail || 'Error al eliminar producto', type: 'error' });
    } finally {
      setTimeout(() => setAlertInfo(null), 3500);
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-8 animate-fade-in relative">
      {alertInfo && (
        <div className="fixed top-6 right-6 z-[200] animate-in slide-in-from-right-8 fade-in duration-300">
          <div className="bg-slate-900 rounded-xl shadow-2xl flex items-center gap-3 p-4 pr-12 text-white border border-slate-700">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center ${alertInfo.type === 'success' ? 'bg-emerald-500' : 'bg-red-500'}`}>
              {alertInfo.type === 'success' ? <CheckCircle className="w-4 h-4 text-slate-900" /> : <X className="w-4 h-4 text-slate-900" />}
            </div>
            <p className="font-medium text-sm">{alertInfo.message}</p>
          </div>
        </div>
      )}

      {/* HEADER */}
      <div className="flex justify-between items-center border-b pb-4">
        <div>
          <h3 className="text-base font-extrabold text-slate-900 uppercase tracking-tight flex items-center gap-2">
            <ListPlus className="w-5 h-5 text-emerald-600" /> Catálogo Relacional de Productos (`catalog_products`)
          </h3>
          <p className="text-xs text-slate-500 font-medium">Los cambios se guardan directamente en la tabla relacional de la base de datos</p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" size="sm" onClick={() => setIsCreatingNew(true)} leftIcon={<Plus className="w-4 h-4" />}>
            Nuevo Producto
          </Button>
          <Button variant="secondary" size="sm" onClick={handleSyncLegacy} isLoading={isSyncing} leftIcon={<RefreshCw className="w-4 h-4" />}>
            Sincronizar Legacy
          </Button>
          <Button variant="primary" size="sm" onClick={handleSaveAction} leftIcon={<Save className="w-4 h-4" />}>
            Guardar Configuración
          </Button>
        </div>
      </div>

      {/* 4-COLUMN QUICK SELECTOR BUILDER */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* 1. CATEGORÍAS */}
        <Card padding="sm" className="space-y-4">
          <h4 className="text-xs font-black text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
            <Tag className="w-3.5 h-3.5 text-blue-500" /> 1. Categorías
          </h4>
          <div className="flex gap-2">
            <Input
              placeholder="Nueva Categoría"
              value={newCat}
              onChange={(e) => setNewCat(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddCat()}
              inputSize="sm"
            />
            <Button variant="secondary" size="sm" onClick={handleAddCat}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
            {categories.map((cat) => (
              <div
                key={cat}
                onClick={() => { setSelectedCat(cat); setSelectedBrand(''); setSelectedModel(''); }}
                className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer text-xs font-bold transition-all ${
                  selectedCat === cat
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <span className="truncate">{cat}</span>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); handleRemoveCat(cat); }}
                  className="text-slate-400 hover:text-red-500 p-1 rounded transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </Card>

        {/* 2. MARCAS */}
        <Card padding="sm" className="space-y-4">
          <h4 className="text-xs font-black text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
            <Tag className="w-3.5 h-3.5 text-purple-500" /> 2. Marcas
          </h4>
          <div className="flex gap-2">
            <Input
              placeholder={selectedCat ? `Marca para ${selectedCat}` : 'Seleccione Categoría'}
              value={newBrand}
              onChange={(e) => setNewBrand(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddBrand()}
              disabled={!selectedCat}
              inputSize="sm"
            />
            <Button variant="secondary" size="sm" onClick={handleAddBrand} disabled={!selectedCat}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
            {brandsForCat.map((b) => (
              <div
                key={b}
                onClick={() => { setSelectedBrand(b); setSelectedModel(''); }}
                className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer text-xs font-bold transition-all ${
                  selectedBrand === b
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <span className="truncate">{b}</span>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); handleRemoveBrand(b); }}
                  className="text-slate-400 hover:text-red-500 p-1 rounded transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </Card>

        {/* 3. MODELOS */}
        <Card padding="sm" className="space-y-4">
          <h4 className="text-xs font-black text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
            <Tag className="w-3.5 h-3.5 text-emerald-500" /> 3. Modelos
          </h4>
          <div className="flex gap-2">
            <Input
              placeholder={selectedBrand ? `Modelo para ${selectedBrand}` : 'Seleccione Marca'}
              value={newModel}
              onChange={(e) => setNewModel(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddModel()}
              disabled={!selectedBrand}
              inputSize="sm"
            />
            <Button variant="secondary" size="sm" onClick={handleAddModel} disabled={!selectedBrand}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
            {modelsForBrand.map((m) => (
              <div
                key={m}
                onClick={() => setSelectedModel(m)}
                className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer text-xs font-bold transition-all ${
                  selectedModel === m
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <span className="truncate">{m}</span>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); handleRemoveModel(m); }}
                  className="text-slate-400 hover:text-red-500 p-1 rounded transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </Card>

        {/* 4. CAPACIDADES */}
        <Card padding="sm" className="space-y-4">
          <h4 className="text-xs font-black text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
            <Tag className="w-3.5 h-3.5 text-amber-500" /> 4. Capacidades
          </h4>
          <div className="flex gap-2">
            <Input
              placeholder={selectedModel ? `Capacidad para ${selectedModel}` : 'Seleccione Modelo'}
              value={newCapacity}
              onChange={(e) => setNewCapacity(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddCapacity()}
              disabled={!selectedModel}
              inputSize="sm"
            />
            <Button variant="secondary" size="sm" onClick={handleAddCapacity} disabled={!selectedModel}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
            {capacitiesForModel.map((cap) => (
              <div
                key={cap}
                className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 text-slate-700 text-xs font-bold"
              >
                <span className="truncate">{cap}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveCapacity(cap)}
                  className="text-slate-400 hover:text-red-500 p-1 rounded transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* RELATIONAL CATALOG TABLE SECTION */}
      <Card padding="md" className="space-y-4 border border-slate-200">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b pb-3">
          <div>
            <h4 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Database className="w-4 h-4 text-indigo-600" /> Tabla Relacional de Productos (`catalog_products`) — Total: {catalogProducts.length}
            </h4>
            <p className="text-xs text-slate-500">Cada producto almacenado en MySQL con su Código SKU, Código SUNAT, Unidad y Precio</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                placeholder="Buscar por código, marca..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 text-xs"
                inputSize="sm"
              />
            </div>
            <Button variant="secondary" size="sm" onClick={() => loadRelationalCatalog(true)} isLoading={isLoadingCatalog}>
              <RefreshCw className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900 text-white uppercase tracking-wider font-extrabold text-[10px]">
              <tr>
                <th className="p-3">Código (SKU)</th>
                <th className="p-3">Código SUNAT</th>
                <th className="p-3">Categoría</th>
                <th className="p-3">Marca / Modelo</th>
                <th className="p-3">Especificación / Capacidad</th>
                <th className="p-3 text-center">Unidad</th>
                <th className="p-3 text-right">Precio Sugerido</th>
                <th className="p-3 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredRelationalProducts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400 text-xs">
                    {isLoadingCatalog ? 'Cargando productos de catálogo...' : 'No se encontraron productos en el catálogo relacional.'}
                  </td>
                </tr>
              ) : (
                filteredRelationalProducts.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3 font-mono font-bold text-slate-900">
                      <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-200">{item.code}</span>
                    </td>
                    <td className="p-3 font-mono text-slate-600">
                      {item.sunatCode ? (
                        <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-200 font-semibold">{item.sunatCode}</span>
                      ) : (
                        <span className="text-slate-400 font-mono text-[10px]">—</span>
                      )}
                    </td>
                    <td className="p-3 font-bold text-slate-700">{item.category}</td>
                    <td className="p-3">
                      <div className="font-bold text-slate-900">{item.brand}</div>
                      <div className="text-[11px] text-slate-500 font-medium">{item.model}</div>
                    </td>
                    <td className="p-3 text-slate-600 font-medium">{item.specsCapacity || (item as any).capacity || '—'}</td>
                    <td className="p-3 text-center">
                      <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded font-mono font-bold">{item.unitCode || 'NIU'}</span>
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-slate-900">
                      S/ {(item.suggestedPrice || 0).toFixed(2)}
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => setEditingItem(item)}
                          className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded transition-colors"
                          title="Editar Código / SUNAT"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteRelationalProduct(item.id, item.code)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-slate-100 rounded transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* CREATE NEW PRODUCT MODAL */}
      {isCreatingNew && (
        <div className="fixed inset-0 z-[300] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Plus className="w-4 h-4 text-emerald-600" /> Crear Nuevo Producto en `catalog_products`
              </h3>
              <button onClick={() => setIsCreatingNew(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Código SKU / Interno (Opcional)</label>
                <Input
                  placeholder="Auto-generado si está vacío"
                  value={newItemData.code || ''}
                  onChange={(e) => setNewItemData({ ...newItemData, code: e.target.value })}
                  inputSize="sm"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Código SUNAT (UNSPSC)</label>
                <Input
                  placeholder="ej. 43211503"
                  value={newItemData.sunatCode || ''}
                  onChange={(e) => setNewItemData({ ...newItemData, sunatCode: e.target.value })}
                  inputSize="sm"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Categoría *</label>
                <Input
                  placeholder="ej. LAPTOP"
                  value={newItemData.category || ''}
                  onChange={(e) => setNewItemData({ ...newItemData, category: e.target.value })}
                  inputSize="sm"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Marca *</label>
                <Input
                  placeholder="ej. LENOVO"
                  value={newItemData.brand || ''}
                  onChange={(e) => setNewItemData({ ...newItemData, brand: e.target.value })}
                  inputSize="sm"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Modelo *</label>
                <Input
                  placeholder="ej. IDEAPAD SLIM 3"
                  value={newItemData.model || ''}
                  onChange={(e) => setNewItemData({ ...newItemData, model: e.target.value })}
                  inputSize="sm"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Capacidad / Especificación</label>
                <Input
                  placeholder="ej. 512GB 8RAM"
                  value={newItemData.specsCapacity || ''}
                  onChange={(e) => setNewItemData({ ...newItemData, specsCapacity: e.target.value })}
                  inputSize="sm"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Unidad Medida SUNAT</label>
                <select
                  value={newItemData.unitCode || 'NIU'}
                  onChange={(e) => setNewItemData({ ...newItemData, unitCode: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium focus:ring-2 focus:ring-slate-900 outline-none"
                >
                  <option value="NIU">NIU - Unidad (Bienes)</option>
                  <option value="ZZ">ZZ - Servicio</option>
                  <option value="KG">KG - Kilogramo</option>
                  <option value="MTR">MTR - Metro</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Precio Venta Sugerido (S/)</label>
                <Input
                  type="number"
                  step="0.01"
                  value={newItemData.suggestedPrice || 0}
                  onChange={(e) => setNewItemData({ ...newItemData, suggestedPrice: parseFloat(e.target.value) || 0 })}
                  inputSize="sm"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t pt-4">
              <Button variant="secondary" size="sm" onClick={() => setIsCreatingNew(false)}>
                Cancelar
              </Button>
              <Button variant="primary" size="sm" onClick={handleCreateNewProduct} leftIcon={<Check className="w-4 h-4" />}>
                Crear Producto
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {editingItem && (
        <div className="fixed inset-0 z-[300] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Barcode className="w-4 h-4 text-indigo-600" /> Editar Producto en `catalog_products`: {editingItem.code}
              </h3>
              <button onClick={() => setEditingItem(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Código SKU / Interno</label>
                <Input
                  value={editingItem.code}
                  onChange={(e) => setEditingItem({ ...editingItem, code: e.target.value })}
                  inputSize="sm"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Código SUNAT (UNSPSC)</label>
                <Input
                  placeholder="ej. 43211503"
                  value={editingItem.sunatCode || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, sunatCode: e.target.value })}
                  inputSize="sm"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Categoría</label>
                <Input
                  value={editingItem.category}
                  onChange={(e) => setEditingItem({ ...editingItem, category: e.target.value })}
                  inputSize="sm"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Marca</label>
                <Input
                  value={editingItem.brand}
                  onChange={(e) => setEditingItem({ ...editingItem, brand: e.target.value })}
                  inputSize="sm"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Modelo</label>
                <Input
                  value={editingItem.model}
                  onChange={(e) => setEditingItem({ ...editingItem, model: e.target.value })}
                  inputSize="sm"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Capacidad / Especificación</label>
                <Input
                  value={editingItem.specsCapacity || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, specsCapacity: e.target.value })}
                  inputSize="sm"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Unidad Medida SUNAT</label>
                <select
                  value={editingItem.unitCode || 'NIU'}
                  onChange={(e) => setEditingItem({ ...editingItem, unitCode: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium focus:ring-2 focus:ring-slate-900 outline-none"
                >
                  <option value="NIU">NIU - Unidad (Bienes)</option>
                  <option value="ZZ">ZZ - Servicio</option>
                  <option value="KG">KG - Kilogramo</option>
                  <option value="MTR">MTR - Metro</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Precio Venta Sugerido (S/)</label>
                <Input
                  type="number"
                  step="0.01"
                  value={editingItem.suggestedPrice || 0}
                  onChange={(e) => setEditingItem({ ...editingItem, suggestedPrice: parseFloat(e.target.value) || 0 })}
                  inputSize="sm"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t pt-4">
              <Button variant="secondary" size="sm" onClick={() => setEditingItem(null)}>
                Cancelar
              </Button>
              <Button variant="primary" size="sm" onClick={handleSaveEditItem} leftIcon={<Check className="w-4 h-4" />}>
                Guardar Cambios
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
