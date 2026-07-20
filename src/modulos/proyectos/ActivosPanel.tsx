import { useState } from 'react';
import { Plus, Trash2, Link as LinkIcon, FolderOpen, FileText, KeyRound, ExternalLink } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { useActivos, useCrearActivo, useEliminarActivo } from '@/hooks/useProyectos';
import type { TipoActivo } from '@/types/database';

const iconos: Record<TipoActivo, typeof LinkIcon> = {
  link: LinkIcon,
  archivo: FileText,
  carpeta_drive: FolderOpen,
  credencial: KeyRound,
  documento: FileText,
};

export function ActivosPanel({ proyectoId }: { proyectoId: string }) {
  const { data: activos } = useActivos(proyectoId);
  const crear = useCrearActivo(proyectoId);
  const eliminar = useEliminarActivo(proyectoId);

  const [titulo, setTitulo] = useState('');
  const [url, setUrl] = useState('');
  const [tipo, setTipo] = useState<TipoActivo>('link');

  async function agregar() {
    if (!titulo.trim()) return;
    await crear.mutateAsync({ titulo, url: url || null, tipo });
    setTitulo('');
    setUrl('');
  }

  return (
    <Card>
      <h2 className="font-medium text-texto mb-4">Activos adjuntos</h2>

      <div className="space-y-2 mb-4">
        {activos?.map((a) => {
          const Icon = iconos[a.tipo];
          return (
            <div key={a.id} className="flex items-center gap-3 rounded-lg bg-panel-alto px-3 py-2">
              <Icon size={16} className="text-acento shrink-0" />
              <span className="flex-1 text-sm text-texto truncate">{a.titulo}</span>
              {a.url && (
                <a href={a.url} target="_blank" rel="noreferrer" className="text-texto-secundario hover:text-acento shrink-0">
                  <ExternalLink size={14} />
                </a>
              )}
              <button
                onClick={() => eliminar.mutate(a.id)}
                className="text-texto-secundario hover:text-peligro transition-colors shrink-0"
              >
                <Trash2 size={14} />
              </button>
            </div>
          );
        })}
        {!activos?.length && <p className="text-sm text-texto-secundario">Sin activos aún.</p>}
      </div>

      <div className="space-y-2">
        <div className="flex gap-2">
          <Select value={tipo} onChange={(e) => setTipo(e.target.value as TipoActivo)} className="w-36">
            <option value="link">Link</option>
            <option value="carpeta_drive">Carpeta Drive</option>
            <option value="archivo">Archivo</option>
            <option value="documento">Documento</option>
            <option value="credencial">Credencial</option>
          </Select>
          <Input placeholder="Título" value={titulo} onChange={(e) => setTitulo(e.target.value)} className="flex-1" />
        </div>
        <div className="flex gap-2">
          <Input placeholder="URL (opcional para carpetas)" value={url} onChange={(e) => setUrl(e.target.value)} className="flex-1" />
          <Button onClick={agregar} disabled={!titulo.trim() || crear.isPending}>
            <Plus size={16} />
          </Button>
        </div>
      </div>
    </Card>
  );
}
