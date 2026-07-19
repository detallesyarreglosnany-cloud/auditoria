# Nany OS — Dashboard Estratégico (PWA)

Sistema operativo personal de negocio: gestión de proyectos + control financiero multicapa, con ROI en tiempo real y onboarding de clientes por plantillas.

## Qué resuelve

| Módulo | Capacidad |
|---|---|
| **Proyectos** | CRUD, activos adjuntos (links/archivos), tareas con pesos porcentuales que suman 100% |
| **Financiero** | Inversión (Ads, Cursos, Marketing), Ingresos (recurrente, pago único, cuentas por cobrar), Gastos operativos (suscripciones LLM/SaaS/Hosting) |
| **Rentabilidad** | ROI y rentabilidad calculados dinámicamente por proyecto (vistas SQL, cero lógica duplicada en el frontend) |
| **Onboarding** | Plantillas de Lanzamiento: un nuevo cliente se despliega en 1 clic con tareas, estructura de Drive, pipeline de ventas y stack técnico pre-cargados |

## Estructura del repositorio

```
├── supabase/
│   └── migrations/
│       ├── 20260719000001_nucleo_proyectos.sql   # Proyectos, tareas (pesos), activos
│       ├── 20260719000002_finanzas.sql            # Categorías, transacciones, suscripciones
│       ├── 20260719000003_plantillas.sql          # Módulo de Onboarding + RPC instanciar_plantilla
│       ├── 20260719000004_vistas_kpi.sql          # Progreso, finanzas, ROI, snapshots históricos
│       └── 20260719000005_seguridad_rls.sql       # Row Level Security por usuario
├── docs/
│   ├── 01-arquitectura.md                         # Diagrama ER, flujos de datos, persistencia
│   └── 02-stack-y-ui.md                           # Lovable + React + Supabase, tokens de diseño
└── README.md
```

## Despliegue rápido

```bash
# 1. Crear proyecto en supabase.com (plan gratuito sirve para arrancar)
# 2. Aplicar las migraciones en orden
supabase link --project-ref <tu-ref>
supabase db push

# 3. En Lovable: conectar la integración nativa de Supabase
#    y pegar el prompt maestro de docs/02-stack-y-ui.md
```

## Principios de diseño

1. **La base de datos es la fuente de verdad del cálculo.** ROI, rentabilidad y avance viven en vistas SQL — el frontend solo las lee y se suscribe a cambios (Supabase Realtime).
2. **Modularidad por alimentación automática.** Las suscripciones generan sus gastos solas (pg_cron); las tareas alimentan el avance; las transacciones alimentan el ROI. Nada se escribe dos veces.
3. **Escalabilidad por catálogo.** Las categorías financieras son filas, no columnas ni enums: agregar "Equipamiento" o "Freelancers" mañana es un `INSERT`, no una migración.
