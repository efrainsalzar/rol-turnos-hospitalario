import type { ReactNode } from 'react';

import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

type HeaderAction = {
  label: string;
  onClick: () => void;
  variant?: 'text' | 'outlined' | 'contained';
};

interface PlanificacionPageHeaderProps {
  title: string;
  description: string;
  actions?: HeaderAction[];
  children?: ReactNode;
}

export default function PlanificacionPageHeader({ title, description, actions = [], children }: PlanificacionPageHeaderProps) {
  return (
    <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} sx={{ justifyContent: 'space-between' }}>
      <Stack spacing={0.75}>
        <Typography variant="h5">{title}</Typography>
        <Typography color="text.secondary" variant="body2">
          {description}
        </Typography>
        {children}
      </Stack>
      {actions.length ? (
        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
          {actions.map((action) => (
            <Button key={action.label} onClick={action.onClick} variant={action.variant || 'outlined'}>
              {action.label}
            </Button>
          ))}
        </Stack>
      ) : null}
    </Stack>
  );
}
