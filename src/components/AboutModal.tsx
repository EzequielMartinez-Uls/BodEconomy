import React from 'react';
import { X } from 'lucide-react';
import logoImg from '../assets/logo.png';
import tegaLogo from '../assets/tega.svg';
import { TEGA } from '../utils/tega';

interface Props {
  version: string;
  onClose: () => void;
}

/** "Acerca de": el único lugar con el logo completo de TEGA y su lema. */
export const AboutModal: React.FC<Props> = ({ version, onClose }) => (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 animate-in fade-in duration-150"
    onClick={onClose}
  >
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="acerca-titulo"
      className="w-full max-w-sm bg-white rounded-2xl border border-stone-200 shadow-2xl overflow-hidden"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="bg-bodegon text-white p-5 flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 bg-bodegon-noche">
          <img src={logoImg} alt="Restaurante El Bodegón" className="w-full h-full object-cover" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 id="acerca-titulo" className="font-display font-extrabold uppercase tracking-wide text-2xl leading-none">
            Bodegón Control
          </h2>
          <p className="text-xs text-white/80 mt-1">Caja y cierre diario del Bodegón</p>
        </div>
        <button
          onClick={onClose}
          aria-label="Cerrar"
          className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-5 space-y-4">
        <div className="space-y-2.5">
          <span className="block text-[10px] font-bold uppercase tracking-wider text-stone-500">Un producto de</span>
          <img src={tegaLogo} alt={TEGA.nombre} className="h-9 w-auto" />
          <p className="text-xs text-stone-700 tracking-wide">{TEGA.lema}</p>
        </div>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-xs pt-4 border-t border-stone-200">
          <dt className="text-stone-500">Versión</dt>
          <dd className="font-semibold tabular-nums">{version || '—'}</dd>
          <dt className="text-stone-500">Licencia</dt>
          <dd>Restaurante El Bodegón, León</dd>
          <dt className="text-stone-500">Teléfono</dt>
          <dd className="tabular-nums select-all">{TEGA.telefono}</dd>
          <dt className="text-stone-500">Correo</dt>
          <dd className="select-all break-all">{TEGA.correo}</dd>
        </dl>
      </div>
    </div>
  </div>
);
