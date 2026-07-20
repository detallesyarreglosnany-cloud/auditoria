import { useState } from 'react';
import { Plus, Trash2, AlertTriangle } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ProgressBar } from '@/components/ui/ProgressBar';
import {
  useTareas,
  useProgresoProyecto,
  useCrearTarea,
  useActualizarTarea,
  useEliminarTarea,
} from '@/hooks/useProyectos';
import { formatoPorcentaje } from '@/lib/utils';

export function TareasPanel({ proyectoId }: { proyectoId: string }) {
  const { data: tareas } = useTareas(proyectoId);
  const { data: progreso } = useProgresoProyecto(proyectoId);
  const crear = useCrearTarea(proyectoId);
  const actualizar = useActualizarTarea(proyectoId);
  const eliminar = useEliminarTarea(proyectoId);

  const [titulo, setTitulo] = useState('');
  const [peso, setPeso] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function agregarTarea() {
    setError(null);
    const pesoNum = Number(peso) || 0;
    try {
      await crear.mutateAsync({ titulo, peso_porcentual: pesoNum, orden: (tareas?.length ?? 0) + 1 });
      setTitulo('');
      setPeso('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo crear la tarea');
    }
  }

  const sumaPesos = progreso?.suma_pesos ?? 0;

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-medium text-texto">Tareas y pesos</h2>
        <div className="flex items-center gap-2">
          {!progreso?.pesos_balanceados && (
            <Badge tono="peligro">
              <AlertTriangle size={10} className="mr-1" />
              Suma: {sumaPesos}% / 100%
            </Badge>
          )}
          <span className="cifra text-sm text-texto-secundario">{formatoPorcentaje(progreso?.avance_pct ?? 0)}</span>
        </div>
      </div>

      <ProgressBar valor={progreso?.avance_pct ?? 0} className="mb-4" />

      <div className="space-y-2 mb-4">
        {tareas?.map((t) => (
          <div key={t.id} className="flex items-center gap-3 rounded-lg bg-panel-alto px-3 py-2">
            <input
              type="checkbox"
              checked={t.estado === 'completada'}
              onChange={(e) =>
                actualizar.mutate({ id: t.id, estado: e.target.checked ? 'completada' : 'pendiente' })
              }
              className="h-4 w-4 rounded accent-acento cursor-pointer shrink-0"
            />
            <span className={`flex-1 text-sm ${t.estado === 'completada' ? 'line-through text-texto-secundario' : 'text-texto'}`}>
              {t.titulo}
            </span>
            <span className="cifra text-xs text-texto-secundario shrink-0">{t.peso_porcentual}%</span>
            <button
              onClick={() => eliminar.mutate(t.id)}
              className="text-texto-secundario hover:text-peligro transition-colors shrink-0"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
        {!tareas?.length && <p className="text-sm text-texto-secundario">Sin tareas aún.</p>}
      </div>

      <div className="flex gap-2">
        <Input
          placeholder="Nueva tarea"
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          className="flex-1"
        />
        <Input
          placeholder="%"
          type="number"
          min={0}
          max={100}
          value={peso}
          onChange={(e) => setPeso(e.target.value)}
          className="w-20"
        />
        <Button size="md" onClick={agregarTarea} disabled={!titulo.trim() || crear.isPending}>
          <Plus size={16} />
        </Button>
      </div>
      {error && <p className="text-xs text-peligro mt-2">{error}</p>}
    </Card>
  );
}
