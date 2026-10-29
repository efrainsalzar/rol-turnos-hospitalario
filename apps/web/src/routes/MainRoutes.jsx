// project imports
import RequireAuth from 'components/system/RequireAuth';
import DashboardLayout from 'layout/Dashboard';
import dashboardRoutes, { DashboardDefault } from './dashboard.routes';
import sistemaRoutes from './sistema.routes';
import organizacionRoutes from './organizacion.routes';
import personalRoutes from './personal.routes';
import seguridadRoutes from './seguridad.routes';
import operacionRoutes from './operacion.routes';
import planificacionRoutes from './planificacion.routes';
import reportesRoutes from './reportes.routes';

// ==============================|| MAIN ROUTING ||============================== //
//
// Cada dominio funcional (organizacion, personal, seguridad, operacion, planificacion, reportes)
// define sus propias rutas en su propio archivo *.routes.jsx, incluido su errorElement de seccion
// (ver decisiones-tecnicas.md seccion 97): un error de render en una seccion queda contenido a esa
// seccion en vez de reemplazar todo el DashboardLayout.

const MainRoutes = {
  path: '/',
  element: (
    <RequireAuth>
      <DashboardLayout />
    </RequireAuth>
  ),
  children: [
    {
      path: '/',
      element: <DashboardDefault />
    },
    dashboardRoutes,
    sistemaRoutes,
    organizacionRoutes,
    personalRoutes,
    seguridadRoutes,
    operacionRoutes,
    planificacionRoutes,
    reportesRoutes
  ]
};

export default MainRoutes;
