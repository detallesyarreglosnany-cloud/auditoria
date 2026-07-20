// Tipos alineados con el esquema de supabase/migrations/ y APLICA_ESTO_EN_SUPABASE.sql

export type EstadoProyecto = 'idea' | 'onboarding' | 'activo' | 'pausado' | 'completado' | 'archivado';
export type EstadoTarea = 'pendiente' | 'en_progreso' | 'completada' | 'bloqueada';
export type TipoActivo = 'link' | 'archivo' | 'carpeta_drive' | 'credencial' | 'documento';
export type FlujoTransaccion = 'ingreso' | 'egreso';
export type CapaFinanciera = 'inversion' | 'ingreso' | 'gasto_operativo';
export type ClaseIngreso = 'recurrente' | 'pago_unico' | 'cuenta_por_cobrar';
export type EstadoTransaccion = 'confirmada' | 'pendiente' | 'cobrada' | 'vencida';
export type CicloFacturacion = 'mensual' | 'trimestral' | 'anual';
export type EstadoSuscripcion = 'activa' | 'pausada' | 'cancelada';

export interface Proyecto {
  id: string;
  user_id: string;
  nombre: string;
  slug: string;
  descripcion: string | null;
  cliente: string | null;
  estado: EstadoProyecto;
  plantilla_id: string | null;
  fecha_inicio: string | null;
  fecha_objetivo: string | null;
  presupuesto: number | null;
  creado_en: string;
  actualizado_en: string;
}

export interface Tarea {
  id: string;
  user_id: string;
  proyecto_id: string;
  titulo: string;
  descripcion: string | null;
  peso_porcentual: number;
  estado: EstadoTarea;
  orden: number;
  es_recurrente: boolean;
  fecha_limite: string | null;
  completada_en: string | null;
  creado_en: string;
}

export interface ActivoProyecto {
  id: string;
  user_id: string;
  proyecto_id: string;
  tipo: TipoActivo;
  titulo: string;
  url: string | null;
  storage_path: string | null;
  metadata: Record<string, unknown>;
  creado_en: string;
}

export interface CategoriaFinanciera {
  id: string;
  user_id: string | null;
  nombre: string;
  capa: CapaFinanciera;
  icono: string | null;
  es_sistema: boolean;
  creado_en: string;
}

export interface Transaccion {
  id: string;
  user_id: string;
  proyecto_id: string | null;
  categoria_id: string;
  suscripcion_id: string | null;
  flujo: FlujoTransaccion;
  clase_ingreso: ClaseIngreso | null;
  estado: EstadoTransaccion;
  monto: number;
  moneda: string;
  fecha: string;
  fecha_cobro_esperada: string | null;
  descripcion: string | null;
  metadata: Record<string, unknown>;
  creado_en: string;
}

export interface Suscripcion {
  id: string;
  user_id: string;
  proyecto_id: string | null;
  categoria_id: string;
  nombre: string;
  proveedor: string | null;
  monto: number;
  moneda: string;
  ciclo: CicloFacturacion;
  proxima_renovacion: string;
  estado: EstadoSuscripcion;
  url_gestion: string | null;
  creado_en: string;
  dias_restantes?: number;
}

export interface Plantilla {
  id: string;
  user_id: string | null;
  nombre: string;
  descripcion: string | null;
  activa: boolean;
  creado_en: string;
}

export interface PipelineEtapa {
  id: string;
  user_id: string;
  proyecto_id: string;
  etapa: string;
  orden: number;
  completada: boolean;
  completada_en: string | null;
}

export interface VRoiProyecto {
  proyecto_id: string;
  nombre: string;
  estado: EstadoProyecto;
  avance_pct: number;
  pesos_balanceados: boolean;
  ingresos_cobrados: number;
  mrr_mes_actual: number;
  por_cobrar: number;
  vencido: number;
  inversion_total: number;
  gastos_operativos: number;
  egresos_totales: number;
  rentabilidad: number;
  roi_pct: number | null;
  margen_pct: number | null;
  indice_salud: number | null;
}

export interface VProgresoProyecto {
  proyecto_id: string;
  nombre: string;
  estado: EstadoProyecto;
  total_tareas: number;
  tareas_completadas: number;
  suma_pesos: number;
  pesos_balanceados: boolean;
  avance_pct: number;
}

export interface VResumenNegocio {
  user_id: string;
  ingresos_totales: number;
  egresos_totales: number;
  por_cobrar_total: number;
  burn_mensual_suscripciones: number;
}
