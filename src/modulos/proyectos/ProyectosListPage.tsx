import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Input, Label, Textarea, Select } from '@/components/ui/Input';
import { useProyectos, useCrearProyecto } from '@/hooks/useProyectos';
import type { EstadoProyecto } from '@/types/database';

const estadoTono: Record<EstadoProyecto, 'neutro' | 'acento' | 'peligro'> = {
  idea: 'neutro',
  onboarding: 'acento',
  activo: 'acento',
  pausado: 'peligro',
  completado: 'neutro',
  archivado: 'neutro',
};

const estadoLabel: Record<EstadoProyecto, string> = {
  idea: 'Idea',
  onboarding: 'Onboarding',
  activo: 'Activo',
  pausado: 'Pausado',
  completado: 'Completado',
  archivado: 'Archivado',
};

export function ProyectosListPage() {
  const { data: proyectos, isLoading } = useProyectos();
  const [modalAbierto, setModalAbierto] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-texto">Proyectos</h1>
          <p className="text-texto-secundario text-sm mt-1">CRUD, tareas con peso y activos por proyecto</p>
        </div>
        <Button onClick={() => setModalAbierto(true)}>
          <Plus size={16} /> Nuevo proyecto
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-texto-secundario">Cargando…</p>
      ) : !proyectos?.length ? (
        <Card className="text-center py-12">
          <p className="text-texto-secundario text-sm">No tienes proyectos todavía.</p>
          <Button className="mt-4 mx-auto" onClick={() => setModalAbierto(true)}>
            <Plus size={16} /> Crear el primero
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {proyectos.map((p) => (
            <Link key={p.id} to={`/proyectos/${p.id}`}>
              <Card className="hover:border-acento/30 transition-colors h-full">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-medium text-texto truncate">{p.nombre}</h3>
                  <Badge tono={estadoTono[p.estado]}>{estadoLabel[p.estado]}</Badge>
                </div>
                {p.cliente && <p className="text-sm text-texto-secundario mt-1">{p.cliente}</p>}
                {p.descripcion && (
                  <p className="text-xs text-texto-secundario mt-3 line-clamp-2">{p.descripcion}</p>
                )}
              </Card>
            </Link>
          ))}
        </div>
      )}

      <ModalNuevoProyecto abierto={modalAbierto} onCerrar={() => setModalAbierto(false)} />
    </div>
  );
}

function ModalNuevoProyecto({ abierto, onCerrar }: { abierto: boolean; onCerrar: () => void }) {
  const crear = useCrearProyecto();
  const [nombre, setNombre] = useState('');
  const [cliente, setCliente] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [estado, setEstado] = useState<EstadoProyecto>('idea');

  async function manejarEnvio() {
    if (!nombre.trim()) return;
    await crear.mutateAsync({ nombre, cliente: cliente || null, descripcion: descripcion || null, estado });
    setNombre('');
    setCliente('');
    setDescripcion('');
    setEstado('idea');
    onCerrar();
  }

  return (
    <Modal abierto={abierto} onCerrar={onCerrar} titulo="Nuevo proyecto">
      <div className="space-y-4">
        <div>
          <Label htmlFor="nombre">Nombre</Label>
          <Input id="nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej. Campaña Q3" />
        </div>
        <div>
          <Label htmlFor="cliente">Cliente</Label>
          <Input id="cliente" value={cliente} onChange={(e) => setCliente(e.target.value)} placeholder="Opcional" />
        </div>
        <div>
          <Label htmlFor="descripcion">Descripción</Label>
          <Textarea
            id="descripcion"
            rows={3}
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="estado">Estado</Label>
          <Select id="estado" value={estado} onChange={(e) => setEstado(e.target.value as EstadoProyecto)}>
            {Object.entries(estadoLabel).map(([valor, label]) => (
              <option key={valor} value={valor}>
                {label}
              </option>
            ))}
          </Select>
        </div>
        <Button className="w-full" onClick={manejarEnvio} disabled={crear.isPending || !nombre.trim()}>
          {crear.isPending ? 'Creando…' : 'Crear proyecto'}
        </Button>
      </div>
    </Modal>
  );
}
