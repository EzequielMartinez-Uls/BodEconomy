import React from 'react';
import { AppState } from '../types';
import {
  UtensilsCrossed,
  Wallet,
  CalendarCheck,
  History,
  Settings,
  CircleDollarSign,
  User,
  Power,
  ChevronDown,
} from 'lucide-react';

interface Props {
  state: AppState;
  activeTab: 'dashboard' | 'pettyCash' | 'tableware' | 'history';
  onTabChange: (tab: 'dashboard' | 'pettyCash' | 'tableware' | 'history') => void;
  onOpenShiftClick: () => void;
  onCloseShiftClick: () => void;
  onOpenSettingsClick: () => void;
  onSelectAdminClick: () => void;
  onChangeExchangeRateClick: () => void;
}

export const Navbar: React.FC<Props> = ({
  state,
  activeTab,
  onTabChange,
  onOpenShiftClick,
  onCloseShiftClick,
  onOpenSettingsClick,
  onSelectAdminClick,
  onChangeExchangeRateClick,
}) => {
  const isShiftOpen = state.currentShift?.status === 'OPEN';
  const hasLowStock = state.tablewareItems.some((it) => it.currentStock <= it.minimumStock);
  const isPettyCashLow = state.pettyCashBalance < 2000;

  return (
    <header className="bg-stone-900 border-b border-stone-800 sticky top-0 z-30 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Marca */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-dorado-tinta to-dorado-tinta flex items-center justify-center text-stone-950 font-black shadow-md shadow-dorado/20">
              <UtensilsCrossed className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold tracking-tight text-white text-lg">EL BODEGÓN</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-dorado-tinta/10 text-dorado-vivo border border-dorado/30">
                  Control ERP
                </span>
              </div>
              <div className="text-xs text-stone-400">Restaurante & Bar • Cajas y Menaje</div>
            </div>
          </div>

          {/* Selector de Administrador & T/C & Estado de Caja */}
          <div className="flex items-center gap-3">
            {/* Tasa de Cambio */}
            <button
              onClick={onChangeExchangeRateClick}
              title="Click para ajustar Tasa de Cambio"
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-800/80 border border-stone-700 hover:border-stone-600 text-xs font-mono font-medium text-stone-300 transition"
            >
              <CircleDollarSign className="w-4 h-4 text-bodegon" />
              <span>T/C:</span>
              <span className="font-bold text-white">C$ {state.defaultExchangeRate.toFixed(2)}</span>
            </button>

            {/* Administrador Activo */}
            <button
              onClick={onSelectAdminClick}
              title="Click para cambiar de Administrador"
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700/80 border border-stone-700 text-xs text-stone-200 transition"
            >
              <div className="w-6 h-6 rounded-full bg-dorado-tinta/20 border border-dorado/40 text-dorado-vivo flex items-center justify-center font-bold">
                <User className="w-3.5 h-3.5" />
              </div>
              <div className="text-left">
                <span className="block font-semibold text-white leading-tight">{state.activeAdminName}</span>
                <span className="block text-[10px] text-stone-400 leading-tight">Admin en Turno</span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-stone-400" />
            </button>

            {/* Estado de Turno y Acción */}
            {isShiftOpen ? (
              <div className="flex items-center gap-2">
                <div className="hidden lg:flex flex-col text-right">
                  <span className="text-[10px] text-bodegon font-bold uppercase tracking-wider flex items-center justify-end gap-1">
                    <span className="w-2 h-2 rounded-full bg-bodegon animate-pulse"></span>
                    Caja Abierta
                  </span>
                  <span className="text-xs text-stone-300 font-mono">
                    Por {state.currentShift?.openedBy}
                  </span>
                </div>
                <button
                  onClick={onCloseShiftClick}
                  className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-barro hover:bg-barro text-white text-xs font-bold shadow-md shadow-barro/20 transition"
                >
                  <Power className="w-4 h-4" />
                  <span>Cerrar Turno</span>
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenShiftClick}
                className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-bodegon hover:bg-bodegon text-white text-xs font-bold shadow-md shadow-bodegon/20 transition"
              >
                <Power className="w-4 h-4" />
                <span>Abrir Caja</span>
              </button>
            )}

            {/* Ajustes */}
            <button
              onClick={onOpenSettingsClick}
              title="Ajustes y Respaldos"
              className="p-2 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Barra de Pestañas de Navegación */}
        <div className="flex gap-2 py-2 overflow-x-auto border-t border-stone-800/80">
          <button
            onClick={() => onTabChange('dashboard')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
              activeTab === 'dashboard'
                ? 'bg-dorado-vivo text-stone-950 shadow-sm'
                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/60'
            }`}
          >
            <CalendarCheck className="w-4 h-4" />
            <span>Turno Actual</span>
          </button>

          <button
            onClick={() => onTabChange('pettyCash')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition relative ${
              activeTab === 'pettyCash'
                ? 'bg-dorado-vivo text-stone-950 shadow-sm'
                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/60'
            }`}
          >
            <Wallet className="w-4 h-4" />
            <span>Caja Chica</span>
            <span
              className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-bold ${
                isPettyCashLow ? 'bg-dorado-vivo text-stone-950' : 'bg-stone-800 text-stone-300'
              }`}
            >
              C$ {state.pettyCashBalance.toLocaleString('es-NI', { maximumFractionDigits: 0 })}
            </span>
          </button>

          <button
            onClick={() => onTabChange('tableware')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition relative ${
              activeTab === 'tableware'
                ? 'bg-dorado-vivo text-stone-950 shadow-sm'
                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/60'
            }`}
          >
            <UtensilsCrossed className="w-4 h-4" />
            <span>Cristalería & Menaje</span>
            {hasLowStock && (
              <span className="w-2 h-2 rounded-full bg-barro animate-ping"></span>
            )}
          </button>

          <button
            onClick={() => onTabChange('history')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
              activeTab === 'history'
                ? 'bg-dorado-vivo text-stone-950 shadow-sm'
                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/60'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Histórico de Cierres ({state.shiftHistory.length})</span>
          </button>
        </div>
      </div>
    </header>
  );
};
