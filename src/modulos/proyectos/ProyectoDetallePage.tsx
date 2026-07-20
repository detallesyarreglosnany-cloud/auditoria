import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { Card, CardTitle, CardValue } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Input';
import { useProyecto, useActualizarProyecto, useEliminarProyecto } from '@/hooks/useProyectos';
import { useRoiProyectos } from '@/hooks/useDashboard';
import { formatoMoneda, formatoPorcentaje } from '@/lib/utils';
import { TareasPanel } from './TareasPanel';
import { ActivosPanel } from './ActivosPanel';
import { PipelinePanel } from './PipelinePanel';
import type { EstadoProyecto } from '@/types/database';

const estados: EstadoProyecto[] = ['idea', 'onboarding', 'activo', 'pausado', 'completado', 'archivado'];

export function ProyectoDetallePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: proyecto } = useProyecto(id);
  const { data: roiList } = useRoiProyectos();
  const actualizar = useActualizarProyecto();
  const eliminar = useEliminarProyecto();
  const [confirmarBorrado, setConfirmarBorrado] = useState(false);

  const roi = roiList?.find((r) => r.proyecto_id === id);

  if (!proyecto) return <p className="text-sm text-texto-secundario">Cargando…</p>;

  async function manejarBorrado() {
    if (!id) return;
    await eliminar.mutateAsync(id);
    navigate('/proyectos');
  }

  return (
    <div className="space-y-6">
      <Link to="/proyectos" className="inline-flex items-center gap-1 text-sm text-texto-secundario hover:text-texto">
        <ArrowLeft size={14} /> Proyectos
      </Link>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-texto">{proyecto.nombre}</h1>
          {proyecto.cliente && <p className="text-texto-secundario text-sm mt-1">{proyecto.cliente}</p>}
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={proyecto.estado}
            onChange={(e) => id && actualizar.mutate({ id, estado: e.target.value as EstadoProyecto })}
            className="w-40"
          >
            {estados.map((e) => (
              <option key={e} value={e}>
                {e}
              </option>
            ))}
          </Select>
          {confirmarBorrado ? (
            <div className="flex items-center gap-1">
              <Button variant="danger" size="sm" onClick={manejarBorrado}>
                Confirmar
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setConfirmarBorrado(false)}>
                Cancelar
              </Button>
            </div>
          ) : (
            <Button variant="ghost" size="sm" onClick={() => setConfirmarBorrado(true)}>
              <Trash2 size={14} />
            </Button>
          )}
        </div>
      </div>

      {roi && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardTitle>Ingresos cobrados</CardTitle>
            <CardValue>{formatoMoneda(roi.ingresos_cobrados)}</CardValue>
          </Card>
          <Card>
            <CardTitle>Egresos totales</CardTitle>
            <CardValue>{formatoMoneda(roi.egresos_totales)}</CardValue>
          </Card>
          <Card>
            <CardTitle>Rentabilidad</CardTitle>
            <CardValue className={roi.rentabilidad >= 0 ? 'text-acento' : 'text-peligro'}>
              {formatoMoneda(roi.rentabilidad)}
            </CardValue>
          </Card>
          <Card>
            <CardTitle>ROI</CardTitle>
            <CardValue>{roi.roi_pct !== null ? formatoPorcentaje(roi.roi_pct) : '—'}</CardValue>
          </Card>
        </div>
      )}

      {roi && (roi.por_cobrar > 0 || roi.vencido > 0) && (
        <div className="flex gap-3">
          {roi.por_cobrar > 0 && (
            <Badge tono="acento">Por cobrar: {formatoMoneda(roi.por_cobrar)}</Badge>
          )}
          {roi.vencido > 0 && <Badge tono="peligro">Vencido: {formatoMoneda(roi.vencido)}</Badge>}
        </div>
      )}

      <PipelinePanel proyectoId={proyecto.id} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TareasPanel proyectoId={proyecto.id} />
        <ActivosPanel proyectoId={proyecto.id} />
      </div>
    </div>
  );
}
