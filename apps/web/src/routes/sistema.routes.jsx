// project imports
import { lazyWithReload } from 'components/lazyWithReload';
import Loadable from 'components/Loadable';
import RouteErrorBoundary from 'components/system/RouteErrorBoundary';

const HealthSistemaPage = Loadable(lazyWithReload(() => import('pages/system/health-sistema')));

// ==============================|| SISTEMA ROUTES ||============================== //

const sistemaRoutes = {
  path: 'sistema',
  errorElement: <RouteErrorBoundary />,
  children: [
    {
      path: 'health',
      element: <HealthSistemaPage />
    }
  ]
};

export default sistemaRoutes;
