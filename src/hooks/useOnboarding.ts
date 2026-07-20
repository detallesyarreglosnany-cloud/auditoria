import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Plantilla } from '@/types/database';

export function usePlantillas() {
  return useQuery({
    queryKey: ['plantillas'],
    queryFn: async () => {
      const { data, error } = await supabase.from('plantillas').select('*').eq('activa', true).order('creado_en');
      if (error) throw error;
      return data as Plantilla[];
    },
  });
}

export function useInstanciarPlantilla() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { plantillaId: string; nombre: string; cliente?: string; fechaInicio?: string }) => {
      const { data, error } = await supabase.rpc('instanciar_plantilla', {
        p_plantilla_id: input.plantillaId,
        p_nombre: input.nombre,
        p_cliente: input.cliente ?? null,
        p_fecha_inicio: input.fechaInicio ?? new Date().toISOString().slice(0, 10),
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['proyectos'] });
      qc.invalidateQueries({ queryKey: ['roi-proyectos'] });
    },
  });
}
