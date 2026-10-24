import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { AppState } from '../types';
import logoImg from '../assets/logo.png';
import tegaImg from '../assets/tega.svg';
import { AboutModal } from './AboutModal';
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
  RefreshCw,
  Sparkles,
  Download,
  BarChart3,
} from 'lucide-react';

interface Props {
  state: AppState;
  activeTab: 'generalCash' | 'pettyCash' | 'tableware' | 'dailyEarnings' | 'payroll' | 'expenseAnalytics';
  onTabChange: (tab: 'generalCash' | 'pettyCash' | 'tableware' | 'dailyEarnings' | 'payroll' | 'expenseAnalytics') => void;
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
  const isPettyCashLow = state.pettyCashBalance < 2000;
  const [payrollExpanded, setPayrollExpanded] = useState(activeTab === 'payroll');
  const [appVersion, setAppVersion] = useState('');
  const [showAbout, setShowAbout] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const [indicator, setIndicator] = useState({ top: 0, height: 0 });

  // Mide el botón del módulo activo para mover el fondo verde hasta él.
  useLayoutEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const measure = () => {
      const active = nav.querySelector<HTMLElement>('[data-nav-main][data-active="true"]');
      setIndicator(active ? { top: active.offsetTop, height: active.offsetHeight } : { top: 0, height: 0 });
    };
    measure();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    ro?.observe(nav);
    return () => ro?.disconnect();
  }, [activeTab, payrollExpanded, payrollSubTab]);

  const [updateStatus, setUpdateStatus] = useState<{
    status: 'idle' | 'available' | 'downloading' | 'ready';
    percent?: number;
    version?: string;
  }>({ status: 'idle' });
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [updateFeedback, setUpdateFeedback] = useState<string | null>(null);

  const handleCheckUpdates = async () => {
    if (checkingUpdate) return;
    setCheckingUpdate(true);
    setUpdateFeedback(null);
    try {
      if (window.electronAPI?.checkForUpdates) {
        await window.electronAPI.checkForUpdates();
      }
      setTimeout(() => {
        setCheckingUpdate(false);
        setUpdateFeedback('Al día');
        setTimeout(() => setUpdateFeedback(null), 3000);
      }, 2000);
    } catch {
      setCheckingUpdate(false);
      setUpdateFeedback('Error');
      setTimeout(() => setUpdateFeedback(null), 3000);
    }
  };

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

    if (window.electronAPI) {
      const unsubAvail = window.electronAPI.onUpdateAvailable?.((info: any) => {
        setUpdateStatus({ status: 'available', version: info?.version });
      });
      const unsubProg = window.electronAPI.onUpdateProgress?.((p: any) => {
        setUpdateStatus((prev) => ({
          ...prev,
          status: 'downloading',
          percent: Math.round(p?.percent || 0),
        }));
      });
      const unsubDown = window.electronAPI.onUpdateDownloaded?.((info: any) => {
        setUpdateStatus({ status: 'ready', version: info?.version });
      });

      return () => {
        unsubAvail?.();
        unsubProg?.();
        unsubDown?.();
      };
    }
  }, []);

  return (
    <aside className="w-64 bg-white border-r border-stone-200/90 flex flex-col h-screen sticky top-0 z-40 select-none shadow-[2px_0_12px_-4px_rgba(0,0,0,0.03)] shrink-0">
      {/* Brand Header & Menú con Scroll Suave */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 border-b border-stone-100 flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl overflow-hidden shrink-0 border border-bodegon/30 bg-bodegon shadow-sm flex items-center justify-center">
            <img src={logoImg} alt="Restaurante El Bodegón" className="w-full h-full object-cover" />
          </div>
          <div className="overflow-hidden">
            <div className="font-display font-extrabold uppercase tracking-wide text-bodegon text-xl leading-none truncate">
              Bodegón Control
            </div>
            <div className="text-[10px] font-bold text-dorado-tinta uppercase tracking-wider mt-1">
              Cajas y nómina
            </div>
          </div>
        </div>

        {/* Administrador Activo Selector Rápido */}
        <div className="p-3 mx-3 mt-3 rounded-xl bg-bodegon/2 border border-bodegon/14 flex items-center justify-between">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-lg bg-white border border-bodegon/20 text-bodegon flex items-center justify-center font-bold text-xs shadow-xs">
              <User className="w-4 h-4 text-bodegon" />
            </div>
            <div className="truncate">
              <span className="text-[9.5px] font-bold text-stone-400 uppercase tracking-wider block">Admin en Turno</span>
              <span className="text-xs font-black text-stone-900 truncate block">{state.activeAdminName}</span>
            </div>
          </div>
          <button
            onClick={onSelectAdminClick}
            className="text-[11px] font-bold text-bodegon hover:text-bodegon-noche underline px-1 py-0.5 rounded cursor-pointer"
          >
            Cambiar
          </button>
        </div>

        {/* Navigation Items Separados Claramente */}
        <nav ref={navRef} className="relative p-3 space-y-1.5 mt-2">
          {/* Fondo verde del módulo activo: se desliza de un módulo a otro. */}
          <div
            aria-hidden="true"
            className="absolute left-3 right-3 top-0 rounded-xl bg-bodegon shadow-md shadow-bodegon/25 pointer-events-none transition-[transform,height,opacity] duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)]"
            style={{ transform: `translateY(${indicator.top}px)`, height: indicator.height, opacity: indicator.height ? 1 : 0 }}
          />
          <div className="text-[10px] font-bold text-stone-400 uppercase tracking-wider px-3 mb-2">
            Módulos Independientes
          </div>

          {/* Módulo 1: Caja General */}
          <button
            data-nav-main
            data-active={activeTab === 'generalCash'}
            onClick={() => onTabChange('generalCash')}
            className={`relative z-10 w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-bold transition-colors duration-200 cursor-pointer ${
              activeTab === 'generalCash'
                ? 'text-white'
                : 'text-stone-600 hover:bg-stone-50 hover:text-stone-900'
            }`}
          >
            <div className="flex items-center gap-3">
              <Landmark className="w-4 h-4" />
              <span>Caja General</span>
            </div>
            {isShiftOpen ? (
              <span
                className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full ${
                  activeTab === 'generalCash' ? 'bg-white/25 text-white' : 'bg-bodegon/10 text-bodegon'
                }`}
              >
                Abierta
              </span>
            ) : (
              <span
                className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                  activeTab === 'generalCash' ? 'bg-white/20 text-white' : 'bg-stone-100 text-stone-500'
                }`}
              >
                Cerrada
              </span>
            )}
          </button>

          {/* Módulo 2: Caja Chica */}
          <button
            data-nav-main
            data-active={activeTab === 'pettyCash'}
            onClick={() => onTabChange('pettyCash')}
            className={`relative z-10 w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-bold transition-colors duration-200 cursor-pointer ${
              activeTab === 'pettyCash'
                ? 'text-white'
                : 'text-stone-600 hover:bg-stone-50 hover:text-stone-900'
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
                    ? 'bg-bodegon/10 text-bodegon'
                    : 'bg-stone-100 text-stone-500'
                }`}
              >
                {state.currentPettyCashShift?.status === 'OPEN' ? 'Abierta' : 'Cerrada'}
              </span>
              <span
                className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full ${
                  activeTab === 'pettyCash'
                    ? 'bg-white/25 text-white'
                    : isPettyCashLow
                    ? 'bg-dorado/20 text-dorado-tinta'
                    : 'bg-stone-100 text-stone-700'
                }`}
              >
                C$ {Math.round(
                  state.currentPettyCashShift?.status === 'OPEN'
                    ? state.pettyCashBalance
                    : (state.pettyCashShiftHistory[0]?.actualCashCounted ??
                        state.pettyCashShiftHistory[0]?.expectedBalance ??
                        (state.pettyCashShiftHistory.length === 0 ? 0 : state.pettyCashBalance))
                ).toLocaleString()}
              </span>
            </div>
          </button>

          {/* Módulo 3: Ganancias & Ventas Diarias */}
          <button
            data-nav-main
            data-active={activeTab === 'dailyEarnings'}
            onClick={() => onTabChange('dailyEarnings')}
            className={`relative z-10 w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-bold transition-colors duration-200 cursor-pointer ${
              activeTab === 'dailyEarnings'
                ? 'text-white'
                : 'text-stone-600 hover:bg-stone-50 hover:text-stone-900'
            }`}
          >
            <div className="flex items-center gap-3">
              <TrendingUp className="w-4 h-4" />
              <span>Ganancias & Ventas</span>
            </div>
            <span
              className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                activeTab === 'dailyEarnings'
                  ? 'bg-white/20 text-white'
                  : 'bg-stone-100 text-stone-600'
              }`}
            >
              Día a Día
            </span>
          </button>

          {/* Módulo 4: Nóminas & Planillas (Desplegable con Submenú) */}
          <div className="pt-1">
            <button
              data-nav-main
              data-active={activeTab === 'payroll'}
              onClick={() => {
                if (activeTab !== 'payroll') {
                  onTabChange('payroll');
                  setPayrollExpanded(true);
                } else {
                  setPayrollExpanded((prev) => !prev);
                }
              }}
              className={`relative z-10 w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-bold transition-colors duration-200 cursor-pointer ${
                activeTab === 'payroll'
                  ? 'text-white'
                  : 'text-stone-600 hover:bg-stone-50 hover:text-stone-900'
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
                      : 'bg-bodegon/5 text-bodegon'
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
              <div className="ml-4 pl-3 border-l-2 border-stone-200/80 mt-1.5 space-y-1">
                {/* Submenú 1: Planilla Quincenal */}
                <button
                  onClick={() => {
                    onTabChange('payroll');
                    onPayrollSubTabChange?.('quincenal');
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition cursor-pointer text-left ${
                    activeTab === 'payroll' && payrollSubTab === 'quincenal'
                      ? 'bg-bodegon/5 text-bodegon font-bold shadow-xs'
                      : 'text-stone-600 hover:bg-stone-50 hover:text-stone-900'
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
                      ? 'bg-stone-50 text-stone-700 font-bold shadow-xs'
                      : 'text-stone-600 hover:bg-stone-50 hover:text-stone-900'
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
                      ? 'bg-dorado/10 text-dorado-tinta font-bold shadow-xs'
                      : 'text-stone-600 hover:bg-stone-50 hover:text-stone-900'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <UtensilsCrossed className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">Incidencias & Vajilla</span>
                  </div>
                  {(state.payrollIncidents || []).length > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full bg-dorado/20 text-dorado-tinta text-[9px] font-black">
                      {state.payrollIncidents.length}
                    </span>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Módulo 5: Análisis de Gastos & Inteligencia Financiera */}
          <button
            data-nav-main
            data-active={activeTab === 'expenseAnalytics'}
            onClick={() => onTabChange('expenseAnalytics')}
            className={`relative z-10 w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-bold transition-colors duration-200 cursor-pointer ${
              activeTab === 'expenseAnalytics'
                ? 'text-white'
                : 'text-stone-600 hover:bg-stone-50 hover:text-stone-900'
            }`}
          >
            <div className="flex items-center gap-3">
              <BarChart3 className="w-4 h-4" />
              <span>Análisis de Gastos</span>
            </div>
            <span
              className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-full ${
                activeTab === 'expenseAnalytics'
                  ? 'bg-white/20 text-white'
                  : 'bg-bodegon/5 text-bodegon border border-bodegon/20'
              }`}
            >
              Métricas
            </span>
          </button>
        </nav>
      </div>

      {/* Footer Info & Configuración */}
      <div className="p-3 border-t border-stone-100 space-y-1 shrink-0 bg-white">
        <button
          onClick={onChangeExchangeRateClick}
          className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold text-stone-600 hover:bg-stone-50 hover:text-stone-900 transition"
        >
          <div className="flex items-center gap-2">
            <CircleDollarSign className="w-4 h-4 text-bodegon" />
            <span>Tasa de Cambio</span>
          </div>
          <span className="font-mono font-bold text-stone-900 text-[11px]">
            C$ {state.defaultExchangeRate.toFixed(2)}
          </span>
        </button>

        <button
          onClick={onOpenSettingsClick}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-stone-600 hover:bg-stone-50 hover:text-stone-900 transition"
        >
          <Settings className="w-4 h-4 text-stone-400" />
          <span>Configuración & Catálogos</span>
        </button>

        {/* Banners de Actualización Automática */}
        {updateStatus.status === 'idle' && (
          <button
            onClick={handleCheckUpdates}
            disabled={checkingUpdate}
            className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-semibold text-stone-600 hover:bg-stone-50 hover:text-stone-900 border border-stone-200 transition cursor-pointer"
            title="Comprobar si existe una nueva versión en GitHub"
          >
            <div className="flex items-center gap-2">
              <RefreshCw className={`w-3.5 h-3.5 text-stone-400 ${checkingUpdate ? 'animate-spin text-bodegon' : ''}`} />
              <span>{checkingUpdate ? 'Buscando...' : 'Buscar actualización'}</span>
            </div>
            {updateFeedback && (
              <span className="text-[10px] text-bodegon font-bold">{updateFeedback}</span>
            )}
          </button>
        )}

        {updateStatus.status === 'downloading' && (
          <div className="p-2.5 rounded-xl bg-dorado/10 border border-dorado/40 text-dorado-tinta text-[11px] font-bold flex items-center gap-2">
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-dorado-tinta shrink-0" />
            <span>Descargando actualización ({updateStatus.percent || 0}%)...</span>
          </div>
        )}

        {updateStatus.status === 'ready' && (
          <button
            onClick={() => window.electronAPI?.restartAndInstall?.()}
            className="w-full p-2.5 rounded-xl bg-bodegon hover:bg-bodegon text-white text-xs font-black flex items-center justify-center gap-2 shadow-md transition cursor-pointer"
            title="Haz clic para reiniciar la aplicación e instalar la nueva versión"
          >
            <Sparkles className="w-4 h-4 shrink-0 text-dorado-vivo" />
            <span>Actualización lista • Reiniciar</span>
          </button>
        )}

        <button
          onClick={() => setShowAbout(true)}
          className="w-full pt-2 px-3 flex items-center justify-between gap-2 text-[10px] font-semibold text-stone-400 hover:text-stone-600 transition cursor-pointer"
          title="Acerca de Bodegón Control"
        >
          <span className="flex flex-col items-start gap-1">
            <img src={tegaImg} alt="TEGA" className="h-3 w-auto" />
            <span>Bodegón Control {appVersion}</span>
          </span>
          <span className="inline-flex items-center gap-1 text-bodegon font-bold">
            <ShieldCheck className="w-3 h-3" /> Seguro
          </span>
        </button>
      </div>
      {showAbout && <AboutModal version={appVersion} onClose={() => setShowAbout(false)} />}
    </aside>
  );
};
