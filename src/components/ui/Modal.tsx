import { type ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Modal({
  abierto,
  onCerrar,
  titulo,
  children,
  className,
}: {
  abierto: boolean;
  onCerrar: () => void;
  titulo: string;
  children: ReactNode;
  className?: string;
}) {
  if (!abierto) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCerrar} />
      <div
        className={cn(
          'relative w-full max-w-lg rounded-xl border border-borde bg-panel p-6 shadow-2xl max-h-[85vh] overflow-y-auto',
          className
        )}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-texto">{titulo}</h2>
          <button onClick={onCerrar} className="text-texto-secundario hover:text-texto transition-colors">
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
