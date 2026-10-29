// project imports
import { lazyWithReload } from 'components/lazyWithReload';
import Loadable from 'components/Loadable';
import RequirePermission from 'components/system/RequirePermission';
import RouteErrorBoundary from 'components/system/RouteErrorBoundary';

const RolesPage = Loadable(lazyWithReload(() => import('pages/seguridad/roles')));
const UsuariosPage = Loadable(lazyWithReload(() => import('pages/seguridad/usuarios')));

// ==============================|| SEGURIDAD ROUTES ||============================== //

const seguridadRoutes = {
  path: 'seguridad',
  errorElement: <RouteErrorBoundary />,
  children: [
    {
      path: 'roles',
      element: (
        <RequirePermission fallbackTo="/" permission="puedeVerSeguridad">
          <RolesPage />
        </RequirePermission>
      )
    },
    {
      path: 'usuarios',
      element: (
        <RequirePermission fallbackTo="/" permission="puedeVerSeguridad">
          <UsuariosPage />
        </RequirePermission>
      )
    }
  ]
};

export default seguridadRoutes;
