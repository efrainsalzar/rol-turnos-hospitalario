import type { ReactNode } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import CollectionTableCard from 'components/system/CollectionTableCard';
import type { TableColumn } from 'components/system/CollectionTableCard';

interface OperationalTableCardProps<T> {
  title: string;
  summary?: ReactNode;
  subtitle?: ReactNode;
  rows: T[];
  columns: TableColumn<T>[];
  loading: boolean;
  error: string | null;
  slow?: boolean;
  onRetry?: () => void;
  emptyMessage: ReactNode;
  total?: number;
  getRowKey?: (row: T, index: number) => string | number;
  pagination?: {
    page: number;
    rowsPerPage: number;
    onPageChange: (page: number) => void;
    onRowsPerPageChange: (rowsPerPage: number) => void;
    rowsPerPageOptions?: number[];
  };
}

export default function OperationalTableCard<T>({ title, summary, subtitle, ...props }: OperationalTableCardProps<T>) {
  return (
    <CollectionTableCard
      {...props}
      subtitle={
        <Stack spacing={1}>
          {subtitle}
          {summary ? (
            <Box>
              <Typography color="text.secondary" variant="caption">
                {summary}
              </Typography>
            </Box>
          ) : null}
        </Stack>
      }
      title={title}
    />
  );
}
