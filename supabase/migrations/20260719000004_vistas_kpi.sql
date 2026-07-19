-- ============================================================
-- MIGRACIÓN 4 · VISTAS KPI Y ROI EN TIEMPO REAL
-- La base de datos calcula; el frontend solo lee y se suscribe.
-- Todas las vistas usan security_invoker para respetar RLS.
-- ============================================================

-- ---------- Avance del proyecto (motor de pesos) ----------
create view v_progreso_proyecto
with (security_invoker = true) as
select
  p.id                                          as proyecto_id,
  p.nombre,
  p.estado,
  count(t.id)                                   as total_tareas,
  count(t.id) filter (where t.estado = 'completada') as tareas_completadas,
  coalesce(sum(t.peso_porcentual), 0)           as suma_pesos,
  coalesce(sum(t.peso_porcentual), 0) = 100     as pesos_balanceados,
  round(coalesce(
    sum(t.peso_porcentual) filter (where t.estado = 'completada'), 0
  ), 2)                                         as avance_pct
from proyectos p
left join tareas t on t.proyecto_id = p.id
group by p.id;

-- ---------- Motor financiero por proyecto ----------
-- Los movimientos generales (proyecto_id null) NO se imputan aquí;
-- v_resumen_negocio los consolida a nivel global.
create view v_finanzas_proyecto
with (security_invoker = true) as
select
  p.id                                                        as proyecto_id,
  p.nombre,
  -- Capa de ingresos
  coalesce(sum(tr.monto) filter (
    where tr.flujo = 'ingreso' and tr.estado in ('confirmada', 'cobrada')), 0) as ingresos_cobrados,
  coalesce(sum(tr.monto) filter (
    where tr.clase_ingreso = 'recurrente' and tr.estado in ('confirmada', 'cobrada')
      and tr.fecha >= date_trunc('month', current_date)), 0)  as mrr_mes_actual,
  coalesce(sum(tr.monto) filter (
    where tr.clase_ingreso = 'cuenta_por_cobrar' and tr.estado = 'pendiente'), 0) as por_cobrar,
  coalesce(sum(tr.monto) filter (
    where tr.clase_ingreso = 'cuenta_por_cobrar' and tr.estado = 'vencida'), 0)   as vencido,
  -- Capa de inversión y gastos
  coalesce(sum(tr.monto) filter (
    where tr.flujo = 'egreso' and c.capa = 'inversion'), 0)   as inversion_total,
  coalesce(sum(tr.monto) filter (
    where tr.flujo = 'egreso' and c.capa = 'gasto_operativo'), 0) as gastos_operativos,
  coalesce(sum(tr.monto) filter (where tr.flujo = 'egreso'), 0)   as egresos_totales
from proyectos p
left join transacciones tr on tr.proyecto_id = p.id
left join categorias_financieras c on c.id = tr.categoria_id
group by p.id;

-- ---------- ROI y rentabilidad (la vista estrella del dashboard) ----------
-- Estructura de datos lista para graficar: una fila por proyecto con
-- rentabilidad, ROI, margen y salud combinada avance-vs-gasto.
create view v_roi_proyecto
with (security_invoker = true) as
select
  f.proyecto_id,
  f.nombre,
  pr.estado,
  pr.avance_pct,
  pr.pesos_balanceados,
  f.ingresos_cobrados,
  f.mrr_mes_actual,
  f.por_cobrar,
  f.vencido,
  f.inversion_total,
  f.gastos_operativos,
  f.egresos_totales,
  round(f.ingresos_cobrados - f.egresos_totales, 2)           as rentabilidad,
  case when f.egresos_totales > 0
    then round((f.ingresos_cobrados - f.egresos_totales) / f.egresos_totales * 100, 2)
  end                                                          as roi_pct,
  case when f.ingresos_cobrados > 0
    then round((f.ingresos_cobrados - f.egresos_totales) / f.ingresos_cobrados * 100, 2)
  end                                                          as margen_pct,
  -- Índice de salud: ¿el avance justifica el dinero quemado?
  -- > 1 vas adelantada respecto al gasto; < 1 el proyecto quema más de lo que avanza.
  case when f.egresos_totales > 0 and coalesce(p.presupuesto, 0) > 0
    then round((pr.avance_pct / 100.0) / (f.egresos_totales / p.presupuesto), 2)
  end                                                          as indice_salud
from v_finanzas_proyecto f
join v_progreso_proyecto pr on pr.proyecto_id = f.proyecto_id
join proyectos p on p.id = f.proyecto_id;

-- ---------- Resumen global del negocio ----------
create view v_resumen_negocio
with (security_invoker = true) as
select
  t.user_id,
  coalesce(sum(t.monto) filter (
    where t.flujo = 'ingreso' and t.estado in ('confirmada','cobrada')), 0) as ingresos_totales,
  coalesce(sum(t.monto) filter (where t.flujo = 'egreso'), 0)               as egresos_totales,
  coalesce(sum(t.monto) filter (
    where t.clase_ingreso = 'cuenta_por_cobrar' and t.estado in ('pendiente','vencida')), 0) as por_cobrar_total,
  (select coalesce(sum(monto), 0) from suscripciones s
    where s.estado = 'activa' and s.user_id = t.user_id
      and s.ciclo = 'mensual')                                              as burn_mensual_suscripciones
from transacciones t
group by t.user_id;

-- ---------- Renovaciones próximas (alertas de la UI) ----------
create view v_proximas_renovaciones
with (security_invoker = true) as
select s.*, s.proxima_renovacion - current_date as dias_restantes
from suscripciones s
where s.estado = 'activa'
  and s.proxima_renovacion <= current_date + 14
order by s.proxima_renovacion;

-- ---------- Snapshots históricos (tendencias sin recalcular) ----------
-- Una foto diaria de cada proyecto permite graficar la evolución del ROI
-- y la rentabilidad en el tiempo con una consulta trivial.
create table snapshots_kpi (
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

select cron.schedule(
  'snapshots-kpi-diarios',
  '30 6 * * *',
  $$select tomar_snapshots_kpi()$$
);
