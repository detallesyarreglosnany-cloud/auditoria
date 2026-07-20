import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { VRoiProyecto, VResumenNegocio, Suscripcion } from '@/types/database';

function useInvalidarEnVivo(tablas: string[], queryKeys: string[][]) {
  const qc = useQueryClient();
  useEffect(() => {
    const canal = supabase.channel(`vivo-${tablas.join('-')}`);
    tablas.forEach((tabla) => {
      canal.on('postgres_changes', { event: '*', schema: 'public', table: tabla }, () => {
        queryKeys.forEach((key) => qc.invalidateQueries({ queryKey: key }));
      });
    });
    canal.subscribe();
    return () => {
      supabase.removeChannel(canal);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

export function useRoiProyectos() {
  useInvalidarEnVivo(['transacciones', 'tareas', 'proyectos'], [['roi-proyectos']]);

  return useQuery({
    queryKey: ['roi-proyectos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_roi_proyecto')
        .select('*')
        .order('rentabilidad', { ascending: false });
      if (error) throw error;
      return data as VRoiProyecto[];
    },
  });
}

export function useResumenNegocio() {
  useInvalidarEnVivo(['transacciones', 'suscripciones'], [['resumen-negocio']]);

  return useQuery({
    queryKey: ['resumen-negocio'],
    queryFn: async () => {
      const { data, error } = await supabase.from('v_resumen_negocio').select('*').maybeSingle();
      if (error) throw error;
      return data as VResumenNegocio | null;
    },
  });
}

export function useProximasRenovaciones() {
  useInvalidarEnVivo(['suscripciones'], [['proximas-renovaciones']]);

  return useQuery({
    queryKey: ['proximas-renovaciones'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_proximas_renovaciones')
        .select('*')
        .order('proxima_renovacion');
      if (error) throw error;
      return data as Suscripcion[];
    },
  });
}

export function useSnapshotsKpi() {
  return useQuery({
    queryKey: ['snapshots-kpi'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('snapshots_kpi')
        .select('fecha, roi_pct, rentabilidad, avance_pct, proyecto_id, proyectos(nombre)')
        .order('fecha', { ascending: true })
        .limit(500);
      if (error) throw error;
      return data;
    },
  });
}
