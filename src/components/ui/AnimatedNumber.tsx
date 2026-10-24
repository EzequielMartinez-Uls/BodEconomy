import React, { useEffect, useRef, useState } from 'react';

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

const defaultFormat = (n: number) =>
  n.toLocaleString('es-NI', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

interface Props {
  value: number;
  format?: (n: number) => string;
  duration?: number;
  className?: string;
}

/**
 * Muestra un monto que "cuenta" desde el valor anterior hasta el nuevo. Solo cambia lo que
 * se ve: el número real nunca se redondea ni se altera, y al terminar queda exacto.
 */
export const AnimatedNumber: React.FC<Props> = ({ value, format = defaultFormat, duration = 650, className }) => {
  const safeValue = Number.isFinite(value) ? value : 0;
  const [shown, setShown] = useState(safeValue);
  const shownRef = useRef(safeValue);

  useEffect(() => {
    const from = shownRef.current;
    if (from === safeValue || prefersReducedMotion()) {
      shownRef.current = safeValue;
      setShown(safeValue);
      return;
    }
    let raf = 0;
    let start: number | null = null;
    const step = (ts: number) => {
      if (start === null) start = ts;
      const p = Math.min(1, (ts - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      const current = p === 1 ? safeValue : from + (safeValue - from) * eased;
      shownRef.current = current;
      setShown(current);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [safeValue, duration]);

  return <span className={className}>{format(shown)}</span>;
};
