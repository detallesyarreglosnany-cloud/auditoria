import { useState } from 'react';
import { Plus, Pause, Play } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input, Label, Select } from '@/components/ui/Input';
import {
  useSuscripciones,
  useCategorias,
  useCrearSuscripcion,
  useActualizarSuscripcion,
} from '@/hooks/useFinanzas';
import { useProyectos } from '@/hooks/useProyectos';
import { formatoMoneda, formatoFecha } from '@/lib/utils';
import type { CicloFacturacion } from '@/types/database';

export function SuscripcionesPanel() {
  const { data: suscripciones } = useSuscripciones();
  const actualizar = useActualizarSuscripcion();
  const [modalAbierto, setModalAbierto] = useState(false);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-medium text-texto-secundario">
          Suscripciones (LLMs, SaaS, Hosting)
        </h2>
        <Button size="sm" variant="secondary" onClick={() => setModalAbierto(true)}>
          <Plus size={14} /> Nueva
        </Button>
      </div>

      <Card className="p-0 overflow-hidden">
        {!suscripciones?.length ? (
          <div className="p-5 text-sm text-texto-secundario">Sin suscripciones registradas.</div>
        ) : (
          <div className="divide-y divide-borde">
            {suscripciones.map((s) => (
              <div key={s.id} className="flex items-center gap-4 p-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-texto truncate">{s.nombre}</span>
                    <Badge tono={s.estado === 'activa' ? 'acento' : 'neutro'}>{s.estado}</Badge>
                  </div>
                  <p className="text-xs text-texto-secundario mt-0.5">
                    {s.categorias_financieras?.nombre} · {s.proyectos?.nombre ?? 'General'} · renueva{' '}
                    {formatoFecha(s.proxima_renovacion)}
                  </p>
                </div>
                <span className="cifra text-sm text-texto shrink-0">
                  {formatoMoneda(s.monto, s.moneda)}/{s.ciclo === 'mensual' ? 'mes' : s.ciclo === 'trimestral' ? 'trim' : 'año'}
                </span>
                <button
                  onClick={() =>
                    actualizar.mutate({ id: s.id, estado: s.estado === 'activa' ? 'pausada' : 'activa' })
                  }
                  className="text-texto-secundario hover:text-acento shrink-0"
                  title={s.estado === 'activa' ? 'Pausar' : 'Activar'}
                >
                  {s.estado === 'activa' ? <Pause size={14} /> : <Play size={14} />}
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>

      <ModalNuevaSuscripcion abierto={modalAbierto} onCerrar={() => setModalAbierto(false)} />
    </div>
  );
}

function ModalNuevaSuscripcion({ abierto, onCerrar }: { abierto: boolean; onCerrar: () => void }) {
  const { data: categorias } = useCategorias();
  const { data: proyectos } = useProyectos();
  const crear = useCrearSuscripcion();

  const [nombre, setNombre] = useState('');
  const [categoriaId, setCategoriaId] = useState('');
  const [proyectoId, setProyectoId] = useState('');
  const [monto, setMonto] = useState('');
  const [ciclo, setCiclo] = useState<CicloFacturacion>('mensual');
  const [proximaRenovacion, setProximaRenovacion] = useState(() => new Date().toISOString().slice(0, 10));

  const categoriasOperativas = categorias?.filter((c) => c.capa === 'gasto_operativo');

  async function manejarEnvio() {
    if (!nombre.trim() || !categoriaId || !monto) return;
    await crear.mutateAsync({
      nombre,
      categoria_id: categoriaId,
      proyecto_id: proyectoId || null,
      monto: Number(monto),
      ciclo,
      proxima_renovacion: proximaRenovacion,
      estado: 'activa',
    });
    setNombre('');
    setMonto('');
    onCerrar();
  }

  return (
    <Modal abierto={abierto} onCerrar={onCerrar} titulo="Nueva suscripción">
      <div className="space-y-4">
        <div>
          <Label>Nombre</Label>
          <Input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej. Claude Pro" />
        </div>
        <div>
          <Label>Categoría</Label>
          <Select value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)}>
            <option value="">Selecciona…</option>
            {categoriasOperativas?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label>Proyecto (opcional)</Label>
          <Select value={proyectoId} onChange={(e) => setProyectoId(e.target.value)}>
            <option value="">General</option>
            {proyectos?.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Monto</Label>
            <Input type="number" min={0.01} step={0.01} value={monto} onChange={(e) => setMonto(e.target.value)} />
          </div>
          <div>
            <Label>Ciclo</Label>
            <Select value={ciclo} onChange={(e) => setCiclo(e.target.value as CicloFacturacion)}>
              <option value="mensual">Mensual</option>
              <option value="trimestral">Trimestral</option>
              <option value="anual">Anual</option>
            </Select>
          </div>
        </div>
        <div>
          <Label>Próxima renovación</Label>
          <Input type="date" value={proximaRenovacion} onChange={(e) => setProximaRenovacion(e.target.value)} />
        </div>
        <Button className="w-full" onClick={manejarEnvio} disabled={crear.isPending}>
          {crear.isPending ? 'Guardando…' : 'Crear suscripción'}
        </Button>
      </div>
    </Modal>
  );
}
