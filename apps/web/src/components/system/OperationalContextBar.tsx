import type { ReactNode } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';

interface OperationalContextBarProps {
  children: ReactNode;
}

export default function OperationalContextBar({ children }: OperationalContextBarProps) {
  return (
    <Box
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1.5,
        bgcolor: 'grey.50',
        px: 1.5,
        py: 1.25
      }}
    >
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.25} useFlexGap flexWrap="wrap" sx={{ alignItems: { md: 'center' } }}>
        {children}
      </Stack>
    </Box>
  );
}
