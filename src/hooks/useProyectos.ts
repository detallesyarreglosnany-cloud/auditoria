import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Proyecto, Tarea, ActivoProyecto, PipelineEtapa, VProgresoProyecto } from '@/types/database';

export function useProyectos() {
  return useQuery({
    queryKey: ['proyectos'],
    queryFn: async () => {
      const { data, error } = await supabase.from('proyectos').select('*').order('creado_en', { ascending: false });
      if (error) throw error;
      return data as Proyecto[];
    },
  });
}

export function useProyecto(id: string | undefined) {
  return useQuery({
    queryKey: ['proyecto', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase.from('proyectos').select('*').eq('id', id).single();
      if (error) throw error;
      return data as Proyecto;
    },
  });
}

export function useProgresoProyecto(id: string | undefined) {
  return useQuery({
    queryKey: ['progreso-proyecto', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase.from('v_progreso_proyecto').select('*').eq('proyecto_id', id).single();
      if (error) throw error;
      return data as VProgresoProyecto;
    },
  });
}

export function useTareas(proyectoId: string | undefined) {
  return useQuery({
    queryKey: ['tareas', proyectoId],
    enabled: !!proyectoId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tareas')
        .select('*')
        .eq('proyecto_id', proyectoId)
        .order('orden');
      if (error) throw error;
      return data as Tarea[];
    },
  });
}

export function useActivos(proyectoId: string | undefined) {
  return useQuery({
    queryKey: ['activos', proyectoId],
    enabled: !!proyectoId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activos_proyecto')
        .select('*')
        .eq('proyecto_id', proyectoId)
        .order('creado_en', { ascending: false });
      if (error) throw error;
      return data as ActivoProyecto[];
    },
  });
}

export function usePipeline(proyectoId: string | undefined) {
  return useQuery({
    queryKey: ['pipeline', proyectoId],
    enabled: !!proyectoId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pipeline_etapas')
        .select('*')
        .eq('proyecto_id', proyectoId)
        .order('orden');
      if (error) throw error;
      return data as PipelineEtapa[];
    },
  });
}

export function useCrearProyecto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<Proyecto>) => {
      const { data, error } = await supabase.from('proyectos').insert(input).select().single();
      if (error) throw error;
      return data as Proyecto;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['proyectos'] }),
  });
}

export function useActualizarProyecto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...cambios }: Partial<Proyecto> & { id: string }) => {
      const { error } = await supabase.from('proyectos').update(cambios).eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ['proyectos'] });
      qc.invalidateQueries({ queryKey: ['proyecto', variables.id] });
    },
  });
}

export function useEliminarProyecto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('proyectos').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['proyectos'] }),
  });
}

export function useCrearTarea(proyectoId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<Tarea>) => {
      const { error } = await supabase.from('tareas').insert({ ...input, proyecto_id: proyectoId });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tareas', proyectoId] });
      qc.invalidateQueries({ queryKey: ['progreso-proyecto', proyectoId] });
    },
  });
}

export function useActualizarTarea(proyectoId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...cambios }: Partial<Tarea> & { id: string }) => {
      const { error } = await supabase.from('tareas').update(cambios).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tareas', proyectoId] });
      qc.invalidateQueries({ queryKey: ['progreso-proyecto', proyectoId] });
    },
  });
}

export function useEliminarTarea(proyectoId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('tareas').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tareas', proyectoId] });
      qc.invalidateQueries({ queryKey: ['progreso-proyecto', proyectoId] });
    },
  });
}

export function useCrearActivo(proyectoId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<ActivoProyecto>) => {
      const { error } = await supabase.from('activos_proyecto').insert({ ...input, proyecto_id: proyectoId });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['activos', proyectoId] }),
  });
}

export function useEliminarActivo(proyectoId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('activos_proyecto').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['activos', proyectoId] }),
  });
}

export function useToggleEtapaPipeline(proyectoId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, completada }: { id: string; completada: boolean }) => {
      const { error } = await supabase
        .from('pipeline_etapas')
        .update({ completada, completada_en: completada ? new Date().toISOString() : null })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pipeline', proyectoId] }),
  });
}
