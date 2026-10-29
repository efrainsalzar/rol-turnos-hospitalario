import { RouterProvider } from 'react-router-dom';

// project imports
import router from 'routes';
import ThemeCustomization from 'themes';

import { AppToastProvider } from 'components/system/AppToastProvider';
import ScrollTop from 'components/ScrollTop';

// ==============================|| APP - THEME, ROUTER, LOCAL ||============================== //

export default function App() {
  return (
    <ThemeCustomization>
      <AppToastProvider>
        <ScrollTop>
          <RouterProvider router={router} />
        </ScrollTop>
      </AppToastProvider>
    </ThemeCustomization>
  );
}
