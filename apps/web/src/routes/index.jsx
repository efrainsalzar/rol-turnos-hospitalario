import { createBrowserRouter } from 'react-router-dom';

// project imports
import RouteErrorBoundary from 'components/system/RouteErrorBoundary';
import MainRoutes from './MainRoutes';
import LoginRoutes from './LoginRoutes';

// ==============================|| ROUTING RENDER ||============================== //

const router = createBrowserRouter(
  [
    { ...MainRoutes, errorElement: <RouteErrorBoundary /> },
    { ...LoginRoutes, errorElement: <RouteErrorBoundary /> }
  ],
  { basename: import.meta.env.VITE_APP_BASE_NAME }
);

export default router;
