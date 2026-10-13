import React, { useState, useEffect, useMemo } from 'react';
import { AppState, VendorItem, ExpenseCategory } from '../types';
import {
  X,
  Settings,
  Users,
  CircleDollarSign,
  Building2,
  Tag,
  BarChart3,
  Plus,
  Trash2,
  Edit2,
  Search,
  Check,
  RefreshCw,
  Phone,
  FileText,
  Wallet,
  Landmark,
  TrendingUp,
  AlertCircle,
} from 'lucide-react';
import { DEFAULT_EXPENSE_CATEGORIES, DEFAULT_VENDORS } from '../services/storage';
import {
  fetchCloudExpensesAnalytics,
  fetchCloudCatalogs,
  syncCatalogsToCloud,
  ExpenseAnalyticsData,
} from '../services/supabaseSync';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  state: AppState;
  onUpdateExchangeRate: (rate: number) => void;
  onAddAdmin: (name: string) => void;
  onRemoveAdmin: (name: string) => void;
  onUpdateExpenseCategories?: (categories: string[]) => void;
  onUpdateVendors?: (vendors: VendorItem[]) => void;
  initialTab?: 'admins' | 'exchange' | 'catalogs';
}

export const SettingsModal: React.FC<Props> = ({
  isOpen,
  onClose,
  state,
  onUpdateExchangeRate,
  onAddAdmin,
  onRemoveAdmin,
  onUpdateExpenseCategories,
  onUpdateVendors,
  initialTab = 'admins',
}) => {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState<'admins' | 'exchange' | 'catalogs'>(initialTab);
  const [catalogSubTab, setCatalogSubTab] = useState<'vendors' | 'categories'>('vendors');

  // Administradores y Tasa
  const [rateInput, setRateInput] = useState(state.defaultExchangeRate.toString());
  const [newAdminInput, setNewAdminInput] = useState('');

  // Categorías
  const currentCategories = useMemo(
    () => state.expenseCategories || DEFAULT_EXPENSE_CATEGORIES,
    [state.expenseCategories]
  );
  const [newCategoryInput, setNewCategoryInput] = useState('');
  const [editingCategoryKey, setEditingCategoryKey] = useState<string | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState('');

  // Proveedores
  const currentVendors = useMemo<VendorItem[]>(
    () => state.vendorsList || DEFAULT_VENDORS,
    [state.vendorsList]
  );
  const [vendorSearch, setVendorSearch] = useState('');
  const [vendorModalOpen, setVendorModalOpen] = useState(false);
  const [editingVendorId, setEditingVendorId] = useState<string | null>(null);
  const [vendorFormName, setVendorFormName] = useState('');
  const [vendorFormCategory, setVendorFormCategory] = useState<string>('OTROS');
  const [vendorFormPhone, setVendorFormPhone] = useState('');
  const [vendorFormNotes, setVendorFormNotes] = useState('');
  const [isSavingCatalog, setIsSavingCatalog] = useState(false);

  // Estadísticas de catálogo desde Supabase
  const [analyticsData, setAnalyticsData] = useState<ExpenseAnalyticsData | null>(null);

  // Cargar estadísticas de gastos desde Supabase cuando se activa la pestaña de Catálogos
  useEffect(() => {
    if (activeTab === 'catalogs') {
      loadAnalytics();
    }
  }, [activeTab]);

  const loadAnalytics = async () => {
    try {
      const data = await fetchCloudExpensesAnalytics('ALL');
      setAnalyticsData(data);
    } catch (err) {
      console.warn('Error cargando análisis de gastos para catálogo:', err);
    }
  };

  // Helper para mapa de gastos por proveedor
  const vendorSpendMap = useMemo(() => {
    const map = new Map<string, number>();
    if (analyticsData?.byVendor) {
      analyticsData.byVendor.forEach((v) => {
        map.set(v.vendor.toLowerCase().trim(), v.total);
      });
    }
    return map;
  }, [analyticsData]);

  // Helper para mapa de gastos por categoría
  const categorySpendMap = useMemo(() => {
    const map = new Map<string, { total: number; count: number }>();
    if (analyticsData?.byCategory) {
      analyticsData.byCategory.forEach((c) => {
        map.set(c.category, { total: c.total, count: c.count });
      });
    }
    return map;
  }, [analyticsData]);

  // Manejo de Tasa de Cambio
  const handleSaveRate = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseFloat(rateInput);
    if (!isNaN(parsed) && parsed > 0) {
      onUpdateExchangeRate(parsed);
      alert(`Tasa de cambio predeterminada actualizada a C$ ${parsed.toFixed(2)}.`);
    }
  };

  // Manejo de Administradores
  const handleAddAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newAdminInput.trim();
    if (clean && !state.availableAdmins.includes(clean)) {
      onAddAdmin(clean);
      setNewAdminInput('');
    }
  };

  // --- CRUD CATEGORÍAS ---
  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newCategoryInput.trim().toUpperCase().replace(/\s+/g, '_');
    if (!clean) return;
    if (currentCategories.includes(clean)) {
      alert('Esta categoría ya existe en el catálogo.');
      return;
    }
    const updated = [...currentCategories, clean];
    onUpdateExpenseCategories?.(updated);
    setNewCategoryInput('');
    setIsSavingCatalog(true);
    await syncCatalogsToCloud(currentVendors, updated);
    setIsSavingCatalog(false);
  };

  const handleStartEditCategory = (cat: string) => {
    setEditingCategoryKey(cat);
    setEditingCategoryName(cat.replace(/_/g, ' '));
  };

  const handleSaveEditCategory = async (oldCat: string) => {
    const clean = editingCategoryName.trim().toUpperCase().replace(/\s+/g, '_');
    if (!clean || clean === oldCat) {
      setEditingCategoryKey(null);
      return;
    }
    if (currentCategories.includes(clean)) {
      alert('Ya existe una categoría con ese nombre.');
      return;
    }
    const updatedCats = currentCategories.map((c) => (c === oldCat ? clean : c));
    // Actualizar también la categoría en los proveedores que la usen por defecto
    const updatedVendors = currentVendors.map((v) =>
      v.defaultCategory === oldCat ? { ...v, defaultCategory: clean } : v
    );
    onUpdateExpenseCategories?.(updatedCats);
    onUpdateVendors?.(updatedVendors);
    setEditingCategoryKey(null);
    setIsSavingCatalog(true);
    await syncCatalogsToCloud(updatedVendors, updatedCats);
    setIsSavingCatalog(false);
  };

  const handleRemoveCategory = async (catToRemove: string) => {
    if (currentCategories.length <= 1) {
      alert('Debe existir al menos una categoría de gasto en el sistema.');
      return;
    }
    if (confirm(`¿Deseas eliminar la categoría "${catToRemove.replace(/_/g, ' ')}"?`)) {
      const updated = currentCategories.filter((c) => c !== catToRemove);
      onUpdateExpenseCategories?.(updated);
      setIsSavingCatalog(true);
      await syncCatalogsToCloud(currentVendors, updated);
      setIsSavingCatalog(false);
    }
  };

  const handleResetCategories = async () => {
    if (confirm('¿Restablecer las categorías a los valores predeterminados del Bodegón?')) {
      const defaults = [...DEFAULT_EXPENSE_CATEGORIES];
      onUpdateExpenseCategories?.(defaults);
      setIsSavingCatalog(true);
      await syncCatalogsToCloud(currentVendors, defaults);
      setIsSavingCatalog(false);
    }
  };

  // --- CRUD PROVEEDORES ---
  const handleOpenNewVendorModal = () => {
    setEditingVendorId(null);
    setVendorFormName('');
    setVendorFormCategory(currentCategories[0] || 'OTROS');
    setVendorFormPhone('');
    setVendorFormNotes('');
    setVendorModalOpen(true);
  };

  const handleOpenEditVendorModal = (vendor: VendorItem) => {
    setEditingVendorId(vendor.id);
    setVendorFormName(vendor.name);
    setVendorFormCategory(vendor.defaultCategory || 'OTROS');
    setVendorFormPhone(vendor.phone || '');
    setVendorFormNotes(vendor.notes || '');
    setVendorModalOpen(true);
  };

  const handleSaveVendorForm = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = vendorFormName.trim();
    if (!cleanName) return;

    let updatedVendors: VendorItem[] = [];

    if (editingVendorId) {
      // Editar existente
      updatedVendors = currentVendors.map((v) =>
        v.id === editingVendorId
          ? {
              ...v,
              name: cleanName,
              defaultCategory: vendorFormCategory,
              phone: vendorFormPhone.trim() || undefined,
              notes: vendorFormNotes.trim() || undefined,
            }
          : v
      );
    } else {
      // Validar duplicado
      const exists = currentVendors.some(
        (v) => v.name.toLowerCase().trim() === cleanName.toLowerCase()
      );
      if (exists) {
        alert(`Ya existe un proveedor registrado con el nombre "${cleanName}".`);
        return;
      }
      const newVendor: VendorItem = {
        id: `v-${Date.now()}`,
        name: cleanName,
        defaultCategory: vendorFormCategory,
        phone: vendorFormPhone.trim() || undefined,
        notes: vendorFormNotes.trim() || undefined,
        active: true,
        createdAt: new Date().toISOString(),
      };
      updatedVendors = [newVendor, ...currentVendors];
    }

    onUpdateVendors?.(updatedVendors);
    setVendorModalOpen(false);
    setIsSavingCatalog(true);
    await syncCatalogsToCloud(updatedVendors, currentCategories);
    setIsSavingCatalog(false);
  };

  const handleDeleteVendor = async (vendorId: string, vendorName: string) => {
    if (confirm(`¿Estás seguro de que deseas eliminar el proveedor "${vendorName}" del catálogo?`)) {
      const updated = currentVendors.filter((v) => v.id !== vendorId);
      onUpdateVendors?.(updated);
      setIsSavingCatalog(true);
      await syncCatalogsToCloud(updated, currentCategories);
      setIsSavingCatalog(false);
    }
  };

  const filteredVendors = useMemo(() => {
    if (!vendorSearch.trim()) return currentVendors;
    const q = vendorSearch.toLowerCase().trim();
    return currentVendors.filter(
      (v) =>
        v.name.toLowerCase().includes(q) ||
        (v.defaultCategory && v.defaultCategory.toLowerCase().includes(q)) ||
        (v.phone && v.phone.includes(q))
    );
  }, [currentVendors, vendorSearch]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white border border-slate-200 rounded-none w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col my-4 max-h-[92vh]">
        {/* Header Rectangular Corporativo */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-none bg-[#1c6856] text-white flex items-center justify-center shadow-xs">
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Configuración & Catálogos Centralizados
              </h2>
              <span className="text-[11px] text-slate-500 font-mono">
                Base de Datos Supabase • El Bodegón
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-200 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector Principal */}
        <div className="flex border-b border-slate-200 text-xs font-bold bg-slate-100/70 px-4 divide-x divide-slate-200 overflow-x-auto">
          <button
            onClick={() => setActiveTab('admins')}
            className={`py-3 px-4 border-b-2 transition flex items-center gap-2 cursor-pointer uppercase tracking-wider text-[11px] whitespace-nowrap ${
              activeTab === 'admins'
                ? 'border-[#1c6856] text-[#1c6856] bg-white font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-3.5 h-3.5" /> Administradores
          </button>
          <button
            onClick={() => setActiveTab('exchange')}
            className={`py-3 px-4 border-b-2 transition flex items-center gap-2 cursor-pointer uppercase tracking-wider text-[11px] whitespace-nowrap ${
              activeTab === 'exchange'
                ? 'border-[#1c6856] text-[#1c6856] bg-white font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <CircleDollarSign className="w-3.5 h-3.5" /> Tasa de Cambio
          </button>
          <button
            onClick={() => setActiveTab('catalogs')}
            className={`py-3 px-4 border-b-2 transition flex items-center gap-2 cursor-pointer uppercase tracking-wider text-[11px] whitespace-nowrap ${
              activeTab === 'catalogs'
                ? 'border-[#1c6856] text-[#1c6856] bg-white font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" /> Proveedores & Categorías
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-6 flex-1 overflow-y-auto space-y-5 bg-white">
          {/* TAB 1: ADMINS */}
          {activeTab === 'admins' && (
            <div className="space-y-4 max-w-2xl">
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-1">
                  Administradores de Turno (Auditoría Cruzada)
                </h3>
                <p className="text-xs text-slate-500">
                  Personas autorizadas para realizar aperturas, cierres de caja y registro de gastos en el Bodegón.
                </p>
              </div>

              <div className="space-y-2">
                {state.availableAdmins.map((admin) => (
                  <div
                    key={admin}
                    className="flex items-center justify-between p-3 bg-slate-50 rounded-none border border-slate-200"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-none bg-[#1c6856] text-white flex items-center justify-center font-bold text-xs">
                        {admin.charAt(0)}
                      </div>
                      <div>
                        <span className="font-bold text-slate-900 text-xs">{admin}</span>
                        {admin === state.activeAdminName && (
                          <span className="ml-2 text-[10px] font-bold px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-300">
                            Activo Ahora
                          </span>
                        )}
                        {(admin === 'Eddy' || admin === 'Xiomara') && (
                          <span className="ml-2 text-[11px] text-slate-400 font-medium">
                            (Admin Principal)
                          </span>
                        )}
                      </div>
                    </div>

                    {admin !== 'Eddy' && admin !== 'Xiomara' && (
                      <button
                        type="button"
                        onClick={() => onRemoveAdmin(admin)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <form onSubmit={handleAddAdmin} className="flex gap-2 pt-1">
                <input
                  type="text"
                  placeholder="Nombre de nuevo administrador..."
                  value={newAdminInput}
                  onChange={(e) => setNewAdminInput(e.target.value)}
                  className="flex-1 bg-slate-50 border border-slate-300 px-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#1c6856] focus:bg-white transition"
                />
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-4 py-1.5 bg-[#1c6856] hover:bg-[#154f42] text-white text-xs font-bold transition shadow-xs cursor-pointer uppercase tracking-wider"
                >
                  <Plus className="w-4 h-4" />
                  <span>Agregar</span>
                </button>
              </form>
            </div>
          )}

          {/* TAB 2: EXCHANGE RATE */}
          {activeTab === 'exchange' && (
            <div className="space-y-4 max-w-xl">
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-1">
                  Tasa de Cambio Oficial y Predeterminada
                </h3>
                <p className="text-xs text-slate-500">
                  Esta tasa se usará automáticamente en todas las aperturas y cierres de turno para convertir billetes de dólares a córdobas.
                </p>
              </div>

              <form onSubmit={handleSaveRate} className="p-4 bg-slate-50 border border-slate-200 space-y-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Tasa Oficial (C$ por 1 US$)
                  </label>
                  <div className="flex items-center gap-2 max-w-xs">
                    <span className="text-slate-400 font-mono font-bold text-sm">C$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="1"
                      value={rateInput}
                      onChange={(e) => setRateInput(e.target.value)}
                      className="w-full bg-white border border-slate-300 p-2 text-xl font-mono font-bold text-slate-900 focus:outline-none focus:border-[#1c6856] transition"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="flex items-center gap-2 px-4 py-2 bg-[#1c6856] hover:bg-[#154f42] text-white font-bold text-xs transition cursor-pointer uppercase tracking-wider"
                >
                  <Check className="w-4 h-4" />
                  <span>Guardar Nueva Tasa</span>
                </button>
              </form>
            </div>
          )}

          {/* TAB 3: PROVEEDORES & CATEGORÍAS */}
          {activeTab === 'catalogs' && (
            <div className="space-y-4">
              {/* Selector interno de Catálogos */}
              <div className="flex items-center justify-between border-b border-slate-200 pb-3 flex-wrap gap-2">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setCatalogSubTab('vendors')}
                    className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition cursor-pointer ${
                      catalogSubTab === 'vendors'
                        ? 'bg-[#1c6856] text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Proveedores Oficiales ({currentVendors.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setCatalogSubTab('categories')}
                    className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition cursor-pointer ${
                      catalogSubTab === 'categories'
                        ? 'bg-[#1c6856] text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Categorías de Gastos ({currentCategories.length})
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  {isSavingCatalog && (
                    <span className="text-[11px] text-[#1c6856] flex items-center gap-1 font-bold animate-pulse">
                      <RefreshCw className="w-3 h-3 animate-spin" /> Guardando en Supabase...
                    </span>
                  )}
                  {catalogSubTab === 'vendors' && (
                    <button
                      type="button"
                      onClick={handleOpenNewVendorModal}
                      className="flex items-center gap-1 px-3 py-1.5 bg-[#1c6856] hover:bg-[#154f42] text-white text-xs font-bold uppercase tracking-wider transition cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Agregar Proveedor</span>
                    </button>
                  )}
                </div>
              </div>

              {/* SUBTAB PROVEEDORES */}
              {catalogSubTab === 'vendors' && (
                <div className="space-y-3">
                  {/* Buscador */}
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Buscar por nombre, rubro o teléfono..."
                      value={vendorSearch}
                      onChange={(e) => setVendorSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 focus:outline-none focus:border-[#1c6856]"
                    />
                  </div>

                  {/* Tabla de Proveedores */}
                  <div className="border border-slate-200 overflow-hidden max-h-[50vh] overflow-y-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-100 text-slate-700 uppercase font-bold text-[10px] tracking-wider sticky top-0 border-b border-slate-200 z-10">
                        <tr>
                          <th className="py-2.5 px-3">Proveedor</th>
                          <th className="py-2.5 px-3">Rubro Predeterminado</th>
                          <th className="py-2.5 px-3">Contacto / Teléfono</th>
                          <th className="py-2.5 px-3 text-right">Gasto Histórico (Supabase)</th>
                          <th className="py-2.5 px-3 text-center">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-800 font-medium">
                        {filteredVendors.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="py-8 text-center text-slate-400">
                              No se encontraron proveedores que coincidan con la búsqueda.
                            </td>
                          </tr>
                        ) : (
                          filteredVendors.map((v) => {
                            const spent = vendorSpendMap.get(v.name.toLowerCase().trim()) || 0;
                            return (
                              <tr key={v.id} className="hover:bg-slate-50 transition">
                                <td className="py-2.5 px-3 font-bold text-slate-900">
                                  {v.name}
                                </td>
                                <td className="py-2.5 px-3">
                                  <span className="px-2 py-0.5 text-[10px] font-bold bg-slate-100 border border-slate-300 text-slate-700 uppercase">
                                    {(v.defaultCategory || 'OTROS').replace(/_/g, ' ')}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 text-slate-600 font-mono text-[11px]">
                                  {v.phone || <span className="text-slate-300 font-sans italic">Sin teléfono</span>}
                                </td>
                                <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                                  {spent > 0 ? `C$ ${spent.toFixed(2)}` : <span className="text-slate-400 font-normal">C$ 0.00</span>}
                                </td>
                                <td className="py-2.5 px-3 text-center">
                                  <div className="flex items-center justify-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() => handleOpenEditVendorModal(v)}
                                      title="Editar proveedor"
                                      className="p-1 text-slate-500 hover:text-[#1c6856] hover:bg-slate-100 transition cursor-pointer"
                                    >
                                      <Edit2 className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteVendor(v.id, v.name)}
                                      title="Eliminar proveedor"
                                      className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* SUBTAB CATEGORÍAS */}
              {catalogSubTab === 'categories' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <p className="text-xs text-slate-500">
                      Define los rubros contables oficiales para clasificar las compras y salidas de caja.
                    </p>
                    <button
                      type="button"
                      onClick={handleResetCategories}
                      className="px-2.5 py-1 text-xs font-semibold text-slate-600 hover:text-slate-900 border border-slate-300 hover:bg-slate-50 transition cursor-pointer"
                    >
                      Restablecer Predeterminadas
                    </button>
                  </div>

                  {/* Formulario Agregar Categoría */}
                  <form onSubmit={handleAddCategory} className="flex gap-2 p-3 bg-slate-50 border border-slate-200">
                    <input
                      type="text"
                      placeholder="Nueva categoría (ej: MANTENIMIENTO, EMPAQUES, PAPELERIA)..."
                      value={newCategoryInput}
                      onChange={(e) => setNewCategoryInput(e.target.value)}
                      className="flex-1 bg-white border border-slate-300 px-3 py-1.5 text-xs font-bold uppercase placeholder:normal-case placeholder:font-normal focus:outline-none focus:border-[#1c6856]"
                    />
                    <button
                      type="submit"
                      className="flex items-center gap-1.5 px-4 py-1.5 bg-[#1c6856] hover:bg-[#154f42] text-white text-xs font-bold transition shadow-xs cursor-pointer uppercase tracking-wider"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Agregar Categoría</span>
                    </button>
                  </form>

                  {/* Tabla / Grid de Categorías */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[50vh] overflow-y-auto p-1">
                    {currentCategories.map((cat) => {
                      const stat = categorySpendMap.get(cat);
                      const isEditing = editingCategoryKey === cat;

                      return (
                        <div
                          key={cat}
                          className="flex items-center justify-between p-3 border border-slate-200 bg-white hover:border-slate-300 transition text-xs font-semibold"
                        >
                          {isEditing ? (
                            <div className="flex items-center gap-2 flex-1 mr-2">
                              <input
                                type="text"
                                value={editingCategoryName}
                                onChange={(e) => setEditingCategoryName(e.target.value)}
                                className="flex-1 px-2 py-1 border border-[#1c6856] text-xs uppercase font-bold focus:outline-none"
                                autoFocus
                              />
                              <button
                                type="button"
                                onClick={() => handleSaveEditCategory(cat)}
                                className="p-1 bg-[#1c6856] text-white hover:bg-[#154f42]"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingCategoryKey(null)}
                                className="p-1 bg-slate-200 text-slate-600 hover:bg-slate-300"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2.5">
                              <span className="w-2.5 h-2.5 bg-[#1c6856]"></span>
                              <div>
                                <span className="text-slate-900 block font-bold">
                                  {cat.replace(/_/g, ' ')}
                                </span>
                                {stat && stat.total > 0 && (
                                  <span className="text-[10px] text-slate-500 font-mono">
                                    C$ {stat.total.toFixed(2)} ({stat.count} gastos)
                                  </span>
                                )}
                              </div>
                            </div>
                          )}

                          {!isEditing && (
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleStartEditCategory(cat)}
                                title="Editar nombre de categoría"
                                className="p-1 text-slate-400 hover:text-[#1c6856] hover:bg-slate-100 transition cursor-pointer"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              {currentCategories.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveCategory(cat)}
                                  title={`Eliminar categoría ${cat}`}
                                  className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Rectangular */}
        <div className="flex justify-between items-center px-6 py-3 border-t border-slate-200 bg-slate-50">
          <span className="text-[11px] text-slate-500">
            {isSavingCatalog ? (
              <span className="text-[#1c6856] font-bold flex items-center gap-1">
                <RefreshCw className="w-3 h-3 animate-spin" /> Sincronizando con Supabase...
              </span>
            ) : (
              'Datos sincronizados bidireccionalmente con Supabase'
            )}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-1.5 text-xs font-bold bg-slate-800 hover:bg-slate-900 text-white transition cursor-pointer uppercase tracking-wider"
          >
            Listo
          </button>
        </div>
      </div>

      {/* Modal / Formulario Flotante para Agregar o Editar Proveedor */}
      {vendorModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-2xs animate-in fade-in duration-100">
          <div className="bg-white border border-slate-300 rounded-none w-full max-w-md shadow-2xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[#1c6856]" />
                {editingVendorId ? 'Editar Proveedor' : 'Registrar Nuevo Proveedor'}
              </h3>
              <button
                type="button"
                onClick={() => setVendorModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveVendorForm} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Nombre del Proveedor *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Distribuidora Sol, CARNIC, Hielo Olito..."
                  value={vendorFormName}
                  onChange={(e) => setVendorFormName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 font-semibold focus:outline-none focus:border-[#1c6856]"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Rubro / Categoría Predeterminada *
                </label>
                <select
                  value={vendorFormCategory}
                  onChange={(e) => setVendorFormCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 font-semibold bg-white focus:outline-none focus:border-[#1c6856]"
                >
                  {currentCategories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat.replace(/_/g, ' ')}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-500 mt-1">
                  Al registrar una compra a este proveedor, el sistema autoseleccionará este rubro.
                </p>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Teléfono / WhatsApp (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ej: 8888-1234"
                  value={vendorFormPhone}
                  onChange={(e) => setVendorFormPhone(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 font-mono focus:outline-none focus:border-[#1c6856]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Notas / Observaciones (Opcional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Dirección, condiciones de pago, contacto o notas adicionales..."
                  value={vendorFormNotes}
                  onChange={(e) => setVendorFormNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 focus:outline-none focus:border-[#1c6856]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setVendorModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 font-bold hover:bg-slate-50 transition cursor-pointer uppercase tracking-wider"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#1c6856] hover:bg-[#154f42] text-white font-bold transition shadow-xs cursor-pointer uppercase tracking-wider"
                >
                  {editingVendorId ? 'Guardar Cambios' : 'Registrar Proveedor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
