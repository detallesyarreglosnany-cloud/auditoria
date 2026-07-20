# Nany OS — Dashboard Estratégico (PWA)

Sistema operativo personal de negocio: gestión de proyectos + control financiero multicapa, con ROI en tiempo real y onboarding de clientes por plantillas.

**Stack:** React + Vite + TypeScript + Tailwind + Supabase. Desplegable en Vercel directo desde GitHub.

## Qué resuelve

| Módulo | Capacidad |
|---|---|
| **Proyectos** | CRUD, activos adjuntos (links/archivos), tareas con pesos porcentuales que suman 100% |
| **Financiero** | Inversión (Ads, Cursos, Marketing), Ingresos (recurrente, pago único, cuentas por cobrar), Gastos operativos (suscripciones LLM/SaaS/Hosting) |
| **Rentabilidad** | ROI y rentabilidad calculados dinámicamente por proyecto (vistas SQL, cero lógica duplicada en el frontend) |
| **Onboarding** | Plantillas de Lanzamiento: un nuevo cliente se despliega en 1 clic con tareas, estructura de Drive, pipeline de ventas y stack técnico pre-cargados |

## Estructura del repositorio

```
├── src/
│   ├── modulos/
│   │   ├── auth/         # Login, contexto de sesión
│   │   ├── dashboard/    # KPIs globales, ROI por proyecto
│   │   ├── proyectos/    # CRUD, tareas con peso, activos, pipeline
│   │   ├── finanzas/     # Transacciones, suscripciones
│   │   └── onboarding/   # Plantillas de lanzamiento
│   ├── hooks/            # TanStack Query + Supabase Realtime
│   ├── components/ui/    # Design system (Button, Card, Modal, etc.)
│   ├── lib/               # Cliente Supabase, utilidades
│   └── types/             # Tipos TS alineados al esquema SQL
├── supabase/migrations/   # Esquema de base de datos (5 migraciones)
├── docs/                  # Arquitectura y decisiones de diseño
└── APLICA_ESTO_EN_SUPABASE.sql   # Script único para pegar en el SQL Editor
```

## Desplegar en Vercel desde GitHub

1. **Backend (una sola vez):** en supabase.com, pega `APLICA_ESTO_EN_SUPABASE.sql` en el SQL Editor y ejecútalo. Habilita la extensión `pg_cron` en Database → Extensions.
2. **Vercel:**
   - Ve a [vercel.com/new](https://vercel.com/new) → **Import Git Repository** → selecciona este repo.
   - Framework preset: **Vite** (se detecta solo).
   - En **Environment Variables**, agrega:
     | Nombre | Valor |
     |---|---|
     | `VITE_SUPABASE_URL` | `https://xsaokobebcfmwbrbmpvg.supabase.co` |
     | `VITE_SUPABASE_ANON_KEY` | tu `anon key` (Supabase → Settings → API) |
   - Click **Deploy**.
3. Cada `git push` a la rama conectada re-despliega automáticamente.

## Desarrollo local

```bash
npm install
cp .env.example .env.local   # completa con tus credenciales de Supabase
npm run dev                  # http://localhost:5173
```

```bash
npm run build      # verifica typecheck + build de producción
npm run preview    # sirve el build localmente
```

## Principios de diseño

1. **La base de datos es la fuente de verdad del cálculo.** ROI, rentabilidad y avance viven en vistas SQL — el frontend solo las lee y se suscribe a cambios (Supabase Realtime).
2. **Modularidad por alimentación automática.** Las suscripciones generan sus gastos solas (pg_cron); las tareas alimentan el avance; las transacciones alimentan el ROI. Nada se escribe dos veces.
3. **Escalabilidad por catálogo.** Las categorías financieras son filas, no columnas ni enums: agregar "Equipamiento" o "Freelancers" mañana es un `INSERT`, no una migración.
4. **PWA instalable con soporte offline** vía Service Worker (Workbox, generado por `vite-plugin-pwa`).
