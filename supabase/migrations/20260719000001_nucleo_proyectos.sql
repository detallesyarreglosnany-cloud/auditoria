-- ============================================================
-- MIGRACIÓN 1 · NÚCLEO DE PROYECTOS
-- Proyectos, tareas con pesos porcentuales y activos adjuntos.
-- ============================================================

create extension if not exists "pgcrypto";

-- ---------- Tipos enumerados ----------
create type estado_proyecto as enum ('idea', 'onboarding', 'activo', 'pausado', 'completado', 'archivado');
create type estado_tarea    as enum ('pendiente', 'en_progreso', 'completada', 'bloqueada');
create type tipo_activo     as enum ('link', 'archivo', 'carpeta_drive', 'credencial', 'documento');

-- ---------- Proyectos ----------
create table proyectos (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null default auth.uid() references auth.users (id) on delete cascade,
  nombre          text not null,
  slug            text generated always as (lower(regexp_replace(nombre, '[^a-zA-Z0-9]+', '-', 'g'))) stored,
  descripcion     text,
  cliente         text,
  estado          estado_proyecto not null default 'idea',
  plantilla_id    uuid,                                   -- FK diferida: se enlaza en migración 3
  fecha_inicio    date,
  fecha_objetivo  date,
  presupuesto     numeric(12,2),
  creado_en       timestamptz not null default now(),
  actualizado_en  timestamptz not null default now()
);

-- ---------- Tareas con peso porcentual ----------
-- Regla de negocio: los pesos de un proyecto no pueden exceder 100.
-- No se exige exactamente 100 en cada escritura (impediría construir el
-- plan de forma incremental); la vista v_progreso_proyecto expone el flag
-- `pesos_balanceados` para que la UI marque proyectos incompletos.
create table tareas (
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

create index idx_tareas_proyecto on tareas (proyecto_id);

-- Valida que la suma de pesos por proyecto nunca supere 100.
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

create trigger trg_validar_pesos
  before insert or update of peso_porcentual, proyecto_id on tareas
  for each row execute function validar_pesos_proyecto();

-- Marca automáticamente la fecha de completado.
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

create trigger trg_marcar_completada
  before update of estado on tareas
  for each row execute function marcar_completada();

-- ---------- Activos del proyecto (links, archivos, Drive) ----------
-- Los archivos binarios viven en Supabase Storage (bucket `activos`);
-- aquí se guarda la referencia (storage_path) o la URL externa.
create table activos_proyecto (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  proyecto_id  uuid not null references proyectos (id) on delete cascade,
  tipo         tipo_activo not null default 'link',
  titulo       text not null,
  url          text,
  storage_path text,
  metadata     jsonb not null default '{}'::jsonb,
  creado_en    timestamptz not null default now(),
  -- Las carpetas de Drive pueden crearse como recordatorio antes de tener URL.
  check (tipo = 'carpeta_drive' or url is not null or storage_path is not null)
);

create index idx_activos_proyecto on activos_proyecto (proyecto_id);

-- ---------- updated_at automático ----------
create or replace function tocar_actualizado_en()
returns trigger language plpgsql as $$
begin
  new.actualizado_en := now();
  return new;
end $$;

create trigger trg_proyectos_touch
  before update on proyectos
  for each row execute function tocar_actualizado_en();
