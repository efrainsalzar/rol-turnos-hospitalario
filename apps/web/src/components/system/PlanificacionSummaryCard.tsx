import type { ReactNode } from 'react';

import MainCard from 'components/MainCard';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

interface PlanificacionSummaryCardProps {
  title: string;
  subheader?: string;
  items: Array<{ label: string; value: ReactNode }>;
  children?: ReactNode;
}

export default function PlanificacionSummaryCard({ title, subheader, items, children }: PlanificacionSummaryCardProps) {
  return (
    <MainCard subheader={subheader} title={title}>
      <Stack spacing={1.25}>
        {items.map((item) => (
          <Typography key={item.label} variant="body2">
            {item.label}: {item.value}
          </Typography>
        ))}
        {children}
      </Stack>
    </MainCard>
  );
}
