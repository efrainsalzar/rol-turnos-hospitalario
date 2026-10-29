import { useLocation, useParams } from 'react-router-dom';

import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import MainCard from 'components/MainCard';
import OperationalPageLayout from 'components/system/OperationalPageLayout';
import OperationalTableCard from 'components/system/OperationalTableCard';
import PageBackButton from 'components/system/PageBackButton';
import StatusChip from 'components/system/StatusChip';
import { useApiRequest } from 'hooks/useApiRequest';
import { organizacionApi } from 'services/organizacionApi';

export default function ServicioDetallePage() {
  const location = useLocation();
  const params = useParams();
  const idServicio = Number(params.id);
  const backState = (location.state as { backTo?: string; backLabel?: string } | null) || null;
  const backTo = backState?.backTo || '/organizacion/servicios';
  const backLabel = backState?.backLabel || 'Volver a servicios';

  const detalle = useApiRequest(() => organizacionApi.getServicioDetalle(idServicio), [idServicio]);
  const personal = useApiRequest(() => organizacionApi.getServicioPersonal(idServicio), [idServicio]);

  if (detalle.loading) {
    return <Typography variant="body2">Cargando detalle del servicio...</Typography>;
  }

  if (detalle.error || !detalle.data) {
    return (
      <Typography color="error" variant="body2">
        {detalle.error || 'No se pudo cargar el servicio.'}
      </Typography>
    );
  }

  const servicio = detalle.data;

  return (
    <OperationalPageLayout
      breadcrumb="Organizacion / Servicios"
      description="Vista operativa del servicio, con jefatura activa, horarios reales y personal actualmente asignado."
      title={servicio.nombre}
      toolbar={<PageBackButton label={backLabel} to={backTo} />}
    >
      <Grid size={{ xs: 12, md: 6 }}>
        <MainCard title={`Datos de ${servicio.nombre}`}>
          <Stack spacing={1.25}>
            <Typography variant="body2">
              Codigo: <strong>{servicio.codigo}</strong>
            </Typography>
            <Typography variant="body2">
              Departamento: <strong>{servicio.departamento.nombre || '-'}</strong>
            </Typography>
            <Typography variant="body2">
              Personal activo: <strong>{servicio.cantidadPersonalActivo}</strong>
            </Typography>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <Typography variant="body2">Estado:</Typography>
              <StatusChip active={servicio.activo} />
            </Stack>
          </Stack>
        </MainCard>
      </Grid>

      <Grid size={{ xs: 12, md: 6 }}>
        <MainCard title={`Jefatura de ${servicio.nombre}`}>
          {servicio.jefaServicio ? (
            <Stack spacing={1.25}>
              <Typography variant="body2">{servicio.jefaServicio.nombreCompleto}</Typography>
              <Stack direction="row" spacing={1}>
                <Chip label={servicio.jefaServicio.codigoPersonal || 'Sin codigo'} size="small" variant="outlined" />
                <Chip color="secondary" label={servicio.jefaServicio.nombreRolFuncional || 'Jefatura'} size="small" />
              </Stack>
            </Stack>
          ) : (
            <Typography variant="body2">No se encontro jefa de servicio activa.</Typography>
          )}
        </MainCard>
      </Grid>

      <Grid size={12}>
        <OperationalTableCard
          columns={[
            { key: 'codigo', title: 'Codigo', render: (turno) => turno.codigo },
            { key: 'nombre', title: 'Horario', render: (turno) => turno.nombre },
            {
              key: 'rango',
              title: 'Rango real',
              render: (turno) => `${turno.horaInicio} - ${turno.horaFin}`
            },
            { key: 'horas', title: 'Horas', render: (turno) => turno.duracionHoras },
            {
              key: 'estado',
              title: 'Estado',
              render: (turno) => <StatusChip active={turno.activo} />
            }
          ]}
          emptyMessage="No hay horarios registrados para este servicio."
          error={null}
          loading={false}
          rows={servicio.turnos}
          subtitle={`Horarios reales vigentes de ${servicio.nombre}.`}
          title={`Horarios de ${servicio.nombre}`}
          total={servicio.turnos.length}
        />
      </Grid>

      <Grid size={12}>
        <OperationalTableCard
          columns={[
            {
              key: 'numero',
              title: 'No.',
              render: (fila) => (personal.data?.data || []).findIndex((item) => item.id === fila.id) + 1
            },
            { key: 'codigo', title: 'Codigo', render: (fila) => fila.codigoPersonal || '-' },
            { key: 'nombre', title: 'Nombre', render: (fila) => fila.nombreCompleto },
            { key: 'cargo', title: 'Cargo', render: (fila) => fila.nombreNivelCargo || '-' },
            {
              key: 'rolSeguridad',
              title: 'Rol funcional',
              render: (fila) => <Chip label={fila.nombreRolFuncional || '-'} size="small" variant="outlined" />
            },
            {
              key: 'carga',
              title: 'C/H',
              render: (fila) => <Chip color="primary" label={fila.codigoCargaHoraria || '-'} size="small" variant="outlined" />
            },
            { key: 'item', title: 'ITEM', render: (fila) => fila.codigoTipoContrato || fila.codigoFuenteItem || '-' }
          ]}
          emptyMessage="No hay personal asignado a este servicio."
          error={personal.error}
          loading={personal.loading}
          onRetry={personal.refetch}
          rows={personal.data?.data || []}
          slow={personal.slow}
          subtitle="Consulta real a GET /v1/servicios/:id/personal."
          title="Personal asignado"
          total={personal.data?.meta.total}
        />
      </Grid>
    </OperationalPageLayout>
  );
}
