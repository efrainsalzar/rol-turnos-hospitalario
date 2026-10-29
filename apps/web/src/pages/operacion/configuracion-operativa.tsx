import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Grid from '@mui/material/Grid';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import MainCard from 'components/MainCard';
import OperationalPageTemplate from 'components/system/OperationalPageTemplate';
import OperationalScopeSummary from 'components/system/OperationalScopeSummary';
import OperationalStats from 'components/system/OperationalStats';
import { useAppToast } from 'components/system/AppToastProvider';
import { useAccessControl } from 'hooks/use-access-control';
import { canAccessGlobalCatalogs } from 'hooks/use-access-control';
import { useDepartmentServiceCascade } from 'hooks/use-department-service-cascade';
import { useApiRequest } from 'hooks/useApiRequest';
import { organizacionApi } from 'services/organizacionApi';
import { operacionApi } from 'services/operacionApi';
import type {
  ConfiguracionOperativaDepartamento,
  ConfiguracionOperativaServicio,
  Departamento,
  GuardarConfiguracionOperativaServicioInput,
  Servicio
} from 'types/api';
import { operationalFieldSx } from 'utils/operational-ui';
import { compactSelectMenuProps } from 'utils/select-menu-props';

type Draft = ConfiguracionOperativaServicio | ConfiguracionOperativaDepartamento;
type DraftCodigo = Draft['codigos'][number];

function isServicioConfig(draft: Draft): draft is ConfiguracionOperativaServicio {
  return 'servicio' in draft;
}

export default function ConfiguracionOperativaPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { session } = useAccessControl();
  const { showSuccess, showError } = useAppToast();
  const [idDepartamento, setIdDepartamento] = useState<string>('');
  const [idServicio, setIdServicio] = useState<string>('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);

  const puedeLeerCatalogoServicios = canAccessGlobalCatalogs(session);
  const departamentosResponse = useApiRequest(
    () => (puedeLeerCatalogoServicios ? organizacionApi.getDepartamentos() : Promise.resolve(null)),
    [puedeLeerCatalogoServicios]
  );
  const serviciosResponse = useApiRequest(
    () => (puedeLeerCatalogoServicios ? organizacionApi.getServicios(parseOptionalNumber(idDepartamento)) : Promise.resolve(null)),
    [idDepartamento, puedeLeerCatalogoServicios]
  );

  const departamentosDisponibles = useMemo<Departamento[]>(() => {
    if (puedeLeerCatalogoServicios) {
      return ((departamentosResponse.data?.data || []) as Departamento[]).filter((item) => item.activo);
    }
    return (session?.departamentosGestionables || []).map((item) => ({ ...item, activo: true }));
  }, [departamentosResponse.data, puedeLeerCatalogoServicios, session?.departamentosGestionables]);

  const serviciosDisponibles = useMemo<Servicio[]>(() => {
    if (puedeLeerCatalogoServicios) {
      return ((serviciosResponse.data?.data || []) as Servicio[]).filter((item) => item.activo);
    }
    const source = (session?.serviciosGestionables || []).map((item) => ({
      ...item,
      tipoServicio: 'SERVICIO' as const,
      cantidadPersonalActivo: 0,
      activo: true
    }));
    if (!idDepartamento) return source;
    return source.filter((item) => item.idDepartamento === Number(idDepartamento));
  }, [idDepartamento, puedeLeerCatalogoServicios, serviciosResponse.data, session?.serviciosGestionables]);

  const departamentoUnico = departamentosDisponibles.length === 1 ? departamentosDisponibles[0] : null;
  const departamentoSeleccionado = departamentosDisponibles.find((d) => String(d.id) === idDepartamento);
  const servicioSeleccionado = serviciosDisponibles.find((s) => String(s.id) === idServicio);

  const backState = (location.state as { backTo?: string; backLabel?: string } | null) || null;
  const backTo = backState?.backTo || '/operacion/turnos';
  const backLabel = backState?.backLabel || 'Volver a horarios';

  const { hasDepartments } = useDepartmentServiceCascade({
    departments: departamentosDisponibles,
    services: serviciosDisponibles,
    selectedDepartmentId: idDepartamento,
    selectedServiceId: idServicio,
    setSelectedDepartmentId: setIdDepartamento,
    setSelectedServiceId: setIdServicio
  });

  // idServicio vacío = scope departamento; idServicio con valor = scope servicio
  const esScopeServicio = Boolean(idServicio);

  const configuracionServicioResponse = useApiRequest(
    () => (esScopeServicio && idServicio ? operacionApi.getConfiguracionOperativaServicio(Number(idServicio)) : Promise.resolve(null)),
    [esScopeServicio, idServicio, refreshKey]
  );

  const configuracionDepartamentoResponse = useApiRequest(
    () =>
      !esScopeServicio && idDepartamento
        ? operacionApi.getConfiguracionOperativaDepartamento(Number(idDepartamento))
        : Promise.resolve(null),
    [esScopeServicio, idDepartamento, refreshKey]
  );

  useEffect(() => {
    if (esScopeServicio && configuracionServicioResponse.data) {
      setDraft(configuracionServicioResponse.data);
    }
  }, [configuracionServicioResponse.data, esScopeServicio]);

  useEffect(() => {
    if (!esScopeServicio && configuracionDepartamentoResponse.data) {
      setDraft(configuracionDepartamentoResponse.data);
    }
  }, [configuracionDepartamentoResponse.data, esScopeServicio]);

  useEffect(() => {
    setDraft(null);
  }, [idServicio, idDepartamento]);

  const originalData = esScopeServicio ? configuracionServicioResponse.data : configuracionDepartamentoResponse.data;

  const codigosHorario = useMemo(() => (draft ? draft.codigos.filter((item) => item.origen === 'TURNO') : []), [draft]);

  const hasPendingChanges = useMemo(() => {
    if (!draft || !originalData) return false;
    return JSON.stringify(draft) !== JSON.stringify(originalData);
  }, [draft, originalData]);

  async function handleSave() {
    if (!draft) return;
    setSaving(true);
    try {
      const payload: GuardarConfiguracionOperativaServicioInput = {
        modoVisual: draft.modoVisual,
        permiteMultiRegistroDia: draft.permiteMultiRegistroDia,
        usaEquivalenciaHorariaExportacion: draft.usaEquivalenciaHorariaExportacion,
        codigos: draft.codigos.map((item) => ({
          id: item.id,
          codigoVisual: item.codigo,
          etiqueta: item.etiqueta,
          descripcion: item.descripcion || undefined,
          color: item.color || undefined,
          ordenVisual: item.ordenVisual,
          activo: item.activo
        }))
      };

      if (esScopeServicio && idServicio) {
        const saved = await operacionApi.updateConfiguracionOperativaServicio(Number(idServicio), payload);
        setDraft(saved);
        setRefreshKey((k) => k + 1);
        const nombre = isServicioConfig(saved) ? saved.servicio.nombre || saved.servicio.codigo : '';
        showSuccess(`Etiquetas del servicio "${nombre}" guardadas correctamente.`);
      } else if (!esScopeServicio && idDepartamento) {
        const saved = await operacionApi.updateConfiguracionOperativaDepartamento(Number(idDepartamento), payload);
        setDraft(saved);
        setRefreshKey((k) => k + 1);
        const nombre = !isServicioConfig(saved) ? saved.departamento.nombre || saved.departamento.codigo : '';
        showSuccess(`Etiquetas del departamento "${nombre}" guardadas correctamente.`);
      }
    } catch (error) {
      showError(error instanceof Error ? error.message : 'No se pudo guardar.');
    } finally {
      setSaving(false);
    }
  }

  function updateCodigo(index: number, patch: Partial<DraftCodigo>) {
    setDraft((current) =>
      current ? { ...current, codigos: current.codigos.map((item, i) => (i === index ? { ...item, ...patch } : item)) } : current
    );
  }

  const configuracionLoading = esScopeServicio ? configuracionServicioResponse.loading : configuracionDepartamentoResponse.loading;
  const configuracionSlow = esScopeServicio ? configuracionServicioResponse.slow : configuracionDepartamentoResponse.slow;
  const configuracionError = esScopeServicio ? configuracionServicioResponse.error : configuracionDepartamentoResponse.error;
  const configuracionRefetch = esScopeServicio ? configuracionServicioResponse.refetch : configuracionDepartamentoResponse.refetch;
  const contextNombre = esScopeServicio ? servicioSeleccionado?.nombre : departamentoSeleccionado?.nombre;
  const contextCodigo = esScopeServicio ? servicioSeleccionado?.codigo : departamentoSeleccionado?.codigo;
  const selectionReady = esScopeServicio ? Boolean(idServicio) : Boolean(idDepartamento);

  return (
    <OperationalPageTemplate
      actions={[
        { label: 'Recargar', onClick: () => setRefreshKey((value) => value + 1), tone: 'secondary' },
        ...(!departamentoUnico
          ? [
              {
                label: 'Limpiar',
                onClick: () => {
                  setIdDepartamento(departamentosDisponibles[0] ? String(departamentosDisponibles[0].id) : '');
                  setIdServicio('');
                },
                tone: 'secondary' as const
              }
            ]
          : []),
        { label: backLabel, onClick: () => navigate(backTo), tone: 'ghost' }
      ]}
      context={
        selectionReady ? (
          <OperationalScopeSummary
            code={contextCodigo}
            helperText={`Etiquetas visuales de horarios del ${esScopeServicio ? 'servicio' : 'departamento'}.`}
            label={esScopeServicio ? 'Servicio' : 'Departamento'}
            name={contextNombre || ''}
          />
        ) : null
      }
      description="Asigna un codigo corto y una etiqueta a cada horario para que se lean mejor en la matriz."
      filters={
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} alignItems="center">
          {!departamentoUnico ? (
            <TextField
              label="Departamento"
              onChange={(event) => {
                setIdDepartamento(event.target.value);
                setIdServicio('');
              }}
              select
              SelectProps={compactSelectMenuProps}
              size="small"
              sx={operationalFieldSx.normal}
              value={idDepartamento}
            >
              {!hasDepartments ? <MenuItem value="">Sin departamentos</MenuItem> : null}
              {departamentosDisponibles.map((item) => (
                <MenuItem key={item.id} value={String(item.id)}>
                  {item.nombre}
                </MenuItem>
              ))}
            </TextField>
          ) : null}

          {idDepartamento ? (
            <TextField
              label="Ver etiquetas de"
              onChange={(event) => setIdServicio(event.target.value)}
              select
              SelectProps={compactSelectMenuProps}
              size="small"
              sx={operationalFieldSx.long}
              value={idServicio}
            >
              {departamentoSeleccionado ? <MenuItem value="">Departamento: {departamentoSeleccionado.nombre}</MenuItem> : null}
              {serviciosDisponibles.map((item) => (
                <MenuItem key={item.id} value={String(item.id)}>
                  Servicio: {item.nombre}
                </MenuItem>
              ))}
            </TextField>
          ) : null}
        </Stack>
      }
      stats={
        <OperationalStats
          items={[
            { label: 'Horarios', value: codigosHorario.length },
            { label: 'Sin guardar', value: hasPendingChanges ? 'si' : 'no' }
          ]}
        />
      }
      summary={
        selectionReady
          ? draft
            ? `${codigosHorario.length} horario${codigosHorario.length !== 1 ? 's' : ''} configurado${codigosHorario.length !== 1 ? 's' : ''}`
            : 'Sin horarios cargados'
          : 'Selecciona departamento o servicio para ver sus etiquetas'
      }
      variant="config"
      title="Etiquetas de horarios"
    >
      <Grid size={12}>
        <MainCard
          title="Horarios"
          subheader="El codigo corto y la etiqueta son solo visuales. Lo oficial siempre es el horario real registrado."
        >
          {puedeLeerCatalogoServicios && departamentosResponse.error ? (
            <Alert
              action={
                <Button color="inherit" onClick={() => departamentosResponse.refetch()} size="small">
                  Reintentar
                </Button>
              }
              severity="error"
              sx={{ mb: 1.5 }}
            >
              No se pudieron cargar los departamentos: {departamentosResponse.error}
            </Alert>
          ) : null}

          {puedeLeerCatalogoServicios && serviciosResponse.error ? (
            <Alert
              action={
                <Button color="inherit" onClick={() => serviciosResponse.refetch()} size="small">
                  Reintentar
                </Button>
              }
              severity="error"
              sx={{ mb: 1.5 }}
            >
              No se pudieron cargar los servicios: {serviciosResponse.error}
            </Alert>
          ) : null}

          {selectionReady && configuracionLoading ? (
            <Stack alignItems="center" direction="row" spacing={1.5}>
              <CircularProgress size={20} />
              <Stack>
                <Typography variant="body2">Cargando etiquetas...</Typography>
                {configuracionSlow ? (
                  <Typography color="text.secondary" variant="caption">
                    Esto esta tardando mas de lo normal...
                  </Typography>
                ) : null}
              </Stack>
            </Stack>
          ) : null}

          {selectionReady && !configuracionLoading && configuracionError ? (
            <Alert
              action={
                <Button color="inherit" onClick={() => configuracionRefetch()} size="small">
                  Reintentar
                </Button>
              }
              severity="error"
            >
              {configuracionError}
            </Alert>
          ) : null}

          {!selectionReady && !configuracionLoading ? (
            <Alert severity="info">Selecciona un departamento o servicio para ver y ajustar las etiquetas de sus horarios.</Alert>
          ) : null}

          {draft ? (
            <Stack spacing={2}>
              <Stack
                alignItems={{ xs: 'stretch', md: 'center' }}
                direction={{ xs: 'column', md: 'row' }}
                justifyContent="space-between"
                spacing={1.25}
              >
                <Stack spacing={0.25}>
                  <Typography variant="subtitle2">Etiquetas visuales</Typography>
                  <Typography color="text.secondary" variant="body2">
                    Cada horario puede tener un codigo corto (ej. M, T, N) y una etiqueta para la matriz.
                  </Typography>
                </Stack>
                <Stack alignItems={{ xs: 'stretch', md: 'flex-end' }} spacing={0.5}>
                  <Button disabled={saving || !hasPendingChanges} onClick={() => void handleSave()} variant="contained">
                    {saving ? 'Guardando...' : 'Guardar cambios'}
                  </Button>
                  <Typography color="text.secondary" variant="caption">
                    {hasPendingChanges ? 'Hay cambios sin guardar.' : 'Sin cambios pendientes.'}
                  </Typography>
                </Stack>
              </Stack>

              {codigosHorario.length > 0 ? (
                <TableContainer sx={{ borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Horario</TableCell>
                        <TableCell>Horas</TableCell>
                        <TableCell>Codigo visible</TableCell>
                        <TableCell>Etiqueta</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {codigosHorario.map((item) => {
                        const index = draft.codigos.findIndex((codigo) => codigo.id === item.id);
                        return (
                          <TableRow hover key={item.id}>
                            <TableCell>
                              <Typography variant="body2">
                                {item.horaInicio && item.horaFin
                                  ? `${item.horaInicio.slice(0, 5)} – ${item.horaFin.slice(0, 5)}`
                                  : 'Sin horario'}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2">{item.horas}</Typography>
                            </TableCell>
                            <TableCell>
                              <TextField
                                inputProps={{ maxLength: 4 }}
                                onChange={(event) => updateCodigo(index, { codigo: event.target.value.toUpperCase() })}
                                placeholder="M, T, N..."
                                size="small"
                                value={item.codigo}
                              />
                            </TableCell>
                            <TableCell>
                              <TextField
                                onChange={(event) => updateCodigo(index, { etiqueta: event.target.value })}
                                placeholder="Manana, Tarde, Noche..."
                                size="small"
                                value={item.etiqueta}
                              />
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Alert severity="warning">
                  {esScopeServicio
                    ? 'Este servicio no tiene horarios configurados. Crea primero un horario desde Horarios.'
                    : 'Este departamento no tiene horarios propios configurados. Crea primero un horario de departamento desde Horarios.'}
                </Alert>
              )}
            </Stack>
          ) : null}
        </MainCard>
      </Grid>
    </OperationalPageTemplate>
  );
}

function parseOptionalNumber(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
}
