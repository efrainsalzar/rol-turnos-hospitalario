import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';

import MainCard from 'components/MainCard';
import { useApiRequest } from 'hooks/useApiRequest';
import { healthApi } from 'services/healthApi';

export default function HealthSistemaPage() {
  const ready = useApiRequest(healthApi.getReady);
  const database = useApiRequest(healthApi.getDatabase);

  return (
    <Grid container rowSpacing={3} columnSpacing={2.75}>
      <Grid size={12}>
        <Stack spacing={0.75}>
          <Typography variant="h5">Sistema / Health</Typography>
          <Typography color="text.secondary" variant="body2">
            Validacion real del backend NestJS y su conexion actual a SQL Server.
          </Typography>
        </Stack>
      </Grid>

      <Grid size={{ xs: 12, lg: 6 }}>
        <MainCard title="Readiness del backend" subheader="Consume GET /health/ready para validar baseline operativo.">
          <Stack spacing={1.5}>
            <Chip
              color={ready.data?.status === 'ok' ? 'success' : ready.error ? 'error' : 'warning'}
              label={ready.data?.status || (ready.loading ? 'Cargando' : 'Sin estado')}
              size="small"
              variant="filled"
            />
            <Typography variant="body2">Servidor: {ready.data?.server || '-'}</Typography>
            <Typography variant="body2">Base: {ready.data?.database || '-'}</Typography>
            <Typography variant="body2">Migraciones: {ready.data?.details.appliedMigrations ?? '-'}</Typography>
            <Typography variant="body2">Tablas baseline: {ready.data?.details.baselineTableCount ?? '-'}</Typography>
            <Typography variant="body2">
              Tabla schema_migration: {ready.data?.details.hasSchemaMigrationTable ? 'Disponible' : '-'}
            </Typography>
            {ready.loading && ready.slow ? (
              <Typography color="text.secondary" variant="caption">
                Esto esta tardando mas de lo normal...
              </Typography>
            ) : null}
            {!ready.loading && ready.error ? (
              <Alert
                action={
                  <Button color="inherit" onClick={() => ready.refetch()} size="small">
                    Reintentar
                  </Button>
                }
                severity="error"
              >
                {ready.error}
              </Alert>
            ) : null}
          </Stack>
        </MainCard>
      </Grid>

      <Grid size={{ xs: 12, lg: 6 }}>
        <MainCard title="Conexion de base de datos" subheader="Consume GET /health/database para exponer detalle tecnico de la sesion SQL.">
          <Stack spacing={1.5}>
            <Chip
              color={database.data?.status === 'ok' ? 'success' : database.error ? 'error' : 'warning'}
              label={database.data?.status || (database.loading ? 'Cargando' : 'Sin estado')}
              size="small"
              variant="filled"
            />
            <Typography variant="body2">Servidor: {database.data?.server || '-'}</Typography>
            <Typography variant="body2">Base: {database.data?.database || '-'}</Typography>
            <Typography variant="body2">Usuario SQL: {database.data?.details.systemUser || '-'}</Typography>
            <Typography variant="body2">Usuario actual: {database.data?.details.currentUser || '-'}</Typography>
            <Typography sx={{ whiteSpace: 'pre-wrap' }} variant="body2">
              {database.data?.details.sqlServerVersion || '-'}
            </Typography>
            {database.loading && database.slow ? (
              <Typography color="text.secondary" variant="caption">
                Esto esta tardando mas de lo normal...
              </Typography>
            ) : null}
            {!database.loading && database.error ? (
              <Alert
                action={
                  <Button color="inherit" onClick={() => database.refetch()} size="small">
                    Reintentar
                  </Button>
                }
                severity="error"
              >
                {database.error}
              </Alert>
            ) : null}
          </Stack>
        </MainCard>
      </Grid>
    </Grid>
  );
}
