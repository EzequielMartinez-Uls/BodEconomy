// Nombres cortos para mostrar las categorías de gasto.
// El código guardado en la base (CARNES, SUMINISTRO_PARA_COCINA/BARRA, …) no cambia:
// solo cambia cómo se ve en pantalla, en los tickets y en Excel.

const BADGE = 'bg-stone-100 text-stone-700 border-stone-200';

export const CATEGORY_LABELS: Record<string, string> = {
  CARNES: 'Carnes',
  POLLO: 'Pollo',
  HIELO: 'Hielo',
  BEBIDAS: 'Bebidas',
  BEBIDAS_ALCOHOLICAS: 'Licores',
  DELIVERYS_ACARREOS: 'Delivery',
  FRUTAS_VEGETALES: 'Frutas y verduras',
  SUPERMERCADO: 'Súper',
  MERCADO: 'Mercado',
  LACTEOS: 'Lácteos',
  PAGOS_PERSONAL: 'Personal',
  OTROS: 'Otros',
  'GASTOS ADMINISTRATIVOS': 'Administrativo',
  'MARISCOS/PESCADOS': 'Mariscos',
  'RECIPIENTES/EMPAQUES_Y_OTROS': 'Empaques',
  PAPELERIA_Y_MAS: 'Papelería',
  'SERVICIOS/REPARACIONES': 'Reparaciones',
  SUMINISTROS_DE_ARTICULOS_DE_LIMPIEZA: 'Limpieza',
  'SUMINISTRO_PARA_COCINA/BARRA': 'Suministros',
  MUSICA_Y_EVENTOS: 'Música',
  PANADERIA: 'Panadería',
  GAS_Y_DEMAS: 'Gas',
  SERVICIOS_BASICOS: 'Servicios básicos',
  RETIRO_SOCIOS: 'Retiro socios',
  PRESTAMOS: 'Préstamos',
  PROPINAS: 'Propinas',
  FONDEO: 'Depósito / Fondeo',
};

export function getCategoryLabel(catValue: string | null | undefined): string {
  if (!catValue) return '';
  const known = CATEGORY_LABELS[catValue] ?? CATEGORY_LABELS[catValue.toUpperCase()];
  if (known) return known;
  const words = catValue.replace(/[_/]+/g, ' ').trim().toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export function getCategoryInfo(catValue: string) {
  return {
    label: getCategoryLabel(catValue),
    emoji: '',
    badgeClass: catValue === 'FONDEO' ? 'bg-bodegon/5 text-bodegon border-bodegon/20' : BADGE,
  };
}

// Categorías que se ofrecen si el catálogo de la nube aún no cargó.
export const BUILTIN_CATEGORY_KEYS = [
  'CARNES', 'POLLO', 'HIELO', 'BEBIDAS', 'BEBIDAS_ALCOHOLICAS', 'DELIVERYS_ACARREOS',
  'FRUTAS_VEGETALES', 'SUPERMERCADO', 'MERCADO', 'LACTEOS', 'PAGOS_PERSONAL', 'OTROS', 'FONDEO',
];
