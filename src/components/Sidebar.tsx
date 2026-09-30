import React, { useState, useEffect } from 'react';
import { AppState } from '../types';
import logoImg from '../assets/logo.png';
import {
  Landmark,
  ShoppingCart,
  Settings,
  CircleDollarSign,
  Flame,
  User,
  ShieldCheck,
  TrendingUp,
  Users,
  ChevronDown,
  ChevronRight,
  Calendar,
  Building2,
  UtensilsCrossed,
} from 'lucide-react';

interface Props {
  state: AppState;
  activeTab: 'generalCash' | 'pettyCash' | 'tableware' | 'dailyEarnings' | 'payroll';
  onTabChange: (tab: 'generalCash' | 'pettyCash' | 'tableware' | 'dailyEarnings' | 'payroll') => void;
  payrollSubTab?: 'quincenal' | 'especial' | 'incidencias';
  onPayrollSubTabChange?: (subTab: 'quincenal' | 'especial' | 'incidencias') => void;
  onOpenSettingsClick: () => void;
  onChangeExchangeRateClick: () => void;
  onSelectAdminClick: () => void;
}

export const Sidebar: React.FC<Props> = ({
  state,
  activeTab,
  onTabChange,
  payrollSubTab = 'quincenal',
  onPayrollSubTabChange,
  onOpenSettingsClick,
  onChangeExchangeRateClick,
  onSelectAdminClick,
}) => {
  const isShiftOpen = state.currentShift?.status === 'OPEN';
  const [payrollExpanded, setPayrollExpanded] = useState(activeTab === 'payroll');
  const [appVersion, setAppVersion] = useState('v1.0.11');

  useEffect(() => {
    if (activeTab === 'payroll') {
      setPayrollExpanded(true);
    }
  }, [activeTab]);

  useEffect(() => {
    if (window.electronAPI?.getVersion) {
      window.electronAPI
        .getVersion()
        .then((v) => {
          if (v) setAppVersion(`v${v}`);
        })
        .catch(() => {});
    }
  }, []);

  return (
    <aside className="w-64 bg-white border-r border-slate-200/90 flex flex-col h-screen sticky top-0 z-40 select-none shadow-[2px_0_12px_-4px_rgba(0,0,0,0.03)] shrink-0">
      {/* Brand Header & Menú con Scroll Suave */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 border-b border-slate-100 flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl overflow-hidden shrink-0 border border-[#1c6856]/30 bg-[#1c6856] shadow-sm flex items-center justify-center">
            <img src={logoImg} alt="Restaurante El Bodegón" className="w-full h-full object-cover" />
          </div>
          <div className="overflow-hidden">
            <div className="font-black tracking-tight text-slate-900 text-xs sm:text-sm leading-tight truncate">
              EL BODEGÓN
            </div>
            <div className="text-[10px] font-bold text-[#1c6856] uppercase tracking-wider mt-0.5">
              Control ERP de Cajas
            </div>
          </div>
        </div>

        {/* Administrador Activo Selector Rápido */}
        <div className="p-3 mx-3 mt-3 rounded-xl bg-emerald-50/40 border border-emerald-200/70 flex items-center justify-between">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-lg bg-white border border-emerald-200 text-[#1c6856] flex items-center justify-center font-bold text-xs shadow-xs">
              <User className="w-4 h-4 text-[#1c6856]" />
            </div>
            <div className="truncate">
              <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider block">Admin en Turno</span>
              <span className="text-xs font-black text-slate-900 truncate block">{state.activeAdminName}</span>
            </div>
          </div>
          <button
            onClick={onSelectAdminClick}
            className="text-[11px] font-bold text-[#1c6856] hover:text-[#154f42] underline px-1 py-0.5 rounded cursor-pointer"
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
                ? 'bg-[#1c6856] text-white shadow-md shadow-[#1c6856]/25 border border-[#154f42]'
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
                ? 'bg-[#154f42] text-white shadow-md shadow-[#154f42]/25 border border-[#0d342b]'
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

          {/* Módulo 4: Nóminas & Planillas (Desplegable con Submenú) */}
          <div className="pt-1">
            <button
              onClick={() => {
                if (activeTab !== 'payroll') {
                  onTabChange('payroll');
                  setPayrollExpanded(true);
                } else {
                  setPayrollExpanded((prev) => !prev);
                }
              }}
              className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeTab === 'payroll'
                  ? 'bg-[#1c6856] text-white shadow-md shadow-[#1c6856]/25 border border-[#154f42]'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-3">
                <Users className="w-4 h-4" />
                <span>Nóminas & Planillas</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span
                  className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-full ${
                    activeTab === 'payroll'
                      ? 'bg-white/25 text-white'
                      : 'bg-emerald-50 text-[#1c6856]'
                  }`}
                >
                  {(state.payrollEmployees || []).length}
                </span>
                {payrollExpanded ? (
                  <ChevronDown className="w-3.5 h-3.5 opacity-70" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 opacity-70" />
                )}
              </div>
            </button>

            {/* Submenú Desplegable */}
            {payrollExpanded && (
              <div className="ml-4 pl-3 border-l-2 border-slate-200/80 mt-1.5 space-y-1">
                {/* Submenú 1: Planilla Quincenal */}
                <button
                  onClick={() => {
                    onTabChange('payroll');
                    onPayrollSubTabChange?.('quincenal');
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition cursor-pointer text-left ${
                    activeTab === 'payroll' && payrollSubTab === 'quincenal'
                      ? 'bg-emerald-50 text-[#1c6856] font-bold shadow-xs'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">Planilla Quincenal</span>
                </button>

                {/* Submenú 2: Planilla Especial INSS */}
                <button
                  onClick={() => {
                    onTabChange('payroll');
                    onPayrollSubTabChange?.('especial');
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition cursor-pointer text-left ${
                    activeTab === 'payroll' && payrollSubTab === 'especial'
                      ? 'bg-indigo-50 text-indigo-700 font-bold shadow-xs'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <Building2 className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">Planilla Especial (INSS)</span>
                </button>

                {/* Submenú 3: Incidencias & Vajilla */}
                <button
                  onClick={() => {
                    onTabChange('payroll');
                    onPayrollSubTabChange?.('incidencias');
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition cursor-pointer text-left ${
                    activeTab === 'payroll' && payrollSubTab === 'incidencias'
                      ? 'bg-amber-50 text-amber-800 font-bold shadow-xs'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <UtensilsCrossed className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">Incidencias & Vajilla</span>
                  </div>
                  {(state.payrollIncidents || []).length > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800 text-[9px] font-black">
                      {state.payrollIncidents.length}
                    </span>
                  )}
                </button>
              </div>
            )}
          </div>
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
          <span>Bodegón Control {appVersion}</span>
          <span className="inline-flex items-center gap-1 text-emerald-600 font-bold">
            <ShieldCheck className="w-3 h-3" /> Seguro
          </span>
        </button>
      </div>
    </aside>
  );
};
