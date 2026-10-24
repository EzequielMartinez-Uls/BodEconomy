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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 animate-in fade-in duration-150">
      <div className="bg-white border border-stone-200 rounded-xl w-full max-w-sm overflow-hidden shadow-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-200 bg-stone-50/90">
          <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
            <User className="w-4 h-4 text-bodegon" />
            Cambiar Administrador en Turno
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition cursor-pointer"
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
                className={`w-full flex items-center justify-between p-3 rounded-lg border text-left transition cursor-pointer ${
                  isSelected
                    ? 'bg-bodegon/3 border-bodegon/35 text-stone-900 ring-1 ring-bodegon/30'
                    : 'bg-white border-stone-200 text-stone-700 hover:border-stone-300 hover:bg-stone-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs transition ${
                      isSelected
                        ? 'bg-bodegon text-white shadow-xs'
                        : 'bg-stone-100 text-stone-600'
                    }`}
                  >
                    {admin.charAt(0)}
                  </div>
                  <div>
                    <span className="font-bold text-xs text-stone-900 block">{admin}</span>
                    <span className="text-[11px] text-stone-500 block">
                      {admin === 'Eddy'
                        ? 'Apertura Habitual'
                        : admin === 'Xiomara'
                        ? 'Cierre Habitual'
                        : 'Administrador'}
                    </span>
                  </div>
                </div>

                {isSelected && (
                  <div className="w-5 h-5 rounded-full bg-bodegon text-white flex items-center justify-center">
                    <Check className="w-3 h-3 stroke-[3]" />
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

