// project imports
import Loadable from 'components/Loadable';
import { lazyWithReload } from 'components/lazyWithReload';

// jwt auth
const LoginPage = Loadable(lazyWithReload(() => import('pages/auth/Login')));

// ==============================|| AUTH ROUTING ||============================== //

const LoginRoutes = {
  path: '/',
  children: [
    {
      path: '/',
      children: [
        {
          path: '/login',
          element: <LoginPage />
        }
      ]
    }
  ]
};

export default LoginRoutes;
