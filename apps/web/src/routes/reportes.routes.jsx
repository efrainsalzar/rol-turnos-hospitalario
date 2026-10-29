// project imports
import { lazyWithReload } from 'components/lazyWithReload';
import Loadable from 'components/Loadable';
import RequirePermission from 'components/system/RequirePermission';
import RouteErrorBoundary from 'components/system/RouteErrorBoundary';

const ReporteRolPersonalPage = Loadable(lazyWithReload(() => import('pages/reportes/reporte-rol-personal')));

// ==============================|| REPORTES ROUTES ||============================== //

const reportesRoutes = {
  path: 'reportes',
  errorElement: <RouteErrorBoundary />,
  children: [
    {
      path: 'rol-personal',
      element: (
        <RequirePermission fallbackTo="/" permission="puedeVerReportes">
          <ReporteRolPersonalPage />
        </RequirePermission>
      )
    }
  ]
};

export default reportesRoutes;
