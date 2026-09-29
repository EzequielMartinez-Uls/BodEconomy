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
    <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-30 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Marca */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-slate-950 font-black shadow-md shadow-amber-500/20">
              <UtensilsCrossed className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold tracking-tight text-white text-lg">EL BODEGÓN</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30">
                  Control ERP
                </span>
              </div>
              <div className="text-xs text-slate-400">Restaurante & Asador • Cajas y Menaje</div>
            </div>
          </div>

          {/* Selector de Administrador & T/C & Estado de Caja */}
          <div className="flex items-center gap-3">
            {/* Tasa de Cambio */}
            <button
              onClick={onChangeExchangeRateClick}
              title="Click para ajustar Tasa de Cambio"
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700 hover:border-slate-600 text-xs font-mono font-medium text-slate-300 transition"
            >
              <CircleDollarSign className="w-4 h-4 text-emerald-400" />
              <span>T/C:</span>
              <span className="font-bold text-white">C$ {state.defaultExchangeRate.toFixed(2)}</span>
            </button>

            {/* Administrador Activo */}
            <button
              onClick={onSelectAdminClick}
              title="Click para cambiar de Administrador"
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-xs text-slate-200 transition"
            >
              <div className="w-6 h-6 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center font-bold">
                <User className="w-3.5 h-3.5" />
              </div>
              <div className="text-left">
                <span className="block font-semibold text-white leading-tight">{state.activeAdminName}</span>
                <span className="block text-[10px] text-slate-400 leading-tight">Admin en Turno</span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {/* Estado de Turno y Acción */}
            {isShiftOpen ? (
              <div className="flex items-center gap-2">
                <div className="hidden lg:flex flex-col text-right">
                  <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider flex items-center justify-end gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    Caja Abierta
                  </span>
                  <span className="text-xs text-slate-300 font-mono">
                    Por {state.currentShift?.openedBy}
                  </span>
                </div>
                <button
                  onClick={onCloseShiftClick}
                  className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md shadow-rose-600/20 transition active:scale-95"
                >
                  <Power className="w-4 h-4" />
                  <span>Cerrar Turno</span>
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenShiftClick}
                className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition active:scale-95"
              >
                <Power className="w-4 h-4" />
                <span>Abrir Caja</span>
              </button>
            )}

            {/* Ajustes */}
            <button
              onClick={onOpenSettingsClick}
              title="Ajustes y Respaldos"
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Barra de Pestañas de Navegación */}
        <div className="flex gap-2 py-2 overflow-x-auto border-t border-slate-800/80">
          <button
            onClick={() => onTabChange('dashboard')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
              activeTab === 'dashboard'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <CalendarCheck className="w-4 h-4" />
            <span>Turno Actual</span>
          </button>

          <button
            onClick={() => onTabChange('pettyCash')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition relative ${
              activeTab === 'pettyCash'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Wallet className="w-4 h-4" />
            <span>Caja Chica</span>
            <span
              className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-bold ${
                isPettyCashLow ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-300'
              }`}
            >
              C$ {state.pettyCashBalance.toLocaleString('es-NI', { maximumFractionDigits: 0 })}
            </span>
          </button>

          <button
            onClick={() => onTabChange('tableware')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition relative ${
              activeTab === 'tableware'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <UtensilsCrossed className="w-4 h-4" />
            <span>Cristalería & Menaje</span>
            {hasLowStock && (
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
            )}
          </button>

          <button
            onClick={() => onTabChange('history')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
              activeTab === 'history'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
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
