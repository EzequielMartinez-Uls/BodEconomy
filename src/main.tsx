import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/inter'
import '@fontsource-variable/big-shoulders/opsz.css'
import './index.css'
import App from './App.tsx'

// Fix para Electron en Windows: los cuadros nativos síncronos (window.alert / window.confirm)
// hacen que Chromium pierda el foco del teclado (impidiendo escribir en inputs o abrir selects).
// Al cerrar cualquier alerta/confirmación, forzamos la restauración del foco en la ventana nativa y en el DOM.
if (typeof window !== 'undefined') {
  // La rueda del mouse NO cambia montos: sobre un campo numérico solo desplaza la pantalla.
  // (En Chromium, girar la rueda sobre un <input type="number"> con foco sube o baja el número.)
  const findScrollable = (el: HTMLElement | null): HTMLElement => {
    let node = el?.parentElement ?? null;
    while (node && node !== document.body) {
      const oy = getComputedStyle(node).overflowY;
      if ((oy === 'auto' || oy === 'scroll') && node.scrollHeight > node.clientHeight) return node;
      node = node.parentElement;
    }
    return (document.scrollingElement as HTMLElement) || document.documentElement;
  };
  window.addEventListener(
    'wheel',
    (e) => {
      const t = e.target as HTMLElement | null;
      if (!(t instanceof HTMLInputElement) || t.type !== 'number') return;
      e.preventDefault();
      const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? window.innerHeight : 1;
      findScrollable(t).scrollBy({ top: e.deltaY * unit, left: e.deltaX * unit });
    },
    { passive: false, capture: true },
  );

  const restoreElectronFocus = () => {
    const prevActive = document.activeElement as HTMLElement | null;
    const api = (window as any).electronAPI;
    if (api && typeof api.refocusWindow === 'function') {
      api.refocusWindow().catch(() => {});
    }
    window.focus();
    setTimeout(() => {
      window.focus();
      if (prevActive && typeof prevActive.focus === 'function' && document.body.contains(prevActive)) {
        prevActive.focus();
      }
    }, 30);
    setTimeout(() => {
      if (api && typeof api.refocusWindow === 'function') {
        api.refocusWindow().catch(() => {});
      }
      window.focus();
    }, 120);
  };

  const nativeAlert = window.alert.bind(window);
  window.alert = (message?: any) => {
    const res = nativeAlert(message);
    restoreElectronFocus();
    return res;
  };

  const nativeConfirm = window.confirm.bind(window);
  window.confirm = (message?: string): boolean => {
    const res = nativeConfirm(message);
    restoreElectronFocus();
    return res;
  };

  // Auto-recuperar foco si el usuario hace clic en un input/select/textarea y la ventana perdió el foco nativo
  window.addEventListener(
    'mousedown',
    (e) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const tag = target.tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA' || target.isContentEditable) {
        if (!document.hasFocus()) {
          const api = (window as any).electronAPI;
          if (api && typeof api.refocusWindow === 'function') {
            api.refocusWindow().catch(() => {});
          }
          window.focus();
          setTimeout(() => target.focus(), 20);
        }
      }
    },
    true
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
