import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import ActionButtonGroup from 'components/system/ActionButtonGroup';
import { useAppToast } from 'components/system/AppToastProvider';
import OperationalPageTemplate from 'components/system/OperationalPageTemplate';
import OperationalScopeSummary from 'components/system/OperationalScopeSummary';
import OperationalStats from 'components/system/OperationalStats';
import OperationalTableCard from 'components/system/OperationalTableCard';
import PlanificacionCreateDialog from 'components/system/PlanificacionCreateDialog';
import PlanificacionExportDialog from 'components/system/PlanificacionExportDialog';
import PlanificacionStateActions from 'components/system/PlanificacionStateActions';
import PlanificacionStatusChip from 'components/system/PlanificacionStatusChip';
import { etiquetaPlanificacion, mensajeCambioEstadoPlanificacion } from 'utils/planificacion-mensajes';
import ConfirmDialog from 'components/system/ConfirmDialog';
import { useAccessControl } from 'hooks/use-access-control';
import { canAccessGlobalCatalogs } from 'hooks/use-access-control';
import { useDepartmentServiceCascade } from 'hooks/use-department-service-cascade';
import { useApiRequest } from 'hooks/useApiRequest';
import { organizacionApi } from 'services/organizacionApi';
import { planificacionApi } from 'services/planificacionApi';
import type {
  EstadoPlanificacion,
  EstiloExportacionRolTurnos,
  FormatoExportacionRolTurnos,
  ModoExportacionRolTurnos,
  Planificacion
} from 'types/api';
import { operationalFieldSx } from 'utils/operational-ui';
import { compactSelectMenuProps } from 'utils/select-menu-props';
import {
  canApprovePlanificacion,
  canClosePlanificacion,
  canCreatePlanificacion,
  canDeletePlanificacion,
  canExportPlanificacion,
  canExportPlanificacionLote,
  canReturnPlanificacionToDraft,
  canSendRevisionPlanificacion
} from 'utils/planificacion-capabilities';
import {
  buildPlanificacionEtiquetaCorta,
  buildPlanificacionExcelFilename,
  buildPlanificacionesLoteExcelFilename
} from 'utils/planificacion-export-filename';
import { formatHumanPeriod, formatPeriodValue, parsePeriodValue } from 'utils/periodo-planificacion';

const estadoOptions: EstadoPlanificacion[] = ['BORRADOR', 'REVISION', 'APROBADA', 'CERRADA'];

export default function PlanificacionesPage() {
  const navigate = useNavigate();
  const { capabilities, session: activeSession } = useAccessControl();
  // periodosCreables: solo mes actual y siguiente, igual que assertPeriodoPlanificable
  // en el backend — es lo unico que se puede usar para crear/duplicar planificaciones.
  const periodosCreables = useMemo(() => getAllowedPlanningPeriods(), []);
  const periodoActual = periodosCreables[0];
  // periodosVisibles: agrega el mes anterior para poder consultar en el listado
  // planificaciones ya cerradas (solo lectura), igual que
  // PlanificacionAccessPolicyService.estaDentroDePeriodoVisibleJefatura en el backend.
  const periodosVisibles = useMemo(() => getViewablePlanningPeriods(), []);
  const [refreshKey, setRefreshKey] = useState(0);
  const { showSuccess, showError, showInfo } = useAppToast();
  const setFeedback = (next: { type: 'success' | 'error' | 'info'; message: string } | null) => {
    if (!next) {
      return;
    }

    if (next.type === 'success') {
      showSuccess(next.message);
      return;
    }

    if (next.type === 'info') {
      showInfo(next.message);
      return;
    }

    showError(next.message);
  };

  const [filtroServicio, setFiltroServicio] = useState('');
  const [filtroDepartamento, setFiltroDepartamento] = useState('');
  const [filtroPeriodo, setFiltroPeriodo] = useState(formatPeriodValue(periodoActual.anio, periodoActual.mes));
  const [filtroEstado, setFiltroEstado] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const [changingEstadoId, setChangingEstadoId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Planificacion | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [selectedPlanificacionIds, setSelectedPlanificacionIds] = useState<number[]>([]);
  const [exportMode, setExportMode] = useState<ModoExportacionRolTurnos>('numerico');
  const [exportStyle, setExportStyle] = useState<EstiloExportacionRolTurnos>('color');
  const [exportFormat, setExportFormat] = useState<FormatoExportacionRolTurnos>('una-fila');
  const [exporting, setExporting] = useState<'excel' | 'pdf' | null>(null);
  const [exportPreviewHtml, setExportPreviewHtml] = useState('');
  const [exportPreviewError, setExportPreviewError] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const departamentos = useApiRequest(organizacionApi.getDepartamentos);
  const servicios = useApiRequest(organizacionApi.getServicios);
  const esGestorGlobalPlanificaciones = canAccessGlobalCatalogs(activeSession);
  const esJefeServicio = activeSession?.alcancePlanificacion === 'SERVICIO';
  // Solo Administracion del sistema y jefatura departamental pueden crear/filtrar por
  // planificaciones de alcance departamental (ver PlanificacionAccessPolicyService.
  // assertPuedeCrearPlanificacion, que exige isDepartamentoHead para ese scope). Un jefe
  // de servicio nunca debe ver esa opcion, aunque su sesion incluya un departamento
  // gestionable (el de su propio servicio).
  const puedeElegirScopeDepartamento = esGestorGlobalPlanificaciones || activeSession?.alcancePlanificacion === 'DEPARTAMENTO';

  const serviciosGestionables = useMemo(() => {
    const disponibles = servicios.data?.data || [];

    if (!activeSession?.serviciosGestionables.length) {
      return disponibles;
    }

    const permitidos = new Set(activeSession.serviciosGestionables.map((item) => item.id));
    return disponibles.filter((item) => permitidos.has(item.id));
  }, [activeSession, servicios.data]);

  const departamentosPlanificables = useMemo(() => {
    const all = departamentos.data?.data || [];
    const allowedIds = new Set(serviciosGestionables.map((item) => item.idDepartamento));
    return all.filter((item) => allowedIds.has(item.id));
  }, [departamentos.data, serviciosGestionables]);
  // Un jefe de departamento siempre tiene un unico departamento gestionable: el filtro
  // "Departamento" no aporta nada, se oculta y se muestra como contexto fijo.
  const departamentoUnicoFiltro = departamentosPlanificables.length === 1 ? departamentosPlanificables[0] : null;
  const servicioUnicoFiltro = esJefeServicio && serviciosGestionables.length === 1 ? serviciosGestionables[0] : null;

  // El departamento elegido acota la lista de servicios disponibles en el filtro.
  const serviciosFiltroDisponibles = useMemo(() => {
    if (!filtroDepartamento) return serviciosGestionables;
    return serviciosGestionables.filter((s) => String(s.idDepartamento) === filtroDepartamento);
  }, [filtroDepartamento, serviciosGestionables]);

  const {
    servicePlaceholderLabel: filtroServicePlaceholderLabel,
    hasDepartments: filtroHasDepartments,
    hasServices: filtroHasServices
  } = useDepartmentServiceCascade({
    departments: departamentosPlanificables,
    services: serviciosFiltroDisponibles,
    selectedDepartmentId: filtroDepartamento,
    selectedServiceId: filtroServicio,
    setSelectedDepartmentId: setFiltroDepartamento,
    setSelectedServiceId: setFiltroServicio,
    // Mismo criterio que turnos.tsx: el auto-select de departamento solo se
    // desactiva cuando el select es visible y elegible (SISTEMA, mas de un
    // departamento), para que el usuario pueda sostener "Todos". Con un
    // unico departamento (jefe de departamento) el select queda oculto y el
    // filtro igual necesita completarse solo, o el hook interpreta "sin
    // departamento" como "todavia sin elegir" y resetea el filtro de Servicio.
    autoSelectDepartment: Boolean(departamentoUnicoFiltro),
    autoSelectService: false
  });

  const periodoFiltroActual = useMemo(() => parsePeriodValue(filtroPeriodo), [filtroPeriodo]);

  const planificacionesRequest = useApiRequest(
    () =>
      planificacionApi.getPlanificaciones({
        idServicio: parseOptionalNumber(filtroServicio),
        // Si hay un servicio puntual elegido, ese filtro ya es mas especifico
        // y no hace falta mandar tambien el departamento.
        idDepartamento: filtroServicio ? undefined : parseOptionalNumber(filtroDepartamento),
        anio: periodoFiltroActual.anio,
        mes: periodoFiltroActual.mes,
        estado: (filtroEstado || undefined) as EstadoPlanificacion | undefined,
        page: page + 1,
        pageSize: rowsPerPage
      }),
    [filtroServicio, filtroDepartamento, filtroPeriodo, filtroEstado, page, refreshKey, rowsPerPage]
  );

  const rows = useMemo(() => planificacionesRequest.data?.data || [], [planificacionesRequest.data?.data]);
  const totalRows = planificacionesRequest.data?.meta.total || 0;
  const totalPages = planificacionesRequest.data?.meta.totalPages || 1;
  const puedeExportarIndividual = canExportPlanificacion(capabilities);
  const puedeExportarLote = canExportPlanificacionLote(capabilities);
  const planificacionVisibleUnica = !puedeExportarLote && rows.length === 1 ? rows[0] : null;
  const selectedPlanificaciones = useMemo(
    () => rows.filter((row) => selectedPlanificacionIds.includes(row.id)),
    [rows, selectedPlanificacionIds]
  );
  const previewPlanificacion = selectedPlanificaciones.length === 1 ? selectedPlanificaciones[0] : null;

  const columns = [
    {
      key: 'periodo',
      title: 'Periodo',
      render: (row: Planificacion) => (
        <Stack spacing={0.25}>
          <Typography fontWeight={700} variant="body2">
            {getMonthName(row.mes)} {row.anio}
          </Typography>
          <Typography color="text.secondary" variant="caption">
            {/* Version {row.version} */}
          </Typography>
        </Stack>
      )
    },
    {
      key: 'departamento',
      title: 'Departamento',
      render: (row: Planificacion) => <Typography variant="body2">{row.nombreDepartamento || row.codigoDepartamento || '-'}</Typography>
    },
    {
      key: 'servicio',
      title: 'Unidad',
      render: (row: Planificacion) =>
        row.idServicio === null ? (
          <Stack spacing={0.25}>
            <Chip
              color="secondary"
              label="Nivel departamento"
              size="small"
              variant="outlined"
              sx={{ width: 'fit-content', fontSize: '0.7rem' }}
            />
            <Typography color="text.secondary" variant="caption">
              Personal propio del departamento
            </Typography>
          </Stack>
        ) : (
          <Stack spacing={0.25}>
            <Typography variant="body2">{row.nombreServicio || '-'}</Typography>
            <Typography color="text.secondary" variant="caption">
              {row.codigoServicio || '-'}
            </Typography>
          </Stack>
        )
    },
    {
      key: 'estado',
      title: 'Estado',
      render: (row: Planificacion) => <PlanificacionStatusChip estado={row.estado} />
    },
    {
      key: 'personas',
      title: 'Personal',
      render: (row: Planificacion) => <Typography variant="body2">{row.cantidadPersonalPlanificable}</Typography>
    },
    {
      key: 'acciones',
      title: 'Acciones',
      render: (row: Planificacion) => (
        <Stack spacing={0.75}>
          <ActionButtonGroup
            actions={[
              {
                label: 'Matriz',
                onClick: () => navigate(`/planificacion/matriz/${row.id}`),
                tone: 'primary'
              },
              ...(row.idServicio !== null
                ? [
                    {
                      label: 'Servicio',
                      onClick: () =>
                        navigate(`/organizacion/servicios/${row.idServicio}`, {
                          state: {
                            backTo: '/planificacion/planificaciones',
                            backLabel: 'Volver a planificaciones'
                          }
                        }),
                      tone: 'ghost' as const
                    }
                  ]
                : []),
              ...(canDeletePlanificacion(capabilities, row.estado)
                ? [
                    {
                      label: deletingId === row.id ? 'Eliminando...' : 'Eliminar',
                      disabled: deletingId === row.id,
                      onClick: () => setConfirmDelete(row),
                      tone: 'danger' as const
                    }
                  ]
                : [])
            ]}
          />
          {renderEstadoAction(row)}
        </Stack>
      )
    }
  ];

  const selectedPlanificacionIdsKey = selectedPlanificacionIds.join(',');

  const loadExportPreview = useCallback(async () => {
    if (!previewPlanificacion) {
      setExportPreviewHtml('');
      setExportPreviewError(null);
      return;
    }

    setPreviewLoading(true);
    setExportPreviewError(null);

    try {
      const html = await planificacionApi.getExportPreviewHtml(previewPlanificacion.id, exportMode, exportStyle, exportFormat);
      setExportPreviewHtml(html);
    } catch (error) {
      setExportPreviewError(error instanceof Error ? error.message : 'No se pudo cargar la vista previa.');
    } finally {
      setPreviewLoading(false);
    }
  }, [exportFormat, exportMode, exportStyle, previewPlanificacion]);

  useEffect(() => {
    setSelectedPlanificacionIds((current) => current.filter((id) => rows.some((row) => row.id === id)));
  }, [rows]);

  useEffect(() => {
    if (page > 0 && totalRows === 0) {
      setPage(0);
      return;
    }

    if (page > 0 && page >= totalPages) {
      setPage(Math.max(0, totalPages - 1));
    }
  }, [page, totalPages, totalRows]);

  useEffect(() => {
    if (!exportDialogOpen) {
      return;
    }

    void loadExportPreview();
  }, [exportDialogOpen, exportMode, exportStyle, exportFormat, selectedPlanificacionIdsKey, loadExportPreview]);

  useEffect(() => {
    setPage(0);
    setSelectedPlanificacionIds([]);
  }, [filtroServicio, filtroDepartamento, filtroPeriodo, filtroEstado]);

  function clearFilters() {
    setFiltroServicio('');
    setFiltroDepartamento('');
    setFiltroPeriodo(formatPeriodValue(periodoActual.anio, periodoActual.mes));
    setFiltroEstado('');
    setSelectedPlanificacionIds([]);
    setPage(0);
  }

  function handlePlanificacionCreated(created: Planificacion) {
    setRefreshKey((value) => value + 1);
    navigate(`/planificacion/matriz/${created.id}`);
  }

  async function handleDelete(row: Planificacion) {
    setDeletingId(row.id);
    setFeedback(null);

    try {
      await planificacionApi.deletePlanificacion(row.id);
      setFeedback({
        type: 'success',
        message: `Planificación "${etiquetaPlanificacion(row)}" eliminada correctamente.`
      });
      setRefreshKey((value) => value + 1);
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error instanceof Error ? error.message : 'No se pudo eliminar la planificacion.'
      });
    } finally {
      setDeletingId(null);
    }
  }

  async function handleDeleteConfirmed() {
    if (!confirmDelete) return;
    try {
      await handleDelete(confirmDelete);
    } finally {
      setConfirmDelete(null);
    }
  }

  const confirmEntityLabel = confirmDelete
    ? confirmDelete.idServicio !== null
      ? confirmDelete.nombreServicio || confirmDelete.codigoServicio || 'el servicio'
      : confirmDelete.nombreDepartamento || confirmDelete.codigoDepartamento || 'el departamento'
    : '';

  const confirmPeriodLabel = confirmDelete ? formatHumanPeriod(confirmDelete.anio, confirmDelete.mes) : '';

  function toggleSelectedPlanificacion(idPlanificacion: number, checked: boolean) {
    setSelectedPlanificacionIds((current) =>
      checked ? [...new Set([...current, idPlanificacion])] : current.filter((id) => id !== idPlanificacion)
    );
  }

  function toggleSelectAllCurrentRows(checked: boolean) {
    setSelectedPlanificacionIds(checked ? rows.map((row) => row.id) : []);
  }

  function openExportDialog() {
    setSelectedPlanificacionIds(planificacionVisibleUnica ? [planificacionVisibleUnica.id] : rows.map((row) => row.id));
    setExportDialogOpen(true);
  }

  async function handleExport() {
    if (!selectedPlanificacionIds.length) {
      return;
    }

    setExporting('excel');
    setFeedback(null);

    try {
      const blob = previewPlanificacion
        ? await planificacionApi.exportPlanificacionExcel(previewPlanificacion.id, exportMode, exportStyle, exportFormat)
        : await planificacionApi.exportPlanificacionesExcelLote({
            idsPlanificacion: selectedPlanificacionIds,
            modo: exportMode,
            estilo: exportStyle,
            formato: exportFormat
          });

      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = previewPlanificacion
        ? buildPlanificacionExcelFilename(previewPlanificacion, exportMode, exportStyle, exportFormat)
        : buildPlanificacionesLoteExcelFilename(selectedPlanificaciones, exportMode, exportStyle, exportFormat);
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => window.URL.revokeObjectURL(url), 10_000);

      setFeedback({
        type: 'success',
        message: previewPlanificacion
          ? `Se genero la exportacion Excel de ${buildPlanificacionEtiquetaCorta(previewPlanificacion)}.`
          : `Se genero la exportacion Excel para ${selectedPlanificacionIds.length} planificaciones.`
      });
      setExportDialogOpen(false);
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error instanceof Error ? error.message : 'No se pudo exportar la seleccion actual.'
      });
    } finally {
      setExporting(null);
    }
  }

  function renderEstadoAction(row: Planificacion) {
    const puedeEnviarRevision = canSendRevisionPlanificacion(capabilities, row.estado);
    const puedeVolverBorrador = canReturnPlanificacionToDraft(capabilities, row.estado);
    const puedeAprobar = canApprovePlanificacion(capabilities, row.estado);
    const puedeCerrar = canClosePlanificacion(capabilities, row.estado);

    if (row.estado === 'BORRADOR') {
      return (
        <PlanificacionStateActions
          disabled={changingEstadoId === row.id}
          estado={row.estado}
          labels={{ revision: changingEstadoId === row.id ? 'Enviando...' : 'Enviar revision' }}
          onChangeEstado={(estado) => void handleEstadoChange(row, estado)}
          puedeEnviarRevision={puedeEnviarRevision}
        />
      );
    }

    if (row.estado === 'REVISION') {
      return (
        <PlanificacionStateActions
          disabled={changingEstadoId === row.id}
          estado={row.estado}
          labels={{
            volver: 'Volver',
            aprobar: changingEstadoId === row.id ? 'Aprobando...' : 'Aprobar'
          }}
          onChangeEstado={(estado) => void handleEstadoChange(row, estado)}
          puedeAprobar={puedeAprobar}
          puedeVolverBorrador={puedeVolverBorrador}
        />
      );
    }

    if (row.estado === 'APROBADA') {
      return (
        <PlanificacionStateActions
          disabled={changingEstadoId === row.id}
          estado={row.estado}
          labels={{
            cerrar: changingEstadoId === row.id ? 'Cerrando...' : 'Cerrar'
          }}
          onChangeEstado={(estado) => void handleEstadoChange(row, estado)}
          puedeCerrar={puedeCerrar}
        />
      );
    }

    return null;
  }

  async function handleEstadoChange(row: Planificacion, estado: EstadoPlanificacion) {
    setChangingEstadoId(row.id);
    setFeedback(null);

    try {
      await planificacionApi.changePlanificacionEstado(row.id, { estado });
      setFeedback({
        type: 'success',
        message: mensajeCambioEstadoPlanificacion(row, estado)
      });
      setRefreshKey((value) => value + 1);
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error instanceof Error ? error.message : 'No se pudo cambiar el estado.'
      });
    } finally {
      setChangingEstadoId(null);
    }
  }

  return (
    <OperationalPageTemplate
      actions={[
        ...(activeSession && canCreatePlanificacion(capabilities)
          ? [
              {
                label: 'Nueva planificación',
                onClick: () => setCreateDialogOpen(true),
                tone: 'primary' as const
              }
            ]
          : []),
        { label: 'Recargar', onClick: () => setRefreshKey((value) => value + 1), tone: 'secondary' },
        {
          label: 'Limpiar filtros',
          onClick: clearFilters,
          tone: 'secondary'
        },
        ...(puedeExportarLote || (puedeExportarIndividual && planificacionVisibleUnica)
          ? [
              {
                label: 'Descargar Lote Excel',
                onClick: openExportDialog,
                tone: 'secondary' as const
              }
            ]
          : [])
      ]}
      context={
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} useFlexGap flexWrap="wrap" sx={{ alignItems: { md: 'center' } }}>
          {servicioUnicoFiltro ? (
            <OperationalScopeSummary
              code={servicioUnicoFiltro.codigo}
              helperText="Solo ves las planificaciones de tu servicio."
              label="Servicio actual"
              name={servicioUnicoFiltro.nombre}
            />
          ) : departamentoUnicoFiltro ? (
            <OperationalScopeSummary
              code={departamentoUnicoFiltro.codigo}
              helperText="Estas viendo las planificaciones de tu departamento y de sus servicios."
              label="Departamento actual"
              name={departamentoUnicoFiltro.nombre}
            />
          ) : null}
          {/* <Chip label={`Periodo base: ${formatHumanPeriod(periodoActual.anio, periodoActual.mes)}`} size="small" variant="outlined" /> */}
        </Stack>
      }
      description={
        esJefeServicio
          ? 'Listado de planificaciones mensuales de tu servicio. Filtra por periodo (incluye el mes anterior, cerrado, en solo lectura).'
          : 'Listado de planificaciones mensuales. Filtra por departamento, servicio, periodo (incluye el mes anterior, cerrado, en solo lectura) y estado.'
      }
      filters={
        <>
          {!departamentoUnicoFiltro ? (
            <TextField
              label="Departamento"
              onChange={(event) => {
                setFiltroDepartamento(event.target.value);
                setFiltroServicio('');
              }}
              select
              SelectProps={compactSelectMenuProps}
              size="small"
              sx={operationalFieldSx.short}
              value={filtroDepartamento}
            >
              {!filtroHasDepartments ? <MenuItem value="">Sin departamentos</MenuItem> : <MenuItem value="">Todos</MenuItem>}
              {departamentosPlanificables.map((item) => (
                <MenuItem key={item.id} value={String(item.id)}>
                  {item.nombre}
                </MenuItem>
              ))}
            </TextField>
          ) : null}
          {!esJefeServicio ? (
            <TextField
              disabled={!filtroHasDepartments || !filtroHasServices}
              label="Servicio"
              onChange={(event) => setFiltroServicio(event.target.value)}
              select
              SelectProps={compactSelectMenuProps}
              size="small"
              sx={operationalFieldSx.short}
              value={filtroServicio}
            >
              {!filtroHasDepartments || !filtroHasServices ? (
                <MenuItem value="">{filtroServicePlaceholderLabel}</MenuItem>
              ) : (
                <MenuItem value="">Todos</MenuItem>
              )}
              {serviciosFiltroDisponibles.map((item) => (
                <MenuItem key={item.id} value={String(item.id)}>
                  {item.nombre}
                </MenuItem>
              ))}
            </TextField>
          ) : null}
          <TextField
            label="Periodo"
            onChange={(event) => setFiltroPeriodo(event.target.value)}
            select
            SelectProps={compactSelectMenuProps}
            size="small"
            sx={operationalFieldSx.short}
            value={filtroPeriodo}
          >
            {periodosVisibles.map((periodo) => (
              <MenuItem key={formatPeriodValue(periodo.anio, periodo.mes)} value={formatPeriodValue(periodo.anio, periodo.mes)}>
                {formatHumanPeriod(periodo.anio, periodo.mes)}
              </MenuItem>
            ))}
          </TextField>
          {/* Un jefe de servicio administra un unico servicio: con el filtro de Periodo
              ya elegido, siempre hay a lo sumo una planificacion visible, asi que el
              filtro de Estado no aporta nada (a diferencia de un jefe de departamento,
              que puede tener varios servicios en distintos estados el mismo mes). */}
          {!esJefeServicio ? (
            <TextField
              label="Estado"
              onChange={(event) => setFiltroEstado(event.target.value)}
              select
              SelectProps={compactSelectMenuProps}
              size="small"
              sx={operationalFieldSx.short}
              value={filtroEstado}
            >
              <MenuItem value="">Todos</MenuItem>
              {estadoOptions.map((estado) => (
                <MenuItem key={estado} value={estado}>
                  {estado}
                </MenuItem>
              ))}
            </TextField>
          ) : null}
        </>
      }
      stats={
        <OperationalStats
          items={[
            { label: 'Resultados', value: totalRows },
            { label: 'Departamentos', value: departamentosPlanificables.length },
            { label: 'Servicios', value: serviciosGestionables.length },
            { label: 'Seleccionadas', value: selectedPlanificacionIds.length }
          ]}
        />
      }
      // summary={`${totalRows} resultados en total`}
      title="Bandeja mensual operativa"
    >
      <Grid size={12}>
        <OperationalTableCard
          columns={columns}
          emptyMessage="No hay planificaciones para el filtro actual."
          error={planificacionesRequest.error}
          getRowKey={(row) => row.id}
          loading={planificacionesRequest.loading}
          onRetry={planificacionesRequest.refetch}
          rows={rows}
          slow={planificacionesRequest.slow}
          subtitle="Bandeja operativa mensual con filtros por servicio, periodo y estado."
          title="Planificaciones mensuales"
          total={totalRows}
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

      <PlanificacionCreateDialog
        departamentos={departamentosPlanificables}
        departamentoUnicoFiltro={departamentoUnicoFiltro}
        defaultIdDepartamento={filtroDepartamento ? Number(filtroDepartamento) : undefined}
        defaultIdServicio={filtroServicio ? Number(filtroServicio) : undefined}
        defaultPeriodo={
          periodoFiltroActual.anio !== undefined && periodoFiltroActual.mes !== undefined
            ? { anio: periodoFiltroActual.anio, mes: periodoFiltroActual.mes }
            : undefined
        }
        idUsuarioCreador={activeSession?.id ?? 0}
        onClose={() => setCreateDialogOpen(false)}
        onCreated={handlePlanificacionCreated}
        open={createDialogOpen}
        periodosCreables={periodosCreables}
        puedeElegirScopeDepartamento={puedeElegirScopeDepartamento}
        serviciosGestionables={serviciosGestionables}
        servicioUnicoFiltro={servicioUnicoFiltro}
      />

      <PlanificacionExportDialog
        canPreview={Boolean(previewPlanificacion)}
        exportLoading={exporting}
        exportMode={exportMode}
        exportStyle={exportStyle}
        exportFormat={exportFormat}
        onClose={() => setExportDialogOpen(false)}
        onExport={() => void handleExport()}
        onExportModeChange={setExportMode}
        onExportStyleChange={setExportStyle}
        onExportFormatChange={setExportFormat}
        onReloadPreview={() => void loadExportPreview()}
        onToggleAll={toggleSelectAllCurrentRows}
        onToggleItem={toggleSelectedPlanificacion}
        open={exportDialogOpen}
        previewError={exportPreviewError}
        previewHtml={exportPreviewHtml}
        previewLoading={previewLoading}
        selectableItems={rows.map((row) => ({
          id: row.id,
          label: `${row.idServicio !== null ? row.nombreServicio || row.codigoServicio || 'Servicio' : row.nombreDepartamento || row.codigoDepartamento || 'Departamento'} · ${getMonthName(row.mes)} ${row.anio} · ${row.estado}`
        }))}
        selectedIds={selectedPlanificacionIds}
      />
      <ConfirmDialog
        open={Boolean(confirmDelete)}
        title={confirmDelete ? `Eliminar planificación — ${confirmEntityLabel} · ${confirmPeriodLabel}` : 'Eliminar planificación'}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => void handleDeleteConfirmed()}
        loading={deletingId === confirmDelete?.id}
        confirmLabel="Eliminar"
        confirmLoadingLabel="Eliminando..."
        confirmColor="error"
      >
        ¿Estás seguro que deseas eliminar la planificación de <strong>{confirmEntityLabel}</strong> para{' '}
        <strong>{confirmPeriodLabel}</strong>? Esta acción la marcará como eliminada.
      </ConfirmDialog>
    </OperationalPageTemplate>
  );
}

function parseOptionalNumber(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function getMonthName(month: number) {
  return new Intl.DateTimeFormat('es-BO', {
    month: 'long',
    timeZone: 'UTC'
  }).format(new Date(Date.UTC(2026, month - 1, 1)));
}

function getAllowedPlanningPeriods() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/La_Paz',
    year: 'numeric',
    month: 'numeric'
  }).formatToParts(new Date());
  const anio = Number(parts.find((part) => part.type === 'year')?.value || 2026);
  const mes = Number(parts.find((part) => part.type === 'month')?.value || 1);

  if (mes === 12) {
    return [
      { anio, mes },
      { anio: anio + 1, mes: 1 }
    ];
  }

  return [
    { anio, mes },
    { anio, mes: mes + 1 }
  ];
}

// Ventana de solo lectura para el filtro del listado: mes anterior (permite ver
// planificaciones ya cerradas), actual y siguiente. Debe reflejar exactamente
// PlanificacionAccessPolicyService.getPeriodosVisiblesJefatura en el backend —
// si esta ventana se ensancha aqui sin ensanchar tambien el backend, el filtro
// mostraria una opcion que el backend rechazaria con 403 al consultarla.
function getViewablePlanningPeriods() {
  const [actual, siguiente] = getAllowedPlanningPeriods();
  const anterior = actual.mes === 1 ? { anio: actual.anio - 1, mes: 12 } : { anio: actual.anio, mes: actual.mes - 1 };

  return [anterior, actual, siguiente];
}
