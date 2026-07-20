import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { Input, Label, Select, Textarea } from '@/components/ui/Input';
import {
  useTransacciones,
  useCategorias,
  useCrearTransaccion,
  useEliminarTransaccion,
  useSuscripciones,
} from '@/hooks/useFinanzas';
import { useProyectos } from '@/hooks/useProyectos';
import { formatoMoneda, formatoFecha } from '@/lib/utils';
import type { FlujoTransaccion, ClaseIngreso, EstadoTransaccion } from '@/types/database';
import { SuscripcionesPanel } from './SuscripcionesPanel';

const estadoTono: Record<EstadoTransaccion, 'neutro' | 'acento' | 'peligro'> = {
  confirmada: 'neutro',
  pendiente: 'acento',
  cobrada: 'acento',
  vencida: 'peligro',
};

export function FinanzasPage() {
  const { data: transacciones, isLoading } = useTransacciones();
  const eliminar = useEliminarTransaccion();
  const [modalAbierto, setModalAbierto] = useState(false);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-texto">Finanzas</h1>
          <p className="text-texto-secundario text-sm mt-1">
            Inversión, ingresos y gastos operativos — todo en un libro mayor
          </p>
        </div>
        <Button onClick={() => setModalAbierto(true)}>
          <Plus size={16} /> Nueva transacción
        </Button>
      </div>

      <Card className="p-0 overflow-hidden">
        {isLoading ? (
          <div className="p-5 text-sm text-texto-secundario">Cargando…</div>
        ) : !transacciones?.length ? (
          <div className="p-5 text-sm text-texto-secundario">Sin transacciones registradas.</div>
        ) : (
          <div className="divide-y divide-borde max-h-[480px] overflow-y-auto">
            {transacciones.map((t) => (
              <div key={t.id} className="flex items-center gap-4 p-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-texto truncate">
                      {t.descripcion || t.categorias_financieras?.nombre}
                    </span>
                    <Badge tono={estadoTono[t.estado]}>{t.estado}</Badge>
                  </div>
                  <p className="text-xs text-texto-secundario mt-0.5">
                    {t.categorias_financieras?.nombre} · {t.proyectos?.nombre ?? 'General'} · {formatoFecha(t.fecha)}
                  </p>
                </div>
                <span className={`cifra text-sm font-medium shrink-0 ${t.flujo === 'ingreso' ? 'text-acento' : 'text-texto'}`}>
                  {t.flujo === 'ingreso' ? '+' : '-'}
                  {formatoMoneda(t.monto, t.moneda)}
                </span>
                <button
                  onClick={() => eliminar.mutate(t.id)}
                  className="text-xs text-texto-secundario hover:text-peligro shrink-0"
                >
                  Eliminar
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>

      <SuscripcionesPanel />

      <ModalNuevaTransaccion abierto={modalAbierto} onCerrar={() => setModalAbierto(false)} />
    </div>
  );
}

function ModalNuevaTransaccion({ abierto, onCerrar }: { abierto: boolean; onCerrar: () => void }) {
  const { data: categorias } = useCategorias();
  const { data: proyectos } = useProyectos();
  const crear = useCrearTransaccion();

  const [flujo, setFlujo] = useState<FlujoTransaccion>('egreso');
  const [categoriaId, setCategoriaId] = useState('');
  const [proyectoId, setProyectoId] = useState('');
  const [monto, setMonto] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [claseIngreso, setClaseIngreso] = useState<ClaseIngreso>('pago_unico');
  const [fecha, setFecha] = useState(() => new Date().toISOString().slice(0, 10));

  const categoriasFiltradas = categorias?.filter((c) =>
    flujo === 'ingreso' ? c.capa === 'ingreso' : c.capa === 'inversion' || c.capa === 'gasto_operativo'
  );

  async function manejarEnvio() {
    if (!categoriaId || !monto) return;
    await crear.mutateAsync({
      flujo,
      categoria_id: categoriaId,
      proyecto_id: proyectoId || null,
      monto: Number(monto),
      descripcion: descripcion || null,
      clase_ingreso: flujo === 'ingreso' ? claseIngreso : null,
      estado: flujo === 'ingreso' && claseIngreso === 'cuenta_por_cobrar' ? 'pendiente' : 'confirmada',
      fecha,
      fecha_cobro_esperada: flujo === 'ingreso' && claseIngreso === 'cuenta_por_cobrar' ? fecha : null,
    });
    setMonto('');
    setDescripcion('');
    setCategoriaId('');
    onCerrar();
  }

  return (
    <Modal abierto={abierto} onCerrar={onCerrar} titulo="Nueva transacción">
      <div className="space-y-4">
        <div className="flex gap-2">
          <button
            className={`flex-1 rounded-lg border py-2 text-sm font-medium transition-colors ${
              flujo === 'ingreso' ? 'bg-acento-suave border-acento/30 text-acento' : 'border-borde text-texto-secundario'
            }`}
            onClick={() => setFlujo('ingreso')}
          >
            Ingreso
          </button>
          <button
            className={`flex-1 rounded-lg border py-2 text-sm font-medium transition-colors ${
              flujo === 'egreso' ? 'bg-panel-alto border-texto/20 text-texto' : 'border-borde text-texto-secundario'
            }`}
            onClick={() => setFlujo('egreso')}
          >
            Egreso
          </button>
        </div>

        <div>
          <Label>Categoría</Label>
          <Select value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)}>
            <option value="">Selecciona…</option>
            {categoriasFiltradas?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </Select>
        </div>

        {flujo === 'ingreso' && (
          <div>
            <Label>Clase de ingreso</Label>
            <Select value={claseIngreso} onChange={(e) => setClaseIngreso(e.target.value as ClaseIngreso)}>
              <option value="pago_unico">Pago único</option>
              <option value="recurrente">Recurrente</option>
              <option value="cuenta_por_cobrar">Cuenta por cobrar</option>
            </Select>
          </div>
        )}

        <div>
          <Label>Proyecto (opcional)</Label>
          <Select value={proyectoId} onChange={(e) => setProyectoId(e.target.value)}>
            <option value="">General (sin proyecto)</option>
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
            <Label>Fecha</Label>
            <Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
          </div>
        </div>

        <div>
          <Label>Descripción</Label>
          <Textarea rows={2} value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
        </div>

        <Button className="w-full" onClick={manejarEnvio} disabled={crear.isPending || !categoriaId || !monto}>
          {crear.isPending ? 'Guardando…' : 'Registrar transacción'}
        </Button>
      </div>
    </Modal>
  );
}
