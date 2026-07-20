import { Card } from '@/components/ui/Card';
import { cn } from '@/lib/utils';
import { usePipeline, useToggleEtapaPipeline } from '@/hooks/useProyectos';

export function PipelinePanel({ proyectoId }: { proyectoId: string }) {
  const { data: etapas } = usePipeline(proyectoId);
  const toggle = useToggleEtapaPipeline(proyectoId);

  if (!etapas?.length) return null;

  return (
    <Card>
      <h2 className="font-medium text-texto mb-4">Pipeline de ventas</h2>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {etapas.map((e) => (
          <button
            key={e.id}
            onClick={() => toggle.mutate({ id: e.id, completada: !e.completada })}
            className={cn(
              'shrink-0 rounded-lg border px-3 py-2 text-xs font-medium transition-colors whitespace-nowrap',
              e.completada
                ? 'bg-acento-suave border-acento/30 text-acento'
                : 'bg-panel-alto border-borde text-texto-secundario hover:text-texto'
            )}
          >
            {e.etapa}
          </button>
        ))}
      </div>
    </Card>
  );
}
