import { useMemo } from 'react';
import { Link as RouterLink, useRouteError } from 'react-router-dom';

import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

function resolveErrorMessage(error) {
  if (!error) {
    return 'Se produjo un error inesperado en la aplicación.';
  }

  if (typeof error === 'string') {
    return error;
  }

  if (typeof error === 'object' && error !== null) {
    if ('statusText' in error && typeof error.statusText === 'string' && error.statusText.trim()) {
      return error.statusText;
    }

    if ('message' in error && typeof error.message === 'string' && error.message.trim()) {
      return error.message;
    }
  }

  return 'Se produjo un error inesperado en la aplicación.';
}

export default function RouteErrorBoundary() {
  const error = useRouteError();
  const message = useMemo(() => resolveErrorMessage(error), [error]);

  return (
    <Box
      sx={{
        minHeight: '100vh',
        px: 3,
        py: 6,
        display: 'grid',
        placeItems: 'center',
        bgcolor: 'grey.50'
      }}
    >
      <Paper elevation={3} sx={{ width: '100%', maxWidth: 720, p: { xs: 3, sm: 4 } }}>
        <Stack spacing={2.5}>
          <Stack spacing={0.75}>
            <Typography variant="h3">Roles y Turnos</Typography>
            <Typography variant="h5">No se pudo abrir esta pantalla.</Typography>
            <Typography color="text.secondary" variant="body2">
              Ocurrió un error inesperado. Puedes volver al inicio o regresar al ingreso para reactivar la sesión.
            </Typography>
          </Stack>

          <Alert severity="error" sx={{ userSelect: 'text' }}>
            {message}
          </Alert>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
            <Button component={RouterLink} to="/planificacion/planificaciones" variant="contained">
              Ir a planificaciones
            </Button>
            <Button component={RouterLink} to="/login" variant="outlined">
              Ir al ingreso
            </Button>
            <Button color="inherit" onClick={() => window.location.reload()} variant="text">
              Recargar
            </Button>
          </Stack>
        </Stack>
      </Paper>
    </Box>
  );
}
