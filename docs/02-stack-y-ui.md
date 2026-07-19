# 02 · Stack Tecnológico y Sistema de Diseño

## Stack recomendado

| Capa | Tecnología | Por qué |
|---|---|---|
| Generación UI | **Lovable** | Integración nativa con Supabase (auth + tipos + RLS ya cableados) |
| Frontend | **React 18 + Vite + TypeScript** | Lo que Lovable produce; tipado contra el esquema real |
| Estilos | **Tailwind CSS + shadcn/ui** | Tokens de diseño centralizados, componentes accesibles |
| Datos | **supabase-js + TanStack Query** | Caché, reintentos, invalidación y persistencia offline |
| Gráficas | **Recharts** | Ligero, declarativo, se tematiza con los tokens |
| PWA | **vite-plugin-pwa** | Manifest + Service Worker con una línea de config |
| Backend | **Supabase** (Postgres, Auth, Storage, Realtime, pg_cron) | Todo el cálculo y la automatización viven en la base |

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

## Prompt maestro para Lovable

Pega esto en Lovable después de conectar tu proyecto Supabase (con las
migraciones ya aplicadas):

> Crea una PWA llamada "Nany OS" conectada a mi Supabase existente.
> Estética: fondo #0A0A0A, tarjetas #111111, acento beige #D2B48C (solo para
> CTAs y cifras positivas), texto #EAEAEA, tipografía Inter y cifras en
> JetBrains Mono. Minimalista, mucho espacio negativo, sin gradientes.
>
> Páginas:
> 1. **Dashboard**: tarjetas KPI desde `v_resumen_negocio` (ingresos, egresos,
>    por cobrar, burn mensual); tabla de proyectos desde `v_roi_proyecto` con
>    barra de avance, rentabilidad y ROI (verde-beige positivo, rojo #E5484D
>    negativo); gráfica de tendencia desde `snapshots_kpi`; panel lateral de
>    alertas desde `v_proximas_renovaciones`.
> 2. **Proyectos**: lista + detalle con tareas (peso porcentual editable,
>    aviso si `pesos_balanceados` es false), activos adjuntos (links y subida
>    al bucket `activos`), pipeline de ventas tipo kanban desde
>    `pipeline_etapas`.
> 3. **Finanzas**: registro rápido de transacciones (selector de categoría
>    desde `categorias_financieras`, capa y clase de ingreso), gestor de
>    suscripciones con próxima renovación, vista de cuentas por cobrar con
>    estados pendiente/cobrada/vencida.
> 4. **Onboarding**: lista de plantillas; botón "Desplegar cliente" que abre
>    un modal (nombre, cliente, fecha) y llama
>    `supabase.rpc('instanciar_plantilla', …)`; editor de plantillas propias.
>
> Usa TanStack Query con suscripciones Realtime a `transacciones` y `tareas`
> para refrescar el ROI en vivo. No calcules ningún KPI en el cliente: todo
> viene de las vistas.

## Roadmap sugerido (siguiente nivel)

1. **Fase 2 — Captura sin fricción:** una Edge Function que reciba correos de
   facturas (Stripe, Google Ads) y cree transacciones solas.
2. **Fase 3 — Proyección de caja:** vista que combine MRR + suscripciones
   activas + cuentas por cobrar para proyectar los próximos 90 días.
3. **Fase 4 — Modo agencia:** invitar colaboradores por proyecto (la RLS ya
   está preparada; solo se añade una tabla `miembros_proyecto`).
