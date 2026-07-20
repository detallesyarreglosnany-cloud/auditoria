import { cn } from '@/lib/utils';

export function ProgressBar({ valor, className }: { valor: number; className?: string }) {
  const pct = Math.min(100, Math.max(0, valor));
  return (
    <div className={cn('h-1.5 w-full rounded-full bg-borde overflow-hidden', className)}>
      <div
        className="h-full rounded-full bg-acento transition-all duration-500"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
