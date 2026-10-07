import React, { useState, useMemo } from 'react';
import { CashShift, DenominationsNIO, DenominationsUSD, PettyCashShift, PettyCashTransaction } from '../types';
import {
  DEFAULT_DENOMINATIONS_NIO,
  DEFAULT_DENOMINATIONS_USD,
  calculateTotalNIO,
  calculateTotalUSD,
} from '../services/storage';
import { getLocalTodayStr, formatDateToFriendly, addDaysToDateStr, extractLocalDateStr } from '../utils/dateUtils';
import { CashDenominationsInput } from './CashDenominationsInput';
import {
  X,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  UserCheck,
  RotateCcw,
  AlertTriangle,
  Banknote,
  DollarSign,
  Calendar,
  CreditCard,
  Truck,
  Receipt,
  CheckCheck,
  Coins,
  ShoppingCart,
  ArrowRightLeft,
  Lock,
  Unlock,
  Wallet,
  TrendingUp,
  FileSpreadsheet,
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  lastClosedShift: CashShift | null;
  shiftHistory?: CashShift[];
  lastClosedPettyCashShift?: PettyCashShift | null;
  currentPettyCashBalance?: number;
  pettyCashTransactions?: PettyCashTransaction[];
  activeAdminName: string;
  defaultExchangeRate: number;
  availableAdmins: string[];
  onConfirmOpen: (
    shift: CashShift,
    updatedPreviousShift?: CashShift,
    pettyOpeningData?: {
      initialBalance: number;
      previousDayRemaining: number;
      generalCashTransfer: number;
      bossContribution: number;
    }
  ) => void;
}

export const OpeningModal: React.FC<Props> = ({
  isOpen,
  onClose,
  lastClosedShift,
  shiftHistory = [],
  lastClosedPettyCashShift = null,
  currentPettyCashBalance = 0,
  pettyCashTransactions = [],
  activeAdminName,
  defaultExchangeRate,
  availableAdmins,
  onConfirmOpen,
}) => {
  if (!isOpen) return null;

  const todayStr = getLocalTodayStr();

  // Wizard de 3 Pasos:
  // 1: Corroborar Caja Chica primero (remanente de anoche)
  // 2: Conteo Físico Gaveta General + Pagos y Salidas Loyverse (ganancias de ayer)
  // 3: Distribución (Dólares apartados Snyder + Fondo Vuelto General + Traslado automático a Caja Chica)
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Datos Generales
  const [shiftDate, setShiftDate] = useState<string>(todayStr);
  const [openerName, setOpenerName] = useState(activeAdminName);
  const [exchangeRate, setExchangeRate] = useState(defaultExchangeRate);
  const [notes, setNotes] = useState('');

  // ----------------------------------------------------
  // PASO 1: CAJA CHICA (REMANENTE FÍSICO)
  // ----------------------------------------------------
  const expectedPettyRemaining = useMemo(() => {
    if (lastClosedPettyCashShift?.actualCashCounted !== undefined) {
      return lastClosedPettyCashShift.actualCashCounted;
    }
    if (lastClosedPettyCashShift?.expectedBalance !== undefined) {
      return lastClosedPettyCashShift.expectedBalance;
    }
    return currentPettyCashBalance || 0;
  }, [lastClosedPettyCashShift, currentPettyCashBalance]);

  const [pettyPhysicalCountInput, setPettyPhysicalCountInput] = useState<string>(
    expectedPettyRemaining > 0 ? String(expectedPettyRemaining) : '0'
  );
  const [isPettyVerified, setIsPettyVerified] = useState<boolean>(false);
  const pettyPhysicalCount = Math.max(0, parseFloat(pettyPhysicalCountInput) || 0);
  const pettyDiff = pettyPhysicalCount - expectedPettyRemaining;
  const isPettySquare = Math.abs(pettyDiff) < 1.0;

  // ----------------------------------------------------
  // PASO 2: CONTEO FÍSICO GAVETA GENERAL & AUDITORÍA DE AYER
  // ----------------------------------------------------
  const [denominationsNIO, setDenominationsNIO] = useState<DenominationsNIO>(DEFAULT_DENOMINATIONS_NIO);
  const [denominationsUSD, setDenominationsUSD] = useState<DenominationsUSD>(DEFAULT_DENOMINATIONS_USD);

  const totalNIO = calculateTotalNIO(denominationsNIO);
  const totalUSD = calculateTotalUSD(denominationsUSD); // Dólares que se entregan a Snyder
  const totalEquivNIO = totalNIO; // Efectivo físico en gaveta en Córdobas

  const expectedFromPrevious =
    lastClosedShift?.totalClosingNIO ||
    lastClosedShift?.actualCashNIO ||
    lastClosedShift?.totalOpeningNIO ||
    lastClosedShift?.totalOpeningEquivNIO ||
    0;
  const differenceWithPrevious = totalNIO - expectedFromPrevious;
  const isCountInitiated = totalNIO > 0;
  const isMatchWithPrevious = lastClosedShift ? Math.abs(differenceWithPrevious) < 1.0 : true;

  // Corroboración de Canales de Venta / Vouchers de Anoche
  const [vouchersBAC, setVouchersBAC] = useState<string>(
    lastClosedShift?.cardsBAC !== undefined ? String(lastClosedShift.cardsBAC) : ''
  );
  const [vouchersFicohsa, setVouchersFicohsa] = useState<string>(
    lastClosedShift?.cardsFicohsa !== undefined ? String(lastClosedShift.cardsFicohsa) : ''
  );
  const [vouchersBanpro, setVouchersBanpro] = useState<string>(
    lastClosedShift?.cardsBanpro !== undefined ? String(lastClosedShift.cardsBanpro) : ''
  );
  const [vouchersLafise, setVouchersLafise] = useState<string>(
    lastClosedShift?.cardsLafise !== undefined ? String(lastClosedShift.cardsLafise) : ''
  );
  const [reportPedidosYa, setReportPedidosYa] = useState<string>(
    lastClosedShift?.salesPedidosYa !== undefined ? String(lastClosedShift.salesPedidosYa) : ''
  );
  const [reportLoyverseCash, setReportLoyverseCash] = useState<string>(
    lastClosedShift?.salesCashSystem !== undefined ? String(lastClosedShift.salesCashSystem) : ''
  );
  const [reportOtherIncome, setReportOtherIncome] = useState<string>(
    lastClosedShift?.otherIncome !== undefined ? String(lastClosedShift.otherIncome) : ''
  );

  // Casilla Clave: Pagos y Salidas de Loyverse del día anterior
  const [loyversePaidOutInput, setLoyversePaidOutInput] = useState<string>('');
  const loyversePaidOut = Math.max(0, parseFloat(loyversePaidOutInput) || 0);

  const [syncCorrectionsToPrevious, setSyncCorrectionsToPrevious] = useState<boolean>(true);

  const handleCopyFromPrevious = () => {
    if (lastClosedShift?.closingNIO && lastClosedShift?.closingUSD) {
      setDenominationsNIO({ ...lastClosedShift.closingNIO });
      setDenominationsUSD({ ...lastClosedShift.closingUSD });
    } else if (lastClosedShift?.openingNIO && lastClosedShift?.openingUSD) {
      setDenominationsNIO({ ...lastClosedShift.openingNIO });
      setDenominationsUSD({ ...lastClosedShift.openingUSD });
    }
  };

  const handleResetCount = () => {
    setDenominationsNIO({ ...DEFAULT_DENOMINATIONS_NIO });
    setDenominationsUSD({ ...DEFAULT_DENOMINATIONS_USD });
  };

  const handleCopySalesFromPrevious = () => {
    if (lastClosedShift) {
      setVouchersBAC(String(lastClosedShift.cardsBAC || 0));
      setVouchersFicohsa(String(lastClosedShift.cardsFicohsa || 0));
      setVouchersBanpro(String(lastClosedShift.cardsBanpro || 0));
      setVouchersLafise(String(lastClosedShift.cardsLafise || 0));
      setReportPedidosYa(String(lastClosedShift.salesPedidosYa || 0));
      setReportLoyverseCash(String(lastClosedShift.salesCashSystem || 0));
      setReportOtherIncome(String(lastClosedShift.otherIncome || 0));
    }
  };

  const numBAC = vouchersBAC !== '' ? parseFloat(vouchersBAC) || 0 : null;
  const numFico = vouchersFicohsa !== '' ? parseFloat(vouchersFicohsa) || 0 : null;
  const numBanpro = vouchersBanpro !== '' ? parseFloat(vouchersBanpro) || 0 : null;
  const numLafise = vouchersLafise !== '' ? parseFloat(vouchersLafise) || 0 : null;
  const numPedidosYa = reportPedidosYa !== '' ? parseFloat(reportPedidosYa) || 0 : null;
  const numLoyverseCash = reportLoyverseCash !== '' ? parseFloat(reportLoyverseCash) || 0 : null;
  const numOtherIncome = reportOtherIncome !== '' ? parseFloat(reportOtherIncome) || 0 : null;

  const repBAC = lastClosedShift?.cardsBAC || 0;
  const repFico = lastClosedShift?.cardsFicohsa || 0;
  const repBanpro = lastClosedShift?.cardsBanpro || 0;
  const repLafise = lastClosedShift?.cardsLafise || 0;
  const repPedidosYa = lastClosedShift?.salesPedidosYa || 0;
  const repLoyverseCash = lastClosedShift?.salesCashSystem || 0;
  const repOtherIncome = lastClosedShift?.otherIncome || 0;

  const diffBAC = numBAC !== null ? numBAC - repBAC : null;
  const diffFico = numFico !== null ? numFico - repFico : null;
  const diffBanpro = numBanpro !== null ? numBanpro - repBanpro : null;
  const diffLafise = numLafise !== null ? numLafise - repLafise : null;
  const diffPedidosYa = numPedidosYa !== null ? numPedidosYa - repPedidosYa : null;
  const diffLoyverseCash = numLoyverseCash !== null ? numLoyverseCash - repLoyverseCash : null;
  const diffOtherIncome = numOtherIncome !== null ? numOtherIncome - repOtherIncome : null;

  const totalReportedSales = repBAC + repFico + repBanpro + repLafise + repPedidosYa + repLoyverseCash + repOtherIncome;
  const totalVerifiedSales =
    (numBAC ?? repBAC) +
    (numFico ?? repFico) +
    (numBanpro ?? repBanpro) +
    (numLafise ?? repLafise) +
    (numPedidosYa ?? repPedidosYa) +
    (numLoyverseCash ?? repLoyverseCash) +
    (numOtherIncome ?? repOtherIncome);

  // Fórmula exacta explicada por el usuario:
  // Efectivo generado ayer = Efectivo (ventas de ayer en efectivo) + Pagos y Salidas (Loyverse)
  const efectivoVentasAyer = numLoyverseCash ?? repLoyverseCash ?? 0;
  const efectivoGeneradoRealAyer = Math.max(0, efectivoVentasAyer + loyversePaidOut);

  // ----------------------------------------------------
  // GASTOS DE AYER & GANANCIA NETA (EXCEL ORIGINAL)
  // ----------------------------------------------------
  const previousShiftDate = lastClosedShift?.date || addDaysToDateStr(shiftDate, -1);

  // Gastos de Caja Chica registrados para esa jornada
  const prevDayExpenseTransactions = useMemo(() => {
    return (pettyCashTransactions || []).filter((tx) => {
      if (!tx.date || tx.type !== 'EXPENSE') return false;
      return extractLocalDateStr(tx.date) === previousShiftDate;
    });
  }, [pettyCashTransactions, previousShiftDate]);

  // Gastos en Efectivo de ayer (Caja Chica)
  const initialCashExpensesAyer = useMemo(() => {
    return prevDayExpenseTransactions
      .filter((tx) => tx.method === 'CASH' || !tx.method)
      .reduce((sum, tx) => sum + (tx.amount || 0), 0);
  }, [prevDayExpenseTransactions]);

  // Gastos en Tarjeta o Transferencia de ayer
  const initialTransferExpensesAyer = useMemo(() => {
    return prevDayExpenseTransactions
      .filter((tx) => tx.method === 'TRANSFER' || tx.method === 'CARD')
      .reduce((sum, tx) => sum + (tx.amount || 0), 0);
  }, [prevDayExpenseTransactions]);

  // Propina entregada de ayer (como gasto/salida de la jornada según cierre)
  const initialTipsAyer = useMemo(() => {
    return lastClosedShift?.totalTipCollected || 0;
  }, [lastClosedShift]);

  const [reportCashExpensesAyer, setReportCashExpensesAyer] = useState<string>('');
  const [reportTransferExpensesAyer, setReportTransferExpensesAyer] = useState<string>('');
  const [reportTipsExpensesAyer, setReportTipsExpensesAyer] = useState<string>('');

  React.useEffect(() => {
    setReportCashExpensesAyer(initialCashExpensesAyer > 0 ? String(initialCashExpensesAyer) : '0');
    setReportTransferExpensesAyer(initialTransferExpensesAyer > 0 ? String(initialTransferExpensesAyer) : '0');
    setReportTipsExpensesAyer(initialTipsAyer > 0 ? String(initialTipsAyer) : '0');
  }, [initialCashExpensesAyer, initialTransferExpensesAyer, initialTipsAyer]);

  const numCashExpensesAyer = reportCashExpensesAyer !== '' ? parseFloat(reportCashExpensesAyer) || 0 : initialCashExpensesAyer;
  const numTransferExpensesAyer = reportTransferExpensesAyer !== '' ? parseFloat(reportTransferExpensesAyer) || 0 : initialTransferExpensesAyer;
  const numTipsExpensesAyer = reportTipsExpensesAyer !== '' ? parseFloat(reportTipsExpensesAyer) || 0 : initialTipsAyer;

  const totalGastosAyer = numCashExpensesAyer + numTransferExpensesAyer + numTipsExpensesAyer;
  const gananciaNetaAyer = totalVerifiedSales - totalGastosAyer;
  const margenNetoAyer = totalVerifiedSales > 0 ? (gananciaNetaAyer / totalVerifiedSales) * 100 : 0;

  // ----------------------------------------------------
  // PASO 3: DISTRIBUCIÓN DE FONDOS PARA HOY
  // ----------------------------------------------------
  // El usuario determina con cuánto abre Caja General (fondo de vueltos)
  // Por defecto sugerimos C$ 1,781 o C$ 2,000 según disponibilidad
  const [generalDrawerFloatInput, setGeneralDrawerFloatInput] = useState<string>('2000');
  const [transferToPettyInput, setTransferToPettyInput] = useState<string>('');

  // Sincronizar automáticamente cuando cambie totalNIO
  React.useEffect(() => {
    if (totalNIO > 0) {
      if (totalNIO <= 2000) {
        setGeneralDrawerFloatInput(String(totalNIO));
        setTransferToPettyInput('0');
      } else {
        // Sugerir dejar fondo de vuelto (ej. 1,781 o 2,000) y pasar el resto a Caja Chica
        const defaultFloat = totalNIO >= 11481 ? 1781 : 2000;
        setGeneralDrawerFloatInput(String(defaultFloat));
        setTransferToPettyInput(String(totalNIO - defaultFloat));
      }
    }
  }, [totalNIO]);

  const handleGeneralFloatChange = (val: string) => {
    setGeneralDrawerFloatInput(val);
    const num = Math.max(0, parseFloat(val) || 0);
    const rest = Math.max(0, totalNIO - num);
    setTransferToPettyInput(String(rest));
  };

  const handleTransferToPettyChange = (val: string) => {
    setTransferToPettyInput(val);
    const num = Math.max(0, parseFloat(val) || 0);
    const rest = Math.max(0, totalNIO - num);
    setGeneralDrawerFloatInput(String(rest));
  };

  const generalDrawerFloat = Math.max(0, parseFloat(generalDrawerFloatInput) || 0);
  const transferAmount = Math.max(0, parseFloat(transferToPettyInput) || 0);
  const resultingPettyInitialBalance = parseFloat((pettyPhysicalCount + transferAmount).toFixed(2));

  const isSelectedDateClosed = shiftHistory.some((s) => s.date === shiftDate);

  // Validaciones antes de avanzar o confirmar
  const canAdvanceFromStep1 = isPettyVerified;
  const canAdvanceFromStep2 = totalNIO > 0 || isMatchWithPrevious;

  const handleConfirm = () => {
    if (shiftDate > todayStr) {
      alert(`No es posible abrir un turno con fecha futura (${shiftDate}). Selecciona la fecha de hoy (${todayStr}) o un día anterior.`);
      return;
    }

    if (generalDrawerFloat <= 0) {
      const confirmZero = window.confirm(
        'El fondo de apertura de Caja General está en C$ 0.00.\n\n¿Estás seguro de abrir la gaveta sin fondo de vuelto inicial?'
      );
      if (!confirmZero) return;
    }

    if (isSelectedDateClosed) {
      const confirmDup = window.confirm(
        `Atención: La fecha ${shiftDate} ya cuenta con un cierre oficial registrado en el sistema.\n\n¿Estás seguro de que deseas forzar una nueva apertura para esta misma fecha?`
      );
      if (!confirmDup) return;
    }

    let auditNotes = notes;
    const diffItems: string[] = [];
    if (diffBAC !== null && Math.abs(diffBAC) >= 0.01) diffItems.push(`BAC (${diffBAC > 0 ? '+' : ''}${diffBAC.toFixed(2)})`);
    if (diffFico !== null && Math.abs(diffFico) >= 0.01) diffItems.push(`Ficohsa (${diffFico > 0 ? '+' : ''}${diffFico.toFixed(2)})`);
    if (diffBanpro !== null && Math.abs(diffBanpro) >= 0.01) diffItems.push(`Banpro (${diffBanpro > 0 ? '+' : ''}${diffBanpro.toFixed(2)})`);
    if (diffLafise !== null && Math.abs(diffLafise) >= 0.01) diffItems.push(`LAFISE (${diffLafise > 0 ? '+' : ''}${diffLafise.toFixed(2)})`);
    if (diffPedidosYa !== null && Math.abs(diffPedidosYa) >= 0.01) diffItems.push(`PedidosYa (${diffPedidosYa > 0 ? '+' : ''}${diffPedidosYa.toFixed(2)})`);
    if (diffLoyverseCash !== null && Math.abs(diffLoyverseCash) >= 0.01) diffItems.push(`Loyverse (${diffLoyverseCash > 0 ? '+' : ''}${diffLoyverseCash.toFixed(2)})`);
    if (diffOtherIncome !== null && Math.abs(diffOtherIncome) >= 0.01) diffItems.push(`Otros Ing. (${diffOtherIncome > 0 ? '+' : ''}${diffOtherIncome.toFixed(2)})`);
    if (loyversePaidOut > 0) diffItems.push(`Pagos/Salidas Loyverse (C$ ${loyversePaidOut.toFixed(2)})`);

    if (diffItems.length > 0) {
      const auditSummary = `[Auditoría Apertura: ${diffItems.join(', ')}]`;
      auditNotes = auditNotes ? `${auditNotes} • ${auditSummary}` : auditSummary;
    }

    if (totalUSD > 0) {
      const snyderNote = `[Dólares apartados en sobre para Snyder: $${totalUSD.toFixed(2)} USD]`;
      auditNotes = auditNotes ? `${auditNotes} • ${snyderNote}` : snyderNote;
    }

    // Datos del nuevo turno de Caja General
    const newShift: CashShift = {
      id: `shift-${shiftDate}-${Date.now()}`,
      date: shiftDate,
      status: 'OPEN',
      exchangeRate,
      openedBy: openerName,
      openedAt: new Date().toISOString(),
      verifiedPreviousClosingId: lastClosedShift?.id || null,
      openingNotes: auditNotes,
      openingNIO: denominationsNIO,
      openingUSD: denominationsUSD,
      totalOpeningNIO: generalDrawerFloat,
      totalOpeningUSD: 0, // Dólares se apartan para Snyder, 0 en gaveta operativa
      totalOpeningEquivNIO: generalDrawerFloat,
      openingCashCountedNIO: totalNIO,
      openingTransferToPettyCash: transferAmount > 0 ? transferAmount : undefined,
      transferToPettyCash: transferAmount > 0 ? transferAmount : undefined,
      loyverseValidation: {
        validated: true,
        salesCashLoyverse: numLoyverseCash ?? repLoyverseCash,
        cardsBAC: numBAC ?? repBAC,
        cardsFicohsa: numFico ?? repFico,
        cardsBanpro: numBanpro ?? repBanpro,
        cardsLafise: numLafise ?? repLafise,
        totalCards: (numBAC ?? repBAC) + (numFico ?? repFico) + (numBanpro ?? repBanpro) + (numLafise ?? repLafise),
        salesPedidosYa: numPedidosYa ?? repPedidosYa,
        totalLoyverseSales: totalVerifiedSales,
        notes: diffItems.length === 0 ? 'Vouchers y canales verificados conformes' : diffItems.join(', '),
      },
    };

    let updatedPreviousShift: CashShift | undefined = undefined;
    if (lastClosedShift && syncCorrectionsToPrevious) {
      const corBAC = numBAC ?? repBAC;
      const corFico = numFico ?? repFico;
      const corBanpro = numBanpro ?? repBanpro;
      const corLafise = numLafise ?? repLafise;
      const corTotalCards = corBAC + corFico + corBanpro + corLafise;
      const corPY = numPedidosYa ?? repPedidosYa;
      const corCash = numLoyverseCash ?? repLoyverseCash;
      const corOther = numOtherIncome ?? repOtherIncome;

      updatedPreviousShift = {
        ...lastClosedShift,
        cardsBAC: corBAC,
        cardsFicohsa: corFico,
        cardsBanpro: corBanpro,
        cardsLafise: corLafise,
        totalCards: corTotalCards,
        salesPedidosYa: corPY,
        salesCashSystem: corCash,
        otherIncome: corOther,
        totalGrossSales: corCash + corTotalCards + corPY + corOther,
        totalTipCollected: numTipsExpensesAyer,
        dailyNetProfit: gananciaNetaAyer,
        closingNotes: diffItems.length > 0
          ? (lastClosedShift.closingNotes
              ? `${lastClosedShift.closingNotes} • Corroborado en apertura ${shiftDate}: ${diffItems.join(', ')}`
              : `Corroborado en apertura ${shiftDate}: ${diffItems.join(', ')}`)
          : lastClosedShift.closingNotes,
      };
    }

    // Datos para apertura sincronizada de Caja Chica
    const pettyOpeningData = {
      initialBalance: resultingPettyInitialBalance,
      previousDayRemaining: pettyPhysicalCount,
      generalCashTransfer: transferAmount,
      bossContribution: 0,
    };

    onConfirmOpen(newShift, updatedPreviousShift, pettyOpeningData);
    onClose();
  };

  const channelsAuditConfig = [
    {
      id: 'bac',
      name: 'BAC Credomatic',
      icon: <CreditCard className="w-3.5 h-3.5 text-red-600" />,
      reported: repBAC,
      val: vouchersBAC,
      setVal: setVouchersBAC,
      diff: diffBAC,
    },
    {
      id: 'ficohsa',
      name: 'Banco Ficohsa',
      icon: <CreditCard className="w-3.5 h-3.5 text-blue-600" />,
      reported: repFico,
      val: vouchersFicohsa,
      setVal: setVouchersFicohsa,
      diff: diffFico,
    },
    {
      id: 'banpro',
      name: 'Banpro Promerica',
      icon: <CreditCard className="w-3.5 h-3.5 text-emerald-600" />,
      reported: repBanpro,
      val: vouchersBanpro,
      setVal: setVouchersBanpro,
      diff: diffBanpro,
    },
    {
      id: 'lafise',
      name: 'Banco LAFISE',
      icon: <CreditCard className="w-3.5 h-3.5 text-green-700" />,
      reported: repLafise,
      val: vouchersLafise,
      setVal: setVouchersLafise,
      diff: diffLafise,
    },
    {
      id: 'pedidosya',
      name: 'PedidosYa',
      icon: <Truck className="w-3.5 h-3.5 text-rose-600" />,
      reported: repPedidosYa,
      val: reportPedidosYa,
      setVal: setReportPedidosYa,
      diff: diffPedidosYa,
    },
    {
      id: 'loyverse',
      name: 'Efectivo',
      icon: <Receipt className="w-3.5 h-3.5 text-amber-600" />,
      reported: repLoyverseCash,
      val: reportLoyverseCash,
      setVal: setReportLoyverseCash,
      diff: diffLoyverseCash,
    },
    {
      id: 'other',
      name: 'Otros Ingresos',
      icon: <DollarSign className="w-3.5 h-3.5 text-purple-600" />,
      reported: repOtherIncome,
      val: reportOtherIncome,
      setVal: setReportOtherIncome,
      diff: diffOtherIncome,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-xl w-full max-w-3xl max-h-[94vh] flex flex-col shadow-xl overflow-hidden animate-in zoom-in-95 duration-150">
        
        {/* Header con Indicador de 3 Pasos */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/90 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#1c6856] text-white flex items-center justify-center shadow-xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>Apertura del Día</span>
                <span className="text-[11px] px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold">
                  Paso {step} de 3
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                {step === 1 && 'Paso 1: Arqueo y corroboración física de Caja Chica'}
                {step === 2 && 'Paso 2: Conteo de gaveta general & ganancias de ayer'}
                {step === 3 && 'Paso 3: Distribución de dinero para Caja General y Caja Chica'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Barra de Progreso de 3 Pasos */}
        <div className="grid grid-cols-3 border-b border-slate-200 bg-white text-xs font-bold select-none divide-x divide-slate-100">
          <button
            type="button"
            onClick={() => setStep(1)}
            className={`py-3 px-3 flex items-center justify-center gap-2 border-b-2 transition cursor-pointer ${
              step === 1
                ? 'border-[#1c6856] text-[#1c6856] bg-emerald-50/30'
                : isPettyVerified
                ? 'border-transparent text-emerald-800 hover:bg-slate-50'
                : 'border-transparent text-slate-400'
            }`}
          >
            <span className={`w-5 h-5 rounded-md flex items-center justify-center text-[11px] font-mono font-bold ${
              step === 1 ? 'bg-[#1c6856] text-white' : isPettyVerified ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
            }`}>
              1
            </span>
            <span className="truncate">1. Caja Chica</span>
          </button>

          <button
            type="button"
            onClick={() => isPettyVerified && setStep(2)}
            disabled={!isPettyVerified}
            className={`py-3 px-3 flex items-center justify-center gap-2 border-b-2 transition ${
              step === 2
                ? 'border-[#1c6856] text-[#1c6856] bg-emerald-50/30'
                : !isPettyVerified
                ? 'border-transparent text-slate-300 cursor-not-allowed'
                : 'border-transparent text-slate-600 hover:bg-slate-50 cursor-pointer'
            }`}
          >
            <span className={`w-5 h-5 rounded-md flex items-center justify-center text-[11px] font-mono font-bold ${
              step === 2 ? 'bg-[#1c6856] text-white' : 'bg-slate-100 text-slate-500'
            }`}>
              2
            </span>
            <span className="truncate">2. Gaveta & Ganancias</span>
          </button>

          <button
            type="button"
            onClick={() => isPettyVerified && totalNIO > 0 && setStep(3)}
            disabled={!isPettyVerified || totalNIO === 0}
            className={`py-3 px-3 flex items-center justify-center gap-2 border-b-2 transition ${
              step === 3
                ? 'border-[#1c6856] text-[#1c6856] bg-emerald-50/30'
                : (!isPettyVerified || totalNIO === 0)
                ? 'border-transparent text-slate-300 cursor-not-allowed'
                : 'border-transparent text-slate-600 hover:bg-slate-50 cursor-pointer'
            }`}
          >
            <span className={`w-5 h-5 rounded-md flex items-center justify-center text-[11px] font-mono font-bold ${
              step === 3 ? 'bg-[#1c6856] text-white' : 'bg-slate-100 text-slate-500'
            }`}>
              3
            </span>
            <span className="truncate">3. Distribución Hoy</span>
          </button>
        </div>

        {/* Contenido Principal por Pasos */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 bg-slate-50/40">

          {/* ========================================================================= */}
          {/* PASO 1: ARQUEO Y CORROBORACIÓN DE CAJA CHICA */}
          {/* ========================================================================= */}
          {step === 1 && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="bg-white rounded-xl p-5 border border-slate-200 space-y-4">
                <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                  <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
                    <ShoppingCart className="w-5 h-5 text-[#1c6856]" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Corroboración Física de Caja Chica
                    </h3>
                    <p className="text-xs text-slate-500">
                      Cuenta el efectivo que quedó en el sobre o gaveta de Caja Chica antes de abrir el día.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 space-y-1">
                    <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">
                      Remanente Esperado de Ayer
                    </span>
                    <div className="text-2xl font-bold text-slate-900 font-mono">
                      C$ {expectedPettyRemaining.toLocaleString('es-NI', { minimumFractionDigits: 2 })}
                    </div>
                    <span className="text-[11px] text-slate-500 block">
                      Saldo al cierre de la última jornada
                    </span>
                  </div>

                  <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 space-y-1.5">
                    <label className="text-[10px] font-bold uppercase text-slate-700 tracking-wider block">
                      Efectivo Físico Contado en Mano (C$) *
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">C$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        required
                        value={pettyPhysicalCountInput}
                        onChange={(e) => {
                          setPettyPhysicalCountInput(e.target.value);
                          setIsPettyVerified(false);
                        }}
                        className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-white border border-slate-300 text-base font-bold font-mono text-slate-900 focus:outline-none focus:border-[#1c6856] focus:ring-1 focus:ring-[#1c6856]"
                      />
                    </div>
                    <span className="text-[10px] text-slate-500">
                      Digita lo que tienes físicamente en la cajita o sobre
                    </span>
                  </div>
                </div>

                {/* Semáforo de Cuadre de Caja Chica */}
                <div className={`p-3 rounded-lg border text-xs font-semibold flex items-center justify-between ${
                  isPettySquare
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                    : pettyDiff < 0
                    ? 'bg-rose-50 border-rose-300 text-rose-900'
                    : 'bg-blue-50 border-blue-300 text-blue-900'
                }`}>
                  <div className="flex items-center gap-2">
                    {isPettySquare ? (
                      <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    )}
                    <span>
                      {isPettySquare
                        ? `Remanente de Caja Chica verificado (C$ ${pettyPhysicalCount.toFixed(2)} exactos).`
                        : pettyDiff < 0
                        ? `Diferencia: Faltante de C$ ${Math.abs(pettyDiff).toFixed(2)} en Caja Chica (Esperado: C$ ${expectedPettyRemaining.toFixed(2)}, Contado: C$ ${pettyPhysicalCount.toFixed(2)}).`
                        : `Diferencia: Sobrante de C$ ${pettyDiff.toFixed(2)} en Caja Chica (Esperado: C$ ${expectedPettyRemaining.toFixed(2)}, Contado: C$ ${pettyPhysicalCount.toFixed(2)}).`}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsPettyVerified(true)}
                    className={`px-3 py-1 rounded-md text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                      isPettyVerified
                        ? 'bg-[#1c6856] text-white shadow-xs'
                        : 'bg-white border border-slate-300 text-slate-800 hover:bg-slate-100'
                    }`}
                  >
                    {isPettyVerified ? 'Corroborado' : 'Marcar como Conforme'}
                  </button>
                </div>
              </div>

              {/* Botón para pasar al Paso 2 */}
              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsPettyVerified(true);
                    setStep(2);
                  }}
                  className="px-5 py-2.5 rounded-lg bg-[#1c6856] hover:bg-[#154f42] text-white font-bold text-xs shadow-sm flex items-center gap-2 cursor-pointer transition"
                >
                  <span>Paso 2: Conteo de Gaveta General</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* PASO 2: CONTEO FÍSICO GAVETA GENERAL & AUDITORÍA DE AYER */}
          {/* ========================================================================= */}
          {step === 2 && (
            <div className="space-y-4 animate-in fade-in duration-150">
              {/* Parámetros Básicos */}
              <div className="bg-white rounded-xl p-4 border border-slate-200">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>Fecha de la Jornada</span>
                    </label>
                    <input
                      type="date"
                      required
                      max={todayStr}
                      value={shiftDate}
                      onChange={(e) => setShiftDate(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:border-[#1c6856]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1 flex items-center gap-1">
                      <UserCheck className="w-3.5 h-3.5 text-[#1c6856]" />
                      <span>Responsable Apertura</span>
                    </label>
                    <select
                      value={openerName}
                      onChange={(e) => setOpenerName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:border-[#1c6856]"
                    >
                      {availableAdmins.map((adm) => (
                        <option key={adm} value={adm}>
                          {adm}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1 flex items-center gap-1">
                      <DollarSign className="w-3.5 h-3.5 text-[#1c6856]" />
                      <span>Tasa de Cambio</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={exchangeRate}
                      onChange={(e) => setExchangeRate(parseFloat(e.target.value) || defaultExchangeRate)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-mono font-bold text-slate-800 focus:bg-white focus:outline-none focus:border-[#1c6856]"
                    />
                  </div>
                </div>
              </div>

              {/* Conteo de Billetes y Monedas */}
              <div className="bg-white rounded-xl p-5 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <Banknote className="w-4 h-4 text-[#1c6856]" />
                    <h3 className="text-sm font-bold text-slate-900">
                      Conteo Físico de Billetes y Monedas en Gaveta
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleCopyFromPrevious}
                      className="px-2.5 py-1 text-[11px] font-bold bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-md transition border border-slate-300 flex items-center gap-1 cursor-pointer"
                      title="Copiar denominaciones de anoche"
                    >
                      <RotateCcw className="w-3 h-3 text-slate-500" />
                      <span>Copiar de anoche</span>
                    </button>
                    {totalEquivNIO > 0 && (
                      <button
                        type="button"
                        onClick={handleResetCount}
                        className="px-2.5 py-1 text-[11px] font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-md transition border border-rose-200 cursor-pointer"
                      >
                        Limpiar
                      </button>
                    )}
                  </div>
                </div>

                <CashDenominationsInput
                  denominationsNIO={denominationsNIO}
                  denominationsUSD={denominationsUSD}
                  exchangeRate={exchangeRate}
                  onChangeNIO={setDenominationsNIO}
                  onChangeUSD={setDenominationsUSD}
                  previousClosingNIO={lastClosedShift?.closingNIO || null}
                  previousClosingUSD={lastClosedShift?.closingUSD || null}
                  expectedTotalEquivNIO={expectedFromPrevious}
                />

                {/* Resumen del Conteo Físico */}
                <div className="p-3 rounded-lg border bg-slate-50 border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Total Córdobas (C$)</span>
                    <strong className="text-base font-bold text-slate-900 font-mono">
                      C$ {totalNIO.toLocaleString('es-NI', { minimumFractionDigits: 2 })}
                    </strong>
                  </div>

                  {totalUSD > 0 && (
                    <div>
                      <span className="text-[10px] uppercase font-bold text-emerald-700 block">Dólares (USD)</span>
                      <strong className="text-base font-bold text-emerald-700 font-mono">
                        $ {totalUSD.toFixed(2)} USD
                      </strong>
                    </div>
                  )}

                  <div className={`px-2.5 py-1 rounded-md border font-bold text-xs ${
                    !isCountInitiated
                      ? 'bg-amber-50 border-amber-300 text-amber-900'
                      : isMatchWithPrevious
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                      : differenceWithPrevious < 0
                      ? 'bg-rose-50 border-rose-300 text-rose-900'
                      : 'bg-blue-50 border-blue-300 text-blue-900'
                  }`}>
                    {!isCountInitiated ? (
                      <span>Conteo pendiente (Esperado: C$ {expectedFromPrevious.toFixed(2)})</span>
                    ) : isMatchWithPrevious ? (
                      <span>Coincide con efectivo dejado en cierre (C$ {expectedFromPrevious.toFixed(2)})</span>
                    ) : differenceWithPrevious < 0 ? (
                      <span>Faltante vs Cierre: -C$ {Math.abs(differenceWithPrevious).toFixed(2)}</span>
                    ) : (
                      <span>Sobrante vs Cierre: +C$ {differenceWithPrevious.toFixed(2)}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Auditoría de Canales de Venta & Casilla de Pagos y Salidas */}
              <div className="bg-white rounded-xl p-5 border border-slate-200 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 flex-wrap gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-[#1c6856]" />
                      <span>Auditoría de Ventas de Ayer & Pagos y Salidas</span>
                    </h3>
                    <p className="text-xs text-slate-500">
                      Corrobora comprobantes POS y la casilla "Pagos y Salidas" del reporte de Loyverse.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopySalesFromPrevious}
                    className="px-2.5 py-1 text-xs font-bold bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-md transition border border-slate-300 cursor-pointer"
                  >
                    Copiar cifras de anoche
                  </button>
                </div>

                {/* Casilla Destacada: Pagos y Salidas Loyverse */}
                <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-lg space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="text-xs font-bold text-amber-950 uppercase tracking-wide flex items-center gap-1.5">
                        <Receipt className="w-4 h-4 text-amber-700" /> Casilla: Pagos y Salidas (Reporte de Loyverse)
                      </span>
                      <p className="text-[11px] text-amber-800 mt-0.5">
                        Monto retirado de gaveta ayer según el reporte de Loyverse. Se suma a las ventas en <strong>Efectivo</strong> para calcular el <strong>Efectivo Generado del día anterior</strong>.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center pt-1">
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-xs font-bold text-amber-600">C$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={loyversePaidOutInput}
                        onChange={(e) => setLoyversePaidOutInput(e.target.value)}
                        className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-white border border-amber-300 text-sm font-bold font-mono text-amber-950 focus:outline-none focus:ring-1 focus:ring-amber-500"
                      />
                    </div>

                    <div className="bg-white/90 rounded-md p-2 border border-amber-200 text-xs font-mono space-y-0.5">
                      <div className="text-[10px] text-slate-500 uppercase font-bold">Fórmula de Efectivo Generado Ayer:</div>
                      <div className="text-slate-700 text-[11px]">
                        Efectivo: C$ {efectivoVentasAyer.toFixed(2)} + Pagos/Salidas: C$ {loyversePaidOut.toFixed(2)}
                      </div>
                      <div className="text-emerald-700 font-bold text-xs pt-0.5">
                        = Efectivo Generado Ayer: C$ {efectivoGeneradoRealAyer.toLocaleString('es-NI', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Grid de Canales POS */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {channelsAuditConfig.map((ch) => (
                    <div
                      key={ch.id}
                      className="p-3 rounded-lg border bg-slate-50/80 border-slate-200 space-y-1.5 text-xs"
                    >
                      <div className="flex items-center justify-between font-bold text-slate-800">
                        <div className="flex items-center gap-1.5">
                          {ch.icon}
                          <span>{ch.name}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => ch.setVal(String(ch.reported))}
                          className="text-[10px] text-slate-400 hover:text-[#1c6856] underline cursor-pointer"
                        >
                          Copiar
                        </button>
                      </div>

                      <div className="flex justify-between text-[11px] text-slate-500 font-mono">
                        <span>Reportado:</span>
                        <span className="font-bold text-slate-700">C$ {ch.reported.toFixed(2)}</span>
                      </div>

                      <div className="relative">
                        <span className="absolute left-2.5 top-1.5 text-[11px] font-bold text-slate-400">C$</span>
                        <input
                          type="number"
                          step="0.01"
                          placeholder={ch.reported.toFixed(2)}
                          value={ch.val}
                          onChange={(e) => ch.setVal(e.target.value)}
                          className="w-full bg-white border border-slate-300 rounded-md pl-7 pr-2 py-1 text-xs font-mono font-bold text-slate-800 focus:outline-none focus:border-[#1c6856]"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Desglose de Gastos de Ayer & Ganancia Neta (Excel Original) */}
              <div className="bg-white rounded-xl p-5 border border-slate-200 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 flex-wrap gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                      <FileSpreadsheet className="w-4 h-4 text-[#1c6856]" />
                      <span>Gastos de Ayer & Rendimiento Contable (Excel Original)</span>
                    </h3>
                    <p className="text-xs text-slate-500">
                      Desglose de compras en efectivo (caja chica), tarjeta/transferencias y propina entregada.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setReportCashExpensesAyer(String(initialCashExpensesAyer));
                      setReportTransferExpensesAyer(String(initialTransferExpensesAyer));
                      setReportTipsExpensesAyer(String(initialTipsAyer));
                    }}
                    className="px-2.5 py-1 text-xs font-bold bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-md transition border border-slate-300 cursor-pointer"
                  >
                    Copiar cifras registradas
                  </button>
                </div>

                {/* Grid de 3 tarjetas de Gastos de Ayer */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* 1. Compras / Gastos en Efectivo (Caja Chica) */}
                  <div className="p-3 rounded-lg border bg-slate-50/80 border-slate-200 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between font-bold text-slate-800">
                      <div className="flex items-center gap-1.5">
                        <Coins className="w-3.5 h-3.5 text-amber-600" />
                        <span>Gastos Efectivo (Caja Chica)</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setReportCashExpensesAyer(String(initialCashExpensesAyer))}
                        className="text-[10px] text-slate-400 hover:text-[#1c6856] underline cursor-pointer"
                      >
                        Copiar
                      </button>
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-500 font-mono">
                      <span>Registrado:</span>
                      <span className="font-bold text-slate-700">C$ {initialCashExpensesAyer.toFixed(2)}</span>
                    </div>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1.5 text-[11px] font-bold text-slate-400">C$</span>
                      <input
                        type="number"
                        step="0.01"
                        placeholder={initialCashExpensesAyer.toFixed(2)}
                        value={reportCashExpensesAyer}
                        onChange={(e) => setReportCashExpensesAyer(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-md pl-7 pr-2 py-1 text-xs font-mono font-bold text-slate-800 focus:outline-none focus:border-[#1c6856]"
                      />
                    </div>
                    <span className="text-[10px] text-slate-400 block">Compras del día en efectivo</span>
                  </div>

                  {/* 2. Gastos Tarjeta / Transferencia */}
                  <div className="p-3 rounded-lg border bg-slate-50/80 border-slate-200 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between font-bold text-slate-800">
                      <div className="flex items-center gap-1.5">
                        <CreditCard className="w-3.5 h-3.5 text-blue-600" />
                        <span>Tarjeta / Transferencia</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setReportTransferExpensesAyer(String(initialTransferExpensesAyer))}
                        className="text-[10px] text-slate-400 hover:text-[#1c6856] underline cursor-pointer"
                      >
                        Copiar
                      </button>
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-500 font-mono">
                      <span>Registrado:</span>
                      <span className="font-bold text-slate-700">C$ {initialTransferExpensesAyer.toFixed(2)}</span>
                    </div>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1.5 text-[11px] font-bold text-slate-400">C$</span>
                      <input
                        type="number"
                        step="0.01"
                        placeholder={initialTransferExpensesAyer.toFixed(2)}
                        value={reportTransferExpensesAyer}
                        onChange={(e) => setReportTransferExpensesAyer(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-md pl-7 pr-2 py-1 text-xs font-mono font-bold text-slate-800 focus:outline-none focus:border-[#1c6856]"
                      />
                    </div>
                    <span className="text-[10px] text-slate-400 block">Pagos con banco / transferencia</span>
                  </div>

                  {/* 3. Propina entregada como gasto/salida */}
                  <div className="p-3 rounded-lg border bg-slate-50/80 border-slate-200 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between font-bold text-slate-800">
                      <div className="flex items-center gap-1.5">
                        <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Propina (Salida / Gasto)</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setReportTipsExpensesAyer(String(initialTipsAyer))}
                        className="text-[10px] text-slate-400 hover:text-[#1c6856] underline cursor-pointer"
                      >
                        Copiar
                      </button>
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-500 font-mono">
                      <span>Registrado:</span>
                      <span className="font-bold text-slate-700">C$ {initialTipsAyer.toFixed(2)}</span>
                    </div>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1.5 text-[11px] font-bold text-slate-400">C$</span>
                      <input
                        type="number"
                        step="0.01"
                        placeholder={initialTipsAyer.toFixed(2)}
                        value={reportTipsExpensesAyer}
                        onChange={(e) => setReportTipsExpensesAyer(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-md pl-7 pr-2 py-1 text-xs font-mono font-bold text-slate-800 focus:outline-none focus:border-[#1c6856]"
                      />
                    </div>
                    <span className="text-[10px] text-slate-400 block">Propina entregada al personal</span>
                  </div>
                </div>

                {/* Barra Contable de Resumen de Ganancia Neta */}
                <div className="p-3.5 rounded-lg border bg-slate-900 text-white flex flex-wrap items-center justify-between gap-4 text-xs font-mono">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Venta Bruta Total Ayer</span>
                    <strong className="text-sm font-bold text-white">
                      C$ {totalVerifiedSales.toLocaleString('es-NI', { minimumFractionDigits: 2 })}
                    </strong>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Gastos Ayer</span>
                    <strong className="text-sm font-bold text-rose-300">
                      -C$ {totalGastosAyer.toLocaleString('es-NI', { minimumFractionDigits: 2 })}
                    </strong>
                  </div>

                  <div className="border-l border-slate-700 pl-4">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                      Ganancia Neta Ayer {totalVerifiedSales > 0 && `(${margenNetoAyer.toFixed(1)}%)`}
                    </span>
                    <strong className={`text-base font-bold ${gananciaNetaAyer >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      C$ {gananciaNetaAyer.toLocaleString('es-NI', { minimumFractionDigits: 2 })}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Botones de Navegación */}
              <div className="flex justify-between items-center pt-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-4 py-2 rounded-lg border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Volver a Caja Chica</span>
                </button>

                <button
                  type="button"
                  onClick={() => setStep(3)}
                  disabled={totalNIO === 0}
                  className="px-5 py-2.5 rounded-lg bg-[#1c6856] hover:bg-[#154f42] text-white font-bold text-xs shadow-sm flex items-center gap-2 cursor-pointer transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span>Paso 3: Distribuir Fondos de Hoy</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* PASO 3: SEPARACIÓN Y DISTRIBUCIÓN DE FONDOS PARA HOY */}
          {/* ========================================================================= */}
          {step === 3 && (
            <div className="space-y-4 animate-in fade-in duration-150">
              {/* 1. Dólares Apartados para Snyder */}
              {totalUSD > 0 ? (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-[#1c6856] text-white flex items-center justify-center font-bold shrink-0 shadow-xs">
                      <DollarSign className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">
                        Dólares Apartados en Sobre para Snyder: ${totalUSD.toFixed(2)} USD
                      </h4>
                      <p className="text-xs text-slate-600 mt-0.5">
                        Los <strong>${totalUSD.toFixed(2)} USD</strong> contados se guardan en el sobre para entrega a la gerencia. En gaveta quedan <strong>$0.00 USD</strong>.
                      </p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-md bg-emerald-100 text-emerald-900 font-bold text-[11px] uppercase shrink-0">
                    Sobre Apartado
                  </span>
                </div>
              ) : (
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-600 flex items-center gap-2">
                  <Banknote className="w-4 h-4 text-slate-400" />
                  <span>No se registraron dólares en el conteo. La gaveta operará 100% en Córdobas.</span>
                </div>
              )}

              {/* 2. Distribución de Córdobas Contados */}
              <div className="bg-white rounded-xl p-5 border border-slate-200 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                      <ArrowRightLeft className="w-4 h-4 text-[#1c6856]" />
                      <span>Distribución de Córdobas para la Operación de Hoy</span>
                    </h3>
                    <p className="text-xs text-slate-500">
                      Total Córdobas Contados en Gaveta: <strong className="text-slate-800 font-mono">C$ {totalNIO.toLocaleString('es-NI', { minimumFractionDigits: 2 })}</strong>
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Fondo para Gaveta de Caja General */}
                  <div className="p-3.5 rounded-lg border border-emerald-200 bg-emerald-50/30 space-y-2">
                    <label className="text-[11px] font-bold uppercase text-emerald-950 tracking-wider block">
                      Fondo para Caja General (Gaveta de Vuelto) *
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-xs font-bold text-emerald-600">C$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max={totalNIO}
                        value={generalDrawerFloatInput}
                        onChange={(e) => handleGeneralFloatChange(e.target.value)}
                        className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-white border border-emerald-300 text-base font-bold font-mono text-emerald-950 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                    <span className="text-[11px] text-emerald-800 block">
                      Dinero que queda en la gaveta para dar cambio a los clientes
                    </span>
                  </div>

                  {/* Traslado a Caja Chica */}
                  <div className="p-3.5 rounded-lg border border-slate-300 bg-slate-50 space-y-2">
                    <label className="text-[11px] font-bold uppercase text-slate-800 tracking-wider block">
                      Traslado Automático a Caja Chica (Compras) *
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">C$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max={totalNIO}
                        value={transferToPettyInput}
                        onChange={(e) => handleTransferToPettyChange(e.target.value)}
                        className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-white border border-slate-300 text-base font-bold font-mono text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-400"
                      />
                    </div>
                    <span className="text-[11px] text-slate-600 block">
                      Monto trasladado de las ganancias para compras del día
                    </span>
                  </div>
                </div>

                {/* Comprobación de Suma Exacta */}
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs flex justify-between items-center font-mono">
                  <span className="text-slate-600 font-sans">Comprobación:</span>
                  <span className="font-bold text-slate-800">
                    C$ {generalDrawerFloat.toFixed(2)} (General) + C$ {transferAmount.toFixed(2)} (Chica) = C$ {(generalDrawerFloat + transferAmount).toFixed(2)} / C$ {totalNIO.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* 3. Saldo Inicial Total Resultante de Caja Chica */}
              <div className="bg-slate-900 text-white rounded-xl p-4 shadow-sm space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <ShoppingCart className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                      Saldo Inicial Resultante de Caja Chica para Hoy
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-400">
                    Apertura Sincronizada
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Remanente de Ayer</span>
                    <strong className="text-sm font-bold font-mono text-white">
                      C$ {pettyPhysicalCount.toFixed(2)}
                    </strong>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">(+) Traslado de Hoy</span>
                    <strong className="text-sm font-bold font-mono text-emerald-400">
                      + C$ {transferAmount.toFixed(2)}
                    </strong>
                  </div>

                  <div className="bg-slate-800/90 rounded-lg p-2.5 border border-slate-700">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Fondo Caja Chica</span>
                    <strong className="text-lg font-bold font-mono text-emerald-400">
                      C$ {resultingPettyInitialBalance.toLocaleString('es-NI', { minimumFractionDigits: 2 })}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Observaciones Generales */}
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Observaciones de Apertura (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ej: Se inicia turno con normalidad..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-white border border-slate-300 text-slate-900 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#1c6856] font-medium"
                />
              </div>

              {/* Botones de Acción */}
              <div className="flex justify-between items-center pt-2">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-4 py-2 rounded-lg border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Volver a Conteo</span>
                </button>

                <button
                  type="button"
                  onClick={handleConfirm}
                  className="px-6 py-2.5 rounded-lg bg-[#1c6856] hover:bg-[#154f42] text-white font-bold text-sm shadow-sm flex items-center gap-2 cursor-pointer transition"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>Confirmar Apertura del Día (Ambas Cajas)</span>
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Footer Informativo */}
        <div className="px-6 py-3 border-t border-slate-200 bg-white flex items-center justify-between text-xs text-slate-500">
          <div>
            Responsable: <strong className="text-slate-800">{openerName}</strong> • Fecha: <strong className="font-mono text-slate-800">{shiftDate}</strong>
          </div>
          <div>
            {step === 1 && 'Paso 1: Arqueo Caja Chica'}
            {step === 2 && `Gaveta Contada: C$ ${totalNIO.toLocaleString('es-NI', { minimumFractionDigits: 2 })}`}
            {step === 3 && `Gaveta General: C$ ${generalDrawerFloat.toFixed(2)} | Caja Chica: C$ ${resultingPettyInitialBalance.toFixed(2)}`}
          </div>
        </div>
      </div>
    </div>
  );
};
