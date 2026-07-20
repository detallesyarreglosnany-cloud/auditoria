import { type HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

type Tono = 'neutro' | 'acento' | 'peligro' | 'exito';

const tonos: Record<Tono, string> = {
  neutro: 'bg-panel-alto text-texto-secundario border-borde',
  acento: 'bg-acento-suave text-acento border-acento/20',
  peligro: 'bg-peligro-suave text-peligro border-peligro/20',
  exito: 'bg-acento-suave text-acento border-acento/20',
};

export function Badge({
  className,
  tono = 'neutro',
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tono?: Tono }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium',
        tonos[tono],
        className
      )}
      {...props}
    />
  );
}
