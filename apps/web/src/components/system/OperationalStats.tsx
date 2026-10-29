import type { ReactNode } from 'react';

import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';

export interface OperationalStatItem {
  label: string;
  value: ReactNode;
}

interface OperationalStatsProps {
  items: OperationalStatItem[];
}

export default function OperationalStats({ items }: OperationalStatsProps) {
  if (!items.length) {
    return null;
  }

  return (
    <Stack direction="row" flexWrap="wrap" spacing={1} useFlexGap>
      {items.map((item) => (
        <Chip key={item.label} label={`${item.label}: ${item.value}`} size="small" variant="outlined" />
      ))}
    </Stack>
  );
}
