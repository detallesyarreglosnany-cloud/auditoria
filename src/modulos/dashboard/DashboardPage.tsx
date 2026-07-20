import { Link } from 'react-router-dom';
import { TrendingUp, TrendingDown, Clock, AlertTriangle, ArrowUpRight } from 'lucide-react';
import { Card, CardTitle, CardValue } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { useRoiProyectos, useResumenNegocio, useProximasRenovaciones } from '@/hooks/useDashboard';
import { formatoMoneda, formatoPorcentaje, diasRestantesLabel } from '@/lib/utils';

export function DashboardPage() {
  const { data: resumen, isLoading: cargandoResumen } = useResumenNegocio();
  const { data: proyectos, isLoading: cargandoProyectos } = useRoiProyectos();
  const { data: renovaciones } = useProximasRenovaciones();

  const rentabilidadTotal = (resumen?.ingresos_totales ?? 0) - (resumen?.egresos_totales ?? 0);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-texto">Dashboard</h1>
        <p className="text-texto-secundario text-sm mt-1">Vista general del negocio en tiempo real</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardTitle>Ingresos totales</CardTitle>
          <CardValue>{cargandoResumen ? '…' : formatoMoneda(resumen?.ingresos_totales)}</CardValue>
        </Card>
        <Card>
          <CardTitle>Egresos totales</CardTitle>
          <CardValue>{cargandoResumen ? '…' : formatoMoneda(resumen?.egresos_totales)}</CardValue>
        </Card>
        <Card>
          <CardTitle>Rentabilidad</CardTitle>
          <CardValue className={rentabilidadTotal >= 0 ? 'text-acento' : 'text-peligro'}>
            {cargandoResumen ? '…' : formatoMoneda(rentabilidadTotal)}
          </CardValue>
        </Card>
        <Card>
          <CardTitle>Burn mensual (suscripciones)</CardTitle>
          <CardValue>{cargandoResumen ? '…' : formatoMoneda(resumen?.burn_mensual_suscripciones)}</CardValue>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium text-texto-secundario">ROI por proyecto</h2>
            <Link to="/proyectos" className="text-xs text-acento hover:underline flex items-center gap-1">
              Ver todos <ArrowUpRight size={12} />
            </Link>
          </div>
          <Card className="p-0 overflow-hidden">
            {cargandoProyectos ? (
              <div className="p-5 text-sm text-texto-secundario">Cargando…</div>
            ) : !proyectos?.length ? (
              <div className="p-5 text-sm text-texto-secundario">
                Aún no hay proyectos. Crea uno desde{' '}
                <Link to="/onboarding" className="text-acento hover:underline">
                  Onboarding
                </Link>
                .
              </div>
            ) : (
              <div className="divide-y divide-borde">
                {proyectos.map((p) => (
                  <Link
                    key={p.proyecto_id}
                    to={`/proyectos/${p.proyecto_id}`}
                    className="flex items-center gap-4 p-4 hover:bg-panel-alto transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-texto truncate">{p.nombre}</span>
                        {!p.pesos_balanceados && (
                          <Badge tono="peligro" title="La suma de pesos de las tareas no llega a 100%">
                            <AlertTriangle size={10} className="mr-1" />
                            Plan incompleto
                          </Badge>
                        )}
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <ProgressBar valor={p.avance_pct} className="max-w-[160px]" />
                        <span className="text-xs text-texto-secundario cifra">
                          {formatoPorcentaje(p.avance_pct)}
                        </span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div
                        className={`cifra font-medium flex items-center gap-1 justify-end ${
                          p.rentabilidad >= 0 ? 'text-acento' : 'text-peligro'
                        }`}
                      >
                        {p.rentabilidad >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                        {formatoMoneda(p.rentabilidad)}
                      </div>
                      <div className="text-xs text-texto-secundario mt-0.5">
                        ROI {p.roi_pct !== null ? formatoPorcentaje(p.roi_pct) : '—'}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div>
          <h2 className="text-sm font-medium text-texto-secundario mb-3">Próximas renovaciones</h2>
          <Card className="p-0 overflow-hidden">
            {!renovaciones?.length ? (
              <div className="p-5 text-sm text-texto-secundario">Sin renovaciones en los próximos 14 días.</div>
            ) : (
              <div className="divide-y divide-borde">
                {renovaciones.map((s) => (
                  <div key={s.id} className="p-4 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-texto truncate">{s.nombre}</p>
                      <p className="text-xs text-texto-secundario flex items-center gap-1 mt-0.5">
                        <Clock size={11} />
                        {diasRestantesLabel(s.dias_restantes ?? 0)}
                      </p>
                    </div>
                    <span className="cifra text-sm text-texto shrink-0">{formatoMoneda(s.monto, s.moneda)}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
