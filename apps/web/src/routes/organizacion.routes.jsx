// project imports
import { lazyWithReload } from 'components/lazyWithReload';
import Loadable from 'components/Loadable';
import RequirePermission from 'components/system/RequirePermission';
import RouteErrorBoundary from 'components/system/RouteErrorBoundary';

const DepartamentosPage = Loadable(lazyWithReload(() => import('pages/organizacion/departamentos')));
const ServiciosPage = Loadable(lazyWithReload(() => import('pages/organizacion/servicios')));
const ServicioDetallePage = Loadable(lazyWithReload(() => import('pages/organizacion/servicio-detalle')));

// ==============================|| ORGANIZACION ROUTES ||============================== //

const organizacionRoutes = {
  path: 'organizacion',
  errorElement: <RouteErrorBoundary />,
  children: [
    {
      path: 'departamentos',
      element: (
        <RequirePermission
          capability="gestionarServicios"
          fallbackTo="/planificacion/planificaciones"
          permission="puedeVerOrganizacion"
          requireGlobalCatalogs
        >
          <DepartamentosPage />
        </RequirePermission>
      )
    },
    {
      path: 'servicios',
      element: (
        <RequirePermission fallbackTo="/planificacion/planificaciones" permission="puedeVerOrganizacion">
          <ServiciosPage />
        </RequirePermission>
      )
    },
    {
      path: 'servicios/:id',
      element: (
        <RequirePermission fallbackTo="/planificacion/planificaciones" permission="puedeVerOrganizacion">
          <ServicioDetallePage />
        </RequirePermission>
      )
    }
  ]
};

export default organizacionRoutes;
