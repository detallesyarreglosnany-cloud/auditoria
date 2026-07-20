import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatoMoneda(valor: number | null | undefined, moneda = 'USD') {
  if (valor === null || valor === undefined) return '—';
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: moneda,
    maximumFractionDigits: 2,
  }).format(valor);
}

export function formatoPorcentaje(valor: number | null | undefined) {
  if (valor === null || valor === undefined) return '—';
  return `${valor.toFixed(1)}%`;
}

export function formatoFecha(fecha: string | null | undefined) {
  if (!fecha) return '—';
  return new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }).format(
    new Date(fecha)
  );
}

export function diasRestantesLabel(dias: number) {
  if (dias < 0) return `Vencido hace ${Math.abs(dias)}d`;
  if (dias === 0) return 'Hoy';
  if (dias === 1) return 'Mañana';
  return `En ${dias} días`;
}
