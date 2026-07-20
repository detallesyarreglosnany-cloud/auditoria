# 02 · Stack Tecnológico y Sistema de Diseño

## Stack recomendado

| Capa | Tecnología | Por qué |
|---|---|---|
| Frontend | **React 18 + Vite + TypeScript** | Código propio en este repo (`src/`), sin generador externo |
| Estilos | **Tailwind CSS** + componentes propios (`src/components/ui`) | Tokens de diseño centralizados, sin dependencia de un builder |
| Datos | **supabase-js + TanStack Query** | Caché, reintentos, invalidación y persistencia offline |
| Ruteo | **React Router** | Login, Dashboard, Proyectos, Finanzas, Onboarding |
| PWA | **vite-plugin-pwa** | Manifest + Service Worker con una línea de config |
| Backend | **Supabase** (Postgres, Auth, Storage, Realtime, pg_cron) | Todo el cálculo y la automatización viven en la base |
| Despliegue | **Vercel**, conectado directo al repo de GitHub | Deploy automático en cada push — ver README.md |

## Tokens de diseño (paleta minimalista)

```ts
// tailwind.config.ts → theme.extend.colors
colors: {
  fondo:    '#0A0A0A',  // negro — superficie principal
  panel:    '#111111',  // tarjetas (un paso sobre el fondo)
  borde:    '#1F1F1F',  // separadores sutiles
  acento:   '#D2B48C',  // beige — CTAs, valores positivos, foco
  'acento-suave': '#D2B48C1A', // beige al 10% para fondos de chip
  texto:    '#EAEAEA',  // blanco — texto principal
  'texto-secundario': '#8A8A8A',
  peligro:  '#E5484D',  // rentabilidad negativa / vencidos (único color fuera de la tríada)
}
```

Reglas de uso: el beige es **escaso y significativo** — solo CTAs, cifras de
ROI positivas y estados activos. Todo lo demás vive en la escala de grises.
Tipografía sugerida: `Inter` para UI, `JetBrains Mono` para cifras (los
números tabulares alinean las columnas de dinero).

## Estructura modular del frontend

```
src/
├── modulos/
│   ├── proyectos/      # CRUD, detalle, tareas con pesos, activos
│   ├── finanzas/       # transacciones, suscripciones, cuentas por cobrar
│   ├── dashboard/      # KPIs globales, v_roi_proyecto, tendencias
│   └── onboarding/     # gestor de plantillas + botón "Desplegar cliente"
├── lib/
│   ├── supabase.ts     # cliente único
│   └── queries/        # hooks TanStack Query por vista/tabla
└── componentes/ui/     # shadcn tematizado con los tokens
```

Cada módulo consume la base a través de sus vistas (`v_roi_proyecto`,
`v_progreso_proyecto`, `v_proximas_renovaciones`) — nunca recalcula en cliente.

## Hook de ROI en tiempo real (patrón central)

```ts
// lib/queries/useRoiProyectos.ts
export function useRoiProyectos() {
  const qc = useQueryClient();

  useEffect(() => {
    // Las vistas no emiten eventos: nos suscribimos a las tablas fuente
    // y reconsultamos la vista — siempre fresca porque el cálculo es SQL.
    const canal = supabase
      .channel('roi-en-vivo')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transacciones' },
        () => qc.invalidateQueries({ queryKey: ['roi'] }))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tareas' },
        () => qc.invalidateQueries({ queryKey: ['roi'] }))
      .subscribe();
    return () => { supabase.removeChannel(canal); };
  }, [qc]);

  return useQuery({
    queryKey: ['roi'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_roi_proyecto')
        .select('*')
        .order('rentabilidad', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}
```

## Configuración PWA

```ts
// vite.config.ts
VitePWA({
  registerType: 'autoUpdate',
  manifest: {
    name: 'Nany OS — Dashboard Estratégico',
    short_name: 'NanyOS',
    theme_color: '#0A0A0A',
    background_color: '#0A0A0A',
    display: 'standalone',
    icons: [/* 192 y 512 px, fondo #0A0A0A, símbolo beige */],
  },
})
```

Persistencia offline: `@tanstack/query-persist-client` + IndexedDB para que el
dashboard abra con los últimos KPIs sin conexión.

## Dónde está cada página

| Página | Archivo | Consume |
|---|---|---|
| Dashboard | `src/modulos/dashboard/DashboardPage.tsx` | `v_resumen_negocio`, `v_roi_proyecto`, `v_proximas_renovaciones` |
| Proyectos (lista) | `src/modulos/proyectos/ProyectosListPage.tsx` | `proyectos` |
| Proyecto (detalle) | `src/modulos/proyectos/ProyectoDetallePage.tsx` + `TareasPanel`, `ActivosPanel`, `PipelinePanel` | `tareas`, `activos_proyecto`, `pipeline_etapas`, `v_progreso_proyecto`, `v_roi_proyecto` |
| Finanzas | `src/modulos/finanzas/FinanzasPage.tsx` + `SuscripcionesPanel.tsx` | `transacciones`, `suscripciones`, `categorias_financieras` |
| Onboarding | `src/modulos/onboarding/OnboardingPage.tsx` | `plantillas`, RPC `instanciar_plantilla` |
| Login | `src/modulos/auth/LoginPage.tsx` | Supabase Auth (email/password) |

## Roadmap sugerido (siguiente nivel)

1. **Fase 2 — Captura sin fricción:** una Edge Function que reciba correos de
   facturas (Stripe, Google Ads) y cree transacciones solas.
2. **Fase 3 — Proyección de caja:** vista que combine MRR + suscripciones
   activas + cuentas por cobrar para proyectar los próximos 90 días.
3. **Fase 4 — Modo agencia:** invitar colaboradores por proyecto (la RLS ya
   está preparada; solo se añade una tabla `miembros_proyecto`).
