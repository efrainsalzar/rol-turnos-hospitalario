import type { ReactNode } from 'react';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

type FilterAction = {
  label: string;
  onClick: () => void;
  variant?: 'text' | 'outlined' | 'contained';
  disabled?: boolean;
};

interface CollectionFiltersBarProps {
  filters?: ReactNode;
  actions?: FilterAction[];
  summary?: ReactNode;
}

// Legacy wrapper. Mantener solo para pantallas aun no migradas.
// Las pantallas nuevas deben usar OperationalPageTemplate + OperationalFiltersBar.
export default function CollectionFiltersBar({ filters, actions = [], summary }: CollectionFiltersBarProps) {
  return (
    <Box
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
        backgroundColor: 'background.paper',
        px: { xs: 1.25, md: 1.5 },
        py: 1.25
      }}
    >
      <Stack direction={{ xs: 'column', xl: 'row' }} spacing={1.25} useFlexGap sx={{ alignItems: { xl: 'center' } }}>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={1.25}
          useFlexGap
          flexWrap="wrap"
          sx={{
            flex: 1,
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
            },
            '& .MuiInputBase-root': {
              backgroundColor: 'background.paper'
            }
          }}
        >
          {filters}
        </Stack>

        {actions.length ? (
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1}
            useFlexGap
            flexWrap="wrap"
            sx={{ alignItems: { sm: 'center' }, justifyContent: { xl: 'flex-end' } }}
          >
            {actions.map((action) => (
              <Button disabled={action.disabled} key={action.label} onClick={action.onClick} variant={action.variant || 'outlined'}>
                {action.label}
              </Button>
            ))}
          </Stack>
        ) : null}

        {summary ? (
          <Typography
            color="text.secondary"
            sx={{
              alignSelf: { xs: 'flex-start', xl: 'center' },
              ml: { xl: 'auto' },
              whiteSpace: { xl: 'nowrap' }
            }}
            variant="caption"
          >
            {summary}
          </Typography>
        ) : null}
      </Stack>
    </Box>
  );
}
