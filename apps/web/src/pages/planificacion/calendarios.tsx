import { useEffect, useMemo, useState } from 'react';

import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import FormControlLabel from '@mui/material/FormControlLabel';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import MenuItem from '@mui/material/MenuItem';

import LeftOutlined from '@ant-design/icons/LeftOutlined';
import RightOutlined from '@ant-design/icons/RightOutlined';

import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import dayjs, { Dayjs } from 'dayjs';
import 'dayjs/locale/es';

import MainCard from 'components/MainCard';
import { useAppToast } from 'components/system/AppToastProvider';
import ConfirmDialog from 'components/system/ConfirmDialog';
import FormDialog from 'components/system/FormDialog';
import OperationalPageTemplate from 'components/system/OperationalPageTemplate';
import OperationalStats from 'components/system/OperationalStats';
import OperationalTableCard from 'components/system/OperationalTableCard';
import StatusChip from 'components/system/StatusChip';
import { canManageGlobalCalendarCatalog, useAccessControl } from 'hooks/use-access-control';
import { useApiRequest } from 'hooks/useApiRequest';
import { isBlank, requiredMessage, useFormValidation } from 'hooks/useFormValidation';
import { operacionApi } from 'services/operacionApi';
import { planificacionApi } from 'services/planificacionApi';
import type { Calendario, Feriado } from 'types/api';
import { operationalFieldSx } from 'utils/operational-ui';
import { formatHumanPeriod } from 'utils/periodo-planificacion';
import { compactSelectMenuProps } from 'utils/select-menu-props';

dayjs.locale('es');

function isoToDayjs(value: string): Dayjs | null {
  return value ? dayjs(value, 'YYYY-MM-DD') : null;
}

function dayjsToIso(value: Dayjs | null): string {
  return value && value.isValid() ? value.format('YYYY-MM-DD') : '';
}

type FeriadoFormState = {
  idTipoFeriado: string;
  nombre: string;
  fechaInicio: string;
  fechaFin: string;
  activo: boolean;
};

function buildEmptyFeriadoForm(anio: number, mes: number): FeriadoFormState {
  const primerDia = `${anio}-${String(mes).padStart(2, '0')}-01`;
  return {
    idTipoFeriado: '',
    nombre: '',
    fechaInicio: primerDia,
    fechaFin: primerDia,
    activo: true
  };
}

function buildFeriadoFormFromRow(row: Feriado): FeriadoFormState {
  return {
    idTipoFeriado: String(row.idTipoFeriado),
    nombre: row.nombre,
    fechaInicio: row.fechaInicio,
    fechaFin: row.fechaFin,
    activo: row.activo
  };
}

const DIAS_SEMANA_CORTO = ['Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado', 'Domingo'];

type CasillaCalendario = Calendario | null;

// calendario.semanaMes agrupa por bloques fijos de 7 dias (1-7, 8-14, ...),
// no por semana real de lunes a domingo, asi que la grilla arma sus propias
// filas a partir de diaSemanaNum del primer dia del mes.
function agruparPorSemanas(dias: Calendario[]): CasillaCalendario[][] {
  if (!dias.length) return [];

  const ordenados = [...dias].sort((a, b) => a.fecha.localeCompare(b.fecha));
  const semanas: CasillaCalendario[][] = [];
  let semanaActual: CasillaCalendario[] = new Array(ordenados[0].diaSemanaNum - 1).fill(null);

  ordenados.forEach((dia) => {
    semanaActual.push(dia);
    if (semanaActual.length === 7) {
      semanas.push(semanaActual);
      semanaActual = [];
    }
  });

  if (semanaActual.length) {
    semanas.push([...semanaActual, ...new Array(7 - semanaActual.length).fill(null)]);
  }

  return semanas;
}

function encontrarFeriadoPorFecha(feriados: Feriado[], fechaIso: string): Feriado | undefined {
  return feriados.find((feriado) => feriado.activo && feriado.fechaInicio <= fechaIso && fechaIso <= feriado.fechaFin);
}

export default function CalendariosPage() {
  const periodoActual = getCurrentPeriod();
  const { session } = useAccessControl();
  const [anio, setAnio] = useState(String(periodoActual.anio));
  const [mes, setMes] = useState(String(periodoActual.mes));
  const [refreshKey, setRefreshKey] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [feriadoSaving, setFeriadoSaving] = useState(false);
  const [feriadoDesactivando, setFeriadoDesactivando] = useState(false);
  const [confirmDesactivarFeriado, setConfirmDesactivarFeriado] = useState(false);
  const [feriadoEditor, setFeriadoEditor] = useState<{ id: number | null; form: FeriadoFormState } | null>(null);
  // Apagado por defecto cuando se abre desde un click en una celda del calendario (ya
  // hay un dia de contexto claro); encendido cuando se abre desde "Nuevo feriado" (sin
  // dia elegido) o al editar un feriado que ya es un rango — para no ocultar informacion
  // real que el usuario ya habia cargado.
  const [mostrarRangoFeriado, setMostrarRangoFeriado] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [vista, setVista] = useState<'calendario' | 'tabla'>('calendario');
  const puedeGestionarCalendario = canManageGlobalCalendarCatalog(session, 'gestionarCalendarios');
  const { showSuccess, showError } = useAppToast();

  const validation = useFormValidation<FeriadoFormState>({
    idTipoFeriado: (values) => (isBlank(values.idTipoFeriado) ? requiredMessage('El tipo de feriado') : undefined),
    nombre: (values) => (isBlank(values.nombre) ? requiredMessage('El nombre') : undefined),
    fechaInicio: (values) => (isBlank(values.fechaInicio) ? requiredMessage('La fecha de inicio') : undefined),
    fechaFin: (values) => {
      if (isBlank(values.fechaFin)) return requiredMessage('La fecha de fin');
      if (values.fechaFin < values.fechaInicio) return 'La fecha de fin no puede ser anterior a la de inicio.';
      if (values.fechaFin.slice(0, 7) !== values.fechaInicio.slice(0, 7)) {
        return 'El feriado no puede cruzar de un mes a otro.';
      }
      return undefined;
    }
  });

  // Incluye siempre el anio actualmente seleccionado, no solo el rango base — si se
  // navega con las flechas de mes mas alla de base+2 o base-1, el select de Anio debe
  // seguir mostrando un valor valido en vez de quedar vacio.
  const yearOptions = useMemo(() => {
    const base = periodoActual.anio;
    const actual = parseOptionalNumber(anio) || base;
    const min = Math.min(base - 1, actual);
    const max = Math.max(base + 2, actual);
    return Array.from({ length: max - min + 1 }, (_, index) => min + index);
  }, [anio, periodoActual.anio]);

  const monthOptions = useMemo(
    () =>
      Array.from({ length: 12 }, (_, index) => ({
        value: index + 1,
        label: new Intl.DateTimeFormat('es-BO', {
          month: 'long',
          timeZone: 'UTC'
        }).format(new Date(Date.UTC(2026, index, 1)))
      })),
    []
  );

  const periodoLabel = useMemo(() => {
    const mesSeleccionado = monthOptions.find((item) => String(item.value) === mes);
    return `${mesSeleccionado?.label || ''} ${anio}`.trim().toUpperCase();
  }, [anio, mes, monthOptions]);

  function navegarMes(delta: 1 | -1) {
    const anioActual = parseOptionalNumber(anio) || periodoActual.anio;
    const mesActual = parseOptionalNumber(mes) || periodoActual.mes;
    // mesActual es 1-12; se pasa a base 0 para sumar/restar y envolver con modulo,
    // luego se vuelve a base 1. El anio ajusta solo cuando el mes cruza de
    // diciembre a enero o de enero a diciembre.
    const totalMeses = anioActual * 12 + (mesActual - 1) + delta;
    const anioNuevo = Math.floor(totalMeses / 12);
    const mesNuevo = (totalMeses % 12) + 1;
    setAnio(String(anioNuevo));
    setMes(String(mesNuevo));
  }

  const response = useApiRequest(
    () =>
      planificacionApi.getCalendarios({
        anio: parseOptionalNumber(anio),
        mes: parseOptionalNumber(mes)
      }),
    [anio, mes, refreshKey]
  );
  const feriadosResponse = useApiRequest(
    () =>
      planificacionApi.getFeriados({
        anio: parseOptionalNumber(anio),
        mes: parseOptionalNumber(mes)
      }),
    [anio, mes, refreshKey]
  );
  const tiposFeriadoResponse = useApiRequest(() => operacionApi.getTiposFeriado(), []);
  const tiposFeriado = useMemo(
    () => (tiposFeriadoResponse.data?.data || []).filter((item) => item.activo),
    [tiposFeriadoResponse.data?.data]
  );

  const semanasCalendario = useMemo(() => agruparPorSemanas(response.data?.data || []), [response.data?.data]);

  // El calendario no se autogenera al leerlo (accion exclusiva de SISTEMA,
  // ver docs/database/decisiones-tecnicas.md seccion 59): si el mes filtrado
  // no tiene dias todavia, "Nuevo feriado" quedaria bloqueado igual por el
  // backend, asi que la UI se adelanta con un estado vacio accionable.
  const calendarioListo = !response.loading && !response.error;
  const mesCalendarioGenerado = calendarioListo && Boolean(response.data?.data?.length);

  const calendarioEmptyMessage = puedeGestionarCalendario ? (
    <Stack
      alignItems={{ xs: 'stretch', sm: 'center' }}
      direction={{ xs: 'column', sm: 'row' }}
      justifyContent="space-between"
      spacing={1.5}
    >
      <Typography variant="body2">Este mes aun no fue generado. Generalo para poder cargar feriados y ver los dias.</Typography>
      <Button disabled={generating} onClick={() => void handleGenerate(true)} size="small" variant="outlined">
        {generating ? 'Generando...' : 'Generar mes'}
      </Button>
    </Stack>
  ) : (
    'El calendario de este mes aun no fue generado. Solicita a un administrador de sistema que lo genere.'
  );

  useEffect(() => {
    setPage(0);
  }, [anio, mes]);

  const columns = useMemo(
    () => [
      {
        key: 'fecha',
        title: 'Fecha',
        render: (row: Calendario) => <Typography variant="body2">{formatDate(row.fecha)}</Typography>
      },
      {
        key: 'dia',
        title: 'Dia',
        render: (row: Calendario) => <Typography variant="body2">{`${row.diaSemanaNombre} ${row.diaMes}`}</Typography>
      },
      {
        key: 'semanaMes',
        title: 'Semana mes',
        render: (row: Calendario) => <Typography variant="body2">{row.semanaMes ?? '-'}</Typography>
      },
      {
        key: 'finSemana',
        title: 'Fin de semana',
        render: (row: Calendario) => <StatusChip active={row.esFinSemana} activeLabel="Si" inactiveLabel="No" />
      },
      {
        key: 'feriado',
        title: 'Feriado',
        render: (row: Calendario) =>
          row.esFeriado ? (
            <Stack spacing={0.5}>
              <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap">
                <StatusChip active activeLabel="Si" />
                <StatusChip active activeLabel={row.codigoFeriado || '-'} />
              </Stack>
              <Typography color="text.secondary" variant="caption">
                {row.nombreFeriado || 'Sin descripcion'}
              </Typography>
            </Stack>
          ) : (
            <StatusChip active={false} activeLabel="Si" inactiveLabel="No" />
          )
      }
    ],
    []
  );

  return (
    <OperationalPageTemplate
      actions={[
        { label: 'Recargar', onClick: () => setRefreshKey((value) => value + 1), tone: 'secondary' },
        ...(puedeGestionarCalendario
          ? [
              {
                label: generating ? 'Generando...' : `Generar año ${anio}`,
                onClick: () => void handleGenerate(false),
                tone: 'primary' as const,
                disabled: generating
              },
              {
                label: 'Nuevo feriado',
                onClick: () => openNewFeriado(),
                tone: 'primary' as const,
                disabled: !mesCalendarioGenerado
              }
            ]
          : [])
      ]}
      description="Gestion del contexto general del mes. Feriados y marcas institucionales viven aqui; vacaciones o bajas de una persona se manejan aparte."
      filters={
        <>
          <TextField
            label="Anio"
            onChange={(event) => setAnio(event.target.value)}
            select
            SelectProps={compactSelectMenuProps}
            size="small"
            sx={operationalFieldSx.short}
            value={anio}
          >
            {yearOptions.map((year) => (
              <MenuItem key={year} value={year}>
                {year}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label="Mes"
            onChange={(event) => setMes(event.target.value)}
            select
            SelectProps={compactSelectMenuProps}
            size="small"
            sx={operationalFieldSx.normal}
            value={mes}
          >
            {monthOptions.map((month) => (
              <MenuItem key={month.value} value={month.value}>
                {month.label}
              </MenuItem>
            ))}
          </TextField>
          <ToggleButtonGroup exclusive onChange={(_event, value) => value && setVista(value)} size="small" value={vista}>
            <ToggleButton value="calendario">Calendario</ToggleButton>
            <ToggleButton value="tabla">Tabla</ToggleButton>
          </ToggleButtonGroup>
        </>
      }
      stats={
        <OperationalStats
          items={[
            { label: 'Dias', value: response.data?.meta.total || 0 },
            { label: 'Feriados del mes', value: feriadosResponse.data?.meta.total || 0 },
            { label: 'Gestion', value: puedeGestionarCalendario ? 'Global' : 'Solo lectura' }
          ]}
        />
      }
      title="Calendario operativo"
    >
      {vista === 'tabla' ? (
        <Grid size={12}>
          <OperationalTableCard
            columns={columns}
            emptyMessage={calendarioEmptyMessage}
            error={response.error}
            getRowKey={(row) => row.id}
            loading={response.loading}
            onRetry={response.refetch}
            rows={response.data?.data || []}
            slow={response.slow}
            subtitle="Base operativa de días, fines de semana y feriados institucionales."
            title="Calendario operativo"
            total={response.data?.meta.total}
            pagination={{
              page,
              rowsPerPage,
              onPageChange: setPage,
              onRowsPerPageChange: (value) => {
                setRowsPerPage(value);
                setPage(0);
              }
            }}
          />
        </Grid>
      ) : (
        <Grid size={12}>
          <MainCard>
            <Stack alignItems="center" direction="row" justifyContent="center" spacing={1} sx={{ mb: 2 }}>
              <IconButton aria-label="Mes anterior" onClick={() => navegarMes(-1)} size="small">
                <LeftOutlined style={{ fontSize: 16 }} />
              </IconButton>
              <Typography
                sx={{ fontWeight: 700, letterSpacing: 0.6, minWidth: 220, textAlign: 'center', textTransform: 'uppercase' }}
                variant="h5"
              >
                {periodoLabel}
              </Typography>
              <IconButton aria-label="Mes siguiente" onClick={() => navegarMes(1)} size="small">
                <RightOutlined style={{ fontSize: 16 }} />
              </IconButton>
            </Stack>
            {response.loading ? (
              <Stack alignItems="center" spacing={1}>
                <Typography color="text.secondary" variant="body2">
                  Cargando informacion desde la API.
                </Typography>
                {response.slow ? (
                  <Typography color="text.secondary" variant="caption">
                    Esto esta tardando mas de lo normal...
                  </Typography>
                ) : null}
              </Stack>
            ) : response.error ? (
              <Alert
                action={
                  <Button color="inherit" onClick={response.refetch} size="small">
                    Reintentar
                  </Button>
                }
                severity="error"
              >
                {response.error}
              </Alert>
            ) : !semanasCalendario.length ? (
              <Alert severity="info">{calendarioEmptyMessage}</Alert>
            ) : (
              // Fondo gris en el contenedor + gap: las celdas (blancas, con borde y radio
              // propios) quedan "flotando" sobre el gris, resaltando cada dia como una
              // tarjeta separada en vez de una grilla plana.
              <Box
                sx={{
                  bgcolor: 'grey.100',
                  borderRadius: 2,
                  display: 'grid',
                  gap: 1,
                  gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
                  p: 1
                }}
              >
                {DIAS_SEMANA_CORTO.map((nombreDia) => (
                  <Typography
                    color="secondary.dark"
                    key={nombreDia}
                    sx={{
                      bgcolor: 'primary.main',
                      borderRadius: 1,
                      fontWeight: 700,
                      letterSpacing: 0.4,
                      py: 0.75,
                      textAlign: 'center',
                      color: 'primary.contrastText',
                      textTransform: 'uppercase'
                    }}
                    variant="caption"
                  >
                    {nombreDia}
                  </Typography>
                ))}
                {semanasCalendario.flat().map((dia, index) => renderCasillaCalendario(dia, index))}
              </Box>
            )}
          </MainCard>
        </Grid>
      )}

      <FormDialog
        extraAction={
          feriadoEditor?.id ? (
            <Button color="error" disabled={feriadoSaving} onClick={() => setConfirmDesactivarFeriado(true)} variant="outlined">
              Desactivar feriado
            </Button>
          ) : undefined
        }
        onClose={closeFeriadoEditor}
        onSubmit={() => void handleSaveFeriado()}
        open={Boolean(feriadoEditor)}
        submitting={feriadoSaving}
        title={feriadoEditor?.id ? 'Editar feriado' : 'Nuevo feriado'}
      >
        <Stack spacing={1.5}>
          <TextField
            fullWidth
            {...validation.fieldProps('nombre', 'Nombre visible de la celebracion. Ejemplo: Año Nuevo.')}
            inputProps={{ maxLength: 150 }}
            label="Nombre"
            onChange={(event) => updateFeriadoField('nombre', event.target.value)}
            size="small"
            value={feriadoEditor?.form.nombre || ''}
          />
          <TextField
            fullWidth
            {...validation.fieldProps('idTipoFeriado')}
            label="Tipo de feriado"
            onChange={(event) => updateFeriadoField('idTipoFeriado', event.target.value)}
            select
            SelectProps={compactSelectMenuProps}
            size="small"
            value={feriadoEditor?.form.idTipoFeriado || ''}
          >
            {tiposFeriado.map((option) => (
              <MenuItem key={option.id} value={String(option.id)}>
                {option.codigo} · {option.nombre}
              </MenuItem>
            ))}
          </TextField>
          <LocalizationProvider adapterLocale="es" dateAdapter={AdapterDayjs}>
            {!mostrarRangoFeriado ? (
              <Typography color="text.secondary" variant="body2">
                {feriadoEditor?.form.fechaInicio
                  ? isoToDayjs(feriadoEditor.form.fechaInicio)?.format('DD [de] MMMM [de] YYYY')
                  : 'Selecciona una fecha.'}
              </Typography>
            ) : (
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                <DatePicker
                  format="DD/MM/YYYY"
                  label="Fecha inicio"
                  onChange={(value) => updateFechaInicioFeriado(dayjsToIso(value))}
                  slotProps={{
                    textField: { fullWidth: true, size: 'small', ...validation.fieldProps('fechaInicio') }
                  }}
                  value={isoToDayjs(feriadoEditor?.form.fechaInicio || '')}
                />
                <DatePicker
                  format="DD/MM/YYYY"
                  label="Fecha fin"
                  minDate={isoToDayjs(feriadoEditor?.form.fechaInicio || '') || undefined}
                  onChange={(value) => updateFeriadoField('fechaFin', dayjsToIso(value))}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      size: 'small',
                      ...validation.fieldProps('fechaFin', 'Debe ser del mismo mes que la fecha de inicio.')
                    }
                  }}
                  value={isoToDayjs(feriadoEditor?.form.fechaFin || '')}
                />
              </Stack>
            )}
          </LocalizationProvider>
          <FormControlLabel
            control={<Switch checked={mostrarRangoFeriado} onChange={(event) => toggleRangoFeriado(event.target.checked)} />}
            label="Configurar rango de fechas"
          />
        </Stack>
      </FormDialog>

      <ConfirmDialog
        confirmLabel="Desactivar feriado"
        confirmLoadingLabel="Desactivando..."
        loading={feriadoDesactivando}
        onClose={() => setConfirmDesactivarFeriado(false)}
        onConfirm={() => feriadoEditor?.id && void handleDesactivarFeriado(feriadoEditor.id)}
        open={confirmDesactivarFeriado}
        title="Desactivar feriado"
      >
        <Alert severity="warning">
          {feriadoEditor
            ? `Se va a desactivar "${feriadoEditor.form.nombre}" (${
                feriadoEditor.form.fechaInicio === feriadoEditor.form.fechaFin
                  ? formatDate(feriadoEditor.form.fechaInicio)
                  : `${formatDate(feriadoEditor.form.fechaInicio)} - ${formatDate(feriadoEditor.form.fechaFin)}`
              }). Los dias del rango dejaran de marcarse como feriado.`
            : ''}
        </Alert>
      </ConfirmDialog>
    </OperationalPageTemplate>
  );

  function renderCasillaCalendario(dia: CasillaCalendario, index: number) {
    if (!dia) {
      return <Box key={`vacio-${index}`} />;
    }

    const fechaIso = dia.fecha.slice(0, 10);
    const clickeable = puedeGestionarCalendario;
    const feriado = dia.esFeriado ? encontrarFeriadoPorFecha(feriadosResponse.data?.data || [], fechaIso) : undefined;

    const contenido = (
      <Box
        component="button"
        key={dia.id}
        onClick={clickeable ? () => (feriado ? openEditFeriado(feriado) : openNewFeriado(fechaIso)) : undefined}
        sx={{
          alignItems: 'flex-start',
          // Fin de semana en azul muy claro (primary.lighter): se distingue tanto del gris
          // de fondo del contenedor como del amarillo de feriado, sin competir con ninguno.
          bgcolor: dia.esFeriado ? 'warning.light' : dia.esFinSemana ? 'primary.lighter' : 'background.paper',
          border: '1px solid',
          borderColor: dia.esFeriado ? 'warning.main' : dia.esFinSemana ? 'primary.light' : 'divider',
          borderRadius: 1.5,
          cursor: clickeable ? 'pointer' : 'default',
          display: 'flex',
          flexDirection: 'column',
          font: 'inherit',
          gap: 0.5,
          minHeight: 82,
          p: 1,
          textAlign: 'left',
          width: '100%'
        }}
        type="button"
      >
        <Typography color={dia.esFeriado ? 'warning.dark' : 'text.primary'} fontWeight={700} variant="body2">
          {dia.diaMes}
        </Typography>
        {dia.esFeriado ? (
          <>
            <Chip
              color="warning"
              label={dia.codigoFeriado || '-'}
              size="small"
              sx={{ alignSelf: 'flex-start', fontSize: 10, fontWeight: 700, height: 18 }}
            />
            <Typography
              color="warning.dark"
              sx={{ WebkitBoxOrient: 'vertical', WebkitLineClamp: 2, display: '-webkit-box', overflow: 'hidden' }}
              variant="caption"
            >
              {dia.nombreFeriado}
            </Typography>
          </>
        ) : null}
      </Box>
    );

    return dia.esFeriado ? (
      <Tooltip key={dia.id} title={`${dia.codigoFeriado} · ${dia.nombreFeriado}`}>
        {contenido}
      </Tooltip>
    ) : (
      contenido
    );
  }

  function openNewFeriado(fechaIso?: string) {
    validation.reset();
    const form = buildEmptyFeriadoForm(parseOptionalNumber(anio) || periodoActual.anio, parseOptionalNumber(mes) || periodoActual.mes);
    setFeriadoEditor({
      id: null,
      form: fechaIso ? { ...form, fechaInicio: fechaIso, fechaFin: fechaIso } : form
    });
    // Sin dia de contexto (boton "Nuevo feriado"), se muestran los campos de una.
    setMostrarRangoFeriado(!fechaIso);
  }

  function openEditFeriado(row: Feriado) {
    validation.reset();
    setFeriadoEditor({ id: row.id, form: buildFeriadoFormFromRow(row) });
    setMostrarRangoFeriado(row.fechaInicio !== row.fechaFin);
  }

  function closeFeriadoEditor() {
    setFeriadoEditor(null);
    setConfirmDesactivarFeriado(false);
    setMostrarRangoFeriado(false);
    validation.reset();
  }

  function updateFeriadoField<K extends keyof FeriadoFormState>(field: K, value: FeriadoFormState[K]) {
    setFeriadoEditor((current) => (current ? { ...current, form: { ...current.form, [field]: value } } : current));
  }

  // Con el switch de rango apagado, fecha fin siempre sigue a fecha inicio (feriado
  // de un solo dia) — el usuario nunca ve ni edita fecha fin en ese estado.
  function updateFechaInicioFeriado(value: string) {
    setFeriadoEditor((current) =>
      current
        ? { ...current, form: { ...current.form, fechaInicio: value, fechaFin: mostrarRangoFeriado ? current.form.fechaFin : value } }
        : current
    );
  }

  function toggleRangoFeriado(activo: boolean) {
    setMostrarRangoFeriado(activo);
    if (!activo) {
      setFeriadoEditor((current) => (current ? { ...current, form: { ...current.form, fechaFin: current.form.fechaInicio } } : current));
    }
  }

  async function handleGenerate(onlyMonth: boolean) {
    const parsedAnio = parseOptionalNumber(anio);
    const parsedMes = parseOptionalNumber(mes);

    if (!parsedAnio) {
      showError('Debes indicar un anio valido para generar calendario.');
      return;
    }

    if (onlyMonth && !parsedMes) {
      showError('Debes indicar un mes valido para generar solo el mes.');
      return;
    }

    setGenerating(true);

    try {
      const result = await planificacionApi.generarCalendario({
        anio: parsedAnio,
        mes: onlyMonth ? parsedMes : undefined
      });

      showSuccess(
        onlyMonth
          ? `Calendario de ${formatHumanPeriod(result.anio, result.mes ?? Number(parsedMes))} generado correctamente: ${result.diasGenerados} días nuevos, ${result.diasExistentes} ya existían.`
          : `Calendario ${result.anio} generado correctamente: ${result.diasGenerados} días nuevos, ${result.diasExistentes} ya existían.`
      );
      setRefreshKey((value) => value + 1);
    } catch (error) {
      showError(error instanceof Error ? error.message : 'No se pudo generar el calendario.');
    } finally {
      setGenerating(false);
    }
  }

  async function handleSaveFeriado() {
    if (!feriadoEditor) return;
    if (!validation.validate(feriadoEditor.form)) return;

    const { form } = feriadoEditor;
    const anioDelFeriado = Number(form.fechaInicio.slice(0, 4));
    const mesDelFeriado = Number(form.fechaInicio.slice(5, 7));

    setFeriadoSaving(true);

    try {
      const payload = {
        idTipoFeriado: Number(form.idTipoFeriado),
        nombre: form.nombre.trim(),
        anio: anioDelFeriado,
        mes: mesDelFeriado,
        fechaInicio: form.fechaInicio,
        fechaFin: form.fechaFin,
        activo: form.activo
      };

      if (feriadoEditor.id) {
        await planificacionApi.updateFeriado(feriadoEditor.id, payload);
        showSuccess(`Feriado "${payload.nombre}" actualizado correctamente.`);
      } else {
        await planificacionApi.createFeriado(payload);
        showSuccess(`Feriado "${payload.nombre}" creado correctamente.`);
      }

      closeFeriadoEditor();
      setRefreshKey((value) => value + 1);
    } catch (error) {
      showError(error instanceof Error ? error.message : 'No se pudo guardar el feriado.');
    } finally {
      setFeriadoSaving(false);
    }
  }

  async function handleDesactivarFeriado(id: number) {
    setFeriadoDesactivando(true);
    try {
      await planificacionApi.deleteFeriado(id);
      showSuccess(
        feriadoEditor?.form.nombre
          ? `Feriado "${feriadoEditor.form.nombre}" desactivado correctamente.`
          : 'Feriado desactivado correctamente.'
      );
      setConfirmDesactivarFeriado(false);
      closeFeriadoEditor();
      setRefreshKey((value) => value + 1);
    } catch (error) {
      showError(error instanceof Error ? error.message : 'No se pudo desactivar el feriado.');
    } finally {
      setFeriadoDesactivando(false);
    }
  }
}

function parseOptionalNumber(value: string) {
  const trimmed = String(value).trim();
  if (!trimmed) {
    return undefined;
  }

  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('es-BO', {
    dateStyle: 'medium',
    timeZone: 'UTC'
  }).format(new Date(value));
}

function getCurrentPeriod() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/La_Paz',
    year: 'numeric',
    month: 'numeric'
  }).formatToParts(new Date());

  return {
    anio: Number(parts.find((part) => part.type === 'year')?.value || 2026),
    mes: Number(parts.find((part) => part.type === 'month')?.value || 1)
  };
}
