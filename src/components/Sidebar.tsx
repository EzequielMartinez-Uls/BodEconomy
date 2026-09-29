import React from 'react';
import { AppState } from '../types';
import {
  Landmark,
  ShoppingCart,
  Settings,
  CircleDollarSign,
  Flame,
  User,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';

interface Props {
  state: AppState;
  activeTab: 'generalCash' | 'pettyCash' | 'tableware' | 'dailyEarnings';
  onTabChange: (tab: 'generalCash' | 'pettyCash' | 'tableware' | 'dailyEarnings') => void;
  onOpenSettingsClick: () => void;
  onChangeExchangeRateClick: () => void;
  onSelectAdminClick: () => void;
}

export const Sidebar: React.FC<Props> = ({
  state,
  activeTab,
  onTabChange,
  onOpenSettingsClick,
  onChangeExchangeRateClick,
  onSelectAdminClick,
}) => {
  const isShiftOpen = state.currentShift?.status === 'OPEN';
  const isPettyCashLow = state.pettyCashBalance < 2000;

  return (
    <aside className="w-64 bg-white border-r border-slate-200/90 flex flex-col h-screen sticky top-0 z-40 select-none shadow-[2px_0_12px_-4px_rgba(0,0,0,0.03)] shrink-0">
      {/* Brand Header & Menú con Scroll Suave */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-5 border-b border-slate-100 flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center text-white shadow-md shadow-amber-500/25">
            <Flame className="w-5 h-5 fill-white" />
          </div>
          <div>
            <div className="font-black tracking-tight text-slate-900 text-base">
              EL BODEGÓN
            </div>
            <div className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">
              Control ERP de Cajas
            </div>
          </div>
        </div>

        {/* Administrador Activo Selector Rápido */}
        <div className="p-3.5 mx-3 mt-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs shadow-xs">
              <User className="w-4 h-4 text-amber-600" />
            </div>
            <div className="truncate">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Admin en Turno</span>
              <span className="text-xs font-black text-slate-800 truncate block">{state.activeAdminName}</span>
            </div>
          </div>
          <button
            onClick={onSelectAdminClick}
            className="text-[11px] font-bold text-amber-600 hover:text-amber-700 underline px-1 py-0.5 rounded cursor-pointer"
          >
            Cambiar
          </button>
        </div>

        {/* Navigation Items Separados Claramente */}
        <nav className="p-3 space-y-1.5 mt-2">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-2">
            Módulos Independientes
          </div>

          {/* Módulo 1: Caja General */}
          <button
            onClick={() => onTabChange('generalCash')}
            className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'generalCash'
                ? 'bg-amber-500 text-white shadow-md shadow-amber-500/25'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <div className="flex items-center gap-3">
              <Landmark className="w-4 h-4" />
              <span>Caja General</span>
            </div>
            {isShiftOpen ? (
              <span
                className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full ${
                  activeTab === 'generalCash' ? 'bg-white/25 text-white' : 'bg-emerald-100 text-emerald-800'
                }`}
              >
                Abierta
              </span>
            ) : (
              <span
                className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                  activeTab === 'generalCash' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                }`}
              >
                Cerrada
              </span>
            )}
          </button>

          {/* Módulo 2: Caja Chica */}
          <button
            onClick={() => onTabChange('pettyCash')}
            className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'pettyCash'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/25'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <div className="flex items-center gap-3">
              <ShoppingCart className="w-4 h-4" />
              <span>Caja Chica</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span
                className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-full ${
                  activeTab === 'pettyCash'
                    ? 'bg-white/25 text-white'
                    : state.currentPettyCashShift?.status === 'OPEN'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-slate-100 text-slate-500'
                }`}
              >
                {state.currentPettyCashShift?.status === 'OPEN' ? 'Abierta' : 'Cerrada'}
              </span>
              <span
                className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full ${
                  activeTab === 'pettyCash'
                    ? 'bg-white/25 text-white'
                    : isPettyCashLow
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-slate-100 text-slate-700'
                }`}
              >
                C$ {Math.round(state.pettyCashBalance).toLocaleString()}
              </span>
            </div>
          </button>

          {/* Módulo 3: Ganancias & Ventas Diarias */}
          <button
            onClick={() => onTabChange('dailyEarnings')}
            className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'dailyEarnings'
                ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-md shadow-indigo-600/25'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <div className="flex items-center gap-3">
              <TrendingUp className="w-4 h-4 text-indigo-400" />
              <span>Ganancias & Ventas</span>
            </div>
            <span
              className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-full ${
                activeTab === 'dailyEarnings'
                  ? 'bg-white/25 text-white'
                  : 'bg-indigo-50 text-indigo-700'
              }`}
            >
              Día a Día
            </span>
          </button>
        </nav>
      </div>

      {/* Footer Info & Configuración */}
      <div className="p-3 border-t border-slate-100 space-y-1 shrink-0 bg-white">
        <button
          onClick={onChangeExchangeRateClick}
          className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition"
        >
          <div className="flex items-center gap-2">
            <CircleDollarSign className="w-4 h-4 text-emerald-600" />
            <span>Tasa de Cambio</span>
          </div>
          <span className="font-mono font-bold text-slate-900 text-[11px]">
            C$ {state.defaultExchangeRate.toFixed(2)}
          </span>
        </button>

        <button
          onClick={onOpenSettingsClick}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition"
        >
          <Settings className="w-4 h-4 text-slate-400" />
          <span>Configuración & Respaldos</span>
        </button>

        <button
          onClick={onOpenSettingsClick}
          className="w-full pt-2 px-3 flex items-center justify-between text-[10px] font-semibold text-slate-400 hover:text-slate-600 transition cursor-pointer"
          title="Ver configuración del sistema y respaldos"
        >
          <span>BodegónControl v1.2</span>
          <span className="inline-flex items-center gap-1 text-emerald-600 font-bold">
            <ShieldCheck className="w-3 h-3" /> Seguro
          </span>
        </button>
      </div>
    </aside>
  );
};
