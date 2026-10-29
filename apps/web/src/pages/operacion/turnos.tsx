import { useEffect, useMemo, useState } from 'react';

import Grid from '@mui/material/Grid';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import ActionButtonGroup from 'components/system/ActionButtonGroup';
import ImpactoUsoDialog from 'components/system/ImpactoUsoDialog';
import OperationalPageTemplate from 'components/system/OperationalPageTemplate';
import OperationalScopeSummary from 'components/system/OperationalScopeSummary';
import OperationalStats from 'components/system/OperationalStats';
import OperationalTableCard from 'components/system/OperationalTableCard';
import StatusChip from 'components/system/StatusChip';
import TurnoFormDialog from 'components/system/TurnoFormDialog';
import { useAppToast } from 'components/system/AppToastProvider';
import { useAccessControl } from 'hooks/use-access-control';
import { canAccessGlobalCatalogs } from 'hooks/use-access-control';
import { useDepartmentServiceCascade } from 'hooks/use-department-service-cascade';
import { useApiRequest } from 'hooks/useApiRequest';
import { ApiClientError } from 'services/apiClient';
import { organizacionApi } from 'services/organizacionApi';
import { operacionApi } from 'services/operacionApi';
import type { Departamento, GuardarTurnoInput, ImpactoUsoCatalogo, Servicio, Turno } from 'types/api';
import { operationalFieldSx } from 'utils/operational-ui';
import { canManageTurnos } from 'utils/planificacion-capabilities';
import { compactSelectMenuProps } from 'utils/select-menu-props';

const DEFAULT_FORM: GuardarTurnoInput = {
  idServicio: undefined,
  idDepartamento: undefined,
  codigo: '',
  nombre: '',
  tipoHorario: 'CONTINUO',
  horaInicio: '08:00',
  horaFin: '14:00',
  tramos: [],
  activo: true
};

export default function TurnosPage() {
  const { capabilities, session } = useAccessControl();
  const { showSuccess, showError } = useAppToast();
  const puedeGestionar = canManageTurnos(capabilities);
  const [refreshKey, setRefreshKey] = useState(0);
  const [idDepartamentoFiltro, setIdDepartamentoFiltro] = useState<string>('');
  const [idServicioFiltro, setIdServicioFiltro] = useState<string>('');
  const [activoFiltro, setActivoFiltro] = useState<string>('');
  const [editor, setEditor] = useState<{ id: number | null; data: GuardarTurnoInput } | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [impactoEliminar, setImpactoEliminar] = useState<{ id: number; nombre: string; impacto: ImpactoUsoCatalogo } | null>(null);
  const [confirmandoLimpieza, setConfirmandoLimpieza] = useState(false);

  const puedeLeerCatalogoServicios = canAccessGlobalCatalogs(session);
  // Solo Administracion del sistema y jefatura departamental pueden crear/editar horarios a
  // nivel departamento (ver OperacionAccessPolicyService.assertPuedeGestionarTurnoDepartamento).
  // Un jefe de servicio nunca debe ver esa opcion en el dialogo, aunque su sesion tenga un
  // departamento gestionable (el de su propio servicio) que haria pasar el chequeo generico.
  const puedeElegirScopeDepartamento = puedeLeerCatalogoServicios || session?.alcancePlanificacion === 'DEPARTAMENTO';
  const departamentosResponse = useApiRequest(
    () => (puedeLeerCatalogoServicios ? organizacionApi.getDepartamentos() : Promise.resolve(null)),
    [puedeLeerCatalogoServicios]
  );
  const serviciosResponse = useApiRequest(
    () => (puedeLeerCatalogoServicios ? organizacionApi.getServicios(parseOptionalNumber(idDepartamentoFiltro)) : Promise.resolve(null)),
    [idDepartamentoFiltro, puedeLeerCatalogoServicios]
  );
  const turnosResponse = useApiRequest(
    () =>
      operacionApi.getTurnos({
        idDepartamento: parseOptionalNumber(idDepartamentoFiltro),
        idServicio: parseOptionalNumber(idServicioFiltro),
        activo: parseOptionalBoolean(activoFiltro),
        page: page + 1,
        pageSize: rowsPerPage
      }),
    [activoFiltro, idDepartamentoFiltro, idServicioFiltro, page, refreshKey, rowsPerPage]
  );

  useEffect(() => {
    setPage(0);
  }, [activoFiltro, idDepartamentoFiltro, idServicioFiltro]);

  const departamentosDisponibles = useMemo<Departamento[]>(() => {
    if (puedeLeerCatalogoServicios) {
      return ((departamentosResponse.data?.data || []) as Departamento[]).filter((item) => item.activo);
    }

    return (session?.departamentosGestionables || []).map((item) => ({
      ...item,
      activo: true
    }));
  }, [departamentosResponse.data, puedeLeerCatalogoServicios, session?.departamentosGestionables]);

  const serviciosDisponibles = useMemo<Servicio[]>(() => {
    if (puedeLeerCatalogoServicios) {
      return (serviciosResponse.data?.data || []).map((item) => ({
        ...item,
        idDepartamento: item.idDepartamento ?? 0
      })) as Servicio[];
    }

    const source = (session?.serviciosGestionables || []).map((item) => ({
      ...item,
      tipoServicio: 'SERVICIO' as const,
      cantidadPersonalActivo: 0,
      activo: true
    }));

    if (!idDepartamentoFiltro) {
      return source;
    }

    const idDepartamentoNormalizado = Number(idDepartamentoFiltro);
    return source.filter((item) => item.idDepartamento === idDepartamentoNormalizado);
  }, [idDepartamentoFiltro, puedeLeerCatalogoServicios, serviciosResponse.data, session?.serviciosGestionables]);

  const departamentoUnico = departamentosDisponibles.length === 1 ? departamentosDisponibles[0] : null;
  const servicioUnico = serviciosDisponibles.length === 1 ? serviciosDisponibles[0] : null;
  const { servicePlaceholderLabel, hasDepartments, hasServices } = useDepartmentServiceCascade({
    departments: departamentosDisponibles,
    services: serviciosDisponibles,
    selectedDepartmentId: idDepartamentoFiltro,
    selectedServiceId: idServicioFiltro,
    setSelectedDepartmentId: setIdDepartamentoFiltro,
    setSelectedServiceId: setIdServicioFiltro,
    // Solo se desactiva el auto-select cuando el select de Departamento es visible y
    // elegible (mas de un departamento, ej. SISTEMA): ahi el usuario debe poder sostener
    // "Todos". Cuando hay un unico departamento (ej. JEFE_DEPARTAMENTO) el select queda
    // oculto y el filtro igual necesita completarse solo, o el hook interpreta
    // "sin departamento" como "todavia sin elegir" y resetea el filtro de Servicio apenas
    // se selecciona algo.
    autoSelectDepartment: Boolean(departamentoUnico),
    autoSelectService: false
  });

  const columns = [
    {
      key: 'horario',
      title: 'Horario',
      render: (row: Turno) => (
        <Stack spacing={0.25}>
          {row.tipoHorario === 'DISCONTINUO' && row.tramos.length > 0 ? (
            <>
              {row.tramos.map((tramo, i) => (
                <Typography key={i} variant="body2">
                  {tramo.horaInicio} - {tramo.horaFin}
                </Typography>
              ))}
              <Typography color="text.secondary" variant="caption">
                {row.duracionHoras}h total
              </Typography>
            </>
          ) : (
            <>
              <Typography variant="body2">{`${row.horaInicio} - ${row.horaFin}`}</Typography>
              <Typography color="text.secondary" variant="caption">
                {row.cruzaMedianoche ? 'Cruza medianoche' : 'Mismo dia'}
              </Typography>
            </>
          )}
        </Stack>
      )
    },
    {
      key: 'duracionHoras',
      title: 'Total horas',
      render: (row: Turno) => <Typography variant="body2">{row.duracionHoras}</Typography>
    },
    {
      key: 'scope',
      title: 'Servicio / Departamento',
      render: (row: Turno) => (
        <Stack spacing={0}>
          <Typography variant="body2">{row.nombreServicio || row.nombreDepartamento || '-'}</Typography>
          {row.nombreDepartamento && !row.nombreServicio && (
            <Typography color="text.secondary" variant="caption">
              Departamento
            </Typography>
          )}
        </Stack>
      )
    },
    {
      key: 'vigencia',
      title: 'Vigencia',
      render: (row: Turno) => (
        <Typography variant="body2">
          {row.vigenciaDesde.slice(0, 10)} {row.vigenciaHasta ? `a ${row.vigenciaHasta.slice(0, 10)}` : 'indefinido'}
        </Typography>
      )
    },
    {
      key: 'cruzaMedianoche',
      title: 'Cruza medianoche',
      render: (row: Turno) => <StatusChip active={row.cruzaMedianoche} activeLabel="Si" inactiveLabel="No" />
    },
    {
      key: 'codigoVisible',
      title: 'Codigo',
      render: (row: Turno) =>
        row.codigoVisual ? (
          <Typography variant="body2">{row.codigoVisual}</Typography>
        ) : (
          <Typography color="text.disabled" variant="body2">
            —
          </Typography>
        )
    },
    {
      key: 'etiqueta',
      title: 'Etiqueta',
      render: (row: Turno) =>
        row.etiquetaVisual ? (
          <Typography variant="body2">{row.etiquetaVisual}</Typography>
        ) : (
          <Typography color="text.disabled" variant="body2">
            —
          </Typography>
        )
    },
    {
      key: 'activo',
      title: 'Estado',
      render: (row: Turno) => <StatusChip active={row.activo} />
    },
    ...(puedeGestionar
      ? [
          {
            key: 'acciones',
            title: 'Acciones',
            render: (row: Turno) => (
              <ActionButtonGroup
                actions={[
                  {
                    label: 'Editar horario',
                    onClick: () => void openEditorForTurno(row),
                    tone: 'secondary'
                  },
                  row.activo
                    ? {
                        label: 'Desactivar',
                        onClick: () => void handleDelete(row.id, row.nombre),
                        tone: 'danger'
                      }
                    : {
                        label: 'Activar',
                        onClick: () => void handleActivate(row.id, row.nombre),
                        tone: 'secondary'
                      }
                ]}
              />
            )
          }
        ]
      : [])
  ];

  return (
    <OperationalPageTemplate
      actions={[
        ...(puedeGestionar
          ? [
              {
                label: 'Nuevo horario',
                onClick: () => setEditor({ id: null, data: DEFAULT_FORM }),
                tone: 'primary' as const
              }
            ]
          : [])
      ]}
      context={
        !puedeLeerCatalogoServicios && servicioUnico ? (
          <OperationalScopeSummary
            code={servicioUnico.codigo}
            helperText="Estas gestionando los horarios reales del unico servicio habilitado para tu sesion."
            label="Servicio actual"
            name={servicioUnico.nombre}
          />
        ) : null
      }
      description="Cada servicio o departamento define aqui sus horarios reales de trabajo. Para editar el codigo visual o la etiqueta de un horario, usa el boton Editar horario."
      filters={
        <>
          {!departamentoUnico ? (
            <TextField
              label="Departamento"
              onChange={(event) => {
                setIdDepartamentoFiltro(event.target.value);
                setIdServicioFiltro('');
              }}
              select
              SelectProps={compactSelectMenuProps}
              size="small"
              sx={operationalFieldSx.normal}
              value={idDepartamentoFiltro}
            >
              {!hasDepartments ? <MenuItem value="">Sin departamentos</MenuItem> : <MenuItem value="">Todos</MenuItem>}
              {departamentosDisponibles.map((item) => (
                <MenuItem key={item.id} value={String(item.id)}>
                  {item.nombre}
                </MenuItem>
              ))}
            </TextField>
          ) : null}
          {!servicioUnico ? (
            <TextField
              label={puedeLeerCatalogoServicios ? 'Servicio' : 'Servicio habilitado'}
              onChange={(event) => setIdServicioFiltro(event.target.value)}
              select
              SelectProps={compactSelectMenuProps}
              disabled={!hasDepartments || !hasServices}
              size="small"
              sx={operationalFieldSx.long}
              value={idServicioFiltro}
            >
              {!hasDepartments || !hasServices ? (
                <MenuItem value="">{servicePlaceholderLabel}</MenuItem>
              ) : (
                <MenuItem value="">Todos</MenuItem>
              )}
              {serviciosDisponibles.map((item) => (
                <MenuItem key={item.id} value={String(item.id)}>
                  {item.nombre}
                </MenuItem>
              ))}
            </TextField>
          ) : null}
          <TextField
            label="Estado"
            onChange={(event) => setActivoFiltro(event.target.value)}
            select
            SelectProps={compactSelectMenuProps}
            size="small"
            sx={operationalFieldSx.short}
            value={activoFiltro}
          >
            <MenuItem value="">Todos</MenuItem>
            <MenuItem value="true">Activos</MenuItem>
            <MenuItem value="false">Inactivos</MenuItem>
          </TextField>
        </>
      }
      stats={
        <OperationalStats
          items={[
            { label: 'Horarios', value: turnosResponse.data?.meta.total || 0 },
            { label: 'Servicios', value: serviciosDisponibles.length }
          ]}
        />
      }
      // summary={`${turnosResponse.data?.meta.total || 0} horarios encontrados`}
      title="Horarios de servicio y departamento"
    >
      <Grid size={12}>
        <OperationalTableCard
          columns={columns}
          emptyMessage="No hay horarios configurados."
          error={turnosResponse.error}
          getRowKey={(row) => row.id}
          loading={turnosResponse.loading || departamentosResponse.loading || serviciosResponse.loading}
          onRetry={() => {
            turnosResponse.refetch();
            departamentosResponse.refetch();
            serviciosResponse.refetch();
          }}
          rows={turnosResponse.data?.data || []}
          slow={turnosResponse.slow || departamentosResponse.slow || serviciosResponse.slow}
          subtitle="Codigo y etiqueta visual de cada horario. Para editarlos, usa el boton Editar horario."
          title="Horarios reales por servicio y departamento"
          total={turnosResponse.data?.meta.total}
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

      <TurnoFormDialog
        departamentos={puedeElegirScopeDepartamento ? departamentosDisponibles : []}
        defaultIdServicio={parseOptionalNumber(idServicioFiltro)}
        defaultIdDepartamento={puedeElegirScopeDepartamento ? parseOptionalNumber(idDepartamentoFiltro) : undefined}
        defaultScope="servicio"
        editTurno={editor}
        onClose={() => setEditor(null)}
        onSaved={() => setRefreshKey((k) => k + 1)}
        open={Boolean(editor)}
        servicios={serviciosDisponibles}
      />

      <ImpactoUsoDialog
        accionLabel="desactivar"
        entidadLabel="horario"
        impacto={impactoEliminar?.impacto ?? null}
        onClose={() => setImpactoEliminar(null)}
        onLimpiar={() => impactoEliminar && void handleDelete(impactoEliminar.id, impactoEliminar.nombre, true)}
        open={Boolean(impactoEliminar)}
        saving={confirmandoLimpieza}
      />
    </OperationalPageTemplate>
  );

  function openEditorForTurno(turno: Turno) {
    setEditor({
      id: turno.id,
      data: {
        ...mapTurnoToForm(turno),
        codigoVisual: turno.codigoVisual || undefined,
        etiqueta: turno.etiquetaVisual || undefined
      }
    });
  }

  async function handleDelete(id: number, nombre: string, confirmarLimpieza = false) {
    setConfirmandoLimpieza(true);
    try {
      await operacionApi.deleteTurno(id, confirmarLimpieza);
      showSuccess(`Horario "${nombre}" desactivado correctamente.`);
      setImpactoEliminar(null);
      setRefreshKey((value) => value + 1);
    } catch (error) {
      const impacto = error instanceof ApiClientError ? (error.body?.impacto as ImpactoUsoCatalogo | undefined) : undefined;

      if (error instanceof ApiClientError && error.status === 409 && impacto) {
        setImpactoEliminar({ id, nombre, impacto });
        return;
      }

      showError(error instanceof Error ? error.message : 'No se pudo desactivar el horario.');
    } finally {
      setConfirmandoLimpieza(false);
    }
  }

  async function handleActivate(id: number, nombre: string) {
    try {
      await operacionApi.activateTurno(id);
      showSuccess(`Horario "${nombre}" activado correctamente.`);
      setRefreshKey((value) => value + 1);
    } catch (error) {
      showError(error instanceof Error ? error.message : 'No se pudo activar el horario.');
    }
  }
}

function parseOptionalNumber(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseOptionalBoolean(value: string) {
  if (value === 'true') {
    return true;
  }

  if (value === 'false') {
    return false;
  }

  return undefined;
}

function mapTurnoToForm(turno: Turno): GuardarTurnoInput {
  return {
    idServicio: turno.idServicio ?? undefined,
    idDepartamento: turno.idDepartamento ?? undefined,
    codigo: turno.codigo,
    nombre: turno.nombre,
    tipoHorario: turno.tipoHorario || 'CONTINUO',
    horaInicio: turno.horaInicio,
    horaFin: turno.horaFin,
    tramos: (turno.tramos || []).map((t) => ({ horaInicio: t.horaInicio, horaFin: t.horaFin })),
    activo: turno.activo
  };
}
