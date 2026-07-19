-- ============================================================
-- MIGRACIÓN 3 · MÓDULO DE ONBOARDING DE PROYECTOS
-- Plantillas de Lanzamiento: un cliente nuevo se despliega en
-- una sola llamada RPC con tareas, estructura de Drive,
-- pipeline de ventas y stack técnico pre-cargados.
-- ============================================================

create table plantillas (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid default auth.uid() references auth.users (id) on delete cascade, -- null = plantilla de sistema
  nombre      text not null,
  descripcion text,
  activa      boolean not null default true,
  creado_en   timestamptz not null default now()
);

alter table proyectos
  add constraint fk_proyectos_plantilla
  foreign key (plantilla_id) references plantillas (id) on delete set null;

-- Tareas base de la plantilla. `offset_dias` calcula la fecha límite
-- relativa al inicio del proyecto al instanciar.
create table plantilla_tareas (
  id              uuid primary key default gen_random_uuid(),
  plantilla_id    uuid not null references plantillas (id) on delete cascade,
  titulo          text not null,
  descripcion     text,
  peso_porcentual numeric(5,2) not null default 0,
  orden           int not null default 0,
  offset_dias     int not null default 0,
  es_recurrente   boolean not null default false
);

-- Estructura de Drive y links base. `url_patron` admite el marcador
-- {{cliente}} que se sustituye al instanciar.
create table plantilla_activos (
  id           uuid primary key default gen_random_uuid(),
  plantilla_id uuid not null references plantillas (id) on delete cascade,
  tipo         tipo_activo not null default 'carpeta_drive',
  titulo       text not null,
  url_patron   text not null default ''
);

-- Etapas del pipeline de ventas de la plantilla.
create table plantilla_pipeline (
  id           uuid primary key default gen_random_uuid(),
  plantilla_id uuid not null references plantillas (id) on delete cascade,
  etapa        text not null,
  orden        int not null default 0
);

-- Stack técnico sugerido: al instanciar se crean como suscripciones
-- en estado 'pausada' — decides cuáles activar por proyecto.
create table plantilla_stack (
  id               uuid primary key default gen_random_uuid(),
  plantilla_id     uuid not null references plantillas (id) on delete cascade,
  herramienta      text not null,
  categoria_nombre text not null default 'SaaS',   -- se resuelve contra categorias_financieras
  costo_estimado   numeric(12,2) not null default 0,
  ciclo            ciclo_facturacion not null default 'mensual'
);

-- Pipeline de ventas instanciado por proyecto.
create table pipeline_etapas (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  proyecto_id uuid not null references proyectos (id) on delete cascade,
  etapa       text not null,
  orden       int not null default 0,
  completada  boolean not null default false,
  completada_en timestamptz
);

create index idx_pipeline_proyecto on pipeline_etapas (proyecto_id);

-- ------------------------------------------------------------
-- RPC · instanciar_plantilla
-- Desde el frontend: supabase.rpc('instanciar_plantilla', {...})
-- Crea el proyecto completo en una sola transacción atómica.
-- ------------------------------------------------------------
create or replace function instanciar_plantilla(
  p_plantilla_id uuid,
  p_nombre       text,
  p_cliente      text default null,
  p_fecha_inicio date default current_date
) returns uuid
language plpgsql security invoker as $$
declare
  v_proyecto_id  uuid;
  v_categoria_id uuid;
  st record;
begin
  insert into proyectos (nombre, cliente, estado, plantilla_id, fecha_inicio)
  values (p_nombre, p_cliente, 'onboarding', p_plantilla_id, p_fecha_inicio)
  returning id into v_proyecto_id;

  -- Tareas con pesos y fechas relativas
  insert into tareas (proyecto_id, titulo, descripcion, peso_porcentual, orden, es_recurrente, fecha_limite)
  select v_proyecto_id, titulo, descripcion, peso_porcentual, orden, es_recurrente,
         p_fecha_inicio + offset_dias
  from plantilla_tareas
  where plantilla_id = p_plantilla_id
  order by orden;

  -- Estructura de Drive y links, con {{cliente}} sustituido
  insert into activos_proyecto (proyecto_id, tipo, titulo, url)
  select v_proyecto_id, tipo,
         replace(titulo, '{{cliente}}', coalesce(p_cliente, p_nombre)),
         nullif(replace(url_patron, '{{cliente}}', coalesce(p_cliente, p_nombre)), '')
  from plantilla_activos
  where plantilla_id = p_plantilla_id;

  -- Pipeline de ventas
  insert into pipeline_etapas (proyecto_id, etapa, orden)
  select v_proyecto_id, etapa, orden
  from plantilla_pipeline
  where plantilla_id = p_plantilla_id
  order by orden;

  -- Stack técnico → suscripciones pausadas (se activan a demanda)
  for st in select * from plantilla_stack where plantilla_id = p_plantilla_id loop
    select id into v_categoria_id
    from categorias_financieras
    where nombre = st.categoria_nombre and capa = 'gasto_operativo'
      and (user_id is null or user_id = auth.uid())
    limit 1;

    if v_categoria_id is not null then
      insert into suscripciones
        (proyecto_id, categoria_id, nombre, monto, ciclo, proxima_renovacion, estado)
      values
        (v_proyecto_id, v_categoria_id, st.herramienta,
         greatest(st.costo_estimado, 0.01), st.ciclo,
         p_fecha_inicio + interval '1 month', 'pausada');
    end if;
  end loop;

  return v_proyecto_id;
end $$;

-- ------------------------------------------------------------
-- Semilla · Plantilla de sistema "Lanzamiento Cliente Estándar"
-- ------------------------------------------------------------
with p as (
  insert into plantillas (user_id, nombre, descripcion)
  values (null, 'Lanzamiento Cliente Estándar',
          'Onboarding completo: kickoff, Drive, pipeline y stack base. Pesos calibrados para sumar 100%.')
  returning id
),
t as (
  insert into plantilla_tareas (plantilla_id, titulo, peso_porcentual, orden, offset_dias, es_recurrente)
  select p.id, x.titulo, x.peso, x.orden, x.offset_dias, x.recurrente
  from p, (values
    ('Reunión de kickoff y brief firmado',        10.00, 1, 2,  false),
    ('Crear estructura de Drive del cliente',      5.00, 2, 1,  false),
    ('Accesos y credenciales (ads, hosting, CMS)',10.00, 3, 3,  false),
    ('Diagnóstico inicial y propuesta de valor',  15.00, 4, 7,  false),
    ('Configuración del stack técnico',           10.00, 5, 7,  false),
    ('Primer entregable / campaña piloto',        25.00, 6, 21, false),
    ('Revisión de métricas y ajuste',             15.00, 7, 30, true),
    ('Reporte mensual y facturación',             10.00, 8, 30, true)
  ) as x(titulo, peso, orden, offset_dias, recurrente)
  returning plantilla_id
),
a as (
  insert into plantilla_activos (plantilla_id, tipo, titulo, url_patron)
  select p.id, x.tipo::tipo_activo, x.titulo, x.url
  from p, (values
    ('carpeta_drive', '01 · Brief y contratos — {{cliente}}',   ''),
    ('carpeta_drive', '02 · Activos de marca — {{cliente}}',    ''),
    ('carpeta_drive', '03 · Entregables — {{cliente}}',         ''),
    ('carpeta_drive', '04 · Reportes — {{cliente}}',            ''),
    ('link',          'Tablero de campaña — {{cliente}}',       'https://ads.google.com')
  ) as x(tipo, titulo, url)
  returning plantilla_id
),
pl as (
  insert into plantilla_pipeline (plantilla_id, etapa, orden)
  select p.id, x.etapa, x.orden
  from p, (values
    ('Lead calificado', 1), ('Propuesta enviada', 2), ('Negociación', 3),
    ('Contrato firmado', 4), ('Onboarding', 5), ('Entrega activa', 6), ('Upsell / renovación', 7)
  ) as x(etapa, orden)
  returning plantilla_id
)
insert into plantilla_stack (plantilla_id, herramienta, categoria_nombre, costo_estimado, ciclo)
select p.id, x.herramienta, x.categoria, x.costo, x.ciclo::ciclo_facturacion
from p, (values
  ('Claude Pro',      'LLMs',    20.00, 'mensual'),
  ('Hosting cliente', 'Hosting', 12.00, 'mensual'),
  ('Canva Pro',       'SaaS',    15.00, 'mensual')
) as x(herramienta, categoria, costo, ciclo);
