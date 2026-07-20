-- ============================================================
-- DanyOS — SCRIPT IDEMPOTENTE (se puede ejecutar varias veces sin error)
-- Copia TODO esto y pégalo en: supabase.com → tu proyecto → SQL Editor
-- ============================================================

create extension if not exists "pgcrypto";
create extension if not exists pg_cron;

-- ---------- Tipos enumerados (creación segura) ----------
do $$ begin
  create type estado_proyecto as enum ('idea', 'onboarding', 'activo', 'pausado', 'completado', 'archivado');
exception when duplicate_object then null; end $$;

do $$ begin
  create type estado_tarea as enum ('pendiente', 'en_progreso', 'completada', 'bloqueada');
exception when duplicate_object then null; end $$;

do $$ begin
  create type tipo_activo as enum ('link', 'archivo', 'carpeta_drive', 'credencial', 'documento');
exception when duplicate_object then null; end $$;

do $$ begin
  create type flujo_transaccion as enum ('ingreso', 'egreso');
exception when duplicate_object then null; end $$;

do $$ begin
  create type capa_financiera as enum ('inversion', 'ingreso', 'gasto_operativo');
exception when duplicate_object then null; end $$;

do $$ begin
  create type clase_ingreso as enum ('recurrente', 'pago_unico', 'cuenta_por_cobrar');
exception when duplicate_object then null; end $$;

do $$ begin
  create type estado_transaccion as enum ('confirmada', 'pendiente', 'cobrada', 'vencida');
exception when duplicate_object then null; end $$;

do $$ begin
  create type ciclo_facturacion as enum ('mensual', 'trimestral', 'anual');
exception when duplicate_object then null; end $$;

do $$ begin
  create type estado_suscripcion as enum ('activa', 'pausada', 'cancelada');
exception when duplicate_object then null; end $$;

-- ---------- Tablas: núcleo de proyectos ----------
create table if not exists proyectos (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null default auth.uid() references auth.users (id) on delete cascade,
  nombre          text not null,
  slug            text generated always as (lower(regexp_replace(nombre, '[^a-zA-Z0-9]+', '-', 'g'))) stored,
  descripcion     text,
  cliente         text,
  estado          estado_proyecto not null default 'idea',
  plantilla_id    uuid,
  fecha_inicio    date,
  fecha_objetivo  date,
  presupuesto     numeric(12,2),
  creado_en       timestamptz not null default now(),
  actualizado_en  timestamptz not null default now()
);

create table if not exists tareas (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null default auth.uid() references auth.users (id) on delete cascade,
  proyecto_id     uuid not null references proyectos (id) on delete cascade,
  titulo          text not null,
  descripcion     text,
  peso_porcentual numeric(5,2) not null default 0 check (peso_porcentual >= 0 and peso_porcentual <= 100),
  estado          estado_tarea not null default 'pendiente',
  orden           int not null default 0,
  es_recurrente   boolean not null default false,
  fecha_limite    date,
  completada_en   timestamptz,
  creado_en       timestamptz not null default now()
);

create index if not exists idx_tareas_proyecto on tareas (proyecto_id);

create or replace function validar_pesos_proyecto()
returns trigger language plpgsql as $$
declare
  suma numeric;
begin
  select coalesce(sum(peso_porcentual), 0) into suma
  from tareas
  where proyecto_id = new.proyecto_id
    and id is distinct from new.id;

  if suma + new.peso_porcentual > 100 then
    raise exception 'La suma de pesos del proyecto excedería 100%% (actual: %, intentas añadir: %)',
      suma, new.peso_porcentual;
  end if;
  return new;
end $$;

drop trigger if exists trg_validar_pesos on tareas;
create trigger trg_validar_pesos
  before insert or update of peso_porcentual, proyecto_id on tareas
  for each row execute function validar_pesos_proyecto();

create or replace function marcar_completada()
returns trigger language plpgsql as $$
begin
  if new.estado = 'completada' and old.estado is distinct from 'completada' then
    new.completada_en := now();
  elsif new.estado <> 'completada' then
    new.completada_en := null;
  end if;
  return new;
end $$;

drop trigger if exists trg_marcar_completada on tareas;
create trigger trg_marcar_completada
  before update of estado on tareas
  for each row execute function marcar_completada();

create table if not exists activos_proyecto (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  proyecto_id  uuid not null references proyectos (id) on delete cascade,
  tipo         tipo_activo not null default 'link',
  titulo       text not null,
  url          text,
  storage_path text,
  metadata     jsonb not null default '{}'::jsonb,
  creado_en    timestamptz not null default now(),
  check (tipo = 'carpeta_drive' or url is not null or storage_path is not null)
);

create index if not exists idx_activos_proyecto on activos_proyecto (proyecto_id);

create or replace function tocar_actualizado_en()
returns trigger language plpgsql as $$
begin
  new.actualizado_en := now();
  return new;
end $$;

drop trigger if exists trg_proyectos_touch on proyectos;
create trigger trg_proyectos_touch
  before update on proyectos
  for each row execute function tocar_actualizado_en();

-- ---------- Tablas: módulo financiero ----------
create table if not exists categorias_financieras (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid default auth.uid() references auth.users (id) on delete cascade,
  nombre     text not null,
  capa       capa_financiera not null,
  icono      text,
  es_sistema boolean not null default false,
  creado_en  timestamptz not null default now(),
  unique (user_id, nombre, capa)
);

insert into categorias_financieras (nombre, capa, icono, es_sistema)
select * from (values
  ('Ads',        'inversion'::capa_financiera, 'megaphone',  true),
  ('Cursos',     'inversion'::capa_financiera, 'book',       true),
  ('Marketing',  'inversion'::capa_financiera, 'trending-up',true),
  ('Servicios',  'ingreso'::capa_financiera,   'briefcase',  true),
  ('Productos',  'ingreso'::capa_financiera,   'package',    true),
  ('Retainers',  'ingreso'::capa_financiera,   'refresh-cw', true),
  ('LLMs',       'gasto_operativo'::capa_financiera, 'cpu',    true),
  ('SaaS',       'gasto_operativo'::capa_financiera, 'layers', true),
  ('Hosting',    'gasto_operativo'::capa_financiera, 'server', true)
) as x(nombre, capa, icono, es_sistema)
where not exists (
  select 1 from categorias_financieras c
  where c.nombre = x.nombre and c.capa = x.capa and c.user_id is null
);

create table if not exists transacciones (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null default auth.uid() references auth.users (id) on delete cascade,
  proyecto_id    uuid references proyectos (id) on delete set null,
  categoria_id   uuid not null references categorias_financieras (id) on delete restrict,
  suscripcion_id uuid,
  flujo          flujo_transaccion not null,
  clase_ingreso  clase_ingreso,
  estado         estado_transaccion not null default 'confirmada',
  monto          numeric(12,2) not null check (monto > 0),
  moneda         char(3) not null default 'USD',
  fecha          date not null default current_date,
  fecha_cobro_esperada date,
  descripcion    text,
  metadata       jsonb not null default '{}'::jsonb,
  creado_en      timestamptz not null default now(),
  check (flujo = 'ingreso' or clase_ingreso is null),
  check (clase_ingreso is distinct from 'cuenta_por_cobrar' or estado in ('pendiente', 'cobrada', 'vencida'))
);

create index if not exists idx_trans_proyecto  on transacciones (proyecto_id);
create index if not exists idx_trans_fecha     on transacciones (fecha desc);
create index if not exists idx_trans_categoria on transacciones (categoria_id);

create table if not exists suscripciones (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null default auth.uid() references auth.users (id) on delete cascade,
  proyecto_id       uuid references proyectos (id) on delete set null,
  categoria_id      uuid not null references categorias_financieras (id) on delete restrict,
  nombre            text not null,
  proveedor         text,
  monto             numeric(12,2) not null check (monto > 0),
  moneda            char(3) not null default 'USD',
  ciclo             ciclo_facturacion not null default 'mensual',
  proxima_renovacion date not null,
  estado            estado_suscripcion not null default 'activa',
  url_gestion       text,
  creado_en         timestamptz not null default now()
);

do $$ begin
  alter table transacciones
    add constraint fk_trans_suscripcion
    foreign key (suscripcion_id) references suscripciones (id) on delete set null;
exception when duplicate_object then null; end $$;

create or replace function generar_gastos_suscripciones()
returns int language plpgsql security definer set search_path = public as $$
declare
  s record;
  generadas int := 0;
begin
  for s in
    select * from suscripciones
    where estado = 'activa' and proxima_renovacion <= current_date
  loop
    insert into transacciones
      (user_id, proyecto_id, categoria_id, suscripcion_id, flujo, monto, moneda, fecha, descripcion)
    values
      (s.user_id, s.proyecto_id, s.categoria_id, s.id, 'egreso', s.monto, s.moneda,
       s.proxima_renovacion, 'Renovación automática: ' || s.nombre);

    update suscripciones
    set proxima_renovacion = s.proxima_renovacion + case s.ciclo
          when 'mensual'    then interval '1 month'
          when 'trimestral' then interval '3 months'
          when 'anual'      then interval '1 year'
        end
    where id = s.id;

    generadas := generadas + 1;
  end loop;
  return generadas;
end $$;

select cron.unschedule('renovar-suscripciones') where exists (select 1 from cron.job where jobname = 'renovar-suscripciones');
select cron.schedule('renovar-suscripciones', '0 6 * * *', $$select generar_gastos_suscripciones()$$);

create or replace function marcar_cuentas_vencidas()
returns int language plpgsql security definer set search_path = public as $$
declare afectadas int;
begin
  update transacciones
  set estado = 'vencida'
  where clase_ingreso = 'cuenta_por_cobrar'
    and estado = 'pendiente'
    and fecha_cobro_esperada < current_date;
  get diagnostics afectadas = row_count;
  return afectadas;
end $$;

select cron.unschedule('marcar-cuentas-vencidas') where exists (select 1 from cron.job where jobname = 'marcar-cuentas-vencidas');
select cron.schedule('marcar-cuentas-vencidas', '15 6 * * *', $$select marcar_cuentas_vencidas()$$);

-- ---------- Tablas: módulo de onboarding (plantillas) ----------
create table if not exists plantillas (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid default auth.uid() references auth.users (id) on delete cascade,
  nombre      text not null,
  descripcion text,
  activa      boolean not null default true,
  creado_en   timestamptz not null default now()
);

do $$ begin
  alter table proyectos
    add constraint fk_proyectos_plantilla
    foreign key (plantilla_id) references plantillas (id) on delete set null;
exception when duplicate_object then null; end $$;

create table if not exists plantilla_tareas (
  id              uuid primary key default gen_random_uuid(),
  plantilla_id    uuid not null references plantillas (id) on delete cascade,
  titulo          text not null,
  descripcion     text,
  peso_porcentual numeric(5,2) not null default 0,
  orden           int not null default 0,
  offset_dias     int not null default 0,
  es_recurrente   boolean not null default false
);

create table if not exists plantilla_activos (
  id           uuid primary key default gen_random_uuid(),
  plantilla_id uuid not null references plantillas (id) on delete cascade,
  tipo         tipo_activo not null default 'carpeta_drive',
  titulo       text not null,
  url_patron   text not null default ''
);

create table if not exists plantilla_pipeline (
  id           uuid primary key default gen_random_uuid(),
  plantilla_id uuid not null references plantillas (id) on delete cascade,
  etapa        text not null,
  orden        int not null default 0
);

create table if not exists plantilla_stack (
  id               uuid primary key default gen_random_uuid(),
  plantilla_id     uuid not null references plantillas (id) on delete cascade,
  herramienta      text not null,
  categoria_nombre text not null default 'SaaS',
  costo_estimado   numeric(12,2) not null default 0,
  ciclo            ciclo_facturacion not null default 'mensual'
);

create table if not exists pipeline_etapas (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  proyecto_id uuid not null references proyectos (id) on delete cascade,
  etapa       text not null,
  orden       int not null default 0,
  completada  boolean not null default false,
  completada_en timestamptz
);

create index if not exists idx_pipeline_proyecto on pipeline_etapas (proyecto_id);

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

  insert into tareas (proyecto_id, titulo, descripcion, peso_porcentual, orden, es_recurrente, fecha_limite)
  select v_proyecto_id, titulo, descripcion, peso_porcentual, orden, es_recurrente,
         p_fecha_inicio + offset_dias
  from plantilla_tareas
  where plantilla_id = p_plantilla_id
  order by orden;

  insert into activos_proyecto (proyecto_id, tipo, titulo, url)
  select v_proyecto_id, tipo,
         replace(titulo, '{{cliente}}', coalesce(p_cliente, p_nombre)),
         nullif(replace(url_patron, '{{cliente}}', coalesce(p_cliente, p_nombre)), '')
  from plantilla_activos
  where plantilla_id = p_plantilla_id;

  insert into pipeline_etapas (proyecto_id, etapa, orden)
  select v_proyecto_id, etapa, orden
  from plantilla_pipeline
  where plantilla_id = p_plantilla_id
  order by orden;

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

-- ---------- Semilla: plantilla de sistema "Lanzamiento Cliente Estándar" ----------
do $$
declare
  v_plantilla_id uuid;
begin
  select id into v_plantilla_id from plantillas where nombre = 'Lanzamiento Cliente Estándar' and user_id is null limit 1;

  if v_plantilla_id is null then
    insert into plantillas (user_id, nombre, descripcion)
    values (null, 'Lanzamiento Cliente Estándar',
            'Onboarding completo: kickoff, Drive, pipeline y stack base. Pesos calibrados para sumar 100%.')
    returning id into v_plantilla_id;

    insert into plantilla_tareas (plantilla_id, titulo, peso_porcentual, orden, offset_dias, es_recurrente)
    values
      (v_plantilla_id, 'Reunión de kickoff y brief firmado',        10.00, 1, 2,  false),
      (v_plantilla_id, 'Crear estructura de Drive del cliente',      5.00, 2, 1,  false),
      (v_plantilla_id, 'Accesos y credenciales (ads, hosting, CMS)',10.00, 3, 3,  false),
      (v_plantilla_id, 'Diagnóstico inicial y propuesta de valor',  15.00, 4, 7,  false),
      (v_plantilla_id, 'Configuración del stack técnico',           10.00, 5, 7,  false),
      (v_plantilla_id, 'Primer entregable / campaña piloto',        25.00, 6, 21, false),
      (v_plantilla_id, 'Revisión de métricas y ajuste',             15.00, 7, 30, true),
      (v_plantilla_id, 'Reporte mensual y facturación',             10.00, 8, 30, true);

    insert into plantilla_activos (plantilla_id, tipo, titulo, url_patron)
    values
      (v_plantilla_id, 'carpeta_drive', '01 · Brief y contratos — {{cliente}}',   ''),
      (v_plantilla_id, 'carpeta_drive', '02 · Activos de marca — {{cliente}}',    ''),
      (v_plantilla_id, 'carpeta_drive', '03 · Entregables — {{cliente}}',         ''),
      (v_plantilla_id, 'carpeta_drive', '04 · Reportes — {{cliente}}',            ''),
      (v_plantilla_id, 'link',          'Tablero de campaña — {{cliente}}',       'https://ads.google.com');

    insert into plantilla_pipeline (plantilla_id, etapa, orden)
    values
      (v_plantilla_id, 'Lead calificado', 1), (v_plantilla_id, 'Propuesta enviada', 2),
      (v_plantilla_id, 'Negociación', 3), (v_plantilla_id, 'Contrato firmado', 4),
      (v_plantilla_id, 'Onboarding', 5), (v_plantilla_id, 'Entrega activa', 6),
      (v_plantilla_id, 'Upsell / renovación', 7);

    insert into plantilla_stack (plantilla_id, herramienta, categoria_nombre, costo_estimado, ciclo)
    values
      (v_plantilla_id, 'Claude Pro',      'LLMs',    20.00, 'mensual'),
      (v_plantilla_id, 'Hosting cliente', 'Hosting', 12.00, 'mensual'),
      (v_plantilla_id, 'Canva Pro',       'SaaS',    15.00, 'mensual');
  end if;
end $$;

-- ---------- Vistas KPI y ROI en tiempo real ----------
create or replace view v_progreso_proyecto
with (security_invoker = true) as
select
  p.id as proyecto_id, p.nombre, p.estado,
  count(t.id) as total_tareas,
  count(t.id) filter (where t.estado = 'completada') as tareas_completadas,
  coalesce(sum(t.peso_porcentual), 0) as suma_pesos,
  coalesce(sum(t.peso_porcentual), 0) = 100 as pesos_balanceados,
  round(coalesce(sum(t.peso_porcentual) filter (where t.estado = 'completada'), 0), 2) as avance_pct
from proyectos p
left join tareas t on t.proyecto_id = p.id
group by p.id;

create or replace view v_finanzas_proyecto
with (security_invoker = true) as
select
  p.id as proyecto_id, p.nombre,
  coalesce(sum(tr.monto) filter (where tr.flujo = 'ingreso' and tr.estado in ('confirmada', 'cobrada')), 0) as ingresos_cobrados,
  coalesce(sum(tr.monto) filter (where tr.clase_ingreso = 'recurrente' and tr.estado in ('confirmada', 'cobrada') and tr.fecha >= date_trunc('month', current_date)), 0) as mrr_mes_actual,
  coalesce(sum(tr.monto) filter (where tr.clase_ingreso = 'cuenta_por_cobrar' and tr.estado = 'pendiente'), 0) as por_cobrar,
  coalesce(sum(tr.monto) filter (where tr.clase_ingreso = 'cuenta_por_cobrar' and tr.estado = 'vencida'), 0) as vencido,
  coalesce(sum(tr.monto) filter (where tr.flujo = 'egreso' and c.capa = 'inversion'), 0) as inversion_total,
  coalesce(sum(tr.monto) filter (where tr.flujo = 'egreso' and c.capa = 'gasto_operativo'), 0) as gastos_operativos,
  coalesce(sum(tr.monto) filter (where tr.flujo = 'egreso'), 0) as egresos_totales
from proyectos p
left join transacciones tr on tr.proyecto_id = p.id
left join categorias_financieras c on c.id = tr.categoria_id
group by p.id;

create or replace view v_roi_proyecto
with (security_invoker = true) as
select
  f.proyecto_id, f.nombre, pr.estado, pr.avance_pct, pr.pesos_balanceados,
  f.ingresos_cobrados, f.mrr_mes_actual, f.por_cobrar, f.vencido,
  f.inversion_total, f.gastos_operativos, f.egresos_totales,
  round(f.ingresos_cobrados - f.egresos_totales, 2) as rentabilidad,
  case when f.egresos_totales > 0 then round((f.ingresos_cobrados - f.egresos_totales) / f.egresos_totales * 100, 2) end as roi_pct,
  case when f.ingresos_cobrados > 0 then round((f.ingresos_cobrados - f.egresos_totales) / f.ingresos_cobrados * 100, 2) end as margen_pct,
  case when f.egresos_totales > 0 and coalesce(p.presupuesto, 0) > 0 then round((pr.avance_pct / 100.0) / (f.egresos_totales / p.presupuesto), 2) end as indice_salud
from v_finanzas_proyecto f
join v_progreso_proyecto pr on pr.proyecto_id = f.proyecto_id
join proyectos p on p.id = f.proyecto_id;

create or replace view v_resumen_negocio
with (security_invoker = true) as
select
  t.user_id,
  coalesce(sum(t.monto) filter (where t.flujo = 'ingreso' and t.estado in ('confirmada','cobrada')), 0) as ingresos_totales,
  coalesce(sum(t.monto) filter (where t.flujo = 'egreso'), 0) as egresos_totales,
  coalesce(sum(t.monto) filter (where t.clase_ingreso = 'cuenta_por_cobrar' and t.estado in ('pendiente','vencida')), 0) as por_cobrar_total,
  (select coalesce(sum(monto), 0) from suscripciones s
    where s.estado = 'activa' and s.user_id = t.user_id and s.ciclo = 'mensual') as burn_mensual_suscripciones
from transacciones t
group by t.user_id;

create or replace view v_proximas_renovaciones
with (security_invoker = true) as
select s.*, s.proxima_renovacion - current_date as dias_restantes
from suscripciones s
where s.estado = 'activa'
  and s.proxima_renovacion <= current_date + 14
order by s.proxima_renovacion;

create table if not exists snapshots_kpi (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  proyecto_id   uuid not null references proyectos (id) on delete cascade,
  fecha         date not null default current_date,
  avance_pct    numeric(5,2),
  ingresos      numeric(12,2),
  egresos       numeric(12,2),
  rentabilidad  numeric(12,2),
  roi_pct       numeric(8,2),
  unique (proyecto_id, fecha)
);

create or replace function tomar_snapshots_kpi()
returns int language plpgsql security definer set search_path = public as $$
declare afectadas int;
begin
  insert into snapshots_kpi (user_id, proyecto_id, fecha, avance_pct, ingresos, egresos, rentabilidad, roi_pct)
  select p.user_id, r.proyecto_id, current_date, r.avance_pct,
         r.ingresos_cobrados, r.egresos_totales, r.rentabilidad, r.roi_pct
  from v_roi_proyecto r
  join proyectos p on p.id = r.proyecto_id
  where p.estado in ('onboarding', 'activo')
  on conflict (proyecto_id, fecha) do update
    set avance_pct = excluded.avance_pct, ingresos = excluded.ingresos,
        egresos = excluded.egresos, rentabilidad = excluded.rentabilidad,
        roi_pct = excluded.roi_pct;
  get diagnostics afectadas = row_count;
  return afectadas;
end $$;

select cron.unschedule('snapshots-kpi-diarios') where exists (select 1 from cron.job where jobname = 'snapshots-kpi-diarios');
select cron.schedule('snapshots-kpi-diarios', '30 6 * * *', $$select tomar_snapshots_kpi()$$);

-- ---------- Seguridad: Row Level Security ----------
do $$
declare
  t text;
begin
  foreach t in array array[
    'proyectos', 'tareas', 'activos_proyecto',
    'transacciones', 'suscripciones', 'pipeline_etapas', 'snapshots_kpi'
  ] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists "propietario_todo" on %I', t);
    execute format($f$
      create policy "propietario_todo" on %I
        for all to authenticated
        using (user_id = auth.uid())
        with check (user_id = auth.uid())
    $f$, t);
  end loop;
end $$;

alter table categorias_financieras enable row level security;
drop policy if exists "leer_categorias" on categorias_financieras;
create policy "leer_categorias" on categorias_financieras
  for select to authenticated
  using (user_id is null or user_id = auth.uid());

drop policy if exists "gestionar_categorias_propias" on categorias_financieras;
create policy "gestionar_categorias_propias" on categorias_financieras
  for all to authenticated
  using (user_id = auth.uid() and not es_sistema)
  with check (user_id = auth.uid() and not es_sistema);

alter table plantillas         enable row level security;
alter table plantilla_tareas   enable row level security;
alter table plantilla_activos  enable row level security;
alter table plantilla_pipeline enable row level security;
alter table plantilla_stack    enable row level security;

drop policy if exists "leer_plantillas" on plantillas;
create policy "leer_plantillas" on plantillas
  for select to authenticated
  using (user_id is null or user_id = auth.uid());

drop policy if exists "gestionar_plantillas_propias" on plantillas;
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
    execute format('drop policy if exists "leer_detalle_plantilla" on %I', t);
    execute format($f$
      create policy "leer_detalle_plantilla" on %I
        for select to authenticated
        using (exists (
          select 1 from plantillas p
          where p.id = %I.plantilla_id
            and (p.user_id is null or p.user_id = auth.uid())
        ))
    $f$, t, t);
    execute format('drop policy if exists "gestionar_detalle_plantilla" on %I', t);
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

insert into storage.buckets (id, name, public)
values ('activos', 'activos', false)
on conflict (id) do nothing;

drop policy if exists "activos_propios_select" on storage.objects;
create policy "activos_propios_select" on storage.objects
  for select to authenticated
  using (bucket_id = 'activos' and owner = auth.uid());

drop policy if exists "activos_propios_insert" on storage.objects;
create policy "activos_propios_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'activos' and owner = auth.uid());

drop policy if exists "activos_propios_delete" on storage.objects;
create policy "activos_propios_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'activos' and owner = auth.uid());

-- ============================================================
-- ✅ LISTO — Todo está instalado y configurado
-- Puedes ejecutar este script varias veces sin que dé error.
-- ============================================================
