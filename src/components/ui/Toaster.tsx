import React, { useEffect, useRef, useState } from 'react';

const TOAST_EVENT = 'bodegon:toast';

interface ToastDetail {
  title: string;
  detail?: string;
}

/** Muestra un aviso breve abajo a la derecha, con una palomita que se dibuja. */
export function notify(title: string, detail?: string) {
  window.dispatchEvent(new CustomEvent<ToastDetail>(TOAST_EVENT, { detail: { title, detail } }));
}

export const Toaster: React.FC = () => {
  const [toast, setToast] = useState<(ToastDetail & { key: number }) | null>(null);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => {
    const onToast = (e: Event) => {
      const { title, detail } = (e as CustomEvent<ToastDetail>).detail;
      window.clearTimeout(timer.current);
      setToast({ title, detail, key: Date.now() });
      timer.current = window.setTimeout(() => setToast(null), 3000);
    };
    window.addEventListener(TOAST_EVENT, onToast);
    return () => {
      window.removeEventListener(TOAST_EVENT, onToast);
      window.clearTimeout(timer.current);
    };
  }, []);

  if (!toast) return null;

  return (
    <div
      key={toast.key}
      role="status"
      aria-live="polite"
      className="bd-toast fixed right-6 bottom-6 z-[70] flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-white border border-stone-200 shadow-[0_12px_32px_rgba(26,21,18,0.12)] print:hidden"
    >
      <div className="w-8 h-8 rounded-full bg-bodegon/10 flex items-center justify-center shrink-0">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#135E4A" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path className="bd-check" d="M5 12.5l4.5 4.5L19 7.5" />
        </svg>
      </div>
      <div>
        <div className="text-sm font-semibold text-stone-900">{toast.title}</div>
        {toast.detail && <div className="text-xs text-stone-500">{toast.detail}</div>}
      </div>
    </div>
  );
};
