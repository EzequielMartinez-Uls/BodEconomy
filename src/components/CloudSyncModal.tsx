import React, { useState } from 'react';
import { supabase } from '../services/supabaseSync';
import {
  Cloud,
  CheckCircle2,
  RefreshCw,
  Server,
  Database,
  ShieldCheck,
  X,
  Activity,
  Zap,
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onForceRefresh?: () => void;
}

export const CloudSyncModal: React.FC<Props> = ({ isOpen, onClose, onForceRefresh }) => {
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    latencyMs: number;
    message: string;
    shiftsCount?: number;
    expensesCount?: number;
  } | null>(null);

  if (!isOpen) return null;

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    const start = performance.now();
    try {
      const [{ data: jData, count: jCount, error: jErr }, { data: gData, count: gCount, error: gErr }] =
        await Promise.all([
          supabase.from('jornadas_diarias').select('*', { count: 'exact' }).limit(1),
          supabase.from('compras_gastos').select('*', { count: 'exact' }).limit(1),
        ]);

      const end = performance.now();
      const latencyMs = Math.round(end - start);

      if (jErr || gErr) {
        setTestResult({
          success: false,
          latencyMs,
          message: jErr?.message || gErr?.message || 'Error al conectar con la base de datos',
        });
      } else {
        setTestResult({
          success: true,
          latencyMs,
          message: `Conexión en vivo exitosa con Supabase El Bodegón (${latencyMs} ms). Servidor activo y respondiendo.`,
          shiftsCount: jCount ?? 0,
          expensesCount: gCount ?? 0,
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        latencyMs: 0,
        message: err?.message || 'Fallo de red o sin conexión a internet',
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-xl max-w-lg w-full border border-slate-200 shadow-xl overflow-hidden">
        {/* Header */}
        <div className="bg-[#1c6856] px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center text-white">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold">
                Estado de la Nube • Supabase
              </h3>
              <p className="text-xs text-emerald-100 font-medium">
                Conexión centralizada y sincronización en tiempo real
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Status Badge */}
          <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
              <div>
                <span className="text-xs font-bold text-emerald-950 block">
                  Nube Conectada & Sincronizada
                </span>
                <span className="text-[11px] text-emerald-800 font-medium">
                  Canal Realtime activo: bodegon-control-desktop-realtime
                </span>
              </div>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white text-emerald-800 border border-emerald-300">
              En Vivo
            </span>
          </div>

          {/* Connection Details */}
          <div className="space-y-2 text-xs text-slate-600">
            <div className="flex items-center justify-between py-2 border-b border-slate-100">
              <span className="flex items-center gap-2 font-medium text-slate-500">
                <Server className="w-3.5 h-3.5 text-slate-400" />
                Host del Servidor
              </span>
              <span className="font-mono font-bold text-slate-800 text-[11px]">
                kwkyvdoacselhbrnvney.supabase.co
              </span>
            </div>

            <div className="flex items-center justify-between py-2 border-b border-slate-100">
              <span className="flex items-center gap-2 font-medium text-slate-500">
                <Database className="w-3.5 h-3.5 text-slate-400" />
                Tablas Sincronizadas
              </span>
              <span className="font-bold text-slate-800">
                jornadas_diarias, compras_gastos
              </span>
            </div>

            <div className="flex items-center justify-between py-2 border-b border-slate-100">
              <span className="flex items-center gap-2 font-medium text-slate-500">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                Seguridad & Aislamiento
              </span>
              <span className="font-bold text-emerald-800">
                Protección RLS + Modo Offline-First
              </span>
            </div>
          </div>

          {/* Test Result Message */}
          {testResult && (
            <div
              className={`p-3 rounded-lg text-xs border font-medium ${
                testResult.success
                  ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                  : 'bg-rose-50 text-rose-900 border-rose-200'
              }`}
            >
              <div className="flex items-center gap-2 font-bold mb-1">
                {testResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : (
                  <Activity className="w-4 h-4 text-rose-600" />
                )}
                <span>{testResult.success ? 'Diagnóstico Positivo' : 'Error de Conexión'}</span>
              </div>
              <p>{testResult.message}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5 pt-1">
            <button
              onClick={handleTestConnection}
              disabled={testing}
              className="flex-1 py-2.5 px-4 rounded-lg bg-[#1c6856] hover:bg-[#154f42] text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-xs cursor-pointer disabled:opacity-50"
            >
              {testing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-white" />
                  <span>Midiendo latencia...</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 text-emerald-200" />
                  <span>Probar Conexión Ahora</span>
                </>
              )}
            </button>

            {onForceRefresh && (
              <button
                onClick={() => {
                  onForceRefresh();
                  handleTestConnection();
                }}
                className="py-2.5 px-4 rounded-lg border border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                title="Forzar actualización de datos con la nube"
              >
                <RefreshCw className="w-4 h-4 text-slate-600" />
                <span>Actualizar Datos</span>
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
          <span>El Bodegón Restaurante • Cloud Sync</span>
          <button
            onClick={onClose}
            className="font-bold text-slate-700 hover:text-slate-900 cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
