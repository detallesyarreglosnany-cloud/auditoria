-- ============================================================
-- MIGRACIÓN 5 · SEGURIDAD (ROW LEVEL SECURITY)
-- Cada usuario solo ve y toca sus propios datos. Las plantillas
-- y categorías de sistema (user_id null) son legibles por todos.
-- ============================================================

-- ---------- Tablas propias del usuario ----------
do $$
declare
  t text;
begin
  foreach t in array array[
    'proyectos', 'tareas', 'activos_proyecto',
    'transacciones', 'suscripciones', 'pipeline_etapas', 'snapshots_kpi'
  ] loop
    execute format('alter table %I enable row level security', t);
    execute format($f$
      create policy "propietario_todo" on %I
        for all to authenticated
        using (user_id = auth.uid())
        with check (user_id = auth.uid())
    $f$, t);
  end loop;
end $$;

-- ---------- Catálogos con filas de sistema (user_id null) ----------
alter table categorias_financieras enable row level security;

create policy "leer_categorias" on categorias_financieras
  for select to authenticated
  using (user_id is null or user_id = auth.uid());

create policy "gestionar_categorias_propias" on categorias_financieras
  for all to authenticated
  using (user_id = auth.uid() and not es_sistema)
  with check (user_id = auth.uid() and not es_sistema);

-- ---------- Plantillas (las de sistema se leen, las propias se gestionan) ----------
alter table plantillas         enable row level security;
alter table plantilla_tareas   enable row level security;
alter table plantilla_activos  enable row level security;
alter table plantilla_pipeline enable row level security;
alter table plantilla_stack    enable row level security;

create policy "leer_plantillas" on plantillas
  for select to authenticated
  using (user_id is null or user_id = auth.uid());

create policy "gestionar_plantillas_propias" on plantillas
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

do $$
declare
  t text;
begin
  foreach t in array array[
    'plantilla_tareas', 'plantilla_activos', 'plantilla_pipeline', 'plantilla_stack'
  ] loop
    execute format($f$
      create policy "leer_detalle_plantilla" on %I
        for select to authenticated
        using (exists (
          select 1 from plantillas p
          where p.id = %I.plantilla_id
            and (p.user_id is null or p.user_id = auth.uid())
        ))
    $f$, t, t);
    execute format($f$
      create policy "gestionar_detalle_plantilla" on %I
        for all to authenticated
        using (exists (
          select 1 from plantillas p
          where p.id = %I.plantilla_id and p.user_id = auth.uid()
        ))
        with check (exists (
          select 1 from plantillas p
          where p.id = %I.plantilla_id and p.user_id = auth.uid()
        ))
    $f$, t, t, t);
  end loop;
end $$;

-- ---------- Storage: bucket privado para archivos adjuntos ----------
insert into storage.buckets (id, name, public)
values ('activos', 'activos', false)
on conflict (id) do nothing;

create policy "activos_propios_select" on storage.objects
  for select to authenticated
  using (bucket_id = 'activos' and owner = auth.uid());

create policy "activos_propios_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'activos' and owner = auth.uid());

create policy "activos_propios_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'activos' and owner = auth.uid());
