import type { ReactNode } from 'react';

import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import ActionButtonGroup, { type ActionButtonGroupItem } from 'components/system/ActionButtonGroup';

interface OperationalFiltersBarProps {
  filters?: ReactNode;
  actions?: ActionButtonGroupItem[];
  summary?: ReactNode;
}

export default function OperationalFiltersBar({ filters, actions = [], summary }: OperationalFiltersBarProps) {
  return (
    <Stack direction={{ xs: 'column', xl: 'row' }} spacing={1.25} sx={{ alignItems: { xl: 'center' } }}>
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        flex={1}
        flexWrap="wrap"
        spacing={1.25}
        useFlexGap
        sx={{
          alignItems: { md: 'center' },
          '& > *': {
            flexShrink: 0,
            maxWidth: '100%'
          },
          '& .MuiFormControl-root': {
            width: { xs: '100%', md: 'auto !important' },
            maxWidth: '100%',
            flex: '0 1 auto'
          },
          '& .MuiTextField-root': {
            width: { xs: '100%', md: 'auto !important' },
            maxWidth: '100%',
            flex: '0 1 auto'
          }
        }}
      >
        {filters}
      </Stack>

      {actions.length ? <ActionButtonGroup actions={actions} /> : null}

      {summary ? (
        <Typography color="text.secondary" sx={{ ml: { xl: 'auto' }, whiteSpace: { xl: 'nowrap' } }} variant="caption">
          {summary}
        </Typography>
      ) : null}
    </Stack>
  );
}
