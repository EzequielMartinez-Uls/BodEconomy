import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Fix para Electron en Windows: los cuadros nativos síncronos (window.alert / window.confirm)
// hacen que Chromium pierda el foco del teclado (impidiendo escribir en inputs o abrir selects).
// Al cerrar cualquier alerta/confirmación, forzamos la restauración del foco en la ventana nativa y en el DOM.
if (typeof window !== 'undefined') {
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
