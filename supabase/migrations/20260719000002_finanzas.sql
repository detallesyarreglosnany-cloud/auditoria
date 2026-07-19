-- ============================================================
-- MIGRACIÓN 2 · MÓDULO FINANCIERO MULTICAPA
-- Categorías extensibles, transacciones unificadas y
-- suscripciones que generan sus gastos automáticamente.
-- ============================================================

-- ---------- Tipos enumerados ----------
-- `flujo` define la dirección del dinero; `capa` define la capa de negocio.
create type flujo_transaccion as enum ('ingreso', 'egreso');
create type capa_financiera   as enum ('inversion', 'ingreso', 'gasto_operativo');
create type clase_ingreso     as enum ('recurrente', 'pago_unico', 'cuenta_por_cobrar');
create type estado_transaccion as enum ('confirmada', 'pendiente', 'cobrada', 'vencida');
create type ciclo_facturacion as enum ('mensual', 'trimestral', 'anual');
create type estado_suscripcion as enum ('activa', 'pausada', 'cancelada');

-- ---------- Catálogo de categorías (escalable sin migraciones) ----------
-- Agregar una categoría nueva mañana = un INSERT. Las categorías de
-- sistema (es_sistema) se siembran aquí y no se borran desde la UI.
create table categorias_financieras (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid default auth.uid() references auth.users (id) on delete cascade, -- null = global
  nombre     text not null,
  capa       capa_financiera not null,
  icono      text,
  es_sistema boolean not null default false,
  creado_en  timestamptz not null default now(),
  unique (user_id, nombre, capa)
);

insert into categorias_financieras (nombre, capa, icono, es_sistema) values
  -- Capa de Inversión
  ('Ads',        'inversion', 'megaphone',  true),
  ('Cursos',     'inversion', 'book',       true),
  ('Marketing',  'inversion', 'trending-up',true),
  -- Capa de Ingresos
  ('Servicios',  'ingreso',   'briefcase',  true),
  ('Productos',  'ingreso',   'package',    true),
  ('Retainers',  'ingreso',   'refresh-cw', true),
  -- Capa de Gastos Operativos
  ('LLMs',       'gasto_operativo', 'cpu',    true),
  ('SaaS',       'gasto_operativo', 'layers', true),
  ('Hosting',    'gasto_operativo', 'server', true);

-- ---------- Transacciones (libro mayor unificado) ----------
-- Toda entrada o salida de dinero es una fila aquí. `proyecto_id` permite
-- asociar cualquier movimiento a un proyecto; si es null, es un movimiento
-- general del negocio (se prorratea en las vistas de la migración 4).
create table transacciones (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null default auth.uid() references auth.users (id) on delete cascade,
  proyecto_id    uuid references proyectos (id) on delete set null,
  categoria_id   uuid not null references categorias_financieras (id) on delete restrict,
  suscripcion_id uuid,                                  -- FK diferida: se enlaza más abajo
  flujo          flujo_transaccion not null,
  clase_ingreso  clase_ingreso,                         -- solo aplica a ingresos
  estado         estado_transaccion not null default 'confirmada',
  monto          numeric(12,2) not null check (monto > 0),
  moneda         char(3) not null default 'USD',
  fecha          date not null default current_date,
  fecha_cobro_esperada date,                            -- para cuentas por cobrar
  descripcion    text,
  metadata       jsonb not null default '{}'::jsonb,
  creado_en      timestamptz not null default now(),
  -- Coherencia: la clase de ingreso solo existe en ingresos, y las
  -- cuentas por cobrar nacen 'pendiente'.
  check (flujo = 'ingreso' or clase_ingreso is null),
  check (clase_ingreso is distinct from 'cuenta_por_cobrar' or estado in ('pendiente', 'cobrada', 'vencida'))
);

create index idx_trans_proyecto  on transacciones (proyecto_id);
create index idx_trans_fecha     on transacciones (fecha desc);
create index idx_trans_categoria on transacciones (categoria_id);

-- ---------- Suscripciones (LLMs, SaaS, Hosting) ----------
create table suscripciones (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null default auth.uid() references auth.users (id) on delete cascade,
  proyecto_id       uuid references proyectos (id) on delete set null, -- null = costo general del negocio
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

alter table transacciones
  add constraint fk_trans_suscripcion
  foreign key (suscripcion_id) references suscripciones (id) on delete set null;

-- ---------- Alimentación automática ----------
-- Cada día, pg_cron ejecuta esta función: toda suscripción activa cuya
-- renovación venció genera su transacción de egreso y avanza su fecha.
-- Así el módulo financiero se alimenta solo de la actividad real.
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

-- Programación diaria (requiere la extensión pg_cron, disponible en Supabase:
-- Dashboard → Database → Extensions → habilitar pg_cron).
create extension if not exists pg_cron;
select cron.schedule(
  'renovar-suscripciones',
  '0 6 * * *',                      -- todos los días a las 06:00 UTC
  $$select generar_gastos_suscripciones()$$
);

-- Marca como vencidas las cuentas por cobrar cuya fecha esperada pasó.
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

select cron.schedule(
  'marcar-cuentas-vencidas',
  '15 6 * * *',
  $$select marcar_cuentas_vencidas()$$
);
