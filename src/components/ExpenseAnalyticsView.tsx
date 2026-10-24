import React, { useState, useEffect, useMemo } from 'react';
import { AppState, VendorItem, PettyCashTransaction } from '../types';
import {
  BarChart3,
  TrendingUp,
  Wallet,
  Landmark,
  RefreshCw,
  Tag,
  Building2,
  Plus,
  Edit2,
  Trash2,
  Check,
  X,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Search,
  ArrowRight,
  Calendar,
  ChevronDown,
  ChevronUp,
  Receipt,
} from 'lucide-react';
import {
  ExpenseAnalyticsData,
  fetchCloudExpensesAnalytics,
  fetchCloudExpensesList,
  renameCloudExpenseCategory,
  deleteCloudExpenseCategory,
  reassignExpenseCategory,
  syncCatalogsToCloud,
} from '../services/supabaseSync';
import { DEFAULT_EXPENSE_CATEGORIES } from '../services/storage';

interface Props {
  state: AppState;
  onUpdateExpenseCategories: (categories: string[]) => void;
  onUpdateVendors: (vendors: VendorItem[]) => void;
  onUpdateTransactions?: (updater: (prev: PettyCashTransaction[]) => PettyCashTransaction[]) => void;
}

export const ExpenseAnalyticsView: React.FC<Props> = ({
  state,
  onUpdateExpenseCategories,
  onUpdateVendors,
  onUpdateTransactions,
}) => {
  const [dateFilter, setDateFilter] = useState<'ALL' | 'MONTH' | 'WEEK'>('ALL');
  const [analyticsData, setAnalyticsData] = useState<ExpenseAnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [expensesList, setExpensesList] = useState<any[]>([]);
  const [isLoadingExpenses, setIsLoadingExpenses] = useState(false);

  // Filtros de tabla de detalle
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Gestión de categorías
  const [editingCategoryKey, setEditingCategoryKey] = useState<string | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState('');
  const [isSavingCategory, setIsSavingCategory] = useState(false);

  // Modal para eliminar categoría
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);
  const [fallbackCategory, setFallbackCategory] = useState<string>('OTROS');

  // Nueva categoría
  const [newCategoryName, setNewCategoryName] = useState('');
  const [showAddCategoryForm, setShowAddCategoryForm] = useState(false);

  // Paginación / Expansión de Rankings
  const [showAllVendors, setShowAllVendors] = useState(false);
  const [showAllCategories, setShowAllCategories] = useState(false);

  // Feedback de reclasificación
  const [reclassifyingId, setReclassifyingId] = useState<number | null>(null);
  const [reclassifiedSuccessId, setReclassifiedSuccessId] = useState<number | null>(null);

  const currentCategories = useMemo(() => {
    return state.expenseCategories && state.expenseCategories.length > 0
      ? state.expenseCategories
      : DEFAULT_EXPENSE_CATEGORIES;
  }, [state.expenseCategories]);

  const currentVendors = useMemo(() => {
    return state.vendorsList || [];
  }, [state.vendorsList]);

  // Búsqueda en Rankings
  const [vendorSearchTerm, setVendorSearchTerm] = useState('');
  const [categorySearchTerm, setCategorySearchTerm] = useState('');

  // Gráfica de Tendencia Diaria (Evolución de compras por día)
  const dailySpendData = useMemo(() => {
    const dayMap = new Map<string, { total: number; count: number }>();
    expensesList.forEach((exp) => {
      const isFunding =
        exp.categoria === 'FONDEO' ||
        (exp.proveedor || '').toLowerCase().includes('caja general') ||
        (exp.observaciones || '').includes('OPENING_TRANSFER');
      if (isFunding) return;
      const dayStr = (exp.fecha_hora || '').slice(0, 10);
      if (!dayStr) return;
      const current = dayMap.get(dayStr) || { total: 0, count: 0 };
      dayMap.set(dayStr, {
        total: current.total + (Number(exp.monto) || 0),
        count: current.count + 1,
      });
    });

    return Array.from(dayMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-14)
      .map(([date, data]) => ({
        date,
        dayLabel: new Date(date + 'T12:00:00').toLocaleDateString('es-NI', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
        }),
        total: data.total,
        count: data.count,
      }));
  }, [expensesList]);

  const maxDailySpend = useMemo(() => {
    return Math.max(...dailySpendData.map((d) => d.total), 1);
  }, [dailySpendData]);

  // Ticket promedio de compra
  const averageTicket = useMemo(() => {
    if (!analyticsData || analyticsData.totalTransactionsCount === 0) return 0;
    return analyticsData.totalAmount / analyticsData.totalTransactionsCount;
  }, [analyticsData]);

  // Listas filtradas y paginadas de Categorías
  const filteredCategories = useMemo(() => {
    let list = analyticsData?.byCategory || [];
    if (categorySearchTerm.trim()) {
      const q = categorySearchTerm.toLowerCase();
      list = list.filter((c) => c.label.toLowerCase().includes(q) || c.category.toLowerCase().includes(q));
    }
    return list;
  }, [analyticsData?.byCategory, categorySearchTerm]);

  const displayedCategories = useMemo(() => {
    return showAllCategories ? filteredCategories : filteredCategories.slice(0, 15);
  }, [filteredCategories, showAllCategories]);

  // Listas filtradas y paginadas de Proveedores
  const filteredVendors = useMemo(() => {
    let list = analyticsData?.byVendor || [];
    if (vendorSearchTerm.trim()) {
      const q = vendorSearchTerm.toLowerCase();
      list = list.filter((v) => v.vendor.toLowerCase().includes(q) || v.mainCategory.toLowerCase().includes(q));
    }
    return list;
  }, [analyticsData?.byVendor, vendorSearchTerm]);

  const displayedVendors = useMemo(() => {
    return showAllVendors ? filteredVendors : filteredVendors.slice(0, 15);
  }, [filteredVendors, showAllVendors]);

  // Carga de datos
  const loadData = async () => {
    setIsLoading(true);
    setIsLoadingExpenses(true);
    setLoadFailed(false);
    try {
      // El servicio devuelve ceros cuando falla la red; sin internet se avisa en vez de mostrar "sin egresos".
      if (typeof navigator !== 'undefined' && navigator.onLine === false) throw new Error('Sin conexión a internet');
      const [analytics, rawList] = await Promise.all([
        fetchCloudExpensesAnalytics(dateFilter),
        fetchCloudExpensesList(dateFilter),
      ]);
      setAnalyticsData(analytics);
      setExpensesList(rawList);
    } catch (err) {
      console.warn('Error cargando análisis de gastos:', err);
      setLoadFailed(true);
    } finally {
      setIsLoading(false);
      setIsLoadingExpenses(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [dateFilter]);

  // --- CRUD CATEGORÍAS ---
  const handleStartEdit = (catKey: string) => {
    setEditingCategoryKey(catKey);
    setEditingCategoryName(catKey.replace(/_/g, ' '));
  };

  const handleSaveEdit = async (oldCat: string) => {
    const clean = editingCategoryName.trim().toUpperCase().replace(/\s+/g, '_');
    if (!clean || clean === oldCat) {
      setEditingCategoryKey(null);
      return;
    }

    if (currentCategories.includes(clean)) {
      alert(`Ya existe una categoría llamada "${clean}".`);
      return;
    }

    setIsSavingCategory(true);
    const updatedCats = currentCategories.map((c) => (c === oldCat ? clean : c));
    const updatedVendors = currentVendors.map((v: VendorItem) =>
      v.defaultCategory === oldCat ? { ...v, defaultCategory: clean } : v
    );

    // 1. Guardar en Supabase (migra compras_gastos y SYSTEM_CATALOGS)
    const ok = await renameCloudExpenseCategory(oldCat, clean, updatedVendors, updatedCats);
    if (ok) {
      onUpdateExpenseCategories(updatedCats);
      onUpdateVendors(updatedVendors);
      if (onUpdateTransactions) {
        onUpdateTransactions((prev) =>
          prev.map((t) => (t.category === oldCat ? { ...t, category: clean as any } : t))
        );
      }
      setEditingCategoryKey(null);
      await loadData();
    } else {
      alert('Hubo un error al actualizar la categoría en la nube.');
    }
    setIsSavingCategory(false);
  };

  const handleConfirmDelete = async () => {
    if (!categoryToDelete) return;
    if (currentCategories.length <= 1) {
      alert('Debe existir al menos una categoría en el sistema.');
      setCategoryToDelete(null);
      return;
    }

    setIsSavingCategory(true);
    const updatedCats = currentCategories.filter((c) => c !== categoryToDelete);
    const updatedVendors = currentVendors.map((v: VendorItem) =>
      v.defaultCategory === categoryToDelete ? { ...v, defaultCategory: fallbackCategory } : v
    );

    const ok = await deleteCloudExpenseCategory(categoryToDelete, fallbackCategory, updatedVendors, updatedCats);
    if (ok) {
      onUpdateExpenseCategories(updatedCats);
      onUpdateVendors(updatedVendors);
      if (onUpdateTransactions) {
        onUpdateTransactions((prev) =>
          prev.map((t) => (t.category === categoryToDelete ? { ...t, category: fallbackCategory as any } : t))
        );
      }
      setCategoryToDelete(null);
      if (selectedCategoryFilter === categoryToDelete) {
        setSelectedCategoryFilter('ALL');
      }
      await loadData();
    } else {
      alert('Hubo un error al eliminar la categoría en la nube.');
    }
    setIsSavingCategory(false);
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newCategoryName.trim().toUpperCase().replace(/\s+/g, '_');
    if (!clean) return;

    if (currentCategories.includes(clean)) {
      alert(`La categoría "${clean}" ya existe.`);
      return;
    }

    setIsSavingCategory(true);
    const updatedCats = [...currentCategories, clean];
    onUpdateExpenseCategories(updatedCats);
    await syncCatalogsToCloud(currentVendors, updatedCats);
    setNewCategoryName('');
    setShowAddCategoryForm(false);
    setIsSavingCategory(false);
    await loadData();
  };

  // Reclasificación individual de un gasto
  const handleReassignExpense = async (expenseId: number, targetCat: string) => {
    setReclassifyingId(expenseId);
    const ok = await reassignExpenseCategory(expenseId, targetCat);
    if (ok) {
      setExpensesList((prev) =>
        prev.map((exp) => (exp.id === expenseId ? { ...exp, categoria: targetCat } : exp))
      );
      setReclassifiedSuccessId(expenseId);
      setTimeout(() => setReclassifiedSuccessId(null), 2500);

      // Actualizar localmente si existe en memoria
      if (onUpdateTransactions) {
        onUpdateTransactions((prev) =>
          prev.map((t) => (t.cloudId === expenseId ? { ...t, category: targetCat as any } : t))
        );
      }

      // Refrescar KPIs
      fetchCloudExpensesAnalytics(dateFilter).then((data) => setAnalyticsData(data));
    } else {
      alert('No se pudo reasignar el gasto en la nube.');
    }
    setReclassifyingId(null);
  };

  // Filtrado de gastos para la tabla de auditoría
  const filteredExpenses = useMemo(() => {
    return expensesList.filter((exp) => {
      if (selectedCategoryFilter !== 'ALL') {
        const cat = (exp.categoria || 'OTROS').toUpperCase().trim();
        if (cat !== selectedCategoryFilter) return false;
      }
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const prov = (exp.proveedor || '').toLowerCase();
        const conc = (exp.concepto || '').toLowerCase();
        if (!prov.includes(query) && !conc.includes(query)) return false;
      }
      return true;
    });
  }, [expensesList, selectedCategoryFilter, searchQuery]);

  return (
    <div className="space-y-6">
      {/* ─── Encabezado Principal ────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-lg bg-bodegon/5 text-bodegon border border-bodegon/20">
              <BarChart3 className="w-5 h-5" />
            </span>
            <div>
              <h1 className="text-lg font-bold text-stone-900 tracking-tight">
                Análisis de Gastos & Inteligencia Financiera
              </h1>
              <p className="text-xs text-stone-500">
                Auditoría en vivo de <code className="font-mono text-bodegon font-bold">compras_gastos</code> en Supabase. Limpieza, edición de rubros y control de egresos.
              </p>
            </div>
          </div>
        </div>

        {/* Controles de periodo y recarga */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex border border-stone-300 rounded-lg overflow-hidden bg-stone-50 text-xs font-bold shadow-2xs">
            <button
              type="button"
              onClick={() => setDateFilter('ALL')}
              className={`px-3 py-1.5 transition cursor-pointer ${
                dateFilter === 'ALL'
                  ? 'bg-bodegon text-white shadow-inner'
                  : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900'
              }`}
            >
              Historial Completo
            </button>
            <button
              type="button"
              onClick={() => setDateFilter('MONTH')}
              className={`px-3 py-1.5 transition cursor-pointer border-l border-stone-200 ${
                dateFilter === 'MONTH'
                  ? 'bg-bodegon text-white shadow-inner'
                  : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900'
              }`}
            >
              Este Mes
            </button>
            <button
              type="button"
              onClick={() => setDateFilter('WEEK')}
              className={`px-3 py-1.5 transition cursor-pointer border-l border-stone-200 ${
                dateFilter === 'WEEK'
                  ? 'bg-bodegon text-white shadow-inner'
                  : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900'
              }`}
            >
              Últimos 7 Días
            </button>
          </div>

          <button
            type="button"
            onClick={loadData}
            disabled={isLoading}
            className="p-2 rounded-lg border border-stone-300 bg-white hover:bg-stone-50 text-stone-700 transition cursor-pointer shadow-2xs flex items-center gap-1.5 text-xs font-bold"
            title="Recargar análisis desde Supabase"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-bodegon' : 'text-stone-600'}`} />
            <span className="hidden sm:inline">Actualizar</span>
          </button>
        </div>
      </div>

      {/* ─── Tarjetas KPI Superiores ────────────────────────────────────── */}
      {isLoading ? (
        <div className="space-y-6" aria-busy="true" aria-label="Cargando estadísticas desde la nube">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="bd-shimmer h-24 rounded-xl" />
            ))}
          </div>
          <div className="bd-shimmer h-72 rounded-xl" />
        </div>
      ) : loadFailed ? (
        <div className="p-12 text-center bg-white rounded-xl border border-stone-200 text-stone-600 text-sm space-y-3">
          <p>No se pudo conectar con la nube. Revisa el internet y vuelve a intentar.</p>
          <button
            onClick={loadData}
            className="px-4 py-2 rounded-lg bg-bodegon hover:bg-bodegon-noche text-white text-xs font-semibold transition cursor-pointer"
          >
            Reintentar
          </button>
        </div>
      ) : !analyticsData || analyticsData.totalAmount === 0 ? (
        <div className="p-12 text-center bg-white rounded-xl border border-stone-200 text-stone-400 text-xs">
          No se encontraron egresos operativos registrados en el periodo seleccionado.
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* KPI 1: Gasto Total */}
            <div className="p-4 bg-white rounded-xl border border-stone-200 shadow-2xs space-y-1">
              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">
                Gasto Total Acumulado
              </span>
              <span className="text-2xl font-mono font-extrabold text-stone-900 block">
                C$ {analyticsData.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-[11px] text-stone-500 font-medium">
                {analyticsData.totalTransactionsCount} transacciones operativas
              </span>
            </div>

            {/* KPI 2: Efectivo */}
            <div className="p-4 bg-bodegon/2 rounded-xl border border-bodegon/16 shadow-2xs space-y-1">
              <span className="text-[10px] font-bold text-bodegon uppercase tracking-wider flex items-center gap-1.5">
                <Wallet className="w-3.5 h-3.5 text-bodegon" />
                <span>Efectivo (Caja Chica)</span>
              </span>
              <span className="text-2xl font-mono font-extrabold text-bodegon-noche block">
                C$ {analyticsData.cashAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-[11px] font-bold text-bodegon">
                {analyticsData.cashPercent.toFixed(1)}% del gasto total
              </span>
            </div>

            {/* KPI 3: Transferencias */}
            <div className="p-4 bg-blue-50/40 rounded-xl border border-blue-200/80 shadow-2xs space-y-1">
              <span className="text-[10px] font-bold text-blue-800 uppercase tracking-wider flex items-center gap-1.5">
                <Landmark className="w-3.5 h-3.5 text-blue-600" />
                <span>Transferencias / Bancos</span>
              </span>
              <span className="text-2xl font-mono font-extrabold text-blue-950 block">
                C$ {analyticsData.transferAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-[11px] font-bold text-blue-700">
                {analyticsData.transferPercent.toFixed(1)}% del gasto total
              </span>
            </div>

            {/* KPI 4: Ticket Promedio */}
            <div className="p-4 bg-purple-50/40 rounded-xl border border-purple-200/80 shadow-2xs space-y-1">
              <span className="text-[10px] font-bold text-purple-800 uppercase tracking-wider flex items-center gap-1.5">
                <Receipt className="w-3.5 h-3.5 text-purple-600" />
                <span>Ticket Promedio / Compra</span>
              </span>
              <span className="text-2xl font-mono font-extrabold text-purple-950 block">
                C$ {averageTicket.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-[11px] font-bold text-purple-700">
                Gasto medio por transacción
              </span>
            </div>

            {/* KPI 5: Rubro Principal */}
            <div className="p-4 bg-dorado/4 rounded-xl border border-dorado/32 shadow-2xs space-y-1">
              <span className="text-[10px] font-bold text-dorado-tinta uppercase tracking-wider flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-dorado-tinta" />
                <span>Rubro Principal #1</span>
              </span>
              <span className="text-lg font-bold text-cafe block truncate">
                {analyticsData.byCategory[0]?.label || 'Sin Categoría'}
              </span>
              <span className="text-[11px] font-mono font-bold text-dorado-tinta block">
                C$ {(analyticsData.byCategory[0]?.total || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} ({analyticsData.byCategory[0]?.percent.toFixed(1)}%)
              </span>
            </div>
          </div>

          {/* Barra Comparativa Efectivo vs Transferencia */}
          <div className="bg-white rounded-xl border border-stone-200 p-4 shadow-2xs space-y-2">
            <div className="flex justify-between items-center text-xs font-bold">
              <span className="text-bodegon flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-bodegon"></span>
                Efectivo Gaveta: C$ {analyticsData.cashAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })} ({analyticsData.cashPercent.toFixed(1)}%)
              </span>
              <span className="text-blue-800 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
                Transferencia Banco: C$ {analyticsData.transferAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })} ({analyticsData.transferPercent.toFixed(1)}%)
              </span>
            </div>
            <div className="w-full h-3 rounded-full bg-stone-100 flex overflow-hidden border border-stone-200">
              <div
                style={{ width: `${analyticsData.cashPercent}%` }}
                className="bg-bodegon h-full transition-all duration-300"
              ></div>
              <div
                style={{ width: `${analyticsData.transferPercent}%` }}
                className="bg-blue-600 h-full transition-all duration-300"
              ></div>
            </div>
          </div>

          {/* ─── Gráfica de Tendencia Diaria de Gastos (Histograma Real de Flujo) ─── */}
          {dailySpendData.length > 0 && (
            <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-2xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-stone-100">
                <div>
                  <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-bodegon" />
                    <span>Tendencia Diaria de Egresos • Curva de Salidas de Dinero</span>
                  </h3>
                  <p className="text-[11px] text-stone-500">
                    Historial cronológico de compras por día para detectar picos atípicos y controlar la liquidez.
                  </p>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-stone-500 font-medium">
                    Promedio diario: <strong className="text-stone-900 font-mono">C$ {(dailySpendData.reduce((acc, d) => acc + d.total, 0) / dailySpendData.length).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-dorado/10 text-dorado-tinta text-[10px] font-bold border border-dorado/40">
                    <span className="w-1.5 h-1.5 rounded-full bg-dorado-tinta"></span> Pico de gasto
                  </span>
                </div>
              </div>

              {/* Contenedor interactivo de barras */}
              <div className="pt-6 pb-2">
                <div className="grid grid-flow-col auto-cols-fr gap-2 sm:gap-3 items-end h-44 border-b border-stone-200 px-2">
                  {dailySpendData.map((d) => {
                    const heightPercent = Math.max(Math.round((d.total / maxDailySpend) * 100), 6);
                    const isPeak = d.total === maxDailySpend;

                    return (
                      <div key={d.date} className="flex flex-col items-center h-full justify-end group relative">
                        {/* Tooltip flotante al pasar el cursor */}
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-14 z-20 bg-stone-900 text-white text-[10px] py-1.5 px-2.5 rounded-lg shadow-xl pointer-events-none whitespace-nowrap text-center">
                          <p className="font-bold">{d.date}</p>
                          <p className="font-mono text-bodegon font-bold">C$ {d.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                          <p className="text-[9px] text-stone-300">{d.count} compras registradas</p>
                        </div>

                        {/* Monto abreviado encima de la barra */}
                        <span className={`text-[9px] font-mono font-bold mb-1 truncate max-w-full hidden sm:block ${isPeak ? 'text-dorado-tinta font-extrabold' : 'text-stone-500'}`}>
                          C${d.total >= 1000 ? (d.total / 1000).toFixed(1) + 'k' : d.total.toFixed(0)}
                        </span>

                        {/* Barra vertical interactiva */}
                        <div className="w-full max-w-[42px] bg-stone-100 rounded-t-md overflow-hidden flex items-end h-full">
                          <div
                            style={{ height: `${heightPercent}%` }}
                            className={`w-full rounded-t-md transition-all duration-500 ${
                              isPeak
                                ? 'bg-dorado-tinta hover:bg-dorado-tinta'
                                : 'bg-bodegon hover:bg-bodegon-noche'
                            }`}
                          ></div>
                        </div>

                        {/* Etiqueta de fecha */}
                        <span className="text-[10px] font-medium text-stone-600 mt-2 truncate max-w-full text-center">
                          {d.dayLabel}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ─── Sección de Dos Columnas: Categorías vs Top Proveedores ─────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Columna Izquierda: Gestión de Categorías / Rubros */}
            <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-2xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-stone-100 flex-wrap gap-2">
                <div>
                  <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                    <Tag className="w-4 h-4 text-bodegon" />
                    <span>Distribución & Gestión de Categorías</span>
                  </h3>
                  <p className="text-[11px] text-stone-500">
                    Puedes editar nombres o eliminar rubros que no correspondan.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {analyticsData.byCategory.length > 8 && (
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400" />
                      <input
                        type="text"
                        placeholder="Buscar rubro..."
                        value={categorySearchTerm}
                        onChange={(e) => setCategorySearchTerm(e.target.value)}
                        className="pl-8 pr-2.5 py-1 bg-stone-50 border border-stone-300 rounded-lg text-xs font-medium text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-bodegon w-32 sm:w-36"
                      />
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => setShowAddCategoryForm((prev) => !prev)}
                    className="px-2.5 py-1 rounded-lg bg-bodegon/5 text-bodegon hover:bg-bodegon/10 border border-bodegon/35 text-xs font-bold flex items-center gap-1 transition cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Nueva Categoría</span>
                  </button>
                </div>
              </div>

              {/* Formulario para agregar nueva categoría */}
              {showAddCategoryForm && (
                <form onSubmit={handleAddCategory} className="p-3 bg-stone-50 rounded-lg border border-stone-200 space-y-2">
                  <span className="text-[11px] font-bold text-stone-700 block">Nombre del Nuevo Rubro:</span>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Ej: VERDURAS, LACTEOS, EMPAQUES..."
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      className="flex-1 bg-white border border-stone-300 rounded-lg px-2.5 py-1.5 text-xs font-bold uppercase focus:outline-none focus:border-bodegon"
                      autoFocus
                    />
                    <button
                      type="submit"
                      disabled={isSavingCategory}
                      className="px-3 py-1.5 rounded-lg bg-bodegon text-white text-xs font-bold hover:bg-bodegon-noche cursor-pointer disabled:opacity-50"
                    >
                      {isSavingCategory ? 'Guardando...' : 'Crear'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAddCategoryForm(false)}
                      className="px-2.5 py-1.5 rounded-lg bg-stone-200 text-stone-600 text-xs font-bold hover:bg-stone-300 cursor-pointer"
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              )}

              {/* Lista de Categorías con barras y acciones */}
              <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                {displayedCategories.map((cat, idx) => {
                  const isEditing = editingCategoryKey === cat.category;
                  const isFilterActive = selectedCategoryFilter === cat.category;

                  return (
                    <div
                      key={cat.category}
                      className={`p-3 rounded-xl border transition ${
                        isFilterActive
                          ? 'border-bodegon bg-bodegon/2 shadow-2xs'
                          : 'border-stone-200 bg-stone-50/40 hover:bg-stone-50'
                      }`}
                    >
                      {isEditing ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={editingCategoryName}
                            onChange={(e) => setEditingCategoryName(e.target.value)}
                            className="flex-1 px-2.5 py-1.5 bg-white border border-bodegon rounded-lg text-xs font-bold uppercase text-stone-900 focus:outline-none"
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveEdit(cat.category)}
                            disabled={isSavingCategory}
                            title="Guardar nuevo nombre (actualiza historial en Supabase)"
                            className="p-1.5 rounded-lg bg-bodegon text-white hover:bg-bodegon-noche cursor-pointer"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingCategoryKey(null)}
                            title="Cancelar"
                            className="p-1.5 rounded-lg bg-stone-200 text-stone-600 hover:bg-stone-300 cursor-pointer"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-mono font-bold text-stone-400">
                                #{idx + 1}
                              </span>
                              <span className="font-bold text-stone-900 text-xs">
                                {cat.label}
                              </span>
                              <span className="text-[10px] text-stone-400 font-mono">
                                ({cat.count} {cat.count === 1 ? 'gasto' : 'gastos'})
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-stone-900 text-xs">
                                C$ {cat.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                              <span className="text-[10px] font-mono font-bold text-stone-500">
                                ({cat.percent.toFixed(1)}%)
                              </span>

                              {/* Acciones: Editar y Eliminar */}
                              <div className="flex items-center gap-1 ml-2">
                                <button
                                  type="button"
                                  onClick={() => handleStartEdit(cat.category)}
                                  title="Renombrar categoría y actualizar todos los gastos"
                                  className="p-1 rounded text-stone-400 hover:text-bodegon hover:bg-white border border-transparent hover:border-stone-200 transition cursor-pointer"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setCategoryToDelete(cat.category);
                                    setFallbackCategory(currentCategories.find((c) => c !== cat.category) || 'OTROS');
                                  }}
                                  title="Eliminar categoría y reasignar sus gastos"
                                  className="p-1 rounded text-stone-400 hover:text-barro hover:bg-white border border-transparent hover:border-stone-200 transition cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setSelectedCategoryFilter(isFilterActive ? 'ALL' : cat.category)}
                                  title={isFilterActive ? 'Quitar filtro' : 'Ver detalle de compras'}
                                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold border transition cursor-pointer ${
                                    isFilterActive
                                      ? 'bg-bodegon text-white border-bodegon'
                                      : 'bg-white text-stone-600 border-stone-300 hover:border-stone-400'
                                  }`}
                                >
                                  {isFilterActive ? 'Filtrado' : 'Ver'}
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Barra de progreso */}
                          <div className="w-full h-2 rounded-full bg-stone-200 overflow-hidden">
                            <div
                              style={{ width: `${Math.min(cat.percent, 100)}%` }}
                              className="h-full bg-bodegon rounded-full transition-all duration-300"
                            ></div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                {filteredCategories.length === 0 && (
                  <div className="py-8 text-center text-xs text-stone-400">
                    No se encontraron rubros que coincidan con la búsqueda.
                  </div>
                )}

                {filteredCategories.length > 15 && (
                  <button
                    type="button"
                    onClick={() => setShowAllCategories((p) => !p)}
                    className="w-full py-2.5 rounded-xl border border-bodegon/35 bg-bodegon/3 hover:bg-bodegon/7 text-bodegon text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs mt-2"
                  >
                    {showAllCategories ? (
                      <>
                        <ChevronUp className="w-4 h-4" />
                        <span>Mostrar solo el Top 15</span>
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-4 h-4" />
                        <span>Ver todas las categorías ({filteredCategories.length} rubros)</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* Columna Derecha: Ranking Top Proveedores */}
            <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-2xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-stone-100 flex-wrap gap-2">
                <div>
                  <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-blue-700" />
                    <span>Ranking Top Proveedores</span>
                  </h3>
                  <p className="text-[11px] text-stone-500">
                    Proveedores con mayor volumen de compra en el periodo.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400" />
                    <input
                      type="text"
                      placeholder="Buscar proveedor..."
                      value={vendorSearchTerm}
                      onChange={(e) => setVendorSearchTerm(e.target.value)}
                      className="pl-8 pr-3 py-1 bg-stone-50 border border-stone-300 rounded-lg text-xs font-medium text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-blue-700 w-36 sm:w-44"
                    />
                  </div>
                  <span className="text-xs font-mono font-bold text-stone-500 whitespace-nowrap">
                    {filteredVendors.length} prov.
                  </span>
                </div>
              </div>

              <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                {displayedVendors.map((ven, idx) => (
                  <div key={ven.vendor} className="p-3 bg-stone-50/50 rounded-xl border border-stone-200 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 truncate max-w-[65%]">
                        <span className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded ${
                          idx === 0 ? 'bg-dorado/20 text-cafe' :
                          idx === 1 ? 'bg-stone-200 text-stone-800' :
                          idx === 2 ? 'bg-dorado/10 text-dorado-tinta border border-dorado/40' :
                          'text-stone-400'
                        }`}>
                          #{idx + 1}
                        </span>
                        <span className="font-bold text-stone-900 truncate">
                          {ven.vendor}
                        </span>
                        <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-stone-100 text-stone-600 font-bold shrink-0">
                          {ven.mainCategory.replace(/_/g, ' ')}
                        </span>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="font-mono font-bold text-stone-900">
                          C$ {ven.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                        <span className="text-[10px] font-mono font-bold text-stone-500 ml-1.5">
                          ({ven.percent.toFixed(1)}%)
                        </span>
                      </div>
                    </div>

                    <div className="w-full h-1.5 rounded-full bg-stone-200 overflow-hidden">
                      <div
                        style={{ width: `${Math.min(ven.percent, 100)}%` }}
                        className="h-full bg-blue-700 rounded-full transition-all duration-300"
                      ></div>
                    </div>
                  </div>
                ))}

                {displayedVendors.length === 0 && (
                  <div className="py-8 text-center text-xs text-stone-400">
                    No se encontraron proveedores que coincidan con la búsqueda.
                  </div>
                )}

                {filteredVendors.length > 15 && (
                  <button
                    type="button"
                    onClick={() => setShowAllVendors((p) => !p)}
                    className="w-full py-2.5 rounded-xl border border-blue-300 bg-blue-50/60 hover:bg-blue-100/70 text-blue-800 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs mt-2"
                  >
                    {showAllVendors ? (
                      <>
                        <ChevronUp className="w-4 h-4" />
                        <span>Mostrar solo el Top 15</span>
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-4 h-4" />
                        <span>Ver todos los proveedores ({filteredVendors.length} proveedores)</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* ─── Sección Inferior: Auditoría de Compras & Reclasificación ── */}
          <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-100">
              <div>
                <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                  <Filter className="w-4 h-4 text-bodegon" />
                  <span>Auditoría de Compras & Reclasificación de Rubros</span>
                </h3>
                <p className="text-[11px] text-stone-500">
                  Si un gasto tiene un rubro incorrecto, cámbialo en el selector y se actualizará al instante en Supabase.
                </p>
              </div>

              {/* Filtros rápidos */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-2" />
                  <input
                    type="text"
                    placeholder="Buscar proveedor o concepto..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 pr-3 py-1.5 bg-stone-50 border border-stone-300 rounded-lg text-xs font-medium focus:outline-none focus:border-bodegon w-56"
                  />
                </div>

                <select
                  value={selectedCategoryFilter}
                  onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                  className="px-2.5 py-1.5 bg-stone-50 border border-stone-300 rounded-lg text-xs font-bold text-stone-800 focus:outline-none focus:border-bodegon"
                >
                  <option value="ALL">Todos los Rubros ({expensesList.length})</option>
                  {currentCategories.map((c) => (
                    <option key={c} value={c}>
                      {c.replace(/_/g, ' ')}
                    </option>
                  ))}
                </select>

                {selectedCategoryFilter !== 'ALL' && (
                  <button
                    type="button"
                    onClick={() => setSelectedCategoryFilter('ALL')}
                    className="text-xs text-bodegon hover:underline font-bold"
                  >
                    Limpiar
                  </button>
                )}
              </div>
            </div>

            {/* Tabla de Compras */}
            {isLoadingExpenses ? (
              <div className="py-8 text-center text-stone-400 text-xs">
                Cargando listado de gastos...
              </div>
            ) : filteredExpenses.length === 0 ? (
              <div className="py-8 text-center text-stone-400 text-xs">
                No hay compras que coincidan con los filtros aplicados.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-stone-200 text-stone-400 text-[10px] uppercase font-bold tracking-wider">
                      <th className="py-2 px-3">Fecha / Hora</th>
                      <th className="py-2 px-3">Proveedor</th>
                      <th className="py-2 px-3">Concepto / Detalle</th>
                      <th className="py-2 px-3">Método</th>
                      <th className="py-2 px-3 text-right">Monto</th>
                      <th className="py-2 px-3 text-center">Categoría Asignada (Cambiar en vivo)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {filteredExpenses.map((exp) => {
                      const isSaving = reclassifyingId === exp.id;
                      const isSuccess = reclassifiedSuccessId === exp.id;
                      const currentCat = (exp.categoria || 'OTROS').toUpperCase().trim();

                      return (
                        <tr key={exp.id} className="hover:bg-stone-50/80 transition">
                          <td className="py-2.5 px-3 font-mono text-stone-500 whitespace-nowrap">
                            {exp.fecha_hora ? exp.fecha_hora.slice(0, 16).replace('T', ' ') : '—'}
                          </td>
                          <td className="py-2.5 px-3 font-bold text-stone-900 whitespace-nowrap">
                            {exp.proveedor || 'Sin Proveedor'}
                          </td>
                          <td className="py-2.5 px-3 text-stone-600 max-w-xs truncate" title={exp.concepto}>
                            {exp.concepto || '—'}
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              exp.metodo_pago === 'TRANSFERENCIA'
                                ? 'bg-blue-50 text-blue-800 border border-blue-200'
                                : exp.metodo_pago === 'TARJETA'
                                ? 'bg-purple-50 text-purple-800 border border-purple-200'
                                : 'bg-bodegon/5 text-bodegon border border-bodegon/20'
                            }`}>
                              {exp.metodo_pago === 'TRANSFERENCIA' ? 'Banco' : exp.metodo_pago === 'TARJETA' ? 'Tarjeta' : 'Efectivo'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-stone-900 whitespace-nowrap">
                            C$ {Number(exp.monto || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="py-2.5 px-3 text-center whitespace-nowrap">
                            <div className="inline-flex items-center gap-1.5">
                              <select
                                value={currentCat}
                                disabled={isSaving}
                                onChange={(e) => handleReassignExpense(exp.id, e.target.value)}
                                className={`text-[11px] font-bold px-2 py-1 rounded-lg border focus:outline-none transition cursor-pointer ${
                                  isSuccess
                                    ? 'border-bodegon bg-bodegon/5 text-bodegon-noche'
                                    : 'border-stone-300 bg-white text-stone-800 hover:border-bodegon'
                                }`}
                              >
                                {currentCategories.map((c) => (
                                  <option key={c} value={c}>
                                    {c.replace(/_/g, ' ')}
                                  </option>
                                ))}
                              </select>
                              {isSaving && <RefreshCw className="w-3.5 h-3.5 animate-spin text-bodegon" />}
                              {isSuccess && <CheckCircle2 className="w-3.5 h-3.5 text-bodegon" />}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── Modal Confirmar Eliminación de Categoría ───────────────────── */}
      {categoryToDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-stone-200 space-y-4">
            <div className="flex items-center gap-3 text-barro pb-2 border-b border-stone-100">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="font-bold text-base text-stone-900">
                Eliminar Categoría: {categoryToDelete.replace(/_/g, ' ')}
              </h3>
            </div>

            <p className="text-xs text-stone-600 leading-relaxed">
              ¿Estás seguro de que deseas eliminar este rubro? Para no perder los registros contables históricos, selecciona a qué categoría deseas reasignar todas las compras asociadas:
            </p>

            <div className="space-y-1.5 bg-stone-50 p-3 rounded-lg border border-stone-200">
              <label className="text-[11px] font-bold text-stone-700 block">
                Reasignar compras históricas a:
              </label>
              <select
                value={fallbackCategory}
                onChange={(e) => setFallbackCategory(e.target.value)}
                className="w-full bg-white border border-stone-300 rounded-lg p-2 text-xs font-bold text-stone-900 focus:outline-none focus:border-bodegon"
              >
                {currentCategories
                  .filter((c) => c !== categoryToDelete)
                  .map((c) => (
                    <option key={c} value={c}>
                      {c.replace(/_/g, ' ')}
                    </option>
                  ))}
              </select>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCategoryToDelete(null)}
                className="px-4 py-2 rounded-lg bg-stone-100 text-stone-700 hover:bg-stone-200 text-xs font-bold transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isSavingCategory}
                className="px-4 py-2 rounded-lg bg-barro text-white hover:bg-barro text-xs font-bold transition cursor-pointer disabled:opacity-50"
              >
                {isSavingCategory ? 'Eliminando...' : 'Confirmar Eliminación'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
