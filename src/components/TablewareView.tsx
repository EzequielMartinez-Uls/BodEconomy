import React, { useState } from 'react';
import { AppState, TablewareItem, TablewareLoss } from '../types';
import { printThermalTablewareReport } from '../services/thermalPrint';
import { exportTablewareToExcel } from '../services/excelExport';
import { getLocalTodayStr } from '../utils/dateUtils';
import {
  UtensilsCrossed,
  AlertTriangle,
  PlusCircle,
  TrendingDown,
  Wine,
  Utensils,
  History,
  X,
  CheckCircle2,
  Calendar,
  Printer,
  FileSpreadsheet,
} from 'lucide-react';

interface Props {
  state: AppState;
  onUpdateStock: (itemId: string, newStock: number) => void;
  onAddLoss: (loss: TablewareLoss) => void;
  onAddItem: (item: TablewareItem) => void;
}

export const TablewareView: React.FC<Props> = ({
  state,
  onUpdateStock,
  onAddLoss,
  onAddItem,
}) => {
  const [activeArea, setActiveArea] = useState<'TODOS' | 'BARRA' | 'SALON' | 'COCINA'>('TODOS');
  const [lossModalOpen, setLossModalOpen] = useState(false);
  const [newModalOpen, setNewModalOpen] = useState(false);
  const [stockAdjustModalItem, setStockAdjustModalItem] = useState<TablewareItem | null>(null);

  // Form Loss State
  const [selectedItemId, setSelectedItemId] = useState(state.tablewareItems[0]?.id || '');
  const [lossQuantity, setLossQuantity] = useState(1);
  const [lossReason, setLossReason] = useState<TablewareLoss['reason']>('ROTURA_SALON');
  const [lossNotes, setLossNotes] = useState('');

  // Form New Item State
  const [newName, setNewName] = useState('');
  const [newArea, setNewArea] = useState<'BARRA' | 'SALON' | 'COCINA'>('BARRA');
  const [newStock, setNewStock] = useState(24);
  const [newMinStock, setNewMinStock] = useState(12);
  const [newUnitCost, setNewUnitCost] = useState(50);

  // Form Stock Adjust State
  const [adjustedStock, setAdjustedStock] = useState(0);

  // Totales
  const totalItemsCount = state.tablewareItems.reduce((acc, it) => acc + it.currentStock, 0);
  const totalInventoryValue = state.tablewareItems.reduce(
    (acc, it) => acc + it.currentStock * it.unitCostNIO,
    0
  );
  const totalLossesValue = state.tablewareLosses.reduce((acc, l) => acc + l.totalCostNIO, 0);
  const lowStockCount = state.tablewareItems.filter((it) => it.currentStock <= it.minimumStock).length;

  const filteredItems = state.tablewareItems.filter(
    (it) => activeArea === 'TODOS' || it.area === activeArea
  );

  const handleRegisterLoss = (e: React.FormEvent) => {
    e.preventDefault();
    const item = state.tablewareItems.find((i) => i.id === selectedItemId);
    if (!item || lossQuantity <= 0) return;

    const totalCost = lossQuantity * item.unitCostNIO;

    const newLoss: TablewareLoss = {
      id: `loss-${Date.now()}`,
      itemId: item.id,
      itemName: item.name,
      date: new Date().toISOString(),
      quantity: lossQuantity,
      reason: lossReason,
      registeredBy: state.activeAdminName,
      totalCostNIO: totalCost,
      notes: lossNotes.trim() || undefined,
    };

    onAddLoss(newLoss);
    setLossModalOpen(false);
    setLossQuantity(1);
    setLossNotes('');
  };

  const handleAddNewItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const newItem: TablewareItem = {
      id: `tw-${Date.now()}`,
      name: newName.trim(),
      area: newArea,
      unit: 'Und',
      currentStock: newStock,
      minimumStock: newMinStock,
      unitCostNIO: newUnitCost,
      lastAuditDate: getLocalTodayStr(),
    };

    onAddItem(newItem);
    setNewModalOpen(false);
    setNewName('');
  };

  const handleSaveStockAdjust = () => {
    if (!stockAdjustModalItem) return;
    onUpdateStock(stockAdjustModalItem.id, Math.max(0, adjustedStock));
    setStockAdjustModalItem(null);
  };

  return (
    <div className="space-y-6">
      {/* Resumen Superior */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs uppercase font-bold tracking-wider text-slate-400 mb-1">
              Unidades en Stock
            </div>
            <div className="text-2xl font-black text-slate-900 font-mono">{totalItemsCount} uds</div>
            <div className="text-xs text-slate-500 mt-1">{state.tablewareItems.length} tipos de menaje</div>
          </div>
          <div className="p-2.5 bg-slate-50 text-[#1c6856] rounded-lg border border-slate-200 shadow-sm">
            <UtensilsCrossed className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs uppercase font-bold tracking-wider text-slate-400 mb-1">
              Valor del Menaje
            </div>
            <div className="text-2xl font-black text-[#1c6856] font-mono">
              C$ {totalInventoryValue.toLocaleString('es-NI', { maximumFractionDigits: 0 })}
            </div>
            <div className="text-xs text-slate-500 mt-1">Costo de reposición estimado</div>
          </div>
          <div className="p-2.5 bg-emerald-50 text-[#1c6856] rounded-lg border border-emerald-200 shadow-sm">
            <Wine className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs uppercase font-bold tracking-wider text-slate-400 mb-1">
              Pérdidas por Roturas
            </div>
            <div className="text-2xl font-black text-rose-600 font-mono">
              C$ {totalLossesValue.toLocaleString('es-NI', { maximumFractionDigits: 0 })}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              {state.tablewareLosses.reduce((acc, l) => acc + l.quantity, 0)} piezas rotas/perdidas
            </div>
          </div>
          <div className="p-2.5 bg-rose-50 text-rose-600 rounded-lg border border-rose-200 shadow-sm">
            <TrendingDown className="w-5 h-5" />
          </div>
        </div>

        <div
          className={`p-4 rounded-xl border flex items-center justify-between shadow-sm ${
            lowStockCount > 0 ? 'bg-rose-50/70 border-rose-200' : 'bg-white border-slate-200'
          }`}
        >
          <div>
            <div className="text-xs uppercase font-bold tracking-wider text-slate-400 mb-1">
              Stock Crítico (Reponer)
            </div>
            <div
              className={`text-2xl font-black font-mono ${
                lowStockCount > 0 ? 'text-rose-600' : 'text-slate-800'
              }`}
            >
              {lowStockCount} alertas
            </div>
            <div className="text-xs text-slate-500 mt-1">
              {lowStockCount > 0 ? 'Urge compra para el fin de semana' : 'Inventario en niveles óptimos'}
            </div>
          </div>
          <div
            className={`p-2.5 rounded-lg border ${
              lowStockCount > 0
                ? 'bg-rose-100 text-rose-700 border-rose-300'
                : 'bg-slate-100 text-slate-400 border-slate-200'
            }`}
          >
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Botones de Acción y Filtro por Área */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-white border border-slate-200 rounded-xl shadow-sm">
        <div className="flex gap-2">
          {(['TODOS', 'BARRA', 'SALON', 'COCINA'] as const).map((area) => (
            <button
              key={area}
              onClick={() => setActiveArea(area)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                activeArea === area
                  ? 'bg-[#1c6856] text-white shadow-sm'
                  : 'bg-slate-50 text-slate-600 hover:text-slate-900 border border-slate-200'
              }`}
            >
              {area === 'TODOS' ? 'Todas las Áreas' : area}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          <button
            onClick={() => setLossModalOpen(true)}
            className="flex items-center justify-center gap-2 px-3.5 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-sm transition active:scale-95 flex-1 sm:flex-none cursor-pointer"
          >
            <AlertTriangle className="w-4 h-4" />
            <span>Registrar Rotura</span>
          </button>
          <button
            onClick={() => setNewModalOpen(true)}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs border border-slate-300 transition active:scale-95 flex-1 sm:flex-none cursor-pointer"
          >
            <PlusCircle className="w-4 h-4 text-[#1c6856]" />
            <span>+ Artículo</span>
          </button>
          <button
            onClick={() =>
              printThermalTablewareReport(
                state.tablewareItems,
                state.tablewareLosses,
                state.activeAdminName
              )
            }
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs border border-slate-300 transition active:scale-95 flex-1 sm:flex-none cursor-pointer"
          >
            <Printer className="w-4 h-4 text-slate-500" />
            <span>Imprimir A4</span>
          </button>

          <button
            onClick={() =>
              exportTablewareToExcel(state.tablewareItems, state.tablewareLosses)
            }
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs border border-emerald-300 transition active:scale-95 flex-1 sm:flex-none cursor-pointer"
            title="Exportar inventario y roturas a Excel"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Exportar Excel</span>
          </button>
        </div>
      </div>

      {/* Tabla de Menaje */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Utensils className="w-4 h-4 text-[#1c6856]" />
            Catálogo de Cristalería, Vajilla y Utensilios
          </h3>
          <span className="text-xs text-slate-500">
            Click en cualquier fila para ajustar el conteo físico
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-6">Artículo</th>
                <th className="py-3 px-4">Área</th>
                <th className="py-3 px-4 text-center">Stock Actual</th>
                <th className="py-3 px-4 text-center">Mínimo</th>
                <th className="py-3 px-4 text-right">Costo Reposición</th>
                <th className="py-3 px-4 text-right">Valor Total</th>
                <th className="py-3 px-6 text-center">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredItems.map((item) => {
                const isCritical = item.currentStock <= item.minimumStock;

                return (
                  <tr
                    key={item.id}
                    className="hover:bg-slate-50/70 transition cursor-pointer"
                    onClick={() => {
                      setStockAdjustModalItem(item);
                      setAdjustedStock(item.currentStock);
                    }}
                  >
                    <td className="py-3.5 px-6 font-bold text-slate-900">
                      {item.name}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                        {item.area}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="font-mono font-black text-base text-slate-900 bg-slate-50 px-3 py-1 rounded-lg border border-slate-200">
                        {item.currentStock} {item.unit}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono text-slate-500 text-xs font-medium">
                      {item.minimumStock} {item.unit}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-xs text-slate-600 font-semibold">
                      C$ {item.unitCostNIO.toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900 text-xs">
                      C$ {(item.currentStock * item.unitCostNIO).toLocaleString('es-NI', { maximumFractionDigits: 0 })}
                    </td>
                    <td className="py-3.5 px-6 text-center">
                      {isCritical ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                          <AlertTriangle className="w-3 h-3" /> Urge Reponer
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3" /> Abastecido
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Historial de Roturas */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <History className="w-4 h-4 text-rose-600" />
            Registro de Bajas y Roturas Recientes
          </h3>
          <span className="text-xs text-slate-500 font-medium">
            {state.tablewareLosses.length} eventos registrados
          </span>
        </div>

        <div className="divide-y divide-slate-100">
          {state.tablewareLosses.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">
              No hay roturas reportadas.
            </div>
          ) : (
            state.tablewareLosses.map((l) => (
              <div
                key={l.id}
                className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:bg-slate-50/70 transition"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-rose-50 text-rose-600 border border-rose-200">
                    <TrendingDown className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">{l.itemName}</span>
                      <span className="text-xs font-mono font-black text-rose-600">
                        -{l.quantity} uds
                      </span>
                      <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                        {l.reason.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        {new Date(l.date).toLocaleDateString()}
                      </span>
                      <span>•</span>
                      <span>Registrado por: <strong className="text-slate-700">{l.registeredBy}</strong></span>
                      {l.notes && <span>• "{l.notes}"</span>}
                    </div>
                  </div>
                </div>

                <div className="font-mono text-sm font-bold text-rose-600 self-end sm:self-center">
                  -C$ {l.totalCostNIO.toFixed(2)}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modal Registrar Rotura */}
      {lossModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-md overflow-y-auto max-h-[90vh] shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-600" /> Reportar Rotura o Baja de Menaje
              </h3>
              <button
                onClick={() => setLossModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRegisterLoss} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  Selecciona el Artículo que se dañó *
                </label>
                <select
                  value={selectedItemId}
                  onChange={(e) => setSelectedItemId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-[#1c6856] font-semibold"
                >
                  {state.tablewareItems.map((it) => (
                    <option key={it.id} value={it.id}>
                      {it.name} ({it.area}) — Stock: {it.currentStock} uds
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  Cantidad dañada / rota (unidades) *
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={lossQuantity}
                  onChange={(e) => setLossQuantity(parseInt(e.target.value, 10) || 1)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xl font-black font-mono text-rose-600 focus:bg-white focus:outline-none focus:border-[#1c6856]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Motivo de la Baja</label>
                <select
                  value={lossReason}
                  onChange={(e) => setLossReason(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-[#1c6856] font-medium"
                >
                  <option value="ROTURA_SALON">Caída / Rotura en Salón (Comedor)</option>
                  <option value="ROTURA_BARRA">Rotura en Barra / Coctelería</option>
                  <option value="RAJADO_CALOR">Rajado por calor o lavado</option>
                  <option value="EXTRAVIADO">Extraviado / Pérdida en basura</option>
                  <option value="DESGASTE">Desgaste natural</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  Observaciones (opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ej: Se cayó de la bandeja del mesero en mesa 3..."
                  value={lossNotes}
                  onChange={(e) => setLossNotes(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-[#1c6856]"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setLossModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-lg font-bold text-xs text-white bg-rose-600 hover:bg-rose-500 shadow-sm transition active:scale-95 cursor-pointer"
                >
                  Confirmar Baja
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Ajustar Stock */}
      {stockAdjustModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-sm overflow-y-auto max-h-[90vh] shadow-2xl p-6 space-y-4">
            <h3 className="text-base font-black text-slate-900">
              Ajustar Conteo Físico: <br />
              <span className="text-[#1c6856]">{stockAdjustModalItem.name}</span>
            </h3>
            <p className="text-xs text-slate-500">
              Ingresa el conteo exacto de unidades físicas encontradas en la revisión de hoy.
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">
                Nuevo Stock Físico (uds)
              </label>
              <input
                type="number"
                min="0"
                value={adjustedStock}
                onChange={(e) => setAdjustedStock(parseInt(e.target.value, 10) || 0)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-3 text-2xl font-black font-mono text-center text-slate-900 focus:bg-white focus:outline-none focus:border-[#1c6856]"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setStockAdjustModalItem(null)}
                className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveStockAdjust}
                className="px-5 py-2.5 rounded-lg bg-[#1c6856] hover:bg-[#155244] text-white font-bold text-xs shadow-sm transition cursor-pointer"
              >
                Guardar Ajuste
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Nuevo Artículo */}
      {newModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-md overflow-y-auto max-h-[90vh] shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-[#1c6856]" /> Añadir Artículo de Menaje
              </h3>
              <button
                onClick={() => setNewModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddNewItem} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  Nombre del Artículo *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Plato Hondo para Sopa, Copa Flauta Champán..."
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-[#1c6856]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Área Destino</label>
                  <select
                    value={newArea}
                    onChange={(e) => setNewArea(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-[#1c6856] font-semibold"
                  >
                    <option value="BARRA">Barra</option>
                    <option value="SALON">Salón / Comedor</option>
                    <option value="COCINA">Cocina / Parrilla</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Stock Inicial</label>
                  <input
                    type="number"
                    min="1"
                    value={newStock}
                    onChange={(e) => setNewStock(parseInt(e.target.value, 10) || 0)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Stock Mínimo (Alerta)</label>
                  <input
                    type="number"
                    min="1"
                    value={newMinStock}
                    onChange={(e) => setNewMinStock(parseInt(e.target.value, 10) || 0)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Costo Unit. Reposición (C$)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={newUnitCost}
                    onChange={(e) => setNewUnitCost(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setNewModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-lg font-bold text-xs text-white bg-[#1c6856] hover:bg-[#155244] shadow-sm transition cursor-pointer"
                >
                  Crear Artículo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
