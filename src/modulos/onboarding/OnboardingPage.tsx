import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Rocket } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input, Label } from '@/components/ui/Input';
import { usePlantillas, useInstanciarPlantilla } from '@/hooks/useOnboarding';
import type { Plantilla } from '@/types/database';

export function OnboardingPage() {
  const { data: plantillas, isLoading } = usePlantillas();
  const [plantillaSeleccionada, setPlantillaSeleccionada] = useState<Plantilla | null>(null);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-texto">Onboarding</h1>
        <p className="text-texto-secundario text-sm mt-1">
          Despliega un cliente nuevo con tareas, estructura de Drive, pipeline y stack ya listos
        </p>
      </div>

      {isLoading ? (
        <p className="text-sm text-texto-secundario">Cargando…</p>
      ) : !plantillas?.length ? (
        <Card className="text-center py-12">
          <p className="text-texto-secundario text-sm">No hay plantillas disponibles todavía.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {plantillas.map((p) => (
            <Card key={p.id} className="flex flex-col">
              <div className="h-10 w-10 rounded-lg bg-acento-suave flex items-center justify-center mb-3">
                <Rocket size={18} className="text-acento" />
              </div>
              <h3 className="font-medium text-texto">{p.nombre}</h3>
              {p.descripcion && <p className="text-xs text-texto-secundario mt-2 flex-1">{p.descripcion}</p>}
              <Button className="mt-4 w-full" size="sm" onClick={() => setPlantillaSeleccionada(p)}>
                Desplegar cliente
              </Button>
            </Card>
          ))}
        </div>
      )}

      <ModalDesplegar plantilla={plantillaSeleccionada} onCerrar={() => setPlantillaSeleccionada(null)} />
    </div>
  );
}

function ModalDesplegar({ plantilla, onCerrar }: { plantilla: Plantilla | null; onCerrar: () => void }) {
  const navigate = useNavigate();
  const instanciar = useInstanciarPlantilla();
  const [nombre, setNombre] = useState('');
  const [cliente, setCliente] = useState('');
  const [fechaInicio, setFechaInicio] = useState(() => new Date().toISOString().slice(0, 10));
  const [error, setError] = useState<string | null>(null);

  if (!plantilla) return null;

  async function manejarEnvio() {
    if (!plantilla || !nombre.trim()) return;
    setError(null);
    try {
      const proyectoId = await instanciar.mutateAsync({
        plantillaId: plantilla.id,
        nombre,
        cliente: cliente || undefined,
        fechaInicio,
      });
      onCerrar();
      navigate(`/proyectos/${proyectoId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo desplegar el proyecto');
    }
  }

  return (
    <Modal abierto={!!plantilla} onCerrar={onCerrar} titulo={`Desplegar: ${plantilla.nombre}`}>
      <div className="space-y-4">
        <div>
          <Label>Nombre del proyecto</Label>
          <Input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej. Lanzamiento Acme" />
        </div>
        <div>
          <Label>Cliente</Label>
          <Input value={cliente} onChange={(e) => setCliente(e.target.value)} placeholder="Ej. Acme Corp" />
        </div>
        <div>
          <Label>Fecha de inicio</Label>
          <Input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} />
        </div>
        {error && <p className="text-sm text-peligro">{error}</p>}
        <Button className="w-full" onClick={manejarEnvio} disabled={instanciar.isPending || !nombre.trim()}>
          {instanciar.isPending ? 'Desplegando…' : 'Desplegar cliente'}
        </Button>
      </div>
    </Modal>
  );
}
