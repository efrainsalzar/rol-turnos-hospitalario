import { useMemo } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';

import { useAccessControl } from 'hooks/use-access-control';
import type { AccessProfile } from 'hooks/use-access-control';
import { canAccessProfile } from 'hooks/use-access-control';

const BASE_PATH = '/personal/catalogos';

interface CatalogoTab {
  key: string;
  segment: string;
  label: string;
  access: AccessProfile;
}

const TABS: CatalogoTab[] = [
  { key: 'cargos', segment: '', label: 'Cargos', access: { permission: 'puedeGestionarPersonal' } },
  {
    key: 'cargas-horarias',
    segment: 'cargas-horarias',
    label: 'Cargas horarias',
    access: { permission: 'puedeVerOperacion', capability: 'verCargasHorarias' }
  },
  {
    key: 'tipos-contrato',
    segment: 'tipos-contrato',
    label: 'Tipos de contrato',
    access: { permission: 'puedeVerPersonal' }
  }
];

export default function CatalogosPersonalTabs() {
  const { session } = useAccessControl();
  const location = useLocation();
  const navigate = useNavigate();

  const visibleTabs = useMemo(() => TABS.filter((tab) => canAccessProfile(session, tab.access)), [session]);

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
