import React, { useState } from 'react';
import { CashShift, DenominationsNIO, DenominationsUSD } from '../types';
import {
  DEFAULT_DENOMINATIONS_NIO,
  DEFAULT_DENOMINATIONS_USD,
  calculateTotalNIO,
  calculateTotalUSD,
} from '../services/storage';
import { getLocalTodayStr, formatDateToFriendly } from '../utils/dateUtils';
import { CashDenominationsInput } from './CashDenominationsInput';
import {
  X,
  CheckCircle,
  ArrowRight,
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
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  lastClosedShift: CashShift | null;
  shiftHistory?: CashShift[];
  activeAdminName: string;
  defaultExchangeRate: number;
  availableAdmins: string[];
  onConfirmOpen: (shift: CashShift, updatedPreviousShift?: CashShift) => void;
}

export const OpeningModal: React.FC<Props> = ({
  isOpen,
  onClose,
  lastClosedShift,
  shiftHistory = [],
  activeAdminName,
  defaultExchangeRate,
  availableAdmins,
  onConfirmOpen,
}) => {
  if (!isOpen) return null;

  const todayStr = getLocalTodayStr();

  const [shiftDate, setShiftDate] = useState<string>(todayStr);
  const [openerName, setOpenerName] = useState(activeAdminName);
  const [exchangeRate, setExchangeRate] = useState(defaultExchangeRate);

  // 1. Conteo Físico Real de Gaveta al Abrir
  const [denominationsNIO, setDenominationsNIO] = useState<DenominationsNIO>(DEFAULT_DENOMINATIONS_NIO);
  const [denominationsUSD, setDenominationsUSD] = useState<DenominationsUSD>(DEFAULT_DENOMINATIONS_USD);
  const [notes, setNotes] = useState('');

  // Cálculos de Conteo Físico
  const totalNIO = calculateTotalNIO(denominationsNIO);
  const totalUSD = calculateTotalUSD(denominationsUSD);
  const totalEquivNIO = totalNIO + totalUSD * exchangeRate;

  // Corroboración contra el cierre anterior
  const expectedFromPrevious =
    lastClosedShift?.totalClosingEquivNIO ||
    lastClosedShift?.actualCashNIO ||
    lastClosedShift?.totalOpeningEquivNIO ||
    0;
  const differenceWithPrevious = totalEquivNIO - expectedFromPrevious;
  const isCountInitiated = totalEquivNIO > 0;
  const isMatchWithPrevious = lastClosedShift ? Math.abs(differenceWithPrevious) < 1.0 : true;

  const isSelectedDateClosed = shiftHistory.some((s) => s.date === shiftDate);

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

  // 2. Corroboración de Canales de Venta / Vouchers de Anoche
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
  const [syncCorrectionsToPrevious, setSyncCorrectionsToPrevious] = useState<boolean>(true);

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

  const handleResetSalesAudit = () => {
    setVouchersBAC('');
    setVouchersFicohsa('');
    setVouchersBanpro('');
    setVouchersLafise('');
    setReportPedidosYa('');
    setReportLoyverseCash('');
    setReportOtherIncome('');
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
  const totalSalesDiff = totalVerifiedSales - totalReportedSales;

  const handleConfirm = () => {
    if (shiftDate > todayStr) {
      alert(`No es posible abrir un turno con fecha futura (${shiftDate}). Selecciona la fecha de hoy (${todayStr}) o un día anterior.`);
      return;
    }

    if (totalEquivNIO <= 0) {
      const confirmZero = window.confirm(
        'El fondo de apertura está en C$ 0.00.\n\n¿Estás seguro de abrir la gaveta sin fondo de vuelto inicial?'
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

    if (diffItems.length > 0) {
      const auditSummary = `[Auditoría Vouchers Anoche: ${diffItems.join(', ')}]`;
      auditNotes = auditNotes ? `${auditNotes} • ${auditSummary}` : auditSummary;
    }

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
      totalOpeningNIO: totalNIO,
      totalOpeningUSD: totalUSD,
      totalOpeningEquivNIO: totalEquivNIO,
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
        notes: diffItems.length === 0 ? 'Vouchers verificados conformes con cierre anterior' : diffItems.join(', '),
      },
    };

    let updatedPreviousShift: CashShift | undefined = undefined;
    if (lastClosedShift && syncCorrectionsToPrevious && diffItems.length > 0) {
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
        closingNotes: lastClosedShift.closingNotes
          ? `${lastClosedShift.closingNotes} • Corroborado en apertura ${shiftDate}: ${diffItems.join(', ')}`
          : `Corroborado en apertura ${shiftDate}: ${diffItems.join(', ')}`,
      };
    }

    onConfirmOpen(newShift, updatedPreviousShift);
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
      name: 'Venta Efectivo (POS)',
      icon: <Receipt className="w-3.5 h-3.5 text-amber-600" />,
      reported: repLoyverseCash,
      val: reportLoyverseCash,
      setVal: setReportLoyverseCash,
      diff: diffLoyverseCash,
    },
    {
      id: 'otherIncome',
      name: 'Otros Ingresos',
      icon: <Coins className="w-3.5 h-3.5 text-cyan-600" />,
      reported: repOtherIncome,
      val: reportOtherIncome,
      setVal: setReportOtherIncome,
      diff: diffOtherIncome,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/25">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900">
                Apertura de Caja General
              </h2>
              <p className="text-xs text-slate-500">
                Conteo físico del fondo para vueltos y corroboración de gaveta
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 bg-slate-50/30">
          {/* Tarjeta de Corroboración con el Cierre Anterior */}
          {lastClosedShift ? (
            <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                  <span className="text-xs font-black uppercase tracking-wider text-slate-800">
                    Fondo dejado en el Cierre Anterior ({lastClosedShift.date})
                  </span>
                </div>
                <span className="text-xs text-slate-500">
                  Cerrado por: <strong className="text-slate-800">{lastClosedShift.closedBy}</strong>
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">
                    Saldo Entregado en Cierre
                  </span>
                  <strong className="text-base font-black text-slate-900 font-mono">
                    C$ {expectedFromPrevious.toFixed(2)}
                  </strong>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">
                    Tu Conteo Físico Real
                  </span>
                  <strong className="text-base font-black text-emerald-700 font-mono">
                    C$ {totalEquivNIO.toFixed(2)}
                  </strong>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopyFromPrevious}
                    className="flex-1 px-3 py-2 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition border border-slate-300 flex items-center justify-center gap-1 cursor-pointer"
                    title="Copiar las denominaciones del cierre anterior como referencia inicial"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                    <span>Cargar fondo de ayer</span>
                  </button>

                  {totalEquivNIO > 0 && (
                    <button
                      type="button"
                      onClick={handleResetCount}
                      className="px-3 py-2 text-xs font-bold text-slate-500 hover:text-rose-600 bg-white hover:bg-rose-50 rounded-xl transition border border-slate-200 cursor-pointer"
                      title="Limpiar conteo a cero"
                    >
                      Limpiar
                    </button>
                  )}
                </div>
              </div>

              {/* Semáforo de Corroboración Físico Siempre Visible */}
              <div
                className={`p-3 rounded-xl border text-xs font-bold flex items-center gap-2.5 ${
                  !isCountInitiated
                    ? 'bg-amber-50 border-amber-300 text-amber-900'
                    : isMatchWithPrevious
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                    : differenceWithPrevious < 0
                    ? 'bg-rose-50 border-rose-300 text-rose-900'
                    : 'bg-blue-50 border-blue-300 text-blue-900'
                }`}
              >
                {!isCountInitiated ? (
                  <>
                    <span className="text-base">⏳</span>
                    <span>
                      Pendiente de conteo físico: Ingresa los billetes y monedas abajo o toca "Cargar fondo de ayer". El saldo entregado en el cierre fue de <strong>C$ {expectedFromPrevious.toLocaleString('es-NI', { minimumFractionDigits: 2 })}</strong>.
                    </span>
                  </>
                ) : isMatchWithPrevious ? (
                  <>
                    <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>
                      Fondo verificado: Coincide exactamente con el efectivo dejado en el cierre anterior (C$ {expectedFromPrevious.toLocaleString('es-NI', { minimumFractionDigits: 2 })}).
                    </span>
                  </>
                ) : differenceWithPrevious < 0 ? (
                  <>
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>
                      Diferencia detectada (Faltante): Faltan C$ {Math.abs(differenceWithPrevious).toFixed(2)} respecto al cierre anterior (Esperado: C$ {expectedFromPrevious.toFixed(2)}, Contado: C$ {totalEquivNIO.toFixed(2)}).
                    </span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>
                      Diferencia detectada (Sobrante): Hay C$ {differenceWithPrevious.toFixed(2)} más de lo dejado en el cierre anterior (Esperado: C$ {expectedFromPrevious.toFixed(2)}, Contado: C$ {totalEquivNIO.toFixed(2)}).
                    </span>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl text-xs text-blue-800">
              ℹ️ Primer turno en registrarse. Realiza el conteo de billetes y monedas que conformarán el fondo inicial para vueltos.
            </div>
          )}

          {/* Auditoría de Canales de Venta y Vouchers de Anoche */}
          {lastClosedShift && (
            <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-black text-slate-800 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>Auditoría de Vouchers y Canales de Venta de Anoche</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Corrobora comprobantes POS y reportes del cierre <strong>{formatDateToFriendly(lastClosedShift.date)}</strong> de <strong>{lastClosedShift.closedBy || 'Turno anterior'}</strong>.
                  </p>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={handleCopySalesFromPrevious}
                    className="px-3 py-1.5 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition border border-slate-300 flex items-center gap-1.5 cursor-pointer"
                    title="Copiar todas las cifras reportadas anoche como base para auditar"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                    <span>Copiar cifras de anoche</span>
                  </button>
                  {(vouchersBAC !== '' || vouchersFicohsa !== '' || vouchersBanpro !== '' || vouchersLafise !== '' || reportPedidosYa !== '' || reportLoyverseCash !== '') && (
                    <button
                      type="button"
                      onClick={handleResetSalesAudit}
                      className="px-2.5 py-1.5 text-xs font-bold text-slate-500 hover:text-rose-600 bg-white hover:bg-rose-50 rounded-xl transition border border-slate-200 cursor-pointer"
                      title="Limpiar entradas de auditoría"
                    >
                      Limpiar
                    </button>
                  )}
                </div>
              </div>

              {/* Grid de 6 Canales */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {channelsAuditConfig.map((ch) => {
                  const hasValue = ch.val !== '';
                  const isSquare = ch.diff !== null && Math.abs(ch.diff) < 0.01;
                  const isShortage = ch.diff !== null && ch.diff < -0.01;
                  const isSurplus = ch.diff !== null && ch.diff > 0.01;

                  return (
                    <div
                      key={ch.id}
                      className={`p-3 rounded-xl border transition-colors ${
                        !hasValue
                          ? 'bg-slate-50/70 border-slate-200'
                          : isSquare
                          ? 'bg-emerald-50/50 border-emerald-300'
                          : isShortage
                          ? 'bg-rose-50/60 border-rose-300'
                          : 'bg-blue-50/60 border-blue-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                          {ch.icon}
                          <span>{ch.name}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => ch.setVal(String(ch.reported))}
                          className="text-[10px] text-slate-400 hover:text-emerald-700 underline cursor-pointer"
                          title="Copiar cifra de anoche a este canal"
                        >
                          Copiar anoche
                        </button>
                      </div>

                      <div className="text-[11px] text-slate-500 mb-2 flex items-center justify-between font-mono">
                        <span>Reportó anoche:</span>
                        <span className="font-bold text-slate-700">C$ {ch.reported.toLocaleString('es-NI', { minimumFractionDigits: 2 })}</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-mono font-bold text-slate-400">C$</span>
                        <input
                          type="number"
                          step="0.01"
                          placeholder={ch.reported.toFixed(2)}
                          value={ch.val}
                          onChange={(e) => ch.setVal(e.target.value)}
                          className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-slate-800 focus:outline-none focus:border-emerald-500"
                        />
                      </div>

                      {hasValue && ch.diff !== null && (
                        <div className="mt-2 flex items-center justify-between text-[11px] font-bold">
                          <span className="text-slate-500 font-normal">Resultado:</span>
                          {isSquare && (
                            <span className="text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-md flex items-center gap-1">
                              ✓ Cuadrado
                            </span>
                          )}
                          {isShortage && (
                            <span className="text-rose-700 bg-rose-100/80 px-2 py-0.5 rounded-md">
                              Faltante: C$ {Math.abs(ch.diff).toFixed(2)}
                            </span>
                          )}
                          {isSurplus && (
                            <span className="text-blue-700 bg-blue-100/80 px-2 py-0.5 rounded-md">
                              Sobrante: +C$ {ch.diff.toFixed(2)}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Resumen Global de Auditoría */}
              <div className="p-3.5 rounded-xl border bg-slate-50 border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                <div>
                  <span className="text-slate-500 block text-[11px] uppercase font-bold">Total Canales Reportados</span>
                  <strong className="text-sm font-black text-slate-800 font-mono">
                    C$ {totalReportedSales.toLocaleString('es-NI', { minimumFractionDigits: 2 })}
                  </strong>
                </div>

                <div className="text-left sm:text-right">
                  <span className="text-slate-500 block text-[11px] uppercase font-bold">Total Verificado en Apertura</span>
                  <strong className="text-sm font-black text-emerald-700 font-mono">
                    C$ {totalVerifiedSales.toLocaleString('es-NI', { minimumFractionDigits: 2 })}
                  </strong>
                </div>

                <div className={`px-3 py-1.5 rounded-xl border font-bold text-xs ${
                  Math.abs(totalSalesDiff) < 0.01
                    ? 'bg-emerald-100/80 border-emerald-300 text-emerald-900'
                    : totalSalesDiff < 0
                    ? 'bg-rose-100/80 border-rose-300 text-rose-900'
                    : 'bg-blue-100/80 border-blue-300 text-blue-900'
                }`}>
                  {Math.abs(totalSalesDiff) < 0.01 ? (
                    <span>✓ Vouchers y canales 100% Cuadrados</span>
                  ) : totalSalesDiff < 0 ? (
                    <span>⚠️ Faltante global de vouchers: -C$ {Math.abs(totalSalesDiff).toFixed(2)}</span>
                  ) : (
                    <span>ℹ️ Sobrante global de vouchers: +C$ {totalSalesDiff.toFixed(2)}</span>
                  )}
                </div>
              </div>

              {/* Checkbox de sincronización con el cierre anterior */}
              <label className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer hover:bg-slate-100/70 transition">
                <input
                  type="checkbox"
                  checked={syncCorrectionsToPrevious}
                  onChange={(e) => setSyncCorrectionsToPrevious(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 cursor-pointer"
                />
                <div className="text-xs">
                  <span className="font-bold text-slate-800">Actualizar y corregir el cierre anterior con estos vouchers verificados</span>
                  <span className="block text-slate-500 text-[11px]">
                    Si detectas un faltante o sobrante en vouchers, sincroniza automáticamente el historial del cierre anterior para mantener la contabilidad impecable.
                  </span>
                </div>
              </label>
            </div>
          )}

          {/* Parámetros Generales */}
          <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  <span>Fecha de la Jornada</span>
                </label>
                <input
                  type="date"
                  required
                  max={todayStr}
                  value={shiftDate}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val > todayStr) {
                      alert(`No puedes seleccionar una fecha futura (${val}).`);
                      setShiftDate(todayStr);
                    } else {
                      setShiftDate(val);
                    }
                  }}
                  className={`w-full border rounded-xl px-3 py-2 text-sm font-mono font-bold focus:outline-none ${
                    isSelectedDateClosed
                      ? 'border-amber-400 bg-amber-50 text-amber-900 focus:ring-2 focus:ring-amber-500/20'
                      : 'border-slate-300 bg-slate-50 text-slate-900 focus:bg-white focus:border-emerald-500'
                  }`}
                />
                <span className="text-[10px] text-slate-400 block mt-1">
                  {formatDateToFriendly(shiftDate)}
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <UserCheck className="w-3.5 h-3.5 text-emerald-600" /> Administrador / Cajero
                </label>
                <select
                  value={openerName}
                  onChange={(e) => setOpenerName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 text-slate-900 rounded-xl px-3 py-2 text-sm focus:bg-white focus:outline-none focus:border-emerald-500 font-bold"
                >
                  {availableAdmins.map((adm) => (
                    <option key={adm} value={adm}>
                      {adm}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-600" /> Tasa de Cambio (C$ / US$)
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 text-sm font-mono font-bold">C$</span>
                  <input
                    type="number"
                    step="0.01"
                    value={exchangeRate}
                    onChange={(e) => setExchangeRate(parseFloat(e.target.value) || defaultExchangeRate)}
                    className="w-full bg-slate-50 border border-slate-300 text-slate-900 rounded-xl px-3 py-2 text-sm font-mono font-black focus:bg-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>

            {isSelectedDateClosed && (
              <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-xl flex items-start gap-2.5 text-xs text-amber-900">
                <span className="text-base">⚠️</span>
                <div>
                  <strong className="block font-black">Aviso de Jornada Previa:</strong>
                  La fecha <strong>{shiftDate}</strong> ya cuenta con un cierre registrado en el historial. El sistema está diseñado para 1 apertura y 1 cierre por día comercial.
                </div>
              </div>
            )}
          </div>

          {/* Conteo de Billetes y Monedas */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-black text-slate-800 flex items-center gap-1.5">
                <Banknote className="w-4 h-4 text-emerald-600" />
                <span>Conteo Físico de Billetes y Monedas en Gaveta</span>
              </h3>
              <span className="text-xs text-slate-500 font-medium">
                Digita lo que recibes físicamente en mano
              </span>
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
          </div>

          {/* Notas de Apertura */}
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
              Observaciones de Apertura (opcional)
            </label>
            <input
              type="text"
              placeholder="Ej: Se recibe gaveta en orden con C$ 2,000 en sencillo..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-white border border-slate-300 text-slate-900 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-emerald-500 font-medium shadow-2xs"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-white">
          <div className="text-sm">
            <span className="text-slate-500 font-medium">Fondo Apertura Contado: </span>
            <strong className="text-xl font-black text-emerald-600 font-mono">
              C$ {totalEquivNIO.toLocaleString('es-NI', { minimumFractionDigits: 2 })}
            </strong>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-800 transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-black shadow-md shadow-emerald-600/25 transition active:scale-95 cursor-pointer"
            >
              <CheckCircle className="w-4 h-4" />
              <span>Confirmar y Abrir Turno</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
