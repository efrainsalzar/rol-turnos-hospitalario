import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import type { ConfiguracionOperativaPlanificacion, MatrizMensualPlanificacion } from 'types/api';

interface PlanificacionOperationalLegendProps {
  configuracion: ConfiguracionOperativaPlanificacion | null;
  matriz?: MatrizMensualPlanificacion | null;
}

export default function PlanificacionOperationalLegend({ configuracion, matriz }: PlanificacionOperationalLegendProps) {
  const specialLegend = buildSpecialLegendEntries(configuracion, matriz);
  const holidayEntries = specialLegend.filter((entry) => entry.kind === 'holiday');
  const incidenceEntries = specialLegend.filter((entry) => entry.kind === 'incidencia');

  return (
    <Stack spacing={1.25}>
      <Stack
        alignItems={{ xs: 'stretch', md: 'flex-start' }}
        direction={{ xs: 'column', md: 'row' }}
        justifyContent="space-between"
        spacing={1.25}
      ></Stack>

      {specialLegend.length ? (
        <Box
          sx={{
            p: 1.25,
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 1.5,
            backgroundColor: 'background.paper'
          }}
        >
          <Stack spacing={1}>
            <Typography variant="subtitle2">Leyenda activa</Typography>

            {holidayEntries.length ? (
              <Stack spacing={0.5}>
                <Typography color="text.secondary" variant="caption">
                  Feriados en cabecera
                </Typography>
                <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap">
                  {holidayEntries.map((entry) => (
                    <Chip key={`holiday-${entry.code}`} label={`${entry.code} · ${entry.label}`} size="small" variant="outlined" />
                  ))}
                </Stack>
              </Stack>
            ) : null}

            {incidenceEntries.length ? (
              <Stack spacing={0.5}>
                <Typography color="text.secondary" variant="caption">
                  Incidencias personales
                </Typography>
                <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap">
                  {incidenceEntries.map((entry) => (
                    <Chip key={`inc-${entry.code}`} label={`${entry.code} · ${entry.label}`} size="small" variant="outlined" />
                  ))}
                </Stack>
              </Stack>
            ) : null}
          </Stack>
        </Box>
      ) : null}

      {/* {holidayEntries.length ? (
        <Alert severity="warning">
          F/FN/FR/FI en la cabecera indica que el dia es feriado. La asignacion de turnos depende de cada unidad.
        </Alert>
      ) : null}
 */}
      {configuracion ? (
        <>
          <Divider />
          <Stack spacing={0.75}>
            {configuracion.codigosPermitidos.map((item) => (
              <Box
                key={`${item.origen}-${item.id}`}
                sx={{
                  p: 1,
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1,
                  backgroundColor: item.color ? `${item.color}18` : '#fff'
                }}
              >
                <Stack
                  alignItems={{ xs: 'flex-start', md: 'center' }}
                  direction={{ xs: 'column', md: 'row' }}
                  justifyContent="space-between"
                  spacing={0.75}
                >
                  <Stack spacing={0.25}>
                    <Typography variant="body2">{formatCodigoPermitidoLabel(item)}</Typography>
                  </Stack>
                  <Chip label={item.categoria} size="small" variant="outlined" />
                </Stack>
              </Box>
            ))}
          </Stack>
        </>
      ) : (
        <Alert severity="warning">
          El servicio aun no tiene una configuracion operativa explicita. El sistema esta usando un fallback temporal desde turnos y tipos
          de dia.
        </Alert>
      )}
    </Stack>
  );
}

type CodigoPermitido = ConfiguracionOperativaPlanificacion['codigosPermitidos'][number];

// codigoVisual/etiqueta son un apodo opcional (ver docs/database/decisiones-tecnicas.md):
// si un horario no lo tiene configurado, la leyenda no debe quedar vacia (solo "·"),
// asi que cae al horario real. Si si lo tiene, el horario se muestra igual como dato de apoyo.
function formatHorarioResumen(item: CodigoPermitido): string {
  if (item.tramos.length > 0) {
    return [...item.tramos]
      .sort((a, b) => a.orden - b.orden)
      .map((tramo) => `${tramo.horaInicio}-${tramo.horaFin}`)
      .join(' / ');
  }

  if (item.horaInicio && item.horaFin) {
    return `${item.horaInicio} - ${item.horaFin}`;
  }

  return '';
}

function formatCodigoPermitidoLabel(item: CodigoPermitido) {
  const horario = formatHorarioResumen(item);
  const tieneCodigoEtiqueta = Boolean(item.codigo && item.etiqueta);

  if (tieneCodigoEtiqueta) {
    return (
      <>
        <strong>{item.codigo}</strong> · {item.etiqueta}
        {horario ? ` · ${horario}` : ''}
      </>
    );
  }

  return horario || item.descripcion || '-';
}

type SpecialLegendEntry = {
  code: string;
  label: string;
  kind: 'holiday' | 'incidencia';
};

function buildSpecialLegendEntries(
  configuracion: ConfiguracionOperativaPlanificacion | null,
  matriz: MatrizMensualPlanificacion | null | undefined
): SpecialLegendEntry[] {
  if (!matriz) {
    return [];
  }

  const entries = new Map<string, SpecialLegendEntry>();
  const personalCodeMap = new Map<string, { code: string; label: string }>();

  (configuracion?.codigosPermitidos || []).forEach((item) => {
    if (item.origen !== 'TIPO_DIA' || item.alcanceIncidenciaPersonal === 'GENERAL') {
      return;
    }

    const normalizedKey = normalizeLegendKey(item.etiqueta);
    personalCodeMap.set(normalizedKey, {
      code: item.codigo,
      label: item.etiqueta
    });
  });

  matriz.dias.forEach((dia) => {
    if (!dia.esFeriado) {
      return;
    }

    const code = normalizeHolidayCode(dia.codigoFeriado);
    entries.set(`holiday:${code}`, {
      code,
      label: dia.nombreFeriado || `Feriado ${code}`,
      kind: 'holiday'
    });
  });

  matriz.filas.forEach((fila) => {
    fila.dias.forEach((dia) => {
      dia.registros.forEach((registro) => {
        if (registro.tipo !== 'TIPO_DIA') {
          return;
        }

        const sourceLabel = registro.nombre || registro.codigo || '';
        const normalizedKey = normalizeLegendKey(sourceLabel || registro.codigo || '');
        const mapped = personalCodeMap.get(normalizedKey);
        const code = mapped?.code || formatIncidentCode(registro.codigo);
        const label = mapped?.label || registro.nombre || registro.codigo || code;

        entries.set(`incidencia:${code}`, {
          code,
          label,
          kind: 'incidencia'
        });
      });
    });
  });

  return [...entries.values()].sort((left, right) => left.code.localeCompare(right.code));
}

function normalizeLegendKey(value: string | null | undefined) {
  return (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toUpperCase();
}

function normalizeHolidayCode(code: string | null | undefined) {
  return ['F', 'FN', 'FR', 'FI'].includes(code || '') ? (code as string) : 'F';
}

function formatIncidentCode(code: string | null | undefined) {
  const normalized = normalizeLegendKey(code);

  switch (normalized) {
    case 'LICENCIA':
      return 'LI';
    case 'VACACION':
      return 'VA';
    case 'FERIADO':
      return 'FN';
    case 'DESCANSO':
      return 'DE';
    case 'BAJA_MEDICA':
      return 'BM';
    case 'PERMISO':
      return 'PE';
    case 'FALTA':
      return 'FA';
    case 'COMISION':
      return 'CO';
    default:
      return normalized || '-';
  }
}
