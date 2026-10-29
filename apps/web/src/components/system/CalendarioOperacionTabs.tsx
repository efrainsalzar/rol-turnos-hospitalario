import { useMemo } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';

import { useAccessControl } from 'hooks/use-access-control';
import type { UsuarioCapacidadesOperativas } from 'types/api';

const BASE_PATH = '/operacion/calendarios';

interface CalendarioTab {
  key: string;
  segment: string;
  label: string;
  capability: keyof UsuarioCapacidadesOperativas;
}

const TABS: CalendarioTab[] = [
  { key: 'calendario', segment: '', label: 'Calendario', capability: 'verCalendarios' },
  { key: 'feriados', segment: 'feriados', label: 'Catalogo de feriados', capability: 'verCalendarios' },
  { key: 'incidencias', segment: 'incidencias', label: 'Incidencias personales', capability: 'verIncidenciasPersonales' }
];

export default function CalendarioOperacionTabs() {
  const { capabilities } = useAccessControl();
  const location = useLocation();
  const navigate = useNavigate();

  const visibleTabs = useMemo(() => TABS.filter((tab) => capabilities[tab.capability]), [capabilities]);

  const currentSegment = location.pathname === BASE_PATH ? '' : location.pathname.replace(`${BASE_PATH}/`, '');
  const activeTab = visibleTabs.find((tab) => tab.segment === currentSegment) ?? visibleTabs[0];

  if (!activeTab) {
    return <Outlet />;
  }

  return (
    <Box>
      {visibleTabs.length > 1 ? (
        <Tabs
          onChange={(_, key: string) => {
            const target = visibleTabs.find((tab) => tab.key === key);
            navigate(target?.segment ? `${BASE_PATH}/${target.segment}` : BASE_PATH);
          }}
          sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
          value={activeTab.key}
        >
          {visibleTabs.map((tab) => (
            <Tab key={tab.key} label={tab.label} value={tab.key} />
          ))}
        </Tabs>
      ) : null}
      <Outlet />
    </Box>
  );
}
