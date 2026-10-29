// project imports
import { lazyWithReload } from 'components/lazyWithReload';
import Loadable from 'components/Loadable';
import RouteErrorBoundary from 'components/system/RouteErrorBoundary';

const DashboardDefault = Loadable(lazyWithReload(() => import('pages/dashboard/default')));

// ==============================|| DASHBOARD ROUTES ||============================== //

const dashboardRoutes = {
  path: 'dashboard',
  errorElement: <RouteErrorBoundary />,
  children: [
    {
      path: 'default',
      element: <DashboardDefault />
    }
  ]
};

export { DashboardDefault };
export default dashboardRoutes;
