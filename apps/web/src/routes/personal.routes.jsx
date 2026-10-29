// project imports
import { lazyWithReload } from 'components/lazyWithReload';
import Loadable from 'components/Loadable';
import RequirePermission from 'components/system/RequirePermission';
import RouteErrorBoundary from 'components/system/RouteErrorBoundary';

const PersonalPage = Loadable(lazyWithReload(() => import('pages/personal')));
const AsignacionesPage = Loadable(lazyWithReload(() => import('pages/personal/asignaciones')));
const CargosPage = Loadable(lazyWithReload(() => import('pages/personal/cargos')));
const CatalogosPersonalPage = Loadable(lazyWithReload(() => import('pages/personal/catalogos')));
const PersonalDetallePage = Loadable(lazyWithReload(() => import('pages/personal/personal-detalle')));
const CatalogosPersonalTabs = Loadable(lazyWithReload(() => import('components/system/CatalogosPersonalTabs')));
const CargasHorariasPage = Loadable(lazyWithReload(() => import('pages/operacion/cargas-horarias')));
const TiposContratoPage = Loadable(lazyWithReload(() => import('pages/personal/tipos-contrato')));

// ==============================|| PERSONAL ROUTES ||============================== //

const personalRoutes = {
  path: 'personal',
  errorElement: <RouteErrorBoundary />,
  children: [
    {
      path: '',
      element: (
        <RequirePermission fallbackTo="/planificacion/planificaciones" permission="puedeVerPersonal">
          <PersonalPage />
        </RequirePermission>
      )
    },
    {
      path: ':id',
      element: (
        <RequirePermission fallbackTo="/planificacion/planificaciones" permissions={['puedeVerPersonal', 'puedeVerAsignaciones']}>
          <PersonalDetallePage />
        </RequirePermission>
      )
    },
    {
      path: 'asignaciones',
      element: (
        <RequirePermission fallbackTo="/planificacion/planificaciones" permission="puedeVerAsignaciones">
          <AsignacionesPage />
        </RequirePermission>
      )
    },
    {
      path: 'catalogos',
      element: (
        <RequirePermission
          anyOf={[
            { permission: 'puedeGestionarPersonal' },
            { permission: 'puedeVerOperacion', capability: 'verCargasHorarias' },
            { permission: 'puedeVerPersonal' }
          ]}
          fallbackTo="/planificacion/planificaciones"
        >
          <CatalogosPersonalTabs />
        </RequirePermission>
      ),
      children: [
        {
          index: true,
          element: (
            <RequirePermission fallbackTo="/planificacion/planificaciones" permission="puedeGestionarPersonal">
              <CatalogosPersonalPage />
            </RequirePermission>
          )
        },
        {
          path: 'cargas-horarias',
          element: (
            <RequirePermission capability="verCargasHorarias" fallbackTo="/planificacion/planificaciones" permission="puedeVerOperacion">
              <CargasHorariasPage />
            </RequirePermission>
          )
        },
        {
          path: 'tipos-contrato',
          element: (
            <RequirePermission fallbackTo="/planificacion/planificaciones" permission="puedeVerPersonal">
              <TiposContratoPage />
            </RequirePermission>
          )
        }
      ]
    },
    {
      path: 'cargos',
      element: (
        <RequirePermission fallbackTo="/planificacion/planificaciones" permission="puedeGestionarPersonal">
          <CargosPage />
        </RequirePermission>
      )
    }
  ]
};

export default personalRoutes;
