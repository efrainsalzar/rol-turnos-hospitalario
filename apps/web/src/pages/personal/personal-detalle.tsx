import { useLocation, useNavigate, useParams } from 'react-router-dom';

import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';

import MainCard from 'components/MainCard';
import { useAppToast } from 'components/system/AppToastProvider';
import PageBackButton from 'components/system/PageBackButton';
import StatusChip from 'components/system/StatusChip';
import { useAccessControl } from 'hooks/use-access-control';
import { useApiRequest } from 'hooks/useApiRequest';
import { personalApi } from 'services/personalApi';

export default function PersonalDetallePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();
  const { permissions } = useAccessControl();
  const { showError } = useAppToast();
  const idPersonal = Number(params.id);
  const response = useApiRequest(() => personalApi.getPersonalDetalle(idPersonal), [idPersonal]);
  const backState = (location.state as { backTo?: string; backLabel?: string } | null) || null;
  const backTo = backState?.backTo || '/personal';
  const backLabel = backState?.backLabel || 'Volver a personal';

  if (response.loading) {
    return (
      <Stack alignItems="center" direction="row" spacing={1.5}>
        <CircularProgress size={20} />
        <Stack>
          <Typography variant="body2">Cargando detalle de personal...</Typography>
          {response.slow ? (
            <Typography color="text.secondary" variant="caption">
              Esto esta tardando mas de lo normal...
            </Typography>
          ) : null}
        </Stack>
      </Stack>
    );
  }

  if (response.error || !response.data) {
    return (
      <Alert
        action={
          <Button color="inherit" onClick={() => response.refetch()} size="small">
            Reintentar
          </Button>
        }
        severity="error"
      >
        {response.error || 'No se pudo cargar el personal.'}
      </Alert>
    );
  }

  const personal = response.data;
  const puedeGestionarPersonal = permissions.puedeGestionarPersonal;
  const puedeGestionarUsuarios = permissions.puedeGestionarUsuarios;

  return (
    <Grid container columnSpacing={2.75} rowSpacing={3}>
      <Grid size={12}>
        <Stack direction="row" spacing={1} sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <Stack spacing={0.5}>
            <Typography variant="h5">Personal / Detalle / {personal.nombreCompleto}</Typography>
            <Typography color="text.secondary" variant="body2">
              Detalle institucional con cargo base, asignacion vigente, usuario asociado e historial operativo.
            </Typography>
          </Stack>
          <Stack direction="row" spacing={1}>
            <PageBackButton label={backLabel} to={backTo} />
          </Stack>
        </Stack>
      </Grid>

      {puedeGestionarPersonal || puedeGestionarUsuarios ? (
        <Grid size={12}>
          <MainCard title="Acciones administrativas">
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.25} useFlexGap flexWrap="wrap">
              {puedeGestionarPersonal ? (
                <>
                  <Button
                    onClick={() =>
                      navigate('/personal', {
                        state: { editPersonalId: personal.id }
                      })
                    }
                    variant="outlined"
                  >
                    Editar personal
                  </Button>
                  <Button color={personal.activo ? 'error' : 'primary'} onClick={() => void handleTogglePersonal()} variant="outlined">
                    {personal.activo ? 'Dar de baja' : 'Reactivar personal'}
                  </Button>
                </>
              ) : null}
              {puedeGestionarUsuarios ? (
                <Button
                  onClick={() =>
                    navigate('/seguridad/usuarios', {
                      state: {
                        prefillPersonalId: personal.id,
                        prefillUsername: buildSuggestedUsername(personal)
                      }
                    })
                  }
                  variant="outlined"
                >
                  {personal.usuario ? 'Ver usuario asociado' : 'Crear usuario vinculado'}
                </Button>
              ) : null}
              <Button onClick={() => navigate(`/personal/asignaciones?id_personal=${personal.id}`)} variant="outlined">
                Ver asignaciones
              </Button>
            </Stack>
            {!personal.usuario && puedeGestionarUsuarios ? (
              <Alert severity="info" sx={{ mt: 1.5 }}>
                Este personal aun no tiene usuario local vinculado. Puedes crear uno desde Seguridad / Usuarios con los datos precargados.
              </Alert>
            ) : null}
          </MainCard>
        </Grid>
      ) : null}

      <Grid size={{ xs: 12, md: 6 }}>
        <MainCard title="Datos personales">
          <Stack spacing={1.25}>
            <Typography variant="body2">
              Codigo: <strong>{personal.codigoPersonal || '-'}</strong>
            </Typography>
            <Typography variant="body2">
              C.I.: <strong>{personal.documentoIdentidad}</strong>
            </Typography>
            <Typography variant="body2">
              Cargo base: <strong>{personal.cargoActual?.nombre || '-'}</strong>
            </Typography>
            {/* Servicio/departamento/rol actual ya se muestran en detalle en "Asignaciones
                vigentes" mas abajo — repetirlos aqui era el mismo dato dos veces
                (docs/database/decisiones-tecnicas.md seccion 82). Solo queda una alerta
                cuando corresponde, no el dato en si. */}
            {personal.activo && !personal.servicioActual?.nombre && !personal.departamentoActual?.nombre ? (
              <Chip color="warning" label="Personal activo sin ninguna asignacion" size="small" variant="outlined" />
            ) : null}
            {personal.activo && !personal.servicioActual?.nombre && personal.departamentoActual?.nombre ? (
              <Chip color="warning" label="Personal activo sin servicio asignado" size="small" variant="outlined" />
            ) : null}
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <Typography variant="body2">Estado:</Typography>
              <StatusChip active={personal.activo} />
            </Stack>
          </Stack>
        </MainCard>
      </Grid>

      <Grid size={{ xs: 12, md: 6 }}>
        <MainCard title="Usuario y rol actual">
          <Stack spacing={1.25}>
            <Typography variant="body2">
              Usuario asociado: <strong>{personal.usuario?.username || '-'}</strong>
            </Typography>
            <Typography variant="body2">
              Rol de seguridad: <strong>{personal.usuario?.rolSeguridad?.nombre || '-'}</strong>
            </Typography>
          </Stack>
        </MainCard>
      </Grid>

      <Grid size={12}>
        <MainCard title="Asignaciones vigentes">
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Servicio</TableCell>
                  <TableCell>Departamento</TableCell>
                  <TableCell>Rol funcional</TableCell>
                  <TableCell>C/H</TableCell>
                  <TableCell>ITEM</TableCell>
                  <TableCell>Nro Item</TableCell>
                  <TableCell>Vigencia</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {personal.asignacionesVigentes.length ? (
                  personal.asignacionesVigentes.map((asignacion) => (
                    <TableRow hover key={asignacion.id}>
                      <TableCell>{asignacion.nombreServicio || 'Sin asignacion de servicio'}</TableCell>
                      <TableCell>{asignacion.nombreDepartamento || '-'}</TableCell>
                      <TableCell>{asignacion.nombreRolFuncional || '-'}</TableCell>
                      <TableCell>
                        <Chip color="primary" label={asignacion.codigoCargaHoraria || '-'} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell>{asignacion.codigoTipoContrato || asignacion.codigoFuenteItem || '-'}</TableCell>
                      <TableCell>{asignacion.nroItem || '-'}</TableCell>
                      <TableCell>
                        {asignacion.fechaInicio.slice(0, 10)}
                        {asignacion.fechaFin ? ` / ${asignacion.fechaFin.slice(0, 10)}` : ''}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7}>Sin asignaciones vigentes.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </MainCard>
      </Grid>

      <Grid size={12}>
        <MainCard title="Historial de asignaciones">
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Fecha del evento</TableCell>
                  <TableCell>Evento</TableCell>
                  <TableCell>Vigencia de la asignacion</TableCell>
                  <TableCell>Origen</TableCell>
                  <TableCell>Destino</TableCell>
                  <TableCell>Usuario</TableCell>
                  <TableCell>Motivo</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {personal.asignacionesHistoricas.length ? (
                  personal.asignacionesHistoricas.map((evento) => {
                    const sinDestino = !evento.servicioDestino.nombre && !evento.departamentoDestino.nombre;
                    return (
                      <TableRow hover key={evento.id}>
                        <TableCell>{evento.fechaEvento.slice(0, 10)}</TableCell>
                        <TableCell>
                          <Chip label={evento.tipoEvento} size="small" variant="outlined" />
                        </TableCell>
                        <TableCell>
                          {evento.fechaInicioAsignacion.slice(0, 10)} –{' '}
                          {evento.fechaFinAsignacion ? evento.fechaFinAsignacion.slice(0, 10) : 'Indefinido'}
                        </TableCell>
                        <TableCell>
                          <Stack spacing={0.25}>
                            <Typography variant="body2">
                              {evento.servicioOrigen.nombre || evento.departamentoOrigen.nombre || '-'}
                            </Typography>
                            {evento.rolFuncionalOrigen.nombre ? (
                              <Typography color="text.secondary" variant="caption">
                                {evento.rolFuncionalOrigen.nombre}
                              </Typography>
                            ) : null}
                          </Stack>
                        </TableCell>
                        <TableCell>
                          {sinDestino ? (
                            <Typography color="warning.main" variant="body2">
                              Sin destino (retirado)
                            </Typography>
                          ) : (
                            <Stack spacing={0.25}>
                              <Typography variant="body2">{evento.servicioDestino.nombre || evento.departamentoDestino.nombre}</Typography>
                              {evento.rolFuncionalDestino.nombre ? (
                                <Typography color="text.secondary" variant="caption">
                                  {evento.rolFuncionalDestino.nombre}
                                </Typography>
                              ) : null}
                            </Stack>
                          )}
                        </TableCell>
                        <TableCell>{evento.usuario?.username || '-'}</TableCell>
                        <TableCell>{evento.motivo || '-'}</TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={7}>Sin historial registrado.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </MainCard>
      </Grid>
    </Grid>
  );

  async function handleTogglePersonal() {
    try {
      if (personal.activo) {
        await personalApi.deletePersonal(personal.id);
      } else {
        await personalApi.activatePersonal(personal.id);
      }

      navigate(backTo, {
        replace: true,
        state: {
          backTo,
          backLabel
        }
      });
    } catch (error) {
      showError(error instanceof Error ? error.message : 'No se pudo actualizar el estado del personal.');
    }
  }
}

function buildSuggestedUsername(personal: { nombres: string; apellidoPaterno: string; codigoPersonal: string | null }) {
  if (personal.codigoPersonal) {
    return personal.codigoPersonal.toLowerCase();
  }

  const nombre = personal.nombres.split(' ')[0]?.toLowerCase() || 'usuario';
  const apellido = personal.apellidoPaterno.split(' ')[0]?.toLowerCase() || 'personal';
  return `${nombre}.${apellido}`;
}
