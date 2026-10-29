// project imports
import { lazyWithReload } from 'components/lazyWithReload';
import Loadable from 'components/Loadable';
import RequirePermission from 'components/system/RequirePermission';
import RouteErrorBoundary from 'components/system/RouteErrorBoundary';

const CalendariosPage = Loadable(lazyWithReload(() => import('pages/planificacion/calendarios')));
const PlanificacionesPage = Loadable(lazyWithReload(() => import('pages/planificacion/planificaciones')));
const PlanificacionDetallePage = Loadable(lazyWithReload(() => import('pages/planificacion/planificacion-detalle')));
const PlanificacionMatrizPage = Loadable(lazyWithReload(() => import('pages/planificacion/planificacion-matriz')));

// ==============================|| PLANIFICACION ROUTES ||============================== //

const planificacionRoutes = {
  path: 'planificacion',
  errorElement: <RouteErrorBoundary />,
  children: [
    {
      path: 'calendarios',
      element: (
        <RequirePermission fallbackTo="/" permission="puedeVerPlanificacion">
          <CalendariosPage />
        </RequirePermission>
      )
    },
    {
      path: 'planificaciones',
      element: (
        <RequirePermission fallbackTo="/" permission="puedeVerPlanificacion">
          <PlanificacionesPage />
        </RequirePermission>
      )
    },
    {
      path: 'planificaciones/:id',
      element: (
        <RequirePermission fallbackTo="/" permission="puedeVerPlanificacion">
          <PlanificacionDetallePage />
        </RequirePermission>
      )
    },
    {
      path: 'matriz/:id',
      element: (
        <RequirePermission fallbackTo="/" permission="puedeVerPlanificacion">
          <PlanificacionMatrizPage />
        </RequirePermission>
      )
    }
  ]
};

export default planificacionRoutes;
