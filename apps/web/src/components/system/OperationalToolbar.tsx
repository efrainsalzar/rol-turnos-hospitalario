import type { ReactNode } from 'react';

import Stack from '@mui/material/Stack';

import MainCard from 'components/MainCard';

interface OperationalToolbarProps {
  filters?: ReactNode;
  actions?: ReactNode;
  summary?: ReactNode;
}

export default function OperationalToolbar({ filters, actions, summary }: OperationalToolbarProps) {
  return (
    <MainCard contentSX={{ p: 2 }} title={null}>
      <Stack direction={{ xs: 'column', xl: 'row' }} spacing={1.25} sx={{ alignItems: { xl: 'center' } }}>
        <Stack flex={1} spacing={1.25}>
          {filters}
        </Stack>
        {actions}
        {summary}
      </Stack>
    </MainCard>
  );
}
