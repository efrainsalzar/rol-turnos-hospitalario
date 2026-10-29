import type { ReactNode } from 'react';

import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TablePagination from '@mui/material/TablePagination';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';

import MainCard from 'components/MainCard';

export interface TableColumn<T> {
  key: string;
  title: string;
  align?: 'left' | 'center' | 'right';
  render: (row: T) => ReactNode;
}

interface CollectionTableCardProps<T> {
  title: string;
  subtitle: ReactNode;
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

export default function CollectionTableCard<T>({
  title,
  subtitle,
  rows,
  columns,
  loading,
  error,
  slow,
  onRetry,
  emptyMessage,
  total,
  getRowKey,
  pagination
}: CollectionTableCardProps<T>) {
  const totalRows = typeof total === 'number' ? total : rows.length;
  const shouldPaginateClientSide = Boolean(pagination && rows.length > pagination.rowsPerPage && totalRows === rows.length);
  const displayedRows =
    pagination && shouldPaginateClientSide
      ? rows.slice(pagination.page * pagination.rowsPerPage, (pagination.page + 1) * pagination.rowsPerPage)
      : rows;
  const paginationNode =
    !loading && !error && displayedRows.length && pagination ? (
      <TablePagination
        component="div"
        count={totalRows}
        labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count !== -1 ? count : `mas de ${to}`}`}
        labelRowsPerPage="Filas por pagina"
        onPageChange={(_event, page) => pagination.onPageChange(page)}
        onRowsPerPageChange={(event) => pagination.onRowsPerPageChange(Number(event.target.value))}
        page={pagination.page}
        rowsPerPage={pagination.rowsPerPage}
        rowsPerPageOptions={pagination.rowsPerPageOptions || [10, 20, 50]}
      />
    ) : null;

  return (
    <MainCard>
      {loading ? (
        <Stack spacing={1.5} sx={{ alignItems: 'center', py: 4 }}>
          <CircularProgress size={28} />
          <Typography variant="body2">Cargando informacion desde la API.</Typography>
          {slow ? (
            <Typography color="text.secondary" variant="caption">
              Esto esta tardando mas de lo normal...
            </Typography>
          ) : null}
        </Stack>
      ) : null}

      {!loading && error ? (
        <Alert
          action={
            onRetry ? (
              <Button color="inherit" onClick={onRetry} size="small">
                Reintentar
              </Button>
            ) : undefined
          }
          severity="error"
        >
          {error}
        </Alert>
      ) : null}

      {!loading && !error && !displayedRows.length ? <Alert severity="info">{emptyMessage}</Alert> : null}

      {paginationNode ? <Box sx={{ borderBottom: '1px solid', borderColor: 'divider', mb: 1 }}>{paginationNode}</Box> : null}

      {!loading && !error && displayedRows.length ? (
        <TableContainer sx={{ borderRadius: 1, border: '1px solid', borderColor: 'divider', overflow: 'visible' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                {columns.map((column) => (
                  <TableCell
                    align={column.align || 'left'}
                    key={column.key}
                    sx={{
                      fontSize: 12,
                      fontWeight: 700,
                      whiteSpace: 'nowrap',
                      backgroundColor: '#eef4f8'
                    }}
                  >
                    {column.title}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {displayedRows.map((row, index) => (
                <TableRow hover key={getRowKey ? getRowKey(row, index) : index}>
                  {columns.map((column) => (
                    <TableCell align={column.align || 'left'} key={column.key} sx={{ verticalAlign: 'top', fontSize: 13 }}>
                      {column.render(row)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      ) : null}

      {paginationNode}
    </MainCard>
  );
}
