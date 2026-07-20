import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Transaccion, Suscripcion, CategoriaFinanciera, Proyecto } from '@/types/database';

export function useCategorias() {
  return useQuery({
    queryKey: ['categorias'],
    queryFn: async () => {
      const { data, error } = await supabase.from('categorias_financieras').select('*').order('capa');
      if (error) throw error;
      return data as CategoriaFinanciera[];
    },
  });
}

export function useTransacciones() {
  return useQuery({
    queryKey: ['transacciones'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transacciones')
        .select('*, categorias_financieras(nombre, capa), proyectos(nombre)')
        .order('fecha', { ascending: false })
        .limit(200);
      if (error) throw error;
      return data as (Transaccion & {
        categorias_financieras: Pick<CategoriaFinanciera, 'nombre' | 'capa'>;
        proyectos: Pick<Proyecto, 'nombre'> | null;
      })[];
    },
  });
}

export function useCrearTransaccion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<Transaccion>) => {
      const { error } = await supabase.from('transacciones').insert(input);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transacciones'] });
      qc.invalidateQueries({ queryKey: ['roi-proyectos'] });
      qc.invalidateQueries({ queryKey: ['resumen-negocio'] });
    },
  });
}

export function useActualizarTransaccion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...cambios }: Partial<Transaccion> & { id: string }) => {
      const { error } = await supabase.from('transacciones').update(cambios).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transacciones'] });
      qc.invalidateQueries({ queryKey: ['roi-proyectos'] });
      qc.invalidateQueries({ queryKey: ['resumen-negocio'] });
    },
  });
}

export function useEliminarTransaccion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('transacciones').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transacciones'] });
      qc.invalidateQueries({ queryKey: ['roi-proyectos'] });
      qc.invalidateQueries({ queryKey: ['resumen-negocio'] });
    },
  });
}

export function useSuscripciones() {
  return useQuery({
    queryKey: ['suscripciones'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('suscripciones')
        .select('*, categorias_financieras(nombre), proyectos(nombre)')
        .order('proxima_renovacion');
      if (error) throw error;
      return data as (Suscripcion & {
        categorias_financieras: Pick<CategoriaFinanciera, 'nombre'>;
        proyectos: Pick<Proyecto, 'nombre'> | null;
      })[];
    },
  });
}

export function useCrearSuscripcion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<Suscripcion>) => {
      const { error } = await supabase.from('suscripciones').insert(input);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['suscripciones'] }),
  });
}

export function useActualizarSuscripcion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...cambios }: Partial<Suscripcion> & { id: string }) => {
      const { error } = await supabase.from('suscripciones').update(cambios).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['suscripciones'] }),
  });
}
