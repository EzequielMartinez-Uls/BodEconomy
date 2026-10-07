import React, { useState, useEffect, useMemo } from 'react';
import { AppState, CashShift, PettyCashShift, PettyCashTransaction, TablewareItem, TablewareLoss, isOpeningPettyCashTx } from './types';
import { loadState, saveState, INITIAL_STATE } from './services/storage';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { GeneralCashView } from './components/GeneralCashView';
import { PettyCashView } from './components/PettyCashView';
import { TablewareView } from './components/TablewareView';
import { DailyEarningsView } from './components/DailyEarningsView';
import { PayrollView } from './components/payroll/PayrollView';
import { OpeningModal } from './components/OpeningModal';
import { ClosingModal } from './components/ClosingModal';
import { SettingsModal } from './components/SettingsModal';
import { AdminSelectModal } from './components/AdminSelectModal';
import { ExchangeRateModal } from './components/ExchangeRateModal';
import {
  syncOpenShiftToCloud,
  syncCloseShiftToCloud,
  syncTransactionToCloud,
  updateTransactionInCloud,
  deleteTransactionFromCloud,
  syncGeneralCashShiftToCloud,
  syncGeneralCashOpeningToCloud,
  syncCancelShiftToCloud,
  syncCancelPettyCashShiftToCloud,
  syncDeleteOpeningTransfersFromCloud,
  syncFullDayClosureToCloud,
  fetchFullCloudState,
  parseShiftFromJornada,
  mapCloudCategoryToLocal,
  isFondeoTransaction,
  processOutboxQueue,
  supabase,
} from './services/supabaseSync';
import { getLocalTodayStr, getLocalDateTimeStr, extractLocalDateStr } from './utils/dateUtils';
import {
  MOCK_YESTERDAY_DATE,
  MOCK_YESTERDAY_SHIFT,
  MOCK_YESTERDAY_PETTY_SHIFT,
  MOCK_YESTERDAY_PETTY_TRANSACTIONS,
} from './services/mockTestDay';

export function App() {
  const [state, setState] = useState<AppState>(loadState);
  const [activeTab, setActiveTab] = useState<'generalCash' | 'pettyCash' | 'tableware' | 'dailyEarnings' | 'payroll'>('generalCash');
  const [payrollSubTab, setPayrollSubTab] = useState<'quincenal' | 'especial' | 'incidencias'>('quincenal');


  // Modals
  const [openingModalOpen, setOpeningModalOpen] = useState(false);
  const [closingModalOpen, setClosingModalOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [adminSelectModalOpen, setAdminSelectModalOpen] = useState(false);
  const [exchangeRateModalOpen, setExchangeRateModalOpen] = useState(false);

  // Estado del Actualizador Automático de Electron
  const [updateInfo, setUpdateInfo] = useState<{
    status: 'idle' | 'checking' | 'available' | 'downloading' | 'downloaded' | 'error';
    version?: string;
    progress?: number;
    errorMsg?: string;
  }>({ status: 'idle' });

  // Escuchar eventos de actualización de electron-updater
  useEffect(() => {
    if (!window.electronAPI) return;

    const unregAvail = window.electronAPI.onUpdateAvailable?.((info) => {
      setUpdateInfo({ status: 'available', version: info?.version });
    });

    const unregProg = window.electronAPI.onUpdateProgress?.((prog) => {
      setUpdateInfo((prev) => ({
        ...prev,
        status: 'downloading',
        progress: Math.round(prog?.percent || 0),
      }));
    });

    const unregDown = window.electronAPI.onUpdateDownloaded?.((info) => {
      setUpdateInfo({ status: 'downloaded', version: info?.version });
    });

    return () => {
      unregAvail?.();
      unregProg?.();
      unregDown?.();
    };
  }, []);

  // Auto-save on any state change
  useEffect(() => {
    saveState(state);
  }, [state]);

  const lastClosedShift = useMemo(() => {
    const closed = state.shiftHistory.filter((s) => s.status === 'CLOSED');
    if (closed.length > 0) {
      return [...closed].sort((a, b) => b.date.localeCompare(a.date))[0];
    }
    return state.shiftHistory[0] || null;
  }, [state.shiftHistory]);

  // Sincronización en tiempo real con Supabase (Nube Interconectada PC + Móvil)
  useEffect(() => {
    // 1. Al iniciar, chequear estado completo de la nube y sincronizar con otras PCs y la web
    fetchFullCloudState().then(({ activeShift, activePettyShift, shiftHistory: cloudHistory, gastos }) => {
      setState((prev) => {
        const today = getLocalTodayStr();

        // 1. Unificar Historial de Turnos de Caja General
        const mergedHistory = [...cloudHistory];
        for (const localS of prev.shiftHistory) {
          if (!mergedHistory.some((c) => c.date === localS.date)) {
            mergedHistory.push(localS);
          }
        }
        mergedHistory.sort((a, b) => b.date.localeCompare(a.date));

        // 2. Determinar Turno Activo de Caja General
        let currentShift = prev.currentShift;
        if (activeShift) {
          currentShift = activeShift;
        } else if (currentShift && currentShift.date !== today) {
          currentShift = null;
        }

        // 3. Determinar Turno Activo de Caja Chica
        let currentPettyCashShift = prev.currentPettyCashShift;
        if (activePettyShift) {
          currentPettyCashShift = activePettyShift;
        } else if (currentPettyCashShift && currentPettyCashShift.date !== today) {
          currentPettyCashShift = null;
        }

        // 4. Limpiar residuos locales de apertura que causaban duplicados
        let updatedTxs = prev.pettyCashTransactions.filter(
          (t) => !t.id.startsWith('pct-init-')
        );

        if (gastos && gastos.length > 0) {
          for (const g of gastos) {
            let localDate = extractLocalDateStr(g.fecha_hora);
            if (g.jornada_id === 10) localDate = '2026-10-02';
            else if (g.jornada_id === 9) localDate = '2026-10-01';
            else if (g.jornada_id === 11) localDate = '2026-10-03';

            const isFondeo = isFondeoTransaction(g);
            const provLower = (g.proveedor || '').toLowerCase();
            const obsLower = (g.observaciones || '').toLowerCase();
            const concLower = (g.concepto || '').toLowerCase();
            const isOpeningTransfer = 
              obsLower.includes('[opening_transfer:true]') ||
              provLower.includes('traslado desde caja general') ||
              provLower.includes('traspaso desde caja general') ||
              concLower.includes('traspaso inicial') ||
              concLower.includes('deducido al abrir') ||
              obsLower.includes('deducido al abrir');

            // Filtrar y omitir registros residuales huérfanos de pruebas canceladas conocidas (ej: 13519 de la prueba del 2026-10-06)
            if (localDate === '2026-10-06' && Math.abs(Number(g.monto) - 13519) < 1 && (isOpeningTransfer || isFondeo)) {
              if (g.id) {
                deleteTransactionFromCloud(g.id).catch(() => {});
              }
              continue;
            }

            const cloudTx: PettyCashTransaction = {
              id: isOpeningTransfer ? `pct-transfer-open-${localDate}` : `pct-cloud-${g.id}`,
              shiftId: `pc-shift-${localDate}`,
              date: g.fecha_hora || `${localDate}T12:00:00`,
              type: isFondeo ? 'INFLOW' : 'EXPENSE',
              inflowSource: isOpeningTransfer ? 'TRASLADO_CAJA_GENERAL' : (isFondeo ? 'FONDO_INICIAL' : undefined),
              amount: Number(g.monto) || 0,
              method: g.metodo_pago === 'TRANSFERENCIA' ? 'TRANSFER' : g.metodo_pago === 'TARJETA' ? 'CARD' : 'CASH',
              vendor: g.proveedor || g.concepto || (isFondeo ? 'Fondeo Caja Chica' : 'Compra'),
              category: mapCloudCategoryToLocal(g.categoria),
              registeredBy: g.registrado_por || 'Eddy',
              notes: g.concepto || g.observaciones || '',
              cloudId: g.id,
            };

            const existingIdx = updatedTxs.findIndex((t) => {
              if (t.id === cloudTx.id || t.cloudId === g.id) return true;
              if (isOpeningTransfer && (t.inflowSource === 'TRASLADO_CAJA_GENERAL' || t.id.startsWith('pct-transfer-open-'))) {
                const sameDate = extractLocalDateStr(t.date) === localDate || t.shiftId === `pc-shift-${localDate}`;
                if (sameDate) return true;
              }
              const sameAmount = Math.abs(t.amount - cloudTx.amount) < 0.01;
              const sameVendor = t.vendor.trim().toLowerCase() === cloudTx.vendor.trim().toLowerCase();
              if (sameAmount && sameVendor && !t.cloudId) return true;
              return false;
            });

            if (existingIdx !== -1) {
              updatedTxs[existingIdx] = {
                ...updatedTxs[existingIdx],
                id: isOpeningTransfer ? `pct-transfer-open-${localDate}` : `pct-cloud-${g.id}`,
                cloudId: g.id,
                shiftId: cloudTx.shiftId,
                date: cloudTx.date,
                type: cloudTx.type,
                inflowSource: cloudTx.inflowSource || updatedTxs[existingIdx].inflowSource,
                method: cloudTx.method,
                amount: cloudTx.amount,
                notes: cloudTx.notes,
              };
            } else {
              updatedTxs.push(cloudTx);
            }
          }
        }

        // Limpiar residuos huérfanos locales de la prueba cancelada del 2026-10-06 (13519)
        updatedTxs = updatedTxs.filter((t) => {
          const isOct6 = extractLocalDateStr(t.date) === '2026-10-06' || t.shiftId === 'pc-shift-2026-10-06';
          if (isOct6 && Math.abs(t.amount - 13519) < 1) {
            return false;
          }
          return true;
        });

        // Auto-sincronizar transacciones locales pendientes que no se hayan subido a la nube
        const pendingLocalTxs = updatedTxs.filter(
          (t) => !t.cloudId && !t.id.startsWith('pct-cloud-') && !t.id.startsWith('opening-') && !t.id.startsWith('pct-transfer-open-')
        );
        if (pendingLocalTxs.length > 0) {
          pendingLocalTxs.forEach((ptx) => {
            syncTransactionToCloud(ptx).then((newCloudId) => {
              if (newCloudId) {
                setState((current) => ({
                  ...current,
                  pettyCashTransactions: current.pettyCashTransactions.map((t) =>
                    t.id === ptx.id ? { ...t, id: `pct-cloud-${newCloudId}`, cloudId: newCloudId } : t
                  ),
                }));
              }
            });
          });
        }

        // Recalcular saldo de caja chica si está abierta estrictamente por shiftId
        let recalculatedPettyBalance = prev.pettyCashBalance;
        if (currentPettyCashShift && currentPettyCashShift.status === 'OPEN') {
          const shiftId = currentPettyCashShift.id;
          const openTxs = updatedTxs.filter(
            (t) => t.shiftId === shiftId && !isOpeningPettyCashTx(t)
          );
          const openInflows = openTxs.filter((t) => t.type === 'INFLOW').reduce((sum, t) => sum + t.amount, 0);
          const openCashExpenses = openTxs.filter((t) => t.type === 'EXPENSE' && (t.method === 'CASH' || !t.method)).reduce((sum, t) => sum + t.amount, 0);
          recalculatedPettyBalance = parseFloat((currentPettyCashShift.initialBalance + openInflows - openCashExpenses).toFixed(2));
        }

        return {
          ...prev,
          currentShift,
          shiftHistory: mergedHistory,
          currentPettyCashShift,
          pettyCashTransactions: updatedTxs,
          pettyCashBalance: recalculatedPettyBalance,
        };
      });
    });

    // 2. Escuchar cambios de Supabase Realtime
    const channel = supabase
      .channel('bodegon-control-desktop-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'compras_gastos' },
        (payload: any) => {
          const g = payload.new;
          const localDate = extractLocalDateStr(g.fecha_hora);
          const newTx: PettyCashTransaction = {
            id: `pct-cloud-${g.id}`,
            shiftId: `pc-shift-${localDate}`,
            date: g.fecha_hora || getLocalDateTimeStr(),
            type: isFondeoTransaction(g) ? 'INFLOW' : 'EXPENSE',
            amount: Number(g.monto) || 0,
            method: g.metodo_pago === 'TRANSFERENCIA' ? 'TRANSFER' : g.metodo_pago === 'TARJETA' ? 'CARD' : 'CASH',
            vendor: g.proveedor || g.concepto || (isFondeoTransaction(g) ? 'Depósito Móvil' : 'Compra Móvil'),
            category: mapCloudCategoryToLocal(g.categoria),
            registeredBy: g.registrado_por || 'Celular Jefe',
            notes: g.concepto || g.observaciones || '',
            cloudId: g.id,
          };

          setState((prev) => {
            const existingIndex = prev.pettyCashTransactions.findIndex((t) => {
              if (t.id === newTx.id || t.id === `pct-cloud-${g.id}` || t.cloudId === g.id) return true;
              const sameDate = extractLocalDateStr(t.date) === extractLocalDateStr(newTx.date);
              const sameAmount = Math.abs(t.amount - newTx.amount) < 0.01;
              const sameVendor = t.vendor.trim().toLowerCase() === newTx.vendor.trim().toLowerCase();
              if (sameDate && sameAmount && sameVendor && !t.cloudId) return true;
              return false;
            });

            if (existingIndex !== -1) {
              // Ya existe localmente. Actualizamos el registro local con el cloudId oficial de Supabase
              const updatedList = [...prev.pettyCashTransactions];
              const existing = updatedList[existingIndex];
              updatedList[existingIndex] = {
                ...existing,
                id: `pct-cloud-${g.id}`,
                cloudId: g.id,
                shiftId: newTx.shiftId,
                date: newTx.date,
                type: newTx.type,
                method: newTx.method,
                amount: newTx.amount,
                notes: newTx.notes,
              };
              return { ...prev, pettyCashTransactions: updatedList };
            }

            const isCash = newTx.method === 'CASH';
            const belongsToActiveShift = prev.currentPettyCashShift && newTx.shiftId === prev.currentPettyCashShift.id;
            const delta = belongsToActiveShift ? (isCash ? (newTx.type === 'INFLOW' ? newTx.amount : -newTx.amount) : 0) : 0;

            return {
              ...prev,
              pettyCashTransactions: [newTx, ...prev.pettyCashTransactions],
              pettyCashBalance: Math.max(0, parseFloat((prev.pettyCashBalance + delta).toFixed(2))),
            };
          });
          playSound([659.25, 880]);
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'compras_gastos' },
        (payload: any) => {
          const oldId = payload.old?.id;
          if (!oldId) return;

          setState((prev) => {
            const target = prev.pettyCashTransactions.find(
              (t) => t.id === `pct-cloud-${oldId}` || t.cloudId === oldId
            );
            if (!target) return prev;

            const isExpense = target.type === 'EXPENSE';
            const isCash = target.method === 'CASH';
            // Solo reintegra a la gaveta de efectivo si el gasto se pagó en efectivo
            const balanceChange = isExpense ? (isCash ? target.amount : 0) : -target.amount;

            return {
              ...prev,
              pettyCashTransactions: prev.pettyCashTransactions.filter((t) => t !== target),
              pettyCashBalance: Math.max(0, parseFloat((prev.pettyCashBalance + balanceChange).toFixed(2))),
            };
          });
          playSound([400, 300]);
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'compras_gastos' },
        (payload: any) => {
          const g = payload.new;
          if (!g) return;
          const localDate = extractLocalDateStr(g.fecha_hora);

          setState((prev) => {
            const updated = prev.pettyCashTransactions.map((t) => {
              if (t.id === `pct-cloud-${g.id}` || t.cloudId === g.id) {
                return {
                  ...t,
                  type: isFondeoTransaction(g) ? ('INFLOW' as const) : ('EXPENSE' as const),
                  amount: Number(g.monto) || 0,
                  method: g.metodo_pago === 'TRANSFERENCIA' ? ('TRANSFER' as const) : g.metodo_pago === 'TARJETA' ? ('CARD' as const) : ('CASH' as const),
                  vendor: g.proveedor || g.concepto || (isFondeoTransaction(g) ? 'Fondeo Caja Chica' : 'Compra'),
                  category: mapCloudCategoryToLocal(g.categoria),
                  notes: g.concepto || g.observaciones || '',
                  shiftId: `pc-shift-${localDate}`,
                };
              }
              return t;
            });
            return { ...prev, pettyCashTransactions: updated };
          });
          playSound([587.33, 880]);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'jornadas_diarias' },
        (payload: any) => {
          const j = payload.new;
          if (!j || !j.fecha) return;

          setState((prev) => {
            const today = getLocalTodayStr();
            const existingForDate =
              prev.currentShift?.date === j.fecha
                ? prev.currentShift
                : prev.shiftHistory.find((s) => s.date === j.fecha);

            const parsedShift = parseShiftFromJornada(j, existingForDate);

            let updatedCurrent = prev.currentShift;
            let updatedHistory = [...prev.shiftHistory];
            let updatedPettyShift = prev.currentPettyCashShift;

            if (j.estado === 'ABIERTA') {
              if (j.fecha === today) {
                updatedCurrent = parsedShift;
              }
            } else if (j.estado === 'CERRADA') {
              if (updatedCurrent?.date === j.fecha) {
                updatedCurrent = null;
              }
              if (updatedPettyShift?.date === j.fecha) {
                updatedPettyShift = null;
              }

              const idx = updatedHistory.findIndex((s) => s.date === j.fecha);
              if (idx !== -1) {
                updatedHistory[idx] = parsedShift;
              } else {
                updatedHistory.unshift(parsedShift);
              }
              updatedHistory.sort((a, b) => b.date.localeCompare(a.date));
            } else if (j.estado === 'CANCELADA') {
              if (updatedCurrent?.date === j.fecha) {
                updatedCurrent = null;
              }
              if (updatedPettyShift?.date === j.fecha) {
                updatedPettyShift = null;
              }
              updatedHistory = updatedHistory.filter((s) => s.date !== j.fecha);
            }

            return {
              ...prev,
              currentShift: updatedCurrent,
              shiftHistory: updatedHistory,
              currentPettyCashShift: updatedPettyShift,
            };
          });
          playSound([659.25, 880]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Proceso en segundo plano: procesar cola outbox cada 15 segundos para garantizar entrega a Supabase
  useEffect(() => {
    const timer = setInterval(() => {
      setState((prev) => {
        const hasPending = prev.pettyCashTransactions.some(
          (t) => !t.cloudId && !t.id.startsWith('pct-cloud-') && !t.id.startsWith('opening-') && !t.id.startsWith('pct-init-')
        );
        if (!hasPending) return prev;

        processOutboxQueue(prev.pettyCashTransactions).then(({ updated, syncedCount }) => {
          if (syncedCount > 0) {
            setState((curr) => ({
              ...curr,
              pettyCashTransactions: updated,
            }));
          }
        });
        return prev;
      });
    }, 15000);

    return () => clearInterval(timer);
  }, []);

  // Web Audio chime feedback
  const playSound = (freqs: number[]) => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.12, ctx.currentTime + idx * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.1 + 0.25);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + idx * 0.1);
        osc.stop(ctx.currentTime + idx * 0.1 + 0.25);
      });
    } catch (e) {
      // Audio context might be restricted before interaction
    }
  };

  // Handlers
  const handleConfirmOpenShift = (
    newShift: CashShift,
    updatedPreviousShift?: CashShift,
    pettyOpeningData?: {
      initialBalance: number;
      previousDayRemaining: number;
      generalCashTransfer: number;
      bossContribution: number;
    }
  ) => {
    const transferAmount = pettyOpeningData?.generalCashTransfer !== undefined
      ? pettyOpeningData.generalCashTransfer
      : (newShift.openingTransferToPettyCash || newShift.transferToPettyCash || 0);

    let transferTxToSync: PettyCashTransaction | null = null;
    let newPettyShiftToSync: PettyCashShift | null = null;

    setState((prev) => {
      let updatedHistory = prev.shiftHistory;
      if (updatedPreviousShift) {
        updatedHistory = updatedHistory.map((s) =>
          s.id === updatedPreviousShift.id || s.date === updatedPreviousShift.date
            ? updatedPreviousShift
            : s
        );
      }

      let updatedPettyTxs = prev.pettyCashTransactions;
      let updatedPettyBalance = prev.pettyCashBalance;
      let updatedPettyShift = prev.currentPettyCashShift;

      // Si se abre también Caja Chica a través del wizard unificado
      if (pettyOpeningData) {
        const createdPettyShift: PettyCashShift = {
          id: `pc-shift-${newShift.date}`,
          date: newShift.date,
          status: 'OPEN',
          openedBy: newShift.openedBy,
          openedAt: newShift.openedAt,
          previousDayRemaining: pettyOpeningData.previousDayRemaining,
          generalCashTransfer: transferAmount,
          bossContribution: pettyOpeningData.bossContribution || 0,
          initialBalance: pettyOpeningData.initialBalance,
          openingNotes: `Apertura unificada del día ${newShift.date}`,
        };
        newPettyShiftToSync = createdPettyShift;
        updatedPettyShift = createdPettyShift;
        updatedPettyBalance = pettyOpeningData.initialBalance;

        // Limpiar residuos de fondeos iniciales previos
        updatedPettyTxs = updatedPettyTxs.filter(
          (t) => !t.id.startsWith('pct-init-boss-') && !t.id.startsWith('pct-init-gen-')
        );
      }

      if (transferAmount > 0) {
        const transferTx: PettyCashTransaction = {
          id: `pct-transfer-open-${Date.now()}`,
          shiftId: `pc-shift-${newShift.date}`,
          date: newShift.openedAt,
          type: 'INFLOW',
          inflowSource: 'TRASLADO_CAJA_GENERAL',
          amount: transferAmount,
          method: 'CASH',
          vendor: 'Traslado desde Caja General',
          category: 'OTROS',
          registeredBy: newShift.openedBy,
          notes: `Traspaso inicial deducido al abrir Caja General (C$ ${transferAmount.toFixed(2)})`,
        };
        transferTxToSync = transferTx;
        updatedPettyTxs = [transferTx, ...updatedPettyTxs];

        if (!pettyOpeningData) {
          updatedPettyBalance += transferAmount;
          if (updatedPettyShift) {
            updatedPettyShift = {
              ...updatedPettyShift,
              generalCashTransfer: (updatedPettyShift.generalCashTransfer || 0) + transferAmount,
              initialBalance: updatedPettyShift.initialBalance + transferAmount,
            };
          }
        }
      }

      const openDetails = transferAmount > 0
        ? `Apertura unificada: C$ ${newShift.totalOpeningEquivNIO.toFixed(2)} en gaveta General y C$ ${updatedPettyBalance.toFixed(2)} en Caja Chica (Traslado: C$ ${transferAmount.toFixed(2)})`
        : `Apertura realizada con C$ ${newShift.totalOpeningEquivNIO.toFixed(2)} en Caja General`;

      return {
        ...prev,
        currentShift: newShift,
        shiftHistory: updatedHistory,
        pettyCashTransactions: updatedPettyTxs,
        pettyCashBalance: updatedPettyBalance,
        currentPettyCashShift: updatedPettyShift,
        auditLogs: [
          {
            id: `log-${Date.now()}`,
            timestamp: new Date().toISOString(),
            user: newShift.openedBy,
            action: 'APERTURA_TURNO',
            details: `${openDetails}${
              updatedPreviousShift ? ' • (Vouchers de anoche auditados y corroborados)' : ''
            }`,
          },
          ...prev.auditLogs,
        ],
      };
    });
    playSound([440, 554.37, 659.25]); // Do mayor alegre

    // Sincronizar apertura de Caja General con Supabase
    syncGeneralCashOpeningToCloud(newShift).catch((err) =>
      console.warn('⚠️ Error sincronizando apertura con la nube:', err)
    );

    if (newPettyShiftToSync) {
      syncOpenShiftToCloud(newPettyShiftToSync).catch((err) =>
        console.warn('⚠️ Error sincronizando apertura de caja chica con la nube:', err)
      );
    }

    if (transferTxToSync) {
      syncTransactionToCloud(transferTxToSync).catch((err) =>
        console.warn('⚠️ Error sincronizando traspaso a caja chica en la nube:', err)
      );
    }

    if (updatedPreviousShift) {
      syncGeneralCashShiftToCloud(updatedPreviousShift).catch((err) =>
        console.warn('⚠️ Error sincronizando cierre previo corroborado con la nube:', err)
      );
    }
  };

  const handleConfirmCloseShift = (closedShift: CashShift) => {
    let closedPettyToSync: PettyCashShift | null = null;

    setState((prev) => {
      let updatedPetty = prev.pettyCashTransactions;
      let updatedPettyBalance = prev.pettyCashBalance;

      // Si Caja Chica tenía una jornada abierta, cerrarla de forma sincronizada con el cierre general del día
      let updatedPettyShift = prev.currentPettyCashShift;
      let updatedPettyHistory = prev.pettyCashShiftHistory;
      if (updatedPettyShift && updatedPettyShift.status === 'OPEN') {
        const closedPetty: PettyCashShift = {
          ...updatedPettyShift,
          status: 'CLOSED',
          closedBy: closedShift.closedBy || prev.activeAdminName,
          closedAt: closedShift.closedAt || new Date().toISOString(),
          actualCashCounted: updatedPettyBalance,
          expectedBalance: updatedPettyBalance,
          difference: 0,
          auditStatus: 'SQUARED',
          closingNotes: 'Cierre automático unificado con Caja General',
        };
        closedPettyToSync = closedPetty;
        updatedPettyHistory = [closedPetty, ...prev.pettyCashShiftHistory];
        updatedPettyShift = null;
      }

      return {
        ...prev,
        currentShift: null,
        shiftHistory: [closedShift, ...prev.shiftHistory],
        currentPettyCashShift: updatedPettyShift,
        pettyCashShiftHistory: updatedPettyHistory,
        pettyCashTransactions: updatedPetty,
        pettyCashBalance: updatedPettyBalance,
        auditLogs: [
          {
            id: `log-${Date.now()}`,
            timestamp: new Date().toISOString(),
            user: closedShift.closedBy || 'Admin',
            action: 'CIERRE_TURNO',
            details: `Cierre de turno realizado. Diagnóstico: ${closedShift.auditStatus} (Dif: C$ ${closedShift.differenceNIO?.toFixed(2)})`,
          },
          ...prev.auditLogs,
        ],
      };
    });

    playSound([523.25, 659.25, 783.99, 1046.5]); // Acorde triunfal

    // Cierre atómico y unificado en Supabase (evita condiciones de carrera entre Caja General y Caja Chica)
    syncFullDayClosureToCloud({
      generalShift: closedShift,
      pettyShift: closedPettyToSync,
    }).catch((err) =>
      console.warn('⚠️ Error sincronizando cierre unificado de caja general:', err)
    );
  };

  const handleUpdateShift = (updatedShift: CashShift) => {
    setState((prev) => {
      let updatedCurrent = prev.currentShift;
      let updatedHistory = [...prev.shiftHistory];

      if (updatedCurrent && updatedCurrent.id === updatedShift.id) {
        updatedCurrent = updatedShift;
      }

      const idx = updatedHistory.findIndex((s) => s.id === updatedShift.id);
      if (idx !== -1) {
        updatedHistory[idx] = updatedShift;
      }

      return {
        ...prev,
        currentShift: updatedCurrent,
        shiftHistory: updatedHistory,
        auditLogs: [
          {
            id: `log-${Date.now()}`,
            timestamp: new Date().toISOString(),
            user: prev.activeAdminName,
            action: 'CORRECCION_TURNO',
            details: `Ajuste/Corrección realizada al turno ${updatedShift.date} (${updatedShift.id})`,
          },
          ...prev.auditLogs,
        ],
      };
    });

    syncGeneralCashShiftToCloud(updatedShift).catch((err) =>
      console.warn('⚠️ Error sincronizando turno corregido:', err)
    );
  };

  const handleCancelOpenShift = () => {
    const shiftToCancel = state.currentShift;
    const cancelDate = shiftToCancel?.date;
    setState((prev) => {
      if (!prev.currentShift) return prev;
      return {
        ...prev,
        currentShift: null,
        pettyCashTransactions: prev.pettyCashTransactions.filter((t) => {
          if (!cancelDate) return true;
          const isThisDate = extractLocalDateStr(t.date) === cancelDate || t.shiftId === `pc-shift-${cancelDate}`;
          if (isThisDate && (isOpeningPettyCashTx(t) || t.inflowSource === 'TRASLADO_CAJA_GENERAL' || t.id.startsWith('pct-transfer-open-'))) {
            return false;
          }
          return true;
        }),
        auditLogs: [
          {
            id: `log-${Date.now()}`,
            timestamp: new Date().toISOString(),
            user: prev.activeAdminName,
            action: 'CANCELAR_TURNO',
            details: `Turno abierto del día ${prev.currentShift.date} cancelado por ${prev.activeAdminName}`,
          },
          ...prev.auditLogs,
        ],
      };
    });

    if (cancelDate) {
      syncCancelShiftToCloud(cancelDate).catch((err) =>
        console.warn('⚠️ Error al cancelar jornada en la nube:', err)
      );
    }
  };

  const handleCancelPettyCashShift = () => {
    const pettyToCancel = state.currentPettyCashShift;
    const cancelDate = pettyToCancel?.date;
    setState((prev) => {
      if (!prev.currentPettyCashShift) return prev;
      return {
        ...prev,
        currentPettyCashShift: null,
        pettyCashTransactions: prev.pettyCashTransactions.filter((t) => {
          if (!cancelDate) return true;
          const isThisDate = extractLocalDateStr(t.date) === cancelDate || t.shiftId === `pc-shift-${cancelDate}`;
          if (
            isThisDate &&
            (isOpeningPettyCashTx(t) ||
              t.inflowSource === 'TRASLADO_CAJA_GENERAL' ||
              t.id.startsWith('pct-transfer-open-') ||
              t.id.startsWith('pct-init-'))
          ) {
            return false;
          }
          return true;
        }),
        auditLogs: [
          {
            id: `log-${Date.now()}`,
            timestamp: new Date().toISOString(),
            user: prev.activeAdminName,
            action: 'CANCELAR_TURNO_CAJA_CHICA',
            details: `Turno de Caja Chica del día ${prev.currentPettyCashShift.date} cancelado por ${prev.activeAdminName}`,
          },
          ...prev.auditLogs,
        ],
      };
    });

    if (cancelDate) {
      syncCancelPettyCashShiftToCloud(cancelDate).catch((err) =>
        console.warn('⚠️ Error al cancelar jornada de caja chica en la nube:', err)
      );
    }
  };

  const handleUpdateExpenseCategories = (categories: string[]) => {
    setState((prev) => ({
      ...prev,
      expenseCategories: categories,
      auditLogs: [
        {
          id: `log-${Date.now()}`,
          timestamp: new Date().toISOString(),
          user: prev.activeAdminName,
          action: 'ACTUALIZAR_CATEGORIAS_GASTO',
          details: `Categorías de gastos actualizadas: ${categories.length} categorías configuradas`,
        },
        ...prev.auditLogs,
      ],
    }));
  };

  const handleAddPettyCashTransaction = async (tx: PettyCashTransaction) => {
    const txWithStatus: PettyCashTransaction = {
      ...tx,
      syncStatus: 'PENDING',
    };

    setState((prev) => {
      const isExpense = txWithStatus.type === 'EXPENSE';
      const isCash = txWithStatus.method === 'CASH';
      const isForActivePettyShift = prev.currentPettyCashShift && txWithStatus.shiftId === prev.currentPettyCashShift.id;
      // Solo las compras en efectivo de la jornada ACTIVA tocan el saldo físico de la gaveta de hoy
      const balanceChange = isForActivePettyShift
        ? (isExpense ? (isCash ? -txWithStatus.amount : 0) : txWithStatus.amount)
        : 0;

      return {
        ...prev,
        pettyCashBalance: Math.max(0, parseFloat((prev.pettyCashBalance + balanceChange).toFixed(2))),
        pettyCashTransactions: [txWithStatus, ...prev.pettyCashTransactions],
        auditLogs: [
          {
            id: `log-${Date.now()}`,
            timestamp: new Date().toISOString(),
            user: txWithStatus.registeredBy,
            action: isExpense ? 'GASTO_CAJA_CHICA' : 'REEMBOLSO_CAJA_CHICA',
            details: `${txWithStatus.vendor} - C$ ${txWithStatus.amount.toFixed(2)} (${txWithStatus.method === 'CASH' ? 'Efectivo Gaveta' : 'Transferencia Banco'})`,
          },
          ...prev.auditLogs,
        ],
      };
    });

    playSound([587.33, 880]);

    // Sincronizar de inmediato a Supabase
    try {
      const cloudId = await syncTransactionToCloud(txWithStatus);
      if (cloudId) {
        setState((prev) => ({
          ...prev,
          pettyCashTransactions: prev.pettyCashTransactions.map((t) =>
            t.id === txWithStatus.id
              ? { ...t, id: `pct-cloud-${cloudId}`, cloudId, syncStatus: 'SYNCED', syncError: undefined }
              : t
          ),
        }));
      } else {
        setState((prev) => ({
          ...prev,
          pettyCashTransactions: prev.pettyCashTransactions.map((t) =>
            t.id === txWithStatus.id
              ? { ...t, syncStatus: 'PENDING', syncError: 'Pendiente de conexión con la nube' }
              : t
          ),
        }));
      }
    } catch (err: any) {
      setState((prev) => ({
        ...prev,
        pettyCashTransactions: prev.pettyCashTransactions.map((t) =>
          t.id === txWithStatus.id
            ? { ...t, syncStatus: 'PENDING', syncError: err?.message || 'Error de red' }
            : t
        ),
      }));
    }
  };

  const handleForceSyncPending = async () => {
    setState((prev) => {
      processOutboxQueue(prev.pettyCashTransactions).then(({ updated, syncedCount }) => {
        if (syncedCount > 0) {
          setState((curr) => ({
            ...curr,
            pettyCashTransactions: updated,
          }));
          alert(`✅ ¡Excelente! Se sincronizaron exitosamente ${syncedCount} movimientos pendientes con la nube.`);
        } else {
          alert('ℹ️ No hay movimientos pendientes o la nube ya está completamente al día.');
        }
      });
      return prev;
    });
  };

  const handleDeletePettyCashTransaction = (txId: string) => {
    let deletedTx: PettyCashTransaction | null = null;

    setState((prev) => {
      const target = prev.pettyCashTransactions.find((t) => t.id === txId);
      if (!target) return prev;
      deletedTx = target;

      const isExpense = target.type === 'EXPENSE';
      const isCash = target.method === 'CASH';
      const isForActivePettyShift = prev.currentPettyCashShift && target.shiftId === prev.currentPettyCashShift.id;
      // Solo restaurar saldo a la gaveta si pertenecía a la jornada abierta y se había pagado en efectivo
      const balanceChange = isForActivePettyShift
        ? (isExpense ? (isCash ? target.amount : 0) : -target.amount)
        : 0;
      const updatedBalance = Math.max(0, parseFloat((prev.pettyCashBalance + balanceChange).toFixed(2)));

      return {
        ...prev,
        pettyCashBalance: updatedBalance,
        pettyCashTransactions: prev.pettyCashTransactions.filter((t) => t.id !== txId),
        auditLogs: [
          {
            id: `log-${Date.now()}`,
            timestamp: new Date().toISOString(),
            user: prev.activeAdminName,
            action: isExpense ? 'ELIMINACION_GASTO' : 'ELIMINACION_FONDEO',
            details: `Eliminado: ${target.vendor} - C$ ${target.amount.toFixed(2)} (${isExpense ? (isCash ? 'Restaurado a gaveta' : 'Transferencia Banco - No afectó gaveta') : 'Deducido de gaveta'})`,
          },
          ...prev.auditLogs,
        ],
      };
    });

    playSound([400, 300]);

    // Eliminar de Supabase en segundo plano si aplica
    if (deletedTx) {
      deleteTransactionFromCloud(deletedTx).catch((err) =>
        console.warn('⚠️ Error al eliminar movimiento en la nube:', err)
      );
    }
  };

  const handleEditPettyCashTransaction = async (updatedTx: PettyCashTransaction) => {
    setState((prev) => {
      const oldIndex = prev.pettyCashTransactions.findIndex(
        (t) => t.id === updatedTx.id || (updatedTx.cloudId && t.cloudId === updatedTx.cloudId)
      );
      if (oldIndex === -1) return prev;
      const oldTx = prev.pettyCashTransactions[oldIndex];

      const isForActiveShift =
        prev.currentPettyCashShift &&
        (oldTx.shiftId === prev.currentPettyCashShift.id || updatedTx.shiftId === prev.currentPettyCashShift.id);

      // Calcular diferencia de saldo en gaveta física
      let balanceChange = 0;
      if (isForActiveShift) {
        // Revertir efecto de oldTx
        const oldIsExpense = oldTx.type === 'EXPENSE';
        const oldIsCash = oldTx.method === 'CASH' || !oldTx.method;
        const oldDelta = oldIsExpense ? (oldIsCash ? -oldTx.amount : 0) : oldTx.amount;

        // Aplicar efecto de updatedTx
        const newIsExpense = updatedTx.type === 'EXPENSE';
        const newIsCash = updatedTx.method === 'CASH' || !updatedTx.method;
        const newDelta = newIsExpense ? (newIsCash ? -updatedTx.amount : 0) : updatedTx.amount;

        balanceChange = newDelta - oldDelta;
      }

      const updatedList = [...prev.pettyCashTransactions];
      updatedList[oldIndex] = {
        ...updatedTx,
        syncStatus: 'PENDING',
      };

      return {
        ...prev,
        pettyCashTransactions: updatedList,
        pettyCashBalance: Math.max(0, parseFloat((prev.pettyCashBalance + balanceChange).toFixed(2))),
        auditLogs: [
          {
            id: `log-${Date.now()}`,
            timestamp: new Date().toISOString(),
            user: prev.activeAdminName,
            action: 'EDITAR_GASTO_CAJA_CHICA',
            details: `Modificado: ${updatedTx.vendor} - C$ ${updatedTx.amount.toFixed(2)} (${updatedTx.method === 'CASH' ? 'Efectivo' : 'Transferencia'})`,
          },
          ...prev.auditLogs,
        ],
      };
    });

    playSound([659.25, 880]);

    // Sincronizar actualización con Supabase
    try {
      const ok = await updateTransactionInCloud(updatedTx);
      if (ok) {
        setState((prev) => ({
          ...prev,
          pettyCashTransactions: prev.pettyCashTransactions.map((t) =>
            t.id === updatedTx.id ? { ...t, syncStatus: 'SYNCED', syncError: undefined } : t
          ),
        }));
      }
    } catch (err: any) {
      console.warn('⚠️ Error sincronizando edición a la nube:', err);
    }
  };

  const handleOpenPettyCashShift = (newShift: PettyCashShift) => {
    syncOpenShiftToCloud(newShift);
    setState((prev) => {
      // Limpiar cualquier residuo de transacciones de apertura inicial
      const cleanedTxs = prev.pettyCashTransactions.filter(
        (t) => !t.id.startsWith('pct-init-boss-') && !t.id.startsWith('pct-init-gen-')
      );

      return {
        ...prev,
        currentPettyCashShift: newShift,
        pettyCashBalance: newShift.initialBalance,
        pettyCashTransactions: cleanedTxs,
        auditLogs: [
          {
            id: `log-${Date.now()}`,
            timestamp: new Date().toISOString(),
            user: newShift.openedBy,
            action: 'APERTURA_CAJA_CHICA',
            details: `Apertura diaria de Caja Chica. Fondo inicial: C$ ${newShift.initialBalance.toFixed(2)} (Restante: C$ ${newShift.previousDayRemaining.toFixed(2)}, Gen: C$ ${newShift.generalCashTransfer.toFixed(2)}, Jefe: C$ ${newShift.bossContribution.toFixed(2)})`,
          },
          ...prev.auditLogs,
        ],
      };
    });
    playSound([440, 554.37, 659.25]);
  };

  const handleClosePettyCashShift = (closedShift: PettyCashShift) => {
    syncCloseShiftToCloud(closedShift);
    setState((prev) => ({
      ...prev,
      currentPettyCashShift: null,
      pettyCashShiftHistory: [closedShift, ...prev.pettyCashShiftHistory],
      pettyCashBalance: closedShift.actualCashCounted ?? closedShift.expectedBalance ?? 0,
      auditLogs: [
        {
          id: `log-${Date.now()}`,
          timestamp: new Date().toISOString(),
          user: closedShift.closedBy || prev.activeAdminName,
          action: 'CIERRE_CAJA_CHICA',
          details: `Cierre de Caja Chica del ${closedShift.date}. Conteo físico: C$ ${(closedShift.actualCashCounted || 0).toFixed(2)}, Diagnóstico: ${closedShift.auditStatus} (Dif: C$ ${(closedShift.difference || 0).toFixed(2)})`,
        },
        ...prev.auditLogs,
      ],
    }));
    playSound([523.25, 659.25, 783.99, 1046.5]);
  };

  const handleUpdateTablewareStock = (itemId: string, newStock: number) => {
    setState((prev) => ({
      ...prev,
      tablewareItems: prev.tablewareItems.map((it) =>
        it.id === itemId
          ? { ...it, currentStock: newStock, lastAuditDate: new Date().toISOString().split('T')[0] }
          : it
      ),
      auditLogs: [
        {
          id: `log-${Date.now()}`,
          timestamp: new Date().toISOString(),
          user: prev.activeAdminName,
          action: 'AJUSTE_STOCK_MENAJE',
          details: `Item ${itemId} ajustado a ${newStock} uds`,
        },
        ...prev.auditLogs,
      ],
    }));
  };

  const handleAddTablewareLoss = (loss: TablewareLoss) => {
    setState((prev) => ({
      ...prev,
      tablewareLosses: [loss, ...prev.tablewareLosses],
      tablewareItems: prev.tablewareItems.map((it) =>
        it.id === loss.itemId
          ? { ...it, currentStock: Math.max(0, it.currentStock - loss.quantity) }
          : it
      ),
      auditLogs: [
        {
          id: `log-${Date.now()}`,
          timestamp: new Date().toISOString(),
          user: loss.registeredBy,
          action: 'ROTURA_MENAJE',
          details: `${loss.itemName}: -${loss.quantity} uds (${loss.reason})`,
        },
        ...prev.auditLogs,
      ],
    }));
    playSound([300, 250]); // Tono de advertencia
  };

  const handleAddTablewareItem = (item: TablewareItem) => {
    setState((prev) => ({
      ...prev,
      tablewareItems: [...prev.tablewareItems, item],
    }));
  };

  const handleUpdateExchangeRate = (rate: number) => {
    setState((prev) => ({
      ...prev,
      defaultExchangeRate: rate,
    }));
  };

  const handleAddAdmin = (name: string) => {
    setState((prev) => ({
      ...prev,
      availableAdmins: [...prev.availableAdmins, name],
    }));
  };

  const handleRemoveAdmin = (name: string) => {
    setState((prev) => ({
      ...prev,
      availableAdmins: prev.availableAdmins.filter((a) => a !== name),
      activeAdminName: prev.activeAdminName === name ? 'Eddy' : prev.activeAdminName,
    }));
  };

  const handleSelectAdmin = (name: string) => {
    setState((prev) => ({
      ...prev,
      activeAdminName: name,
    }));
  };

  const handleRestoreState = (importedState: AppState) => {
    setState(importedState);
  };

  const handleResetState = () => {
    try {
      localStorage.clear();
    } catch (e) {
      console.error(e);
    }
    setState(INITIAL_STATE);
  };

  const handleLoadMockData = () => {
    setState((prev) => {
      const updatedHistory = [
        MOCK_YESTERDAY_SHIFT,
        ...prev.shiftHistory.filter((s) => s.date !== MOCK_YESTERDAY_DATE),
      ].sort((a, b) => b.date.localeCompare(a.date));

      const updatedPettyHistory = [
        MOCK_YESTERDAY_PETTY_SHIFT,
        ...(prev.pettyCashShiftHistory || []).filter((s) => s.date !== MOCK_YESTERDAY_DATE),
      ].sort((a, b) => b.date.localeCompare(a.date));

      const updatedTxs = [
        ...prev.pettyCashTransactions.filter((tx) => !tx.id.startsWith(`pct-${MOCK_YESTERDAY_DATE}`)),
        ...MOCK_YESTERDAY_PETTY_TRANSACTIONS,
      ];

      return {
        ...prev,
        shiftHistory: updatedHistory,
        pettyCashShiftHistory: updatedPettyHistory,
        pettyCashTransactions: updatedTxs,
        pettyCashBalance: 660,
      };
    });
  };

  const handleUpdateShiftSales = (
    date: string,
    sales: {
      salesCash: number;
      cardsBAC: number;
      cardsFicohsa: number;
      cardsBanpro: number;
      cardsLafise: number;
      salesPedidosYa: number;
      tipsCollected?: number;
      notes?: string;
    }
  ) => {
    setState((prev) => {
      const totalCards = sales.cardsBAC + sales.cardsFicohsa + sales.cardsBanpro + sales.cardsLafise;
      const totalGrossSales = sales.salesCash + totalCards + sales.salesPedidosYa;

      let updatedCurrent = prev.currentShift;
      if (updatedCurrent && updatedCurrent.date === date) {
        updatedCurrent = {
          ...updatedCurrent,
          salesCashSystem: sales.salesCash,
          cardsBAC: sales.cardsBAC,
          cardsFicohsa: sales.cardsFicohsa,
          cardsBanpro: sales.cardsBanpro,
          cardsLafise: sales.cardsLafise,
          totalCards,
          salesPedidosYa: sales.salesPedidosYa,
          totalGrossSales,
          totalTipCollected: sales.tipsCollected || updatedCurrent.totalTipCollected || 0,
          loyverseValidation: {
            validated: true,
            salesCashLoyverse: sales.salesCash,
            cardsBAC: sales.cardsBAC,
            cardsFicohsa: sales.cardsFicohsa,
            cardsBanpro: sales.cardsBanpro,
            cardsLafise: sales.cardsLafise,
            totalCards,
            salesPedidosYa: sales.salesPedidosYa,
            totalLoyverseSales: totalGrossSales,
            notes: sales.notes,
          },
        };
      }

      let foundInHistory = false;
      const updatedHistory = prev.shiftHistory.map((s) => {
        if (s.date === date) {
          foundInHistory = true;
          return {
            ...s,
            salesCashSystem: sales.salesCash,
            cardsBAC: sales.cardsBAC,
            cardsFicohsa: sales.cardsFicohsa,
            cardsBanpro: sales.cardsBanpro,
            cardsLafise: sales.cardsLafise,
            totalCards,
            salesPedidosYa: sales.salesPedidosYa,
            totalGrossSales,
            totalTipCollected: sales.tipsCollected !== undefined ? sales.tipsCollected : s.totalTipCollected,
            loyverseValidation: {
              validated: true,
              salesCashLoyverse: sales.salesCash,
              cardsBAC: sales.cardsBAC,
              cardsFicohsa: sales.cardsFicohsa,
              cardsBanpro: sales.cardsBanpro,
              cardsLafise: sales.cardsLafise,
              totalCards,
              salesPedidosYa: sales.salesPedidosYa,
              totalLoyverseSales: totalGrossSales,
              notes: sales.notes,
            },
          };
        }
        return s;
      });

      if (!foundInHistory && (!updatedCurrent || updatedCurrent.date !== date)) {
        const newHistoricalShift: CashShift = {
          id: `shift-hist-${date}`,
          date,
          status: 'CLOSED',
          exchangeRate: prev.defaultExchangeRate,
          openedBy: prev.activeAdminName,
          openedAt: `${date}T08:00:00.000Z`,
          closedBy: prev.activeAdminName,
          closedAt: `${date}T23:00:00.000Z`,
          verifiedPreviousClosingId: null,
          openingNotes: 'Ingreso manual de ventas históricas',
          openingNIO: { 1000: 0, 500: 0, 200: 0, 100: 0, 50: 0, 20: 0, 10: 0, 5: 0, 1: 0, 0.5: 0 },
          openingUSD: { 100: 0, 50: 0, 20: 0, 10: 0, 5: 0, 2: 0, 1: 0 },
          totalOpeningNIO: 0,
          totalOpeningUSD: 0,
          totalOpeningEquivNIO: 0,
          salesCashSystem: sales.salesCash,
          cardsBAC: sales.cardsBAC,
          cardsFicohsa: sales.cardsFicohsa,
          cardsBanpro: sales.cardsBanpro,
          cardsLafise: sales.cardsLafise,
          totalCards,
          salesPedidosYa: sales.salesPedidosYa,
          totalGrossSales,
          totalTipCollected: sales.tipsCollected || 0,
          loyverseValidation: {
            validated: true,
            salesCashLoyverse: sales.salesCash,
            cardsBAC: sales.cardsBAC,
            cardsFicohsa: sales.cardsFicohsa,
            cardsBanpro: sales.cardsBanpro,
            cardsLafise: sales.cardsLafise,
            totalCards,
            salesPedidosYa: sales.salesPedidosYa,
            totalLoyverseSales: totalGrossSales,
            notes: sales.notes,
          },
        };
        updatedHistory.unshift(newHistoricalShift);
        syncGeneralCashShiftToCloud(newHistoricalShift).catch(console.warn);
      } else if (foundInHistory) {
        const updated = updatedHistory.find((s) => s.date === date);
        if (updated) syncGeneralCashShiftToCloud(updated).catch(console.warn);
      }

      return {
        ...prev,
        currentShift: updatedCurrent,
        shiftHistory: updatedHistory,
      };
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex font-sans antialiased">
      {/* Sidebar de Navegación Lateral */}
      <Sidebar
        state={state}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        payrollSubTab={payrollSubTab}
        onPayrollSubTabChange={setPayrollSubTab}
        onOpenSettingsClick={() => setSettingsModalOpen(true)}
        onChangeExchangeRateClick={() => setExchangeRateModalOpen(true)}
        onSelectAdminClick={() => setAdminSelectModalOpen(true)}
      />

      {/* Contenedor Principal con TopBar y Vistas */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <TopBar
          state={state}
          onSelectAdminClick={() => setAdminSelectModalOpen(true)}
          onOpenShiftClick={() => setOpeningModalOpen(true)}
          onCloseShiftClick={() => setClosingModalOpen(true)}
          onForceSyncClick={handleForceSyncPending}
        />

        <main className="flex-1 overflow-y-auto p-6 lg:p-8 bg-slate-50">
          <div className="max-w-7xl mx-auto space-y-6">
            {activeTab === 'generalCash' && (
              <GeneralCashView
                state={state}
                onOpenShiftClick={() => setOpeningModalOpen(true)}
                onCloseShiftClick={() => setClosingModalOpen(true)}
                onUpdateShift={handleUpdateShift}
                onCancelOpenShift={handleCancelOpenShift}
                onAddPettyCashTransaction={handleAddPettyCashTransaction}
              />
            )}

            {activeTab === 'pettyCash' && (
              <PettyCashView
                state={state}
                onAddTransaction={handleAddPettyCashTransaction}
                onEditTransaction={handleEditPettyCashTransaction}
                onDeleteTransaction={handleDeletePettyCashTransaction}
                onOpenPettyCashShift={handleOpenPettyCashShift}
                onClosePettyCashShift={handleClosePettyCashShift}
                onCancelPettyCashShift={handleCancelPettyCashShift}
                onUpdateExpenseCategories={handleUpdateExpenseCategories}
                onForceSyncClick={handleForceSyncPending}
              />
            )}

            {activeTab === 'tableware' && (
              <TablewareView
                state={state}
                onUpdateStock={handleUpdateTablewareStock}
                onAddLoss={handleAddTablewareLoss}
                onAddItem={handleAddTablewareItem}
              />
            )}

            {activeTab === 'dailyEarnings' && (
              <DailyEarningsView
                state={state}
                onUpdateShiftSales={handleUpdateShiftSales}
                onNavigateToTab={setActiveTab}
              />
            )}

            {activeTab === 'payroll' && (
              <PayrollView
                state={state}
                onUpdateState={setState}
                subTab={payrollSubTab}
                onSubTabChange={setPayrollSubTab}
              />
            )}
          </div>
        </main>
      </div>

      {/* Modales de Control */}
      <OpeningModal
        isOpen={openingModalOpen}
        onClose={() => setOpeningModalOpen(false)}
        lastClosedShift={lastClosedShift}
        shiftHistory={state.shiftHistory}
        lastClosedPettyCashShift={state.pettyCashShiftHistory[0] || null}
        currentPettyCashBalance={state.pettyCashBalance}
        activeAdminName={state.activeAdminName}
        defaultExchangeRate={state.defaultExchangeRate}
        availableAdmins={state.availableAdmins}
        onConfirmOpen={handleConfirmOpenShift}
      />

      <ClosingModal
        isOpen={closingModalOpen}
        onClose={() => setClosingModalOpen(false)}
        shift={state.currentShift}
        state={state}
        activeAdminName={state.activeAdminName}
        availableAdmins={state.availableAdmins}
        onConfirmClose={handleConfirmCloseShift}
      />

      <SettingsModal
        isOpen={settingsModalOpen}
        onClose={() => setSettingsModalOpen(false)}
        state={state}
        onUpdateExchangeRate={handleUpdateExchangeRate}
        onAddAdmin={handleAddAdmin}
        onRemoveAdmin={handleRemoveAdmin}
        onRestoreState={handleRestoreState}
        onResetState={handleResetState}
        onLoadMockData={handleLoadMockData}
      />

      <AdminSelectModal
        isOpen={adminSelectModalOpen}
        onClose={() => setAdminSelectModalOpen(false)}
        availableAdmins={state.availableAdmins}
        activeAdminName={state.activeAdminName}
        onSelectAdmin={handleSelectAdmin}
      />

      <ExchangeRateModal
        isOpen={exchangeRateModalOpen}
        onClose={() => setExchangeRateModalOpen(false)}
        currentRate={state.defaultExchangeRate}
        onSaveRate={handleUpdateExchangeRate}
      />

      {/* Notificaciones de Auto-Actualización */}
      {updateInfo.status === 'downloading' && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900/95 border border-sky-500/50 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 backdrop-blur-md animate-in slide-in-from-bottom duration-300">
          <div className="w-4 h-4 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
          <div className="text-xs">
            <span className="font-bold text-sky-400">Descargando actualización</span>
            {updateInfo.version && <span className="ml-1 text-slate-300">v{updateInfo.version}</span>}
            {updateInfo.progress !== undefined && (
              <span className="ml-1 text-sky-300 font-mono font-bold">({updateInfo.progress}%)</span>
            )}
          </div>
        </div>
      )}

      {updateInfo.status === 'downloaded' && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-950/95 border-2 border-emerald-400 text-white p-4 rounded-2xl shadow-2xl flex items-center gap-4 backdrop-blur-md animate-in slide-in-from-bottom duration-300">
          <div>
            <div className="text-[10px] font-black text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
              <span>✨</span>
              <span>Actualización Lista</span>
            </div>
            <div className="text-sm font-black text-white mt-0.5">Versión {updateInfo.version || 'nueva'} instalable</div>
            <div className="text-[11px] text-emerald-200/90 mt-0.5">
              Se aplicará al cerrar la app o puedes reiniciar ahora.
            </div>
          </div>
          <button
            type="button"
            onClick={() => window.electronAPI?.restartAndInstall?.()}
            className="bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-black text-xs px-3.5 py-2 rounded-xl transition cursor-pointer active:scale-95 whitespace-nowrap shadow-sm"
          >
            Reiniciar Ahora
          </button>
        </div>
      )}
    </div>
  );
}

export default App;
