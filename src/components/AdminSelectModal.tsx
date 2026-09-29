import React from 'react';
import { User, Check, X } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  availableAdmins: string[];
  activeAdminName: string;
  onSelectAdmin: (name: string) => void;
}

export const AdminSelectModal: React.FC<Props> = ({
  isOpen,
  onClose,
  availableAdmins,
  activeAdminName,
  onSelectAdmin,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/70">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <User className="w-4 h-4 text-amber-600" />
            Cambiar Administrador en Turno
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-2">
          {availableAdmins.map((admin) => {
            const isSelected = admin === activeAdminName;

            return (
              <button
                key={admin}
                onClick={() => {
                  onSelectAdmin(admin);
                  onClose();
                }}
                className={`w-full flex items-center justify-between p-3.5 rounded-xl border text-left transition ${
                  isSelected
                    ? 'bg-amber-50/80 border-amber-300 text-slate-900 ring-1 ring-amber-400/40 shadow-sm'
                    : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center font-extrabold text-xs transition ${
                      isSelected
                        ? 'bg-amber-500 text-white shadow-sm shadow-amber-500/30'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {admin.charAt(0)}
                  </div>
                  <div>
                    <span className="font-bold text-sm text-slate-900 block">{admin}</span>
                    <span className="text-[11px] text-slate-500 block">
                      {admin === 'Eddy'
                        ? 'Apertura Habitual'
                        : admin === 'Xiomara'
                        ? 'Cierre Habitual'
                        : 'Administrador'}
                    </span>
                  </div>
                </div>

                {isSelected && (
                  <div className="w-6 h-6 rounded-full bg-amber-500 text-white flex items-center justify-center">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

