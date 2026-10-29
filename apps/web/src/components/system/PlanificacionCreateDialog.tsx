import { useEffect, useMemo, useState } from 'react';

import Alert from '@mui/material/Alert';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';

import FormDialog from 'components/system/FormDialog';
import { useAppToast } from 'components/system/AppToastProvider';
import { useDepartmentServiceCascade } from 'hooks/use-department-service-cascade';
import { planificacionApi } from 'services/planificacionApi';
import type { CrearPlanificacionInput } from 'services/planificacionApi';
import type { Departamento, Planificacion, Servicio } from 'types/api';
import { compactSelectMenuProps } from 'utils/select-menu-props';
import { formatHumanPeriod, formatPeriodValue, parsePeriodValue } from 'utils/periodo-planificacion';
import { etiquetaPlanificacion } from 'utils/planificacion-mensajes';

export interface PlanificacionCreateDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: (planificacion: Planificacion) => void;
  idUsuarioCreador: number;
  periodosCreables: Array<{ anio: number; mes: number }>;
  departamentos: Departamento[];
  serviciosGestionables: Servicio[];
  puedeElegirScopeDepartamento: boolean;
  departamentoUnicoFiltro: Departamento | null;
  servicioUnicoFiltro: Servicio | null;
  defaultPeriodo?: { anio: number; mes: number };
  defaultIdDepartamento?: number;
  defaultIdServicio?: number;
}

// Diseño (ver docs/database/decisiones-tecnicas.md, entrada de este cambio):
// jerarquia primero (Departamento) y Servicio recien como paso manual
// despues, en vez del selector abstracto "Servicio/Departamento" que existia
// antes de saber siquiera el departamento. El valor '' de idServicio
// representa "nivel de departamento" (no es "todavia sin elegir" como en el
// filtro del listado): una vez resuelto el departamento, ese es el estado de
// reposo valido, no un placeholder.
export default function PlanificacionCreateDialog({
  open,
  onClose,
  onCreated,
  idUsuarioCreador,
  periodosCreables,
  departamentos,
  serviciosGestionables,
  puedeElegirScopeDepartamento,
  departamentoUnicoFiltro,
  servicioUnicoFiltro,
  defaultPeriodo,
  defaultIdDepartamento,
  defaultIdServicio
}: PlanificacionCreateDialogProps) {
  const { showSuccess, showError } = useAppToast();
  const [periodo, setPeriodo] = useState('');
  const [idDepartamento, setIdDepartamento] = useState('');
  const [idServicio, setIdServicio] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!open) return;

    const periodoInicial =
      defaultPeriodo && periodosCreables.some((p) => p.anio === defaultPeriodo.anio && p.mes === defaultPeriodo.mes)
        ? defaultPeriodo
        : periodosCreables[0];
    setPeriodo(periodoInicial ? formatPeriodValue(periodoInicial.anio, periodoInicial.mes) : '');

    const departamentoInicial = departamentoUnicoFiltro
      ? String(departamentoUnicoFiltro.id)
      : defaultIdDepartamento
        ? String(defaultIdDepartamento)
        : '';
    setIdDepartamento(departamentoInicial);

    const servicioPerteneceADepartamento =
      defaultIdServicio &&
      serviciosGestionables.some((s) => s.id === defaultIdServicio && String(s.idDepartamento) === departamentoInicial);
    const servicioInicial = servicioUnicoFiltro
      ? String(servicioUnicoFiltro.id)
      : servicioPerteneceADepartamento
        ? String(defaultIdServicio)
        : '';
    setIdServicio(servicioInicial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const serviciosDelDepartamento = useMemo(() => {
    if (!idDepartamento) return [];
    return serviciosGestionables.filter((item) => String(item.idDepartamento) === idDepartamento);
  }, [idDepartamento, serviciosGestionables]);

  const { hasServices } = useDepartmentServiceCascade({
    departments: departamentos,
    services: serviciosDelDepartamento,
    selectedDepartmentId: idDepartamento,
    selectedServiceId: idServicio,
    setSelectedDepartmentId: (value) => {
      setIdDepartamento(value);
      setIdServicio('');
    },
    setSelectedServiceId: setIdServicio,
    autoSelectDepartment: false,
    autoSelectService: false
  });

  const departamentoResuelto = departamentoUnicoFiltro ? departamentoUnicoFiltro.id : idDepartamento ? Number(idDepartamento) : undefined;
  // Sin permiso de alcance departamental, Servicio no tiene la opcion "nivel de
  // departamento": es un select comun y obligatorio, igual que Departamento.
  const servicioObligatorioEspecifico = !servicioUnicoFiltro && !puedeElegirScopeDepartamento;
  const servicioResuelto = servicioUnicoFiltro ? servicioUnicoFiltro.id : idServicio ? Number(idServicio) : undefined;

  const submitDisabled = creating || !periodo || !departamentoResuelto || (servicioObligatorioEspecifico && !servicioResuelto);

  // Resumen en vivo: el usuario debe saber en todo momento para que
  // departamento/servicio esta creando la planificacion, sin tener que
  // reconstruirlo mentalmente a partir de los selects. Se recalcula en cada
  // render a partir del mismo estado que ya maneja el formulario, no es
  // estado propio.
  const departamentoLabel = departamentoUnicoFiltro?.nombre ?? departamentos.find((item) => item.id === departamentoResuelto)?.nombre;
  const servicioLabel = servicioUnicoFiltro
    ? servicioUnicoFiltro.nombre
    : servicioResuelto
      ? serviciosDelDepartamento.find((item) => item.id === servicioResuelto)?.nombre
      : undefined;
  const periodoParsed = parsePeriodValue(periodo);
  const periodoLabel =
    periodoParsed.anio !== undefined && periodoParsed.mes !== undefined ? formatHumanPeriod(periodoParsed.anio, periodoParsed.mes) : '';

  // Solo el nombre del departamento/servicio va en negrilla — es el dato que
  // cambia en vivo con cada seleccion, el resto de la frase es fijo.
  const resumenNode = !departamentoResuelto ? (
    'Elegí un departamento para continuar.'
  ) : servicioObligatorioEspecifico && !servicioResuelto ? (
    'Elegí un servicio para continuar.'
  ) : servicioLabel ? (
    <>
      Vas a crear la planificación del servicio <strong>{servicioLabel}</strong>
      {departamentoLabel ? (
        <>
          , departamento <strong>{departamentoLabel}</strong>
        </>
      ) : null}
      {periodoLabel ? ` — ${periodoLabel}` : ''}.
    </>
  ) : (
    <>
      Vas a crear la planificación a nivel del departamento <strong>{departamentoLabel}</strong>
      {periodoLabel ? ` — ${periodoLabel}` : ''}.
    </>
  );

  async function handleCreate() {
    const parsed = parsePeriodValue(periodo);
    if (!parsed.anio || !parsed.mes || !departamentoResuelto) return;

    setCreating(true);

    try {
      const input: CrearPlanificacionInput = servicioResuelto
        ? { idServicio: servicioResuelto, anio: parsed.anio, mes: parsed.mes, idUsuarioCreador }
        : { idDepartamento: departamentoResuelto, anio: parsed.anio, mes: parsed.mes, idUsuarioCreador };

      const created = await planificacionApi.createPlanificacion(input);
      showSuccess(`Planificación "${etiquetaPlanificacion(created)}" creada correctamente.`);
      onCreated(created);
      onClose();
    } catch (error) {
      showError(error instanceof Error ? error.message : 'No se pudo crear la planificación.');
    } finally {
      setCreating(false);
    }
  }

  return (
    <FormDialog
      onClose={onClose}
      onSubmit={() => void handleCreate()}
      open={open}
      submitDisabled={submitDisabled}
      submitLabel="Crear borrador"
      submitLoadingLabel="Creando..."
      submitting={creating}
      title="Crear planificación"
    >
      <Stack spacing={2}>
        {/* Resumen en vivo, siempre visible arriba de todo: el usuario sabe en
            todo momento para que departamento/servicio y periodo esta
            creando, sin importar que campo este completando en ese momento. */}
        <Alert severity="info">{resumenNode}</Alert>

        {/* Periodo primero: es el dato que identifica la planificacion, antes
            de decidir para quien es. Un unico select año+mes, igual criterio
            que el filtro del listado — con solo mes actual/siguiente
            permitidos casi siempre hay una unica opcion de año. */}
        <TextField
          fullWidth
          helperText="Solo se puede crear para el mes actual o el siguiente."
          label="Periodo a planificar"
          onChange={(event) => setPeriodo(event.target.value)}
          select
          SelectProps={compactSelectMenuProps}
          size="small"
          value={periodo}
        >
          {periodosCreables.map((item) => (
            <MenuItem key={formatPeriodValue(item.anio, item.mes)} value={formatPeriodValue(item.anio, item.mes)}>
              {formatHumanPeriod(item.anio, item.mes)}
            </MenuItem>
          ))}
        </TextField>

        {/* Departamento: paso 2, siempre antes que Servicio. Si el actor solo
            gestiona uno, va fijo como contexto (nada que elegir realmente). */}
        {departamentoUnicoFiltro ? (
          <TextField fullWidth disabled label="Departamento" size="small" value={departamentoUnicoFiltro.nombre} />
        ) : (
          <TextField
            fullWidth
            helperText="Selecciona primero el departamento base."
            label="Departamento"
            onChange={(event) => {
              setIdDepartamento(event.target.value);
              setIdServicio('');
            }}
            select
            SelectProps={compactSelectMenuProps}
            size="small"
            value={idDepartamento}
          >
            <MenuItem value="">Selecciona un departamento</MenuItem>
            {departamentos.map((item) => (
              <MenuItem key={item.id} value={String(item.id)}>
                {item.nombre}
              </MenuItem>
            ))}
          </TextField>
        )}

        {/* Servicio: paso manual, recien habilitado una vez resuelto el
            departamento. La opcion "nivel de departamento" reemplaza al
            selector de ambito que existia antes — es el estado de reposo,
            no un placeholder, y solo aparece si el actor puede crear a ese
            nivel. */}
        {servicioUnicoFiltro ? (
          <TextField fullWidth disabled label="Servicio" size="small" value={servicioUnicoFiltro.nombre} />
        ) : !departamentoResuelto ? (
          <TextField disabled fullWidth helperText="Primero selecciona un departamento." label="Servicio" size="small" value="" />
        ) : (
          <TextField
            fullWidth
            helperText={
              puedeElegirScopeDepartamento
                ? 'Elige un servicio puntual o deja la planificación a nivel de departamento.'
                : hasServices
                  ? 'Solo se muestran servicios del departamento seleccionado.'
                  : 'Sin servicios para el departamento seleccionado.'
            }
            label="Servicio"
            onChange={(event) => setIdServicio(event.target.value)}
            select
            SelectProps={compactSelectMenuProps}
            size="small"
            value={idServicio}
          >
            {puedeElegirScopeDepartamento ? (
              <MenuItem value="">Planificación a nivel de departamento (sin servicio específico)</MenuItem>
            ) : (
              <MenuItem value="">{hasServices ? 'Selecciona un servicio' : 'Sin servicios'}</MenuItem>
            )}
            {serviciosDelDepartamento.map((item) => (
              <MenuItem key={item.id} value={String(item.id)}>
                {item.nombre} ({item.codigo})
              </MenuItem>
            ))}
          </TextField>
        )}
      </Stack>
    </FormDialog>
  );
}
