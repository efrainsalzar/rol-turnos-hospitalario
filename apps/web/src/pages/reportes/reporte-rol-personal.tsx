import { useEffect, useMemo, useState } from 'react';

import Alert from '@mui/material/Alert';
import Autocomplete from '@mui/material/Autocomplete';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import LinearProgress from '@mui/material/LinearProgress';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';

import DownloadOutlined from '@ant-design/icons/DownloadOutlined';
import FilePdfOutlined from '@ant-design/icons/FilePdfOutlined';
import SearchOutlined from '@ant-design/icons/SearchOutlined';

import MainCard from 'components/MainCard';
import { useAppToast } from 'components/system/AppToastProvider';
import OperationalPageTemplate from 'components/system/OperationalPageTemplate';
import OperationalStats from 'components/system/OperationalStats';
import { useApiRequest } from 'hooks/useApiRequest';
import { organizacionApi } from 'services/organizacionApi';
import { personalApi } from 'services/personalApi';
import { planificacionApi } from 'services/planificacionApi';
import type { MatrizMensualPlanificacion, Personal, Planificacion, ResumenPlanificacionPersonal } from 'types/api';
import { compactSelectMenuProps } from 'utils/select-menu-props';
import { operationalFieldSx } from 'utils/operational-ui';

type MatrizFila = MatrizMensualPlanificacion['filas'][number];
type MatrizDia = MatrizMensualPlanificacion['dias'][number];
type Registro = MatrizFila['dias'][number]['registros'][number];
type ModoBusqueda = 'personal' | 'servicio';
type Ambito = 'departamento' | 'servicio';

const MES_NOMBRES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre'
];

const currentYear = new Date().getFullYear();
const YEARS = [currentYear - 2, currentYear - 1, currentYear, currentYear + 1].map(String);

export default function ReporteRolPersonalPage() {
  const { showError } = useAppToast();

  const [modo, setModo] = useState<ModoBusqueda>('personal');

  // ---- Modo "buscar por personal" ----
  const [personaQuery, setPersonaQuery] = useState('');
  const [personaQueryDebounced, setPersonaQueryDebounced] = useState('');
  const [personaSeleccionada, setPersonaSeleccionada] = useState<Personal | null>(null);
  const [planificacionesPersona, setPlanificacionesPersona] = useState<Planificacion[]>([]);
  const [loadingPlanificacionesPersona, setLoadingPlanificacionesPersona] = useState(false);
  const [filtroAnioPersona, setFiltroAnioPersona] = useState('');
  const [filtroMesPersona, setFiltroMesPersona] = useState('');

  useEffect(() => {
    const timeout = window.setTimeout(() => setPersonaQueryDebounced(personaQuery.trim()), 350);
    return () => window.clearTimeout(timeout);
  }, [personaQuery]);

  const {
    data: personasEncontradas,
    loading: loadingPersonas,
    error: errorPersonas
  } = useApiRequest(
    () =>
      personaQueryDebounced.length >= 2
        ? personalApi.getPersonal({ nombre: personaQueryDebounced, pageSize: 15 })
        : Promise.resolve({ data: [], meta: { total: 0 } }),
    [personaQueryDebounced]
  );

  // ---- Modo "buscar por departamento o servicio" ----
  const [ambito, setAmbito] = useState<Ambito>('servicio');
  const [idDepartamento, setIdDepartamento] = useState('');
  const [idServicio, setIdServicio] = useState('');
  const [anio, setAnio] = useState(String(currentYear));
  const [mes, setMes] = useState(String(new Date().getMonth() + 1));

  const {
    data: departamentos,
    loading: loadingDeps,
    error: errorDeps,
    refetch: refetchDeps
  } = useApiRequest(() => organizacionApi.getDepartamentos(), []);

  const {
    data: serviciosData,
    loading: loadingServicios,
    error: errorServicios,
    refetch: refetchServicios
  } = useApiRequest(
    () => (idDepartamento ? organizacionApi.getServicios(Number(idDepartamento)) : Promise.resolve({ data: [], meta: { total: 0 } })),
    [idDepartamento]
  );

  const servicios = serviciosData?.data ?? [];

  // ---- Resultado compartido: planificacion resuelta + persona a reportar ----
  const [planificacion, setPlanificacion] = useState<Planificacion | null>(null);
  const [personas, setPersonas] = useState<ResumenPlanificacionPersonal[]>([]);
  const [matriz, setMatriz] = useState<MatrizMensualPlanificacion | null>(null);
  const [idAsignacion, setIdAsignacion] = useState('');

  const [loadingSearch, setLoadingSearch] = useState(false);
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  function resetResultado() {
    setPlanificacion(null);
    setPersonas([]);
    setMatriz(null);
    setIdAsignacion('');
    setSearchError(null);
  }

  function handleCambiarModo(nuevoModo: ModoBusqueda | null) {
    if (!nuevoModo || nuevoModo === modo) return;
    setModo(nuevoModo);
    setPersonaQuery('');
    setPersonaSeleccionada(null);
    setPlanificacionesPersona([]);
    setFiltroAnioPersona('');
    setFiltroMesPersona('');
    resetResultado();
  }

  async function handleSeleccionarPersona(persona: Personal | null) {
    setPersonaSeleccionada(persona);
    setPlanificacionesPersona([]);
    setFiltroAnioPersona('');
    setFiltroMesPersona('');
    resetResultado();
    if (!persona) return;

    setLoadingPlanificacionesPersona(true);
    try {
      const result = await planificacionApi.getPlanificaciones({ idPersonal: persona.id });
      setPlanificacionesPersona(result.data);
      if (!result.data.length) {
        setSearchError(`${persona.nombreCompleto} no tiene turnos registrados en ninguna planificacion.`);
      }
    } catch {
      showError('No se pudieron cargar las planificaciones de esta persona.');
    } finally {
      setLoadingPlanificacionesPersona(false);
    }
  }

  const aniosDisponiblesPersona = useMemo(
    () => Array.from(new Set(planificacionesPersona.map((p) => p.anio))).sort((a, b) => b - a),
    [planificacionesPersona]
  );

  const planificacionesPersonaFiltradas = useMemo(
    () =>
      planificacionesPersona.filter((p) => {
        if (filtroAnioPersona && String(p.anio) !== filtroAnioPersona) return false;
        if (filtroMesPersona && String(p.mes) !== filtroMesPersona) return false;
        return true;
      }),
    [planificacionesPersona, filtroAnioPersona, filtroMesPersona]
  );

  async function handleSeleccionarPlanificacionPersona(p: Planificacion) {
    if (!personaSeleccionada) return;
    setLoadingSearch(true);
    setSearchError(null);
    setPlanificacion(p);

    try {
      const [resumenResult, matrizResult] = await Promise.all([
        planificacionApi.getResumenPersonal(p.id),
        planificacionApi.getMatrizMensual(p.id)
      ]);

      setPersonas(resumenResult.data);
      setMatriz(matrizResult);

      const fila = resumenResult.data.find((r) => r.idPersonal === personaSeleccionada.id);
      setIdAsignacion(fila ? String(fila.idAsignacionPersonal) : '');
      if (!fila) {
        setSearchError('No se encontro el detalle de esta persona en la planificacion seleccionada.');
      }
    } catch {
      setSearchError('Error al cargar la planificacion. Verifica tu conexion e intentalo de nuevo.');
    } finally {
      setLoadingSearch(false);
    }
  }

  function resetResultadoServicio() {
    resetResultado();
  }

  async function handleBuscarPorAmbito() {
    if (ambito === 'servicio' && !idServicio) {
      setSearchError('Selecciona un servicio para buscar.');
      return;
    }
    if (ambito === 'departamento' && !idDepartamento) {
      setSearchError('Selecciona un departamento para buscar.');
      return;
    }
    if (!anio || !mes) {
      setSearchError('Selecciona año y mes para buscar.');
      return;
    }

    setLoadingSearch(true);
    setSearchError(null);
    resetResultado();

    try {
      const result = await planificacionApi.getPlanificaciones({
        idServicio: ambito === 'servicio' ? Number(idServicio) : undefined,
        idDepartamento: ambito === 'departamento' ? Number(idDepartamento) : undefined,
        anio: Number(anio),
        mes: Number(mes)
      });

      if (!result.data.length) {
        setSearchError(`No se encontro planificacion para ${MES_NOMBRES[Number(mes) - 1]} ${anio}.`);
        return;
      }

      const found = result.data[0];
      setPlanificacion(found);

      const [resumenResult, matrizResult] = await Promise.all([
        planificacionApi.getResumenPersonal(found.id),
        planificacionApi.getMatrizMensual(found.id)
      ]);

      setPersonas(resumenResult.data);
      setMatriz(matrizResult);
    } catch {
      setSearchError('Error al buscar. Verifica tu conexion e intentalo de nuevo.');
    } finally {
      setLoadingSearch(false);
    }
  }

  async function handleDescargarPdf() {
    if (!planificacion || !idAsignacion) return;
    setLoadingPdf(true);
    try {
      const blob = await planificacionApi.exportReportePersonalPdf(planificacion.id, Number(idAsignacion));
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      const persona = personas.find((p) => String(p.idAsignacionPersonal) === idAsignacion);
      const nombreArchivo = persona?.nombreCompleto ? persona.nombreCompleto.replace(/\s+/g, '_').toLowerCase() : String(idAsignacion);
      anchor.download = `reporte_rol_personal_${nombreArchivo}_${String(planificacion.mes).padStart(2, '0')}_${planificacion.anio}.pdf`;
      anchor.click();
      window.setTimeout(() => window.URL.revokeObjectURL(url), 10_000);
    } catch {
      showError('No se pudo generar el PDF. Intentalo de nuevo.');
    } finally {
      setLoadingPdf(false);
    }
  }

  const filaSeleccionada: MatrizFila | null = useMemo(() => {
    if (!matriz || !idAsignacion) return null;
    return matriz.filas.find((f) => f.idAsignacionPersonal === Number(idAsignacion)) ?? null;
  }, [matriz, idAsignacion]);

  const reportRows: Array<{ numero: number; dia: MatrizDia; registro: Registro | null }> = useMemo(() => {
    if (!matriz || !filaSeleccionada) return [];
    const diaFilaMap = new Map(filaSeleccionada.dias.map((d) => [d.idCalendario, d]));
    return matriz.dias.map((dia, index) => {
      const diaFila = diaFilaMap.get(dia.idCalendario);
      const registro = diaFila?.registros[0] ?? null;
      return { numero: index + 1, dia, registro };
    });
  }, [matriz, filaSeleccionada]);

  const totals = useMemo(() => {
    if (!matriz || !filaSeleccionada) return null;
    const diaFilaMap = new Map(filaSeleccionada.dias.map((d) => [d.idCalendario, d]));
    let diasConTurno = 0;
    let diasConIncidencia = 0;
    let diasSinAsignacion = 0;
    let feriados = 0;

    for (const dia of matriz.dias) {
      const diaFila = diaFilaMap.get(dia.idCalendario);
      const registros = diaFila?.registros ?? [];
      if (dia.esFeriado) feriados++;
      if (!registros.length) {
        diasSinAsignacion++;
      } else if (registros.some((r) => r.tipo === 'TURNO')) {
        diasConTurno++;
      } else {
        diasConIncidencia++;
      }
    }

    return {
      totalDias: matriz.dias.length,
      diasConTurno,
      diasConIncidencia,
      diasSinAsignacion,
      feriados,
      totalHoras: filaSeleccionada.totalHorasMes
    };
  }, [matriz, filaSeleccionada]);

  const periodoLabel = planificacion ? `${MES_NOMBRES[planificacion.mes - 1]} ${planificacion.anio}` : null;
  const ambitoLabel = planificacion
    ? ((planificacion.idServicio ? planificacion.nombreServicio : planificacion.nombreDepartamento) ?? '')
    : '';

  // Estado vacio explicito antes de cualquier busqueda real — evita dejar la pantalla
  // en blanco debajo de los filtros. No se muestra si ya hay una lista de
  // planificaciones de personal para elegir (esa tiene su propia tarjeta).
  const mostrarVacioInicial =
    !loadingSearch &&
    !loadingPlanificacionesPersona &&
    !searchError &&
    !planificacion &&
    !(modo === 'personal' && personaSeleccionada && planificacionesPersona.length > 0);

  return (
    <OperationalPageTemplate
      description="Consulta y descarga el reporte del rol de turnos por personal para el mes seleccionado."
      filters={
        <Stack spacing={1.5} sx={{ width: '100%' }}>
          <ToggleButtonGroup
            color="primary"
            exclusive
            onChange={(_, value: ModoBusqueda | null) => handleCambiarModo(value)}
            size="small"
            value={modo}
          >
            <ToggleButton value="personal">Buscar por personal</ToggleButton>
            <ToggleButton value="servicio">Buscar por departamento o servicio</ToggleButton>
          </ToggleButtonGroup>

          {modo === 'personal' ? (
            <Autocomplete
              filterOptions={(x) => x}
              getOptionLabel={(p) => `${p.nombreCompleto} — CI ${p.documentoIdentidad}`}
              isOptionEqualToValue={(a, b) => a.id === b.id}
              loading={loadingPersonas}
              noOptionsText={personaQueryDebounced.length < 2 ? 'Escribe al menos 2 caracteres' : 'Sin resultados'}
              onChange={(_, newValue) => void handleSeleccionarPersona(newValue)}
              onInputChange={(_, newInputValue) => setPersonaQuery(newInputValue)}
              options={personasEncontradas?.data ?? []}
              size="small"
              sx={{ minWidth: 320 }}
              value={personaSeleccionada}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Buscar por nombre o CI"
                  placeholder="Ej. Juana Calisaya o 1001014"
                  sx={operationalFieldSx.normal}
                />
              )}
            />
          ) : (
            <Stack alignItems="center" direction={{ xs: 'column', sm: 'row' }} spacing={1.5} useFlexGap flexWrap="wrap">
              <ToggleButtonGroup
                color="primary"
                exclusive
                onChange={(_, value: Ambito | null) => {
                  if (!value) return;
                  setAmbito(value);
                  setIdServicio('');
                  resetResultadoServicio();
                }}
                size="small"
                value={ambito}
              >
                <ToggleButton value="servicio">Servicio</ToggleButton>
                <ToggleButton value="departamento">Departamento</ToggleButton>
              </ToggleButtonGroup>

              <TextField
                disabled={loadingDeps}
                label="Departamento"
                onChange={(e) => {
                  setIdDepartamento(e.target.value);
                  setIdServicio('');
                  resetResultadoServicio();
                }}
                select
                SelectProps={compactSelectMenuProps}
                size="small"
                sx={operationalFieldSx.normal}
                value={idDepartamento}
              >
                <MenuItem value="">Selecciona</MenuItem>
                {(departamentos?.data ?? []).map((dep) => (
                  <MenuItem key={dep.id} value={String(dep.id)}>
                    {dep.nombre}
                  </MenuItem>
                ))}
              </TextField>

              {ambito === 'servicio' && (
                <TextField
                  disabled={loadingServicios || !idDepartamento}
                  label="Servicio"
                  onChange={(e) => {
                    setIdServicio(e.target.value);
                    resetResultadoServicio();
                  }}
                  select
                  SelectProps={compactSelectMenuProps}
                  size="small"
                  sx={operationalFieldSx.normal}
                  value={idServicio}
                >
                  <MenuItem value="">Selecciona</MenuItem>
                  {servicios.map((s) => (
                    <MenuItem key={s.id} value={String(s.id)}>
                      {s.nombre}
                    </MenuItem>
                  ))}
                </TextField>
              )}

              <TextField
                label="Año"
                onChange={(e) => {
                  setAnio(e.target.value);
                  resetResultadoServicio();
                }}
                select
                SelectProps={compactSelectMenuProps}
                size="small"
                sx={operationalFieldSx.short}
                value={anio}
              >
                {YEARS.map((y) => (
                  <MenuItem key={y} value={y}>
                    {y}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                label="Mes"
                onChange={(e) => {
                  setMes(e.target.value);
                  resetResultadoServicio();
                }}
                select
                SelectProps={compactSelectMenuProps}
                size="small"
                sx={operationalFieldSx.normal}
                value={mes}
              >
                {MES_NOMBRES.map((nombre, index) => (
                  <MenuItem key={index + 1} value={String(index + 1)}>
                    {nombre}
                  </MenuItem>
                ))}
              </TextField>

              <Button
                disabled={loadingSearch || (ambito === 'servicio' ? !idServicio : !idDepartamento)}
                onClick={() => void handleBuscarPorAmbito()}
                size="small"
                startIcon={<SearchOutlined />}
                variant="contained"
              >
                {loadingSearch ? 'Buscando...' : 'Buscar'}
              </Button>
            </Stack>
          )}

          {modo === 'personal' && errorPersonas ? <Alert severity="error">No se pudo buscar personal: {errorPersonas}</Alert> : null}
          {modo === 'servicio' && errorDeps ? (
            <Alert
              action={
                <Button color="inherit" onClick={() => refetchDeps()} size="small">
                  Reintentar
                </Button>
              }
              severity="error"
            >
              No se pudieron cargar los departamentos: {errorDeps}
            </Alert>
          ) : null}
          {modo === 'servicio' && ambito === 'servicio' && errorServicios ? (
            <Alert
              action={
                <Button color="inherit" onClick={() => refetchServicios()} size="small">
                  Reintentar
                </Button>
              }
              severity="error"
            >
              No se pudieron cargar los servicios: {errorServicios}
            </Alert>
          ) : null}
        </Stack>
      }
      stats={
        totals ? (
          <OperationalStats
            items={[
              { label: 'Total dias', value: totals.totalDias },
              { label: 'Con turno', value: totals.diasConTurno },
              { label: 'Incidencias', value: totals.diasConIncidencia },
              { label: 'Sin asignacion', value: totals.diasSinAsignacion },
              { label: 'Feriados', value: totals.feriados },
              { label: 'Total horas', value: formatHoras(totals.totalHoras) }
            ]}
          />
        ) : undefined
      }
      title="Rol de turno por personal"
    >
      {(loadingSearch || loadingPlanificacionesPersona) && (
        <Grid size={12}>
          <LinearProgress />
        </Grid>
      )}

      {searchError && (
        <Grid size={12}>
          <Alert severity="warning" onClose={() => setSearchError(null)}>
            {searchError}
          </Alert>
        </Grid>
      )}

      {mostrarVacioInicial && (
        <Grid size={12}>
          <MainCard>
            <Box py={3} textAlign="center">
              <Typography color="text.secondary" variant="body2">
                {modo === 'personal'
                  ? 'Busca una persona por nombre o CI para ver su historial de turnos.'
                  : 'Selecciona un departamento o servicio y un periodo, luego presiona "Buscar".'}
              </Typography>
            </Box>
          </MainCard>
        </Grid>
      )}

      {modo === 'personal' && personaSeleccionada && planificacionesPersona.length > 0 && (
        <Grid size={12}>
          <MainCard>
            <Stack spacing={1.5}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" useFlexGap>
                <Typography variant="subtitle1" fontWeight={700}>
                  Planificaciones de {personaSeleccionada.nombreCompleto}
                </Typography>

                {planificacionesPersona.length > 3 && (
                  <Stack direction="row" spacing={1}>
                    <TextField
                      label="Año"
                      onChange={(e) => setFiltroAnioPersona(e.target.value)}
                      select
                      SelectProps={compactSelectMenuProps}
                      size="small"
                      sx={operationalFieldSx.short}
                      value={filtroAnioPersona}
                    >
                      <MenuItem value="">Todos</MenuItem>
                      {aniosDisponiblesPersona.map((y) => (
                        <MenuItem key={y} value={String(y)}>
                          {y}
                        </MenuItem>
                      ))}
                    </TextField>
                    <TextField
                      label="Mes"
                      onChange={(e) => setFiltroMesPersona(e.target.value)}
                      select
                      SelectProps={compactSelectMenuProps}
                      size="small"
                      sx={operationalFieldSx.normal}
                      value={filtroMesPersona}
                    >
                      <MenuItem value="">Todos</MenuItem>
                      {MES_NOMBRES.map((nombre, index) => (
                        <MenuItem key={index + 1} value={String(index + 1)}>
                          {nombre}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Stack>
                )}
              </Stack>

              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {planificacionesPersonaFiltradas.map((p) => {
                  const esDepartamental = !p.idServicio;
                  const nombreAmbito = (esDepartamental ? p.nombreDepartamento : p.nombreServicio) ?? '—';
                  const seleccionada = planificacion?.id === p.id;
                  return (
                    <Chip
                      key={p.id}
                      clickable
                      color={seleccionada ? 'primary' : 'default'}
                      label={`${nombreAmbito}${esDepartamental ? ' (Depto.)' : ''} · ${MES_NOMBRES[p.mes - 1]} ${p.anio} · ${p.estado}`}
                      onClick={() => void handleSeleccionarPlanificacionPersona(p)}
                      variant={seleccionada ? 'filled' : 'outlined'}
                    />
                  );
                })}
              </Stack>
            </Stack>
          </MainCard>
        </Grid>
      )}

      {modo === 'servicio' && planificacion && (
        <Grid size={12}>
          <MainCard>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems="flex-end" useFlexGap flexWrap="wrap">
              <Autocomplete
                disabled={!personas.length}
                getOptionLabel={(p) => p.nombreCompleto ?? ''}
                isOptionEqualToValue={(a, b) => a.idAsignacionPersonal === b.idAsignacionPersonal}
                noOptionsText="Sin resultados"
                onChange={(_, newValue) => setIdAsignacion(newValue ? String(newValue.idAsignacionPersonal) : '')}
                options={personas}
                size="small"
                sx={{ minWidth: 280 }}
                value={personas.find((p) => String(p.idAsignacionPersonal) === idAsignacion) ?? null}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    helperText={`${personas.length} persona${personas.length !== 1 ? 's' : ''} en esta planificacion`}
                    label="Personal"
                    sx={operationalFieldSx.normal}
                  />
                )}
              />

              {filaSeleccionada && (
                <Button
                  disabled={loadingPdf}
                  onClick={() => void handleDescargarPdf()}
                  size="small"
                  startIcon={loadingPdf ? <DownloadOutlined /> : <FilePdfOutlined />}
                  variant="outlined"
                  color="error"
                  sx={{ mb: 2.5 }}
                >
                  {loadingPdf ? 'Generando PDF...' : 'Descargar PDF'}
                </Button>
              )}
            </Stack>
          </MainCard>
        </Grid>
      )}

      {filaSeleccionada && planificacion && (
        <Grid size={12}>
          <MainCard>
            <Stack spacing={2}>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                <Stack spacing={0.5}>
                  <Typography variant="h6" fontWeight={700}>
                    {filaSeleccionada.nombreCompleto}
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    {filaSeleccionada.ci && (
                      <Typography variant="body2" color="text.secondary">
                        C.I.: <strong>{filaSeleccionada.ci}</strong>
                      </Typography>
                    )}
                    {filaSeleccionada.cargoActual && (
                      <Typography variant="body2" color="text.secondary">
                        Cargo: <strong>{filaSeleccionada.cargoActual}</strong>
                      </Typography>
                    )}
                    {filaSeleccionada.cargaHorariaCodigo && (
                      <Typography variant="body2" color="text.secondary">
                        Carga H.: <strong>{filaSeleccionada.cargaHorariaCodigo}</strong>
                      </Typography>
                    )}
                  </Stack>
                </Stack>
                <Stack alignItems="flex-end" spacing={0.5}>
                  <Chip label={periodoLabel} size="small" variant="outlined" color="primary" />
                  <Typography variant="caption" color="text.secondary">
                    {ambitoLabel}
                  </Typography>
                </Stack>
              </Stack>

              {modo === 'personal' && (
                <Box display="flex" justifyContent="flex-end">
                  <Button
                    disabled={loadingPdf}
                    onClick={() => void handleDescargarPdf()}
                    size="small"
                    startIcon={loadingPdf ? <DownloadOutlined /> : <FilePdfOutlined />}
                    variant="outlined"
                    color="error"
                  >
                    {loadingPdf ? 'Generando PDF...' : 'Descargar PDF'}
                  </Button>
                </Box>
              )}

              <TableContainer component={Paper} variant="outlined">
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell align="center" sx={thSx} width={36}>
                        N°
                      </TableCell>
                      <TableCell sx={thSx} width={80}>
                        Día
                      </TableCell>
                      <TableCell align="center" sx={thSx} width={70}>
                        Fecha
                      </TableCell>
                      <TableCell align="center" sx={thSx} width={60}>
                        Código
                      </TableCell>
                      <TableCell sx={thSx}>Nombre / etiqueta</TableCell>
                      <TableCell sx={thSx}>Horario</TableCell>
                      <TableCell align="center" sx={thSx} width={54}>
                        Horas
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {reportRows.map(({ numero, dia, registro }) => (
                      <TableRow hover key={dia.idCalendario} sx={buildRowSx(dia, registro)}>
                        <TableCell align="center" sx={{ fontSize: '0.78rem' }}>
                          {numero}
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.78rem' }}>{dia.diaSemanaNombre}</TableCell>
                        <TableCell align="center" sx={{ fontSize: '0.78rem', fontVariantNumeric: 'tabular-nums' }}>
                          {formatFecha(dia.fecha)}
                        </TableCell>
                        <TableCell align="center" sx={{ fontSize: '0.78rem', fontWeight: registro ? 600 : 400 }}>
                          {formatCodigo(registro)}
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.78rem' }}>{registro?.nombre?.trim() || '—'}</TableCell>
                        <TableCell sx={{ fontSize: '0.78rem' }}>{formatHorario(registro)}</TableCell>
                        <TableCell align="center" sx={{ fontSize: '0.78rem', fontVariantNumeric: 'tabular-nums' }}>
                          {registro && registro.horasProgramadas > 0 ? formatHoras(registro.horasProgramadas) : '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              {totals && (
                <Stack spacing={1}>
                  <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: '0.08em' }}>
                    Resumen del periodo
                  </Typography>
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableBody>
                        <TableRow>
                          <TableCell sx={summaryHeadSx}>Concepto</TableCell>
                          <TableCell align="right">Dias del mes</TableCell>
                          <TableCell align="right">Con turno</TableCell>
                          <TableCell align="right">Incidencias</TableCell>
                          <TableCell align="right">Sin asignar</TableCell>
                          <TableCell align="right">Feriados</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell sx={summaryHeadSx}>Cantidad</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 700 }}>
                            {totals.totalDias}
                          </TableCell>
                          <TableCell align="right" sx={{ fontWeight: 700 }}>
                            {totals.diasConTurno}
                          </TableCell>
                          <TableCell align="right" sx={{ fontWeight: 700 }}>
                            {totals.diasConIncidencia}
                          </TableCell>
                          <TableCell align="right" sx={{ fontWeight: 700 }}>
                            {totals.diasSinAsignacion}
                          </TableCell>
                          <TableCell align="right" sx={{ fontWeight: 700 }}>
                            {totals.feriados}
                          </TableCell>
                        </TableRow>
                        <TableRow sx={{ bgcolor: 'primary.dark' }}>
                          <TableCell sx={{ ...summaryHeadSx, color: 'primary.contrastText' }}>Total horas del periodo</TableCell>
                          <TableCell colSpan={5} align="right" sx={{ color: 'primary.contrastText', fontWeight: 700, fontSize: '0.95rem' }}>
                            {formatHoras(totals.totalHoras)} horas
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Stack>
              )}

              {modo === 'servicio' && (
                <Box display="flex" justifyContent="flex-end">
                  <Button
                    disabled={loadingPdf}
                    onClick={() => void handleDescargarPdf()}
                    size="small"
                    startIcon={loadingPdf ? <DownloadOutlined /> : <FilePdfOutlined />}
                    variant="contained"
                    color="error"
                  >
                    {loadingPdf ? 'Generando PDF...' : 'Descargar PDF'}
                  </Button>
                </Box>
              )}
            </Stack>
          </MainCard>
        </Grid>
      )}

      {modo === 'servicio' && planificacion && !filaSeleccionada && (
        <Grid size={12}>
          <MainCard>
            <Box py={3} textAlign="center">
              <Typography color="text.secondary" variant="body2">
                {personas.length ? 'Selecciona un personal para ver su rol de turnos.' : 'Esta planificacion no tiene personal asignado.'}
              </Typography>
            </Box>
          </MainCard>
        </Grid>
      )}
    </OperationalPageTemplate>
  );
}

// ---- Sx helpers ----

const summaryHeadSx = {
  fontWeight: 700,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.03em',
  fontSize: '0.72rem',
  width: '26%'
};

// Mismo token literal (#eef4f8) que usa CollectionTableCard.tsx para el encabezado de
// todas las demas tablas del proyecto — antes esta tabla usaba primary.dark (azul
// solido) y se veia con un estilo distinto al resto de las pantallas.
const thSx = {
  backgroundColor: '#eef4f8',
  color: 'text.primary',
  fontWeight: 700,
  fontSize: '0.78rem',
  py: 0.75,
  '&.MuiTableCell-stickyHeader': {
    backgroundColor: '#eef4f8'
  }
};

// Mismo criterio de color que calendarios.tsx: feriado = warning, fin de semana =
// info (tokens del theme, no hex hardcodeado) — antes el feriado usaba un amarillo
// fijo (#fffde7) y el fin de semana action.hover (gris generico de hover, aplicado
// como fondo permanente, no como estado de interaccion).
function buildRowSx(dia: MatrizDia, registro: Registro | null) {
  if (!registro) {
    return {
      '& td': { color: 'text.disabled', fontStyle: 'italic' },
      ...(dia.esFeriado ? { bgcolor: 'warning.lighter' } : dia.esFinSemana ? { bgcolor: 'info.lighter' } : {})
    };
  }
  if (dia.esFeriado) return { bgcolor: 'warning.lighter' };
  if (dia.esFinSemana) return { bgcolor: 'info.lighter' };
  return {};
}

// ---- Formatters ----

function formatFecha(isoDate: string): string {
  const parts = isoDate.slice(0, 10).split('-');
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function formatHoras(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function formatCodigo(registro: Registro | null): string {
  // Un codigo real (M, T, VA, LI...) mide como maximo 4 caracteres. Si el
  // turno nunca tuvo un codigo visual configurado, el valor resuelto cae al
  // patron interno "HHMM-HHMM" — se prefiere un guion antes que mostrarlo.
  const codigo = registro?.codigo?.trim();
  return codigo && codigo.length <= 4 ? codigo : '—';
}

function formatHorario(registro: Registro | null): string {
  if (!registro) return 'Sin asignación';
  if (registro.tipo === 'TIPO_DIA') return '—';
  if (registro.tramos.length > 0) {
    return [...registro.tramos]
      .sort((a, b) => a.orden - b.orden)
      .map((t) => `${t.horaInicio.slice(0, 5)} – ${t.horaFin.slice(0, 5)}`)
      .join(' / ');
  }
  if (registro.horaInicio && registro.horaFin) {
    return `${registro.horaInicio.slice(0, 5)} – ${registro.horaFin.slice(0, 5)}`;
  }
  return '—';
}
