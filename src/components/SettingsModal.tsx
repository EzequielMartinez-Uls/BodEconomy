import React, { useState } from 'react';
import { AppState } from '../types';
import { exportBackupJSON } from '../services/storage';
import {
  X,
  Settings,
  Users,
  CircleDollarSign,
  Download,
  Upload,
  RotateCcw,
  Shield,
  Check,
  Plus,
  Trash2,
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  state: AppState;
  onUpdateExchangeRate: (rate: number) => void;
  onAddAdmin: (name: string) => void;
  onRemoveAdmin: (name: string) => void;
  onRestoreState: (importedState: AppState) => void;
  onResetState: () => void;
}

export const SettingsModal: React.FC<Props> = ({
  isOpen,
  onClose,
  state,
  onUpdateExchangeRate,
  onAddAdmin,
  onRemoveAdmin,
  onRestoreState,
  onResetState,
}) => {
  if (!isOpen) return null;

  const [rateInput, setRateInput] = useState(state.defaultExchangeRate.toString());
  const [newAdminInput, setNewAdminInput] = useState('');
  const [activeTab, setActiveTab] = useState<'admins' | 'exchange' | 'backup'>('admins');

  const handleSaveRate = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseFloat(rateInput);
    if (!isNaN(parsed) && parsed > 0) {
      onUpdateExchangeRate(parsed);
      alert(`Tasa de cambio predeterminada actualizada a C$ ${parsed.toFixed(2)}.`);
    }
  };

  const handleAddAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newAdminInput.trim();
    if (clean && !state.availableAdmins.includes(clean)) {
      onAddAdmin(clean);
      setNewAdminInput('');
    }
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target?.result as string);
        if (parsed && typeof parsed === 'object') {
          onRestoreState(parsed);
          alert('¡Copia de seguridad restaurada con éxito!');
          onClose();
        }
      } catch (err) {
        alert('El archivo de respaldo no es válido.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
          <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center shadow-sm">
              <Settings className="w-4 h-4" />
            </div>
            Configuración & Respaldos del Sistema
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-slate-200 text-xs font-bold bg-slate-50/50 px-2">
          <button
            onClick={() => setActiveTab('admins')}
            className={`py-3 px-5 border-b-2 transition flex items-center gap-2 ${
              activeTab === 'admins'
                ? 'border-amber-500 text-amber-700 bg-white font-extrabold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Users className="w-4 h-4" /> Administradores
          </button>
          <button
            onClick={() => setActiveTab('exchange')}
            className={`py-3 px-5 border-b-2 transition flex items-center gap-2 ${
              activeTab === 'exchange'
                ? 'border-amber-500 text-amber-700 bg-white font-extrabold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <CircleDollarSign className="w-4 h-4" /> Tasa de Cambio
          </button>
          <button
            onClick={() => setActiveTab('backup')}
            className={`py-3 px-5 border-b-2 transition flex items-center gap-2 ${
              activeTab === 'backup'
                ? 'border-amber-500 text-amber-700 bg-white font-extrabold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Shield className="w-4 h-4" /> Copias de Seguridad
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-6 space-y-6 flex-1 overflow-y-auto">
          {/* TAB ADMINS */}
          {activeTab === 'admins' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 mb-1">
                  Administradores de Turno (Auditoría Cruzada)
                </h3>
                <p className="text-xs text-slate-500">
                  Personas autorizadas para realizar aperturas, cierres de caja y registro de gastos.
                </p>
              </div>

              <div className="space-y-2">
                {state.availableAdmins.map((admin) => (
                  <div
                    key={admin}
                    className="flex items-center justify-between p-3.5 bg-slate-50/80 rounded-xl border border-slate-200"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center font-bold text-xs shadow-sm shadow-amber-500/20">
                        {admin.charAt(0)}
                      </div>
                      <div>
                        <span className="font-bold text-slate-900 text-sm">{admin}</span>
                        {admin === state.activeAdminName && (
                          <span className="ml-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Activo Ahora
                          </span>
                        )}
                        {(admin === 'Eddy' || admin === 'Xiomara') && (
                          <span className="ml-2 text-[11px] text-slate-400 font-medium">
                            (Admin Principal)
                          </span>
                        )}
                      </div>
                    </div>

                    {admin !== 'Eddy' && admin !== 'Xiomara' && (
                      <button
                        type="button"
                        onClick={() => onRemoveAdmin(admin)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <form onSubmit={handleAddAdmin} className="flex gap-2 pt-2">
                <input
                  type="text"
                  placeholder="Nombre de nuevo administrador..."
                  value={newAdminInput}
                  onChange={(e) => setNewAdminInput(e.target.value)}
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-amber-500 focus:bg-white focus:ring-2 focus:ring-amber-500/20 transition"
                />
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span>Agregar</span>
                </button>
              </form>
            </div>
          )}

          {/* TAB EXCHANGE */}
          {activeTab === 'exchange' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 mb-1">
                  Tasa de Cambio Oficial y Predeterminada
                </h3>
                <p className="text-xs text-slate-500">
                  Esta tasa se usará automáticamente en todas las aperturas y cierres de turno para convertir billetes de dólares a córdobas.
                </p>
              </div>

              <form onSubmit={handleSaveRate} className="p-5 bg-slate-50/70 rounded-2xl border border-slate-200 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                    Tasa de Cambio (C$ por 1 US$)
                  </label>
                  <div className="flex items-center gap-2 max-w-xs">
                    <span className="text-slate-500 font-mono font-bold text-sm">C$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="1"
                      value={rateInput}
                      onChange={(e) => setRateInput(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xl font-mono font-bold text-slate-900 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition shadow-sm"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/25 transition"
                >
                  <Check className="w-4 h-4" />
                  <span>Guardar Nueva Tasa</span>
                </button>
              </form>
            </div>
          )}

          {/* TAB BACKUP */}
          {activeTab === 'backup' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-bold text-slate-900 mb-1">
                  Respaldos y Seguridad Local
                </h3>
                <p className="text-xs text-slate-500">
                  Tus datos se guardan de forma local e independiente en esta máquina. Puedes descargar una copia de seguridad en cualquier momento para guardarla en una memoria USB o restaurarla.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50/70 rounded-2xl border border-slate-200 flex flex-col justify-between space-y-3">
                  <div>
                    <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider block">
                      Descargar Copia de Seguridad
                    </span>
                    <p className="text-xs text-slate-500 mt-1">
                      Exporta todo el historial de turnos, caja chica e inventario en un archivo JSON cifrado.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => exportBackupJSON(state)}
                    className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold border border-slate-200 shadow-sm transition"
                  >
                    <Download className="w-4 h-4 text-emerald-600" />
                    <span>Descargar Respaldo</span>
                  </button>
                </div>

                <div className="p-4 bg-slate-50/70 rounded-2xl border border-slate-200 flex flex-col justify-between space-y-3">
                  <div>
                    <span className="text-xs font-bold text-amber-700 uppercase tracking-wider block">
                      Restaurar desde Respaldo
                    </span>
                    <p className="text-xs text-slate-500 mt-1">
                      Carga un archivo de respaldo previo para restablecer la base de datos local.
                    </p>
                  </div>
                  <label className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold border border-slate-200 shadow-sm transition cursor-pointer">
                    <Upload className="w-4 h-4 text-amber-600" />
                    <span>Seleccionar Archivo</span>
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleImportFile}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200">
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs">
                  <span className="text-rose-800 font-medium">
                    Restablecer datos maestros a valores iniciales de prueba
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm('¿Estás seguro de que deseas restablecer los datos a los valores iniciales?')) {
                        onResetState();
                        onClose();
                      }
                    }}
                    className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold transition shadow-sm"
                  >
                    Restablecer
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end px-6 py-4 border-t border-slate-100 bg-slate-50/70">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold rounded-xl bg-slate-800 hover:bg-slate-900 text-white transition shadow-sm"
          >
            Listo
          </button>
        </div>
      </div>
    </div>
  );
};

