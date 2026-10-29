// project imports
import { lazyWithReload } from 'components/lazyWithReload';
import Loadable from 'components/Loadable';
import RequirePermission from 'components/system/RequirePermission';
import RouteErrorBoundary from 'components/system/RouteErrorBoundary';

const ConfiguracionServicioPage = Loadable(lazyWithReload(() => import('pages/operacion/configuracion-servicio')));
const TiposFeriadoPage = Loadable(lazyWithReload(() => import('pages/operacion/tipos-feriado')));
const IncidenciasPersonalesPage = Loadable(lazyWithReload(() => import('pages/operacion/incidencias-personales')));
const CalendarioOperacionTabs = Loadable(lazyWithReload(() => import('components/system/CalendarioOperacionTabs')));
const ConfiguracionOperativaPage = Loadable(lazyWithReload(() => import('pages/operacion/configuracion-operativa')));
const TurnosPage = Loadable(lazyWithReload(() => import('pages/operacion/turnos')));
const CalendariosPage = Loadable(lazyWithReload(() => import('pages/planificacion/calendarios')));

// ==============================|| OPERACION ROUTES ||============================== //

const operacionRoutes = {
  path: 'operacion',
  errorElement: <RouteErrorBoundary />,
  children: [
    {
      path: 'calendarios',
      element: (
        <RequirePermission
          capabilities={['verCalendarios', 'verIncidenciasPersonales']}
          fallbackTo="/planificacion/planificaciones"
          permission="puedeVerOperacion"
        >
          <CalendarioOperacionTabs />
        </RequirePermission>
      ),
      children: [
        {
          index: true,
          element: (
            <RequirePermission capability="verCalendarios" fallbackTo="/planificacion/planificaciones" permission="puedeVerOperacion">
              <CalendariosPage />
            </RequirePermission>
          )
        },
        {
          path: 'feriados',
          element: (
            <RequirePermission capability="verCalendarios" fallbackTo="/planificacion/planificaciones" permission="puedeVerOperacion">
              <TiposFeriadoPage />
            </RequirePermission>
          )
        },
        {
          path: 'incidencias',
          element: (
            <RequirePermission
              capability="verIncidenciasPersonales"
              fallbackTo="/planificacion/planificaciones"
              permission="puedeVerOperacion"
            >
              <IncidenciasPersonalesPage />
            </RequirePermission>
          )
        }
      ]
    },
    {
      path: 'incidencias-personales',
      element: (
        <RequirePermission capability="verCalendarios" fallbackTo="/planificacion/planificaciones" permission="puedeVerOperacion">
          <TiposFeriadoPage />
        </RequirePermission>
      )
    },
    {
      path: 'configuracion-servicio',
      element: (
        <RequirePermission capability="verTurnos" fallbackTo="/planificacion/planificaciones" permission="puedeVerOperacion">
          <ConfiguracionServicioPage />
        </RequirePermission>
      )
    },
    {
      path: 'configuracion-operativa',
      element: (
        <RequirePermission
          capability="gestionarCodigosOperativos"
          fallbackTo="/planificacion/planificaciones"
          permission="puedeVerOperacion"
        >
          <ConfiguracionOperativaPage />
        </RequirePermission>
      )
    },
    {
      path: 'turnos',
      element: (
        <RequirePermission capability="verTurnos" fallbackTo="/planificacion/planificaciones" permission="puedeVerOperacion">
          <TurnosPage />
        </RequirePermission>
      )
    }
  ]
};

export default operacionRoutes;
