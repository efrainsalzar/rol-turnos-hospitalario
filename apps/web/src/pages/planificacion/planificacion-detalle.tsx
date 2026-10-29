import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import MainCard from 'components/MainCard';
import { useAppToast } from 'components/system/AppToastProvider';
import PlanificacionPageHeader from 'components/system/PlanificacionPageHeader';
import PlanificacionStateActions from 'components/system/PlanificacionStateActions';
import PlanificacionStatusChip from 'components/system/PlanificacionStatusChip';
import PlanificacionSummaryCard from 'components/system/PlanificacionSummaryCard';
import { useAccessControl } from 'hooks/use-access-control';
import { useApiRequest } from 'hooks/useApiRequest';
import { planificacionApi } from 'services/planificacionApi';
import type { EstadoPlanificacion } from 'types/api';
import { mensajeCambioEstadoPlanificacion } from 'utils/planificacion-mensajes';
import {
  canApprovePlanificacion,
  canClosePlanificacion,
  canEditPlanificacion,
  canReturnPlanificacionToDraft,
  canSendRevisionPlanificacion
} from 'utils/planificacion-capabilities';

export default function PlanificacionDetallePage() {
  const navigate = useNavigate();
  const params = useParams();
  const idPlanificacion = Number(params.id);
  const { capabilities, session: activeSession } = useAccessControl();
  const [submitting, setSubmitting] = useState(false);
  const { showSuccess, showError } = useAppToast();

  const detalle = useApiRequest(() => planificacionApi.getPlanificacion(idPlanificacion), [idPlanificacion]);

  const puedeEnviarRevision = canSendRevisionPlanificacion(capabilities, detalle.data?.estado);
  const puedeAprobar = canApprovePlanificacion(capabilities, detalle.data?.estado);
  const puedeVolverBorrador = canReturnPlanificacionToDraft(capabilities, detalle.data?.estado);
  const puedeCerrar = canClosePlanificacion(capabilities, detalle.data?.estado);
  const puedeOperarEstado = Boolean(
    canEditPlanificacion(capabilities, detalle.data?.estado) || puedeAprobar || puedeCerrar || puedeEnviarRevision || puedeVolverBorrador
  );

  const handleCambiarEstado = async (estado: EstadoPlanificacion) => {
    setSubmitting(true);

    try {
      const response = await planificacionApi.changePlanificacionEstado(idPlanificacion, { estado });
      showSuccess(mensajeCambioEstadoPlanificacion(response, response.estado));
      detalle.refetch();
    } catch (error) {
      showError(error instanceof Error ? error.message : 'No se pudo cambiar el estado.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Grid container columnSpacing={2.75} rowSpacing={3}>
      <Grid size={12}>
        <PlanificacionPageHeader
          actions={[
            { label: 'Volver a planificaciones', onClick: () => navigate('/planificacion/planificaciones') },
            { label: 'Ir a la matriz', onClick: () => navigate(`/planificacion/matriz/${idPlanificacion}`), variant: 'contained' },
            { label: 'Recargar', onClick: () => detalle.refetch() }
          ]}
          description="Esta vista queda reducida al flujo basico de Enfermeria: revisar el periodo, mover el estado y entrar a la matriz mensual para cargar el rol de turnos."
          title="Planificacion / Resumen operativo"
        />
      </Grid>

      <Grid size={{ xs: 12, lg: 7 }}>
        <PlanificacionSummaryCard
          items={[
            { label: 'ID', value: detalle.data?.id || '-' },
            { label: 'Departamento', value: detalle.data?.nombreDepartamento || '-' },
            { label: 'Servicio', value: detalle.data?.nombreServicio || '-' },
            { label: 'Periodo', value: detalle.data ? `${getMonthName(detalle.data.mes)} ${detalle.data.anio}` : '-' },
            { label: 'Version', value: detalle.data?.version || '-' },
            { label: 'Personal planificable', value: detalle.data?.cantidadPersonalPlanificable ?? '-' }
          ]}
          subheader="Solo datos utiles para operar el rol de turnos del servicio."
          title="Resumen de planificacion"
        >
          {detalle.loading ? (
            <Stack alignItems="center" direction="row" spacing={1.5}>
              <CircularProgress size={20} />
              <Stack>
                <Typography variant="body2">Cargando planificacion...</Typography>
                {detalle.slow ? (
                  <Typography color="text.secondary" variant="caption">
                    Esto esta tardando mas de lo normal...
                  </Typography>
                ) : null}
              </Stack>
            </Stack>
          ) : null}
          {!detalle.loading && detalle.error ? (
            <Alert
              action={
                <Button color="inherit" onClick={() => detalle.refetch()} size="small">
                  Reintentar
                </Button>
              }
              severity="error"
            >
              {detalle.error}
            </Alert>
          ) : null}
          {detalle.data ? <PlanificacionStatusChip estado={detalle.data.estado} /> : null}
          <Divider />
          {activeSession ? (
            <Alert severity="info">
              Sesion activa: {activeSession.username} ({activeSession.rolSeguridad.codigo || 'SIN_ROL'})
            </Alert>
          ) : (
            <Alert severity="warning">No hay sesion activa. Debes ingresar por /login.</Alert>
          )}
        </PlanificacionSummaryCard>
      </Grid>

      <Grid size={{ xs: 12, lg: 5 }}>
        <MainCard title="Flujo operativo" subheader="Acciones basicas del estado del rol de turnos mensual.">
          <Stack spacing={1.25}>
            <Typography color="text.secondary" variant="body2">
              Para cargar o corregir el rol de turnos del servicio, entra a la matriz. Desde aqui solo gestionas el estado del mes.
            </Typography>
            <PlanificacionStateActions
              disabled={!puedeOperarEstado || submitting}
              estado={detalle.data?.estado}
              onChangeEstado={(estado) => void handleCambiarEstado(estado)}
              puedeAprobar={puedeAprobar}
              puedeCerrar={puedeCerrar}
              puedeEnviarRevision={puedeEnviarRevision}
              puedeVolverBorrador={puedeVolverBorrador}
            />
            <Alert severity="info">La carga diaria del personal, observaciones y exportacion se hacen desde la matriz mensual.</Alert>
          </Stack>
        </MainCard>
      </Grid>
    </Grid>
  );
}

function getMonthName(month: number) {
  return new Intl.DateTimeFormat('es-BO', {
    month: 'long',
    timeZone: 'UTC'
  }).format(new Date(Date.UTC(2026, month - 1, 1)));
}
